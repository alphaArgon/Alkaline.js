# Foundation.js


A lightweight JavaScript library written in TypeScript. It offers a suite of useful utilities and types inspired by Apple’s Foundation framework and the Swift stdlib. Without any external dependencies, this library can be used both in browsers and with Node.js.

## Features

This library is still under development. Issues and pull requests are welcome.

#### Basic Types

- Introduces a `Selector` type for function lookup by name.
- Defines equatable interfaces for custom equality checks.
- Provides a generic function `equals` for comparing primitives, arrays, and objects that implement the interface.

#### Notification

- Implements the class `NotificationCenter` for the publish-subscribe pattern.
- Provides object-selector and closure-based observation types.
- Supports weak references to senders and observers, which are automatically cleaned up when no longer reachable.

#### Diffing

- Provides the function `arrayDiff` and `recordDiff` for comparing.
- Introduced `ArrayDiff` for handily iterating over changes.

#### ReactiveArray

- A responsive array that tracks changes to its content and posts notifications.
- Supports batch operation that combines all changes into one notification.

#### RepeatedArray

- A specialized array that has its elements identical.
- Optimized for memory usage and iterating.

#### RangeSet

- A range-based set of integer indices.
- Supports insertion, removal, Boolean operations, and splicing.

#### AttributedString

- A rich text data structure supporting different text styles.
- Supports efficient substring and attribute retrieval.


## License

This project is licensed under the MIT License. See the LICENSE file for details.
