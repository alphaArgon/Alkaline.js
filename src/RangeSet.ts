/*
 *  RangeSet.ts
 *  Foundation
 *
 *  Created by alpha on 2024/8/13.
 *  Copyright © 2024 alphaArgon.
 */

import type { CustomCopyable, CustomEquatable } from "./Base";
import { $ } from "./_Internal";


/** A type that used to iterate over a set of indices. */
export type IndexSet = Iterable<number>;


/** Returns an iterator that yields numbers in the range `[start, end)`. */
export function *makeRange(start: number, end: number): IndexSet {
    for (let i = start; i < end; i += 1) {
        yield i;
    }
}


export interface ReadonlyRangeSet extends IndexSet, CustomEquatable, CustomCopyable {

    [$]: any;

    readonly count: number;

    readonly first: number | undefined;
    readonly last: number | undefined;

    contains(start: number, end?: number): boolean;

    [Symbol.iterator](): IterableIterator<number>;
    reversed(): IterableIterator<number>;

    ranges(): IterableIterator<[start: number, end: number]>;
    reversedRanges(): IterableIterator<[start: number, end: number]>;

    isEqual(other: any): boolean;
    makeCopy(): RangeSet;

    union(other: ReadonlyRangeSet): RangeSet;
    intersection(other: ReadonlyRangeSet): RangeSet;
    difference(other: ReadonlyRangeSet): RangeSet;
    symmetricDifference(other: ReadonlyRangeSet): RangeSet;
}


/** An set of indices stored as non-overlapping ranges.
  *
  * All methods that accept a pair of number arguments, including the constructor, treat the pair
  * as a right-open range. Be careful with the second argument. If it’s not specified, it will be
  * considered as the successor of the first argument. We don’t use length-based methods! */
export class RangeSet implements ReadonlyRangeSet {

    [$]: {
        bounds: number[];  //  [start1, end1, start2, end2, ...], end exclusive
        count: number;
    };

    public constructor(start?: number, end?: number) {
        if (start === undefined) {
            this[$] = {bounds: [], count: 0};
            return;
        }

        if (end === undefined) {end = start + 1;}
        if (!(start < end)) {
            this[$] = {bounds: [], count: 0};
            return;
        }

        this[$] = {
            bounds: [start, end],
            count: end - start,
        };
    }

    public get count(): number {
        return this[$].count;
    }

    public get first(): number | undefined {
        if (this[$].count === 0) {return null as any;}
        return this[$].bounds[0] as any;
    }

    public get last(): number | undefined {
        if (this[$].count === 0) {return null as any;}
        return this[$].bounds[this[$].bounds.length - 1] - 1 as any;
    }

    public *[Symbol.iterator](): IterableIterator<number> {
        for (let i = 0; i < this[$].bounds.length; i += 2) {
            let start = this[$].bounds[i];
            let end = this[$].bounds[i + 1];
            for (let j = start; j < end; j += 1) {
                yield j;
            }
        }
    }

    public *reversed(): IterableIterator<number> {
        for (let i = this[$].bounds.length - 2; i >= 0; i -= 2) {
            let start = this[$].bounds[i];
            let end = this[$].bounds[i + 1];
            for (let j = end - 1; j >= start; j -= 1) {
                yield j;
            }
        }
    }

    public *ranges(): IterableIterator<[start: number, end: number]> {
        for (let i = 0; i < this[$].bounds.length; i += 2) {
            yield [this[$].bounds[i], this[$].bounds[i + 1]];
        }
    }

    public *reversedRanges(): IterableIterator<[start: number, end: number]> {
        for (let i = this[$].bounds.length - 2; i >= 0; i -= 2) {
            yield [this[$].bounds[i], this[$].bounds[i + 1]];
        }
    }

    public contains(start: number, end: number = start + 1): boolean {
        if (this[$].count === 0) {return false;}
        if (!(start < end)) {return false;}

        //  Binary search.
        let l = 0, r = this[$].bounds.length;
        while (l < r) {
            let m = (l + r) >>> 2 << 1;
            let lo = this[$].bounds[m];
            let hi = this[$].bounds[m + 1];

            if (end <= lo) {
                r = m;
            } else if (start >= hi) {
                l = m + 2;
            } else {
                return start >= lo && end <= hi;
            }
        }

        return false;
    }

