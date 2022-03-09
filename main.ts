import { Lexer } from "./lexer.ts"
import { Parser } from "./parser.ts"
import { TypeckState } from "./typeCheck.ts"
import { topLevelsToJs } from "./js.ts"
import { intorduceBuiltIns, removeBuiltIns } from "./builtIns.ts"

const compile = (source: string) => {
    const lexer = new Lexer(source)
    const spanManager = lexer.spanManager
    try {
        const toks = intorduceBuiltIns(lexer.lex())
        const exprs_ = new Parser(toks).parseTopLevel()
        new TypeckState().checkScript(exprs_)
        const exprs = removeBuiltIns(exprs_)
        return topLevelsToJs(exprs)
    } catch(err) {
        throw err.print(spanManager)
    }
}

if(Deno.args.length != 2) throw "Expected following syntax: [executable-name] inputFile outputFile"

const compleToFile = async (source: string) => await Deno.writeTextFile(Deno.args[1], compile(source))
const readFile = async (fName: string) => await Deno.readTextFile(fName)

const contents = await readFile(Deno.args[0])
await compleToFile(contents)