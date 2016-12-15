exports.up = function (knex, Promise) {
    return knex.schema
        .createTable("PipelineWorker", (table) => {
            table.uuid("id").primary().unique();
            table.uuid("machine_id");
            table.string("name");
            table.string("os_type");
            table.string("platform");
            table.string("arch");
            table.string("release");
            table.integer("cpu_count");
            table.float("total_memory");
            table.float("free_memory");
            table.float("load_average");
            table.timestamp("last_seen");
            table.timestamp("deleted_at");
            table.timestamps();
        }).createTable("Project", (table) => {
            table.uuid("id").primary().unique();
            table.string("name");
            table.string("description");
            table.string("root_path");
            table.integer("sample_number");
            table.boolean("is_active");
            table.timestamp("deleted_at");
            table.timestamps();
        }).createTable("PipelineStage", (table) => {
            table.uuid("id").primary().unique();
            table.string("name");
            table.string("description");
            table.integer("function_type");
            table.string("dst_path");
            table.boolean("is_active");
            table.uuid("project_id");
            table.foreign("project_id").references("Project.id");
            table.uuid("task_id");
            table.foreign("task_id").references("TaskDefinition.id");
            table.timestamp("deleted_at");
            table.uuid("previous_stage_id");
            table.foreign("previous_stage_id").references("PipelineStage.id");
            table.timestamps();
        }).createTable("TaskDefinition", (table) => {
            table.uuid("id").primary().unique();
            table.string("name");
            table.string("description");
            table.string("script");
            table.string("interpreter");
            table.string('args');
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
        .dropTable("Worker")
        .dropTable("Project")
        .dropTable("PipelineStage")
        .dropTable("TaskDefinition")
        .dropTable("TaskStatistic");
};
