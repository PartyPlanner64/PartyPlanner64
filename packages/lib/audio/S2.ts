import { B1 } from "./B1";
import { makeDivisibleBy } from "../utils/number";
import { copyRange } from "../utils/arrays";
import { isDebug } from "../debug";
import { assert } from "../utils/debug";

// https://github.com/derselbst/N64SoundTools/blob/master/N64SoundListTool/N64SoundLibrary/N64AIFCAudio.cpp

// Two-part midi table.
//   First table: 8 byte entries, [midi offset, midi length]
//   Second table: 16 byte entries, [SS7FFFFF (SS = soundbank index), B1 offset, B1 length, TBL offset]
// B1
// TBL
// Midis

const S2_MAGIC = 0x5332;

/** ALSeqFile */
export class S2 {
  private __type = "S2";

  public midis: IMidiInfo[] = [];
  public tbl!: ArrayBufferLike;
  public soundbanks!: B1;
  private _rawB1!: ArrayBufferLike;

  constructor(dataView: DataView) {
    this._extract(dataView);
  }

  _extract(view: DataView) {
    if (view.getUint16(0) !== S2_MAGIC)
      // "S2"
      throw new Error("S2 constructor encountered non-S2 structure");

    const midiCount = view.getUint16(2);
    const extendedS2TableOffset = 4 + midiCount * 8;

    // Extract midi buffers
    for (let i = 0; i < midiCount; i++) {
      const midiOffset = view.getUint32(4 + i * 4 * 2);
      const midiSize = view.getUint32(8 + i * 4 * 2);

      const midiStart = view.byteOffset + midiOffset;
      this.midis.push({
        buffer: view.buffer.slice(midiStart, midiStart + midiSize),
        soundbankIndex: view.getUint8(extendedS2TableOffset + i * 16),
      });
    }

    // Extract tbl buffer
    // Assumption: we know where it begins, and will assume it ends at the first midi offset.
    const tblOffsetStart = view.getUint32(extendedS2TableOffset + 12);
    const tblOffsetEnd = view.getUint32(4); // First midi offset
    this.tbl = view.buffer.slice(
      view.byteOffset + tblOffsetStart,
      view.byteOffset + tblOffsetEnd,
    );

    // Extract B1 structure
    // Assumption: extra S2 table entries all point to same B1
    const B1offsetStart = view.getUint32(extendedS2TableOffset + 4);
    const B1length = view.getUint32(extendedS2TableOffset + 8);
    const B1view = new DataView(view.buffer, view.byteOffset + B1offsetStart);
    this.soundbanks = new B1(B1view);
    this._rawB1 = view.buffer.slice(
      view.byteOffset + B1offsetStart,
      view.byteOffset + B1offsetStart + B1length,
    );
  }

  public pack(buffer: ArrayBuffer, startOffset = 0): number {
    const dataView = new DataView(buffer, startOffset);
    let currentOffset = 0;

    dataView.setUint16(0, S2_MAGIC);
    dataView.setUint16(2, this.midis.length);
    currentOffset += 4;

    // First table
    const firstTableLen = this.midis.length * 8;
    const secondTableLen = this.midis.length * 16 + 4;
    const b1Offset = makeDivisibleBy(4 + firstTableLen + secondTableLen, 16);
    let midisOffset = b1Offset + this._rawB1.byteLength + this.tbl.byteLength;
    midisOffset = makeDivisibleBy(midisOffset, 8);
    for (const midiInfo of this.midis) {
      dataView.setUint32(currentOffset, midisOffset);
      const midiSize = makeDivisibleBy(midiInfo.buffer.byteLength, 8);
      dataView.setUint32(currentOffset + 4, midiSize);

      currentOffset += 8;
      midisOffset += midiSize;
    }

    // Second table
    for (const midiInfo of this.midis) {
      dataView.setInt8(currentOffset, midiInfo.soundbankIndex);
      dataView.setInt8(currentOffset + 1, 0x7f);
      dataView.setUint8(currentOffset + 2, 0xff);
      dataView.setUint8(currentOffset + 3, 0xff);

      dataView.setUint32(currentOffset + 4, b1Offset);
      dataView.setUint32(currentOffset + 8, this._rawB1.byteLength);
      dataView.setUint32(currentOffset + 12, b1Offset + this._rawB1.byteLength); // TBL offset

      currentOffset += 16;
    }
    dataView.setUint32(currentOffset, 0xffffffff);
    currentOffset += 4;
    currentOffset = makeDivisibleBy(currentOffset, 16);

    // B1
    copyRange(dataView, this._rawB1, currentOffset, 0, this._rawB1.byteLength);
    currentOffset += makeDivisibleBy(this._rawB1.byteLength, 8);

    // TBL
    copyRange(dataView, this.tbl, currentOffset, 0, this.tbl.byteLength);
    currentOffset += makeDivisibleBy(this.tbl.byteLength, 8);

    // Midis
    for (const midiInfo of this.midis) {
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

    if (isDebug()) assert(this.getByteLength() === currentOffset);
    return currentOffset;
  }

  public getByteLength(): number {
    let byteLength = 0;

    byteLength += 2; // Magic
    byteLength += 2; // Midi count
    byteLength += this.midis.length * 8; // First table
    byteLength += this.midis.length * 16 + 4; // Second table
    byteLength = makeDivisibleBy(byteLength, 16);

    byteLength += makeDivisibleBy(this._rawB1.byteLength, 8); // B1
    byteLength += makeDivisibleBy(this.tbl.byteLength, 8); // TBL

    // Midis
    for (const midiInfo of this.midis) {
      byteLength += makeDivisibleBy(midiInfo.buffer.byteLength, 8);
    }

    byteLength = makeDivisibleBy(byteLength, 16);

    return byteLength;
  }
}

interface IMidiInfo {
  buffer: ArrayBufferLike;
  soundbankIndex: number;
}

// Extended table notes
// Mario Party

// Midi Listing at 015396A0 (4 byte header S2)
// Midi Lookup Soundbank # at 0153992C
// SS7FFFFF 000007A0 00029D28 0002A4C8
// SS = Soundbank #

// (Note that I believe actually the soundbank association, though in table, may actually be hardcoded)
// Midi Listing at 01778BC0 (4 byte header S2)
// Midi Lookup Soundbank # at 01778BFC
// SS7FFFFF 000007A0 00029D28 0002A4C8
// SS = Soundbank #

// Mario Party 2

// 01750490 Midi Lookup (ROM)
// 00SS0000 07000000 OOOOOOOO LLLLLLLL
// SS = Soundbank #
// OOOOOOOO=Location of Midi (offset from 01750450)
// LLLLLLLL=Length of Midi

// Mario Party 3

// 01881C80 Midi Lookup (ROM)
// 00??SS00 07000000 OOOOOOOO LLLLLLLL
// ?? = ?
// SS = Soundbank #
// OOOOOOOO=Location of Midi (offset from 01881C40)
// LLLLLLLL=Length of Midi
