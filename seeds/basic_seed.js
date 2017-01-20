"use strict";

let env = process.env.NODE_ENV || "development";

env = process.env.KNEX_ENV || env;

if (env === "production") {
    exports.seed = productionSeed();
} else {
    exports.seed = developmentSeed();
}

function productionSeed() {
    return (knex, Promise) => {
        // Deletes ALL existing entries
        let promise1 = knex('TaskDefinition').del()
            .then(() => {
                return Promise.all([
                    // Inserts seed entries
                    knex('TaskDefinition').insert({
                        id: '1EC76026-4ECC-4D25-9C6E-CDF992A05DA3'.toLocaleLowerCase(),
                        name: 'ilastik Pixel Classifier Test',
                        description: 'Calls ilastik with test project.',
                        script: 'tasks/pixel_shell.sh',
                        interpreter: 'none',
                        args: 'test/pixel_classifier_test',
                        work_units: 4,
                        created_at: createDate(3, 0)
                    }),
                    knex('TaskDefinition').insert({
                        id: '1161F8E6-29D5-44B0-B6A9-8D3E54D23292'.toLocaleLowerCase(),
                        name: 'ilastik Axon UInt16',
                        description: 'ilastik Axon UInt16',
                        script: 'tasks/ilastik-axon-uint16.sh',
                        interpreter: 'none',
                        args: '/groups/mousebrainmicro/mousebrainmicro/Software/pipeline/apps',
                        work_units: 10,
                        created_at: createDate(3, 0)
                    }),
                    knex('TaskDefinition').insert({
                        id: 'A9F21399-07C0-425C-86F6-6E4F45BB06B9'.toLocaleLowerCase(),
                        name: 'dogDescriptor',
                        description: '',
                        script: 'tasks/dogDescriptor.sh',
                        interpreter: 'none',
                        args: '/groups/mousebrainmicro/mousebrainmicro/Software/pipeline/apps',
                        work_units: 2,
                        created_at: createDate(3, 0)
                    }),
                    knex('TaskDefinition').insert({
                        id: '3BA41D1C-13D0-4DEF-9B5B-54D940A0FA08'.toLocaleLowerCase(),
                        name: 'getDescriptorsForTile',
                        description: '',
                        script: 'tasks/getDescriptorsForTile.sh',
                        interpreter: 'none',
                        args: '/groups/mousebrainmicro/mousebrainmicro/Software/pipeline/apps',
                        work_units: 1,
                        created_at: createDate(3, 0)
                    }),
                    knex('TaskDefinition').insert({
                        id: '04B8313E-0E96-4194-9C06-22771ACD3986'.toLocaleLowerCase(),
                        name: 'Echo',
                        description: 'Simple command to test shell worker execution.  Will echo the passed arguments.',
                        script: 'task/echo.sh',
                        interpreter: 'none',
                        args: '',
                        work_units: 0,
                        created_at: createDate(2, 0),
                        updated_at: createDate(1, 3.5)
                    }),
                    knex("Project").insert({
                        id: "44E49773-1C19-494B-B283-54466B94B70F".toLocaleLowerCase(),
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
                        id: "828276A5-44C0-4BD1-87F7-9495BC3E9F6C".toLocaleLowerCase(),
                        name: "Classifier",
                        description: "Classifier",
                        dst_path: "/nrs/mouselight/pipeline_output/2016-10-31-jan-demo/stage_1_classifier_output",
                        function_type: 2,
                        is_processing: 0,
                        depth: 1,
                        project_id: "44E49773-1C19-494B-B283-54466B94B70F".toLocaleLowerCase(),
                        task_id: '1161F8E6-29D5-44B0-B6A9-8D3E54D23292'.toLocaleLowerCase(),
                        previous_stage_id: null,
                        created_at: createDate(2, 0),
                        updated_at: createDate(1, 3.5)
                    }),
                    knex("PipelineStage").insert({
                        id: "5188B927-4C50-4F97-B22B-B123DA78DAD6".toLocaleLowerCase(),
                        name: "Descriptors",
                        description: "Descriptors",
                        dst_path:  "/nrs/mouselight/pipeline_output/2016-10-31-jan-demo/stage_2_descriptor_output",
                        function_type: 2,
                        is_processing: 0,
                        depth: 2,
                        project_id: "44E49773-1C19-494B-B283-54466B94B70F".toLocaleLowerCase(),
                        task_id: 'A9F21399-07C0-425C-86F6-6E4F45BB06B9'.toLocaleLowerCase(),
                        previous_stage_id: "828276A5-44C0-4BD1-87F7-9495BC3E9F6C".toLocaleLowerCase(),
                        created_at: createDate(2, 0),
                        updated_at: createDate(1, 3.5)
                    }),
                    knex("PipelineStage").insert({
                        id: "2683AD99-E389-41FD-A54C-38834CCC7AE9".toLocaleLowerCase(),
                        name: "Descriptor Merge",
                        description: "Descriptor Merge",
                        dst_path: "/nrs/mouselight/pipeline_output/2016-10-31-jan-demo/stage_3_descriptor_merge",
                        function_type: 2,
                        is_processing: 0,
                        depth: 3,
                        project_id: "44E49773-1C19-494B-B283-54466B94B70F".toLocaleLowerCase(),
                        task_id: '3BA41D1C-13D0-4DEF-9B5B-54D940A0FA08'.toLocaleLowerCase(),
                        previous_stage_id: "5188B927-4C50-4F97-B22B-B123DA78DAD6".toLocaleLowerCase(),
                        created_at: createDate(2, 0),
                        updated_at: createDate(1, 3.5)
                    })
                ]);
            });

        let promise2 = knex('PipelineStageFunction').del()
            .then(() => {
                return Promise.all([
                    // Inserts seed entries
                    knex('PipelineStageFunction').insert({
                        id: 1,
                        name: 'Refresh Dashboard Project',
                        created_at: createDate(0, 0)
                    }),
                    knex('PipelineStageFunction').insert({
                        id: 2,
                        name: 'Map Tile',
                        created_at: createDate(0, 0)
                    }),
                    knex('PipelineStageFunction').insert({
                        id: 3,
                        name: 'Map With Z Index - 1 Tile',
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
                    knex('TaskDefinition').insert({
                        id: '1EC76026-4ECC-4D25-9C6E-CDF992A05DA3'.toLocaleLowerCase(),
                        name: 'ilastik Pixel Classifier Test',
                        description: 'Calls ilastik with test project.',
                        script: 'tasks/pixel_shell.sh',
                        interpreter: 'none',
                        args: 'test/pixel_classifier_test',
                        work_units: 4,
                        created_at: createDate(3, 0)
                    }),
                    knex('TaskDefinition').insert({
                        id: '04B8313E-0E96-4194-9C06-22771ACD3986'.toLocaleLowerCase(),
                        name: 'Echo',
                        description: 'Simple command to test shell worker execution.  Will echo the passed arguments.',
                        script: 'task/echo.sh',
                        interpreter: 'none',
                        args: '',
                        work_units: 0,
                        created_at: createDate(2, 0),
                        updated_at: createDate(1, 3.5)
                    }),
                    knex("Project").insert({
                        id: "AF8CB0D4-56C0-4DB8-8A1B-7B39540B2D04".toLocaleLowerCase(),
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
                        id: "F106E72C-A43E-4BAF-A6F0-2395A22A65C6".toLocaleLowerCase(),
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
                        id: "B7B7952C-A830-4237-A3DE-DCD2A388A04A".toLocaleLowerCase(),
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
                        id: "828276A5-44C0-4BD1-87F7-9495BC3E9F6C".toLocaleLowerCase(),
                        name: "Classifier",
                        description: "Classifier",
                        dst_path: "/Volumes/Spare/Projects/MouseLight/PipelineOutput1",
                        function_type: 2,
                        is_processing: 0,
                        depth: 1,
                        project_id: "AF8CB0D4-56C0-4DB8-8A1B-7B39540B2D04".toLocaleLowerCase(),
                        task_id: '1EC76026-4ECC-4D25-9C6E-CDF992A05DA3'.toLocaleLowerCase(),
                        previous_stage_id: null,
                        created_at: createDate(2, 0),
                        updated_at: createDate(1, 3.5)
                    }),
                    knex("PipelineStage").insert({
                        id: "5188B927-4C50-4F97-B22B-B123DA78DAD6".toLocaleLowerCase(),
                        name: "Echos",
                        description: "Echos",
                        dst_path:  "/Volumes/Spare/Projects/MouseLight/PipelineOutput2",
                        function_type: 2,
                        is_processing: 0,
                        depth: 2,
                        project_id: "AF8CB0D4-56C0-4DB8-8A1B-7B39540B2D04".toLocaleLowerCase(),
                        task_id: '04B8313E-0E96-4194-9C06-22771ACD3986'.toLocaleLowerCase(),
                        previous_stage_id: "828276A5-44C0-4BD1-87F7-9495BC3E9F6C".toLocaleLowerCase(),
                        created_at: createDate(2, 0),
                        updated_at: createDate(1, 3.5)
                    }),
                ]);
            });

        let promise2 = knex('PipelineStageFunction').del()
            .then(() => {
                return Promise.all([
                    // Inserts seed entries
                    knex('PipelineStageFunction').insert({
                        id: 1,
                        name: 'Refresh Dashboard Project',
                        created_at: createDate(0, 0)
                    }),
                    knex('PipelineStageFunction').insert({
                        id: 2,
                        name: 'Map Tile',
                        created_at: createDate(0, 0)
                    }),
                    knex('PipelineStageFunction').insert({
                        id: 3,
                        name: 'Map With Z Index - 1 Tile',
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
