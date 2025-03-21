/*
 *  result.ts
 *  Alkaline
 *
 *  Created by alpha on 2025/3/14.
 *  Copyright © 2025 alphaArgon.
 */

import { $ } from "../private/symbols";


let _voidSuccess: Result<void, never> | null = null;
let _voidFailure: Result<never, void> | null = null;


/** An immutable result that is either a success or a failure. */
export class Result<Success, Failure> {

    public readonly value: Success | Failure;
    public readonly isFailure: boolean;

    private constructor(passport: $, value: Success | Failure, asFailure: boolean) {
        if (passport !== $) {
            throw new Error("Use `Result.success` or `Result.failure` to create a result.");
        }

        this.value = value;
        this.isFailure = asFailure;
    }

    /** Creates a successful result. */
    public static success(): Result<void, never>;
    public static success<Success>(value: Success): Result<Success, never>;
    public static success(value?: any): Result<any, never> {
        if (value !== undefined) {
            return new Result<any, never>($, value, false);
        }

        if (_voidSuccess === null) {
            _voidSuccess = new Result<void, never>($, undefined, false);
            Object.freeze(_voidSuccess);
        }

        return _voidSuccess;
    }

    /** Creates a failed result. */
    public static failure(): Result<never, void>;
    public static failure<Failure>(value: Failure): Result<never, Failure>;
    public static failure(value?: any): Result<never, any> {
        if (value !== undefined) {
            return new Result<never, any>($, value, true);
        }

        if (_voidFailure === null) {
            _voidFailure = new Result<never, any>($, undefined, true);
            Object.freeze(_voidFailure);
        }

        return _voidFailure;
    }

    /** Combines multiple results into a single tuple result. If any of the them failed, the
      * returned result will be the first failure. */
    public static zip<Successes extends any[], Failure>(
        ...results: {[I in keyof Successes]: Result<Successes[I], Failure>}
    ): Result<Successes, Failure> {
        for (let result of results) {
            if (result.isFailure) {
                return result as Result<any, Failure>;
            }
        }

        return Result.success(results.map(result => result.value) as Successes);
    }

    /** Combines multiple results into a single tuple result. If any of the them failed, the
      * returned result will combine all the failures. */
    public static zipErrors<Successes extends any[], Failure>(
        ...results: {[I in keyof Successes]: Result<Successes[I], Failure>}
    ): Result<Successes, Failure[]> {
        let failures: Failure[] = [];

        for (let result of results) {
            if (result.isFailure) {
                failures.push(result.value as Failure);
            }
        }

        if (failures.length !== 0) {
            return Result.failure(failures);
        }

        return Result.success(results.map(result => result.value) as Successes);
    }

    /** Returns the success value or throws the failure value. */
    public unwrap(): Success {
        if (this.isFailure) {
            throw this.value as Failure;
        } else {
            return this.value as Success;
        }
    }

    /** Inspects the success value if the result is successful. */
    public tapping(tap: (value: Success) => void): this {
        if (!this.isFailure) {
            tap(this.value as Success);
        }
        return this;
    }

    public map<T>(transform: (value: Success) => T): Result<T, Failure> {
        if (this.isFailure) {
            return this as Result<any, Failure>;
        } else {
            return Result.success(transform(this.value as Success));
        }
    }

    public mapError<T>(transform: (error: Failure) => T): Result<Success, T> {
        if (this.isFailure) {
            return Result.failure(transform(this.value as Failure));
        } else {
            return this as Result<Success, any>;
        }
    }

    public flatMap<T>(transform: (value: Success) => Result<T, Failure>): Result<T, Failure> {
        if (this.isFailure) {
            return this as Result<any, Failure>;
        } else {
            return transform(this.value as Success);
        }
    }

    public flatMapError<T>(transform: (error: Failure) => Result<Success, T>): Result<Success, T> {
        if (this.isFailure) {
            return transform(this.value as Failure);
        } else {
            return this as Result<Success, any>;
        }
    }
}
