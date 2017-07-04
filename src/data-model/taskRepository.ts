import {TableModel, ITableModelRow} from "./tableModel";

export interface ITaskRepository extends ITableModelRow {
    name: string;
    description: string;
    location: string;
}

export class TaskRepositories extends TableModel<ITaskRepository> {
    public constructor() {
        super("TaskRepository");
    }

    public async create(taskRepository: ITaskRepository): Promise<ITaskRepository> {
        taskRepository.description = taskRepository.description || "";

        return this.insertRow(taskRepository);
    }

    public async updateRepository(taskRepository: ITaskRepository): Promise<ITaskRepository> {
        if (!taskRepository.id || taskRepository.id.length === 0) {
            throw "Update requires a valid repository identifier";
        }

        let row = await this.get(taskRepository.id);

        if (!row) {
            throw "Update requires a valid repository identifier";
        }

        row.name = taskRepository.name || row.name;
        row.description = taskRepository.description || row.description;
        row.location = taskRepository.location || row.location;

        return this.save(row);
    }
}
