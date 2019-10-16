import {Sequelize, Model, DataTypes} from "sequelize";

import {IWorkerHeartbeatData, IWorkerUpdateData} from "../../message-queue/messageQueue";

export enum QueueType {
    Local = 0,
    Cluster = 1
}

export enum PipelineWorkerStatus {
    Unavailable = 0,
    Connected,
    Idle,
    Processing
}

export interface IPipelineWorkerInput {
    id?: string;
    worker_id?: string;
    name?: string;
    address?: string;
    port?: number;
    os_type?: string;
    platform?: string;
    arch?: string;
    release?: string;
    cpu_count?: number;
    total_memory?: number;
    free_memory?: number;
    load_average?: number;
    local_work_capacity?: number;
    cluster_work_capacity?: number;
    last_seen?: Date;
    is_in_scheduler_pool?: boolean;
}

export class PipelineWorker extends Model {
    public id: string;
    public worker_id: string;
    public name: string;
    public address: string;
    public port: number;
    public os_type: string;
    public platform: string;
    public arch: string;
    public release: string;
    public cpu_count: number;
    public total_memory: number;
    public free_memory: number;
    public load_average: number;
    public local_work_capacity: number;
    public cluster_work_capacity: number;
    public last_seen: Date;
    public is_in_scheduler_pool: boolean;

    public readonly created_at: Date;
    public readonly updated_at: Date;
    public readonly deleted_at: Date;

    private static _workerStatusMap = new Map<string, PipelineWorkerStatus>();
    private static _workerLocalTaskLoadMap = new Map<string, number>();
    private static _workerClusterTaskLoadMap = new Map<string, number>();

    public get status(): PipelineWorkerStatus {
        let status = PipelineWorker._workerStatusMap[this.id];

        if (!status) {
            status = PipelineWorkerStatus.Unavailable;
            PipelineWorker._workerStatusMap[this.id] = status;
        }

        return status;
    }

    public set status(value: PipelineWorkerStatus) {
        PipelineWorker._workerStatusMap[this.id] = value;
    }

    public get localTaskLoad(): number {
        let count = PipelineWorker._workerClusterTaskLoadMap[this.id];

        if (count == null) {
            count = -1;
            PipelineWorker._workerClusterTaskLoadMap[this.id] = count;
        }

        return count;
    }

    public set localTaskLoad(value: number) {
        PipelineWorker._workerClusterTaskLoadMap[this.id] = value;
    }

    public get clusterTaskLoad(): number {
        let count = PipelineWorker._workerLocalTaskLoadMap[this.id];

        if (count == null) {
            count = -1;
            PipelineWorker._workerLocalTaskLoadMap[this.id] = count;
        }

        return count;
    }

    public set clusterTaskLoad(value: number) {
        PipelineWorker._workerLocalTaskLoadMap[this.id] = value;
    }

    private static async getForWorkerId(workerIc: string): Promise<PipelineWorker> {
        let worker = await PipelineWorker.findOne({where: {worker_id: workerIc}});

        if (!worker) {
            worker = await PipelineWorker.create({worker_id: workerIc});
        }

        return worker;
    }

    public static async updateStatus(workerInformation: IWorkerUpdateData): Promise<void> {
        let row = await PipelineWorker.getForWorkerId(workerInformation.worker.id);

        if (row) {
            const worker: IPipelineWorkerInput = {};

            worker.worker_id = workerInformation.worker.id;
            worker.local_work_capacity = workerInformation.worker.local_work_capacity;
            worker.cluster_work_capacity = workerInformation.worker.cluster_work_capacity;
            worker.name = workerInformation.service.name;
            worker.address = workerInformation.service.networkAddress;
            worker.port = parseInt(workerInformation.service.networkPort);
            worker.os_type = workerInformation.machine.osType;
            worker.platform = workerInformation.machine.platform;
            worker.arch = workerInformation.machine.arch;
            worker.release = workerInformation.machine.release;
            worker.cpu_count = workerInformation.machine.cpuCount;
            worker.total_memory = workerInformation.machine.totalMemory;
            worker.last_seen = new Date();

            await row.update(worker);
        }
    }

