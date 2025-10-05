import { $$log, $$hex } from "../utils/debug";
import { makeDivisibleBy } from "../utils/number";
import { decode, encode } from "../utils/img/HVQ";
import { fromTiles, toTiles } from "../utils/img/tiler";
import { RGBA5551toRGBA32, RGBA5551fromRGBA32 } from "../utils/img/RGBA5551";
import { createContext } from "../utils/canvas";
import { copyRange } from "../utils/arrays";
import { Game } from "../types";
import { ROM } from "../romhandler";
import { getRegSetAddress, getRegSetUpperAndLower } from "../utils/MIPS";
import { isDebug } from "../../../apps/partyplanner64/debug";

interface IOffsetInfo {
  upper: number;
  lower: number;
  ovl?: number;
}

const _HVQFSOffsets: { [game: string]: IOffsetInfo[] } = {};

_HVQFSOffsets[Game.MP1_USA] = [
  // Default at 0x00FE2310
  { upper: 0x00057626, lower: 0x0005762a },
  { upper: 0x0005d012, lower: 0x0005d016 },
  { ovl: 0x01, upper: 0x236, lower: 0x23e }, // ROM: 0xD5416
  { ovl: 0x3f, upper: 0xad6, lower: 0xade }, // ROM: 0x259D76
  { ovl: 0x40, upper: 0x59fe, lower: 0x5a06 }, // ROM: 0x25F8AE
  { ovl: 0x41, upper: 0x722, lower: 0x72a }, // ROM: 0x260392
  { ovl: 0x42, upper: 0x389a, lower: 0x38a2 }, // ROM: 0x27C76A
  { ovl: 0x43, upper: 0x3e62, lower: 0x3e6a }, // ROM: 0x280992
  { ovl: 0x44, upper: 0xe16, lower: 0xe1e }, // ROM: 0x281A96
  { ovl: 0x45, upper: 0x88a, lower: 0x892 }, // ROM: 0x2825CA
  { ovl: 0x46, upper: 0x2896, lower: 0x289e }, // ROM: 0x2850B6
  { ovl: 0x47, upper: 0x8b6, lower: 0x8be }, // ROM: 0x285AE6
  { ovl: 0x48, upper: 0xa9a, lower: 0xaa2 }, // ROM: 0x28660A
  { ovl: 0x49, upper: 0xaaa, lower: 0xab2 }, // ROM: 0x2871AA
  { ovl: 0x4a, upper: 0x14a2, lower: 0x14aa }, // ROM: 0x288742
  { ovl: 0x4b, upper: 0x118e, lower: 0x1196 }, // ROM: 0x289A2E
  { ovl: 0x4c, upper: 0xebe, lower: 0xec6 }, // ROM: 0x28AA5E
  { ovl: 0x4d, upper: 0xff2, lower: 0xffa }, // ROM: 0x28BB92
  { ovl: 0x4e, upper: 0x1206, lower: 0x120e }, // ROM: 0x28CE76
  { ovl: 0x4f, upper: 0xeee, lower: 0xef6 }, // ROM: 0x28DEDE
  { ovl: 0x50, upper: 0x4f6, lower: 0x4fe }, // ROM: 0x28E526
  { ovl: 0x51, upper: 0x5d2, lower: 0x5da }, // ROM: 0x28EC02
  { ovl: 0x52, upper: 0x1a46, lower: 0x1a4e }, // ROM: 0x2906E6
  { ovl: 0x53, upper: 0x942, lower: 0x94a }, // ROM: 0x291232
  { ovl: 0x54, upper: 0xb62, lower: 0xb6a }, // ROM: 0x291EC2
  { ovl: 0x55, upper: 0x10fe, lower: 0x1106 }, // ROM: 0x29311E
  { ovl: 0x56, upper: 0x78a, lower: 0x792 }, // ROM: 0x2939EA
  { ovl: 0x57, upper: 0x1896, lower: 0x189e }, // ROM: 0x295306
  { ovl: 0x59, upper: 0x8aa, lower: 0x8b2 }, // ROM: 0x295CFA
  { ovl: 0x5a, upper: 0xbbe, lower: 0xbc6 }, // ROM: 0x2969FE
  { ovl: 0x5b, upper: 0xf62, lower: 0xf6a }, // ROM: 0x297AD2
  { ovl: 0x5c, upper: 0x362, lower: 0x36a }, // ROM: 0x297F42
  { ovl: 0x5d, upper: 0xa32, lower: 0xa3a }, // ROM: 0x2989E2
  { ovl: 0x5e, upper: 0x179a, lower: 0x17a2 }, // ROM: 0x29A27A
  { ovl: 0x5f, upper: 0x622, lower: 0x62a }, // ROM: 0x29AA22
  { ovl: 0x60, upper: 0x62e, lower: 0x636 }, // ROM: 0x29B15E
  { ovl: 0x61, upper: 0x54fa, lower: 0x5502 }, // ROM: 0x2A090A
  { ovl: 0x62, upper: 0x2ca2, lower: 0x2caa }, // ROM: 0x2A51A2
  { ovl: 0x64, upper: 0x5a66, lower: 0x5a6e }, // ROM: 0x2B70D6
  { ovl: 0x65, upper: 0x2cce, lower: 0x2cd6 }, // ROM: 0x2BA16E
  { ovl: 0x77, upper: 0x29ea, lower: 0x29f2 }, // ROM: 0x2FD79A
  { ovl: 0x78, upper: 0x2976, lower: 0x297e }, // ROM: 0x3002B6
  { ovl: 0x79, upper: 0xdfe, lower: 0xe06 }, // ROM: 0x3013AE
  { ovl: 0x7b, upper: 0x24b2, lower: 0x24b6 }, // ROM: 0x306322
  { ovl: 0x7c, upper: 0x153e, lower: 0x1546 }, // ROM: 0x309F8E
  { ovl: 0x7d, upper: 0x12ea, lower: 0x12f2 }, // ROM: 0x30D82A
  { ovl: 0x80, upper: 0x1e9a, lower: 0x1ea2 }, // ROM: 0x3146EA
  { ovl: 0x82, upper: 0x1322, lower: 0x132a }, // ROM: 0x317762
];
_HVQFSOffsets[Game.MP1_JPN] = [
  { upper: 0x00057496, lower: 2 }, // TODO: Needs conversion
  { upper: 0x0005cbd2, lower: 2 },
  { upper: 0x000d48c6, lower: 6 },
  { upper: 0x002592a6, lower: 6 },
  { upper: 0x0025ede6, lower: 6 },
  { upper: 0x0025f8d2, lower: 6 },
  { upper: 0x0027bcaa, lower: 6 },
  { upper: 0x0027fec2, lower: 6 },
  { upper: 0x00280fc6, lower: 6 },
  { upper: 0x00281afa, lower: 6 },
  { upper: 0x002845e6, lower: 6 },
  { upper: 0x00285016, lower: 6 },
  { upper: 0x00285b3a, lower: 6 },
  { upper: 0x002866da, lower: 6 },
  { upper: 0x00287c72, lower: 6 },
  { upper: 0x00288f5e, lower: 6 },
  { upper: 0x00289f8e, lower: 6 },
  { upper: 0x0028b0c2, lower: 6 },
  { upper: 0x0028c3a6, lower: 6 },
  { upper: 0x0028d40e, lower: 6 },
  { upper: 0x0028da56, lower: 6 },
  { upper: 0x0028e132, lower: 6 },
  { upper: 0x0028fc16, lower: 6 },
  { upper: 0x00290762, lower: 6 },
  { upper: 0x002913f2, lower: 6 },
  { upper: 0x0029264e, lower: 6 },
  { upper: 0x00292f1a, lower: 6 },
  { upper: 0x00294836, lower: 6 },
  { upper: 0x0029522a, lower: 6 },
  { upper: 0x00295f2a, lower: 6 },
  { upper: 0x00296ffe, lower: 6 },
  { upper: 0x00297462, lower: 6 },
  { upper: 0x00297f02, lower: 6 },
  { upper: 0x0029979e, lower: 6 },
  { upper: 0x00299f42, lower: 6 },
  { upper: 0x0029a67e, lower: 6 },
  { upper: 0x0029fe06, lower: 6 },
  { upper: 0x002a46d6, lower: 6 },
  { upper: 0x002b6656, lower: 6 },
  { upper: 0x002b96ee, lower: 6 },
  { upper: 0x002fcad2, lower: 6 },
  { upper: 0x002ff5f6, lower: 6 },
  { upper: 0x003006ee, lower: 6 },
  { upper: 0x00305662, lower: 2 },
  { upper: 0x003092ce, lower: 6 },
  { upper: 0x0030cb6a, lower: 6 },
  { upper: 0x00313a1a, lower: 6 },
  { upper: 0x00316a02, lower: 6 },
];
// MP1_PAL 0x10357D0
_HVQFSOffsets[Game.MP2_USA] = [
  // Default at 0x01164160
  { upper: 0x00054bd2, lower: 0x00054bda },
  { upper: 0x00063a36, lower: 0x00063a3e },
  { upper: 0x00074d6a, lower: 0x00074d6e },
  { ovl: 0x3f, upper: 0x9a, lower: 0xa2 }, // ROM: 0x2A8A3A
  { ovl: 0x40, upper: 0x96, lower: 0x9e }, // ROM: 0x2AEE46
  { ovl: 0x42, upper: 0x9a, lower: 0xa2 }, // ROM: 0x2C081A
  { ovl: 0x44, upper: 0x9a, lower: 0xa2 }, // ROM: 0x2DA94A
  { ovl: 0x46, upper: 0x9e, lower: 0xa6 }, // ROM: 0x2F17CE
  { ovl: 0x48, upper: 0xa2, lower: 0xaa }, // ROM: 0x306C42
  { ovl: 0x4a, upper: 0x9a, lower: 0xa2 }, // ROM: 0x31EEDA
  { ovl: 0x4d, upper: 0xe12, lower: 0xe1a }, // ROM: 0x329842
  { ovl: 0x4e, upper: 0xae, lower: 0xb6 }, // ROM: 0x32A26E
  { ovl: 0x4f, upper: 0xa6, lower: 0xae }, // ROM: 0x3354E6
  { ovl: 0x50, upper: 0xa6, lower: 0xae }, // ROM: 0x343106
  { ovl: 0x51, upper: 0x57fa, lower: 0x5802 }, // ROM: 0x35860A
  { ovl: 0x52, upper: 0x340e, lower: 0x3416 }, // ROM: 0x35C1EE
  { ovl: 0x53, upper: 0x9a, lower: 0xa2 }, // ROM: 0x35D1AA
  { ovl: 0x54, upper: 0xf6e, lower: 0xf76 }, // ROM: 0x3615DE
  { ovl: 0x55, upper: 0x9e, lower: 0xa6 }, // ROM: 0x36178E
  { ovl: 0x62, upper: 0xce, lower: 0xd6 }, // ROM: 0x3D4DEE
  { ovl: 0x6d, upper: 0x39e2, lower: 0x39ea }, // ROM: 0x40A022
  { ovl: 0x6e, upper: 0x15b6, lower: 0x15be }, // ROM: 0x40B8E6
  { ovl: 0x70, upper: 0x1b5a, lower: 0x1b62 }, // ROM: 0x4107BA
  { ovl: 0x72, upper: 0x1e, lower: 0x26 }, // ROM: 0x4157AE
];
// MP2 JPN 0x1156170
_HVQFSOffsets[Game.MP3_USA] = [
  // Default at 0x128CC60
  { ovl: 0x81, upper: 0x11e66, lower: 0x11e6e }, // ROM: 0xD07A6
  { ovl: 0x81, upper: 0x25716, lower: 0x2571e }, // ROM: 0xE4056
  { ovl: 0x80, upper: 0x1304a, lower: 0x13052 }, // ROM: 0xFD7DA
  { ovl: 0x80, upper: 0x21e86, lower: 0x21e8e }, // ROM: 0x10C616
  { ovl: 0x4f, upper: 0x632a, lower: 0x6332 }, // ROM: 0x3BF99A
  { ovl: 0x50, upper: 0x3946, lower: 0x394e }, // ROM: 0x3C6106
  { ovl: 0x51, upper: 0x1a62, lower: 0x1a6a }, // ROM: 0x3C7D72
  { ovl: 0x53, upper: 0x3372, lower: 0x337a }, // ROM: 0x3CDB72
  { ovl: 0x54, upper: 0x1bd6, lower: 0x1bde }, // ROM: 0x3CFA96
  { ovl: 0x62, upper: 0x51d6, lower: 0x51de }, // ROM: 0x45A696
  { ovl: 0x64, upper: 0x380a, lower: 0x3812 }, // ROM: 0x463F9A
  { ovl: 0x65, upper: 0x2f4a, lower: 0x2f52 }, // ROM: 0x4672AA
  { ovl: 0x6e, upper: 0xa3ba, lower: 0xa3be }, // ROM: 0x4CCF8A
  { ovl: 0x71, upper: 0x1632, lower: 0x163a }, // ROM: 0x4E83F2
  { ovl: 0x73, upper: 0x12a, lower: 0x132 }, // ROM: 0x4F031A
  { ovl: 0x74, upper: 0x55e, lower: 0x566 }, // ROM: 0x4F3CDE
  { ovl: 0x7a, upper: 0x274a, lower: 0x2752 }, // ROM: 0x52671A
  { ovl: 0x7c, upper: 0x787a, lower: 0x787e }, // ROM: 0x549A9A
  { ovl: 0x7d, upper: 0x18ee, lower: 0x18f6 }, // ROM: 0x54F5FE
  { ovl: 0x7d, upper: 0x28b6, lower: 0x28be }, // ROM: 0x5505C6
];
// MP3 JPN 0x1287380

