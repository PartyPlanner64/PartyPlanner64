import { $$log, $$hex } from "../utils/debug";
import { decompress } from "../utils/compression";
import { arrayBuffersEqual, copyRange } from "../utils/arrays";
import { makeDivisibleBy } from "../utils/number";
import { Game } from "../types";
import { romhandler } from "../romhandler";
import { getRegSetUpperAndLower, getRegSetAddress } from "../utils/MIPS";
import { isDebug } from "../../../apps/partyplanner64/debug";

interface IOffsetInfo {
  upper: number;
  lower: number;
}

const _mainFSOffsets: { [game: string]: IOffsetInfo[] } = {};

_mainFSOffsets[Game.MP1_USA] = [
  // Default 0x0031C7E0
  { upper: 0x157a6, lower: 0x157aa },
  { upper: 0x3c016, lower: 0x3c01e },
];
_mainFSOffsets[Game.MP1_JPN] = [
  { upper: 0x156d6, lower: 0x156da },
  { upper: 0x3bf32, lower: 0x3bf3a },
];
_mainFSOffsets[Game.MP1_PAL] = [
  // Default 0x003373C0
  { upper: 0x160f6, lower: 0x160fa },
  { upper: 0x3d83a, lower: 0x3d83e },
];
_mainFSOffsets[Game.MP2_USA] = [
  // Default 0x0041DD30
  { upper: 0x416e6, lower: 0x416ee },
];
_mainFSOffsets[Game.MP2_JPN] = [
  // Default 0x00417540
  { upper: 0x40d8a, lower: 0x40d92 },
];
_mainFSOffsets[Game.MP3_USA] = [{ upper: 0x3619e, lower: 0x361a6 }];
_mainFSOffsets[Game.MP3_JPN] = [
  // Default 0x005517F0
  { upper: 0x3618a, lower: 0x36192 },
];

let _mainfsCache: IMainFsReadInfo[][] | null;

export interface IMainFsReadInfo {
  compressionType: number;
  decompressedSize?: number;
  decompressed: ArrayBuffer;
  compressed?: ArrayBuffer;
}

export function _getFileHeaderSize(compressionType: number) {
  switch (compressionType) {
    case 0:
    case 1:
    case 5:
      return 8; // Don't duplicate decompressed size.
    case 2:
    case 3: // Never occurs
    case 4:
      return 12;
  }
  throw new Error(`_getFileHeaderSize(${compressionType}) not handled`);
}

export class mainfs {
  public static getROMOffset(): number | null {
    const romView = romhandler.getDataView();
    const patchOffsets = mainfs.getPatchOffsets();
    if (!patchOffsets) return null;
    const romOffset = patchOffsets[0];
    const upper = romView.getUint16(romOffset.upper) << 16;
    const lower = romView.getUint16(romOffset.lower);
    let offset = upper | lower;
    if (lower & 0x8000) offset = offset - 0x00010000; // Account for signed addition workaround.
    $$log(`MainFS.getROMOffset -> ${$$hex(offset)}`);

    if (isDebug()) {
      // Assert that the rest of the patch offsets are valid.
      for (let i = 1; i < patchOffsets.length; i++) {
        const anotherUpper = romView.getUint16(patchOffsets[i].upper) << 16;
        const anotherLower = romView.getUint16(patchOffsets[i].lower);
        if (anotherUpper !== upper || anotherLower !== lower)
          throw new Error(`MainFS.getROMOffset patch offset ${i} seems wrong`);
      }
    }

    return offset;
  }

  public static setROMOffset(newOffset: number, buffer: ArrayBuffer) {
    const romView = new DataView(buffer);
    const patchOffsets = mainfs.getPatchOffsets();
    const [upper, lower] = getRegSetUpperAndLower(newOffset);
    for (let i = 0; i < patchOffsets.length; i++) {
      romView.setUint16(patchOffsets[i].upper, upper);
      romView.setUint16(patchOffsets[i].lower, lower);
    }
    $$log(`MainFS.setROMOffset -> ${$$hex(getRegSetAddress(upper, lower))}`);
  }

  public static getPatchOffsets() {
    return _mainFSOffsets[romhandler.getROMGame()!];
  }

  public static get(dir: number, file: number) {
    return _mainfsCache![dir][file].decompressed;
  }

  public static has(dir: number, file: number) {
    return !!_mainfsCache![dir][file];
  }