    public static async updateHeartbeat(heartbeatData: IWorkerHeartbeatData): Promise<void> {
        let row = await PipelineWorker.getForWorkerId(heartbeatData.worker.id);

        if (row) {
            const worker: IPipelineWorkerInput = {};

            worker.local_work_capacity = heartbeatData.worker.local_work_capacity;
            worker.cluster_work_capacity = heartbeatData.worker.cluster_work_capacity;
            worker.last_seen = new Date();

            row.localTaskLoad = heartbeatData.localTaskLoad;
            row.clusterTaskLoad = heartbeatData.clusterTaskLoad;

            row.status = PipelineWorkerStatus.Unavailable;

            switch (Math.max(heartbeatData.localTaskLoad, heartbeatData.clusterTaskLoad)) {
                case -1:
                    row.status = PipelineWorkerStatus.Connected;
                    break;
                case 0:
                    row.status = PipelineWorkerStatus.Idle;
                    break;
                default:
                    row.status = PipelineWorkerStatus.Processing;
            }

            await row.update(worker);
        }
    }
}

/*
export interface IPipelineWorker extends Instance<IPipelineWorkerAttributes>, IPipelineWorkerAttributes {
}

export interface IPipelineWorkerTable extends Model<IPipelineWorker, IPipelineWorkerAttributes> {
    getForWorkerId(workerIc: string): Promise<IPipelineWorker>;
    updateStatus(workerInformation: IWorkerUpdateData): Promise<void>;
    updateHeartbeat(heartbeatData: IWorkerHeartbeatData): Promise<void>;
}
*/

const TableName = "PipelineWorkers";