    public insert(start: number, end: number = start + 1): void {
        if (!(start < end)) {return;}

        if (this[$].count === 0
         || start > this[$].bounds[this[$].bounds.length - 1]) {
            this[$].bounds.push(start, end);
            this[$].count += end - start;
            return;
        }

        if (start === this[$].bounds[this[$].bounds.length - 1]) {
            this[$].bounds[this[$].bounds.length - 1] = end;
            this[$].count += end - start;
            return;
        }

        //  If `start` is contained by, or on the end of a range... Binary search.
        let l = 0, r = this[$].bounds.length;
        while (l < r) {
            let m = (l + r) >>> 2 << 1;
            let lo = this[$].bounds[m];
            let hi = this[$].bounds[m + 1];

            if (start < lo) {
                r = m;
            } else if (start > hi) {
                l = m + 2;
            } else {  //  `start` in `lo...hi`. `hi` is inclusive for convenience of removing joint.
                start = lo;
                l = m; break;
            }
        }

        //  Now, l means the lower bound of indices of `_ranges` to perform replacement.
        r = l;  //  Reuse `r` as the upper bound. `_ranges[l..<r]` will be replaced.
        let removedCount = 0;
        while (r < this[$].bounds.length) {
            let lo = this[$].bounds[r];
            if (end < lo) {break;}

            let hi = this[$].bounds[r + 1];
            r += 2;
            removedCount += hi - lo;

            if (end <= hi) {
                end = hi;
                break;
            }
        }

        this[$].bounds.splice(l, r - l, start, end);
        this[$].count += (end - start) - removedCount;
    }

    /** Shifts all elements >= `start` right by `end - start`, and inserts `start..<end`. */
    public insertSpanIn(start: number, end: number): void {
        //  TODO: Optimize.
        this.insertGapIn(start, end);
        this.insert(start, end);
    }

    /** Shifts all elements >= `start` right by `end - start`, which leaves a gap in `start..<end`. */
    public insertGapIn(start: number, end: number): void {
        if (!(start < end)) {return;}
        if (this[$].count === 0) {return;}

        let delta = end - start;

        //  If `start` is contained by a range... Binary search.
        let l = 0, r = this[$].bounds.length;
        while (l < r) {
            let m = (l + r) >>> 2 << 1;
            let lo = this[$].bounds[m];
            let hi = this[$].bounds[m + 1];

            if (start < lo) {
                r = m;
            } else if (start >= hi) {
                l = m + 2;
            } else {  //  `start` in `lo..<hi`. `hi` is exclusive here, different from `insert`.
                if (start === lo) {
                    l = m; break;
                } else {  //  The range should be split into two disjoint ranges.
                    this[$].bounds[m + 1] = start;
                    this[$].bounds.splice(m + 2, 0, end, hi + delta);
                    l = m + 4; break;
                }
            }
        }

        for (let i = l; i < this[$].bounds.length; i += 2) {
            this[$].bounds[i] += delta;
            this[$].bounds[i + 1] += delta;
        }
    }

    /** Returns the index to the lower bound after the removed range, or -1 if removal is invalid. */
    private _remove(start: number, end: number): number {
        if (!(start < end)) {return -1;}
        if (this[$].count === 0) {return -1;}

        //  If `start` is contained by a range... Binary search.
        let l = 0, r = this[$].bounds.length;
        while (l < r) {
            let m = (l + r) >>> 2 << 1;
            let lo = this[$].bounds[m];
            let hi = this[$].bounds[m + 1];

            if (start < lo) {
                r = m;
            } else if (start >= hi) {
                l = m + 2;
            } else {  //  `start` in `lo..<hi`. `hi` is exclusive here, different from `insert`.
                if (start === lo) {
                    l = m; break;
                } else if (end >= hi) {
                    this[$].bounds[m + 1] = start;
                    this[$].count -= hi - start;
                    l = m + 2; break;
                } else {  //  The range should be split into two disjoint ranges.
                    this[$].bounds[m + 1] = start;
                    this[$].bounds.splice(m + 2, 0, end, hi);
                    this[$].count -= end - start;
                    return m + 2;
                }
            }
        }

        //  Now, l means the lower bound of indices of `_ranges` to perform removal.
        r = l;  //  Reuse `r` as the upper bound. `_ranges[l..<r]` will be removed.
        let removedCount = 0;
        while (r < this[$].bounds.length) {
            let lo = this[$].bounds[r];
            if (end <= lo) {break;}

            let hi = this[$].bounds[r + 1];

            if (end < hi) {
                this[$].bounds[r] = end;
                this[$].count -= end - lo;
                break;
            }

            r += 2;
            removedCount += hi - lo;
        }

        this[$].bounds.splice(l, r - l);
        this[$].count -= removedCount;

        if (this[$].bounds.length === 0) {
            //  All ranges are removed.
            this[$].count = 0;
        }

        return l;
    }

