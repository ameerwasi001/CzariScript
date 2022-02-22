import { Lexer } from "./lexer.ts"
import { Parser } from "./parser.ts"
import { TypeckState } from "./typeCheck.ts"

const compile = (source: string) => {
    const lexer = new Lexer(source)
    const spanManager = lexer.spanManager
    const toks = lexer.lex()
    try {
        const exprs = new Parser(toks).parseTopLevel()
        new TypeckState().checkScript(exprs)
        return exprs
    } catch(err) {
        throw err.print(spanManager)
    }
}

compile(`
let n = 9+10*2;
let name = "Am" & "ee" & "r";
let x = (if true then 1 else 4)+4;
let f = \\x y -> if y = null then x else x & y;
let fac = \\n -> if n < 2 then 1 else n*fac(n-1);
let access = \\obj -> obj.x.y.z;
f "My name is " name;
f "a" null;
fac 10;
let obj = {x: {y: {z: 4}}};
access {obj with s: "h", m: 3};
access {x: {y: {z: 4}, text: "No!"}};
`)
