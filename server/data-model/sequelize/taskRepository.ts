import {Sequelize, Model, DataTypes, HasManyGetAssociationsMixin} from "sequelize";

import {ArchiveMutationOutput, MutationOutput} from "../../graphql/pipelineServerResolvers";
import {TaskDefinition} from "./taskDefinition";

export interface ITaskRepositoryInput {
    id?: string;
    name: string;
    description?: string;
    location: string;
}

export class TaskRepository extends Model {
    public id: string;
    public name: string;
    public description: string;
    public location: string;
    public readonly created_at: Date;
    public readonly updated_at: Date;
    public readonly deleted_at: Date;

    public getTasks!: HasManyGetAssociationsMixin<TaskDefinition>;

    public static async createTaskRepository(taskRepository: ITaskRepositoryInput): Promise<MutationOutput<TaskRepository>> {
        try {
            const result = await TaskRepository.create(taskRepository);

            return {source: result, error: null};

        } catch (err) {
            return {source: null, error: err.message}
        }
    }

    public static async updateTaskRepository(taskRepository: ITaskRepositoryInput): Promise<MutationOutput<TaskRepository>> {
        try {
            let row = await TaskRepository.findByPk(taskRepository.id);

            await row.update(taskRepository);

            row = await TaskRepository.findByPk(taskRepository.id);

            return {source: row, error: null};
        } catch (err) {
            return {source: null, error: err.message}
        }
    }

    public static async archiveTaskRepository(id: string): Promise<ArchiveMutationOutput> {
        try {
            const affectedRowCount = await TaskRepository.destroy({where: {id}});

            if (affectedRowCount > 0) {
                return {id, error: null};
            } else {
                return {id, error: `Could not delete repository with id {id}`};
            }
        } catch (err) {
            return {id, error: err.message}
        }
    }
}

const TableName = "TaskRepositories";

export const modelInit = (sequelize: Sequelize) => {
    TaskRepository.init({

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
        location: {
            type: DataTypes.TEXT,
            defaultValue: ""
        }
    }, {
        tableName: TableName,
        freezeTableName: true,
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
        deletedAt: "deleted_at",
        paranoid: true,
        sequelize
    });
};

export const modelAssociate = () => {
    TaskRepository.hasMany(TaskDefinition, {foreignKey: "task_repository_id", as: "tasks"});
};
