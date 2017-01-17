import {PipelineMapScheduler} from "./pipelineMapScheduler";
import {PipelineStages} from "../data-model/pipelineStage";

const debug = require("debug")("mouselight:pipeline-api:pipeline-map-worker-process");

let stageId = process.argv.length > 2 ? process.argv[2] : null;

if (stageId) {
    debug("started pipeline map child process");

    startWorkerForProcess(stageId);
}

async function startWorkerForProcess(stageId) {
    let worker = await startPipelineStageWorker(stageId);

    process.on("message", msg => {
        if (msg && msg.isCancelRequest) {
            worker.IsProcessingRequested = true;
        }

        process.disconnect();
    });

    debug("completed pipeline map child process");
}

export async function startPipelineStageWorker(stageId) {
    let pipelineWorker = null;

    let pipelineStagesManager = new PipelineStages();

    let stage = await pipelineStagesManager.get(stageId);

    if (stage) {
        pipelineWorker = new PipelineMapScheduler(stage);

        pipelineWorker.run();
    }

    return pipelineWorker;
}