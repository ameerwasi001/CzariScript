import { Span, Spanned, SpannedError, cloneSpan } from "./spans.ts"
import { RefGraph } from "./graph.ts"
import { Literal, Op, OpType } from "./token.ts"

type VarDefinition = [string, Expr]

type LetPattern = 
    {type: "Var", val: string}
    | {type: "Record", val: [Spanned<string>, LetPattern][]}

type MatchPattern = 
    {type: "Case", val: [string, string]}
    | {type: "Wildcard", val: string}

type Expr = 
    {type: "BinOp", fields: [Spanned<Expr>, Spanned<Expr>, OpType, Op, Span]}
    | {type: "Call", fields: [Expr, Expr, Span]}
    | {type: "Case", fields: [Spanned<string>, Expr]}
    | {type: "FieldAccess", fields: [Expr, string, Span]}
    | {type: "FuncDef", fields: Spanned<[LetPattern, Expr]>}
    | {type: "If", fields: [Spanned<Expr>, Expr, Expr]}
    | {type: "Let", fields: [VarDefinition, Expr]}
    | {type: "LetRec", fields: [Spanned<VarDefinition>[], Expr]}
    | {type: "Literal", fields: [Literal, Spanned<string>]}
    | {type: "Match", fields: [Expr, [Spanned<MatchPattern>, Expr][], Span]}
    | {type: "NewRef", fields: [Expr, Span]}
    | {type: "Record", fields: [Expr | null, [Spanned<string>, Expr][], Span]}
    | {type: "RefGet", field: Spanned<Expr>}
    | {type: "RefSet", fields: [Spanned<Expr>, Expr]}
    | {type: "Variable", field: Spanned<string>}

type Readability =
    "ReadWrite"
    | "ReadOnly"
    | "WriteOnly"

type TopLevel = 
    {type: "Expr", val: Expr}
    | {type: "LetDef", val: VarDefinition}
    | {type: "LetRecDef", val: [VarDefinition, Span][]}

const cloneSpannedExpr = ([expr, span]: [Expr, Span]): Spanned<Expr> => {
    return [cloneExpr(expr), cloneSpan(span)]
}

const cloneSpannedString = ([str, span]: [string, Span]): Spanned<string> => {
    return [str, cloneSpan(span)]
}

const cloenVarDefinition = (def: VarDefinition): VarDefinition => {
    const [str, expr] = def
    return [str, cloneExpr(expr)]
}

function cloneLetPattern(letPattern: LetPattern): LetPattern {
    if (letPattern.type == "Var") return {type: "Var", val: letPattern.val}
    else return {
        type: "Record", 
        val: letPattern.val.map(
            ([spanString, letPat]: [Spanned<string>, LetPattern]) => 
                [cloneSpannedString(spanString), cloneLetPattern(letPat)]
        )
    }
}

const cloneMatchPattern = (pat: MatchPattern) : MatchPattern => {
    if (pat.type == "Case") return {type: "Case", val: [pat.val[0], pat.val[1]]}
    else return {type: "Wildcard", val: pat.val}
}

const cloneSpannedMatchPattern = ([matchPattern, span]: [MatchPattern, Span]) : Spanned<MatchPattern> => {
    return [cloneMatchPattern(matchPattern), cloneSpan(span)]
}

