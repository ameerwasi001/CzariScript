import { OrderedSet, assert_array_eq, clear_arr } from "./utils.ts"

type ID = number

class Reachability {
    upsets: Array<OrderedSet<ID>>;
    downsets: Array<OrderedSet<ID>>;

    constructor() {
        this.upsets = []
        this.downsets = []
    }

    addNode(): ID {
        const i = this.upsets.length
        this.upsets.push(new OrderedSet())
        this.downsets.push(new OrderedSet())
        return i
    }

    addEdge(lhs: ID, rhs: ID, out: Array<[ID, ID]>) {
        const work: Array<[ID, ID]> = [[lhs, rhs]]
        while (work.length > 0) {
            const unit = work.pop()
            if(unit == undefined) break
            const [lhs, rhs] = unit
            if (!(this.downsets[lhs].insert(rhs))) continue
            this.upsets[rhs].insert(lhs)
            out.push([lhs, rhs])
            for(const lhs2 of this.upsets[lhs].iter()) {
                work.push([lhs2, rhs])
            }
            for(const rhs2 of this.downsets[rhs].iter()) {
                work.push([lhs, rhs2])
            }
        }
    }
}

const test = () => {
    const r = new Reachability()
    for(const _ of new Array(10).fill(0)) r.addNode()
    const out: Array<[ID, ID]> = []
    r.addEdge(0, 8, out)
    assert_array_eq(out, [[0, 8]])

    clear_arr(out)
    r.addEdge(0, 8, out)
    assert_array_eq(out, [])

    r.addEdge(0, 3, out)
    r.addEdge(1, 3, out)
    r.addEdge(2, 3, out)
    r.addEdge(4, 5, out)
    r.addEdge(4, 6, out)
    r.addEdge(4, 7, out)
    r.addEdge(6, 7, out)
    r.addEdge(9, 1, out)
    r.addEdge(9, 8, out)

    clear_arr(out)
    r.addEdge(3, 4, out)

    const expected = [];
    for (const lhs of [0, 1, 2, 3, 9]) {
        for (const rhs of [4, 5, 6, 7]) {
            expected.push([lhs, rhs]);
        }
    }

    const sortedOut = out.sort()
    const sortedExpected = expected.sort()
    assert_array_eq(sortedOut, sortedExpected)
}

const tests = [test]

export { Reachability, tests }