export const modelInit = (sequelize: Sequelize) => {
    PipelineWorker.init({
        id: {
            primaryKey: true,
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4
        },
        worker_id: {
            type: DataTypes.TEXT,
            defaultValue: ""
        },
        name: {
            type: DataTypes.TEXT,
            defaultValue: ""
        },
        address: {
            type: DataTypes.TEXT,
            defaultValue: ""
        },
        port: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        os_type: {
            type: DataTypes.TEXT,
            defaultValue: ""
        },
        platform: {
            type: DataTypes.TEXT,
            defaultValue: ""
        },
        arch: {
            type: DataTypes.TEXT,
            defaultValue: ""
        },
        release: {
            type: DataTypes.TEXT,
            defaultValue: ""
        },
        cpu_count: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        total_memory: {
            type: DataTypes.DOUBLE,
            defaultValue: 0
        },
        free_memory: {
            type: DataTypes.DOUBLE,
            defaultValue: 0
        },
        load_average: {
            type: DataTypes.DOUBLE,
            defaultValue: 0
        },
        local_work_capacity: {
            type: DataTypes.DOUBLE,
            defaultValue: 0
        },
        cluster_work_capacity: {
            type: DataTypes.DOUBLE,
            defaultValue: 0
        },
        last_seen: {
            type: DataTypes.DATE
        },
        is_in_scheduler_pool: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        }
    }, {
        tableName: TableName,
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
        deletedAt: "deleted_at",
        paranoid: true,
        sequelize
    });
};
/*
export function sequelizeImport(sequelize, DataTypes) {
    const _workerStatusMap = new Map<string, PipelineWorkerStatus>();
    const _workerLocalTaskLoadMap = new Map<string, number>();
    const _workerClusterTaskLoadMap = new Map<string, number>();

    const PipelineWorker = sequelize.define(TableName, {
        id: {
            primaryKey: true,
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4
        },
        worker_id: {
            type: DataTypes.TEXT,
            defaultValue: ""
        },
        name: {
            type: DataTypes.TEXT,
            defaultValue: ""
        },
        address: {
            type: DataTypes.TEXT,
            defaultValue: ""
        },
        port: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        os_type: {
            type: DataTypes.TEXT,
            defaultValue: ""
        },
        platform: {
            type: DataTypes.TEXT,
            defaultValue: ""
        },
        arch: {
            type: DataTypes.TEXT,
            defaultValue: ""
        },
        release: {
            type: DataTypes.TEXT,
            defaultValue: ""
        },
        cpu_count: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        total_memory: {
            type: DataTypes.DOUBLE,
            defaultValue: 0
        },
        free_memory: {
            type: DataTypes.DOUBLE,
            defaultValue: 0
        },
        load_average: {
            type: DataTypes.DOUBLE,
            defaultValue: 0
        },
        local_work_capacity: {
            type: DataTypes.DOUBLE,
            defaultValue: 0
        },
        cluster_work_capacity: {
            type: DataTypes.DOUBLE,
            defaultValue: 0
        },
        last_seen: {
            type: DataTypes.DATE
        },
        is_in_scheduler_pool: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        status: {
            type: DataTypes.VIRTUAL,
            get() {
                let status = _workerStatusMap[this.id];

                if (!status) {
                    status = PipelineWorkerStatus.Unavailable;
                    _workerStatusMap[this.id] = status;
                }

                return status;
            },
            set(val) {
                _workerStatusMap[this.id] = val;
            }
        },
        local_task_load: {
            type: DataTypes.VIRTUAL,
            get() {
                let count = _workerClusterTaskLoadMap[this.id];

                if (count == null) {
                    count = -1;
                    _workerClusterTaskLoadMap[this.id] = count;
                }

                return count;
            },
            set(val) {
                _workerClusterTaskLoadMap[this.id] = val;
            }
        },
        cluster_task_load: {
            type: DataTypes.VIRTUAL,
            get() {
                let count = _workerLocalTaskLoadMap[this.id];

                if (count == null) {
                    count = -1;
                    _workerLocalTaskLoadMap[this.id] = count;
                }

                return count;
            },
            set(val) {
                _workerLocalTaskLoadMap[this.id] = val;
            }
        }
    }, {
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
        deletedAt: "deleted_at",
        paranoid: true
    });

    PipelineWorker.getForWorkerId = async (workerIc: string): Promise<IPipelineWorker> => {
        let worker = await PipelineWorker.findOne({where: {worker_id: workerIc}});

        if (!worker) {
            worker = await PipelineWorker.create({worker_id: workerIc});
        }

        return worker;
    };

    PipelineWorker.updateStatus = async (workerInformation: IWorkerUpdateData): Promise<void> => {
        let row = await PipelineWorker.getForWorkerId(workerInformation.worker.id);

        if (row) {
            const worker: IPipelineWorkerAttributes = {};

            worker.worker_id = workerInformation.worker.id;
            worker.local_work_capacity = workerInformation.worker.local_work_capacity;
            worker.cluster_work_capacity = workerInformation.worker.cluster_work_capacity;
            worker.name = workerInformation.service.name;
            worker.address = workerInformation.service.networkAddress;
            worker.port = parseInt(workerInformation.service.networkPort);
            worker.os_type = workerInformation.machine.osType;
            worker.platform = workerInformation.machine.platform;
            worker.arch = workerInformation.machine.arch;
            worker.release = workerInformation.machine.release;
            worker.cpu_count = workerInformation.machine.cpuCount;
            worker.total_memory = workerInformation.machine.totalMemory;
            worker.last_seen = new Date();

            await row.update(worker);
        }
    };

    PipelineWorker.updateHeartbeat = async (heartbeatData: IWorkerHeartbeatData): Promise<void> => {
        let row = await PipelineWorker.getForWorkerId(heartbeatData.worker.id);

        if (row) {
            const worker: IPipelineWorkerAttributes = {};

            worker.local_work_capacity = heartbeatData.worker.local_work_capacity;
            worker.cluster_work_capacity = heartbeatData.worker.cluster_work_capacity;
            worker.local_task_load = heartbeatData.localTaskLoad;
            worker.cluster_task_load = heartbeatData.clusterTaskLoad;
            worker.last_seen = new Date();

            worker.status = PipelineWorkerStatus.Unavailable;

            switch (Math.max(heartbeatData.localTaskLoad, heartbeatData.clusterTaskLoad)) {
                case -1:
                    worker.status = PipelineWorkerStatus.Connected;
                    break;
                case 0:
                    worker.status = PipelineWorkerStatus.Idle;
                    break;
                default:
                    worker.status = PipelineWorkerStatus.Processing;
            }

            await row.update(worker);
        }
    };

    return PipelineWorker;
}
*/