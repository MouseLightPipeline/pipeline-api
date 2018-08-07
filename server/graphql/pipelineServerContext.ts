import * as path from "path";
import * as fs from "fs";

const debug = require("debug")("pipeline:coordinator-api:server-context");

import {PersistentStorageManager} from "../data-access/sequelize/databaseConnector";
import {ITaskDefinition, ITaskDefinitionAttributes} from "../data-model/sequelize/taskDefinition";
import {ITaskRepository} from "../data-model/sequelize/taskRepository";
import {IPipelineWorker} from "../data-model/sequelize/pipelineWorker";
import {
    IProject,
    IProjectAttributes,
    IProjectInput,
    NO_BOUND,
    NO_SAMPLE,
    ProjectInputSourceState
} from "../data-model/sequelize/project";
import {IPipelineStage} from "../data-model/sequelize/pipelineStage";
import {PipelineWorkerClient} from "./client/pipelineWorkerClient";
import {
    IPipelineStageTileCounts,
    IPipelineTile,
    IPipelineTileAttributes
} from "../data-access/sequelize/stageTableConnector";
import {
    connectorForProject,
    connectorForStage,
} from "../data-access/sequelize/projectDatabaseConnector";
import {TilePipelineStatus} from "../data-model/TilePipelineStatus";
import {ServiceOptions} from "../options/serverOptions";

interface IPipelineTileExt extends IPipelineTile {
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

export interface IWorkerMutationOutput {
    worker: IPipelineWorker;
    error: string;
}

export interface IProjectMutationOutput {
    project: IProject;
    error: string;
}

export interface IProjectDeleteOutput {
    id: string;
    error: string;
}

export interface IPipelineStageMutationOutput {
    pipelineStage: IPipelineStage;
    error: string;
}

export interface IPipelineStageDeleteOutput {
    id: string;
    error: string;
}

export interface ITaskRepositoryMutationOutput {
    taskRepository: ITaskRepository;
    error: string;
}

export interface ITaskRepositoryDeleteOutput {
    id: string;
    error: string;
}

export interface ITaskDefinitionMutationOutput {
    taskDefinition: ITaskDefinitionAttributes;
    error: string;
}

export interface ITaskDefinitionDeleteOutput {
    id: string;
    error: string;
}

export interface ISimplePage<T> {
    offset: number;
    limit: number;
    totalCount: number;
    hasNextPage: boolean;
    items: T[]
}

export type ITilePage = ISimplePage<IPipelineTileAttributes>;

export class PipelineServerContext {
    private _persistentStorageManager: PersistentStorageManager = PersistentStorageManager.Instance();

    public getPipelineWorker(id: string): Promise<IPipelineWorker> {
        return this._persistentStorageManager.PipelineWorkers.findById(id);
    }

    public getPipelineWorkers(): Promise<IPipelineWorker[]> {
        return this._persistentStorageManager.PipelineWorkers.findAll({});
    }

    public async updateWorker(workerInput: IPipelineWorker): Promise<IWorkerMutationOutput> {
        try {
            let row = await this._persistentStorageManager.PipelineWorkers.findById(workerInput.id);

            let output = await PipelineWorkerClient.Instance().updateWorker(Object.assign({}, {
                id: workerInput.id,
                local_work_capacity: workerInput.local_work_capacity,
                cluster_work_capacity: workerInput.cluster_work_capacity
            }, {
                name: row.name,
                address: row.address,
                port: row.port
            }));

            if (output.error !== null) {
                return output;
            }

            row = await row.update({
                local_work_capacity: output.worker.local_work_capacity,
                cluster_work_capacity: output.worker.cluster_work_capacity
            });

            return {worker: row, error: ""};
        } catch (err) {
            return {worker: null, error: err.message}
        }
    }

