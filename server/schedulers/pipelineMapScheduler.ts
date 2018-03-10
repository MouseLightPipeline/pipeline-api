import * as _ from "lodash";

const debug = require("debug")("pipeline:coordinator-api:pipeline-map-worker");

import {IPipelineStage} from "../data-model/sequelize/pipelineStage";

import {PipelineScheduler} from "./stagePipelineScheduler";
import {IPipelineTile} from "../data-access/sequelize/stageTableConnector";
import {DefaultPipelineIdKey, IMuxTileLists, TilePipelineStatus} from "./basePipelineScheduler";
import {IProject} from "../data-model/sequelize/project";

export class PipelineMapScheduler extends PipelineScheduler {

    public constructor(pipelineStage: IPipelineStage, project: IProject) {
        super(pipelineStage, project);
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
                index: inputTile.index,
                tile_name: inputTile.tile_name,
                prev_stage_status: inputTile.this_stage_status,
                this_stage_status: TilePipelineStatus.Incomplete,
                lat_x: inputTile.lat_x,
                lat_y: inputTile.lat_y,
                lat_z: inputTile.lat_z,
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
                existingTile.relative_path = inputTile.relative_path;
                existingTile.prev_stage_status = inputTile.this_stage_status;
                existingTile.this_stage_status = (inputTile === TilePipelineStatus.Complete || existingTile.this_stage_status === TilePipelineStatus.Processing) ? existingTile.this_stage_status : TilePipelineStatus.Incomplete;
                existingTile.lat_x = inputTile.lat_x;
                existingTile.lat_y = inputTile.lat_y;
                existingTile.lat_z = inputTile.lat_z;
                existingTile.updated_at = new Date();

                return existingTile;
            } else {
                return null;
            }
        }).filter(t => t !== null);

        return sorted;
    }
}
