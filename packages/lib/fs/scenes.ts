import { copyRange } from "../utils/arrays";
import { ROM } from "../romhandler";
import { $$log, $$hex } from "../utils/debug";
import { getSymbol } from "../symbols/symbols";
import { ramToROM } from "../utils/offsets";

export interface ISceneInfo {
  rom_start: number;
  rom_end: number;
  ram_start: number;
  code_start: number;
  code_end: number;
  rodata_start: number;
  rodata_end: number;
  bss_start: number;
  bss_end: number;
}

const SIZEOF_SCENE_TABLE_ENTRY = 9 * 4;

/** Handles the overlays used in the game. */
export class Scenes {
  private _rom: ROM;
  private _overlays: ArrayBuffer[] | null;
  private _sceneInfo: ISceneInfo[] | null;

  constructor(rom: ROM) {
    this._rom = rom;
    this._overlays = [];
    this._sceneInfo = [];
  }

  count() {
    return this._sceneInfo!.length;
  }

  getInfo(index: number) {
    return this._sceneInfo![index] || null;
  }

  getDataView(index: number): DataView<ArrayBuffer> {
    return new DataView(this._overlays![index]);
  }

  getCodeDataView(index: number) {
    const info = this._sceneInfo![index];
    const startAddr = info.code_start & 0x7fffffff;
    const endAddr = info.code_end & 0x7fffffff;
    return new DataView(this._overlays![index], 0, endAddr - startAddr);
  }

  getRoDataView(index: number) {
    const info = this._sceneInfo![index];
    const startAddr = info.rodata_start & 0x7fffffff;
    const endAddr = info.rodata_end & 0x7fffffff;
    const ramStart = info.ram_start & 0x7fffffff;
    return new DataView(
      this._overlays![index],
      startAddr - ramStart,
      endAddr - startAddr,
    );
  }

  public getByteLength(): number {
    return this._sceneInfo!.reduce((sum: number, currentInfo: ISceneInfo) => {
      return sum + currentInfo.rom_end - currentInfo.rom_start;
    }, 0);
  }

  extractAsync(): Promise<void> {
    return new Promise((resolve) => {
      this.extract();
      resolve();
    });
  }

  extract() {
    this._overlays = [];
    this._sceneInfo = [];

    let sceneTableOffset = getSymbol(this._rom.getGame()!, "overlay_table");
    if (!sceneTableOffset) {
      $$log("overlay_table symbol undefined for current ROM");
      return;
    }
    sceneTableOffset = ramToROM(sceneTableOffset);
    $$log(`Scene table found at ROM offset ${$$hex(sceneTableOffset)}`);

    const romBuffer = this._rom.getBuffer()!;
    const romView = this._rom.getDataView();
    let curOffset = sceneTableOffset;
    while (romView.getUint32(curOffset) !== 0x44200000) {
      const info: ISceneInfo = {
        rom_start: romView.getUint32(curOffset),
        rom_end: romView.getUint32(curOffset + 4),
        ram_start: romView.getUint32(curOffset + 8),
        code_start: romView.getUint32(curOffset + 12),
        code_end: romView.getUint32(curOffset + 16),
        rodata_start: romView.getUint32(curOffset + 20),
        rodata_end: romView.getUint32(curOffset + 24),
        bss_start: romView.getUint32(curOffset + 28),
        bss_end: romView.getUint32(curOffset + 32),
      };
      this._sceneInfo.push(info);

      this._overlays.push(romBuffer.slice(info.rom_start, info.rom_end));

      curOffset += SIZEOF_SCENE_TABLE_ENTRY;
    }
  }

  public pack(buffer: ArrayBuffer, offset = 0): void {
    let sceneTableOffset = getSymbol(this._rom.getGame()!, "overlay_table");
    if (!sceneTableOffset) {
      throw new Error("overlay_table symbol undefined for current ROM");
    }
    sceneTableOffset = ramToROM(sceneTableOffset);

    const romView = new DataView(buffer);
    let curOffset = sceneTableOffset;
    let i = 0;
    while (romView.getUint32(curOffset) !== 0x44200000) {
      // Write all values, some may not have changed.
      const info = this._sceneInfo![i];
      romView.setUint32(curOffset, info.rom_start);
      romView.setUint32(curOffset + 4, info.rom_end);
      romView.setUint32(curOffset + 8, info.ram_start);
      romView.setUint32(curOffset + 12, info.code_start);
      romView.setUint32(curOffset + 16, info.code_end);
      romView.setUint32(curOffset + 20, info.rodata_start);
      romView.setUint32(curOffset + 24, info.rodata_end);
      romView.setUint32(curOffset + 28, info.bss_start);
      romView.setUint32(curOffset + 32, info.bss_end);

      const ovlBuffer = this._overlays![i];
      copyRange(buffer, ovlBuffer, info.rom_start, 0, ovlBuffer.byteLength);

      curOffset += SIZEOF_SCENE_TABLE_ENTRY;
      i++;
    }
  }

  replace(
    index: number,
    buffer: ArrayBuffer,
    newInfoValues?: Partial<ISceneInfo>,
  ) {
    if (buffer.byteLength % 16) {
      throw new Error(
        "Cannot have overlay byte length that is not divisible by 16",
      );
    }

    this._overlays![index] = buffer;

    const info = this._sceneInfo![index];
    const oldSize = info.rom_end - info.rom_start;
    const diff = buffer.byteLength - oldSize;
    info.rom_end = info.rom_start + buffer.byteLength;

    if (newInfoValues) {
      for (const valueName in newInfoValues) {
        const newValue = newInfoValues[valueName as keyof ISceneInfo];
        if (newValue) {
          info[valueName as keyof ISceneInfo] = newValue;
        }
      }
    }

    for (let i = index + 1; i < this._sceneInfo!.length; i++) {
      const otherInfo = this._sceneInfo![i];
      if (info.rom_start < otherInfo.rom_start) {
        otherInfo.rom_start += diff;
        otherInfo.rom_end += diff;
      }
    }

    $$log(
      `Replaced overlay ${$$hex(index)} with new buffer of length ${
        buffer.byteLength
      }`,
      newInfoValues,
    );
  }
}
