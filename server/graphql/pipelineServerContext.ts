import * as path from "path";

const debug = require("debug")("pipeline:pipeline-api:server-context");

import {PipelineWorker} from "../data-model/sequelize/pipelineWorker";
import {Project} from "../data-model/sequelize/project";
import {PipelineStage} from "../data-model/sequelize/pipelineStage";
import {PipelineWorkerClient} from "./client/pipelineWorkerClient";
import {IPipelineStageTileCounts, PipelineTile} from "../data-access/sequelize/stageTableConnector";
import {connectorForProject, connectorForStage} from "../data-access/sequelize/projectDatabaseConnector";
import {TilePipelineStatus} from "../data-model/TilePipelineStatus";
import {ServiceOptions} from "../options/serverOptions";
import {TaskExecution} from "../data-model/taskExecution";

interface IPipelineTileExt extends PipelineTile {
    stage_id: string;
    depth: number;
}

interface ITileMap {
    max_depth: number,
    x_min: number,
    x_max: number,
    y_min: number,
    y_max: number,
    tiles: any[]
}

const kEmptyTileMap: ITileMap = {
    max_depth: 0,
    x_min: 0,
    x_max: 0,
    y_min: 0,
    y_max: 0,
    tiles: []
};

export interface ISimplePage<T> {
    offset: number;
    limit: number;
    totalCount: number;
    hasNextPage: boolean;
    items: T[]
}

export type ITilePage = ISimplePage<PipelineTile>;

export class PipelineServerContext {
    public static async getProjectPlaneTileStatus(project_id: string, plane: number): Promise<ITileMap> {
        try {
            if (plane == null) {
                debug("plane not defined");
                return kEmptyTileMap;
            }

            const project = await Project.findByPk(project_id);

            if (!project) {
                debug("project not defined");
                return kEmptyTileMap;
            }

            const stages: PipelineStage[] = await project.getStages();

            if (stages.length === 0) {
                debug("no stages for project");
                return kEmptyTileMap;
            }

            const maxDepth = stages.reduce((current, stage) => Math.max(current, stage.depth), 0);

            const connector = await connectorForProject(project);

            const stageConnectorPromises: Promise<IPipelineTileExt[]>[] = stages.map(async (stage) => {
                const stageConnector = await connector.connectorForStage(stage);

                let tiles = [];

                if (stageConnector) {
                    tiles = await stageConnector.loadTileStatusForPlane(plane);
                }

                return tiles.map(tile => {
                    return Object.assign(tile.toJSON(), {stage_id: stage.id, depth: stage.depth}) as IPipelineTileExt;
                });
            });

            stageConnectorPromises.unshift(new Promise(async (resolve) => {
                const stageConnector = await connector.connectorForProject();

                let tiles = [];

                if (stageConnector) {
                    tiles = await stageConnector.loadTileStatusForPlane(plane);
                }

                const tilesExt = tiles.map(tile => {
                    return Object.assign(tile.toJSON(), {stage_id: project.id, depth: 0}) as IPipelineTileExt;
                });

                resolve(tilesExt);
            }));

            const tilesAllStages = await Promise.all(stageConnectorPromises);

            const tileArray = tilesAllStages.reduce((source, next) => source.concat(next), []);

            if (tileArray.length === 0) {
                debug("no tiles across all stages");
                return kEmptyTileMap;
            }

            let tiles = {};

            let x_min = 1e7, x_max = 0, y_min = 1e7, y_max = 0;

            tileArray.map(tile => {
                x_min = Math.min(x_min, tile.lat_x);
                x_max = Math.max(x_max, tile.lat_x);
                y_min = Math.min(y_min, tile.lat_y);
                y_max = Math.max(y_max, tile.lat_y);

                let t = tiles[`${tile.lat_x}_${tile.lat_y}`];

                if (!t) {
                    t = {
                        x_index: tile.lat_x,
                        y_index: tile.lat_y,
                        stages: []
                    };

                    tiles[`${tile.lat_x}_${tile.lat_y}`] = t;
                }

                // Duplicate tiles exist.  Use whatever is further along (i.e., a repeat of an incomplete that is complete
                // and processing supersedes.

                const existing = t.stages.filter(s => s.depth === tile.depth);

                if (existing.length === 0) {
                    t.stages.push({
                        relative_path: tile.relative_path,
                        stage_id: tile.stage_id,
                        depth: tile.depth,
                        status: tile.this_stage_status
                    });
                } else if (tile.this_stage_status > existing.status) {
                    existing.relative_path = tile.relative_path;
                    existing.stage_id = tile.stage_id;
                    existing.depth = tile.depth;
                    // This is not strictly correct as failed enum > complete and complete is probably what you want
                    // to know.
                    existing.status = tile.this_stage_status;
                }
            });

            let output = [];

            // I forget what I am trying to drop here?
            for (let prop in tiles) {
                if (tiles.hasOwnProperty(prop)) {
                    output.push(tiles[prop]);
                }
            }

            return {
                max_depth: maxDepth,
                x_min: project.sample_x_min >= 0 ? project.sample_x_min : x_min,
                x_max: project.sample_x_max >= 0 ? project.sample_x_min : x_max,
                y_min: project.sample_y_min >= 0 ? project.sample_y_min : x_min,
                y_max: project.sample_y_max >= 0 ? project.sample_y_min : x_max,
                tiles: output
            };
        } catch (err) {
            console.log(err);
            return kEmptyTileMap;
        }
    }

