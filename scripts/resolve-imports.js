/*
 *  resolve-imports.js
 *  Alkaline
 *
 *  Created by alpha on 2025/3/21.
 *  Copyright © 2025 alphaArgon.
 */

import FS from "fs";
import Path from "path";


//  Check all relative imports (starting with `./`) in the given file, and add the extension
//  if missing.


//  Currently our codes are well-formatted. Using an AST is too heavy.
let importFromDot = /((import|export)\b.*?\bfrom\b.*?)(\"\.\.?\/.*?\"|\'\.\.?\/.*?\')/g;


for (let fileName of process.argv.slice(2)) {
    await resolveImports(fileName);
}


async function resolveImports(filePath) {
    let dirPath = Path.dirname(filePath);
    let content = await FS.promises.readFile(filePath, "utf-8");

    let anyResolved = false;

    content = content.replace(importFromDot, (_, import_from, __, quoted) => {
        let relativePath = dequote(quoted);
        let foundPath = findImportPath(dirPath, relativePath);
        if (foundPath === null) {
            console.error(`Cannot resolve "${relativePath}" from "${filePath}"`);
            process.exit(1);
        }

        if (relativePath !== foundPath) {
            anyResolved = true;
        }

        return import_from + enquote(foundPath);
    });

    if (anyResolved) {
        await FS.promises.writeFile(filePath, content);
    }
}


function findImportPath(dirPath, relativePath) {
    for (let suffix of ["", ".js", ".ts", "/index.js", "/index.ts"]) {
        let withExt = relativePath + suffix;
        let fullPath = Path.resolve(dirPath, withExt);
        if (FS.existsSync(fullPath) && !FS.lstatSync(fullPath).isDirectory()) {
            return withExt;
        }
    }

    return null;
}


function dequote(string) {
    if (string[0] === `'`) {
        string = `"` + string.slice(1, -1) + `"`;
    }

    return JSON.parse(string);
}


function enquote(string) {
    return JSON.stringify(string);
}
