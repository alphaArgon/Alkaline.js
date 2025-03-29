/*
 *  async.ts
 *  Alkaline
 *
 *  Created by alpha on 2024/11/3.
 *  Copyright © 2024 alphaArgon.
 */

import { nextTick } from "process";


/** A barrier to prevent data race from async operations.
  *
  * Though JavaScript is single-threaded, if the read/write operations are async, like accessing
  * database or network, data race may still occur. This class provides callback-based mechanism
  * to execute async operations, that means, the read/write operations are executed in a FCFS order,
  * and the write operations are exclusive. */
export class AsyncBarrier {

    //  The number of works that is currently executing (pending).
    //  -1 means one write operation; positive number means read operations.
    private _currentWorks: number;

    //  At one time there could be zero operations but some delayed works, because delayed work
    //  execution is postponed to the next tick.
    private _workPool: {
        concurrent: boolean,
        continuation: () => Promise<void>,
    }[];

    public constructor() {
        this._currentWorks = 0;
        this._workPool = [];
    }

    public get isWorking(): boolean {
        return this._currentWorks !== 0 || this._workPool.length > 0;
    }

    public async concurrent<T>(body: () => Promise<T>): Promise<T> {
        return this._currentWorks >= 0 && this._workPool.length === 0
            ? this._executeWork(true, body)
            : this._addPoolWork(true, body);
    }

    public async exclusive<T>(body: () => Promise<T>): Promise<T> {
        return this._currentWorks === 0 && this._workPool.length === 0
            ? this._executeWork(false, body)
            : this._addPoolWork(false, body);
    }

    /** Executes a work immediately, and returns a promise that will be resolved when the work is
      * finished. */
    private async _executeWork<T>(concurrent: boolean, body: () => Promise<T>): Promise<T> {
        if (concurrent) {this._currentWorks += 1;}
        else {this._currentWorks = -1;}

        try {return await body();}
        finally {
            if (concurrent) {this._currentWorks -= 1;}
            else {this._currentWorks = 0;}

            //  Run delayed works on the next tick.
            nextTick(() => this._dispatchPoolWorks());
        }
    }

    /** Adds a delayed work to the queue, and returns a promise that will be resolved when the work
      * is finished. `_checkDelayedWorks` is responsible for executing delayed works at appropriate
      * time. */
    private _addPoolWork<T>(concurrent: boolean, body: () => Promise<T>): Promise<T> {
        return new Promise((resolve, reject) => {
            this._workPool.push({concurrent, continuation: () => body().then(resolve, reject)});
        });
    }

    /** Dequeues one or several works from the pool, and executes them. */
    private _dispatchPoolWorks(): void {
        if (this._currentWorks !== 0) {return;}
        if (this._workPool.length === 0) {return;}

        let work: {concurrent: boolean, continuation: () => Promise<void>};
        do {  //  Execute one exclusive work, or concurrent works from the head as many as possible.
            work = this._workPool.shift()!;
            this._executeWork(work.concurrent, work.continuation);  //  No need to await.
        } while (work.concurrent && this._workPool.length !== 0 && this._workPool[0].concurrent);
    }
}
