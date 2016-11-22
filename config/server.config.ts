import {IConfiguration} from "./configuration";

interface IServerConfig {
    port: number;
    graphQlEndpoint: string;
    graphiQlEndpoint: string;
    machineId: string;
}

const configurations: IConfiguration<IServerConfig> = {
    development: {
        port: 3000,
        graphQlEndpoint: "/graphql",
        graphiQlEndpoint: "/graphiql",
        machineId: "1BCC812D-97CE-4B14-AD48-5C3C9B9B416E".toLocaleLowerCase()
    },
    test: {
        port: 3000,
        graphQlEndpoint: "/graphql",
        graphiQlEndpoint: "/graphiql",
        machineId: "1BCC812D-97CE-4B14-AD48-5C3C9B9B416E".toLocaleLowerCase()
    },
    production: {
        port: 3000,
        graphQlEndpoint: "/graphql",
        graphiQlEndpoint: "/graphiql",
        machineId: "1BCC812D-97CE-4B14-AD48-5C3C9B9B416E".toLocaleLowerCase()
    }
};

export default function (): IServerConfig {
    let env = process.env.NODE_ENV || "development";

    return configurations[env];
}
