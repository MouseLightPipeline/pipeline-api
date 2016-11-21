import {ITaskDefinition, TaskDefinitions} from "../data-model/taskDefinition";
import {Projects, IProject} from "../data-model/project";
import {IPipelineStage, PipelineStages} from "../data-model/pipelineStage";
import {ITaskStatistic, TaskStatistics} from "../data-model/taskStatistic";
import {IPipelineWorker, PipelineWorkers} from "../data-model/pipelineWorker";
import {WorkerManager} from "../workers/workerManager";

export interface IPipelineServerContext {
    getPipelineWorker(id: string): Promise<IPipelineWorker>;
    getPipelineWorkers(): Promise<IPipelineWorker[]>;

    getProject(id: string): Promise<IProject>;
    getProjects(includeSoftDelete: boolean): Promise<IProject[]>;

    getPipelineStage(id: string): Promise<IPipelineStage>;
    getPipelineStages(): Promise<IPipelineStage[]>;

    getTaskDefinition(id: string): Promise<ITaskDefinition>;
    getTaskDefinitions(): Promise<ITaskDefinition[]>;

    getTaskStatistic(id: string): Promise<ITaskStatistic>;
    getTaskStatistics(): Promise<ITaskStatistic[]>;

    createProject(name: string, description: string, rootPath: string, sampleNumber: number): Promise<IProject>;
    setProjectStatus(id: string, shouldBeActive: boolean): Promise<IProject>;
    deleteProject(id: string): Promise<boolean>;
}

export class PipelineServerContext implements IPipelineServerContext {
    private _taskDefinitions = new TaskDefinitions();
    private _projects = new Projects();
    private _pipelineStages = new PipelineStages();
    private _taskStatistics = new TaskStatistics();
    private _workers = new PipelineWorkers();

    public async getPipelineWorker(id: string): Promise<IPipelineWorker> {
        return this._workers.get(id);
    }

    public async getPipelineWorkers(): Promise<IPipelineWorker[]> {
        return this._workers.getAll();
    }

    public async getProject(id: string): Promise<IProject> {
        return this._projects.get(id);
    }

    public async getProjects(includeSoftDelete: boolean = false): Promise<IProject[]> {
        return this._projects.getAll(includeSoftDelete);
    }

    public async getPipelineStage(id: string): Promise<IPipelineStage> {
        return this._pipelineStages.get(id);
    }

    public async getPipelineStages(): Promise<IPipelineStage[]> {
        return this._pipelineStages.getAll();
    }

    public async getTaskDefinition(id: string): Promise<ITaskDefinition> {
        return this._taskDefinitions.get(id);
    }

    public async getTaskDefinitions(): Promise<ITaskDefinition[]> {
        return this._taskDefinitions.getAll();
    }

    public async getTaskStatistic(id: string): Promise<ITaskStatistic> {
        return this._taskStatistics.get(id);
    }

    public async getTaskStatistics(): Promise<ITaskStatistic[]> {
        return this._taskStatistics.getAll();
    }

    public async createProject(name: string, description: string, rootPath: string, sampleNumber: number): Promise<IProject> {
        return this._projects.create(name, description, rootPath, sampleNumber);
    }

    public async setProjectStatus(id: string, shouldBeActive: boolean): Promise<IProject> {
        return WorkerManager.Instance.setProjectStatus(id, shouldBeActive);
    }

    public async deleteProject(id: string): Promise<boolean> {
        return this._projects.softDelete(id);
    }

}
