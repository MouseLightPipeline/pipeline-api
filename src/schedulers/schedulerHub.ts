import Timer = NodeJS.Timer;
const path = require("path");
const child_process = require("child_process");

const debug = require("debug")("mouselight:pipeline-api:worker-manager");

import {PipelineStages, IPipelineStage} from "../data-model/pipelineStage";
import {Projects, IProject} from "../data-model/project";
import {IRunnableTableModelRow} from "../data-model/runnableTableModel";
import {startTileStatusFileWorker} from "./tileStatusWorkerChildProcess";
import {startPipelineStageWorker} from "./pipelineMapSchedulerChildProcess";

export interface IWorkerInterface {
    send(data: any);
}

export class SchedulerHub {
    private static _instance: SchedulerHub = null;

    public static Run(useChildProcessWorkers: boolean = false): SchedulerHub {
        if (!this._instance) {
            this._instance = new SchedulerHub(useChildProcessWorkers);
        }

        return this._instance;
    }

    private _useChildProcessWorkers: boolean;

    private _tileStatusWorkers = new Map<string, IWorkerInterface>();
    private _pipelineStageWorkers = new Map<string, IWorkerInterface>();

    private constructor(useChildProcessWorkers: boolean = false) {
        this._useChildProcessWorkers = useChildProcessWorkers;

        this.manageTileStatusWorkers();

        this.managePipelineStageWorkers();
    }

    private async manageTileStatusWorkers() {
        let projectsManager = new Projects();

        let projects: IProject[] = await projectsManager.getAll();

        this.manageWorkers(projects, this._tileStatusWorkers, startTileStatusFileWorker, "/tileStatusWorkerChildProcess.js");

        setTimeout(() => this.manageTileStatusWorkers(), 10 * 1000);
    }

    private async managePipelineStageWorkers() {
        let pipelineStagesManager = new PipelineStages();

        let stages: IPipelineStage[] = await pipelineStagesManager.getAll();

        this.manageWorkers(stages, this._pipelineStageWorkers, startPipelineStageWorker, "/pipelineMapSchedulerChildProcess.js");

        setTimeout(() => this.managePipelineStageWorkers(), 10 * 1000);
    }

    private manageWorkers(items: IRunnableTableModelRow[], workerMap, inProcessFunction, childProcessModuleName) {
        let activeItems = items.filter(item => (item.is_active || 0) === 1);

        activeItems.map(async (item) => {
            let worker = workerMap.get(item.id);

            if (!worker) {
                debug(`start worker for ${item.id}`);

                worker = await this.startWorker(inProcessFunction, childProcessModuleName, [item.id]);

                if (worker) {
                    workerMap.set(item.id, worker);
                }
            }
        });

        let inactiveItems = items.filter(item => (item.is_active || 0) === 0);

        inactiveItems.map(item => {
            let worker = workerMap.get(item.id);

            if (worker) {
                debug(`cancel worker for ${item.id}`);

                workerMap.delete(item.id);

                worker.send({isCancelRequest: true});
            }
        });
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

    private async startWorker(inProcessFunction, childProcessModule: string, args: Array<any> = []) {
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
