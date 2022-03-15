import { assert_lte, clear_arr } from "./utils.ts"
  
const splitAt = (str: string, n: number): [string, string] => {
    const arr = str.split("")
    var selected: string[] = [];
    var others: string[] = [];
    for (let i = 0; i < arr.length; i++) {
        (i <= n ? selected : others).push(arr[i])
    }
    return [selected.join(""), others.join("")]
}

const rsplit = (self: string, sep: string, maxsplit=1) => {
    const split = self.split(sep);
    const ans = maxsplit ? [ split.slice(0, -maxsplit).join(sep) ].concat(split.slice(-maxsplit)) : split;
    while(ans[0] == "") ans.shift()
    while(ans[ans.length-1] == "") ans.pop()
    return ans
}

const split = (self: string, sep: string) => self.split(sep)

const trim = (self: string[]) => {
    const ans = [...self]
    while(ans[0] == "") ans.shift()
    while(ans[ans.length-1] == "") ans.pop()
    return ans
}

type Span = {type: "span", size: number}
type Spanned<T> = [T, Span]
interface HasToString {
    toString(): string
}

class SpanManager {
    sources: string[]; 
    spans: [number, number, number][]

    constructor(){
        this.sources = []
        this.spans = []
    }

    addSource(source: string){
        const i = this.sources.length
        this.sources.push(source)
        return new SpanMaker(this, i, new Map())
    }

    newSpan(sourceIndex: number, l: number, r: number): Span {
        const i = this.spans.length
        this.spans.push([sourceIndex, l, r])
        return {type: "span", size: i}
    }

    print(span: Span) {
        const unit = this.spans[span.size]
        if (unit == undefined) throw "In SpanManager print! unit should not be undefined"
        const [source_ind, l, r] = unit
        let source = this.sources[source_ind]
        let out = ""
        assert_lte(l, r)
        let lineNo = 0
        let charNo = 0
        let col = l == r ? 0 : -1
        let found = true
        const lines = []
        for(const line of trim(source.split("\n"))) {
            if(found) lineNo += 1
            const origChanNo = charNo
            charNo += line.length+1
            if (charNo >= l && found) {
                lines.push(line + "\n")
                col += l - origChanNo
                found = false
            }
        }
        out += `In line no: ${lineNo.toString()}, on coulmn ${(col+1).toString()}\n`
        out += lines.join("\n")
        out += " ".repeat(col)
        out += "^"
        if(r-l != 0) out += "_".repeat(r-l-1) + "\n"
        return out
    }
}

class SpanMaker {
    parent: SpanManager
    sourceIndex: number
    pool: Map<string, Span>

    constructor(parent: SpanManager, sourceIndex: number, pool: Map<string, Span>){
        this.parent = parent
        this.sourceIndex = sourceIndex
        this.pool = pool
    }

    span(l: number, r: number) {
        const sourceIndex = this.sourceIndex
        const parent = this.parent
        if (this.pool.has(`[${l}, ${r}]`)) {
            const val = this.pool.get(`[${l}, ${r}]`)
            if (val == undefined) throw "val should not be undefined in span from SpanMaker class"
            return val
        } else {
            const span = parent.newSpan(sourceIndex, l, r)
            this.pool.set(`[${l}, ${r}]`, span)
            return span
        }
    }
}

class SpannedError {
    pairs: [string, Span][]

    constructor(pairs: [string, Span][]){
        this.pairs = pairs
    }

    static new1(s1: HasToString, s2: Span): SpannedError {
        const p1: [string, Span] = [s1.toString(), s2]
        return new SpannedError([p1])
    }

    static new2(s1: HasToString, s2: Span, s3: HasToString, s4: Span): SpannedError {
        const p1: [string, Span] = [s1.toString(), s2];
        const p2: [string, Span] = [s3.toString(), s4];
        return new SpannedError([p1, p2])
    }

    static newN(xs: [HasToString, Span][]): SpannedError {
        return new SpannedError(xs.map(([str, span]) => [str.toString(), span]))
    }

    print(sm: SpanManager){
        let out = "";
        for (const [msg, span] of this.pairs) {
            out += msg
            out += "\n"
            out += sm.print(span)
        }
        return out
    }

    display(): {success: true, value: []} | {success: false, value: string} {
        return {success: true, value: []}
    }
}

const cloneSpan = (span: Span): Span => {
    return {type: "span", size: span.size}
}

export type { Span, Spanned }
export { SpanManager, SpanMaker, SpannedError, cloneSpan }