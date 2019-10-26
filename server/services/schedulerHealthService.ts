import {SchedulerServiceOptions} from "../options/coreServicesOptions";

export type SchedulerHealth = {
    lastResponse: number;
    lastSeen: Date;
}

export class SchedulerHealthService {
    private static _instance: SchedulerHealthService = null;

    public static get Instance(): SchedulerHealthService {
        if (this._instance === null) {
            this._instance = new SchedulerHealthService();
        }

        return this._instance;
    }

    private _lastResponse: number = 404;

    public get lastResponse(): number {
        return this._lastResponse;
    }

    private _lastSeen: Date = null;

    public get lastSeen(): Date {
        return this._lastSeen;
    }

    public get CurrentHealth(): SchedulerHealth {
        return {
            lastResponse: this.lastResponse,
            lastSeen: this.lastSeen
        };
    }

    public start(): SchedulerHealthService {
        setInterval(async () => {
            try {
                const response = await fetch(`http://${SchedulerServiceOptions.host}:${SchedulerServiceOptions.port}/healthcheck`, {
                    headers: {
                        "Access-Control-Allow-Origin": "*",
                    },
                    method: "GET"
                });

                this._lastResponse = response.status;

                if (this._lastResponse === 200) {
                    this._lastSeen = new Date();
                }
            } catch {
                this._lastResponse = 404;
            }
        }, 10000);

        return this;
    }
}
