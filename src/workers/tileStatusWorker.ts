import Timer = NodeJS.Timer;
const fs = require("fs-extra");
const path = require("path");

const debug = require("debug")("mouselight:pipeline-api:tile-status-worker");

import {IProject, Projects} from "../data-model/project";

const dashboardJsonFile = "dashboard.json";
const tileStatusJsonFile = "pipeline-storage.json";
const tileStatusLastJsonFile = tileStatusJsonFile + ".last";

import performanceConfiguration from "../../config/performance.config"
import {connectorForFile, PipelineStageDatabaseFile} from "../data-access/knexPiplineStageConnection";

const perfConf = performanceConfiguration();

export class TileStatusFileWorker {
    private static _instance: TileStatusFileWorker = null;

    public static Run(): TileStatusFileWorker {
        if (!this._instance) {
            this._instance = new TileStatusFileWorker();
        }

        return this._instance;
    }

    private _timer: Timer = null;

    private constructor() {
        this.updateActiveProjects();

        this._timer = setInterval(() => this.updateActiveProjects(), perfConf.regenTileStatusJsonFileSeconds * 1000);
    }

    private async updateActiveProjects() {
        let projectManager = new Projects();

        let projects = await projectManager.getAll();

        projects = projects.filter(project => project.is_active);

        projects.forEach(async(project) => {
            await this.updateTileStatusFile(project);
        });
    }

    private async updateTileStatusFile(project: IProject) {
        debug(`updating ${project.root_path}`);

        let dataFile = path.join(project.root_path, dashboardJsonFile);

        if (!fs.existsSync(dataFile)) {
            debug(`there is no dashboard.json file in the project root path ${dataFile}`);
            return;
        }

        let outputFile = path.join(project.root_path, tileStatusJsonFile);

        let backupFile = path.join(project.root_path, tileStatusLastJsonFile);

        if (fs.existsSync(outputFile)) {
            debug(`move existing json to .last`);
            fs.copySync(outputFile, backupFile, {clobber: true});
        }

        debug(`update json`);

        let contents = fs.readFileSync(dataFile);

        let jsonContent = JSON.parse(contents);

        let tiles = [];

        for (let prop in jsonContent.tileMap) {
            if (jsonContent.tileMap.hasOwnProperty(prop)) {
                jsonContent.tileMap[prop].forEach(tile => {
                    tiles.push({id: tile.id, relativePath: tile.relativePath, isComplete: tile.isComplete});
                });
            }
        }

        if (fs.existsSync(outputFile)) {
            fs.unlinkSync(outputFile);
        }

        fs.outputJSONSync(outputFile, tiles);
        debug(`update json complete`);

        let databaseFile = path.join(project.root_path, PipelineStageDatabaseFile);

        debug(`update sqlite`);

        let knexConnector = await connectorForFile(databaseFile);

        tiles.forEach(async(tile) => {
            let tileRow = await knexConnector("DashboardTiles").where("relative_path", tile.relativePath);

            if (tileRow.length > 0) {
                if (tile.isComplete !== tileRow.is_complete) {
                    await knexConnector("DashboardTiles").where("relative_path", tile.relativePath).update({
                        previous_stage_is_complete: tile.isComplete,
                        current_stage_is_complete: tile.isComplete,
                        updated_at: new Date()
                    });
                }
            } else {
                let now = new Date();

                await knexConnector("DashboardTiles").insert({
                    relative_path: tile.relativePath,
                    previous_stage_is_complete: tile.isComplete,
                    current_stage_is_complete: tile.isComplete,
                    created_at: now,
                    updated_at: now
                });
            }
        });

        debug(`update sqlite complete`);
    }
}
