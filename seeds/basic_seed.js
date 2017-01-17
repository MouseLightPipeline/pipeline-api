"use strict";

let env = process.env.NODE_ENV || "development";

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

function createDate(daysBefore, hoursBefore) {
    let date = new Date();

    date.setDate(date.getDate() - daysBefore);

    date.setHours(date.getHours() - hoursBefore);

    return date;
}