function cloneExpr(expr: Expr): Expr {
    if (expr.type == "BinOp") {
        const [spannedExpr1, spannedExpr2, opType, op, span] = expr.fields
        return {type: "BinOp", fields: [cloneSpannedExpr(spannedExpr1), cloneSpannedExpr(spannedExpr2), opType, op, span]}
    } else if (expr.type == "Call") {
        const [expr1, expr2, span] = expr.fields
        return {type: "Call", fields: [cloneExpr(expr1), cloneExpr(expr2), span]}
    } else if (expr.type == "Case") {
        const [spannedString, newExpr] = expr.fields
        return {type: "Case", fields: [cloneSpannedString(spannedString), cloneExpr(newExpr)]}
    } else if (expr.type == "FieldAccess") {
        const [expr1, str, span] = expr.fields
        return {type: "FieldAccess", fields: [cloneExpr(expr1), str, span]}
    } else if (expr.type == "FuncDef") {
        const [[argPattern, bodyExpr], span] = expr.fields
        return {type: "FuncDef", fields: [[cloneLetPattern(argPattern), cloneExpr(bodyExpr)], span] }
    } else if (expr.type == "If") {
        const [spannedExpr, expr1, expr2] = expr.fields
        return {type: "If", fields: [cloneSpannedExpr(spannedExpr), cloneExpr(expr1), cloneExpr(expr2)]}
    } else if (expr.type == "Let") {
        const [varDefinition, expr1] = expr.fields
        return {type: "Let", fields: [cloenVarDefinition(varDefinition), cloneExpr(expr1)]}
    } else if (expr.type == "LetRec") {
        const [varDefinitions, expr1] = expr.fields
        return {type: "LetRec", fields: [varDefinitions.map(([def, span]) => [cloenVarDefinition(def), cloneSpan(span)]), cloneExpr(expr1)]}
    } else if (expr.type == "Literal") {
        const [literal, spannedString] = expr.fields
        return {type: "Literal", fields: [literal, cloneSpannedString(spannedString)]}
    } else if (expr.type == "Match") {
        const [expr1, xs, span] = expr.fields
        return {type: "Match", fields: [cloneExpr(expr1), xs.map(([spannedMatch, expr]) => [cloneSpannedMatchPattern(spannedMatch), cloneExpr(expr)]), span]}
    } else if (expr.type == "NewRef") {
        const [expr1, span] = expr.fields
        return {type: "NewRef", fields: [cloneExpr(expr1), span]}
    } else if (expr.type == "Record") {
        const [maybeExpr, xs, span] = expr.fields
        const expr1 = maybeExpr == null ? null : cloneExpr(maybeExpr)
        const xs1 = xs.map(([spannedString, expr]) : [Spanned<string>, Expr] => [cloneSpannedString(spannedString), cloneExpr(expr)])
        return {type: "Record", fields: [expr1, xs1, span]}
    } else if (expr.type == "RefGet") {
        const spannedExpr = expr.field
        return {type: "RefGet", field: cloneSpannedExpr(spannedExpr)}
    } else if (expr.type == "RefSet") {
        const [spannedExpr, expr1] = expr.fields
        return {type: "RefSet", fields: [cloneSpannedExpr(spannedExpr), cloneExpr(expr1)]}
    } else {
        const v = expr.field
        return {type: "Variable", field: cloneSpannedString(v)}
    }
}

// Modifies identifier and turns it into {prefix}__{identifer}
const  modifyIdentifiersMatchExpr =  (pat: MatchPattern, modNum: string) : MatchPattern => {
    if (pat.type == "Case") return {type: "Case", val: [
        pat.val[0].includes("`") ? `${modNum}__${pat.val[0]}` : pat.val[0], 
        `${modNum}__${pat.val[1]}`
    ]}
    else return {type: "Wildcard", val: `${modNum}__${pat.val}`}
}

function modifyIndentifiersSpannedExpr(spannedExpr: Spanned<Expr>, modNum: string, builtIns: Set<string>): [Expr, Span] {
    const [expr, span] = spannedExpr
    return [modifyIdentifiers(expr, modNum, builtIns), span]
}

const modifyIndentifiersVarDefinition = (def: VarDefinition, modNum: string, builtIns: Set<string>): VarDefinition => {
    const [str, expr] = def
    return [`${modNum}__${str}`, modifyIdentifiers(expr, modNum, builtIns)]
}

function modifyIdentifiersLetPattern(letPattern: LetPattern, modNum: string, builtIns: Set<string>): LetPattern {
    if (letPattern.type == "Var") {
        return {type: "Var", val: `${modNum}__${letPattern.val}`}
    }
    else return {
        type: "Record", 
        val: letPattern.val.map(
            ([[string, span], letPat]: [[string, Span], LetPattern]) => 
                [[string, span], modifyIdentifiersLetPattern(letPat, modNum, builtIns)]
        )
    }
}

