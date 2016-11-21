import Timer = NodeJS.Timer;
import * as uuid from "node-uuid";

const debug = require("debug")("mouselight:pipeline-api:projects");

import {TableModel, ITableModelRow} from "./tableModel";

export interface IProject extends ITableModelRow {
    name: string;
    description: string;
    root_path: string;
    sample_number: number;
    is_active: boolean;
}

export class Projects extends TableModel<IProject> {
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

        await this.save(project);

        // Retrieves back through data loader
        project = await this.get(project.id);

        return project;
    }

    public async setStatus(id: string, shouldBeActive: boolean): Promise<IProject> {
        let project: IProject = await this.get(id);

        project.is_active = shouldBeActive;

        await this.save(project);

        return project;
    }
}
