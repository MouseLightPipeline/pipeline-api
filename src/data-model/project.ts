import * as uuid from "node-uuid";

import {IRunnableTableModelRow, RunnableTableModel} from "./runnableTableModel";

export interface IProject extends IRunnableTableModelRow {
    name: string;
    description: string;
    root_path: string;
    sample_number: number;
}

export class Projects extends RunnableTableModel<IProject> {
    public constructor() {
        super("Project");
    }

    public async create(name: string, description: string, rootPath: string, sampleNumber: number): Promise<IProject> {
        let project = {
            id: uuid.v4(),
            name: name,
            description: description,
            root_path: rootPath,
            sample_number: sampleNumber,
            is_active: false,
            created_at: null,
            updated_at: null,
            deleted_at: null
        };

        return await this.insertRow(project);
    }
}