function modifyIdentifiers(expr: Expr, modNum: string, builtIns: Set<string>): Expr {
    if (expr.type == "BinOp") {
        const [spannedExpr1, spannedExpr2, opType, op, span] = expr.fields
        return {type: "BinOp", fields: [modifyIndentifiersSpannedExpr(spannedExpr1, modNum, builtIns), modifyIndentifiersSpannedExpr(spannedExpr2, modNum, builtIns), opType, op, span]}
    } else if (expr.type == "Call") {
        const [expr1, expr2, span] = expr.fields
        return {type: "Call", fields: [modifyIdentifiers(expr1, modNum, builtIns), modifyIdentifiers(expr2, modNum, builtIns), span]}
    } else if (expr.type == "Case") {
        const [[name, span], newExpr] = expr.fields
        let endName: string
        if (name.includes("`")) endName = `${modNum}__${name}`
        else endName = name
        return {type: "Case", fields: [[endName, span], modifyIdentifiers(newExpr, modNum, builtIns)]}
    } else if (expr.type == "FieldAccess") {
        const [expr1, str, span] = expr.fields
        return {type: "FieldAccess", fields: [modifyIdentifiers(expr1, modNum, builtIns), str, span]}
    } else if (expr.type == "FuncDef") {
        const [[argPattern, bodyExpr], span] = expr.fields
        return {type: "FuncDef", fields: [[modifyIdentifiersLetPattern(argPattern, modNum, builtIns), modifyIdentifiers(bodyExpr, modNum, builtIns)], span] }
    } else if (expr.type == "If") {
        const [spannedExpr, expr1, expr2] = expr.fields
        return {type: "If", fields: [modifyIndentifiersSpannedExpr(spannedExpr, modNum, builtIns), modifyIdentifiers(expr1, modNum, builtIns), modifyIdentifiers(expr2, modNum, builtIns)]}
    } else if (expr.type == "Let") {
        const [varDefinition, expr1] = expr.fields
        return {type: "Let", fields: [modifyIndentifiersVarDefinition(varDefinition, modNum, builtIns), modifyIdentifiers(expr1, modNum, builtIns)]}
    } else if (expr.type == "LetRec") {
        const [varDefinitions, expr1] = expr.fields
        return {type: "LetRec", fields: [varDefinitions.map(([def, span]) => [modifyIndentifiersVarDefinition(def, modNum, builtIns), span]), modifyIdentifiers(expr1, modNum, builtIns)]}
    } else if (expr.type == "Literal") {
        const [literal, spannedString] = expr.fields
        return {type: "Literal", fields: [literal, spannedString]}
    } else if (expr.type == "Match") {
        const [expr1, xs, span] = expr.fields
        return {type: "Match", fields: [modifyIdentifiers(expr1, modNum, builtIns), xs.map(([[match_, span], expr]) => [[modifyIdentifiersMatchExpr(match_, modNum), span], modifyIdentifiers(expr, modNum, builtIns)]), span]}
    } else if (expr.type == "NewRef") {
        const [expr1, span] = expr.fields
        return {type: "NewRef", fields: [modifyIdentifiers(expr1, modNum, builtIns), span]}
    } else if (expr.type == "Record") {
        const [maybeExpr, xs, span] = expr.fields
        const expr1 = maybeExpr == null ? null : modifyIdentifiers(maybeExpr, modNum, builtIns)
        const xs1 = xs.map(([spannedString, expr]) : [Spanned<string>, Expr] => [spannedString, modifyIdentifiers(expr, modNum, builtIns)])
        return {type: "Record", fields: [expr1, xs1, span]}
    } else if (expr.type == "RefGet") {
        const spannedExpr = expr.field
        return {type: "RefGet", field: modifyIndentifiersSpannedExpr(spannedExpr, modNum, builtIns)}
    } else if (expr.type == "RefSet") {
        const [spannedExpr, expr1] = expr.fields
        return {type: "RefSet", fields: [modifyIndentifiersSpannedExpr(spannedExpr, modNum, builtIns), modifyIdentifiers(expr1, modNum, builtIns)]}
    } else {
        const [v, span] = expr.field
        const bool = v.includes("__") && !(v.includes("___"))
        let str = (bool || builtIns.has(v)) ? v : `${modNum}__${v}`
        if(bool) {
            const strs = str.split("__")
            let i = 0
            while(i < strs.length) {
                if(strs[i].includes("`")) strs[i] = `${modNum}__${strs[i]}`
                i += 1
            }
            str = strs.join("__")
        }
        return {type: "Variable", field: [str, span]}
    }
}

