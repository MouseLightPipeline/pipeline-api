const path = require("path");

const debug = require("debug")("mouselight:pipeline-api:knex-pipeline-connector");

import * as Knex from "knex";

import {IDatabaseConfig} from "../../config/database.config";

const PipelineStageDatabaseFile = "pipeline-storage.sqlite3";

export const TileStatusPipelineStageId = "TileStatus";

export function generatePipelineStateDatabaseName(pipelineOutputPath) {
    return path.join(pipelineOutputPath, PipelineStageDatabaseFile);
}

export function generatePipelineStageTableName(pipelineStageId: string) {
    return `PipelineStage_${pipelineStageId.replace("-", "")}`;
}

export function generatePipelineStageInProcessTableName(pipelineStageId: string) {
    return generatePipelineStageTableName(pipelineStageId) + "_InProcess";
}

export function generatePipelineStageToProcessTableName(pipelineStageId: string) {
    return generatePipelineStageTableName(pipelineStageId) + "_ToProcess";
}

let connectionMap = new Map<string, any>();

let creationInProcess = new Map<string, string>();

export async function connectorForFile(name: string, requiredTable: string = null) {
    if (connectionMap.has(name)) {
        return connectionMap.get(name);
    }

    // If already creating connection, start a promise chain that should ultimately resolve when the creation process
    // completes.  knex.migrate locks the migration table and multiple attempts to ensure the database file is up to
    // date will conflict.
    if (creationInProcess.has(name)) {
        return new Promise((resolve) => {
            setTimeout(async() => {
                let connector = await connectorForFile(name, requiredTable);
                resolve(connector);
            }, 2000);
        })
    }

    creationInProcess.set(name, name);

    let knex = await create(name, requiredTable);

    creationInProcess.delete(name);

    return knex;
}

export async function verifyTable(connection, tableName: string, createFunction) {
    let test = await connection.schema.hasTable(tableName);

    if (!test) {
        await connection.schema.createTableIfNotExists(tableName, createFunction);
    }
}

async function create(name: string, requiredTable: string) {
    const configuration: IDatabaseConfig = {
        client: "sqlite3",
        connection: {
            filename: name
        },
        useNullAsDefault: true,
        migrations: {
            directory: "src/data-access/migrations",
            tableName: "knex_migrations"
        }
    };

    let knex = Knex(configuration);

    try {
        await knex.migrate.latest(configuration);

        if (requiredTable) {
            /*
             let test = await knex.schema.hasTable(requiredTable);

             if (!test) {
             await knex.schema.createTableIfNotExists(requiredTable, (table) => {
             table.string("relative_path").primary().unique();
             table.string("tile_name");
             table.boolean("previous_stage_is_complete");
             table.boolean("current_stage_is_complete");
             table.timestamp("deleted_at");
             table.timestamps();
             });
             }
             */
            await verifyTable(knex, requiredTable, (table) => {
                table.string("relative_path").primary().unique();
                table.string("tile_name");
                table.int("previous_stage_status");
                table.int("current_stage_status");
                table.timestamp("deleted_at");
                table.timestamps();
            });
        }
    } catch (err) {
        debug("retrying connector acquisition in 2 seconds");
        return new Promise((resolve) => {
            setTimeout(async() => {
                let connector = await create(name, requiredTable);
                resolve(connector);
            }, 2000);
        })
    }

    connectionMap.set(name, knex);

    return knex;
}
