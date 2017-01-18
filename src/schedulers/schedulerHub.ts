import Timer = NodeJS.Timer;
const path = require("path");
const child_process = require("child_process");

const debug = require("debug")("mouselight:pipeline-api:scheduler-hub");

import {PipelineStages, IPipelineStage} from "../data-model/pipelineStage";
import {Projects, IProject} from "../data-model/project";
import {IRunnableTableModelRow} from "../data-model/runnableTableModel";
import {startTileStatusFileWorker} from "./tileStatusWorkerChildProcess";
import {startPipelineStageWorker} from "./pipelineMapSchedulerChildProcess";

export interface IWorkerInterface {
    IsCancelRequested: boolean;
    IsProcessingRequested: boolean;

    loadTileStatusForPlane(zIndex: number);
}

export class SchedulerHub {
    private static _instance: SchedulerHub = null;

    public static async Run(useChildProcessWorkers: boolean = false): Promise<SchedulerHub> {
        if (!this._instance) {
            this._instance = new SchedulerHub(useChildProcessWorkers);

            await this._instance.start();
        }

        return this._instance;
    }

    public static get Instance(): SchedulerHub {
        return this._instance;
    }

    private _useChildProcessWorkers: boolean;

    private _tileStatusWorkers = new Map<string, IWorkerInterface>();
    private _pipelineStageWorkers = new Map<string, IWorkerInterface>();

    public async loadTileStatusForPlane(project_id: string, plane: number): Promise<any> {
        let pipelineStagesManager = new PipelineStages();

        let stages = await pipelineStagesManager.getForProject(project_id);

        let maxDepth = stages.reduce((current, stage) => Math.max(current, stage.depth), 0);

        let workers = stages.map(stage => this._pipelineStageWorkers.get(stage.id)).filter(worker => worker != null);

        let promises = workers.map(worker => {
            return worker.loadTileStatusForPlane(plane);
        });

        let tilesAllStages = await Promise.all(promises);

        let tileArray = tilesAllStages.reduce((source, next) => source.concat(next), []);

        let tiles = {};

        let x_min = 1e7, x_max = 0, y_min = 1e7, y_max = 0;

        tileArray.map(tile => {
            x_min = Math.min(x_min, tile.lat_x);
            x_max = Math.max(x_max, tile.lat_x);
            y_min = Math.min(y_min, tile.lat_y);
            y_max = Math.max(y_max, tile.lat_y);

            let t = tiles[`${tile.lat_x}_${tile.lat_y}`];

            if (!t) {
                t = {
                    x_index: tile.lat_x,
                    y_index: tile.lat_y,
                    stages: []
                };

                tiles[`${tile.lat_x}_${tile.lat_y}`] = t;
            }

            t.stages.push({
                stage_id: tile.stage_id,
                depth: tile.depth,
                status: tile.this_stage_status
            });
        });

        let output = [];

        for (let prop in tiles) {
            if (tiles.hasOwnProperty(prop)) {
                output.push(tiles[prop]);
            }
        }

        return {
            max_depth: maxDepth,
            x_min: x_min,
            x_max: x_max,
            y_min: y_min,
            y_max: y_max,
            tiles: output
        };
    }

    private constructor(useChildProcessWorkers: boolean = false) {
        this._useChildProcessWorkers = useChildProcessWorkers;
    }

    private async start() {
        await this.manageAllWorkers();
    }

    private async manageAllWorkers() {
        try {
            let projectsManager = new Projects();

            let projects: IProject[] = await projectsManager.getAll();

            // Turn on/off dashboard.json parsing.
            // TODO This can go as the first step in pause/resume project
            await this.manageWorkers(projects, this._tileStatusWorkers, startTileStatusFileWorker, "/tileStatusWorkerChildProcess.js");

            let pipelineStagesManager = new PipelineStages();

            // let pipelinesPerProject = await Promise.all(projects.map(project => pipelineStagesManager.getForProject(project.id)));

            // console.log(pipelinesPerProject);

            // Turn stage workers off for projects that have been turned off.
            let pausedProjects = projects.filter(item => (item.is_processing || 0) === 0);

            await Promise.all(pausedProjects.map(project => this.pauseStagesForProject(pipelineStagesManager, project)));

            // Turn stage workers on (but not necessarily processing) for projects that are active for stats.
            // Individual stage processing is maintained in the next step.
            let resumedProjects = projects.filter(item => item.is_processing === true);

            await Promise.all(resumedProjects.map(project => this.resumeStagesForProject(pipelineStagesManager, project)));

            // Refresh processing state for active workers.
            await this.manageStageProcessingFlag();
        } catch (err) {
            debug(`Exception (manageAllWorkers): ${err}`);
        }

        setTimeout(() => this.manageAllWorkers(), 10 * 1000);
    }

