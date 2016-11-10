import {TableModel, ITableModelRow} from "./tableModel";

export interface IWorker extends ITableModelRow {
    name: string;
    description: string;
    machine_id: string;
    last_seen: Date;
}

export class Workers extends TableModel<IWorker> {
    public constructor() {
        super("Worker");
    }
}
