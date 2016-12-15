import * as uuid from "node-uuid";

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
    os_type: string;
    platform: string;
    arch: string;
    release: string;
    cpu_count: number;
    total_memory: number;
    free_memory: number;
    load_average: number;
    last_seen: Date;
    status?: PipelineWorkerStatus,
    taskCount?: number;
}

export class PipelineWorkers extends TableModel<IPipelineWorker> {
    private static _workerStatusMap = new Map<string, PipelineWorkerStatus>();
    private static _workerTaskCountMap = new Map<string, number>();

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

    public static getWorkerTaskCount(id: string): number {
        let count = PipelineWorkers._workerTaskCountMap[id];

        if (count == null) {
            count = -1;
            PipelineWorkers._workerTaskCountMap[id] = count;
        }

        return count;
    }

    public static setWorkerStatus(id: string, status: PipelineWorkerStatus) {
        PipelineWorkers._workerStatusMap[id] = status;
    }

    public static setWorkerTaskCount(id: string, count: number) {
        PipelineWorkers._workerTaskCountMap[id] = count;
    }

    public async getForMachineId(machineId: string) {
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

        if (row.hasOwnProperty("taskCount")) {
            delete row["taskCount"];
        }

        return row;
    }

    protected didFetchRow(row: IPipelineWorker): IPipelineWorker {

        row["status"] = PipelineWorkers.getWorkerStatus(row.id);

        row["taskCount"] = PipelineWorkers.getWorkerTaskCount(row.id);

        return row;
    }

    private async create(machineId: string) {
        let worker = {
            id: uuid.v4(),
            machine_id: machineId,
            name: "",
            os_type: "",
            platform: "",
            arch: "",
            release: "",
            cpu_count: 0,
            total_memory: 0,
            free_memory: 0,
            load_average: 0,
            last_seen: null,
            created_at: null,
            updated_at: null,
            deleted_at: null
        };

        return await this.insertRow(worker);
    }
}
