/*
 *  Result.ts
 *  Alkaline
 *
 *  Created by alpha on 2025/3/14.
 *  Copyright © 2025 alphaArgon.
 */

import { $ } from "./_Internal";


/** Creates a successful result. */
export function success<Success>(value: Success): Result<Success, never> {
    return Object.freeze({
        __proto__: Result.prototype,
        [$]: Object.freeze({value, failed: false}),
    }) as any;
}

/** Creates a failed result. */
export function failure<Failure>(value: Failure): Result<never, Failure> {
    return Object.freeze({
        __proto__: Result.prototype,
        [$]: Object.freeze({value, failed: true}),
    }) as any;
}


/** Combines multiple results into a single tuple result. If any of the them failed, the returned
  * result will be the first failure. */
export function zip<Successes extends any[], Failure>(
    ...results: {[I in keyof Successes]: Result<Successes[I], Failure>}
): Result<Successes, Failure> {
    for (let result of results) {
        if (result[$].failed) {
            return result as Result<any, Failure>;
        }
    }

    return success(results.map(result => result[$].value) as Successes);
}


/** Combines multiple results into a single tuple result. If any of the them failed, the returned
  * result will combine all the failures. */
export function zipErrors<Successes extends any[], Failure>(
    ...results: {[I in keyof Successes]: Result<Successes[I], Failure>}
): Result<Successes, Failure[]> {
    let failures: Failure[] = [];

    for (let result of results) {
        if (result[$].failed) {
            failures.push(result[$].value as Failure);
        }
    }

    if (failures.length !== 0) {
        return failure(failures);
    }

    return success(results.map(result => result[$].value) as Successes);
}


export class Result<Success, Failure> {

    readonly [$]: {
        readonly value: Success | Failure;
        readonly failed: boolean;
    };

    private constructor() {
        throw new Error("Use `success` or `failure` to create a result.");
    }

    /** Returns the success value or throws the failure value. */
    public unwrap(): Success {
        if (this[$].failed) {
            throw this[$].value as Failure;
        } else {
            return this[$].value as Success;
        }
    }

    /** Inspects the success value if the result is successful. */
    public tapping(tap: (value: Success) => void): this {
        if (!this[$].failed) {
            tap(this[$].value as Success);
        }
        return this;
    }

    public map<T>(transform: (value: Success) => T): Result<T, Failure> {
        if (this[$].failed) {
            return this as Result<any, Failure>;
        } else {
            return success(transform(this[$].value as Success));
        }
    }

    public mapError<T>(transform: (error: Failure) => T): Result<Success, T> {
        if (this[$].failed) {
            return failure(transform(this[$].value as Failure));
        } else {
            return this as Result<Success, any>;
        }
    }

    public flatMap<T>(transform: (value: Success) => Result<T, Failure>): Result<T, Failure> {
        if (this[$].failed) {
            return this as Result<any, Failure>;
        } else {
            return transform(this[$].value as Success);
        }
    }

    public flatMapError<T>(transform: (error: Failure) => Result<Success, T>): Result<Success, T> {
        if (this[$].failed) {
            return transform(this[$].value as Failure);
        } else {
            return this as Result<Success, any>;
        }
    }
}
