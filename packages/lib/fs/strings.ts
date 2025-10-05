import { $$log, $$hex } from "../utils/debug";
import { makeDivisibleBy } from "../utils/number";
import { copyRange } from "../utils/arrays";
import { Game } from "../types";
import { ROM, romhandler } from "../romhandler";
import { getROMAdapter } from "../adapter/adapters";
import { isDebug } from "../../../apps/partyplanner64/debug";

interface IOffsetInfo {
  upper: number;
  lower: number;
}

const _stringOffsets: { [game: string]: IOffsetInfo[] } = {};
_stringOffsets[Game.MP1_USA] = [{ upper: 0x0001ae6e, lower: 0x0001ae76 }];
_stringOffsets[Game.MP1_JPN] = [{ upper: 0x0001ad9e, lower: 0x0001ada6 }];
// TODO: PAL has more tables for other langs. Defining ENG only for now.
_stringOffsets[Game.MP1_PAL] = [
  // Default at 0x0FF0850
  { upper: 0x0001ba32, lower: 0x0001ba36 },
];
_stringOffsets[Game.MP2_USA] = [
  // Default at 0x1142DD0
  { upper: 0x0001d22a, lower: 0x0001d232 },
  { upper: 0x00089356, lower: 0x0008935e },
  { upper: 0x0008936a, lower: 0x00089372 },
];
// MP2_JPN 0x113E720

export class StringTable {
  private strs: ArrayBuffer[];

  constructor(dataView: DataView) {
    this.strs = this._extract(dataView);
  }

  _extract(view: DataView) {
    const strCount = this._getStringCountFromView(view);
    const strs = new Array(strCount);
    for (let s = 0; s < strCount; s++) {
      strs[s] = this._readFromView(view, s);
    }
    return strs;
  }

  _getStringCountFromView(view: DataView) {
    return view.getUint32(0);
  }

  _readFromView(view: DataView, index: number) {
    const entryOffset = this._getStringOffsetFromView(view, index);
    const entryView = new DataView(view.buffer, view.byteOffset + entryOffset);
    const strSize = entryView.getUint16(0);
    return view.buffer.slice(
      view.byteOffset + entryOffset + 2,
      view.byteOffset + entryOffset + 2 + strSize,
    );
  }

  _getStringOffsetFromView(view: DataView, index: number) {
    return view.getUint32(4 * (1 + index));
  }

  public read(index: number, raw: false): string;
  public read(index: number, raw: true): ArrayBuffer;
  public read(index: number, raw: boolean): ArrayBuffer | string;
  public read(index: number, raw = false): ArrayBuffer | string {
    if (index >= this.getStringCount())
      throw new Error("Requesting non-existent string entry");

    const bytes = this.strs[index];
    if (raw) return bytes;
    const entryView = new DataView(bytes);
    let result = "";
    for (let i = 0; i < bytes.byteLength; i++)
      result += this._byteToStr(entryView.getUint8(i));
    return result;
  }

  _byteToStr(val: number) {
    const map = getROMAdapter({})!.getCharacterMap();
    if (map.hasOwnProperty(val)) return map[val];
    return String.fromCharCode(val);
  }

  write(index: number, content: ArrayBuffer) {
    this.strs[index] = content.slice(0);
  }

  getStringCount() {
    return this.strs.length;
  }

  getByteLength(applyCompression = false) {
    let byteLen = 0;
    const strCount = this.strs.length;

    byteLen += 4; // Count of strings
    byteLen += 4 * strCount; // String offsets

    for (let s = 0; s < strCount; s++) {
      byteLen += 2; // String length
      byteLen += this.strs[s].byteLength;
      byteLen = makeDivisibleBy(byteLen, 2);
    }

    if (applyCompression) {
      // Assuming dumb compress01
      byteLen += byteLen / 8 + 16; // to be safe
    }

    return byteLen;
  }

  pack(buffer: ArrayBuffer, offset = 0) {
    const view = new DataView(buffer, offset);

    const strCount = this.getStringCount();
    view.setUint32(0, strCount);

    let curStrIndexOffset = 4;
    let curStrWriteOffset = 4 + strCount * 4;
    for (let s = 0; s < strCount; s++) {
      view.setUint32(curStrIndexOffset, curStrWriteOffset);
      curStrIndexOffset += 4;
      curStrWriteOffset = this._packStr(s, view, curStrWriteOffset);
      curStrWriteOffset = makeDivisibleBy(curStrWriteOffset, 2);
    }

    return curStrWriteOffset;
  }

