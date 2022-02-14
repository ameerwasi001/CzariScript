import { Span, Spanned, SpanMaker, SpanManager } from "./spans.ts"
import { assert_array_eq } from "./utils.ts"
import { Literal, Op, OpType, Token } from "./token.ts"

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
    rules: [(self: Lexer) => boolean, (self: Lexer) => Token][] = [
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
                while(LOWER_ALPHAS.has(self.currentChar)) {
                    str += self.currentChar
                    self.advance()
                }
                return {type: "Variable", value: str, span: self.span(starter, self.index)}
            }
        ]
    ]

    constructor(source: string){
        this.index = -1
        this.source = source
        this.currentChar = ""
        this.spanManager = new SpanManager()
        this.spanMaker = new SpanMaker(this.spanManager, 0, new Map())
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
                    toks.push(rule(this))
                    matched = true
                }
                if (this.currentChar == "") break
            }
            if (!matched) break
            if(this.currentChar == "") break
        }
        return toks
    }
}

const lexer = new Lexer("x*(22+x)/2")
const toks = lexer.lex()

console.log(toks)

export { Lexer }