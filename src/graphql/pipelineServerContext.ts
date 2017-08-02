import * as path from "path";
import * as fs from "fs";

import {IPipelineStagePerformance, pipelineStagePerformanceInstance} from "../data-model/pipelineStagePerformance";
import {SchedulerHub} from "../schedulers/schedulerHub";
import {PersistentStorageManager} from "../data-access/sequelize/databaseConnector";
import {ITaskDefinition} from "../data-model/sequelize/taskDefinition";
import {ITaskRepository} from "../data-model/sequelize/taskRepository";
import {IPipelineWorker} from "../data-model/sequelize/pipelineWorker";
import {IProject, IProjectInput, NO_BOUND, NO_SAMPLE} from "../data-model/sequelize/project";
import {IPipelineStage} from "../data-model/sequelize/pipelineStage";

const debug = require("debug")("mouselight:pipeline-api:context");

export interface IProjectMutationOutput {
    project: IProject;
    error: string;
}

export interface IProjectDeleteOutput {
    id: string;
    error: string;
}

export interface IPipelineStageMutationOutput {
    pipelineStage: IPipelineStage;
    error: string;
}

export interface IPipelineStageDeleteOutput {
    id: string;
    error: string;
}

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
    getProjects(): Promise<IProject[]>;
    getDashboardJsonStatusForProject(project: IProject): boolean;
    createProject(project: IProjectInput): Promise<IProjectMutationOutput>;
    updateProject(project: IProjectInput): Promise<IProjectMutationOutput>;
    deleteProject(id: string): Promise<IProjectDeleteOutput>;

    getPipelineStage(id: string): Promise<IPipelineStage>;
    getPipelineStages(): Promise<IPipelineStage[]>;
    getPipelineStagesForProject(id: string): Promise<IPipelineStage[]>;
    getPipelineStagesForTaskDefinition(id: string): Promise<IPipelineStage[]>;
    getPipelineStageChildren(id: string): Promise<IPipelineStage[]>
    createPipelineStage(pipelineStage: IPipelineStage): Promise<IPipelineStageMutationOutput>;
    updatePipelineStage(pipelineStage: IPipelineStage): Promise<IPipelineStageMutationOutput>;
    deletePipelineStage(id: string): Promise<IPipelineStageDeleteOutput>;

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
    private _pipelinePerformance = pipelineStagePerformanceInstance;

    private _persistentStorageManager: PersistentStorageManager = PersistentStorageManager.Instance();

    public getPipelineWorker(id: string): Promise<IPipelineWorker> {
        return this._persistentStorageManager.PipelineWorkers.findById(id);
    }

    public getPipelineWorkers(): Promise<IPipelineWorker[]> {
        return this._persistentStorageManager.PipelineWorkers.findAll({});
    }

    public async setWorkerAvailability(id: string, shouldBeInSchedulerPool: boolean): Promise<IPipelineWorker> {
        // return this._workers.setShouldBeInSchedulerPool(id, shouldBeInSchedulerPool);
        const worker = await this._persistentStorageManager.PipelineWorkers.findById(id);

        await worker.update({is_in_scheduler_pool: shouldBeInSchedulerPool});

        return this._persistentStorageManager.PipelineWorkers.findById(id);
    }

    public getDashboardJsonStatusForProject(project: IProject): boolean {
        return fs.existsSync(path.join(project.root_path, "dashboard.json"));
    }

    public getProject(id: string): Promise<IProject> {
        return this._persistentStorageManager.Projects.findById(id);
    }

    public getProjects(): Promise<IProject[]> {
        return this._persistentStorageManager.Projects.findAll({order: [["sample_number", "ASC"], ["name", "ASC"]]});
    }

    public async createProject(projectInput: IProjectInput): Promise<IProjectMutationOutput> {
        try {
            const region = projectInput.region_bounds || {
                x_min: NO_BOUND,
                x_max: NO_BOUND,
                y_min: NO_BOUND,
                y_max: NO_BOUND,
                z_min: NO_BOUND,
                z_max: NO_BOUND
            };

            const project = {
                name: projectInput.name || "",
                description: projectInput.description || "",
                root_path: projectInput.root_path || "",
                sample_number: projectInput.sample_number || NO_SAMPLE,
                sample_x_min: NO_BOUND,
                sample_x_max: NO_BOUND,
                sample_y_min: NO_BOUND,
                sample_y_max: NO_BOUND,
                sample_z_min: NO_BOUND,
                sample_z_max: NO_BOUND,
                region_x_min: region.x_min,
                region_x_max: region.x_max,
                region_y_min: region.y_min,
                region_y_max: region.y_max,
                region_z_min: region.z_min,
                region_z_max: region.z_max,
                is_processing: false
            };

            const result = await this._persistentStorageManager.Projects.create(project);

            return {project: result, error: ""};
        } catch (err) {
            return {project: null, error: err.message}
        }
    }

    public async updateProject(projectInput: IProjectInput): Promise<IProjectMutationOutput> {
        try {
            let row = await this._persistentStorageManager.Projects.findById(projectInput.id);

            let project = projectInput.region_bounds ?
                Object.assign(projectInput, {
                    region_x_min: projectInput.region_bounds.x_min,
                    region_x_max: projectInput.region_bounds.x_max,
                    region_y_min: projectInput.region_bounds.y_min,
                    region_y_max: projectInput.region_bounds.y_max,
                    region_z_min: projectInput.region_bounds.z_min,
                    region_z_max: projectInput.region_bounds.z_max
                }) : projectInput;

            await row.update(project);

            row = await this._persistentStorageManager.Projects.findById(project.id);

            return {project: row, error: ""};
        } catch (err) {
            return {project: null, error: err.message}
        }
    }

    public async deleteProject(id: string): Promise<IProjectDeleteOutput> {
        try {
            const affectedRowCount = await this._persistentStorageManager.Projects.destroy({where: {id}});

            if (affectedRowCount > 0) {
                return {id, error: ""};
            } else {
                return {id: null, error: "Could not delete repository (no error message)"};
            }
        } catch (err) {
            return {id: null, error: err.message}
        }
    }

    public getPipelineStage(id: string): Promise<IPipelineStage> {
        return this._persistentStorageManager.PipelineStages.findById(id);
    }

    public getPipelineStages(): Promise<IPipelineStage[]> {
        return this._persistentStorageManager.PipelineStages.findAll({});
    }

    public getPipelineStagesForProject(id: string): Promise<IPipelineStage[]> {
        return this._persistentStorageManager.PipelineStages.getForProject(id);
    }

    public getPipelineStagesForTaskDefinition(id: string): Promise<IPipelineStage[]> {
        return this._persistentStorageManager.PipelineStages.getForTask(id);
    }

    public getPipelineStageChildren(id: string): Promise<IPipelineStage[]> {
        return this._persistentStorageManager.PipelineStages.findAll({where: {previous_stage_id: id}});
    }

    public async createPipelineStage(pipelineStage: IPipelineStage): Promise<IPipelineStageMutationOutput> {
        try {
            const result: IPipelineStage = await this._persistentStorageManager.PipelineStages.createFromInput(pipelineStage);

            return {pipelineStage: result, error: ""};
        } catch (err) {
            return {pipelineStage: null, error: err.message};
        }
    }

    public async updatePipelineStage(pipelineStage: IPipelineStage): Promise<IPipelineStageMutationOutput> {
        try {
            let row = await this._persistentStorageManager.PipelineStages.findById(pipelineStage.id);

            await row.update(pipelineStage);

            row = await this._persistentStorageManager.PipelineStages.findById(pipelineStage.id);

            return {pipelineStage: row, error: ""};
        } catch (err) {
            return {pipelineStage: null, error: err.message}
        }
    }

    public async deletePipelineStage(id: string): Promise<IPipelineStageDeleteOutput> {
        try {
            const affectedRowCount = await this._persistentStorageManager.PipelineStages.destroy({where: {id}});

            if (affectedRowCount > 0) {
                return {id, error: ""};
            } else {
                return {id: null, error: "Could not delete repository (no error message)"};
            }
        } catch (err) {
            return {id: null, error: err.message}
        }
    }

    public getTaskRepository(id: string): Promise<ITaskRepository> {
        return this._persistentStorageManager.TaskRepositories.findById(id);
    }

    public getTaskRepositories(): Promise<ITaskRepository[]> {
        return this._persistentStorageManager.TaskRepositories.findAll({});
    }

    public async getRepositoryTasks(id: string): Promise<ITaskDefinition[]> {
        return this._persistentStorageManager.TaskDefinitions.findAll({where: {task_repository_id: id}});
    }

    public async createTaskRepository(taskRepository: ITaskRepository): Promise<ITaskRepositoryMutationOutput> {
        try {
            const result = await this._persistentStorageManager.TaskRepositories.create(taskRepository);

            return {taskRepository: result, error: ""};

            // return {taskRepository: await this._taskRepositories.create(taskRepository), error: ""};
        } catch (err) {
            return {taskRepository: null, error: err.message}
        }
    }

    public async updateTaskRepository(taskRepository: ITaskRepository): Promise<ITaskRepositoryMutationOutput> {
        try {
            // return {taskRepository: await this._taskRepositories.updateRepository(taskRepository), error: ""};
            let row = await this._persistentStorageManager.TaskRepositories.findById(taskRepository.id);

            await row.update(taskRepository);

            row = await this._persistentStorageManager.TaskRepositories.findById(taskRepository.id);

            return {taskRepository: row, error: ""};
        } catch (err) {
            return {taskRepository: null, error: err.message}
        }
    }

    public async deleteTaskRepository(taskRepository: ITaskRepository): Promise<ITaskRepositoryDeleteOutput> {
        try {
            const affectedRowCount = await this._persistentStorageManager.TaskRepositories.destroy({where: {id: taskRepository.id}});

            if (affectedRowCount > 0) {
                return {id: taskRepository.id, error: ""};
            } else {
                return {id: null, error: "Could not delete repository (no error message)"};
            }
        } catch (err) {
            return {id: null, error: err.message}
        }
    }

    public getTaskDefinition(id: string): Promise<ITaskDefinition> {
        return this._persistentStorageManager.TaskDefinitions.findById(id);
    }

    public getTaskDefinitions(): Promise<ITaskDefinition[]> {
        return this._persistentStorageManager.TaskDefinitions.findAll({});
    }

    public async createTaskDefinition(taskDefinition: ITaskDefinition): Promise<ITaskDefinitionMutationOutput> {
        try {
            const result = await this._persistentStorageManager.TaskDefinitions.create(taskDefinition);

            return {taskDefinition: result, error: ""};
        } catch (err) {
            return {taskDefinition: null, error: err.message}
        }
    }

    public async updateTaskDefinition(taskDefinition: ITaskDefinition): Promise<ITaskDefinitionMutationOutput> {
        try {
            // return {taskDefinition: await this._taskDefinitions.updateTaskDefinition(taskDefinition), error: ""};
            let row = await this._persistentStorageManager.TaskDefinitions.findById(taskDefinition.id);

            await row.update(taskDefinition);

            row = await this._persistentStorageManager.TaskDefinitions.findById(taskDefinition.id);

            return {taskDefinition: row, error: ""};
        } catch (err) {
            return {taskDefinition: null, error: err.message}
        }
    }

    public async deleteTaskDefinition(taskDefinition: ITaskDefinition): Promise<ITaskDefinitionDeleteOutput> {
        try {
            const affectedRowCount = await this._persistentStorageManager.TaskDefinitions.destroy({where: {id: taskDefinition.id}});

            if (affectedRowCount > 0) {
                return {id: taskDefinition.id, error: ""};
            } else {
                return {id: null, error: "Could not delete task definition (no error message)"};
            }
        } catch (err) {
            return {id: null, error: err.message}
        }
    }

    public async getScriptStatusForTaskDefinition(taskDefinition: ITaskDefinition): Promise<boolean> {
        const scriptPath = await taskDefinition.getFullScriptPath();

        return fs.existsSync(scriptPath);
    }

    public async getScriptContents(taskDefinitionId: string): Promise<string> {
        const taskDefinition = await this.getTaskDefinition(taskDefinitionId);

        if (taskDefinition) {
            const haveScript = await this.getScriptStatusForTaskDefinition(taskDefinition);

            if (haveScript) {
                const scriptPath = await taskDefinition.getFullScriptPath();

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
}
