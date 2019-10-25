import {GraphQLScalarType} from "graphql";
import {Kind} from "graphql/language";

import {
    ITilePage,
    IWorkerMutationOutput,
    PipelineServerContext, SchedulerHealth
} from "./pipelineServerContext";
import {TaskRepository, ITaskRepositoryInput} from "../data-model/sequelize/taskRepository";
import {TaskDefinition, ITaskDefinitionInput} from "../data-model/sequelize/taskDefinition";
import {PipelineWorker, IPipelineWorkerInput} from "../data-model/sequelize/pipelineWorker";
import {Project, IProjectInput} from "../data-model/sequelize/project";
import {PipelineStage, PipelineStageCreateInput, PipelineStageUpdateInput} from "../data-model/sequelize/pipelineStage";
import {IPipelineStageTileCounts, PipelineTile} from "../data-access/sequelize/stageTableConnector";
import {TilePipelineStatus} from "../data-model/TilePipelineStatus";
import {TaskExecution} from "../data-model/taskExecution";

interface IIdOnlyArgument {
    id: string;
}

interface IUpdateWorkerArguments {
    worker: IPipelineWorkerInput;
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
    pipelineStage: PipelineStageCreateInput;
}

interface IUpdatePipelineStageArguments {
    pipelineStage: PipelineStageUpdateInput;
}

interface IMutateRepositoryArguments {
    taskRepository: ITaskRepositoryInput;
}

