import * as socket_io from "socket.io";
import * as http from "http";
import {PersistentStorageManager} from "../data-access/sequelize/databaseConnector";
import {IPipelineWorker, PipelineWorkerStatus} from "../data-model/sequelize/pipelineWorker";

const debug = require("debug")("mouselight:pipeline-api:socket.io");

export class SocketIoServer {
    private static _ioServer = null;

    private _httpServer;

    public static use(app) {
        this._ioServer = new SocketIoServer(app);

        return this._ioServer._httpServer;
    }

    private constructor(app) {
        this._httpServer = http.createServer(app);

        let io = socket_io(this._httpServer);

        io.on("connection", client => this.onConnect(client));

        debug("interface listening for clients");
    }

    private onConnect(client) {
        debug("accepted client connection");

        client.on("workerApiService", workerInformation => this.onWorkerApiService(client, workerInformation));

        client.on("heartBeat", heartbeatData => this.onHeartbeat(client, heartbeatData));

        client.on("disconnect", () => this.onDisconnect(client));
    }

    private onDisconnect(client) {
        debug("client disconnected");
    }

    private async onWorkerApiService(client, workerInformation) {
        // Update worker for last seen.

        let row = await PersistentStorageManager.Instance().PipelineWorkers.getForMachineId(workerInformation.worker.id);

        const worker: IPipelineWorker = {};

        worker.machine_id = workerInformation.worker.id;
        worker.work_unit_capacity = workerInformation.worker.work_capacity;
        worker.is_cluster_proxy = workerInformation.worker.is_cluster_proxy;
        // worker.is_accepting_jobs = workerInformation.worker.is_accepting_jobs;
        worker.name = workerInformation.service.name;
        worker.address = workerInformation.service.networkAddress;
        worker.port = parseInt(workerInformation.service.networkPort);
        worker.os_type = workerInformation.service.machineProperties.osType;
        worker.platform = workerInformation.service.machineProperties.platform;
        worker.arch = workerInformation.service.machineProperties.arch;
        worker.release = workerInformation.service.machineProperties.release;
        worker.cpu_count = workerInformation.service.machineProperties.cpuCount;
        worker.total_memory = workerInformation.service.machineProperties.totalMemory;
        worker.last_seen = new Date();

        await row.update(worker);
    }

    private async onHeartbeat(client, heartbeatData) {
        // Update worker for last seen.

        let row = await PersistentStorageManager.Instance().PipelineWorkers.getForMachineId(heartbeatData.worker.id);

        const worker: IPipelineWorker = {};

        worker.is_cluster_proxy = heartbeatData.worker.is_cluster_proxy;
        worker.work_unit_capacity = heartbeatData.worker.work_capacity;
        worker.last_seen = new Date();
        worker.task_load = heartbeatData.taskLoad;

        await row.update(worker);

        let status = PipelineWorkerStatus.Unavailable;

        switch (heartbeatData.taskLoad) {
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
    }
}
