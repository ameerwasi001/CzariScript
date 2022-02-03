import { Span, SpannedError } from "./spans.ts"

type ID = number;

type Value = {type: "Value", val: ID}
type Use = {type: "Use", val: ID}

type LazyFlow = [Value, Use]

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
        if (rhs[0].type == "UBool") found = "boolean"
        else if (rhs[0].type == "UFloat") found = "float"
        else if (rhs[0].type == "UInt") found = "int"
        else if (rhs[0].type == "UStr") found = "string"
        else if (rhs[0].type == "UNull") found = "null"
        else if (rhs[0].type == "UFunc") found = "function"
        else if (rhs[0].type == "UObj") found = "record"
        else if (rhs[0].type == "UCase") found = "case"
        else if (rhs[0].type == "URef") found = "ref"

        throw SpannedError.new2(
            `TypeError: Value is required to be a ${expected} here,`,
            rhs[1],
            `But that value may be a ${found} originating here.`,
            lhs[1]
        )
    }
}