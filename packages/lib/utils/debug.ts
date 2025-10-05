import { isDebug } from "../debug";

export function $$log(...args: any[]) {
  if (isDebug()) console.log.apply(console, arguments as any);
}

export function $$hex(num: number, prefix: string = "0x") {
  let hexVal = Number(Math.abs(num)).toString(16).toUpperCase();
  if (hexVal.length === 1) hexVal = "0" + hexVal;
  return (num < 0 ? "-" : "") + prefix + hexVal;
}

/** Does an assertion. */
export function assert(condition: boolean): asserts condition {
  if (isDebug()) {
    if (!condition) {
      debugger;
      throw new Error("Assertion failed");
    }
  }
}

/* eslint-disable no-extend-native */

// Don't allow bugs where undefined/null become silent 0 byte writes.
const dataViewMethods = [
  "setUint8",
  "setInt8",
  "setUint16",
  "setInt16",
  "setUint32",
  "setInt32",
  "setFloat32",
  "setFloat64",
];
dataViewMethods.forEach((methodName) => {
  const methodOrig = (DataView.prototype as any)[methodName];
  (DataView.prototype as any)[methodName] = function (
    offset: number,
    value: number,
  ) {
    if (typeof offset !== "number" || Number.isNaN(offset))
      throw new Error(`Invalid offset in ${methodName}`);
    if (typeof value !== "number" || Number.isNaN(value))
      throw new Error(`Invalid value in ${methodName}`);
    methodOrig.apply(this, arguments);
  };
});

// Don't support weird clamping behavior.
// const arrayBufferSliceOrig = ArrayBuffer.prototype.slice;
// ArrayBuffer.prototype.slice = function(begin, end): ArrayBuffer {
//   if (begin > this.byteLength) {
//     debugger;
//     throw new Error(`Slicing buffer from ${begin} seems wrong`);
//   }
//   if (typeof end === "number" && end > this.byteLength) {
//     debugger;
//     throw new Error(`Slicing buffer until ${end} seems wrong`);
//   }

//   return arrayBufferSliceOrig.apply(this, arguments as any);
// }
