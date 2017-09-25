const path = require("path");
const fse = require("fs-extra");

// TODO Move to Sequelize.  The pipeline schedulers are very dependent on the specific knex syntax and batch operations
// at the moment.
import * as Knex from "knex";

const asyncUtils = require("async");

const debug = require("debug")("pipeline:coordinator-api:knex-pipeline-connector");

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

const connectionMap = new Map<string, Knex>();

const connectorQueueAccess = asyncUtils.queue(accessQueueWorker, 1);

export async function connectorForFile(name: string, requiredTable: string = null) {
    debug(`requesting connector for ${name}`);

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

export async function verifyTable(connection, tableName: string, createFunction) {
    let test = await connection.schema.hasTable(tableName);

    if (!test) {
        await connection.schema.createTableIfNotExists(tableName, createFunction);
    }
}

async function accessConnectorWorker(token: IConnectorQueueToken, completeCallback) {
    try {
        let requiredTable: string = token.requiredTables.length > 0 ? token.requiredTables[0] : null;

        let connector = await findConnection(token.filename, requiredTable);

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

    token.resolve(queue);

    completeCallback();
}

async function findConnection(name: string, requiredTable: string = null): Promise<Knex> {
    let connection: Knex = null;

    if (connectionMap.has(name)) {
        connection = connectionMap.get(name);
    } else {
        connection = await createConnection(name, requiredTable);
    }

    if (connection && requiredTable) {
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
            table.float("duration");
            table.float("cpu_high");
            table.float("memory_high");
            table.timestamps();
            table.timestamp("deleted_at");
        });
    }

    return connection;
}

async function createConnection(filename: string, requiredTable: string): Promise<Knex> {

    const exists = fse.existsSync(filename);

    const configuration = {
        client: "sqlite3",
        connection: {
            filename: filename
        },
        acquireConnectionTimeout: 180000,
        useNullAsDefault: true,
        migrations: {
            directory: "src/data-access/migrations",
            tableName: "knex_migrations"
        }
    };

    const knex = Knex(configuration);

    try {
        await knex.migrate.latest(configuration.migrations);

        if (!exists) {
            fse.chmodSync(filename, 0o775)
        }
    } catch (err) {
        debug(err);
        return null;
    }

    connectionMap.set(filename, knex);

    return knex;
}