  public static read(dir: number, file: number, all: boolean): IMainFsReadInfo {
    const buffer = romhandler.getROMBuffer()!;

    const fs_offset = mainfs.getROMOffset()!;
    const fsView = new DataView(buffer, fs_offset);

    const dir_offset = fs_offset + fsView.getUint32(4 * (1 + dir));
    const dirView = new DataView(buffer, dir_offset);

    const fileEntryOffset = dir_offset + dirView.getUint32(4 * (1 + file));
    const fileView = new DataView(buffer, fileEntryOffset);
    const decompressed_size = fileView.getUint32(0);
    const compression_type = fileView.getUint32(4);
    const fileStartOffset =
      fileEntryOffset + _getFileHeaderSize(compression_type);
    const fileStartView = new DataView(buffer, fileStartOffset);

    const result: IMainFsReadInfo = {
      compressionType: compression_type,
      decompressedSize: decompressed_size,
      decompressed: decompress(
        compression_type,
        fileStartView,
        decompressed_size,
      ),
    };
    if (isDebug()) {
      // Assert decompressedSize matches
      if (decompressed_size !== result.decompressed.byteLength)
        throw new Error(
          `MainFS Dir: ${dir}, File: ${file} decompressed size mismatch`,
        );
    }
    if (all) {
      //let compressedSize = getCompressedSize(compression_type, fileStartView, decompressed_size);
      const compressedSize = (result.decompressed as any).compressedSize;
      result.compressed = buffer.slice(
        fileStartOffset,
        fileStartOffset + compressedSize,
      );
    }
    return result;
  }

  public static write(dir: number, file: number, content: ArrayBuffer) {
    let fileData = _mainfsCache![dir][file];
    if (!fileData) {
      $$log(`Adding new file to MainFS: ${dir}/${file}`);
      _mainfsCache![dir][file] = fileData = {
        compressionType: 0,
      } as any;
    } else if (
      content !== fileData.decompressed &&
      arrayBuffersEqual(content, fileData.decompressed)
    )
      return; // Don't bother, because we would just end up losing the compressed data.

    if (fileData.compressed) {
      delete fileData.decompressedSize;
      delete fileData.compressed;
      fileData.compressionType = 0;
    }

    fileData.decompressed = content.slice(0);
  }

  public static clearCache() {
    _mainfsCache = null;
  }

  public static extract() {
    let t0, t1;
    if (isDebug() && typeof performance !== "undefined") {
      t0 = performance.now();
    }

    const dirCount = mainfs.getDirectoryCount();
    _mainfsCache = new Array(dirCount);
    for (let d = 0; d < dirCount; d++) {
      const fileCount = mainfs.getFileCount(d);
      _mainfsCache[d] = new Array(fileCount);
      for (let f = 0; f < fileCount; f++) {
        _mainfsCache[d][f] = mainfs.read(d, f, true);
      }
    }

    if (isDebug() && t0) {
      t1 = performance.now();
      $$log(`MainFS.extract() -> ${t1 - t0}ms`);
    }

    return _mainfsCache;
  }

  public static extractAsync(): Promise<void> {
    return new Promise((resolve) => {
      mainfs.extract();
      resolve();
    });
  }

  public static pack(
    buffer: ArrayBuffer,
    writeDecompressed: boolean,
    offset = 0,
  ) {
    const view = new DataView(buffer, offset);

    const dirCount = mainfs.getDirectoryCount();
    view.setUint32(0, dirCount);

    let curDirIndexOffset = 4;
    let curDirWriteOffset = 4 + dirCount * 4;
    for (let d = 0; d < dirCount; d++) {
      view.setUint32(curDirIndexOffset, curDirWriteOffset);
      curDirIndexOffset += 4;
      curDirWriteOffset = mainfs._writeDir(
        d,
        view,
        curDirWriteOffset,
        writeDecompressed,
      );
      curDirWriteOffset = makeDivisibleBy(curDirWriteOffset, 2);
    }

    return curDirWriteOffset;
  }

  private static _writeDir(
    d: number,
    view: DataView,
    offset: number,
    writeDecompressed: boolean,
  ) {
    const fileCount = mainfs.getFileCount(d);
    view.setUint32(offset, fileCount);

    let curFileIndexOffset = offset + 4;
    let curFileWriteOffset = offset + 4 + fileCount * 4;
    for (let f = 0; f < fileCount; f++) {
      view.setUint32(curFileIndexOffset, curFileWriteOffset - offset);
      curFileIndexOffset += 4;
      curFileWriteOffset = mainfs._writeFile(
        d,
        f,
        view,
        curFileWriteOffset,
        writeDecompressed,
      );
      curFileWriteOffset = makeDivisibleBy(curFileWriteOffset, 2);
    }

    return curFileWriteOffset;
  }

