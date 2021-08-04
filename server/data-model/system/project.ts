import {Sequelize, Model, DataTypes, HasManyGetAssociationsMixin, Transaction} from "sequelize";

import {PipelineStage} from "./pipelineStage";
import {ArchiveMutationOutput, MutationOutput} from "../mutationTypes";

export const NO_BOUND: number = null;
export const NO_SAMPLE: number = -1;

export enum ProjectInputSourceState {
    Unknown = 0,
    BadLocation = 1,
    Missing = 2,
    Dashboard = 3,
    Pipeline = 4,
    Disappeared = 5
}

export interface IProjectGridRegion {
    x_min: number;
    x_max: number;
    y_min: number;
    y_max: number;
    z_min: number;
    z_max: number;
}

// TODO pass user_parameters as ab object and stringify at database boundary rather than API
// TODO allow full x, y, z, skip plane configuration.
export interface IProjectInput {
    id?: string;
    name?: string;
    description?: string;
    root_path?: string;
    is_processing?: boolean;
    sample_number?: number;
    region_bounds?: IProjectGridRegion;
    user_parameters?: string;
    zPlaneSkipIndices?: number[];
    input_source_state?: ProjectInputSourceState;
    last_seen_input_source?: Date;
    last_checked_input_source?: Date;
}

export class Project extends Model {
    public id: string;
    public name: string;
    public description: string;
    public root_path: string;
    public log_root_path: string;
    public sample_number: number;
    public sample_x_min: number;
    public sample_x_max: number;
    public sample_y_min: number;
    public sample_y_max: number;
    public sample_z_min: number;
    public sample_z_max: number;
    public region_x_min: number;
    public region_x_max: number;
    public region_y_min: number;
    public region_y_max: number;
    public region_z_min: number;
    public region_z_max: number;
    public user_parameters: string;
    public plane_markers: string;
    public is_processing: boolean;
    public input_source_state: ProjectInputSourceState;
    public last_seen_input_source: Date;
    public last_checked_input_source: Date;

    public readonly created_at: Date;
    public readonly updated_at: Date;
    public readonly deleted_at: Date;

    public getStages!: HasManyGetAssociationsMixin<PipelineStage>;

    public get zPlaneSkipIndices(): number[] {
        return JSON.parse(this.plane_markers).z;
    }

    public set zPlaneSkipIndices(value: number[]) {
        this.setDataValue("plane_markers", JSON.stringify(Object.assign({}, JSON.parse(this.plane_markers), {z: value})));
    }

    /**
     * Update a project with the required mapping from an input object structure to flattened database structure.
     * @param projectInput
     */
    public async updateProject(projectInput: IProjectInput): Promise<MutationOutput<Project>> {
        try {
            // Flatten into database columns
            const projectUpdate = projectInput.region_bounds ?
                Object.assign(projectInput, {
                    region_x_min: projectInput.region_bounds.x_min,
                    region_x_max: projectInput.region_bounds.x_max,
                    region_y_min: projectInput.region_bounds.y_min,
                    region_y_max: projectInput.region_bounds.y_max,
                    region_z_min: projectInput.region_bounds.z_min,
                    region_z_max: projectInput.region_bounds.z_max
                }) : projectInput;

            await this.update(projectUpdate);

            if (projectInput.zPlaneSkipIndices !== undefined) {
                this.zPlaneSkipIndices = projectInput.zPlaneSkipIndices;
                await this.save();
            }

            return {source: this, error: null};
        } catch (err) {
            return {source: null, error: err.message}
        }
    }

    public static async findAndUpdateProject(projectInput: IProjectInput): Promise<MutationOutput<Project>> {
        try {
            let row = await Project.findByPk(projectInput.id);

            if (row == null) {
                return {source: null, error: `project with id ${projectInput.id} does not exist.`}
            }

            return await row.updateProject(projectInput);
        } catch (err) {
            return {source: null, error: err.message}
        }
    }

