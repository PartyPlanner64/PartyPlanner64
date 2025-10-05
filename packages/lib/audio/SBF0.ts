import { ALSoundSimple } from "./ALSoundSimple";
import { $$hex, $$log } from "../utils/debug";
import { isDebug } from "../debug";

/**
 * SBF0 - Custom Sound Effects Format
 */

// struct SBF0Header {
//   u32 magic; "SBF0"
//   u32 soundfx_count;
//   u32 zeroes;
//   u32 zeroes;
//   u16 mystery;
//   u16 mystery;
//   u16 mystery; // sample rate?
//   u16 mystery;
//   u16 mystery;
//   ... more fields
//   0x44: u32 raw_count;
//   0x54: u32 tbl_offset;
//   0x58: u32 tbl_length;
//   ... more fields
//   0x70: u32 ?;
//   SBF0RawTableEntry[raw_count];
//   TBL
//   SBF0SfxTableEntryOffsets[soundfx_count]; (0x1EEA64C in MP3)
//   SBF0SfxTableEntry entries follow
// }

// struct SBF0RawTableEntry {
//   u32 env_offset;
//   u32 sample_rate;
//   u32 wave_offset
//   u8 sample_pan;
//   u8 sample_volume;
//   u8 flags;
//   u8 _zero;
// }

// struct SBF0SfxTableEntry {
//   u8 num_infos;
//   u8 unknown;
//   u16 zeroes?;
//   u32 zeroes?;
//   SBF0SfxTableEntryInner[num_infos];
// }

// struct SBF0SfxTableEntryInner {
//   u16 unknown;
//   u16 unknown;
//   u32 info_offset;
// }

export class SBF0 {
  private __type = "SBF0";

  public tbl!: ArrayBufferLike;
  public sounds: ALSoundSimple[] = [];

  constructor(dataView: DataView) {
    if (dataView.getUint32(0) !== 0x53424630)
      // "SBF0"
      throw new Error("SBF0 constructor encountered non-SBF0 structure");

    this._extract(dataView);
  }

  _extract(view: DataView) {
    const soundCount = view.getUint32(0x44);
    const tableEntriesOffset = 0x74;

    if (soundCount === 0) {
      throw new Error("Does soundCount === 0?");
    }

    // Extract sounds
    const ctlView = new DataView(
      view.buffer,
      view.byteOffset + tableEntriesOffset,
    );
    for (let i = 0; i < soundCount; i++) {
      this.sounds.push(new ALSoundSimple(ctlView, i * 16));
    }

    const tblOffsetStart = view.getUint32(0x54);
    const tblOffsetEnd = tblOffsetStart + view.getUint32(0x58);

    // Extract tbl buffer
    this.tbl = view.buffer.slice(
      view.byteOffset + tblOffsetStart,
      view.byteOffset + tblOffsetEnd,
    );

    // Extract the sound effects list.
    // This list count is higher than the actual raw sound count,
    // presumably because some entries use the same raw data.
    if (isDebug()) {
      let details = ""; // This is just a temporary info extraction thing...
      const soundFxCount = view.getUint32(4);
      const soundFxListOffset = tblOffsetEnd;
      for (let i = 0; i < soundFxCount; i++) {
        const offset = view.getUint32(soundFxListOffset + i * 4);

        const subcount = view.getUint8(soundFxListOffset + offset);
        const substructstart = soundFxListOffset + offset + 8;
        for (let s = 0; s < subcount; s++) {
          const soundFxInfoOffset = view.getUint32(substructstart + s * 8 + 4);

          let rawSoundIndex: number;
          const soundFxInfoType = view.getUint8(
            soundFxListOffset + soundFxInfoOffset,
          );
          switch (soundFxInfoType) {
            case 0x92:
            case 0x93:
              rawSoundIndex = view.getUint16(
                soundFxListOffset + soundFxInfoOffset + 1,
              );
              break;
            case 0x12:
            case 0x13:
              rawSoundIndex = view.getUint16(
                soundFxListOffset + soundFxInfoOffset + 2,
              );
              break;
            case 0x01:
            case 0xa0:
              continue;
            default:
              throw new Error(
                "Unrecongized soundFxInfoType " +
                  $$hex(soundFxInfoType) +
                  " at " +
                  $$hex(
                    view.byteOffset + soundFxListOffset + soundFxInfoOffset,
                  ),
              );
          }
          details += `\n${$$hex(i)}: ${$$hex(rawSoundIndex)}`;
        }
      }
      $$log(details);
    }
  }
}
