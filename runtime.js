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

const println = a => {
    console.log(a)
    return a
}

export { println, ifThenElse, createPrototype, makeCase, matchCases, Eq__AnyCmp, Neq_AnyCmp }