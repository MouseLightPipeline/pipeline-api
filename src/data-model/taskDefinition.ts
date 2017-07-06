import {TableModel, ITableModelRow} from "./tableModel";
import {knex} from "../data-access/knexConnector";
import {isUndefined} from "util";

export interface ITaskDefinition extends ITableModelRow {
    name: string;
    description: string;
    script: string;
    interpreter: string;
    args: string;
    work_units: number;
    task_repository_id: string;
}

export class TaskDefinitions extends TableModel<ITaskDefinition> {
     public constructor() {
        super("TaskDefinition");
    }

    public async create(taskDefinition: ITaskDefinition): Promise<ITaskDefinition> {
        taskDefinition.args = taskDefinition.args || "";
        taskDefinition.description = taskDefinition.description || "";

        return this.insertRow(taskDefinition);
    }

    public async updateTaskDefinition(taskDefinition: ITaskDefinition): Promise<ITaskDefinition> {
        if (!taskDefinition.id || taskDefinition.id.length === 0) {
            throw "Update requires a valid task definition identifier";
        }

        let row = await this.get(taskDefinition.id);

        if (!row) {
            throw "Update requires a valid task definition identifier";
        }

        row.name = taskDefinition.name || row.name;
        row.task_repository_id = isUndefined(taskDefinition.task_repository_id) ? row.task_repository_id : taskDefinition.task_repository_id;
        row.script = taskDefinition.script || row.script;
        row.interpreter = taskDefinition.interpreter || row.interpreter;
        row.args = taskDefinition.args || row.args;
        row.work_units = taskDefinition.work_units || row.work_units;
        row.description = taskDefinition.description || row.description;

        return this.save(row);
    }

    public async getForRepository(id: string): Promise<ITaskDefinition[]> {
        let objList = await knex(this.tableName).select(this.idKey).where({task_repository_id: id}).whereNull("deleted_at").orderBy("id");

        let idList = <string[]>objList.map(obj => obj.id);

        return this.fetch(idList);
    }
}
