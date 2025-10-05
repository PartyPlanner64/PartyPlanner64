import * as React from "react";
import { useState } from "react";
import { romhandler } from "../../../packages/lib/romhandler";
import { Audio } from "../../../packages/lib/fs/audio";
import { getAdapter } from "../../../packages/lib/adapter/adapters";
import { playMidi } from "../../../packages/lib/audio/midiplayer";
import { Button } from "../controls";
import {
  parseGameMidi,
  createGameMidi,
} from "../../../packages/lib/audio/midi";
import { playSound } from "../../../packages/lib/audio/soundplayer";
import { AudioPlayerController } from "../../../packages/lib/audio/playershared";
import { extractWavFromSound } from "../../../packages/lib/audio/wav";
import { $setting, get } from "./settings";
import { saveAs } from "file-saver";
import { openFile } from "../../../packages/lib/utils/input";
import { assert } from "../../../packages/lib/utils/debug";
import { promptUser, showMessage } from "../appControl";

import exportImage from "../img/audio/export.png";
import importImage from "../img/audio/import.png";
import stopImage from "../img/audio/stop.png";
import playImage from "../img/audio/play.png";
import editImage from "../img/audio/edit.png";
import expandImage from "../img/audio/expand.png";
import collapseImage from "../img/audio/collapse.png";

import "../css/audio.scss";

interface IAudioViewerState {
  hasError: boolean;
  playbackController?: AudioPlayerController | null;
  playingType: "none" | "midi" | "sound";
  playing: false | [number, number];
}

export class AudioViewer extends React.Component<{}, IAudioViewerState> {
  constructor(props: {}) {
    super(props);

    this.state = {
      playingType: "none",
      hasError: false,
      playing: false,
    };
  }

