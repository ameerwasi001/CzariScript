import { Lexer } from "./lexer.ts"
import { Parser } from "./parser.ts"
import { TypeckState } from "./typeCheck.ts"
import { programGraphAnalysis } from "./ast.ts"
import { topLevelsToJs } from "./js.ts"
import { BUILT_IN_NAMES, intorduceBuiltIns, removeBuiltIns } from "./builtIns.ts"
import { modifyIdentifiersTopLevel, pathConstructorsTopLevel, TopLevel } from "./ast.ts"
import { RefGraph } from "./graph.ts"
import { SpanManager, SpannedError } from "./spans.ts"

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

const objectMap = <A, B>(obj: Record<string, A>, f: (_1:string, _2: A) => [string, B]): Record<string, B> => {
    const newObj: Record<string, B> = {}
    for(const k in obj) {
        const v = obj[k]
        const [newK, newV] = f(k, v)
        newObj[newK] = newV
    }
    return newObj
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
        const exprs$ = modifyIdentifiersTopLevel(exprs, woExtension, BUILT_IN_NAMES)
        const exprs$$ = pathConstructorsTopLevel(
            exprs$, 
            objectMap(aliases, (k, v) => [`${woExtension}__` + k, v]),
            BUILT_IN_NAMES
        )
        asts[fName] = [spanManager, pathConstructorsTopLevel(exprs$$, aliases, BUILT_IN_NAMES)]
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

export {
    gatherASTs,
}