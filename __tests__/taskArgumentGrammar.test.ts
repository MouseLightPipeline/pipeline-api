// import * as nearley from "nearley";
const nearley = require("nearley");
const grammar = require("../server/argument-parser/taskArgumentGrammar.js");

test("single argument", () => {
    const value = `hello`;
    let parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar));
    parser.feed(value);
    expect(parser.results[0]).toEqual([value]);
});

test("mulitple argument", () => {
    const value = `hello world again`;
    let parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar));
    parser.feed(value);
    expect(parser.results[0]).toEqual(value.split(" "));
});

test("single parameter", () => {
    const value = `hello`;
    let parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar));
    parser.feed(`{${value}}`);
    expect(parser.results[0]).toEqual([value]);
});

test("multiple parameter", () => {
    const value = [`hello`, "world"];
    let parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar));
    parser.feed(`{${value.join("} {")}}`);
    expect(parser.results[0]).toEqual(value);
});

test("mixes argument/parameter 1", () => {
    const value = [`hello`, "world"];
    let parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar));
    parser.feed("hello {world}");
    expect(parser.results[0]).toEqual(value);
});

test("mixes argument/parameter 2", () => {
    const value = [`hello`, "world", "again"];
    let parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar));
    parser.feed("hello {world} again");
    expect(parser.results[0]).toEqual(value);
});

test("mixes argument/parameter 3", () => {
    const value = [`hello`, "world", "again"];
    let parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar));
    parser.feed("{hello} world {again}");
    expect(parser.results[0]).toEqual(value);
});

test("parameter with space", () => {
    const value = `{hello\\ world}`;
    let parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar));
    parser.feed(value);
    expect(parser.results[0]).toEqual(["hello world"]);
});
/*
test("argument with space", () => {
    const value = `hello\\ world`;
    let parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar));
    parser.feed(value);
    console.log(parser.results[0]);
    expect(parser.results[0]).toEqual(["hello\\ world"]);
});
*/
/*
parser.feed(`2wo\\ rld`);
//parser.feed(`{2wo\\ rld}`);
//parser.feed(`hello1 {2wo\\ rld} again`);
//parser.feed(`foo 2wo\\ rld bar this\\ is\\ a\\ test`);

// parser.results is an array of possible parsings.
console.log("-------------"); // [[[[ "foo" ],"\n" ]]]
console.log(parser.results[0]); // [[[[ "foo" ],"\n" ]]]
*/
/*
const value = [`hello`, "world"];
const testing = `{${value.join("} {")}}`;
console.log(testing);
let parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar));
parser.feed(testing);
console.log(parser.results[0]);
*/