    public async setWorkerAvailability(id: string, shouldBeInSchedulerPool: boolean): Promise<IPipelineWorker> {
        const worker = await this._persistentStorageManager.PipelineWorkers.findById(id);

        await worker.update({is_in_scheduler_pool: shouldBeInSchedulerPool});

        return this._persistentStorageManager.PipelineWorkers.findById(id);
    }

    public static getDashboardJsonStatusForProject(project: IProjectAttributes): boolean {
        return fs.existsSync(path.join(project.root_path, "dashboard.json"));
    }

    public async getProject(id: string): Promise<IProject> {
        return this._persistentStorageManager.Projects.findById(id);
    }

    public async getProjects(): Promise<IProject[]> {
        return this._persistentStorageManager.Projects.findAll({order: [["sample_number", "ASC"], ["name", "ASC"]]});
    }

    public async createProject(projectInput: IProjectInput): Promise<IProjectMutationOutput> {
        try {
            const region = projectInput.region_bounds || {
                x_min: NO_BOUND,
                x_max: NO_BOUND,
                y_min: NO_BOUND,
                y_max: NO_BOUND,
                z_min: NO_BOUND,
                z_max: NO_BOUND
            };

            const project = {
                name: projectInput.name || "",
                description: projectInput.description || "",
                root_path: projectInput.root_path || "",
                sample_number: projectInput.sample_number || NO_SAMPLE,
                sample_x_min: NO_BOUND,
                sample_x_max: NO_BOUND,
                sample_y_min: NO_BOUND,
                sample_y_max: NO_BOUND,
                sample_z_min: NO_BOUND,
                sample_z_max: NO_BOUND,
                region_x_min: region.x_min,
                region_x_max: region.x_max,
                region_y_min: region.y_min,
                region_y_max: region.y_max,
                region_z_min: region.z_min,
                region_z_max: region.z_max,
                is_processing: false
            };

            const result = await this._persistentStorageManager.Projects.create(project);

            return {project: result, error: ""};
        } catch (err) {
            return {project: null, error: err.message}
        }
    }

    public async updateProject(projectInput: IProjectInput): Promise<IProjectMutationOutput> {
        try {
            let row = await this._persistentStorageManager.Projects.findById(projectInput.id);

            let project = projectInput.region_bounds ?
                Object.assign(projectInput, {
                    region_x_min: projectInput.region_bounds.x_min,
                    region_x_max: projectInput.region_bounds.x_max,
                    region_y_min: projectInput.region_bounds.y_min,
                    region_y_max: projectInput.region_bounds.y_max,
                    region_z_min: projectInput.region_bounds.z_min,
                    region_z_max: projectInput.region_bounds.z_max
                }) : projectInput;

            await row.update(project);

            row = await this._persistentStorageManager.Projects.findById(project.id);

            return {project: row, error: ""};
        } catch (err) {
            return {project: null, error: err.message}
        }
    }

