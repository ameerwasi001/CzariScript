import { Span, SpannedError } from "./spans.ts"
import { assert_eq } from "./utils.ts"
import { Reachability } from "./reachability.ts"

type ID = number;

type Value = {type: "Value", val: ID}
type Use = {type: "Use", val: ID}

type LazyFlow = [Value, Use]
type SavePoint = [number, Reachability]

type VTypeHead = 
    {type: "VBool"}
    | {type: "VFloat"}
    | {type: "VInt"}
    | {type: "VNull"}
    | {type: "VStr"}
    | {type: "VFunc", arg: Use, ret: Value}
    | {type: "VObj", fields: Record<string, Value>, proto: Value | null}
    | {type: "VCase", case: [string, Value]}
    | {type: "VRef", write: Use | null, read: Value | null}

type UTypeHead = 
    {type: "UBool"}
    | {type: "UFloat"}
    | {type: "UInt"}
    | {type: "UNull"}
    | {type: "UStr"}
    | {type: "UIntOrFloat"}
    | {type: "UFunc", arg: Value, ret: Use}
    | {type: "UObj", field: [string, Use]}
    | {type: "UCase", cases: Record<string, [Use, LazyFlow]>, wildcard: [Use, LazyFlow] | null}
    | {type: "URef", write: Value | null, read: Use | null}
    | {type: "UNullCase", nonnull: Use}


const use = (i: ID): Use => {
    return {type: "Use", val: i}
}

const value = (i: ID): Value => {
    return {type: "Value", val: i}
}

const checkHeads = (
    lhsInd: ID, 
    lhs: [VTypeHead, Span], 
    rhsInd: ID, 
    rhs: [UTypeHead, Span], 
    out: [Value, Use][]
    ): [] => {
    if (lhs[0].type == "VBool" && rhs[0].type == "UBool") return []
    else if (lhs[0].type == "VFloat" && rhs[0].type == "UFloat") return []
    else if (lhs[0].type == "VInt" && rhs[0].type == "UInt") return []
    else if (lhs[0].type == "VNull" && rhs[0].type == "UNull") return []
    else if (lhs[0].type == "VStr" && rhs[0].type == "UStr") return []
    else if (lhs[0].type == "VInt" && rhs[0].type == "UIntOrFloat") return []
    else if (lhs[0].type == "VFloat" && rhs[0].type == "UIntOrFloat") return []
    else if (lhs[0].type == "VFunc" && rhs[0].type == "UFunc") {
        const ret1 = lhs[0].ret
        const ret2 = rhs[0].ret
        const arg1 = lhs[0].arg
        const arg2 = rhs[0].arg
        out.push([ret1, ret2])
        out.push([arg2, arg1])
        return []
    } else if (lhs[0].type == "VObj" && rhs[0].type == "UObj") {
        const fields = lhs[0].fields
        const proto = lhs[0].proto
        const [name, rhs2] = rhs[0].field

        if (fields.hasOwnProperty(name)) {
            const lhs2 = fields[name]
            out.push([lhs2, rhs2])
            return []
        } else if (proto != null) {
            out.push([proto, use(rhsInd)])
            return []
        } else {
            throw SpannedError.new2(
                `TypeError: Missing field ${name}\nNote: Field is accessed here`,
                rhs[1],
                "But the record is defined without that field here.",
                lhs[1]
                )
        }
    } else if (lhs[0].type == "VCase" && rhs[0].type == "UCase") {
        const [name, lhs2] = lhs[0].case
        const [cases2, wildcard] = [rhs[0].cases, rhs[0].wildcard]
        if (cases2.hasOwnProperty(name)) {
            const [rhs2, lazyFlow] = [...cases2[name]]
            out.push([lhs2, rhs2])
            out.push(lazyFlow)
            return []
        } else if (wildcard != null) {
            const [rhs2, lazyFlow] = wildcard
            out.push([value(lhsInd), rhs2])
            out.push(lazyFlow)
            return []
        } else {
            throw SpannedError.new2(
                `TypeError: Unhandled case ${name}\nNote: Case originates here`,
                lhs[1],
                "But it is not handled here.",
                rhs[1]
            )
        }
    } else if (lhs[0].type == "VRef" && rhs[0].type == "URef") {
        const [r1, w1] = [lhs[0].read, lhs[0].write]
        const [r2, w2] = [rhs[0].read, rhs[0].write]
        if (r2 != null) {
            if (r1 != null) out.push([r1, r2])
            else throw SpannedError.new2(
                `TypeError: Reference is not readable.\nNote: Ref is made write-only here`,
                lhs[1],
                "But is read here.",
                rhs[1]
            )
        }
        if (w2 != null) {
            if (w1 != null) out.push([w2, w1])
            else throw SpannedError.new2(
                "TypeError: Reference is not writable.\nNote: Ref is made read-only here",
                lhs[1],
                "But is written here.",
                rhs[1]
            )
        }
        return []
    } else if (lhs[0].type == "VNull" && rhs[0].type == "UNullCase") return []
    else if (rhs[0].type == "UNullCase") {
        const nonnull = rhs[0].nonnull
        out.push([value(lhsInd), nonnull])
        return []
    } else {
        let found = ""
        if (lhs[0].type == "VBool") found = "boolean"
        else if (lhs[0].type == "VFloat") found = "float"
        else if (lhs[0].type == "VInt") found = "int"
        else if (lhs[0].type == "VStr") found = "string"
        else if (lhs[0].type == "VNull") found = "null"
        else if (lhs[0].type == "VFunc") found = "function"
        else if (lhs[0].type == "VObj") found = "record"
        else if (lhs[0].type == "VCase") found = "case"
        else if (lhs[0].type == "VRef") found = "ref"

        let expected = ""
        if (rhs[0].type == "UBool") expected = "boolean"
        else if (rhs[0].type == "UFloat") expected = "float"
        else if (rhs[0].type == "UInt") expected = "int"
        else if (rhs[0].type == "UStr") expected = "string"
        else if (rhs[0].type == "UNull") expected = "null"
        else if (rhs[0].type == "UFunc") expected = "function"
        else if (rhs[0].type == "UObj") expected = "record"
        else if (rhs[0].type == "UCase") expected = "case"
        else if (rhs[0].type == "URef") expected = "ref"
        throw SpannedError.new2(
            `TypeError: Value is required to be a ${expected} here,`,
            rhs[1],
            `But that value may be a ${found} originating here.`,
            lhs[1]
        )
    }
}