  render() {
    if (this.state.hasError) {
      return <p>An error was encountered.</p>;
    }

    const rom = romhandler.getRom()!;
    const game = rom.getGameVersion()!;
    const audio = rom.getAudio();
    const adapter = getAdapter(game, {})!;

    const advancedSetting = get($setting.uiAdvanced);

    const sequenceRows = [];
    const sequenceTableCount = audio.getSequenceTableCount();
    for (let t = 0; t < sequenceTableCount; t++) {
      const tableIndex = t;
      const trackNames = adapter.getAudioMap(tableIndex);

      if (t > 0) {
        sequenceRows.push(
          <tr key={t + "hr"}>
            <td colSpan={2}>
              <hr />
            </td>
          </tr>,
        );
      }

      const table = audio.getSequenceTable(t)!;
      for (let s = 0; s < table.midis.length; s++) {
        const midiIndex = s;

        let isPlaying = false;
        let cannotPlay = false;
        if (this.state.playing) {
          isPlaying =
            t === this.state.playing[0] &&
            s === this.state.playing[1] &&
            this.state.playingType === "midi";
          cannotPlay = !isPlaying;
        }

        let trackName;
        const soundName = trackNames[midiIndex];
        const index = `${midiIndex}, 0x${midiIndex.toString(16).toUpperCase()}`;
        if (soundName) {
          trackName = (
            <span title={index}>
              {soundName}
              {advancedSetting && (
                <span className="audioIndexBesideName">{` (${index})`}</span>
              )}
            </span>
          );
        } else {
          trackName = <span title={index}>{index}</span>;
        }

        sequenceRows.push(
          <AudioTrackRow
            key={tableIndex + "-" + midiIndex}
            table={tableIndex}
            index={midiIndex}
            isPlaying={isPlaying}
            cannotPlay={cannotPlay}
            trackName={trackName}
            onPlay={this.onPlayMidi}
            onStop={this.onStop}
            expandContent={
              <>
                <div>
                  <Button
                    onClick={() =>
                      _exportMidi(
                        audio,
                        tableIndex,
                        midiIndex,
                        soundName || "Unknown",
                      )
                    }
                    css="btnAudioExport"
                  >
                    <img
                      src={exportImage}
                      height="16"
                      width="16"
                      alt="Export midi"
                    />
                    Download midi
                  </Button>
                  <Button
                    onClick={() => _replaceMidi(audio, tableIndex, midiIndex)}
                    css="btnAudioExport"
                  >
                    <img
                      src={importImage}
                      height="16"
                      width="16"
                      alt="Import midi"
                    />
                    Replace midi
                  </Button>
                  <label className="audioTableExpandedLabel">
                    Soundbank index:{" "}
                  </label>
                  {table.midis[s].soundbankIndex}
                  <img
                    src={editImage}
                    className="audioTableSmallEditIcon"
                    title="Change soundbank index"
                    alt="Change soundbank index"
                    onClick={async () => {
                      if (
                        await _changeSoundbankIndex(
                          audio,
                          tableIndex,
                          midiIndex,
                        )
                      ) {
                        this.forceUpdate();
                      }
                    }}
                  />
                </div>
              </>
            }
          />,
        );
      }
    }

    const soundRows = [];
    const soundTableCount = audio.getSoundTableCount();
    for (let t = 0; t < soundTableCount; t++) {
      if (t > 0) {
        soundRows.push(
          <tr key={t + "-s-hr"}>
            <td colSpan={2}>
              <hr />
            </td>
          </tr>,
        );
      }

      const table = audio.getSoundTable(t)!;
      const soundEffectNames = adapter.getSoundEffectMap(t);
      for (let s = 0; s < table.sounds.length; s++) {
        let isPlaying = false;
        let cannotPlay = false;
        if (this.state.playing) {
          isPlaying =
            t === this.state.playing[0] &&
            s === this.state.playing[1] &&
            this.state.playingType === "sound";
          cannotPlay = !isPlaying;
        }

        let trackName;
        const effectName = soundEffectNames[s];
        const index = `${s}, 0x${s.toString(16).toUpperCase()}`;
        if (effectName) {
          trackName = (
            <span title={index}>
              {effectName}
              {advancedSetting && (
                <span className="audioIndexBesideName">{` (${index})`}</span>
              )}
            </span>
          );
        } else {
          trackName = <span title={index}>{index}</span>;
        }

        const downloadName = effectName ? effectName : `${s}`;

        soundRows.push(
          <AudioTrackRow
            key={t + "-s-" + s}
            table={t}
            index={s}
            isPlaying={isPlaying}
            cannotPlay={cannotPlay}
            trackName={trackName}
            onPlay={this.onPlaySound}
            onStop={this.onStop}
            expandContent={
              <Button
                onClick={() => _exportWav(audio, t, s, downloadName)}
                css="btnAudioExport"
              >
                <img src={exportImage} height="16" width="16" alt="Export" />
                Download .wav
              </Button>
            }
          />,
        );
      }
    }

    return (
      <div className="audioViewContainer">
        <h2>Audio</h2>
        <p>This is an experimental audio player.</p>
        <h3>Sound Tracks</h3>
        <AudioEntryTable listing={sequenceRows} />
        <h3>Sound Effects</h3>
        <AudioEntryTable listing={soundRows} />
      </div>
    );
  }

  componentWillUnmount() {
    if (this.state.playbackController) {
      this.state.playbackController.stop();
    }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.setState({ hasError: true });
    console.error(error);
  }

  onPlayMidi = (table: number, index: number) => {
    const controller = playMidi(table, index);
    controller.addOnFinished(() => {
      this.setState({
        playbackController: null,
        playing: false,
      });
    });
    this.setState({
      playbackController: controller,
      playingType: "midi",
      playing: [table, index],
    });
  };

  onPlaySound = (table: number, index: number) => {
    const controller = playSound(table, index);
    controller.addOnFinished(() => {
      this.setState({
        playbackController: null,
        playing: false,
      });
    });
    this.setState({
      playbackController: controller,
      playingType: "sound",
      playing: [table, index],
    });
  };

  onStop = (table: number, index: number) => {
    if (this.state.playbackController) {
      this.state.playbackController.stop();
    }
  };
}

function AudioEntryTable(props: { listing: any }) {
  return (
    <table className="audioViewTable">
      {Array.isArray(props.listing) ? (
        <thead>
          <tr>
            <th className="audioViewTableIconColumn"></th>
            <th></th>
            <th className="audioViewTableIconColumn"></th>
          </tr>
        </thead>
      ) : null}
      <tbody>{props.listing}</tbody>
    </table>
  );
}

