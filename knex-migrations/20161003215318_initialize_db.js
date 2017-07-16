exports.up = function (knex, Promise) {
    return knex.schema
        .createTable("PipelineWorker", (table) => {
            table.uuid("id").primary().unique();
            table.uuid("machine_id");
            table.string("name");
            table.string("address");
            table.integer("port");
            table.string("os_type");
            table.string("platform");
            table.string("arch");
            table.string("release");
            table.integer("cpu_count");
            table.float("total_memory");
            table.float("free_memory");
            table.float("load_average");
            table.float("work_unit_capacity");
            table.boolean("is_in_scheduler_pool");
            table.boolean('is_cluster_proxy');
            table.timestamp("last_seen");
            table.timestamp("deleted_at");
            table.timestamps();
        }).createTable("Project", (table) => {
            table.uuid("id").primary().unique();
            table.string("name");
            table.string("description");
            table.string("root_path");
            table.integer("sample_number");
            table.integer("sample_x_min");
            table.integer("sample_x_max");
            table.integer("sample_y_min");
            table.integer("sample_y_max");
            table.integer("sample_z_min");
            table.integer("sample_z_max");
            table.integer("region_x_min");
            table.integer("region_x_max");
            table.integer("region_y_min");
            table.integer("region_y_max");
            table.integer("region_z_min");
            table.integer("region_z_max");
            table.boolean("is_processing");
            table.timestamp("deleted_at");
            table.timestamps();
        }).createTable("PipelineStage", (table) => {
            table.uuid("id").primary().unique();
            table.string("name");
            table.string("description");
            table.integer("function_type");
            table.string("dst_path");
            table.boolean("is_processing");
            table.integer("depth");
            table.uuid("project_id");
            table.foreign("project_id").references("Project.id");
            table.uuid("task_id");
            table.foreign("task_id").references("TaskDefinition.id");
            table.timestamp("deleted_at");
            table.uuid("previous_stage_id");
            table.foreign("previous_stage_id").references("PipelineStage.id");
            table.timestamps();
        }).createTable("TaskRepository", (table) => {
            table.uuid("id").primary().unique();
            table.string("name");
            table.string("description");
            table.string("location");
            table.timestamp("deleted_at");
            table.timestamps();
        }).createTable("TaskDefinition", (table) => {
            table.uuid("id").primary().unique();
            table.string("name");
            table.string("description");
            table.string("script");
            table.string("interpreter");
            table.string("args");
            table.float("work_units");
            table.uuid("task_repository_id");
            table.foreign("task_repository_id").references("TaskRepository.id");
            table.timestamp("deleted_at");
            table.timestamps();
        }).createTable("PipelineStagePerformance", (table) => {
            table.uuid("id").primary().unique();
            table.integer("num_in_process");
            table.integer("num_ready_to_process");
            table.integer("num_execute");
            table.integer("num_complete");
            table.integer("num_error");
            table.integer("num_cancel");
            table.float("duration_average");
            table.float("duration_high");
            table.float("duration_low");
            table.float("cpu_average");
            table.float("cpu_high");
            table.float("cpu_low");
            table.float("memory_average");
            table.float("memory_high");
            table.float("memory_low");
            table.uuid("pipeline_stage_id");
            table.foreign("pipeline_stage_id").references("PipelineStage.id");
            table.timestamp("deleted_at");
            table.timestamps();
        }).createTable("PipelineStageFunction", (table) => {
            table.integer("id").primary().unique();
            table.string("name");
            table.timestamps();
        });
};

exports.down = function (knex, Promise) {
    return knex.schema
        .dropTable("Worker")
        .dropTable("Project")
        .dropTable("PipelineStage")
        .dropTable("TaskDefinition")
        .dropTable("TaskRepository")
        .dropTable("PipelineStagePerformance")
        .dropTable("PipelineStageFunction");
};
