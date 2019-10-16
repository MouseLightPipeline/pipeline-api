import {Sequelize, Model, DataTypes, BuildOptions} from "sequelize";

export interface IStartTaskInput {
    pipelineStageId: string;
    tileId: string;
    logFile: string;
}

export enum ExecutionStatus {
    Undefined = 0,
    Initializing = 1,
    Running = 2,
    Zombie = 3,   // Was marked initialized/running but can not longer find in process manager list/cluster jobs
    Orphaned = 4, // Found in process manager with metadata that associates to worker, but no linked task in database
    Completed = 5
}

export enum CompletionResult {
    Unknown = 0,
    Incomplete = 1,
    Cancel = 2,
    Success = 3,
    Error = 4,
    Resubmitted = 5
}


export enum SyncStatus {
    Never = 0,
    InProgress = 1,
    Complete = 2,
    Expired = 3
}

/*
export interface ITaskExecutionAttributes {
    id?: string;
    task_definition_id?: string;
    pipeline_stage_id?: string;
    tile_id?: string;
    resolved_output_path?: string;
    resolved_script?: string;
    resolved_interpreter?: string;
    resolved_script_args?: string;
    resolved_cluster_args?: string;
    resolved_log_path?: string;
    expected_exit_code?: number;
    worker_id?: string;
    worker_task_execution_id?: string,
    local_work_units?: number;
    cluster_work_units?: number;
    queue_type?: number;
    job_id?: number;
    job_name?: string;
    execution_status_code?: ExecutionStatus;
    completion_status_code?: CompletionResult;
    last_process_status_code?: number;
    cpu_time_seconds?: number;
    max_cpu_percent?: number
    max_memory_mb?: number;
    exit_code?: number;
    submitted_at?: Date;
    started_at?: Date;
    completed_at?: Date;
    sync_status?: SyncStatus;
    synchronized_at?: Date;
    created_at?: Date;
    updated_at?: Date;
    deleted_at?: Date;
}
*/

export interface TaskExecution extends Model {
    id: string;
    task_definition_id: string;
    pipeline_stage_id: string;
    tile_id: string;
    resolved_output_path: string;
    resolved_script: string;
    resolved_interpreter: string;
    resolved_script_args: string;
    resolved_cluster_args: string;
    resolved_log_path: string;
    expected_exit_code: number;
    worker_id: string;
    worker_task_execution_id: string;
    local_work_units: number;
    cluster_work_units: number;
    queue_type: number;
    job_id: number;
    job_name: string;
    execution_status_code: ExecutionStatus;
    completion_status_code: CompletionResult;
    last_process_status_code: number;
    cpu_time_seconds: number;
    max_cpu_percent: number
    max_memory_mb: number;
    exit_code: number;
    submitted_at: Date;
    started_at: Date;
    completed_at: Date;
    sync_status: SyncStatus;
    synchronized_at: Date;

    readonly created_at: Date;
    readonly updated_at: Date;
    readonly deleted_at: Date;
}

export type TaskExecutionStatic = typeof Model & {
    new (values?: object, options?: BuildOptions): TaskExecution;
}

/*
export interface ITaskExecution extends Instance<ITaskExecutionAttributes>, ITaskExecutionAttributes {
}

export interface ITaskExecutionModel extends Model<ITaskExecution, ITaskExecutionAttributes> {
    createTaskExecution(worker: IPipelineWorkerAttributes, taskDefinition: ITaskDefinition, startTaskInput: IStartTaskInput): Promise<ITaskExecution>;
    getPage(reqOffset: number, reqLimit: number, completionCode: CompletionResult): Promise<ITaskExecution[]>;
}
*/

