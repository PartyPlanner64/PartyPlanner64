import { $$log, $$hex } from "../utils/debug";
import { makeDivisibleBy } from "../utils/number";
import { decode, encode } from "../utils/img/HVQ";
import { fromTiles, toTiles } from "../utils/img/tiler";
import { RGBA5551toRGBA32, RGBA5551fromRGBA32 } from "../utils/img/RGBA5551";
import { createContext } from "../utils/canvas";
import { copyRange } from "../utils/arrays";
import { Game } from "../types";
import { romhandler } from "../romhandler";
import { scenes } from "./scenes";
import { getRegSetAddress, getRegSetUpperAndLower } from "../utils/MIPS";

interface IHVQMetadata {
  tileWidth: number;
  tileHeight: number;
  tileCountX: number;
  tileCountY: number;

  fov: number;
  unk: number;

  cameraEyePosX: number;
  cameraEyePosY: number;
  cameraEyePosZ: number;

  lookatPointX: number;
  lookatPointY: number;
  lookatPointZ: number;

  cameraUpVecX: number;
  cameraUpVecY: number;
  cameraUpVecZ: number;
}

interface IOffsetInfo {
  upper: number;
  lower: number;
  ovl?: number;
}

let _HVQFSOffsets: { [game: string]: IOffsetInfo[] } = {};

