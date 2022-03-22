import { println, ifThenElse, createPrototype, makeCase, matchCases, Eq__AnyCmp, Neq_AnyCmp } from "./runtime.js";

;
let arith__arrow;
let arith__add;
let arith__sub;
let arith__mult;
let arith__div;
let arith__inc;
arith__arrow = 4;
arith__add = ((arith__a) => { return ((arith__b) => { return (arith__a + arith__b) }) });
arith__sub = ((arith__a) => { return ((arith__b) => { return (arith__a - arith__b) }) });
arith__mult = ((arith__a) => { return ((arith__b) => { return (arith__a * arith__b) }) });
arith__div = ((arith__a) => { return ((arith__b) => { return (arith__a / arith__b) }) });
arith__inc = ((arith__add)(1));
;
const arith__exported__arrow = arith__arrow;
const arith__exported__inc = arith__inc;
const arith__exported__mult = arith__mult;
const arith__exported__div = arith__div;
let test__n;
let test__name;
let test__x;
let test__f;
let test__fac;
let test__access;
let test__textC;
let test__objC;
let test__obj;
let test__area;
let test__apply;
let test__flip;
test__n = (9 + (10 * 2));
test__name = (("Am" + "ee") + "r");
test__x = (ifThenElse((test__n > 2), () => 1, () => 4) + 4);
test__f = ((test__x) => { return ((test__y) => { return ifThenElse(Eq__AnyCmp(test__y, null), () => test__x, () => (test__x + test__y)) }) });
test__fac = ((test__n) => { return ifThenElse((test__n < 2), () => 1, () => (test__n * ((test__fac)((test__n - 1))))) });
test__access = (({x: test__obj}) => { return (() => {
	let test__fib;
	
	test__fib = ((test__n) => { return ifThenElse((test__n < 3), () => 1, () => (((test__fib)((test__n - 1))) + ((test__fib)((test__n - 2))))) });
	
	return (((test__n) => { return (((test_____letVar1) => { return (((test_____letVar2) => { return (((test_____letVar3) => { return test_____letVar3 })(((test__fib)(((test__n.$val) + 5))))) })((test__n.$val = ((test__n.$val) * 2)))) })((test__n.$val = ((test__n.$val) + 1)))) })({$val: ((test__obj["y"])["0"])}))
})() });
test__textC = createPrototype({}, {new: ((test__str) => { return createPrototype({}, {text: {$val: test__str}}) })});
test__objC = createPrototype(test__textC, {new: ((test__n) => { return createPrototype((((test__textC["new"]))("Hello")), {x: test__n, getX: ((test__self) => { return ((test__n) => { return (((((test_____accessObj) => { return (((test_____accessObj["id"]))(test_____accessObj)) })(test__self)))(((((test__self["x"])["y"])["0"]) + test__n))) }) }), id: ((test__self) => { return ((test__x) => { return test__x }) })}) })});
test__obj = (((test__objC["new"]))(createPrototype({}, {y: createPrototype({}, {0: 4, 1: "ABC"})})));
test__area = ((test__shape) => { return matchCases(test__shape, [[ (constructor_) => constructor_.$constructor == "Square", (test_____matchVar0) => { return (((({n: test__n}) => { return (test__n * test__n) }))(test_____matchVar0)) } ], [ (constructor_) => constructor_.$constructor == "Circle", (test__cir) => { return ((3.14 * (test__cir["r"])) * (test__cir["r"])) } ]]) });
test__apply = ((test__f) => { return ((test__a) => { return ((test__f)(test__a)) }) });
test__flip = ((test__f) => { return ((test__x) => { return ((test__y) => { return ((((test__f)(test__y)))(test__x)) }) }) });
;
((println)(((((test__f)("My name is ")))(test__name))));
((((test__f)("a")))(null));
((println)(((test__fac)(10))));
((println)(((test__access)(createPrototype(test__obj, {s: "h", m: 3})))));
(((test__access)(createPrototype({}, {x: createPrototype({}, {y: createPrototype({}, {0: 4, 1: 7, 2: "XYZ"}), text: "No!"})}))) + 4);
((println)(((test__area)(makeCase("Square", createPrototype(test__obj, {n: test__n}))))));
(((test__double) => { return ((println)((((((test_____accessObj) => { return (((test_____accessObj["getX"]))(test_____accessObj)) })(test__obj)))(((test__double)(((((test__apply)(((((test__flip)(arith__exported__div)))(4)))))(arith__exported__arrow)))))))) })(((test__n) => { return (test__n * 2) })));
