/*
 *  decimal.ts
 *  Alkaline
 *
 *  Created by alpha on 2025/3/16.
 *  Copyright © 2025 alphaArgon.
 */

import { ComparisonResult, CustomComparable, CustomEquatable } from "./base";
import { $ } from "../private/symbols";


export type RoundingMethod = "round" | "ceil" | "floor" | "trunc";


let _zeroDecimal: Decimal | null = null;


/** An immutable fixed-point decimal number.
  * 
  * If the environment supports `BigInt`, the type supports any precision and unlimited range;
  * otherwise, the total number of places is about 17, due to the integer precision of `number`.
  * 
  * The value of this type must be finite, that is, not infinite or NaN.
*/
export class Decimal implements CustomEquatable, CustomComparable {

    [$]: _Existential;

    private constructor(passport: $, ext: _Existential) {
        if (passport !== $) {
            throw new Error("Use `Decimal.from` to create a new decimal.");
        }

        this[$] = ext;
    }

    /** A zero integer decimal with no places. */
    public static get zero(): Decimal {
        if (_zeroDecimal === null) {
            _zeroDecimal = new Decimal($, {scaled: 0, places: 0});
            Object.freeze(_zeroDecimal);
        }

        return _zeroDecimal;
    }

    /** Returns a decimal from a string representation. Trailing zeros are kept. */
    public static from(rep: string): Decimal;

    /** Returns a decimal from a number and the number of places. */
    public static from(n: number, places: number): Decimal;

    /** Returns a decimal with the number of places automatically determined from the number. */
    public static from(n: number): Decimal;

    public static from(arg1: number | string): Decimal {
        if (typeof arg1 === "string") {
            return new Decimal($, _makeFromRep(arg1));
        }

        if (!_isNumberSafe(arg1)) {
            throw new Error("Use a string representation to initialize large decimals.");
        }

        if (arguments.length > 1) {
            let places = arguments[1];
            if (places !== ~~places || places < 0) {
                throw new RangeError("Places must be a non-negative integer.");
            }

            let rep = arg1.toFixed(places);
            return new Decimal($, _makeFromRep(rep));
        }

        let rep = arg1.toPrecision(16);  //  16 is the length of `MAX_SAFE_INTEGER`.
        rep = rep.replace(/.?0+$/, "");
        return new Decimal($, _makeFromRep(rep));
    }

    /** Returns the number of digits in the fractional part. */
    public get places(): number {
        return this[$].places;
    }

    /** Returns the number of digits in the fractional part with trailing zeros trimmed. */
    public get trimmedPlaces(): number {
        let places = this[$].places;
        let scaled = this[$].scaled;

        if (typeof scaled === "number") {
            while (places !== 0 && scaled % 10 === 0) {
                places -= 1;
                scaled /= 10;
            }
        } else {
            while (places !== 0 && scaled % 10n === 0n) {
                places -= 1;
                scaled /= 10n;
            }
        }

        return places;
    }

    /** Returns a new decimal with the specified number of places. */
    public toPlaces(places: number, roundMethod: RoundingMethod = "round"): Decimal {
        if (places !== ~~places || places < 0) {
            throw new RangeError("Places must be a non-negative integer.");
        }

        let deltaPlaces = places - this[$].places;
        if (deltaPlaces === 0) {return this;}

        let scaled = deltaPlaces > 0
            ? _leftShift(this[$].scaled, deltaPlaces)
            : _rightShift(this[$].scaled, -deltaPlaces, roundMethod);

        return new Decimal($, {scaled, places});
    }

    /** Returns whether the decimal’s integer part has at most the specified number of digits.
      * 
      * This method is useful before storing the decimal into the database. For example, `DEC(6, 2)`
      * can store at most four digits of the integer part (whose absolute value should be less than
      * 10,000), so you can validate the decimal using `integerFitsIn(4)`. */
    public integerFitsIn(places: number): boolean {
        let shift = places + this.places;
        return _rightShift(this[$].scaled, shift, "trunc") === 0;
    }

    /** Returns the signum of the decimal. */
    public get signum(): number {
        if (this[$].scaled === 0) {return 0;}
        return this[$].scaled < 0 ? -1 : 1;
    }

    /** Returns the negated decimal. */
    public negated(): Decimal {
        return new Decimal($, {scaled: -this[$].scaled, places: this[$].places});
    }

    /** Returns the absolute value of the decimal. */
    public absolute(): Decimal {
        return this[$].scaled < 0 ? this.negated() : this;
    }