type TypeNode = 
    {type: "Var"}
    | {type: "Value", val: [VTypeHead, Span]}
    | {type: "Use", val: [UTypeHead, Span]}

class TypeCheckerCore {
    r: Reachability
    types: TypeNode[]

    constructor() {
        this.r = new Reachability()
        this.types = []
    }

    flow(lhs: Value, rhs: Use): [] {
        let pendingEdges: [Value, Use][] = [[lhs, rhs]]
        let typePairstoCheck: [ID, ID][] = []

        while (pendingEdges.length > 0) {
            const unit = pendingEdges.pop()
            if (unit == undefined) throw "flow: unit should not be undeifned"
            const [lhs, rhs] = unit
            this.r.addEdge(lhs.val, rhs.val, typePairstoCheck)
            while (typePairstoCheck.length > 0) {
                const unit = typePairstoCheck.pop()
                if (unit == undefined) throw "flow: unit should not be undeifned"
                const [lhs, rhs] = unit
                const v1 = this.types[lhs]
                const v2 = this.types[rhs]
                if (v1 == undefined) continue
                if (v2 == undefined) continue
                if (v1.type == "Value") {
                    if (v2.type == "Use") {
                        const [lhsHead, rhsHead] = [v1.val, v2.val]
                        checkHeads(lhs, lhsHead, rhs, rhsHead, pendingEdges)
                    }
                }
            }
        }
        return []
    }

    newVal(valType: VTypeHead, span: Span) {
        const i = this.r.addNode()
        assert_eq(i, this.types.length)
        this.types.push({type: "Value", val: [valType, span]})
        return value(i)
    }

    newUse(constraint: UTypeHead, span: Span) {
        const i = this.r.addNode()
        assert_eq(i, this.types.length)
        this.types.push({type: "Use", val: [constraint, span]})
        return use(i)
    }

    newVar() {
        const i = this.r.addNode()
        assert_eq(i, this.types.length)
        this.types.push({type: "Var"})
        return [value(i), use(i)]
    }

    bool(span: Span) {
        return this.newVal({type: "VBool"}, span)
    }

    float(span: Span) {
        return this.newVal({type: "VFloat"}, span)
    }

    int(span: Span) {
        return this.newVal({type: "VInt"}, span)
    }

    null(span: Span) {
        return this.newVal({type: "VNull"}, span)
    }

    str(span: Span) {
        return this.newVal({type: "VStr"}, span)
    }

    boolUse(span: Span) {
        return this.newUse({type: "UBool"}, span)
    }

    floatUse(span: Span) {
        return this.newUse({type: "UFloat"}, span)
    }

    intUse(span: Span) {
        return this.newUse({type: "UInt"}, span)
    }

    nullUse(span: Span) {
        return this.newUse({type: "UNull"}, span)
    }

    strUse(span: Span) {
        return this.newUse({type: "UStr"}, span)
    }

    intOrFloatUse(span: Span) {
        return this.newUse({type: "UIntOrFloat"}, span)
    }

    func(arg: Use, ret: Value, span: Span) {
        return this.newVal({type: "VFunc", arg, ret}, span)
    }

    funcUse(arg: Value, ret: Use, span: Span) {
        return this.newUse({type: "UFunc", arg, ret}, span)
    }

    obj(fields: [string, Value][], proto: Value | null, span: Span) {
        const fieldsMap: Record<string, Value> = {}
        for(const [key, val] of fields) {
            fieldsMap[key] = val
        }
        return this.newVal({type: "VObj", proto, fields: fieldsMap}, span)
    }

    objUse(field: [string, Use], span: Span) {
        return this.newUse({type: "UObj", field: field}, span)
    }

    case(c: [string, Value], span: Span) {
        return this.newVal({type: "VCase", case: c}, span)
    }

    caseUse(c: [string, [Use, LazyFlow]][], wildcard: [Use, LazyFlow] | null, span: Span) {
        const cases: Record<string, [Use, LazyFlow]> = {}
        for(const [key, val] of c) {
            cases[key] = val
        }
        return this.newUse({type: "UCase", cases, wildcard}, span)
    }

    reference(write: Use | null, read: Value | null, span: Span) {
        return this.newVal({type: "VRef", write, read}, span)
    }

    referenceUse(write: Value | null, read: Use | null, span: Span) {
        return this.newUse({type: "URef", write, read}, span)
    }

    nullCheckUse(nonnull: Use, span: Span) {
        return this.newUse({type: "UNullCase", nonnull: nonnull}, span)
    }

    save(): SavePoint {
        return [this.types.length, this.r.clone()]
    }

    restore(save: SavePoint) {
        this.types.splice(save[0])
        const save1 = save[1]
        const r = this.r
        save[1] = r
        this.r = save1
    }
}

export type { VTypeHead, UTypeHead, TypeNode, Value, Use }
export { TypeCheckerCore }