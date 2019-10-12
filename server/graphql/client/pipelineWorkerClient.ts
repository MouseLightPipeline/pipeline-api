import {ApolloClient} from "apollo-client";
import {InMemoryCache} from "apollo-cache-inmemory";
import {HttpLink} from "apollo-link-http";
import gql from "graphql-tag";
import "isomorphic-fetch";

const debug = require("debug")("pipeline:coordinator-api:pipeline-worker-client");

import {IPipelineWorkerAttributes, PipelineWorkerStatus} from "../../data-model/sequelize/pipelineWorker";
import {PipelineServerContext} from "../pipelineServerContext";

export interface IClientWorker {
    id: string;
    local_work_capacity: number;
    cluster_work_capacity: number;
}

export interface IClientUpdateWorkerOutput {
    worker: IClientWorker;
    error: string;
}

export class PipelineWorkerClient {
    private static _instance: PipelineWorkerClient = null;

    public static Instance(): PipelineWorkerClient {
        if (PipelineWorkerClient._instance === null) {
            PipelineWorkerClient._instance = new PipelineWorkerClient();
        }

        return PipelineWorkerClient._instance;
    }

    private _idClientMap = new Map<string, ApolloClient<any>>();

    private getClient(worker: IPipelineWorkerAttributes): ApolloClient<any> {
        if (worker === null) {
            return null;
        }

        let client = this._idClientMap[worker.id];

        let uri = null;

        if (client == null) {
            try {
                uri = `http://${worker.address}:${worker.port}/graphql`;

                debug(`creating apollo client with uri ${uri}`);

                client = new ApolloClient({
                    link: new HttpLink({uri}),
                    cache: new InMemoryCache()
                });

                this._idClientMap[worker.id] = client;
            } catch (err) {
                debug(`failed to create apollo client with uri ${uri}`);

                client = null;
            }
        }

        return client;
    }

    private static async markWorkerUnavailable(worker: IPipelineWorkerAttributes): Promise<void> {
        let serverContext = new PipelineServerContext();

        const row = await serverContext.getPipelineWorker(worker.id);

        row.status = PipelineWorkerStatus.Unavailable;
    }

    public async updateWorker(worker: IPipelineWorkerAttributes): Promise<IClientUpdateWorkerOutput> {
        const client = this.getClient(worker);

        if (client === null) {
            return {worker: null, error: "Could not connect to worker"};
        }

        try {
            let response = await client.mutate({
                mutation: gql`
                mutation UpdateWorkerMutation($worker: WorkerInput) {
                    updateWorker(worker: $worker) {
                        id
                        local_work_capacity
                        cluster_work_capacity
                    }
                }`,
                variables: {
                    worker: Object.assign({}, {
                        id: worker.id,
                        local_work_capacity: worker.local_work_capacity,
                        cluster_work_capacity: worker.cluster_work_capacity
                    })
                }
            });

            return {worker: response.data.updateWorker, error: null};
        } catch (err) {
            await PipelineWorkerClient.markWorkerUnavailable(worker);
            debug(`error submitting update to worker ${worker.name}`);

            return {worker: null, error: err};
        }
    }

    public async stopTaskExecution(worker: IPipelineWorkerAttributes, taskExecutionId: string): Promise<any> {
        const client = this.getClient(worker);

        if (client === null) {
            return {worker: null, error: "Could not connect to worker"};
        }

        try {
            let response = await client.mutate({
                mutation: gql`
                mutation StopTaskMutation($taskExecutionId: String!) {
                    stopTask(taskExecutionId: $taskExecutionId) {
                      id
                    }
                }`,
                variables: {
                    taskExecutionId
                }
            });

            return {taskExecutionId: response.data.id, error: null};
        } catch (err) {
            debug(`error requesting stop task execution ${taskExecutionId} for ${worker.name}`);

            return {taskExecutionId: null, error: err};
        }
    }
}