    /** Returns the sum of the two decimals. The number of places is the maximum of the two. */
    public adding(other: Decimal): Decimal {
        let [as, bs, places] = _alignPlaces(this[$], other[$]);

        //  They are either both `number`s or both `bigint`s, but TypeScript cannot infer that.
        let scaled = _makeNumberIfSafe((as as any) + (bs as any));
        return new Decimal($, {scaled, places});
    }

    /** Returns the difference of the two decimals. The number of places is the maximum of the two. */
    public subtracting(other: Decimal): Decimal {
        let [as, bs, places] = _alignPlaces(this[$], other[$]);

        //  They are either both `number`s or both `bigint`s, but TypeScript cannot infer that.
        let scaled = _makeNumberIfSafe((as as any) - (bs as any));
        return new Decimal($, {scaled, places});
    }

    /** Returns the product of the two decimals. The number of places is the sum of the two. */
    public multipliedBy(other: Decimal | number): Decimal {
        let scaled: number | bigint;
        let places: number;

        if (typeof other === "number") {
            if (!Number.isInteger(other)) {
                throw new Error("Number multiplier must be an integer.");
            }

            scaled = _mixedTimes(this[$].scaled, other);
            places = this[$].places;

        } else {
            scaled = _mixedTimes(this[$].scaled, other[$].scaled);
            places = this[$].places + other[$].places;
        }

        return new Decimal($, {scaled, places});
    }

    /** Returns the quotient of the two decimals. The number of places is unchanged, but the value
      * is truncated. Prefer using `multipliedBy` if the precision is important.
      * 
      * Throws a `RangeError` if the divisor is zero. */
    public dividedBy(other: Decimal | number): Decimal {
        let dividend: number | bigint;
        let divisor: number | bigint;

        if (typeof other === "number") {
            if (!Number.isInteger(other)) {
                throw new Error("Number multiplier must be an integer.");
            }

            dividend = this[$].scaled;
            divisor = other;
        } else {
            dividend = _leftShift(this[$].scaled, other[$].places);
            divisor = other[$].scaled;
        }

        if (divisor === 0) {
            throw new RangeError("Division by zero.");
        }

        let scaled = _mixedDivide(dividend, divisor);
        return new Decimal($, {scaled, places: this[$].places});
    }

    /** Returns whether the two decimals have the same value and places. */
    public isEqual(other: any): boolean {
        if (other === this) {return true;}
        if (!(other instanceof Decimal)) {return false;}
        return this[$].scaled === other[$].scaled
            && this[$].places === other[$].places;
    }

    /** Returns whether the numeric value of the two decimals are equal. */
    public isNumericEqual(other: this): boolean {
        return this.compare(other) === ComparisonResult.same;
    }

    /** Returns the comparison result of the numeric value of the two decimals. */
    public compare(other: this): ComparisonResult {
        let [as, bs, _] = _alignPlaces(this[$], other[$]);

        //  They are either both `number`s or both `bigint`s, but TypeScript cannot infer that.
        let delta = ((as as any) - (bs as any)) as number | bigint;

        if (delta < 0) {return ComparisonResult.ascending;}
        if (delta > 0) {return ComparisonResult.descending;}
        return ComparisonResult.same;
    }

    public valueOf(): number {
        let scaled = Number(this[$].scaled);
        return scaled / 10 ** this[$].places;
    }

    public toString(): string {
        if (this[$].places === 0) {
            return this[$].scaled.toString();
        }

        let sign: string;
        let digits: string;

        if (this[$].scaled < 0) {
            sign = "-";
            digits = (-this[$].scaled).toString();
        } else {
            sign = "";
            digits = this[$].scaled.toString();
        }

        digits = digits.padStart(this[$].places + 1, "0");

        let integer = digits.slice(0, -this[$].places);
        let fractional = digits.slice(-this[$].places);
        return sign + integer + "." + fractional;
    }

    public toFixed(places: number, roundMethod: RoundingMethod = "round"): string {
        return this.toPlaces(places, roundMethod).toString();
    }
}


type _Existential = {

    /** The value of the decimal scaled by 10^places, could be negative, must be an integer.
      * 
      * Whenever possible (exclusively in (MIN_SAFE_INTEGER, MAX_SAFE_INTEGER)), the value is stored
      * as a `number` instead of a `bigint`, which saves memory and improves performance. */
    scaled: number | bigint;

    /** The number of digits in the fractional part */
    places: number;
}


