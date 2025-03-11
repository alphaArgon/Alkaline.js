/*
 *  Reactive.ts
 *  Foundation
 *
 *  Created by alpha on 2025/3/4.
 *  Copyright © 2025 alphaArgon.
 */

import { resolveIndex } from "./_ESUtils";
import { ArrayDiff, arrayDiff } from "./Diffing";
import { NotificationCenter, NotificationName } from "./Notification";


//  A reactive array can send notifications when the array changes. Here’s how it works:
//
//  1. Define the class `ReactiveArray` and a notification name `didChangeNotification`. The
//     notification holding an `ArrayDiff` will be posted to the default center.
//
//  2. However, the `ReactiveArray` instances themselves are not reactive. To make them reactive,
//     we need to wrap them with a proxy. Users cannot directly create `ReactiveArray` instances,
//     and the proxies serve as the notification senders.
//
//  3. Implement the functionality of change tracking with the helper class `_ReactiveArrayCore`.
//     A core object has a `_host` property that refers to the array not wrapped by the proxy, and
//     the array stores the core object as an internal instance variable. It will cause a circular
//     reference, but it’s OK; we are not using ARC.
//
//  4. Before an element is replaced or a mutating method is called, the proxy handler calls
//     `beginMutation` on the core object. After the operation, the proxy calls `endMutation`
//     passing the receiver (i.e. the array with the proxy wrapped) as the argument, which will be
//     used as the sender of the notification. `endMutation` will post the notification if there’re
//     any changes and the nested mutations are cleared.
//
//  5. With the design of nested mutations, for instance, a user-defined shuffle method on
//     `ReactiveArray` that swaps elements frequently, only one notification will be sent after the
//     method returns. Intermediate changes are not visible to the outside. However, functions that
//     are not defined on the prototype might send multiple notifications. In this case, the user
//     should use `withMutations` to reduce notifications.
//
//  6. The proxy handler can well handle generic mutations. However, we implement the overrides of 
//     `push`, `unshift`, `pop`, `shift`, and `splice` for better performance, which bypass frequent
//     checks in the proxy handler. Other methods like `sort`, `reverse`, etc. are not overridden
//     because they are not likely to be called on a reactive array. This won’t affect the
//     correctness of the reactive system, but might have some performance overhead.


const $: unique symbol = Symbol("ivars");


/** Creates a new reactive array by copying the elements of the given array.
  * 
  * A reactive array that sends notifications when the array changes, for example, when assign
  * elements using subscripting, mutate the array with standard array methods, etc.
  * 
  * If a method returns a new array, like `map`, `filter`, etc., it is not reactive. You should
  * pass the returned array to `reactive` to make another reactive array. */
export function reactive<T>(elements: T[], equal: (a: T, b: T) => boolean): ReactiveArray<T> {
    let array = Reflect.construct(Array, [], ReactiveArray) as ReactiveArray<T>;

    if (elements.length !== 0) {
        Array.prototype.push.apply(array, elements);
    }

    array[$] = new _ReactiveArrayCore(array, equal);
    return new Proxy(array, _arrayProxy);
}


/** A readonly reactive array, which is semantically immutable. */
export interface ReadonlyReactiveArray<T> extends ReadonlyArray<T> {

    [$]: _ReactiveArrayCore<T>;
}


/** A reactive array that sends notifications when the array changes. */
export class ReactiveArray<T> extends Array<T> {

    /** The notification name for the change of the array. */
    public static readonly didChangeNotification: NotificationName<ArrayDiff<any>> = "ReactiveArrayDidChange";

    [$]: _ReactiveArrayCore<T>;

    private constructor() {
        throw new Error("Use `reactive` to create a reactive array.");
        super();  //  Make TypeScript happy.
    }

    public static override get [Symbol.species](): ArrayConstructor {
        return Array;
    }

    /** Merges all mutations into a single notification. */
    public withMutations<R>(callback: (array: ReactiveArray<T>) => R): R {
        //  The proxy handler will handle this.
        return callback(this);
    }

    /** Replaces the elements of the array with the elements of another array. A single notification
      * of the overall diff is sent. */
    public assignFrom(other: readonly T[]): void {
        this[$].replaceIn(0, this.length, other);
    }
}


//  The following overrides are not necessary; the proxy can handle them. However, we implement
//  them for better performance. The proxy handler will wrap them within a new function (no
//  matter whether they are overridden or not), so we don’t need to call `beginMutation` and
//  `endMutation` again.