interface IMutateTaskDefinitionArguments {
    taskDefinition: ITaskDefinitionInput;
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

interface IStopTaskExecutionArguments {
    pipelineStageId: string;
    taskExecutionId: string;
}

export type MutationOutput<T> = {
    source: T;
    error: string | null;
}

export type ArchiveMutationOutput = {
    id: string;
    error: string | null;
}

export const resolvers = {
    Query: {
        schedulerHealth(_, __, context: PipelineServerContext): SchedulerHealth {
            return PipelineServerContext.getSchedulerHealth();
        },
        // Workers
        pipelineWorker(_, args: IIdOnlyArgument, context: PipelineServerContext): Promise<PipelineWorker> {
            return context.getPipelineWorker(args.id);
        },
        pipelineWorkers(_, __, context: PipelineServerContext): Promise<PipelineWorker[]> {
            return context.getPipelineWorkers();
        },
        // Projects
        projects(_, __, context: PipelineServerContext): Promise<Project[]> {
            return Project.findAll({order: [["sample_number", "ASC"], ["name", "ASC"]]});
        },
        project(_, args: IIdOnlyArgument, context: PipelineServerContext): Promise<Project> {
            return Project.findByPk(args.id);
        },
        // Stages
        pipelineStage(_, args: IIdOnlyArgument, context: PipelineServerContext): Promise<PipelineStage> {
            return PipelineStage.findByPk(args.id);
        },
        pipelineStages(_, __, context: PipelineServerContext): Promise<PipelineStage[]> {
            return PipelineStage.getAll();
        },
        // Tasks
        taskDefinition(_, args: IIdOnlyArgument, context: PipelineServerContext): Promise<TaskDefinition> {
            return TaskDefinition.findByPk(args.id);
        },
        taskDefinitions(_, __, context: PipelineServerContext): Promise<TaskDefinition[]> {
            return TaskDefinition.getAll();
        },
        taskRepository(_, args: IIdOnlyArgument, context: PipelineServerContext): Promise<TaskRepository> {
            return TaskRepository.findByPk(args.id);
        },
        taskRepositories(_, __, context: PipelineServerContext): Promise<TaskRepository[]> {
            return TaskRepository.findAll({order: [["name", "ASC"]]});
        },
        // General
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
        // Projects
        createProject(_, args: ICreateProjectArguments, context: PipelineServerContext): Promise<MutationOutput<Project>> {
            return Project.createProject(args.project);
        },
        updateProject(_, args: IUpdateProjectArguments, context: PipelineServerContext): Promise<MutationOutput<Project>> {
            return Project.findAndUpdateProject(args.project);
        },
        duplicateProject(_, args: IIdOnlyArgument, context: PipelineServerContext): Promise<MutationOutput<Project>> {
            return Project.duplicateProject(args.id);
        },
        archiveProject(_, args: IIdOnlyArgument, context: PipelineServerContext): Promise<ArchiveMutationOutput> {
            return Project.archiveProject(args.id);
        },
        // Stages
        createPipelineStage(_, args: ICreatePipelineStageArguments, context: PipelineServerContext): Promise<MutationOutput<PipelineStage>> {
            return PipelineStage.createPipelineStage(args.pipelineStage);
        },
        updatePipelineStage(_, args: IUpdatePipelineStageArguments, context: PipelineServerContext): Promise<MutationOutput<PipelineStage>> {
            return PipelineStage.updatePipelineStage(args.pipelineStage);
        },
        archivePipelineStage(_, args: IIdOnlyArgument, context: PipelineServerContext): Promise<ArchiveMutationOutput> {
            return PipelineStage.archivePipelineStage(args.id);
        },
        // Repositories
        createTaskRepository(_, args: IMutateRepositoryArguments, context: PipelineServerContext): Promise<MutationOutput<TaskRepository>> {
            return TaskRepository.createTaskRepository(args.taskRepository);
        },
        updateTaskRepository(_, args: IMutateRepositoryArguments, context: PipelineServerContext): Promise<MutationOutput<TaskRepository>> {
            return TaskRepository.updateTaskRepository(args.taskRepository);
        },
        archiveTaskRepository(_, args: IIdOnlyArgument, context: PipelineServerContext): Promise<ArchiveMutationOutput> {
            return TaskRepository.archiveTaskRepository(args.id);
        },
        // Task Definitions
        createTaskDefinition(_, args: IMutateTaskDefinitionArguments, context: PipelineServerContext): Promise<MutationOutput<TaskDefinition>> {
            return TaskDefinition.createTaskDefinition(args.taskDefinition);
        },
        updateTaskDefinition(_, args: IMutateTaskDefinitionArguments, context: PipelineServerContext): Promise<MutationOutput<TaskDefinition>> {
            return TaskDefinition.updateTaskDefinition(args.taskDefinition);
        },
        duplicateTaskDefinition(_, args: IIdOnlyArgument, context: PipelineServerContext): Promise<MutationOutput<TaskDefinition>> {
            return TaskDefinition.duplicateTask(args.id);
        },
        archiveTaskDefinition(_, args: IIdOnlyArgument, context: PipelineServerContext): Promise<ArchiveMutationOutput> {
            return TaskDefinition.archiveTaskDefinition(args.id);
        },
        // Workers
        updateWorker(_, args: IUpdateWorkerArguments, context: PipelineServerContext): Promise<IWorkerMutationOutput> {
            return context.updateWorker(args.worker);
        },
        setWorkerAvailability(_, args: IActiveWorkerArguments, context: PipelineServerContext) {
            return context.setWorkerAvailability(args.id, args.shouldBeInSchedulerPool);
        },
        setTileStatus(_, args: ISetTileStatusArgs, context: PipelineServerContext): Promise<PipelineTile[]> {
            return context.setTileStatus(args.pipelineStageId, args.tileIds, args.status);
        },
        convertTileStatus(_, args: IConvertTileStatusArgs, context: PipelineServerContext): Promise<PipelineTile[]> {
            return context.convertTileStatus(args.pipelineStageId, args.currentStatus, args.desiredStatus);
        },
        stopTaskExecution(_, args: IStopTaskExecutionArguments, context: PipelineServerContext): Promise<TaskExecution> {
            return context.stopTaskExecution(args.pipelineStageId, args.taskExecutionId);
        },
        removeTaskExecution(_, args: IStopTaskExecutionArguments, context: PipelineServerContext): Promise<boolean> {
            return context.removeTaskExecution(args.pipelineStageId, args.taskExecutionId);
        }
    },
    Project: {
        stages(project: Project, _, context: PipelineServerContext): Promise<PipelineStage[]> {
            return project.getStages();
        }
    },
    PipelineStage: {
        task(stage: PipelineStage, _, context: PipelineServerContext): any {
            return stage.getTaskDefinition();
        },
        project(stage: PipelineStage, _, context: PipelineServerContext): any {
            return stage.getProject();
        },
        previous_stage(stage: PipelineStage, _, context: PipelineServerContext): Promise<PipelineStage> {
            return PipelineStage.findByPk(stage.previous_stage_id);
        },
        child_stages(stage: PipelineStage, _, context: PipelineServerContext): Promise<PipelineStage[]> {
            return stage.getChildStages();
        },
        tile_status(stage: PipelineStage, _, context: PipelineServerContext): Promise<IPipelineStageTileCounts> {
            return context.getPipelineStageTileStatus(stage.id);
        }
    },
    TaskRepository: {
        task_definitions(repository: TaskRepository, _, context: PipelineServerContext): any {
            return repository.getTasks();
        }
    },
    TaskDefinition: {
        task_repository(taskDefinition: TaskDefinition, _, context: PipelineServerContext): any {
            return taskDefinition.getTaskRepository();
        },
        pipeline_stages(taskDefinition: TaskDefinition, _, context: PipelineServerContext): Promise<PipelineStage[]> {
            return taskDefinition.getStages();
        },
        script_status(taskDefinition: TaskDefinition, _, context: PipelineServerContext): any {
            return PipelineServerContext.getScriptStatusForTaskDefinition(taskDefinition);
        }
    },
    TaskExecution: {
        task_definition(taskExecution, _, context: PipelineServerContext) {
            return TaskDefinition.findByPk(taskExecution.task_definition_id);
        }
    },
    Date: new GraphQLScalarType({
        name: "Date",
        description: "Date custom scalar type",
        parseValue: (value) => {
            return new Date(value); // value from the client
        },
        serialize: (value) => {
            return value.getTime(); // value sent to the client
        },
        parseLiteral: (ast) => {
            if (ast.kind === Kind.INT) {
                return parseInt(ast.value, 10); // ast value is always in string format
            }
            return null;
        },
    })
};
