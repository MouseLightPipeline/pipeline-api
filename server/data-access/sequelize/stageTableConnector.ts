import {Model, Sequelize} from "sequelize";

const debug = require("debug")("pipeline:coordinator-api:stage-database-connector");

import {IPipelineStage} from "../../data-model/sequelize/pipelineStage";
import {IProject} from "../../data-model/sequelize/project";
import {TilePipelineStatus} from "../../schedulers/pipelineScheduler";
import * as path from "path";

function generatePipelineCustomTableName(pipelineStageId: string, tableName) {
    return pipelineStageId + "_" + tableName;
}

function generatePipelineStageInProcessTableName(pipelineStageId: string) {
    return generatePipelineCustomTableName(pipelineStageId, "InProcess");
}

function generatePipelineStageToProcessTableName(pipelineStageId: string) {
    return generatePipelineCustomTableName(pipelineStageId, "ToProcess");
}

export interface IPipelineTile {
    relative_path?: string;
    prev_stage_status?: TilePipelineStatus;
    this_stage_status?: TilePipelineStatus;
    lat_x?: number;
    lat_y?: number;
    lat_z?: number;
    duration?: number;
    cpu_high?: number;
    memory_high?: number;
    created_at?: Date;
    updated_at?: Date;
    deleted_at?: Date;
}

const CreateChunkSize = 100;
const UpdateChunkSize = 100;
const DeleteChunkSize = 100;

export class StageTableConnector {

    private _connection: Sequelize;
    private _tableBaseName: string;

    private _tileTable: Model<IPipelineTile, IPipelineTile> = null;
    private _toProcessTable: Model<IPipelineTile, IPipelineTile> = null;
    private _inProcessTable: Model<IPipelineTile, IPipelineTile> = null;

    public constructor(connection: Sequelize, stage: IProject | IPipelineStage) {
        this._connection = connection;
        this._tableBaseName = stage.id;
    }

    public async initialize() {
        this._tileTable = this.defineTileTable();
        this._toProcessTable = this.defineToProcessTable();
        this._inProcessTable = this.defineInProcessTable();

        await this._connection.sync();
    }

    public async loadTileThumbnailPath(x: number, y: number, z: number): Promise<IPipelineTile> {
        return this._tileTable.findOne({where: {"lat_x": x, "lat_y": y, "lat_z": z}});
    }

    public async loadTileStatusForPlane(zIndex: number): Promise<IPipelineTile[]> {
        return this._tileTable.findAll({where: {"lat_z": zIndex}});
    }

    public async batchCreate(table: any, inputToInsert: any[]) {
        if (!inputToInsert || inputToInsert.length === 0) {
            return;
        }

        debug(`batch create ${inputToInsert.length} items`);

        // Operate on a shallow copy since splice is going to be destructive.
        const toInsert = inputToInsert.slice();

        while (toInsert.length > 0) {
            await table.bulkCreate(toInsert.splice(0, CreateChunkSize));
        }
    }

    private defineTileTable(): any {
        return this._connection.define(this._tableBaseName, {
            relative_path: {
                primaryKey: true,
                unique: true,
                type: this._connection.Sequelize.TEXT
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
            cpu_high: {
                type: this._connection.Sequelize.DOUBLE,
                defaultValue: 0
            },
            memory_high: {
                type: this._connection.Sequelize.DOUBLE,
                defaultValue: 0
            },
            user_data: {
                type: this._connection.Sequelize.JSON,
                defaultValue: 0
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
