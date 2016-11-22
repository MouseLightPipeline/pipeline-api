import {TableModel, ITableModelRow} from "./tableModel";

export interface IRunnableTableModelRow extends ITableModelRow {
    is_active: boolean;
}

export abstract class RunnableTableModel<T extends IRunnableTableModelRow> extends TableModel<T> {
    public constructor(tableName: string) {
        super(tableName);
    }

    public async setStatus(id: string, shouldBeActive: boolean): Promise<T> {
        let project: T = await this.get(id);

        project.is_active = shouldBeActive;

        await this.save(project);

        return project;
    }

    protected willSoftDelete(row: T): T {
        row.is_active = false;

        return row;
    }
}
