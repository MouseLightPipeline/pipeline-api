import {TableModel, ITableModelRow} from "./tableModel";

export interface IPipelineStage extends ITableModelRow {
    name: string;
    description: string;
    function_type: number;
    execution_order: number;
    src_path: string;
    dst_path: string;
    is_active: boolean;
    project_id: string;
    task_id: string;
}

export class PipelineStages extends TableModel<IPipelineStage> {
    public constructor() {
        super("PipelineStage");
    }
}
