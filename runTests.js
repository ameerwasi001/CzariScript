import * as reachabilityModule from "./reachability.ts"
import * as typeChkModule from "./typeCheck.ts"

const test = modules => {
    for(const module of modules) {
        for(const test of module.tests) test()
    }
}

test([reachabilityModule, typeChkModule])