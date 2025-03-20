/*
 *  Notification.ts
 *  Alkaline
 *
 *  Created by alpha on 2025/3/8.
 *  Copyright © 2025 alphaArgon.
 */

import type { Selector } from "./Base";
import { $ } from "./_Internal";


declare const subtype: unique symbol;
export type NotificationName<UserInfo = void> = (string | symbol) & {[subtype]?: UserInfo};


export type Notification<UserInfo = void> = {

    readonly name: NotificationName<UserInfo>;
    readonly sender: object | null;
    readonly userInfo: UserInfo;
}


let _defaultCenter: NotificationCenter | null = null;
const _anySender: object = Object.create(null);


type _Existential = {

    //  A common practice to store the observers is to use {name: {sender: {receiver: action}}},
    //  but we don’t. We use the sender as the outer key because, for example, a notification is
    //  observed only on a specific sender, and when the sender is finalized, there won’t be an
    //  empty entry for the notification name.
    //
    //  The innermost map is the record for a specific pair of notification name and sender. The
    //  value is the function to be called; the key is the identifier of the receiver, which coul
    //  be the observer object or a generated token, and will be used as `this` of the call.
    observations: WeakMap<object /* sender */, Map<NotificationName<any>, Map<any /* receiver or weak */, [Function, number /* order */]>>>;

    //  Multiple `WeakRef`s pointing to the same object are not allowed, so we cache them.
    //  The key and the value have a circular reference, but it’s OK since they are both weak.
    //  `null` means do not use weak observer references.
    weakRefs: WeakMap<object, WeakRef<object>> | null;

    //  The number of `addObserver` calls so far.
    counter: number;
}


export class NotificationCenter {

    [$]: _Existential;

    /** Creates a new notification center.
      *
      * The flag `weakObservers` indicates whether the observers are weakly referenced. If `true`,
      * the notification center internally uses `WeakRef` wrappers to store the observers. However,
      * enabling this option is strongly discouraged; it might lead to unexpected lifetime issues.
      *
      * By default, the flag is `false`. If the environment doesn’t support `WeakMap`, the flag
      * is ignored. */
    public constructor(weakObservers: boolean = false) {
        weakObservers &&= "WeakRef" in globalThis;

        this[$] = {
            observations: new WeakMap(),
            weakRefs: weakObservers ? new WeakMap() : null,
            counter: 0,
        };
    }

    /** The shared notification center. If you don’t manually assign it, the default center will be
      * created with weak references disabled. */
    public static get default(): NotificationCenter {
        if (_defaultCenter === null) {
            _defaultCenter = new NotificationCenter();
        }
        return _defaultCenter;
    }

    public static set default(center: NotificationCenter) {
        _defaultCenter = center;
    }

    public areObserversWeaklyReferenced(): boolean {
        return this[$].weakRefs !== null;
    }

    /** Adds a observer of the given name. If the sender is not specified or is `null`, the observer
      * will receive all notifications of the given name.
      *
      * The provided sender is always unretained. The observer is retained and you must manually
      * remove it when it is no longer needed, unless `areObserversWeaklyReferenced` is `true`, in
      * which case the observer is cleaned up on the next notification post. If you don’t provide
      * a sender or provide `null`, all notifications of the given name will be observed.
      *
      * If you add the same observer to the same name and sender for multiple times, an error will
      * be thrown. */
    public addObserver<T extends object, UserInfo>(receiver: T, selector: Selector<T>, name: NotificationName<UserInfo>, sender?: object | null): void {
        let body = receiver[selector];

        if (typeof body !== "function") {
            throw TypeError("The given selector doesn’t refer to a function.");
        }

        sender ??= _anySender;
        _addObservation(this[$], name, sender, receiver, body);
    }

    /** Adds an observing function for the given name, returns a token that can be used to remove
      * the observation.
      *
      * This method has the same effect as the following code using `addObserver`:
      *
      * ```ts
      * let token = {perform: body};
      * center.addObserver(token, selector(token.perform), name, sender);
      * ```
      *
      * But the method is optimized and returns a more lightweight token. If the center uses weak
      * references, you must keep the token alive; otherwise it might be cleaned up soon. */
    public addObserving<UserInfo>(name: NotificationName<UserInfo>, body: (notification: Notification<UserInfo>) => void): any;
    public addObserving<UserInfo>(name: NotificationName<UserInfo>, sender: object | null, body: (notification: Notification<UserInfo>) => void): any;
    public addObserving(name: NotificationName<any>, arg2: any, arg3?: any) {
        let sender: object | null;
        let body: Function;

        if (arguments.length === 2) {
            sender = null;
            body = arg2;
        } else {
            sender = arg2;
            body = arg3!;
        }

        if (typeof body !== "function") {
            throw TypeError("The given callback is not a function.");
        }

        //  Use a symbol token if no WeakRef needed; use an object token otherwise.
        let receiver = this[$].weakRefs === null ? Symbol() : Object.create(null) as object;

        sender ??= _anySender;
        _addObservation(this[$], name, sender, receiver, body);
        return receiver;
    }

