/*
 *  Result.ts
 *  Alkaline
 *
 *  Created by alpha on 2025/3/14.
 *  Copyright © 2025 alphaArgon.
 */


export class Result<Success, Failure> {

    readonly value: Success | Failure;
    readonly isFailure: boolean;

    private constructor() {
        throw new Error("Use `Result.success` or `Result.failure` to create a result.");
    }

    /** Creates a successful result. */
    public static success<Success>(value: Success): Result<Success, never> {
        return Object.freeze<Result<Success, never>>({
            value: value,
            isFailure: false,
            //@ts-expect-error
            __proto__: Result.prototype,
        });
    }

    /** Creates a successful result. */
    public static failure<Failure>(value: Failure): Result<never, Failure> {
        return Object.freeze<Result<never, Failure>>({
            value: value,
            isFailure: true,
            //@ts-expect-error
            __proto__: Result.prototype,
        });
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
