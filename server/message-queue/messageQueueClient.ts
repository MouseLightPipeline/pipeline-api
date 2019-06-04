import {PersistentStorageManager} from "../data-access/sequelize/databaseConnector";
import {IMessageQueueClient, IWorkerHeartbeatData, IWorkerUpdateData} from "./messageQueue";
import {RabbitMQMessageQueueClient} from "./rabbitmq/rabbitMQMessageQueueClient";

export class MessageQueueClient {
    public static async StartMessageQueueClient(storageManager: PersistentStorageManager) {
        const client = new MessageQueueClient(storageManager);
        await client.start();
    }

    private readonly _storageManager: PersistentStorageManager;
    private readonly _messageQueue: IMessageQueueClient;

    public constructor(storageManager: PersistentStorageManager) {
        this._storageManager = storageManager;

        this._messageQueue = new RabbitMQMessageQueueClient();
    }

    public async start(): Promise<void> {
        await this._messageQueue.connect();

        this._messageQueue.WorkerStatusQueue.UpdateCallback = (data: IWorkerUpdateData) => this.onWorkerStatus(data);

        this._messageQueue.WorkerStatusQueue.HeartbeatCallback = (data: IWorkerHeartbeatData) => this.onWorkerHeartbeat(data);
    }

    private async onWorkerStatus(data: IWorkerUpdateData) {
        await this._storageManager.PipelineWorkers.updateStatus((data));
    }
    private async onWorkerHeartbeat(data: IWorkerHeartbeatData) {
        await this._storageManager.PipelineWorkers.updateHeartbeat((data));
    }
}
