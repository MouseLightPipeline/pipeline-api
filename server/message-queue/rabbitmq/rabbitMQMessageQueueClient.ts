import * as amqp from "amqplib";
import {Connection} from "amqplib";

import {MessageQueueOptions} from "../../options/coreServicesOptions";
import {WorkerStatusChannel} from "./worker/workerStatusChannel";
import {IMessageQueueClient, IWorkerStatusQueue} from "../messageQueue";

const debug = require("debug")("pipeline:api:message-queue");

export class RabbitMQMessageQueueClient implements IMessageQueueClient {
    private _connectionUrl: string;
    private _connection: Connection = null;

    private _workerStatusExchange: WorkerStatusChannel = new WorkerStatusChannel();

    public get WorkerStatusQueue(): IWorkerStatusQueue {
        return this._workerStatusExchange;
    }

    public async connect() : Promise<void> {
        this._connectionUrl = `amqp://${MessageQueueOptions.host}:${MessageQueueOptions.port}`;

        return new Promise(async (resolve) => {
            await this.createConnection(resolve);
        });
    }

    private async createConnection(resolve): Promise<void> {
        try {
            this._connection = await amqp.connect(this._connectionUrl);

            this._connection.on("error", (err) => {
                // From amqp docs - closed with be called for error - no need for cleanup here.
                debug("connection error");
                debug(err);
            });

            this._connection.on("close", () => {
                debug("connection closed, retrying");

                this._connection = null;

                setInterval(() => this.createConnection(null), 5000);
            });

            await this._workerStatusExchange.connect(this._connection);

            debug(`main message queue ready ${this._connectionUrl}`);

            if (resolve !== null) {
                resolve(true);
            }
        } catch (err) {
            this._connection = null;

            debug("failed to establish connection, retrying");
            debug(err);

            setTimeout(async () => this.createConnection(resolve), 15 * 1000);
        }
    }
}
