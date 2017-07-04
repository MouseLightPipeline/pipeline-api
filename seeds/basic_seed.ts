"use strict";

let env = process.env.NODE_ENV || "development";

env = process.env.KNEX_ENV || env;

if (env === "production" || env === "staging") {
    console.log("seeding with production content");
    exports.seed = productionSeed();
} else {
    console.log("seeding with development content");
    exports.seed = developmentSeed();
}

function productionSeed() {
    return (knex, Promise) => {
        // Deletes ALL existing entries
        let promise1 = knex("TaskDefinition").del()
        .then(() => {
            return Promise.all([
                // Inserts seed entries
                knex("TaskDefinition").insert({
                    id: "1161f8e6-29d5-44b0-b6a9-8d3e54d23292",
                    name: "Axon UInt16",
                    description: "Axon UInt16",
                    script: "tasks/axon-uint16.sh",
                    interpreter: "none",
                    args: "/groups/mousebrainmicro/mousebrainmicro/Software/pipeline/apps",
                    work_units: 4,
                    task_repository_id: null,
                    created_at: createDate(3, 0)
                }),
                knex("TaskDefinition").insert({
                    id: "a9f21399-07c0-425c-86f6-6e4f45bb06b9",
                    name: "dogDescriptor",
                    description: "",
                    script: "tasks/dogDescriptor.sh",
                    interpreter: "none",
                    args: "/groups/mousebrainmicro/mousebrainmicro/Software/pipeline/apps",
                    work_units: 2,
                    task_repository_id: null,
                    created_at: createDate(3, 0)
                }),
                knex("TaskDefinition").insert({
                    id: "3ba41d1c-13d0-4def-9b5b-54d940a0fa08",
                    name: "getDescriptorsForTile",
                    description: "",
                    script: "tasks/getDescriptorsForTile.sh",
                    interpreter: "none",
                    args: "/groups/mousebrainmicro/mousebrainmicro/Software/pipeline/apps",
                    work_units: 1,
                    task_repository_id: null,
                    created_at: createDate(3, 0)
                }),
                knex("TaskDefinition").insert({
                    id: "04b8313e-0e96-4194-9c06-22771acd3986",
                    name: "Echo",
                    description: "Simple command to test shell worker execution.  Will echo the passed arguments.",
                    script: "task/echo.sh",
                    interpreter: "none",
                    args: "",
                    work_units: 0,
                    task_repository_id: null,
                    created_at: createDate(2, 0),
                    updated_at: createDate(1, 3.5)
                }),
                knex("Project").insert({
                    id: "44e49773-1c19-494b-b283-54466b94b70f",
                    name: "Sample Brain",
                    description: "Sample brain pipeline project",
                    root_path: "/groups/mousebrainmicro/mousebrainmicro/from_tier2/data/2016-10-31/Tiling",
                    sample_number: 99998,
                    region_x_min: 277,
                    region_x_max: 281,
                    region_y_min: 35,
                    region_y_max: 39,
                    region_z_min: 388,
                    region_z_max: 392,
                    is_processing: false,
                    created_at: createDate(2, 0),
                    updated_at: createDate(1, 3.5)
                }),
                knex("PipelineStage").insert({
                    id: "828276a5-44c0-4bd1-87f7-9495bc3e9f6c",
                    name: "Classifier",
                    description: "Classifier",
                    dst_path: "/nrs/mouselight/pipeline_output/2016-10-31-jan-demo/stage_1_classifier_output",
                    function_type: 2,
                    is_processing: 0,
                    depth: 1,
                    project_id: "44e49773-1c19-494b-b283-54466b94b70f",
                    task_id: "1161f8e6-29d5-44b0-b6a9-8d3e54d23292",
                    previous_stage_id: null,
                    created_at: createDate(2, 0),
                    updated_at: createDate(1, 3.5)
                }),
                knex("PipelineStage").insert({
                    id: "5188b927-4c50-4f97-b22b-b123da78dad6",
                    name: "Descriptors",
                    description: "Descriptors",
                    dst_path: "/nrs/mouselight/pipeline_output/2016-10-31-jan-demo/stage_2_descriptor_output",
                    function_type: 2,
                    is_processing: 0,
                    depth: 2,
                    project_id: "44e49773-1c19-494b-b283-54466b94b70f",
                    task_id: "a9f21399-07c0-425c-86f6-6e4f45bb06b9",
                    previous_stage_id: "828276a5-44c0-4bd1-87f7-9495bc3e9f6c",
                    created_at: createDate(2, 0),
                    updated_at: createDate(1, 3.5)
                }),
                knex("PipelineStage").insert({
                    id: "2683ad99-e389-41fd-a54c-38834ccc7ae9",
                    name: "Merge Descriptors",
                    description: "Descriptor Merge",
                    dst_path: "/nrs/mouselight/pipeline_output/2016-10-31-jan-demo/stage_3_descriptor_merge",
                    function_type: 2,
                    is_processing: 0,
                    depth: 3,
                    project_id: "44e49773-1c19-494b-b283-54466b94b70f",
                    task_id: "3ba41d1c-13d0-4def-9b5b-54d940a0fa08",
                    previous_stage_id: "5188b927-4c50-4f97-b22b-b123da78dad6",
                    created_at: createDate(2, 0),
                    updated_at: createDate(1, 3.5)
                })
            ]);
        });

        let promise2 = knex("PipelineStageFunction").del()
        .then(() => {
            return Promise.all([
                // Inserts seed entries
                knex("PipelineStageFunction").insert({
                    id: 1,
                    name: "Refresh Dashboard Project",
                    created_at: createDate(0, 0)
                }),
                knex("PipelineStageFunction").insert({
                    id: 2,
                    name: "Map Tile",
                    created_at: createDate(0, 0)
                }),
                knex("PipelineStageFunction").insert({
                    id: 3,
                    name: "Map With Z Index - 1 Tile",
                    created_at: createDate(0, 0)
                })
            ]);
        });

        return Promise.all([promise1, promise2]);
    };
}

