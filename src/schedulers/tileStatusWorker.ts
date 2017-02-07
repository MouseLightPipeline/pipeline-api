import Timer = NodeJS.Timer;
const fse = require("fs-extra");
const path = require("path");

const debug = require("debug")("mouselight:pipeline-api:tile-status-worker");

import {IProject, Projects} from "../data-model/project";

const dashboardJsonFile = "dashboard.json";
const tileStatusJsonFile = "pipeline-storage.json";
const tileStatusLastJsonFile = tileStatusJsonFile + ".last";

import {
    connectorForFile, generatePipelineStateDatabaseName, generateProjectRootTableName
} from "../data-access/knexPiplineStageConnection";

import performanceConfiguration from "../../config/performance.config"
import {
    PipelineScheduler, DefaultPipelineIdKey, TilePipelineStatus
} from "./pipelineScheduler";
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
        super(null);

        this.IsExitRequested = false;

        this.IsProcessingRequested = true;

        this._project = project;
    }

    protected async createTables() {
        if (this.IsExitRequested) {
            debug("cancel request - early return");
            return;
        }

        try {
            fse.ensureDirSync(this._project.root_path);
        } catch (err) {
            // Most likely drive/share is not present or failed permissions.
            if (err && err.code === "EACCES") {
                debug("tile status output directory permission denied");
            } else {
                debug(err);
            }
            return false;
        }

        this._inputTableName = null;

        this._inputKnexConnector = null;

        this._outputTableName = generateProjectRootTableName(this._project.id);

        this._outputKnexConnector = await connectorForFile(generatePipelineStateDatabaseName(this._project.root_path), this._outputTableName);

        return !!this._outputKnexConnector;
    }

    protected async performWork() {
        if (this.IsExitRequested) {
            debug("cancel request - early return");
            return;
        }

        if (this.IsProcessingRequested) {
            try {
                debug(`dashboard update for project ${this._project.name}`);

                let knownInput = await this.performJsonUpdate();

                if (knownInput.length > 0) {

                    let knownOutput = await this.outputTable.select([DefaultPipelineIdKey, "prev_stage_status"]);

                    let sorted = await this.muxInputOutputTiles(knownInput, knownOutput);

                    await this.batchInsert(this._outputKnexConnector, this._outputTableName, sorted.toInsert);

                    await this.batchUpdate(this._outputKnexConnector, this._outputTableName, sorted.toUpdatePrevious, DefaultPipelineIdKey);
                }
            } catch (err) {
                console.log(err);
            }
        }

        setTimeout(() => this.performWork(), perfConf.regenTileStatusJsonFileSeconds * 1000)
    }

    protected async muxInputOutputTiles(knownInput: IDashboardJsonTile[], knownOutput) {
        let sorted = {
            toInsert: [],
            toUpdatePrevious: []
        };

        let knownOutputLookup = knownOutput.map(obj => obj[DefaultPipelineIdKey]);

        knownInput.reduce((list, inputTile) => {
            let idx = knownOutputLookup.indexOf(inputTile.relative_path);

            let existingOutput = idx > -1 ? knownOutput[idx] : null;

            if (existingOutput) {
                if (existingOutput.prev_stage_status !== inputTile.status) {
                    list.toUpdatePrevious.push({
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

    private async performJsonUpdate(): Promise<IDashboardJsonTile[]> {
        const projectUpdate: IProject = {
            id: this._project.id
        };

        let tiles: IDashboardJsonTile[] = [];

        let dataFile = path.join(this._project.root_path, dashboardJsonFile);

        if (!fse.existsSync(dataFile)) {
            debug(`\tthere is no dashboard.json file in the project root path ${dataFile}`);
            return;
        }

        let outputFile = path.join(this._project.root_path, tileStatusJsonFile);

        let backupFile = path.join(this._project.root_path, tileStatusLastJsonFile);

        if (fse.existsSync(outputFile)) {
            fse.copySync(outputFile, backupFile, {clobber: true});
        }

        let contents = fse.readFileSync(dataFile);

        let jsonContent = JSON.parse(contents);

        if (jsonContent.monitor && jsonContent.monitor.extents) {
            projectUpdate.sample_x_min = jsonContent.monitor.extents.minimumX;
            projectUpdate.sample_x_max = jsonContent.monitor.extents.maximumX;
            projectUpdate.sample_y_min = jsonContent.monitor.extents.minimumY;
            projectUpdate.sample_y_max = jsonContent.monitor.extents.maximumY;
            projectUpdate.sample_z_min = jsonContent.monitor.extents.minimumZ;
            projectUpdate.sample_z_max = jsonContent.monitor.extents.maximumZ;

            this._project = await Projects.defaultManager().update(projectUpdate);
        }

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

        if (fse.existsSync(outputFile)) {
            fse.unlinkSync(outputFile);
        }

        fse.outputJSONSync(outputFile, tiles);

        return tiles;
    }
}
