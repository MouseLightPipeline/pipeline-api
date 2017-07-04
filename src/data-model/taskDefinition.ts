import {TableModel, ITableModelRow} from "./tableModel";
import {knex} from "../data-access/knexConnector";

export interface ITaskDefinition extends ITableModelRow {
    name: string;
    description: string;
    script: string;
    interpreter: string;
    args: string;
    work_units: number;
}

export class TaskDefinitions extends TableModel<ITaskDefinition> {
     public constructor() {
        super("TaskDefinition");
    }

    public async getForRepository(id: string): Promise<ITaskDefinition[]> {
        let objList = await knex(this.tableName).select(this.idKey).where({task_repository: id}).whereNull("deleted_at").orderBy("id");

        let idList = <string[]>objList.map(obj => obj.id);

        return this.fetch(idList);
    }
}
