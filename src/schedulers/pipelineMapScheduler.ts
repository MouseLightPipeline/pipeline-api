const path = require("path");
const fs = require("fs-extra");

import {
    PipelineScheduler, DefaultPipelineIdKey, TilePipelineStatus, ExecutionStatusCode,
    CompletionStatusCode
} from "./pipelineScheduler";

const debug = require("debug")("mouselight:pipeline-api:pipeline-map-worker");

import {
    connectorForFile, generatePipelineStageTableName, generatePipelineStateDatabaseName, TileStatusPipelineStageId,
    generatePipelineStageInProcessTableName, verifyTable, generatePipelineStageToProcessTableName
} from "../data-access/knexPiplineStageConnection";

import {IPipelineStage, PipelineStages} from "../data-model/pipelineStage";
import {Projects, IProject} from "../data-model/project";

import performanceConfiguration from "../../config/performance.config"
import {PipelineWorkers} from "../data-model/pipelineWorker";
import {PipelineWorkerClient} from "../graphql/client/pipelineWorkerClient";

const perfConf = performanceConfiguration();

export class PipelineMapScheduler extends PipelineScheduler {
    private _pipelineStage: IPipelineStage;

    private _inProcessTableName: string;

    private _toProcessTableName: string;

    public constructor(pipelineStage: IPipelineStage) {
        super();

        this._pipelineStage = pipelineStage;
    }

    public async run() {
        if (this._pipelineStage.previous_stage_id) {
            let pipelineManager = new PipelineStages();

            let previousPipeline = await pipelineManager.get(this._pipelineStage.previous_stage_id);

            this._inputTableName = generatePipelineStageTableName(previousPipeline.id);

            this._inputKnexConnector = await connectorForFile(generatePipelineStateDatabaseName(previousPipeline.dst_path), this._inputTableName);
        } else {
            let projectManager = new Projects();

            let project = await projectManager.get(this._pipelineStage.project_id);

            this._inputTableName = generatePipelineStageTableName(TileStatusPipelineStageId);

            this._inputKnexConnector = await connectorForFile(generatePipelineStateDatabaseName(project.root_path), this._inputTableName);
        }

        fs.ensureDirSync(this._pipelineStage.dst_path);

        this._outputTableName = generatePipelineStageTableName(this._pipelineStage.id);

        this._outputKnexConnector = await connectorForFile(generatePipelineStateDatabaseName(this._pipelineStage.dst_path), this._outputTableName);

        this._inProcessTableName = generatePipelineStageInProcessTableName(this._pipelineStage.id);

        await verifyTable(this._outputKnexConnector, this._inProcessTableName, (table) => {
            table.string("relative_path").primary().unique();
            table.string("tile_name");
            table.uuid("worker_id");
            table.timestamp("worker_last_seen");
            table.uuid("task_execution_id");
            table.timestamps();
        });

        this._toProcessTableName = generatePipelineStageToProcessTableName(this._pipelineStage.id);

        await verifyTable(this._outputKnexConnector, this._toProcessTableName, (table) => {
            table.string("relative_path").primary().unique();
            table.string("tile_name");
            table.timestamps();
        });

        this.performWork();
    }

    private async performWork() {
        if (this._isCancelRequested) {
            debug("honoring cancel request with early return");
            return;
        }

        debug(`performing update for ${this._pipelineStage.id}`);

        // Update the database with the completion status of tiles from the previous stage.  This essentially converts
        // current_stage_is_complete from the previous stage id table to previous_stage_is_complete for this stage.
        let knownInput = await this.inputTable.select(DefaultPipelineIdKey, "current_stage_status", "tile_name");

        if (knownInput.length > 0) {
            let knownOutput = await this.outputTable.select([DefaultPipelineIdKey, "previous_stage_status"]);

            let sorted = this.muxInputOutputTiles(knownInput, knownOutput);

            await this.batchInsert(this._outputKnexConnector, this._outputTableName, sorted.toInsert);

            await this.batchUpdate(this._outputKnexConnector, this._outputTableName, sorted.toUpdatePrevious, DefaultPipelineIdKey);
        } else {
            debug("no input from previous stage yet");
        }

        // Check and update the status of anything in-process
        this.updateInProcessStatus();

        // If there are no available schedulers, exit

        // Look if anything is already in the to-process queue
        let available = await this.loadAvailableToProcess();

        //   If not, search database for to-process and put in to-process queue
        if (available.length === 0) {
            available = await this.updateToProcessQueue();
        }

        // If there is any to-process, try to fill worker capacity
        if (available.length > 0) {
            this.scheduleFromList(available);
        }

        debug("resetting timer");

        setTimeout(() => this.performWork(), perfConf.regenTileStatusJsonFileSeconds * 1000)
    }

    private async updateInProcessStatus() {
        let inProcess = await this.loadInProcess();

        // This should not thousands or even hundreds at a time, just a handful per machine at most per cycle, likely
        // far less depending on how frequently we check, so don't bother with batching for now.
        inProcess.forEach(async(task) => {
            let executionInfo = await PipelineWorkerClient.Instance().queryTaskExecution(task.worker_id, task.task_execution_id);

            if (executionInfo != null) {
                if (executionInfo.execution_status_code === ExecutionStatusCode.Completed) {
                    let tileStatus = TilePipelineStatus.Queued;

                    switch (executionInfo.completion_status_code) {
                        case CompletionStatusCode.Success:
                            tileStatus = TilePipelineStatus.Complete;
                            break;
                        case CompletionStatusCode.Error:
                            tileStatus = TilePipelineStatus.Failed; // Do not queue again
                            break;
                        case CompletionStatusCode.Cancel:
                            tileStatus = TilePipelineStatus.Incomplete; // Return to incomplete to be queued again
                            break;
                    }

                    // Tile should be marked complete, not be present in any intermediate tables, and not change again.

                    await this._outputKnexConnector(this._outputTableName).where("relative_path", task.relative_path).update({current_stage_status: TilePipelineStatus.Complete});

                    await this._outputKnexConnector(this._inProcessTableName).where("relative_path", task.relative_path).del();
                }
            }
        });
    }

