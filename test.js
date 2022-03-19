import { println, ifThenElse, createPrototype, makeCase, matchCases, Eq__AnyCmp, Neq_AnyCmp } from "./runtime.js";

;
let modNum__0__n;
let modNum__0__name;
let modNum__0__x;
let modNum__0__f;
let modNum__0__fac;
let modNum__0__access;
let modNum__0__textC;
let modNum__0__objC;
let modNum__0__obj;
let modNum__0__area;
modNum__0__n = (9 + (10 * 2));
modNum__0__name = (("Am" + "ee") + "r");
modNum__0__x = (ifThenElse((modNum__0__n > 2), () => 1, () => 4) + 4);
modNum__0__f = ((modNum__0__x) => { return ((modNum__0__y) => { return ifThenElse(Eq__AnyCmp(modNum__0__y, null), () => modNum__0__x, () => (modNum__0__x + modNum__0__y)) }) });
modNum__0__fac = ((modNum__0__n) => { return ifThenElse((modNum__0__n < 2), () => 1, () => (modNum__0__n * ((modNum__0__fac)((modNum__0__n - 1))))) });
modNum__0__access = (({x: modNum__0__obj}) => { return (() => {
	let modNum__0__fib;
	
	modNum__0__fib = ((modNum__0__n) => { return ifThenElse((modNum__0__n < 3), () => 1, () => (((modNum__0__fib)((modNum__0__n - 1))) + ((modNum__0__fib)((modNum__0__n - 2))))) });
	
	return (((modNum__0__n) => { return (((modNum__0____letVar1) => { return (((modNum__0____letVar2) => { return (((modNum__0____letVar3) => { return modNum__0____letVar3 })(((modNum__0__fib)(((modNum__0__n.$val) + 5))))) })((modNum__0__n.$val = ((modNum__0__n.$val) * 2)))) })((modNum__0__n.$val = ((modNum__0__n.$val) + 1)))) })({$val: ((modNum__0__obj["y"])["0"])}))
})() });
modNum__0__textC = createPrototype({}, {new: ((modNum__0__str) => { return createPrototype({}, {text: {$val: modNum__0__str}}) })});
modNum__0__objC = createPrototype(modNum__0__textC, {new: ((modNum__0__n) => { return createPrototype((((modNum__0__textC["new"]))("Hello")), {x: modNum__0__n, getX: ((modNum__0__self) => { return ((modNum__0__n) => { return (((((modNum__0____accessObj) => { return (((modNum__0____accessObj["id"]))(modNum__0____accessObj)) })(modNum__0__self)))(((((modNum__0__self["x"])["y"])["0"]) + modNum__0__n))) }) }), id: ((modNum__0__self) => { return ((modNum__0__x) => { return modNum__0__x }) })}) })});
modNum__0__obj = (((modNum__0__objC["new"]))(createPrototype({}, {y: createPrototype({}, {0: 4, 1: "ABC"})})));
modNum__0__area = ((modNum__0__shape) => { return matchCases(modNum__0__shape, [[ (constructor_) => constructor_.$constructor == "Square", (modNum__0____matchVar0) => { return (((({n: modNum__0__n}) => { return (modNum__0__n * modNum__0__n) }))(modNum__0____matchVar0)) } ], [ (constructor_) => constructor_.$constructor == "Circle", (modNum__0__cir) => { return ((3.14 * (modNum__0__cir["r"])) * (modNum__0__cir["r"])) } ]]) });
;
((println)(((((modNum__0__f)("My name is ")))(modNum__0__name))));
((((modNum__0__f)("a")))(null));
((println)(((modNum__0__fac)(10))));
((println)(((modNum__0__access)(createPrototype(modNum__0__obj, {s: "h", m: 3})))));
(((modNum__0__access)(createPrototype({}, {x: createPrototype({}, {y: createPrototype({}, {0: 4, 1: 7, 2: "XYZ"}), text: "No!"})}))) + 4);
((println)(((modNum__0__area)(makeCase("Square", createPrototype(modNum__0__obj, {n: modNum__0__n}))))));
(((modNum__0__double) => { return ((println)((((((modNum__0____accessObj) => { return (((modNum__0____accessObj["getX"]))(modNum__0____accessObj)) })(modNum__0__obj)))(((modNum__0__double)(1)))))) })(((modNum__0__n) => { return (modNum__0__n * 2) })));
let modNum__1__arrow;
modNum__1__arrow = 4;
;
