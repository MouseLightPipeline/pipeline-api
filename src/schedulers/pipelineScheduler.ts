import * as  path from "path";
import {isNullOrUndefined} from "util";
import * as _ from "lodash";

const fse = require("fs-extra");
const debug = require("debug")("pipeline:coordinator-api:pipeline-worker");

import {
    updatePipelineStagePerformance,
    updatePipelineStageCounts
} from "../data-model/sequelize/pipelineStagePerformance";
import {ISchedulerInterface} from "./schedulerHub";
import performanceConfiguration from "../options/performanceOptions"
import {
    verifyTable, generatePipelineStageToProcessTableName,
    generatePipelineStageInProcessTableName, generatePipelineStateDatabaseName, connectorForFile,
    generatePipelineStageTableName, generateProjectRootTableName
} from "../data-access/knexPiplineStageConnection";
import {PipelineWorkerClient} from "../graphql/client/pipelineWorkerClient";
import * as Knex from "knex";
import {PipelineServerContext} from "../graphql/pipelineServerContext";
import {IPipelineWorker} from "../data-model/sequelize/pipelineWorker";
import {IProject} from "../data-model/sequelize/project";
import {PersistentStorageManager} from "../data-access/sequelize/databaseConnector";
import {IPipelineStage} from "../data-model/sequelize/pipelineStage";
import {CompletionStatusCode, ExecutionStatusCode} from "../data-model/sequelize/taskExecution";


const perfConf = performanceConfiguration();

const MAX_KNOWN_INPUT_SKIP_COUNT = 10;

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
    Failed = 5,
    Canceled = 6
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

export abstract class PipelineScheduler implements ISchedulerInterface {
    protected _pipelineStage: IPipelineStage;

    protected _inputKnexConnector: any;
    protected _inputTableName: string;

    protected _outputKnexConnector: any;
    protected _outputTableName: string;

    protected _inProcessTableName: string;
    protected _toProcessTableName: string;

    private _isCancelRequested: boolean;
    private _isProcessingRequested: boolean;

    private _isInitialized: boolean = false;

    private _knownInputSkipCheckCount: number = 0;

    protected constructor(pipelineStage: IPipelineStage) {
        this.IsExitRequested = false;

        this.IsProcessingRequested = false;

        this._pipelineStage = pipelineStage;
    }

    public set IsExitRequested(b: boolean) {
        this._isCancelRequested = b;
    }

    public get IsExitRequested() {
        return this._isCancelRequested;
    }

    public set IsProcessingRequested(b: boolean) {
        this._isProcessingRequested = b;
    }

    public get IsProcessingRequested() {
        return this._isProcessingRequested;
    }

    public async run() {
        if (this._isInitialized) {
            return;
        }

        this.transitionToInitialized();
    }

    public async loadTileStatusForPlane(zIndex: number) {
        if (!this._outputKnexConnector) {
            return [];
        }

        let tiles = await this.outputTable.where("lat_z", zIndex).select("relative_path", "this_stage_status", "lat_x", "lat_y");

        tiles = tiles.map(tile => {
            tile["stage_id"] = this.stageId;
            tile["depth"] = this._pipelineStage ? this._pipelineStage.depth : 0;

            return tile;
        });

        return tiles;
    }

