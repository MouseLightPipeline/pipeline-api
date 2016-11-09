import {TaskManager, ITaskManager} from "../task-management/taskManager";

const taskManager = new TaskManager();

export interface IPipelineServerContext {
    taskManager: ITaskManager;
}

export class PipelineServerContext implements PipelineServerContext {
    readonly taskManager: ITaskManager;

    constructor() {
        this.taskManager = taskManager;
    }
}
