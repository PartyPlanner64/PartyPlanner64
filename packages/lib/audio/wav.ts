import { ALBank } from "./ALBank";
import { ALWaveType } from "./ALWaveTable";
import { decodeVADPCM } from "./vadpcm";
import { ISound } from "./ALSound";

const RIFF_CHUNK_HEADER_SIZE = 0x8;
const WAV_FMT_CHUNK_SIZE = 0x18;
const WAV_DATA_CHUNK_HEADER_SIZE = 0x8;
const WAV_SMPL_CHUNK_SIZE = 0x44;

/**
 * Extracts a particular sound from a bank/instrument into wav format.
 * See Subdrag's CN64AIFCAudio::ExtractRawSound
 * https://github.com/derselbst/N64SoundTools/blob/master/N64SoundListTool/N64SoundLibrary/N64AIFCAudio.cpp#L2361
 * @param bank ALBank
 * @param instrument Instrument index
 * @param sound Sound index
 */
export function extractWavSound(
  tbl: ArrayBufferLike,
  bank: ALBank,
  instrumentIndex: number,
  soundIndex: number,
): ArrayBufferLike {
  if (instrumentIndex >= bank.instruments.length || !bank.instruments.length) {
    throw new Error("Invalid bank instrument index" + instrumentIndex);
  }

  const instrument = bank.instruments[instrumentIndex];

  if (soundIndex >= instrument.sounds.length || !instrument.sounds.length) {
    throw new Error("Invalid sound instrument index" + soundIndex);
  }

  const sound = instrument.sounds[soundIndex];
  return extractWavFromSound(tbl, sound, bank.sampleRate);
}

