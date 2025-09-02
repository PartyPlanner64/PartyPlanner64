/**
 * MBF0 - Custom MIDI Bank Format
 */

// struct MBF0Header {
//   u32 magic; "MBF0"
//   u32 midi_count;
//   u32 zeroes;
//   u32 zeroes;
//   u16 mystery;
//   u16 mystery;
//   u16 mystery; // sample rate?
//   u16 mystery;
//   u16 mystery;
//   ... etc. total header size 0x40
//   MBF0TableEntry[midi_count];
//   u32 b1_offset;
//   u32 b1_length;
//   u32 tbl_offset;
//   u32 tbl_length;
//   // Followed by midi data
// }

// struct MBF0TableEntry {
//   u8 mystery0; // boolean?
//   u8 mystery1;
//   u8 soundbank_index;
//   u8 zero;
//   u32 0x07000000
//   u32 midi_offset; // from MBF0Header
//   u32 midi_length;
// }

import { B1 } from "./B1";
import { isDebug } from "../../../apps/partyplanner64/debug";
import { copyRange } from "../utils/arrays";
import { makeDivisibleBy } from "../utils/number";
import { assert } from "../utils/debug";

const MBF0_MAGIC = 0x4d424630;
const MBF0_HEADER_SIZE = 0x40;

export class MBF0 {
  private __type = "MBF0";

  public midis: IMidiInfo[] = [];
  public tbl!: ArrayBuffer;
  public soundbanks!: B1;
  public _soundbackBuffer!: ArrayBuffer;

  public _headerContents!: ArrayBuffer;

  constructor(dataView: DataView<ArrayBuffer>) {
    this._extract(dataView);
  }

  private _extract(view: DataView<ArrayBuffer>) {
    if (view.getUint32(0) !== MBF0_MAGIC)
      // "MBF0"
      throw new Error("MBF0 constructor encountered non-MBF0 structure");

    const midiCount = view.getUint32(4);

    // Don't really know what these are, so just grab rest of header in bulk.
    this._headerContents = new ArrayBuffer(0x38);
    copyRange(
      this._headerContents,
      view,
      0,
      8,
      this._headerContents.byteLength,
    );

    const tableEntriesOffset = MBF0_HEADER_SIZE;

    // The MBF0 may have multiple entries that refer to the same buffer.
    // If we've read a buffer already, we'll record so in this map.
    // We'll rely on referential equality during write back to recognize
    // equal entries, and avoid duplicating them.
    const buffersMap = new Map<number, ArrayBuffer>();

    // Extract midi buffers
    for (let i = 0; i < midiCount; i++) {
      const tableEntryOffset = tableEntriesOffset + i * 16;
      const midiOffset = view.getUint32(tableEntryOffset + 8);
      const midiSize = view.getUint32(tableEntryOffset + 12);

      let buffer: ArrayBuffer;
      if (buffersMap.has(midiOffset)) {
        buffer = buffersMap.get(midiOffset)!;
      } else {
        buffer = view.buffer.slice(
          view.byteOffset + midiOffset,
          view.byteOffset + midiOffset + midiSize,
        );
        buffersMap.set(midiOffset, buffer);
      }

      this.midis.push({
        buffer,
        mystery0: view.getUint8(tableEntryOffset),
        mystery1: view.getUint8(tableEntryOffset + 1),
        mystery4: view.getUint32(tableEntryOffset + 4),
        soundbankIndex: view.getUint8(tableEntryOffset + 2),
      });

      assert(view.getUint8(tableEntryOffset + 3) === 0);
      assert(
        view.getUint32(tableEntryOffset + 4) === 0x07000000 ||
          view.getUint32(tableEntryOffset + 4) === 0,
      );
    }

    const extraOffsetsOffset = MBF0_HEADER_SIZE + 16 * midiCount;
    const B1offset = view.getUint32(extraOffsetsOffset);
    const B1size = view.getUint32(extraOffsetsOffset + 4);
    const tblOffsetStart = view.getUint32(extraOffsetsOffset + 8);
    const tblOffsetEnd =
      tblOffsetStart + view.getUint32(extraOffsetsOffset + 12);

    // Extract tbl buffer
    this.tbl = view.buffer.slice(
      view.byteOffset + tblOffsetStart,
      view.byteOffset + tblOffsetEnd,
    );

    // Extract B1 structure
    const B1view = new DataView(
      view.buffer,
      view.byteOffset + B1offset,
      B1size,
    );
    this.soundbanks = new B1(B1view);

    // Workaround until B1 can measure itself.
    this._soundbackBuffer = view.buffer.slice(
      view.byteOffset + B1offset,
      view.byteOffset + B1offset + B1size,
    );
  }

