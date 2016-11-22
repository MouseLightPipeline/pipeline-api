import {ITaskDefinition, TaskDefinitions} from "../data-model/taskDefinition";
import {Projects, IProject} from "../data-model/project";
import {IPipelineStage, PipelineStages} from "../data-model/pipelineStage";
import {ITaskStatistic, TaskStatistics} from "../data-model/taskStatistic";
import {IPipelineWorker, PipelineWorkers} from "../data-model/pipelineWorker";

export interface IPipelineServerContext {
    getPipelineWorker(id: string): Promise<IPipelineWorker>;
    getPipelineWorkers(): Promise<IPipelineWorker[]>;

    getProject(id: string): Promise<IProject>;
    getProjects(includeSoftDelete: boolean): Promise<IProject[]>;
    createProject(name: string, description: string, rootPath: string, sampleNumber: number): Promise<IProject>;
    setProjectStatus(id: string, shouldBeActive: boolean): Promise<IProject>;
    deleteProject(id: string): Promise<boolean>;

    getPipelineStage(id: string): Promise<IPipelineStage>;
    getPipelineStages(): Promise<IPipelineStage[]>;
    getPipelineStagesForProject(id: string): Promise<IPipelineStage>;
    createPipelineStage(project_id: string, task_id: string, previous_stage_id: string, src_path: string, dst_path: string): Promise<IPipelineStage>;
    setPipelineStageStatus(id: string, shouldBeActive: boolean): Promise<IPipelineStage>;
    deletePipelineStage(id: string): Promise<boolean>;

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

    public async createProject(name: string, description: string, rootPath: string, sampleNumber: number): Promise<IProject> {
        return this._projects.create(name, description, rootPath, sampleNumber);
    }

    public async setProjectStatus(id: string, shouldBeActive: boolean): Promise<IProject> {
        return this._projects.setStatus(id, shouldBeActive);
    }

    public async deleteProject(id: string): Promise<boolean> {
        return this._projects.softDelete(id);
    }

    public async getPipelineStage(id: string): Promise<IPipelineStage> {
        return this._pipelineStages.get(id);
    }

    public async getPipelineStages(): Promise<IPipelineStage[]> {
        return this._pipelineStages.getAll();
    }

    public async getPipelineStagesForProject(id: string): Promise<IPipelineStage[]> {
        return this._pipelineStages.getForProject(id);
    }

    public async createPipelineStage(project_id: string, task_id: string, previous_stage_id: string, src_path: string, dst_path: string): Promise<IPipelineStage> {
        return this._pipelineStages.create(project_id, task_id, previous_stage_id, src_path, dst_path);
    }

    public async setPipelineStageStatus(id: string, shouldBeActive: boolean): Promise<IPipelineStage> {
        return this._pipelineStages.setStatus(id, shouldBeActive);
    }

    public async deletePipelineStage(id: string): Promise<boolean> {
        return this._pipelineStages.softDelete(id);
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
}
