import * as uuid from "uuid";

import {IRunnableTableModelRow, RunnableTableModel} from "./runnableTableModel";

export const NO_BOUND: number = -1;
export const NO_SAMPLE: number = -1;

export interface IProjectGridRegion {
    x_min: number;
    x_max: number;
    y_min: number;
    y_max: number;
    z_min: number;
    z_max: number;
}

export interface IProjectInput {
    id: string;
    name: string;
    description: string;
    root_path: string;
    sample_number: number;
    region_bounds: IProjectGridRegion;
}

export interface IProject extends IRunnableTableModelRow {
    name?: string;
    description?: string;
    root_path?: string;
    sample_number?: number;
    sample_x_min?: number;
    sample_x_max?: number;
    sample_y_min?: number;
    sample_y_max?: number;
    sample_z_min?: number;
    sample_z_max?: number;
    region_x_min?: number;
    region_x_max?: number;
    region_y_min?: number;
    region_y_max?: number;
    region_z_min?: number;
    region_z_max?: number;
}

export class Projects extends RunnableTableModel<IProject> {
    public static defaultManager() {
        return new Projects();
    }

    private constructor() {
        super("Project");
    }

    public async create(project: IProjectInput) {
        const region = project.region_bounds || {
                x_min: NO_BOUND,
                x_max: NO_BOUND,
                y_min: NO_BOUND,
                y_max: NO_BOUND,
                z_min: NO_BOUND,
                z_max: NO_BOUND
            };

        const row = {
            id: uuid.v4(),
            name: project.name || "",
            description: project.description || "",
            root_path: project.root_path || "",
            sample_number: project.sample_number || NO_SAMPLE,
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
            is_processing: false,
            created_at: null,
            updated_at: null,
            deleted_at: null
        };

        return await this.insertRow(row);
    }

    public async updateFromInputProject(project: IProjectInput): Promise<IProject> {
        if (!project.id || project.id.length === 0) {
            return this.create(project);
        }

        let row = await this.get(project.id);

        if (!row) {
            return this.create(project);
        }

        row.name = project.name || row.name;
        row.description = project.description || row.description;
        row.root_path = project.root_path || row.root_path;
        row.sample_number = project.sample_number || row.sample_number;

        if (project.region_bounds) {
            row.region_x_min = project.region_bounds.x_min;
            row.region_x_max = project.region_bounds.x_max;
            row.region_y_min = project.region_bounds.y_min;
            row.region_y_max = project.region_bounds.y_max;
            row.region_z_min = project.region_bounds.z_min;
            row.region_z_max = project.region_bounds.z_max;
        }

        return await this.save(row);
    }
}
