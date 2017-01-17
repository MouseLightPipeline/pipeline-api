import {ITaskDefinition, TaskDefinitions} from "../data-model/taskDefinition";
import {Projects, IProject, IProjectGridRegion} from "../data-model/project";
import {IPipelineStage, PipelineStages, PipelineStageMethod} from "../data-model/pipelineStage";
import {IPipelineWorker, PipelineWorkers} from "../data-model/pipelineWorker";
import {IPipelineStagePerformance, pipelineStagePerformanceInstance} from "../data-model/pipelineStagePerformance";
import {SchedulerHub} from "../schedulers/schedulerHub";

export interface IPipelineServerContext {
    getPipelineWorker(id: string): Promise<IPipelineWorker>;
    getPipelineWorkers(): Promise<IPipelineWorker[]>;

    getProject(id: string): Promise<IProject>;
    getProjects(includeSoftDelete: boolean): Promise<IProject[]>;
    createProject(name: string, description: string, rootPath: string, sampleNumber: number, region: IProjectGridRegion): Promise<IProject>;
    setProjectStatus(id: string, shouldBeActive: boolean): Promise<IProject>;
    deleteProject(id: string): Promise<boolean>;

    getPipelineStage(id: string): Promise<IPipelineStage>;
    getPipelineStages(): Promise<IPipelineStage[]>;
    getPipelineStagesForProject(id: string): Promise<IPipelineStage[]>;
    createPipelineStage(project_id: string, task_id: string, previous_stage_id: string, dst_path: string, function_type: number): Promise<IPipelineStage>;
    setPipelineStageStatus(id: string, shouldBeActive: boolean): Promise<IPipelineStage>;
    deletePipelineStage(id: string): Promise<boolean>;

    getTaskDefinition(id: string): Promise<ITaskDefinition>;
    getTaskDefinitions(): Promise<ITaskDefinition[]>;

    getPipelineStagePerformance(id: string): Promise<IPipelineStagePerformance>;
    getPipelineStagePerformances(): Promise<IPipelineStagePerformance[]>;
    getForStage(pipeline_stage_id: string): Promise<IPipelineStagePerformance>

    getProjectPlaneTileStatus(project_id: string, plane: number): Promise<any>;
}

export class PipelineServerContext implements IPipelineServerContext {
    private _taskDefinitions = new TaskDefinitions();
    private _projects = new Projects();
    private _pipelineStages = new PipelineStages();
    private _workers = new PipelineWorkers();
    private _pipelinePerformance = pipelineStagePerformanceInstance;

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

    public async createProject(name: string, description: string, rootPath: string, sampleNumber: number, region: IProjectGridRegion): Promise<IProject> {
        return this._projects.create(name, description, rootPath, sampleNumber, region);
    }

    public async setProjectStatus(id: string, shouldBeActive: boolean): Promise<IProject> {
        return this._projects.setProcessingStatus(id, shouldBeActive);
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

    public async createPipelineStage(project_id: string, task_id: string, previous_stage_id: string, dst_path: string, function_type: PipelineStageMethod): Promise<IPipelineStage> {
        return this._pipelineStages.create(project_id, task_id, previous_stage_id, dst_path, function_type);
    }

    public async setPipelineStageStatus(id: string, shouldBeActive: boolean): Promise<IPipelineStage> {
        return this._pipelineStages.setProcessingStatus(id, shouldBeActive);
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

    public async getPipelineStagePerformance(id: string): Promise<IPipelineStagePerformance> {
        return this._pipelinePerformance.get(id);
    }

    public async getPipelineStagePerformances(): Promise<IPipelineStagePerformance[]> {
        return this._pipelinePerformance.getAll();
    }

    public async getForStage(pipeline_stage_id: string): Promise<IPipelineStagePerformance> {
        return this._pipelinePerformance.getForStage(pipeline_stage_id);
    }

    public async getProjectPlaneTileStatus(project_id: string, plane: number): Promise<any> {
        return SchedulerHub.Instance.loadTileStatusForPlane(project_id, plane);
    }
}
