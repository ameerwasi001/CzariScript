import { Span, Spanned, SpannedError, SpanMaker, SpanManager } from "./spans.ts"
import { assert_array_eq } from "./utils.ts"
import { Literal, Op, OpType, Token, keywords } from "./token.ts"

type PartSpan = number

const LOWER_ALPHAS = new Set([
    'a', 'b', 'c', 'd', 'e', 'f', 
    'g', 'h', 'i', 'j', 'k', 'l', 
    'm', 'n', 'o', 'p', 'q', 'r', 
    's', 't', 'u', 'v', 'w', 'x', 
    'y', 'z'
])

const UPPER_ALPHAS = new Set([
    'A', 'B', 'C', 'D', 'E', 'F', 
    'G', 'H', 'I', 'J', 'K', 'L', 
    'M', 'N', 'O', 'P', 'Q', 'R', 
    'S', 'T', 'U', 'V', 'W', 'X', 
    'Y', 'Z'
])

const ALPHAS = new Set([...LOWER_ALPHAS, ...UPPER_ALPHAS])

const DIGITS = new Set(['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'])

class Lexer {

    index: number
    source: string
    currentChar: string
    spanManager: SpanManager
    spanMaker: SpanMaker
    rules: [string, (self: Lexer) => boolean, (self: Lexer) => Token | null][] = [
        [
            "FloatAdd",
            (self: Lexer) => self.matches(".+"), 
            (self: Lexer) => {
                const a = self.index
                self.advance()
                return self.advanceValue(
                    {type: "Op", op: "Add", opType: "FloatOp", span: self.span(a, this.index)}
                )
            }
        ],
        [
            "FloatSub",
            (self: Lexer) => self.matches(".-"), 
            (self: Lexer) => {
                const a = self.index
                self.advance()
                return self.advanceValue(
                    {type: "Op", op: "Sub", opType: "FloatOp", span: self.span(a, this.index)}
                )
            }
        ],
        [
            "FloatMult",
            (self: Lexer) => self.matches(".*"), 
            (self: Lexer) => {
                const a = self.index
                self.advance()
                return self.advanceValue(
                    {type: "Op", op: "Mult", opType: "FloatOp", span: self.span(a, this.index)}
                )
            }
        ],
        [
            "FloatDiv",
            (self: Lexer) => self.matches("./"), 
            (self: Lexer) => {
                const a = self.index
                self.advance()
                return self.advanceValue(
                    {type: "Op", op: "Div", opType: "FloatOp", span: self.span(a, this.index)}
                )
            }
        ],
        [
            "Ampersand",
            (self: Lexer) => self.matches("&"), 
            (self: Lexer) => self.advanceValue(
                {type: "Op", op: "Add", opType: "StrOp", span: self.spanSingle()}
            )
        ],
        [
            "Arrow",
            (self: Lexer) => self.matches("->"), 
            (self: Lexer) => {
                const a = self.index
                self.advance()
                return self.advanceValue({type: "Arrow", span: self.span(a, self.index)})
            }
        ],
        [
            "Assign",
            (self: Lexer) => {
                const index = self.index
                const char = self.currentChar
                if(char != "^") {
                    this.revert(index)
                    return false
                }
                self.advance()
                while(self.currentChar == " " || self.currentChar == "\n" || self.currentChar == "\t") self.advance()
                if(self.currentChar != "=") {
                    this.revert(index)
                    return false
                }
                this.revert(index)
                return true
            },
            (self: Lexer) => {
                const a = self.index
                self.advance()
                while(self.currentChar == " " || self.currentChar == "\n" || self.currentChar == "\t") self.advance()
                self.advance()
                return self.advanceValue({type: "Assign", span: self.span(a, self.index)})
            }
        ],
        [
            "Circumflex",
            (self: Lexer) => self.matches("^"), 
            (self: Lexer) => self.advanceValue(
                {type: "Circumflex", span: self.spanSingle()
            })
        ],
        [
            "Gte",
            (self: Lexer) => self.matches(">="), 
            (self: Lexer) => {
                const a = self.index
                self.advance()
                return self.advanceValue({type: "Op", op: "Gte", opType: "IntOrFloatCmp", span: self.span(a, self.index)})
            }
        ],
        [
            "Lte",
            (self: Lexer) => self.matches("<="), 
            (self: Lexer) => {
                const a = self.index
                self.advance()
                return self.advanceValue({type: "Op", op: "Lte", opType: "IntOrFloatCmp", span: self.span(a, self.index)})
            }
        ],
        [
            "Lt",
            (self: Lexer) => self.matches("<"), 
            (self: Lexer) => self.advanceValue(
                {type: "Op", op: "Lt", opType: "IntOrFloatCmp", span: self.spanSingle()}
            )
        ],
        [
            "Gt",
            (self: Lexer) => self.matches(">"), 
            (self: Lexer) => self.advanceValue(
                {type: "Op", op: "Gt", opType: "IntOrFloatCmp", span: self.spanSingle()}
            )
        ],
        [
            "Neq",
            (self: Lexer) => self.matches("!="), 
            (self: Lexer) => {
                const a = self.index
                self.advance()
                return self.advanceValue({type: "Op", op: "Neq", opType: "AnyCmp", span: self.span(a, self.index)})
            }
        ],
        [
            "Add",
            (self: Lexer) => self.matches("+"), 
            (self: Lexer) => self.advanceValue(
                {type: "Op", op: "Add", opType: "IntOp", span: self.spanSingle()}
            )
        ],
        [
            "Sub",
            (self: Lexer) => self.matches("-"), 
            (self: Lexer) => self.advanceValue(
                {type: "Op", op: "Sub", opType: "IntOp", span: self.spanSingle()}
            )
        ],
        [
            "Mult",
            (self: Lexer) => self.matches("*"), 
            (self: Lexer) => self.advanceValue(
                {type: "Op", op: "Mult", opType: "IntOp", span: self.spanSingle()}
            )
        ],
        [
            "Div",
            (self: Lexer) => self.matches("/"), 
            (self: Lexer) => self.advanceValue(
                {type: "Op", op: "Div", opType: "IntOp", span: self.spanSingle()}
            )
        ],
        [
            "OpenParen",
            (self: Lexer) => self.matches("("), 
            (self: Lexer) => self.advanceValue(
                {type: "OpenParen", span: self.spanSingle()}
            )
        ],
        [
            "CloseParen",
            (self: Lexer) => self.matches(")"), 
            (self: Lexer) => self.advanceValue(
                {type: "CloseParen", span: self.spanSingle()}
            )
        ],
        [
            "OpneBrace",
            (self: Lexer) => self.matches("{"), 
            (self: Lexer) => self.advanceValue(
                {type: "OpenBrace", span: self.spanSingle()}
            )
        ],
        [
            "CloseBrace",
            (self: Lexer) => self.matches("}"), 
            (self: Lexer) => self.advanceValue(
                {type: "CloseBrace", span: self.spanSingle()}
            )
        ],
        [
            "Comma",
            (self: Lexer) => self.matches(","), 
            (self: Lexer) => self.advanceValue(
                {type: "Comma", span: self.spanSingle()}
            )
        ],
        [
            "Lambda",
            (self: Lexer) => self.matches("\\"), 
            (self: Lexer) => self.advanceValue(
                {type: "Lambda", span: self.spanSingle()}
            )
        ],
        [
            "Whitespace",
            (self: Lexer) => self.matches(" ") || self.matches("\r") || self.matches("\n"), 
            (self: Lexer) => self.advanceValue(null)
        ],
        [
            "Newline",
            (self: Lexer) => self.matches(";"), 
            (self: Lexer) => self.advanceValue({type: "Newline", span: self.spanSingle()})
        ],
        [
            "String",
            (self: Lexer) => self.matches("\""),
            (self: Lexer) => {
                let value = ""
                const a = self.index
                self.advance()
                while(self.currentChar != "\"") {
                    value += self.currentChar
                    self.advance()
                }
                self.advance()
                return {type: "Literal", literalType: "Str", value, span: self.span(a, self.index)}
            }
        ],
        [
            "Equals",
            (self: Lexer) => self.matches("="),
            (self: Lexer) => self.advanceValue(
                {type: "Op", op: "Eq", opType: "AnyCmp", span: self.spanSingle()}
            )
        ],
        [
            "At",
            (self: Lexer) => self.matches("@"),
            (self: Lexer) => self.advanceValue(
                {type: "At", span: self.spanSingle()}
            )
        ],
        [
            "Colon",
            (self: Lexer) => self.matches(":"),
            (self: Lexer) => self.advanceValue(
                {type: "Colon", span: self.spanSingle()}
            )
        ],
        [
            "Dot",
            (self: Lexer) => self.matches("."),
            (self: Lexer) => self.advanceValue(
                {type: "Dot", span: self.spanSingle()}
            )
        ],
        [
            "Or",
            (self: Lexer) => self.matches("|"),
            (self: Lexer) => self.advanceValue(
                {type: "Or", span: self.spanSingle()}
            )
        ],
        [
            "Number",
            (self: Lexer) => DIGITS.has(self.currentChar), 
            (self: Lexer) => {
                const starter = this.index
                let str = ""
                let dotCount = 0
                while(DIGITS.has(self.currentChar) || self.currentChar == ".") {
                    if(dotCount > 1) break
                    if(self.currentChar == ".") dotCount++
                    str += self.currentChar
                    self.advance()
                }
                if(dotCount > 0) 
                    return {type: "Literal", literalType: "Float", value: str, span: self.span(starter, self.index)}
                else return {type: "Literal", literalType: "Int", value: str, span: self.span(starter, self.index)}
            }
        ],
        [
            "Ident",
            (self: Lexer) => LOWER_ALPHAS.has(self.currentChar), 
            (self: Lexer) => {
                const starter = this.index
                let str = ""
                while(ALPHAS.has(self.currentChar) || DIGITS.has(self.currentChar) || self.currentChar == "'")  {
                    str += self.currentChar
                    self.advance()
                }
                const span = self.span(starter, self.index)
                if (str == "null") return {type: "Literal", literalType: "Null", value: "null", span}
                else if (str == "true" || str == "false") return {type: "Literal", literalType: "Bool", value: str, span}
                return {type: keywords.has(str) ? "Keyword" : "Variable", value: str, span}
            }
        ],
        [
            "Ctor",
            (self: Lexer) => UPPER_ALPHAS.has(self.currentChar), 
            (self: Lexer) => {
                const starter = this.index
                let str = ""
                while(ALPHAS.has(self.currentChar) || DIGITS.has(self.currentChar) || self.currentChar == "'" || self.currentChar == "_")  {
                    str += self.currentChar
                    self.advance()
                }
                const span = self.span(starter, self.index)
                return {type: "Constructor", value: str, span}
            }
        ],
    ]