export function extractWavFromSound(
  tbl: ArrayBufferLike,
  sound: ISound,
  samplingRate: number,
): ArrayBufferLike {
  const wave = sound.wave;
  const tblView = new DataView(tbl, wave.waveBase);

  if (wave.type === ALWaveType.AL_RAW16_WAVE) {
    const wavFileSize =
      RIFF_CHUNK_HEADER_SIZE +
      4 + // "WAVE"
      WAV_FMT_CHUNK_SIZE +
      WAV_DATA_CHUNK_HEADER_SIZE +
      (wave.waveLen - 2) +
      WAV_SMPL_CHUNK_SIZE;
    const outBuffer = new ArrayBuffer(wavFileSize);
    const outView = new DataView(outBuffer);

    outView.setUint32(0, 0x52494646); // "RIFF"

    const riffChunkSize = wavFileSize - 0x8;
    outView.setUint32(4, riffChunkSize, true);

    outView.setUint32(8, 0x57415645); // "WAVE"

    // fmt section
    outView.setUint32(12, 0x666d7420); // "fmt "

    outView.setUint32(0x10, 0x10, true); // Subchunk "fmt " size
    outView.setUint16(0x14, 1, true); // Audio format (PCM = 1)
    outView.setUint16(0x16, 1, true); // Num Channels (Mono = 1, Stereo = 2)
    outView.setUint32(0x18, samplingRate, true); // Sample Rate
    outView.setUint32(0x1c, samplingRate * 2, true); // Byte rate
    outView.setUint16(0x20, 2, true); // Block align
    outView.setUint16(0x22, 16, true); // Bits per sample

    // data section
    outView.setUint32(0x24, 0x64617461); // "data"

    const dataChunkSize = wave.waveLen - 2;
    outView.setUint32(0x28, dataChunkSize, true);

    // Grab the wave data from the tbl.
    // Skip first and last byte for some reason?
    let position = 0x2c;
    for (let tblIndex = 0; tblIndex < dataChunkSize; tblIndex++, position++) {
      outView.setUint8(position, tblView.getUint8(tblIndex + 1));
    }

    // smpl section
    outView.setUint32(position, 0x736d706c); // "smpl"
    position += 4;

    outView.setUint32(position, 0x3c, true); // smpl chunk size
    position += 4;

    outView.setUint32(position, 0); // Manufacturer
    position += 4;
    outView.setUint32(position, 0); // Product
    position += 4;
    outView.setUint32(position, 0); // Sample Period
    position += 4;

    let keyBase = 0x3c;
    if (sound.keymap && sound.keymap.keyBase !== 0) {
      keyBase = sound.keymap.keyBase;
    }
    outView.setUint32(position, keyBase, true); // MIDI Unity Note
    position += 4;

    // If we don't have a loop, everything following is zero
    if (wave.rawWave.loop !== null) {
      outView.setUint32(position, 0); // MIDI Pitch Fraction
      position += 4;

      outView.setUint32(position, 0); // SMPTE Format
      position += 4;
      outView.setUint32(position, 0); // SMPTE Offset
      position += 4;

      // wavHeader[0x24]
      outView.setUint32(position, 1, true); // Number Sample Loops
      position += 4;

      outView.setUint32(position, 0); // Sampler data
      position += 4;

      if (wave.rawWave.loop.count > 0) {
        outView.setUint32(position, 0); // Cue Point ID
        position += 4;
        outView.setUint32(position, 0); // Type 0 - Loop forward (normal)
        position += 4;

        // wavHeader[0x34]
        outView.setUint32(position, wave.rawWave.loop.start, true);
        position += 4;
        outView.setUint32(position, wave.rawWave.loop.end, true);
        position += 4;

        outView.setUint32(position, 0); // Fraction
        position += 4;

        // wavHeader[0x40] Play Count
        if (wave.rawWave.loop.count === 0xffffffff) {
          // -1
          outView.setUint32(position, 0);
        } else {
          outView.setUint32(position, wave.rawWave.loop.count, true);
        }
        position += 4;
      }
    }

    return outBuffer;
  } else if (wave.type === ALWaveType.AL_ADPCM_WAVE) {
    const adpcmWave = wave.adpcmWave;
    if (!adpcmWave || !adpcmWave.book) {
      throw new Error("Cannot decode AL_ADPCM_WAVE without book");
    }

    const outRawData = new ArrayBuffer(
      wave.waveLen * 4 * 2 /* sizeof(signed short) */,
    );
    const numSamples = decodeVADPCM(
      tblView,
      outRawData,
      wave.waveLen,
      adpcmWave.book,
      (wave.flags & 0x30) === 0x30,
    );

    //0x2C + (numSamples * 2) + 0x44;
    const wavFileSize =
      RIFF_CHUNK_HEADER_SIZE +
      4 + // "WAVE"
      WAV_FMT_CHUNK_SIZE +
      WAV_DATA_CHUNK_HEADER_SIZE +
      numSamples * 2 +
      WAV_SMPL_CHUNK_SIZE;

    const outBuffer = new ArrayBuffer(wavFileSize);
    const outView = new DataView(outBuffer);

    outView.setUint32(0, 0x52494646); // "RIFF"

    const riffChunkSize = wavFileSize - RIFF_CHUNK_HEADER_SIZE;
    outView.setUint32(4, riffChunkSize, true);

    outView.setUint32(8, 0x57415645); // "WAVE"

    // fmt section
    outView.setUint32(12, 0x666d7420); // "fmt "

    outView.setUint32(0x10, WAV_FMT_CHUNK_SIZE - 8, true); // Subchunk "fmt " size
    outView.setUint16(0x14, 1, true); // Audio format (PCM = 1)
    outView.setUint16(0x16, 1, true); // Num Channels (Mono = 1, Stereo = 2)
    outView.setUint32(0x18, samplingRate, true); // Sample Rate
    outView.setUint32(0x1c, samplingRate * 2, true); // Byte rate
    outView.setUint16(0x20, 2, true); // Block align
    outView.setUint16(0x22, 16, true); // Bits per sample

    // data section
    outView.setUint32(0x24, 0x64617461); // "data"

    const dataChunkSize = numSamples * 2;
    outView.setUint32(0x28, dataChunkSize, true);

    // Copy the samples to the data section.
    const outRawView = new DataView(outRawData);
    let position = 0x2c;
    for (let s = 0; s < numSamples * 2; s++, position++) {
      outView.setUint8(position, outRawView.getUint8(s));
    }

    // smpl section
    outView.setUint32(position, 0x736d706c); // "smpl"
    position += 4;

    outView.setUint32(position, 0x3c, true); // smpl chunk size
    position += 4;

    outView.setUint32(position, 0); // Manufacturer
    position += 4;
    outView.setUint32(position, 0); // Product
    position += 4;
    outView.setUint32(position, 0); // Sample Period
    position += 4;

    let keyBase = 0x3c;
    if (sound.keymap && sound.keymap.keyBase !== 0) {
      keyBase = sound.keymap.keyBase;
    }
    outView.setUint32(position, keyBase, true); // MIDI Unity Note
    position += 4;

    // If we don't have a loop, everything following is zero
    if (adpcmWave.loop !== null) {
      outView.setUint32(position, 0); // MIDI Pitch Fraction
      position += 4;

      outView.setUint32(position, 0); // SMPTE Format
      position += 4;
      outView.setUint32(position, 0); // SMPTE Offset
      position += 4;

      // wavHeader[0x24]
      outView.setUint32(position, 1, true); // Number Sample Loops
      position += 4;

      outView.setUint32(position, 0); // Sampler data
      position += 4;

      if (adpcmWave.loop.count > 0) {
        outView.setUint32(position, 0); // Cue Point ID
        position += 4;
        outView.setUint32(position, 0); // Type 0 - Loop forward (normal)
        position += 4;

        // wavHeader[0x34]
        outView.setUint32(position, adpcmWave.loop.start, true);
        position += 4;
        outView.setUint32(position, adpcmWave.loop.end, true);
        position += 4;

        outView.setUint32(position, 0); // Fraction
        position += 4;

        // wavHeader[0x40] Play Count
        if (adpcmWave.loop.count === 0xffffffff) {
          // -1
          outView.setUint32(position, 0);
        } else {
          outView.setUint32(position, adpcmWave.loop.count, true);
        }
        position += 4;
      }
    }

    return outBuffer;
  } else {
    throw new Error(`Unsupported wave type ${wave.type}`);
  }
}
