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
let f = \\x -> \\y -> x+y;
"My name is " & name;
f 1 n;
`)
