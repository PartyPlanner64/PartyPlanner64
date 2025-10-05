import MidiPlayer from "midi-player-js";
import { parseGameMidi } from "./midi";
import { extractWavSound } from "./wav";
import { ALKeyMap } from "./ALKeyMap";
import { $$log } from "../utils/debug";
import {
  getAudioContext,
  getIsPlaying,
  setIsPlaying,
  AudioPlayerController,
} from "./playershared";
import { romhandler } from "../romhandler";

export function playMidi(table: number, index: number): AudioPlayerController {
  if (getIsPlaying()) {
    throw new Error("Should not play more than one audio source at once.");
  }
  const audioContext = getAudioContext();

  const audio = romhandler.getRom()!.getAudio();
  const seqTable = audio.getSequenceTable(table)!;
  console.log(seqTable);
  const gameMidiBuffer = seqTable.midis[index].buffer;
  const midi = parseGameMidi(
    new DataView(gameMidiBuffer),
    gameMidiBuffer.byteLength,
  );
  $$log(midi);

  const promises = [];
  const midiData: any = [];
  const soundbankIndex = seqTable.midis[index].soundbankIndex;
  const bank = seqTable.soundbanks.banks[soundbankIndex];
  for (let t = 0; t < bank.instruments.length; t++) {
    midiData[t] = [];
    const instrument = bank.instruments[t];
    for (let s = 0; s < instrument.sounds.length; s++) {
      const sound = instrument.sounds[s];
      const wav = extractWavSound(seqTable.tbl, bank, t, s);
      const middt = midiData[t];
      middt.push(null);
      const insertIndex = middt.length - 1;
      const instrumentVolume = instrument.volume;
      const prom = audioContext.decodeAudioData(wav).then((value) => {
        middt[insertIndex] = {
          audioBuffer: value,
          keymap: sound.keymap,
          instrumentVolume,
          soundVolume: sound.sampleVolume,
        };
      });
      promises.push(prom);
    }
  }

  const activeNodes: any[] = [];

  const trackInstrumentMap: number[] = [];
  for (let i = 0; i < bank.instruments.length; i++) {
    trackInstrumentMap.push(i);
  }

  const trackChannelMap: number[] = [];

  const CHANNEL_COUNT = 16;

  const channelInstrumentMap: number[] = [];
  const channelVolumes: number[] = [];
  for (let i = 0; i <= CHANNEL_COUNT; i++) {
    channelVolumes.push(127);
  }

  // let runningStatus: string; // Default?

  function _handleEvent(name: string, event: any) {
    const track = event.track;
    const channel = event.channel;

    if ("channel" in event && "track" in event) {
      trackChannelMap[track] = channel;
    }

    if (name === "Program Change") {
      channelInstrumentMap[event.channel] = event.value;
    } else if (name === "Controller Change") {
      switch (event.number) {
        case 7:
          if ("value" in event) {
            channelVolumes[channel] = event.value;
          }
          break;

        default:
          $$log(`Unrecongized controller change event`, event);
          break;
      }
    } else if (name === "Note on") {
      _noteOn(event);
    } else if (event.running) {
      if ("track" in event && "noteNumber" in event && "velocity" in event) {
        _noteOn(event);
      }
    } else if (name === "End of Track") {
      // Do nothing
    } else {
      $$log(`Ignored event`, event);
    }
  }

  function _noteOn(event: any) {
    const track = event.track;
    const channel = event.channel || trackChannelMap[track];
    const inst = channelInstrumentMap[channel];
    if (!midiData[inst]) {
      console.warn(`Instrument ${inst} is unrecongized`);
      return;
    }

    if (!activeNodes[channel]) {
      activeNodes[channel] = {};
    }
    if (!activeNodes[channel][track]) {
      activeNodes[channel][track] = {};
    }

    const sampleInfo = findSampleToPlay(midiData[inst], event.noteNumber);
    if (!sampleInfo) {
      console.warn(
        `No note for channel ${channel} instrument ${inst} note number ${event.noteNumber}`,
      );
      return;
    }

    const playingNode = activeNodes[channel][track][event.noteNumber];
    if (!event.velocity) {
      if (playingNode) {
        playingNode.stop();
      } else {
        console.warn(
          `There wasn't a node to stop playing for channel ${channel} track ${track} note number ${event.noteNumber}`,
        );
      }
      activeNodes[channel][track][event.noteNumber] = null;
    } else {
      if (playingNode) {
        console.warn(
          `There was a previous node playing for ${channel} note number ${event.noteNumber}`,
        );
      }

      const newPlayingNode = createAudioNode(
        sampleInfo,
        event.noteNumber,
        event.velocity,
        channelVolumes[channel],
      );
      newPlayingNode.start(0);
      activeNodes[channel][track][event.noteNumber] = newPlayingNode;
    }
  }

  const player = new MidiPlayer.Player(function (event: any) {
    $$log(event);

    //const name = event.running ? runningStatus : event.name;
    _handleEvent(event.name, event);

    // if (event.name) {
    //   runningStatus = event.name;
    // }
  });
  player.on("endOfFile", function () {
    setIsPlaying(false);
  });
  player.loadArrayBuffer(midi);

  Promise.all(promises).then(() => {
    $$log(midiData);
    player.play();
  });

  return new AudioPlayerController(player);
}

type SampleInfo = {
  audioBuffer: AudioBuffer;
  keymap: ALKeyMap;
  instrumentVolume: number;
  soundVolume: number;
};

function findSampleToPlay(
  infos: SampleInfo[],
  noteNumber: number,
): SampleInfo | null {
  for (const info of infos) {
    if (noteNumber >= info.keymap.keyMin && noteNumber <= info.keymap.keyMax) {
      return info;
    }
  }
  return null;
}

const VELOCITY_MAX = 0x7f;

function createAudioNode(
  sampleInfo: SampleInfo,
  targetNoteNumber: number,
  targetVelocity: number,
  channelVelocity: number,
): AudioBufferSourceNode {
  const audioContext = getAudioContext();
  const node = audioContext.createBufferSource();
  node.buffer = sampleInfo.audioBuffer;
  node.detune.value = sampleInfo.keymap.detune;

  if (targetNoteNumber !== sampleInfo.keymap.keyBase) {
    const semiToneAdjust = targetNoteNumber - sampleInfo.keymap.keyBase;
    const centsAdjust = semiToneAdjust * 100;
    node.detune.value += centsAdjust;
  }

  // if (targetNoteNumber !== sampleInfo.keymap.keyBase) {
  //   const psNode = PitchShift(_audioContext);
  //   psNode.connect(_audioContext.destination);
  //   psNode.transpose = targetNoteNumber - sampleInfo.keymap.keyBase;
  //   psNode.wet.value = 1;
  //   psNode.dry.value = 0.5;

  //   node.connect(psNode);
  // }

  const gainNode = audioContext.createGain();
  gainNode.gain.value = sampleInfo.instrumentVolume / VELOCITY_MAX;
  gainNode.gain.value *= sampleInfo.soundVolume / VELOCITY_MAX;
  gainNode.gain.value *= channelVelocity / VELOCITY_MAX;
  gainNode.gain.value *= targetVelocity / VELOCITY_MAX;

  gainNode.connect(audioContext.destination);
  node.connect(gainNode);

  return node;
}
