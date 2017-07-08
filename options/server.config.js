"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const configurations = {
    production: {
        port: 3000,
        graphQlEndpoint: "/graphql",
        graphiQlEndpoint: "/graphiql",
        machineId: "1BCC812D-97CE-4B14-AD48-5C3C9B9B416E".toLocaleLowerCase()
    }
};
function default_1() {
    let env = process.env.NODE_ENV || "production";
    return configurations[env];
}
exports.default = default_1;
//# sourceMappingURL=server.config.js.map