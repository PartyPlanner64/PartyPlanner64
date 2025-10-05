import { $$log, $$hex, assert } from "../utils/debug";
import { copyRange } from "../utils/arrays";
import { Game } from "../types";
import { ROM } from "../romhandler";
import { getRegSetAddress, getRegSetUpperAndLower } from "../utils/MIPS";
import { S2 } from "../audio/S2";
import { MBF0 } from "../audio/MBF0";
import { SBF0 } from "../audio/SBF0";
import { T3 } from "../audio/T3";
import { FXD0 } from "../audio/FXD0";
import { isDebug } from "../../../apps/partyplanner64/debug";
import { makeDivisibleBy } from "../utils/number";

interface IOffsetInfo {
  upper: number;
  lower: number;
  ovl?: number;
}

interface IOffsetObj {
  type: "S2" | "T3" | "MBF0" | "SBF0" | "FXD0" | "Pointer";
  byteLength?: number;
  offsets: IOffsetInfo[];
}

type AudioOffsetInfo = { [game in Game]: readonly IOffsetObj[] };
const _audioOffsets: AudioOffsetInfo = {
  [Game.MP1_USA]: [
    // Length 0x7B3DF0
    // 15396A0
    {
      type: "S2",
      // byteLength: 0x23F520,
      offsets: [
        { upper: 0x00061746, lower: 0x0006174a },
        { ovl: 0x6e, upper: 0xe62, lower: 0xe66 }, // ROM: 0x2DA3D2
      ],
    },

    // 1778BC0
    {
      type: "S2",
      // byteLength: 0xB9F20,
      offsets: [
        { upper: 0x0001af2a, lower: 0x0001af2e },
        { upper: 0x0006174e, lower: 0x00061752 },
        { upper: 0x0006177e, lower: 0x00061782 },
        { ovl: 0x6e, upper: 0xe6a, lower: 0xe6e }, // ROM: 0x2DA3DA
        { ovl: 0x6e, upper: 0xe92, lower: 0xe96 }, // ROM: 0x2DA402
      ],
    },

    // 1832AE0
    {
      type: "T3",
      byteLength: 0x385980,
      offsets: [
        { upper: 0x0001af32, lower: 0x0001af36 },
        { upper: 0x0006172e, lower: 0x00061732 },
        { upper: 0x00061786, lower: 0x0006178a },
        { ovl: 0x6e, upper: 0xe4e, lower: 0xe52 }, // ROM: 0x2DA3BE
        { ovl: 0x6e, upper: 0xe9a, lower: 0xe9e }, // ROM: 0x2DA40A
      ],
    },

    // 1BB8460
    {
      type: "T3",
      byteLength: 0x134800,
      offsets: [
        { upper: 0x0001af0e, lower: 0x0001af12 },
        { upper: 0x00061762, lower: 0x00061766 },
        { ovl: 0x6e, upper: 0xe7a, lower: 0xe7e }, // ROM: 0x2DA3EA
      ],
    },

    // 1CECC60
    {
      type: "FXD0",
      byteLength: 0x830,
      offsets: [{ upper: 0x0001af5a, lower: 0x0001af5e }],
    },

    // 1CED490, 0xffffffffs EOF
    {
      type: "Pointer",
      byteLength: 0,
      offsets: [{ upper: 0x0001af66, lower: 0x0001af6a }],
    },
  ],

  [Game.MP1_JPN]: [
    // Length ?
  ],
  [Game.MP1_PAL]: [
    // Length ?
  ],

  [Game.MP2_USA]: [
    // Length 0x6DAB50
    // 0x1750450
    {
      type: "MBF0",
      // byteLength: 0x1B9C40,
      offsets: [
        { upper: 0x0001d342, lower: 0x0001d346 },
        { upper: 0x0007a9ee, lower: 0x0007a9f2 },
        { upper: 0x0007aa12, lower: 0x0007aa16 },
      ],
    },
    // 0x190A090
    {
      type: "SBF0",
      byteLength: 0x3b5380,
      offsets: [{ upper: 0x0007a9fa, lower: 0x0007a9fe }],
    },
    // 0x1CBF410
    {
      type: "SBF0",
      byteLength: 0x16b150,
      offsets: [
        { upper: 0x0001d34e, lower: 0x0001d352 },
        { upper: 0x0007aa1e, lower: 0x0007aa22 },
      ],
    },
    // 0x1E2A560
    {
      type: "FXD0",
      byteLength: 0xa40,
      offsets: [{ upper: 0x0001d382, lower: 0x0001d386 }],
    },
  ],

  [Game.MP2_JPN]: [
    // Length ?
  ],
  [Game.MP2_PAL]: [
    // Length ?
  ],

  [Game.MP3_USA]: [
    // Length 0x67be40
    // 0x1881C40
    {
      type: "MBF0",
      // byteLength: 0x1D4C30,
      offsets: [
        { upper: 0x0000f26a, lower: 0x0000f26e },
        { upper: 0x0004bef2, lower: 0x0004bef6 },
      ],
    },
    // 0x1A56870
    {
      type: "SBF0",
      byteLength: 0x4a67d0,
      offsets: [
        { upper: 0x0000f276, lower: 0x0000f27a },
        { upper: 0x0004befe, lower: 0x0004bf02 },
      ],
    },
    // 0x1EFD040
    {
      type: "FXD0",
      byteLength: 0xa40,
      offsets: [{ upper: 0x0000f29e, lower: 0x0000f2a2 }],
    },
    // E0F 0x1EFDA80
  ],

  [Game.MP3_JPN]: [
    // Length ?
  ],
  [Game.MP3_PAL]: [
    // Length ?
  ],
};

