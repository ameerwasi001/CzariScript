import { Expr, VarDefinition } from "./ast.ts"
import { Token, Op } from "./token.ts"
import { Span, Spanned, SpannedError } from "./spans.ts"
import { TopLevel } from "./ast.ts"
import { exprToString, Alias, LetPattern, MatchPattern } from "./ast.ts"
import { intorduceBuiltIns } from "./builtIns.ts"

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

const makeFunc = (ids: [LetPattern, Span][], expr: Spanned<Expr>): Spanned<Expr> => {
    let func = expr
    for(const [id, span] of ids.slice().reverse()){
        func = [{type: "FuncDef", fields: [[id, func[0]], span]}, span]
    }
    return func
}

const makeExprList = <A>(ids: [string, Span][], expr: Spanned<A>, builder: (_1: string, _2: A, _3: Span) => A) => {
    let access = expr
    for(const [id, span] of ids){
        access = [builder(id, access[0], span), span]
    }
    return access
}

const createExprLets = (defs: [string, Expr, Span][], counter: number, span: Span) => {
    const def: [string, Expr, Span]  = 
        defs[defs.length-1] == undefined
            ? [
                `___letVar${counter}`, 
                {type: "Literal", fields: ["Null", ["null", span]]}, 
                span
            ] : defs[defs.length-1]
    let letDef: Spanned<Expr> = [{type: "Variable", field: [def[0], def[2]]}, def[2]]
    for(const [id, expr, span] of defs.slice().reverse()) {
        letDef = [{type: "Let", fields: [[id, expr], letDef[0]]}, span]
    }
    return letDef
}

class Parser {
    index: number
    currentTok: Token
    toks: Token[]

    constructor(toks: Token[]){
        this.index = -1
        this.toks = toks
        this.advance()
        this.currentTok = this.index >= this.toks.length ? 
            {type: "Eof", span: this.toks[this.toks.length-1].span} : 
            this.toks[this.index]
    }

    updateToks() {
        this.currentTok = this.index >= this.toks.length ? 
            {type: "Eof", span: this.toks[this.toks.length-1].span} : 
            this.toks[this.index]
    }

    advance(){
        this.index++
        this.updateToks()
    }

    revert(n: number){
        this.index = n
        this.updateToks()
    }

    introduceBuiltIns() {
        let hasHitCurrentTok = false
        let i = 0
        const [before, after]: [Token[], Token[]] = [[], []]
        for(const tok of this.toks) {
            if(this.index == i) hasHitCurrentTok = true
            if(hasHitCurrentTok) after.push(tok)
            else before.push(tok)
            i += 1
        }
        this.toks = [...before, ...intorduceBuiltIns(after)]
        const index = this.index
        this.advance()
        this.revert(index)
    }

    binOp(
        func_a: () => Spanned<Expr>, 
        ops: Set<Op>, 
        func_b: () => Spanned<Expr>, 
        toks: Set<string> = new Set(),
        build = (_1: Spanned<Expr>, [_, span]: Spanned<Expr>): Spanned<Expr> => {
            return [{type: "Literal", fields: ["Null", ["null", span]]}, span]
        }
    ){
        let left = func_a()
        while ((this.currentTok.type == "Op" && ops.has(this.currentTok.op)) || toks.has(this.currentTok.type)){
            const opTok = this.currentTok
            this.advance()
            const right = func_b()
            if(opTok.type == "Op" && ops.has(opTok.op)) {
                left = [{type: "BinOp", fields: [left, right, opTok.opType, opTok.op, opTok.span]}, opTok.span]
            } else left = build(left, right)
        }
        return left
    }

    beginsPattern(tok: Token | null) {
        const currTok = tok == null ? this.currentTok : tok
        return currTok.type == "Variable" ||
            currTok.type == "OpenBrace" ||
            currTok.type == "OpenParen"
    }

