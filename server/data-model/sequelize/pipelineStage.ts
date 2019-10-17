import {
    Sequelize,
    Model,
    DataTypes,
    Transaction,
    BelongsToGetAssociationMixin, Association
} from "sequelize";
import {Project} from "./project";
import {TaskDefinition} from "./taskDefinition";

export enum PipelineStageMethod {
    DashboardProjectRefresh = 1,
    MapTile = 2,
    XAdjacentTileComparison = 3,
    YAdjacentTileComparison = 4,
    ZAdjacentTileComparison = 5
}

export interface IPipelineStageInput {
    id?: string;
    name?: string;
    description?: string;
    dst_path?: string;
    function_type?: PipelineStageMethod;
    depth?: number;
    is_processing?: boolean;
    project_id?: string;
    previous_stage_id?: string;
    task_id?: string;
}

/*
export interface IPipelineStage extends Instance<IPipelineStageAttributes>, IPipelineStageAttributes {
    getProject(): Promise<IProject[]>;
}

export interface IPipelineStageTable extends Model<IPipelineStage, IPipelineStageAttributes> {
    createFromInput(stageInput: IPipelineStageAttributes): Promise<IPipelineStage>;
    remove(transaction: Transaction, id: string): Promise<IPipelineStage>;
}
*/

export class PipelineStage extends Model {
    public id: string;
    public name: string;
    public description: string;
    public dst_path: string;
    public function_type: PipelineStageMethod;
    public depth: number;
    public is_processing: boolean;
    public project_id: string;
    public previous_stage_id: string | null;
    public task_id: string;

    public readonly created_at: Date;
    public readonly updated_at: Date;
    public readonly deleted_at: Date;

    public getProject!: BelongsToGetAssociationMixin<Project>;
    public getTaskDefinition!: BelongsToGetAssociationMixin<TaskDefinition>;
    public getPreviousStage!: BelongsToGetAssociationMixin<PipelineStage>;

    public static createFromInput = async (stageInput: IPipelineStageInput): Promise<PipelineStage> => {
        let previousDepth = 0;

        if (stageInput.previous_stage_id) {
            let previousStage = await PipelineStage.findByPk(stageInput.previous_stage_id);

            if (previousStage) {
                previousDepth = previousStage.depth;
            }
        }

        let pipelineStage = {
            name: stageInput.name,
            description: stageInput.description,
            project_id: stageInput.project_id,
            task_id: stageInput.task_id,
            previous_stage_id: stageInput.previous_stage_id,
            dst_path: stageInput.dst_path,
            is_processing: false,
            function_type: stageInput.function_type,
            depth: previousDepth + 1
        };

        return PipelineStage.create(pipelineStage);
    };

    public static async remove(id: string): Promise<string> {
        return this.sequelize.transaction(async (t: Transaction) => {
            const stage: PipelineStage = await PipelineStage.findByPk(id);

            if (stage) {
                const children: PipelineStage[] = await PipelineStage.findAll({
                    where: {previous_stage_id: id},
                    transaction: t
                });

                await Promise.all(children.map(async (c) => {
                    return c.update({previous_stage_id: stage.previous_stage_id}, {transaction: t});
                }));

                await PipelineStage.destroy({where: {id}, transaction: t});
            }

            return id;
        });
    };

    public async duplicate(project: Project, t: Transaction): Promise<PipelineStage> {
        const data: any = Object.assign(this.toJSON(), {
            project_id: project.id,
            previous_stage_id: null,
            dst_path: this.dst_path + "-copy",
            is_processing: false
        });

        delete data.id;
        delete data.created_at;
        delete data.updated_at;

        return PipelineStage.create(data, {transaction: t});
    }
}

const TableName = "PipelineStages";

export const modelInit = (sequelize: Sequelize) => {
    PipelineStage.init({
        id: {
            primaryKey: true,
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4
        },
        name: {
            type: DataTypes.TEXT,
            defaultValue: ""
        },
        description: {
            type: DataTypes.TEXT,
            defaultValue: ""
        },
        dst_path: {
            type: DataTypes.TEXT,
            defaultValue: ""
        },
        function_type: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        depth: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        is_processing: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        }
    }, {
        tableName: TableName,
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
        deletedAt: "deleted_at",
        paranoid: true,
        sequelize
    })
};

export const modelAssociate = () => {
    PipelineStage.belongsTo(Project, {foreignKey: "project_id"});
    PipelineStage.belongsTo(PipelineStage, {foreignKey: "previous_stage_id"});
    PipelineStage.belongsTo(TaskDefinition, {foreignKey: "task_id"});
};

/*
export function sequelizeImport(sequelize, DataTypes) {
    const PipelineStage = sequelize.define(TableName, {
        id: {
            primaryKey: true,
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4
        },
        name: {
            type: DataTypes.TEXT,
            defaultValue: ""
        },
        description: {
            type: DataTypes.TEXT,
            defaultValue: ""
        },
        dst_path: {
            type: DataTypes.TEXT,
            defaultValue: ""
        },
        function_type: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        depth: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        is_processing: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        }
    }, {
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
        deletedAt: "deleted_at",
        paranoid: true
    });

    PipelineStage.associate = models => {
        PipelineStage.belongsTo(models.Projects, {foreignKey: "project_id"});
        PipelineStage.belongsTo(models.PipelineStages, {foreignKey: "previous_stage_id"});
        PipelineStage.belongsTo(models.TaskDefinitions, {foreignKey: "task_id"});
    };

    PipelineStage.createFromInput = async (stageInput: IPipelineStageAttributes): Promise<IPipelineStageAttributes> => {
        let previousDepth = 0;

        if (stageInput.previous_stage_id) {
            let previousStage = await PipelineStage.findByPk(stageInput.previous_stage_id);

            if (previousStage) {
                previousDepth = previousStage.depth;
            }
        }

        let pipelineStage = {
            name: stageInput.name,
            description: stageInput.description,
            project_id: stageInput.project_id,
            task_id: stageInput.task_id,
            previous_stage_id: stageInput.previous_stage_id,
            dst_path: stageInput.dst_path,
            is_processing: false,
            function_type: stageInput.function_type,
            depth: previousDepth + 1
        };

        return PipelineStage.create(pipelineStage);
    };

    PipelineStage.remove = async (t: Transaction, id: string): Promise<string> => {
        const stage: IPipelineStage = await PipelineStage.findByPk(id);

        if (stage) {
            const children: IPipelineStage[] = await PipelineStage.findAll({where: {previous_stage_id: id}});

            await Promise.all(children.map(async (c) => {
                return c.update({previous_stage_id: stage.previous_stage_id});
            }));

            await PipelineStage.destroy({where: {id}});
        }

        return id;
    };

    return PipelineStage;
}
*/