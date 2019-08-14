import * as os from "os";
import * as express from "express";
import * as bodyParser from "body-parser";
import * as cors from "cors";
import {ApolloServer, gql} from "apollo-server-express";

const debug = require("debug")("pipeline:coordinator-api:server");

import {typeDefinitions} from "./graphql/pipelineTypeDefinitions";
import {ServiceOptions} from "./options/serverOptions";
import {thumbnailParamQueryMiddleware} from "./middleware/thumbnailQueryMiddleware";
import resolvers from "./graphql/pipelineServerResolvers";
import {PipelineServerContext} from "./graphql/pipelineServerContext";
import {MessageQueueClient} from "./message-queue/messageQueueClient";
import {PersistentStorageManager} from "./data-access/sequelize/databaseConnector";

start().then().catch((err) => debug(err));

async function start() {
    await MessageQueueClient.StartMessageQueueClient(PersistentStorageManager.Instance());

    const app = express();

    app.use(bodyParser.urlencoded({extended: true}));
    app.use(bodyParser.json());

    const server = new ApolloServer({
        typeDefs: gql`${typeDefinitions}`,
        resolvers,
        introspection: true,
        playground: true,
        context: () => new PipelineServerContext()
    });

    // app.use("/thumbnailData", cors(), thumbnailQueryMiddleware);

    app.use("/thumbnail/:pipelineStageId/:x/:y/:z/:thumbName", cors(), thumbnailParamQueryMiddleware);

    server.applyMiddleware({app, path: ServiceOptions.graphQlEndpoint});

    app.listen(ServiceOptions.port, () => debug(`pipeline api available at http://${os.hostname()}:${ServiceOptions.port}/graphql`));
}
