import {IPipelineServerContext} from "./pipelineServerContext";

const debug = require("debug")("mouselight:pipeline-api:resolvers");

import {ITaskDefinition} from "../data-model/taskDefinition";

interface IDebugMessageArguments {
    msg: string;
}

interface IGetTaskDefinition {
    id: string;
}

let resolvers = {
    Query: {
        taskDefinitions(_, __, context: IPipelineServerContext): Promise<ITaskDefinition[]> {
            debug("get all task definitions");
            return context.taskManager.getTaskDefinitions();
        },
        taskDefinition(_, args: IGetTaskDefinition, context: IPipelineServerContext): Promise<ITaskDefinition> {
            debug("get task definition for id");
            return context.taskManager.getTaskDefinition(args.id);
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