    protected get stageId() {
        return this._pipelineStage.id;
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

    protected async loadToProcess(limit: number = 0): Promise<IToProcessTile[]> {
        if (limit > 0) {
            return await this.toProcessTable.select().orderBy("relative_path", "asc").limit(limit);
        } else {
            return await this.toProcessTable.select().orderBy("relative_path", "asc");
        }
    }
,
    protected async updateToProcessQueue() {
        debug("looking for new to-process");

        let toProcessInsert: IToProcessTile[] = [];

        const unscheduled: IPipelineTile[] = await this.outputTable.where({
            prev_stage_status: TilePipelineStatus.Complete,
            this_stage_status: TilePipelineStatus.Incomplete,
        }).select();

        debug(`found ${unscheduled.length} unscheduled`);

        if (unscheduled.length > 0) {
            let waitingToProcess = await this.loadToProcess();

            let projects = PersistentStorageManager.Instance().Projects;

            let project: IProject = await projects.findById(this._pipelineStage.project_id);

            // Only items that are ready to queue, but aren't actually in the toProcess table yet.  There appear to be
            // some resubmit situations where these are out of sync temporarily.
            const notAlreadyInToProcessTable = _.differenceBy(unscheduled, waitingToProcess, "relative_path");

            // Items that are already queued in toProcess table, but for some reason are listed as incomplete rather
            // than queued in the main table.
            let alreadyInToProcessTable = _.intersectionBy(unscheduled, waitingToProcess, "relative_path");

            let toSchedule = notAlreadyInToProcessTable.filter(tile => {
                if (!isNullOrUndefined(project.region_x_min) && tile.lat_x < project.region_x_min) {
                    return false;
                }

                if (!isNullOrUndefined(project.region_x_max) && tile.lat_x > project.region_x_max) {
                    return false;
                }

                if (!isNullOrUndefined(project.region_y_min) && tile.lat_y < project.region_y_min) {
                    return false;
                }

                if (!isNullOrUndefined(project.region_y_max) && tile.lat_y > project.region_y_max) {
                    return false;
                }

                if (!isNullOrUndefined(project.region_z_min) && tile.lat_z < project.region_z_min) {
                    return false;
                }

                return !(!isNullOrUndefined(project.region_z_max) && tile.lat_z > project.region_z_max);
            });

            debug(`have ${unscheduled.length} unscheduled after region filtering`);

            toSchedule = toSchedule.map(obj => {
                obj.this_stage_status = TilePipelineStatus.Queued;
                return obj;
            });

            let now = new Date();

            toProcessInsert = toSchedule.map(obj => {
                return {
                    relative_path: obj.relative_path,
                    created_at: now,
                    updated_at: now
                };
            });

            // Update that are already in the toProcess table.
            alreadyInToProcessTable = alreadyInToProcessTable.map(obj => {
                obj.this_stage_status = TilePipelineStatus.Queued;
                return obj
            });

            if (alreadyInToProcessTable.length > 0) {
                await this.batchUpdate(this._outputKnexConnector, this._outputTableName, alreadyInToProcessTable);
            }

            debug(`transitioning ${toSchedule.length} tiles to to-process queue`);

            await this.batchInsert(this._outputKnexConnector, this._toProcessTableName, toProcessInsert);

            await this.batchUpdate(this._outputKnexConnector, this._outputTableName, toSchedule);
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

        let workerManager = new PipelineServerContext();

        if (inProcess.length > 0) {
            debug(`updating status of ${inProcess.length} in process tiles`);

            // This should not be thousands or even hundreds at a time, just a handful per machine at most per cycle, likely
            // far less depending on how frequently we check, so don't bother with batching for now.
            await Promise.all(inProcess.map(tile => this.updateOneExecutingTile(workerManager, tile)));

            debug(`updated status of ${inProcess.length} in process tiles`);
        } else {
            debug(`no in process tiles to update`);
        }
    }

    private async updateOneExecutingTile(serverContext: PipelineServerContext, tile: IInProcessTile): Promise<void> {
        let workerForTask = await serverContext.getPipelineWorker(tile.worker_id);

        let executionInfo = await PipelineWorkerClient.Instance().queryTaskExecution(workerForTask, tile.task_execution_id);

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
                    tileStatus = TilePipelineStatus.Canceled; // Could return to incomplete to be queued again
                    break;
            }

            // Tile should be marked with status and not be present in any intermediate tables.

            await this.outputTable.where(DefaultPipelineIdKey, tile[DefaultPipelineIdKey]).update({this_stage_status: tileStatus});

            await this.inProcessTable.where(DefaultPipelineIdKey, tile[DefaultPipelineIdKey]).del();

            if (tileStatus === TilePipelineStatus.Complete) {
                updatePipelineStagePerformance(this._pipelineStage.id, executionInfo);
            }
        }
    }

    protected async getTaskContext(tile: IPipelineTile): Promise<any> {
        return null;
    }

    protected getTaskArguments(tile: IPipelineTile, context: any): string[] {
        return [];
    }

