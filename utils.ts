class OrderedSet<T> {
    v: Array<T>;
    s: Set<T>;
 
    constructor() {
        this.v = []
        this.s = new Set()
    }

    insert(value: T) {
        if (this.s.has(value)) return false
        this.s.add(value)
        this.v.push(value)
        return true
    }

    has(value: T) {
        return this.s.has(value)
    }

    *iter() {
        for(const val of this.v) yield val
    }

    clone(): OrderedSet<T> {
        const newOrderedSet: OrderedSet<T> = new OrderedSet()
        for(const val of this.iter()) {
            newOrderedSet.insert(val)
        }
        return newOrderedSet
    }
}

const clear_arr = <T>(arr: Array<T>) => {
    while (arr.length > 0) {
        arr.pop()
    }
}

const assert_array_eq = <T>(a: T, b: T) => {
    const ax = JSON.stringify(a)
    const bx = JSON.stringify(b)
    if (ax != bx) {
        throw `${ax} is asserted equal to be ${bx} but that is false`
    }
}

const assert_eq = <T>(a: T, b: T) => {
    if (a != b) {
        throw `${a} is asserted equal to be ${b} but that is false`
    }
}

const assert_lte = (a: number, b: number) => {
    if (a <= b) {
        throw `${a} is asserted less than or equal to ${b} but that is false`
    }
}

export {OrderedSet, assert_array_eq, assert_lte, assert_eq, clear_arr}