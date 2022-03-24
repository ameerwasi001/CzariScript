import { Lexer } from "./lexer.ts"
import { Parser } from "./parser.ts"
import { TypeckState } from "./typeCheck.ts"
import { programGraphAnalysis } from "./ast.ts"
import { topLevelsToJs } from "./js.ts"
import { BUILT_IN_NAMES, intorduceBuiltIns, removeBuiltIns } from "./builtIns.ts"
import { modifyIdentifiersTopLevel, pathConstructorsTopLevel, TopLevel } from "./ast.ts"
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

const rsplit = function(self: string, sep: string, maxsplit = 1) {
    var split = self.split(sep);
    return maxsplit ? [ split.slice(0, -maxsplit).join(sep) ].concat(split.slice(-maxsplit)) : split;
}

async function gatherASTs(
        fName: string, 
        spanManager: SpanManager, 
        asts: Record<string, [SpanManager, TopLevel[]]>,
        arr: string[],
        graph: RefGraph,
    ) {
        const source = await readFile(fName)
        arr.push(fName)
        const lexer = new Lexer(source, spanManager, arr.length-1)
        const toks = lexer.lex()
        const [imports, exprs, aliases] = new Parser(toks).parseTopLevel()
        const woExtension = rsplit(arr[arr.length-1], ".").slice(0, -1).join(".")
        const exprs$ = pathConstructorsTopLevel(exprs, aliases, BUILT_IN_NAMES)
        asts[fName] = [spanManager, modifyIdentifiersTopLevel(exprs$, woExtension, BUILT_IN_NAMES)]
        for(const [importName, span] of imports) {
            graph.makeEdge(fName, `${importName}.bscr`)
            const existsFile = await exists(`${importName}.bscr`)
            if(!existsFile) throw SpannedError.new1(
                `'${importName}.bscr' is not found`,
                span
            )
            await gatherASTs(`${importName}.bscr`, spanManager, asts, arr, graph)
        }
}

const compile = async (fName: string) => {
    const spanManager = new SpanManager()
    try {
        const exprs__: Record<string, [SpanManager, TopLevel[]]> = {}
        const graph = new RefGraph()
        await gatherASTs(fName, spanManager, exprs__, [], graph)
        const exprs_: TopLevel[] = Object.keys(exprs__).length == 1 ? 
            exprs__[Object.keys(exprs__)[0]][1] :
            [...graph.topologicalSort()].map(s => exprs__[s][1]).flat()
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
