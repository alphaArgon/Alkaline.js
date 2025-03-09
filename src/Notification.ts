/*
 *  Notification.ts
 *  Foundation
 *
 *  Created by alpha on 2025/3/8.
 *  Copyright © 2025 alphaArgon.
 */

import type { Selector } from "./Base";


declare const subtype: unique symbol;
export type NotificationName<UserInfo = void> = string & {[subtype]?: UserInfo};


export type Notification<UserInfo = void> = {

    readonly name: NotificationName<UserInfo>;
    readonly sender: object | null;
    readonly userInfo: UserInfo;
}


let _defaultCenter: NotificationCenter | null = null;
const _anySender: object = Object.create(null);


const $: unique symbol = Symbol("ivars");

type _Existential = {

    //  A common practice to store the observers is to use {name: {sender: {receiver: action}}},
    //  but we don’t. We use the sender as the outer key because, for example, a notification is
    //  observed only on a specific sender, and when the sender is finalized, there won’t be an
    //  empty entry for the notification name.
    //
    //  The innermost map is the record for a specific pair of notification name and sender. The
    //  value is the function to be called; the key is the identifier of the receiver, which coul
    //  be the observer object or a generated token, and will be used as `this` of the call.
    observations: WeakMap<object /* sender */, Map<NotificationName<any>, Map<any /* receiver or weak */, Function>>>;

    //  Multiple `WeakRef`s pointing to the same object are not allowed, so we cache them.
    //  The key and the value have a circular reference, but it’s OK since they are both weak.
    //  `null` means do not use weak observer references.
    weakRefs: WeakMap<object, WeakRef<object>> | null;
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
      * which case the observer is cleaned up on the next notification post. */
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

        if (arguments.length == 2) {
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

        sender ??= _anySender;
        _postNotification(this[$], notification, sender);

        if (sender !== _anySender) {
            //  If a receiver observes both on a specific sender and on null, the notification will
            //  be sent twice. This is somewhat confusing, but Cocoa’s NSNotificationCenter sends
            //  twice too, so we do the same.
            _postNotification(this[$], notification, _anySender);
        }
    }
}


//  The following functions take care of weak references by themselves.


function _addObservation(ext: _Existential, name: NotificationName<any>, sender: object, receiver: any, action: Function) {
    let observation = ext.observations.get(sender);
    if (observation === undefined) {
        ext.observations.set(sender, observation = new Map());
    }

    let receivers = observation.get(name);
    if (receivers === undefined) {
        observation.set(name, receivers = new Map());
    }

    if (ext.weakRefs === null) {
        receivers.set(receiver, action);

    } else {
        let weak = ext.weakRefs.get(receiver);
        if (weak === undefined) {
            weak = new WeakRef(receiver);
            ext.weakRefs.set(receiver, weak);
        }

        receivers.set(weak, action);
    }
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


function _postNotification(ext: _Existential, notification: Notification<any>, sender: object): void {
    let observation = ext.observations.get(sender);
    if (observation === undefined) {return;}

    let receivers = observation.get(notification.name);
    if (receivers === undefined) {return;}

    //  Receivers might be removed during the iteration.
    let entries = [...receivers.entries()];

    //  TODO: The thrown error is discarded and only visible in the console.
    //  Should the error be rethrown?

    if (ext.weakRefs === null) {
        for (let [receiver, action] of entries) {
            try {
                action.call(receiver, notification);
            } catch (error) {
                console.error(error);
            }
        }

    } else {
        for (let [weak, action] of entries) {
            let receiver = weak.deref();

            if (receiver === undefined) {
                receivers.delete(weak);
            } else try {
                action.call(receiver, notification);
            } catch (error) {
                console.error(error);
            }
        }
    }
}