_HVQFSOffsets[Game.MP1_USA] = [ // Default at 0x00FE2310
  { upper: 0x00057626, lower: 0x0005762A },
  { upper: 0x0005D012, lower: 0x0005D016 },
  { ovl: 0x01, upper: 0x236, lower: 0x23E }, // ROM: 0xD5416
  { ovl: 0x3F, upper: 0xAD6, lower: 0xADE }, // ROM: 0x259D76
  { ovl: 0x40, upper: 0x59FE, lower: 0x5A06 }, // ROM: 0x25F8AE
  { ovl: 0x41, upper: 0x722, lower: 0x72A }, // ROM: 0x260392
  { ovl: 0x42, upper: 0x389A, lower: 0x38A2 }, // ROM: 0x27C76A
  { ovl: 0x43, upper: 0x3E62, lower: 0x3E6A }, // ROM: 0x280992
  { ovl: 0x44, upper: 0xE16, lower: 0xE1E }, // ROM: 0x281A96
  { ovl: 0x45, upper: 0x88A, lower: 0x892 }, // ROM: 0x2825CA
  { ovl: 0x46, upper: 0x2896, lower: 0x289E }, // ROM: 0x2850B6
  { ovl: 0x47, upper: 0x8B6, lower: 0x8BE }, // ROM: 0x285AE6
  { ovl: 0x48, upper: 0xA9A, lower: 0xAA2 }, // ROM: 0x28660A
  { ovl: 0x49, upper: 0xAAA, lower: 0xAB2 }, // ROM: 0x2871AA
  { ovl: 0x4A, upper: 0x14A2, lower: 0x14AA }, // ROM: 0x288742
  { ovl: 0x4B, upper: 0x118E, lower: 0x1196 }, // ROM: 0x289A2E
  { ovl: 0x4C, upper: 0xEBE, lower: 0xEC6 }, // ROM: 0x28AA5E
  { ovl: 0x4D, upper: 0xFF2, lower: 0xFFA }, // ROM: 0x28BB92
  { ovl: 0x4E, upper: 0x1206, lower: 0x120E }, // ROM: 0x28CE76
  { ovl: 0x4F, upper: 0xEEE, lower: 0xEF6 }, // ROM: 0x28DEDE
  { ovl: 0x50, upper: 0x4F6, lower: 0x4FE }, // ROM: 0x28E526
  { ovl: 0x51, upper: 0x5D2, lower: 0x5DA }, // ROM: 0x28EC02
  { ovl: 0x52, upper: 0x1A46, lower: 0x1A4E }, // ROM: 0x2906E6
  { ovl: 0x53, upper: 0x942, lower: 0x94A }, // ROM: 0x291232
  { ovl: 0x54, upper: 0xB62, lower: 0xB6A }, // ROM: 0x291EC2
  { ovl: 0x55, upper: 0x10FE, lower: 0x1106 }, // ROM: 0x29311E
  { ovl: 0x56, upper: 0x78A, lower: 0x792 }, // ROM: 0x2939EA
  { ovl: 0x57, upper: 0x1896, lower: 0x189E }, // ROM: 0x295306
  { ovl: 0x59, upper: 0x8AA, lower: 0x8B2 }, // ROM: 0x295CFA
  { ovl: 0x5A, upper: 0xBBE, lower: 0xBC6 }, // ROM: 0x2969FE
  { ovl: 0x5B, upper: 0xF62, lower: 0xF6A }, // ROM: 0x297AD2
  { ovl: 0x5C, upper: 0x362, lower: 0x36A }, // ROM: 0x297F42
  { ovl: 0x5D, upper: 0xA32, lower: 0xA3A }, // ROM: 0x2989E2
  { ovl: 0x5E, upper: 0x179A, lower: 0x17A2 }, // ROM: 0x29A27A
  { ovl: 0x5F, upper: 0x622, lower: 0x62A }, // ROM: 0x29AA22
  { ovl: 0x60, upper: 0x62E, lower: 0x636 }, // ROM: 0x29B15E
  { ovl: 0x61, upper: 0x54FA, lower: 0x5502 }, // ROM: 0x2A090A
  { ovl: 0x62, upper: 0x2CA2, lower: 0x2CAA }, // ROM: 0x2A51A2
  { ovl: 0x64, upper: 0x5A66, lower: 0x5A6E }, // ROM: 0x2B70D6
  { ovl: 0x65, upper: 0x2CCE, lower: 0x2CD6 }, // ROM: 0x2BA16E
  { ovl: 0x77, upper: 0x29EA, lower: 0x29F2 }, // ROM: 0x2FD79A
  { ovl: 0x78, upper: 0x2976, lower: 0x297E }, // ROM: 0x3002B6
  { ovl: 0x79, upper: 0xDFE, lower: 0xE06 }, // ROM: 0x3013AE
  { ovl: 0x7B, upper: 0x24B2, lower: 0x24B6 }, // ROM: 0x306322
  { ovl: 0x7C, upper: 0x153E, lower: 0x1546 }, // ROM: 0x309F8E
  { ovl: 0x7D, upper: 0x12EA, lower: 0x12F2 }, // ROM: 0x30D82A
  { ovl: 0x80, upper: 0x1E9A, lower: 0x1EA2 }, // ROM: 0x3146EA
  { ovl: 0x82, upper: 0x1322, lower: 0x132A }, // ROM: 0x317762
];
_HVQFSOffsets[Game.MP1_JPN] = [
  { upper: 0x00057496, lower: 2 }, // TODO: Needs conversion
  { upper: 0x0005CBD2, lower: 2 },
  { upper: 0x000D48C6, lower: 6 },
  { upper: 0x002592A6, lower: 6 },
  { upper: 0x0025EDE6, lower: 6 },
  { upper: 0x0025F8D2, lower: 6 },
  { upper: 0x0027BCAA, lower: 6 },
  { upper: 0x0027FEC2, lower: 6 },
  { upper: 0x00280FC6, lower: 6 },
  { upper: 0x00281AFA, lower: 6 },
  { upper: 0x002845E6, lower: 6 },
  { upper: 0x00285016, lower: 6 },
  { upper: 0x00285B3A, lower: 6 },
  { upper: 0x002866DA, lower: 6 },
  { upper: 0x00287C72, lower: 6 },
  { upper: 0x00288F5E, lower: 6 },
  { upper: 0x00289F8E, lower: 6 },
  { upper: 0x0028B0C2, lower: 6 },
  { upper: 0x0028C3A6, lower: 6 },
  { upper: 0x0028D40E, lower: 6 },
  { upper: 0x0028DA56, lower: 6 },
  { upper: 0x0028E132, lower: 6 },
  { upper: 0x0028FC16, lower: 6 },
  { upper: 0x00290762, lower: 6 },
  { upper: 0x002913F2, lower: 6 },
  { upper: 0x0029264E, lower: 6 },
  { upper: 0x00292F1A, lower: 6 },
  { upper: 0x00294836, lower: 6 },
  { upper: 0x0029522A, lower: 6 },
  { upper: 0x00295F2A, lower: 6 },
  { upper: 0x00296FFE, lower: 6 },
  { upper: 0x00297462, lower: 6 },
  { upper: 0x00297F02, lower: 6 },
  { upper: 0x0029979E, lower: 6 },
  { upper: 0x00299F42, lower: 6 },
  { upper: 0x0029A67E, lower: 6 },
  { upper: 0x0029FE06, lower: 6 },
  { upper: 0x002A46D6, lower: 6 },
  { upper: 0x002B6656, lower: 6 },
  { upper: 0x002B96EE, lower: 6 },
  { upper: 0x002FCAD2, lower: 6 },
  { upper: 0x002FF5F6, lower: 6 },
  { upper: 0x003006EE, lower: 6 },
  { upper: 0x00305662, lower: 2 },
  { upper: 0x003092CE, lower: 6 },
  { upper: 0x0030CB6A, lower: 6 },
  { upper: 0x00313A1A, lower: 6 },
  { upper: 0x00316A02, lower: 6 },
];
_HVQFSOffsets[Game.MP2_USA] = [ // Default at 0x01164160
  { upper: 0x00054BD2, lower: 0x00054BDA },
  { upper: 0x00063A36, lower: 0x00063A3E },
  { upper: 0x00074D6A, lower: 0x00074D6E },
  { ovl: 0x3F, upper: 0x9A, lower: 0xA2 }, // ROM: 0x2A8A3A
  { ovl: 0x40, upper: 0x96, lower: 0x9E }, // ROM: 0x2AEE46
  { ovl: 0x42, upper: 0x9A, lower: 0xA2 }, // ROM: 0x2C081A
  { ovl: 0x44, upper: 0x9A, lower: 0xA2 }, // ROM: 0x2DA94A
  { ovl: 0x46, upper: 0x9E, lower: 0xA6 }, // ROM: 0x2F17CE
  { ovl: 0x48, upper: 0xA2, lower: 0xAA }, // ROM: 0x306C42
  { ovl: 0x4A, upper: 0x9A, lower: 0xA2 }, // ROM: 0x31EEDA
  { ovl: 0x4D, upper: 0xE12, lower: 0xE1A }, // ROM: 0x329842
  { ovl: 0x4E, upper: 0xAE, lower: 0xB6 }, // ROM: 0x32A26E
  { ovl: 0x4F, upper: 0xA6, lower: 0xAE }, // ROM: 0x3354E6
  { ovl: 0x50, upper: 0xA6, lower: 0xAE }, // ROM: 0x343106
  { ovl: 0x51, upper: 0x57FA, lower: 0x5802 }, // ROM: 0x35860A
  { ovl: 0x52, upper: 0x340E, lower: 0x3416 }, // ROM: 0x35C1EE
  { ovl: 0x53, upper: 0x9A, lower: 0xA2 }, // ROM: 0x35D1AA
  { ovl: 0x54, upper: 0xF6E, lower: 0xF76 }, // ROM: 0x3615DE
  { ovl: 0x55, upper: 0x9E, lower: 0xA6 }, // ROM: 0x36178E
  { ovl: 0x62, upper: 0xCE, lower: 0xD6 }, // ROM: 0x3D4DEE
  { ovl: 0x6D, upper: 0x39E2, lower: 0x39EA }, // ROM: 0x40A022
  { ovl: 0x6E, upper: 0x15B6, lower: 0x15BE }, // ROM: 0x40B8E6
  { ovl: 0x70, upper: 0x1B5A, lower: 0x1B62 }, // ROM: 0x4107BA
  { ovl: 0x72, upper: 0x1E, lower: 0x26 }, // ROM: 0x4157AE
];
_HVQFSOffsets[Game.MP3_USA] = [ // Default at 0x128CC60
  { ovl: 0x81, upper: 0x11E66, lower: 0x11E6E }, // ROM: 0xD07A6
  { ovl: 0x81, upper: 0x25716, lower: 0x2571E }, // ROM: 0xE4056
  { ovl: 0x80, upper: 0x1304A, lower: 0x13052 }, // ROM: 0xFD7DA
  { ovl: 0x80, upper: 0x21E86, lower: 0x21E8E }, // ROM: 0x10C616
  { ovl: 0x4F, upper: 0x632A, lower: 0x6332 }, // ROM: 0x3BF99A
  { ovl: 0x50, upper: 0x3946, lower: 0x394E }, // ROM: 0x3C6106
  { ovl: 0x51, upper: 0x1A62, lower: 0x1A6A }, // ROM: 0x3C7D72
  { ovl: 0x53, upper: 0x3372, lower: 0x337A }, // ROM: 0x3CDB72
  { ovl: 0x54, upper: 0x1BD6, lower: 0x1BDE }, // ROM: 0x3CFA96
  { ovl: 0x62, upper: 0x51D6, lower: 0x51DE }, // ROM: 0x45A696
  { ovl: 0x64, upper: 0x380A, lower: 0x3812 }, // ROM: 0x463F9A
  { ovl: 0x65, upper: 0x2F4A, lower: 0x2F52 }, // ROM: 0x4672AA
  { ovl: 0x6E, upper: 0xA3BA, lower: 0xA3BE }, // ROM: 0x4CCF8A
  { ovl: 0x71, upper: 0x1632, lower: 0x163A }, // ROM: 0x4E83F2
  { ovl: 0x73, upper: 0x12A, lower: 0x132 }, // ROM: 0x4F031A
  { ovl: 0x74, upper: 0x55E, lower: 0x566 }, // ROM: 0x4F3CDE
  { ovl: 0x7A, upper: 0x274A, lower: 0x2752 }, // ROM: 0x52671A
  { ovl: 0x7C, upper: 0x787A, lower: 0x787E }, // ROM: 0x549A9A
  { ovl: 0x7D, upper: 0x18EE, lower: 0x18F6 }, // ROM: 0x54F5FE
  { ovl: 0x7D, upper: 0x28B6, lower: 0x28BE }, // ROM: 0x5505C6
];

