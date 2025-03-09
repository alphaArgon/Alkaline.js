/*
 *  CFAttributedString.ts
 *  Cocoa.js
 *
 *  Created by alpha on 2024/12/28.
 *  Copyright © 2024 alphaArgon.
 */

import { _RunArray } from "./_RunArray.js";
import { AnyEquatable, CustomCopyable, CustomEquatable, equals, Indirect } from "./Base.js";


export class AttributedString<Attributes> implements CustomEquatable, CustomCopyable {

    private _string: string;
    private _attrRuns: _RunArray<Attributes>;

    protected constructor(string: string, attrRuns: _RunArray<Attributes>) {
        this._string = string;
        this._attrRuns = attrRuns;
    }

    public static uniform<Attributes extends AnyEquatable>(string: string, attributes: Attributes): AttributedString<Attributes> {
        let attrRuns = new _RunArray<Attributes>(equals);
        attrRuns.replaceSubrange(0, 0, [{length: string.length, value: attributes}]);
        return new AttributedString(string, attrRuns);
    }

    public get length(): number {
        return this._string.length;
    }

    public get string(): string {
        return this._string;
    }

    public attributedSubstring(from: number, to: number): AttributedString<Attributes> {
        let substring = this._string.substring(from, to);
        let subAttrRuns = this._attrRuns.slice(from, to);
        return new AttributedString(substring, subAttrRuns);
    }

    public attributesAt(index: number, effectiveRangePtr?: Indirect<[from: number, to: number]>): Attributes {
        return this._attrRuns.at(index, effectiveRangePtr);
    }

    public isEqual(other: any): boolean {
        if (this === other) {return true;}
        if (!(other instanceof AttributedString)) {return false;}
        return this._string === other._string && this._attrRuns.isEqual(other._attrRuns);
    }

    public makeCopy(): AttributedString<Attributes> {
        return new AttributedString(this._string, this._attrRuns.makeCopy());
    }
}


//  TODO: Implement mutability.
