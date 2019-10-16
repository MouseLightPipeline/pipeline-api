import {Dialect} from "sequelize";

const path = require("path");
import * as fs from "fs";

import {RemoteDatabaseClient} from "../server/data-access/sequelize/databaseConnector";
import {Project} from "../server/data-model/sequelize/project";

beforeAll(async () => {
    fs.copyFileSync(path.join(__dirname, "test-template.sqlite"), path.join(__dirname, "test-active.sqlite"));

    await RemoteDatabaseClient.Start({
        dialect: "sqlite" as Dialect,
        storage: path.join(__dirname, "test-active.sqlite"),
        logging: null
    });
});

afterAll(() => {
    if (fs.existsSync(path.join(__dirname, "test-active.sqlite"))) {
        fs.unlinkSync(path.join(__dirname, "test-active.sqlite"));
    }
});

test("data-access:projects", async () => {
    const projects = await Project.findAll();
    expect(projects.length).toBe(3);

    let project = await Project.findByPk("44e49773-1c19-494b-b283-54466b94b70f");
    expect(project).toBeDefined();
    expect(project.getStages()).toBeDefined();
    expect((await project.getStages()).length).toBe(4);

    project = await Project.findByPk("74f684fb-9e9f-4b2e-b853-4c43a3b92f38");
    expect(project).toBeDefined();
    expect((await project.getStages()).length).toBe(1);
});

test("data-access:projects:z-plane", async () => {
    const project = await Project.findByPk("44e49773-1c19-494b-b283-54466b94b70f");

    expect(project.zPlaneSkipIndices.length).toBe(1);
    expect(project.zPlaneSkipIndices).toContain(1);
});

test("data-access:projects:user-arguments", async () => {
    const project = await Project.findByPk("74f684fb-9e9f-4b2e-b853-4c43a3b92f38");

    expect(project).toBeDefined();

    expect((await project.getStages()).length).toBe(1);

    const userArguments = JSON.parse(project.user_parameters);

    expect(userArguments.inputFile).toBeDefined();
    expect(userArguments.dataset).toBeDefined();
    expect(userArguments.configurationFile).toBeDefined();
});