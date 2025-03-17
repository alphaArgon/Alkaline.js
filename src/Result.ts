/*
 *  Result.ts
 *  Alkaline
 *
 *  Created by alpha on 2025/3/14.
 *  Copyright © 2025 alphaArgon.
 */

import { $ } from "./_Internal";



export function success<Success>(value: Success): Result<Success, never> {
    let result = Reflect.construct(Object, [], Result) as Result<Success, never>;
    result[$] = {value, failed: false};
    return result;
}

export function failure<Failure>(value: Failure): Result<never, Failure> {
    let result = Reflect.construct(Object, [], Result) as Result<never, Failure>;
    result[$] = {value, failed: true};
    return result;
}


export class Result<Success, Failure> {

    [$]: {
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
