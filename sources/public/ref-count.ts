/*
 *  ref-count.ts
 *  Alkaline
 *
 *  Created by alpha on 2025/3/12.
 *  Copyright © 2025 alphaArgon.
 */

import { nextTick } from "../private/next-tick";
import { $ } from "../private/symbols";


/** A reference-counted object that manages the lifecycle of a resource.
  *
  * This type is useful for managing resources that require explicit cleanup, for example, URL paths
  * returned by `URL.createObjectURL` should be cleaned up by `URL.revokeObjectURL`.
  *
  * You acquire the ownership of an object by calling `retain`, and dispose it by calling `release`.
  * When there’re no more references to the object, it will be disposed automatically. */
export class RefCounted<T> {

    [$]: {
        value?: T;
        count: number;
        releasing: boolean;
        finalize: (value: T) => void;
    };

    /** Creates a new reference-counted object with an initial reference count of 1. */
    public constructor(value: T, finalize: (value: T) => void) {
        this[$] = {
            value,
            count: 1,
            releasing: false,
            finalize,
        };
    }

    public get value(): T {
        if (this[$].count === 0) {
            throw new Error("The value has already been released.");
        }

        return this[$].value!;
    }

    public retain(): this {
        if (this[$].count === 0) {
            throw new Error("The value has already been released.");
        }

        this[$].count += 1;
        return this;
    }

    public release(): void {
        if (this[$].count === 0) {
            throw new Error("The value has already been released.");
        }

        this[$].count -= 1;
        if (this[$].count !== 0) {return;}

        try {
            this[$].releasing = true;
            this.finalize();
        } finally {
            this[$].value = undefined;
            this[$].releasing = false;
        }
    }

    /** Releases the object when the current autorelease pool is drained. If there is no autorelease
      * pool, an autorelease pool that will be drained on the next tick will be created. */
    public autorelease(): void {
        if (this[$].count === 0) {
            throw new Error("The value has already been released.");
        }

        _ensurePool().push(this);
    }

    /** Finalizes the object. By default, it calls the function passed to the constructor.
      * Subclasses can override this method and the constructor to hide implementation details. */
    protected finalize(): void {
        if (!this[$].releasing) {
            throw new Error("Calling `finalize` manually is not allowed.");
        }

        this[$].finalize(this[$].value!);
    }
}


/** Executes the body in an autorelease pool. */
export function autoreleasepool(body: () => void) {
    _beginPool();
    body();
    _endPool();
}


let _currentPool: RefCounted<any>[] | undefined = undefined;
let _parentPools: RefCounted<any>[][] = [];


function _beginPool(): void {
    _parentPools.push(_currentPool!);
    _currentPool = [];
}

function _endPool(): void {
    for (let object of _currentPool!) {
        object.release();
    }

    //  `_parentPools` could be empty; that’s OK. The pool is the root pool.
    _currentPool = _parentPools.pop();
}

function _ensurePool(): RefCounted<any>[] {
    if (_currentPool === undefined) {
        _currentPool = [];
        nextTick(_endPool);
    }

    return _currentPool;
}
