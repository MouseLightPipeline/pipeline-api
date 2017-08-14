import {PipelineZComparisonScheduler} from "./pipelineZComparisonScheduler";
import {PersistentStorageManager} from "../data-access/sequelize/databaseConnector";

const debug = require("debug")("pipeline:coordinator-api:pipeline-z-comparison-worker-process");

let stageId = process.argv.length > 2 ? process.argv[2] : null;

if (stageId) {
    debug("started pipeline z comparison child process");

    startWorkerForProcess(stageId).then(() => {
        debug(`started pipeline z comparison child process for stage ${stageId}`);
    }).catch(err => {
        debug(`failed to start pipeline z comparison stage for ${stageId}: ${err}`);
    });
}

async function startWorkerForProcess(stageId) {
    let worker = await startZComparisonPipelineStageWorker(stageId);

    process.on("message", msg => {
        if (msg && msg.isCancelRequest) {
            worker.IsProcessingRequested = true;
        }

        process.disconnect();
    });

    debug("completed pipeline z comparison child process");
}

export async function startZComparisonPipelineStageWorker(stageId) {
    let pipelineWorker = null;

    try {
        let pipelineStagesManager = PersistentStorageManager.Instance().PipelineStages;

        let stage = await pipelineStagesManager.findById(stageId);

        if (stage) {
            pipelineWorker = new PipelineZComparisonScheduler(stage);

            pipelineWorker.run();
        }
    } catch (err) {
        debug(err);
    }

    return pipelineWorker;
}