  _packStr(s: number, view: DataView, offset: number) {
    const strBytes = this.strs[s];
    view.setUint16(offset, strBytes.byteLength);
    copyRange(view, strBytes, offset + 2, 0, strBytes.byteLength);
    return offset + 2 + strBytes.byteLength;
  }
}

export class Strings {
  private _rom: ROM;
  private _strFsInstance: StringTable | null = null;

  public constructor(rom: ROM) {
    this._rom = rom;
  }

  public getROMOffset() {
    const romView = romhandler.getDataView();
    const patchOffsets = this.getPatchOffsets();
    if (!patchOffsets) return null;
    const romOffset = patchOffsets[0];
    if (!romOffset) return null;
    const upper = romView.getUint16(romOffset.upper) << 16;
    const lower = romView.getUint16(romOffset.lower);
    let offset = upper | lower;
    if (lower & 0x8000) offset = offset - 0x00010000; // Signed ASM addition workaround.
    $$log(`Strings.getROMOffset -> ${$$hex(offset)}`);

    if (isDebug()) {
      // Assert that the rest of the patch offsets are valid.
      for (let i = 1; i < patchOffsets.length; i++) {
        const anotherUpper = romView.getUint16(patchOffsets[i].upper) << 16;
        const anotherLower = romView.getUint16(patchOffsets[i].lower);
        if (anotherUpper !== upper || anotherLower !== lower)
          throw new Error(`Strings.getROMOffset patch offset ${i} seems wrong`);
      }
    }

    return offset;
  }

  public setROMOffset(newOffset: number, buffer: ArrayBuffer) {
    const romView = new DataView(buffer);
    const patchOffsets = this.getPatchOffsets();
    let upper = (newOffset & 0xffff0000) >>> 16;
    const lower = newOffset & 0x0000ffff;
    if (lower & 0x8000) upper += 1; // Adjust for signed addition in ASM.
    for (let i = 0; i < patchOffsets.length; i++) {
      romView.setUint16(patchOffsets[i].upper, upper);
      romView.setUint16(patchOffsets[i].lower, lower);
    }
    $$log(`Strings.setROMOffset -> ${$$hex((upper << 16) | lower)}`);
  }

  public getPatchOffsets() {
    return _stringOffsets[romhandler.getROMGame()!];
  }

  public extract() {
    const romOffset = this.getROMOffset();
    if (romOffset === null) {
      return;
    }
    const view = romhandler.getDataView(romOffset);
    return (this._strFsInstance = new StringTable(view));
  }

  public extractAsync(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.extract();
      resolve();
    });
  }

  public pack(buffer: ArrayBuffer, offset = 0) {
    return this._strFsInstance!.pack(buffer, offset);
  }

  //read(index: number, raw: true): ArrayBuffer;
  //read(index: number, raw?: false): string;
  //read(index: number, raw: boolean): ArrayBuffer | string;
  public read(index: number, raw = false): ArrayBuffer | string {
    return this._strFsInstance!.read(index, raw);
  }

  // Writes a pre-made buffer for now.
  public write(index: number, content: ArrayBuffer) {
    this._strFsInstance!.write(index, content);
  }

  public clear() {
    this._strFsInstance = null;
  }

  public getStringCount() {
    return this._strFsInstance!.getStringCount();
  }

  // Gets the required byte length of the string section of the ROM.
  public getByteLength() {
    return this._strFsInstance!.getByteLength();
  }
}

export function strToBytes(str: string): number[] {
  const map = getROMAdapter({})!.getCharacterMap();
  const result = [];
  let curIdx = 0;
  const len = str.length;
  while (curIdx < len) {
    let lastMatchLen = 0;
    let lastMatch: string | number;
    for (const byte in map) {
      if (!map.hasOwnProperty(byte)) continue;

      const chars = map[byte];
      if (str.substr(curIdx, chars.length) === chars) {
        if (chars.length > lastMatchLen) {
          lastMatchLen = chars.length;
          lastMatch = byte;
        }
      }
    }

    if (lastMatchLen === 0) {
      lastMatchLen = 1;
      lastMatch = str.charCodeAt(curIdx);
    }

    if (typeof lastMatch! === "string") lastMatch = parseInt(lastMatch);

    result.push(lastMatch!);
    curIdx += lastMatchLen;
  }

  return result;
}
