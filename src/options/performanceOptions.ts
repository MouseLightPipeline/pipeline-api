interface IPerformanceOptions {
    pipelineSchedulerIntervalSeconds: number;
    regenTileStatusSqliteChunkSize: number;
}

interface IPerformanceEnvDefinitions {
    production: IPerformanceOptions;
}

const configurations: IPerformanceEnvDefinitions = {
    production: {
        pipelineSchedulerIntervalSeconds: 60,
        regenTileStatusSqliteChunkSize: 50
    }
};

export default function (): IPerformanceOptions {
    let env = process.env.NODE_ENV || "production";

    return configurations[env];
}
