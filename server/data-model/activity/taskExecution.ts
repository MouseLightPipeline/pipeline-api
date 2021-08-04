import {Sequelize, Model, DataTypes, BuildOptions} from "sequelize";
import {PipelineTile} from "./pipelineTile";

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

export interface ITaskExecution {
    id: string;
    task_definition_id: string;
    stage_id: string;
    relative_path: string;
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
}

export class TaskExecution extends Model implements ITaskExecution {
    public id: string;
    public task_definition_id: string;
    public stage_id: string;
    public relative_path: string;
    public resolved_output_path: string;
    public resolved_script: string;
    public resolved_interpreter: string;
    public resolved_script_args: string;
    public resolved_cluster_args: string;
    public resolved_log_path: string;
    public expected_exit_code: number;
    public worker_id: string;
    public worker_task_execution_id: string;
    public local_work_units: number;
    public cluster_work_units: number;
    public queue_type: number;
    public job_id: number;
    public job_name: string;
    public execution_status_code: ExecutionStatus;
    public completion_status_code: CompletionResult;
    public last_process_status_code: number;
    public cpu_time_seconds: number;
    public max_cpu_percent: number;
    public max_memory_mb: number;
    public exit_code: number;
    public submitted_at: Date;
    public started_at: Date;
    public completed_at: Date;
    public sync_status: SyncStatus;

    readonly created_at: Date;
    readonly updated_at: Date;
    readonly deleted_at: Date;
}

export type TaskExecutionStatic = typeof Model & {
    new (values?: object, options?: BuildOptions): TaskExecution;
}

function generatePipelineStageTaskExecutionTableName() {
    return "TaskExecution";
}

export const defineTaskExecutionTable = (sequelize: Sequelize): TaskExecutionStatic => {
    return <TaskExecutionStatic>sequelize.define(generatePipelineStageTaskExecutionTableName(), {
        id: {
            primaryKey: true,
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4
        },
        task_definition_id: {
            type: DataTypes.UUID
        },
        stage_id: {
            type: DataTypes.UUID
        },
        relative_path: {
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
