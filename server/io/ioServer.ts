import * as socket_io from "socket.io";
import * as http from "http";
import {PersistentStorageManager} from "../data-access/sequelize/databaseConnector";
import {IPipelineWorker, PipelineWorkerStatus} from "../data-model/sequelize/pipelineWorker";
import {isNullOrUndefined} from "util";

const debug = require("debug")("pipeline:coordinator-api:socket.io");

interface IHeartbeatWorker {
    id: string;
    local_work_capacity: number;
    cluster_work_capacity: number;
}

interface IHeartbeatData {
    worker: IHeartbeatWorker;
    localTaskLoad: number;
    clusterTaskLoad: number;
}


export class SocketIoServer {
    private static _ioServer = null;

    public static use(app) {
        this._ioServer = new SocketIoServer(app);

        return this._ioServer._httpServer;
    }

    public static get Instance() {
        return this._ioServer;
    }

    private readonly _httpServer;
    private readonly _connectionMap = new Map<string, string>();

    private constructor(app) {
        this._httpServer = http.createServer(app);

        let io = socket_io(this._httpServer);

        io.on("connection", client => this.onConnect(client));

        debug("socket.io worker connection open");
    }

    private onConnect(client) {
        debug("accepted worker connection");

        client.on("workerApiService", workerInformation => this.onWorkerApiService(client, workerInformation));

        client.on("heartBeat", (heartbeatData: IHeartbeatData) => this.onHeartbeat(client, heartbeatData));

        client.on("disconnect", () => this.onDisconnect(client));
    }

    private onDisconnect(client) {
        debug(`worker ${this._connectionMap.get(client.id)} disconnected`);
    }

    private async onWorkerApiService(client, workerInformation) {
        if (isNullOrUndefined(workerInformation.worker)) {
            return;
        }

        this._connectionMap.set(client.id, workerInformation.worker.id);

        try {
            let row = await PersistentStorageManager.Instance().PipelineWorkers.getForWorkerId(workerInformation.worker.id);

            const worker: IPipelineWorker = {};

            worker.worker_id = workerInformation.worker.id;
            worker.local_work_capacity = workerInformation.worker.local_work_capacity;
            worker.cluster_work_capacity = workerInformation.worker.cluster_work_capacity;
            worker.name = workerInformation.service.name;
            worker.address = workerInformation.service.networkAddress;
            worker.port = parseInt(workerInformation.service.networkPort);
            worker.os_type = workerInformation.machine.osType;
            worker.platform = workerInformation.machine.platform;
            worker.arch = workerInformation.machine.arch;
            worker.release = workerInformation.machine.release;
            worker.cpu_count = workerInformation.machine.cpuCount;
            worker.total_memory = workerInformation.machine.totalMemory;
            worker.last_seen = new Date();

            await row.update(worker);
        } catch (err) {
            debug(err);
        }
    }

    private async onHeartbeat(client, heartbeatData: IHeartbeatData) {
        try {
            let row = await PersistentStorageManager.Instance().PipelineWorkers.getForWorkerId(heartbeatData.worker.id);

            if (!row) {
                return;
            }

            const worker: IPipelineWorker = {};

            worker.local_work_capacity = heartbeatData.worker.local_work_capacity;
            worker.cluster_work_capacity = heartbeatData.worker.cluster_work_capacity;
            worker.local_task_load = heartbeatData.localTaskLoad;
            worker.cluster_task_load = heartbeatData.clusterTaskLoad;
            worker.last_seen = new Date();

            await row.update(worker);

            let status = PipelineWorkerStatus.Unavailable;

            switch (Math.max(heartbeatData.localTaskLoad, heartbeatData.clusterTaskLoad)) {
                case -1:
                    status = PipelineWorkerStatus.Connected;
                    break;
                case 0:
                    status = PipelineWorkerStatus.Idle;
                    break;
                default:
                    status = PipelineWorkerStatus.Processing;
            }

            // Update non-persistent worker status
            await row.update({status});
        } catch (err) {
            debug(err);
        }
    }
}
