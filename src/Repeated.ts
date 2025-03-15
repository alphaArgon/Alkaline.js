/*
 *  Repeated.ts
 *  Alkaline
 *
 *  Created by alpha on 2025/3/11.
 *  Copyright © 2025 alphaArgon.
 */

import { resolveBackwardsIndex, resolveIndex } from "./_ESUtils";


/** Returns a readonly array that repeats the element for the given times.
  *
  * The return value is a “duck typed” array. That is, it has the same methods, same properties, and
  * can pass `Array.isArray` and `instanceof Array`, but you are not allowed to mutate or extend it.
  *
  * This function trades performance for memory usage; accessing elements via subscripting is slow.
  * However, using iterator or methods like `forEach`, `map`, etc. has about the same performance as
  * a native array; some methods may even be faster if you don’t rely on the index of an element. */
export function repeated<T>(count: number, element: T): readonly T[] {
    count = Math.trunc(count);

    //  The empty array is shared.
    if (count <= 0) {
        return _emptyArray;
    }

    let array = Reflect.construct(Array, [count], RepeatedArray) as RepeatedArray<T>;

    //  For few elements, return a real array.
    if (count <= 12) {
        array.fill(element);
        return Object.freeze(array);
    }

    //  Make the array a slow sparse array, and traps the element getter, so it saves memory.

    //  Code like `array.length = count`, `array[count - 1] = ...`, etc. will reserve capacity,
    //  which is not what we want. Note that `length` is not configurable, so we can neither define
    //  it, nor returning a different value from the proxy handler.

    //  Defining this property also updates its length to `count`.
    Object.defineProperty(array, count - 1, {
        value: element,
        writable: false,
        enumerable: false,  //  `false` here make console print looks better.
        configurable: true,  //  Must be `true`.
    });

    //  We can’t freeze here, otherwise `ownKeys` can’t return custom keys.
    //  The handler de facto freezes the array.
    return new Proxy(array, _arrayProxy);
}


const _emptyArray = Object.freeze([]) as readonly any[];


const _arrayProxy: ProxyHandler<readonly any[]> = {

    set(array, key, receiver): boolean {
        return _checkStrictMode("Cannot set a key of a repeated array.");
    },

    defineProperty(array, key, attributes): boolean {
        return _checkStrictMode("Cannot define a property of a repeated array.");
    },

    deleteProperty(array, key): boolean {
        return _checkStrictMode("Cannot delete a property of a repeated array.");
    },

    setPrototypeOf(array, value): boolean {
        return _checkStrictMode("Cannot set the prototype of a repeated array.");
    },

    isExtensible(target): boolean {
        return false;
    },

    get(array, key, receiver): any {
        //  If a key is manually set — that’s not allowed: the array is frozen.

        let value = Reflect.get(array, key, receiver);
        if (value !== undefined) {
            return value;
        }

        if (typeof key === "symbol") {
            return undefined;
        }

        let index = Number(key);
        if (index >= 0 && index < array.length && Number.isInteger(index)) {
            return array[array.length - 1];
        }

        return undefined;
    },

    has(array, key): boolean {
        if (Reflect.has(array, key)) {return true;}

        if (typeof key === "symbol") {
            return false;
        }

        let index = Number(key);
        return index >= 0 && index < array.length && Number.isInteger(index);
    },

    ownKeys(array): (string | symbol)[] {
        return Array.from(_arrayKeys(array.length));
    },

    getOwnPropertyDescriptor(array, key): PropertyDescriptor | undefined {
        let index = typeof key === "symbol" ? NaN : Number(key);
        if (index >= 0 && index < array.length && Number.isInteger(index)) {
            return {
                value: array[array.length - 1],
                writable: false,
                enumerable: true,
                configurable: true,  //  Must be `true`.
            };
        }

        return Reflect.getOwnPropertyDescriptor(array, key);
    },
}


function *_arrayKeys(length: number): Generator<string | symbol> {
    for (let i = 0; i < length; ++i) {
        yield String(i);
    }

    yield "length";
}


let _inStrictMode = null as boolean | null;

function _checkStrictMode(error: string): boolean {
    if (_inStrictMode === null) {
        _inStrictMode = false;

        try {
            (_emptyArray as any).length = 1;
        } catch {
            _inStrictMode = true;
        }
    }

    if (_inStrictMode) {
        throw TypeError(error);
    }

    return false;
}


class RepeatedArray<T> extends Array<T> {

    private constructor() {
        throw new Error("Use `reactive` to create a repeating array.");
        super();  //  Make TypeScript happy.
    }

    public static override get [Symbol.species](): ArrayConstructor {
        return Array;
    }