export namespace hvqfs {
  export function getROMOffset() {
    let romView = romhandler.getDataView();
    let patchOffsets = getPatchOffsets();
    if (!patchOffsets)
      return null;
    let romPatchInfo = patchOffsets[0];
    if (!romPatchInfo)
      return null;
    let upperReadOffset = romPatchInfo.upper;
    let lowerReadOffset = romPatchInfo.lower;
    if (typeof romPatchInfo.ovl === "number") {
      const sceneInfo = scenes.getInfo(romPatchInfo.ovl);
      upperReadOffset += sceneInfo.rom_start;
      lowerReadOffset += sceneInfo.rom_start;
    }
    let upper = romView.getUint16(upperReadOffset);
    let lower = romView.getUint16(lowerReadOffset);
    const offset = getRegSetAddress(upper, lower);

    // $$log(`HVQFS.getROMOffset -> ${$$hex(offset)}`);

    if ($$debug) { // Assert that the rest of the patch offsets are valid.
      for (let i = 1; i < patchOffsets.length; i++) {
        const anotherPatchOffset = patchOffsets[i];
        let anotherUpperReadOffset = anotherPatchOffset.upper;
        let anotherLowerReadOffset = anotherPatchOffset.lower;
        if (typeof anotherPatchOffset.ovl === "number") {
          const sceneInfo = scenes.getInfo(anotherPatchOffset.ovl);
          anotherUpperReadOffset += sceneInfo.rom_start;
          anotherLowerReadOffset += sceneInfo.rom_start;
        }
        let anotherUpper = romView.getUint16(anotherUpperReadOffset);
        let anotherLower = romView.getUint16(anotherLowerReadOffset);
        if (anotherUpper !== upper || anotherLower !== lower)
          throw `HVQFS.getROMOffset patch offset ${i} seems wrong:
          offset: ${$$hex(offset)} vs ${$$hex(anotherUpper >>> 16) + $$hex(anotherLower, "")}
          reading upper: ${$$hex(anotherUpperReadOffset)}, lower: ${$$hex(anotherLowerReadOffset)}
          `;
      }
    }

    return offset;
  }

