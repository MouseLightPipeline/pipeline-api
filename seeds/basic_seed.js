'use strict';

exports.seed = (knex, Promise) => {
    // Deletes ALL existing entries
    let promise1 = knex('TaskDefinition').del()
        .then(() => {
            return Promise.all([
                // Inserts seed entries
                knex('TaskDefinition').insert({
                    id: '1EC76026-4ECC-4D25-9C6E-CDF992A05DA3'.toLocaleLowerCase(),
                    name: 'Python Generations',
                    description: 'Simple python script to test worker execution.',
                    script: 'test/pytest.py',
                    interpreter: 'python',
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
                knex('TaskDefinition').insert({
                    id: '17610E93-5F57-43A1-8281-73E75CA47E56'.toLocaleLowerCase(),
                    name: 'MATLAB sum',
                    description: 'Simple MATLAB executable to test worker execution.',
                    script: 'mltest',
                    interpreter: 'none',
                    created_at: createDate(1, 0)
                })
            ]);
        });

    return Promise.all([promise1]);
};

function createDate(daysBefore, hoursBefore) {
    let date = new Date();

    date.setDate(date.getDate() - daysBefore);

    date.setHours(date.getHours() - hoursBefore);

    return date;
}
