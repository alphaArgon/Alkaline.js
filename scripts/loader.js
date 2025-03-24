/*
 *  loader.cjs
 *  Alkaline
 *
 *  Created by alpha on 2025/3/22.
 *  Copyright © 2025 alphaArgon.
 */

import FS, { readSync } from "fs";
import Path from "path";
import { ModuleKind, transpileModule, findConfigFile, readConfigFile, parseJsonConfigFileContent, sys, isImportDeclaration, isExportDeclaration, isStringLiteral, visitEachChild, visitNode } from "typescript";
import { fileURLToPath } from "url";


/** @param { string } dirPath
  * @param { string } specifier */
export function resolveImportSpecifier(dirPath, specifier) {
    if (!isRelativePath(specifier)) {
        return specifier;
    }

    for (let suffix of ["", ".js", ".ts", "/index.js", "/index.ts"]) {
        let withExt = specifier + suffix;
        let fullPath = Path.resolve(dirPath, withExt);
        if (FS.existsSync(fullPath) && !FS.lstatSync(fullPath).isDirectory()) {
            return withExt;
        }
    }

    return specifier;
}

/** @param { string } specifier
  * @param { import("module").ResolveHookContext } context */
export function resolve(specifier, context, nextResolve) {
    let parentPath = context.parentURL ? checkFileURL(context.parentURL) : null;
    if (parentPath) {
        let dirPath = Path.dirname(parentPath)
        specifier = resolveImportSpecifier(dirPath, specifier);
    }

    return nextResolve(specifier, context);
}

/** @param { string } url
  * @param { import("module").LoadHookContext } context */
export function load(url, context, nextLoad) {
    let path = checkFileURL(url);
    if (path === null || Path.extname(path) !== ".ts") {
        return nextLoad(url, context);
    }

    let options = {
        fileName: path,
        compilerOptions: {
            module: ModuleKind.ESNext,
            sourceMap: true,
        }
    };
    
    let config = findTSConfig(path);
    if (config !== null) {
        options.compilerOptions = {
            ...config.content.options,
            ...options.compilerOptions,
        };

        let aliasesMap = options.compilerOptions.paths;
        if (aliasesMap !== undefined) {
            //  FIXME: What if tsconfig.json is not in the root directory?
            let basePath = Path.dirname(config.path);
            if (options.compilerOptions.baseUrl) {
                basePath = Path.resolve(basePath, options.compilerOptions.baseUrl);
            }

            let dirPath = Path.dirname(path);

            options.transformers = {
                before: [rewritePathAliasesOf(basePath, dirPath, aliasesMap)]
            };
        }
    }

    let source = FS.readFileSync(path, "utf8");
    let result = transpileModule(source, options);

    let base64 = Buffer.from(result.sourceMapText).toString("base64");
    let appendix = "\n//# sourceMappingURL=data:application/json;base64," + base64;
    let transpiled = result.outputText + appendix;

    return {
        format: "module",
        shortCircuit: true,
        source: transpiled,
    };
}


function checkFileURL(urlString) {
    try {
        return fileURLToPath(urlString);
    } catch {
        return null;
    }
}


function findTSConfig(searchPath) {
    let configPath = findConfigFile(searchPath, sys.fileExists);
    if (!configPath) {return null;}

    let parsed = parseJsonConfigFileContent(
        readConfigFile(configPath, sys.readFile).config,
        {
            fileExists: sys.fileExists,
            readFile: sys.readFile,
            readDirectory: sys.readDirectory,
            useCaseSensitiveFileNames: true
        },
        process.cwd()
    );

    return {path: configPath, content: parsed};
}


function isRelativePath(path) {
    if (path === "." || path === "..") {return true;}
    if (path.startsWith("./") || path.startsWith("../")) {return true;}
    return false;
}


/** @param { string } basePath
  * @param { string } dirPath
  * @param { Record<string, string[]> } aliasesMap  */
function rewritePathAliasesOf(basePath, dirPath, aliasesMap) {

    /** @type { [string, boolean, string][] } */
    let filteredMap = Object.entries(aliasesMap).map(([pattern, replacements]) => {
        let replacement = replacements[0];
        if (replacement === undefined) {return null;}
        
        if (isRelativePath(replacement)) {
            replacement = Path.relative(dirPath, Path.resolve(basePath, replacement));
        }

        if (!pattern.endsWith("/*")) {
            return [pattern, false, replacement];

        } else {
            pattern = pattern.slice(0, -1);
            let i = replacement.indexOf("/*");
            if (i !== -1) {replacement = replacement.slice(0, i + 1);}
            return [pattern, true, replacement];
        }

    }).filter(e => e !== null);

    /** @param { import("typescript").TransformationContext } context
      * @returns { import("typescript").Transformer<import("typescript").Node> } */
    return (context) => {

        function checkNode(node) {
            if (!isImportDeclaration(node) && !isExportDeclaration(node)) {
                return visitEachChild(node, checkNode, context);
            }
    
            if (node.moduleSpecifier === undefined || !isStringLiteral(node.moduleSpecifier)) {
                return node;
            }

            let specifier = node.moduleSpecifier.text;
            let rewritten = specifier;

            for (let [pattern, asPrefix, replacement] of filteredMap) {
                if (!asPrefix) {
                    if (specifier === pattern) {
                        rewritten = replacement;
                        break;
                    }
                } else {
                    if (specifier.startsWith(pattern)) {
                        rewritten = replacement + specifier.slice(pattern.length);
                        break;
                    }
                }
            }

            if (rewritten === specifier) {return node;}
            
            if (isImportDeclaration(node)) {
                return context.factory.updateImportDeclaration(
                    node,
                    node.modifiers,
                    node.importClause,
                    context.factory.createStringLiteral(rewritten),
                    node.attributes
                );

            } else {
                return context.factory.updateExportDeclaration(
                    node,
                    node.modifiers,
                    node.isTypeOnly,
                    node.exportClause,
                    context.factory.createStringLiteral(rewritten),
                    node.attributes
                );
            }
        }
    
        return root => visitNode(root, checkNode);
    }
}
