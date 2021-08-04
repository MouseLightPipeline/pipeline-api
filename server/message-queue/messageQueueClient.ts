import {IMessageQueueClient, IWorkerHeartbeatData, IWorkerUpdateData} from "./messageQueue";
import {RabbitMQMessageQueueClient} from "./rabbitmq/rabbitMQMessageQueueClient";
import {PipelineWorker} from "../data-model/system/pipelineWorker";

export class MessageQueueClient {
    public static async Start() {
        const client = new MessageQueueClient();
        await client.start();
    }

    private readonly _messageQueue: IMessageQueueClient;

    public constructor() {
        this._messageQueue = new RabbitMQMessageQueueClient();
    }

    public async start(): Promise<void> {
        await this._messageQueue.connect();

        this._messageQueue.WorkerStatusQueue.UpdateCallback = (data: IWorkerUpdateData) => MessageQueueClient.onWorkerStatus(data);

        this._messageQueue.WorkerStatusQueue.HeartbeatCallback = (data: IWorkerHeartbeatData) => MessageQueueClient.onWorkerHeartbeat(data);
    }

    private static async onWorkerStatus(data: IWorkerUpdateData) {
        await PipelineWorker.updateStatus((data));
    }

    private static async onWorkerHeartbeat(data: IWorkerHeartbeatData) {
        await PipelineWorker.updateHeartbeat((data));
    }
}
