exports.up = (knex, Promise) => {
    return knex.schema.table('PipelineWorker', (table) => {
        table.boolean('is_in_scheduler_pool');
    });
};

exports.down = (knex, Promise) => {
    return knex.schema.table('PipelineWorker', (table) => {
        table.dropColumn('is_in_scheduler_pool');
    });
};
