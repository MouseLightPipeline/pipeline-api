import {
    copyDatabase,
    DuplicateNameAppendText, DuplicatePathAppendText,
    removeDatabase,
    SampleBrainProjectId,
    SkeletonizationProjectId
} from "./testUtil";
import {Project} from "../server/data-model/system/project";

test("data-access:projects:getStages", async () => {
    let project = await Project.findByPk(SampleBrainProjectId);
    expect(project).toBeDefined();
    expect(project.getStages()).toBeDefined();
    expect((await project.getStages()).length).toBe(4);

    project = await Project.findByPk(SkeletonizationProjectId);
    expect(project).toBeDefined();
    expect((await project.getStages()).length).toBe(1);
});

test("data-access:projects:z-plane", async () => {
    const project = await Project.findByPk(SampleBrainProjectId);

    expect(project.zPlaneSkipIndices.length).toBe(1);
    expect(project.zPlaneSkipIndices).toContain(1);

    const mutationOutput = await Project.findAndUpdateProject({id: project.id, zPlaneSkipIndices: [2, 3]});
    expect(mutationOutput.error).toBeNull();

    await project.reload();

    expect(project.zPlaneSkipIndices.length).toBe(2);
    expect(project.zPlaneSkipIndices).toContain(2);
    expect(project.zPlaneSkipIndices).toContain(3);

    expect(mutationOutput.source.zPlaneSkipIndices.length).toBe(2);
    expect(mutationOutput.source.zPlaneSkipIndices).toContain(2);
    expect(mutationOutput.source.zPlaneSkipIndices).toContain(3);
});

test("data-access:projects:user-arguments", async () => {
    const project = await Project.findByPk(SkeletonizationProjectId);

    expect(project).toBeDefined();

    expect((await project.getStages()).length).toBe(1);

    const userArguments = JSON.parse(project.user_parameters);

    expect(userArguments.inputFile).toBeDefined();
    expect(userArguments.dataset).toBeDefined();
    expect(userArguments.configurationFile).toBeDefined();
});

test("data-access:projects:duplicate", async () => {
    const output = await Project.duplicateProject(SampleBrainProjectId);
    expect(output.error).toBeNull();

    const project = output.source;

    expect(project).toBeDefined();
    expect(project.name.slice(-5)).toBe(DuplicateNameAppendText);
    expect(project.root_path.slice(-5)).toBe(DuplicatePathAppendText);

    const stages = (await project.getStages()).sort((a, b) => a.depth - b.depth);
    expect(stages.length).toBe(4);

    expect(stages[0].depth).toBe(1);
    expect(stages[0].dst_path.slice(-5)).toBe(DuplicatePathAppendText);
    expect(stages[0].previous_stage_id).toBeNull();

    expect(stages[1].depth).toBe(2);
    expect(stages[1].dst_path.slice(-5)).toBe(DuplicatePathAppendText);
    expect(stages[1].previous_stage_id).toBe(stages[0].id);

    expect(stages[2].depth).toBe(3);
    expect(stages[2].dst_path.slice(-5)).toBe(DuplicatePathAppendText);
    expect(stages[2].previous_stage_id).toBe(stages[1].id);

    expect(stages[3].depth).toBe(4);
    expect(stages[3].dst_path.slice(-5)).toBe(DuplicatePathAppendText);
    expect(stages[3].previous_stage_id).toBe(stages[2].id);
});

test("data-access:projects:create-and-archive", async () => {
    const start = await Project.count();

    const output = await Project.createProject({
        name: "created",
        description: "described",
        root_path: "root-path",
        is_processing: true,
        sample_number: 10,
        region_bounds: {
            x_min: 101,
            x_max: 102,
            y_min: 103,
            y_max: 104,
            z_min: 105,
            z_max: 106,
        },
        user_parameters: JSON.stringify({param1: "foo"}),
        zPlaneSkipIndices: [7, 11]
    });

    expect(output.error).toBeNull();

    expect(await Project.count()).toBe(start + 1);

    const project = output.source;

    await project.reload();

    expect(project.name).toBe("created");
    expect(project.description).toBe("described");
    expect(project.root_path).toBe("root-path");
    expect(project.is_processing).toBe(false); // created projects are always force to false, regardless of inputs
    expect(project.sample_number).toBe(10);
    expect(project.zPlaneSkipIndices.length).toBe(2);
    expect(project.zPlaneSkipIndices).toContain(7);
    expect(project.zPlaneSkipIndices).toContain(11);

    const userParameters = JSON.parse(project.user_parameters);
    expect(userParameters.param1).toBe("foo");

    await Project.archiveProject(project.id);

    expect(await Project.count()).toBe(start);
});

let tempDatabaseName = "";

beforeAll(async () => {
    tempDatabaseName = await copyDatabase();
});

afterAll(() => {
    removeDatabase(tempDatabaseName);
});
