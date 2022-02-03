import { assert_lte, clear_arr } from "./utils.ts"

const splitAt = (x: string, index: number): [string, string] => [x.slice(0, index), x.slice(index)]

const rsplit = (self: string, sep: string, maxsplit=1) => {
    const split = self.split(sep);
    return maxsplit ? [ split.slice(0, -maxsplit).join(sep) ].concat(split.slice(-maxsplit)) : split;
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
        let [before, newSource] = splitAt(source, 1)
        source = newSource

        const tok = splitAt(source, r-1)[0].split("\n")[0]
        const after = splitAt(source, tok.length - 1)[1]

        let bIter = rsplit(before, "\n")
        let lineBefore = bIter[0]
        let aIter = after.split("\n")
        let lineAfter = after[0]
        let n = 0

        if (bIter.length <= 1) {
            if (bIter.length <= 2) {
                out += bIter[2]
                out += "\n"
                n = 2
            }
            out += bIter[1]
            out += "\n"
            n = 1
        }

        out += lineBefore
        out += tok
        out += lineAfter

        out += " ".repeat(lineBefore.length)
        out += "^"
        out += "~".repeat(Math.max(1, tok.length) - 1)
        out += " ".repeat(lineAfter.length)
        out += "\n"

        for(let i = 0; i <= 2; i++) {
            n++
            if (!(aIter.length <= n)) {
                out += aIter[n]
                out += "\n"
            }
        }

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
        if (this.pool.has(`[${l}, ${r}]`)) return this.pool.get(`[${l}, ${r}]`)
        else {
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

    print(sm: SpanManager){
        let out = "";
        for (const [msg, span] of this.pairs) {
            out += msg;
            out += "\n";
            out += sm.print(span);
        }
        return out
    }

    display(): {success: true, value: []} | {success: false, value: string} {
        return {success: true, value: []}
    }
}

export type { Span }
export { SpannedError }