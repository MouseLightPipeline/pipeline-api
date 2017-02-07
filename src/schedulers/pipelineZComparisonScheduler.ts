import {PipelineScheduler, TilePipelineStatus, DefaultPipelineIdKey, IPipelineTile} from "./pipelineScheduler";
import {IPipelineStage} from "../data-model/pipelineStage";
import {verifyTable, generatePipelineCustomTableName} from "../data-access/knexPiplineStageConnection";

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
            table.string("relative_path_z_minus_1");
            table.string("tile_name_z_minus_1");
        });

        return true;
    }

    protected async getTaskContext(tile: IPipelineTile): Promise<any> {
        let rows = this.zIndexMapTable.where(DefaultPipelineIdKey, tile.relative_path);

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

        return [context.relative_path_z_minus_1, context.tile_name_z_minus_1];
    }

    protected async muxInputOutputTiles(knownInput, knownOutput) {
        let sorted = {
            toInsert: [],
            toUpdatePrevious: [],
            toInsertZMapIndex: []
        };

        // Flatten input and and output for faster searching.
        let knownOutputIdLookup = knownOutput.map(obj => obj[DefaultPipelineIdKey]);

        let knownInputZLookup = knownInput.map(obj => obj.lat_z);

        let zIndexMapRows = await this.zIndexMapTable.select();

        let knownZIndexMapIdLookup = zIndexMapRows.map(obj => obj[DefaultPipelineIdKey]);

        knownInput.reduce((list, inputTile) => {
            // All input tiles will have an output tile.  Insert or updateFromInputProject as required.

            let idx = knownOutputIdLookup.indexOf(inputTile[DefaultPipelineIdKey]);

            let existingOutput = idx > -1 ? knownOutput[idx] : null;

            // TODO should include extents from monitor info in dashboard json to determine whether there will ever be a
            // z - 1 tile.  Otherwise, we'll always have incomplete tiles for the first z-plane.
            let inputPrevIdx = knownInputZLookup.indexOf(inputTile.lat_z - 1);

            let inputPrev = idx > -1 ? knownInput[inputPrevIdx] : null;

            let prev_status = (inputTile.this_stage_status === TilePipelineStatus.Complete) && (inputPrev && (inputPrev.status === TilePipelineStatus.Complete));

            if (existingOutput) {
                if (existingOutput.prev_stage_status !== prev_status) {
                    list.toUpdatePrevious.push({
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
                list.toInsert.push({
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

            // Additional state not contained in one-to-one map task
            if (inputPrev !== null) {
                let zIndexTileIndex = knownZIndexMapIdLookup.indexOf(inputTile[DefaultPipelineIdKey]);

                if (zIndexTileIndex < 0) {
                    // Need to enter relative path of z - 1 tile so that we don't need to look it up when it comes
                    // time to schedule the task.
                    list.toInsertZMapIndex.push({
                        relative_path: inputTile.relative_path,
                        relative_path_z_minus_1: inputPrev.relative_path,
                        tile_name_z_minus_1: inputPrev.tile_name
                    });
                }
            }

            return list;
        }, sorted);

        await this.batchInsert(this._outputKnexConnector, this._zIndexMapTableName, sorted.toInsertZMapIndex);

        return sorted;
    }
}