  export function setROMOffset(newOffset: number, buffer: ArrayBuffer) {
    $$log(`HVQFS.setROMOffset(0x${Number(newOffset).toString(16)})`);
    let romView = new DataView(buffer);
    let patchOffsets = getPatchOffsets();
    const [upper, lower] = getRegSetUpperAndLower(newOffset);
    for (let i = 0; i < patchOffsets.length; i++) {
      const patchOffset = patchOffsets[i];
      let patchROMUpper = patchOffset.upper;
      let patchROMLower = patchOffset.lower;
      if (typeof patchOffset.ovl === "number") {
        const sceneInfo = scenes.getInfo(patchOffset.ovl);
        patchROMUpper += sceneInfo.rom_start;
        patchROMLower += sceneInfo.rom_start;
      }
      romView.setUint16(patchROMUpper, upper);
      romView.setUint16(patchROMLower, lower);
    }
    $$log(`HVQFS.setROMOffset -> ${$$hex((upper << 16) | lower)}`);
  }

  export function getPatchOffsets() {
    return _HVQFSOffsets[romhandler.getROMGame()!].map(offset => {
      if (offset.lower < 10 && !offset.ovl) { // Delete when JPN is converted
        return {
          upper: offset.upper,
          lower: offset.upper + 2 + offset.lower,
        };
      }

      return {
        upper: offset.upper,
        lower: offset.lower,
        ovl: offset.ovl,
      };
    });
  }

