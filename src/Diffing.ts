/*
 *  Diffing.ts
 *  Foundation
 *
 *  Created by alpha on 2025/3/3.
 *  Copyright © 2025 alphaArgon.
 */

import { RangeSet, ReadonlyRangeSet } from "./RangeSet";


/** Returns the partial changes of the newer record from the older record, or `null` if the newer
  * record is equal to the older record.
  *
  * If the two records have different sets of keys, missing keys are considered to have `undefined`
  * values. Keys on the prototype chain *are* considered. */
export function recordDiff<V>(from: Record<string, V>, to: Record<string, V>, equal: (a: V, b: V) => boolean): Partial<Record<string, V>> | null {
    let result: Partial<Record<string, V>> = {};
    let anyChange = false;

    //  FIXME: `key in some` should be replaced by “whether the key is present and iterable”.
    //  We don’t check the iterability here.

    for (let key in from) {
        if (!(key in to)) {
            result[key] = undefined;
            anyChange = true;
            continue;
        }

        let oldValue = from[key];
        let newValue = to[key];
        if (!equal(oldValue, newValue)) {
            result[key] = newValue;
            anyChange = true;
        }
    }

    for (let key in to) {
        if (!(key in from)) {
            result[key] = to[key];
            anyChange = true;
            continue;
        }

        //  The key is present in both records.
        //  We already checked this key.
        continue;
    }

    return anyChange ? result : null;
}


/** Returns the differences between two arrays.
  *
  * If `droppedStart` is provided, the given two array are treated as subarrays from the value,
  * and the returned diff will be relative to the start of the original array. This is useful when
  * comparing a partial change to a whole array. */
export function arrayDiff<T>(from: readonly T[], to: readonly T[], equal: (a: T, b: T) => boolean, droppedStart: number = 0): ArrayDiff<T> {
    let changes = _formChanges(from, to, _descent(from, to, equal));
    let removals = changes.filter(c => "removedAt" in c).sort((a, b) => (a.removedAt - b.removedAt));
    let insertions = changes.filter(c => "insertedAt" in c).sort((a, b) => (a.insertedAt - b.insertedAt));

    if (droppedStart !== 0) {
        removals.forEach(c => c.removedAt += droppedStart);
        insertions.forEach(c => c.insertedAt += droppedStart);
    }

    return new ArrayDiff(removals, insertions);
}


export type ArrayInsertion<T> = {insertedAt: number, element: T};
export type ArrayRemoval<T> = {removedAt: number, element: T};
export type ArrayChange<T> = ArrayInsertion<T> | ArrayRemoval<T>;


/** An ArrayDiff is an immutable collection of changes to an ordered collection. When iterating over
  * an ArrayDiff, the removals are emitted first in reverse order, followed by the insertions in
  * forward order. */
export class ArrayDiff<T> implements Iterable<ArrayChange<T>> {

    private _removals: ArrayRemoval<T>[];
    private _insertions: ArrayInsertion<T>[];

    private _removedIndices: RangeSet | undefined;
    private _insertedIndices: RangeSet | undefined;

    public constructor(ascendingRemovals: ArrayRemoval<T>[], ascendingInsertions: ArrayInsertion<T>[]) {
        this._removals = ascendingRemovals;
        this._insertions = ascendingInsertions;
        this._removedIndices = undefined;
        this._insertedIndices = undefined;
    }

    public static singleChange<T>(index: number, oldValue: T, newValue: T): ArrayDiff<T> {
        return new ArrayDiff([{removedAt: index, element: oldValue}], [{insertedAt: index, element: newValue}]);
    }

    public static insertionsAt<T>(index: number, elements: T[]): ArrayDiff<T> {
        return new ArrayDiff([], elements.map((e, i) => ({insertedAt: index + i, element: e})));
    }

    public get removals(): ArrayRemoval<T>[] {
        return this._removals;
    }

    public get insertions(): ArrayInsertion<T>[] {
        return this._insertions;
    }

    public get removedIndices(): ReadonlyRangeSet {
        if (this._removedIndices === undefined) {
            this._removedIndices = new RangeSet();
            for (let removal of this._removals) {
                this._removedIndices.insert(removal.removedAt);
            }
        }

        return this._removedIndices;
    }