interface IAudioTrackRowProps {
  table: number;
  index: number;
  trackName: any;
  isPlaying: boolean;
  cannotPlay: boolean;
  expandContent?: any;
  onPlay(table: number, index: number): void;
  onStop(table: number, index: number): void;
}

function AudioTrackRow(props: IAudioTrackRowProps) {
  const [expanded, setExpanded] = useState(false);

  let playbackControls = <td></td>;
  if (props.isPlaying) {
    playbackControls = (
      <td>
        <img
          src={stopImage}
          alt="Stop audio"
          title="Stop audio"
          onClick={() => props.onStop(props.table, props.index)}
        />
      </td>
    );
  } else {
    const iconCssClass = props.cannotPlay ? "audioRowIconNoAction" : "";
    playbackControls = (
      <td>
        <img
          src={playImage}
          alt={`Play ${props.trackName}`}
          title={`Play ${props.trackName}`}
          className={iconCssClass}
          onClick={() => {
            if (props.cannotPlay) return;
            props.onPlay(props.table, props.index);
          }}
        />
      </td>
    );
  }

  const colCount =
    1 + (playbackControls ? 1 : 0) + (props.expandContent ? 1 : 0);

  let expandedRow;
  if (expanded && props.expandContent) {
    expandedRow = (
      <tr>
        <td colSpan={colCount} className="audioTableExpandedContent">
          {props.expandContent}
        </td>
      </tr>
    );
  }

  let rowClassName = "audioTableRow";
  if (expanded) {
    rowClassName += " audioTableRowExpanded";
  }

  return (
    <>
      <tr className={rowClassName}>
        {props.expandContent && (
          <td>
            <img
              src={expanded ? collapseImage : expandImage}
              alt={expanded ? "Collapse" : "Expand"}
              onClick={() => setExpanded((expanded) => !expanded)}
            />
          </td>
        )}
        <td>{props.trackName}</td>
        {playbackControls}
      </tr>
      {expandedRow}
    </>
  );
}

function _exportMidi(
  audio: Audio,
  table: number,
  index: number,
  name?: string,
): void {
  name = name || "music";
  const seqTable = audio.getSequenceTable(table)!;
  const gameMidiBuffer = seqTable.midis[index].buffer;
  const midi = parseGameMidi(
    new DataView(gameMidiBuffer),
    gameMidiBuffer.byteLength,
  );
  saveAs(new Blob([midi]), `${name}.mid`);
}

function _exportWav(
  audio: Audio,
  table: number,
  index: number,
  name?: string,
): void {
  name = name || "sound";
  const soundTable = audio.getSoundTable(table)!;
  const sound = soundTable.sounds[index];
  const wav = extractWavFromSound(soundTable.tbl, sound, sound.sampleRate);
  saveAs(new Blob([wav as ArrayBuffer]), `${name}.wav`);
}

function _replaceMidi(audio: Audio, table: number, index: number): void {
  const seqTable = audio.getSequenceTable(table)!;

  openFile("audio/midi", (event: any) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (error) => {
      assert(reader.result instanceof ArrayBuffer);
      const gameMidi = createGameMidi(reader.result as ArrayBuffer, {
        loop: true,
      });
      if (!gameMidi) {
        showMessage("Could not process midi for insertion into the game");
        return;
      }
      seqTable.midis[index].buffer = gameMidi;
    };
    reader.readAsArrayBuffer(file);
  });
}

async function _changeSoundbankIndex(
  audio: Audio,
  table: number,
  midiIndex: number,
): Promise<boolean> {
  const seqTable = audio.getSequenceTable(table)!;
  const bankCount = seqTable.soundbanks.banks.length;

  return await promptUser(
    `Enter new soundbank index (0 through ${bankCount - 1}):`,
  ).then((value) => {
    if (!value) {
      return false;
    }

    const newSoundbankIndex = parseInt(value);
    if (
      isNaN(newSoundbankIndex) ||
      newSoundbankIndex < 0 ||
      newSoundbankIndex >= bankCount
    ) {
      showMessage("Invalid soundbank index.");
      return false;
    }

    seqTable.midis[midiIndex].soundbankIndex = newSoundbankIndex;
    return true;
  });
}
