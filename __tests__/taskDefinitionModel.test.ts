import {
    copyDatabase,
    removeDatabase,
    DefaultTaskRepositoryId,
    LineFixTaskDefinitionDefaultId,
    DescriptorsTaskDefinitionDefaultId,
    DevelopmentTaskRepositoryId
} from "./testUtil";

import {TaskDefinition} from "../server/data-model/system/taskDefinition";

test("data-access:task-definition:get-repo", async () => {
    let task = await TaskDefinition.findByPk(LineFixTaskDefinitionDefaultId);
    expect(task).toBeDefined();

    const repo = await task.getTaskRepository();

    expect(repo).toBeDefined();
    expect(repo.id).toBe(DefaultTaskRepositoryId);
});

test("data-access:task-definition:create-and-archive", async () => {
    const start = await TaskDefinition.count();

    const output = await TaskDefinition.createTaskDefinition({
        task_repository_id: DefaultTaskRepositoryId,
        name: "name-data",
        description: "description-data",
        script: "script-data",
        interpreter: "interpreter-data",
        script_args: "script_args-data",
        cluster_args: "cluster_args-data",
        expected_exit_code: 4,
        local_work_units: 8,
        cluster_work_units: 12,
        log_prefix: "log_prefix-data",
    });

    expect(output.error).toBeNull();

    expect(await TaskDefinition.count()).toBe(start + 1);

    const task = output.source;

    await task.reload();

    validateTask(task);

    const repo = await task.getTaskRepository();

    expect(repo).toBeDefined();
    expect(repo.id).toBe(DefaultTaskRepositoryId);

    await TaskDefinition.archiveTaskDefinition(task.id);

    expect(await TaskDefinition.count()).toBe(start);
});

test("data-access:task-definition:update", async () => {
    const output = await TaskDefinition.updateTaskDefinition({
        id: DescriptorsTaskDefinitionDefaultId,
        task_repository_id: DevelopmentTaskRepositoryId,
        name: "name-data",
        description: "description-data",
        script: "script-data",
        interpreter: "interpreter-data",
        script_args: "script_args-data",
        cluster_args: "cluster_args-data",
        expected_exit_code: 4,
        local_work_units: 8,
        cluster_work_units: 12,
        log_prefix: "log_prefix-data",
    });

    expect(output.error).toBeNull();

    const task = await TaskDefinition.findByPk(DescriptorsTaskDefinitionDefaultId);

    validateTask(task);

    const repo = await task.getTaskRepository();

    expect(repo).toBeDefined();
    expect(repo.id).toBe(DevelopmentTaskRepositoryId);

});

function validateTask(task: TaskDefinition) {
    expect(task.name).toBe("name-data");
    expect(task.description).toBe("description-data");
    expect(task.script).toBe("script-data");
    expect(task.interpreter).toBe("interpreter-data");
    expect(task.script_args).toBe("script_args-data");
    expect(task.cluster_args).toBe("cluster_args-data");
    expect(task.log_prefix).toBe("log_prefix-data");
    expect(task.expected_exit_code).toBe(4);
    expect(task.local_work_units).toBe(8);
    expect(task.cluster_work_units).toBe(12);
}

let tempDatabaseName = "";

beforeAll(async () => {
    tempDatabaseName = await copyDatabase();
});

afterAll(() => {
    removeDatabase(tempDatabaseName);
});