const modifyIdentifiersTopLevel = (topLevels: TopLevel[], modNum: string, builtIns: Set<string>): TopLevel[] => {
    const newTopLevels: TopLevel[] = []
    for(const topLevel of topLevels) {
        if(topLevel.type == "Expr") newTopLevels.push({type: "Expr", val: modifyIdentifiers(topLevel.val, modNum, builtIns)})
        else if(topLevel.type == "LetDef") {
            const [n, expr] = topLevel.val
            newTopLevels.push({type: "LetDef", val: [`${modNum}__${n}`, modifyIdentifiers(expr, modNum, builtIns)]})
        } else if(topLevel.type == "LetRecDef") {
            const vals = topLevel.val
            const newTopLevel: TopLevel = {
                type: "LetRecDef", 
                val: vals.map(([[n, expr], span]) => [[`${modNum}__${n}`, modifyIdentifiers(expr, modNum, builtIns)], span])
            }
            newTopLevels.push(newTopLevel)
        }
    }
    return newTopLevels
}

const patternToString = (pat: MatchPattern) => {
    if(pat.type == "Case") return `${pat.val[0]} ${pat.val[1]}`
    else return pat.val
}

function letPatternToString(pat: LetPattern) {
    if(pat.type == "Record") {
        return "{" + pat.val.map(([[prop, _], val]) => `${prop}: ${val}`).join(", ") + "}"
    } else return pat.val
}

function exprToString(expr: Expr): string {
    if (expr.type == "BinOp") {
        const [[expr1, _1], [expr2, _2], opType, op, span] = expr.fields
        return exprToString(expr1) + ` ${op}#${opType} ` + exprToString(expr2)
    } else if (expr.type == "Call") {
        const [expr1, expr2, span] = expr.fields
        return exprToString(expr1) + " " + exprToString(expr2)
    } else if (expr.type == "Case") {
        const [[str, _], newExpr] = expr.fields
        return str + " " + exprToString(newExpr)
    } else if (expr.type == "FieldAccess") {
        const [expr1, str, span] = expr.fields
        return exprToString(expr1) + "." + str
    } else if (expr.type == "FuncDef") {
        const [[argPattern, bodyExpr], span] = expr.fields
        return `\\${letPatternToString(argPattern)} -> ` + exprToString(bodyExpr)
    } else if (expr.type == "If") {
        const [[expr1, _], expr2, expr3] = expr.fields
        return `if ${expr1} then ${expr2} else ${expr3}`
    } else if (expr.type == "Let") {
        const [[id, valExpr], expr1] = expr.fields
        return `let ${id} = ${exprToString(valExpr)} in ${exprToString(expr1)}`
    } else if (expr.type == "LetRec") {
        const [varDefinitions, expr1] = expr.fields
        return "letrec " + varDefinitions.map(([[id, val], _]) => `${id} = ${exprToString(val)}`).join(", ") + " in " + exprToString(expr1)
    } else if (expr.type == "Literal") {
        const [_1, [str, _2]] = expr.fields
        return str
    } else if (expr.type == "Match") {
        const [expr1, xs, span] = expr.fields
        const s = xs.map(([[pat, _], expr]) => "\t" + patternToString(pat) + " -> " + exprToString(expr))
            .join("\n")
            .split("\n")
            .map(x => "\t" + x)
            .join("\n")
        return `match ${exprToString(expr1)}\n${s}`
    } else if (expr.type == "NewRef") {
        const [expr1, _] = expr.fields
        return `ref ${expr1}`
    } else if (expr.type == "Record") {
        const [maybeExpr, xs, span] = expr.fields
        const str = xs.map(([[str, _], expr]) => str + ": " + exprToString(expr)).join(", ")
        return `{${maybeExpr == null ? "" : `${exprToString(maybeExpr)} with `}${str}}`
    } else if (expr.type == "RefGet") {
        const [expr1, _] = expr.field
        return `get ${exprToString(expr1)}`
    } else if (expr.type == "RefSet") {
        const [[expr1, span], expr2] = expr.fields
        return `${exprToString(expr1)} := ${exprToString(expr2)}`
    } else {
        return expr.field[0]
    }
}

// Patch constructors
const aliasCase = (str: string, modNum: Record<string, [string, Span]>, span: Span): string => {
    const hasTilde = str.includes("`")
    if(hasTilde && !(modNum.hasOwnProperty(str))) throw SpannedError.new1(
        `Could not find a defintion for ${str}`,
        span
    )
    return hasTilde ? modNum[str][0] : str
}

