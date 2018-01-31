import * as _ from "lodash";

const debug = require("debug")("pipeline:coordinator-api:pipeline-map-worker");

import {IPipelineStage} from "../data-model/sequelize/pipelineStage";

import {
    PipelineScheduler, DefaultPipelineIdKey, TilePipelineStatus, IPipelineTile,
    IMuxTileLists
} from "./pipelineScheduler";

export class PipelineMapScheduler extends PipelineScheduler {

    public constructor(pipelineStage: IPipelineStage) {
        super(pipelineStage);
    }

    protected async muxInputOutputTiles(knownInput: IPipelineTile[], knownOutput: IPipelineTile[]): Promise<IMuxTileLists> {
        let sorted = {
            toInsert: [],
            toUpdate: [],
            toDelete: []
        };

        const toInsert = _.differenceBy(knownInput, knownOutput, DefaultPipelineIdKey);

        const toUpdate = _.intersectionBy(knownInput, knownOutput, DefaultPipelineIdKey);

        sorted.toDelete = _.differenceBy(knownOutput, knownInput, DefaultPipelineIdKey).map(t => t.relative_path);

        sorted.toInsert = toInsert.map(inputTile => {
            const now = new Date();

            return {
                relative_path: inputTile.relative_path,
                tile_name: inputTile.tile_name,
                prev_stage_status: inputTile.this_stage_status,
                this_stage_status: TilePipelineStatus.Incomplete,
                // x: inputTile.x,
                // y: inputTile.y,
                // z: inputTile.z,
                lat_x: inputTile.lat_x,
                lat_y: inputTile.lat_y,
                lat_z: inputTile.lat_z,
                // cut_offset: inputTile.cut_offset,
                // z_offset: inputTile.z_offset,
                // delta_z: inputTile.delta_z,
                duration: 0,
                cpu_high: 0,
                memory_high: 0,
                created_at: now,
                updated_at: now
            };
        });

        sorted.toUpdate = toUpdate.map(inputTile => {
            const existingTileIdx = _.findIndex(knownOutput, t => t.relative_path === inputTile.relative_path);

            if (existingTileIdx < 0) {
                debug(`unexpected missing tile ${inputTile.relative_path}`);
                return null;
            }

            const existingTile = knownOutput[existingTileIdx];

            if (existingTile.prev_stage_status !== inputTile.this_stage_status) {
                return {
                    relative_path: inputTile.relative_path,
                    prev_stage_status: inputTile.this_stage_status,
                    this_stage_status: (inputTile === TilePipelineStatus.Complete || existingTile.this_stage_status === TilePipelineStatus.Processing) ? existingTile.this_stage_status : TilePipelineStatus.Incomplete,
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
                };
            }  else {
                return null;
            }
        }).filter(t => t !== null);

        return sorted;
    }
}