    public async duplicateProject(id: string): Promise<IProjectMutationOutput> {
        try {
            const input = (await this._persistentStorageManager.Projects.findById(id)).toJSON();

            input.id = undefined;
            input.name += " copy";
            input.root_path += "copy";
            input.sample_number = NO_SAMPLE;
            input.sample_x_min = NO_BOUND;
            input.sample_x_max = NO_BOUND;
            input.sample_y_min = NO_BOUND;
            input.sample_y_max = NO_BOUND;
            input.sample_z_min = NO_BOUND;
            input.sample_z_max = NO_BOUND;
            input.region_x_min = NO_BOUND;
            input.region_x_max = NO_BOUND;
            input.region_y_min = NO_BOUND;
            input.region_y_max = NO_BOUND;
            input.region_z_min = NO_BOUND;
            input.region_z_max = NO_BOUND;
            input.input_source_state = ProjectInputSourceState.Unknown;
            input.last_checked_input_source = null;
            input.last_seen_input_source = null;
            input.is_processing = false;
            input.created_at = new Date();
            input.updated_at = input.created_at;

            const project = await this._persistentStorageManager.Projects.create(input);

            const inputStages = await this._persistentStorageManager.PipelineStages.findAll({
                where: {project_id: id},
                order: [["depth", "ASC"]]
            });

            const duplicateMap = new Map<string, IPipelineStage>();

            const dupeStage = async (inputStage): Promise<IPipelineStage> => {
                const stageData: IPipelineStage = inputStage.toJSON();

                stageData.project_id = project.id;
                if (inputStage.previous_stage_id !== null) {
                    stageData.previous_stage_id = duplicateMap.get(inputStage.previous_stage_id).id;
                } else {
                    stageData.previous_stage_id = null;
                }
                stageData.dst_path += "copy";

                const stage = await this._persistentStorageManager.PipelineStages.createFromInput(stageData);

                duplicateMap.set(inputStage.id, stage);

                return stage;
            };

            await inputStages.reduce(async (promise, stage) => {
                await promise;
                return dupeStage(stage);
            }, Promise.resolve());

            return {project, error: ""};
        } catch (err) {
            console.log(err);
            return {project: null, error: err.message}
        }
    }

    public async deleteProject(id: string): Promise<IProjectDeleteOutput> {
        try {
            const affectedRowCount = await this._persistentStorageManager.Projects.destroy({where: {id}});

            if (affectedRowCount > 0) {
                return {id, error: ""};
            } else {
                return {id: null, error: "Could not delete repository (no error message)"};
            }
        } catch (err) {
            return {id: null, error: err.message}
        }
    }

    public getPipelineStage(id: string): Promise<IPipelineStage> {
        return this._persistentStorageManager.PipelineStages.findById(id);
    }

    public getPipelineStages(): Promise<IPipelineStage[]> {
        return this._persistentStorageManager.PipelineStages.findAll({});
    }

    public getPipelineStagesForProject(id: string): Promise<IPipelineStage[]> {
        return this._persistentStorageManager.PipelineStages.getForProject(id);
    }

    public getPipelineStagesForTaskDefinition(id: string): Promise<IPipelineStage[]> {
        return this._persistentStorageManager.PipelineStages.getForTask(id);
    }

    public getPipelineStageChildren(id: string): Promise<IPipelineStage[]> {
        return this._persistentStorageManager.PipelineStages.findAll({where: {previous_stage_id: id}});
    }

    public async createPipelineStage(pipelineStage: IPipelineStage): Promise<IPipelineStageMutationOutput> {
        try {
            const result: IPipelineStage = await this._persistentStorageManager.PipelineStages.createFromInput(pipelineStage);

            return {pipelineStage: result, error: ""};
        } catch (err) {
            return {pipelineStage: null, error: err.message};
        }
    }

    public async updatePipelineStage(pipelineStage: IPipelineStage): Promise<IPipelineStageMutationOutput> {
        try {
            let row = await this._persistentStorageManager.PipelineStages.findById(pipelineStage.id);

            if (row.previous_stage_id === null) {
                pipelineStage.depth = 1;
            } else {
                const stage = await this._persistentStorageManager.PipelineStages.findById(row.previous_stage_id);
                pipelineStage.depth = stage.depth + 1;
            }

            await row.update(pipelineStage);

            row = await this._persistentStorageManager.PipelineStages.findById(pipelineStage.id);

            return {pipelineStage: row, error: ""};
        } catch (err) {
            return {pipelineStage: null, error: err.message}
        }
    }

    public async deletePipelineStage(id: string): Promise<IPipelineStageDeleteOutput> {
        try {
            const affectedRowCount = await this._persistentStorageManager.PipelineStages.destroy({where: {id}});

            if (affectedRowCount > 0) {
                return {id, error: ""};
            } else {
                return {id: null, error: "Could not delete repository (no error message)"};
            }
        } catch (err) {
            return {id: null, error: err.message}
        }
    }