    protected async scheduleFromList() {
        let pipelineStages = PersistentStorageManager.Instance().PipelineStages;

        let workerManager = new PipelineServerContext();

        let allWorkers = await workerManager.getPipelineWorkers();

        // Use cluster proxies as last resort when behind.
        let workers = allWorkers.filter(worker => worker.is_in_scheduler_pool).sort((a, b) => {
            if (a.is_cluster_proxy === b.is_cluster_proxy) {
                return 0;
            }

            return a.is_cluster_proxy ? 1 : -1;
        });

        if (workers.length === 0) {
            debug(`no available workers to schedule (of ${allWorkers.length} known)`);
            return;
        }

        let projects = PersistentStorageManager.Instance().Projects;

        let project: IProject = await projects.findById(this._pipelineStage.project_id);

        let src_path = project.root_path;

        if (this._pipelineStage.previous_stage_id) {
            let previousStage: IPipelineStage = await pipelineStages.findById(this._pipelineStage.previous_stage_id);

            src_path = previousStage.dst_path;
        }

        // The promise returned for each queued item should be true to continue through the list, false to exit the
        // promise chain and not complete the list.
        //
        // The goal is to fill a worker completely before moving on to the next worker.
        await this.queue(workers, async (worker: IPipelineWorker) => {

            let taskLoad = worker.task_load;

            if (taskLoad < 0) {
                debug(`worker ${worker.name} skipped (unknown/unreported task load)`);
                return true;
            }

            const task = await PipelineWorkerClient.Instance().queryTaskDefinition(worker, this._pipelineStage.task_id);

            if (!task) {
                debug(`could not get task definition ${this._pipelineStage.task_id} from worker ${worker.id}`);
                return true;
            }

            const workUnits = worker.is_cluster_proxy ? 1 : task.work_units;

            let capacity = worker.work_unit_capacity - taskLoad;

            if ((capacity + 0.000001) < workUnits) {
                debug(`worker ${worker.name} has insufficient capacity: ${capacity} of ${worker.work_unit_capacity}`);
                return true;
            }

            debug(`worker ${worker.name} has load ${taskLoad} of capacity ${worker.work_unit_capacity}`);

            let waitingToProcess = await this.loadToProcess(200);

            if (!waitingToProcess || waitingToProcess.length === 0) {
                return false;
            }

            debug(`scheduling worker from available ${waitingToProcess.length} pending`);

            // Will continue through all tiles until the worker reaches full capacity
            let stillLookingForTilesForWorker = await this.queue(waitingToProcess, async (toProcessTile: IToProcessTile) => {
                // Return true to continue searching for an available worker and false if the task is launched.
                try {
                    let pipelineTile = (await this.outputTable.where(DefaultPipelineIdKey, toProcessTile[DefaultPipelineIdKey]))[0];

                    let outputPath = path.join(this._pipelineStage.dst_path, pipelineTile.relative_path);

                    fse.ensureDirSync(outputPath);
                    fse.chmodSync(outputPath, 0o775);

                    let args = [project.name, project.root_path, src_path, this._pipelineStage.dst_path, pipelineTile.relative_path, pipelineTile.tile_name, project.log_root_path];

                    let context = await this.getTaskContext(pipelineTile);

                    args = args.concat(this.getTaskArguments(pipelineTile, context));

                    let taskExecution = await PipelineWorkerClient.Instance().startTaskExecution(worker, this._pipelineStage.task_id, this._pipelineStage.id, pipelineTile.relative_path, args);

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

                        // TODO: Should use value returned from taskExecution in case it is worker-dependent
                        // In order to do that, workers must be updated to return the right value when a cluster
                        // worker (i.e., 1 per job).  Currently they only return the actual value.
                        taskLoad += workUnits;

                        worker.task_load = taskLoad;

                        pipelineTile.this_stage_status = TilePipelineStatus.Processing;

                        await this.outputTable.where(DefaultPipelineIdKey, pipelineTile[DefaultPipelineIdKey]).update(pipelineTile);

                        await this.toProcessTable.where(DefaultPipelineIdKey, toProcessTile[DefaultPipelineIdKey]).del();

                        debug(`started task on worker ${worker.name} with execution id ${taskExecution.id}`);

                        capacity = worker.work_unit_capacity - taskLoad;

                        // Does this worker have enough capacity to handle more tiles from this task given the work units
                        // per task on this worker.
                        if ((capacity + 0.00001) < workUnits) {
                            debug(`worker ${worker.name} has insufficient capacity ${capacity} of ${worker.work_unit_capacity} for further tasks`);
                            return false;
                        }

                        return true;
                    }
                } catch (err) {
                    debug(`worker ${worker.name} with error starting execution ${err}`);
                    return false;
                }

                if (!this.IsProcessingRequested || this.IsExitRequested) {
                    debug("cancel requested - exiting stage worker");
                    return false;
                }

                // Did not start due to unavailability or error starting.  Return true to keep looking for a worker.
                return true;
            });

            if (!this.IsProcessingRequested || this.IsExitRequested) {
                debug("cancel requested - exiting stage worker");
                return false;
            }

            // debug(`worker search for tile ${toProcessTile[DefaultPipelineIdKey]} resolves with stillLookingForTilesForWorker: ${stillLookingForTilesForWorker}`);

            // If result is true, a worker was never found for the last tile so short circuit be returning a promise
            // that resolves to false.  Otherwise, the tile task was launched, so try the next one.

            return Promise.resolve(!stillLookingForTilesForWorker);
        });
    }

    protected async muxInputOutputTiles(knownInput, knownOutput) {
        return {
            toInsert: [],
            toUpdatePrevious: []
        };
    }

    protected async performWork() {
        if (this.IsExitRequested) {
            debug("cancel requested - exiting stage worker");
            return;
        }

        try {
            // Check and updateFromInputProject the status of anything in-process
            await this.updateInProcessStatus();

            // Look if anything is already in the to-process queue
            let available = await this.loadToProcess();

            //   If not, search database for newly available to-process and put in to-process queue
            if (available.length === 0 || this._knownInputSkipCheckCount >= MAX_KNOWN_INPUT_SKIP_COUNT) {
                // Update the database with the completion status of tiles from the previous stage.  This essentially converts
                // this_stage_status from the previous stage id table to prev_stage_status for this stage.
                let knownInput = await this.inputTable.select();

                if (knownInput.length > 0) {
                    debug(`updating known input tiles`);

                    let knownOutput = await this.outputTable.select([DefaultPipelineIdKey, "prev_stage_status"]);

                    let sorted = await this.muxInputOutputTiles(knownInput, knownOutput);

                    await this.batchInsert(this._outputKnexConnector, this._outputTableName, sorted.toInsert);

                    await this.batchUpdate(this._outputKnexConnector, this._outputTableName, sorted.toUpdatePrevious, DefaultPipelineIdKey);
                } else {
                    debug("no input from previous stage yet");
                }

                available = await this.updateToProcessQueue();

                debug(`${available.length} newly added available to process`);

                this._knownInputSkipCheckCount = 0;
            } else {
                debug(`skipping new to queue check with ${available.length} available to process (skip count ${this._knownInputSkipCheckCount} of ${MAX_KNOWN_INPUT_SKIP_COUNT})`);
                this._knownInputSkipCheckCount++;
            }

            // If there is any to-process, try to fill worker capacity
            if (this.IsProcessingRequested && available.length > 0) {
                debug(`scheduling processing`);
                await this.scheduleFromList();
            }

            updatePipelineStageCounts(this._pipelineStage.id, await this.countInProcess(), await this.countToProcess());

        } catch (err) {
            console.log(err);
        }

        setTimeout(() => this.performWork(), perfConf.pipelineSchedulerIntervalSeconds * 1000)
    }

    protected async createTables() {
        if (this.IsExitRequested) {
            debug("cancel request - early return");
            return false;
        }

        let srcPath = "";

        if (this._pipelineStage.previous_stage_id) {
            let pipelineManager = PersistentStorageManager.Instance().PipelineStages;

            let previousPipeline = await pipelineManager.findById(this._pipelineStage.previous_stage_id);

            this._inputTableName = generatePipelineStageTableName(this._pipelineStage.previous_stage_id);

            srcPath = previousPipeline.dst_path;
        } else {
            let projectManager = PersistentStorageManager.Instance().Projects;

            let project = await projectManager.findById(this._pipelineStage.project_id);

            this._inputTableName = generateProjectRootTableName(project.id);

            srcPath = project.root_path;
        }

        try {
            fse.ensureDirSync(srcPath);
            fse.chmodSync(srcPath, 0o775);
        } catch (err) {
            if (err && err.code === "EACCES") {
                debug("pipeline source directory permission denied");
            } else {
                debug(err);
            }
            return false;
        }

        try {
            fse.ensureDirSync(this._pipelineStage.dst_path);
            fse.chmodSync(srcPath, 0o775);
        } catch (err) {
            if (err && err.code === "EACCES") {
                debug("pipeline output directory permission denied");
            } else {
                debug(err);
            }
            return false;
        }

        this._inputKnexConnector = await connectorForFile(generatePipelineStateDatabaseName(srcPath), this._inputTableName);

        if (!this._inputKnexConnector) {
            return false;
        }

        this._outputTableName = generatePipelineStageTableName(this._pipelineStage.id);

        this._outputKnexConnector = await connectorForFile(generatePipelineStateDatabaseName(this._pipelineStage.dst_path), this._outputTableName);

        if (!this._outputKnexConnector) {
            return false;
        }

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

        return true;
    }

    /*
     * State transitions
     */
    private transitionToInitialized() {
        try {
            this._isInitialized = true;

            // debug(`transitioning ${this._pipelineStage.id} to establish data connection`);

            setImmediate(() => this.transitionToEstablishDataConnection());
        } catch (err) {
            debug(err);
        }
    }

    private async transitionToEstablishDataConnection() {
        try {
            if (this.IsExitRequested) {
                // debug(`exit requested for ${this._pipelineStage.id} during transition to establish data connection`);
                return;
            }

            const connected = await this.createTables();

            if (connected) {
                // debug(`transitioning ${this._pipelineStage.id} to establish data connection`);

                await this.transitionToProcessStage()
            } else {
                // debug(`failed to establish data connection for ${this._pipelineStage.id} setting timeout retry`);
                setTimeout(() => this.transitionToEstablishDataConnection(), perfConf.pipelineSchedulerIntervalSeconds * 1000);
            }
        } catch (err) {
            debug(err);
        }
    }

    private async transitionToProcessStage() {
        try {
            if (this.IsExitRequested) {
                // debug(`exit requested for ${this._pipelineStage.id} during transition to process stage`);
                return;
            }

            // debug(`transitioning ${this._pipelineStage.id} to perform work`);
            await this.performWork();
        } catch (err) {
            debug(err);
        }
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
