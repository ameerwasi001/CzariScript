import { println, ifThenElse, createPrototype, makeCase, matchCases, Eq__AnyCmp, Neq_AnyCmp } from "./runtime.js";

;
let modNum__2__arrow;
modNum__2__arrow = 4;
;
let modNum__1__n;
let modNum__1__name;
let modNum__1__x;
let modNum__1__f;
let modNum__1__fac;
let modNum__1__access;
let modNum__1__textC;
let modNum__1__objC;
let modNum__1__obj;
let modNum__1__area;
modNum__1__n = (9 + (10 * 2));
modNum__1__name = (("Am" + "ee") + "r");
modNum__1__x = (ifThenElse((modNum__1__n > 2), () => 1, () => 4) + 4);
modNum__1__f = ((modNum__1__x) => { return ((modNum__1__y) => { return ifThenElse(Eq__AnyCmp(modNum__1__y, null), () => modNum__1__x, () => (modNum__1__x + modNum__1__y)) }) });
modNum__1__fac = ((modNum__1__n) => { return ifThenElse((modNum__1__n < 2), () => 1, () => (modNum__1__n * ((modNum__1__fac)((modNum__1__n - 1))))) });
modNum__1__access = (({x: modNum__1__obj}) => { return (() => {
	let modNum__1__fib;
	
	modNum__1__fib = ((modNum__1__n) => { return ifThenElse((modNum__1__n < 3), () => 1, () => (((modNum__1__fib)((modNum__1__n - 1))) + ((modNum__1__fib)((modNum__1__n - 2))))) });
	
	return (((modNum__1__n) => { return (((modNum__1____letVar1) => { return (((modNum__1____letVar2) => { return (((modNum__1____letVar3) => { return modNum__1____letVar3 })(((modNum__1__fib)(((modNum__1__n.$val) + 5))))) })((modNum__1__n.$val = ((modNum__1__n.$val) * 2)))) })((modNum__1__n.$val = ((modNum__1__n.$val) + 1)))) })({$val: ((modNum__1__obj["y"])["0"])}))
})() });
modNum__1__textC = createPrototype({}, {new: ((modNum__1__str) => { return createPrototype({}, {text: {$val: modNum__1__str}}) })});
modNum__1__objC = createPrototype(modNum__1__textC, {new: ((modNum__1__n) => { return createPrototype((((modNum__1__textC["new"]))("Hello")), {x: modNum__1__n, getX: ((modNum__1__self) => { return ((modNum__1__n) => { return (((((modNum__1____accessObj) => { return (((modNum__1____accessObj["id"]))(modNum__1____accessObj)) })(modNum__1__self)))(((((modNum__1__self["x"])["y"])["0"]) + modNum__1__n))) }) }), id: ((modNum__1__self) => { return ((modNum__1__x) => { return modNum__1__x }) })}) })});
modNum__1__obj = (((modNum__1__objC["new"]))(createPrototype({}, {y: createPrototype({}, {0: 4, 1: "ABC"})})));
modNum__1__area = ((modNum__1__shape) => { return matchCases(modNum__1__shape, [[ (constructor_) => constructor_.$constructor == "Square", (modNum__1____matchVar0) => { return (((({n: modNum__1__n}) => { return (modNum__1__n * modNum__1__n) }))(modNum__1____matchVar0)) } ], [ (constructor_) => constructor_.$constructor == "Circle", (modNum__1__cir) => { return ((3.14 * (modNum__1__cir["r"])) * (modNum__1__cir["r"])) } ]]) });
;
((println)(((((modNum__1__f)("My name is ")))(modNum__1__name))));
((((modNum__1__f)("a")))(null));
((println)(((modNum__1__fac)(10))));
((println)(((modNum__1__access)(createPrototype(modNum__1__obj, {s: "h", m: 3})))));
(((modNum__1__access)(createPrototype({}, {x: createPrototype({}, {y: createPrototype({}, {0: 4, 1: 7, 2: "XYZ"}), text: "No!"})}))) + 4);
((println)(((modNum__1__area)(makeCase("Square", createPrototype(modNum__1__obj, {n: modNum__1__n}))))));
(((modNum__1__double) => { return ((println)((((((modNum__1____accessObj) => { return (((modNum__1____accessObj["getX"]))(modNum__1____accessObj)) })(modNum__1__obj)))(((modNum__1__double)(1)))))) })(((modNum__1__n) => { return (modNum__1__n * 2) })));
