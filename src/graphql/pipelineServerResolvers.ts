import {IPipelineServerContext} from "./pipelineServerContext";

const debug = require("debug")("mouselight:pipeline-api:resolvers");

import {ITaskDefinition} from "../data-model/taskDefinition";
import {IPipelineStage} from "../data-model/pipelineStage";
import {IProject} from "../data-model/project";
import {ITaskStatistic} from "../data-model/taskStatistic";
import {IPipelineWorker} from "../data-model/pipelineWorker";

interface IIdOnlyArgument {
    id: string;
}

interface IIncludeSoftDeleteArgument {
    includeDeleted: boolean;
}

interface IDebugMessageArguments {
    msg: string;
}

interface ICreateProjectArguments {
    name: string;
    description: string;
    rootPath: string;
    sampleNumber: number
}

interface ISetProjectStatusArguments {
    id: string;
    shouldBeActive: boolean;
}

let resolvers = {
    Query: {
        pipelineWorker(_, args: IIdOnlyArgument, context: IPipelineServerContext): Promise<IPipelineWorker> {
            debug("get worker for id");
            return context.getPipelineWorker(args.id);
        },
        pipelineWorkers(_, __, context: IPipelineServerContext): Promise<IPipelineWorker[]> {
            debug("get all workers");
            return context.getPipelineWorkers();
        },
        project(_, args: IIdOnlyArgument, context: IPipelineServerContext): Promise<IProject> {
            debug("get project for id");
            return context.getProject(args.id);
        },
        projects(_, args: IIncludeSoftDeleteArgument, context: IPipelineServerContext): Promise<IProject[]> {
            debug("get all projects");
            return context.getProjects(args.includeDeleted);
        },
        pipelineStage(_, args: IIdOnlyArgument, context: IPipelineServerContext): Promise<IPipelineStage> {
            debug("get pipeline stage for id");
            return context.getPipelineStage(args.id);
        },
        pipelineStages(_, __, context: IPipelineServerContext): Promise<IPipelineStage[]> {
            debug("get all pipeline stages");
            return context.getPipelineStages();
        },
        taskDefinition(_, args: IIdOnlyArgument, context: IPipelineServerContext): Promise<ITaskDefinition> {
            debug("get task definition for id");
            return context.getTaskDefinition(args.id);
        },
        taskDefinitions(_, __, context: IPipelineServerContext): Promise<ITaskDefinition[]> {
            debug("get all task definitions");
            return context.getTaskDefinitions();
        },
        taskStatistic(_, args: IIdOnlyArgument, context: IPipelineServerContext): Promise<ITaskStatistic> {
            debug("get task statistic for id");
            return context.getTaskStatistic(args.id);
        },
        taskStatistics(_, __, context: IPipelineServerContext): Promise<ITaskStatistic[]> {
            debug("get all task statistics");
            return context.getTaskStatistics();
        }
    },
    Mutation: {
        debugMessage(_, args: IDebugMessageArguments): string {
            debug(`debug message: ${args.msg}`);
            return "OK";
        },
        createProject(_, args: ICreateProjectArguments, context: IPipelineServerContext): Promise<IProject> {
            return context.createProject(args.name, args.description, args.rootPath, args.sampleNumber);
        },
        setProjectStatus(_, args: ISetProjectStatusArguments, context: IPipelineServerContext) {
            return context.setProjectStatus(args.id, args.shouldBeActive);
        },
        deleteProject(_, args: IIdOnlyArgument, context: IPipelineServerContext) {
            debug(`delete project id ${args.id}`);
            return context.deleteProject(args.id);
        }
    }
};

export default resolvers;
