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

    public get(id: string): Promise<T> {
        return this._dataLoader.load(id);
    }

    public getAll(): Promise<T[]> {
        return new Promise<T[]>((resolve) => {
            knex(this._tableName).select(this.idKey).then((ids) => {
                this._dataLoader.loadMany(ids.map(obj => obj.id)).then((rows) => {
                    resolve(rows);
                });
            });
        });
    }

    public get idKey(): string {
        return this._idKey;
    }

    public get tableName(): string {
        return this._tableName;
    }

    private fetch(keys: string[]): Promise<T[]> {
        return new Promise<T[]>((resolve) => {
            knex(this.tableName).whereIn(this.idKey, keys).then((rows) => {
                resolve(rows);
            });
        });
    }
}