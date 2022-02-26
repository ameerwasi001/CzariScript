import { Span, Spanned, SpannedError, cloneSpan } from "./spans.ts"
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
    | {type: "LetRec", fields: [VarDefinition[], Expr]}
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
    | {type: "LetRecDef", val: VarDefinition[]}

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
        return {type: "LetRec", fields: [varDefinitions.map(def => cloenVarDefinition(def)), cloneExpr(expr1)]}
    } else if (expr.type == "Literal") {
        const [literal, spannedString] = expr.fields
        return {type: "Literal", fields: [literal, cloneSpannedString(spannedString)]}
    } else if (expr.type == "Match") {
        const [expr1, xs, span] = expr.fields
        return {type: "Match", fields: [cloneExpr(expr1), xs.map(([spannedMatch, expr]) => [cloneSpannedMatchPattern(spannedMatch), cloneExpr(expr)]), span]}
    } else if (expr.type == "NewRef") {
        const [expr1, span] = expr.fields
        return {type: "NewRef", fields: [expr1, span]}
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

const patternToString = (pat: MatchPattern) => {
    if(pat.type == "Case") return `${pat.val[0]} ${pat.val[1]}`
    else return pat.val
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
        return "let _ = _ in " + exprToString(bodyExpr)
    } else if (expr.type == "If") {
        const [[expr1, _], expr2, expr3] = expr.fields
        return `if ${expr1} then ${expr2} else ${expr3}`
    } else if (expr.type == "Let") {
        const [[id, valExpr], expr1] = expr.fields
        return `let ${id} = ${exprToString(valExpr)} in ${exprToString(expr1)}`
    } else if (expr.type == "LetRec") {
        const [varDefinitions, expr1] = expr.fields
        return "letrec " + varDefinitions.map(([id, val]) => `${id} = ${exprToString(val)}`).join(", ") + " in " + exprToString(expr1)
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

export type { 
    Literal, Op, OpType, VarDefinition, 
    LetPattern, MatchPattern, Expr, 
    Readability, TopLevel 
}
export { cloneExpr, exprToString }