  private static _writeFile(
    d: number,
    f: number,
    view: DataView,
    offset: number,
    writeDecompressed: boolean,
  ) {
    const fileData = _mainfsCache![d][f];

    if (!fileData) {
      view.setUint32(offset, 0); // No file, no size
      view.setUint32(offset + 4, 0);
      let fileStartOffset = offset + 8;
      if (_getFileHeaderSize(0) === 12) {
        // Duplicate decompressed size
        view.setUint32(offset + 8, 0);
        fileStartOffset += 4;
      }
      return fileStartOffset;
    } else {
      view.setUint32(
        offset,
        fileData.decompressedSize || fileData.decompressed.byteLength,
      );

      const compressionType = writeDecompressed ? 0 : fileData.compressionType;
      view.setUint32(offset + 4, compressionType);

      let fileStartOffset = offset + 8;
      if (_getFileHeaderSize(compressionType) === 12) {
        // Duplicate decompressed size
        view.setUint32(
          offset + 8,
          fileData.decompressedSize || fileData.decompressed.byteLength,
        );
        fileStartOffset += 4;
      }

      let bytesToWrite;
      if (writeDecompressed) bytesToWrite = fileData.decompressed;
      else bytesToWrite = fileData.compressed || fileData.decompressed;
      copyRange(
        view,
        bytesToWrite,
        fileStartOffset,
        0,
        bytesToWrite.byteLength,
      );

      return fileStartOffset + bytesToWrite.byteLength;
    }
  }

  public static getDirectoryCount() {
    if (_mainfsCache) return _mainfsCache.length;

    const buffer = romhandler.getROMBuffer()!;
    const fsView = new DataView(buffer, mainfs.getROMOffset()!);
    return fsView.getUint32(0);
  }

  public static getFileCount(dir: number): number {
    if (_mainfsCache && _mainfsCache[dir]) return _mainfsCache[dir].length;

    const buffer = romhandler.getROMBuffer()!;
    const fs_offset = mainfs.getROMOffset()!;
    const fsView = new DataView(buffer, fs_offset);
    const dir_offset = fs_offset + fsView.getUint32(4 * (1 + dir));
    const dirView = new DataView(buffer, dir_offset);
    return dirView.getUint32(0);
  }

  public static getByteLength(writeDecompressed: boolean): number {
    const dirCount = _mainfsCache!.length;

    let byteLen = 0;
    byteLen += 4; // Count of directories
    byteLen += 4 * dirCount; // Directory offsets

    for (let d = 0; d < dirCount; d++) {
      const fileCount = _mainfsCache![d].length;

      byteLen += 4; // Count of files
      byteLen += 4 * fileCount; // File offsets

      for (let f = 0; f < fileCount; f++) {
        const fileData = _mainfsCache![d][f];

        if (!fileData) {
          // Happens if we write a new file at a specific place and leave gaps.
          byteLen += _getFileHeaderSize(0);
        } else {
          // Decompressed size, compression type, and perhaps duplicated decompressed size.
          byteLen += _getFileHeaderSize(
            writeDecompressed ? 0 : fileData.compressionType,
          );

          if (fileData.compressed && !writeDecompressed)
            // We never touched it.
            byteLen += fileData.compressed!.byteLength;
          else byteLen += fileData.decompressed.byteLength;
          byteLen = makeDivisibleBy(byteLen, 2);
        }
      }
    }

    return byteLen;
  }

  /** Returns the current compressed size of a file. */
  public static getCompressedSize(dir: number, file: number): number {
    if (_mainfsCache && _mainfsCache[dir][file]) {
      if (_mainfsCache[dir][file].compressed) {
        return _mainfsCache[dir][file].compressed!.byteLength;
      }
    }
    return 0;
  }

  public static getFileHeaderSize(dir: number, file: number): number {
    if (_mainfsCache && _mainfsCache[dir][file]) {
      if (typeof _mainfsCache[dir][file].compressionType === "number") {
        return _getFileHeaderSize(_mainfsCache[dir][file].compressionType);
      }
    }
    return 8;
  }
}