    public static async thumbnailPath(id: string, x, y, z): Promise<string> {
        try {
            let isProject = false;
            let project: Project = null;

            const stage: PipelineStage = await PipelineStage.findByPk(id);

            if (!stage) {
                project = await Project.findByPk(id);
                isProject = true;
            } else {
                project = await Project.findByPk(stage.project_id);
            }

            if (!project) {
                if (!stageWarn.has(id)) {
                    debug(`failed to look up project/stage ${id} for thumbnail request`);
                    stageWarn.set(id, true);
                }
                return null;
            }

            const connector = await connectorForProject(project);

            const stageConnector = isProject ? await connector.connectorForProject() : await connector.connectorForStage(stage);

            if (!stageConnector) {
                if (!stageWarn.has(id)) {
                    debug(`failed to load stage connector ${id} for thumbnail request`);
                    stageWarn.set(id, true);
                }
                return null;
            }

            const tile = await stageConnector.loadTileThumbnailPath(x, y, z);

            if (tile) {
                let fullPath = path.join(isProject ? project.root_path : stage.dst_path, tile.relative_path);

                ServiceOptions.driveMapping.map(d => {
                    if (fullPath.startsWith(d.remote)) {
                        fullPath = d.local + fullPath.slice(d.remote.length);
                    }
                });

                return fullPath
            } else {
                debug(`failed to load tile at ${x} ${y} ${z} for stage ${id} for thumbnail request`);
            }
        } catch (err) {
            debug(err);
        }

        return null;
    }

    public async tilesForStage(pipelineStageId: string, status: TilePipelineStatus, reqOffset: number, reqLimit: number): Promise<ITilePage> {
        const pipelineStage = await PipelineStage.findByPk(pipelineStageId);

        if (!pipelineStage) {
            return {
                offset: reqOffset,
                limit: reqLimit,
                totalCount: 0,
                hasNextPage: false,
                items: []
            };
        }

        let offset = 0;
        let limit = 10;

        if (reqOffset !== null && reqOffset !== undefined) {
            offset = reqOffset;
        }

        if (reqLimit !== null && reqLimit !== undefined) {
            limit = reqLimit;
        }

        // TODO Use findAndCount
        const stageConnector = await connectorForStage(pipelineStage);

        if (!stageConnector) {
            return {
                offset: reqOffset,
                limit: reqLimit,
                totalCount: 0,
                hasNextPage: false,
                items: []
            };
        }

        const totalCount = await stageConnector.countTiles({
            where: {
                prev_stage_status: TilePipelineStatus.Complete,
                this_stage_status: status
            }
        });

        const items = await stageConnector.loadTiles({
            where: {
                prev_stage_status: TilePipelineStatus.Complete,
                this_stage_status: status
            },
            order: ["relative_path"],
            offset,
            limit
        });

        await Promise.all(items.map(async (item) => {
            item.task_executions = await stageConnector.taskExecutionsForTile(item.relative_path);
        }));

        return {
            offset: offset,
            limit: limit,
            totalCount,
            hasNextPage: offset + limit < totalCount,
            items
        }
    }

