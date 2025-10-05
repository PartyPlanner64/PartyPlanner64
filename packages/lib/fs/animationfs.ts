import { $$log, $$hex } from "../utils/debug";
import { compress, getCompressedSize, decompress } from "../utils/compression";
import { toTiles, fromTiles } from "../utils/img/tiler";
import { RGBA5551fromRGBA32, RGBA5551toRGBA32 } from "../utils/img/RGBA5551";
import { arrayBuffersEqual, copyRange } from "../utils/arrays";
import { createContext } from "../utils/canvas";
import { makeDivisibleBy } from "../utils/number";
import { Game } from "../types";
import { ROM } from "../romhandler";

interface IOffsetInfo {
  upper: number;
  lower: number;
}

interface IAnimationFsReadInfo {
  compressionType: number;
  decompressed: ArrayBufferLike;
  compressed?: ArrayBufferLike;
}

const _animFSOffsets: { [game: string]: IOffsetInfo[] } = {};
_animFSOffsets[Game.MP2_USA] = [
  // 0x16EC470
  { upper: 0x000546c6, lower: 0x000546ca },
];

export class Animationfs {
  private _rom: ROM;
  private _animfsCache: { [index: number]: IAnimationFsReadInfo }[][] | null =
    null;

  public constructor(rom: ROM) {
    this._rom = rom;
  }

  public getROMOffset() {
    const romView = this._rom.getDataView();
    const patchOffsets = this.getPatchOffsets();
    if (!patchOffsets) return null;
    const romOffset = patchOffsets[0];
    const upper = romView.getUint16(romOffset.upper) << 16;
    const lower = romView.getUint16(romOffset.lower);
    let offset = upper | lower;
    if (lower & 0x8000) offset = offset - 0x00010000; // Account for signed addition workaround.
    $$log(`AnimationFS.getROMOffset -> ${$$hex(offset)}`);
    return offset;
  }

  public setROMOffset(newOffset: number, buffer: ArrayBuffer) {
    const romView = new DataView(buffer);
    const patchOffsets = this.getPatchOffsets();
    if (!patchOffsets) return;
    let upper = (newOffset & 0xffff0000) >>> 16;
    const lower = newOffset & 0x0000ffff;
    if (lower & 0x8000) upper += 1; // ASM adjust for the signed addition.
    for (let i = 0; i < patchOffsets.length; i++) {
      romView.setUint16(patchOffsets[i].upper, upper);
      romView.setUint16(patchOffsets[i].lower, lower);
    }
    $$log(`AnimationFS.setROMOffset -> ${$$hex((upper << 16) | lower)}`);
  }

  public getPatchOffsets() {
    return _animFSOffsets[this._rom.getGame()!];
  }

  public get(set: number, entry: number, index: number) {
    return this._animfsCache![set][entry][index].decompressed;
  }

  public write(
    set: number,
    entry: number,
    tileBuffer: ArrayBufferLike,
    index: number,
  ) {
    const compressed = compress(3, new DataView(tileBuffer));

    if (!this._animfsCache![set]) this._animfsCache![set] = [];
    if (!this._animfsCache![set][entry]) this._animfsCache![set][entry] = {};
    this._animfsCache![set][entry][index] = {
      compressionType: 3,
      decompressed: tileBuffer,
      compressed,
    };
  }

  _createOrderedTiles(imgData: ImageData, width: number, height: number) {
    const tileXCount = width / 64;
    const tileYCount = height / 48;

    const tiles32 = toTiles(imgData.data, tileXCount, tileYCount, 64 * 4, 48);
    const tiles16 = tiles32.map((tile32) => {
      return RGBA5551fromRGBA32(tile32, 64, 48);
    });
    const orderedTiles = [];
    for (let y = tileYCount - 1; y >= 0; y--) {
      for (let x = 0; x < tileXCount; x++) {
        orderedTiles.push(tiles16[y * tileXCount + x]);
      }
    }
    return orderedTiles;
  }

  public writeAnimationBackground(
    set: number,
    entry: number,
    mainImgData: ImageData,
    animImgData: ImageData,
    width: number,
    height: number,
  ) {
    $$log(
      `AnimationFS.writeAnimationBackground, set: ${set}, entry: ${entry}, img is ${width}x${height}`,
    );

    const orderedMainTiles = this._createOrderedTiles(
      mainImgData,
      width,
      height,
    );
    const orderedAnimTiles = this._createOrderedTiles(
      animImgData,
      width,
      height,
    );

    this.clearSetEntry(set, entry);

    // Write the tiles that are different to the sparse tree.
    for (let i = 0; i < orderedAnimTiles.length; i++) {
      if (!arrayBuffersEqual(orderedMainTiles[i], orderedAnimTiles[i]))
        this.write(set, entry, orderedAnimTiles[i], i + 1);
    }
  }

