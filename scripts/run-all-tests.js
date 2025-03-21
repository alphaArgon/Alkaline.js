/*
 *  run-all-tests.js
 *  Alkaline
 *
 *  Created by alpha on 2025/3/21.
 *  Copyright © 2025 alphaArgon.
 */

import FS from "fs";
import Path from "path";
import { spawnSync } from "child_process";


//  Run all test cases in the given directory.

let dotExt = /\.test\.[jt]s$/;

let testDir = process.argv[2];

if (!testDir) {
    console.log("Usage: node run-all-tests.js <test-directory>");
    process.exit(1);
}

let first = true;

for (let file of FS.readdirSync(testDir).sort()) {
    if (!dotExt.test(file)) {continue;}

    let fullPath = Path.resolve(testDir, file);

    //  We don’t have lots of tests, so it’s OK to run them serially.
    if (!first) {console.log();} else {first = false;}
    console.log(`Running ${Path.relative(process.cwd(), fullPath)}:`);

    //  `tsx` is required as a dev dependency.
    let status = spawnSync("npx", ["tsx", fullPath], {stdio: "inherit"}).status;
    if (status === 0) {continue;}

    //  The result should already been printed, so we just exit early.
    process.exit(status);
}
