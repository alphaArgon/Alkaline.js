/*
 *  decimal.from.test.ts
 *  Alkaline
 *
 *  Created by alpha on 2025/3/17.
 *  Copyright © 2025 alphaArgon.
 */

import test from "node:test";
import assert from "node:assert";
import { Decimal } from "$alkaline/decimal";
import { ComparisonResult } from "$alkaline/base";


test("Decimal.zero", () => {
    assert.equal(Decimal.zero.places, 0);
    assert.equal(Decimal.zero.toString(), "0");
    assert.equal(Decimal.zero.valueOf(), 0);
});


test("Decimal.from number initialization", () => {
    let d = Decimal.from(123.456, 3);
    assert.equal(d.toString(), "123.456");

    d = Decimal.from(123.456, 0);
    assert.equal(d.toString(), "123");

    d = Decimal.from(123.456, 1);
    assert.equal(d.toString(), "123.5");

    d = Decimal.from(1234.56, 0);
    assert.equal(d.toString(), "1235");

    d = Decimal.from(1234.56, 1);
    assert.equal(d.toString(), "1234.6");

    d = Decimal.from(1234.56, 2);
    assert.equal(d.toString(), "1234.56");

    d = Decimal.from(1e-20, 20);
    assert.equal(d.toString(), "0.00000000000000000001");

    d = Decimal.from(1e-20, 19);
    assert(d.isNumericEqual(Decimal.zero));
});


test("Decimal.from string initialization", () => {
    let d = Decimal.from("123.456");
    assert.equal(d.toString(), "123.456");
    assert.equal(d.places, 3);

    d = Decimal.from("-0123.4560");
    assert.equal(d.toString(), "-123.4560");
    assert.equal(d.places, 4);
    assert.equal(d.trimmedPlaces, 3);
    assert.equal(d.signum, -1);
    assert.equal(d.negated().toString(), "123.4560");
});


test("Decimal.from operations", () => {
    assert(Decimal.from(-0).isEqual(Decimal.from(0)));
    assert(Decimal.from(-0).signum === 0);

    let a = Decimal.from(12.345, 3);
    let b = Decimal.from(-678.90, 2);

    assert.equal(a.toString(), "12.345");
    assert.equal(b.toString(), "-678.90");

    assert(a.compare(b) === ComparisonResult.descending);
    assert(b.compare(a) === ComparisonResult.ascending);
    assert(a.signum === 1);
    assert(b.signum === -1);

    let sum = a.adding(b);
    assert.equal(sum.toString(), "-666.555");
    assert.equal(sum.places, 3);

    let diff = a.subtracting(b);
    assert.equal(diff.toString(), "691.245");
    assert.equal(diff.places, 3);

    let product = a.multipliedBy(b);
    assert.equal(product.toString(), "-8381.02050");
    assert.equal(product.places, 5);

    let quotient = a.dividedBy(b);
    assert.equal(quotient.toString(), "-0.018");
    assert.equal(quotient.places, 3);  //  Places are the same as the dividend.

    assert.equal(a.multipliedBy(3).toString(), "37.035");
    assert.equal(a.dividedBy(6).toString(), "2.057");  //  Truncated.

    assert.equal(a.multipliedBy(Decimal.zero).places, 3);
    assert.throws(() => a.dividedBy(0), Error);

    assert(a.negated().adding(a).isNumericEqual(Decimal.zero));
    assert(a.negated().subtracting(a).isEqual(a.multipliedBy(-2)));
});


test("Decimal.from rounding", () => {
    let posi = Decimal.from("2.50");
    let nega = Decimal.from("-2.50");

    assert.equal(posi.toFixed(0, "round"), "3");
    assert.equal(nega.toFixed(0, "round"), "-2");  //  Not "-3".
    assert.equal(Math.round(-2.5), -2);

    assert.equal(posi.toFixed(0, "ceil"), "3");
    assert.equal(nega.toFixed(0, "ceil"), "-2");

    assert.equal(posi.toFixed(0, "floor"), "2");
    assert.equal(nega.toFixed(0, "floor"), "-3");
});


test("Decimal.from BigInt support", () => {
    let rep = "9".repeat(50) + "." + "9".repeat(50)
    let d = Decimal.from(rep);
    assert.equal(d.toString(), rep);
    assert.equal(d.places, 50);

    let c = d.subtracting(Decimal.from(1));
    assert.equal(c.toString(), "9".repeat(49) + "8." + "9".repeat(50));
    assert(c.dividedBy(c).isEqual(Decimal.from(1, 50)));
    assert(c.dividedBy(c).toPlaces(0).isEqual(Decimal.from(1)));
});


test("Decimal.from bad initialization", () => {
    assert.throws(() => Decimal.from(NaN), Error);
    assert.throws(() => Decimal.from(Infinity), Error);
    assert.throws(() => Decimal.from("a"), Error);
});


test("Decimal.from fitting", () => {
    assert(Decimal.zero.integerFitsIn(0));
    assert(Decimal.from("000.000").integerFitsIn(0));

    let d = Decimal.from("123.456");
    assert(!d.integerFitsIn(-1));
    assert(!d.integerFitsIn(0));
    assert(!d.integerFitsIn(2));
    assert(d.integerFitsIn(3));
    assert(d.integerFitsIn(6));

    let b = d.negated();
    assert(!b.integerFitsIn(-1));
    assert(!b.integerFitsIn(0));
    assert(!b.integerFitsIn(2));
    assert(b.integerFitsIn(3));
    assert(b.integerFitsIn(6));

    let p = Decimal.from(999.999, 3);
    assert(p.integerFitsIn(3));
    assert(p.integerFitsIn(6));
});
