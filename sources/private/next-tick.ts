/*
 *  next-tick.ts
 *  Alkaline
 *
 *  Created by alpha on 2025/3/26.
 *  Copyright © 2025 alphaArgon.
 */


let supportMicrotask: boolean = true;

try {let _ = queueMicrotask;}
catch {supportMicrotask = false;}


/** Polyfill for `queueMicrotask` or `process.nextTick`. */
export function nextTick(callback: () => void): void {
    if (supportMicrotask) {
        queueMicrotask(callback);
    } else {
        Promise.resolve().then(callback);
    }
}
