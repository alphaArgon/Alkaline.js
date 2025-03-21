/*
 *  generate-umbrella.js
 *  Alkaline
 *
 *  Created by alpha on 2025/3/21.
 *  Copyright © 2025 alphaArgon.
 */

import FS from "fs";
import Path from "path";


//  Generate an umbrella header — a file that exports all the public modules in the given directory.

let dotExt = /\.test\.[jt]s$/;


let outPath = process.argv[2];
let searchDir = process.argv[3];

if (!outPath || !searchDir) {
    console.log("Usage: node generate-umbrella.js <output-path> <search-directory>");
    process.exit(1);
}

let outDir = Path.dirname(outPath);
let relativePath = Path.relative(outDir, searchDir);

let lines = [];

for (let file of FS.readdirSync(searchDir).sort()) {
    if (file[0] === "." || file[0] === "_" || !dotExt.test(file)) {continue;}
    if (file.endsWith(".d.ts")) {continue;}

    lines.push(`export * from "./${relativePath}/${file}";`);
}

await FS.promises.writeFile(outPath, lines.join("\n"));
