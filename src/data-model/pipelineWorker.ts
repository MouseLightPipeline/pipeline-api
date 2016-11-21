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
    name: string;
    description: string;
    machine_id: string;
    last_seen: Date;
}

export class PipelineWorkers extends TableModel<IPipelineWorker> {
    private static _workerStatusMap = new Map<string, PipelineWorkerStatus>();

    public static getWorkerStatus(id: string): PipelineWorkerStatus {
        let status = PipelineWorkers._workerStatusMap[id];

        if (!status) {
            status = PipelineWorkerStatus.Unavailable;
            PipelineWorkers._workerStatusMap[id] = status;
        }

        return status;
    }

    public static setWorkerStatus(id: string, status: PipelineWorkerStatus) {
        PipelineWorkers._workerStatusMap[id] = status;
    }

    public constructor() {
        super("PipelineWorker");
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

    protected didFetchRow(row: IPipelineWorker): IPipelineWorker {

        row["status"] = PipelineWorkers.getWorkerStatus(row.id);

        return row;
    }

    private async create(machineId: string) {
        let worker = {
            id: uuid.v4(),
            name: "",
            description: "",
            machine_id: machineId,
            last_seen: null,
            created_at: null,
            updated_at: null,
            deleted_at: null
        };

        await this.save(worker);

        // Retrieves back through data loader
        worker = await this.get(worker.id);

        return worker;
    }
}
