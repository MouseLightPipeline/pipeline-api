"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const configurations = {
    production: {
        pipelineSchedulerIntervalSeconds: 60,
        regenTileStatusSqliteChunkSize: 50
    }
};
function default_1() {
    let env = process.env.NODE_ENV || "production";
    return configurations[env];
}
exports.default = default_1;
//# sourceMappingURL=performance.config.js.map