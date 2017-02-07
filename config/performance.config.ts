import {IConfiguration} from "./configuration";

interface IPerformanceConfig {
    regenTileStatusJsonFileSeconds: number;
    regenTileStatusSqliteChunkSize: number;
}

const configurations: IConfiguration<IPerformanceConfig> = {
    development: {
        regenTileStatusJsonFileSeconds: 10,
        regenTileStatusSqliteChunkSize: 50
    },
    test: {
        regenTileStatusJsonFileSeconds: 10,
        regenTileStatusSqliteChunkSize: 50
    },
    staging: {
        regenTileStatusJsonFileSeconds: 10,
        regenTileStatusSqliteChunkSize: 50
    },
    production: {
        regenTileStatusJsonFileSeconds: 10,
        regenTileStatusSqliteChunkSize: 50
    }
};

export default function (): IPerformanceConfig {
    let env = process.env.NODE_ENV || "development";

    return configurations[env];
}
