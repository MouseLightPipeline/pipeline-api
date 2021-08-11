import * as path from "path";
import {Sequelize} from "sequelize";

import {TaskExecutionStatic} from "../../data-model/activity/taskExecution";
import {PipelineTileStatic} from "../../data-model/activity/pipelineTile";
import {InProcessTileStatic} from "../../data-model/activity/inProcessTile";
import {ToProcessTileStatic} from "../../data-model/activity/toProcessTile";
import {AdjacentTileStatic} from "../../data-model/activity/adjacentTileMap";

export class StageTableConnector {
    protected _connection: Sequelize;
    protected _stage_id: string;
    protected _prev_stage_id: string;

    protected _tileTable: PipelineTileStatic = null;
    protected _toProcessTable: ToProcessTileStatic = null;
    protected _inProcessTable: InProcessTileStatic = null;
    protected _adjacentTileModel: AdjacentTileStatic = null;
    protected _taskExecutionTable: TaskExecutionStatic = null;

    public constructor(connection: Sequelize, stage_id: string, prev_stage_id) {
        this._connection = connection;
        this._stage_id = stage_id;
        this._prev_stage_id = prev_stage_id;
    }

    public async initialize(migrateIfNeeded: boolean = false): Promise<void> {
        this.loadModels(path.normalize(path.join(__dirname, "..", "..", "data-model/activity")));

        // Do not perform model/table updates from the API server, only the scheduler.
        if (migrateIfNeeded) {
            this._connection.sync();
        }
    }

    private loadModels(modelLocation: string) {
        this._tileTable = this.loadModel(path.join(modelLocation, "pipelineTile"));
        this._toProcessTable = this.loadModel(path.join(modelLocation, "toProcessTile"));
        this._inProcessTable = this.loadModel(path.join(modelLocation, "inProcessTile"));
        this._adjacentTileModel = this.loadModel(path.join(modelLocation, "adjacentTileMap"));
        this._taskExecutionTable = this.loadModel(path.join(modelLocation, "taskExecution"));

        this._tileTable.hasMany(this._taskExecutionTable, {
            foreignKey: "tile_id",
            as: {singular: "taskExecution", plural: "taskExecutions"}
        });
        this._inProcessTable.belongsTo(this._tileTable, {foreignKey: "tile_id"});
        this._taskExecutionTable.belongsTo(this._tileTable, {foreignKey: "tile_id"});
        this._adjacentTileModel.belongsTo(this._tileTable, {foreignKey: "tile_id"});
        this._adjacentTileModel.belongsTo(this._tileTable, {foreignKey: "adjacent_tile_id"});
        this._toProcessTable.belongsTo(this._tileTable, {foreignKey: "tile_id"});
    }

    private loadModel(moduleLocation: string) {
        let modelModule = require(moduleLocation);
        return modelModule.modelInit(this._connection);
    }
}
