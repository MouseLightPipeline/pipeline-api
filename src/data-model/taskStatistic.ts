import {TableModel, ITableModelRow} from "./tableModel";

export interface ITaskStatistic extends ITableModelRow {
    num_execute: number;
    num_complete: number;
    num_error: number;
    num_cancelled: number;
    duration_avg: number;
    duration_long: number;
    task_id: string;
}

export class TaskStatistics extends TableModel<ITaskStatistic> {
    public constructor() {
        super("TaskStatistic");
    }
}
