import { Span, SpannedError } from "./spans.ts"

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
}

export { RefGraph }