export const createTaskExecutionTable = (sequelize: Sequelize, tableName: string): TaskExecutionStatic => {
    return <TaskExecutionStatic>sequelize.define(tableName, {
        id: {
            primaryKey: true,
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4
        },
        task_definition_id: {
            type: DataTypes.UUID
        },
        pipeline_stage_id: {
            type: DataTypes.UUID
        },
        tile_id: {
            type: DataTypes.TEXT
        },
        resolved_output_path: {
            type: DataTypes.TEXT,
            defaultValue: ""
        },
        resolved_script: {
            type: DataTypes.TEXT,
            defaultValue: ""
        },
        resolved_interpreter: {
            type: DataTypes.TEXT,
            defaultValue: ""
        },
        resolved_script_args: {
            type: DataTypes.TEXT
        },
        resolved_cluster_args: {
            type: DataTypes.TEXT
        },
        resolved_log_path: {
            type: DataTypes.TEXT
        },
        expected_exit_code: {
            type: DataTypes.INTEGER
        },
        worker_id: {
            type: DataTypes.UUID
        },
        worker_task_execution_id: {
            type: DataTypes.UUID
        },
        local_work_units: {
            type: DataTypes.INTEGER
        },
        cluster_work_units: {
            type: DataTypes.INTEGER
        },
        queue_type: {
            type: DataTypes.INTEGER
        },
        job_id: {
            type: DataTypes.INTEGER
        },
        job_name: {
            type: DataTypes.TEXT
        },
        execution_status_code: {
            type: DataTypes.INTEGER
        },
        completion_status_code: {
            type: DataTypes.INTEGER
        },
        last_process_status_code: {
            type: DataTypes.INTEGER
        },
        cpu_time_seconds: {
            type: DataTypes.FLOAT
        },
        max_cpu_percent: {
            type: DataTypes.FLOAT
        },
        max_memory_mb: {
            type: DataTypes.FLOAT
        },
        exit_code: {
            type: DataTypes.INTEGER
        },
        submitted_at: {
            type: DataTypes.DATE
        },
        started_at: {
            type: DataTypes.DATE
        },
        completed_at: {
            type: DataTypes.DATE
        },
        sync_status: {
            type: DataTypes.INTEGER
        },
        synchronized_at: {
            type: DataTypes.DATE
        }
    }, {
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
        deletedAt: "deleted_at",
        paranoid: false,
        indexes: [{
            fields: ["worker_id"]
        }]
    });
};

/*
export function createTaskExecutionTable(sequelize: Sequelize, tableName: string): any {
    const DataTypes = sequelize.Sequelize;

    return sequelize.define(tableName, {
        id: {
            primaryKey: true,
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4
        },
        task_definition_id: {
            type: DataTypes.UUID
        },
        pipeline_stage_id: {
            type: DataTypes.UUID
        },
        tile_id: {
            type: DataTypes.TEXT
        },
        resolved_output_path: {
            type: DataTypes.TEXT,
            defaultValue: ""
        },
        resolved_script: {
            type: DataTypes.TEXT,
            defaultValue: ""
        },
        resolved_interpreter: {
            type: DataTypes.TEXT,
            defaultValue: ""
        },
        resolved_script_args: {
            type: DataTypes.TEXT
        },
        resolved_cluster_args: {
            type: DataTypes.TEXT
        },
        resolved_log_path: {
            type: DataTypes.TEXT
        },
        expected_exit_code: {
            type: DataTypes.INTEGER
        },
        worker_id: {
            type: DataTypes.UUID
        },
        worker_task_execution_id: {
            type: DataTypes.UUID
        },
        local_work_units: {
            type: DataTypes.INTEGER
        },
        cluster_work_units: {
            type: DataTypes.INTEGER
        },
        queue_type: {
            type: DataTypes.INTEGER
        },
        job_id: {
            type: DataTypes.INTEGER
        },
        job_name: {
            type: DataTypes.TEXT
        },
        execution_status_code: {
            type: DataTypes.INTEGER
        },
        completion_status_code: {
            type: DataTypes.INTEGER
        },
        last_process_status_code: {
            type: DataTypes.INTEGER
        },
        cpu_time_seconds: {
            type: DataTypes.FLOAT
        },
        max_cpu_percent: {
            type: DataTypes.FLOAT
        },
        max_memory_mb: {
            type: DataTypes.FLOAT
        },
        exit_code: {
            type: DataTypes.INTEGER
        },
        submitted_at: {
            type: DataTypes.DATE
        },
        started_at: {
            type: DataTypes.DATE
        },
        completed_at: {
            type: DataTypes.DATE
        },
        sync_status: {
            type: DataTypes.INTEGER
        },
        synchronized_at: {
            type: DataTypes.DATE
        }
    }, {
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
        deletedAt: "deleted_at",
        paranoid: false,
        indexes: [{
            fields: ["worker_id"]
        }]
    });
}
*/