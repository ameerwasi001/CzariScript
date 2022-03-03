import {
    Literal, Op, OpType, VarDefinition,
    LetPattern, MatchPattern, Expr,
    Readability, TopLevel, exprToString
} from "./ast.ts";

function argPatternToJs(expr: LetPattern): string {
    if(expr.type == "Record") {
        const xs = expr.val
        return "{" + xs.map(([[prop, _], val]) => `${prop}: ${argPatternToJs(val)}`).join(", ") + "}"
    } else if (expr.type == "Var") return expr.val
    else throw "Impossible!"
}

const matchPatternToJs = (pat: MatchPattern, expr: Expr): string => {
    if(pat.type == "Case") {
        const [constructor, variable] = pat.val
        return `[ (constructor_) => constructor_.$constructor == ${JSON.stringify(constructor)}, ` + 
        `(${variable}) => { return ${exprToJS(expr)} } ]`
    } else return `[_ => true, (${pat.val}) => { return ${exprToJS(expr)} }]`
}

const dispatchOperator = (op: Op, opType: OpType, [a, b]: [Expr, Expr]) => {
    const [str1, str2] = [exprToJS(a), exprToJS(b)]
    if(opType == "IntOp" || opType == "FloatOp" || opType == "StrOp") {
        if(op == "Add") return `(${str1} + ${str2})`
        else if(op == "Sub") return `(${str1} - ${str2})`
        else if(op == "Mult") return `(${str1} * ${str2})`
        else if(op == "Div") return `(${str1} / ${str2})`
        else if(op == "Rem") return `(${str1} % ${str2})`
    } else if(opType == "IntOrFloatCmp") {
        if(op == "Lt") return `(${str1} < ${str2})`
        else if(op == "Lte") return `(${str1} <= ${str2})`
        else if(op == "Gt") return `(${str1} > ${str2})`
        else if(op == "Gte") return `(${str1} >= ${str2})`
    }
    return `${op}__${opType}(${str1}, ${str2})`
}

function exprToJS(expr: Expr): string {
    if (expr.type == "BinOp") {
        const [[expr1, _1], [expr2, _2], opType, op, _] = expr.fields
        return dispatchOperator(op, opType, [expr1, expr2])
    } else if (expr.type == "Call") {
        const [expr1, expr2, _] = expr.fields
        return `((${exprToJS(expr1)})(${exprToJS(expr2)}))`
    } else if (expr.type == "Case") {
        const [[str, _], newExpr] = expr.fields
        return `makeCase(${JSON.stringify(str)}, ${exprToJS(newExpr)})`
    } else if (expr.type == "FieldAccess") {
        const [expr1, str, _] = expr.fields
        return `(${exprToJS(expr1)}[${JSON.stringify(str)}])`
    } else if (expr.type == "FuncDef") {
        const [[argPattern, bodyExpr], _] = expr.fields
        return `((${argPatternToJs(argPattern)}) => { return ${exprToJS(bodyExpr)} })`
    } else if (expr.type == "If") {
        const [[condExpr, _], thenExpr, elseExpr] = expr.fields
        return `ifThenElse(${exprToJS(condExpr)}, () => ${exprToJS(thenExpr)}, () => ${exprToJS(elseExpr)})`
    } else if (expr.type == "Let") {
        const [[id, valExpr], expr1] = expr.fields
        return `(((${id}) => { return ${exprToJS(expr1)} })(${exprToJS(valExpr)}))`
    } else if (expr.type == "LetRec") {
        const [varDefinitions, expr1] = expr.fields
        const decls = varDefinitions.map(([id, _]) => `let ${id};\n`).join("")
        const defs = varDefinitions.map(([id, val]) => `${id} = ${exprToJS(val)};\n`).join("")
        const all = `${decls}\n${defs}\nreturn ${exprToJS(expr1)}`.split("\n").map(x => "\t" + x).join("\n")
        return `(() => {\n${all}\n})()`
    } else if (expr.type == "Literal") {
        const [lit, [str, _2]] = expr.fields
        if(lit=="Str") return JSON.stringify(str)
        else return str
    } else if (expr.type == "Match") {
        const [expr1, xs, _] = expr.fields
        const cs = "[" +
            xs.map(([[pat, _], expr]) => matchPatternToJs(pat, expr)).join(", ") + 
            "]"
        return `matchCases(${exprToJS(expr1)}, ${cs})`
    } else if (expr.type == "NewRef") {
        const [expr1, _] = expr.fields
        return `{$val: ${exprToJS(expr1)}}`
    } else if (expr.type == "Record") {
        const [maybeExpr, xs, _] = expr.fields
        const props = xs.map(([[str, _], expr]) => str + ": " + exprToJS(expr)).join(", ")
        return  `createPrototype(${maybeExpr == null ? "{}" : exprToJS(maybeExpr)}, {${props}})`
    } else if (expr.type == "RefGet") {
        const [expr1, _] = expr.field
        return `(${exprToJS(expr1)}.$val)`
    } else if (expr.type == "RefSet") {
        const [[expr1, _], expr2] = expr.fields
        return `(${exprToJS(expr1)}.$val = ${exprToJS(expr2)})`
    } else {
        return expr.field[0]
    }
}

const topLevelToJs = (topLevel: TopLevel): string => {
    if(topLevel.type == "Expr") return exprToJS(topLevel.val)
    else if(topLevel.type == "LetDef") {
        const [id, expr] = topLevel.val
        return `const ${id} = ${exprToJS(expr)}`
    } else 
        return topLevel.val.map(([id, _]) => `let ${id};\n`).join("") + 
            topLevel.val.map(([id, expr]) => `${id} = ${exprToJS(expr)};\n`).join("")
}

const topLevelsToJs = (topLevels: TopLevel[]) => 
    "import { ifThenElse, createPrototype, makeCase, matchCases } from \"./runtime.js\";\n\n" + 
    topLevels.map(topLevelToJs).map(x => x + ";\n").join("")

export { topLevelsToJs }