/** The passed value should be an integer. */
function _isNumberSafe(n: number | bigint): boolean {
    //  `bigint`s can be compared with `number`s.
    return n > Number.MIN_SAFE_INTEGER && n < Number.MAX_SAFE_INTEGER;
}


/** If the passed value is a `bigint` and can be stored as a `number`, returns the `number`. */
function _makeNumberIfSafe(n: number | bigint): number | bigint {
    if (typeof n === "number" || !_isNumberSafe(n)) {
        return n;
    } else {
        return Number(n);
    }
}


/** The passed values should be integers. */
function _mixedTimes(a: number | bigint, b: number | bigint): number | bigint {
    if (typeof a === "number" && typeof b === "number") {
        let scaled = a * b;
        if (_isNumberSafe(scaled)) {
            return scaled;
        }
    }

    return BigInt(a) * BigInt(b);
}


/** The passed value should be an integer. */
function _mixedDivide(a: number | bigint, b: number | bigint): number | bigint {
    let scaled: number | bigint;

    if (typeof a === "number" && typeof b === "number") {
        scaled = Math.trunc(a / b);
    } else {
        scaled = BigInt(a) / BigInt(b);
    }

    return _makeNumberIfSafe(scaled);
}


function _makeFromRep(rep: string): _Existential {
    let matches = rep.match(/^([+-]?\d+)(\.(\d+))?$/);
    if (matches === null) {
        throw new Error("The string is not a valid decimal representation.");
    }

    let ii = matches[1];
    let dd = matches[3] ?? "";
    let iidd = ii + dd;

    let scaled = Number(iidd);

    if (_isNumberSafe(scaled)) {
        return {scaled, places: dd.length};
    } else try {
        return {scaled: BigInt(iidd), places: dd.length};
    } catch {  //  Also throws if `BigInt` does not exist.
        throw new Error("The value is too large to be represented as a decimal.");
    }
}


function _alignPlaces(a: _Existential, b: _Existential): [as: number, bs: number, places: number] | [as: bigint, bs: bigint, places: number] {
    let places = Math.max(a.places, b.places);

    if (typeof a.scaled === "number" && typeof b.scaled === "number") {
        //  Both are `number`, but may overflow.
        let as = a.scaled * 10 ** (places - a.places);
        let bs = b.scaled * 10 ** (places - b.places);

        if (_isNumberSafe(as) && _isNumberSafe(bs)) {
            return [as, bs, places];
        }

        //  Fallthrough.
    }

    //  Make both `bigint`.
    let as = BigInt(a.scaled) * 10n ** BigInt(places - a.places);
    let bs = BigInt(b.scaled) * 10n ** BigInt(places - b.places);
    return [as, bs, places];
}


function _leftShift(n: number | bigint, byTens: number): number | bigint {
    if (typeof n === "number") {
        let s = n * 10 ** byTens;

        if (_isNumberSafe(s)) {
            return s;
        }
    }

    return BigInt(n) * 10n ** BigInt(byTens);
}


function _rightShift(n: number | bigint, byTens: number, roundMethod: RoundingMethod): number | bigint {
    //  For `round`,  -0.5 -> 0, +0.5 -> 1; it is asymetric.

    if (typeof n === "number") {
        let divisor = 10 ** byTens;
        let remainder = n % divisor;
        let quotient = Math.trunc(n / divisor);

        let negative = n < 0;
        let carry = 0;

        switch (roundMethod) {
        case "round":
            if (negative) {
                if (-remainder > divisor / 2) {carry = -1;}
            } else {
                if (remainder >= divisor / 2) {carry = 1;}
            }

            break;

        case "ceil":
            if (!negative && remainder !== 0) {carry = 1;}
            break;

        case "floor":
            if (negative && remainder !== 0) {carry = -1;}
            break;

        default:  //  `trunc`
            break;
        }

        return quotient + carry;  //  Less than `n` by absolute value, so must be safe.

    } else {
        let divisor = 10n ** BigInt(byTens);
        let remainder = n % divisor;
        let quotient = n / divisor;

        let negative = n < 0n;
        let carry = 0n;

        switch (roundMethod) {
        case "round":
            if (negative) {
                if (-remainder > divisor / 2n) {carry = -1n;}
            } else {
                if (remainder >= divisor / 2n) {carry = 1n;}
            }
            break;

        case "ceil":
            if (!negative && remainder !== 0n) {carry = 1n;}
            break;

        case "floor":
            if (negative && remainder !== 0n) {carry = -1n;}
            break;

        default:  //  `trunc`
            break;
        }

        return _makeNumberIfSafe(quotient + carry);
    }
}
