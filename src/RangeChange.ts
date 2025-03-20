/*
 *  RangeChange.ts
 *  Alkaline
 *
 *  Created by alpha on 2025/3/15.
 *  Copyright © 2025 alphaArgon.
 */

import { CustomEquatable } from "./Base";


/** Creates a readonly range. If the second argument is not specified, a range of length 1 is
  * created. */
export function range(start: number, end: number = start + 1): Range {
    let numberStart = +start;
    let numberEnd = +end;

    if (!(numberStart <= numberEnd)) {
        throw new RangeError("Start must be less than or equal to end.");
    }

    return Object.freeze<Range>({
        start: numberStart,
        end: numberEnd,
        //@ts-expect-error
        __proto__: Range.prototype,
    });
}


/** A readonly range. */
export class Range implements Iterable<number>, CustomEquatable {

    readonly start: number;
    readonly end: number;
    
    private constructor() {
        throw new Error("Use `range` to create a range.");
    }

    public get length(): number {
        return this.end - this.start;
    }

    public *[Symbol.iterator](): IterableIterator<number> {
        for (let i = this.start; i < this.end; ++i) {
            yield i;
        }
    }

    public isEqual(other: any): boolean {
        if (!(other instanceof Range)) {return false;}
        return this.start === other.start && this.end === other.end;
    }

    /** Returns a range change indicating all elements in the range are changed. */
    public dirtyChange(): RangeChange {
        return Object.freeze<RangeChange>({
            start: this.start,
            oldEnd: this.end,
            newEnd: this.end,
            //@ts-expect-error
            __proto__: RangeChange.prototype,
        });
    }

    /** Returns a range change indicating elements in the range are replaced by new elements, which
      * results in a new range with a different end. */
    public endChange(newEnd: number): RangeChange {
        let numberNewEnd = +newEnd;

        if (!(this.start <= numberNewEnd)) {
            throw new RangeError("New end must be greater than or equal to start.");
        }

        return Object.freeze<RangeChange>({
            start: this.start,
            oldEnd: this.end,
            newEnd: numberNewEnd,
            //@ts-expect-error
            __proto__: RangeChange.prototype,
        });
    }

    /** Returns a range change indicating elements in the range are replaced by new elements, which
      * results in a new range with a different length. */
    public lengthChange(newLength: number): RangeChange {
        let numberNewLength = +newLength;

        if (!(numberNewLength >= 0)) {
            throw new RangeError("New length must be greater than or equal to 0.");
        }

        return Object.freeze<RangeChange>({
            start: this.start,
            oldEnd: this.end,
            newEnd: this.start + numberNewLength,
            //@ts-expect-error
            __proto__: RangeChange.prototype,
        });
    }
}


/** A range change. */
export class RangeChange implements CustomEquatable {

    readonly start: number;
    readonly oldEnd: number;
    readonly newEnd: number;

    private constructor() {
        throw new Error("Use methods of `Range` to create a range change.");
    }

    public get oldRange(): Range {
        return range(this.start, this.oldEnd);
    }

    public get newRange(): Range {
        return range(this.start, this.newEnd);
    }

    public get diffLength(): number {
        return this.newEnd - this.oldEnd;
    }

    public concat(other: RangeChange): RangeChange {
        let start = Math.min(this.start, other.start);
        let oldEnd = Math.max(this.oldEnd, other.oldEnd - this.diffLength);
        let newEnd = Math.max(this.newEnd + other.diffLength, other.newEnd);

        return Object.freeze<RangeChange>({
            start: start,
            oldEnd: oldEnd,
            newEnd: newEnd,
            //@ts-expect-error
            __proto__: RangeChange.prototype,
        });
    }

    public isEqual(other: any): boolean {
        if (!(other instanceof RangeChange)) {return false;}
        return this.start === other.start && this.oldEnd === other.oldEnd && this.newEnd === other.newEnd;
    }
}
