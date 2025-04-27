/*
 *  override.test.ts
 *  Alkaline
 *
 *  Created by alpha on 2025/4/27.
 *  Copyright © 2025 alphaArgon.
 */

import test from "node:test";
import assert from "node:assert";
import { override } from "$alkaline/override";


test("Override", () => {
    let object = {
        bucket: [] as number[],

        fillBucket() {
            this.bucket.push(1);
        },

        get count() {
            return this.bucket.length;
        },

        get doubleCount() {
            return this.count * 2;
        },

        get that() {
            return this;
        }
    };

    override(object, hyper => ({
        fillBucket() {
            this.bucket.push(0);
            hyper.fillBucket();
            this.bucket.push(2);
        },

        get count() {
            return 42;
        },

        get that() {
            return hyper.that;
        }
    }));

    object.fillBucket();
    assert.deepEqual(object.bucket, [0, 1, 2]);
    assert.equal(object.doubleCount, 42 * 2);
    assert.equal(object.that, object);
});
