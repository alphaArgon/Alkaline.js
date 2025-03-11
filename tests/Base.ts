/*
 *  tests/Base.ts
 *  Polymprph
 *
 *  Created by alpha on 2025/3/10.
 *  Copyright © 2025 alphaArgon.
 */

import test from "node:test";
import assert from "node:assert";
import { equals } from "@/Base";


export class Point {

    public x: number;
    public y: number;

    public constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    public static readonly zero = new Point(0, 0);

    isEqual(other: any): boolean {
        if (other === this) {return true;}
        if (!(other instanceof Point)) {return false;}
        return this.x === other.x && this.y === other.y;
    }
}


test("Equatable", () => {

    function assertEqual(a: any, b: any) {
        assert(equals(a, b));
        assert(equals(b, a));
    }
    
    function assertNotEqual(a: any, b: any) {
        assert(!equals(a, b));
        assert(!equals(b, a));
    }

    //  Primitive values.
    assertEqual(1, 1);
    assertNotEqual(1, 2);
    assertEqual("a", "a");
    assertNotEqual("a", "b");
    assertNotEqual(true, 1);
    assertEqual(NaN, 0 / 0);
    assertNotEqual(NaN, 1);
    assertEqual(+0, -0);
    assertEqual(null, null);
    assertEqual(undefined, undefined);
    assertNotEqual(null, undefined);
    assertEqual(0n, 0n);
    assertNotEqual(0, 0n);

    //  Boxed values.
    assertEqual(new Boolean(true), new Boolean(true));
    assertNotEqual(new Boolean(true), new Boolean(false));
    assertNotEqual(new Boolean(true), true);
    assertEqual(new Number(1), new Number(1));
    assertEqual(new Number(1), new Object(1) as Number);
    assertEqual(new Object(Symbol.iterator) as Symbol, new Object(Symbol.iterator) as Symbol);

    //  Built-in objects.
    assertEqual(new Date(1), new Date(1));
    assertNotEqual(new Date(1), new Date(2));

    //  Custom objects.
    assertEqual(Point.zero, Point.zero);
    assertEqual(Point.zero, new Point(0, 0));
    assertNotEqual(Point.zero, new Point(2, 1));
    assertNotEqual(Point.zero, "Foo");

    //  Arrays.
    assertEqual([1, "2", new Point(3, 4)], [1, "2", new Point(3, 4)]);
    assertNotEqual([1, "2", new Point(3, 4)], [1, "2", new Point(3, 5)]);
    assertNotEqual([1, "2", new Point(3, 4)], [1, "2", new Date(3), new Object(4n) as BigInt]);
    assertNotEqual([1, "2", new Point(3, 4)], []);
    assertNotEqual([1, "2", new Point(3, 4)], "Foo");
});
