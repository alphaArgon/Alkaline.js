/*
 *  _ESUtils.ts
 *  Foundation
 *
 *  Created by alpha on 2025/3/11.
 *  Copyright © 2025 alphaArgon.
 */


//  This file encapsulates some ES standard abstract operations.
//  The spec handles negative zeros, but currently we don’t distinguish them.


export function toIntegerOrInfinity(value: any): number {
    let number = Math.trunc(value);
    return isNaN(number) /* || number === 0 */ ? 0 : number;
}


/** Bounded in [0, length] */
export function resolveIndex(index: any, length: number, present: boolean): number {
    if (!present) {return 0;}
    let i = toIntegerOrInfinity(index);
    return i < 0 ? Math.max(0, length + i) : Math.min(i, length);
}


/** Bounded in [-1, length - 1] */
export function resolveBackwardsIndex(index: any, length: number, present: boolean): number {
    if (!present) {return length - 1;}
    let i = toIntegerOrInfinity(index);
    return i < 0 ? length + i : Math.min(i, length - 1);
}
