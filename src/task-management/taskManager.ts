import {ITaskDefinition, TaskDefinitions} from "../data-model/taskDefinition";

// const debug = require("debug")("mouselight:pipeline-api:task-manager");

export interface ITaskManager {
    getTaskDefinitions(): Promise<ITaskDefinition[]>;
    getTaskDefinition(id: string): Promise<ITaskDefinition>;
}

export class TaskManager implements ITaskManager {

    private _taskDefinitions = new TaskDefinitions();

    public getTaskDefinitions(): Promise<ITaskDefinition[]> {
        return this._taskDefinitions.getAll();
    }

    public getTaskDefinition(id: string): Promise<ITaskDefinition> {
        return this._taskDefinitions.get(id);
    }
}
