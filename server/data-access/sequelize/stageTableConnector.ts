import {BuildOptions, CountOptions, Model, Sequelize, Op} from "sequelize";

import {
    createTaskExecutionTable,
    TaskExecution,
    TaskExecutionStatic
} from "../../data-model/taskExecution";
import {TilePipelineStatus} from "../../data-model/TilePipelineStatus";

export function generatePipelineCustomTableName(pipelineStageId: string, tableName) {
    return pipelineStageId + "_" + tableName;
}

function generatePipelineStageInProcessTableName(pipelineStageId: string) {
    return generatePipelineCustomTableName(pipelineStageId, "InProcess");
}

function generatePipelineStageToProcessTableName(pipelineStageId: string) {
    return generatePipelineCustomTableName(pipelineStageId, "ToProcess");
}

function generatePipelineStageTaskExecutionTableName(pipelineStageId: string) {
    return generatePipelineCustomTableName(pipelineStageId, "TaskExecutions");
}

export interface IPipelineStageTileCounts {
    incomplete: number;
    queued: number;
    processing: number;
    complete: number;
    failed: number;
    canceled: number;
}

export class PipelineTile extends Model {
    relative_path?: string;
    index?: number;
    tile_name?: string;
    prev_stage_status?: TilePipelineStatus;
    this_stage_status?: TilePipelineStatus;
    lat_x?: number;
    lat_y?: number;
    lat_z?: number;
    step_x?: number;
    step_y?: number;
    step_z?: number;
    task_executions?: TaskExecution[];
    created_at?: Date;
    updated_at?: Date;
}

export type PipelineTileStatic = typeof Model & {
    new(values?: object, options?: BuildOptions): PipelineTile;
}

export class InProcessTile extends Model {
    relative_path: string;
    worker_id?: string;
    worker_last_seen?: Date;
    task_execution_id?: string;
    worker_task_execution_id?: string;
    created_at?: Date;
    updated_at?: Date;
}

export type InProcessTileStatic = typeof Model & {
    new(values?: object, options?: BuildOptions): InProcessTile;
}

export class ToProcessTile extends Model {
    relative_path: string;
    created_at?: Date;
    updated_at?: Date;
}

export type ToProcessTileStatic = typeof Model & {
    new(values?: object, options?: BuildOptions): ToProcessTile;
}

/*
export interface IPipelineTile extends Instance<IPipelineTileAttributes>, IPipelineTileAttributes {
}

export interface IPipelineTileModel extends Model<IPipelineTile, IPipelineTileAttributes> {
}

export interface IInProcessTile extends Instance<IInProcessTileAttributes>, IInProcessTileAttributes {
}

export interface IInProcessTileModel extends Model<IInProcessTile, IInProcessTileAttributes> {
}

export interface IToProcessTile extends Instance<IToProcessTileAttributes>, IToProcessTileAttributes {
}

export interface IToProcessTileModel extends Model<IToProcessTile, IToProcessTileAttributes> {
}
*/
export class StageTableConnector {

    protected _connection: Sequelize;
    protected _tableBaseName: string;

    private _tileTable: PipelineTileStatic = null;
    private _toProcessTable: InProcessTileStatic = null;
    private _inProcessTable: ToProcessTileStatic = null;
    private _taskExecutionTable: TaskExecutionStatic = null;

    public constructor(connection: Sequelize, id: string) {
        this._connection = connection;
        this._tableBaseName = id;
    }

    public async initialize(): Promise<void> {
        this.defineTables();

        // Do not perform mode/table updates from the API server, only the scheduler.
        // this._connection.sync();
    }

    // -----------------------------------------------------------------------------------------------------------------

    public async loadTiles(options = null): Promise<PipelineTile[]> {
        // TODO this is leaking sequelize specifics to callers.
        if (options) {
            return this._tileTable.findAll(options);
        } else {
            return this._tileTable.findAll();
        }
    }

    public async loadTileThumbnailPath(x: number, y: number, z: number): Promise<PipelineTile> {
        return this._tileTable.findOne({where: {lat_x: x, lat_y: y, lat_z: z}});
    }

    public async loadTileStatusForPlane(zIndex: number): Promise<PipelineTile[]> {
        return this._tileTable.findAll({where: {lat_z: zIndex}});
    }


    // -----------------------------------------------------------------------------------------------------------------

    public async countTiles(options: CountOptions): Promise<number> {
        return options ? this._tileTable.count(options) : this._tileTable.count();
    }

    // -----------------------------------------------------------------------------------------------------------------

