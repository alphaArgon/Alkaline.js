/*
 *  base.ts
 *  Alkaline
 *
 *  Created by alpha on 2025/3/7.
 *  Copyright © 2025 alphaArgon.
 */

import { supportsBigInt } from "$alkaline.private/es-utils";
import { arrayEquals } from "./array";


declare const subtype: unique symbol;
export type Subtype<T, U> = T & {[subtype]?: U};


//  MARK: - Equatability


/** Used by `ValueOfEquatable` interface to identify the type of the receiver. */
export const valueOfSpecies = Symbol("valueOfSpecies");


/** A interface for a custom object to define its own equality check. */
export interface CustomEquatable {

    /** Whether the receiver is equal to the given value. The given value is not guaranteed to be
      * of the same type as the receiver; you should handle it manually. */
    isEqual(other: any): boolean;
}


/** A type that can be represented by a primitive value returned by `valueOf`, thus can be checked
  * for equality by `===` or `Object.is`.
  *
  * Prefer `CustomEquatable` over this interface when possible. This interface is used for the
  * convenience of the boxed objects of primitive types. */
export interface ValueOfEquatable {

    /** Returns a primitive value that can be used to identify the receiver. */
    valueOf(): unknown;

    /** A value that can be used to identify the belonging of the receiver. Recommended to be the
      * constructor, or the base class, or a unique symbol. */
    readonly [valueOfSpecies]: unknown;
}


declare global {

    //  The primitive types has the same interface with their boxed types.
    interface Boolean extends ValueOfEquatable {}
    interface Number extends ValueOfEquatable {}
    interface String extends ValueOfEquatable {}
    interface Symbol extends ValueOfEquatable {}
    interface BigInt extends ValueOfEquatable {}

    //  Common built-in objects.
    interface Date extends ValueOfEquatable {}

    //  Support `RegExp` is not reasonable. We don’t know how to handle the `lastIndex` property.
}


for (let constructor of [Boolean, Number, String, Symbol, Date]) {
    Object.defineProperty(constructor.prototype, valueOfSpecies, {value: constructor});
}


if (supportsBigInt) {
    //  If `BigInt` is not supported, nor is `globalThis`.
    Object.defineProperty(BigInt.prototype, valueOfSpecies, {value: BigInt});
}


/** Any type whose equality can be checked by `equals`, which include primitive values and its
 * corresponding boxed values, `Date`, a value that implements `CustomEquatable`, and an array of
 * values of type `AnyEquatable`. */
export type AnyEquatable = null | undefined | ValueOfEquatable | CustomEquatable | readonly AnyEquatable[];


/** Returns whether the given two values are considered equal.
  *
  * For example, two primitive values that `===` returns `true`, two `NaN`s, two boxing objects of
  * the same value are considered equal. Note that an primitive value is not equal to any object,
  * including its boxed value: they are syntactically different.
  *
  * For objects, if a value on the left hand side implements `isEqual`, it will be used for
  * comparison. This means the function is asymmetric. If both arguments are arrays, they will be
  * compared element by element. Otherwise they are considered not equal. */
export function equals(a: AnyEquatable, b: AnyEquatable): boolean {
    //  Check for primitive equality.
    if (a === b || Object.is(a, b)) {return true;}

    //  Filter out primitive values.
    if (!(a instanceof Object)) {return false;}
    if (!(b instanceof Object)) {return false;}

    //  Check for `isEqual` method.
    let aEqual: ((other: any) => boolean) | undefined;
    if ("isEqual" in a && typeof (aEqual = a.isEqual) === "function") {
        return aEqual.call(a, b);
    }

    //  Check for `EquatableWithValueOf` conformance.
    if (valueOfSpecies in a && valueOfSpecies in b) {
        if (a[valueOfSpecies] !== b[valueOfSpecies]) {return false;}
        let aValue = a.valueOf(), bValue = b.valueOf();
        return aValue === bValue || Object.is(aValue, bValue);
    }

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
