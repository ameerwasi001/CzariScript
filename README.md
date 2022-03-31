# CzariScript
The CzariScript is a type system that supports subtype inference with parametric polymorphism, classes, objects, and single inheritance.

## Structure of CzariScript
A CzariScript program contains a sequence of definitions, and expressions separated by semicolons. The definitions are all evaluated before expressions. Here's an example of a CzariScript program.
```
x = 1;
y = "abc";
println x;
```

## Literals
CzariScript has all the literal you would expect from a language of its kind. Here are the literals this language supports `1`, `"ABC"`, `true`, `false`, tuples, and records.

## If statements
```
if x then "a" else "b"
```
This does what you think it does, but the most important part is that you can have different types in the then-expression and else-expression. This would theoretically work like this.
```
if x then 1 else "a"
```

## Functions
Functions can be defined by using a lambda like such `\x -> x` but a named function may also be defined like such `f x = x`. All functions in CzariScript take one argument and return one result but functions are automatically curried. Here's an example `f x y = x + y` which just `f = \x -> \y -> x + y`.

## Applications
Functions can be applied like such `f 1 2` which of course only works for curried functions. In this particular example, this code would return `3` where `f x y = x + y`

## Records
Records and Tuples are one and same in CzariScript, and you may use the following syntax for them. `{a: 3, b: 4}` which defines a record with fields `a`, and `b` having values `3`, and `4` respectively, while `{1, 3}` defines a record with fields `0`, and `1` with values `1`, and `3`, which is a tuple as far as the compiler is concerned. For syntactical convenience, it may be written as `(1, 3)`.

## Record inheritance
A record can inherit from another record, here's an example.
```
obj = {a: 3}
objExtended = {b: 2 with obj}
```

## Classes
Following is how you define classes
```
objC = class n so
    x = n;
end;
```

Here the class takes one argument named `n` and returns a record with fields `{x: n}`. You define a method like this
```
getX self n = self.x + n
```
which can be called like such `obj:getX 2`. Classes may also define static methods as such
```
static fromNothing _ = objC.new 0
```

## Class Inheritance
Classes can inherit from other classes both on the object and the class level. Here's how inheritance works
```
class n with textC::textC.new "Hello"...
```
Here the `textC` before `::` shows what to inherit from, on the class level, and the expression after the `::` shows what to inherit at the object level, in this case, it is the same thing.

## Let & Where
`let` and `where` both define some value that goes through the process of Let-generalisation but the difference between them is that the latter allows recursive definition while the former does not. The syntax for `let` is 
```
let f x = x*2 in f 10
```
while the syntax of `where` is 
```
fac 10 where fac n = if n = 1 then 1 else n*fac(n-1)
```

## A series of actions
CzariScript like OCaml is anything but a pure language so you do need to perform multiple actions in a definition and here's how you'd do that.
```
let something = do
    println "Hello!";
    let name = "Name"
    println ("How are you " & name & "?")
end
```

One of the primary use-cases of this is when you deal with a mutable reference.

## References
A reference in CzariScript is something that can be mutated from any function in the codebase. You can create with syntax inspired by Pascal style reference with `@expression`, dereference with `expression^`, and assignment with `expression ^= another_expression`.

## Module System
Here's the simple module system of CzariScript. You can import files with `import FileName` where the name should be specified with a capital letter in the beginning. These modules may export their definitions with the syntax of `export {x: something, y: anotherThing}` or `export {something, anotherThing}`.
