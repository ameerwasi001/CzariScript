import { Lexer } from "./lexer.ts"
import { Parser } from "./parser.ts"
import { TypeckState } from "./typeCheck.ts"

const compile = (source: string) => {
    const lexer = new Lexer(source)
    const spanManager = lexer.spanManager
    const toks = lexer.lex()
    try {
        const ast = new Parser(toks).parse()
        new TypeckState().checkScript([
            {type: "Expr", val: ast[0]}
        ])
        return ast
    } catch(err) {
        throw err.print(spanManager)
    }
}

compile(`9+10`)
compile(`"a" & "b"`)
compile(`(if true then 1 else 4)+4`)