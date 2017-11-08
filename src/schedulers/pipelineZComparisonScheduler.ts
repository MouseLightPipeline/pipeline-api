import * as _ from "lodash";

const debug = require("debug")("pipeline:coordinator-api:pipeline-z-comp-worker");

import {
    PipelineScheduler, TilePipelineStatus, DefaultPipelineIdKey, IPipelineTile,
    IMuxTileLists
} from "./pipelineScheduler";
import {verifyTable, generatePipelineCustomTableName} from "../data-access/knexPiplineStageConnection";
import {IPipelineStage} from "../data-model/sequelize/pipelineStage";

/***
 TODO should include extents from monitor info in dashboard json to determine whether there will ever be a z - 1 tile.
 Otherwise, we'll always have incomplete tiles for the first z-plane.
 ***/

interface IPreviousLayerMap {
    relative_path: string,
    relative_path_z_plus_1: string;
    tile_name_z_plus_1: string;
}

interface IMuxUpdateLists extends IMuxTileLists {
    toInsertZMapIndex: IPreviousLayerMap[]
}

export class PipelineZComparisonScheduler extends PipelineScheduler {

    protected _zIndexMapTableName: string;

    public constructor(pipelineStage: IPipelineStage) {
        super(pipelineStage);

        this._pipelineStage = pipelineStage;
    }

    protected get zIndexMapTable() {
        return this._outputKnexConnector(this._zIndexMapTableName);
    }

    protected async createTables() {
        await super.createTables();

        this._zIndexMapTableName = generatePipelineCustomTableName(this._pipelineStage.id, "ZIndexMap");

        await verifyTable(this._outputKnexConnector, this._zIndexMapTableName, (table) => {
            table.string(DefaultPipelineIdKey).primary().unique();
            table.string("relative_path_z_plus_1");
            table.string("tile_name_z_plus_1");
        });

        return true;
    }

    protected async getTaskContext(tile: IPipelineTile): Promise<any> {
        let rows = await this.zIndexMapTable.where(DefaultPipelineIdKey, tile.relative_path).select();

        if (rows && rows.length > 0) {
            return rows[0];
        } else {
            return null;
        }
    }

    protected getTaskArguments(tile: IPipelineTile, context: any): string[] {
        if (context === null) {
            return [];
        }

        return [context.relative_path_z_plus_1, context.tile_name_z_plus_1];
    }

    private async findPreviousLayerTile(inputTile: IPipelineTile): Promise<IPipelineTile> {
        const rows = await this.inputTable.where({lat_x: inputTile.lat_x, lat_y: inputTile.lat_y, lat_z: inputTile.lat_z + 1});

        if (rows && rows.length > 0) {
            return rows[0];
        } else {
            return null;
        }
    }

    protected async muxInputOutputTiles(knownInput: IPipelineTile[], knownOutput: IPipelineTile[]) {
        const muxUpdateLists: IMuxUpdateLists = {
            toInsert: [],
            toUpdate: [],
            toDelete: [],
            toInsertZMapIndex: []
        };

        // Flatten input and and output for faster searching.
        const knownOutputIdLookup = knownOutput.map(obj => obj[DefaultPipelineIdKey]);
        const knownInputIdLookup = knownInput.map(obj => obj[DefaultPipelineIdKey]);

        // List of tiles where we already know the previous layer tile id.
        const nextLayerMapRows = await this.zIndexMapTable.select();
        const nextLayerMapIdLookup = nextLayerMapRows.map(obj => obj[DefaultPipelineIdKey]);

        // Force serial execution of each tile given async calls within function.
        await knownInput.reduce(async (promiseChain, inputTile) => {
            return promiseChain.then(() => {
                return this.muxUpdateTile(inputTile, knownInput, knownOutput, nextLayerMapRows, knownInputIdLookup, knownOutputIdLookup, nextLayerMapIdLookup, muxUpdateLists);
            });
        }, Promise.resolve());

        muxUpdateLists.toDelete = _.differenceBy(knownOutput, knownInput, DefaultPipelineIdKey).map(t => t.relative_path);

        await this.batchInsert(this._outputKnexConnector, this._zIndexMapTableName, muxUpdateLists.toInsertZMapIndex);

        // Insert, update, delete handled by base.
        return muxUpdateLists;
    }

