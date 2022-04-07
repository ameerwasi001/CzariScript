import { Span, SpannedError } from "./spans.ts"
import { assert_array_eq } from "./utils.ts"

class RefGraph {
    def: string
    dict: Record<string, Set<string>>
    defRelativePosition: Record<string, number>
    spans: Record<string, Span>
    unincludeables: Set<string>

    constructor() {
        this.def = ""
        this.unincludeables = new Set()
        this.spans = {}
        this.defRelativePosition = {}
        this.dict = {}
    }

    register(v: string, n: number) {
        this.defRelativePosition[v] = n
    }

    withNoneOf<A, B>(defs: Set<string>, a: A, f: (_1: A, _2: RefGraph) => B): B {
        for(const def of defs) this.unincludeables.add(def)
        const res = f(a, this)
        for(const def of defs) this.unincludeables.delete(def)
        return res
    }

    addEdge(v: string, span: Span) {
        this.spans[v] = span
        if(this.unincludeables.has(v)) return
        if(this.dict.hasOwnProperty(this.def)) this.dict[this.def].add(v)
        else this.dict[this.def] = new Set([v])
    }

    makeEdge(k: string, v: string, span: Span) {
        this.spans[v] = span
        if(this.dict.hasOwnProperty(k)) this.dict[k].add(v)
        else this.dict[k] = new Set([v])
    }

    runFromDef<A, B>(currentDef: string, span: Span, a: A, f: (_1: A, _2: RefGraph) => B): B {
        this.spans[currentDef] = span
        const oldDef = this.def
        this.def = currentDef
        const res = f(a, this)
        this.def = oldDef
        return res
    }

    ensureAcyclic() {
        const self = this
        const err = (cycle: Set<string>, currPoint: string) => {
            const cyclePoints: string[] = []
            let startAdding = false
            for(const cyclePoint of cycle) {
                if(cyclePoint == currPoint) startAdding = true
                if(startAdding) cyclePoints.push(cyclePoint)
            }
            return `${cyclePoints.join(" -> ")} -> ${currPoint}`
        }

        function go(point: string, visiting: Set<string>) {
            var points = self.dict[point]
            if(points == null || points == undefined) return
            for(const newPoint of points) {
                if(visiting.has(newPoint)) {
                    throw SpannedError.newN(
                        [[`${err(visiting, newPoint)} is a cycle`, self.spans[newPoint]] as [string, Span]].concat(
                            [...visiting].map((str): [string, Span] => [``, self.spans[str]])
                        )
                    )
                }
                visiting.add(newPoint);
                go(newPoint, visiting);
                visiting.delete(newPoint);
            }
        }

        for(const point in this.dict) {
            go(point, new Set())
        }
    }

    ensureDefinitions() {
        for(const k in this.dict) {
            const vs = this.dict[k]
            const pos = this.defRelativePosition[k]
            for(const v of vs) {
                if (this.defRelativePosition[v] == null || this.defRelativePosition[v] == undefined) SpannedError.new1(
                    `Undefined variable '${v}'`,
                    this.spans[v]
                )
                if (this.defRelativePosition[v] > pos) throw SpannedError.new2(
                    `'${v}' is referenced in ${k} before definition`,
                    this.spans[k],
                    "\nwhich is found here",
                    this.spans[v]
                )
            }
        }
    }

    topologicalSort() {
        const self = this
        function go(start: string, path: Set<string>, order: Set<string>): Set<string> {
            path.add(start)
            if(self.dict[start] != undefined) {
                for(const edge of self.dict[start]) {
                    if(!(path.has(edge))) go(edge, path, order)
                }
            }
            order.add(start)
            return path
        }

        const order = new Set<string>()
        for(const vertex in this.dict) {
            const edges = this.dict[vertex]
            if(!(order.has(vertex))) go(vertex, new Set(), order)
            for(const edge of edges) {
                go(edge, new Set(), order)
            }
        }
        return order
    }
}

const test1 = () => {
    const graph = new RefGraph()
    graph.dict = {
        "a": new Set(["b", "c"]),
        "b": new Set(["d", "c"]),
        "d": new Set(["c"]),
        "c": new Set([])
    }
    try {
        graph.ensureAcyclic()
    } catch {
        throw "Failed Test: test1 graph should be acyclic"
    }
    
}

const test2 = () => {
    const graph = new RefGraph()
    graph.dict = {
        "a": new Set(["b", "c"]),
        "b": new Set(["d", "c"]),
        "d": new Set(["c"]),
        "c": new Set(["a"])
    }
    try {
        graph.ensureAcyclic()
    } catch {return}
    throw `Test Failed: test2 should contain cycles`    
}

const test3 = () => {
    const graph = new RefGraph()
    graph.dict = {
        "b": new Set(["d", "e"]),
        "d": new Set([]),
        "a": new Set(["b", "c", "d"]),
        "c": new Set(["b", "d"]),
        "e": new Set()
    }
    const order = graph.topologicalSort()
    assert_array_eq([...order], ["d", "e", "b", "c", "a"])
}

const tests = [test1, test2, test3]

export { RefGraph, tests }