    public getTaskRepository(id: string): Promise<ITaskRepository> {
        return this._persistentStorageManager.TaskRepositories.findById(id);
    }

    public getTaskRepositories(): Promise<ITaskRepository[]> {
        return this._persistentStorageManager.TaskRepositories.findAll({});
    }

    public async getRepositoryTasks(id: string): Promise<ITaskDefinitionAttributes[]> {
        return this._persistentStorageManager.TaskDefinitions.findAll({where: {task_repository_id: id}});
    }

    public async createTaskRepository(taskRepository: ITaskRepository): Promise<ITaskRepositoryMutationOutput> {
        try {
            const result = await this._persistentStorageManager.TaskRepositories.create(taskRepository);

            return {taskRepository: result, error: null};

        } catch (err) {
            return {taskRepository: null, error: err.message}
        }
    }

    public async updateTaskRepository(taskRepository: ITaskRepository): Promise<ITaskRepositoryMutationOutput> {
        try {
            let row = await this._persistentStorageManager.TaskRepositories.findById(taskRepository.id);

            await row.update(taskRepository);

            row = await this._persistentStorageManager.TaskRepositories.findById(taskRepository.id);

            return {taskRepository: row, error: null};
        } catch (err) {
            return {taskRepository: null, error: err.message}
        }
    }

    public async deleteTaskRepository(id: string): Promise<ITaskRepositoryDeleteOutput> {
        try {
            const affectedRowCount = await this._persistentStorageManager.TaskRepositories.destroy({where: {id}});

            if (affectedRowCount > 0) {
                return {id, error: null};
            } else {
                return {id: null, error: "Could not delete repository (no error message)"};
            }
        } catch (err) {
            return {id: null, error: err.message}
        }
    }

    public async getTaskDefinition(id: string): Promise<ITaskDefinition> {
        return await this._persistentStorageManager.TaskDefinitions.findById(id);
    }

    public async getTaskDefinitions(): Promise<ITaskDefinition[]> {
        return await this._persistentStorageManager.TaskDefinitions.findAll({});
    }

    public async createTaskDefinition(taskDefinition: ITaskDefinitionAttributes): Promise<ITaskDefinitionMutationOutput> {
        try {
            const result = await this._persistentStorageManager.TaskDefinitions.create(taskDefinition);

            return {taskDefinition: result, error: null};
        } catch (err) {
            return {taskDefinition: null, error: err.message}
        }
    }

    public async updateTaskDefinition(taskDefinition: ITaskDefinitionAttributes): Promise<ITaskDefinitionMutationOutput> {
        try {
            let row = await this._persistentStorageManager.TaskDefinitions.findById(taskDefinition.id);

            await row.update(taskDefinition);

            row = await this._persistentStorageManager.TaskDefinitions.findById(taskDefinition.id);

            return {taskDefinition: row, error: null};
        } catch (err) {
            return {taskDefinition: null, error: err.message}
        }
    }

    public async duplicateTask(id: string): Promise<ITaskDefinitionMutationOutput> {
        try {
            const input = (await this._persistentStorageManager.TaskDefinitions.findById(id)).toJSON();

            input.id = undefined;
            input.name += " copy";
            input.created_at = new Date();
            input.updated_at = input.created_at;

            const taskDefinition = await this._persistentStorageManager.TaskDefinitions.create(input);

            return {taskDefinition, error: ""};
        } catch (err) {
            console.log(err);
            return {taskDefinition: null, error: err.message}
        }
    }

    public async deleteTaskDefinition(id: string): Promise<ITaskDefinitionDeleteOutput> {
        try {
            const affectedRowCount = await this._persistentStorageManager.TaskDefinitions.destroy({where: {id}});

            if (affectedRowCount > 0) {
                return {id, error: null};
            } else {
                return {id: null, error: "Could not delete task definition (no error message)"};
            }
        } catch (err) {
            return {id: null, error: err.message}
        }
    }