interface IHVQMetadata {
  tileWidth: number;
  tileHeight: number;
  tileCountX: number;
  tileCountY: number;

  fov: number;
  scaleFactor: number;

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

export class HVQFS {
  private _rom: ROM;
  private _hvqCache: ArrayBufferLike[][] | null;
  private _hvqMetadata: IHVQMetadata[] | null;

  public constructor(rom: ROM) {
    this._rom = rom;
    this._hvqCache = null;
    this._hvqMetadata = null;
  }

  public getROMOffset(): number | null {
    const rom = this._rom;
    const scenes = rom?.getScenes();
    if (!scenes) return null;

    const patchOffsets = this.getPatchOffsets();
    if (!patchOffsets) return null;
    const romPatchInfo = patchOffsets[0];
    if (!romPatchInfo) return null;
    const upperReadOffset = romPatchInfo.upper;
    const lowerReadOffset = romPatchInfo.lower;
    let upper, lower;
    if (typeof romPatchInfo.ovl === "number") {
      const sceneView = scenes.getDataView(romPatchInfo.ovl);
      upper = sceneView.getUint16(upperReadOffset);
      lower = sceneView.getUint16(lowerReadOffset);
    } else {
      const romView = rom.getDataView();
      upper = romView.getUint16(upperReadOffset);
      lower = romView.getUint16(lowerReadOffset);
    }

    const offset = getRegSetAddress(upper, lower);

    // $$log(`HVQFS.getROMOffset -> ${$$hex(offset)}`);

    if (isDebug()) {
      // Assert that the rest of the patch offsets are valid.
      for (let i = 1; i < patchOffsets.length; i++) {
        const anotherPatchOffset = patchOffsets[i];
        const anotherUpperReadOffset = anotherPatchOffset.upper;
        const anotherLowerReadOffset = anotherPatchOffset.lower;
        let anotherUpper, anotherLower;
        if (typeof anotherPatchOffset.ovl === "number") {
          const sceneView = scenes.getDataView(anotherPatchOffset.ovl);
          anotherUpper = sceneView.getUint16(anotherUpperReadOffset);
          anotherLower = sceneView.getUint16(anotherLowerReadOffset);
        } else {
          const romView = rom.getDataView();
          anotherUpper = romView.getUint16(anotherUpperReadOffset);
          anotherLower = romView.getUint16(anotherLowerReadOffset);
        }

        if (anotherUpper !== upper || anotherLower !== lower)
          throw new Error(`HVQFS.getROMOffset patch offset ${i} seems wrong:
          offset: ${$$hex(offset)} vs ${
            $$hex(anotherUpper >>> 16) + $$hex(anotherLower, "")
          }
          reading upper: ${$$hex(anotherUpperReadOffset)}, lower: ${$$hex(
            anotherLowerReadOffset,
          )}`);
      }
    }

    return offset;
  }

