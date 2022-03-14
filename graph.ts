import { Span } from "./spans.ts"

class Graph {
    dict: Record<string, Set<string>>

    constructor() {
        this.dict = {}
    }

    addEdge(k: string, v: string) {
        if(this.dict.hasOwnProperty(k)) this.dict[k].add(v)
        else this.dict[k] = new Set([v])
    }

    isAdjacent(a: string, b: string) {
        if(!(this.dict.hasOwnProperty(a))) return false
        return this.dict[a].has(b)
    }
}

class RefGraph {
    def: string
    dict: Record<string, Set<string>>
    spans: Record<string, Span>
    unincludeables: Set<string>

    constructor() {
        this.def = ""
        this.unincludeables = new Set()
        this.spans = {}
        this.dict = {}
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

    isAdjacent(a: string, v: string) {
        if(!(this.dict.hasOwnProperty(a))) return false
        return this.dict[a].has(v)
    }

    runFromDef<A, B>(currentDef: string, span: Span, a: A, f: (_1: A, _2: RefGraph) => B): B {
        this.spans[currentDef] = span
        const oldDef = this.def
        this.def = currentDef
        const res = f(a, this)
        this.def = oldDef
        return res
    }
}

export { Graph, RefGraph }