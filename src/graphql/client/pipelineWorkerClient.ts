import ApolloClient, {createNetworkInterface} from "apollo-client";
import gql from "graphql-tag";
import "isomorphic-fetch";

const debug = require("debug")("mouselight:pipeline-api:pipeline-worker-client");

import {IPipelineWorker, PipelineWorkerStatus, PipelineWorkers} from "../../data-model/pipelineWorker";
import {ITaskExecution} from "../../data-model/taskExecution";
import {ITaskDefinition} from "../../data-model/taskDefinition";

export class PipelineWorkerClient {
    private static _instance: PipelineWorkerClient = null;

    public static Instance(): PipelineWorkerClient {
        if (PipelineWorkerClient._instance === null) {
            PipelineWorkerClient._instance = new PipelineWorkerClient();
        }

        return PipelineWorkerClient._instance;
    }

    private _idClientMap = new Map<string, ApolloClient>();

    public async queryTaskDefinition(worker: IPipelineWorker, taskId: string): Promise<ITaskDefinition> {
        if (worker === null) {
            return null;
        }

        let client = this._idClientMap[worker.id];

        if (client == null) {
            const uri = `http://${worker.address}:${worker.port}/graphql`;

            debug(`creating apollo client during query tasks with uri ${uri}`);
            const networkInterface = createNetworkInterface({uri: uri});

            client = new ApolloClient({
                networkInterface
            });

            this._idClientMap[worker.id] = client;
        }

        try {
            let response = await client.query({
                query: gql`
                query($id: String!) {
                    taskDefinition(id: $id) {
                        id
                        name
                        description
                        script
                        interpreter
                        args
                        work_units
                    }
                }`,
                variables: {
                    id: taskId
                },
                forceFetch: true
            });

            return response.data.taskDefinition;
        } catch (err) {
            debug(`error querying task definition for worker ${worker.name}`);
        }

        return null;
    }

    public async queryTaskExecution(worker: IPipelineWorker, executionId: string): Promise<ITaskExecution> {
        if (worker === null) {
            return null;
        }

        let client = this._idClientMap[worker.id];

        if (client == null) {
            const uri = `http://${worker.address}:${worker.port}/graphql`;

            debug(`creating apollo client during query tasks with uri ${uri}`);
            const networkInterface = createNetworkInterface({uri: uri});

            client = new ApolloClient({
                networkInterface
            });

            this._idClientMap[worker.id] = client;
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
                        max_cpu
                        max_memory
                        work_units
                        started_at
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
            PipelineWorkers.setWorkerStatus(worker.id, PipelineWorkerStatus.Unavailable);
            debug(`error querying task status for worker ${worker.name}`);
        }

        return null;
    }

    public async startTaskExecution(worker: IPipelineWorker, taskId: string, baseArgs: string[] = []): Promise<ITaskExecution> {
        let client = this._idClientMap[worker.id];

        if (client == null) {
            const uri = `http://${worker.address}:${worker.port}/graphql`;

            debug(`creating apollo client during start task with uri ${uri}`);
            const networkInterface = createNetworkInterface({uri: uri});

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
                        work_units
                        started_at
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
            PipelineWorkers.setWorkerStatus(worker.id, PipelineWorkerStatus.Unavailable);
            debug(`error submitting task to worker ${worker.name}`);
        }

        return null;
    }
}