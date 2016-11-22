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

        client.on("heartBeat", heartbeatData => this.onHeartbeat(client, heartbeatData));

        client.on("disconnect", () => this.onDisconnect(client));
    }

    private onDisconnect(client) {
        debug("client disconnected");
    }

    private async onHeartbeat(client, heartbeatData) {
        // Update worker for last seen.
        let workerManager = new PipelineWorkers();

        let worker = await workerManager.getForMachineId(heartbeatData.machineId);

        worker.last_seen = new Date();

        await workerManager.save(worker);

        let status = PipelineWorkerStatus.Unavailable;

        switch (heartbeatData.runningTaskCount) {
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