    public get insertedIndices(): ReadonlyRangeSet {
        if (this._insertedIndices === undefined) {
            this._insertedIndices = new RangeSet();
            for (let insertion of this._insertions) {
                this._insertedIndices.insert(insertion.insertedAt);
            }
        }

        return this._insertedIndices;
    }

    public *[Symbol.iterator](): Iterator<ArrayChange<T>> {
        for (let i = this._removals.length - 1; i >= 0; --i) {
            yield this._removals[i];
        }

        for (let i = 0; i < this._insertions.length; ++i) {
            yield this._insertions[i];
        }
    }

    public get inverse(): ArrayDiff<T> {
        let removals = this._insertions.map(c => ({removedAt: c.insertedAt, element: c.element}));
        let insertions = this._removals.map(c => ({insertedAt: c.removedAt, element: c.element}));
        return new ArrayDiff(removals, insertions);
    }

    public apply(array: readonly T[]): T[] {
        let result = array.slice();
        this.applyInto(result);
        return result;
    }

    public applyInto(array: T[]): void {
        for (let [lo, hi] of this.removedIndices.reversedRanges()) {
            array.splice(lo, hi - lo);
        }

        let i = 0, j = 0;
        for (let [lo, hi] of this.insertedIndices.ranges()) {
            let length = hi - lo; j = i + length;
            let newElements = this._insertions.slice(i, j).map(c => c.element);
            array.splice(lo, 0, ...newElements);
            i = j;
        }
    }
}


function _formChanges<T>(a: readonly T[], b: readonly T[], trace: _V[]): ArrayChange<T>[] {
    let changes = [] as ArrayChange<T>[];

    let  x = a.length;
    let  y = b.length;
    for (let d = trace.length - 1; d > 0; --d) {
        let v = trace[d];
        let k = x - y;
        let prev_k = (k == -d || (k != d && v.at(k - 1) < v.at(k + 1))) ? k + 1 : k - 1;
        let prev_x = v.at(prev_k);
        let prev_y = prev_x - prev_k;

        while (x > prev_x && y > prev_y) {
            // No change at this position.
            x -= 1;
            y -= 1;
        }

        if (y != prev_y) {
            changes.push({insertedAt: prev_y, element: b[prev_y]});
        } else {
            changes.push({removedAt: prev_x, element: a[prev_x]});
        }

        x = prev_x;
        y = prev_y;
    }

    return changes;
}


function _descent<T>(a: readonly T[], b: readonly T[], cmp: (a: T, b: T) => boolean): _V[] {
    let n = a.length;
    let m = b.length;
    let max = n + m;

    let result = [] as _V[];
    let v = new _V(1);

    let x = 0;
    let y = 0;
    iterator: for (let d = 0; d <= max; ++d) {
        let prev_v = v;
        result.push(v);
        v = new _V(d);

        // The code in this loop is _very_ hot—the loop bounds increases in terms
        // of the iterator of the outer loop!
        for (let k = -d; k <= d; k += 2) {
            if (k == -d) {
                x = prev_v.at(k + 1);
            } else {
                let km = prev_v.at(k - 1);

                if (k != d) {
                    let kp = prev_v.at(k + 1);
                    if (km < kp) {
                        x = kp;
                    } else {
                        x = km + 1;
                    }
                } else {
                    x = km + 1;
                }
            }
            y = x - k;

            while (x < n && y < m) {
                if (!cmp(a[x], b[y])) {
                    break;
                }
                x += 1;
                y += 1;
            }

            v.setAt(k, x);

            if (x >= n && y >= m) {
                break iterator;
            }
        }
        if (x >= n && y >= m) {
            break;
        }
    }

    return result;
}


class _V {

    private readonly _a: number[];

    public constructor(largest: number) {
        this._a = Array(largest + 1);
        this._a.fill(0, 0, largest + 1);
    }

    public at(index: number): number {
        index = index <= 0 ? -index : index - 1;
        return this._a[index];
    }

    public setAt(index: number, value: number) {
        index = index <= 0 ? -index : index - 1;
        this._a[index] = value;
    }
}
