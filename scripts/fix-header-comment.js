/*
 *  fix-header-comment.js
 *  Alkaline
 *
 *  Created by alpha on 2025/3/20.
 *  Copyright © 2025 alphaArgon.
 */

import FS from "fs";
import Path from "path";


//  Search for all `.ts`/`.js` file in the given directory or its subdirectories,
//  set the second line of the file to the relative path to the given directory.

let projName = "";
let dotExt = /\.test\.[jt]s$/;

async function unifyHeaderOfFile(basePath, components) {
    let relativePath = components.join("/");
    let fullPath = Path.resolve(basePath, relativePath);

    let content = await FS.promises.readFile(fullPath, "utf-8");
    let lines = content.split("\n");
    if (lines.length < 3 || !(lines[1].startsWith(" *  "))) {
        console.log(`Unrecognized file header: "${fullPath}"`);
        return;
    }

    lines[1] = ` *  ${relativePath}`;
    lines[2] = ` *  ${projName}`;

    await FS.promises.writeFile(fullPath, lines.join("\n"));
}

function unifyHeaderInDirectory(basePath, components) {
    let selfPath = Path.resolve(basePath, components.join("/"));
    let files = FS.readdirSync(selfPath);

    for (let file of files) {
        if (file === "node_modules") {continue;}
        if (file.startsWith(".")) {continue;}

        let isDir = FS.statSync(Path.resolve(selfPath, file)).isDirectory();

        if (isDir) {
            components.push(file);
            unifyHeaderInDirectory(basePath, components);
            components.pop();
        } else if (dotExt.test(file)) {
            components.push(file);
            unifyHeaderOfFile(basePath, components);
            components.pop();
        }
    }
}


for (let i = 2; i < process.argv.length; ++i) {
    switch (process.argv[i]) {
    case "-d":
        if (i === process.argv.length - 1) {
            console.log("Error: -d must be followed by a directory path");
            process.exit(1);
        }

        let basePath = process.argv[++i];
        unifyHeaderInDirectory(basePath, []);
        break;

    case "-n":
        if (i === process.argv.length - 1) {
            console.log("Error: -n must be followed by a project name");
            process.exit(1);
        }

        projName = process.argv[++i];
        break;

    default:
        console.log("Error: unknown option", process.argv[i]);
        process.exit(1);
    }
}

if (projName === "") {
    console.log("Error: project name is not specified");
    process.exit(1);
}