    private async resumeStagesForProject(pipelineStagesManager: PipelineStages, project: IProject) {
        let stages = await pipelineStagesManager.getForProject(project.id);

        await Promise.all(stages.map(stage => this.resumeStage(pipelineStagesManager, stage)));
    }

    private async resumeStage(pipelineStagesManager: PipelineStages, stage: IPipelineStage): Promise <boolean> {
        return this.addWorker(stage, this._pipelineStageWorkers, startPipelineStageWorker, "/pipelineMapSchedulerChildProcess.js");
    }

    private async pauseStagesForProject(pipelineStagesManager: PipelineStages, project: IProject) {
        let stages = await pipelineStagesManager.getForProject(project.id);

        await Promise.all(stages.map(stage => this.pauseStage(pipelineStagesManager, stage)));
    }

    private async pauseStage(pipelineStagesManager: PipelineStages, stage: IPipelineStage): Promise <boolean> {
        await pipelineStagesManager.setProcessingStatus(stage.id, false);

        return this.removeWorker(stage, this._pipelineStageWorkers);
    }

    private async manageStageProcessingFlag() {
        let pipelineStagesManager = new PipelineStages();

        let stages: IPipelineStage[] = await pipelineStagesManager.getAll();

        stages.map(stage => {
            let worker = this._pipelineStageWorkers.get(stage.id);

            if (worker) {
                worker.IsProcessingRequested = stage.is_processing;
            }
        });
    }

    private manageWorkers(items: IRunnableTableModelRow[], workerMap: Map<string, IWorkerInterface>, inProcessFunction, childProcessModuleName) {
        let activeItems = items.filter(item => item.is_processing !== null && item.is_processing);

        activeItems.map(async(item) => this.addWorker(item, workerMap, inProcessFunction, childProcessModuleName));

        let inactiveItems = items.filter(item => (item.is_processing || 0) === 0);

        inactiveItems.map(item => this.removeWorker(item, workerMap));
    }

    private async addWorker(item: IRunnableTableModelRow, workerMap: Map<string, IWorkerInterface>, inProcessFunction, childProcessModuleName): Promise<boolean> {
        let worker = workerMap.get(item.id);

        if (!worker) {
            debug(`add worker for ${item.id}`);

            worker = await this.startWorker(inProcessFunction, childProcessModuleName, [item.id]);
            worker.IsProcessingRequested = item.is_processing;

            if (worker) {
                workerMap.set(item.id, worker);
            }

            return true;
        }

        return false;
    }

    private removeWorker(item: IRunnableTableModelRow, workerMap: Map<string, IWorkerInterface>): boolean {
        let worker = workerMap.get(item.id);

        if (worker) {
            debug(`remove worker for ${item.id}`);

            worker.IsCancelRequested = true;

            workerMap.delete(item.id);

            return true;
        }

        return false;
    }

    private startWorkerChildProcess(moduleName: string, args: string[]) {
        // Options
        //   silent - pumps stdio back through this parent process
        //   execArv - remove possible $DEBUG flag on parent process causing address in use conflict
        let worker_process = child_process.fork(path.join(__dirname, moduleName), args, {silent: true, execArgv: []});

        worker_process.stdout.on("data", data => console.log(`${data.toString().slice(0, -1)}`));

        worker_process.stderr.on("data", data => console.log(`${data.toString().slice(0, -1)}`));

        worker_process.on("close", code => console.log(`child process exited with code ${code}`));

        return worker_process;
    }

    private async startWorker(inProcessFunction, childProcessModule: string, args: Array < any > = []) {
        if (this._useChildProcessWorkers) {
            debug("starting worker using child processes");
            return new Promise((resolve) => {
                let worker_process = this.startWorkerChildProcess(childProcessModule, args);
                resolve(worker_process);
            });
        } else {
            debug("starting worker within parent process");
            return await inProcessFunction(...args);
        }
    }
}