  export function get(dir: number, file: number) {
    return _hvqCache![dir][file];
  }

  export function read(dir: number, file: number) {
    let buffer = romhandler.getROMBuffer()!;

    let fsOffset = getROMOffset()!;
    let fsView = new DataView(buffer, fsOffset);

    let bgOffset = fsOffset + fsView.getUint32(4 * (1 + dir));
    let bgView = new DataView(buffer, bgOffset);

    let fileOffset = bgOffset + bgView.getUint32(4 * (1 + file));
    let nextFileOffset = bgOffset + bgView.getUint32(4 * (1 + file + 1));

    return buffer.slice(fileOffset, nextFileOffset);
  }

  export function write(dir: number, file: number, content: ArrayBuffer) {
    _hvqCache![dir][file] = content.slice(0);
  }

  let _hvqCache: ArrayBuffer[][] | null;
  let _hvqMetadata: IHVQMetadata[] | null;

  export function clearCache() {
    _hvqCache = null;
    _hvqMetadata = null;
  }

  export function extract() {
    let t0, t1;
    if ($$debug && window.performance)
      t0 = performance.now();

    let bgCount = getDirectoryCount();
    _hvqCache = new Array(bgCount);
    _hvqMetadata = new Array(bgCount);
    for (let b = 0; b < bgCount; b++) {
      let fileCount = getHVQFileCount(b);
      _hvqCache[b] = new Array(fileCount);
      for (let f = 0; f < fileCount; f++) {
        _hvqCache[b][f] = read(b, f);
      }

      _readMetadata(b);
    }

    if ($$debug && t0) {
      t1 = performance.now();
      $$log(`HVQFS.extract() -> ${t1 - t0}ms`);
    }

    // Finds HVQ offsets relative to overlay binaries
//     const ofts = getPatchOffsets();
//     const sceneCount = scenes.count();
//     for (let i = 0; i < ofts.length; i++) {
//       let found = false;
//       const oft = ofts[i];
//       for (let j = 0; j < sceneCount; j++) {
//         const info = scenes.getInfo(j);
//         if (oft.upper > info.rom_start && oft.upper < info.rom_end) {
// console.log(`Found: { ovl: ${$$hex(j)}, upper: ${$$hex(oft.upper - info.rom_start)}, lower: ${$$hex(oft.lower - info.rom_start)} }, // ROM: ${$$hex(oft.upper)}`)
//           found = true;
//         }
//       }

//       if (!found) {
//         console.log("Didn't find ", oft);
//       }
//     }

    return _hvqCache;
  }

  export function extractAsync() {
    return new Promise((resolve, reject) => {
      extract();
      resolve();
    });
  }

  export function pack(buffer: ArrayBuffer, offset: number = 0) {
    let view = new DataView(buffer, offset);

    let bgCount = getDirectoryCount();
    view.setUint32(0, bgCount + 1);

    let curBgIndexOffset = 4;
    let curBgWriteOffset = 4 + ((bgCount + 1) * 4);
    for (let b = 0; b < bgCount; b++) {
      view.setUint32(curBgIndexOffset, curBgWriteOffset);
      curBgIndexOffset += 4;
      curBgWriteOffset = _writeBg(b, view, curBgWriteOffset);
      curBgWriteOffset = makeDivisibleBy(curBgWriteOffset, 4);
    }

    view.setUint32(curBgIndexOffset, curBgWriteOffset);

    return curBgWriteOffset;
  }

