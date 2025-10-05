export function fromU32(u32: number) {
  return (
    String.fromCharCode((u32 & 0xff000000) >>> 24) +
    String.fromCharCode((u32 & 0xff0000) >>> 16) +
    String.fromCharCode((u32 & 0xff00) >>> 8) +
    String.fromCharCode(u32 & 0xff)
  );
}

export function toU32(str: string) {
  const charCodes = toCharCodes(str);
  let u32 = 0;
  u32 |= charCodes[0] << 24;
  u32 |= charCodes[1] << 16;
  u32 |= charCodes[2] << 8;
  u32 |= charCodes[3];
  return u32;
}

export function toCharCodes(str: string) {
  const charCodes = new Array(str.length);
  for (let i = 0; i < str.length; ++i) charCodes[i] = str.charCodeAt(i);
  return charCodes;
}

/**
 * Converts a string to an ArrayBuffer.
 * @param str String to bufferize
 */
export function stringToArrayBuffer(str: string): ArrayBufferLike {
  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(str).buffer;
  }

  // This might have some issues if we use any characters that take up more
  // than 2 bytes. But only maybe Edge will hit this code.
  const buffer = new ArrayBuffer(str.length * 2);
  const bufferView = new Uint16Array(buffer);
  for (let i = 0, strLen = str.length; i < strLen; i++) {
    bufferView[i] = str.charCodeAt(i);
  }
  return buffer;
}

export function stringFromArrayBuffer(buffer: ArrayBufferLike): string {
  if (typeof TextDecoder !== "undefined") {
    return new TextDecoder().decode(buffer);
  }

  return String.fromCharCode.apply(null, new Uint16Array(buffer) as any);
}

export function pad(str: string, len: number, padChar: string) {
  while (str.length < len) {
    str = padChar + str;
  }
  return str;
}

export function splice(
  value: string,
  start: number,
  delCount: number,
  newSubStr: string,
) {
  return (
    value.slice(0, start) + newSubStr + value.slice(start + Math.abs(delCount))
  );
}

/** String comparer function compatible with `sort`. */
export function stringComparer(a: string, b: string): -1 | 0 | 1 {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

export function normalizeLineEndings(str: string) {
  if (!str) return str;
  return str.replace(/\r\n|\r/g, "\n");
}

export function mpFormatToPlainText(value: string) {
  if (!value) return "";
  return value
    .replace(/<\w+>/g, "") // Remove color tags
    .replace("\u3000", "Ⓐ") // ! A button
    .replace("\u3001", "Ⓑ") // " B button
    .replace("\u3002", "▲") //  C-up button
    .replace("\u3003", "►") //  C-right button
    .replace("\u3004", "◄") //  C-left button
    .replace("\u3005", "▼") // & C-down button
    .replace("\u3006", "Ⓩ") // ' Z button
    .replace("\u3007", "🕹️") // ( Analog stick
    .replace("\u3008", "✪") // ) (coin)
    .replace("\u3009", "★") // * Star
    .replace("\u3010", "Ⓢ") // , S button
    .replace("\u3011", "Ⓡ"); // , R button
}
