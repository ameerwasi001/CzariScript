import { Parser } from "./parser.ts"
import { gatherASTs } from "./gatherer.ts"
import { TypeckState } from "./typeCheck.ts"
import { programGraphAnalysis, TopLevel } from "./ast.ts"
import { topLevelsToJs } from "./js.ts"
import { BUILT_IN_NAMES, intorduceBuiltIns, removeBuiltIns } from "./builtIns.ts"
import { RefGraph } from "./graph.ts"
import { SpanManager, SpannedError } from "./spans.ts"

const compleToFile = async (source: string) => await Deno.writeTextFile(Deno.args[1], await compile(source))

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