    private async muxUpdateTile(inputTile: IPipelineTile, knownInput: IPipelineTile[], knownOutput: IPipelineTile[], prevLayerMapRows: IPreviousLayerMap[],
                                knownInputIdLookup: string[], knownOutputIdLookup: string[], prevLayerMapIdLookup: string[],
                                muxUpdateLists: IMuxUpdateLists): Promise<void> {
        const idx = knownOutputIdLookup.indexOf(inputTile[DefaultPipelineIdKey]);

        const existingOutput: IPipelineTile = idx > -1 ? knownOutput[idx] : null;

        const prevLayerLookupIndex = prevLayerMapIdLookup.indexOf(inputTile[DefaultPipelineIdKey]);

        let prevLayerMap: IPreviousLayerMap = prevLayerLookupIndex > -1 ? prevLayerMapRows[prevLayerLookupIndex] : null;

        if (prevLayerMap === null) {
            const tile = await this.findPreviousLayerTile(inputTile);

            if (tile !== null) {
                prevLayerMap = {
                    relative_path: inputTile.relative_path,
                    relative_path_z_plus_1: tile.relative_path,
                    tile_name_z_plus_1: tile.tile_name
                };

                muxUpdateLists.toInsertZMapIndex.push(prevLayerMap);
            }
        }

        // This really shouldn't fail since we should have already seen the tile at some point to have created the
        // mapping.
        const nextLayerInputTileIdx = prevLayerMap ? knownInputIdLookup.indexOf(prevLayerMap.relative_path_z_plus_1) : -1;
        const nextLayerInputTile = nextLayerInputTileIdx > -1 ? knownInput[nextLayerInputTileIdx] : null;

        let prev_status = TilePipelineStatus.DoesNotExist;

        if ((inputTile.this_stage_status === TilePipelineStatus.Failed) || (nextLayerInputTile && (nextLayerInputTile.this_stage_status === TilePipelineStatus.Failed))) {
            prev_status = TilePipelineStatus.Failed;
        } else {
           prev_status = Math.min(inputTile.this_stage_status, (nextLayerInputTile ? nextLayerInputTile.this_stage_status : TilePipelineStatus.DoesNotExist));
        }

        if (existingOutput) {
            if (existingOutput.prev_stage_status !== prev_status) {
                muxUpdateLists.toUpdate.push({
                    relative_path: inputTile.relative_path,
                    prev_stage_status: prev_status,
                    x: inputTile.x,
                    y: inputTile.y,
                    z: inputTile.z,
                    lat_x: inputTile.lat_x,
                    lat_y: inputTile.lat_y,
                    lat_z: inputTile.lat_z,
                    cut_offset: inputTile.cut_offset,
                    z_offset: inputTile.z_offset,
                    delta_z: inputTile.delta_z,
                    updated_at: new Date()
                });
            }
        } else {
            let now = new Date();
            muxUpdateLists.toInsert.push({
                relative_path: inputTile.relative_path,
                tile_name: inputTile.tile_name,
                prev_stage_status: prev_status,
                this_stage_status: TilePipelineStatus.Incomplete,
                x: inputTile.x,
                y: inputTile.y,
                z: inputTile.z,
                lat_x: inputTile.lat_x,
                lat_y: inputTile.lat_y,
                lat_z: inputTile.lat_z,
                cut_offset: inputTile.cut_offset,
                z_offset: inputTile.z_offset,
                delta_z: inputTile.delta_z,
                created_at: now,
                updated_at: now
            });
        }
    }
}