  public pack(buffer: ArrayBuffer, startOffset = 0): number {
    const dataView = new DataView(buffer, startOffset);
    let currentOffset = 0;

    dataView.setUint32(0, MBF0_MAGIC);
    dataView.setUint32(4, this.midis.length);
    copyRange(
      dataView,
      this._headerContents,
      8,
      0,
      this._headerContents.byteLength,
    );
    currentOffset += MBF0_HEADER_SIZE;

    currentOffset += 16 * this.midis.length; // Skip over midi entry table.
    currentOffset += 16; // Skip over B1 and tbl offsets.

    // Write the midis.
    const buffersMap = new Map<ArrayBuffer, number>();
    for (const midiInfo of this.midis) {
      if (buffersMap.has(midiInfo.buffer)) {
        continue; // Already written.
      }

      assert(currentOffset % 8 === 0);
      buffersMap.set(midiInfo.buffer, currentOffset);

      copyRange(
        dataView,
        midiInfo.buffer,
        currentOffset,
        0,
        midiInfo.buffer.byteLength,
      );

      currentOffset += makeDivisibleBy(midiInfo.buffer.byteLength, 8);
    }

    currentOffset = makeDivisibleBy(currentOffset, 16);

    // Write the B1 soundbank.
    const b1Offset = currentOffset;
    const b1Length = this._soundbackBuffer.byteLength;
    copyRange(dataView, this._soundbackBuffer, currentOffset, 0, b1Length);
    currentOffset += makeDivisibleBy(b1Length, 8);

    // Write the tbl.
    const tblOffset = currentOffset;
    const tblLength = this.tbl.byteLength;
    copyRange(dataView, this.tbl, currentOffset, 0, tblLength);
    currentOffset += makeDivisibleBy(tblLength, 8);

    const finalOffset = makeDivisibleBy(currentOffset, 16);

    // Now go back and fill out upper table.
    currentOffset = MBF0_HEADER_SIZE;
    for (const midiInfo of this.midis) {
      dataView.setUint8(currentOffset, midiInfo.mystery0 || 0);
      dataView.setUint8(
        currentOffset + 1,
        typeof midiInfo.mystery1 === "number" ? midiInfo.mystery1 : 0x6f,
      );
      dataView.setUint8(currentOffset + 2, midiInfo.soundbankIndex);
      dataView.setUint8(currentOffset + 3, 0);
      dataView.setUint32(
        currentOffset + 4,
        typeof midiInfo.mystery4 === "number" ? midiInfo.mystery4 : 0x07000000,
      );
      dataView.setUint32(currentOffset + 8, buffersMap.get(midiInfo.buffer)!);
      dataView.setUint32(currentOffset + 12, midiInfo.buffer.byteLength);

      currentOffset += 16;
    }

    dataView.setUint32(currentOffset, b1Offset);
    dataView.setUint32(currentOffset + 4, b1Length);
    dataView.setUint32(currentOffset + 8, tblOffset);
    dataView.setUint32(currentOffset + 12, tblLength);

    const byteLengthWritten = finalOffset;
    if (isDebug()) assert(this.getByteLength() === byteLengthWritten);
    return byteLengthWritten;
  }

  public getByteLength(): number {
    let byteLength = 0;

    byteLength += 4; // Magic
    byteLength += 4; // Midi count
    byteLength += this._headerContents.byteLength; // Rest of header
    assert(byteLength === MBF0_HEADER_SIZE);

    byteLength += this.midis.length * 16 /* sizeof(struct MBF0TableEntry) */; // Midi info table

    byteLength += 16; // B1 and tbl offsets.

    assert(byteLength % 16 === 0); // Should be true at this point.

    const seenBuffers = new Set<ArrayBuffer>();
    for (const midiInfo of this.midis) {
      if (seenBuffers.has(midiInfo.buffer)) {
        continue; // Already counted.
      }
      seenBuffers.add(midiInfo.buffer);

      byteLength += makeDivisibleBy(midiInfo.buffer.byteLength, 8);
    }

    byteLength = makeDivisibleBy(byteLength, 16);

    assert(this._soundbackBuffer.byteLength % 8 === 0);
    byteLength += this._soundbackBuffer.byteLength;

    assert(this.tbl.byteLength % 8 === 0);
    byteLength += this.tbl.byteLength;

    byteLength = makeDivisibleBy(byteLength, 16);
    return byteLength;
  }
}

interface IMidiInfo {
  buffer: ArrayBuffer;
  mystery0?: number;
  mystery1?: number;
  mystery4?: number;
  soundbankIndex: number;
}