for (let [name, method] of Object.entries({

    push(...items) {
        this[$].replaceIn(this.length, 0, items);
        return this.length;
    },

    unshift(...items) {
        this[$].replaceIn(0, 0, items);
        return this.length;
    },

    pop() {
        let [removed] = this[$].replaceIn(-1, 1, []);
        return removed;
    },

    shift() {
        let [removed] = this[$].replaceIn(0, 1, []);
        return removed;
    },

    splice(start, deleteCount, ...items) {
        switch (arguments.length) {
        case 0: return this[$].replaceIn();
        case 1: return this[$].replaceIn(start);
        case 2: return this[$].replaceIn(start, deleteCount);
        default: return this[$].replaceIn(start, deleteCount, items);
        }
    }

} as ReactiveArray<any>)) {

    Object.defineProperty(ReactiveArray.prototype, name, {
        value: method,
        writable: false,
        enumerable: false,
        configurable: true,
    });
}


const _arrayProxy: ProxyHandler<ReactiveArray<any>> = {

    get(array, key, receiver): any {
        let value = Reflect.get(array, key, receiver);

        if (typeof value !== "function") {
            return value;
        }

        //  If the function is not on the prototype, return as is.
        if (!(key in ReactiveArray.prototype)) {
            return value;
        }

        if (_nonMutatingKeys.has(key)) {
            return value;
        }

        let cached = _methodCache.get(value);
        if (cached !== undefined) {
            return cached;
        }

        cached = function (this: ReactiveArray<any>, ...args: any[]) {
            this[$].beginMutation();

            try {
                let result = value.apply(this, args);
                this[$].endMutation(this);
                return result;

            } catch (error) {
                this[$].cancelMutation();
                throw error;
            }
        }

        Object.defineProperties(cached, {
            length: {value: value.length},
            name: {value: value.name},
            prototype: {value: value.prototype},
        });

        _methodCache.set(value, cached);
        return cached;
    },

    set(array, key, value, receiver): boolean {
        if (typeof key === "symbol") {
            return Reflect.set(array, key, value, receiver);
        }

        array[$].beginMutation();

        try {
            let result = key === "length"
                ? array[$].setLength(value)
                : array[$].setAt(key, value);

            array[$].endMutation(receiver);
            return result;

        } catch (error) {
            array[$].cancelMutation();
            throw error;
        }
    },

    deleteProperty(array, key): boolean {
        if (typeof key === "symbol") {
            return Reflect.deleteProperty(array, key);
        }

        let index = Number(key);
        if (index !== ~~index) {
            return Reflect.deleteProperty(array, key);
        }

        throw new Error("Cannot delete elements from a reactive array.");
    }
}


/** Known method names that won’t change the elements of the array, so from the getter of the proxy
  * we don’t create a new function.
  *
  * We can’t assume what methods mutate the array. There could be methods introduced in the future,
  * or the user added methods to the array prototype. However, non-mutating methods are guaranteed
  * not to change the array. */
const _nonMutatingKeys: Set<PropertyKey> = new Set([

    //  Defined on Object.prototype:
    "hasOwnProperty", "isPrototypeOf", "propertyIsEnumerable", "toLocaleString", "toString", "valueOf",
    Symbol.toStringTag, Symbol.toPrimitive, 

    //  Defined on Array.prototype:
    "at", "concat", "entries", "every", "filter", "find", "findIndex", "findLast",
    "findLastIndex", "flat", "flatMap", "forEach", "includes", "indexOf", "join", "keys",
    "lastIndexOf", "map", "reduce", "reduceRight", "slice", "some", "toLocaleString",
    "toReversed", "toSorted", "toSpliced", "toString", "values", "with", 
    Symbol.iterator, Symbol.unscopables, Symbol.isConcatSpreadable,
]);


const _methodCache: Map<Function, Function> = new Map();


//  The core tracks the changes as follows:
//
//  1. In most cases, only one change will be made to the array. For example, a single element
//     assignment, a standard mutation method, etc. In this case, the change is recorded in
//     `_onlyChange`.
//
//  2. During any mutation session, if more than one change is made to the array, the core stops
//     recording the changes. Instead, it manages to retrieve the original array before the mutation
//     by applying the inverse of the change so far to the current elements.
//
//  3. When the outermost mutation ends, the core will post a notification with the overall diff.
//     If the only change is recorded, it will be used. Otherwise, a diff between the original array
//     and the current array will be calculated.


class _ReactiveArrayCore<T> {

    private _host: ReactiveArray<T>;
    private _equal: (a: T, b: T) => boolean;

    private _mutationBalance: number;
    private _onlyChange: ArrayDiff<T> | null;
    private _original: Array<T> | null;

    public constructor(host: ReactiveArray<T>, equal: (a: T, b: T) => boolean) {
        this._host = host;
        this._equal = equal;
        this._mutationBalance = 0;
        this._onlyChange = null;
        this._original = null;
    }

    public beginMutation(): void {
        this._mutationBalance += 1;
    }

