interface IDriveMapping {
    local: string;
    remote: string;
}

interface IServiceOptions {
    port: number;
    graphQlEndpoint: string;
    graphiQlEndpoint: string;
    driveMapping: IDriveMapping[];
}

const configurations: IServiceOptions = {
    port: 6001,
    graphQlEndpoint: "/graphql",
    graphiQlEndpoint: "/graphiql",
    driveMapping: JSON.parse("[]")
};

function loadConfiguration(): IServiceOptions {
    const options = Object.assign({}, configurations);

    options.port = parseInt(process.env.PIPELINE_API_PORT) || options.port;
    options.driveMapping = JSON.parse(process.env.PIPELINE_DRIVE_MAPPING || null) || options.driveMapping;

    return options;
}

export const ServiceOptions = loadConfiguration();
