import Timer = NodeJS.Timer;
const fs = require("fs-extra");
const path = require("path");

const debug = require("debug")("mouselight:pipeline-api:tile-status-worker");

import {IProject} from "../data-model/project";

const dashboardJsonFile = "dashboard.json";
const tileStatusJsonFile = "pipeline-storage.json";
const tileStatusLastJsonFile = tileStatusJsonFile + ".last";

import {
    connectorForFile, TileStatusPipelineStageId, generatePipelineStateDatabaseName, generatePipelineStageTableName
} from "../data-access/knexPiplineStageConnection";

import performanceConfiguration from "../../config/performance.config"
import {PipelineScheduler, DefaultPipelineIdKey, TilePipelineStatus} from "./pipelineScheduler";
const perfConf = performanceConfiguration();

interface IPosition {
    x: number,
    y: number,
    z: number
}

interface IDashboardJsonTile {
    id: string;
    name: string;
    relative_path: string;
    status: number;
    position: IPosition,
    lattice_position: IPosition,
    cut_offset: number,
    z_offset: number,
    delta_z: number
}

export class TileStatusWorker extends PipelineScheduler {
    private _project: IProject;

    public constructor(project: IProject) {
        super();

        this._project = project;
    }

    public async run() {
        this._inputTableName = null;

        this._inputKnexConnector = null;

        if (!fs.existsSync(this._project.root_path)) {
            fs.mkdirSync(this._project.root_path);
        }

        this._outputTableName = generatePipelineStageTableName(TileStatusPipelineStageId);

        this._outputKnexConnector = await connectorForFile(generatePipelineStateDatabaseName(this._project.root_path), this._outputTableName);

        await this.performWork();
    }

    private async performWork() {
        if (this._isCancelRequested) {
            debug("cancel request - early return");
            return;
        }

        try {
            let knownInput = this.performJsonUpdate();

            if (knownInput.length === 0) {
                return;
            }

            debug(`update sqlite`);

            let knownOutput = await this.outputTable.select([DefaultPipelineIdKey, "prev_stage_status"]);

            let sorted = this.muxInputOutputTiles(knownInput, knownOutput);

            await this.batchInsert(this._outputKnexConnector, this._outputTableName, sorted.toInsert);

            await this.batchUpdate(this._outputKnexConnector, this._outputTableName, sorted.toUpdate, DefaultPipelineIdKey);
        } catch (err) {
            console.log(err);
        }

        debug("resetting timer");

        setTimeout(() => this.performWork(), perfConf.regenTileStatusJsonFileSeconds * 1000)
    }

    private muxInputOutputTiles(knownInput: IDashboardJsonTile[], knownOutput) {
        let sorted = {
            toInsert: [],
            toUpdate: []
        };

        let knownOutputLookup = knownOutput.map(obj => obj[DefaultPipelineIdKey]);

        knownInput.reduce((list, inputTile) => {
            let idx = knownOutputLookup.indexOf(inputTile.relative_path);

            let existingOutput = idx > -1 ? knownOutput[idx] : null;

            if (existingOutput) {
                if (existingOutput.prev_stage_status !== inputTile.status) {
                    list.toUpdate.push({
                        relative_path: inputTile.relative_path,
                        prev_stage_status: inputTile.status,
                        this_stage_status: inputTile.status,
                        x: inputTile.position.x,
                        y: inputTile.position.y,
                        z: inputTile.position.z,
                        lat_x: inputTile.lattice_position.x,
                        lat_y: inputTile.lattice_position.y,
                        lat_z: inputTile.lattice_position.z,
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
                    tile_name: inputTile.name,
                    prev_stage_status: inputTile.status,
                    this_stage_status: inputTile.status,
                    x: inputTile.position.x,
                    y: inputTile.position.y,
                    z: inputTile.position.z,
                    lat_x: inputTile.lattice_position.x,
                    lat_y: inputTile.lattice_position.y,
                    lat_z: inputTile.lattice_position.z,
                    cut_offset: inputTile.cut_offset,
                    z_offset: inputTile.z_offset,
                    delta_z: inputTile.delta_z,
                    created_at: now,
                    updated_at: now
                });
            }

            return list;
        }, sorted);

        return sorted;
    }

    private performJsonUpdate(): IDashboardJsonTile[] {
        let tiles: IDashboardJsonTile[] = [];

        let dataFile = path.join(this._project.root_path, dashboardJsonFile);

        if (!fs.existsSync(dataFile)) {
            debug(`there is no dashboard.json file in the project root path ${dataFile}`);
            return;
        }

        let outputFile = path.join(this._project.root_path, tileStatusJsonFile);

        let backupFile = path.join(this._project.root_path, tileStatusLastJsonFile);

        if (fs.existsSync(outputFile)) {
            debug(`move existing json to .last`);
            fs.copySync(outputFile, backupFile, {clobber: true});
        }

        debug(`update json`);

        let contents = fs.readFileSync(dataFile);

        let jsonContent = JSON.parse(contents);

        for (let prop in jsonContent.tileMap) {
            if (jsonContent.tileMap.hasOwnProperty(prop)) {
                jsonContent.tileMap[prop].forEach(tile => {
                    // Normalize paths to posix
                    let normalizedPath = tile.relativePath.replace(new RegExp("\\" + "\\", "g"), "/");
                    let tileName = path.basename(normalizedPath);
                    tiles.push({
                        id: tile.id,
                        name: tileName,
                        relative_path: normalizedPath,
                        status: tile.isComplete ? TilePipelineStatus.Complete : TilePipelineStatus.Incomplete,
                        position: tile.contents.position,
                        lattice_position: tile.contents.latticePosition,
                        cut_offset: tile.contents.cutOffset,
                        z_offset: tile.contents.zOffset,
                        delta_z: tile.contents.deltaZ
                    });
                });
            }
        }

        if (fs.existsSync(outputFile)) {
            fs.unlinkSync(outputFile);
        }

        fs.outputJSONSync(outputFile, tiles);

        return tiles;
    }
}
