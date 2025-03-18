/*
 *  Result.ts
 *  Alkaline
 *
 *  Created by alpha on 2025/3/18.
 *  Copyright © 2025 alphaArgon.
 */

import test from "node:test";
import assert from "node:assert";

import { Result } from "@/Result";


test("Result creation", () => {
    let success = Result.success(42);
    assert.strictEqual(success.value, 42);
    assert.strictEqual(success.isFailure, false);

    let failure = Result.failure("error");
    assert.strictEqual(failure.value, "error");
    assert.strictEqual(failure.isFailure, true);
});


test("Result unwrap", () => {
    let success = Result.success(42);
    assert.strictEqual(success.unwrap(), 42);

    let failure = Result.failure("error");
    assert.throws(() => failure.unwrap(), e => e === "error");
});


test("Result tapping", () => {
    let tapped = false;

    let success = Result.success(42);
    success.tapping(value => {
        assert.strictEqual(value, 42);
        tapped = true;
    });

    assert(tapped);

    tapped = false;

    let failure = Result.failure("error");
    failure.tapping(() => tapped = true);
    assert(!tapped);
});


test("Result map", () => {
    let success = Result.success(42);
    let mapped = success.map(value => value * 2);
    assert.strictEqual(mapped.value, 84);
    assert.strictEqual(mapped.isFailure, false);

    let failure = Result.failure("error");
    let mappedFailure = failure.map(value => value * 2);
    assert.strictEqual(mappedFailure.value, "error");
    assert.strictEqual(mappedFailure.isFailure, true);
});


test("Result mapError", () => {
    let success = Result.success(42);
    let mapped = success.mapError(error => `Error: ${error}`);
    assert.strictEqual(mapped.value, 42);
    assert.strictEqual(mapped.isFailure, false);

    let failure = Result.failure("error");
    let mappedFailure = failure.mapError(error => `Error: ${error}`);
    assert.strictEqual(mappedFailure.value, "Error: error");
    assert.strictEqual(mappedFailure.isFailure, true);
});


test("Result flatMap", () => {
    let success = Result.success(42);
    let mapped = success.flatMap(value => Result.success(value * 2));
    assert.strictEqual(mapped.value, 84);
    assert.strictEqual(mapped.isFailure, false);

    let failure = Result.failure("error");
    let mappedFailure = failure.flatMap(value => Result.success(value * 2));
    assert.strictEqual(mappedFailure.value, "error");
    assert.strictEqual(mappedFailure.isFailure, true);
});


test("Result flatMapError", () => {
    let success = Result.success(42);
    let mapped = success.flatMapError(error => Result.failure(`Error: ${error}`));
    assert.strictEqual(mapped.value, 42);
    assert.strictEqual(mapped.isFailure, false);

    let failure = Result.failure("error");
    let mappedFailure = failure.flatMapError(error => Result.failure(`Error: ${error}`));
    assert.strictEqual(mappedFailure.value, "Error: error");
    assert.strictEqual(mappedFailure.isFailure, true);
});


test("Result zip", () => {
    let success1 = Result.success(42);
    let success2 = Result.success("hello");
    let success3 = Result.success(true);
    let failure = Result.failure("error");

    let allSuccess = Result.zip(success1, success2, success3);
    assert.deepStrictEqual(allSuccess.value, [42, "hello", true]);
    assert.strictEqual(allSuccess.isFailure, false);

    let withFailure = Result.zip(success1, failure, success3);
    assert.strictEqual(withFailure.value, "error");
    assert.strictEqual(withFailure.isFailure, true);
});


test("Result zipErrors", () => {
    let success1 = Result.success(42);
    let success2 = Result.success("hello");
    let success3 = Result.success(true);
    let failure1 = Result.failure("error1");
    let failure2 = Result.failure("error2");

    let allSuccess = Result.zipErrors(success1, success2, success3);
    assert.deepStrictEqual(allSuccess.value, [42, "hello", true]);
    assert.strictEqual(allSuccess.isFailure, false);

    let withFailures = Result.zipErrors(success1, failure1, success2, failure2);
    assert.deepStrictEqual(withFailures.value, ["error1", "error2"]);
    assert.strictEqual(withFailures.isFailure, true);
});