  function _writeBg(b: number, view: DataView, offset: number) {
    let fileCount = getHVQFileCount(b);
    view.setUint32(offset, fileCount + 1);

    let curFileIndexOffset = offset + 4;
    let curFileWriteOffset = offset + 4 + ((fileCount + 1) * 4);
    for (let f = 0; f < fileCount; f++) {
      view.setUint32(curFileIndexOffset, curFileWriteOffset - offset);
      curFileIndexOffset += 4;
      curFileWriteOffset = _writeFile(b, f, view, curFileWriteOffset);
      curFileWriteOffset = makeDivisibleBy(curFileWriteOffset, 4);
    }

    view.setUint32(curFileIndexOffset, curFileWriteOffset - offset);

    return curFileWriteOffset;
  }

  function _writeFile(b: number, f: number, view: DataView, offset: number) {
    let fileBytes = _hvqCache![b][f];
    copyRange(view, fileBytes, offset, 0, fileBytes.byteLength);
    return offset + fileBytes.byteLength;
  }

  function _readMetadata(dir: number): void {
    let infoView = new DataView(_hvqCache![dir][0], 0);
    const metadata: IHVQMetadata = {
      tileWidth: infoView.getUint32(0),
      tileHeight: infoView.getUint32(4),
      tileCountX: infoView.getUint32(8),
      tileCountY: infoView.getUint32(12),

      fov: infoView.getFloat32(16),
      unk: infoView.getFloat32(20),

      cameraEyePosX: infoView.getFloat32(24),
      cameraEyePosZ: infoView.getFloat32(28),
      cameraEyePosY: infoView.getFloat32(32),

      lookatPointX: infoView.getFloat32(36),
      lookatPointZ: infoView.getFloat32(40),
      lookatPointY: infoView.getFloat32(44),

      cameraUpVecX: infoView.getFloat32(48),
      cameraUpVecZ: infoView.getFloat32(52),
      cameraUpVecY: infoView.getFloat32(56),
    }

    _hvqMetadata![dir] = metadata;
  }

  function _getBgDimensions(dir: number) {
    const metadata = _hvqMetadata![dir];

    let width = metadata.tileWidth * metadata.tileCountX;
    let height = metadata.tileHeight * metadata.tileCountY;
    return [width, height];
  }

  export function getMetadata(dir: number): IHVQMetadata {
    return _hvqMetadata![dir];
  }

  export function readBackgroundImgData(dir: number) {
    let tileCount = _hvqCache![dir].length - 1;

    let infoView = new DataView(_hvqCache![dir][0], 0);
    let tile_width = infoView.getUint32(0);
    let tile_height = infoView.getUint32(4);
    let tile_x_count = infoView.getUint32(8);
    let tile_y_count = infoView.getUint32(12);

    let width = tile_width * tile_x_count;
    let height = tile_height * tile_y_count;

    $$log(`HVQFS.readBackground, dir: ${dir}, tiles: ${tileCount}, board is ${width}x${height}`);

    // if (dir === 39) { // _boardLocData[4].bgNum) { // FIXME: Save away the black tile until HVQ is ready.
    //   //var black_tile_offset = dir_offset + dirView.getUint32(4 + (211 * 4));
    //   let blackTileView = new DataView(_hvqCache![39][211]);
    //   _black = blackTileView;
    // }

    // Grab DataViews of all of the tiles.
    let hvqTiles = [];
    let game = romhandler.getGameVersion();
    let adjust = game === 1 ? 1 : 2; // Skip HVQ-MPS in newer games
    for (let i = adjust; i < _hvqCache![dir].length; i++) {
      hvqTiles.push(new DataView(_hvqCache![dir][i]));
    }
    let rgba16Tiles = hvqTiles.map(decode);
    let rgba16Views = rgba16Tiles.map(tile => {
      return new DataView(tile);
    });
    let orderedRGB16Tiles = [];
    for (let y = tile_y_count - 1; y >= 0; y--) {
      for (let x = 0; x < tile_x_count; x++) {
        orderedRGB16Tiles.push(rgba16Views[(y * tile_x_count) + x]);
      }
    }
    let bgBufferRGBA16 = fromTiles(orderedRGB16Tiles, tile_x_count, tile_y_count, tile_width * 2, tile_height);
    let bgBufferRGBA32 = RGBA5551toRGBA32(bgBufferRGBA16, width, height);
    let bgArr = new Uint8Array(bgBufferRGBA32);

    let canvasCtx = createContext(width, height);
    let bgImageData = canvasCtx.createImageData(width, height);

    for (let i = 0; i < bgArr.byteLength; i++) {
      bgImageData.data[i] = bgArr[i];
    }

    return bgImageData;
  }