function developmentSeed() {
    return (knex, Promise) => {
        // Deletes ALL existing entries
        let promise1 = knex("TaskDefinition").del()
        .then(() => {
            return Promise.all([
                // Inserts seed entries
                knex("TaskDefinition").insert({
                    id: "1ec76026-4ecc-4d25-9c6e-cdf992a05da3",
                    name: "ilastik Pixel Classifier Test",
                    description: "Calls ilastik with test project.",
                    script: "tasks/pixel_shell.sh",
                    interpreter: "none",
                    args: "test/pixel_classifier_test",
                    work_units: 4,
                    task_repository_id: null,
                    created_at: createDate(3, 0)
                }),
                knex("TaskDefinition").insert({
                    id: "a9f21399-07c0-425c-86f6-6e4f45bb06b9",
                    name: "dogDescriptor",
                    description: "",
                    script: "tasks/dogDescriptor.sh",
                    interpreter: "none",
                    args: "/Volumes/Spare/Projects/MouseLight/Apps/Pipeline/dogDescriptor /groups/mousebrainmicro/mousebrainmicro/Software/mcr/v90",
                    work_units: 2,
                    task_repository_id: null,
                    created_at: createDate(3, 0)
                }),
                knex("TaskDefinition").insert({
                    id: "3ba41d1c-13d0-4def-9b5b-54d940a0fa08",
                    name: "getDescriptorsForTile",
                    description: "",
                    script: "tasks/getDescriptorsForTile.sh",
                    interpreter: "none",
                    args: "/Volumes/Spare/Projects/MouseLight/Apps/Pipeline/dogDescriptor/getDescriptorPerTile /groups/mousebrainmicro/mousebrainmicro/Software/mcr/v90",
                    work_units: 1,
                    task_repository_id: null,
                    created_at: createDate(3, 0)
                }),
                knex("TaskDefinition").insert({
                    id: "04b8313e-0e96-4194-9c06-22771acd3986",
                    name: "Echo",
                    description: "Simple command to test shell worker execution.  Will echo all arguments.",
                    script: "tasks/echo.sh",
                    interpreter: "none",
                    args: `"custom arg 1" "custom arg 2"`,
                    work_units: 0,
                    task_repository_id: null,
                    created_at: createDate(2, 0),
                    updated_at: createDate(1, 3.5)
                }),
                knex("Project").insert({
                    id: "af8cb0d4-56c0-4db8-8a1b-7b39540b2d04",
                    name: "Small",
                    description: "Small dashboard.json test project",
                    root_path: "/Volumes/Spare/Projects/MouseLight/Dashboard Output/small",
                    sample_number: 99998,
                    region_x_min: -1,
                    region_x_max: -1,
                    region_y_min: -1,
                    region_y_max: -1,
                    region_z_min: -1,
                    region_z_max: -1,
                    is_processing: false,
                    created_at: createDate(2, 0),
                    updated_at: createDate(1, 3.5)
                }),
                knex("Project").insert({
                    id: "f106e72c-a43e-4baf-a6f0-2395a22a65c6",
                    name: "Small SubGrid",
                    description: "Small dashboard.json test project",
                    root_path: "/Volumes/Spare/Projects/MouseLight/Dashboard Output/small",
                    sample_number: 99998,
                    region_x_min: 1,
                    region_x_max: 2,
                    region_y_min: 0,
                    region_y_max: 3,
                    region_z_min: 2,
                    region_z_max: -1,
                    is_processing: false,
                    created_at: createDate(2, 0),
                    updated_at: createDate(1, 3.5)
                }),
                knex("Project").insert({
                    id: "b7b7952c-a830-4237-a3de-dcd2a388a04a",
                    name: "Large",
                    description: "Large dashboard.json test project",
                    root_path: "/Volumes/Spare/Projects/MouseLight/Dashboard Output/large",
                    sample_number: 99999,
                    region_x_min: -1,
                    region_x_max: -1,
                    region_y_min: -1,
                    region_y_max: -1,
                    region_z_min: -1,
                    region_z_max: -1,
                    is_processing: false,
                    created_at: createDate(2, 0),
                    updated_at: createDate(1, 3.5)
                }),
                knex("PipelineStage").insert({
                    id: "828276a5-44c0-4bd1-87f7-9495bc3e9f6c",
                    name: "Classifier",
                    description: "Classifier",
                    dst_path: "/Volumes/Spare/Projects/MouseLight/PipelineOutput1",
                    function_type: 2,
                    is_processing: 0,
                    depth: 1,
                    project_id: "af8cb0d4-56c0-4db8-8a1b-7b39540b2d04",
                    task_id: "1ec76026-4ecc-4d25-9c6e-cdf992a05da3",
                    previous_stage_id: null,
                    created_at: createDate(2, 0),
                    updated_at: createDate(1, 3.5)
                }),
                knex("PipelineStage").insert({
                    id: "5188b927-4c50-4f97-b22b-b123da78dad6",
                    name: "Descriptors",
                    description: "Descriptors",
                    dst_path: "/Volumes/Spare/Projects/MouseLight/PipelineOutput2",
                    function_type: 2,
                    is_processing: 0,
                    depth: 2,
                    project_id: "af8cb0d4-56c0-4db8-8a1b-7b39540b2d04",
                    task_id: "a9f21399-07c0-425c-86f6-6e4f45bb06b9",
                    previous_stage_id: "828276a5-44c0-4bd1-87f7-9495bc3e9f6c",
                    created_at: createDate(2, 0),
                    updated_at: createDate(1, 3.5)
                }),
                knex("PipelineStage").insert({
                    id: "2683ad99-e389-41fd-a54c-38834ccc7ae9",
                    name: "Merge Descriptors",
                    description: "Descriptor Merge",
                    dst_path: "/Volumes/Spare/Projects/MouseLight/PipelineOutput3",
                    function_type: 2,
                    is_processing: 0,
                    depth: 3,
                    project_id: "af8cb0d4-56c0-4db8-8a1b-7b39540b2d04",
                    task_id: "3ba41d1c-13d0-4def-9b5b-54d940a0fa08",
                    previous_stage_id: "5188b927-4c50-4f97-b22b-b123da78dad6",
                    created_at: createDate(2, 0),
                    updated_at: createDate(1, 3.5)
                })
            ]);
        });

        let promise2 = knex("PipelineStageFunction").del()
        .then(() => {
            return Promise.all([
                // Inserts seed entries
                knex("PipelineStageFunction").insert({
                    id: 1,
                    name: "Refresh Dashboard Project",
                    created_at: createDate(0, 0)
                }),
                knex("PipelineStageFunction").insert({
                    id: 2,
                    name: "Map Tile",
                    created_at: createDate(0, 0)
                }),
                knex("PipelineStageFunction").insert({
                    id: 3,
                    name: "Map With Z Index - 1 Tile",
                    created_at: createDate(0, 0)
                })
            ]);
        });

        return Promise.all([promise1, promise2]);
    };
}

function createDate(daysBefore, hoursBefore) {
    let date = new Date();

    date.setDate(date.getDate() - daysBefore);

    date.setHours(date.getHours() - hoursBefore);

    return date;
}
