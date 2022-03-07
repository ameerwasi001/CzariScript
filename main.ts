import { Lexer } from "./lexer.ts"
import { Parser } from "./parser.ts"
import { TypeckState } from "./typeCheck.ts"
import { topLevelsToJs } from "./js.ts"
import { intorduceBuiltIns, removeBuiltIns } from "./builtIns.ts"

const compile = (source: string) => {
    const lexer = new Lexer(source)
    const spanManager = lexer.spanManager
    try {
        const toks = intorduceBuiltIns(lexer.lex())
        const exprs_ = new Parser(toks).parseTopLevel()
        new TypeckState().checkScript(exprs_)
        const exprs = removeBuiltIns(exprs_)
        return topLevelsToJs(exprs)
    } catch(err) {
        throw err.print(spanManager)
    }
}

const compleToFile = async (source: string) => await Deno.writeTextFile("./test.js", compile(source))

compleToFile(`
n = 9+10*2;
name = "Am" & "ee" & "r";
x = (if n > 2 then 1 else 4)+4;
f x y = if y = null then x else x & y;
fac = \\n -> if n < 2 then 1 else n*fac(n-1);
access = \\{x: obj} -> do
        n = @obj.y.0;
        n^ = n^+1;
        n^ = n^ * 2;
        fib (n^+5);
    end where fib n = if n < 3 then 1 else fib(n-1) + fib(n-2) end;
println (f "My name is " name);
f "a" null;
println (fac 10);
obj = {x: {y: {4, "ABC"}}, getX: \\self n -> self.x.y.0 + n};
println (access {obj with s: "h", m: 3});
access {x: {y: {4, 7, "XYZ"}, text: "No!"}} + 4;
area shape = 
    match shape with
    | Square {n: n} -> n*n
    | Circle cir -> 3.14 .* cir.r .* cir.r
    end;
println (area (Square {obj with n: n}));
println (obj:getX 2)
`)