    public remove(start: number, end: number = start + 1): void {
        this._remove(start, end);
    }

    /** Removes `start..<end`, and shifts all elements >= `end` left by `end - start`. */
    public removeSpanIn(start: number, end: number): void {
        let l = this._remove(start, end);
        if (l === -1) {return;}

        let delta = end - start;

        for (let i = l; i < this[$].bounds.length; i += 2) {
            this[$].bounds[i] -= delta;
            this[$].bounds[i + 1] -= delta;
        }

        if (l !== 0 && l !== this[$].bounds.length) {
            //  Check if sibling ranges are joint.
            if (this[$].bounds[l] === this[$].bounds[l - 1]) {
                this[$].bounds.splice(l - 1, 2);
            }
        }
    }

    public removeAll(): void {
        this[$].bounds.splice(0, this[$].bounds.length);
        this[$].count = 0;
    }

    //  Performs XOR operation on each element of the set and in the given range.
    public toggle(start: number, end: number = start + 1): void {
        if (!(start < end)) {return;}

        if (this[$].count === 0) {
            this[$].bounds.push(start, end);
            this[$].count += end - start;
            return;
        }

        //  Binary search for the last bound >= `start`. The bound could be either start or end.
        let l = 0, r = this[$].bounds.length;
        while (l < r) {
            let m = (l + r) >>> 1;  //  We don't care about the parity of the index.
            let bound = this[$].bounds[m];
            if (start <= bound) {
                r = m;
            } else {
                l = m + 1;
            }
        }

        //  Also, find the last bound >= `end`.
        //  Count differing might be determined during this loop, but too complicated.
        r = l;
        while (r < this[$].bounds.length) {
            let bound = this[$].bounds[r];
            if (end <= bound) {break;}
            r += 1;  //  Again, we don't care about the parity.
        }

        if (l !== this[$].bounds.length && start === this[$].bounds[l]) {
            this[$].bounds.splice(l, 1); r -= 1;
        } else {  //  `start` < `_bounds[l]`.
            this[$].bounds.splice(l, 0, start); r += 1;
        }

        if (r !== this[$].bounds.length && end === this[$].bounds[r]) {
            this[$].bounds.splice(r, 1);
        } else {  //  `end` < `_bounds[r]`.
            this[$].bounds.splice(r, 0, end);
        }

        let count = 0;  //  Recalculate count, directly.
        for (let i = 0; i < this[$].bounds.length; i += 2) {
            count += this[$].bounds[i + 1] - this[$].bounds[i];
        }
        this[$].count = count;
    }

    public assignFrom(other: RangeSet): void {
        this[$].bounds = other[$].bounds.slice();
        this[$].count = other[$].count;
    }

    public isEqual(other: any): boolean {
        if (this === other) {return true;}
        if (!(other instanceof RangeSet)) {return false;}

        if (this[$].bounds === other[$].bounds) {return true;}
        if (this[$].bounds.length !== other[$].bounds.length) {return false;}
        for (let i = 0; i < this[$].bounds.length; ++i) {
            if (this[$].bounds[i] !== other[$].bounds[i]) {return false;}
        }
        return true;
    }

    public makeCopy(): RangeSet {
        let copy = new RangeSet();
        copy[$].bounds = this[$].bounds.slice();
        copy[$].count = this[$].count;
        return copy;
    }

