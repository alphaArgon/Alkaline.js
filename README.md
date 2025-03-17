# Alkaline.js

A lightweight JavaScript library written in TypeScript. It offers a suite of useful utilities and types inspired by the Swift stdlib. Without any external dependencies, this library can be used both in browsers and with Node.js.

The name *Alkaline* is derived from *alkali*, a chemistry *base*. Similarly, this library serves as a *basic* foundation for your programming.

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
- Supports insertion, removal, Boolean operations, and splicing.

#### Decimal

- A precise fixed-point arithmetic type for handling decimal numbers.
- Supports arbitrary precision when `BigInt` is available.
- Provides methods for rounding, comparison, and arithmetic operations.

#### AttributedString

- A rich text data structure supporting different text styles.
- Supports efficient substring and attribute retrieval.

#### Result

- A type-safe wrapper for handling success and failure cases.
- Provides methods for transforming values and errors.

#### RefCounted

- A reference-counted wrapper for managing resource lifecycles.
- Useful for managing resources that require explicit cleanup, like object URLs.

## License

This project is licensed under the MIT License. See the LICENSE file for details.
