/*
 *  tests/array.ts
 *  Polymprph
 *
 *  Created by alpha on 2025/3/4.
 *  Copyright © 2025 alphaArgon.
 */

import test from "node:test";
import assert from "node:assert";

import { Notification, NotificationCenter } from "@/Notification";
import { reactive, ReactiveArray } from "@/Reactive";
import { arrayDiff, ArrayDiff } from "@/Diffing";
import { RangeSet } from "@/RangeSet";
import { equals } from "@/Base";
import { repeated } from "@/Repeated";
import { Point } from "./Base";


let receiver = {

    latest: null as ArrayDiff<number> | null,

    receive(notification: Notification<any>) {
        this.latest = notification.userInfo;
    }
}

NotificationCenter.default = new NotificationCenter(true);


test("Array Diff", () => {
    let array = [0, 1, 2, 3, 4];
    let brray = [2, 3, 5, 7, 9];
    let diff = arrayDiff(array, brray, equals);

    assert.equal(diff.removals.length, 3);
    assert.equal(diff.insertions.length, 3);
    
    assert.deepEqual(diff.apply(array), brray);
    assert.deepEqual(diff.inverse.apply(brray), array);

    let random1 = Array.from({length: 100}, () => Math.floor(Math.random() * 100));
    let random2 = random1.slice(0, 50).sort(() => Math.random() - 0.5);
    let randomDiff = arrayDiff(random1, random2, equals);
    assert.deepEqual(randomDiff.apply(random1), random2);
    assert.deepEqual(randomDiff.inverse.apply(random2), random1);
});


test("Array Diff with moved elements", () => {
    const array = [1, 2, 3, 4];
    const brray = [3, 2, 4, 1];
    const diff = arrayDiff(array, brray, equals);

    assert.ok(diff.removals.length <= 2);
    assert.ok(diff.insertions.length <= 2);
    assert.deepEqual(diff.apply(array), brray);
});


test("Reactive array methods", () => {
    let array = reactive<number>([], equals);
    NotificationCenter.default.addObserver(receiver, "receive", ReactiveArray.didChangeNotification, array);

    array.assignFrom([0, 1, 2, 3]);
    assert.equal(receiver.latest!.removals.length, 0);
    assert.equal(receiver.latest!.insertions.length, 4);

    array.assignFrom([1, 2, 3]);
    assert.equal(receiver.latest!.removals.length, 1);
    assert.equal(receiver.latest!.insertions.length, 0);

    array.push(4, 5, 6, 7);
    assert.equal(receiver.latest!.removals.length, 0);
    assert.deepEqual(receiver.latest!.insertions, [
        {insertedAt: 3, element: 4},
        {insertedAt: 4, element: 5},
        {insertedAt: 5, element: 6},
        {insertedAt: 6, element: 7},
    ]);

    array.unshift(-2, -1, 0);
    assert.equal(receiver.latest!.removals.length, 0);
    assert.deepEqual(receiver.latest!.insertions, [
        {insertedAt: 0, element: -2},
        {insertedAt: 1, element: -1},
        {insertedAt: 2, element: 0},
    ]);

    assert.deepEqual(array, [-2, -1, 0, 1, 2, 3, 4, 5, 6, 7]);

    array.pop();
    assert.equal(receiver.latest!.insertions.length, 0);
    assert.deepEqual(receiver.latest!.removals, [{removedAt: 9, element: 7}]);

    array.shift();
    assert.equal(receiver.latest!.insertions.length, 0);
    assert.deepEqual(receiver.latest!.removals, [{removedAt: 0, element: -2}]);

    assert.deepEqual(array, [-1, 0, 1, 2, 3, 4, 5, 6]);
    let saved = array.slice();
    
    array.copyWithin(1, 4, 8);
    assert.deepEqual(array, [-1, 3, 4, 5, 6, 4, 5, 6]);
    assert.deepEqual(receiver.latest!.apply(saved), array);
    assert.deepEqual(receiver.latest!.inverse.apply(array), saved);

    array.length = 0;
    assert.equal(receiver.latest!.removals.length, 8);
    receiver.latest = null;

    array.pop();
    assert.equal(receiver.latest, null);

    array.shift();
    assert.equal(receiver.latest, null);
});