    public async getPipelineStageTileStatus(pipelineStageId: string): Promise<IPipelineStageTileCounts> {
        try {
            const pipelineStage = await PipelineStage.findByPk(pipelineStageId);

            if (!pipelineStage) {
                return null;
            }

            const stageConnector = await connectorForStage(pipelineStage);

            return stageConnector ? await stageConnector.getTileCounts() : PipelineStageStatusUnavailable;
        } catch (err) {
            return PipelineStageStatusUnavailable;
        }
    }

    /***
     * Set specific tiles (by id) to a specific status.
     *
     * @param {string} pipelineStageId
     * @param {string[]} tileIds
     * @param {TilePipelineStatus} status
     * @returns {Promise<PipelineTile[]>}
     */
    public async setTileStatus(pipelineStageId: string, tileIds: string[], status: TilePipelineStatus): Promise<PipelineTile[]> {
        const pipelineStage = await PipelineStage.findByPk(pipelineStageId);

        if (!pipelineStage) {
            return null;
        }

        const stageConnector = await connectorForStage(pipelineStage);

        return stageConnector ? await stageConnector.setTileStatus(tileIds, status) : null;
    }

    /***
     * Set all tiles with one status to another status.
     *
     * @param {string} pipelineStageId
     * @param {TilePipelineStatus} currentStatus
     * @param {TilePipelineStatus} desiredStatus
     * @returns {Promise<PipelineTile[]>}
     */
    public async convertTileStatus(pipelineStageId: string, currentStatus: TilePipelineStatus, desiredStatus: TilePipelineStatus): Promise<PipelineTile[]> {
        const pipelineStage = await PipelineStage.findByPk(pipelineStageId);

        if (!pipelineStage) {
            return null;
        }

        const stageConnector = await connectorForStage(pipelineStage);

        return stageConnector.convertTileStatus(currentStatus, desiredStatus);
    }

    public async stopTaskExecution(pipelineStageId: string, taskExecutionId: string): Promise<TaskExecution> {
        const pipelineStage = await PipelineStage.findByPk(pipelineStageId);

        if (!pipelineStage) {
            return null;
        }

        debug(`stopExecution: found pipeline stage ${pipelineStage.name}`);

        const stageConnector = await connectorForStage(pipelineStage);

        if (!stageConnector) {
            return null;
        }

        debug(`stopExecution: found stageConnector`);

        const taskExecution: TaskExecution = await stageConnector.taskExecutionForId(taskExecutionId);

        debug(`stopExecution: found taskExecution ${taskExecution.id}`);

        debug(`stopExecution: has remote taskExecution ${taskExecution.worker_task_execution_id}`);

        const worker: PipelineWorker = await PipelineWorker.findByPk(taskExecution.worker_id);

        let id = await PipelineWorkerClient.Instance().stopTaskExecution(worker, taskExecution.worker_task_execution_id);

        debug(id);

        return taskExecution;
    }

    public async removeTaskExecution(pipelineStageId: string, taskExecutionId: string): Promise<boolean> {
        const pipelineStage = await PipelineStage.findByPk(pipelineStageId);

        if (!pipelineStage) {
            return false;
        }

        const stageConnector = await connectorForStage(pipelineStage);

        if (!stageConnector) {
            return false;
        }

        return stageConnector.removeTaskExecution(taskExecutionId);
    }
}

const PipelineStageStatusUnavailable: IPipelineStageTileCounts = {
    incomplete: 0,
    queued: 0,
    processing: 0,
    complete: 0,
    failed: 0,
    canceled: 0
};

const stageWarn = new Map<string, boolean>();
