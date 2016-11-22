import * as Knex from "knex";

import {IDatabaseConfig} from "../../config/database.config";

let connectionMap = new Map<string, any>();

export const PipelineStageDatabaseFile = "pipeline-storage.sqlite3";

export async function connectorForFile(name: string) {
    if (connectionMap.has(name)) {
        return connectionMap.get(name);
    }

    const configuration: IDatabaseConfig = {
        client: "sqlite3",
        connection: {
            filename: name
        },
        useNullAsDefault: true,
        migrations: {
            directory: "src/workers/migrations",
            tableName: "knex_migrations"
        }
    };

    let knex = Knex(configuration);

    await knex.migrate.latest(configuration);

    connectionMap.set(name, knex);

    return knex;
}
