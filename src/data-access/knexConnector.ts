import * as Knex from "knex";

import databaseConfiguration from "../../options/knexfile.config";

let knex = Knex(databaseConfiguration());

export {knex};