    public union(other: RangeSet): RangeSet {
        let result = new RangeSet();
        let bounds = result[$].bounds;
        let count = 0;

        let lastHi = Number.NaN;  //  When comparing, be careful with NaN!

        let p = 0, q = 0;
        while (p < this[$].bounds.length && q < other[$].bounds.length) {
            let thisLo = this[$].bounds[p];
            let otherLo = other[$].bounds[q];

            //  Try to add the range with smaller lower bound.
            let lo = 0, hi = 0;
            if (thisLo < otherLo) {
                lo = thisLo;
                hi = this[$].bounds[p + 1];
                p += 2;
            } else {
                lo = otherLo;
                hi = other[$].bounds[q + 1];
                q += 2;
            }

            if (hi <= lastHi) {continue;}  //  Already covered.
            if (lo <= lastHi) {  //  Partially covered.
                bounds[bounds.length - 1] = hi;
                count += hi - lastHi;
            } else {  //  Not covered.
                bounds.push(lo, hi);
                count += hi - lo;
            }

            lastHi = hi;
        }

        function addRest(bounds: number[], source: readonly number[], i: number, lastHi: number): number {
            let count = 0;

            //  First check (partially) covered ranges.
            while (i < source.length) {
                let hi = source[i + 1];
                if (hi < lastHi) {i += 2; continue;}  //  Already covered.

                let lo = source[i];
                if (lo <= lastHi) {  //  Partially covered.
                    bounds[bounds.length - 1] = hi;
                    count += hi - lastHi;
                } else {  //  Not covered.
                    bounds.push(lo, hi);
                    count += hi - lo;
                }

                i += 2;
                break;
            }

            //  Now the rest are never covered.
            while (i < source.length) {
                bounds.push(source[i], source[i + 1]);
                count += source[i + 1] - source[i];
                i += 2;
            }

            return count;
        }

        if (p < this[$].bounds.length) {
            count += addRest(bounds, this[$].bounds, p, lastHi);
        } else if (q < other[$].bounds.length) {
            count += addRest(bounds, other[$].bounds, q, lastHi);
        }

        result[$].count = count;
        return result;
    }

    public intersection(other: RangeSet): RangeSet {
        let result = new RangeSet();
        let bounds = result[$].bounds;
        let count = 0;

        //  Intersection is always a subset of any of the two sets.
        //  Therefore, no need to check and merge ranges.
        let p = 0, q = 0;
        while (p < this[$].bounds.length && q < other[$].bounds.length) {
            let thisLo = this[$].bounds[p];
            let thisHi = this[$].bounds[p + 1];
            let otherLo = other[$].bounds[q];
            let otherHi = other[$].bounds[q + 1];

            //  If the two ranges have intersection, append the intersection.
            if (thisHi > otherLo && thisLo < otherHi) {
                let lo = Math.max(thisLo, otherLo);
                let hi = Math.min(thisHi, otherHi);
                bounds.push(lo, hi);
                count += hi - lo;
            }

            //  Move the range with smaller upper bound.
            if (thisHi === otherHi) {
                p += 2;
                q += 2;
            } else if (thisHi < otherHi) {
                p += 2;
            } else {
                q += 2;
            }
        }

        result[$].count = count;
        return result;
    }

    public difference(other: RangeSet): RangeSet {
        //  TODO: Optimize.
        let result = this.makeCopy();
        for (let i = 0; i < other[$].bounds.length; i += 2) {
            result.remove(other[$].bounds[i], other[$].bounds[i + 1]);
        }

        return result;
    }

    public symmetricDifference(other: RangeSet): RangeSet {
        //  TODO: Optimize.
        let moreRanges: RangeSet, lessRanges: RangeSet;
        this[$].bounds.length < other[$].bounds.length
            ? (moreRanges = other, lessRanges = this)
            : (moreRanges = this, lessRanges = other);

        let result = moreRanges.makeCopy();
        for (let i = 0; i < lessRanges[$].bounds.length; i += 2) {
            result.toggle(lessRanges[$].bounds[i], lessRanges[$].bounds[i + 1]);
        }

        return result;
    }
}
