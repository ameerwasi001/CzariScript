import { Span, Spanned, SpanMaker, SpanManager } from "./spans.ts"
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
    rules: [(self: Lexer) => boolean, (self: Lexer) => Token | null][] = [
        [
            (self: Lexer) => self.matches("&"), 
            (self: Lexer) => self.advanceValue(
                {type: "Op", op: "Add", opType: "StrOp", span: self.spanSingle()}
            )
        ],
        [
            (self: Lexer) => self.matches("->"), 
            (self: Lexer) => {
                const a = self.index
                self.advance()
                return self.advanceValue({type: "Arrow", span: self.span(a, self.index)})
            }
        ],
        [
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
            (self: Lexer) => self.matches("^"), 
            (self: Lexer) => self.advanceValue(
                {type: "Circumflex", span: self.spanSingle()
            })
        ],
        [
            (self: Lexer) => self.matches(">="), 
            (self: Lexer) => {
                const a = self.index
                self.advance()
                return self.advanceValue({type: "Op", op: "Gte", opType: "IntOrFloatCmp", span: self.span(a, self.index)})
            }
        ],
        [
            (self: Lexer) => self.matches("<="), 
            (self: Lexer) => {
                const a = self.index
                self.advance()
                return self.advanceValue({type: "Op", op: "Lte", opType: "IntOrFloatCmp", span: self.span(a, self.index)})
            }
        ],
        [
            (self: Lexer) => self.matches("<"), 
            (self: Lexer) => self.advanceValue(
                {type: "Op", op: "Lt", opType: "IntOrFloatCmp", span: self.spanSingle()}
            )
        ],
        [
            (self: Lexer) => self.matches(">"), 
            (self: Lexer) => self.advanceValue(
                {type: "Op", op: "Gt", opType: "IntOrFloatCmp", span: self.spanSingle()}
            )
        ],
        [
            (self: Lexer) => self.matches("!="), 
            (self: Lexer) => {
                const a = self.index
                self.advance()
                return self.advanceValue({type: "Op", op: "Neq", opType: "AnyCmp", span: self.span(a, self.index)})
            }
        ],
        [
            (self: Lexer) => self.matches("+"), 
            (self: Lexer) => self.advanceValue(
                {type: "Op", op: "Add", opType: "IntOp", span: self.spanSingle()}
            )
        ],
        [
            (self: Lexer) => self.matches("-"), 
            (self: Lexer) => self.advanceValue(
                {type: "Op", op: "Sub", opType: "IntOp", span: self.spanSingle()}
            )
        ],
        [
            (self: Lexer) => self.matches("*"), 
            (self: Lexer) => self.advanceValue(
                {type: "Op", op: "Mult", opType: "IntOp", span: self.spanSingle()}
            )
        ],
        [
            (self: Lexer) => self.matches("/"), 
            (self: Lexer) => self.advanceValue(
                {type: "Op", op: "Div", opType: "IntOp", span: self.spanSingle()}
            )
        ],
        [
            (self: Lexer) => self.matches("("), 
            (self: Lexer) => self.advanceValue(
                {type: "OpenParen", span: self.spanSingle()}
            )
        ],
        [
            (self: Lexer) => self.matches(")"), 
            (self: Lexer) => self.advanceValue(
                {type: "CloseParen", span: self.spanSingle()}
            )
        ],
        [
            (self: Lexer) => self.matches("{"), 
            (self: Lexer) => self.advanceValue(
                {type: "OpenBrace", span: self.spanSingle()}
            )
        ],
        [
            (self: Lexer) => self.matches("}"), 
            (self: Lexer) => self.advanceValue(
                {type: "CloseBrace", span: self.spanSingle()}
            )
        ],
        [
            (self: Lexer) => self.matches(","), 
            (self: Lexer) => self.advanceValue(
                {type: "Comma", span: self.spanSingle()}
            )
        ],
        [
            (self: Lexer) => self.matches(".+"), 
            (self: Lexer) => self.advanceValue(
                {type: "Op", op: "Add", opType: "FloatOp", span: self.spanSingle()}
            )
        ],
        [
            (self: Lexer) => self.matches(".-"), 
            (self: Lexer) => self.advanceValue(
                {type: "Op", op: "Sub", opType: "FloatOp", span: self.spanSingle()}
            )
        ],
        [
            (self: Lexer) => self.matches(".*"), 
            (self: Lexer) => self.advanceValue(
                {type: "Op", op: "Mult", opType: "FloatOp", span: self.spanSingle()}
            )
        ],
        [
            (self: Lexer) => self.matches("./"), 
            (self: Lexer) => self.advanceValue(
                {type: "Op", op: "Div", opType: "FloatOp", span: self.spanSingle()}
            )
        ],
        [
            (self: Lexer) => self.matches("\\"), 
            (self: Lexer) => self.advanceValue(
                {type: "Lambda", span: self.spanSingle()}
            )
        ],
        [
            (self: Lexer) => self.matches(" ") || self.matches("\r") || self.matches("\n"), 
            (self: Lexer) => self.advanceValue(null)
        ],
        [
            (self: Lexer) => self.matches(";"), 
            (self: Lexer) => self.advanceValue({type: "Newline", span: self.spanSingle()})
        ],
        [
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
            (self: Lexer) => self.matches("="),
            (self: Lexer) => self.advanceValue(
                {type: "Op", op: "Eq", opType: "AnyCmp", span: self.spanSingle()}
            )
        ],
        [
            (self: Lexer) => self.matches("@"),
            (self: Lexer) => self.advanceValue(
                {type: "At", span: self.spanSingle()}
            )
        ],
        [
            (self: Lexer) => self.matches(":"),
            (self: Lexer) => self.advanceValue(
                {type: "Colon", span: self.spanSingle()}
            )
        ],
        [
            (self: Lexer) => self.matches("."),
            (self: Lexer) => self.advanceValue(
                {type: "Dot", span: self.spanSingle()}
            )
        ],
        [
            (self: Lexer) => self.matches("|"),
            (self: Lexer) => self.advanceValue(
                {type: "Or", span: self.spanSingle()}
            )
        ],
        [
            (self: Lexer) => DIGITS.has(self.currentChar), 
            (self: Lexer) => {
                const starter = this.index
                let str = ""
                while(DIGITS.has(self.currentChar)) {
                    str += self.currentChar
                    self.advance()
                }
                return {type: "Literal", literalType: "Int", value: str, span: self.span(starter, self.index)}
            }
        ],
        [
            (self: Lexer) => LOWER_ALPHAS.has(self.currentChar), 
            (self: Lexer) => {
                const starter = this.index
                let str = ""
                while(ALPHAS.has(self.currentChar) || DIGITS.has(self.currentChar) || self.currentChar == "'")  {
                    str += self.currentChar
                    self.advance()
                }
                const span = self.span(starter, self.index)
                if (str == "null") return {type: "Literal", literalType: "Null", value: "", span}
                else if (str == "true" || str == "false") return {type: "Literal", literalType: "Bool", value: str, span}
                return {type: keywords.has(str) ? "Keyword" : "Variable", value: str, span}
            }
        ],
        [
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
        while(true) {
            let matched = false
            for(const [cond, rule] of this.rules) {
                if (cond(this)) {
                    const matchedPart = rule(this)
                    if (matchedPart != null) toks.push(matchedPart)
                    matched = true
                }
                if (this.currentChar == "") break
            }
            if (!matched) throw `Expected a token, found '${this.source[this.index]}'\n`
            if(this.currentChar == "") break
        }
        const lastSpan = toks[toks.length - 1].span
        toks.push({type: "Eof", span: lastSpan})
        return toks
    }
}

// const lexer = new Lexer(`
// let none = null;
// let t = true;
// let f = \\x -> x*(22+x)/2.+3;
// let moreThan10 = \\n -> n > 10;
// let s = if t then "Hello, I am Ameer" else "";
// let struct = {a=1, b=2};
// `)
// const toks = lexer.lex()

// console.log(toks)

export { Lexer }