  _unorderTiles(tiles: any[], tileXCount: number, tileYCount: number) {
    const unordered = [];
    for (let y = tileYCount - 1; y >= 0; y--) {
      for (let x = 0; x < tileXCount; x++) {
        unordered.push(tiles[y * tileXCount + x]);
      }
    }
    return unordered;
  }

  _readAnimationBackground(
    set: number,
    entry: number,
    orderedMainTiles: ArrayBuffer[],
    width: number,
    height: number,
  ) {
    let orderedAnimBgTiles = [];
    for (let i = 0; i < orderedMainTiles.length; i++) {
      if (this._animfsCache![set][entry].hasOwnProperty(i + 1))
        orderedAnimBgTiles.push(
          new DataView(this._animfsCache![set][entry][i + 1].decompressed),
        );
      else orderedAnimBgTiles.push(new DataView(orderedMainTiles[i]));
    }

    const tileWidth = 64;
    const tileHeight = 48;
    const tileXCount = width / 64;
    const tileYCount = height / 48;

    orderedAnimBgTiles = this._unorderTiles(
      orderedAnimBgTiles,
      tileXCount,
      tileYCount,
    );

    const bgBufferRGBA16 = fromTiles(
      orderedAnimBgTiles,
      tileXCount,
      tileYCount,
      tileWidth * 2,
      tileHeight,
    );
    const bgBufferRGBA32 = RGBA5551toRGBA32(bgBufferRGBA16, width, height);
    const bgArr = new Uint8Array(bgBufferRGBA32);

    const canvasCtx = createContext(width, height);
    const bgImageData = canvasCtx.createImageData(width, height);

    for (let i = 0; i < bgArr.byteLength; i++) {
      bgImageData.data[i] = bgArr[i];
    }

    canvasCtx.putImageData(bgImageData, 0, 0);
    return canvasCtx.canvas.toDataURL();
  }

  public readAnimationBackgrounds(
    set: number,
    mainImgData: ImageData,
    width: number,
    height: number,
  ) {
    const entries = this.getSetEntryCount(set);

    const orderedMainTiles = this._createOrderedTiles(
      mainImgData,
      width,
      height,
    );

    const bgs = [];
    for (let entry = 0; entry < entries; entry++) {
      bgs.push(
        this._readAnimationBackground(
          set,
          entry,
          orderedMainTiles,
          width,
          height,
        ),
      );
    }

    return bgs;
  }

  public extract() {
    const startingOffset = this.getROMOffset();
    if (startingOffset === null) {
      return null;
    }
    const view = this._rom.getDataView();
    this._animfsCache = this._extractSets(view, startingOffset);
    return this._animfsCache;
  }