    /**
     * Create a project with the required mapping from an input object structure to flattened database structure.
     * @param projectInput
     */
    public static async createProject(projectInput: IProjectInput): Promise<MutationOutput<Project>> {
        try {
            const region: IProjectGridRegion = projectInput.region_bounds || {
                x_min: NO_BOUND,
                x_max: NO_BOUND,
                y_min: NO_BOUND,
                y_max: NO_BOUND,
                z_min: NO_BOUND,
                z_max: NO_BOUND
            };

            const plane_markers = projectInput.zPlaneSkipIndices ? {
                x: [], y: [], z: projectInput.zPlaneSkipIndices
            } : {x: [], y: [], z: []};

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
                plane_markers: JSON.stringify(plane_markers),
                user_parameters: projectInput.user_parameters || "{}",
                is_processing: false
            };

            const result = await Project.create(project);

            return {source: result, error: null};
        } catch (err) {
            return {source: null, error: err.message}
        }
    }

    /**
     * Duplicate a project and all downstream stages.
     * @param id
     */
    public static async duplicateProject(id: string): Promise<MutationOutput<Project>> {
        return this.sequelize.transaction(async (t: Transaction) => {
            try {
                const input: any = (await Project.findByPk(id)).toJSON();

                input.id = undefined;
                input.name += " copy";
                input.root_path += "-copy";
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

                const project = await Project.create(input, {transaction: t});

                const inputStages = await PipelineStage.findAll({
                    where: {project_id: id},
                    order: [["depth", "ASC"]]
                });

                const duplicateMap = new Map<string, string>();

                const dupeStage = async (inputStage: PipelineStage): Promise<void> => {
                    const stage = await inputStage.duplicate(project, t);

                    if (inputStage.previous_stage_id !== null) {
                        stage.previous_stage_id = duplicateMap.get(inputStage.previous_stage_id) || null;
                        await stage.save({transaction: t});
                    }

                    duplicateMap.set(inputStage.id, stage.id);
                };

                await inputStages.reduce(async (promise, stage) => {
                    await promise;
                    return dupeStage(stage);
                }, Promise.resolve(null));

                return {source: project, error: null};
            } catch (err) {
                console.log(err);
                return {source: null, error: err.message}
            }
        });
    }

    /**
     * Perform a soft-delete on a project.  This does not change the deleted status of the associated stages so that if
     * this action is reversed the correct stages reappear (otherwise we could not differentiate between those
     * archived due to project archive and those who has already been deleted independently).
     * @param id project to archive id
     */
    public static async archiveProject(id: string): Promise<ArchiveMutationOutput> {
        try {
            const affectedRowCount = await Project.destroy({where: {id}});

            if (affectedRowCount > 0) {
                return {id, error: null};
            } else {
                return {id, error: "The project could not be deleted for unknown reasons."};
            }
        } catch (err) {
            return {id, error: err.message}
        }
    }
}

const TableName = "Projects";

export const modelInit = (sequelize: Sequelize) => {
    Project.init({
        id: {
            primaryKey: true,
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4
        },
        name: {
            type: DataTypes.TEXT
        },
        description: {
            type: DataTypes.TEXT
        },
        root_path: {
            type: DataTypes.TEXT
        },
        log_root_path: {
            type: DataTypes.TEXT
        },
        sample_number: {
            type: DataTypes.INTEGER
        },
        sample_x_min: {
            type: DataTypes.DOUBLE
        },
        sample_x_max: {
            type: DataTypes.DOUBLE
        },
        sample_y_min: {
            type: DataTypes.DOUBLE
        },
        sample_y_max: {
            type: DataTypes.DOUBLE
        },
        sample_z_min: {
            type: DataTypes.DOUBLE
        },
        sample_z_max: {
            type: DataTypes.DOUBLE
        },
        region_x_min: {
            type: DataTypes.DOUBLE
        },
        region_x_max: {
            type: DataTypes.DOUBLE
        },
        region_y_min: {
            type: DataTypes.DOUBLE
        },
        region_y_max: {
            type: DataTypes.DOUBLE
        },
        region_z_min: {
            type: DataTypes.DOUBLE
        },
        region_z_max: {
            type: DataTypes.DOUBLE
        },
        user_parameters: {
            type: DataTypes.TEXT,
        },
        plane_markers: {
            type: DataTypes.TEXT,
        },
        is_processing: {
            type: DataTypes.BOOLEAN
        },
        input_source_state: {
            type: DataTypes.INTEGER
        },
        last_seen_input_source: {
            type: DataTypes.DATE
        },
        last_checked_input_source: {
            type: DataTypes.DATE
        },
    }, {
        tableName: TableName,
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
        deletedAt: "deleted_at",
        paranoid: true,
        sequelize
    });
};

export const modelAssociate = () => {
    Project.hasMany(PipelineStage, {foreignKey: "project_id", as: {singular: "stage", plural: "stages"}});
};
