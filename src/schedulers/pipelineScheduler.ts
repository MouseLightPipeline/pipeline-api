import {ExecutionStatusCode, CompletionStatusCode} from "../data-model/taskExecution";
const path = require("path");
const fs = require("fs-extra");
const debug = require("debug")("mouselight:pipeline-api:pipeline-worker");

import {updatePipelineStagePerformance, updatePipelineStageCounts} from "../data-model/pipelineStagePerformance";
import {IWorkerInterface} from "./schedulerHub";
import performanceConfiguration from "../../config/performance.config"
import {Projects, IProject} from "../data-model/project";
import {PipelineStages, IPipelineStage} from "../data-model/pipelineStage";
import {
    verifyTable, generatePipelineStageToProcessTableName,
    generatePipelineStageInProcessTableName, generatePipelineStateDatabaseName, connectorForFile,
    generateProjectRootTableName, generatePipelineStageTableName, generatePipelineCustomTableName
} from "../data-access/knexPiplineStageConnection";
import {PipelineWorkers} from "../data-model/pipelineWorker";
import {PipelineWorkerClient} from "../graphql/client/pipelineWorkerClient";
import {TaskDefinitions} from "../data-model/taskDefinition";
import * as Knex from "knex";

const perfConf = performanceConfiguration();

export const DefaultPipelineIdKey = "relative_path";

/**
 * Internal state of a tile within a pipeline stage - used for the state of the previous stage
 * as well as the state in the current stage.
 */
export enum TilePipelineStatus {
    DoesNotExist = 0,
    Incomplete = 1,
    Queued = 2,
    Processing = 3,
    Complete = 4,
    Failed = 5
}

export interface IPipelineTile {
    relative_path?: string;
    tile_name?: string;
    prev_stage_status?: TilePipelineStatus;
    this_stage_status?: TilePipelineStatus;
    x?: number;
    y?: number;
    z?: number;
    lat_x?: number;
    lat_y?: number;
    lat_z?: number;
    cut_offset?: number;
    z_offset?: number;
    delta_z?: number;
    duration?: number;
    cpu_high?: number;
    memory_high?: number;
    created_at?: Date;
    updated_at?: Date;
    deleted_at?: Date;
}

export interface IInProcessTile {
    relative_path: string;
    worker_id: string;
    worker_last_seen: Date;
    task_execution_id: string;
    created_at: Date;
    updated_at: Date;
}

export interface IToProcessTile {
    relative_path: string;
    created_at: Date;
    updated_at: Date;
}

export abstract class PipelineScheduler implements IWorkerInterface {
    protected _pipelineStage: IPipelineStage;

    protected _inputKnexConnector: any;
    protected _inputTableName: string;

    protected _outputKnexConnector: any;
    protected _outputTableName: string;

    protected _inProcessTableName: string;
    protected _toProcessTableName: string;

    private _isCancelRequested: boolean;
    private _isProcessingRequested: boolean;

    protected constructor(pipelineStage: IPipelineStage) {
        this.IsCancelRequested = false;

        this.IsProcessingRequested = false;

        this._pipelineStage = pipelineStage;
    }

    public set IsCancelRequested(b: boolean) {
        this._isCancelRequested = b;
    }

    public get IsCancelRequested() {
        return this._isCancelRequested;
    }

    public set IsProcessingRequested(b: boolean) {
        this._isProcessingRequested = b;
    }

    public get IsProcessingRequested() {
        return this._isProcessingRequested;
    }

    public async run() {
        await this.createTables();

        await this.performWork();
    }

    public async loadTileStatusForPlane(zIndex: number) {
        let tiles = await this.outputTable.where("lat_z", zIndex).select("this_stage_status", "lat_x", "lat_y");

        tiles = tiles.map(tile => {
            tile["stage_id"] = this._pipelineStage.id;
            tile["depth"] = this._pipelineStage.depth;

            return tile;
        });

        return tiles;
    }

    protected get inputTable() {
        return this._inputKnexConnector(this._inputTableName);
    }

    protected get outputTable() {
        return this._outputKnexConnector(this._outputTableName);
    }

    protected get inProcessTable() {
        return this._outputKnexConnector(this._inProcessTableName);
    }

    protected get toProcessTable() {
        return this._outputKnexConnector(this._toProcessTableName);
    }

    protected async loadInProcess(): Promise<IInProcessTile[]> {
        return await this.inProcessTable.select();
    }

    protected async loadToProcess(): Promise<IToProcessTile[]> {
        return await this.toProcessTable.select();
    }

