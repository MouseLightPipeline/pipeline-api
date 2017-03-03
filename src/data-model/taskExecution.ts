/**
 * Mirrors values in acq-dashboard-worker-api
 */
export enum ExecutionStatusCode {
    Undefined = 0,
    Initializing = 1,
    Running = 2,
    Orphaned = 3,   // Was marked initialized/running but can not longer find in process manager list
    Completed = 4
}

/**
 * Mirrors values in acq-dashboard-worker-api
 */
export enum CompletionStatusCode {
    Incomplete = 1,
    Cancel = 2,
    Success = 3,
    Error = 4
}

/**
 * Mirror or subset of interface defined in acq-dashboard-worker-api as needed to monitor task execution status.
 *
 * Not backed directly in any database.
 */
export interface ITaskExecution {
    id?: string;
    execution_status_code?: ExecutionStatusCode;
    completion_status_code?: CompletionStatusCode;
    last_process_status_code?: number;
    max_memory?: number;
    max_cpu?: number;
    work_units?: number;
    started_at?: Date;
    completed_at?: Date;
}

