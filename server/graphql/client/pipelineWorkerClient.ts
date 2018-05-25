import ApolloClient, {createNetworkInterface} from "apollo-client";
import gql from "graphql-tag";
import "isomorphic-fetch";

const debug = require("debug")("pipeline:coordinator-api:pipeline-worker-client");

import {IPipelineWorker, PipelineWorkerStatus} from "../../data-model/sequelize/pipelineWorker";
import {PipelineServerContext} from "../pipelineServerContext";


export interface IClientWorker {
    id: string;
    work_capacity: number;
    is_cluster_proxy: boolean;
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

    private _idClientMap = new Map<string, ApolloClient>();

    private getClient(worker: IPipelineWorker): ApolloClient {
        if (worker === null) {
            return null;
        }

        let client = this._idClientMap[worker.id];

        let uri = null;

        if (client == null) {
            try {
                uri = `http://${worker.address}:${worker.port}/graphql`;

                debug(`creating apollo client with uri ${uri}`);
                const networkInterface = createNetworkInterface({uri});

                client = new ApolloClient({
                    networkInterface
                });

                this._idClientMap[worker.id] = client;
            } catch (err) {
                debug(`failed to create apollo client with uri ${uri}`);

                client = null;
            }
        }

        return client;
    }

    private static async markWorkerUnavailable(worker: IPipelineWorker): Promise<void> {
        let serverContext = new PipelineServerContext();

        const row = await serverContext.getPipelineWorker(worker.id);

        row.status = PipelineWorkerStatus.Unavailable;
    }

    public async updateWorker(worker: IPipelineWorker): Promise<IClientUpdateWorkerOutput> {
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
                        work_capacity
                        is_cluster_proxy
                    }
                }`,
                variables: {
                    worker: Object.assign({}, {id: worker.id, work_capacity: worker.work_unit_capacity})
                }
            });

            return {worker: response.data.updateWorker, error: null};
        } catch (err) {
            await PipelineWorkerClient.markWorkerUnavailable(worker);
            debug(`error submitting update to worker ${worker.name}`);

            return {worker: null, error: err};
        }
    }
}