    parseSeperated<A>(
        sep: string, 
        start: string | null, 
        ends: () => boolean, 
        ender: () => void = () => this.advance(),
        parser: () => A, 
        postStart = () => {}
    ){
        if(start != null && this.currentTok.type != start) throw SpannedError.new1(
            `Syntax Error: Unexpected token ${this.currentTok.type}, expected 'then'`,
            this.currentTok.span
        )
        if(start != null) this.advance()
        postStart()
        const ls: A[] = []
        if(ends()){
            ender();
            return ls;
        }
        ls.push(parser())
        while(this.currentTok.type == sep){
            while(this.currentTok.type == sep) {
                this.advance()
            }
            if(ends()) break
            ls.push(parser());
        }
        if(!ends()) throw SpannedError.new1(
            `Expected a sequence ending token, got ${this.currentTok.type}`,
            this.currentTok.span
        )
        ender()
        return ls
    }

    parseLet(): Spanned<Expr> {
        this.advance()
        const tok = this.currentTok
        if(tok.type != "Variable") throw SpannedError.new1(
            `Expected identifer, got ${this.currentTok.type}`,
            this.currentTok.span
        )
        const varName = tok.value
        this.advance()
        const patterns: [LetPattern, Span][] = []
        while(this.beginsPattern(null)) {
            let index = this.index
            try {
                const letPattern = this.parseLetPattern()
                patterns.push(letPattern)
            } catch (err) {
                if(!(err instanceof SpannedError)) throw err
                this.revert(index)
                break
            }
        }
        const tok_ = this.currentTok
        if(tok_.type != "Op") throw SpannedError.new1(
            `Expected =, got ${this.currentTok.type}`,
            this.currentTok.span
        )
        if(tok_.op != "Eq") throw SpannedError.new1(
            `Expected =, got ${tok_.op}`,
            this.currentTok.span
        )
        this.advance()
        const val = this.expr()
        if(this.currentTok.type != "Keyword") throw SpannedError.new1(
            `Expected 'in', got ${this.currentTok.type}`,
            this.currentTok.span
        )
        if(this.currentTok.value != "in") throw SpannedError.new1(
            `Expected 'in', got ${this.currentTok.type}`,
            this.currentTok.span
        )
        this.advance()
        const expr = this.expr()
        const [func, _] = makeFunc(patterns, val)
        return [{type: "Let", fields: [[varName, func], expr[0]]}, this.currentTok.span]
    }

    parseClass(): Spanned<Expr> {
        this.advance()
        const tok = this.currentTok
        if(tok.type != "Variable") throw SpannedError.new1(
            `Expected a variable, got ${this.currentTok.type}`,
            this.currentTok.span
        )
        const patterns: [LetPattern, Span][] = []
        let inheritanceExpr: Expr | null = null
        let objInheritanceExpr: Expr | null = null
        while(this.beginsPattern(null)) {
            const index = this.index
            try {
                const letPattern = this.parseLetPattern()
                patterns.push(letPattern)
            } catch (err) {
                if(!(err instanceof SpannedError)) throw err
                this.revert(index)
                break
            }
        }
        while(this.currentTok.type == "Newline") this.advance()
        const tok_ = this.currentTok
        if(tok_.type == "Keyword" && tok_.value == "with") {
            this.advance()
            inheritanceExpr = this.expr()[0]
            if(this.currentTok.type == "DoubleColon") {
                this.advance()
                objInheritanceExpr = this.expr()[0]
            }
        }
        if(this.currentTok.type != "Keyword") throw SpannedError.new1(
            `Expected 'so', but got ${this.currentTok.type}`,
            this.currentTok.span
        )
        if(this.currentTok.value != "so") throw SpannedError.new1(
            `Expected 'so', but got ${this.currentTok.type}`,
            this.currentTok.span
        )
        this.advance()
        const lvls = this.parseImperative(() => this.currentTok.type == "Keyword" && this.currentTok.value == "end")
        const declStatics: [[string, Span], Expr][] = []
        const defs: [[string, Span], Expr][] = []
        for(const lvl of lvls) {
            if(lvl.type == "Left") defs.push([[lvl.ident, lvl.span], lvl.val])
            else if(lvl.type == "UpRight") declStatics.push([[lvl.ident, lvl.span], lvl.val])
            else throw SpannedError.new1(
                `Unexpected expression, expected definition`,
                lvl.span
            )
        }
        let callNewExpr: Expr | null = null
        if(inheritanceExpr === null) callNewExpr = null
        else if(objInheritanceExpr === null) callNewExpr = {
            type: "Call",
            fields: [
                {type: "FieldAccess", fields: [inheritanceExpr, "new", this.currentTok.span]},
                {type: "Record", fields: [null, [], this.currentTok.span]},
                this.currentTok.span
            ]
        }
        else callNewExpr = objInheritanceExpr
        const objRecord: Spanned<Expr> = [
            {type: "Record", fields: [callNewExpr, defs, this.currentTok.span]},
            this.currentTok.span
        ]
        const statics: [[string, Span], Expr][] = [
            [["new", this.currentTok.span], makeFunc(patterns, objRecord)[0]],
            ...declStatics
        ]
        const classRecordExpr: Spanned<Expr> = [
            {type: "Record", fields: [inheritanceExpr, statics, this.currentTok.span]}, 
            this.currentTok.span
        ]
        return classRecordExpr
    }

