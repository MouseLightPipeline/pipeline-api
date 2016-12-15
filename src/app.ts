import * as express from "express";
import * as bodyParser from "body-parser";

const debug = require("debug")("mouselight:pipeline-api:server");

import serverConfiguration from "../config/server.config";

import {graphQLMiddleware, graphiQLMiddleware} from "./graphql/common/graphQLMiddleware";
import {SocketIoServer} from "./io/ioServer";
import {SchedulerHub} from "./schedulers/schedulerHub";

const config = serverConfiguration();

const PORT = process.env.PORT || config.port;

const useChildProcessWorkers = process.env.USE_CHILD_PROCESS_WORKERS || false;

const app = express();

app.use(bodyParser.urlencoded({extended: true}));

app.use(bodyParser.json());

app.use(config.graphQlEndpoint, graphQLMiddleware());

app.use(config.graphiQlEndpoint, graphiQLMiddleware(config));

const server = SocketIoServer.use(app);

server.listen(PORT, () => {
    debug(`running on http://localhost:${PORT}`);

    SchedulerHub.Run(useChildProcessWorkers);
});
