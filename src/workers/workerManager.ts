import Timer = NodeJS.Timer;

import {TileStatusFileWorker} from "./tileStatusFileWorker";
import {IProject, Projects} from "../data-model/project";

export class WorkerManager {
    private static _instance: WorkerManager = null;

    public static get Instance(): WorkerManager {
        if (!this._instance) {
            this._instance = new WorkerManager();
        }

        return this._instance;
    }

    private _tileStatusFileWorker: TileStatusFileWorker = TileStatusFileWorker.Instance;

    private constructor() {
    }

    public async restartActive() {
        let projects = await new Projects().getAll();

        projects.filter(project => project.is_active).map(project => this.activate(project));
    }

    public async setProjectStatus(id: string, shouldBeActive: boolean): Promise<IProject> {
        let projects = new Projects();

        let project: IProject = await projects.get(id);

        if (project) {
            projects.setStatus(id, shouldBeActive);

            shouldBeActive ? this.activate(project) : this.deactivate(project);
        }

        return project;
    }

    private activate(project) {
        this._tileStatusFileWorker.activateProject(project);
    }

    private deactivate(project) {
        this._tileStatusFileWorker.deactivateProject(project);
    }
}