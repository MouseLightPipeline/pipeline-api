import * as uuid from "uuid";

import {IRunnableTableModelRow, RunnableTableModel} from "./runnableTableModel";
import {knex} from "../data-access/knexConnector";

export enum PipelineStageMethod {
    DashboardProjectRefresh = 1,
    MapTile = 2,
    ZIndexTileComparison = 3
}

export interface IPipelineStage extends IRunnableTableModelRow {
    name: string;
    description: string;
    project_id: string;
    task_id: string;
    previous_stage_id: string;
    dst_path: string;
    function_type: number;
    depth: number;
}

export class PipelineStages extends RunnableTableModel<IPipelineStage> {
    public constructor() {
        super("PipelineStage");
    }

    public async create(name: string, description: string, project_id: string, task_id: string, previous_stage_id: string, dst_path: string, function_type: PipelineStageMethod): Promise<IPipelineStage> {
        let previousDepth = 0;

        if (previous_stage_id) {
            let previousStage = await this.get(previous_stage_id);

            if (previousStage) {
                previousDepth = previousStage.depth;
            }
        }

        let pipelineStage = {
            id: uuid.v4(),
            name: name,
            description: description,
            project_id: project_id,
            task_id: task_id,
            previous_stage_id: previous_stage_id,
            dst_path: dst_path,
            is_processing: false,
            function_type: function_type,
            depth: previousDepth + 1,
            created_at: null,
            updated_at: null,
            deleted_at: null
        };

        return await this.insertRow(pipelineStage);
    }

    public async getForProject(id: string): Promise<IPipelineStage[]> {
        let objList = await knex(this.tableName).select(this.idKey).where({project_id: id}).whereNull("deleted_at").orderBy("id");

        let idList = <string[]>objList.map(obj => obj.id);

        return this.fetch(idList);
    }
}
