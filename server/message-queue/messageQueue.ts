export interface IWorkerUpdateData {
    worker: {
        id: string;
        local_work_capacity: number;
        cluster_work_capacity: number;
    };
    service: {
        name: string;
        networkAddress: string;
        networkPort: string;
    };
    machine: {
        osType: string;
        platform: string;
        arch: string;
        release: string;
        cpuCount: number;
        totalMemory: number;
    };
}

export interface IWorkerHeartbeatData {
    worker: {
        id: string;
        local_work_capacity: number;
        cluster_work_capacity: number;
    };
    localTaskLoad: number;
    clusterTaskLoad: number;
}

export interface IWorkerUpdateCallback {
    (data: IWorkerUpdateData): void;
}

export interface IWorkerHeartbeatCallback {
    (data: IWorkerHeartbeatData): void;
}

export interface IWorkerStatusQueue {
    UpdateCallback: IWorkerUpdateCallback;
    HeartbeatCallback: IWorkerHeartbeatCallback;
}

export interface IMessageQueueClient {
    connect(): Promise<void>;

    WorkerStatusQueue: IWorkerStatusQueue;
}