  export function readBackground(dir: number) {
    const metadata = getMetadata(dir);
    let [width, height] = _getBgDimensions(dir);
    let canvasCtx = createContext(width, height);
    let bgImageData = readBackgroundImgData(dir);
    canvasCtx.putImageData(bgImageData, 0, 0);
    return Object.assign({}, metadata, {
      width,
      height,
      src: canvasCtx.canvas.toDataURL(),
    });
  }

  export function writeBackground(dir: number, imgData: ImageData, width: number, height: number) {
    let tileXCount = width / 64;
    let tileYCount = height / 48;
    let tileCount = tileXCount * tileYCount;

    $$log(`HVQFS.writeBackground, dir: ${dir}, img is ${width}x${height}`);

    let rgba32tiles = toTiles(imgData.data, tileXCount, tileYCount, 64 * 4, 48);
    let rgba16tiles = rgba32tiles.map(tile32 => {
      return RGBA5551fromRGBA32(tile32, 64, 48);
    });
    let hvqTiles = rgba16tiles.map(tile16 => {
      return encode(tile16, 64, 48);
    });

    let orderedHVQTiles = [];
    for (let y = tileYCount - 1; y >= 0; y--) {
      for (let x = 0; x < tileXCount; x++) {
        orderedHVQTiles.push(hvqTiles[(y * tileXCount) + x]);
      }
    }

    let game = romhandler.getGameVersion();
    if (game === 1) {
      for (let i = 1; i <= tileCount; i++) {
        _hvqCache![dir][i] = orderedHVQTiles[i - 1];
      }
    }
    else { // MP2/3 also has the HVQ-MPS to skip
      for (let i = 2; i <= tileCount + 1; i++) {
        _hvqCache![dir][i] = orderedHVQTiles[i - 2];
      }
    }
  }

  export function getDirectoryCount() {
    if (_hvqCache)
      return _hvqCache.length;

    let buffer = romhandler.getROMBuffer()!;
    let hvqFsOffset = getROMOffset();
    if (hvqFsOffset === null)
      return 0;
    let hvqFsView = new DataView(buffer, hvqFsOffset);
    return hvqFsView.getUint32(0) - 1; // The last dir is a fake.
  }

  export function getHVQFileCount(dir: number) {
    if (_hvqCache && _hvqCache[dir])
      return _hvqCache[dir].length;

    let buffer = romhandler.getROMBuffer()!;
    let hvqFsOffset = getROMOffset();
    if (hvqFsOffset === null)
      return 0;
    let hvqFsView = new DataView(buffer, hvqFsOffset);

    let hvqFileOffset = hvqFsOffset + hvqFsView.getUint32(4 * (1 + dir));
    let hvqFileView = new DataView(buffer, hvqFileOffset);
    return hvqFileView.getUint32(0) - 1; // The last file is a lie.
  }

  export function getByteLength() {
    let byteLen = 0;

    let bgCount = _hvqCache!.length;

    byteLen += 4; // Count of backgrounds
    byteLen += 4 * (bgCount + 1); // Background offsets + the extra offset

    for (let b = 0; b < bgCount; b++) {
      let fileCount = _hvqCache![b].length;

      byteLen += 4; // Count of files
      byteLen += 4 * (fileCount + 1); // File offsets + the extra offset

      for (let f = 0; f < fileCount; f++) {
        byteLen += _hvqCache![b][f].byteLength;
        byteLen = makeDivisibleBy(byteLen, 4);
      }
    }

    return byteLen;
  }
}
