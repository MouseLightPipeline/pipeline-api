import {CountOptions, Sequelize, FindOptions, Op} from "sequelize";

import {StageTableConnector} from "./stageTableConnector";
import {IPipelineStageTileCounts, IPipelineTile, PipelineTile} from "../../data-model/activity/pipelineTile";
import {TilePipelineStatus} from "../../data-model/activity/TilePipelineStatus";
import {TaskExecution} from "../../data-model/activity/taskExecution";

export class ApiStageTableConnector extends StageTableConnector {

    public constructor(connection: Sequelize, stage_id: string, prev_stage_id) {
        super(connection, stage_id, prev_stage_id);
    }

    public async loadTiles(): Promise<IPipelineTile[]> {
        return this._tileTable.findAll({where: {stage_id: this._stage_id}});
    }

    public async loadTilesWithFindOptions(options: FindOptions = {}): Promise<PipelineTile[]> {
        options["where"]["stage_id"] = this._stage_id;

        return this._tileTable.findAll(options);
    }

    public async taskExecutionForId(id: string): Promise<TaskExecution> {
        return this._taskExecutionTable.findByPk(id);
    }

    public async countTiles(options: CountOptions): Promise<number> {
        options["where"]["stage_id"] = this._stage_id;

        return options ? this._tileTable.count(options) : this._tileTable.count();
    }

    public async loadTileThumbnailPath(x: number, y: number, z: number): Promise<PipelineTile> {
        return this._tileTable.findOne({where: {stage_id: this._stage_id, lat_x: x, lat_y: y, lat_z: z}});
    }

    public async loadTileStatusForPlane(zIndex: number): Promise<PipelineTile[]> {
        return this._tileTable.findAll({where: {stage_id: this._stage_id, lat_z: zIndex}});
    }

    public async getTileCounts(): Promise<IPipelineStageTileCounts> {
        const incomplete = await this._tileTable.count({
            where: {
                stage_id: this._stage_id,
                stage_status: TilePipelineStatus.Incomplete
            }
        });
        const queued = await this._tileTable.count({
            where: {
                stage_id: this._stage_id,
                stage_status: TilePipelineStatus.Queued
            }
        });
        const processing = await this._tileTable.count({
            where: {
                stage_id: this._stage_id,
                stage_status: TilePipelineStatus.Processing
            }
        });
        const complete = await this._tileTable.count({
            where: {
                stage_id: this._stage_id,
                stage_status: TilePipelineStatus.Complete
            }
        });
        const failed = await this._tileTable.count({
            where: {
                stage_id: this._stage_id,
                stage_status: TilePipelineStatus.Failed
            }
        });
        const canceled = await this._tileTable.count({
            where: {
                stage_id: this._stage_id,
                stage_status: TilePipelineStatus.Canceled
            }
        });

        return {
            incomplete,
            queued,
            processing,
            complete,
            failed,
            canceled
        }
    }

    public async setTileStatus(ids: string[], status: TilePipelineStatus): Promise<PipelineTile[]> {
        const [, affectedRows] = await this._tileTable.update({stage_status: status}, {
            where: {
                stage_id: this._stage_id,
                id: {[Op.in]: ids}
            },
            returning: true
        });

        return affectedRows;
    }

    public async convertTileStatus(currentStatus: TilePipelineStatus, desiredStatus: TilePipelineStatus): Promise<PipelineTile[]> {
        const [, affectedRows] = await this._tileTable.update({stage_status: desiredStatus}, {
            where: {
                stage_id: this._stage_id,
                stage_status: currentStatus
            },
            returning: true
        });

        return affectedRows;
    }

    public async taskExecutionsForTile(tile: IPipelineTile): Promise<TaskExecution[]> {
        return this._taskExecutionTable.findAll({
            where: {
                tile_id: tile.id
            },
            order: ["created_at"]
        });
    }

    public async removeTaskExecution(id: string): Promise<boolean> {
        try {
            const taskExecution = await this.taskExecutionForId(id);

            if (taskExecution != null) {
                await taskExecution.destroy();
                return true;
            }
        } catch {
        }

        return false;
    }
}
