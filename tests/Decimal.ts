/*
 *  tests/Decimal.ts
 *  Polymprph
 *
 *  Created by alpha on 2025/3/17.
 *  Copyright © 2025 alphaArgon.
 */

import test from "node:test";
import assert from "node:assert";
import { Decimal, decimal } from "@/Decimal";
import { ComparisonResult } from "@/Base";


test("Decimal.zero", () => {
    assert.equal(Decimal.zero.places, 0);
    assert.equal(Decimal.zero.toString(), "0");
    assert.equal(Decimal.zero.valueOf(), 0);
});


test("Decimal number initialization", () => {
    let d = decimal(123.456, 3);
    assert.equal(d.toString(), "123.456");

    d = decimal(123.456, 0);
    assert.equal(d.toString(), "123");

    d = decimal(123.456, 1);
    assert.equal(d.toString(), "123.5");

    d = decimal(1234.56, 0);
    assert.equal(d.toString(), "1235");

    d = decimal(1234.56, 1);
    assert.equal(d.toString(), "1234.6");

    d = decimal(1234.56, 2);
    assert.equal(d.toString(), "1234.56");

    d = decimal(1e-20, 20);
    assert.equal(d.toString(), "0.00000000000000000001");

    d = decimal(1e-20, 19);
    assert(d.isNumericEqual(Decimal.zero));
});


test("Decimal string initialization", () => {
    let d = decimal("123.456");
    assert.equal(d.toString(), "123.456");
    assert.equal(d.places, 3);

    d = decimal("-0123.4560");
    assert.equal(d.toString(), "-123.4560");
    assert.equal(d.places, 4);
    assert.equal(d.trimmedPlaces, 3);
    assert.equal(d.signum, -1);
    assert.equal(d.negated().toString(), "123.4560");
});


test("Decimal operations", () => {
    assert(decimal(-0).isEqual(decimal(0)));
    assert(decimal(-0).signum === 0);

    let a = decimal(12.345, 3);
    let b = decimal(-678.90, 2);

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


test("Decimal rounding", () => {
    let posi = decimal("2.50");
    let nega = decimal("-2.50");

    assert.equal(posi.toFixed(0, "round"), "3");
    assert.equal(nega.toFixed(0, "round"), "-2");  //  Not "-3".
    assert.equal(Math.round(-2.5), -2);

    assert.equal(posi.toFixed(0, "ceil"), "3");
    assert.equal(nega.toFixed(0, "ceil"), "-2");

    assert.equal(posi.toFixed(0, "floor"), "2");
    assert.equal(nega.toFixed(0, "floor"), "-3");
});


test("Decimal BigInt support", () => {
    let rep = "9".repeat(50) + "." + "9".repeat(50)
    let d = decimal(rep);
    assert.equal(d.toString(), rep);
    assert.equal(d.places, 50);

    let c = d.subtracting(decimal(1));
    assert.equal(c.toString(), "9".repeat(49) + "8." + "9".repeat(50));
    assert(c.dividedBy(c).isEqual(decimal(1, 50)));
    assert(c.dividedBy(c).toPlaces(0).isEqual(decimal(1)));
});


test("Decimal bad initialization", () => {
    assert.throws(() => decimal(NaN), Error);
    assert.throws(() => decimal(Infinity), Error);
    assert.throws(() => decimal("a"), Error);
});