    public override *values(): ArrayIterator<T> {
        let length = this.length;
        let repeated = this[length - 1];
        for (let i = 0; i < length; ++i) {
            yield repeated;
        }
    }

    public override *entries(): ArrayIterator<[number, T]> {
        let length = this.length;
        let repeated = this[length - 1];
        for (let i = 0; i < length; ++i) {
            yield [i, repeated];
        }
    }

    public override indexOf(searchElement: T): number {
        let length = this.length;
        if (length === 0) {return -1;}

        let realIndex = resolveIndex(arguments[1], length, arguments.length > 1);
        if (realIndex === length) {return -1;}

        let repeated = this[length - 1];
        return repeated === searchElement ? realIndex : -1;
    }

    public override lastIndexOf(searchElement: T): number {
        let length = this.length;
        if (length === 0) {return -1;}

        let realIndex = resolveBackwardsIndex(arguments[1], length, arguments.length > 1);
        if (realIndex === -1) {return -1;}

        let repeated = this[length - 1];
        return repeated === searchElement ? realIndex : -1;
    }

    public override findIndex(predicate: (value: T, index: number, obj: T[]) => unknown): number {
        let length = this.length;
        if (length === 0) {return -1;}

        let repeated = this[length - 1];
        let found = arguments.length > 1
            ? predicate.call(arguments[1], repeated, 0, this)
            : predicate(repeated, 0, this);

        return found ? 0 : -1;
    }

    public override find(predicate: (value: T, index: number, obj: T[]) => unknown): T | undefined {
        let length = this.length;
        if (length === 0) {return undefined;}

        let repeated = this[length - 1];
        let found = arguments.length > 1
            ? predicate.call(arguments[1], repeated, 0, this)
            : predicate(repeated, 0, this);

        return found ? repeated : undefined;
    }

    public override includes(searchElement: T): boolean {
        let length = this.length;
        if (length === 0) {return false;}

        let realIndex = resolveIndex(arguments[1], length, arguments.length > 1);
        if (realIndex === length) {return false;}

        let repeated = this[length - 1];
        return repeated === searchElement || Object.is(repeated, searchElement);
    }

    public override map<U>(transform: (value: T, index: number, array: T[]) => U): U[] {
        if (transform.length < 3) {
            return arguments.length > 1
                ? Array.from(this, transform as (value: any, index: number) => U, arguments[1])
                : Array.from(this, transform as (value: any, index: number) => U);
        }

        return Array.from(this, (value, index) => {
            return arguments.length > 1
                ? transform.call(arguments[1], value, index, this)
                : transform(value, index, this)
        });
    }

    public override forEach(callback: (value: T, index: number, array: T[]) => void): void {
        let length = this.length;
        let repeated = this[length - 1];

        for (let i = 0; i < length; ++i) {
            arguments.length > 1
                ? callback.call(arguments[1], repeated, i, this)
                : callback(repeated, i, this)
        }
    }

    //  TypeScript only gives this function a signature of `readonly T[]`. That’s a mess.

    public override every<S extends T>(predicate: (value: T, index: number, array: readonly T[]) => value is S): this is S[];
    public override every(predicate: (value: T, index: number, array: readonly T[]) => unknown): boolean {
        let length = this.length;
        if (length === 0) {return true;}

        let repeated = this[length - 1];

        if (predicate.length <= 1) {
            if (arguments.length > 1) {
                return !!predicate.call(arguments[1], repeated, 0, this);
            } else {
                return !!predicate(repeated, 0, this);
            }
        }

        for (let i = 0; i < length; ++i) {
            if (arguments.length > 1) {
                if (!predicate.call(arguments[1], repeated, i, this)) {return false;}
            } else {
                if (!predicate(repeated, i, this)) {return false;}
            }
        }

        return true;
    }

    public override some(predicate: (value: T, index: number, array: T[]) => unknown): boolean {
        let length = this.length;
        if (length === 0) {return false;}

        let repeated = this[length - 1];

        if (predicate.length <= 1) {
            if (arguments.length <= 1) {
                return !!predicate(repeated, 0, this);
            } else {
                return !!predicate.call(arguments[1], repeated, 0, this);
            }
        }

        for (let i = 0; i < length; ++i) {
            if (arguments.length <= 1) {
                if (predicate(repeated, i, this)) {return true;}
            } else {
                if (predicate.call(arguments[1], repeated, i, this)) {return true;}
            }
        }

        return false;
    }
}

Object.defineProperties(RepeatedArray.prototype, {

    [Symbol.iterator]: {
        value: RepeatedArray.prototype.values,
        writable: false,
        enumerable: false,
        configurable: true,
    }
});