export class Audio {
  private _rom: ROM;
  private _bufferCache: (ArrayBuffer | null)[] | null = null;
  private _parsedCache: (S2 | T3 | MBF0 | SBF0 | FXD0 | null)[] | null = null;

  public constructor(rom: ROM) {
    this._rom = rom;
  }

  public getROMOffset(subsection = 0) {
    const scenes = this._rom.getScenes();
    if (!scenes) return null;
    const infos = this.getPatchInfo();
    if (!infos || !infos.length) return null;
    const patchInfo = infos[subsection];
    if (!patchInfo) return null;
    const romPatchInfo = patchInfo.offsets[0];
    const upperReadOffset = romPatchInfo.upper;
    const lowerReadOffset = romPatchInfo.lower;
    let upper, lower;
    if (typeof romPatchInfo.ovl === "number") {
      const sceneView = scenes.getDataView(romPatchInfo.ovl);
      upper = sceneView.getUint16(upperReadOffset);
      lower = sceneView.getUint16(lowerReadOffset);
    } else {
      const romView = this._rom.getDataView();
      upper = romView.getUint16(upperReadOffset);
      lower = romView.getUint16(lowerReadOffset);
    }

    const offset = getRegSetAddress(upper, lower);
    $$log(`Audio.getROMOffset -> ${$$hex(offset)}`);

    if (isDebug()) {
      // Assert that the rest of the patch offsets are valid.
      patchInfo.offsets.forEach((offsetInfo, oIndex) => {
        const anotherUpperReadOffset = offsetInfo.upper;
        const anotherLowerReadOffset = offsetInfo.lower;
        let anotherUpper, anotherLower;
        if (typeof offsetInfo.ovl === "number") {
          const sceneView = scenes.getDataView(offsetInfo.ovl);
          anotherUpper = sceneView.getUint16(anotherUpperReadOffset);
          anotherLower = sceneView.getUint16(anotherLowerReadOffset);
        } else {
          const romView = this._rom.getDataView();
          anotherUpper = romView.getUint16(anotherUpperReadOffset);
          anotherLower = romView.getUint16(anotherLowerReadOffset);
        }

        const anotherOffset = getRegSetAddress(anotherUpper, anotherLower);
        if (anotherOffset !== offset)
          throw new Error(`AudioFS.getROMOffset patch offset ${subsection}/${oIndex} seems wrong:
          offset: ${$$hex(offset)} vs ${$$hex(anotherOffset)}
          reading upper: ${$$hex(anotherUpperReadOffset)}, lower: ${$$hex(
            anotherLowerReadOffset,
          )}`);
      });
    }

    return offset;
  }

