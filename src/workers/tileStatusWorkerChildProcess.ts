import {TileStatusFileWorker} from "./tileStatusWorker";

const debug = require("debug")("mouselight:pipeline-api:tile-status-worker-process");

debug("started tile status child process");

TileStatusFileWorker.Run();

debug("completed tile status child process");

