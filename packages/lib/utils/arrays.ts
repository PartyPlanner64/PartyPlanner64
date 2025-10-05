import { createContext } from "./canvas";
import { $$hex } from "./debug";
import SparkMD5 from "../lib/js-spark-md5/spark-md5";

export function isArrayBufferLike(value: any): value is ArrayBufferLike {
  if (value instanceof ArrayBuffer) {
    return true;
  }
  if (
    typeof SharedArrayBuffer !== "undefined" &&
    value instanceof SharedArrayBuffer
  ) {
    return true;
  }
  return false;
}

export function copyRange(
  outArr: ArrayBufferLike | DataView,
  inArr: ArrayBufferLike | DataView | number[],
  outOffset: number,
  inOffset: number,
  len: number,
) {
  if (isArrayBufferLike(outArr)) outArr = new DataView(outArr);
  if (isArrayBufferLike(inArr)) inArr = new DataView(inArr);

  if (Array.isArray(inArr)) {
    for (let i = 0; i < len; i++) {
      outArr.setUint8(outOffset + i, inArr[inOffset + i]);
    }
  } else {
    for (let i = 0; i < len; i++) {
      outArr.setUint8(outOffset + i, inArr.getUint8(inOffset + i));
    }
  }
}

export function arrayToArrayBuffer(arr: number[]) {
  const buffer = new ArrayBuffer(arr.length);
  const u8arr = new Uint8Array(buffer);
  for (let i = 0; i < arr.length; i++) {
    u8arr[i] = arr[i];
  }
  return buffer;
}

export function hash(arr: any, startOffset: number, len: number) {
  // Can't be equal if our length would extend out of bounds.
  if (startOffset + len > arr.byteLength) return "";
  return SparkMD5.ArrayBuffer.hash(arr, { start: startOffset, length: len });
}

export function hashEqual(hashArgs: any, expected: string) {
  return hash.apply(null, hashArgs).toLowerCase() === expected.toLowerCase();
}

export function toHexString(
  buffer: ArrayBufferLike | DataView,
  len: number = buffer.byteLength,
  lineLen: number = 0,
) {
  let output = "";
  let view: DataView;
  if (isArrayBufferLike(buffer)) view = new DataView(buffer);
  else view = buffer;
  for (let i = 0; i < len; i++) {
    output +=
      $$hex(view.getUint8(i), "") +
      (i && lineLen && (i + 1) % lineLen === 0 ? "\n" : " ");
  }
  return output;
}

export function print(
  buffer: ArrayBufferLike | DataView,
  len = buffer.byteLength,
  lineLen = 0,
) {
  console.log(toHexString(buffer, len, lineLen));
}

export function readBitAtOffset(
  buffer: ArrayBuffer | DataView,
  bitOffset: number,
) {
  let bufView = buffer;
  if (isArrayBufferLike(bufView)) bufView = new DataView(bufView);
  const byteOffset = Math.floor(bitOffset / 8);
  const inByteOffset = bitOffset % 8;
  const mask = 0x80 >>> inByteOffset;
  const maskedBit = bufView.getUint8(byteOffset) & mask;
  return maskedBit ? 1 : 0;
}

export function readByteAtBitOffset(
  buffer: ArrayBuffer | DataView,
  bitOffset: number,
) {
  let bufView = buffer;
  if (isArrayBufferLike(bufView)) bufView = new DataView(bufView);
  const shortOffset = Math.floor(bitOffset / 8);
  const inShortOffset = bitOffset % 8;
  const mask = 0xff00 >>> inShortOffset;
  const maskedByte = bufView.getUint16(shortOffset) & mask;
  return maskedByte >>> (8 - inShortOffset);
}

export function arrayBufferToImageData(
  buffer: ArrayBufferLike,
  width: number,
  height: number,
) {
  const canvasCtx = createContext(width, height);
  const bgImageData = canvasCtx.createImageData(width, height);
  const bufView = new Uint8Array(buffer);

  for (let i = 0; i < buffer.byteLength; i++) {
    bgImageData.data[i] = bufView[i];
  }

  return bgImageData;
}

export function arrayBufferToDataURL(
  buffer: ArrayBufferLike,
  width: number,
  height: number,
) {
  const bgImageData = arrayBufferToImageData(buffer, width, height);
  const canvasCtx = createContext(width, height);
  canvasCtx.putImageData(bgImageData, 0, 0);
  return canvasCtx.canvas.toDataURL();
}

/**
 * Converts a Data URL to an ArrayBuffer.
 * @param dataUrl Data URL. `data:mime;base64,...`
 */
export function dataUrlToArrayBuffer(dataUrl: string): ArrayBuffer {
  const binary = atob(dataUrl.split(",")[1]);
  const buffer = new ArrayBuffer(binary.length);
  const byteArray = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) {
    byteArray[i] = binary.charCodeAt(i);
  }
  return buffer;
}

export function arrayBuffersEqual(
  first: ArrayBufferLike,
  second: ArrayBufferLike,
) {
  if (first.byteLength !== second.byteLength) return false;
  const firstArr = new Uint8Array(first);
  const secondArr = new Uint8Array(second);
  for (let i = 0; i < firstArr.byteLength; i++) {
    if (firstArr[i] !== secondArr[i]) return false;
  }
  return true;
}

// Joins two ArrayBuffers
export function join(
  buffer1: ArrayBufferLike,
  buffer2: ArrayBufferLike,
): ArrayBufferLike {
  if (!buffer1 || !buffer2) {
    return buffer1 || buffer2;
  }

  const tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
  tmp.set(new Uint8Array(buffer1), 0);
  tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
  return tmp.buffer;
}

/**
 * Tests if two arrays are equal.
 * They are equal if:
 *   - They are the same reference.
 *   - They have the same number of items
 *   - Each item is === across arrays.
 */
export function equal(a: any[], b: any[]) {
  if (a === b) return true;
  if (a.length !== b.length) return false;

  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * Creates the intersection of two arrays.
 * equalityFn takes two values and decides if they're equal.
 */
export function intersection(
  a: any[],
  b: any[],
  equalityFn = (a: any, b: any) => a === b,
) {
  const output = [];

  for (let i = 0; i < a.length; i++) {
    const aVal = a[i];
    for (let j = 0; j < b.length; j++) {
      if (equalityFn(aVal, b[j])) {
        output.push(aVal);
        break;
      }
    }
  }

  return output;
}

/**
 * Creates an array filled with `count` entries of `value`.
 */
export function createFilledArray<T>(value: T, count: number): T[] {
  const arr = new Array<T>(count);
  for (let i = 0; i < count; i++) {
    arr[i] = value;
  }
  return arr;
}
