import { Expr } from "./ast.ts"
import { Token, Op } from "./token.ts"
import { Span, Spanned, SpannedError } from "./spans.ts"
import { TopLevel } from "./ast.ts"

const buildCall = (atoms: Spanned<Expr>[]) => {
    if (atoms[atoms.length-1]==undefined) throw "Impossible!"
    if (atoms[0]==undefined) throw "Impossible!"
    if (atoms[1]==undefined) throw "Impossible!"
    let call: Spanned<Expr> = [{type: "Call", fields: [atoms[0][0], atoms[1][0], atoms[0][1]]}, atoms[0][1]]
    let i = 2
    while(i < atoms.length) {
        call = [{type: "Call", fields: [call[0], atoms[i][0], atoms[i][1]]}, atoms[i][1]]
        i++
    }
    return call
}

const makeFunc = (ids: [string, Span][], expr: Spanned<Expr>): Spanned<Expr> => {
    let func = expr
    for(const [id, span] of ids.slice().reverse()){
        func = [{type: "FuncDef", fields: [[{type: "Var", val: id}, func[0]], span]}, span]
    }
    return func
}

const makeAccess = (ids: [string, Span][], expr: Spanned<Expr>) => {
    let access = expr
    for(const [id, span] of ids){
        access = [{type: "FieldAccess", fields: [access[0], id, span]}, span]
    }
    return access
}

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

    revert(n: number){
        this.index = n
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

    parseSeperated<A>(sep: string, start: string | null, end: string, parser: () => A){
        if(start != null && this.currentTok.type != start) throw SpannedError.new1(
            `Syntax Error: Unexpected token ${this.currentTok.type}, expected 'then'`,
            this.currentTok.span
        )
        if(start != null) this.advance()
        const ls: A[] = []
        if(this.currentTok.type == end) 
        {
            this.advance();
            return ls;
        }
        ls.push(parser())
        while(this.currentTok.type == sep)
        {
            this.advance();
            if(this.currentTok.type == end) break
            ls.push(parser());
        }
        if(this.currentTok.type != end) throw SpannedError.new1(
            `Expected an 'end' token, got ${this.currentTok.type}`,
            this.currentTok.span
        )
        this.advance()
        return ls
    }

    parseRecord(): Spanned<Expr> {
        const span = this.currentTok.span
        const fields = this.parseSeperated(
            "Comma",
            "OpenBrace",
            "CloseBrace",
            (): [Spanned<string>, Expr] => {
                const tok = this.currentTok
                if(tok.type != "Variable") throw SpannedError.new1(
                    `Expected identifier, got ${this.currentTok.type}`,
                    this.currentTok.span
                )
                this.advance()
                if(this.currentTok.type != "Colon") throw SpannedError.new1(
                    `Expected ':', got ${this.currentTok.type}`,
                    this.currentTok.span
                )
                this.advance()
                const expr = this.expr()
                return [[tok.value, tok.span], expr[0]]
            }
        )
        return [{type: "Record", fields: [null, fields, span]}, span]
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

    parseTopLevel(): TopLevel[] {
        const exprs: ({type: "Left", ident: string, val: Expr}|{type: "Right", val: Expr})[] = this.parseSeperated(
            "Newline", 
            null, 
            "Eof", 
            () => {
                const tok = this.currentTok
                if(tok.type == "Keyword" && tok.value == "let") {
                    this.advance()
                    const tok = this.currentTok
                    if(tok.type != "Variable") throw SpannedError.new1(
                        `Expected identifier, got ${this.currentTok.type}`,
                        this.currentTok.span
                    )
                    const ident = tok.value
                    this.advance()
                    if(this.currentTok.type != "Op") throw SpannedError.new1(
                        `Expected '=', got ${this.currentTok.type}`,
                        this.currentTok.span
                    )
                    if(this.currentTok.op != "Eq") throw SpannedError.new1(
                        `Expected '=', got ${this.currentTok.type}`,
                        this.currentTok.span
                    )
                    this.advance()
                    const expr = this.expr()
                    return {type: "Left", ident, val: expr[0]}
                } else return {type: "Right", val: this.expr()[0]}
            }
        )

        const defs: [string, Expr][] = []
        const evals: Expr[] = []
        for(const expr of exprs) {
            if(expr.type == "Left") defs.push([expr.ident, expr.val])
            else evals.push(expr.val)
        }
        const expressions: TopLevel[] = evals.map(val => { return {type: "Expr", val} })
        const definitions: TopLevel = {type: "LetRecDef", val: defs}
        if(definitions.type == "LetRecDef" && definitions.val.length > 0) {
            const finals: TopLevel[] = []
            finals.push(definitions)
            for(const e of expressions) finals.push(e)
            return finals
        }
        return expressions
    }

    expr(){
        return this.binOp(() => this.arithExpr(), new Set(["Lt", "Lte", "Gt", "Gte", "Eq", "Neq"]), () => this.arithExpr())
    }

    arithExpr(){
        return this.binOp(() => this.term(), new Set(["Add", "Sub"]), () => this.term())
    }

    term(){
        return this.binOp(() => this.factor(), new Set(["Mult", "Div"]), () => this.factor())
    }

    factor(): Spanned<Expr> {
        const atoms = [this.access()]
        while(true){
            const index = this.index
            try {
                atoms.push(this.atom())
            } catch(err) {
                if (!(err instanceof SpannedError)) throw err
                this.revert(index)
                break
            }
        }
        if(atoms.length < 2) return atoms[0]
        return buildCall(atoms)
    }

    access(): Spanned<Expr> {
        const accesses: [string, Span][] = []
        const atom = this.atom()
        let tok = this.currentTok
        while(tok.type == "Dot"){
            this.advance()
            if(this.currentTok.type != "Variable") throw SpannedError.new1(
                `Syntax Error: Unexpected token ${tok.type}, expected Identifier`,
                this.currentTok.span
            )
            accesses.push([this.currentTok.value, this.currentTok.span])
            this.advance()
            tok = this.currentTok
        }
        if(accesses.length == 0) return atom
        return makeAccess(accesses, atom)
    }

    atom(): Spanned<Expr> {
        const tok = this.currentTok
        if (tok.type == "Literal") {
            this.advance()
            return [
                {type: "Literal", fields: [tok.literalType, [tok.value, tok.span]]},
                tok.span
            ]
        } else if (tok.type == "Variable") {
            this.advance()
            return [
                {type: "Variable", field: [tok.value, tok.span]}, 
                tok.span
            ]
        } else if (tok.type == "Lambda"){
            const idents: [string, Span][] = []
            this.advance()
            let currTok = this.currentTok
            if(currTok.type != "Variable") throw SpannedError.new1(
                `Syntax Error: Unexpected token ${tok.type}, expected an IDENTIFIER`,
                this.currentTok.span
            )
            while(currTok.type == "Variable") {
                idents.push([currTok.value, currTok.span])
                this.advance()
                currTok = this.currentTok
            }
            if(this.currentTok.type != "Arrow") throw SpannedError.new1(
                `Syntax Error: Unexpected token ${tok.type}, expected an -> token`,
                this.currentTok.span
            )
            this.advance()
            const expr = this.expr()
            if (idents.length == 1) return [
                {type: "FuncDef", fields: [[{type: "Var", val: idents[0][0]}, expr[0]], this.currentTok.span]}, 
                this.currentTok.span
            ]
            return makeFunc(idents, expr)
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
        } else if(tok.type == "OpenBrace") return this.parseRecord()
        else throw SpannedError.new1(`Syntax Error: Unexpected token ${tok.type}`, tok.span)
    }
}

export { Parser }