/*
 *  loader-register.cjs
 *  Alkaline
 *
 *  Created by alpha on 2025/3/22.
 *  Copyright © 2025 alphaArgon.
 */

import { register } from "node:module";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

register(
    resolve(import.meta.dirname, "loader.js"),
    pathToFileURL(import.meta.dirname)
);
