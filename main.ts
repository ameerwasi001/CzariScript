import { Lexer } from "./lexer.ts"
import { Parser } from "./parser.ts"
import { TypeckState } from "./typeCheck.ts"

const compile = (source: string) => {
    const lexer = new Lexer(source)
    const spanManager = lexer.spanManager
    try {
        const toks = lexer.lex()
        const exprs = new Parser(toks).parseTopLevel()
        new TypeckState().checkScript(exprs)
        return exprs
    } catch(err) {
        throw err.print(spanManager)
    }
}

compile(`
n = 9+10*2;
name = "Am" & "ee" & "r";
x = (if true then 1 else 4)+4;
f x y = if y = null then x else x & y;
fac = \\n -> if n < 2 then 1 else n*fac(n-1);
access = \\{x: obj} -> do
        n = @obj.y.0;
        n^ = n^+1;
        n^ = n^ * 2;
        fib (n^+5);
    end where fib n = if n < 2 then 1 else fib(n-1) + fib(n-2) end;
f "My name is " name;
f "a" null;
fac 10;
obj = {x: {y: {4, "ABC"}}};
access {obj with s: "h", m: 3};
access {x: {y: {4, 7, "XYZ"}, text: "No!"}} + 4;
area shape = 
    match shape with
    | Square {n: n} -> n*n
    | Circle cir -> 3.14 .* cir.r .* cir.r
    end;
area (Square {obj with n: n});
`)
