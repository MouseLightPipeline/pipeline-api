const path = require("path");
const fs = require("fs-extra");

import {IConfiguration} from "./configuration";

export const internalDataPath = path.join(process.cwd(), "internal-data");

if (!fs.existsSync(internalDataPath)) {
    fs.mkdirSync(internalDataPath);
}

export interface IDatabaseConfig {
    client: string;
    connection: any;
    migrations: any;
    acquireConnectionTimeout: number
    useNullAsDefault: boolean;
}

const configurations: IConfiguration<IDatabaseConfig> = {
    production: {
        client: "sqlite3",
        connection: {
            filename: path.join(internalDataPath, "system-data.sqlite3")
        },
        acquireConnectionTimeout: 180000,
        useNullAsDefault: true,
        migrations: {
            directory: "knex-migrations",
            tableName: "knex_migrations"
        }
    }
};

function loadConfiguration () {
    return configurations["production"];
}

export const KnexDatabaseConfiguration = loadConfiguration();