const pathConstructorsMatchExpr =  (pat: MatchPattern, modNum: Record<string, [string, Span]>, span: Span) : MatchPattern => {
    if (pat.type == "Case") return {type: "Case", val: [aliasCase(pat.val[0], modNum, span), pat.val[1]]}
    else return {type: "Wildcard", val: pat.val}
}

function pathConstructorsSpannedExpr(spannedExpr: Spanned<Expr>, modNum: Record<string, [string, Span]>, builtIns: Set<string>): [Expr, Span] {
    const [expr, span] = spannedExpr
    return [pathConstructors(expr, modNum, builtIns), span]
}

const pathConstructorsVarDefinition = (def: VarDefinition, modNum: Record<string, [string, Span]>, builtIns: Set<string>): VarDefinition => {
    const [str, expr] = def
    return [str, pathConstructors(expr, modNum, builtIns)]
}

function pathConstructorsLetPattern(letPattern: LetPattern, modNum: Record<string, [string, Span]>, builtIns: Set<string>): LetPattern {
    if (letPattern.type == "Var") return {type: "Var", val: letPattern.val}
    else return {
        type: "Record", 
        val: letPattern.val.map(
            ([[string, span], letPat]: [[string, Span], LetPattern]) => 
                [[string, span], pathConstructorsLetPattern(letPat, modNum, builtIns)]
        )
    }
}

function pathConstructors(expr: Expr, modNum: Record<string, [string, Span]>, builtIns: Set<string>): Expr {
    if (expr.type == "BinOp") {
        const [spannedExpr1, spannedExpr2, opType, op, span] = expr.fields
        return {type: "BinOp", fields: [pathConstructorsSpannedExpr(spannedExpr1, modNum, builtIns), pathConstructorsSpannedExpr(spannedExpr2, modNum, builtIns), opType, op, span]}
    } else if (expr.type == "Call") {
        const [expr1, expr2, span] = expr.fields
        return {type: "Call", fields: [pathConstructors(expr1, modNum, builtIns), pathConstructors(expr2, modNum, builtIns), span]}
    } else if (expr.type == "Case") {
        const [[string, span], newExpr] = expr.fields
        return {type: "Case", fields: [[aliasCase(string, modNum, span), span], pathConstructors(newExpr, modNum, builtIns)]}
    } else if (expr.type == "FieldAccess") {
        const [expr1, str, span] = expr.fields
        return {type: "FieldAccess", fields: [pathConstructors(expr1, modNum, builtIns), str, span]}
    } else if (expr.type == "FuncDef") {
        const [[argPattern, bodyExpr], span] = expr.fields
        return {type: "FuncDef", fields: [[pathConstructorsLetPattern(argPattern, modNum, builtIns), pathConstructors(bodyExpr, modNum, builtIns)], span] }
    } else if (expr.type == "If") {
        const [spannedExpr, expr1, expr2] = expr.fields
        return {type: "If", fields: [pathConstructorsSpannedExpr(spannedExpr, modNum, builtIns), pathConstructors(expr1, modNum, builtIns), pathConstructors(expr2, modNum, builtIns)]}
    } else if (expr.type == "Let") {
        const [varDefinition, expr1] = expr.fields
        return {type: "Let", fields: [pathConstructorsVarDefinition(varDefinition, modNum, builtIns), pathConstructors(expr1, modNum, builtIns)]}
    } else if (expr.type == "LetRec") {
        const [varDefinitions, expr1] = expr.fields
        return {type: "LetRec", fields: [varDefinitions.map(([def, span]) => [pathConstructorsVarDefinition(def, modNum, builtIns), span]), pathConstructors(expr1, modNum, builtIns)]}
    } else if (expr.type == "Literal") {
        const [literal, spannedString] = expr.fields
        return {type: "Literal", fields: [literal, spannedString]}
    } else if (expr.type == "Match") {
        const [expr1, xs, span] = expr.fields
        return {type: "Match", fields: [pathConstructors(expr1, modNum, builtIns), xs.map(([[match_, span], expr]) => [[pathConstructorsMatchExpr(match_, modNum, span), span], pathConstructors(expr, modNum, builtIns)]), span]}
    } else if (expr.type == "NewRef") {
        const [expr1, span] = expr.fields
        return {type: "NewRef", fields: [pathConstructors(expr1, modNum, builtIns), span]}
    } else if (expr.type == "Record") {
        const [maybeExpr, xs, span] = expr.fields
        const expr1 = maybeExpr == null ? null : pathConstructors(maybeExpr, modNum, builtIns)
        const xs1 = xs.map(([spannedString, expr]) : [Spanned<string>, Expr] => [spannedString, pathConstructors(expr, modNum, builtIns)])
        return {type: "Record", fields: [expr1, xs1, span]}
    } else if (expr.type == "RefGet") {
        const spannedExpr = expr.field
        return {type: "RefGet", field: pathConstructorsSpannedExpr(spannedExpr, modNum, builtIns)}
    } else if (expr.type == "RefSet") {
        const [spannedExpr, expr1] = expr.fields
        return {type: "RefSet", fields: [pathConstructorsSpannedExpr(spannedExpr, modNum, builtIns), pathConstructors(expr1, modNum, builtIns)]}
    } else {
        const [ident, span] = expr.field
        const strs = ident.split("__")
        const newStrs: string[] = []
        let i = 0
        while(i < strs.length) {
            const str = strs[i]
            if(str.startsWith("_")) {
                newStrs.push(str)
                i += 1
                continue
            }
            if(str.includes("`") && (strs[i-1] === undefined || strs[i-1] === "")) newStrs.push(aliasCase(str, modNum, span))
            else if(str.includes("`")) {
                const lastStr = newStrs.pop()
                newStrs.push(aliasCase(`${lastStr}__${str}`, modNum, span))
            } else newStrs.push(str)
            i += 1
        }
        const str = newStrs.join("__")
        return {type: "Variable", field: [str, span]}
    }
}

