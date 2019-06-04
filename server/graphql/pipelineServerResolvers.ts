import {ITaskRepository} from "../data-model/sequelize/taskRepository";

import {
    IPipelineStageDeleteOutput,
    IPipelineStageMutationOutput,
    IProjectDeleteOutput,
    IProjectMutationOutput,
    ITaskDefinitionDeleteOutput,
    ITaskDefinitionMutationOutput,
    ITaskRepositoryDeleteOutput,
    ITaskRepositoryMutationOutput,
    ITilePage,
    IWorkerMutationOutput,
    PipelineServerContext, SchedulerHealth
} from "./pipelineServerContext";
import {ITaskDefinition, ITaskDefinitionAttributes} from "../data-model/sequelize/taskDefinition";
import {IPipelineWorkerAttributes, IPipelineWorker} from "../data-model/sequelize/pipelineWorker";
import {IProjectAttributes, IProjectInput} from "../data-model/sequelize/project";
import {IPipelineStage, IPipelineStageAttributes} from "../data-model/sequelize/pipelineStage";
import {
    IPipelineStageTileCounts,
    IPipelineTile,
    IPipelineTileAttributes
} from "../data-access/sequelize/stageTableConnector";
import {TilePipelineStatus} from "../data-model/TilePipelineStatus";

interface IIdOnlyArgument {
    id: string;
}

interface IUpdateWorkerArguments {
    worker: IPipelineWorkerAttributes;
}

interface ITaskDefinitionIdArguments {
    task_definition_id: string;
}

interface ICreateProjectArguments {
    project: IProjectInput;

}

interface IUpdateProjectArguments {
    project: IProjectInput;
}

interface ICreatePipelineStageArguments {
    pipelineStage: IPipelineStageAttributes;
}

interface IUpdatePipelineStageArguments {
    pipelineStage: IPipelineStageAttributes;
}

interface IMutateRepositoryArguments {
    taskRepository: ITaskRepository;
}

interface IMutateTaskDefinitionArguments {
    taskDefinition: ITaskDefinitionAttributes;
}

interface IPipelinePlaneStatusArguments {
    project_id: string;
    plane: number;
}

interface IActiveWorkerArguments {
    id: string;
    shouldBeInSchedulerPool: boolean;
}

interface ITileStatusArguments {
    pipelineStageId: string;
    status: TilePipelineStatus;
    offset: number;
    limit: number;
}

interface ISetTileStatusArgs {
    pipelineStageId: string;
    tileIds: string[];
    status: TilePipelineStatus;
}

interface IConvertTileStatusArgs {
    pipelineStageId: string;
    currentStatus: TilePipelineStatus;
    desiredStatus: TilePipelineStatus;
}