  public setROMOffset(newOffset: number, outBuffer: ArrayBuffer) {
    $$log(`Audio.setROMOffset(${$$hex(newOffset)})`);
    const rom = this._rom;
    const scenes = rom?.getScenes()!;
    const infos = this.getPatchInfo();
    let currentOffset = newOffset;
    for (let i = 0; i < infos.length; i++) {
      const info = infos[i];
      const [upper, lower] = getRegSetUpperAndLower(currentOffset);
      for (let j = 0; j < info.offsets.length; j++) {
        const patchOffset = info.offsets[j];
        const patchROMUpper = patchOffset.upper;
        const patchROMLower = patchOffset.lower;
        if (typeof patchOffset.ovl === "number") {
          const sceneView = scenes.getDataView(patchOffset.ovl);
          sceneView.setUint16(patchROMUpper, upper);
          sceneView.setUint16(patchROMLower, lower);
        } else {
          const romView = new DataView(outBuffer);
          romView.setUint16(patchROMUpper, upper);
          romView.setUint16(patchROMLower, lower);
        }
      }

      switch (info.type) {
        case "T3":
        case "SBF0":
        case "FXD0":
          assert(typeof info.byteLength === "number");
          assert(info.byteLength % 16 === 0);
          currentOffset += info.byteLength;
          break;

        case "S2":
          {
            assert(!!this._parsedCache![i]);
            const s2 = this._parsedCache![i] as S2;
            currentOffset += s2.getByteLength();
          }
          break;

        case "MBF0":
          {
            assert(!!this._parsedCache![i]);
            const mbf0 = this._parsedCache![i] as MBF0;
            currentOffset += mbf0.getByteLength();
          }
          break;

        case "Pointer":
          break;

        default:
          throw new Error("Unhandled audio subsection type: " + info.type);
      }
    }
  }

  public getPatchInfo() {
    return _audioOffsets[this._rom.getGame()!];
  }

  public read(index: number) {
    throw new Error("audio.read not implemented");
  }

  public write(index: number, value: any) {
    throw new Error("audio.write not implemented");
  }

  public getSequenceTableCount(): number {
    let count = 0;
    for (let i = 0; i < this._parsedCache!.length; i++) {
      const cacheEntry = this._parsedCache![i];
      if (cacheEntry && "midis" in cacheEntry) count++;
    }
    return count;
  }

  public getSequenceTable(index: number): S2 | MBF0 | null {
    if (!this._parsedCache) return null;

    let curIndex = -1;
    for (let i = 0; i < this._parsedCache.length; i++) {
      const cacheEntry = this._parsedCache[i];
      if (cacheEntry && "midis" in cacheEntry) {
        curIndex++;

        if (curIndex === index) {
          return cacheEntry;
        }
      }
    }
    return null;
  }

  public getSoundTableCount(): number {
    let count = 0;
    for (let i = 0; i < this._parsedCache!.length; i++) {
      const cacheEntry = this._parsedCache![i];
      if (cacheEntry && "sounds" in cacheEntry) count++;
    }
    return count;
  }

  public getSoundTable(index: number): T3 | SBF0 | null {
    if (!this._parsedCache) return null;

    let curIndex = -1;
    for (let i = 0; i < this._parsedCache.length; i++) {
      const cacheEntry = this._parsedCache[i];
      if (cacheEntry && "sounds" in cacheEntry) {
        curIndex++;

        if (curIndex === index) {
          return cacheEntry;
        }
      }
    }
    return null;
  }