    private async scheduleFromList(availableList) {
        if (!availableList || availableList.length === 0) {
            return;
        }

        debug(`scheduling workers from available ${availableList.length} to-process`);

        let projects = new Projects();

        let pipelineStages = new PipelineStages();

        let workerManager = new PipelineWorkers();

        let workers = await workerManager.getAll();

        let project: IProject = await projects.get(this._pipelineStage.project_id);

        let src_path = project.root_path;

        if (this._pipelineStage.previous_stage_id) {
            let previousStage: IPipelineStage = await pipelineStages.get(this._pipelineStage.previous_stage_id);

            src_path = previousStage.dst_path;
        }

        // Will continue until capacity is exhausted.  Returning false for starting something in the list will short-circuit
        // the every loop.
        availableList.every(available => {
            // Will continue until a worker with capacity is found and a task is started.  Workers without capacity
            // return false continuing the iteration.
            return workers.some(async(worker) => {
                let taskCount = PipelineWorkers.getWorkerTaskCount(worker.id);

                if (taskCount < 0) {
                    return false;
                }

                let capacity = 3 - taskCount;

                if (capacity > 0) {
                    debug(`found worker ${worker.name} with capacity ${capacity}`);

                    PipelineWorkers.setWorkerTaskCount(worker.id, taskCount + 1);

                    let outputPath = path.join(this._pipelineStage.dst_path, available.relative_path);

                    fs.ensureDirSync(outputPath);

                    let args = [project.name, project.root_path, src_path, this._pipelineStage.dst_path, available.relative_path, available.tile_name, 0];

                    let taskExecution = await PipelineWorkerClient.Instance().startTaskExecution(worker, this._pipelineStage.task_id, args);

                    if (taskExecution != null) {
                        let now = new Date();
                        await this._outputKnexConnector(this._inProcessTableName).insert({
                            relative_path: available.relative_path,
                            tile_name: available.tile_name,
                            worker_id: worker.id,
                            worker_last_seen: now,
                            task_execution_id: taskExecution.id,
                            created_at: now,
                            updated_at: now
                        });

                        await this._outputKnexConnector(this._toProcessTableName).where("relative_path", available.relative_path).del();
                    }

                    debug(`started task on worker ${worker.name} with execution id ${taskExecution.id}`);

                    return true;
                }

                return false;
            });

        });
    }

    private async loadInProcess() {
        debug("loading in-process");

        return await this._outputKnexConnector(this._inProcessTableName).select();
    }


    private async loadAvailableToProcess() {
        debug("loading available to-process");

        return await this._outputKnexConnector(this._toProcessTableName).select();
    }

    private async updateToProcessQueue() {
        debug("looking for new to-process");

        let toProcessInsert = [];

        let unscheduled = await this.outputTable.where({
            previous_stage_status: TilePipelineStatus.Complete,
            current_stage_status: TilePipelineStatus.Incomplete,
        });

        if (unscheduled.length > 0) {
            unscheduled = unscheduled.map(obj => {
                obj.current_stage_status = TilePipelineStatus.Queued;
                return obj;
            });

            let now = new Date();

            toProcessInsert = unscheduled.map(obj => {
                return {
                    relative_path: obj.relative_path,
                    tile_name: obj.tile_name,
                    created_at: now,
                    updated_at: now
                };
            });

            debug(`transitioning ${unscheduled.length} tiles to to-process queue`);

            await this.batchInsert(this._outputKnexConnector, this._toProcessTableName, toProcessInsert);

            await this.batchUpdate(this._outputKnexConnector, this._outputTableName, unscheduled);
        }

        return toProcessInsert;
    }

    private muxInputOutputTiles(knownInput, knownOutput) {
        let sorted = {
            toInsert: [],
            toUpdatePrevious: []
        };

        let knownOutputLookup = knownOutput.map(obj => obj[DefaultPipelineIdKey]);

        knownInput.reduce((list, inputTile) => {
            let idx = knownOutputLookup.indexOf(inputTile[DefaultPipelineIdKey]);

            let existingOutput = idx > -1 ? knownOutput[idx] : null;

            if (existingOutput) {
                if (existingOutput.previous_stage_status !== inputTile.current_stage_status) {
                    list.toUpdatePrevious.push({
                        previous_stage_status: inputTile.current_stage_status,
                        updated_at: new Date()
                    });
                }
            } else {
                let now = new Date();
                list.toInsert.push({
                    relative_path: inputTile[DefaultPipelineIdKey],
                    tile_name: inputTile.tile_name,
                    previous_stage_status: inputTile.current_stage_status,
                    current_stage_status: TilePipelineStatus.Incomplete,
                    created_at: now,
                    updated_at: now
                });
            }

            return list;
        }, sorted);

        return sorted;
    }
}
