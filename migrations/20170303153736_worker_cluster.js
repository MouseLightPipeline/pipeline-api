exports.up = (knex, Promise) => {
    return knex.schema.table('PipelineWorker', (table) => {
        table.boolean('is_cluster_proxy');
    });
};

exports.down = (knex, Promise) => {
    return knex.schema.table('PipelineWorker', (table) => {
        table.dropColumn('is_cluster_proxy');
    });
};
