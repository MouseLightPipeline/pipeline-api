const databaseOptions = {
    production: {
        host: "pipeline-db",
        port: 5432,
        dialect: "postgres",
        database: "pipeline_production",
        username: "postgres",
        password: "pgsecret",
        logging: null,
        pool: {
            acquire: 20000
        }
    }
};

function loadDatabaseOptions() {
    const options = databaseOptions.production;

    options.host = process.env.PIPELINE_DATABASE_HOST || options.host;
    options.port = process.env.PIPELINE_DATABASE_PORT || options.port;
    options.username = process.env.PIPELINE_DATABASE_USER || options.username;
    options.password = process.env.PIPELINE_DATABASE_PASS || options.password;

    return options;
}

const SequelizeOptions = loadDatabaseOptions();

export default SequelizeOptions;
