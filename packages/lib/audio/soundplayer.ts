import { romhandler } from "../romhandler";
import {
  getAudioContext,
  getIsPlaying,
  AudioPlayerController,
  setIsPlaying,
} from "./playershared";
import { extractWavFromSound } from "./wav";

export function playSound(table: number, index: number): AudioPlayerController {
  if (getIsPlaying()) {
    throw new Error("Should not play more than one audio source at once.");
  }
  const audioContext = getAudioContext();

  const audio = romhandler.getRom()!.getAudio();
  const soundTable = audio.getSoundTable(table)!;

  const sound = soundTable.sounds[index];
  const wav = extractWavFromSound(soundTable.tbl, sound, sound.sampleRate);

  let onEndedCallback: () => void;
  let node: AudioBufferSourceNode;
  audioContext.decodeAudioData(wav).then((audioBuffer) => {
    node = audioContext.createBufferSource();
    node.buffer = audioBuffer;
    node.connect(audioContext.destination);
    node.start(0);
    node.onended = () => {
      setIsPlaying(false);
      if (onEndedCallback) {
        onEndedCallback();
      }
    };
  });

  return new AudioPlayerController({
    stop: () => {
      if (node) {
        node.stop();
        setIsPlaying(false);
      }
    },
    on: (event: string, callback: () => void) => {
      if (event !== "endOfFile") {
        throw new Error("Unexpected AudioPlayerController event " + event);
      }
      onEndedCallback = callback;
    },
  });
}
