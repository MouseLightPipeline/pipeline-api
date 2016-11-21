import Timer = NodeJS.Timer;
const fs = require("fs-extra");
const path = require("path");

const debug = require("debug")("mouselight:pipeline-api:map-dashboard-data");

import {IProject, Projects} from "../data-model/project";

const dashboardJsonFile = "dashboard.json";
const tileStatusJsonFile = "tileStatus.json";
const tileStatusLastJsonFile = tileStatusJsonFile + ".last";

import performanceConfiguration from "../../config/performance.config"

const perfConf = performanceConfiguration();

export class TileStatusFileWorker {
    private static _instance: TileStatusFileWorker = null;

    public static get Instance(): TileStatusFileWorker {
        if (!this._instance) {
            this._instance = new TileStatusFileWorker();
        }

        return this._instance;
    }

    private _intervalMap: Map<string, Timer> = new Map<string, Timer>();

    private constructor() {
    }

    public activateProject(project: IProject) {
        if (!this._intervalMap.has(project.id)) {
            let timeoutHandle = setInterval(() => this.refreshProject(project.id), perfConf.regenTileStatusJsonFileSeconds * 1000);
            this.refreshProject(project.id);
            this._intervalMap.set(project.id, timeoutHandle);
            debug(`activated project ${project.id}`)
        }
    }

    public deactivateProject(project: IProject) {
        if (this._intervalMap.has(project.id)) {
            clearInterval(this._intervalMap.get(project.id));
            this._intervalMap.delete(project.id);
            debug(`deactivated project ${project.id}`);
        }
    }

    private async refreshProject(id) {
        debug(`refresh project ${id}`);

        let projects = new Projects();

        let project: IProject = await projects.get(id);

        if (project) {
            this.updateTileStatusFile(project);
        }
    }

    private updateTileStatusFile(project: IProject) {
        let dataFile = path.join(project.root_path, dashboardJsonFile);

        if (!fs.existsSync(dataFile)) {
            debug(`there is no dashboard.json file in the project root path ${dataFile}`);
            return;
        }

        let outputFile = path.join(project.root_path, tileStatusJsonFile);

        let backupFile = path.join(project.root_path, tileStatusLastJsonFile);

        if (fs.existsSync(outputFile)) {
            debug(`backing up existing tile status file to ${tileStatusLastJsonFile}`);
            fs.copySync(outputFile, backupFile, {clobber: true});
        }

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
            debug(`removing existing tile status file ${outputFile}`);
            fs.unlinkSync(outputFile);
        }

        fs.outputJSONSync(outputFile, tiles);
        debug(`updated tile status file complete ${outputFile}`);
    }
}