import { Span } from "./spans.ts"

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

type Token = 
    {type: "Op", op: Op, opType: OpType, span: Span}
    | {type: "Literal", literalType: Literal, value: string, span: Span}
    | {type: "Variable", value: string, span: Span}
    | {type: "OpenParen", span: Span}
    | {type: "CloseParen", span: Span}

export type { Token, Literal, Op, OpType }