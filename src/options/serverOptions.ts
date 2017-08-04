import SequelizeOptions from "./sequelizeOptions";

interface IServerOptions {
    port: number;
    graphQlEndpoint: string;
    graphiQlEndpoint: string;
    machineId: string;
}

interface IServerEnvDefinitions {
    production: IServerOptions;
}

const configurations: IServerEnvDefinitions = {
    production: {
        port: 3000,
        graphQlEndpoint: "/graphql",
        graphiQlEndpoint: "/graphiql",
        machineId: "1BCC812D-97CE-4B14-AD48-5C3C9B9B416E".toLocaleLowerCase()
    }
};

export default function (): IServerOptions {
    return configurations.production;
}


export const SequelizeDatabaseOptions = SequelizeOptions;