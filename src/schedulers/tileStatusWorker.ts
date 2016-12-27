import Timer = NodeJS.Timer;
const fs = require("fs-extra");
const path = require("path");

const debug = require("debug")("mouselight:pipeline-api:tile-status-worker");

import {IProject, Projects} from "../data-model/project";

const dashboardJsonFile = "dashboard.json";
const tileStatusJsonFile = "pipeline-storage.json";
const tileStatusLastJsonFile = tileStatusJsonFile + ".last";

import {
    connectorForFile, TileStatusPipelineStageId, generatePipelineStateDatabaseName, generatePipelineStageTableName
} from "../data-access/knexPiplineStageConnection";

import performanceConfiguration from "../../config/performance.config"
import {PipelineScheduler, DefaultPipelineIdKey, TilePipelineStatus} from "./pipelineScheduler";
const perfConf = performanceConfiguration();

interface IDashboardJsonTile {
    id: string;
    relativePath: string;
    tileName: string;
    isComplete: boolean;
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

            let knownOutput = await this.outputTable.select([DefaultPipelineIdKey, "previous_stage_status"]);

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

            let idx = knownOutputLookup.indexOf(inputTile.relativePath);

            let existingOutput = idx > -1 ? knownOutput[idx] : null;

            if (existingOutput) {
                let complete = inputTile.isComplete ? TilePipelineStatus.Complete : TilePipelineStatus.Incomplete;
                if (existingOutput.previous_stage_status !== complete) {
                    list.toUpdate.push({
                        previous_stage_status: complete,
                        current_stage_status: complete,
                        updated_at: new Date()
                    });
                }
            } else {
                let now = new Date();
                let complete = inputTile.isComplete ? TilePipelineStatus.Complete : TilePipelineStatus.Incomplete;
                list.toInsert.push({
                    relative_path: inputTile.relativePath,
                    tile_name: inputTile.tileName,
                    previous_stage_status: complete,
                    current_stage_status: complete,
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
                        relativePath: normalizedPath,
                        tileName: tileName,
                        isComplete: tile.isComplete
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
