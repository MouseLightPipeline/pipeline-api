import {IProject} from "../../data-model/sequelize/project";

const Sequelize = require("sequelize");

const asyncUtils = require("async");

const debug = require("debug")("pipeline:coordinator-api:knex-pipeline-connector");

import {SequelizeDatabaseOptions} from "../../options/serverOptions";

function generateProjectDatabaseName(projectId: string) {
    return projectId;
}

function generatePipelineStageTableName(pipelineStageId: string) {
    return pipelineStageId;
}

function generatePipelineCustomTableName(pipelineStageId: string, tableName) {
    return generatePipelineStageTableName(pipelineStageId) + "_" + tableName;
}

function generatePipelineStageInProcessTableName(pipelineStageId: string) {
    return generatePipelineCustomTableName(pipelineStageId, "InProcess");
}

function generatePipelineStageToProcessTableName(pipelineStageId: string) {
    return generatePipelineCustomTableName(pipelineStageId, "ToProcess");
}


interface IAccessQueueToken {
    project: IProject;
    resolve: any;
    reject: any;
}

export class ProjectDatabaseConnector {
    public connection: any;
    public isConnected: boolean;

    private _tileTables = new Map<string, any>();
    private _toProcessTables = new Map<string, any>();
    private _inProcessTables = new Map<string, any>();

    private _databaseName: string;

    public async initialize(project: IProject) {
        let databaseConfig = Object.assign({}, SequelizeDatabaseOptions, {
            database: "postgres"
        });

        this._databaseName = generateProjectDatabaseName(project.id);

        const connection = new Sequelize(databaseConfig.database, databaseConfig.username, databaseConfig.password, databaseConfig);

        const result = await connection.query(`SELECT 1 FROM pg_database WHERE datname = '${this._databaseName}';`);

        if (result.length < 2 || result[0].length < 1) {
            await connection.query(`CREATE DATABASE "${this._databaseName}"`)
        }

        databaseConfig = Object.assign({}, SequelizeDatabaseOptions, {
            database: this._databaseName
        });

        this.connection = new Sequelize(databaseConfig.database, databaseConfig.username, databaseConfig.password, databaseConfig);
    }

    public tileTable(id: string) {
        const name = generatePipelineStageTableName(id);

        if (!this._tileTables.has(name)) {
            this._tileTables.set(name, this.defineTileTable(name));

            this.connection.sync();
        }

        return this._tileTables.get(name);
    }

    public toProcessTable(id: string) {
        const name = generatePipelineStageToProcessTableName(id);

        if (!this._toProcessTables.has(name)) {
            this._toProcessTables.set(name, this.defineToProcessTable(name));

            this.connection.sync();
        }

        return this._toProcessTables.get(name);
    }

    public inProcessTable(id: string) {
        const name = generatePipelineStageInProcessTableName(id);

        if (!this._inProcessTables.has(name)) {
            this._inProcessTables.set(name, this.defineInProcessTable(name));

            this.connection.sync();
        }

        return this._inProcessTables.get(name);
    }

    private defineTileTable(name: string) {
        return this.connection.define(name, {
            relative_path: {
                primaryKey: true,
                unique: true,
                type: this.connection.Sequelize.DataTypes.TEXT
            },
            prev_stage_status: {
                type: this.connection.Sequelize.INTEGER,
                defaultValue: null
            },
            this_stage_status: {
                type: this.connection.Sequelize.INTEGER,
                defaultValue: null
            },
            lat_x: {
                type: this.connection.Sequelize.INTEGER,
                defaultValue: null
            },
            lat_y: {
                type: this.connection.Sequelize.INTEGER,
                defaultValue: null
            },
            lat_z: {
                type: this.connection.Sequelize.INTEGER,
                defaultValue: null
            },
            cpu_high: {
                type: this.connection.Sequelize.DOUBLE,
                defaultValue: 0
            },
            memory_high: {
                type: this.connection.Sequelize.DOUBLE,
                defaultValue: 0
            },
            user_data: {
                type: this.connection.Sequelize.JSON,
                defaultValue: 0
            }
        }, {
            timestamps: true,
            createdAt: "created_at",
            updatedAt: "updated_at",
            paranoid: false
        });
    }

    private defineToProcessTable(name: string) {
        return this.connection.define(name, {
            relative_path: {
                primaryKey: true,
                unique: true,
                type: this.connection.Sequelize.DataTypes.TEXT
            }
        }, {
            timestamps: true,
            createdAt: "created_at",
            updatedAt: "updated_at",
            paranoid: false
        });
    }

    private defineInProcessTable(name: string) {
        return this.connection.define(name, {
            relative_path: {
                primaryKey: true,
                unique: true,
                type: this.connection.Sequelize.DataTypes.TEXT
            },
            task_execution_id: {
                type: this.connection.Sequelize.UUID,
                defaultValue: null
            },
            worker_id: {
                type: this.connection.Sequelize.UUID,
                defaultValue: null
            },
            worker_last_seen: {
                type: this.connection.Sequelize.DATE,
                defaultValue: null
            }
        }, {
            timestamps: true,
            createdAt: "created_at",
            updatedAt: "updated_at",
            paranoid: false
        });
    }
}

const connectionMap = new Map<string, ProjectDatabaseConnector>();

const connectorQueueAccess = asyncUtils.queue(accessQueueWorker, 1);

export async function connectorForProject(project: IProject): Promise<ProjectDatabaseConnector> {
    debug(`requesting connector for ${project.name} ${project.id}`);

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
            const connector = new ProjectDatabaseConnector();

            await connector.initialize(token.project);

            await connector.connection.authenticate();

            connector.isConnected = true;

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

/*
async function findConnection(project: IProject): Promise<any> {

    if (connection) {
        await verifyTable(connection, requiredTable, (table) => {
            table.string("relative_path").primary().unique();
            table.int("prev_stage_status");
            table.int("this_stage_status");
            table.float("lat_x");
            table.float("lat_y");
            table.float("lat_z");
            table.float("duration");
            table.float("cpu_high");
            table.float("memory_high");
            table.timestamps();
            table.timestamp("deleted_at");
        });
    }

    return connection;
}
*/
