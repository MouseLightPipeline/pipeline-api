import {PersistentStorageManager} from "../data-access/sequelize/databaseConnector";

const fse = require("fs-extra");
const path = require("path");
import * as _ from "lodash";

const debug = require("debug")("pipeline:coordinator-api:tile-status-worker");

const pipelineInputJsonFile = "pipeline-input.json";
const dashboardJsonFile = "dashboard.json";
const tileStatusJsonFile = "pipeline-storage.json";
const tileStatusLastJsonFile = tileStatusJsonFile + ".last";

import {
    connectorForFile, generatePipelineStateDatabaseName, generateProjectRootTableName
} from "../data-access/knexPiplineStageConnection";

import performanceConfiguration from "../options/performanceOptions"
import {
    PipelineScheduler, DefaultPipelineIdKey, TilePipelineStatus, IPipelineTile, IMuxTileLists
} from "./pipelineScheduler";
import {IProject} from "../data-model/sequelize/project";

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
    lattice_position: IPosition,
    // position: IPosition,
    // cut_offset: number,
    // z_offset: number,
    // delta_z: number
}

export class TileStatusWorker extends PipelineScheduler {
    private _project: any;

    public constructor(project: IProject) {
        super(null);

        this._project = project;

        this.IsExitRequested = false;

        this.IsProcessingRequested = true;
    }

    public get OutputPath(): string {
        return this._project.root_path;
    }

    protected get stageId() {
        return this._project.id;
    }

    protected async createTables() {
        if (this.IsExitRequested) {
            debug("cancel request - early return");
            return;
        }

        try {
            fse.ensureDirSync(this._project.root_path);
            fse.chmodSync(this._project.root_path, 0o775);
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

                const knownInput = await this.performJsonUpdate();

                if (knownInput.length > 0) {

                    const knownOutput = await this.outputTable.select([DefaultPipelineIdKey, "prev_stage_status"]);

                    const sorted = await this.muxInputOutputTiles(knownInput, knownOutput);

                    await this.batchInsert(this._outputKnexConnector, this._outputTableName, sorted.toInsert);

                    await this.batchUpdate(this._outputKnexConnector, this._outputTableName, sorted.toUpdate, DefaultPipelineIdKey);

                    await this.batchDelete(this._outputKnexConnector, this._outputTableName, sorted.toDelete, DefaultPipelineIdKey);
                }
            } catch (err) {
                console.log(err);
            }
        }

        setTimeout(() => this.performWork(), perfConf.pipelineSchedulerIntervalSeconds * 5 * 1000)
    }

    protected async muxInputOutputTiles(knownInput: IDashboardJsonTile[], knownOutput: IPipelineTile[]): Promise<IMuxTileLists> {
        const sorted = {
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
                tile_name: inputTile.name,
                prev_stage_status: inputTile.status,
                this_stage_status: inputTile.status,
                // x: inputTile.position.x,
                // y: inputTile.position.y,
                // z: inputTile.position.z,
                lat_x: inputTile.lattice_position.x,
                lat_y: inputTile.lattice_position.y,
                lat_z: inputTile.lattice_position.z,
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

            if (existingTile.prev_stage_status !== inputTile.status) {
                return {
                    relative_path: inputTile.relative_path,
                    prev_stage_status: inputTile.status,
                    this_stage_status: inputTile.status,
                    // x: inputTile.position.x,
                    // y: inputTile.position.y,
                    // z: inputTile.position.z,
                    lat_x: inputTile.lattice_position.x,
                    lat_y: inputTile.lattice_position.y,
                    lat_z: inputTile.lattice_position.z,
                    // cut_offset: inputTile.cut_offset,
                    // z_offset: inputTile.z_offset,
                    // delta_z: inputTile.delta_z,
                    updated_at: new Date()
                };
            } else {
                return null;
            }
        }).filter(t => t !== null);

        return sorted;
    }

    private async performJsonUpdate(): Promise<IDashboardJsonTile[]> {
        const projectUpdate: IProject = {
            id: this._project.id
        };

        let tiles: IDashboardJsonTile[] = [];

        let dataFile = path.join(this._project.root_path, pipelineInputJsonFile);

        if (!fse.existsSync(dataFile)) {
            debug(`${pipelineInputJsonFile} does not exist in the project root path - moving on to ${dashboardJsonFile}`);
            dataFile = path.join(this._project.root_path, dashboardJsonFile);

            if (!fse.existsSync(dataFile)) {
                debug(`${dashboardJsonFile} also does not exist in the project root path ${dataFile} - skipping tile update`);
                return;
            }
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

            await this._project.update(projectUpdate);

            this._project = await PersistentStorageManager.Instance().Projects.findById(this._project.id);
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
                        // position: tile.contents.position,
                        lattice_position: tile.contents.latticePosition,
                        // cut_offset: tile.contents.cutOffset,
                        // z_offset: tile.contents.zOffset,
                        // delta_z: tile.contents.deltaZ
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
