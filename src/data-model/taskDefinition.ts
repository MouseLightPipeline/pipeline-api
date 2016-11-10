import {TableModel, ITableModelRow} from "./tableModel";

export interface ITaskDefinition extends ITableModelRow {
    name: string;
    description: string;
    script: string;
    interpreter: string;
}

export class TaskDefinitions extends TableModel<ITaskDefinition> {
     public constructor() {
        super("TaskDefinition");
    }
}
