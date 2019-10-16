import {BuildOptions, Model, DataTypes} from "sequelize";

import {generatePipelineCustomTableName, StageTableConnector} from "./stageTableConnector";

export interface AdjacentTile extends Model {
    relative_path: string,
    adjacent_relative_path: string;
    adjacent_tile_name: string;
}

export type AdjacentTileStatic = typeof Model & {
    new (values?: object, options?: BuildOptions): AdjacentTile;
}

function generatePipelineStageAdjacentTileTableName(pipelineStageId: string) {
    return generatePipelineCustomTableName(pipelineStageId, "Adjacent");
}

export class AdjacentTileStageConnector extends StageTableConnector {
    private _adjacentTileModel: AdjacentTileStatic = null;

    protected defineTables() {
        super.defineTables();

        this._adjacentTileModel = this.defineAdjacentTileModel();
    }

    private defineAdjacentTileModel(): AdjacentTileStatic {
        return <AdjacentTileStatic>this._connection.define(generatePipelineStageAdjacentTileTableName(this._tableBaseName), {
            relative_path: {
                primaryKey: true,
                unique: true,
                type: DataTypes.TEXT
            },
            adjacent_relative_path: {
                type: DataTypes.TEXT,
                defaultValue: null
            },
            adjacent_tile_name: {
                type: DataTypes.TEXT,
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
