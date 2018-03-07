
const sequelize = require("sequelize");
const asyncUtils = require("async");
import {Sequelize} from "sequelize";

const debug = require("debug")("pipeline:coordinator-api:project-database-connector");

import {SequelizeDatabaseOptions} from "../../options/serverOptions";
import {IProject} from "../../data-model/sequelize/project";
import {IPipelineStage} from "../../data-model/sequelize/pipelineStage";
import {StageTableConnector} from "./stageTableConnector";

interface IAccessQueueToken {
    project: IProject;
    resolve: any;
    reject: any;
}

export class ProjectDatabaseConnector {
    private _isConnected: boolean;
    private _connection: Sequelize;
    private _project: IProject;
    private _databaseName: string;

    private _stageConnectors = new Map<string, StageTableConnector>();

    public async initialize(project: IProject) {
        this._project = project;
        this._databaseName = this._project.id;

        await this.ensureDatabase();

        const databaseConfig = Object.assign({}, SequelizeDatabaseOptions, {
            database: this._databaseName
        });

        this._connection = new sequelize(databaseConfig.database, databaseConfig.username, databaseConfig.password, databaseConfig);

        await this._connection.authenticate();

        this._isConnected = true;
    }

    public get IsConnected(): boolean {
        return this._isConnected;
    }

    public async connectorForStage(stage: IPipelineStage | IProject): Promise<StageTableConnector> {
        if (!this._stageConnectors.has(stage.id)) {
            const connector = new StageTableConnector(this._connection, stage);

            await connector.initialize();

            this._stageConnectors.set(stage.id, connector);
        }

        return this._stageConnectors.get(stage.id);
    }

    private async ensureDatabase() {
        const databaseConfig = Object.assign({}, SequelizeDatabaseOptions, {
            database: "postgres"
        });

        const connection = new sequelize(databaseConfig.database, databaseConfig.username, databaseConfig.password, databaseConfig);

        const result = await connection.query(`SELECT 1 FROM pg_database WHERE datname = '${this._databaseName}';`);

        if (result.length < 2 || result[0].length < 1) {
            await connection.query(`CREATE DATABASE "${this._databaseName}"`)
        }
    }
}

const connectionMap = new Map<string, ProjectDatabaseConnector>();

const connectorQueueAccess = asyncUtils.queue(accessQueueWorker, 1);

export async function connectorForProject(project: IProject): Promise<ProjectDatabaseConnector> {
    if (connectionMap.has(project.id)) {
        return connectionMap.get(project.id);
    }

    // Serialize access to queue for a non-existent connector so only one is created.
    return new Promise<ProjectDatabaseConnector>((resolve, reject) => {
        connectorQueueAccess.push({
            project,
            resolve,
            reject
        });
    });
}

async function accessQueueWorker(token: IAccessQueueToken, completeCallback) {
    try {
        // This function has serialized access through AsyncQueue.  If it is the first one in the pipeline through before
        // the connector is created it can create it knowing no other call will also.  If you find yourself here and the
        // connection has been created, you were not first in the queue.
        if (!connectionMap.has(token.project.id)) {
            debug(`creating connector for ${token.project.name} (${token.project.id})`);

            const connector = new ProjectDatabaseConnector();

            await connector.initialize(token.project);

            debug(`successful database connection: ${token.project.id}`);

            connectionMap.set(token.project.id, connector);
        }

        token.resolve(connectionMap.get(token.project.id));
    } catch (err) {
        debug(`failed database connection: ${token.project.id}`);
        debug(err);
        token.reject(err);
    }

    completeCallback();
}
