const debug = require("debug")("mouselight:pipeline-api:resolvers");

import {ITaskDefinition} from "../data-model/taskDefinition";
import {IPipelineStage} from "../data-model/pipelineStage";
import {IProject, IProjectInput} from "../data-model/project";
import {IPipelineWorker} from "../data-model/pipelineWorker";
import {IPipelineStagePerformance} from "../data-model/pipelineStagePerformance";
import {ITaskRepository} from "../data-model/taskRepository";
import {
    IPipelineServerContext, ITaskDefinitionDeleteOutput, ITaskDefinitionMutationOutput, ITaskRepositoryDeleteOutput,
    ITaskRepositoryMutationOutput
} from "./pipelineServerContext";

interface IIdOnlyArgument {
    id: string;
}

interface IIncludeSoftDeleteArgument {
    includeDeleted: boolean;
}

interface ICreatePipelineStageArguments {
    name: string;
    description: string;
    project_id: string;
    task_id: string;
    previous_stage_id: string;
    dst_path: string;
    function_type: number;
}

interface ICreateProjectArguments {
    project: IProjectInput;

}

interface IUpdateProjectArguments {
    project: IProjectInput;
}

interface IMutateRepositoryArguments {
    taskRepository: ITaskRepository;
}

interface IMutateTaskDefinitionArguments {
    taskDefinition: ITaskDefinition;
}

interface ISetActiveStatusArguments {
    id: string;
    shouldBeActive: boolean;
}

interface IPipelinePlaneStatusArguments {
    project_id: string;
    plane: number;
}

interface IActiveWorkerArguments {
    id: string;
    shouldBeInSchedulerPool: boolean;
}

