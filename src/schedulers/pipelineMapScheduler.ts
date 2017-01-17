const path = require("path");
const fs = require("fs-extra");

const debug = require("debug")("mouselight:pipeline-api:pipeline-map-worker");

import {PipelineScheduler, DefaultPipelineIdKey, TilePipelineStatus} from "./pipelineScheduler";
import {IPipelineStage} from "../data-model/pipelineStage";

export class PipelineMapScheduler extends PipelineScheduler {

    public constructor(pipelineStage: IPipelineStage) {
        super(pipelineStage);
    }

    protected async muxInputOutputTiles(knownInput, knownOutput) {
        let sorted = {
            toInsert: [],
            toUpdatePrevious: []
        };

        let knownOutputLookup = knownOutput.map(obj => obj[DefaultPipelineIdKey]);

        knownInput.reduce((list, inputTile) => {
            let idx = knownOutputLookup.indexOf(inputTile[DefaultPipelineIdKey]);

            let existingOutput = idx > -1 ? knownOutput[idx] : null;

            if (existingOutput) {
                if (existingOutput.prev_stage_status !== inputTile.this_stage_status) {
                    list.toUpdatePrevious.push({
                        relative_path: inputTile.relative_path,
                        prev_stage_status: inputTile.this_stage_status,
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
                    prev_stage_status: inputTile.this_stage_status,
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
                    duration: 0,
                    cpu_high: 0,
                    memory_high: 0,
                    created_at: now,
                    updated_at: now
                });
            }

            return list;
        }, sorted);

        return sorted;
    }
}