const pathConstructorsTopLevel = (topLevels: TopLevel[], modNum: Record<string, [string, Span]>, builtIns: Set<string>): TopLevel[] => {
    const newTopLevels: TopLevel[] = []
    for(const topLevel of topLevels) {
        if(topLevel.type == "Expr") newTopLevels.push({type: "Expr", val: pathConstructors(topLevel.val, modNum, builtIns)})
        else if(topLevel.type == "LetDef") {
            const [n, expr] = topLevel.val
            newTopLevels.push({type: "LetDef", val: [n, pathConstructors(expr, modNum, builtIns)]})
        } else if(topLevel.type == "LetRecDef") {
            const vals = topLevel.val
            const newTopLevel: TopLevel = {
                type: "LetRecDef", 
                val: vals.map(([[n, expr], span]) => [[n, pathConstructors(expr, modNum, builtIns)], span])
            }
            newTopLevels.push(newTopLevel)
        }
    }
    return newTopLevels
}


const matchPatternReferenceGraph = (pat: MatchPattern) : Set<string> => {
    if (pat.type == "Case") return new Set([pat.val[1]])
    else return new Set([pat.val])
}

const matchPatternsReferenceGraph = (pats: MatchPattern[]) : Set<string> => {
    const defs = new Set<string>()
    for(const pat of pats) {
        for(const def of matchPatternReferenceGraph(pat)) defs.add(def)
    }
    return defs
}

function letPatternReferenceGraph(pat: LetPattern, graph: RefGraph): Set<string> {
    if(pat.type == "Record") {
        const defs: Set<string> = new Set()
        for(const [[_1, _2], val] of pat.val) {
            for(const str of letPatternReferenceGraph(val, graph)) defs.add(str)
        }
        return defs
    } else return new Set([pat.val])
}

const collectTopLevelDefinitions = (topLevels: TopLevel[]): Set<string> => {
    const defs = new Set<string>()
    for(const topLevel of topLevels) {
        if(topLevel.type == "LetRecDef") {
            topLevel.val.forEach(([[def, _1], _2]) => defs.add(def))
        }
        else if(topLevel.type == "LetDef") defs.add(topLevel.val[0])
    }
    return defs
}