    public async getTileCounts(): Promise<IPipelineStageTileCounts> {
        const incomplete = await this._tileTable.count({where: {this_stage_status: TilePipelineStatus.Incomplete}});
        const queued = await this._tileTable.count({where: {this_stage_status: TilePipelineStatus.Queued}});
        const processing = await this._tileTable.count({where: {this_stage_status: TilePipelineStatus.Processing}});
        const complete = await this._tileTable.count({where: {this_stage_status: TilePipelineStatus.Complete}});
        const failed = await this._tileTable.count({where: {this_stage_status: TilePipelineStatus.Failed}});
        const canceled = await this._tileTable.count({where: {this_stage_status: TilePipelineStatus.Canceled}});

        return {
            incomplete,
            queued,
            processing,
            complete,
            failed,
            canceled
        }
    }

    public async setTileStatus(tileIds: string[], status: TilePipelineStatus): Promise<PipelineTile[]> {
        const [affectedCount, affectedRows] = await this._tileTable.update({this_stage_status: status}, {
            where: {relative_path: {[Op.in]: tileIds}},
            returning: true
        });

        return affectedRows;
    }

    public async convertTileStatus(currentStatus: TilePipelineStatus, desiredStatus: TilePipelineStatus): Promise<PipelineTile[]> {
        const [affectedCount, affectedRows] = await this._tileTable.update({this_stage_status: desiredStatus}, {
            where: {this_stage_status: currentStatus},
            returning: true
        });

        return affectedRows;
    }

    public async taskExecutionsForTile(id: string): Promise<TaskExecution[]> {
        return this._taskExecutionTable.findAll({where: {tile_id: id}, order: ["created_at"]});
    }

    public async taskExecutionForId(id: string): Promise<TaskExecution> {
        return this._taskExecutionTable.findByPk(id);
    }

    public async removeTaskExecution(id: string): Promise<boolean> {
        try {
            const taskExecution = await this.taskExecutionForId(id);

            if (taskExecution != null) {
                await taskExecution.destroy();
                return true;
            }
        } catch {
        }

        return false;
    }

    // -----------------------------------------------------------------------------------------------------------------

    protected defineTables() {
        this._tileTable = this.defineTileTable(this._connection.Sequelize);

        this._toProcessTable = this.defineToProcessTable(this._connection.Sequelize);

        this._inProcessTable = this.defineInProcessTable(this._connection.Sequelize);

        this._taskExecutionTable = createTaskExecutionTable(this._connection, generatePipelineStageTaskExecutionTableName(this._tableBaseName));
    }

    private defineTileTable(DataTypes): PipelineTileStatic {
        return <PipelineTileStatic>this._connection.define(this._tableBaseName, {
            relative_path: {
                primaryKey: true,
                unique: true,
                type: DataTypes.TEXT
            },
            index: {
                type: DataTypes.INTEGER
            },
            tile_name: {
                type: DataTypes.TEXT
            },
            prev_stage_status: {
                type: DataTypes.INTEGER,
                defaultValue: null
            },
            this_stage_status: {
                type: DataTypes.INTEGER,
                defaultValue: null
            },
            lat_x: {
                type: DataTypes.INTEGER,
                defaultValue: null
            },
            lat_y: {
                type: DataTypes.INTEGER,
                defaultValue: null
            },
            lat_z: {
                type: DataTypes.INTEGER,
                defaultValue: null
            },
            step_x: {
                type: DataTypes.INTEGER,
                defaultValue: null
            },
            step_y: {
                type: DataTypes.INTEGER,
                defaultValue: null
            },
            step_z: {
                type: DataTypes.INTEGER,
                defaultValue: null
            },
            user_data: {
                type: DataTypes.TEXT,
                defaultValue: null
            }
        }, {
            tableName: this._tableBaseName,
            timestamps: true,
            createdAt: "created_at",
            updatedAt: "updated_at",
            paranoid: false,
            indexes: [{
                fields: ["prev_stage_status"]
            }, {
                fields: ["this_stage_status"]
            }]
        });
    }

    private defineToProcessTable(DataTypes): any {
        return this._connection.define(generatePipelineStageToProcessTableName(this._tableBaseName), {
            relative_path: {
                primaryKey: true,
                unique: true,
                type: DataTypes.TEXT
            }
        }, {
            timestamps: true,
            createdAt: "created_at",
            updatedAt: "updated_at",
            paranoid: false
        });
    }

    private defineInProcessTable(DataTypes): any {
        return this._connection.define(generatePipelineStageInProcessTableName(this._tableBaseName), {
            relative_path: {
                primaryKey: true,
                unique: true,
                type: DataTypes.TEXT
            },
            task_execution_id: {
                type: DataTypes.UUID,
                defaultValue: null
            },
            worker_id: {
                type: DataTypes.UUID,
                defaultValue: null
            },
            worker_task_execution_id: {
                type: DataTypes.UUID,
                defaultValue: null
            },
            worker_last_seen: {
                type: DataTypes.DATE,
                defaultValue: null
            }
        }, {
            timestamps: true,
            createdAt: "created_at",
            updatedAt: "updated_at",
            paranoid: false,
            indexes: [{
                fields: ["worker_id"]
            }]
        });
    }
}
