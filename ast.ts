import { Span, Spanned, SpannedError } from "./spans.ts"

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

export type { Literal, Op, OpType, VarDefinition, LetPattern, MatchPattern, Expr, Readability, TopLevel }