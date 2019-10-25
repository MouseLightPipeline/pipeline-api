import * as path from "path";
import {Sequelize, Model, DataTypes, HasManyGetAssociationsMixin, BelongsToGetAssociationMixin, Op} from "sequelize"

import {ServiceOptions} from "../../options/serverOptions";
import {TaskRepository} from "./taskRepository";
import {PipelineStage} from "./pipelineStage";
import {ArchiveMutationOutput, MutationOutput} from "../../graphql/pipelineServerResolvers";

export enum TaskArgumentType {
    Literal = 0,
    Parameter = 1
}

export interface ITaskArgument {
    value: string;
    type: TaskArgumentType;
}

export interface ITaskDefinitionInput {
    id?: string;
    name?: string;
    description?: string;
    script?: string;
    interpreter?: string;
    script_args?: string;
    cluster_args?: string;
    expected_exit_code?: number;
    local_work_units?: number;
    cluster_work_units?: number;
    log_prefix?: string;
    task_repository_id?: string;
}

const TableName = "TaskDefinitions";

export class TaskDefinition extends Model {
    public id: string;
    public name: string;
    public description: string;
    public script: string;
    public interpreter: string;
    public script_args: string;
    public cluster_args: string;
    public expected_exit_code: number;
    public local_work_units: number;
    public cluster_work_units: number;
    public log_prefix: string;
    public task_repository_id: string;
    public readonly created_at: Date;
    public readonly updated_at: Date;
    public readonly deleted_at: Date;

    public getStages!: HasManyGetAssociationsMixin<PipelineStage>;
    public getTaskRepository!: BelongsToGetAssociationMixin<TaskRepository>;

    public async getFullScriptPath(resolveRelative: boolean): Promise<string> {
        let scriptPath = this.script;

        if (this.task_repository_id) {
            const repo = await TaskRepository.findByPk(this.task_repository_id);

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

    /**
     * Find all tasks in repos that have not been deleted.
     */
    public static async getAll(): Promise<TaskDefinition[]> {
        const repos = await TaskRepository.findAll();

        return TaskDefinition.findAll({where: {task_repository_id: {[Op.in]: repos.map(p => p.id)}}});
    }

    public static async createTaskDefinition(taskDefinition: ITaskDefinitionInput): Promise<MutationOutput<TaskDefinition>> {
        try {
            const result = await TaskDefinition.create(taskDefinition);

            return {source: result, error: null};
        } catch (err) {
            return {source: null, error: err.message}
        }
    }

    public static async updateTaskDefinition(taskDefinition: ITaskDefinitionInput): Promise<MutationOutput<TaskDefinition>> {
        try {
            let row = await TaskDefinition.findByPk(taskDefinition.id);

            await row.update(taskDefinition);

            row = await TaskDefinition.findByPk(taskDefinition.id);

            return {source: row, error: null};
        } catch (err) {
            return {source: null, error: err.message}
        }
    }

    public static async duplicateTask(id: string): Promise<MutationOutput<TaskDefinition>> {
        try {
            const input: ITaskDefinitionInput = (await TaskDefinition.findByPk(id)).toJSON();

            input.id = undefined;
            input.name += " copy";

            const taskDefinition = await TaskDefinition.create(input);

            return {source: taskDefinition, error: null};
        } catch (err) {
            console.log(err);
            return {source: null, error: err.message}
        }
    }

    public static async archiveTaskDefinition(id: string): Promise<ArchiveMutationOutput> {
        try {
            const affectedRowCount = await TaskDefinition.destroy({where: {id}});

            if (affectedRowCount > 0) {
                return {id, error: null};
            } else {
                return {id: null, error: `Could not delete task definition with id ${id}`};
            }
        } catch (err) {
            return {id: null, error: err.message}
        }
    }
}

export const modelInit = (sequelize: Sequelize) => {
    TaskDefinition.init({
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
    TaskDefinition.belongsTo(TaskRepository, {foreignKey: "task_repository_id"});
    TaskDefinition.hasMany(PipelineStage, {foreignKey: "task_id", as: {singular: "stage", plural: "stages"}});
};