test("Reactive array sort", () => {
    let array = reactive([8, 1, 2, 3, 4, 5, 6, 7], equals);
    NotificationCenter.default.addObserver(receiver, "receive", ReactiveArray.didChangeNotification, array);

    array.sort((a, b) => a - b);
    assert.deepEqual(array, [1, 2, 3, 4, 5, 6, 7, 8]); 
    assert.deepEqual(receiver.latest!.removals, [{removedAt: 0, element: 8}]);
    assert.deepEqual(receiver.latest!.insertions, [{insertedAt: 7, element: 8}]);

    let random = [31, 41, 59, 26, 53, 58, 97, 93, 23, 84, 62, 64, 33, 83, 27, 95];
    array.assignFrom(random);
    
    array.sort((a, b) => a - b);
    let diff = receiver.latest!;

    assert.deepEqual(diff.inverse.apply(array), random);

    array.reverse();
    assert.equal(receiver.latest!.removals.length, array.length - 1);
    assert.equal(receiver.latest!.insertions.length, array.length - 1);
    assert.deepEqual(receiver.latest!.apply(array.slice().reverse()), array);
});


test("Reactive array subscripting", () => {
    let array = reactive([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], equals);
    NotificationCenter.default.addObserver(receiver, "receive", ReactiveArray.didChangeNotification, array);

    array[0] = 20;
    assert.equal(receiver.latest!.removals[0].element, 0);
    assert.equal(receiver.latest!.insertions[0].element, 20);

    array.length = 5;
    assert.deepEqual(receiver.latest!.removedIndices, new RangeSet(5, 10));

    array.length = 10;
    assert.ok(receiver.latest!.insertions.every((e, i) => (e.insertedAt === i + 5) && e.element === undefined));
});


test("Reactive array splice", () => {
    const array = reactive([1, 2, 3], equals);
    NotificationCenter.default.addObserver(receiver, "receive", ReactiveArray.didChangeNotification, array);

    const removed = array.splice(1, 1, 4, 5);
    assert.deepEqual(removed, [2]);
    assert.deepEqual(array, [1, 4, 5, 3]);
    assert.deepEqual(receiver.latest!.removals, [
        {removedAt: 1, element: 2}
    ]);
    assert.deepEqual(receiver.latest!.insertions, [
        { insertedAt: 1, element: 4 },
        { insertedAt: 2, element: 5 }
    ]);
});


test("Reactive array overrides", () => {
    let array = [0, 1, 2, 3, 4];
    let brray = reactive(array, equals);

    assert.equal((array as any).splice().length, 0);
    assert.equal((brray as any).splice().length, 0);

    assert.deepEqual(array.splice(-1), [4]);
    assert.deepEqual(brray.splice(-1), [4]);

    assert.deepEqual(array.splice(0), [0, 1, 2, 3]);
    assert.deepEqual(brray.splice(0), [0, 1, 2, 3]);

    array = [0, 1, 2, 3, 4];
    brray = reactive(array, equals);

    assert.deepEqual(array.splice(10), []);
    assert.deepEqual(brray.splice(10), []);

    assert.deepEqual(array.splice(2.5, 7.5), [2, 3, 4]);
    assert.deepEqual(brray.splice(2.5, 7.5), [2, 3, 4]);
});


test("Repeated", () => {
    for (let length of [0, 2, 4, 8, 16, 32, 64, 128]) {
        let repeating = repeated(length, Point.zero);
        let array = Array.from({length}, () => Point.zero);
        assert(Array.isArray(repeating));
        assert.equal(repeating.toString(), array.toString());
        assert.deepEqual(repeating, array);
        assert(equals(repeating, array));
    }

    let count = 0;
    let repeating = repeated(20, Point.zero);
    let mapped = repeating.map(point => {
        count += 1;
        return point.x;
    });

    assert.equal(count, 20);  //  Even if repeated, the callback may return different objects.
    assert.deepEqual(mapped, repeated(20, 0));

    count = 0;
    let index = repeating.findIndex(point => {
        count += 1;
        return !equals(point, Point.zero);
    })

    assert.equal(count, 1);  //  For repeated elements, one call is enough.
    assert.equal(index, -1);

    count = 0;
    let flag = repeating.every(point => {
        count += 1;
        return equals(point, Point.zero);
    });

    assert.equal(count, 1);
    assert.equal(flag, true);

    count = 0;
    flag = repeating.every((point, i) => {
        count += 1;
        return equals(point, Point.zero);
    });

    assert.equal(count, 20);  //  If the index is used, we can’t stop early.
    assert.equal(flag, true);
});