  public extractAsync(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.extract();
      resolve();
    });
  }

  _extractSets(view: DataView, offset: number) {
    const sets = [];
    const count = view.getUint32(offset) - 1; // Extra offset
    for (let i = 0; i < count; i++) {
      const setOffset = view.getUint32(offset + 4 + i * 4);
      sets.push(this._extractSetEntries(view, offset + setOffset));
    }
    return sets;
  }

  _extractSetEntries(view: DataView, offset: number) {
    const setEntries = [];
    const count = view.getUint32(offset);
    for (let i = 0; i < count; i++) {
      const setEntryOffset = view.getUint32(offset + 4 + i * 4);
      setEntries.push(this._extractTiles(view, offset + setEntryOffset));
    }
    return setEntries;
  }

  _extractTiles(view: DataView, offset: number) {
    const tiles: { [index: number]: IAnimationFsReadInfo } = {};
    const count = view.getUint32(offset) - 1; // Extra offset
    for (let i = 0; i < count; i++) {
      const tileOffset = view.getUint32(offset + 4 + i * 4);
      const tile = this._readTile(view, offset + tileOffset);
      tiles[tile.index] = {
        compressionType: tile.compressionType,
        compressed: tile.compressed,
        decompressed: tile.decompressed,
      };
    }
    return tiles;
  }

  _readTile(view: DataView, offset: number) {
    const index = view.getUint32(offset);
    const compressionType = view.getUint32(offset + 4); // 3
    const decompressedSize = view.getUint32(offset + 8); // 0x1800
    const buffer = view.buffer;
    const fileStartOffset = offset + 12;
    const fileStartView = new DataView(buffer, fileStartOffset);
    const compressedSize = getCompressedSize(
      compressionType,
      fileStartView,
      decompressedSize,
    )!; // TODO perf
    return {
      index,
      compressionType,
      compressed: buffer.slice(
        fileStartOffset,
        fileStartOffset + compressedSize,
      ),
      decompressed: decompress(
        compressionType,
        fileStartView,
        decompressedSize,
      ),
    };
  }

  public pack(buffer: ArrayBuffer, offset = 0) {
    const view = new DataView(buffer, offset);

    const setCount = this.getSetCount();
    view.setUint32(0, setCount + 1); // Extra offset

    let curSetIndexOffset = 4;
    let curSetWriteOffset = 4 + (setCount + 1) * 4;
    for (let s = 0; s < setCount; s++) {
      view.setUint32(curSetIndexOffset, curSetWriteOffset);
      curSetIndexOffset += 4;
      curSetWriteOffset = this._writeSet(s, view, curSetWriteOffset);
      curSetWriteOffset = makeDivisibleBy(curSetWriteOffset, 4);
    }

    view.setUint32(curSetIndexOffset, curSetWriteOffset); // Extra offset

    return curSetWriteOffset;
  }

  _writeSet(s: number, view: DataView, offset: number) {
    const setEntryCount = this.getSetEntryCount(s);
    view.setUint32(offset, setEntryCount); // No extra offsets at middle layer

    let curSetEntryIndexOffset = offset + 4;
    let curSetEntryWriteOffset = offset + 4 + setEntryCount * 4;
    for (let e = 0; e < setEntryCount; e++) {
      view.setUint32(curSetEntryIndexOffset, curSetEntryWriteOffset - offset);
      curSetEntryIndexOffset += 4;
      curSetEntryWriteOffset = this._writeTiles(
        s,
        e,
        view,
        curSetEntryWriteOffset,
      );
      curSetEntryWriteOffset = makeDivisibleBy(curSetEntryWriteOffset, 4);
    }

    return curSetEntryWriteOffset;
  }

  _writeTiles(s: number, e: number, view: DataView, offset: number) {
    const tileCount = this.getSetEntryTileCount(s, e);
    view.setUint32(offset, tileCount + 1); // Extra offset

    let curTileIndexOffset = offset + 4;
    let curTileWriteOffset = offset + 4 + (tileCount + 1) * 4;
    for (const t in this._animfsCache![s][e]) {
      if (!this._animfsCache![s][e].hasOwnProperty(t)) continue;

      view.setUint32(curTileIndexOffset, curTileWriteOffset - offset);
      curTileIndexOffset += 4;
      curTileWriteOffset = this._writeTile(s, e, t, view, curTileWriteOffset);
      curTileWriteOffset = makeDivisibleBy(curTileWriteOffset, 4);
    }

    view.setUint32(curTileIndexOffset, curTileWriteOffset - offset);

    return curTileWriteOffset;
  }

  _writeTile(s: number, e: number, t: string, view: DataView, offset: number) {
    const tile = this._animfsCache![s][e][t as any];
    view.setUint32(offset, parseInt(t));
    view.setUint32(offset + 4, 3); // Compression type
    view.setUint32(offset + 8, tile.decompressed.byteLength); // Decompressed size
    copyRange(
      view,
      tile.compressed!,
      offset + 12,
      0,
      tile.compressed!.byteLength,
    );
    return offset + 12 + tile.compressed!.byteLength;
  }

  public getSetCount() {
    return this._animfsCache!.length;
  }

  public getSetEntryCount(set: number) {
    return this._animfsCache![set].length;
  }

  // This is exposed so that we can blow away animations for a stock board (count = 0)
  public setSetEntryCount(set: number, count: number) {
    return (this._animfsCache![set].length = count);
  }

  public clearSetEntry(set: number, entry: number) {
    return (this._animfsCache![set][entry] = {});
  }

  public getSetEntryTileCount(set: number, entry: number) {
    return Object.keys(this._animfsCache![set][entry]).length;
  }

  public getByteLength() {
    let byteLen = 0;

    const setCount = this.getSetCount();
    byteLen += 4; // Count of sets
    byteLen += 4 * (setCount + 1); // Set offsets + the extra offset

    for (let s = 0; s < setCount; s++) {
      const setEntryCount = this.getSetEntryCount(s);

      byteLen += 4; // Count of set entries
      byteLen += 4 * setEntryCount; // Set entry offsets (no extra offset)

      for (let e = 0; e < setEntryCount; e++) {
        const tileCount = this.getSetEntryTileCount(s, e);
        byteLen += 4; // Count of tiles
        byteLen += 4 * (tileCount + 1); // Tile offsets + the extra offset

        for (const t in this._animfsCache![s][e]) {
          if (!this._animfsCache![s][e].hasOwnProperty(t)) continue;
          const tile = this._animfsCache![s][e][t];
          byteLen += 4; // Index
          byteLen += 4; // Compression type
          byteLen += 4; // Decompressed size
          byteLen += tile.compressed!.byteLength;
          byteLen = makeDivisibleBy(byteLen, 4);
        }
      }
    }

    return byteLen;
  }
}
