import {IConfiguration} from "./configuration";

interface IPerformanceConfig {
    pipelineSchedulerIntervalSeconds: number;
    regenTileStatusSqliteChunkSize: number;
}

const configurations: IConfiguration<IPerformanceConfig> = {
    production: {
        pipelineSchedulerIntervalSeconds: 60,
        regenTileStatusSqliteChunkSize: 50
    }
};

export default function (): IPerformanceConfig {
    let env = process.env.NODE_ENV || "production";

    return configurations[env];
}
