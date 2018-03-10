import {PersistentStorageManager} from "../data-access/sequelize/databaseConnector";

const fse = require("fs-extra");
const path = require("path");
import * as _ from "lodash";

const debug = require("debug")("pipeline:coordinator-api:project-pipeline-scheduler");

const pipelineInputJsonFile = "pipeline-input.json";
const dashboardJsonFile = "dashboard.json";
const tileStatusJsonFile = "pipeline-storage.json";
const tileStatusLastJsonFile = tileStatusJsonFile + ".last";

import {
    BasePipelineScheduler, DefaultPipelineIdKey, TilePipelineStatus, IMuxTileLists
} from "./basePipelineScheduler";
import {IProject, IProjectAttributes} from "../data-model/sequelize/project";
import {IPipelineTileAttributes, StageTableConnector} from "../data-access/sequelize/stageTableConnector";
import {isNullOrUndefined} from "util";
import {ProjectDatabaseConnector} from "../data-access/sequelize/projectDatabaseConnector";

interface IPosition {
    x: number;
    y: number;
    z: number;
}

interface IDashboardJsonTile {
    index: string;
    name: string;
    relative_path: string;
    status: number;
    lattice_position: IPosition;
    lattice_step: IPosition;
}

export class ProjectPipelineScheduler extends BasePipelineScheduler {

    public constructor(project: IProject) {
        super(project);

        this.IsExitRequested = false;

        this.IsProcessingRequested = true;
    }

    protected getOutputPath(): string {
        return this._project.root_path;
    }

    protected getStageId(): string {
        return this._project.id;
    }

    protected getDepth(): number {
        return 0;
    }

    protected async createOutputStageConnector(connector: ProjectDatabaseConnector): Promise<StageTableConnector> {
        return await connector.connectorForProject(this._project);
    }

    protected async refreshTileStatus(): Promise<boolean> {
        // For the tile status stage (project "0" depth stage), refreshing the tile status _is_ the work.

        debug(`dashboard update for project ${this._project.name}`);

        const knownInput = await this.performJsonUpdate();

        /*
        if (knownInput.length > 0) {

            const knownOutput = await this.outputTable.select([DefaultPipelineIdKey, "prev_stage_status"]);

            const sorted = await this.muxInputOutputTiles(knownInput, knownOutput);

            await this.batchInsert(this._outputKnexConnector, this._outputTableName, sorted.toInsert);

            await this.batchUpdate(this._outputKnexConnector, this._outputTableName, sorted.toUpdate, DefaultPipelineIdKey);

            await this.batchDelete(this._outputKnexConnector, this._outputTableName, sorted.toDelete, DefaultPipelineIdKey);
        }
        */

        await this.refreshWithKnownInput(knownInput);

        return true;
    }

    protected async muxInputOutputTiles(knownInput: IDashboardJsonTile[], knownOutput: IPipelineTileAttributes[]): Promise<IMuxTileLists> {
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
                index: inputTile.index,
                tile_name: inputTile.name,
                prev_stage_status: inputTile.status,
                this_stage_status: inputTile.status,
                lat_x: inputTile.lattice_position.x,
                lat_y: inputTile.lattice_position.y,
                lat_z: inputTile.lattice_position.z,
                step_x: inputTile.lattice_step.x,
                step_y: inputTile.lattice_step.y,
                step_z: inputTile.lattice_step.z,
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
                existingTile.tile_name = inputTile.name;
                existingTile.index = inputTile.index;
                existingTile.prev_stage_status = inputTile.status;
                existingTile.this_stage_status = inputTile.status;
                existingTile.lat_x = inputTile.lattice_position.x;
                existingTile.lat_y = inputTile.lattice_position.y;
                existingTile.lat_z = inputTile.lattice_position.z;
                existingTile.step_x = inputTile.lattice_step.x;
                existingTile.step_y = inputTile.lattice_step.y;
                existingTile.step_z = inputTile.lattice_step.z;
                existingTile.updated_at = new Date();

                return existingTile;
            } else {
                return null;
            }
        }).filter(t => t !== null);

        return sorted;
    }

    private async performJsonUpdate(): Promise<IDashboardJsonTile[]> {
        const projectUpdate: IProjectAttributes = {
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
                        index: isNullOrUndefined(tile.id) ? null : tile.id,
                        name: tileName || "",
                        relative_path: normalizedPath,
                        status: tile.isComplete ? TilePipelineStatus.Complete : TilePipelineStatus.Incomplete,
                        lattice_position: tile.contents.latticePosition || {x: null, y: null, z: null},
                        lattice_step: tile.contents.latticeStep || {x: null, y: null, z: null}
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
