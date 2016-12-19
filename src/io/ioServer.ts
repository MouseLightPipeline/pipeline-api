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

        client.on("hostInformation", hostInformation => this.onHostInformation(client, hostInformation));

        client.on("heartBeat", heartbeatData => this.onHeartbeat(client, heartbeatData));

        client.on("disconnect", () => this.onDisconnect(client));
    }

    private onDisconnect(client) {
        debug("client disconnected");
    }

    private async onHostInformation(client, hostInformation) {
        // Update worker for last seen.
        let workerManager = new PipelineWorkers();

        let worker = await workerManager.getForMachineId(hostInformation.machineId);

        worker.name = hostInformation.name;
        worker.os_type = hostInformation.osType;
        worker.platform = hostInformation.platform;
        worker.arch = hostInformation.arch;
        worker.release = hostInformation.release;
        worker.cpu_count = hostInformation.cpuCount;
        worker.total_memory = hostInformation.totalMemory;
        worker.free_memory = hostInformation.freeMemory;
        worker.load_average = hostInformation.loadAverage[0];
        worker.work_unit_capacity = hostInformation.workUnitCapacity;
        worker.last_seen = new Date();

        await workerManager.save(worker);
    }

    private async onHeartbeat(client, heartbeatData) {
        // Update worker for last seen.
        let workerManager = new PipelineWorkers();

        let worker = await workerManager.getForMachineId(heartbeatData.machineId);

        worker.last_seen = new Date();

        worker = await workerManager.save(worker);

        debug(`heartbeat task load ${heartbeatData.taskLoad}`);
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
