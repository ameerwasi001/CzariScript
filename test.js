import { println, ifThenElse, createPrototype, makeCase, matchCases, Eq__AnyCmp, Neq_AnyCmp } from "./runtime.js";

let n;
let name;
let x;
let f;
let fac;
let access;
let objC;
let obj;
let area;
n = (9 + (10 * 2));
name = (("Am" + "ee") + "r");
x = (ifThenElse((n > 2), () => 1, () => 4) + 4);
f = ((x) => { return ((y) => { return ifThenElse(Eq__AnyCmp(y, null), () => x, () => (x + y)) }) });
fac = ((n) => { return ifThenElse((n < 2), () => 1, () => (n * ((fac)((n - 1))))) });
access = (({x: obj}) => { return (() => {
	let fib;
	
	fib = ((n) => { return ifThenElse((n < 3), () => 1, () => (((fib)((n - 1))) + ((fib)((n - 2))))) });
	
	return (((n) => { return (((__letVar1) => { return (((__letVar2) => { return (((__letVar3) => { return __letVar3 })(((fib)(((n.$val) + 5))))) })((n.$val = ((n.$val) * 2)))) })((n.$val = ((n.$val) + 1)))) })({$val: ((obj["y"])["0"])}))
})() });
objC = ((n) => { return createPrototype({}, {x: n, getX: ((self) => { return ((n) => { return ((((self["x"])["y"])["0"]) + n) }) })}) });
obj = ((objC)(createPrototype({}, {y: createPrototype({}, {0: 4, 1: "ABC"})})));
area = ((shape) => { return matchCases(shape, [[ (constructor_) => constructor_.$constructor == "Square", (__matchVar0) => { return (((({n: n}) => { return (n * n) }))(__matchVar0)) } ], [ (constructor_) => constructor_.$constructor == "Circle", (cir) => { return ((3.14 * (cir["r"])) * (cir["r"])) } ]]) });
;
((println)(((((f)("My name is ")))(name))));
((((f)("a")))(null));
((println)(((fac)(10))));
((println)(((access)(createPrototype(obj, {s: "h", m: 3})))));
(((access)(createPrototype({}, {x: createPrototype({}, {y: createPrototype({}, {0: 4, 1: 7, 2: "XYZ"}), text: "No!"})}))) + 4);
((println)(((area)(makeCase("Square", createPrototype(obj, {n: n}))))));
((println)((((((__accessObj) => { return (((__accessObj["getX"]))(__accessObj)) })(obj)))(2))));
