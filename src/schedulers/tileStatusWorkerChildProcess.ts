import {TileStatusWorker} from "./tileStatusWorker";
import {Projects} from "../data-model/project";

const debug = require("debug")("mouselight:pipeline-api:tile-status-worker-process");

let projectId = process.argv.length > 2 ? process.argv[2] : null;

if (projectId) {
    debug("started tile status child process");

    startWorkerForProcess(projectId);
}

async function startWorkerForProcess(projectId) {
    let worker = await startTileStatusFileWorker(projectId);

    process.on("message", m => {
        worker.send(m);
        process.disconnect();
    });

    debug("completed tile status child process");
}

export async function startTileStatusFileWorker(projectId: string) {
    let tileStatusWorker = null;

    let projectsManager = new Projects();

    let project = await projectsManager.get(projectId);

    if (project) {
        tileStatusWorker = new TileStatusWorker(project);

        tileStatusWorker.run();
    }

    return tileStatusWorker;
}