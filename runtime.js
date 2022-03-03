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

export { ifThenElse, createPrototype, makeCase, matchCases }