    public endMutation(notificationSender: any): void {
        this._mutationBalance -= 1;
        if (this._mutationBalance !== 0) {
            return;
        }

        if (this._onlyChange !== null) {
            let diff = this._onlyChange;
            this._onlyChange = null;

            return NotificationCenter.default.post(
                ReactiveArray.didChangeNotification,
                notificationSender, diff);
        }

        if (this._original !== null) {
            let diff = arrayDiff(this._original, this._host, this._equal);
            this._original = null;

            return NotificationCenter.default.post(
                ReactiveArray.didChangeNotification,
                notificationSender, diff);
        }
    }

    /** Called on error. */
    public cancelMutation(): void {
        this._mutationBalance -= 1;
        if (this._mutationBalance !== 0) {
            return;
        }

        this._onlyChange = null;
        this._original = null;
    }

    /** Records a change. This method should be called after the array is mutated. However, if
      * `_original` is not null, the per-step changes are not necessary, and thus this method will
      * do nothing. In this case, this method call can be omitted. */
    private _recordChange(diff: ArrayDiff<T>) {
        if (this._mutationBalance === 0) {
            throw new TypeError("Reactive array being mutated outside a mutation session.");
        }

        if (this._original !== null) {
            return;  //  We saved the original array, so we can diff the final result.
        }

        if (this._onlyChange === null) {
            this._onlyChange = diff;
            return;
        }

        this._original = diff.inverse.apply(this._host);
        this._onlyChange.inverse.applyInto(this._original);
        this._onlyChange = null;
    }

    public setAt(key: any, value: any): boolean {
        //  If the original array is present, we can omit change tracking.
        if (this._original !== null) {
            return Reflect.set(this._host, key, value);
        }

        let index = Number(key);

        //  If the key is not an index, setting it is not reflectable in the diff.
        if (!(index >= 0)) {
            return Reflect.set(this._host, key, value);
        }

        if (index === ~~index && index < this._host.length) {
            //  The key is a safe index, that is, an integer index setting at which won’t change
            //  the length of the array.

            let old = this._host[index];

            if (!this._equal(old, value)) {
                let diff = ArrayDiff.singleChange(index, old, value);
                this._recordChange(diff);
            }

            this._host[index] = value;

        } else {
            //  The index is out of bounds or has a fractional part. In this case, we just load the
            //  original array and let `endMutation` to calculate the diff.

            //  Note that though ECMAScript allows indices up to 2^53 - 1, such a large index will
            //  fall into this branch because it cannot pass the `index === ~~index` test. However,
            //  a reactive array is not designed for such large indices; it will cost a ridiculous
            //  amount of time and memory to diff so many elements.

            if (this._onlyChange === null) {
                this._original = Array.from(this._host);
            } else {
                this._original = this._onlyChange.inverse.apply(this._host);
                this._onlyChange = null;
            }
    
            this._host[key as any] = value;
        }

        return true;
    }

    public setLength(length: any): boolean {
        //  If the length is the same, do nothing.
        if (length === this._host.length) {
            return true;
        }

        //  If the original array is present, we can omit change tracking.
        if (this._original !== null) {
            //  noop; for code simplicity.

        } else if (this._onlyChange !== null) {
            this._original = this._onlyChange.inverse.apply(this._host);
            this._onlyChange = null;

        } else if (this._mutationBalance !== 0) {
            this._original = Array.from(this._host);
        }

        if (this._original !== null) {
            //  Setting the length with bad type will throw an error.
            //  But we saved the original array, so we can restore it.
            this._host.length = length;
            return true;
        }

        //  Now we are not in a mutation session. How could it be?
        throw new TypeError("Reactive array being mutated outside a mutation session.");
    }

    /** A generic method for optimizing array CURD operations. */
    public replaceIn(index?: number, count?: number, elements?: readonly T[]): T[] {
        let oldLength = this._host.length;
        let removed: T[];

        //  Array.prototype.splice uses `arguments.length` to determine the number of arguments.
        //  Passing `undefined` is not the same as omitting the argument.

        switch (arguments.length) {
        case 0: removed = (Array.prototype.splice as any).call(this._host); break;
        case 1: removed = (Array.prototype.splice as any).call(this._host, index); break;
        case 2: removed = (Array.prototype.splice as any).call(this._host, index, count); break;
        default: removed = (Array.prototype.splice as any).call(this._host, index, count, ...elements!); break;
        }

        if (this._original === null
         && (removed.length !== 0 || oldLength !== this._host.length)) {
            let realIndex = resolveIndex(index, oldLength, arguments.length > 0);
    
            let diff = arrayDiff(removed, elements ?? [], this._equal, realIndex);
            this._recordChange(diff);
        }

        return removed;
    }
}
