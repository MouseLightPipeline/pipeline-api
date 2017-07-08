exports.up = function (knex, Promise) {
    return knex.schema
        .dropTable("TaskDefinition")
        .createTable("TaskRepository", (table) => {
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
        });
};

exports.down = function (knex, Promise) {
    return knex.schema
        .dropTable("TaskDefinition")
        .dropTable("TaskRepository")
        .createTable("TaskDefinition", (table) => {
            table.uuid("id").primary().unique();
            table.string("name");
            table.string("description");
            table.string("script");
            table.string("interpreter");
            table.string("args");
            table.float("work_units");
            table.timestamp("deleted_at");
            table.timestamps();
        });
};
