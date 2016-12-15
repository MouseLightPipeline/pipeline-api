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
                        script: 'test/pixel_classifier_test/pixel_shell.sh',
                        interpreter: 'none',
                        args: '/Users/pedson/Developer/Leap/Janelia/acq-dashboard-worker-api/test/pixel_classifier_test',
                        created_at: createDate(3, 0)
                    }),
                    knex('TaskDefinition').insert({
                        id: '04B8313E-0E96-4194-9C06-22771ACD3986'.toLocaleLowerCase(),
                        name: 'Echo',
                        description: 'Simple command to test shell worker execution.  Will echo the passed arguments.',
                        script: 'test/echo.sh',
                        interpreter: 'none',
                        created_at: createDate(2, 0),
                        updated_at: createDate(1, 3.5)
                    })
                ]);
            });

        return Promise.all([promise1]);
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
                        script: 'test/pixel_classifier_test/pixel_shell.sh',
                        interpreter: 'none',
                        args: '/Users/pedson/Developer/Leap/Janelia/acq-dashboard-worker-api/test/pixel_classifier_test',
                        created_at: createDate(3, 0)
                    }),
                    knex('TaskDefinition').insert({
                        id: '04B8313E-0E96-4194-9C06-22771ACD3986'.toLocaleLowerCase(),
                        name: 'Echo',
                        description: 'Simple command to test shell worker execution.  Will echo the passed arguments.',
                        script: 'test/echo.sh',
                        interpreter: 'none',
                        created_at: createDate(2, 0),
                        updated_at: createDate(1, 3.5)
                    }),
                    knex("Project").insert({
                        id: "AF8CB0D4-56C0-4DB8-8A1B-7B39540B2D04".toLocaleLowerCase(),
                        name: "Small",
                        description: "Small dashboard.json test project",
                        root_path: "/Volumes/Spare/Projects/MouseLight/Dashboard Output/small",
                        sample_number: 99998,
                        is_active: false,
                        created_at: createDate(2, 0),
                        updated_at: createDate(1, 3.5)
                    }),
                    knex("Project").insert({
                        id: "B7B7952C-A830-4237-A3DE-DCD2A388A04A".toLocaleLowerCase(),
                        name: "Large",
                        description: "Large dashboard.json test project",
                        root_path: "/Volumes/Spare/Projects/MouseLight/Dashboard Output/large",
                        sample_number: 99999,
                        is_active: false,
                        created_at: createDate(2, 0),
                        updated_at: createDate(1, 3.5)
                    })
                ]);
            });

        return Promise.all([promise1]);
    };
}

function createDate(daysBefore, hoursBefore) {
    let date = new Date();

    date.setDate(date.getDate() - daysBefore);

    date.setHours(date.getHours() - hoursBefore);

    return date;
}
