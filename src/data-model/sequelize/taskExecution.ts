import {FindOptions} from "sequelize";
import {isNullOrUndefined} from "util";

export enum ExecutionStatusCode {
    Undefined = 0,
    Initializing = 1,
    Running = 2,
    Orphaned = 3,   // Was marked initialized/running but can not longer find in process manager list
    Completed = 4
}

export enum CompletionStatusCode {
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
    worker_id: string;
    tile_id;
    task_definition_id: string;
    pipeline_stage_id: string;
    work_units: number;
    resolved_script: string;
    resolved_interpreter: string;
    resolved_args: string;
    expected_exit_code: number;
    execution_status_code: ExecutionStatusCode;
    completion_status_code: CompletionStatusCode;
    last_process_status_code: number;
    max_memory: number;
    max_cpu: number;
    exit_code: number;
    sync_status?: SyncStatus;
    synchronized_at?: Date;
    started_at: Date;
    completed_at: Date;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date;
}

export const TableName = "TaskExecutions";

export function sequelizeImport(sequelize, DataTypes) {
    const TaskExecution = sequelize.define(TableName, {
        id: {
            primaryKey: true,
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4
        },
        worker_id: {
            type: DataTypes.UUID,
        },
        work_units: {
            type: DataTypes.INTEGER,
        },
        resolved_script: {
            type: DataTypes.TEXT,
            defaultValue: ""
        },
        resolved_interpreter: {
            type: DataTypes.TEXT,
            defaultValue: ""
        },
        resolved_args: {
            type: DataTypes.TEXT,
            defaultValue: ""
        },
        expected_exit_code: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        execution_status_code: {
            type: DataTypes.INTEGER,
        },
        completion_status_code: {
            type: DataTypes.INTEGER,
        },
        last_process_status_code: {
            type: DataTypes.INTEGER,
        },
        max_memory: {
            type: DataTypes.FLOAT,
        },
        max_cpu: {
            type: DataTypes.FLOAT,
        },
        exit_code: {
            type: DataTypes.INTEGER,
        },
        started_at: {
            type: DataTypes.DATE,
        },
        completed_at: {
            type: DataTypes.DATE,
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
        paranoid: false
    });

    TaskExecution.associate = models => {
        TaskExecution.belongsTo(models.TaskDefinitions, {foreignKey: "task_definition_id"});
        TaskExecution.belongsTo(models.PipelineStages, {foreignKey: "pipeline_stage_id"});
    };

    TaskExecution.getPage = async function (reqOffset: number, reqLimit: number, completionCode: CompletionStatusCode): Promise<ITaskExecution[]> {
        const options: FindOptions<ITaskExecution> = {
            offset: reqOffset,
            limit: reqLimit
        };

        if (!isNullOrUndefined(completionCode)) {
            options.where = {completion_status_code: completionCode};
        }

        return TaskExecution.findAll(options);
    };

    return TaskExecution;
}