  public setROMOffset(newOffset: number, buffer: ArrayBuffer) {
    $$log(`HVQFS.setROMOffset(${$$hex(newOffset)})`);
    const rom = this._rom;
    const scenes = rom?.getScenes()!;
    const patchOffsets = this.getPatchOffsets()!;
    const [upper, lower] = getRegSetUpperAndLower(newOffset);
    for (let i = 0; i < patchOffsets.length; i++) {
      const patchOffset = patchOffsets[i];
      const patchROMUpper = patchOffset.upper;
      const patchROMLower = patchOffset.lower;
      if (typeof patchOffset.ovl === "number") {
        const sceneView = scenes.getDataView(patchOffset.ovl);
        sceneView.setUint16(patchROMUpper, upper);
        sceneView.setUint16(patchROMLower, lower);
      } else {
        const romView = new DataView(buffer);
        romView.setUint16(patchROMUpper, upper);
        romView.setUint16(patchROMLower, lower);
      }
    }
    $$log(`HVQFS.setROMOffset -> ${$$hex((upper << 16) | lower)}`);
  }

  public getPatchOffsets() {
    const gameOffsets = _HVQFSOffsets[this._rom.getGame()!];
    if (!gameOffsets) {
      return null;
    }

    return gameOffsets.map((offset) => {
      if (offset.lower < 10 && !offset.ovl) {
        // Delete when JPN is converted
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

  public get(dir: number, file: number) {
    return this._hvqCache![dir][file];
  }

  public read(dir: number, file: number) {
    const buffer = this._rom.getBuffer();

    const fsOffset = this.getROMOffset()!;
    const fsView = new DataView(buffer, fsOffset);

    const bgOffset = fsOffset + fsView.getUint32(4 * (1 + dir));
    const bgView = new DataView(buffer, bgOffset);

    const fileOffset = bgOffset + bgView.getUint32(4 * (1 + file));
    const nextFileOffset = bgOffset + bgView.getUint32(4 * (1 + file + 1));

    return buffer.slice(fileOffset, nextFileOffset);
  }

  public write(dir: number, file: number, content: ArrayBuffer) {
    this._hvqCache![dir][file] = content.slice(0);
  }

  public extract() {
    let t0, t1;
    if (isDebug() && typeof performance !== "undefined") {
      t0 = performance.now();
    }

    const bgCount = this.getDirectoryCount();
    this._hvqCache = new Array(bgCount);
    this._hvqMetadata = new Array(bgCount);
    for (let b = 0; b < bgCount; b++) {
      const fileCount = this.getHVQFileCount(b);
      this._hvqCache[b] = new Array(fileCount);
      for (let f = 0; f < fileCount; f++) {
        this._hvqCache[b][f] = this.read(b, f);
      }

      this._readMetadata(b);
    }

    if (isDebug() && t0) {
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

    return this._hvqCache;
  }

  public extractAsync(): Promise<void> {
    return new Promise((resolve) => {
      this.extract();
      resolve();
    });
  }

  public pack(buffer: ArrayBuffer, offset = 0) {
    const view = new DataView(buffer, offset);

    const bgCount = this.getDirectoryCount();
    view.setUint32(0, bgCount + 1);

    let curBgIndexOffset = 4;
    let curBgWriteOffset = 4 + (bgCount + 1) * 4;
    for (let b = 0; b < bgCount; b++) {
      view.setUint32(curBgIndexOffset, curBgWriteOffset);
      curBgIndexOffset += 4;
      curBgWriteOffset = this._writeBg(b, view, curBgWriteOffset);
      curBgWriteOffset = makeDivisibleBy(curBgWriteOffset, 4);
    }

    view.setUint32(curBgIndexOffset, curBgWriteOffset);

    return curBgWriteOffset;
  }

  private _writeBg(b: number, view: DataView, offset: number) {
    const fileCount = this.getHVQFileCount(b);
    view.setUint32(offset, fileCount + 1);

    this._writeMetadata(b);

    let curFileIndexOffset = offset + 4;
    let curFileWriteOffset = offset + 4 + (fileCount + 1) * 4;
    for (let f = 0; f < fileCount; f++) {
      view.setUint32(curFileIndexOffset, curFileWriteOffset - offset);
      curFileIndexOffset += 4;
      curFileWriteOffset = this._writeFile(b, f, view, curFileWriteOffset);
      curFileWriteOffset = makeDivisibleBy(curFileWriteOffset, 4);
    }

    view.setUint32(curFileIndexOffset, curFileWriteOffset - offset);

    return curFileWriteOffset;
  }

  private _writeFile(b: number, f: number, view: DataView, offset: number) {
    const fileBytes = this._hvqCache![b][f];
    copyRange(view, fileBytes, offset, 0, fileBytes.byteLength);
    return offset + fileBytes.byteLength;
  }

  private _readMetadata(dir: number): void {
    const infoView = new DataView(this._hvqCache![dir][0], 0);
    const metadata: IHVQMetadata = {
      tileWidth: infoView.getUint32(0),
      tileHeight: infoView.getUint32(4),
      tileCountX: infoView.getUint32(8),
      tileCountY: infoView.getUint32(12),

      fov: infoView.getFloat32(16),
      scaleFactor: infoView.getFloat32(20),

      cameraEyePosX: infoView.getFloat32(24),
      cameraEyePosZ: infoView.getFloat32(28),
      cameraEyePosY: infoView.getFloat32(32),

      lookatPointX: infoView.getFloat32(36),
      lookatPointZ: infoView.getFloat32(40),
      lookatPointY: infoView.getFloat32(44),

      cameraUpVecX: infoView.getFloat32(48),
      cameraUpVecZ: infoView.getFloat32(52),
      cameraUpVecY: infoView.getFloat32(56),
    };
    this._setMetadata(dir, metadata);
  }

  private _writeMetadata(dir: number): void {
    const infoView = new DataView(this._hvqCache![dir][0], 0);
    const metadata = this.getMetadata(dir);

    infoView.setUint32(0, metadata.tileWidth);
    infoView.setUint32(4, metadata.tileHeight);
    infoView.setUint32(8, metadata.tileCountX);
    infoView.setUint32(12, metadata.tileCountY);

    infoView.setFloat32(16, metadata.fov);
    infoView.setFloat32(20, metadata.scaleFactor);

    infoView.setFloat32(24, metadata.cameraEyePosX);
    infoView.setFloat32(28, metadata.cameraEyePosZ);
    infoView.setFloat32(32, metadata.cameraEyePosY);

    infoView.setFloat32(36, metadata.lookatPointX);
    infoView.setFloat32(40, metadata.lookatPointZ);
    infoView.setFloat32(44, metadata.lookatPointY);

    infoView.setFloat32(48, metadata.cameraUpVecX);
    infoView.setFloat32(52, metadata.cameraUpVecZ);
    infoView.setFloat32(56, metadata.cameraUpVecY);
  }

  private _getBgDimensions(dir: number) {
    const metadata = this._hvqMetadata![dir];

    const width = metadata.tileWidth * metadata.tileCountX;
    const height = metadata.tileHeight * metadata.tileCountY;
    return [width, height];
  }

  public getMetadata(dir: number): IHVQMetadata {
    return this._hvqMetadata![dir];
  }

  _setMetadata(dir: number, metadata: IHVQMetadata): void {
    this._hvqMetadata![dir] = metadata;
  }

  /**
   * Updates the HVQ metadata to reflect new values.
   * Need to be careful, old boards may not have all or some values.
   */
  public updateMetadata(dir: number, values: Partial<IHVQMetadata>): void {
    const metadata = this.getMetadata(dir);

    if ("tileWidth" in values) metadata["tileWidth"] = values["tileWidth"]!;
    if ("tileHeight" in values) metadata["tileHeight"] = values["tileHeight"]!;
    if ("tileCountX" in values) metadata["tileCountX"] = values["tileCountX"]!;
    if ("tileCountY" in values) metadata["tileCountY"] = values["tileCountY"]!;

    if ("fov" in values) metadata["fov"] = values["fov"]!;
    if ("scaleFactor" in values)
      metadata["scaleFactor"] = values["scaleFactor"]!;

    if ("cameraEyePosX" in values)
      metadata["cameraEyePosX"] = values["cameraEyePosX"]!;
    if ("cameraEyePosZ" in values)
      metadata["cameraEyePosZ"] = values["cameraEyePosZ"]!;
    if ("cameraEyePosY" in values)
      metadata["cameraEyePosY"] = values["cameraEyePosY"]!;

    if ("lookatPointX" in values)
      metadata["lookatPointX"] = values["lookatPointX"]!;
    if ("lookatPointZ" in values)
      metadata["lookatPointZ"] = values["lookatPointZ"]!;
    if ("lookatPointY" in values)
      metadata["lookatPointY"] = values["lookatPointY"]!;

    if ("cameraUpVecX" in values)
      metadata["cameraUpVecX"] = values["cameraUpVecX"]!;
    if ("cameraUpVecZ" in values)
      metadata["cameraUpVecZ"] = values["cameraUpVecZ"]!;
    if ("cameraUpVecY" in values)
      metadata["cameraUpVecY"] = values["cameraUpVecY"]!;

    this._setMetadata(dir, metadata);
  }

  public readBackgroundImgData(dir: number): ImageData {
    const tileCount = this._hvqCache![dir].length - 1;

    const metadata = this.getMetadata(dir);
    const tile_width = metadata.tileWidth;
    const tile_height = metadata.tileHeight;
    const tile_x_count = metadata.tileCountX;
    const tile_y_count = metadata.tileCountY;

    const width = tile_width * tile_x_count;
    const height = tile_height * tile_y_count;

    $$log(
      `HVQFS.readBackground, dir: ${dir}, tiles: ${tileCount}, board is ${width}x${height}`,
    );

    // if (dir === 39) { // _boardLocData[4].bgNum) { // FIXME: Save away the black tile until HVQ is ready.
    //   //var black_tile_offset = dir_offset + dirView.getUint32(4 + (211 * 4));
    //   let blackTileView = new DataView(_hvqCache![39][211]);
    //   _black = blackTileView;
    // }

    // Grab DataViews of all of the tiles.
    const hvqTiles = [];
    const game = this._rom.getGameVersion();
    const adjust = game === 1 ? 1 : 2; // Skip HVQ-MPS in newer games
    for (let i = adjust; i < this._hvqCache![dir].length; i++) {
      hvqTiles.push(new DataView(this._hvqCache![dir][i]));
    }
    const rgba16Tiles = hvqTiles.map(decode);
    const rgba16Views = rgba16Tiles.map((tile) => {
      return new DataView(tile);
    });
    const orderedRGB16Tiles = [];
    for (let y = tile_y_count - 1; y >= 0; y--) {
      for (let x = 0; x < tile_x_count; x++) {
        orderedRGB16Tiles.push(rgba16Views[y * tile_x_count + x]);
      }
    }
    const bgBufferRGBA16 = fromTiles(
      orderedRGB16Tiles,
      tile_x_count,
      tile_y_count,
      tile_width * 2,
      tile_height,
    );
    const bgBufferRGBA32 = RGBA5551toRGBA32(bgBufferRGBA16, width, height);
    const bgArr = new Uint8Array(bgBufferRGBA32);

    const canvasCtx = createContext(width, height);
    const bgImageData = canvasCtx.createImageData(width, height);

    for (let i = 0; i < bgArr.byteLength; i++) {
      bgImageData.data[i] = bgArr[i];
    }

    return bgImageData;
  }

  public readBackground(dir: number) {
    const metadata = this.getMetadata(dir);
    const [width, height] = this._getBgDimensions(dir);
    const canvasCtx = createContext(width, height);
    const bgImageData = this.readBackgroundImgData(dir);
    canvasCtx.putImageData(bgImageData, 0, 0);
    return Object.assign({}, metadata, {
      width,
      height,
      src: canvasCtx.canvas.toDataURL(),
    });
  }

  public writeBackground(
    dir: number,
    imgData: ImageData,
    width: number,
    height: number,
    metadata?: Partial<IHVQMetadata>,
  ) {
    const tileXCount = width / 64;
    const tileYCount = height / 48;
    const tileCount = tileXCount * tileYCount;

    $$log(`HVQFS.writeBackground, dir: ${dir}, img is ${width}x${height}`);

    const rgba32tiles = toTiles(
      imgData.data,
      tileXCount,
      tileYCount,
      64 * 4,
      48,
    );
    const rgba16tiles = rgba32tiles.map((tile32) => {
      return RGBA5551fromRGBA32(tile32, 64, 48);
    });
    const hvqTiles = rgba16tiles.map((tile16) => {
      return encode(tile16, 64, 48);
    });

    const orderedHVQTiles = [];
    for (let y = tileYCount - 1; y >= 0; y--) {
      for (let x = 0; x < tileXCount; x++) {
        orderedHVQTiles.push(hvqTiles[y * tileXCount + x]);
      }
    }

    const game = this._rom.getGameVersion()!;

    if (!this._hvqCache![dir]) {
      if (!metadata) {
        throw new Error("Cannot write a new HVQ background without metadata");
      }

      this._hvqCache![dir] = [];

      // TODO: Hard coding these seems bad.
      if (game > 1) {
        this._hvqCache![dir][0] = this._hvqCache![3][0];

        // Well... we probably need HVQ-MPS, but for now it doesn't matter which.
        this._hvqCache![dir][1] = this._hvqCache![3][1];
      } else {
        this._hvqCache![dir][0] = this._hvqCache![0][0];
      }
      this._readMetadata(dir);
    }

    if (metadata) {
      this.updateMetadata(dir, metadata);
    }

    if (game === 1) {
      for (let i = 1; i <= tileCount; i++) {
        this._hvqCache![dir][i] = orderedHVQTiles[i - 1];
      }
    } else {
      // MP2/3 also has the HVQ-MPS to skip
      for (let i = 2; i <= tileCount + 1; i++) {
        this._hvqCache![dir][i] = orderedHVQTiles[i - 2];
      }
    }
  }

  public getDirectoryCount() {
    if (this._hvqCache) return this._hvqCache.length;

    const buffer = this._rom.getBuffer();
    const hvqFsOffset = this.getROMOffset();
    if (hvqFsOffset === null) return 0;
    const hvqFsView = new DataView(buffer, hvqFsOffset);
    return hvqFsView.getUint32(0) - 1; // The last dir is a fake.
  }

  public getHVQFileCount(dir: number): number {
    if (this._hvqCache && this._hvqCache[dir])
      return this._hvqCache[dir].length;

    const buffer = this._rom.getBuffer();
    const hvqFsOffset = this.getROMOffset();
    if (hvqFsOffset === null) return 0;
    const hvqFsView = new DataView(buffer, hvqFsOffset);

    const hvqFileOffset = hvqFsOffset + hvqFsView.getUint32(4 * (1 + dir));
    const hvqFileView = new DataView(buffer, hvqFileOffset);
    return hvqFileView.getUint32(0) - 1; // The last file is a lie.
  }

  public getByteLength(): number {
    let byteLen = 0;

    const bgCount = this._hvqCache!.length;

    byteLen += 4; // Count of backgrounds
    byteLen += 4 * (bgCount + 1); // Background offsets + the extra offset

    for (let b = 0; b < bgCount; b++) {
      const fileCount = this._hvqCache![b].length;

      byteLen += 4; // Count of files
      byteLen += 4 * (fileCount + 1); // File offsets + the extra offset

      for (let f = 0; f < fileCount; f++) {
        byteLen += this._hvqCache![b][f].byteLength;
        byteLen = makeDivisibleBy(byteLen, 4);
      }
    }

    return byteLen;
  }
}
