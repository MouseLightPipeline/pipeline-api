import {IPipelineServerContext} from "./pipelineServerContext";

const debug = require("debug")("mouselight:pipeline-api:resolvers");

import {ITaskDefinition} from "../data-model/taskDefinition";
import {IPipelineStage} from "../data-model/pipelineStage";
import {IProject, IProjectGridRegion} from "../data-model/project";
import {IPipelineWorker} from "../data-model/pipelineWorker";
import {IPipelineStagePerformance} from "../data-model/pipelineStagePerformance";

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
    name: string;
    description: string;
    rootPath: string;
    sampleNumber: number
    region: IProjectGridRegion;
}

interface ISetActiveStatusArguments {
    id: string;
    shouldBeActive: boolean;
}

interface IPipelinePlaneStatusArguments {
    project_id: string;
    plane: number;
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
            debug(`resolve create project ${args.name}`);
            return context.createProject(args.name, args.description, args.rootPath, args.sampleNumber, args.region);
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
        }
    },
    PipelineStage: {
        performance(stage, _, context: IPipelineServerContext): any {
            return context.getForStage(stage.id);
        },
        task(stage, _, context: IPipelineServerContext): any {
            return context.getTaskDefinition(stage.task_id);
        }
    }
};

export default resolvers;
