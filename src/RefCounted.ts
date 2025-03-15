/*
 *  RefCounted.ts
 *  Alkaline
 *
 *  Created by alpha on 2025/3/12.
 *  Copyright © 2025 alphaArgon.
 */

import { $ } from "./_Internal";


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
    }

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

    /** Finalizes the object. By default, it calls the function passed to the constructor.
      * Subclasses can override this method and the constructor to hide implementation details. */
    protected finalize(): void {
        if (!this[$].releasing) {
            throw new Error("Calling `finalize` manually is not allowed.");
        }

        this[$].finalize(this[$].value!);
    }
}
