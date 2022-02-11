import { Span, SpanMaker, SpanManager, SpannedError } from "./spans.ts"
import { Literal, Op, OpType, VarDefinition, LetPattern, MatchPattern, Expr, Readability, TopLevel, cloneExpr } from "./ast.ts"
import { VTypeHead, UTypeHead, TypeNode, Value, Use, TypeCheckerCore, cloneValue } from "./core.ts"

type Scheme =
    {type: "Mono", val: Value}
    | {type: "Poly", val: (_: TypeCheckerCore) => Value}

const cloneScheme = (scheme: Scheme) : Scheme => {
    if (scheme.type == "Mono") return {type: "Mono", val: cloneValue(scheme.val)}
    // Maybe we clone the function, IDK...
    else return {type: "Poly", val: scheme.val}
}

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

function checkLet(engine: TypeCheckerCore, bindings: Bindings, expr: Expr): Scheme {
    if (expr.type == "FuncDef") {
        const savedBindings = new Bindings()
        savedBindings.m = {}
        for(const k in bindings.m) savedBindings.m[k] = cloneScheme(bindings.m[k])
        savedBindings.changes = []
        const savedExpr = cloneExpr(expr)
        const f = (engine: TypeCheckerCore) => checkExpr(engine, savedBindings, savedExpr)
        f(engine)
        return {type: "Poly", val: f}
    }
    let varType = checkExpr(engine, bindings, expr)
    return {type: "Mono", val: varType}
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
            else return scheme.val(engine)
        }

    } else if (expr.type == "Call") {

        const [funcExpr, argExpr, span] = expr.fields
        const funcType = checkExpr(engine, bindings, funcExpr)
        const argType = checkExpr(engine, bindings, argExpr)
        const [retType, retBound] = engine.newVar()
        const bound = engine.funcUse(argType, retBound, span)
        engine.flow(funcType, bound)
        return retType

    } else if (expr.type == "Let") {

        const [[name, varExpr], restExpr] = expr.fields
        const varScheme = checkLet(engine, bindings, varExpr)
        return bindings.inChildScope((bindings: Bindings) => {
            bindings.insert_scheme(name, varScheme)
            return checkExpr(engine, bindings, restExpr)
        })

    } else if (expr.type == "If") {

        const [[condExpr, span], thenExpr, elseExpr] = expr.fields
        if (condExpr.type == "BinOp" && condExpr.fields[2] == "AnyCmp") {
            const [[lhs, _0], [rhs, _1], _2, op, _3] = condExpr.fields
            if (lhs.type == "Variable") {
                const [name, _4] = lhs.field
                if (rhs.type == "Literal" && rhs.fields[0] == "Null") {
                    const scheme = bindings.get(name)
                    if (scheme != null) {
                        if (scheme.type == "Mono") {
                            const lhsType = scheme.val
                            const [okExpr, elseExpr1] = op == "Neq" ? [thenExpr, elseExpr] : [elseExpr, thenExpr]
                            const [nnvarType, nnvarBound] = engine.newVar()
                            const bound = engine.nullCheckUse(nnvarBound, span)
                            engine.flow(lhsType, bound)
                            const okType = bindings.inChildScope((bindings: Bindings) => {
                                bindings.insert(name, nnvarType)
                                return checkExpr(engine, bindings, okExpr)
                            })
                            const elseType = checkExpr(engine, bindings, elseExpr1)
                            const [merged, mergedBound] = engine.newVar()
                            engine.flow(okType, mergedBound)
                            engine.flow(elseType, mergedBound)
                            return merged
                        }
                    }
                }
            }
        }

        const condType = checkExpr(engine, bindings, condExpr)
        const bound = engine.boolUse(span)
        engine.flow(condType, bound)

        const thenType = checkExpr(engine, bindings, thenExpr)
        const elseType = checkExpr(engine, bindings, elseExpr)

        const [merged, mergedBound] = engine.newVar()
        engine.flow(thenType, mergedBound)
        engine.flow(elseType, mergedBound)
        return merged

    } else if (expr.type == "Record") {

        const [proto, fields, span] = expr.fields
        const protoType = proto == null ? null : checkExpr(engine, bindings, proto)
        const fieldNames: Record<string, Span> = {}
        const fieldTypePairs: [string, Value][] = []
        for (const [[name, nameSpan], expr] of fields) {
            if (fieldNames.hasOwnProperty(name)) {
                const oldSpan = fieldNames[name]
                if(oldSpan == undefined) throw "oldSpan should not be undefined. In Record type check from checkExpr"
                throw SpannedError.new2(
                    "SyntaxError: Repeated field name",
                    nameSpan,
                    "Note: Field was already defined here",
                    oldSpan
                )
            }
            fieldNames[name] = nameSpan
            const t = checkExpr(engine, bindings, expr)
            fieldTypePairs.push([name, t])
        }
        return engine.obj(fieldTypePairs, protoType, span)

    } else if (expr.type == "Case") {

        const [[tag, span], valExpr] = expr.fields
        const valType = checkExpr(engine, bindings, valExpr)
        return engine.case([tag, valType], span)

    } else if (expr.type == "FieldAccess") {

        const [lhsExpr, name, span] = expr.fields
        const lhsType = checkExpr(engine, bindings, lhsExpr)
        const [fieldType, fieldBound] = engine.newVar()
        const bound = engine.objUse([name, fieldBound], span)
        engine.flow(lhsType, bound)
        return fieldType

    } else if (expr.type == "Match") {

        const [matchExpr, cases, span] = expr.fields
        const matchType = checkExpr(engine, bindings, matchExpr)
        const [resultType, resultBound] = engine.newVar()

        const caseTypePairs: [string, [Use, [Value, Use]]][] = []
        let wildcardType: [Use, [Value, Use]] | null = null
 
        const caseNames: Record<string, Span> = {}
        let wildcard: Span | null = null

        for(const [[pattern, patternSpan], rhsExpr] of cases) {
            if(wildcard != null) throw SpannedError.new2(
                "SyntaxError: Unreachable match pattern",
                patternSpan,
                "Note: Unreachable due to previous wildcard pattern here",
                wildcard
            )

            if (pattern.type == "Case") {
                const [tag, name] = pattern.val
                if (caseNames.hasOwnProperty(tag)) throw SpannedError.new2(
                    "SyntaxError: Unreachable match pattern",
                    patternSpan,
                    "Note: Unreachable due to previous case pattern here",
                    caseNames[tag]
                )
                caseNames[tag] = patternSpan

                const [wrappedType, wrappedBound] = engine.newVar()
                const rhsType = bindings.inChildScope(bindings => {
                    bindings.insert(name, wrappedType)
                    return checkExpr(engine, bindings, rhsExpr)
                })

                caseTypePairs.push( [tag, [wrappedBound, [rhsType, resultBound]]] )
            } else {
                const name = pattern.val
                wildcard = patternSpan
                const [wrappedType, wrappedBound] = engine.newVar()
                const rhsType = bindings.inChildScope(bindings => {
                    bindings.insert(name, wrappedType)
                    return checkExpr(engine, bindings, rhsExpr)
                })
                wildcardType = [wrappedBound, [rhsType, resultBound]]
            }
        }

        const bound = engine.caseUse(caseTypePairs, wildcardType, span)
        engine.flow(matchType, bound)
        return resultType

    }

    throw "Incomplete!"
}

