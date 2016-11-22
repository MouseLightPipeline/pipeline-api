import {connectorForFile, PipelineStageDatabaseFile} from "../data-access/knexPiplineStageConnection";
const fs = require("fs-extra");
const path = require("path");

import {IPipelineStage} from "../data-model/pipelineStage";

export class PipelineMapWorker {
    private _pipelineStage: IPipelineStage;
    private _rootDataFolder: string;
    private _databaseFile: string;
    private _knexConnector: any;

    public constructor(pipelineStage: IPipelineStage, rootDataFolder: string) {
        this._pipelineStage = pipelineStage;
        this._rootDataFolder = rootDataFolder;

        this.verifyDatabase();
    }

    private verifyDatabase() {
        if (!this._pipelineStage || !this._rootDataFolder) {
            return;
        }

        if (!fs.existsSync(this._rootDataFolder)) {
            fs.mkdirSync(this._rootDataFolder);
        }

        this._databaseFile = path.join(this._rootDataFolder, PipelineStageDatabaseFile);

        this._knexConnector = connectorForFile(this._databaseFile);

        this.verifyTables();
    }

    private verifyTables() {
        if (!this._knexConnector) {
            return;
        }

        if (!this._knexConnector.schema.hasTable("Tiles")) {
            this._knexConnector.schema.createTable("Tiles", (table) => {
                table.uuid("id").primary().unique();
                table.string("relativePath");
                table.boolean("last_stage_is_complete");
                table.boolean("is_complete");
                table.timestamp("last_seen");
                table.timestamp("deleted_at");
                table.timestamps();
            });
        }
    }
}