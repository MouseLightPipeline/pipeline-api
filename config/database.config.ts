const path = require("path");
const fs = require("fs-extra");

import {IConfiguration} from "./configuration";

export const internalDataPath = path.join(process.cwd(), "internalData");

if (!fs.existsSync(internalDataPath)) {
    fs.mkdirSync(internalDataPath);
}

export interface IDatabaseConfig {
    client: string;
    connection: any;
    migrations: any;
    useNullAsDefault: boolean;
}

const configurations: IConfiguration<IDatabaseConfig> = {
    development: {
        client: "sqlite3",
        connection: {
            filename: path.join(internalDataPath, "system_data_dev.sqlite3")
        },
        useNullAsDefault: true,
        migrations: {
            tableName: "knex_migrations"
        }
    },
    test: {
        client: "sqlite3",
        connection: {
            filename: path.join(internalDataPath, "system_data_test.sqlite3")
        },
        useNullAsDefault: true,
        migrations: {
            tableName: "knex_migrations"
        }
    },
    production: {
        client: "sqlite3",
        connection: {
            filename: path.join(internalDataPath, "system_data.sqlite3")
        },
        useNullAsDefault: true,
        migrations: {
            tableName: "knex_migrations"
        }
    }
};

export default function () {
    let env = process.env.NODE_ENV || "development";

    return configurations[env];
}
