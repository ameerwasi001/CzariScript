const ifThenElse = (cond, thenExpr, elseExpr) => {
    if(cond) return thenExpr()
    else return elseExpr()
}

const createPrototype = (proto, obj) => {
    const newObj = {}
    for(const k in proto) newObj[k] = proto[k]
    for(const k in obj) newObj[k] = obj[k]
    return newObj
}

const makeCase = (constructor, val) => {
    return {$constructor: constructor, $wholeValue: val}
}

const matchCases = (val, cases) => {
    for(const [cond, fun] of cases) {
        if(cond(val)) return fun(val.$wholeValue)
    }
}

const isString = x => typeof x === 'string'
const isBool = x => typeof x == "boolean"
const isInt = x => Number.isInteger(x)
const isObj = x => typeof x == "object"

function Eq__AnyCmp(a, b) {
    if(isInt(a) && isInt(b) && a == b) return true
    else if(isString(a) && isString(b) && a==b) return true
    else if(isBool(a) && isBool(b) && a == b) return true
    else if(a === null && b === null) return true
    else if(isObj(a) && isObj(b)) {
        for(const k in a) {
            if(Object.keys(a).length != Object.keys(b).length) return false
            if(!(b.hasOwnProperty(k))) return false
            if(!Eq__AnyCmp(a[k], b[k])) return false
        }
        return true
    } else return false
}

const Neq_AnyCmp = (a, b) => !Eq__AnyCmp(a, b)

function objInArrayByIdentity(obj, arr) {
    if(typeof obj != "object") throw "This should only be called with objects"
    for(const elem of arr) {
        if(obj === elem) return true
    }
    return false
}

function toStringByObj(obj, visited) {
    if(typeof obj == "number" || typeof obj == "boolean" || typeof obj == "string") return obj.toString()
    else if(obj === null) return "null"
    else if(typeof obj == "object") {
        if(objInArrayByIdentity(obj, visited)) return "<cycle>"
        visited.push(obj)
        if(Object.keys(obj).length == 1 && obj.hasOwnProperty("$val")) return `@${toStringByObj(obj["$val"], visited)}`
        if(Object.keys(obj).length == 2 && obj.hasOwnProperty("$constructor") && obj.hasOwnProperty("$wholeValue")) {
            return `${obj["$constructor"]} ${toStringByObj(obj["$wholeValue"], visited)}`
        }
        const kvs = []
        for(const k in obj) {
            const v = obj[k]
            kvs.push([k, toStringByObj(v, visited)])
        }
        return "{" + kvs.map(([k, v]) => `${k}: ${v}`).join(", ") + "}"
    } else if(typeof obj == "function") return "<function>"
}

function toString(obj) {
    return toStringByObj(obj, [])
}

const println = a => {
    console.log(toString(a))
    return a
}

export { println, ifThenElse, createPrototype, makeCase, matchCases, Eq__AnyCmp, Neq_AnyCmp }