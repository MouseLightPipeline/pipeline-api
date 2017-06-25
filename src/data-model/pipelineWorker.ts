import * as uuid from "uuid";

const debug = require("debug")("mouselight:pipeline-api:worker");

import {TableModel, ITableModelRow} from "./tableModel";
import {knex} from "../data-access/knexConnector";

export enum PipelineWorkerStatus {
    Unavailable = 0,
    Connected,
    Idle,
    Processing
}

export interface IPipelineWorker extends ITableModelRow {
    machine_id: string;
    name: string;
    address: string;
    port: number;
    os_type: string;
    platform: string;
    arch: string;
    release: string;
    cpu_count: number;
    total_memory: number;
    free_memory: number;
    load_average: number;
    work_unit_capacity: number;
    last_seen: Date;
    status?: PipelineWorkerStatus;
    is_in_scheduler_pool: boolean;
    is_cluster_proxy: boolean;
    task_load?: number;
}

export class PipelineWorkers extends TableModel<IPipelineWorker> {
    private static _workerStatusMap = new Map<string, PipelineWorkerStatus>();
    private static _workerTaskLoadMap = new Map<string, number>();

    public constructor() {
        super("PipelineWorker");
    }

    public static getWorkerStatus(id: string): PipelineWorkerStatus {
        let status = PipelineWorkers._workerStatusMap[id];

        if (!status) {
            status = PipelineWorkerStatus.Unavailable;
            PipelineWorkers._workerStatusMap[id] = status;
        }

        return status;
    }

    public static getWorkerTaskLoad(id: string): number {
        let count = PipelineWorkers._workerTaskLoadMap[id];

        if (count == null) {
            count = -1;
            PipelineWorkers._workerTaskLoadMap[id] = count;
        }

        return count;
    }

    public static setWorkerStatus(id: string, status: PipelineWorkerStatus) {
        PipelineWorkers._workerStatusMap[id] = status;
    }

    public static setWorkerTaskLoad(id: string, count: number) {
        PipelineWorkers._workerTaskLoadMap[id] = count;
    }

    public async setShouldBeInSchedulerPool(id: string, shouldBeInSchedulerPool: boolean): Promise<IPipelineWorker> {
        let worker = await this.get(id);

        if (worker && (worker.is_in_scheduler_pool !== shouldBeInSchedulerPool)) {
            worker.is_in_scheduler_pool = shouldBeInSchedulerPool;
            await this.save(worker);
        }

        return worker;
    }

    public async getForMachineId(machineId: string): Promise<IPipelineWorker> {
        let rows = await knex(this.tableName).where("machine_id", machineId);

        let worker = null;

        if (rows.length > 0) {
            worker = rows[0];
        } else {
            worker = await this.create(machineId)
        }

        return worker;
    }

    protected willSaveRow(row: IPipelineWorker): IPipelineWorker {
        if (row.hasOwnProperty("status")) {
            delete row["status"];
        }

        if (row.hasOwnProperty("task_load")) {
            delete row["task_load"];
        }

        return row;
    }

    protected didFetchRow(row: IPipelineWorker): IPipelineWorker {

        row["status"] = PipelineWorkers.getWorkerStatus(row.id);

        row["task_load"] = PipelineWorkers.getWorkerTaskLoad(row.id);

        return row;
    }

    private async create(machineId: string) {
        let worker = {
            id: uuid.v4(),
            machine_id: machineId,
            name: "",
            address: "",
            port: 0,
            os_type: "",
            platform: "",
            arch: "",
            release: "",
            cpu_count: 0,
            total_memory: 0,
            free_memory: 0,
            load_average: 0,
            work_unit_capacity: 0,
            is_in_scheduler_pool: false,
            is_cluster_proxy: false,
            last_seen: null,
            created_at: null,
            updated_at: null,
            deleted_at: null
        };

        return await this.insertRow(worker);
    }
}
