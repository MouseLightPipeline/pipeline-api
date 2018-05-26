import * as express from "express";
import * as bodyParser from "body-parser";
import * as cors from "cors";

const {graphqlExpress, graphiqlExpress} = require("apollo-server-express");
const {makeExecutableSchema} = require("graphql-tools");

const debug = require("debug")("pipeline:coordinator-api:server");

import {typeDefinitions} from "./graphql/pipelineTypeDefinitions";
import {SocketIoServer} from "./io/ioServer";
import {ServiceOptions} from "./options/serverOptions";
import {thumbnailParamQueryMiddleware, thumbnailQueryMiddleware} from "./middleware/thumbnailQueryMiddleware";
import {MetricsConnector} from "./data-access/metrics/metricsConnector";
import resolvers from "./graphql/pipelineServerResolvers";
import {PipelineServerContext} from "./graphql/pipelineServerContext";

let executableSchema = makeExecutableSchema({
    typeDefs: typeDefinitions,
    resolvers: resolvers,
    resolverValidationOptions: {
        requireResolversForNonScalar: false
    }
});

MetricsConnector.Instance().initialize().then();

const app = express();

app.use(ServiceOptions.graphQlEndpoint, bodyParser.json(), graphqlExpress(req => {
    return {
        schema: executableSchema,
        context: new PipelineServerContext()
        // other options here
    };
}));

app.use("/thumbnailData", cors(), thumbnailQueryMiddleware);

app.use("/thumbnail/:pipelineStageId/:x/:y/:z/:thumbName", cors(), thumbnailParamQueryMiddleware);

app.use(["/", ServiceOptions.graphiQlEndpoint], graphiqlExpress({endpointURL: ServiceOptions.graphQlEndpoint}));

const server = SocketIoServer.use(app);

server.listen(ServiceOptions.port, () => {
    debug(`running on http://localhost:${ServiceOptions.port}`);
});
