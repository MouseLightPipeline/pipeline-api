const debug = require("debug")("mouselight:pipeline-api:pipeline-worker");

import {IWorkerInterface} from "./schedulerHub";
import performanceConfiguration from "../../config/performance.config"
const perfConf = performanceConfiguration();

/**
 * Mirrors values in acq-dashboard-worker-api
 */
export enum ExecutionStatusCode {
    Undefined = 0,
    Initializing = 1,
    Running = 2,
    Orphaned = 3,   // Was marked initialized/running but can not longer find in process manager list
    Completed = 4
}

/**
 * Mirrors values in acq-dashboard-worker-api
 */
export enum CompletionStatusCode {
    Unknown = 0,
    Incomplete = 1,
    Cancel = 2,
    Success = 3,
    Error = 4
}

export const DefaultPipelineIdKey = "relative_path";

/**
 * Internal state of a tile within a pipeline stage - used for the state of the previous stage
 * as well as the state in the current stage.
 */
export enum TilePipelineStatus {
    DoesNotExist = 0,
    Incomplete = 1,
    Queued = 2,
    Complete = 3,
    Failed = 4
}

/**
 * Mirror or subset of interface defined in acq-dashboard-worker-api as needed to monitor task execution status.
 */
export interface ITaskExecution {
    id?: string;
    resolved_script?: string;
    resolved_interpreter?: string;
    execution_status_code?: ExecutionStatusCode;
    completion_status_code?: CompletionStatusCode;
    machine_id?: string;
    started_at?: Date;
    completed_at?: Date;
    script_args?: string;
    last_process_status_code?: number;
    max_memory?: number;
    max_cpu?: number;
    exit_code?: number;
    task_id?: string;
    created_at?: Date;
    updated_at?: Date;
    deleted_at?: Date;
}

export class PipelineScheduler implements IWorkerInterface {
    protected _inputKnexConnector: any;
    protected _inputTableName: string;

    protected _outputKnexConnector: any;
    protected _outputTableName: string;

    protected _isCancelRequested: boolean;

    protected constructor() {
        this._isCancelRequested = false;
    }

    public send(data: any) {
        if (data && data.isCancelRequest) {
            this.IsCancelRequested = data.isCancelRequest;
        }
    }

    public set IsCancelRequested(b: boolean) {
        this._isCancelRequested = b;
    }

    protected get inputTable() {
        return this._inputKnexConnector(this._inputTableName);
    }

    protected get outputTable() {
        return this._outputKnexConnector(this._outputTableName);
    }

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

    private async batchUpdateInternal(connector, tableName, items, idKey) {
        await connector.transaction((trx) => {
            return items.reduce((promiseChain, item) => this.createUpdatePromise(promiseChain, connector, trx, item, idKey), Promise.resolve());
        });
    }

    private createUpdatePromise(promiseChain: any, connector: any, transaction: any, item: any, idKey: string) {
        return promiseChain.then(() => {
            return connector(this._outputTableName).where(idKey, item[idKey]).update(item).transacting(transaction);
        });
    }
}