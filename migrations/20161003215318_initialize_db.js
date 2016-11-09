exports.up = function (knex, Promise) {
    return knex.schema
        .createTable("Project", (table) => {
            table.uuid("id").primary().unique();
            table.string("name");
            table.string("description");
            table.string("root_path");
            table.integer("sample_number");
            table.timestamp("deleted_at");
            table.timestamps();
        }).createTable("PipelineStage", (table) => {
            table.uuid("id").primary().unique();
            table.string("name");
            table.string("description");
            table.integer("execution_order");
            table.string("src_path");
            table.string("dst_path");
            table.uuid("project_id");
            table.foreign("project_id").references("Project.id");
            table.uuid("task_id");
            table.foreign("task_id").references("TaskDefinition.id");
            table.timestamp("deleted_at");
            table.timestamps();
        }).createTable("TaskDefinition", (table) => {
            table.uuid("id").primary().unique();
            table.string("name");
            table.string("description");
            table.string("script");
            table.string("interpreter");
            table.timestamp("deleted_at");
            table.timestamps();
        }).createTable("TaskStatistic", (table) => {
            table.uuid("id").primary().unique();
            table.integer("num_execute");
            table.integer("num_complete");
            table.integer("num_error");
            table.integer("num_cancelled");
            table.float("duration_avg");
            table.float("duration_long");
            table.uuid("task_id");
            table.foreign("task_id").references("TaskDefinition.id");
            table.timestamp("deleted_at");
            table.timestamps();
        });
};

exports.down = function (knex, Promise) {
    return knex.schema
        .dropTable("TaskDefinition")
        .dropTable("TaskStatistic");
};
