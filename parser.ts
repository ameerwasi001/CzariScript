import { Expr } from "./ast.ts"
import { Token, Op } from "./token.ts"
import { Spanned, SpannedError } from "./spans.ts"

class Parser {
    index: number
    currentTok: Token
    toks: Token[]

    constructor(toks: Token[]){
        this.index = -1
        this.toks = toks
        this.advance()
        this.currentTok = this.index > this.toks.length ? this.toks[this.toks.length - 1] : this.toks[this.index]
    }

    advance(){
        this.index++
        this.currentTok = this.index > this.toks.length ? this.toks[this.toks.length - 1] : this.toks[this.index]
    }

    binOp(func_a: () => Spanned<Expr>, ops: Set<Op>, func_b: () => Spanned<Expr>) {
        let left = func_a()
        while (this.currentTok.type == "Op" && ops.has(this.currentTok.op)){
            const opTok = this.currentTok
            this.advance()
            const right = func_b()
            left = [{type: "BinOp", fields: [left, right, opTok.opType, opTok.op, opTok.span]}, opTok.span]
        }
        return left
    }

    parse(){
        const expr = this.expr()
        if(this.currentTok.type != "Eof") {
            throw SpannedError.new1(
                "Syntax Error: Expected EOF",
                this.currentTok.span
            )
        }
        return expr
    }

    expr(){
        return this.binOp(() => this.term(), new Set(["Add", "Sub"]), () => this.term())
    }

    term(){
        return this.binOp(() => this.factor(), new Set(["Mult", "Div"]), () => this.factor())
    }

    factor(): Spanned<Expr> {
        const tok = this.currentTok
        if (tok.type == "Literal") {
            this.advance()
            return [
                {type: "Literal", fields: [tok.literalType, [tok.value, tok.span]]},
                tok.span
            ]
        } else if (tok.type == "Keyword" && tok.value == "if") {
            this.advance()
            const condExpr = this.expr()
            if(this.currentTok.type == "Keyword" && this.currentTok.value != "then") throw SpannedError.new1(
                `Syntax Error: Unexpected token ${tok.type}, expected 'then'`,
                this.currentTok.span
            )
            this.advance()
            const thenExpr = this.expr()
            if(this.currentTok.type == "Keyword" && this.currentTok.value != "else") throw SpannedError.new1(
                `Syntax Error: Unexpected token ${tok.type}, expected 'else'`,
                this.currentTok.span
            )
            this.advance()
            const elseExpr = this.expr()
            return [{type: "If", fields: [condExpr, thenExpr[0], elseExpr[0]]}, tok.span]
        } else if (tok.type == "OpenParen") {
            this.advance()
            const expr = this.expr()
            if(this.currentTok.type != "CloseParen") throw SpannedError.new1(
                `Syntax Error: Unexpected token ${this.currentTok.type}, expected ')'`,
                this.currentTok.span
            )
            this.advance()
            return expr
        }
        throw SpannedError.new1(`Syntax Error: Unexpected token ${tok.type}`, tok.span)
    }
}

export { Parser }