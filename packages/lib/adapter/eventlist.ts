import { EventActivationType, EventExecutionType } from "../types";
import { createEventInstanceLabel } from "../events/prepAsm";
import { isArrayBufferLike } from "../utils/arrays";

/** Listing of events for a space. */
export class SpaceEventList {
  private _spaceIndex?: number;
  private _entries: SpaceEventListEntry[];

  constructor(spaceIndex?: number) {
    this._spaceIndex = spaceIndex;
    this._entries = [];
  }

  /*
   * Populates this SpaceEventTable from an event table existing in the buffer.
   */
  public parse(arr: DataView): void;
  public parse(arr: ArrayBufferLike, offset: number): void;
  public parse(arr: ArrayBufferLike | DataView, offset?: number): void {
    let dataView: DataView;
    if (isArrayBufferLike(arr)) dataView = new DataView(arr, offset);
    else dataView = arr;
    let currentOffset = 0;
    let activationType, executionType, address;
    while ((activationType = dataView.getUint16(currentOffset)) !== 0) {
      executionType = dataView.getUint16(currentOffset + 2);
      address = dataView.getUint32(currentOffset + 4);
      this.add(activationType, executionType, address);
      currentOffset += 8;
    }
  }

  /*
   * Writes the current entries back to the buffer at an offset.
   * Returns length of bytes written (equal to calling byteLength())
   */
  public write(buffer: ArrayBuffer, offset: number) {
    const dataView = new DataView(buffer, offset);
    let currentOffset = 0;
    this.forEach((entry) => {
      if (typeof entry.address === "string") {
        throw new Error("Cannot write event list with symbolic address");
      }
      this._writeEntry(
        dataView,
        currentOffset,
        entry.activationType,
        entry.executionType,
        entry.address,
      );
      currentOffset += 8;
    });
    this._writeEntry(dataView, currentOffset, 0, 0);
    currentOffset += 8;

    return currentOffset;
  }

  /** Creates the assembly representation of the event list. */
  public getAssembly(): string {
    let asm = `${createSpaceEventListLabel(this._spaceIndex!)}:\n`;
    this.forEach((entry, index) => {
      asm += `.halfword ${entry.activationType}, ${entry.executionType}\n`;
      if (typeof entry.address === "string") {
        asm += `.word ${entry.address}\n`; // A symbol, write verbatim.
      } else {
        asm += `.word ${createEventInstanceLabel(this._spaceIndex!, index)}\n`;
      }
    });
    asm += `.word 0, 0\n`;
    return asm;
  }

  _writeEntry(
    dataView: DataView,
    currentOffset: number,
    activationType: EventActivationType | 0,
    executionType: EventExecutionType | 0,
    address = 0,
  ) {
    dataView.setUint16(currentOffset, activationType);
    dataView.setUint16(currentOffset + 2, executionType);
    if (!address && (activationType || executionType))
      throw new Error(`Tried to write null address from SpaceEventList.`);
    dataView.setUint32(currentOffset + 4, address);
  }

  public add(
    activationType: EventActivationType,
    executionType: EventExecutionType,
    address: number | string = 0,
  ) {
    this._entries.push(
      new SpaceEventListEntry(activationType, executionType, address),
    );
  }

  public setAddress(entryIndex: number, address = 0) {
    this._entries[entryIndex].address = address >>> 0;
  }

  public forEach(fn: (entry: SpaceEventListEntry, index: number) => any) {
    this._entries.forEach(fn);
  }

  public count(): number {
    return this._entries.length;
  }

  public byteLength() {
    // Each entry is 8 bytes, plus the last null entry.
    return this._entries.length * 8 + 8;
  }

  public static byteLength(entryCount: number) {
    return entryCount * 8 + 8;
  }
}

export class SpaceEventListEntry {
  public activationType: EventActivationType;
  public executionType: EventExecutionType;
  public address: number | string;

  constructor(
    activationType: EventActivationType,
    executionType: EventExecutionType,
    address: number | string,
  ) {
    this.activationType = activationType;
    this.executionType = executionType;
    this.address = address;
  }
}

export function createSpaceEventListLabel(spaceIndex: number): string {
  const strIndex = spaceIndex < 0 ? "minus" + Math.abs(spaceIndex) : spaceIndex;
  return `__PP64_INTERNAL_SPACE_LIST_${strIndex}`;
}
