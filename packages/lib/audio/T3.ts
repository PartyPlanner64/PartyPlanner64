import { $$log } from "../utils/debug";
import { ALSoundSimple } from "./ALSoundSimple";

/**
 * T3 - Custom Sound Effects Format
 */

// struct T3Header {
//   u16 magic; "T3"
//   u16 soundfx_count;
//   T3SfxTableEntry[soundfx_count];
//   u32 zeroes;
//   u32 raw_count;
//   u32 unknown;
//   u32 tbl_offset; // Relative to T3RawTableEntry[] below
//   u32 unknown;
//   u32 tbl_length;
//   u32 unknown;
//   u32 * 4 unknown
//   T3RawTableEntry[raw_count];
//   TBL

// }

// struct T3SfxTableEntry {
//   u4 unknown;
//   u12 unknown; // Seems like this could almost be sound index too at times.
//   s16 unknown;
//   u4 unknown;
//   u12 raw_sound_index;
//   u16 sample_rate;
// }

// struct T3RawTableEntry {
//   u32 env_offset;
//   u32 zeroes;
//   u32 wave_offset
//   u8 sample_pan;
//   u8 sample_volume;
//   u8 flags;
//   u8 _zero;
// }

export class T3 {
  private __type = "T3";

  public tbl!: ArrayBuffer;
  public sounds: ALSoundSimple[] = [];

  constructor(dataView: DataView<ArrayBuffer>) {
    if (dataView.getUint16(0) !== 0x5433)
      // "T3"
      throw new Error("T3 constructor encountered non-T3 structure");

    this._extract(dataView);
  }

  _extract(view: DataView<ArrayBuffer>) {
    const soundFxCount = view.getUint16(2);

    // Get metadata about each sound effect. Right now, we just need the sample rate really.
    const soundEffectMetadata: any[] = [];
    for (let i = 0; i < soundFxCount; i++) {
      soundEffectMetadata.push({
        rawSound: view.getUint16(4 + i * 8 + 4) & 0x0fff,
        //rawSound: view.getUint16(4 + (i * 8)) & 0x0FFF,
        sampleRate: view.getUint16(4 + i * 8 + 6),
      });
    }

    // Extract raw sounds
    const rawSoundCount = view.getUint32(4 + soundFxCount * 8 + 4);
    const tableEntriesOffset = 4 + soundFxCount * 8 + 0x2c;
    const ctlView = new DataView(
      view.buffer,
      view.byteOffset + tableEntriesOffset,
    );
    for (let i = 0; i < rawSoundCount; i++) {
      const sound = new ALSoundSimple(ctlView, i * 16);

      for (const sfxmetadata of soundEffectMetadata) {
        if (sfxmetadata.rawSound === i) {
          sound.sampleRate = sfxmetadata.sampleRate;
          break;
        }
      }
      if (!sound.sampleRate) {
        $$log(`Unknown sample rate for raw sound ${i}, guessing...`);
        sound.sampleRate = 0x5622;
      }

      this.sounds.push(sound);
    }

    const tblOffsetStart = view.getUint32(4 + soundFxCount * 8 + 0xc);
    const tblOffsetEnd =
      tblOffsetStart + view.getUint32(4 + soundFxCount * 8 + 0x14);

    // Extract tbl buffer
    this.tbl = view.buffer.slice(
      view.byteOffset + tblOffsetStart,
      view.byteOffset + tblOffsetEnd,
    );

    // Extract the sound effects list.
    // This list count is higher than the actual raw sound count,
    // presumably because some entries use the same raw data.
    // if (isDebug()) {
    //   let details = ""; // This is just a temporary info extraction thing...
    //   for (let i = 0; i < soundEffectMetadata.length; i++) {
    //     details += `\n${$$hex(i)}: ${$$hex(soundEffectMetadata[i].rawSound)}`;
    //   }
    //   $$log(details);
    // }
  }
}
