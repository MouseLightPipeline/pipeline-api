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
    toInsertZMapIndex: IPreviousLayerMap[];
    toDeleteZMapIndex: string[];
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
        const rows = await this.inputTable.where({
            lat_x: inputTile.lat_x,
            lat_y: inputTile.lat_y,
            lat_z: inputTile.lat_z + 1
        });

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
            toInsertZMapIndex: [],
            toDeleteZMapIndex: []
        };

        // Flatten input and and output for faster searching.
        const knownOutputIdLookup = knownOutput.map(obj => obj[DefaultPipelineIdKey]);
        const knownInputIdLookup = knownInput.map(obj => obj[DefaultPipelineIdKey]);

        // List of tiles where we already know the previous layer tile id.
        const nextLayerMapRows = await this.zIndexMapTable.select();
        const nextLayerMapIdLookup = nextLayerMapRows.map(obj => obj[DefaultPipelineIdKey]);

        muxUpdateLists.toDelete = _.differenceBy(knownOutput, knownInput, DefaultPipelineIdKey).map(t => t.relative_path);

        // Force serial execution of each tile given async calls within function.
        await knownInput.reduce(async (promiseChain, inputTile) => {
            return promiseChain.then(() => {
                return this.muxUpdateTile(inputTile, knownInput, knownOutput, nextLayerMapRows, knownInputIdLookup, knownOutputIdLookup, nextLayerMapIdLookup, muxUpdateLists.toDelete, muxUpdateLists);
            });
        }, Promise.resolve());

        await this.batchInsert(this._outputKnexConnector, this._zIndexMapTableName, muxUpdateLists.toInsertZMapIndex);

        await this.batchDelete(this._outputKnexConnector, this._zIndexMapTableName, muxUpdateLists.toDeleteZMapIndex);

        // Insert, update, delete handled by base.
        return muxUpdateLists;
    }

    private async muxUpdateTile(inputTile: IPipelineTile, knownInput: IPipelineTile[], knownOutput: IPipelineTile[], nextLayerMapRows: IPreviousLayerMap[],
                                knownInputIdLookup: string[], knownOutputIdLookup: string[], nextLayerMapIdLookup: string[], toDelete: string[],
                                muxUpdateLists: IMuxUpdateLists): Promise<void> {
        const idx = knownOutputIdLookup.indexOf(inputTile[DefaultPipelineIdKey]);

        const existingOutput: IPipelineTile = idx > -1 ? knownOutput[idx] : null;

        const nextLayerLookupIndex = nextLayerMapIdLookup.indexOf(inputTile[DefaultPipelineIdKey]);

        let nextLayerMap: IPreviousLayerMap = nextLayerLookupIndex > -1 ? nextLayerMapRows[nextLayerLookupIndex] : null;

        let tile = null;

        if (nextLayerMap === null) {
            tile = await this.findPreviousLayerTile(inputTile);
        } else {
            // Assert the existing map is still valid given any curation/deletion.
            const index = toDelete.indexOf(nextLayerMap.relative_path_z_plus_1);

            // Remove entry.  If a replacement exists, will be captured next time around.
            if (index >= 0) {
                muxUpdateLists.toDeleteZMapIndex.push(inputTile.relative_path);
            }
        }

        if (tile !== null) {
            nextLayerMap = {
                relative_path: inputTile.relative_path,
                relative_path_z_plus_1: tile.relative_path,
                tile_name_z_plus_1: tile.tile_name
            };

            muxUpdateLists.toInsertZMapIndex.push(nextLayerMap);
        }

        // This really shouldn't fail since we should have already seen the tile at some point to have created the
        // mapping.
        const nextLayerInputTileIdx = nextLayerMap ? knownInputIdLookup.indexOf(nextLayerMap.relative_path_z_plus_1) : -1;
        const nextLayerInputTile = nextLayerInputTileIdx > -1 ? knownInput[nextLayerInputTileIdx] : null;

        let prev_status = TilePipelineStatus.DoesNotExist;

        let this_status = TilePipelineStatus.Incomplete;

        // We can only be in this block if the z layer tile exists.  If the z + 1 tile does not exist, the tile
        // effectively does not exist for this stage.
        if (nextLayerInputTile !== null) {
            if ((inputTile.this_stage_status === TilePipelineStatus.Failed) || (nextLayerInputTile.this_stage_status === TilePipelineStatus.Failed)) {
                prev_status = TilePipelineStatus.Failed;
            } else if ((inputTile.this_stage_status === TilePipelineStatus.Canceled) || (nextLayerInputTile.this_stage_status === TilePipelineStatus.Canceled)) {
                prev_status = TilePipelineStatus.Canceled;
            } else {
                // This works because once you drop failed and canceled, the highest value is complete.
                prev_status = Math.min(inputTile.this_stage_status, nextLayerInputTile.this_stage_status);
            }
        } else {
            if (inputTile.lat_z === 1954 && inputTile.lat_y === 121) {
                debug(`should be setting status to does not exist ${inputTile.relative_path}`);
            }
            this_status = TilePipelineStatus.DoesNotExist;
        }

        if (existingOutput) {
            // If the previous stage is in the middle of processing, maintain the current status - nothing has
            // changed (we don't kill a running task because a tile has been curated - it will be removed when done).
            // Otherwise. something reset on the last stage tile and need to go back to incomplete.
            if (existingOutput.this_stage_status !== TilePipelineStatus.Processing) {
                // In all cases but the above, if this has been marked does not exist above due to previous stage info
                // that is the final answer.
                if (this_status !== TilePipelineStatus.DoesNotExist) {
                    if ((prev_status !== TilePipelineStatus.DoesNotExist) && (existingOutput.this_stage_status === TilePipelineStatus.DoesNotExist)) {
                        // It was considered does not exist (maybe z + 1 had not been acquired yet), but now there is a
                        // legit value for the previous stage, so upgrade to incomplete.
                        this_status = TilePipelineStatus.Incomplete;
                    } else if (inputTile.this_stage_status !== TilePipelineStatus.Complete) {
                        // If this is a regression in the previous stage, this needs to be reverted to incomplete.
                        this_status = TilePipelineStatus.Incomplete;
                    } else {
                        // Otherwise no change.
                        if (inputTile.lat_z === 1954 && inputTile.lat_y === 121) {
                            debug(`1 maintaining ${existingOutput.this_stage_status} for ${inputTile.relative_path}`);
                        }
                        this_status = existingOutput.this_stage_status;
                    }
                } else {
                    if (inputTile.lat_z === 1954 && inputTile.lat_y === 121) {
                        debug(`maintaining does not exist ${inputTile.relative_path}`);
                    }
                }
            } else {
                if (inputTile.lat_z === 1954 && inputTile.lat_y === 121) {
                    debug(`2 maintaining ${existingOutput.this_stage_status} for ${inputTile.relative_path}`);
                }
                this_status = existingOutput.this_stage_status;
            }

            if (inputTile.lat_z === 1954 && inputTile.lat_y === 121) {
                debug(`settled on ${this_status} for ${inputTile.relative_path}`);
            }

            if (existingOutput.prev_stage_status !== prev_status/* || existingOutput.this_stage_status !== this_status*/) {
                muxUpdateLists.toUpdate.push({
                    relative_path: inputTile.relative_path,
                    prev_stage_status: prev_status,
                    this_stage_status: this_status,
                    // x: inputTile.x,
                    // y: inputTile.y,
                    // z: inputTile.z,
                    lat_x: inputTile.lat_x,
                    lat_y: inputTile.lat_y,
                    lat_z: inputTile.lat_z,
                    // cut_offset: inputTile.cut_offset,
                    // z_offset: inputTile.z_offset,
                    // delta_z: inputTile.delta_z,
                    updated_at: new Date()
                });
            }
        } else {
            let now = new Date();

            muxUpdateLists.toInsert.push({
                    relative_path: inputTile.relative_path,
                    tile_name: inputTile.tile_name,
                    prev_stage_status: prev_status,
                    this_stage_status: this_status,
                    // x: inputTile.x,
                    // y: inputTile.y,
                    // z: inputTile.z,
                    lat_x: inputTile.lat_x,
                    lat_y: inputTile.lat_y,
                    lat_z: inputTile.lat_z,
                    // cut_offset: inputTile.cut_offset,
                    // z_offset: inputTile.z_offset,
                    // delta_z: inputTile.delta_z,
                    created_at: now,
                    updated_at: now
                }
            );
        }
    }
}
