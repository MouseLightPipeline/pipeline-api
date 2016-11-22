import * as Knex from "knex";

import {IDatabaseConfig} from "../../config/database.config";

export function connectorForFile(name: string) {
    const configuration: IDatabaseConfig = {
        client: "sqlite3",
        connection: {
            filename: name
        },
        useNullAsDefault: true,
        migrations: {
            tableName: "knex_migrations"
        }
    };

    return Knex(configuration);
}
