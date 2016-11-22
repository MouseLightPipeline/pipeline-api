exports.up = function (knex, Promise) {
    return knex.schema
        .createTable("DashboardTiles", (table) => {
            table.string("relative_path").primary().unique();
            table.boolean("previous_stage_is_complete");
            table.boolean("current_stage_is_complete");
            table.timestamp("deleted_at");
            table.timestamps();
        });
};

exports.down = function (knex, Promise) {
    return knex.schema
        .dropTable("DashboardTiles")
};
