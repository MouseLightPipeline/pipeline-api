exports.up = function (knex, Promise) {
    return knex.schema
        .createTableIfNotExists("DummyTable", (table) => {
            table.increments().primary();
            table.timestamps();
        });
};

exports.down = function (knex, Promise) {
    return knex.schema
        .dropTable("DummyTable")
};
