import * as path from "path";
import {Instance, Model} from "sequelize";
import {IPipelineStage} from "./pipelineStage";
import {ServiceOptions} from "../../options/serverOptions";

export enum TaskArgumentType {
    Literal = 0,
    Parameter = 1
}

export interface ITaskArgument {
    value: string;
    type: TaskArgumentType;
}

export interface ITaskDefinitionAttributes {
    id: string;
    name: string;
    description: string;
    script: string;
    interpreter: string;
    script_args: string;
    cluster_args: string;
    expected_exit_code: number;
    local_work_units: number;
    cluster_work_units: number;
    log_prefix: string;
    task_repository_id: string;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date;
}

export interface ITaskDefinition extends Instance<ITaskDefinitionAttributes>, ITaskDefinitionAttributes {
    user_arguments: ITaskArgument[];

    getStages(): Promise<IPipelineStage[]>

    getFullScriptPath(resolveRelative: boolean): Promise<string>;
}

export interface ITaskDefinitionTable extends Model<ITaskDefinition, ITaskDefinitionAttributes> {
}

export const TableName = "TaskDefinitions";

export function sequelizeImport(sequelize, DataTypes) {
    let TaskRepositories: any = null;

    const TaskDefinition = sequelize.define(TableName, {
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
        script: {
            type: DataTypes.TEXT,
            defaultValue: ""
        },
        interpreter: {
            type: DataTypes.TEXT,
            defaultValue: ""
        },
        script_args: {
            type: DataTypes.TEXT,
            defaultValue: ""
        },
        cluster_args: {
            type: DataTypes.TEXT,
            defaultValue: ""
        },
        expected_exit_code: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        local_work_units: {
            type: DataTypes.DOUBLE,
            defaultValue: 0
        },
        cluster_work_units: {
            type: DataTypes.DOUBLE,
            defaultValue: 0
        },
        log_prefix: {
            type: DataTypes.TEXT,
            defaultValue: ""
        }
    }, {
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
        deletedAt: "deleted_at",
        paranoid: true,
        getterMethods: {
            user_arguments: function() {
                return JSON.parse(this.script_args).arguments;
            }
        },
        setterMethods: {
            user_arguments: function(value) {
                this.setDataValue("script_args", JSON.stringify({arguments: value}));
            }
        }
    });

    TaskDefinition.associate = models => {
        TaskDefinition.belongsTo(models.TaskRepositories, {foreignKey: "task_repository_id"});
        TaskDefinition.hasMany(models.PipelineStages, {foreignKey: "task_id", as: {singular: "stage", plural: "stages"}});

        TaskRepositories = models.TaskRepositories;
    };

    TaskDefinition.prototype.getFullScriptPath = async function (resolveRelative: boolean): Promise<string> {
        let scriptPath = this.script;

        if (this.task_repository_id) {
            const repo = await TaskRepositories.findByPk(this.task_repository_id);

            scriptPath = path.resolve(path.join(repo.location, scriptPath));
        } else {
            if (resolveRelative && !path.isAbsolute(scriptPath)) {
                scriptPath = path.join(process.cwd(), scriptPath);
            }
        }

        ServiceOptions.driveMapping.map(d => {
            if (scriptPath.startsWith(d.remote)) {
                scriptPath = d.local + scriptPath.slice(d.remote.length);
            }
        });

        return scriptPath;
    };

    return TaskDefinition;
}
