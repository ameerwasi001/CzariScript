import { println, ifThenElse, createPrototype, makeCase, matchCases, Eq__AnyCmp, Neq_AnyCmp } from "./runtime.js";

;
let modNum__arith__arrow;
modNum__arith__arrow = 4;
;
let modNum__test__n;
let modNum__test__name;
let modNum__test__x;
let modNum__test__f;
let modNum__test__fac;
let modNum__test__access;
let modNum__test__textC;
let modNum__test__objC;
let modNum__test__obj;
let modNum__test__area;
modNum__test__n = (9 + (10 * 2));
modNum__test__name = (("Am" + "ee") + "r");
modNum__test__x = (ifThenElse((modNum__test__n > 2), () => 1, () => 4) + 4);
modNum__test__f = ((modNum__test__x) => { return ((modNum__test__y) => { return ifThenElse(Eq__AnyCmp(modNum__test__y, null), () => modNum__test__x, () => (modNum__test__x + modNum__test__y)) }) });
modNum__test__fac = ((modNum__test__n) => { return ifThenElse((modNum__test__n < 2), () => 1, () => (modNum__test__n * ((modNum__test__fac)((modNum__test__n - 1))))) });
modNum__test__access = (({x: modNum__test__obj}) => { return (() => {
	let modNum__test__fib;
	
	modNum__test__fib = ((modNum__test__n) => { return ifThenElse((modNum__test__n < 3), () => 1, () => (((modNum__test__fib)((modNum__test__n - 1))) + ((modNum__test__fib)((modNum__test__n - 2))))) });
	
	return (((modNum__test__n) => { return (((modNum__test____letVar1) => { return (((modNum__test____letVar2) => { return (((modNum__test____letVar3) => { return modNum__test____letVar3 })(((modNum__test__fib)(((modNum__test__n.$val) + 5))))) })((modNum__test__n.$val = ((modNum__test__n.$val) * 2)))) })((modNum__test__n.$val = ((modNum__test__n.$val) + 1)))) })({$val: ((modNum__test__obj["y"])["0"])}))
})() });
modNum__test__textC = createPrototype({}, {new: ((modNum__test__str) => { return createPrototype({}, {text: {$val: modNum__test__str}}) })});
modNum__test__objC = createPrototype(modNum__test__textC, {new: ((modNum__test__n) => { return createPrototype((((modNum__test__textC["new"]))("Hello")), {x: modNum__test__n, getX: ((modNum__test__self) => { return ((modNum__test__n) => { return (((((modNum__test____accessObj) => { return (((modNum__test____accessObj["id"]))(modNum__test____accessObj)) })(modNum__test__self)))(((((modNum__test__self["x"])["y"])["0"]) + modNum__test__n))) }) }), id: ((modNum__test__self) => { return ((modNum__test__x) => { return modNum__test__x }) })}) })});
modNum__test__obj = (((modNum__test__objC["new"]))(createPrototype({}, {y: createPrototype({}, {0: 4, 1: "ABC"})})));
modNum__test__area = ((modNum__test__shape) => { return matchCases(modNum__test__shape, [[ (constructor_) => constructor_.$constructor == "Square", (modNum__test____matchVar0) => { return (((({n: modNum__test__n}) => { return (modNum__test__n * modNum__test__n) }))(modNum__test____matchVar0)) } ], [ (constructor_) => constructor_.$constructor == "Circle", (modNum__test__cir) => { return ((3.14 * (modNum__test__cir["r"])) * (modNum__test__cir["r"])) } ]]) });
;
((println)(((((modNum__test__f)("My name is ")))(modNum__test__name))));
((((modNum__test__f)("a")))(null));
((println)(((modNum__test__fac)(10))));
((println)(((modNum__test__access)(createPrototype(modNum__test__obj, {s: "h", m: 3})))));
(((modNum__test__access)(createPrototype({}, {x: createPrototype({}, {y: createPrototype({}, {0: 4, 1: 7, 2: "XYZ"}), text: "No!"})}))) + 4);
((println)(((modNum__test__area)(makeCase("Square", createPrototype(modNum__test__obj, {n: modNum__test__n}))))));
(((modNum__test__double) => { return ((println)((((((modNum__test____accessObj) => { return (((modNum__test____accessObj["getX"]))(modNum__test____accessObj)) })(modNum__test__obj)))(((modNum__test__double)(1)))))) })(((modNum__test__n) => { return (modNum__test__n * 2) })));
