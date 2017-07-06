import * as path from "path";
import * as fs from "fs";

import {ITaskDefinition, TaskDefinitions} from "../data-model/taskDefinition";
import {Projects, IProject, IProjectInput} from "../data-model/project";
import {IPipelineStage, PipelineStages, PipelineStageMethod} from "../data-model/pipelineStage";
import {IPipelineWorker, PipelineWorkers} from "../data-model/pipelineWorker";
import {IPipelineStagePerformance, pipelineStagePerformanceInstance} from "../data-model/pipelineStagePerformance";
import {SchedulerHub} from "../schedulers/schedulerHub";
import {ITaskRepository, TaskRepositories} from "../data-model/taskRepository";

const debug = require("debug")("mouselight:pipeline-api:context");

export interface ITaskRepositoryMutationOutput {
    taskRepository: ITaskRepository;
    error: string;
}

export interface ITaskRepositoryDeleteOutput {
    id: string;
    error: string;
}

export interface ITaskDefinitionMutationOutput {
    taskDefinition: ITaskDefinition;
    error: string;
}

export interface ITaskDefinitionDeleteOutput {
    id: string;
    error: string;
}

export interface IPipelineServerContext {
    getPipelineWorker(id: string): Promise<IPipelineWorker>;
    getPipelineWorkers(): Promise<IPipelineWorker[]>;
    setWorkerAvailability(id: string, shouldBeInSchedulerPool: boolean): Promise<IPipelineWorker>;

    getProject(id: string): Promise<IProject>;
    getProjects(includeSoftDelete: boolean): Promise<IProject[]>;
    createProject(project: IProjectInput): Promise<IProject>;
    updateProject(project: IProjectInput): Promise<IProject>;
    setProjectStatus(id: string, shouldBeActive: boolean): Promise<IProject>;
    deleteProject(id: string): Promise<boolean>;

    getPipelineStage(id: string): Promise<IPipelineStage>;
    getPipelineStages(): Promise<IPipelineStage[]>;
    getPipelineStagesForProject(id: string): Promise<IPipelineStage[]>;
    getPipelineStagesForTaskDefinition(id: string): Promise<IPipelineStage[]>;
    createPipelineStage(name: string, description: string, project_id: string, task_id: string, previous_stage_id: string, dst_path: string, function_type: number): Promise<IPipelineStage>;
    setPipelineStageStatus(id: string, shouldBeActive: boolean): Promise<IPipelineStage>;
    deletePipelineStage(id: string): Promise<boolean>;

    getTaskRepository(id: string): Promise<ITaskRepository>;
    getTaskRepositories(): Promise<ITaskRepository[]>;
    getRepositoryTasks(id: string): Promise<ITaskDefinition[]>;
    createTaskRepository(taskRepository: ITaskRepository): Promise<ITaskRepositoryMutationOutput>;
    updateTaskRepository(taskRepository: ITaskRepository): Promise<ITaskRepositoryMutationOutput>;
    deleteTaskRepository(taskRepository: ITaskRepository): Promise<ITaskRepositoryDeleteOutput>;

    getTaskDefinition(id: string): Promise<ITaskDefinition>;
    getTaskDefinitions(): Promise<ITaskDefinition[]>;
    getScriptStatusForTaskDefinition(taskDefinition: ITaskDefinition): Promise<boolean>;
    getScriptContents(taskDefinitionId: string): Promise<string>;
    createTaskDefinition(taskDefinition: ITaskDefinition): Promise<ITaskDefinitionMutationOutput>;
    updateTaskDefinition(taskDefinition: ITaskDefinition): Promise<ITaskDefinitionMutationOutput>;
    deleteTaskDefinition(taskDefinition: ITaskDefinition): Promise<ITaskDefinitionDeleteOutput>;

    getPipelineStagePerformance(id: string): Promise<IPipelineStagePerformance>;
    getPipelineStagePerformances(): Promise<IPipelineStagePerformance[]>;
    getForStage(pipeline_stage_id: string): Promise<IPipelineStagePerformance>

    getProjectPlaneTileStatus(project_id: string, plane: number): Promise<any>;
}

export class PipelineServerContext implements IPipelineServerContext {
    private _taskRepositories = new TaskRepositories();
    private _taskDefinitions = new TaskDefinitions();
    private _projects = Projects.defaultManager();
    private _pipelineStages = new PipelineStages();
    private _workers = new PipelineWorkers();
    private _pipelinePerformance = pipelineStagePerformanceInstance;

    public getPipelineWorker(id: string): Promise<IPipelineWorker> {
        return this._workers.get(id);
    }

    public getPipelineWorkers(): Promise<IPipelineWorker[]> {
        return this._workers.getAll();
    }

    public setWorkerAvailability(id: string, shouldBeInSchedulerPool: boolean): Promise<IPipelineWorker> {
        return this._workers.setShouldBeInSchedulerPool(id, shouldBeInSchedulerPool);
    }

    public getProject(id: string): Promise<IProject> {
        return this._projects.get(id);
    }

    public getProjects(includeSoftDelete: boolean = false): Promise<IProject[]> {
        return this._projects.getAll(includeSoftDelete);
    }

    public createProject(project: IProjectInput): Promise<IProject> {
        return this._projects.create(project);
    }

    public updateProject(project: IProjectInput): Promise<IProject> {
        return this._projects.updateFromInputProject(project);
    }

    public setProjectStatus(id: string, shouldBeActive: boolean): Promise<IProject> {
        return this._projects.setProcessingStatus(id, shouldBeActive);
    }

    public deleteProject(id: string): Promise<boolean> {
        return this._projects.softDelete(id);
    }

