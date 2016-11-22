import Timer = NodeJS.Timer;
const path = require("path");
const child_process = require("child_process");

const debug = require("debug")("mouselight:pipeline-api:worker-manager");

import {TileStatusFileWorker} from "./tileStatusWorker";

export class WorkerManager {
    private static _instance: WorkerManager = null;

    public static Run(useChildProcessWorkers: boolean = false): WorkerManager {
        if (!this._instance) {
            this._instance = new WorkerManager(useChildProcessWorkers);
        }

        return this._instance;
    }

    private _useChildProcessWorkers: boolean;

    private constructor(useChildProcessWorkers: boolean = false) {
        this._useChildProcessWorkers = useChildProcessWorkers;

        if (this._useChildProcessWorkers) {
            debug("starting workers using child processes");
            this.startWorkerChildProcess("/tileStatusWorkerChildProcess.js");
        } else {
            debug("starting workers within parent process");
            TileStatusFileWorker.Run();
        }
    }

    private startWorkerChildProcess(moduleName: string) {
        // Options
        //   silent - pumps stdio back through this parent process
        //   execArv - remove possible $DEBUG flag on parent process causing address in use conflict
        let worker_process = child_process.fork(path.join(__dirname, moduleName), [], {silent: true, execArgv: []});

        worker_process.stdout.on("data", data => console.log(`${data.toString().slice(0, -1)}`));

        worker_process.stderr.on("data", data => console.log(`${data.toString().slice(0, -1)}`));

        worker_process.on("close", code => console.log(`child process exited with code ${code}`));
    }
}
