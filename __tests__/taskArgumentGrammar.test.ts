// import * as nearley from "nearley";
import {TaskArgumentType} from "../server/argument-parser/taskArguments";

const nearley = require("nearley");
const grammar = require("../server/argument-parser/taskArgumentGrammar.js");

test("single argument", () => {
    const value = `hello`;
    let parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar));
    parser.feed(value);
    expect(parser.results[0]).toEqual([{type: TaskArgumentType.Literal, value}]);
});

test("multiple argument", () => {
    const value = `hello world again`;
    let parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar));
    parser.feed(value);
    expect(parser.results[0]).toEqual(value.split(" ").map(value => {
        return {value, type: TaskArgumentType.Literal};
    }));
});

test("single parameter", () => {
    const value = `hello`;
    let parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar));
    parser.feed(`{${value}}`);
    expect(parser.results[0]).toEqual([{type: TaskArgumentType.Parameter, value}]);
});

test("multiple parameter", () => {
    const value = [`hello`, "world"];
    let parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar));
    parser.feed(`{${value.join("} {")}}`);
    expect(parser.results[0]).toEqual(value.map(value => {
        return {value, type: TaskArgumentType.Parameter};
    }));
});

test("mixes argument/parameter 1", () => {
    const value = [`hello`, "world"];
    const types = [TaskArgumentType.Literal, TaskArgumentType.Parameter];
    let parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar));
    parser.feed("hello {world}");
    expect(parser.results[0]).toEqual(value.map((value, index) => {
        return {value, type: types[index]};
    }));
});

test("mixes argument/parameter 2", () => {
    const value = [`hello`, "world", "again"];
    const types = [TaskArgumentType.Literal, TaskArgumentType.Parameter, TaskArgumentType.Literal];
    let parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar));
    parser.feed("hello {world} again");
    expect(parser.results[0]).toEqual(value.map((value, index) => {
        return {value, type: types[index]};
    }));
});

test("mixes argument/parameter 3", () => {
    const value = [`hello`, "world", "again"];
    const types = [TaskArgumentType.Parameter, TaskArgumentType.Literal, TaskArgumentType.Parameter];
    let parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar));
    parser.feed("{hello} world {again}");
    expect(parser.results[0]).toEqual(value.map((value, index) => {
        return {value, type: types[index]};
    }));
});

test("parameter with space", () => {
    const value = `{hello\\ world}`;
    let parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar));
    parser.feed(value);
    expect(parser.results[0]).toEqual([{value: "hello world", type: TaskArgumentType.Parameter}]);
});

test("argument with space", () => {
    const value = `hello\\ world`;
    let parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar));
    parser.feed(value);
    console.log(parser.results[0]);
    expect(parser.results[0]).toEqual([{value: "hello world", type: TaskArgumentType.Literal}]);
});
