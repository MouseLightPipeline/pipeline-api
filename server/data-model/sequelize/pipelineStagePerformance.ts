export interface IPipelineStagePerformance {
    id?: string;
    pipeline_stage_id: string;
    num_in_process: number;
    num_ready_to_process: number;
    num_execute: number;
    num_complete: number;
    num_error: number;
    num_cancel: number;
    cpu_average: number;
    cpu_high: number;
    cpu_low: number;
    memory_average: number;
    memory_high: number;
    memory_low: number;
    duration_average: number;
    duration_high: number;
    duration_low: number;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date;
}

export const TableName = "PipelineStagePerformances";

export function sequelizeImport(sequelize, DataTypes) {
    const PipelineStagePerformance = sequelize.define(TableName, {
        id: {
            primaryKey: true,
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4
        },
        num_in_process: {
            type: DataTypes.INTEGER,
        },
        num_ready_to_process: {
            type: DataTypes.INTEGER,
        },
        num_execute: {
            type: DataTypes.INTEGER,
            defaultValue: ""
        },
        num_complete: {
            type: DataTypes.INTEGER,
            defaultValue: ""
        },
        num_error: {
            type: DataTypes.INTEGER,
            defaultValue: ""
        },
        num_cancel: {
            type: DataTypes.INTEGER,
        },
        duration_average: {
            type: DataTypes.FLOAT,
        },
        duration_high: {
            type: DataTypes.FLOAT,
        },
        duration_low: {
            type: DataTypes.FLOAT,
        },
        cpu_average: {
            type: DataTypes.FLOAT,
        },
        cpu_high: {
            type: DataTypes.FLOAT,
        },
        cpu_low: {
            type: DataTypes.FLOAT,
        },
        memory_average: {
            type: DataTypes.FLOAT,
        },
        memory_high: {
            type: DataTypes.FLOAT
        },
        memory_low: {
            type: DataTypes.FLOAT
        }
    }, {
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
        deletedAt: "deleted_at",
        paranoid: false
    });

    PipelineStagePerformance.associate = models => {
        PipelineStagePerformance.belongsTo(models.PipelineStages, {foreignKey: "pipeline_stage_id"});
    };

    return PipelineStagePerformance;
}
