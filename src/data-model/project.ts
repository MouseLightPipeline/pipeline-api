import * as uuid from "node-uuid";

import {IRunnableTableModelRow, RunnableTableModel} from "./runnableTableModel";

export interface IProjectGridRegion {
    x_min: number;
    x_max: number;
    y_min: number;
    y_max: number;
    z_min: number;
    z_max: number;
}

export interface IProject extends IRunnableTableModelRow {
    name: string;
    description: string;
    root_path: string;
    sample_number: number;
    region_x_min: number;
    region_x_max: number;
    region_y_min: number;
    region_y_max: number;
    region_z_min: number;
    region_z_max: number;
}

export class Projects extends RunnableTableModel<IProject> {
    public constructor() {
        super("Project");
    }

    public async create(name: string, description: string, rootPath: string, sampleNumber: number, region: IProjectGridRegion): Promise<IProject> {
        let project = {
            id: uuid.v4(),
            name: name,
            description: description,
            root_path: rootPath,
            sample_number: sampleNumber,
            region_x_min: region.x_min,
            region_x_max: region.x_max,
            region_y_min: region.y_min,
            region_y_max: region.y_max,
            region_z_min: region.z_min,
            region_z_max: region.z_max,
            is_active: false,
            created_at: null,
            updated_at: null,
            deleted_at: null
        };

        return await this.insertRow(project);
    }
}
