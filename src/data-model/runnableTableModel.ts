import {TableModel, ITableModelRow} from "./tableModel";

export interface IRunnableTableModelRow extends ITableModelRow {
    is_processing: boolean;
}

export abstract class RunnableTableModel<T extends IRunnableTableModelRow> extends TableModel<T> {
    public constructor(tableName: string) {
        super(tableName);
    }

    public async setProcessingStatus(id: string, shouldBeActive: boolean): Promise<T> {
        let row: T = await this.get(id);

        row.is_processing = shouldBeActive;

        await this.save(row);

        return row;
    }

    protected didFetchRow(row: T): T {
        row = super.didFetchRow(row);

        // boolean comes through as 0 or 1.  Utilize truthiness of number type.

        row.is_processing = (row.is_processing ? 1 : 0) > 0;

        return row;
    }

    protected willSoftDelete(row: T): T {
        row.is_processing = false;

        return row;
    }
}
