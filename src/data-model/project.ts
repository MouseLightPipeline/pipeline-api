import {TableModel, ITableModelRow} from "./tableModel";

export interface IProject extends ITableModelRow {
    name: string;
    description: string;
    root_path: string;
    sample_number: number;
}

export class Projects extends TableModel<IProject> {
    public constructor() {
        super("Project");
    }
}