    public removeObserver(receiver: object, name: NotificationName<any>, sender?: object | null): void {
        sender ??= _anySender;
        _removeObservation(this[$], name, sender, receiver);
    }

    public post(name: NotificationName<void>, sender?: object | null): void;
    public post<UserInfo>(name: NotificationName<UserInfo>, sender?: object | null, userInfo?: UserInfo): void;
    public post(name: NotificationName<any>, sender?: object | null, userInfo?: any): void {
        sender ??= null;  //  Do not expose `_anySender` to the outside.
        let notification = Object.freeze({name, sender, userInfo});

        let observations = [] as {action: Function, receiver: any, order: number}[];

        //  First collect observations for any sender.
        _collectObservations(this[$], name, _anySender, observations);

        //  Then, if the sender is specified, collect observations for the specified sender.
        if (sender !== null) {
            _collectObservations(this[$], name, sender, observations);
        }

        //  Sort observations by order (the order of addition).
        observations.sort((a, b) => a.order - b.order);

        //  TODO: The thrown error is discarded and only visible in the console.
        //  Should the error be rethrown? — No, the sender don’t know and has no way to handle it.
        //  For now, we just log the error.

        for (let {action, receiver} of observations) {
            try {
                action.call(receiver, notification);
            } catch (error) {
                console.error(error);
            }
        }
    }
}


//  The following functions take care of weak references. The caller just passes the receiver as is.


function _addObservation(ext: _Existential, name: NotificationName<any>, sender: object, receiver: any, action: Function) {
    let observation = ext.observations.get(sender);
    if (observation === undefined) {
        ext.observations.set(sender, observation = new Map());
    }

    let receivers = observation.get(name);
    if (receivers === undefined) {
        observation.set(name, receivers = new Map());
    }

    let reveiverOrWeak: any;

    if (ext.weakRefs === null) {
        reveiverOrWeak = receiver;

    } else {
        let weak = ext.weakRefs.get(receiver);
        if (weak === undefined) {
            weak = new WeakRef(receiver);
            ext.weakRefs.set(receiver, weak);
        }

        reveiverOrWeak = weak;
    }

    if (receivers.has(reveiverOrWeak)) {
        throw new Error("The observer has already been added to the same name and sender.");
    }

    receivers.set(reveiverOrWeak, [action, ext.counter++]);
}


function _removeObservation(ext: _Existential, name: NotificationName<any>, sender: object, receiver: any) {
    let observation = ext.observations.get(sender);
    if (observation === undefined) {return;}

    let receivers = observation.get(name);
    if (receivers === undefined) {return;}

    if (ext.weakRefs === null) {
        receivers.delete(receiver);

    } else {
        let weak = ext.weakRefs.get(receiver);
        if (weak === undefined) {return;}
        receivers.delete(weak);
    }

    if (receivers.size === 0) {
        observation.delete(name);
    }

    //  We don’t need to remove `_anySender`.
    if (sender !== _anySender && observation.size === 0) {
        ext.observations.delete(sender);
    }
}


/** Collects all observations for the given name and sender. If a weak reference lost its target,
  * the observation is removed. */
function _collectObservations(ext: _Existential, name: NotificationName<any>, sender: object, into: {action: Function, receiver: any, order: number}[]): void {
    let observation = ext.observations.get(sender);
    if (observation === undefined) {return;}

    let receivers = observation.get(name);
    if (receivers === undefined) {return;}

    if (ext.weakRefs === null) {
        let observations = Array.from(receivers, ([receiver, [action, order]]) => ({action, receiver, order}));
        Array.prototype.push.apply(into, observations);
        return;
    }

    let clean = [] as WeakRef<any>[];

    for (let [weak, [action, order]] of receivers) {
        let receiver = weak.deref();

        if (receiver === undefined) {
            clean.push(weak);
        } else {
            into.push({action, receiver, order});
        }
    }

    for (let weak of clean) {
        receivers.delete(weak);
    }

    if (receivers.size === 0) {
        observation.delete(name);
    }

    //  We don’t need to remove `_anySender`.
    if (sender !== _anySender && observation.size === 0) {
        ext.observations.delete(sender);
    }
}
