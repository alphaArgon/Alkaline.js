# Foundation.js

A JavaScript library written in TypeScript that provides some useful utilities. The library requires no dependencies, and can be used in browsers and Node.js.

The name is based on Apple’s Foundation framework, and we provide a similar set of utilities.

## API

This library is still under development. Issues and pull requests are welcome.

- Basic types: Defined an equatable interface, and provided a generic comparison function that works for primitive types, arrays, and objects that implement the interface. Defined a selector type can be used to lookup a function by name.

- Notification: A notification center for publish-subscribe pattern. Supports weak references to observers which automatically remove the observer when it’s no longer reachable, and two types of observation: object-selector based and closure based.

- Differing: A function for comparing two arrays, and a type for iterating the changes.

- ReactiveArray: An array that can observe changes of its content, and posts the changes as notifications.

- RangeSet: A range-based set of integer indices.

- AttributedString: A rich text data structure that supports different styles of text.

## License

This project is licensed under the MIT License. See the LICENSE file for details.
