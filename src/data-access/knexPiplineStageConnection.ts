const path = require("path");

import * as Knex from "knex";

const asyncUtils = require("async");

const debug = require("debug")("mouselight:pipeline-api:knex-pipeline-connector");

import {IDatabaseConfig} from "../../config/database.config";

const PipelineStageDatabaseFile = "pipeline-storage.sqlite3";

export function generatePipelineStageTableName(pipelineStageId: string) {
    return `PipelineStage_${pipelineStageId.replace("-", "")}`;
}

export function generatePipelineStateDatabaseName(pipelineOutputPath) {
    return path.join(pipelineOutputPath, PipelineStageDatabaseFile);
}

export function generateProjectRootTableName(projectId: string) {
    return `PipelineProject_${projectId.replace("-", "")}_TileStatus`;
}

export function generatePipelineCustomTableName(pipelineStageId: string, tableName) {
    return generatePipelineStageTableName(pipelineStageId) + "_" + tableName;
}

export function generatePipelineStageInProcessTableName(pipelineStageId: string) {
    return generatePipelineCustomTableName(pipelineStageId, "InProcess");
}

export function generatePipelineStageToProcessTableName(pipelineStageId: string) {
    return generatePipelineCustomTableName(pipelineStageId, "ToProcess");
}

interface IConnectorQueueToken {
    filename: string;
    requiredTables: string[];
    resolve: any;
    reject: any;
}

interface IAccessQueueToken {
    filename: string;
    resolve: any;
    reject: any;
}

async function accessConnectorWorker(token: IConnectorQueueToken, completeCallback) {
    try {
        let requiredTable: string = token.requiredTables.length > 0 ? token.requiredTables[0] : null;

        debug(`\tcalling original connector function for ${token.filename}`);

        let connector = await findConnection(token.filename, requiredTable);

        debug(`\tresolving connector for ${token.filename}`);

        token.resolve(connector);
    } catch (err) {
        token.reject(err);
    }

    completeCallback();
}

let connectorQueues = new Map<string, AsyncQueue<IConnectorQueueToken>>();

function accessQueueWorker(token: IAccessQueueToken, completeCallback) {

    let queue = null;

    if (connectorQueues.has(token.filename)) {
        queue = connectorQueues.get(token.filename);
    }

    if (!queue) {
        queue = asyncUtils.queue(accessConnectorWorker, 1);
        connectorQueues.set(token.filename, queue);
    }

    debug(`\tresolving queue for ${token.filename}`);

    token.resolve(queue);

    completeCallback();
}

let connectorQueueAccess = asyncUtils.queue(accessQueueWorker, 1);

export async function connectorForFile(name: string, requiredTable: string = null) {
    debug(`requesting connector for ${name}`);

    if (requiredTable) {
        debug(`\twith required table ${requiredTable}`);
    }

    // Serialize access to queue for a particular connector so only one is created.

    let queue = await new Promise<AsyncQueue<IConnectorQueueToken>>((resolve, reject) => {
        connectorQueueAccess.push({
            filename: name,
            resolve: resolve,
            reject: reject
        });
    });

    // Serialize access to a connector so that only one is created and required tables are created once.

    return new Promise<Knex>((resolve, reject) => {
        queue.push({
            filename: name,
            requiredTables: [requiredTable],
            resolve: resolve,
            reject: reject,
        });
    });
}

let connectionMap = new Map<string, Knex>();

async function findConnection(name: string, requiredTable: string = null): Promise<Knex> {
    let connection: Knex = null;

    if (connectionMap.has(name)) {
        debug(`\treturning existing connection for ${name}`);
        connection = connectionMap.get(name);
    } else {
        debug(`\tcreating connection for ${name}`);

        connection = await createConnection(name, requiredTable);
    }

    if (requiredTable) {
        await verifyTable(connection, requiredTable, (table) => {
            table.string("relative_path").primary().unique();
            table.string("tile_name");
            table.int("prev_stage_status");
            table.int("this_stage_status");
            table.float("x");
            table.float("y");
            table.float("z");
            table.float("lat_x");
            table.float("lat_y");
            table.float("lat_z");
            table.float("cut_offset");
            table.float("z_offset");
            table.float("delta_z");
            table.timestamp("deleted_at");
            table.timestamps();
        });
    }

    return connection;
}

export async function verifyTable(connection, tableName: string, createFunction) {
    debug(`verifying required table ${tableName}`);

    let test = await connection.schema.hasTable(tableName);

    if (!test) {
        debug(`\tcreating required table ${tableName}`);
        await connection.schema.createTableIfNotExists(tableName, createFunction);
    }
}

async function createConnection(name: string, requiredTable: string): Promise<Knex> {
    const configuration: IDatabaseConfig = {
        client: "sqlite3",
        connection: {
            filename: name
        },
        acquireConnectionTimeout: 180000,
        useNullAsDefault: true,
        migrations: {
            directory: "src/data-access/migrations",
            tableName: "knex_migrations"
        }
    };

    let knex = Knex(configuration);

    try {
        await knex.migrate.latest(configuration);
    } catch (err) {
        debug("\t\tretrying connector acquisition in 2 seconds");
        return new Promise<Knex>((resolve) => {
            setTimeout(async() => {
                let connector = await createConnection(name, requiredTable);
                resolve(connector);
            }, 2000);
        })
    }

    connectionMap.set(name, knex);

    return knex;
}
