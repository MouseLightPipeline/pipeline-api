import {IConfiguration} from "./configuration";

interface IPerformanceConfig {
    regenTileStatusJsonFileSeconds: number;
}

const configurations: IConfiguration<IPerformanceConfig> = {
    development: {
        regenTileStatusJsonFileSeconds: 20
    },
    test: {
        regenTileStatusJsonFileSeconds: 20
    },
    production: {
        regenTileStatusJsonFileSeconds: 300
    }
};

export default function (): IPerformanceConfig {
    let env = process.env.NODE_ENV || "development";

    return configurations[env];
}
