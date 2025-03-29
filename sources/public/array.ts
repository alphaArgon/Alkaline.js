/*
 *  array.ts
 *  Alkaline
 *
 *  Created by alpha on 2025/3/7.
 *  Copyright © 2025 alphaArgon.
 */

import { isInStrictMode } from "$alkaline.private/es-utils";


/** Returns whether the given two arrays are equal compared by the given function. */
export function arrayEquals<T>(a: readonly T[], b: readonly T[], equals: (a: T, b: T) => boolean): boolean {
    let aLength = a.length, bLength = b.length;
    if (aLength !== bLength) {return false;}

    for (let i = 0; i < aLength; ++i) {
        if (!equals(a[i], b[i])) {return false;}
    }

    return true;
}


/** Removes all the elements passing the given predicate from the array. */
export function arrayRemove<T>(array: T[], predicate: (element: T) => boolean): void {
    let j = 0;
    for (let i = 0; i < array.length; ++i) {
        let element = array[i];
        if (!predicate(element)) {
            array[j++] = element;
        }
    }

    array.length = j;
}


/** Shuffles the elements of the array in place. */
export function arrayShuffle<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; --i) {
        let j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}


/** Returns a new array containing non-nullish transformed elements. */
export function arrayCompactMap<T, U>(array: readonly T[], transform: (element: T, index: number, array: readonly T[]) => U | null | undefined): NonNullable<U>[];
export function arrayCompactMap<T, U, This>(array: readonly T[], transform: (this: This, element: T, index: number, array: readonly T[]) => U | null | undefined, thisArg: This): NonNullable<U>[];
export function arrayCompactMap<T, U>(array: readonly T[], transform: (element: T, index: number, array: readonly T[]) => U | null | undefined, thisArg?: any): NonNullable<U>[] {
    let result: NonNullable<U>[] = [];
    for (let i = 0; i < array.length; ++i) {
        let element = transform.call(thisArg, array[i], i, array);
        if (element !== null && element !== undefined) {
            result.push(element);
        }
    }

    return result;
}


/** Returns a new readonly array comtaining all transformed elements. */
export function arrayLazyMap<T, U>(array: readonly T[], transform: (element: T, index: number, array: readonly T[]) => U): readonly U[] {
    return new Proxy(array, _lazyMapProxy(transform));
}


const _lazyMapProxies: WeakMap<Function, ProxyHandler<readonly any[]>> = new WeakMap();

function _lazyMapProxy(transform: Function): ProxyHandler<readonly any[]> {
    let proxy = _lazyMapProxies.get(transform);
    if (proxy) {return proxy;}

    proxy = {
        set(array, key, receiver): boolean {
            return _checkStrictMode("Cannot set a key of a readonly array.");
        },

        get(array, key, receiver) {
            let index = Number(key);
            if (index >= 0 && index < array.length && Number.isInteger(index)) {
                return transform(array[index], index, array);
            }

            return Reflect.get(array, key, receiver);
        }
    };

    _lazyMapProxies.set(transform, proxy);
    return proxy;
}

function _checkStrictMode(error: string): boolean {
    if (isInStrictMode) {
        throw TypeError(error);
    }

    return false;
}
