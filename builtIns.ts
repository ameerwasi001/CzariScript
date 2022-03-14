import { Token } from "./token.ts"
import { Lexer } from "./lexer.ts"
import { removeLast, dictToArray } from "./utils.ts"
import { TopLevel } from "./ast.ts"

const BUILT_IN_STRINGS: Record<string, string> = {
    println: "\\x -> x;",
}

const BUILT_IN_TOKENS: Token[] = dictToArray(BUILT_IN_STRINGS).map(
    ([name, source]) => removeLast(new Lexer(name + " = " + source).lex())
).flat(1)

const intorduceBuiltIns = (toks: Token[]): Token[] => [...BUILT_IN_TOKENS, ...toks]

const removeBuiltIns = (topLevels: TopLevel[]): TopLevel[] => {
    const newTopLevels: TopLevel[] = []
    for(const topLevel of topLevels) {
        if(topLevel.type == "Expr") newTopLevels.push(topLevel)
        else if(topLevel.type == "LetDef") {
            const [n, _] = topLevel.val
            if(!(BUILT_IN_STRINGS.hasOwnProperty(n))) newTopLevels.push(topLevel)
        } else if(topLevel.type == "LetRecDef") {
            const vals = topLevel.val
            const newTopLevel: TopLevel = {
                type: "LetRecDef", 
                val: vals.filter(([[n, _1], _2]) => !(BUILT_IN_STRINGS.hasOwnProperty(n)))
            }
            newTopLevels.push(newTopLevel)
        }
    }
    return newTopLevels
}

export { BUILT_IN_STRINGS, BUILT_IN_TOKENS, intorduceBuiltIns, removeBuiltIns }