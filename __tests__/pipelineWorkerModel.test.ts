import {copyDatabase, DefaultPipelineWorkerId, DefaultPipelineWorkerRemoteId, removeDatabase} from "./testUtil";

import {PipelineWorker, PipelineWorkerStatus} from "../server/data-model/system/pipelineWorker";
import {IWorkerHeartbeatData} from "../server/message-queue/messageQueue";

test("data-access:pipeline-worker:update", async () => {
    const worker = await PipelineWorker.findByPk(DefaultPipelineWorkerId);

    // All possible props
    const output = await PipelineWorker.updateWorker({
        id: worker.id,
        name: "name-data",
        local_work_capacity: 4,
        cluster_work_capacity: 8,
        is_in_scheduler_pool: true
    }, false);

    expect(output.error).toBeNull();

    await worker.reload();

    expect(worker.name).toBe("name-data");
    expect(worker.local_work_capacity).toBe(4);
    expect(worker.cluster_work_capacity).toBe(8);
    expect(worker.is_in_scheduler_pool).toBe(true);

    // Subset of props
    await PipelineWorker.updateWorker({
        id: worker.id,
        name: "name-data-2",
    }, false);

    await worker.reload();

    expect(worker.name).toBe("name-data-2");
    expect(worker.local_work_capacity).toBe(4);
    expect(worker.cluster_work_capacity).toBe(8);
    expect(worker.is_in_scheduler_pool).toBe(true);
});

test("data-access:pipeline-worker:dynamic-props", async () => {
    let worker = await PipelineWorker.findByPk(DefaultPipelineWorkerId);

    expect(worker.status).toBe(PipelineWorkerStatus.Unavailable);
    expect(worker.local_task_load).toBe(-1);
    expect(worker.cluster_task_load).toBe(-1);

    worker.status = PipelineWorkerStatus.Connected;
    worker.local_task_load = 6;
    worker.cluster_task_load = 12;

    worker = await PipelineWorker.findByPk(DefaultPipelineWorkerId);

    expect(worker.status).toBe(PipelineWorkerStatus.Connected);
    expect(worker.local_task_load).toBe(6);
    expect(worker.cluster_task_load).toBe(12);
});

test("data-access:pipeline-worker:status-update", async () => {
});

test("data-access:pipeline-worker:heartbeat-update", async () => {
    const heartbeatData: IWorkerHeartbeatData = {
        worker: {
            id: DefaultPipelineWorkerRemoteId,
            local_work_capacity: 16,
            cluster_work_capacity: 32
        },
        localTaskLoad: -1,
        clusterTaskLoad: -1
    };

    await PipelineWorker.updateHeartbeat(heartbeatData);

    // Connected
    const worker = await PipelineWorker.findByPk(DefaultPipelineWorkerId);
    expect(worker.status).toBe(PipelineWorkerStatus.Connected);
    expect(worker.local_task_load).toBe(-1);
    expect(worker.cluster_task_load).toBe(-1);
    expect(worker.local_work_capacity).toBe(16);
    expect(worker.cluster_work_capacity).toBe(32);

    // Idle
    heartbeatData.localTaskLoad = 0;
    heartbeatData.clusterTaskLoad = 0;
    await PipelineWorker.updateHeartbeat(heartbeatData);
    ;
    expect(worker.status).toBe(PipelineWorkerStatus.Idle);
    expect(worker.local_task_load).toBe(0);
    expect(worker.cluster_task_load).toBe(0);

    // Processing
    heartbeatData.localTaskLoad = 1;
    heartbeatData.clusterTaskLoad = 2;
    await PipelineWorker.updateHeartbeat(heartbeatData);

    expect(worker.status).toBe(PipelineWorkerStatus.Processing);
    expect(worker.local_task_load).toBe(1);
    expect(worker.cluster_task_load).toBe(2);
});

let tempDatabaseName = "";

beforeAll(async () => {
    tempDatabaseName = await copyDatabase();
});

afterAll(() => {
    removeDatabase(tempDatabaseName);
});
