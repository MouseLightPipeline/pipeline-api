@builtin "whitespace.ne" # `_` means arbitrary amount of whitespace

@{%
const moo = require("moo");

const lexer = moo.compile({
  ws:     /[ \t]+/,
  word: /[a-z0-9]+/,
  times:  /\*|x/,
  '{': '{',
  '}': '}',
   esc: '\\ '
});

const isLogging = true;

const log_inputs = (d, index) => {
    if (!isLogging || index !== 2) return;

    console.log(index);
    console.log(d);
}
%}

# Pass your lexer object using the @lexer option:
@lexer lexer

main ->     row {% (d) => {log_inputs(d, 6); return d[0];} %}

row         -> field {% (d) => {log_inputs(d, 4); return d[0];} %}
             | row _ field:+      {% (d) => {log_inputs(d, 5); return d[0].concat(...d[2]);} %}

field ->    simple {% (d) => {log_inputs(d, 1); return d;} %}
            | complex {% (d) => {log_inputs(d, 2); return d[0];} %}
            | object {% (d) => {log_inputs(d, 3); return d[0];} %}

object ->   _ "{" _ "}" _ {% (d) => {} %}
            | _ "{" simple "}" _ {% (d) => {return [d[2]];} %}
            | _ "{" complex "}" _ {% (d) => {return [d[2]];} %}

complex -> simple %esc simple {% (d) => {log_inputs(d, 0); return  d[0] + " " + d[2];} %}

simple -> %word {% (d) => {return d[0].value;} %}