const topLevelGraph = (topLevels: TopLevel[], unincludeables: Set<string>): RefGraph => {
    let n = 0
    const refGraph = new RefGraph()
    refGraph.unincludeables = unincludeables
    const allDefinitons = collectTopLevelDefinitions(topLevels)
    for(const topLevel of topLevels) {
        if(topLevel.type == "LetRecDef") {
            const defs = topLevel.val
            for(const [[id, val], span] of defs) {
                refGraph.register(id, n)
                refGraph.runFromDef(id, span, {expr: val, defs: allDefinitons}, referenceGraph)
                n++
            }
        }
    }
    return refGraph
}

const programGraphAnalysis = (topLevels: TopLevel[], unincludeables = new Set<string>()) => {
    const graph = topLevelGraph(topLevels, unincludeables)
    graph.ensureAcyclic()
    graph.ensureDefinitions()
}

function referenceGraph({expr, defs}: {expr: Expr, defs: Set<string>}, graph: RefGraph) {
    if (expr.type == "BinOp") {
        const [[expr1, _1], [expr2, _2], opType, op, span] = expr.fields
        referenceGraph({expr: expr1, defs}, graph)
        referenceGraph({expr: expr2, defs}, graph)
    } else if (expr.type == "Call") {
        const [expr1, expr2, _] = expr.fields
        referenceGraph({expr: expr1, defs}, graph)
        referenceGraph({expr: expr2, defs}, graph)
    } else if (expr.type == "Case") {
        const [[_1, _2], newExpr] = expr.fields
        referenceGraph({expr: newExpr, defs}, graph)
    } else if (expr.type == "FieldAccess") {
        const [expr1, _1, _2] = expr.fields
        referenceGraph({expr: expr1, defs}, graph)
    } else if (expr.type == "FuncDef") {} 
    else if (expr.type == "If") {
        const [[expr1, _], expr2, expr3] = expr.fields
        referenceGraph({expr: expr1, defs}, graph)
        referenceGraph({expr: expr2, defs}, graph)
        referenceGraph({expr: expr3, defs}, graph)
    } else if (expr.type == "Let") {
        const [[id, valExpr], expr1] = expr.fields
        graph.withNoneOf(new Set([id]), {expr: valExpr, defs}, referenceGraph)
        graph.withNoneOf(new Set([id]), {expr: expr1, defs}, referenceGraph)
    } else if (expr.type == "LetRec") {
        const [varDefinitions, expr1] = expr.fields
        const _defs = new Set<string>()
        const topLevels: TopLevel[] = [{type: "LetRecDef", val: varDefinitions}]
        for(const [[id, _1], _2] of varDefinitions) _defs.add(id)
        programGraphAnalysis(topLevels, defs)
        for(const [[_1, expr], _2] of varDefinitions) graph.withNoneOf(defs, {expr, defs}, referenceGraph)
        graph.withNoneOf(defs, {expr: expr1, defs}, referenceGraph)
    } else if (expr.type == "Literal") {} 
    else if (expr.type == "Match") {
        const [expr1, xs, _1] = expr.fields
        referenceGraph({expr: expr1, defs}, graph)
        for (const [[pat, _1], expr] of xs) {
            const defs = matchPatternReferenceGraph(pat)
            graph.withNoneOf(defs, {expr: expr1, defs}, referenceGraph)
        }
    } else if (expr.type == "NewRef") {
        const [expr1, _] = expr.fields
        referenceGraph({expr: expr1, defs}, graph)
    } else if (expr.type == "Record") {
        const [maybeExpr, xs, _] = expr.fields
        for(const [[_1, _2], expr] of xs) referenceGraph({expr, defs}, graph)
        maybeExpr == null ? "" : referenceGraph({expr: maybeExpr, defs}, graph)
    } else if (expr.type == "RefGet") {
        const [expr1, _] = expr.field
        referenceGraph({expr: expr1, defs}, graph)
    } else if (expr.type == "RefSet") {
        const [[expr1, _], expr2] = expr.fields
        referenceGraph({expr: expr1, defs}, graph)
        referenceGraph({expr: expr2, defs}, graph)
    } else {
        graph.addEdge(...expr.field)
    }
}

export type { 
    Literal, Op, OpType, VarDefinition, 
    LetPattern, MatchPattern, Expr, 
    Readability, TopLevel
}
export { 
    cloneExpr, modifyIdentifiersTopLevel, exprToString, pathConstructorsTopLevel,
    programGraphAnalysis
}