    parseRecord(start: string | null, end: string): Spanned<Expr> {
        const span = this.currentTok.span
        let prototype: Expr | null = null
        let n = 0
        const fields = this.parseSeperated(
            "Comma",
            start,
            () => this.currentTok.type == end,
            () => this.advance(),
            (): [Spanned<string>, Expr] => {
                const tok = this.currentTok
                const index = this.index
                if(tok.type == "Variable") {
                    this.advance()
                    if(this.currentTok.type == "Colon") {
                        if(n>0) throw SpannedError.new1(
                            `Cannot have numerically indexed fields mixed with named fields`,
                            this.currentTok.span
                        )
                        this.advance()
                        const expr = this.expr()
                        return [[tok.value, tok.span], expr[0]]
                    } else this.revert(index)
                }
                const [expr, span] = this.expr()
                return [[`${n++}`, span], expr]
            },
            () => {
                const index = this.index
                try {
                    const expr = this.expr()
                    if(this.currentTok.type == "Keyword" && this.currentTok.value == "with") {
                        this.advance()
                        prototype = expr[0]
                        return
                    }
                } catch(err) {
                    if(!(err instanceof SpannedError)) throw err
                }
                this.revert(index)
            }
        )
        return [{type: "Record", fields: [prototype, fields, span]}, span]
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

    parseImperative(ends: () => boolean, ender: () => void = () => this.advance()) {
        const exprs: (
            {type: "Left", ident: string, val: Expr, span: Span}
            |{type: "Right", val: Expr, span: Span}
            | {type: "Up", ident: string, val: string, span: Span}
            | {type: "Down", ident: string, val: string, span: Span}
            | {type: "UpRight", ident: string, val: Expr, span: Span})[] = 
            this.parseSeperated(
                "Newline", 
                null, 
                ends,
                ender,
                () => {
                    const origTok = this.currentTok
                    if(origTok.type == "Keyword" && (origTok.value == "type" || origTok.value == "alias")) {
                        this.advance()
                        const tok = this.currentTok
                        if(tok.type != "Variable") throw SpannedError.new1(
                            `Expected a variable with "\`", got ${tok.type}`,
                            this.currentTok.span
                        )
                        if(!(tok.value.includes("`"))) throw SpannedError.new1(
                            `Expected a variable with "\`", got ${tok.type}`,
                            this.currentTok.span
                        )
                        const ident = tok.value
                        this.advance()
                        const tok$ = this.currentTok
                        if(tok$.type != "Op") throw SpannedError.new1(
                            `Expected an = operator, got ${this.currentTok.type}`,
                            this.currentTok.span
                        )
                        if (tok$.op != "Eq") throw SpannedError.new1(
                            `Expected an = operator, got ${tok$.op}`,
                            this.currentTok.span
                        )
                        this.advance()
                        if(this.currentTok.type != "Constructor") throw SpannedError.new1(
                            `Expected a constructor, got ${this.currentTok.type}`,
                            this.currentTok.span
                        )
                        const span = this.currentTok.span
                        const val = this.currentTok.value
                        this.advance()
                        return {type: origTok.value == "alias" ? "Down" : "Up", ident, val, span}
                    }
                    if(origTok.type == "Variable" || (origTok.type == "Keyword" && origTok.value == "static")) {
                        let staticIdent: string | null = null
                        if(origTok.type == "Keyword" && origTok.value == "static") {
                            staticIdent = ""
                            this.advance()
                        }
                        const patterns: [LetPattern, Span][] = []
                        const index = this.index
                        if(typeof staticIdent == "string") {
                            if(this.currentTok.type !== "Variable") throw SpannedError.new1(
                                `Expected a variable, got ${this.currentTok.type}`,
                                this.currentTok.span
                            )
                            staticIdent = this.currentTok.value
                        }
                        this.advance()
                        while(this.beginsPattern(null)) {
                            try {
                                const letPattern = this.parseLetPattern()
                                patterns.push(letPattern)
                            } catch (err) {
                                if(!(err instanceof SpannedError)) throw err
                                this.revert(index)
                                break
                            }
                        }
                        if(this.currentTok.type == "Op" && this.currentTok.op == "Eq") {
                            this.advance()
                            const expr = this.expr()
                            if(patterns.length > 0) return {
                                type: staticIdent !== null ? "UpRight" : "Left",
                                ident: staticIdent !== null ? staticIdent : origTok.value,
                                val: makeFunc(patterns, expr)[0],
                                span: this.currentTok.span
                            }
                            else return {
                                type: staticIdent !== null ? "UpRight" : "Left",
                                ident: staticIdent !== null ? staticIdent : origTok.value,
                                val: expr[0],
                                span: this.currentTok.span
                            }
                        } else this.revert(index)
                    }
                    return {type: "Right", val: this.expr()[0], span: this.currentTok.span}
                }
            )
        return exprs
    }

    parseDoBlock() {
        this.advance()
        while(this.currentTok.type == "Newline") this.advance()
        const exprs = this.parseImperative(() => this.currentTok.type == "Keyword" && this.currentTok.value == "end")
        const defs: [string, Expr, Span][] = []
        let counter = 0
        for(const expr of exprs) {
            if(expr.type == "Left") defs.push([expr.ident, expr.val, expr.span])
            else if(expr.type == "Up" || expr.type == "Down" || expr.type == "UpRight") throw SpannedError.new1(
                `Unexpected definition of a type ${expr.ident}`,
                expr.span
            )
            else {
                counter += 1
                defs.push([`___letVar${counter}`, expr.val, expr.span])
            }
        }
        return createExprLets(defs, counter, this.currentTok.span)
    }

    parseWhereBlock([expr, span]: Spanned<Expr>): Spanned<Expr> {
        this.advance()
        while(this.currentTok.type == "Newline") this.advance()
        const exprs = this.parseImperative(() => this.currentTok.type == "Keyword" && this.currentTok.value == "end")
        const defs: Spanned<VarDefinition>[] = []
        for(const expr of exprs) {
            if(expr.type == "Right" || expr.type == "Up" || expr.type == "Down") throw SpannedError.new1(
                `Syntax Error: Unexpected expression or type alias, expected a definition`,
                expr.span
            )
            defs.push([[expr.ident, expr.val], expr.span])
        }
        return [{type: "LetRec", fields: [defs, expr]}, span]
    }

    parseImports(): [[string, Span], [string, Expr][]][] {
        let imports: [[string, Span], [string, Expr][]][] = []
        this.parseSeperated(
            "Newline", 
            null, 
            () => {
                const index = this.index
                let ans = true
                while(this.currentTok.type == "Newline") this.advance()
                ans = !(this.currentTok.type == "Keyword" && this.currentTok.value == "import")
                this.revert(index)
                return ans
            },
            () => {},
            () => {
                this.advance()
                const tok = this.currentTok
                const fieldFuncs: ((_: string) => [string, Expr])[] = []
                if(tok.type == "OpenBrace") {
                    const fields_ = this.parseSeperated(
                        "Comma", 
                        "OpenBrace", 
                        () => this.currentTok.type == "CloseBrace",
                        () => this.advance(),
                        (): ((x: string) => [string, Expr]) => {
                            const tok_ = this.currentTok
                            if(tok_.type != "Variable") throw SpannedError.new1(
                                `Expected a variable, got ${tok_.type}`,
                                tok_.span
                            )
                            this.advance()
                            return (x: string) => {
                                return [
                                    `${tok_.value}`, 
                                    {type: "Variable", field: [`${x}__exported__${tok_.value}`, tok_.span]}
                                ]
                            }
                        }
                    )
                    if(this.currentTok.type != "Keyword") throw SpannedError.new1(
                        `Expected 'from', got ${this.currentTok.type}`,
                        this.currentTok.span
                    )
                    if(this.currentTok.value != "from") throw SpannedError.new1(
                        `Expected 'from', got ${this.currentTok.value}`,
                        this.currentTok.span
                    )
                    this.advance()
                    fieldFuncs.push(...fields_)
                }
                const currTok = this.currentTok
                if(currTok.type != "Constructor") throw SpannedError.new1(
                    `Expected a constructor, got ${currTok.type}`,
                    currTok.span
                )
                const fields = fieldFuncs.map(f => f(currTok.value))
                imports.push([[currTok.value, currTok.span], fields])
                this.advance()
            }
        )
        return imports
    }

    parseTopLevel(): [[string, Span][], TopLevel[], Record<string, [string, [Alias, Span]]>] {
        const imports = this.parseImports()
        let tok = this.currentTok
        const exprs = this.parseImperative(
            () => {
                tok = this.currentTok
                return this.currentTok.type == "Eof" || (this.currentTok.type == "Keyword" && this.currentTok.value == "export")
            }
        )
        const defs: [[string, Expr], Span][] = []
        const aliases: [[string, string], [Alias, Span]][] = []
        const evals: Expr[] = []
        for(const [[_, span], importDefs] of imports) {
            for(const def of importDefs) defs.push([def, span])
        }
        for(const expr of exprs) {
            if(expr.type == "Left") defs.push([[expr.ident, expr.val], expr.span])
            else if(expr.type == "Up" || expr.type == "Down") {
                aliases.push([[expr.ident, expr.val], [expr.type == "Down" ? "Module" : "Constructor", expr.span]])
            } else if(expr.type == "UpRight") SpannedError.new1(
                `Unexpected static defintions on the Top Level`,
                this.currentTok.span
            )
            else evals.push(expr.val)
        }
        const expressions: TopLevel[] = evals.map(val => { return {type: "Expr", val} })
        const definitions: TopLevel = {type: "LetRecDef", val: defs}
        const finals: TopLevel[] = []
        finals.push(definitions)
        for(const e of expressions) finals.push(e)
        if(tok.type == "Keyword" && tok.value == "export") {
            let fields: [string, Expr][]
            if(this.currentTok.type == "Op" && this.currentTok.op == "Mult") {
                this.advance()
                fields = defs.map(([[str, _1], span]): [string, Expr] => 
                    [`exported__${str}`, {type: "Variable", field: [str, span]}]
                )
            } else {
                fields = this.parseSeperated(
                    "Comma", 
                    "OpenBrace", 
                    () => this.currentTok.type == "CloseBrace",
                    () => this.advance(),
                    (): [string, Expr] => {
                        const tok = this.currentTok
                        if(tok.type != "Variable") throw SpannedError.new1(
                            `Expected a variable, got ${tok.type}`,
                            tok.span
                        )
                        this.advance()
                        return [`exported__${tok.value}`, {type: "Variable", field: [tok.value, tok.span]}]
                    }
                )
            }

            finals.push(
                ...fields.map(([str, val]): TopLevel => { return {type: "LetDef", val: [str, val]}})
            )
        }
        const aliasMap: Record<string, [string, [Alias, Span]]> = {}
        for(const [[k, v], [alias, span]] of aliases) aliasMap[k] = [v, [alias, span]]
        const importsFiltered = imports.map(([a, _]: [[string, Span], [string, Expr][]]) => a)
        if (definitions.val.length === 0) return [
            importsFiltered, 
            evals.map((x: Expr): TopLevel => { return {type: "Expr", val: x} }), 
            aliasMap
        ]
        else return [importsFiltered, finals, aliasMap]
    }

    parseLetPattern(): Spanned<LetPattern> {
        if(this.currentTok.type == "Variable") {
            const tok = this.currentTok
            this.advance()
            return [{type: "Var", val: tok.value}, tok.span]
        } else if(this.currentTok.type == "OpenBrace" || this.currentTok.type == "OpenParen") {
            const span = this.currentTok.span
            let n = 0
            const closer = this.currentTok.type == "OpenBrace" ? "CloseBrace" : "CloseParen"
            const fields = this.parseSeperated(
                "Comma",
                this.currentTok.type,
                () => this.currentTok.type == closer,
                () => this.advance(),
                (): [Spanned<string>, LetPattern] => {
                    const tok = this.currentTok
                    const index = this.index
                    if(tok.type == "Variable") {
                        this.advance()
                        if(this.currentTok.type == "Colon") {
                            if(n>0) throw SpannedError.new1(
                                `Cannot have numerically indexed fields mixed with named fields`,
                                this.currentTok.span
                            )
                            this.advance()
                            const pat = this.parseLetPattern()
                            return [[tok.value, tok.span], pat[0]]
                        } else this.revert(index)
                    }
                    const [pat, span] = this.parseLetPattern()
                    return [[`${n++}`, span], pat]
                }
            )
            return [{type: "Record", val: fields}, span]
        }
        throw SpannedError.new1(
            "Syntax Error: Expected either a '{' or an identifier",
            this.currentTok.span
        )
    }

    parsePattern(i: number): [Spanned<MatchPattern>, (_: Expr) => Expr] {
        const tok = this.currentTok
        if(tok.type == "Constructor" || (tok.type == "Variable" && tok.value.includes("`"))) {
            const ctor = tok.value
            this.advance()
            if(this.currentTok.type != "Variable" && this.currentTok.type != "OpenBrace") throw SpannedError.new1(
                "Syntax Error: Expected a variable or a '{'",
                this.currentTok.span
            )
            if(this.currentTok.type == "Variable") {
                const ident = this.currentTok.value
                this.advance()
                return [[{type: "Case", val: [ctor, ident]}, tok.span], (a: Expr) => a]
            } else {
                const [pat, span] = this.parseLetPattern()
                const lambdaExpr = (expr: Expr): Expr => { 
                    return {
                        type: "Call", 
                        fields: [
                            {type: "FuncDef", fields: [[pat, expr], span]},
                            {type: "Variable", field: [`___matchVar${i}`, span]},
                            span
                        ]
                    }
                }
                return [[{type: "Case", val: [ctor, `___matchVar${i}`]}, tok.span], lambdaExpr]
            }
        } else if(tok.type == "Variable") {
            const ident = tok.value
            this.advance()
            return [[{type: "Wildcard", val: ident}, tok.span], (a: Expr) => a]
        }
        throw SpannedError.new1(
            `Syntax Error: Expected either an identifier or a constructor, got '${this.currentTok.type}'`,
            this.currentTok.span
        )
    }

    parseMatch(): Spanned<Expr> {
        const tok_ = this.currentTok
        if(tok_.type != "Keyword") throw "Shit!"
        if(tok_.value != "match") throw "Shit!"
        this.advance()
        const [expr, span] = this.expr()
        const tok = this.currentTok
        if(tok.type != "Keyword") throw SpannedError.new1(
            `Syntax Error: Expected 'with', got ${this.currentTok.type}`,
            tok.span
        )
        if(tok.value != "with") throw SpannedError.new1(
            `Syntax Error: Expected 'with', got ${this.currentTok.type}`,
            tok.span
        )
        this.advance()
        while(this.currentTok.type == "Newline") this.advance()
        let i = 0
        const cases = this.parseSeperated(
            "Or",
            null,
            () => this.currentTok.type == "Keyword" && this.currentTok.value == "end",
            () => this.advance(),
            (): [Spanned<MatchPattern>, Expr] => {
                if(this.currentTok.type == "Or") this.advance()
                const [[pat, patSpan], f] = this.parsePattern(i++)
                if(this.currentTok.type != "Arrow") throw SpannedError.new1(
                    `Syntax Error: Expected '->', got ${this.currentTok.type}`,
                    this.currentTok.span
                )
                this.advance()
                const [expr, _] = this.expr()
                return [[pat, patSpan], f(expr)]
            }
        )
        return [{type: "Match", fields: [expr, cases, span]}, span]
    }

    expr(){
        const bin = this.binOp(
            () => this.compExpr(), 
            new Set(), 
            () => this.compExpr(),
            new Set(["Assign"]),
            (left, right) => { return [{type: "RefSet", fields: [left, right[0]]}, right[1]] }
        )
        if(this.currentTok.type == "Keyword" && this.currentTok.value == "where") return this.parseWhereBlock(bin)
        return bin
    }

    compExpr(){
        return this.binOp(
            () => this.arithExpr(), 
            new Set(["Lt", "Lte", "Gt", "Gte", "Eq", "Neq"]), 
            () => this.arithExpr()
        )
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
        let accesses: [string, Span][] = []
        let atom = this.atom()
        let tok = this.currentTok
        while(tok.type == "Dot" || tok.type == "Circumflex"){
            this.advance()
            if(tok.type == "Circumflex") {
                const thingy = makeExprList<Expr>(
                    accesses, 
                    atom, 
                    (id: string, expr: Expr, span: Span): Expr => { return {type: "FieldAccess", fields: [expr, id, span]} }
                )
                atom = [{type: "RefGet", field: thingy}, thingy[1]]
                accesses = []
                tok = this.currentTok
                continue
            }
            if(
                this.currentTok.type != "Variable" && 
                !(this.currentTok.type == "Literal" && this.currentTok.literalType == "Int")
            ) throw SpannedError.new1(
                `Syntax Error: Unexpected token ${this.currentTok.type}, expected Identifier`,
                this.currentTok.span
            )
            accesses.push([this.currentTok.value, this.currentTok.span])
            this.advance()
            tok = this.currentTok
        }
        const expr = accesses.length == 0 ? atom : makeExprList<Expr>(
            accesses, 
            atom, 
            (id: string, expr: Expr, span: Span): Expr => { return {type: "FieldAccess", fields: [expr, id, span]} }
        )
        tok = this.currentTok
        if(tok.type == "Circumflex") {
            const tok = this.currentTok
            this.advance()
            return [{type: "RefGet", field: expr}, tok.span]
        } else if(tok.type == "Colon") {
            this.advance()
            if(this.currentTok.type != "Variable") throw SpannedError.new1(
                `Expected an identifier, got ${this.currentTok.type}`,
                this.currentTok.span
            )
            const tok = this.currentTok
            const field = this.currentTok.value
            this.advance()
            const ident: Expr = {type: "Variable", field: ["___accessObj", tok.span]}
            const access: Expr = {type: "FieldAccess", fields: [ident, field, tok.span]}
            const call: Expr = {type: "Call", fields: [access, ident, tok.span]}
            const whole: Spanned<Expr> = [{type: "Let", fields: [["___accessObj", expr[0]], call]}, expr[1]]
            return whole
        } else return expr
    }

    atom(): Spanned<Expr> {
        const tok = this.currentTok
        let val: Spanned<Expr>
        if (tok.type == "Literal") {
            this.advance()
            val = [
                {type: "Literal", fields: [tok.literalType, [tok.value, tok.span]]},
                tok.span
            ]
        } else if (tok.type == "Lambda"){
            const patterns: [LetPattern, Span][] = []
            this.advance()
            let currTok = this.currentTok
            while(this.beginsPattern(currTok)) {
                patterns.push(this.parseLetPattern())
                currTok = this.currentTok
            }
            if(this.currentTok.type != "Arrow") throw SpannedError.new1(
                `Syntax Error: Unexpected token ${tok.type}, expected a -> token`,
                this.currentTok.span
            )
            this.advance()
            const expr = this.expr()
            if (patterns.length == 1) return [
                {type: "FuncDef", fields: [[patterns[0][0], expr[0]], this.currentTok.span]}, 
                this.currentTok.span
            ]
            val = makeFunc(patterns, expr)
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
            val = [{type: "If", fields: [condExpr, thenExpr[0], elseExpr[0]]}, tok.span]
        } else if (tok.type == "OpenParen") {
            this.advance()
            const tok = this.currentTok
            if(tok.type == "CloseParen") {
                val = [
                    {type: "Record", fields: [null, [], this.currentTok.span]}, 
                    this.currentTok.span
                ]
                this.advance()
            } else {
                const index = this.index
                try {
                    const expr = this.expr()
                    if (this.currentTok.type == "CloseParen") {
                        this.advance()
                        val = expr
                    } else if(this.currentTok.type == "Colon") {
                        this.revert(index)
                        val = this.parseRecord(null, "CloseParen")
                    } else throw SpannedError.new1(
                        `Expected either an expression a record`,
                        this.currentTok.span
                    )
                } catch(err) {
                    if(!(err instanceof SpannedError)) throw err
                    this.revert(index)
                    val = this.parseRecord(null, "CloseParen")
                }
            }
        }
        else if(tok.type == "Constructor" || (tok.type == "Variable" && tok.value.includes("`"))) {
            this.advance()
            const tok_ = this.currentTok
            if(tok_.type != "Arrow") {
                const [expr, _] = this.expr()
                val = [{type: "Case", fields: [[tok.value, tok.span], expr]}, tok.span]
            } else {
                this.advance()
                const moduleName = tok.value
                if(this.currentTok.type != "Variable") throw SpannedError.new1(
                    `Expected a variable, got ${this.currentTok.type}`,
                    this.currentTok.span
                )
                const attr = this.currentTok.value
                this.advance()
                val = [{type: "Variable", field: [`${moduleName}__exported__${attr}`, tok.span]}, tok.span]
            }
        } else if (tok.type == "Variable") {
            this.advance()
            val = [
                {type: "Variable", field: [tok.value, tok.span]}, 
                tok.span
            ]
        } else if(tok.type == "At") {
            this.advance()
            const [expr, span] = this.factor()
            val = [{type: "NewRef", fields: [expr, span]}, span]
        } else if(tok.type == "Dot") {
            const accesses: [string, Span][] = []
            let tok = this.currentTok
            while(tok.type == "Dot") {
                this.advance()
                if(this.currentTok.type != "Variable") throw SpannedError.new1(
                    `Expected a variable, got ${this.currentTok.type}`,
                    this.currentTok.span
                )
                accesses.push([this.currentTok.value, this.currentTok.span])
                this.advance()
                tok = this.currentTok
            }
            const atom: Spanned<Expr> = [{type: "Variable", field: ["x", this.currentTok.span]}, this.currentTok.span]
            const list = makeExprList<Expr>(
                accesses, 
                atom, 
                (id: string, expr: Expr, span: Span): Expr => {
                    return {type: "FieldAccess", fields: [expr, id, span]} 
                }
            )[0]
            const lambda: Expr = {
                    type: "FuncDef", fields: [
                        [{type: "Var", val: "x"}, list], 
                        this.currentTok.span
                    ]
                }
            return [lambda, this.currentTok.span]
        }
        else if(tok.type == "OpenBrace") return this.parseRecord("OpenBrace", "CloseBrace")
        else if(this.currentTok.type == "Keyword" && this.currentTok.value == "let") val = this.parseLet()
        else if(this.currentTok.type == "Keyword" && this.currentTok.value == "do") val = this.parseDoBlock()
        else if(this.currentTok.type == "Keyword" && this.currentTok.value == "match") val = this.parseMatch()
        else if(this.currentTok.type == "Keyword" && this.currentTok.value == "class") val = this.parseClass()
        else throw SpannedError.new1(`Syntax Error: Unexpected token ${tok.type}`, tok.span)

        return val
    }
}

export { Parser }