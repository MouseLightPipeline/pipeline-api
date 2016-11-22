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

const tableName = "PipelineStage_TileStatus";

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
    }

    private async updateActiveProjects() {
        let projectManager = new Projects();

        let projects = await projectManager.getAll();

        projects = projects.filter(project => project.is_active);

        let requests = projects.reduce((promiseChain, project) => {
            return promiseChain.then(() => new Promise(async(resolve) => {
                debug(`updating ${project.root_path}`);
                await this.updateTileStatusFile(project);
                debug(`update complete`);
                resolve();
            }));
        }, Promise.resolve());

        requests.then(() => {
            debug(`resetting timer`);
            setTimeout(() => this.updateActiveProjects(), perfConf.regenTileStatusJsonFileSeconds * 1000);
        });
    }

    private async updateTileStatusFile(project: IProject) {
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

        let databaseFile = path.join(project.root_path, PipelineStageDatabaseFile);

        debug(`update sqlite`);

        let knexConnector = await connectorForFile(databaseFile);

        let toInsert = [];
        let toUpdate = [];

        await tiles.reduce((promiseChain, tile) => {
            return promiseChain.then(() => new Promise((resolve) => {
                this.sortTile(knexConnector, tile, toInsert, toUpdate, resolve)
            }));
        }, Promise.resolve());

        if (toInsert.length > 0) {
            debug(`batch insert ${toInsert.length} tiles`);

            while (toInsert.length > 0) {
                await knexConnector.batchInsert(tableName, toInsert.splice(0, perfConf.regenTileStatusSqliteChunkSize));
            }
        }

        if (toUpdate.length > 0) {
            debug(`batch update ${toUpdate.length} tiles`);

            while (toUpdate.length > 0) {
                let chunk = toUpdate.splice(0, perfConf.regenTileStatusSqliteChunkSize);
                await knexConnector.transaction((trx) => {
                    return chunk.reduce((promiseChain, tile) => {
                        let func = knexConnector(tableName).where("relative_path", tile.relativePath).update({
                            previous_stage_is_complete: tile.isComplete,
                            current_stage_is_complete: tile.isComplete,
                            updated_at: new Date()
                        }).transacting(trx);

                        return promiseChain ? promiseChain.then(() => {
                            return func;
                        }) : func;
                    }, null);
                });
            }
        }

        return Promise.resolve();
    }

    private async sortTile(knexConnector, tile, toInsert, toUpdate, resolve) {
        // debug(`sort tile`);
        let tileRow = await knexConnector(tableName).where("relative_path", tile.relativePath);

        if (tileRow.length === 0) {
            let now = new Date();
            toInsert.push({
                relative_path: tile.relativePath,
                previous_stage_is_complete: tile.isComplete,
                current_stage_is_complete: tile.isComplete,
                created_at: now,
                updated_at: now
            });
        } else {
            //if ((tile.isComplete | 0) !== tileRow[0].previous_stage_is_complete) {
                toUpdate.push(tile);
            //}
        }

        resolve();
    }
}
