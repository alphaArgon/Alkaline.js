/*
 *  readonly.ts
 *  Alkaline
 *
 *  Created by alpha on 2025/3/29.
 *  Copyright © 2025 alphaArgon.
 */


const _readonlyCaches: WeakMap<object, Readonly<object>> = new WeakMap();


/** Returns a readonly view to the given object. Calling this function multiple times will return
  * the same reference. If the given object is modified, the returned view can reflect the changes. */
export function readonlyView<T extends object>(object: T): Readonly<T> {
    let cache = _readonlyCaches.get(object);
    if (cache === undefined) {
        cache = Object.isFrozen(object) ? object : Object.freeze(Object.create(object));
        _readonlyCaches.set(object, cache!);
    }
    return cache! as Readonly<T>;
}