    public getPipelineStage(id: string): Promise<IPipelineStage> {
        return this._pipelineStages.get(id);
    }

    public getPipelineStages(): Promise<IPipelineStage[]> {
        return this._pipelineStages.getAll();
    }

    public getPipelineStagesForProject(id: string): Promise<IPipelineStage[]> {
        return this._pipelineStages.getForProject(id);
    }

    public getPipelineStagesForTaskDefinition(id: string): Promise<IPipelineStage[]> {
        return this._pipelineStages.getForTask(id);
    }

    public createPipelineStage(name: string, description: string, project_id: string, task_id: string, previous_stage_id: string, dst_path: string, function_type: PipelineStageMethod): Promise<IPipelineStage> {
        return this._pipelineStages.create(name, description, project_id, task_id, previous_stage_id, dst_path, function_type);
    }

    public setPipelineStageStatus(id: string, shouldBeActive: boolean): Promise<IPipelineStage> {
        return this._pipelineStages.setProcessingStatus(id, shouldBeActive);
    }

    public deletePipelineStage(id: string): Promise<boolean> {
        return this._pipelineStages.softDelete(id);
    }

    public getTaskRepository(id: string): Promise<ITaskRepository> {
        return this._taskRepositories.get(id);
    }

    public getTaskRepositories(): Promise<ITaskRepository[]> {
        return this._taskRepositories.getAll();
    }

    public async getRepositoryTasks(id: string): Promise<ITaskDefinition[]> {
        return this._taskDefinitions.getForRepository(id);
    }

    public async createTaskRepository(taskRepository: ITaskRepository): Promise<ITaskRepositoryMutationOutput> {
        try {
            return {taskRepository: await this._taskRepositories.create(taskRepository), error: ""};
        } catch (err) {
            return {taskRepository: null, error: err.message}
        }
    }

    public async updateTaskRepository(taskRepository: ITaskRepository): Promise<ITaskRepositoryMutationOutput> {
        try {
            return {taskRepository: await this._taskRepositories.updateRepository(taskRepository), error: ""};
        } catch (err) {
            return {taskRepository: null, error: err.message}
        }
    }

    public async deleteTaskRepository(taskRepository: ITaskRepository): Promise<ITaskRepositoryDeleteOutput> {
        try {
            const result = await this._taskRepositories.softDelete(taskRepository.id);

            if (result) {
                return {id: taskRepository.id, error: ""};
            } else {
                return {id: null, error: "Could not delete repository (no error message)"};
            }
        } catch (err) {
            return {id: null, error: err.message}
        }
    }

    public async createTaskDefinition(taskDefinition: ITaskDefinition): Promise<ITaskDefinitionMutationOutput> {
        try {
            const result = await this._taskDefinitions.create(taskDefinition);

            return {taskDefinition: result, error: ""};
        } catch (err) {
            return {taskDefinition: null, error: err.message}
        }
    }

    public async updateTaskDefinition(taskDefinition: ITaskDefinition): Promise<ITaskDefinitionMutationOutput> {
        try {
            return {taskDefinition: await this._taskDefinitions.updateTaskDefinition(taskDefinition), error: ""};
        } catch (err) {
            return {taskDefinition: null, error: err.message}
        }
    }

    public async deleteTaskDefinition(taskDefinition: ITaskDefinition): Promise<ITaskDefinitionDeleteOutput> {
        try {
            const result = await this._taskDefinitions.softDelete(taskDefinition.id);

            if (result) {
                return {id: taskDefinition.id, error: ""};
            } else {
                return {id: null, error: "Could not delete task definition (no error message)"};
            }
        } catch (err) {
            return {id: null, error: err.message}
        }
    }

    public getTaskDefinition(id: string): Promise<ITaskDefinition> {
        return this._taskDefinitions.get(id);
    }

    public getTaskDefinitions(): Promise<ITaskDefinition[]> {
        return this._taskDefinitions.getAll();
    }

    public async getScriptStatusForTaskDefinition(taskDefinition: ITaskDefinition): Promise<boolean> {
        const scriptPath = await this._getFullScriptPath(taskDefinition);

        return fs.existsSync(scriptPath);
    }

    public async getScriptContents(taskDefinitionId: string): Promise<string> {
        const taskDefinition = await this._taskDefinitions.get(taskDefinitionId);

        if (taskDefinition) {
            const haveScript = await this.getScriptStatusForTaskDefinition(taskDefinition);

            if (haveScript) {
                const scriptPath = await this._getFullScriptPath(taskDefinition);

                return fs.readFileSync(scriptPath, "utf8");
            }
        }

        return null;
    }

    public getPipelineStagePerformance(id: string): Promise<IPipelineStagePerformance> {
        return this._pipelinePerformance.get(id);
    }

    public getPipelineStagePerformances(): Promise<IPipelineStagePerformance[]> {
        return this._pipelinePerformance.getAll();
    }

    public getForStage(pipeline_stage_id: string): Promise<IPipelineStagePerformance> {
        return this._pipelinePerformance.getForStage(pipeline_stage_id);
    }

    public getProjectPlaneTileStatus(project_id: string, plane: number): Promise<any> {
        return SchedulerHub.Instance.loadTileStatusForPlane(project_id, plane);
    }

    private async _getFullScriptPath(taskDefinition: ITaskDefinition): Promise<string> {
        let scriptPath = taskDefinition.script;

        if (taskDefinition.task_repository_id) {
            const repo = await this._taskRepositories.get(taskDefinition.task_repository_id);

            scriptPath = path.join(repo.location, scriptPath);
        } else {
            if (!path.isAbsolute(scriptPath)) {
                scriptPath = path.join(process.cwd(), scriptPath);
            }
        }

        return scriptPath;
    }
}
