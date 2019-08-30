import {Connection, Channel} from "amqplib";

const debug = require("debug")("pipeline:api:worker-status-channel");

import {IWorkerHeartbeatCallback, IWorkerStatusQueue, IWorkerUpdateCallback, IWorkerUpdateData} from "../../messageQueue";

const WorkerStatusUpdateExchange = "WorkerStatusUpdateExchange";

const WorkerUpdateMessage = "WorkerUpdateMessage";
const WorkerHeartbeatMessage = "WorkerHeartbeatMessage";

export class WorkerStatusChannel implements IWorkerStatusQueue {
    private _connection: Connection = null;
    private channel: Channel = null;

    public async connect(connection: Connection): Promise<void> {
        try {
            this._connection = connection;

            this.channel = await this._connection.createChannel();

            this.channel.on("error", async (err) => {
                debug("channel error");
                debug(err);
            });

            this.channel.on("close", async (err) => {
                this._connection = null;
                debug("channel closed");
                debug(err);
            });

            await this.channel.assertExchange(WorkerStatusUpdateExchange, "direct", {durable: false});

            const queue = await this.channel.assertQueue("", {exclusive: true});

            await this.channel.bindQueue(queue.queue, WorkerStatusUpdateExchange, WorkerUpdateMessage);

            await this.channel.bindQueue(queue.queue, WorkerStatusUpdateExchange, WorkerHeartbeatMessage);

            await this.channel.consume(queue.queue, async (msg) => {
                try {
                    switch (msg.fields.routingKey) {
                        case WorkerUpdateMessage: {
                            if (this.UpdateCallback) {
                                const workerUpdate: IWorkerUpdateData = JSON.parse(msg.content.toString());
                                this.UpdateCallback(workerUpdate);
                            }
                            break;
                        }
                        case WorkerHeartbeatMessage: {
                            if (this.HeartbeatCallback) {
                                const workerHeartbeat = JSON.parse(msg.content.toString());
                                this.HeartbeatCallback(workerHeartbeat);
                            }
                            break;
                        }
                        default:
                            debug(`unknown message routing key: ${msg.fields.routingKey}`);
                    }
                } catch (err) {
                    debug(err);
                }
            }, {noAck: true});
        } catch (err) {
            this._connection = null;
            debug("failed to create worker status channel");
            debug(err);
        }
    }

    public UpdateCallback: IWorkerUpdateCallback;
    public HeartbeatCallback: IWorkerHeartbeatCallback;
}