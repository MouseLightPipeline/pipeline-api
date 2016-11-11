const DataLoader = require("dataloader");

import {knex} from "../data-access/knexConnector"

export interface ITableModelRow {
    id: string;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date;
}

export abstract class TableModel<T extends ITableModelRow> {
    private _dataLoader: any;

    private _tableName = "";
    private _idKey = "";

    public constructor(tableName: string, idKey: string = "id") {
        this._tableName = tableName;
        this._idKey = idKey;
        this._dataLoader = new DataLoader((keys: string[]) => this.fetch(keys));
    }

    public async get(id: string) {
        return this._dataLoader.load(id);
    }

    public async getAll() {
        let ids = await this._getIdList();

        return this._dataLoader.loadMany(ids);
    }

    public get idKey(): string {
        return this._idKey;
    }

    public get tableName(): string {
        return this._tableName;
    }

    public async save(row: T) {
        if (row.created_at == null) {
            row.created_at = new Date();

            await knex(this._tableName).insert(row);
        } else {
            if (!row.deleted_at) {
                row.updated_at = new Date();
            }

            await knex(this._tableName).where(this._idKey, row.id).update(row);

            this._dataLoader.clear(row.id);
        }

        // Reload for caller.
        return this.get(row.id);
    }

    protected didFetchRow(row: T): T {
        return row;
    }

    private async _getIdList() {
        let objList = await knex(this._tableName).select(this._idKey);

        return <string[]>objList.map(obj => obj.id);
    }

    private fetch(keys: string[]): Promise<T[]> {
        return new Promise<T[]>((resolve) => {
            knex(this.tableName).whereIn(this.idKey, keys).then((rows) => {
                rows = rows.map(row => this.didFetchRow(row));
                resolve(rows);
            });
        });
    }
}