/*
 *  override.ts
 *  Alkaline
 *
 *  Created by alpha on 2025/4/27.
 *  Copyright © 2025 alphaArgon.
 */


type WithThis<Object, This> = {
    [Key in keyof Object]: Object[Key] extends (...args: infer Args) => infer R
        ? (this: This, ...args: Args) => R
        : Object[Key];
};


/** A function that allows you to override methods of an object with super calls.
  * 
  * ```javascript
  * override(object, hyper => ({
  *     someMethod(arg) {
  *         console.log("before");
  *         hyper.someMethod(arg);
  *         console.log("after");
  *     },
  * 
  *     get someValue() {
  *         return hyper.someValue + 42;
  *     }
  * }));
  * ```
  * 
  * The `hyper` parameter just works like the `super` keyword in the class declaration.This function
  * is useful for creating specialized singletons. For creating multiple instances with the same
  * overrides, prefer subclassing.
  * 
  * The overrides are made *in place*. If you want to create a new object, you can wrap the given
  * object with `Object.create()`.
  */
export function override<T extends object, U extends Partial<T>>(object: T, makeOverrides: (hyper: T) => WithThis<U, T>): asserts object is T & U {
    let hyper = Object.create(object);
    let overrides = Object.getOwnPropertyDescriptors(makeOverrides(hyper));

    if (makeOverrides.length == 0) {
        //  The overrides require no hyper calls.
        Object.defineProperties(object, overrides);
        return;
    }

    for (let key in overrides) {
        let newDesc = overrides[key];
        let oldDesc = lookupPropertyDescriptor(object, key);

        Object.defineProperty(object, key, newDesc);

        if (oldDesc !== null) {
            if (typeof oldDesc.value === "function") {
                oldDesc.value = oldDesc.value.bind(object);

            } else {
                if (oldDesc.get !== undefined) {
                    oldDesc.get = oldDesc.get.bind(object);
                }
                if (oldDesc.set !== undefined) {
                    oldDesc.set = oldDesc.set.bind(object);
                }
            }

            Object.defineProperty(hyper, key, oldDesc);
        }
    }
}


function lookupPropertyDescriptor(object: object, key: string): PropertyDescriptor | null {
    let current = object as any;
    while (current !== null && current !== undefined) {
        let desc = Object.getOwnPropertyDescriptor(current, key);
        if (desc !== undefined) {
            return desc;
        }
        current = Object.getPrototypeOf(current);
    }
    return null;
}
