import {ITaskDefinition, TaskDefinitions} from "../data-model/taskDefinition";
import {Projects, IProject} from "../data-model/project";
import {IPipelineStage, PipelineStages} from "../data-model/pipelineStage";
import {ITaskStatistic, TaskStatistics} from "../data-model/taskStatistic";

export interface IPipelineServerContext {
    getProject(id: string): Promise<IProject>;
    getProjects(): Promise<IProject[]>;

    getPipelineStage(id: string): Promise<IPipelineStage>;
    getPipelineStages(): Promise<IPipelineStage[]>;

    getTaskDefinition(id: string): Promise<ITaskDefinition>;
    getTaskDefinitions(): Promise<ITaskDefinition[]>;

    getTaskStatistic(id: string): Promise<ITaskStatistic>;
    getTaskStatistics(): Promise<ITaskStatistic[]>;
}

export class PipelineServerContext implements IPipelineServerContext {
    private _taskDefinitions = new TaskDefinitions();
    private _projects = new Projects();
    private _pipelineStages = new PipelineStages();
    private _taskStatistics = new TaskStatistics();

    public getProject(id: string): Promise<IProject> {
        return this._projects.get(id);
    }

    public getProjects(): Promise<IProject[]> {
        return this._projects.getAll();
    }

    public getPipelineStage(id: string): Promise<IPipelineStage> {
        return this._pipelineStages.get(id);
    }

    public getPipelineStages(): Promise<IPipelineStage[]> {
        return this._pipelineStages.getAll();
    }

    public getTaskDefinition(id: string): Promise<ITaskDefinition> {
        return this._taskDefinitions.get(id);
    }

    public getTaskDefinitions(): Promise<ITaskDefinition[]> {
        return this._taskDefinitions.getAll();
    }

    public getTaskStatistic(id: string): Promise<ITaskStatistic> {
        return this._taskStatistics.get(id);
    }

    public getTaskStatistics(): Promise<ITaskStatistic[]> {
        return this._taskStatistics.getAll();
    }
}
