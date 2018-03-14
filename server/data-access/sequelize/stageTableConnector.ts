import {Instance, Model, Sequelize} from "sequelize";

const debug = require("debug")("pipeline:coordinator-api:stage-database-connector");

import {TilePipelineStatus} from "../../schedulers/basePipelineScheduler";

export function generatePipelineCustomTableName(pipelineStageId: string, tableName) {
    return pipelineStageId + "_" + tableName;
}

function generatePipelineStageInProcessTableName(pipelineStageId: string) {
    return generatePipelineCustomTableName(pipelineStageId, "InProcess");
}

function generatePipelineStageToProcessTableName(pipelineStageId: string) {
    return generatePipelineCustomTableName(pipelineStageId, "ToProcess");
}

export interface IPipelineStageTileCounts {
    incomplete: number;
    queued: number;
    processing: number;
    complete: number;
    failed: number;
    canceled: number;
}

export interface IPipelineTileAttributes {
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
    duration?: number;
    cpu_high?: number;
    memory_high?: number;
    created_at?: Date;
    updated_at?: Date;
}

export interface IInProcessTileAttributes {
    relative_path: string;
    worker_id?: string;
    worker_last_seen?: Date;
    task_execution_id?: string;
    created_at?: Date;
    updated_at?: Date;
}

export interface IToProcessTileAttributes {
    relative_path: string;
    created_at?: Date;
    updated_at?: Date;
}

export interface IPipelineTile extends Instance<IPipelineTileAttributes>, IPipelineTileAttributes {
}

export interface IInProcessTile extends Instance<IInProcessTileAttributes>, IInProcessTileAttributes {
}

export interface IToProcessTile extends Instance<IToProcessTileAttributes>, IToProcessTileAttributes {
}

const CreateChunkSize = 100;
const UpdateChunkSize = 100;

export class StageTableConnector {

    protected _connection: Sequelize;
    protected _tableBaseName: string;

    private _tileTable: Model<IPipelineTile, IPipelineTileAttributes> = null;
    private _toProcessTable: Model<IToProcessTile, IToProcessTileAttributes> = null;
    private _inProcessTable: Model<IInProcessTile, IInProcessTileAttributes> = null;

    public constructor(connection: Sequelize, id: string) {
        this._connection = connection;
        this._tableBaseName = id;
    }

    public async initialize() {
        this.defineTables();

        return this._connection.sync();
    }

    // -----------------------------------------------------------------------------------------------------------------

    public async loadTiles(options = null): Promise<IPipelineTile[]> {
        // TODO this is leaking sequelize specifics to callers.
        if (options) {
            return this._tileTable.findAll(options);
        } else {
            return this._tileTable.findAll();
        }
    }

    public async loadTile(where: any): Promise<IPipelineTile> {
        return this._tileTable.findOne({where});
    }

    public async loadUnscheduled(): Promise<IPipelineTile[]> {
        return this._tileTable.findAll({
            where: {
                prev_stage_status: TilePipelineStatus.Complete,
                this_stage_status: TilePipelineStatus.Incomplete
            }
        });
    }

    public async loadTileThumbnailPath(x: number, y: number, z: number): Promise<IPipelineTile> {
        return this._tileTable.findOne({where: {lat_x: x, lat_y: y, lat_z: z}});
    }

    public async loadTileStatusForPlane(zIndex: number): Promise<IPipelineTile[]> {
        return this._tileTable.findAll({where: {lat_z: zIndex}});
    }

    public async loadInProcess(): Promise<IInProcessTile[]> {
        return this._inProcessTable.findAll();
    }

    public async loadToProcess(limit: number = null): Promise<IToProcessTile[]> {
        return this._toProcessTable.findAll({order: [["relative_path", "ASC"]], limit: limit});
    }

    // -----------------------------------------------------------------------------------------------------------------

    public async countTiles(): Promise<number> {
        return this._tileTable.count();
    }

    public async countInProcess(): Promise<number> {
        return this._inProcessTable.count();
    }

    public async countToProcess(): Promise<number> {
        return this._toProcessTable.count();
    }

    // -----------------------------------------------------------------------------------------------------------------

    public async insertTiles(tiles: IPipelineTileAttributes[]) {
        return StageTableConnector.bulkCreate(this._tileTable, tiles);
    }

    public async updateTiles(objArray: IPipelineTile[]) {
        if (!objArray || objArray.length === 0) {
            return;
        }

        debug(`bulk update ${objArray.length} items`);

        // Operate on a shallow copy since splice is going to be destructive.
        const toUpdate = objArray.slice();

        while (toUpdate.length > 0) {
            try {
                const next = toUpdate.splice(0, UpdateChunkSize);
                await this.bulkUpdate(next);
            } catch (err) {
                debug(err);
            }
        }
    }

    public async updateTileStatus(toUpdate: Map<TilePipelineStatus, string[]>) {
        if (!toUpdate) {
            return;
        }

        return Promise.all(Array.from(toUpdate.keys()).map(async (status) => {
            await this._tileTable.update({this_stage_status: status},
                {where: {relative_path: {$in: toUpdate.get(status)}}});
        }));
    }

    public async deleteTiles(toDelete: string[]) {
        if (!toDelete || toDelete.length === 0) {
            return;
        }

        return this._tileTable.destroy({where: {relative_path: {$in: toDelete}}});
    }

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