let resolvers = {
    Query: {
        pipelineWorker(_, args: IIdOnlyArgument, context: IPipelineServerContext): Promise<IPipelineWorker> {
            return context.getPipelineWorker(args.id);
        },
        pipelineWorkers(_, __, context: IPipelineServerContext): Promise<IPipelineWorker[]> {
            return context.getPipelineWorkers();
        },
        project(_, args: IIdOnlyArgument, context: IPipelineServerContext): Promise<IProject> {
            return context.getProject(args.id);
        },
        projects(_, args: IIncludeSoftDeleteArgument, context: IPipelineServerContext): Promise<IProject[]> {
            return context.getProjects(args.includeDeleted);
        },
        pipelineStage(_, args: IIdOnlyArgument, context: IPipelineServerContext): Promise<IPipelineStage> {
            return context.getPipelineStage(args.id);
        },
        pipelineStages(_, __, context: IPipelineServerContext): Promise<IPipelineStage[]> {
            return context.getPipelineStages();
        },
        pipelineStagesForProject(_, args: IIdOnlyArgument, context: IPipelineServerContext): Promise<IPipelineStage[]> {
            return context.getPipelineStagesForProject(args.id);
        },
        taskDefinition(_, args: IIdOnlyArgument, context: IPipelineServerContext): Promise<ITaskDefinition> {
            return context.getTaskDefinition(args.id);
        },
        taskDefinitions(_, __, context: IPipelineServerContext): Promise<ITaskDefinition[]> {
            return context.getTaskDefinitions();
        },
        taskRepository(_, args: IIdOnlyArgument, context: IPipelineServerContext): Promise<ITaskRepository> {
            return context.getTaskRepository(args.id);
        },
        taskRepositories(_, __, context: IPipelineServerContext): Promise<ITaskRepository[]> {
            return context.getTaskRepositories();
        },
        pipelineStagePerformance(_, args: IIdOnlyArgument, context: IPipelineServerContext): Promise<IPipelineStagePerformance> {
            return context.getPipelineStagePerformance(args.id);
        },
        pipelineStagePerformances(_, __, context: IPipelineServerContext): Promise<IPipelineStagePerformance[]> {
            return context.getPipelineStagePerformances();
        },
        projectPlaneTileStatus(_, args: IPipelinePlaneStatusArguments, context: IPipelineServerContext): Promise<any> {
            return context.getProjectPlaneTileStatus(args.project_id, args.plane);
        }
    },
    Mutation: {
        createProject(_, args: ICreateProjectArguments, context: IPipelineServerContext): Promise<IProject> {
            debug(`resolve create project ${args.project.name}`);
            return context.createProject(args.project);
        },
        updateProject(_, args: IUpdateProjectArguments, context: IPipelineServerContext): Promise<IProject> {
            return context.updateProject(args.project);
        },
        setProjectStatus(_, args: ISetActiveStatusArguments, context: IPipelineServerContext) {
            return context.setProjectStatus(args.id, args.shouldBeActive);
        },
        deleteProject(_, args: IIdOnlyArgument, context: IPipelineServerContext) {
            return context.deleteProject(args.id);
        },
        createPipelineStage(_, args: ICreatePipelineStageArguments, context: IPipelineServerContext): Promise<IPipelineStage> {
            debug(`resolve create pipeline stage for project ${args.project_id}`);
            return context.createPipelineStage(args.name, args.description, args.project_id, args.task_id, args.previous_stage_id, args.dst_path, args.function_type);
        },
        setPipelineStageStatus(_, args: ISetActiveStatusArguments, context: IPipelineServerContext) {
            return context.setPipelineStageStatus(args.id, args.shouldBeActive);
        },
        deletePipelineStage(_, args: IIdOnlyArgument, context: IPipelineServerContext) {
            return context.deletePipelineStage(args.id);
        },
        createTaskRepository(_, args: IMutateRepositoryArguments, context: IPipelineServerContext): Promise<ITaskRepositoryMutationOutput> {
            return context.createTaskRepository(args.taskRepository);
        },
        updateTaskRepository(_, args: IMutateRepositoryArguments, context: IPipelineServerContext): Promise<ITaskRepositoryMutationOutput> {
            return context.updateTaskRepository(args.taskRepository);
        },
        deleteTaskRepository(_, args: IMutateRepositoryArguments, context: IPipelineServerContext): Promise<ITaskRepositoryDeleteOutput> {
            return context.deleteTaskRepository(args.taskRepository);
        },
        createTaskDefinition(_, args: IMutateTaskDefinitionArguments, context: IPipelineServerContext): Promise<ITaskDefinitionMutationOutput> {
            return context.createTaskDefinition(args.taskDefinition);
        },
        updateTaskDefinition(_, args: IMutateTaskDefinitionArguments, context: IPipelineServerContext): Promise<ITaskDefinitionMutationOutput> {
            return context.updateTaskDefinition(args.taskDefinition);
        },
        deleteTaskDefinition(_, args: IMutateTaskDefinitionArguments, context: IPipelineServerContext): Promise<ITaskDefinitionDeleteOutput> {
            return context.deleteTaskDefinition(args.taskDefinition);
        },
        setWorkerAvailability(_, args: IActiveWorkerArguments, context: IPipelineServerContext) {
            return context.setWorkerAvailability(args.id, args.shouldBeInSchedulerPool);
        }
    },
    Project: {
        stages(project, _, context: IPipelineServerContext): any {
            return context.getPipelineStagesForProject(project.id);
        }
    },
    PipelineStage: {
        performance(stage, _, context: IPipelineServerContext): any {
            return context.getForStage(stage.id);
        },
        task(stage, _, context: IPipelineServerContext): any {
            return context.getTaskDefinition(stage.task_id);
        },
        project(stage, _, context: IPipelineServerContext): any {
            return context.getProject(stage.project_id);
        },
        previous_stage(stage, _, context: IPipelineServerContext): any {
            return context.getPipelineStage(stage.previous_stage_id);
        }
    },
    TaskRepository: {
        task_definitions(repository: ITaskRepository, _, context: IPipelineServerContext): any {
            return context.getRepositoryTasks(repository.id);
        }
    },
    TaskDefinition: {
        task_repository(taskDefinition: ITaskDefinition, _, context: IPipelineServerContext): any {
            if (taskDefinition.task_repository_id) {
                return context.getTaskRepository(taskDefinition.task_repository_id);
            }

            return null;
        },
        pipeline_stages(taskDefinition: ITaskDefinition, _, context: IPipelineServerContext): any {
          return context.getPipelineStagesForTaskDefinition(taskDefinition.id);
        }
    }
};

export default resolvers;
