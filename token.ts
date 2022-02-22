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
    | {type: "Constructor", value: string, span: Span}
    | {type: "Keyword", value: string, span: Span}
    | {type: "Newline", span: Span}
    | {type: "Colon", span: Span}
    | {type: "Dot", span: Span}
    | {type: "Lambda", span: Span}
    | {type: "Arrow", span: Span}
    | {type: "OpenParen", span: Span}
    | {type: "CloseParen", span: Span}
    | {type: "OpenBrace", span: Span}
    | {type: "CloseBrace", span: Span}
    | {type: "Comma", span: Span}
    | {type: "Eof", span: Span}

type Keyword = 
    "if"
    | "then"
    | "else"
    | "let"
    | "with"

const keywords = new Set(["if", "then", "else", "let", "with"])

export type { Keyword, Token, Literal, Op, OpType }
export { keywords }