    public async setTileStatus(tileIds: string[], status: TilePipelineStatus): Promise<IPipelineTileAttributes[]> {
        const [affectedCount, affectedRows] = await this._tileTable.update({this_stage_status: status}, {where: {relative_path: {$in: tileIds}}, returning: true});

        return affectedRows;
    }

    public async convertTileStatus(currentStatus: TilePipelineStatus, desiredStatus: TilePipelineStatus): Promise<IPipelineTileAttributes[]> {
        const [affectedCount, affectedRows] = await this._tileTable.update({this_stage_status: desiredStatus}, {where: {this_stage_status: currentStatus}, returning: true});

        return affectedRows;
    }

    // -----------------------------------------------------------------------------------------------------------------

    public async insertToProcess(toProcess: IToProcessTileAttributes[]) {
        return StageTableConnector.bulkCreate(this._toProcessTable, toProcess);
    }

    public async deleteToProcess(toDelete: string[]) {
        if (!toDelete || toDelete.length === 0) {
            return;
        }

        return this._toProcessTable.destroy({where: {relative_path: {$in: toDelete}}});
    }

    public async deleteToProcessTile(toProcess: IToProcessTileAttributes) {
        if (!toProcess) {
            return;
        }

        return this._toProcessTable.destroy({where: {relative_path: toProcess.relative_path}});
    }

    // -----------------------------------------------------------------------------------------------------------------

    public async insertInProcessTile(inProcess: IInProcessTileAttributes) {
        return this._inProcessTable.create(inProcess);
    }

    public async deleteInProcess(toDelete: string[]) {
        if (!toDelete || toDelete.length === 0) {
            return;
        }

        return this._inProcessTable.destroy({where: {relative_path: {$in: toDelete}}});
    }

    // -----------------------------------------------------------------------------------------------------------------

    protected static async bulkCreate(table: any, objArray: any[]) {
        if (!objArray || objArray.length === 0) {
            return;
        }

        debug(`bulk create ${objArray.length} items`);

        // Operate on a shallow copy since splice is going to be destructive.
        const toInsert = objArray.slice();

        while (toInsert.length > 0) {
            try {
                await table.bulkCreate(toInsert.splice(0, CreateChunkSize));
            } catch (err) {
                debug(err);
            }
        }
    }

    protected async bulkUpdate(objArray: any[]) {
        return this._connection.transaction(t => {
            return Promise.all(objArray.map(obj => {
                obj.save({transaction: t});
            }));
        });
    }

    // -----------------------------------------------------------------------------------------------------------------

    protected defineTables() {
        this._tileTable = this.defineTileTable();
        this._toProcessTable = this.defineToProcessTable();
        this._inProcessTable = this.defineInProcessTable();
    }

    private defineTileTable(): any {
        return this._connection.define(this._tableBaseName, {
            relative_path: {
                primaryKey: true,
                unique: true,
                type: this._connection.Sequelize.TEXT
            },
            index: {
                type: this._connection.Sequelize.INTEGER
            },
            tile_name: {
                type: this._connection.Sequelize.TEXT
            },
            prev_stage_status: {
                type: this._connection.Sequelize.INTEGER,
                defaultValue: null
            },
            this_stage_status: {
                type: this._connection.Sequelize.INTEGER,
                defaultValue: null
            },
            lat_x: {
                type: this._connection.Sequelize.INTEGER,
                defaultValue: null
            },
            lat_y: {
                type: this._connection.Sequelize.INTEGER,
                defaultValue: null
            },
            lat_z: {
                type: this._connection.Sequelize.INTEGER,
                defaultValue: null
            },
            step_x: {
                type: this._connection.Sequelize.INTEGER,
                defaultValue: null
            },
            step_y: {
                type: this._connection.Sequelize.INTEGER,
                defaultValue: null
            },
            step_z: {
                type: this._connection.Sequelize.INTEGER,
                defaultValue: null
            },
            duration: {
                type: this._connection.Sequelize.DOUBLE,
                defaultValue: 0
            },
            cpu_high: {
                type: this._connection.Sequelize.DOUBLE,
                defaultValue: 0
            },
            memory_high: {
                type: this._connection.Sequelize.DOUBLE,
                defaultValue: 0
            },
            user_data: {
                type: this._connection.Sequelize.TEXT,
                defaultValue: null
            }
        }, {
            timestamps: true,
            createdAt: "created_at",
            updatedAt: "updated_at",
            paranoid: false
        });
    }

    private defineToProcessTable(): any {
        return this._connection.define(generatePipelineStageToProcessTableName(this._tableBaseName), {
            relative_path: {
                primaryKey: true,
                unique: true,
                type: this._connection.Sequelize.TEXT
            }
        }, {
            timestamps: true,
            createdAt: "created_at",
            updatedAt: "updated_at",
            paranoid: false
        });
    }

    private defineInProcessTable(): any {
        return this._connection.define(generatePipelineStageInProcessTableName(this._tableBaseName), {
            relative_path: {
                primaryKey: true,
                unique: true,
                type: this._connection.Sequelize.TEXT
            },
            task_execution_id: {
                type: this._connection.Sequelize.UUID,
                defaultValue: null
            },
            worker_id: {
                type: this._connection.Sequelize.UUID,
                defaultValue: null
            },
            worker_last_seen: {
                type: this._connection.Sequelize.DATE,
                defaultValue: null
            }
        }, {
            timestamps: true,
            createdAt: "created_at",
            updatedAt: "updated_at",
            paranoid: false
        });
    }
}