const checkTopLevel = (engine: TypeCheckerCore, bindings: Bindings, ast: TopLevel) => {
    if (ast.type == "Expr") checkExpr(engine, bindings, ast.val)
    else if (ast.type == "LetDef") {
        const [name, varExpr] = ast.val
        const varScheme = checkLet(engine, bindings, varExpr)
        bindings.insert_scheme(name, varScheme)
    } else throw "Incomplete!"
}

class TypeckState {
    core: TypeCheckerCore
    bindings: Bindings

    constructor() {
        this.core = new TypeCheckerCore()
        this.bindings = new Bindings()
    }

    checkScript(parsed: TopLevel[]) {
        const temp = this.core.save()
        for(const item of parsed) {
            try {
                checkTopLevel(this.core, this.bindings, item)
            } catch(err) {
                this.core.restore(temp)
                this.bindings.unwind(0)
                throw err
            }
        }
        const changes = this.bindings.changes
        while(changes.length > 0) changes.pop()
    }
}

const spanManager = new SpanManager()
spanManager.addSource("___")
const spanMaker = new SpanMaker(spanManager, 0, new Map())
const span1 = spanMaker.span(0, 1)
const span2 = spanMaker.span(1, 2)
const span3 = spanMaker.span(0, 2)

const num1: Expr = {type: "Literal", fields: ["Int", ["2", span1]]}
const num2: Expr = {type: "Literal", fields: ["Int", ["1", span2]]}
const str1: Expr = {type: "Literal", fields: ["Str", ["AbcXYz", span3]]}
const null1: Expr = {type: "Literal", fields: ["Null", ["", span2]]}
const rec1: Expr = {type: "Record", fields: [
    null, 
    [
        [ ["num", span2], num1 ],
        [ ["name", span2], str1 ]
    ],
    span3
]}
const case1: Expr = {type: "Case", fields: [["Constructor", span2], rec1]}

