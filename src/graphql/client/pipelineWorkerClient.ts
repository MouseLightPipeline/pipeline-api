import ApolloClient, {createNetworkInterface} from "apollo-client";
import gql from "graphql-tag";
import "isomorphic-fetch";

const debug = require("debug")("mouselight:pipeline-api:pipeline-worker-client");

import {IPipelineWorker} from "../../data-model/pipelineWorker";
import {ITaskExecution} from "../../schedulers/pipelineScheduler";

export class PipelineWorkerClient {
    private static _instance: PipelineWorkerClient = null;

    public static Instance(): PipelineWorkerClient {
        if (PipelineWorkerClient._instance === null) {
            PipelineWorkerClient._instance = new PipelineWorkerClient();
        }

        return PipelineWorkerClient._instance;
    }

    private _idClientMap = new Map<string, ApolloClient>();

    public async queryTaskExecution(workerId: string, executionId: string): Promise<ITaskExecution> {
        let client = this._idClientMap[workerId];

        if (client == null) {
            const networkInterface = createNetworkInterface({uri: `http://localhost:3001/graphql`});

            client = new ApolloClient({
                networkInterface
            });

            this._idClientMap[workerId] = client;
        }

        try {

            let response = await client.query({
                query: gql`
                query($id: String!) {
                    taskExecution(id: $id) {
                        id
                        last_process_status_code
                        completion_status_code
                        execution_status_code
                        completed_at
                    }
                }`,
                variables: {
                    id: executionId
                },
                forceFetch: true
            });

            return response.data.taskExecution;
        } catch (err) {
            debug(err);
        }

        return null;
    }

    public async startTaskExecution(worker: IPipelineWorker, taskId: string, baseArgs: string[] = []): Promise<ITaskExecution> {
        let client = this._idClientMap[worker.id];

        if (client == null) {
            const networkInterface = createNetworkInterface({uri: `http://localhost:3001/graphql`});

            client = new ApolloClient({
                networkInterface
            });

            this._idClientMap[worker.id] = client;
        }

        try {
            let response = await client.mutate({
                mutation: gql`
                mutation startTask($taskId: String!, $args: [String!]) {
                    startTask(taskDefinitionId: $taskId, scriptArgs: $args) {
                        id
                        last_process_status_code
                        completion_status_code
                        execution_status_code
                        completed_at
                    }
                }`,
                variables: {
                    taskId: taskId,
                    args: baseArgs
                }
            });

            return response.data.startTask;
        } catch (err) {
            debug(err)
        }

        return null;
    }
}