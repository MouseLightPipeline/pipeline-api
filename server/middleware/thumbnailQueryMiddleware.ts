import * as path from "path";
import * as fs from "fs";
import {isNullOrUndefined} from "util";
import {PipelineServerContext} from "../graphql/pipelineServerContext";

export async function thumbnailQueryMiddleware(req, res) {
    const pipelineStageId = req.body.pipelineStageId;
    const thumbName = req.body.thumbName || "Thumbs.png";
    const x = req.body.x;
    const y = req.body.y;
    const z = req.body.z;

    try {
        if ([pipelineStageId, x, y, z].some(o => isNullOrUndefined(o))) {
            res.json({
                thumbnail: null,
                error: "Missing valid parameter value(s)"
            });
        }

        let enc = null;

        let thumbnailPath = await PipelineServerContext.thumbnailPath(pipelineStageId, x, y, z);

        thumbnailPath = path.join(thumbnailPath, thumbName);

        if (fs.existsSync(thumbnailPath)) {
            enc = fs.readFileSync(thumbnailPath, "base64");
        }

        res.json({
            thumbnail: enc,
            pipelineStageId,
            thumbnailPath,
            x,
            y,
            z,
            error: null
        });
    } catch (err) {
        res.json({
            thumbnail: null,
            error: err.message
        });
    }
}

export async function thumbnailParamQueryMiddleware(req, res) {
    try {
        const pipelineStageId = req.params.pipelineStageId;
        const x = parseInt(req.params.x);
        const y = parseInt(req.params.y);
        const z = parseInt(req.params.z);
        const thumbName = req.params.thumbName || "Thumbs";


        if ([pipelineStageId, x, y, z].some(o => isNullOrUndefined(o))) {
            res.sendStatus(404);
            return;
        }

        let thumbnailPath = await PipelineServerContext.thumbnailPath(pipelineStageId, x, y, z);

        if (!thumbnailPath) {
            res.sendStatus(404);
            return;
        }

        thumbnailPath = path.join(thumbnailPath, thumbName);

        if (fs.existsSync(thumbnailPath)) {
            res.sendFile(thumbnailPath, {headers: {"Content-Type": "image/png"}});
            return;
        }

        res.sendStatus(404);
    } catch (err) {
        res.sendStatus(404);
    }
}