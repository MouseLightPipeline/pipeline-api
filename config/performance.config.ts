import {IConfiguration} from "./configuration";

interface IPerformanceConfig {
    pipelineSchedulerIntervalSeconds: number;
    regenTileStatusSqliteChunkSize: number;
}

const configurations: IConfiguration<IPerformanceConfig> = {
    development: {
        pipelineSchedulerIntervalSeconds: 60,
        regenTileStatusSqliteChunkSize: 50
    },
    test: {
        pipelineSchedulerIntervalSeconds: 60,
        regenTileStatusSqliteChunkSize: 50
    },
    staging: {
        pipelineSchedulerIntervalSeconds: 60,
        regenTileStatusSqliteChunkSize: 50
    },
    production: {
        pipelineSchedulerIntervalSeconds: 60,
        regenTileStatusSqliteChunkSize: 50
    }
};

export default function (): IPerformanceConfig {
    let env = process.env.NODE_ENV || "development";

    return configurations[env];
}