let resolvers = {
    Query: {
        schedulerHealth(_, __, context: PipelineServerContext): SchedulerHealth {
            return PipelineServerContext.getSchedulerHealth();
        },
        pipelineWorker(_, args: IIdOnlyArgument, context: PipelineServerContext): Promise<IPipelineWorker> {
            return context.getPipelineWorker(args.id);
        },
        pipelineWorkers(_, __, context: PipelineServerContext): Promise<IPipelineWorker[]> {
            return context.getPipelineWorkers();
        },
        project(_, args: IIdOnlyArgument, context: PipelineServerContext): Promise<IProjectAttributes> {
            return context.getProject(args.id);
        },
        projects(_, __, context: PipelineServerContext): Promise<IProjectAttributes[]> {
            return context.getProjects();
        },
        pipelineStage(_, args: IIdOnlyArgument, context: PipelineServerContext): Promise<IPipelineStage> {
            return context.getPipelineStage(args.id);
        },
        pipelineStages(_, __, context: PipelineServerContext): Promise<IPipelineStage[]> {
            return context.getPipelineStages();
        },
        pipelineStagesForProject(_, args: IIdOnlyArgument, context: PipelineServerContext): Promise<IPipelineStage[]> {
            return context.getPipelineStagesForProject(args.id);
        },
        taskDefinition(_, args: IIdOnlyArgument, context: PipelineServerContext): Promise<ITaskDefinitionAttributes> {
            return context.getTaskDefinition(args.id);
        },
        taskDefinitions(_, __, context: PipelineServerContext): Promise<ITaskDefinitionAttributes[]> {
            return context.getTaskDefinitions();
        },
        taskRepository(_, args: IIdOnlyArgument, context: PipelineServerContext): Promise<ITaskRepository> {
            return context.getTaskRepository(args.id);
        },
        taskRepositories(_, __, context: PipelineServerContext): Promise<ITaskRepository[]> {
            return context.getTaskRepositories();
        },
        projectPlaneTileStatus(_, args: IPipelinePlaneStatusArguments, context: PipelineServerContext): Promise<any> {
            return PipelineServerContext.getProjectPlaneTileStatus(args.project_id, args.plane);
        },
        tilesForStage(_, args: ITileStatusArguments, context: PipelineServerContext): Promise<ITilePage> {
            return context.tilesForStage(args.pipelineStageId, args.status, args.offset, args.limit);
        },
        scriptContents(_, args: ITaskDefinitionIdArguments, context: PipelineServerContext): Promise<string> {
            return context.getScriptContents(args.task_definition_id);
        },
        pipelineVolume(): string {
            return process.env.PIPELINE_VOLUME || "";
        }
    },
    Mutation: {
        createProject(_, args: ICreateProjectArguments, context: PipelineServerContext): Promise<IProjectMutationOutput> {
            return context.createProject(args.project);
        },
        updateProject(_, args: IUpdateProjectArguments, context: PipelineServerContext): Promise<IProjectMutationOutput> {
            return context.updateProject(args.project);
        },
        duplicateProject(_, args: IIdOnlyArgument, context: PipelineServerContext): Promise<IProjectMutationOutput> {
            return context.duplicateProject(args.id);
        },
        archiveProject(_, args: IIdOnlyArgument, context: PipelineServerContext): Promise<IProjectDeleteOutput> {
            return context.archiveProject(args.id);
        },
        createPipelineStage(_, args: ICreatePipelineStageArguments, context: PipelineServerContext): Promise<IPipelineStageMutationOutput> {
            return context.createPipelineStage(args.pipelineStage);
        },
        updatePipelineStage(_, args: IUpdatePipelineStageArguments, context: PipelineServerContext): Promise<IPipelineStageMutationOutput> {
            return context.updatePipelineStage(args.pipelineStage);
        },
        archivePipelineStage(_, args: IIdOnlyArgument, context: PipelineServerContext): Promise<IPipelineStageDeleteOutput> {
            return context.archivePipelineStage(args.id);
        },
        createTaskRepository(_, args: IMutateRepositoryArguments, context: PipelineServerContext): Promise<ITaskRepositoryMutationOutput> {
            return context.createTaskRepository(args.taskRepository);
        },
        updateTaskRepository(_, args: IMutateRepositoryArguments, context: PipelineServerContext): Promise<ITaskRepositoryMutationOutput> {
            return context.updateTaskRepository(args.taskRepository);
        },
        archiveTaskRepository(_, args: IIdOnlyArgument, context: PipelineServerContext): Promise<ITaskRepositoryDeleteOutput> {
            return context.archiveTaskRepository(args.id);
        },
        createTaskDefinition(_, args: IMutateTaskDefinitionArguments, context: PipelineServerContext): Promise<ITaskDefinitionMutationOutput> {
            return context.createTaskDefinition(args.taskDefinition);
        },
        updateTaskDefinition(_, args: IMutateTaskDefinitionArguments, context: PipelineServerContext): Promise<ITaskDefinitionMutationOutput> {
            return context.updateTaskDefinition(args.taskDefinition);
        },
        duplicateTaskDefinition(_, args: IIdOnlyArgument, context: PipelineServerContext): Promise<ITaskDefinitionMutationOutput> {
            return context.duplicateTask(args.id);
        },
        archiveTaskDefinition(_, args: IIdOnlyArgument, context: PipelineServerContext): Promise<ITaskDefinitionDeleteOutput> {
            return context.archiveTaskDefinition(args.id);
        },
        updateWorker(_, args: IUpdateWorkerArguments, context: PipelineServerContext): Promise<IWorkerMutationOutput> {
            return context.updateWorker(args.worker);
        },
        setWorkerAvailability(_, args: IActiveWorkerArguments, context: PipelineServerContext) {
            return context.setWorkerAvailability(args.id, args.shouldBeInSchedulerPool);
        },
        setTileStatus(_, args: ISetTileStatusArgs, context: PipelineServerContext): Promise<IPipelineTileAttributes[]> {
            return context.setTileStatus(args.pipelineStageId, args.tileIds, args.status);
        },
        convertTileStatus(_, args: IConvertTileStatusArgs, context: PipelineServerContext): Promise<IPipelineTileAttributes[]> {
            return context.convertTileStatus(args.pipelineStageId, args.currentStatus, args.desiredStatus);
        }
    },
    Project: {
        stages(project, _, context: PipelineServerContext): any {
            return context.getPipelineStagesForProject(project.id);
        },
        dashboard_json_status(project: IProjectAttributes, _, context: PipelineServerContext): boolean {
            return PipelineServerContext.getDashboardJsonStatusForProject(project);
        }
    },
    PipelineStage: {
        task(stage, _, context: PipelineServerContext): any {
            return context.getTaskDefinition(stage.task_id);
        },
        project(stage, _, context: PipelineServerContext): any {
            return context.getProject(stage.project_id);
        },
        previous_stage(stage, _, context: PipelineServerContext): Promise<IPipelineStageAttributes> {
            return context.getPipelineStage(stage.previous_stage_id);
        },
        child_stages(stage, _, context: PipelineServerContext): Promise<IPipelineStage[]> {
            return context.getPipelineStageChildren(stage.id);
        },
        tile_status(stage, _, context: PipelineServerContext): Promise<IPipelineStageTileCounts> {
            return context.getPipelineStageTileStatus(stage.id);
        }
    },
    TaskRepository: {
        task_definitions(repository: ITaskRepository, _, context: PipelineServerContext): any {
            return context.getRepositoryTasks(repository.id);
        }
    },
    TaskDefinition: {
        task_repository(taskDefinition: ITaskDefinition, _, context: PipelineServerContext): any {
            if (taskDefinition.task_repository_id) {
                return context.getTaskRepository(taskDefinition.task_repository_id);
            }

            return null;
        },
        pipeline_stages(taskDefinition: ITaskDefinition, _, context: PipelineServerContext): any {
            return context.getPipelineStagesForTaskDefinition(taskDefinition.id);
        },
        script_status(taskDefinition: ITaskDefinition, _, context: PipelineServerContext): any {
            return PipelineServerContext.getScriptStatusForTaskDefinition(taskDefinition);
        }
    },
    TaskExecution: {
        task_definition(taskExecution, _, context: PipelineServerContext) {
            return context.getTaskDefinition(taskExecution.task_definition_id);
        }
    }
};

export default resolvers;
