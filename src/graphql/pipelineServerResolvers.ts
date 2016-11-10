import {IPipelineServerContext} from "./pipelineServerContext";

const debug = require("debug")("mouselight:pipeline-api:resolvers");

import {ITaskDefinition} from "../data-model/taskDefinition";
import {IPipelineStage} from "../data-model/pipelineStage";
import {IProject} from "../data-model/project";
import {ITaskStatistic} from "../data-model/taskStatistic";
import {IWorker} from "../data-model/worker";

interface IDebugMessageArguments {
    msg: string;
}

interface IGetWorker {
    id: string;
}

interface IGetProject {
    id: string;
}

interface IGetPipelineStage {
    id: string;
}

interface IGetTaskDefinition {
    id: string;
}

interface IGetTaskStatistic {
    id: string;
}

let resolvers = {
    Query: {
        worker(_, args: IGetWorker, context: IPipelineServerContext): Promise<IWorker> {
            debug("get worker for id");
            return context.getWorker(args.id);
        },
        workers(_, __, context: IPipelineServerContext): Promise<IWorker[]> {
            debug("get all workers");
            return context.getWorkers();
        },
        project(_, args: IGetProject, context: IPipelineServerContext): Promise<IProject> {
            debug("get project for id");
            return context.getProject(args.id);
        },
        projects(_, __, context: IPipelineServerContext): Promise<IProject[]> {
            debug("get all projects");
            return context.getProjects();
        },
        pipelineStage(_, args: IGetPipelineStage, context: IPipelineServerContext): Promise<IPipelineStage> {
            debug("get pipeline stage for id");
            return context.getPipelineStage(args.id);
        },
        pipelineStages(_, __, context: IPipelineServerContext): Promise<IPipelineStage[]> {
            debug("get all pipeline stages");
            return context.getPipelineStages();
        },
        taskDefinition(_, args: IGetTaskDefinition, context: IPipelineServerContext): Promise<ITaskDefinition> {
            debug("get task definition for id");
            return context.getTaskDefinition(args.id);
        },
        taskDefinitions(_, __, context: IPipelineServerContext): Promise<ITaskDefinition[]> {
            debug("get all task definitions");
            return context.getTaskDefinitions();
        },
        taskStatistic(_, args: IGetTaskStatistic, context: IPipelineServerContext): Promise<ITaskStatistic> {
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
        }
    }
};

export default resolvers;
