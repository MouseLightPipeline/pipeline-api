import {
    copyDatabase,
    removeDatabase,
    DefaultTaskRepositoryId
} from "./testUtil";

import {TaskRepository} from "../server/data-model/system/taskRepository";

test("data-access:task-repository:get-tasks", async () => {
    let repo = await TaskRepository.findByPk(DefaultTaskRepositoryId);
    expect(repo).toBeDefined();

    const tasks = await repo.getTasks();

    expect(tasks).toBeDefined();
    expect(tasks.length).toBe(9);
});

test("data-access:task-repository:create-and-archive", async () => {
    const start = await TaskRepository.count();

    const output = await TaskRepository.createTaskRepository({
        name: "created",
        description: "described",
        location: "/foo/bar"
    });

    expect(output.error).toBeNull();

    expect(await TaskRepository.count()).toBe(start + 1);

    const repo = output.source;

    await repo.reload();

    expect(repo.name).toBe("created");
    expect(repo.description).toBe("described");
    expect(repo.location).toBe("/foo/bar");

    await TaskRepository.archiveTaskRepository(repo.id);

    expect(await TaskRepository.count()).toBe(start);
});

test("data-access:task-repository:update", async () => {
    const repo = await TaskRepository.findByPk(DefaultTaskRepositoryId);

    const output = await TaskRepository.updateTaskRepository({
        id: repo.id,
        name: "updated",
        description: "described",
        location: "/foo/bar"
    });

    expect(output.error).toBeNull();

    await repo.reload();

    expect(repo.name).toBe("updated");
    expect(repo.description).toBe("described");
    expect(repo.location).toBe("/foo/bar");
});

let tempDatabaseName = "";

beforeAll(async () => {
    tempDatabaseName = await copyDatabase();
});

afterAll(() => {
    removeDatabase(tempDatabaseName);
});