  public extract(): void {
    const buffer = this._rom.getBuffer()!;
    const offset = this.getROMOffset();
    if (offset === null) return;

    const infos = this.getPatchInfo();
    this._bufferCache = new Array(infos.length);
    this._parsedCache = new Array(infos.length);
    for (let i = 0; i < infos.length; i++) {
      const info = infos[i];
      switch (info.type) {
        case "S2":
          {
            const s2Offset = this.getROMOffset(i)!;
            const s2 = (this._parsedCache[i] = new S2(
              this._rom.getDataView(s2Offset),
            ));
            this._bufferCache[i] = buffer.slice(
              s2Offset,
              s2Offset + s2.getByteLength(),
            );
          }
          break;

        case "T3":
          {
            assert(typeof info.byteLength === "number");
            const t3Offset = this.getROMOffset(i)!;
            this._bufferCache[i] = buffer.slice(
              t3Offset,
              t3Offset + info.byteLength,
            );
            this._parsedCache[i] = new T3(this._rom.getDataView(t3Offset));
          }
          break;

        case "MBF0":
          {
            const mbf0Offset = this.getROMOffset(i)!;
            const mbf0 = (this._parsedCache[i] = new MBF0(
              this._rom.getDataView(mbf0Offset),
            ));
            this._bufferCache[i] = buffer.slice(
              mbf0Offset,
              mbf0Offset + mbf0.getByteLength(),
            );
          }
          break;

        case "SBF0":
          {
            assert(typeof info.byteLength === "number");
            const sbf0Offset = this.getROMOffset(i)!;
            this._bufferCache[i] = buffer.slice(
              sbf0Offset,
              sbf0Offset + info.byteLength,
            );
            this._parsedCache[i] = new SBF0(this._rom.getDataView(sbf0Offset));
          }
          break;

        case "FXD0":
          {
            assert(typeof info.byteLength === "number");
            const fxd0Offset = this.getROMOffset(i)!;
            this._bufferCache[i] = buffer.slice(
              fxd0Offset,
              fxd0Offset + info.byteLength,
            );
            this._parsedCache[i] = new FXD0(this._rom.getDataView(fxd0Offset));
          }
          break;

        case "Pointer":
          this._bufferCache[i] = this._parsedCache[i] = null;
          break;

        default:
          throw new Error("Unhandled audio subsection type: " + info.type);
      }
    }

    // Finds audio offsets relative to overlay binaries
    //   const infos = getPatchInfo();
    //   const sceneCount = scenes.count();
    //   for (let i = 0; i < infos.length; i++) {
    //     const info = infos[i];
    //     info.offsets.forEach((oft) => {
    //       let found = false;
    //       for (let j = 0; j < sceneCount; j++) {
    //         const info = scenes.getInfo(j);
    //         if (oft.upper > info.rom_start && oft.upper < info.rom_end) {
    // console.log(`Found: { ovl: ${$$hex(j)}, upper: ${$$hex(oft.upper - info.rom_start)}, lower: ${$$hex(oft.lower - info.rom_start)} }, // ROM: ${$$hex(oft.upper)}`)
    //           found = true;
    //         }
    //       }

    //       if (!found) {
    //         console.log(`Didn't find: { upper: ${$$hex(oft.upper)}, lower: ${$$hex(oft.lower)} }`);
    //       }
    //     });
    //   }
  }

  public extractAsync(): Promise<void> {
    return new Promise((resolve) => {
      this.extract();
      resolve();
    });
  }

  public pack(buffer: ArrayBuffer, offset = 0): number {
    const infos = this.getPatchInfo();
    if (!infos || !infos.length || !this._bufferCache) {
      throw new Error("Unable to write audio section.");
    }

    let currentOffset = offset;
    for (let i = 0; i < infos.length; i++) {
      const info = infos[i];
      switch (info.type) {
        case "T3":
        case "SBF0":
        case "FXD0":
          assert(typeof info.byteLength === "number");
          copyRange(
            buffer,
            this._bufferCache[i]!,
            currentOffset,
            0,
            this._bufferCache[i]!.byteLength,
          );
          currentOffset += info.byteLength;
          break;

        case "S2":
          {
            const s2 = this._parsedCache![i] as S2;
            currentOffset += s2.pack(buffer, currentOffset);
            currentOffset = makeDivisibleBy(currentOffset, 16);
          }
          break;

        case "MBF0":
          {
            const mbf0 = this._parsedCache![i] as MBF0;
            currentOffset += mbf0.pack(buffer, currentOffset);
            currentOffset = makeDivisibleBy(currentOffset, 16);
          }
          break;

        case "Pointer":
          break;

        default:
          throw new Error("Unhandled audio subsection type: " + info.type);
      }
    }

    const byteLengthWritten = currentOffset - offset;
    assert(byteLengthWritten % 16 === 0);
    return byteLengthWritten;
  }

  // Gets the full byte length of the audio section of the ROM.
  public getByteLength() {
    const infos = this.getPatchInfo();
    if (!infos || !infos.length) {
      throw new Error("Unable to determine audio section length.");
    }

    let byteLength = 0;
    for (let i = 0; i < infos.length; i++) {
      const info = infos[i];
      switch (info.type) {
        case "T3":
        case "SBF0":
        case "FXD0":
          assert(typeof info.byteLength === "number");
          byteLength += info.byteLength;
          break;

        case "S2":
          {
            const s2 = this._parsedCache![i] as S2;
            byteLength += s2.getByteLength();
          }
          break;

        case "MBF0":
          {
            const mbf0 = this._parsedCache![i] as MBF0;
            byteLength += mbf0.getByteLength();
          }
          break;

        case "Pointer":
          break;

        default:
          throw new Error("Unhandled audio subsection type: " + info.type);
      }
    }

    return byteLength;
  }
}
