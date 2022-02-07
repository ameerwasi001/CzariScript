import { Span, SpanMaker, SpanManager, SpannedError } from "./spans.ts"
import { Literal, Op, OpType, VarDefinition, LetPattern, MatchPattern, Expr, Readability, TopLevel } from "./ast.ts"
import { VTypeHead, UTypeHead, TypeNode, Value, Use, TypeCheckerCore } from "./core.ts"

type Scheme =
    {type: "Mono", val: Value}
    | {type: "Poly", val: (_: TypeCheckerCore) => Value}

class Bindings {
    m: Record<string, Scheme>
    changes: [string, Scheme | null][]

    constructor() {
        this.m = {}
        this.changes = []
    }

    get(k: string): Scheme | null {
        if (!this.m.hasOwnProperty(k)) return null
        return this.m[k]
    }

    insert_scheme(k: string, v: Scheme) {
        const old = this.m.hasOwnProperty(k) ? this.m[k] : null
        this.m[k] = v;
        this.changes.push([k, old]);
    }

    insert(k: string, value: Value) {
        this.insert_scheme(k, {type: "Mono", val: value})
    }

    unwind(n: number) {
        while (this.changes.length > n) {
            const unit = this.changes.pop()
            if (unit == undefined) throw "It should be impossible for this to be undefined, unwind from Bindings class"
            const [k, old] = unit
            if (old == null) delete this.m[k]
            else this.m[k] = old
        }
    }

    inChildScope<T>(cb: (self: this) => T): T {
        const n = this.changes.length
        const res = cb(this)
        this.unwind(n)
        return res
    }
}

function processLetPattern(engine: TypeCheckerCore, bindings: Bindings, pat: LetPattern) {
    const [argType, argBound] = engine.newVar()
    if (pat.type == "Var") bindings.insert(pat.val, argType)
    else {
        const pairs = pat.val
        let field_names: Record<string, Span> = {}
        for(const [[name, nameSpan], subPattern] of pairs) {
            if (field_names.hasOwnProperty(name)) throw SpannedError.new2(
                "SyntaxError: Repeated field pattern name",
                nameSpan,
                "Note: Field was already bound here",
                field_names[name]
            )
            field_names[name] = nameSpan
            const fieldBound = processLetPattern(engine, bindings, subPattern)
            const bound = engine.objUse([name, fieldBound], nameSpan)
            engine.flow(argType, bound)
        }
    }
    return argBound
}

function checkExpr(engine: TypeCheckerCore, bindings: Bindings, expr: Expr): Value {
    if (expr.type == "BinOp") {

        const [[lhsExpr, lhsSpan], [rhsExpr, rhsSpan], opType, op, fullSpan] = expr.fields
        const lhsType = checkExpr(engine, bindings, lhsExpr)
        const rhsType = checkExpr(engine, bindings, rhsExpr)

        if (opType == "IntOp") {
            const lhsBound = engine.intUse(lhsSpan)
            const rhsBound = engine.intUse(rhsSpan)
            engine.flow(lhsType, lhsBound)
            engine.flow(rhsType, rhsBound)
            return engine.int(fullSpan)
        } else if (opType == "FloatOp") {
            const lhsBound = engine.floatUse(lhsSpan)
            const rhsBound = engine.floatUse(rhsSpan)
            engine.flow(lhsType, lhsBound)
            engine.flow(rhsType, rhsBound)
            return engine.float(fullSpan)
        } else if (opType == "StrOp") {
            const lhsBound = engine.strUse(lhsSpan)
            const rhsBound = engine.strUse(rhsSpan)
            engine.flow(lhsType, lhsBound)
            engine.flow(rhsType, rhsBound)
            return engine.str(fullSpan)
        } else if (opType == "IntOrFloatCmp") {
            const lhsBound = engine.intOrFloatUse(lhsSpan)
            const rhsBound = engine.intOrFloatUse(rhsSpan)
            engine.flow(lhsType, lhsBound)
            engine.flow(rhsType, rhsBound)
            return engine.bool(fullSpan)
        } else if (opType == "AnyCmp") return engine.bool(fullSpan)

    } else if (expr.type == "Literal") {

        const [type_, [_, span]] = expr.fields
        if (type_ == "Bool") return engine.bool(span)
        else if (type_ == "Float") return engine.float(span)
        else if (type_ == "Int") return engine.int(span)
        else if (type_ == "Null") return engine.null(span)
        else if (type_ == "Str") return engine.str(span)

    } else if (expr.type == "FuncDef") {

        const [[argPattern, bodyExpr], span] = expr.fields
        const [argBound, bodyType] = bindings.inChildScope(bindings => {
            const argBound2 = processLetPattern(engine, bindings, argPattern)
            const bodyType2 = checkExpr(engine, bindings, bodyExpr)
            return [argBound2, bodyType2]
        })
        return engine.func(argBound, bodyType, span)

    } else if (expr.type == "Variable") {

        const [name, span] = expr.field
        const scheme = bindings.get(name)
        if (scheme == null) throw SpannedError.new1(`SyntaxError: Undefined variable ${name}"`, span)
        else {
            if (scheme.type == "Mono") return scheme.val
            else scheme.val(engine)
        }

    } else if (expr.type == "Call") {

        const [funcExpr, argExpr, span] = expr.fields
        const funcType = checkExpr(engine, bindings, funcExpr)
        const argType = checkExpr(engine, bindings, argExpr)
        const [retType, retBound] = engine.newVar()
        const bound = engine.funcUse(argType, retBound, span)
        engine.flow(funcType, bound)
        return retType

    }
    throw "Incomplete!"
}

const engine = new TypeCheckerCore()
const bindings = new Bindings()
const spanManager = new SpanManager()
spanManager.addSource("___")
const spanMaker = new SpanMaker(spanManager, 0, new Map())
const span1 = spanMaker.span(0, 1)
const span2 = spanMaker.span(1, 2)
const span3 = spanMaker.span(0, 2)

const lit1: Expr = {type: "Literal", fields: ["Int", ["2", span1]]}
const lit2: Expr = {type: "Literal", fields: ["Int", ["1", span2]]}
const variable: Expr = {type: "Variable", field: ["x", span1]}
const binOp: Expr = {type: "BinOp", fields: [[variable, span1], [lit2, span2], "IntOp", "Add", span3]}
const arg1: LetPattern = {type: "Var", val: "x"}
const fun1: Expr = {type: "FuncDef", fields: [[arg1, binOp], span1]}
const app1: Expr = {type: "Call", fields: [fun1, lit1, span3]}

try {
    console.log(checkExpr(engine, bindings, app1))
} catch(err) {
    console.log(err.print(spanManager))
}