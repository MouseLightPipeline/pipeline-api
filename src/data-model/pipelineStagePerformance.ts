import * as uuid from "node-uuid";
const AsyncLock = require("async");

const debug = require("debug")("mouselight:pipeline-api:pipeline-stage-performance");

import {knex} from "../data-access/knexConnector";

import {TableModel, ITableModelRow} from "./tableModel";
import {CompletionStatusCode, ITaskExecution} from "../schedulers/pipelineScheduler";

enum PerformanceQueueActions {
    Reset = 0,
    UpdateStatistics = 1,
    UpdateCounts = 2
}

interface IPerformanceQueueItem {
    action: PerformanceQueueActions;
    context: any
}

interface IUpdateCountsQueueItem {
    pipeline_stage_id: string;
    inProcess: number;
    waiting: number;
}

interface IUpdateStatsQueueItem {
    pipeline_stage_id: string;
    status: CompletionStatusCode;
    memory_mb: number;
    cpu_percent: number;
    duration_ms: number;
}

export interface IPipelineStagePerformance extends ITableModelRow {
    pipeline_stage_id: string;
    num_in_process: number;
    num_ready_to_process: number;
    num_execute: number;
    num_complete: number;
    num_error: number;
    num_cancel: number;
    cpu_average: number;
    cpu_high: number;
    cpu_low: number;
    memory_average: number;
    memory_high: number;
    memory_low: number;
    duration_average: number;
    duration_high: number;
    duration_low: number;
}

export class PipelineStagePerformance extends TableModel<IPipelineStagePerformance> {
    public constructor() {
        super("PipelineStagePerformance");
    }

    public async getForStage(pipeline_stage_id: string): Promise<IPipelineStagePerformance> {
        let performance = await this.getOneRelationship("pipeline_stage_id", pipeline_stage_id);

        return performance || this.create(pipeline_stage_id);
    }

    public async updateCountsForPipelineStage(updateTask: IUpdateCountsQueueItem) {
        let performance = await this.getForStage(updateTask.pipeline_stage_id);

        if (!performance) {
            return;
        }

        performance.num_in_process = updateTask.inProcess;
        performance.num_ready_to_process = updateTask.waiting;

        await this.save(performance);
    }

    public async updateForPipelineStage(updateTask: IUpdateStatsQueueItem) {
        let performance = await this.getForStage(updateTask.pipeline_stage_id);

        if (!performance) {
            return;
        }

        switch (updateTask.status) {
            case CompletionStatusCode.Cancel:
                performance.num_cancel++;
                break;
            case CompletionStatusCode.Error:
                performance.num_error++;
                break;
            case CompletionStatusCode.Success:
                updatePerformanceStatistics(performance, updateTask.cpu_percent, updateTask.memory_mb, updateTask.duration_ms);
                performance.num_complete++;
                break;
            default:
                return; // Should only be updated on completion of some form.
        }

        performance.num_execute++;

        await this.save(performance);
    }

    public async reset(now: boolean = false) {
        if (now) {
            await knex(this.tableName).select().del();
        } else {
            queue.push({
                action: PerformanceQueueActions.Reset,
                context: null
            }, (err) => {
            });
        }

        return 0;
    }

    private async create(pipelineStageId: string): Promise<IPipelineStagePerformance> {
        let pipelineStage = create(pipelineStageId);

        return await this.insertRow(pipelineStage);
    }
}

function create(pipelineStageId: string): IPipelineStagePerformance {
    return {
        id: uuid.v4(),
        pipeline_stage_id: pipelineStageId,
        num_in_process: 0,
        num_ready_to_process: 0,
        num_execute: 0,
        num_complete: 0,
        num_error: 0,
        num_cancel: 0,
        cpu_average: 0,
        cpu_high: -Infinity,
        cpu_low: Infinity,
        memory_average: 0,
        memory_high: -Infinity,
        memory_low: Infinity,
        duration_average: 0,
        duration_high: -Infinity,
        duration_low: Infinity,
        created_at: null,
        updated_at: null,
        deleted_at: null
    };
}

export const pipelineStagePerformanceInstance = new PipelineStagePerformance();

const queue = AsyncLock.queue(async(updateItem: IPerformanceQueueItem, callback) => {
    try {
        switch (updateItem.action) {
            case PerformanceQueueActions.Reset:
                await pipelineStagePerformanceInstance.reset(true);
                break;
            case PerformanceQueueActions.UpdateStatistics:
                await pipelineStagePerformanceInstance.updateForPipelineStage(updateItem.context);
                break;
            case PerformanceQueueActions.UpdateCounts:
                await pipelineStagePerformanceInstance.updateCountsForPipelineStage(updateItem.context);
                break;
        }
    } catch (err) {
        console.log(err);
    }

    callback();
}, 1);

queue.error = (err) => {
    console.log("queue error");
};

function updatePerformanceStatistics(performance: IPipelineStagePerformance, cpu: number, mem: number, duration_ms: number) {
    updatePerformance(performance, "cpu", cpu);
    updatePerformance(performance, "memory", mem);
    updatePerformance(performance, "duration", duration_ms / 1000 / 3600);
}

function updatePerformance(performance: IPipelineStagePerformance, statName: string, latestPerformance: number) {
    if (latestPerformance == null || isNaN(latestPerformance)) {
        return;
    }

    performance[statName + "_average"] = updateAverage(performance[statName + "_average"], performance.num_complete, latestPerformance);
    performance[statName + "_high"] = Math.max(performance[statName + "_high"], latestPerformance);
    performance[statName + "_low"] = Math.min(performance[statName + "_low"], latestPerformance);
}

function updateAverage(existing_average: number, existing_count: number, latestValue: number) {
    return ((existing_average * existing_count) + latestValue ) / (existing_count + 1);
}

export function updatePipelineStageCounts(pipelineStageId: string, inProcess: number, waiting: number) {
    queue.push({
        action: PerformanceQueueActions.UpdateCounts,
        context: {
            pipeline_stage_id: pipelineStageId,
            inProcess: inProcess,
            waiting: waiting,
        }
    }, (err) => {
    });
}

export function updatePipelineStagePerformance(pipelineStageId: string, taskExecution: ITaskExecution) {
    let duration_ms = null;

    if (taskExecution.completed_at && taskExecution.started_at) {
        duration_ms = taskExecution.completed_at.valueOf() - taskExecution.started_at.valueOf();
    }

    queue.push({
        action: PerformanceQueueActions.UpdateStatistics,
        context: {
            pipeline_stage_id: pipelineStageId,
            status: taskExecution.completion_status_code,
            cpu_percent: taskExecution.max_cpu,
            memory_mb: taskExecution.max_memory,
            duration_ms: duration_ms
        }
    }, (err) => {
    });
}


