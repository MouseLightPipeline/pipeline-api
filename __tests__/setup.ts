import {execSync} from "child_process";

const setup = () => {
    execSync("node_modules/.bin/nearleyc server/argument-parser/taskArgumentGrammar.ne -o server/argument-parser/taskArgumentGrammar.js", )
};

export default setup;