    constructor(source: string){
        this.index = -1
        this.source = source
        this.currentChar = ""
        this.spanManager = new SpanManager()
        this.spanMaker = new SpanMaker(this.spanManager, 0, new Map())
        this.spanManager.addSource(source)
        this.advance()
    }

    advanceValue<T>(x: T): T {
        this.index++
        this.currentChar = this.index < this.source.length ? this.source[this.index] : ""
        return x
    }

    advance() {
        this.index++
        this.currentChar = this.index < this.source.length ? this.source[this.index] : ""
    }

    revert(num: number){
        this.index = num;
        this.currentChar = this.index < this.source.length ? this.source[this.index] : "";
    }

    span(a: PartSpan, b: PartSpan): Span {
        return this.spanMaker.span(a, b)
    }

    spanSingle(): Span {
        return this.spanMaker.span(this.index, this.index)
    }

    matches(matching: string): boolean {
        var frozenIndex = this.index;
        var matchIndex = 0;
        var matchLength = frozenIndex + matching.length
        while(this.index < matchLength)
        {
            if(matching[matchIndex] == this.currentChar) this.advance()
            else
            {
                this.revert(frozenIndex)
                return false
            }
            matchIndex += 1
        }
        this.revert(frozenIndex)
        return true
    }

    lex(): Token[] {
        const toks: Token[] = []
        const rules = this.rules
        while(true) {
            let matched = false
            
            for(const [_, cond, rule] of rules) {
                if (cond(this)) {
                    const matchedPart = rule(this)
                    if (matchedPart != null) toks.push(matchedPart)
                    matched = true
                    break
                }
                if (this.currentChar == "") break
            }
            if (!matched) throw SpannedError.new1(
                `Expected a token, found '${this.source[this.index]}'`,
                this.spanMaker.span(this.index, this.index)
            )
            if(this.currentChar == "") break
        }
        const lastSpan = toks[toks.length - 1].span
        toks.push({type: "Eof", span: lastSpan})
        return toks
    }
}

export { Lexer }