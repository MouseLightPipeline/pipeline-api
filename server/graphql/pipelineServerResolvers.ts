import {GraphQLScalarType} from "graphql";
import {Kind} from "graphql/language";

import {ITilePage, PipelineServerContext} from "./pipelineServerContext";
import {TaskRepository, ITaskRepositoryInput} from "../data-model/system/taskRepository";
import {TaskDefinition, ITaskDefinitionInput} from "../data-model/system/taskDefinition";
import {PipelineWorker, IPipelineWorkerInput} from "../data-model/system/pipelineWorker";
import {Project, IProjectInput} from "../data-model/system/project";
import {PipelineStage, PipelineStageCreateInput, PipelineStageUpdateInput} from "../data-model/system/pipelineStage";
import {TilePipelineStatus} from "../data-model/activity/TilePipelineStatus";
import {TaskExecution} from "../data-model/activity/taskExecution";
import {SchedulerHealth, SchedulerHealthService} from "../services/schedulerHealthService";
import {ArchiveMutationOutput, MutationOutput} from "../data-model/mutationTypes";
import {IPipelineStageTileCounts, PipelineTile} from "../data-model/activity/pipelineTile";

interface IIdOnlyArgument {
    id: string;
}

interface IUpdateWorkerArguments {
    worker: IPipelineWorkerInput;
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

interface ITaskDefinitionIdArguments {
    task_definition_id: string;
}

interface IPipelinePlaneStatusArguments {
    project_id: string;
    plane: number;
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

export const resolvers = {
    Query: {
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
        // Tasks Repositories
        taskRepository(_, args: IIdOnlyArgument, context: PipelineServerContext): Promise<TaskRepository> {
            return TaskRepository.findByPk(args.id);
        },
        taskRepositories(_, __, context: PipelineServerContext): Promise<TaskRepository[]> {
            return TaskRepository.findAll({order: [["name", "ASC"]]});
        },
        // Tasks Definitions
        taskDefinition(_, args: IIdOnlyArgument, context: PipelineServerContext): Promise<TaskDefinition> {
            return TaskDefinition.findByPk(args.id);
        },
        taskDefinitions(_, __, context: PipelineServerContext): Promise<TaskDefinition[]> {
            return TaskDefinition.getAll();
        },
        scriptContents(_, args: ITaskDefinitionIdArguments, context: PipelineServerContext): Promise<string> {
            return TaskDefinition.getScriptContents(args.task_definition_id);
        },
        // Workers
        pipelineWorker(_, args: IIdOnlyArgument, context: PipelineServerContext): Promise<PipelineWorker> {
            return PipelineWorker.findByPk(args.id);
        },
        pipelineWorkers(_, __, context: PipelineServerContext): Promise<PipelineWorker[]> {
            return PipelineWorker.findAll({});
        },
        // Scheduler
        schedulerHealth(_, __, context: PipelineServerContext): SchedulerHealth {
            return SchedulerHealthService.Instance.CurrentHealth;
        },
        // General
        projectPlaneTileStatus(_, args: IPipelinePlaneStatusArguments, context: PipelineServerContext): Promise<any> {
            return PipelineServerContext.getProjectPlaneTileStatus(args.project_id, args.plane);
        },
        tilesForStage(_, args: ITileStatusArguments, context: PipelineServerContext): Promise<ITilePage> {
            return context.tilesForStage(args.pipelineStageId, args.status, args.offset, args.limit);
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
        // Task Repositories
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
        updateWorker(_, args: IUpdateWorkerArguments, context: PipelineServerContext): Promise<MutationOutput<PipelineWorker>> {
            return PipelineWorker.updateWorker(args.worker);
        },
        // Task Executions
        stopTaskExecution(_, args: IStopTaskExecutionArguments, context: PipelineServerContext): Promise<TaskExecution> {
            return context.stopTaskExecution(args.pipelineStageId, args.taskExecutionId);
        },
        removeTaskExecution(_, args: IStopTaskExecutionArguments, context: PipelineServerContext): Promise<boolean> {
            return context.removeTaskExecution(args.pipelineStageId, args.taskExecutionId);
        },
        // Tiles
        setTileStatus(_, args: ISetTileStatusArgs, context: PipelineServerContext): Promise<PipelineTile[]> {
            return context.setTileStatus(args.pipelineStageId, args.tileIds, args.status);
        },
        convertTileStatus(_, args: IConvertTileStatusArgs, context: PipelineServerContext): Promise<PipelineTile[]> {
            return context.convertTileStatus(args.pipelineStageId, args.currentStatus, args.desiredStatus);
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
        task_definitions(repository: TaskRepository, _, context: PipelineServerContext): Promise<TaskDefinition[]> {
            return repository.getTasks();
        }
    },
    TaskDefinition: {
        task_repository(taskDefinition: TaskDefinition, _, context: PipelineServerContext): Promise<TaskRepository> {
            return taskDefinition.getTaskRepository();
        },
        pipeline_stages(taskDefinition: TaskDefinition, _, context: PipelineServerContext): Promise<PipelineStage[]> {
            return taskDefinition.getStages();
        },
        script_status(taskDefinition: TaskDefinition, _, context: PipelineServerContext): Promise<boolean> {
            return taskDefinition.script_status();
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
