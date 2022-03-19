import { Lexer } from "./lexer.ts"
import { Parser } from "./parser.ts"
import { TypeckState } from "./typeCheck.ts"
import { programGraphAnalysis } from "./ast.ts"
import { topLevelsToJs } from "./js.ts"
import { BUILT_IN_NAMES, intorduceBuiltIns, removeBuiltIns } from "./builtIns.ts"
import { modifyIdentifiersTopLevel, TopLevel } from "./ast.ts"
import { RefGraph } from "./graph.ts"
import { SpanManager, SpannedError } from "./spans.ts"

const compleToFile = async (source: string) => await Deno.writeTextFile(Deno.args[1], await compile(source))
const readFile = async (fName: string) => await Deno.readTextFile(fName)
const exists = async (filename: string): Promise<boolean> => {
    try {
        await Deno.stat(filename)
        return true
    } catch (error) {
        if (error instanceof Deno.errors.NotFound) {
            return false
        } else {
          throw error
        }
    }
}


async function gatherASTs(
        fName: string, 
        spanManager: SpanManager, 
        asts: [SpanManager, TopLevel[]][],
        graph: RefGraph,
    ) {
    const source = await readFile(fName)
    const lexer = new Lexer(source, spanManager, Object.keys(graph.dict).length)
    const toks = lexer.lex()
    const [imports, exprs] = new Parser(toks).parseTopLevel()
    spanManager.addSource(source)
    asts.push([spanManager, modifyIdentifiersTopLevel(exprs, Object.keys(graph.dict).length, BUILT_IN_NAMES)])
    for(const [importName, span] of imports) {
        graph.makeEdge(fName, `${importName}.bscr`)
        const existsFile = await exists(`${importName}.bscr`)
        if(!existsFile) throw SpannedError.new1(
            `'${importName}.bscr' is not found`,
            span
        )
        await gatherASTs(`${importName}.bscr`, spanManager, asts, graph)
    }
}

const compile = async (fName: string) => {
    const spanManager = new SpanManager()
    try {
        const exprs__: [SpanManager, TopLevel[]][] = []
        const graph = new RefGraph()
        await gatherASTs(fName, spanManager, exprs__, graph)
        const exprs_: TopLevel[] = exprs__.map(([_, x]) => x).flat()
        const [_, builtIns] = new Parser(intorduceBuiltIns()).parseTopLevel()
        const exprs = [...builtIns, ...exprs_]
        new TypeckState().checkScript(exprs)
        const exprsNoBuiltIns = removeBuiltIns(exprs)
        programGraphAnalysis(exprsNoBuiltIns)
        return topLevelsToJs(exprsNoBuiltIns)
    } catch(err) {
        if(!(err instanceof SpannedError)) throw err
        throw err.print(spanManager)
    }
}

if(Deno.args.length != 2) throw "Expected following syntax: [executable-name] inputFile outputFile"

await compleToFile(Deno.args[0])
