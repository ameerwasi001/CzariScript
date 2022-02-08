import { Span, Spanned, SpannedError, cloneSpan } from "./spans.ts"

type Literal =
    "Bool"
    | "Float"
    | "Int"
    | "Null"
    | "Str"

type Op =
    "Add"
    | "Sub"
    | "Mult"
    | "Div"
    | "Rem"
    | "Lt"
    | "Lte"
    | "Gt"
    | "Gte"
    | "Eq"
    | "Neq"

type OpType = 
    "IntOp"
    | "FloatOp"
    | "StrOp"
    | "IntOrFloatCmp"
    | "AnyCmp"

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

export type { Literal, Op, OpType, VarDefinition, LetPattern, MatchPattern, Expr, Readability, TopLevel }
export { cloneExpr }