const variable: Expr = {type: "Variable", field: ["x", span1]}
const recVar: Expr = {type: "Variable", field: ["rec", span1]}
const funRef: Expr = {type: "Variable", field: ["id", span1]}

const binOp: Expr = {type: "BinOp", fields: [[variable, span1], [num2, span2], "IntOp", "Add", span3]}
const arg1: LetPattern = {type: "Var", val: "x"}

const idFun: Expr = {type: "FuncDef", fields: [[arg1, variable], span1]}

const idApp1: Expr = {type: "Call", fields: [funRef, num2, span3]}
const idApp2: Expr = {type: "Call", fields: [funRef, str1, span3]}
const idBinOp: Expr = {type: "BinOp", fields: [[idApp1, span1], [idApp1, span2], "IntOp", "Add", span3]}

const fun1: Expr = {type: "FuncDef", fields: [[arg1, binOp], span1]}

const condExpr: Expr = {type: "BinOp", fields: [[variable, span1], [num2, span2], "IntOrFloatCmp", "Eq", span3]}
const ifExpr: Expr = {type: "If", fields: [[condExpr, span2], variable, num2]}
const ifFun: Expr = {type: "FuncDef", fields: [[arg1, ifExpr], span1]}

const nullCheckCond: Expr = {type: "BinOp", fields: [[variable, span1], [null1, span2], "AnyCmp", "Eq", span3]}
const nullCheckExpr: Expr = {type: "If", fields: [[nullCheckCond, span2], num1, variable]}
const nullCheckFun: Expr = {type: "FuncDef", fields: [[arg1, nullCheckExpr], span1]}

const ifDef: VarDefinition = ["ifFun", ifFun]
const nullCheckFunDef: VarDefinition = ["nullCheckFun", nullCheckFun]
const idDef: VarDefinition = ["id", idFun]

const pat1: MatchPattern = {type: "Case", val: ["Constructor", "rec"]}
const wildcardPat: MatchPattern = {type: "Wildcard", val: "x"}
const accessField: Expr = {type: "FieldAccess", fields: [recVar, "name", span1]}
const matchExpr: Expr = {
    type: "Match", 
    fields: [
        variable, 
        [ 
            [ [pat1, span1], accessField ], 
            [ [wildcardPat, span2], variable ]
        ], 
        span2
    ]
}
const accessFieldFun: Expr = {type: "FuncDef", fields: [[arg1, matchExpr], span1]}
const accessDef: VarDefinition = ["accessFunc", accessFieldFun]

const ifApp: Expr = {type: "Call", fields: [ifFun, num1, span3]}
const app1: Expr = {type: "Call", fields: [fun1, num1, span3]}
const accessApp: Expr = {type: "Call", fields: [accessFieldFun, case1, span3]}

const typeState = new TypeckState()

try {
    typeState.checkScript([
        {type: "LetDef", val: idDef},
        {type: "LetDef", val: ifDef},
        {type: "LetDef", val: nullCheckFunDef},
        {type: "LetDef", val: accessDef},
        {type: "Expr", val: idApp1},
        {type: "Expr", val: idApp2},
        {type: "Expr", val: idBinOp},
        {type: "Expr", val: app1},
        {type: "Expr", val: ifApp},
        {type: "Expr", val: case1},
        {type: "Expr", val: accessApp},
    ])
} catch(err) {
    console.log(err.print(spanManager))
}