    public static async getScriptStatusForTaskDefinition(taskDefinition: ITaskDefinition): Promise<boolean> {
        const scriptPath = await taskDefinition.getFullScriptPath(true);

        return fs.existsSync(scriptPath);
    }

    public async getScriptContents(taskDefinitionId: string): Promise<string> {
        const taskDefinition = await this.getTaskDefinition(taskDefinitionId);

        if (taskDefinition) {
            const haveScript = await PipelineServerContext.getScriptStatusForTaskDefinition(taskDefinition);

            if (haveScript) {
                const scriptPath = await taskDefinition.getFullScriptPath(true);

                return fs.readFileSync(scriptPath, "utf8");
            }
        }

        return null;
    }

    public static async getProjectPlaneTileStatus(project_id: string, plane: number): Promise<ITileMap> {
        try {
            if (plane == null) {
                debug("plane not defined");
                return kEmptyTileMap;
            }

            const projectsManager = PersistentStorageManager.Instance().Projects;

            const project = await projectsManager.findById(project_id);

            if (!project) {
                debug("project not defined");
                return kEmptyTileMap;
            }

            const pipelineStagesManager = PersistentStorageManager.Instance().PipelineStages;

            const stages: IPipelineStage[] = await pipelineStagesManager.getForProject(project_id);

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
            let project: IProject = null;

            const stage: IPipelineStage = await PersistentStorageManager.Instance().PipelineStages.findById(id);

            if (!stage) {
                project = await PersistentStorageManager.Instance().Projects.findById(id);
                isProject = true;
            } else {
                project = await PersistentStorageManager.Instance().Projects.findById(stage.project_id);
            }

            if (!project) {
                return null;
            }

            const connector = await connectorForProject(project);

            const stageConnector = isProject ? await connector.connectorForProject() : await connector.connectorForStage({id});

            if (!stageConnector) {
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
            }
        } catch (err) {
            debug(err);
        }

        return null;
    }

    public async tilesForStage(pipelineStageId: string, status: TilePipelineStatus, reqOffset: number, reqLimit: number): Promise<ITilePage> {
        const pipelineStage = await this._persistentStorageManager.PipelineStages.findById(pipelineStageId);

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
            offset,
            limit
        });

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
            const pipelineStage = await this._persistentStorageManager.PipelineStages.findById(pipelineStageId);

            if (!pipelineStage) {
                return null;
            }

            const stageConnector = await connectorForStage(pipelineStage);

            return stageConnector ? stageConnector.getTileCounts() : PipelineStageStatusUnavailable;
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
     * @returns {Promise<IPipelineTileAttributes[]>}
     */
    public async setTileStatus(pipelineStageId: string, tileIds: string[], status: TilePipelineStatus): Promise<IPipelineTileAttributes[]> {
        const pipelineStage = await this._persistentStorageManager.PipelineStages.findById(pipelineStageId);

        if (!pipelineStage) {
            return null;
        }

        const stageConnector = await connectorForStage(pipelineStage);

        return stageConnector ? stageConnector.setTileStatus(tileIds, status) : null;
    }

    /***
     * Set all tiles with one status to another status.
     *
     * @param {string} pipelineStageId
     * @param {TilePipelineStatus} currentStatus
     * @param {TilePipelineStatus} desiredStatus
     * @returns {Promise<IPipelineTileAttributes[]>}
     */
    public async convertTileStatus(pipelineStageId: string, currentStatus: TilePipelineStatus, desiredStatus: TilePipelineStatus): Promise<IPipelineTileAttributes[]> {
        const pipelineStage = await this._persistentStorageManager.PipelineStages.findById(pipelineStageId);

        if (!pipelineStage) {
            return null;
        }

        const stageConnector = await connectorForStage(pipelineStage);

        return stageConnector.convertTileStatus(currentStatus, desiredStatus);
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
