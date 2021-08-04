import {
    copyDatabase,
    removeDatabase,
    ClassifierStageSampleBrainProjectId,
    LineFixStageSampleBrainProjectId,
    SampleBrainProjectId,
    LineFixTaskDefinitionId,
    ClassifierTaskDefinitionId,
    PointMatchTaskDefinitionId, DescriptorsTaskDefinitionId
} from "./testUtil";

import {
    PipelineStage,
    PipelineStageCreateInput,
    PipelineStageMethod
} from "../server/data-model/system/pipelineStage";
import {Project} from "../server/data-model/system/project";

test("data-access:pipeline-stage:get-project", async () => {
    let stage = await PipelineStage.findByPk(LineFixStageSampleBrainProjectId);
    expect(stage).toBeDefined();

    const project = await stage.getProject();

    expect(project).toBeDefined();
    expect(project.id).toBe(SampleBrainProjectId);
});

test("data-access:pipeline-stage:child-stages", async () => {
    let stage = await PipelineStage.findByPk(LineFixStageSampleBrainProjectId);
    expect(stage).toBeDefined();

    const childStages = await stage.getChildStages();

    expect(childStages).toBeDefined();
    expect(childStages.length).toBe(1);
});

test("data-access:pipeline-stage:previous-stage", async () => {
    let stage = await PipelineStage.findByPk(ClassifierStageSampleBrainProjectId);
    expect(stage).toBeDefined();

    const previousStage = await stage.getPreviousStage();

    expect(previousStage).toBeDefined();
    expect(previousStage.id).toBe(LineFixStageSampleBrainProjectId);
});

test("data-access:pipeline-stage:get-task-definition", async () => {
    let stage = await PipelineStage.findByPk(LineFixStageSampleBrainProjectId);
    expect(stage).toBeDefined();

    const taskDefinition = await stage.getTaskDefinition();

    expect(taskDefinition).toBeDefined();
    expect(taskDefinition.id).toBe(LineFixTaskDefinitionId);
});

test("data-access:pipeline-stage:create-stage", async () => {
    const {source} = await Project.duplicateProject(SampleBrainProjectId);
    expect((await source.getStages()).length).toBe(4);

    const stageInput: PipelineStageCreateInput = {
        project_id: source.id,
        previous_stage_id: LineFixStageSampleBrainProjectId,
        task_id: ClassifierTaskDefinitionId,
        name: "New Classifier Task",
        description: "New Description",
        dst_path: "/data/output/stage",
        function_type: PipelineStageMethod.XAdjacentTileComparison
    };

    let output = await PipelineStage.createPipelineStage(stageInput);
    expect(output).toBeDefined();
    expect(output.error).toBeNull();

    const stage = output.source;
    expect(stage).toBeDefined();
    expect(stage.depth).toBe(2);
    expect(stage.name).toBe("New Classifier Task");
    expect(stage.description).toBe("New Description");
    expect(stage.dst_path).toBe("/data/output/stage");
    expect(stage.function_type).toBe(PipelineStageMethod.XAdjacentTileComparison);
    expect(stage.is_processing).toBe(false);
    expect(stage.previous_stage_id).toBe(LineFixStageSampleBrainProjectId);

    await source.reload();
    expect((await source.getStages()).length).toBe(5);
});

test("data-access:pipeline-stage:remove-stage", async () => {
    const {source} = await Project.duplicateProject(SampleBrainProjectId);

    const stages = (await source.getStages()).sort((a, b) => a.depth - b.depth);
    expect(stages.length).toBe(4);

    const output = await PipelineStage.remove(stages[1].id);
    expect(output).toBeDefined();
    expect(output.id).toBe(stages[1].id);
    expect(output.error).toBeNull();

    await source.reload();
    const updatedStages = (await source.getStages()).sort((a, b) => a.depth - b.depth);
    expect(updatedStages.length).toBe(3);
    expect(updatedStages[0].task_id).toBe(LineFixTaskDefinitionId);
    expect(updatedStages[0].depth).toBe(1);
    expect(updatedStages[1].task_id).toBe(DescriptorsTaskDefinitionId);
    expect(updatedStages[1].depth).toBe(2);
    expect(updatedStages[2].task_id).toBe(PointMatchTaskDefinitionId);
    expect(updatedStages[2].depth).toBe(3);
});

test("data-access:pipeline-stage:update-stage", async () => {
    const {source} = await Project.duplicateProject(SampleBrainProjectId);

    const stages = (await source.getStages()).sort((a, b) => a.depth - b.depth);
    expect(stages.length).toBe(4);

    const output = await PipelineStage.updatePipelineStage({
        id: stages[2].id,
        previous_stage_id: stages[0].id,
        description: "foo bar"
    });

    expect(output.source.description).toBe("foo bar");

    await source.reload();
    const updatedStages = (await source.getStages()).sort((a, b) => {
        if (a.depth === b.depth) {
            return a.name.localeCompare(b.name);
        } else {
            return a.depth - b.depth
        }
    });
    expect(updatedStages.length).toBe(4);

    expect(updatedStages[0].task_id).toBe(LineFixTaskDefinitionId);
    expect(updatedStages[0].depth).toBe(1);
    expect(updatedStages[1].task_id).toBe(ClassifierTaskDefinitionId);
    expect(updatedStages[1].depth).toBe(2);
    expect(updatedStages[2].task_id).toBe(DescriptorsTaskDefinitionId);
    expect(updatedStages[2].depth).toBe(2);
    expect(updatedStages[2].description).toBe("foo bar");
    expect(updatedStages[3].task_id).toBe(PointMatchTaskDefinitionId);
    expect(updatedStages[3].depth).toBe(3);
});

let tempDatabaseName = "";

beforeAll(async () => {
    tempDatabaseName = await copyDatabase();
});

afterAll(() => {
    removeDatabase(tempDatabaseName);
});
