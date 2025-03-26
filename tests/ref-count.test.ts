/*
 *  ref-count.test.ts
 *  Alkaline
 *
 *  Created by alpha on 2025/3/26.
 *  Copyright © 2025 alphaArgon.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { RefCounted, autoreleasepool } from "$alkaline/ref-count";
import { $ } from "$alkaline.private/symbols"


test("Ref count", () => {
    let released = false;
    let resource = new RefCounted(0, () => released = true);
    assert.equal(resource[$].count, 1);

    resource.retain();
    assert.equal(resource[$].count, 2);

    resource.release();
    resource.release();
    assert(released);
    assert.equal(resource[$].count, 0);
    assert.equal(resource[$].value, undefined);

    assert.throws(() => resource.release());
});


test("Autoreleasing", () => {
    let released = false;
    let resource = new RefCounted(0, () => released = true);

    autoreleasepool(() => {
        resource.retain();
        assert.equal(resource[$].count, 2);

        resource.autorelease();
        assert.equal(resource[$].count, 2);
    });

    assert.equal(resource[$].count, 1);

    resource.autorelease();

    setTimeout(() => {
        assert(released);
        assert.equal(resource[$].count, 0);
    });
});