    protected async updateToProcessQueue() {
        debug("looking for new to-process");

        let toProcessInsert: IToProcessTile[] = [];

        let unscheduled: IPipelineTile[] = await this.outputTable.where({
            prev_stage_status: TilePipelineStatus.Complete,
            this_stage_status: TilePipelineStatus.Incomplete,
        }).select("relative_path", "this_stage_status", "tile_name");

        if (unscheduled.length > 0) {
            let projects = new Projects();

            let project: IProject = await projects.get(this._pipelineStage.project_id);

            unscheduled = unscheduled.filter(tile => {
                if (project.region_x_min > -1 && tile.lat_x < project.region_x_min) {
                    return false;
                }

                if (project.region_x_max > -1 && tile.lat_x > project.region_x_max) {
                    return false;
                }

                if (project.region_y_min > -1 && tile.lat_y < project.region_y_min) {
                    return false;
                }

                if (project.region_y_max > -1 && tile.lat_y > project.region_y_max) {
                    return false;
                }

                if (project.region_z_min > -1 && tile.lat_z < project.region_z_min) {
                    return false;
                }

                return !(project.region_z_max > -1 && tile.lat_z > project.region_z_max);
            });

            unscheduled = unscheduled.map(obj => {
                obj.this_stage_status = TilePipelineStatus.Queued;
                return obj;
            });

            let now = new Date();

            toProcessInsert = unscheduled.map(obj => {
                return {
                    relative_path: obj.relative_path,
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

    protected async countInProcess(): Promise<number> {
        let rowsCount = await this._outputKnexConnector(this._inProcessTableName).count(DefaultPipelineIdKey);

        return rowsCount[0][`count("${DefaultPipelineIdKey}")`];
    }

    protected async countToProcess(): Promise<number> {
        let rowsCount = await this._outputKnexConnector(this._toProcessTableName).count(DefaultPipelineIdKey);

        return rowsCount[0][`count("${DefaultPipelineIdKey}")`];
    }

    protected async updateInProcessStatus() {
        let inProcess = await this.loadInProcess();

        let workerManager = new PipelineWorkers();

        // This should not be thousands or even hundreds at a time, just a handful per machine at most per cycle, likely
        // far less depending on how frequently we check, so don't bother with batching for now.
        inProcess.forEach(async(task) => {
            let workerForTask = await workerManager.get(task.worker_id);

            let executionInfo = await PipelineWorkerClient.Instance().queryTaskExecution(workerForTask, task.task_execution_id);

            if (executionInfo != null && executionInfo.execution_status_code === ExecutionStatusCode.Completed) {
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

                // Tile should be marked with status and not be present in any intermediate tables.

                await this.outputTable.where(DefaultPipelineIdKey, task[DefaultPipelineIdKey]).update({this_stage_status: tileStatus});

                await this.inProcessTable.where(DefaultPipelineIdKey, task[DefaultPipelineIdKey]).del();

                if (tileStatus === TilePipelineStatus.Complete) {
                    updatePipelineStagePerformance(this._pipelineStage.id, executionInfo);
                }
            }
        });
    }

    protected async getTaskContext(tile: IPipelineTile): Promise<any> {
        return null;
    }

    protected getTaskArguments(tile: IPipelineTile, context: any): string[] {
        return [];
    }

    protected async scheduleFromList(waitingToProcess: IToProcessTile[]) {
        if (!waitingToProcess || waitingToProcess.length === 0) {
            return;
        }

        debug(`scheduling workers from available ${waitingToProcess.length} pending`);

        let pipelineStages = new PipelineStages();

        let workerManager = new PipelineWorkers();

        let workers = await workerManager.getAll();

        let projects = new Projects();

        let project: IProject = await projects.get(this._pipelineStage.project_id);

        let src_path = project.root_path;

        if (this._pipelineStage.previous_stage_id) {
            let previousStage: IPipelineStage = await pipelineStages.get(this._pipelineStage.previous_stage_id);

            src_path = previousStage.dst_path;
        }

        let tasks = new TaskDefinitions();

        let task = await tasks.get(this._pipelineStage.task_id);

        // The promise returned for each queued item should be true to continue through the list, false to exit the
        // promise chain and not complete the list.
        // The queue for waiting tiles should return true if a worker was found and there is a chance there is another
        // worker available for the next tile and false if the current tile failed to find a worker and the rest should
        // just be skipped this event cycle.
        // The queue for workers should return true if it _did not accept the task_ so that we continue to look for an
        // available worker and false if it did launch a task so that we exit the queue and start on the next tile.
        // That is why the worker queue promise chain resolves to a variable named stillLookingForWorker, and each
        // tile promise resolves to !stillLookingForWorker.
        await this.queue(waitingToProcess, async(toProcessTile: IToProcessTile) => {
            // Will continue until a worker with capacity is found and a task is started.  Workers without capacity
            // return false continuing the iteration.
            debug(`looking for worker for tile ${toProcessTile[DefaultPipelineIdKey]}`);

            let stillLookingForWorker = await this.queue(workers, async(worker) => {
                // Return true to continue searching for an available worker and false if the task is launched.

                try {
                    let taskLoad = PipelineWorkers.getWorkerTaskLoad(worker.id);

                    debug(`worker ${worker.name} has load ${taskLoad} of capacity ${worker.work_unit_capacity}`);

                    if (taskLoad < 0) {
                        // No information
                        debug(`worker ${worker.name} skipped (unknown/unreported task load)`);
                        return true;
                    }

                    let capacity = worker.work_unit_capacity - taskLoad;

                    if (capacity >= task.work_units) {
                        debug(`found worker ${worker.name} with sufficient capacity ${capacity}`);

                        PipelineWorkers.setWorkerTaskLoad(worker.id, taskLoad + task.work_units);

                        let pipelineTile = (await this.outputTable.where(DefaultPipelineIdKey, toProcessTile[DefaultPipelineIdKey]))[0];

                        let outputPath = path.join(this._pipelineStage.dst_path, pipelineTile.relative_path);

                        fs.ensureDirSync(outputPath);

                        let args = [project.name, project.root_path, src_path, this._pipelineStage.dst_path, pipelineTile.relative_path, pipelineTile.tile_name];

                        let context = await this.getTaskContext(pipelineTile);

                        args = args.concat(this.getTaskArguments(pipelineTile, context));

                        let taskExecution = await PipelineWorkerClient.Instance().startTaskExecution(worker, this._pipelineStage.task_id, args);

                        if (taskExecution != null) {
                            let now = new Date();

                            await this.inProcessTable.insert({
                                relative_path: pipelineTile.relative_path,
                                tile_name: pipelineTile.tile_name,
                                worker_id: worker.id,
                                worker_last_seen: now,
                                task_execution_id: taskExecution.id,
                                created_at: now,
                                updated_at: now
                            });

                            pipelineTile.this_stage_status = TilePipelineStatus.Processing;
                            await this.outputTable.where(DefaultPipelineIdKey, pipelineTile[DefaultPipelineIdKey]).update(pipelineTile);

                            await this.toProcessTable.where(DefaultPipelineIdKey, toProcessTile[DefaultPipelineIdKey]).del();
                        }

                        debug(`started task on worker ${worker.name} with execution id ${taskExecution.id}`);

                        return false;
                    }

                    debug(`worker ${worker.name} has insufficient capacity ${capacity} of ${worker.work_unit_capacity}`);

                } catch (err) {
                    debug(`worker ${worker.name} with error starting execution ${err}`);
                }

                return true;
            });

            debug(`worker search for tile ${toProcessTile[DefaultPipelineIdKey]} resolves with stillLookingForWorker: ${stillLookingForWorker}`);

            // If result is true, a worker was never found for the last tile so short circuit be returning a promise
            // that resolves to false.  Otherwise, the tile task was launched, so try the next one.

            return Promise.resolve(!stillLookingForWorker);
        });
    }

    protected async muxInputOutputTiles(knownInput, knownOutput) {
        return {
            toInsert: [],
            toUpdatePrevious: []
        };
    }

    protected async performWork() {
        if (this.IsCancelRequested) {
            debug("cancel requested - exiting stage worker");

            return;
        }

        debug(`performing update for ${this._pipelineStage.id}`);

        try {
            // Update the database with the completion status of tiles from the previous stage.  This essentially converts
            // this_stage_status from the previous stage id table to prev_stage_status for this stage.
            let knownInput = await this.inputTable.select();

            if (knownInput.length > 0) {
                let knownOutput = await this.outputTable.select([DefaultPipelineIdKey, "prev_stage_status"]);

                let sorted = await this.muxInputOutputTiles(knownInput, knownOutput);

                await this.batchInsert(this._outputKnexConnector, this._outputTableName, sorted.toInsert);

                await this.batchUpdate(this._outputKnexConnector, this._outputTableName, sorted.toUpdatePrevious, DefaultPipelineIdKey);
            } else {
                debug("no input from previous stage yet");
            }

            // Check and update the status of anything in-process
            await this.updateInProcessStatus();

            // Look if anything is already in the to-process queue
            let available = await this.loadToProcess();

            //   If not, search database for newly available to-process and put in to-process queue
            if (available.length === 0) {
                available = await this.updateToProcessQueue();
            }

            // If there is any to-process, try to fill worker capacity
            if (this.IsProcessingRequested && available.length > 0) {
                await this.scheduleFromList(available);
            }

            updatePipelineStageCounts(this._pipelineStage.id, await this.countInProcess(), await this.countToProcess());

        } catch (err) {
            console.log(err);
        }

        debug("resetting timer");

        setTimeout(() => this.performWork(), perfConf.regenTileStatusJsonFileSeconds * 1000)
    }

    protected async createTables() {
        if (this._pipelineStage.previous_stage_id) {
            let pipelineManager = new PipelineStages();

            let previousPipeline = await pipelineManager.get(this._pipelineStage.previous_stage_id);

            this._inputTableName = generatePipelineStageTableName(previousPipeline.id);

            this._inputKnexConnector = await connectorForFile(generatePipelineStateDatabaseName(previousPipeline.dst_path), this._inputTableName);
        } else {
            let projectManager = new Projects();

            let project = await projectManager.get(this._pipelineStage.project_id);

            this._inputTableName = generateProjectRootTableName(project.id);

            this._inputKnexConnector = await connectorForFile(generatePipelineStateDatabaseName(project.root_path), this._inputTableName);
        }

        fs.ensureDirSync(this._pipelineStage.dst_path);

        this._outputTableName = generatePipelineStageTableName(this._pipelineStage.id);

        this._outputKnexConnector = await connectorForFile(generatePipelineStateDatabaseName(this._pipelineStage.dst_path), this._outputTableName);

        this._inProcessTableName = generatePipelineStageInProcessTableName(this._pipelineStage.id);

        await verifyTable(this._outputKnexConnector, this._inProcessTableName, (table) => {
            table.string(DefaultPipelineIdKey).primary().unique();
            table.string("tile_name");
            table.uuid("worker_id");
            table.timestamp("worker_last_seen");
            table.uuid("task_execution_id");
            table.timestamps();
        });

        this._toProcessTableName = generatePipelineStageToProcessTableName(this._pipelineStage.id);

        await verifyTable(this._outputKnexConnector, this._toProcessTableName, (table) => {
            table.string(DefaultPipelineIdKey).primary().unique();
            table.timestamps();
        });
    }

    /*
     * Somewhat generic serialized list queue.  Doesn't really belong here.  The queue or related object in async should
     * be able to handle this.
     */
    protected async queue(list, queueFunction) {
        return await list.reduce((promiseChain, item) => this.createQueueFunctionPromise(promiseChain, queueFunction, item), Promise.resolve(true));
    }

    private createQueueFunctionPromise(promiseChain, queueFunction, item) {
        return promiseChain.then((result) => {
            if (result) {
                return queueFunction(item);
            } else {
                return Promise.resolve(false);
            }
        });
    }

    /*
     * Extensions to knex.js.  Don't particularly belong here, but convenient until properly mixed in.
     */

    protected async batchInsert(connector: any, tableName: string, toInsert: any[]) {
        if (!toInsert || toInsert.length === 0) {
            return;
        }

        debug(`batch insert ${toInsert.length} items`);

        while (toInsert.length > 0) {
            await connector.batchInsert(tableName, toInsert.splice(0, perfConf.regenTileStatusSqliteChunkSize));
        }
    }

    protected async batchUpdate(connector: any, tableName: string, toUpdate: any[], idKey: string = DefaultPipelineIdKey) {
        if (!toUpdate || toUpdate.length === 0) {
            return;
        }

        debug(`batch update ${toUpdate.length} items`);

        while (toUpdate.length > 0) {
            await this.batchUpdateInternal(connector, tableName, toUpdate.splice(0, perfConf.regenTileStatusSqliteChunkSize), idKey);
        }
    }

    private async batchUpdateInternal(connector: Knex, tableName: string, items: any[], idKey: string) {
        await connector.transaction((trx) => {
            return items.reduce((promiseChain, item) => this.createUpdatePromise(promiseChain, connector, tableName, trx, item, idKey), Promise.resolve());
        });
    }

    private createUpdatePromise(promiseChain: any, connector: Knex, tableName: string, transaction: any, item: any[], idKey: string) {
        return promiseChain.then(() => {
            return connector(tableName).where(idKey, item[idKey]).update(item).transacting(transaction);
        });
    }
}
