/*
 *  Base.ts
 *  Foundation
 *
 *  Created by alpha on 2025/3/7.
 *  Copyright © 2025 alphaArgon.
 */

import { arrayEquals } from "./Array";



//  MARK: - Equatability


/** A interface for a custom object to define its own equality check. */
export interface CustomEquatable {

    /** Whether the receiver is equal to the given value. The given value is not guaranteed to be
      * of the same type as the receiver; you should handle it manually. */
    isEqual(other: any): boolean;
}


/** Any type whose equality can be checked by `equals`, which include primitive values and its
 * corresponding boxed values, `Date`, a value that implements `CustomEquatable`, and an array of
 * values of type `AnyEquatable`. */
export type AnyEquatable = null | undefined | Boolean | Number | String | Symbol | BigInt | Date
    | CustomEquatable | readonly AnyEquatable[];


/** Returns whether the given two values are considered equal.
  * 
  * For example, two `true`s, `NaN`s, a `null`s, a primitive value and its corresponding boxed
  * value, and arrays of equal elements are considered equal. If a value/element on the left hand
  * side implements `isEqual`, it will be used for comparison; this implies the asymmetry of the
  * function.
  * 
  * Note that for two objects of the same type, `equals` will only return `true` if they are the
  * same instance, which is to say, `equals({}, {})` will return `false`. */
export function equals(a: AnyEquatable, b: AnyEquatable): boolean {
    //  Check for primitive equality.
    if (a === b || Object.is(a, b)) {return true;}

    //  Filter out nullish `a`.
    if (a === null || a === undefined) {return false;}

    //  Check for `isEqual` method.
    let aEqual = (a as CustomEquatable).isEqual;
    if (typeof aEqual === "function") {
        return aEqual.call(a, b);
    }

    //  Filter out nullish `b`.
    if (b === null || b === undefined) {return false;}

    //  Check for `valueOf` method.
    let aValue = a.valueOf(), bValue = b.valueOf();
    if (aValue === bValue || Object.is(aValue, bValue)) {return true;}

    //  Check array equality.
    if (Array.isArray(a) && Array.isArray(b)) {
        return arrayEquals(a, b, equals);
    }

    return false;
}


//  MARK: - Comparison


export const enum ComparisonResult {
    ascending = -1, same = 0, descending = 1
}


export interface CustomComparable extends CustomEquatable {

    compare(other: this): ComparisonResult;
}


//  MARK: - Copying


/** A type that is allowed to make a copy of itself. */
export interface CustomCopyable {

    makeCopy(): unknown;
}


//  MARK: - Runtime


/** A property key of an object, which can be used to lookup a function by name. */
export type Selector<T = any> = (string | symbol) & keyof T;


/** Returns the name of the given function. */
export function selector(func: Function): Selector;
export function selector<T>(func: Function, of: T): Selector<T>;
export function selector(func: Function, of?: any): Selector<any> {
    return func.name as Selector;
}


/** A wrapper type to pass in-out parameters. */
export type Indirect<T> = {value: T};
