/*
 *  _RunArray.ts
 *  Alkaline
 *
 *  Created by alpha on 2024/12/28.
 *  Copyright © 2024 alphaArgon.
 */

import { Indirect } from "./Base";


export type _Run<T> = {length: number, value: T};


export class _RunArray<T> {

    private _runs: _Run<T>[];
    private _length: number;
    private _hotIndex: number;
    private _hotRunIndex: number;

    private _equal: (a: T, b: T) => boolean;

    public constructor(equal: (a: T, b: T) => boolean) {
        this._runs = [];
        this._length = 0;
        this._hotIndex = 0;
        this._hotRunIndex = 0;
        this._equal = equal;
    }

    private _findRunIndexForIndex(indexToContain: number): void {
        let runs = this._runs;
        let index, runIndex: number;

        if (indexToContain > this._hotIndex / 2) {
            index = this._hotIndex;
            runIndex = this._hotRunIndex;
        } else {
            index = 0;
            runIndex = 0;
        }

        if (index <= indexToContain) {
            while (runIndex < runs.length && index + runs[runIndex].length <= indexToContain) {
                index += runs[runIndex].length;
                runIndex += 1;
            }
        } else {
            do {
                runIndex -= 1;
                index -= runs[runIndex].length;
            } while (runIndex > 0 && index > indexToContain);
        }

        this._hotIndex = index;
        this._hotRunIndex = runIndex;
    }

    private _findRunEndForRange(from: number, to: number): [endIndex: number, endRunIndex: number] {
        this._findRunIndexForIndex(from);

        let index = this._hotIndex;
        let runIndex = this._hotRunIndex;

        while (index < to) {
            index += this._runs[runIndex].length;
            runIndex += 1;
        }

        return [index, runIndex];
    }

    public get length(): number {
        return this._length;
    }

    public at(index: number, effectiveRangePtr?: Indirect<[from: number, to: number]>): T {
        index = ~~index;
        if (index < 0 || index >= this._length) {
            throw new RangeError("Index out of bounds");
        }

        this._findRunIndexForIndex(index);

        if (effectiveRangePtr !== undefined) {
            let run = this._runs[this._hotRunIndex];
            effectiveRangePtr.value = [this._hotIndex, this._hotIndex + run.length];
        }

        return this._runs[this._hotRunIndex].value;
    }

    public slice(from: number, to: number): _RunArray<T> {
        from = ~~from;
        to = ~~to;
        if (from < 0 || to > this._length || from > to) {
            throw new RangeError("Range out of bounds");
        }

        let slice = new _RunArray(this._equal);
        if (from === to) {return slice;}

        let [endIndex, endRunIndex] = this._findRunEndForRange(from, to);
        let startIndex = this._hotRunIndex;
        let startRunIndex = this._hotRunIndex;

        let sliceRuns = this._runs.slice(startRunIndex, endRunIndex);

        if (from !== startIndex) {
            let {length, value} = this._runs[startRunIndex];
            sliceRuns[0] = {length: length - (from - startIndex), value};
        }

        if (to !== endIndex) {
            let {length, value} = this._runs[endRunIndex];
            sliceRuns[sliceRuns.length - 1] = {length: length - (endIndex - to), value};
        }

        slice._runs = sliceRuns;
        slice._length = to - from;
        return slice;
    }

    public makeCopy(): _RunArray<T> {
        let copy = new _RunArray(this._equal);
        copy._runs = this._runs.slice();
        copy._length = this._length;
        copy._hotIndex = this._hotIndex;
        copy._hotRunIndex = this._hotRunIndex;
        return copy;
    }

    public isEqual(other: _RunArray<T>): boolean {
        if (this._length !== other._length) {return false;}
        if (this._equal !== other._equal) {return false;}

        let equal = this._equal;
        let thisRuns = this._runs;
        let otherRuns = other._runs;

        for (let i = 0; i < thisRuns.length; ++i) {
            if (thisRuns[i].length !== otherRuns[i].length) {return false;}
            if (!equal(thisRuns[i].value, otherRuns[i].value)) {return false;}
        }

        return true;
    }

    public replaceSubrange(from: number, to: number, withRuns: readonly _Run<T>[]): void {
        from = ~~from;
        to = ~~to;
        if (from < 0 || to > this._length || from > to) {
            throw new RangeError("Range out of bounds");
        }

        let equal = this._equal;

        let [endIndex, endRunIndex] = this._findRunEndForRange(from, to);
        let startIndex = this._hotRunIndex;
        let startRunIndex = this._hotRunIndex;
        let runs = this._runs;

        let newRuns = [] as _Run<T>[];
        let lastRun = null as _Run<T> | null;
        let insertions = 0;

        for (let run of withRuns) {
            insertions += run.length;

            if (lastRun !== null && equal(lastRun.value, run.value)) {
                lastRun.length += run.length;
            } else {
                lastRun = {length: run.length, value: run.value};
                newRuns.push(lastRun);
            }
        }

        if (newRuns.length !== 0) {
            //  Try to merge with the previous run. If can, extend the first run to the start.
            let value = newRuns[0].value;
            let merge = false;

            if (from !== startIndex) {
                if (equal(value, runs[startRunIndex].value)) {
                    merge = true;
                }
            } else if (startRunIndex > 0) {
                if (equal(value, runs[startRunIndex - 1].value)) {
                    startRunIndex -= 1;
                    startIndex -= runs[startRunIndex].length;
                    merge = true;
                }
            }

            if (merge) {
                newRuns[0].length += from - startIndex;
                from = startIndex;
            }
        }

        if (newRuns.length !== 0) {
            //  Try to merge with the next run. If can, extend the last run to the end.
            let value = newRuns[newRuns.length - 1].value;
            let merge = false;

            if (to !== endIndex) {
                if (equal(value, runs[endRunIndex - 1].value)) {
                    merge = true;
                }
            } else if (endRunIndex < runs.length) {
                if (equal(value, runs[endRunIndex].value)) {
                    endIndex += runs[endRunIndex].length;
                    endRunIndex += 1;
                    merge = true;
                }
            }

            if (merge) {
                newRuns[newRuns.length - 1].length += endIndex - to;
                to = endIndex;
            }
        }

        if (from !== startIndex) {
            //  If the start run is broken, copy the cap to the start of the new runs.
            let reaminder = {length: from - startIndex, value: runs[startRunIndex].value};
            newRuns.unshift(reaminder);
        }

        if (to !== endIndex) {
            //  If the end run is broken, copy the cup to the end of the new runs.
            let reaminder = {length: endIndex - to, value: runs[endRunIndex].value};
            newRuns.push(reaminder);
        }

        runs.splice(startRunIndex, endRunIndex - startRunIndex, ...newRuns);
        this._length += insertions - (to - from);
        this._hotIndex = startIndex;
        this._hotRunIndex = startRunIndex;
    }
}
