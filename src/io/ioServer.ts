import * as socket_io from "socket.io";
import * as http from "http";

const debug = require("debug")("mouselight:pipeline-api:socket.io");

import {PipelineWorkers, PipelineWorkerStatus} from "../data-model/pipelineWorker";

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
        let workerManager = new PipelineWorkers();

        let worker = await workerManager.getForMachineId(workerInformation.machineId);

        worker.machine_id = workerInformation.machineId;
        worker.name = workerInformation.name;
        worker.address = workerInformation.networkAddress;
        worker.port = parseInt(workerInformation.networkPort);
        worker.work_unit_capacity = workerInformation.workUnitCapacity;
        worker.os_type = workerInformation.machineProperties.osType;
        worker.platform = workerInformation.machineProperties.platform;
        worker.arch = workerInformation.machineProperties.arch;
        worker.release = workerInformation.machineProperties.release;
        worker.cpu_count = workerInformation.machineProperties.cpuCount;
        worker.total_memory = workerInformation.machineProperties.totalMemory;
        worker.free_memory = workerInformation.machineProperties.freeMemory;
        worker.load_average = workerInformation.machineProperties.loadAverage[0];
        worker.is_cluster_proxy = workerInformation.isClusterProxy;
        worker.last_seen = new Date();

        await workerManager.save(worker);
    }

    private async onHeartbeat(client, heartbeatData) {
        // Update worker for last seen.
        let workerManager = new PipelineWorkers();

        let worker = await workerManager.getForMachineId(heartbeatData.machineId);

        worker.last_seen = new Date();

        worker = await workerManager.save(worker);

        PipelineWorkers.setWorkerTaskLoad(worker.id, heartbeatData.taskLoad);

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
        PipelineWorkers.setWorkerStatus(worker.id, status);
    }
}
