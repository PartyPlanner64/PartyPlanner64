import { BoardType, CostumeType, View } from "../../../packages/lib/types";
import {
  getCurrentBoard,
  IBoard,
  boardIsROM,
  currentBoardIsROM,
  BoardAudioType,
  IBoardAudioData,
  setBoardName,
  setBoardDescription,
  setBoardDifficulty,
  setBoardOtherBackground,
  setBoardAudio,
  IBoardAudioChanges,
  setBoardCostumeTypeIndex,
} from "../boards";
import * as React from "react";
import { make8Bit } from "../../../packages/lib/utils/img/RGBA32";
import { MPEditor, MPEditorDisplayMode } from "../texteditor";
import { openFile } from "../../../packages/lib/utils/input";
import { arrayBufferToDataURL } from "../../../packages/lib/utils/arrays";
import { getAdapter } from "../../../packages/lib/adapter/adapters";
import { changeView, promptUser, refresh, showMessage } from "../appControl";
import { getImageData } from "../../../packages/lib/utils/img/getImageData";
import { assert } from "../../../packages/lib/utils/debug";
import { romhandler } from "../../../packages/lib/romhandler";
import { $setting, get } from "./settings";
import { DetailsBoardStats } from "./details/stats";

import "../css/details.scss";

import editImage from "../img/audio/edit.png";
import audioImage from "../img/details/audio.png";
import deleteImage from "../img/details/delete.png";
import audioConfigImage from "../img/details/audioconfig.png";
import { IToggleItem, ToggleGroup } from "../controls";

type DetailsType =
  | "image"
  | "richtext"
  | "audio"
  | "difficulty"
  | "header"
  | "audioheader"
  | "stats"
  | "costume"
  | "br";

interface IDetailsItemBase {
  type: DetailsType;
  id?: string;
  desc?: string;
  maxlines?: number;
  width?: number;
  height?: number;
}

const _details_mp1: IDetailsItemBase[] = [
  { type: "header", desc: "Basic Info" },
  { type: "richtext", id: "detailBoardName", desc: "Board name", maxlines: 1 },
  {
    type: "richtext",
    id: "detailBoardDesc",
    desc: "Board description",
    maxlines: 2,
  },
  { type: "difficulty", id: "detailBoardDifficulty", desc: "Difficulty" },
  { type: "audioheader", desc: "Background Music" },
  { type: "audio", id: "detailBoardAudio", desc: "Background music" },
  { type: "header", desc: "Images" },
  {
    type: "image",
    id: "detailBoardSelectImg",
    desc: "Board select image",
    width: 128,
    height: 64,
  },
  {
    type: "image",
    id: "detailBoardLogoImg",
    desc: "Board logo",
    width: 250,
    height: 100,
  },
  { type: "br" },
  {
    type: "image",
    id: "detailBoardLargeSceneBg",
    desc: "Large scene background",
    width: 320,
    height: 240,
  },
  {
    type: "image",
    id: "detailBoardConversationBg",
    desc: "Conversation background",
    width: 320,
    height: 240,
  },
  {
    type: "image",
    id: "detailBoardSplashscreenBg",
    desc: "Splashscreen background",
    width: 320,
    height: 240,
  },
  { type: "header", desc: "Stats" },
  { type: "stats" },
];

const _details_mp2: IDetailsItemBase[] = [
  { type: "header", desc: "Basic Info" },
  { type: "richtext", id: "detailBoardName", desc: "Board name", maxlines: 1 },
  {
    type: "richtext",
    id: "detailBoardDesc",
    desc: "Board description",
    maxlines: 2,
  },
  { type: "difficulty", id: "detailBoardDifficulty", desc: "Difficulty" },
  { type: "costume", id: "detailBoardCostume", desc: "Costume Theme" },
  { type: "audioheader", desc: "Background Music" },
  { type: "audio", id: "detailBoardAudio", desc: "Background music" },
  { type: "header", desc: "Images" },
  {
    type: "image",
    id: "detailBoardSelectImg",
    desc: "Board select image",
    width: 64,
    height: 48,
  },
  {
    type: "image",
    id: "detailBoardSelectIcon",
    desc: "Board select icon",
    width: 32,
    height: 32,
  },
  {
    type: "image",
    id: "detailBoardLogoImg",
    desc: "Board logo",
    width: 260,
    height: 120,
  },
  { type: "br" },
  {
    type: "image",
    id: "detailBoardLargeSceneBg",
    desc: "Large scene background",
    width: 320,
    height: 240,
  },
  { type: "header", desc: "Stats" },
  { type: "stats" },
];

const _details_mp3: IDetailsItemBase[] = [
  { type: "header", desc: "Basic Info" },
  { type: "richtext", id: "detailBoardName", desc: "Board name", maxlines: 1 },
  {
    type: "richtext",
    id: "detailBoardDesc",
    desc: "Board description",
    maxlines: 2,
  },
  { type: "difficulty", id: "detailBoardDifficulty", desc: "Difficulty" },
  { type: "audioheader", desc: "Background Music" },
  { type: "audio", id: "detailBoardAudio", desc: "Background music" },
  { type: "header", desc: "Images" },
  {
    type: "image",
    id: "detailBoardSelectImg",
    desc: "Board select image",
    width: 64,
    height: 64,
  },
  {
    type: "image",
    id: "detailBoardLogoImg",
    desc: "Board logo (large)",
    width: 226,
    height: 120,
  },
  {
    type: "image",
    id: "detailBoardLogoTextImg",
    desc: "Board logo text",
    width: 226,
    height: 36,
  },
  { type: "br" },
  {
    type: "image",
    id: "detailBoardLogoMediumImg",
    desc: "Board logo (medium)",
    width: 150,
    height: 50,
  },
  {
    type: "image",
    id: "detailBoardLogoSmallImg",
    desc: "Board logo (small)",
    width: 100,
    height: 46,
  },
  { type: "br" },
  {
    type: "image",
    id: "detailBoardLargeSceneBg",
    desc: "Large scene background",
    width: 320,
    height: 240,
  },
  { type: "header", desc: "Stats" },
  { type: "stats" },
];

const _details_mp3_duel: IDetailsItemBase[] = [
  { type: "header", desc: "Basic Info" },
  { type: "richtext", id: "detailBoardName", desc: "Board name", maxlines: 1 },
  {
    type: "richtext",
    id: "detailBoardDesc",
    desc: "Board description",
    maxlines: 2,
  },
  { type: "difficulty", id: "detailBoardDifficulty", desc: "Difficulty" },
  { type: "header", desc: "Background Music" },
  { type: "audio", id: "detailBoardAudio", desc: "Background music" },
  { type: "header", desc: "Images" },
  {
    type: "image",
    id: "detailBoardSelectImg",
    desc: "Board select image",
    width: 64,
    height: 64,
  },
  {
    type: "image",
    id: "detailBoardLogoImg",
    desc: "Board logo",
    width: 226,
    height: 120,
  },
  {
    type: "image",
    id: "detailBoardLogoTextImg",
    desc: "Board logo text",
    width: 226,
    height: 36,
  },
];

function _getGameDetails(): IDetailsItemBase[] {
  const board = getCurrentBoard();
  const gameVersion = board.game;
  const boardType = board.type;
  switch (gameVersion) {
    case 1:
      return _details_mp1;
    case 2:
      return _details_mp2;
    case 3:
      switch (boardType) {
        case BoardType.DUEL:
          return _details_mp3_duel;
        default:
          return _details_mp3;
      }
  }
}

function _getValue(id: string | undefined, props: IDetailsProps) {
  switch (id) {
    case "detailBoardName":
      return props.board.name;
    case "detailBoardDesc":
      return props.board.description;
    case "detailBoardDifficulty":
      return props.board.difficulty;
    case "detailBoardCostume":
      return props.board.costumeTypeIndex;
    case "detailBoardSelectImg":
      return props.board.otherbg.boardselect;
    case "detailBoardSelectIcon":
      return props.board.otherbg.boardselecticon;
    case "detailBoardLogoImg":
      return props.board.otherbg.boardlogo;
    case "detailBoardLogoTextImg":
      return props.board.otherbg.boardlogotext;
    case "detailBoardLogoMediumImg":
      return props.board.otherbg.boardlogomedium;
    case "detailBoardLogoSmallImg":
      return props.board.otherbg.boardlogosmall;
    case "detailBoardAudio":
      return props.board.audioIndex;
    case "detailBoardLargeSceneBg":
      return props.board.otherbg.largescene;
    case "detailBoardConversationBg":
      return props.board.otherbg.conversation;
    case "detailBoardSplashscreenBg":
      return props.board.otherbg.splashscreen;
  }
  return "";
}

function _setValue(id: string, value: any, board: IBoard) {
  switch (id) {
    case "detailBoardName":
      setBoardName(value);
      refresh();
      break;
    case "detailBoardDesc":
      setBoardDescription(value);
      break;
    case "detailBoardDifficulty":
      setBoardDifficulty(value);
      break;
    case "detailBoardCostume":
      setBoardCostumeTypeIndex(value);
      break;
    case "detailBoardSelectImg":
      setBoardOtherBackground("boardselect", value);
      break;
    case "detailBoardSelectIcon":
      setBoardOtherBackground("boardselecticon", value);
      break;
    case "detailBoardLogoImg":
      setBoardOtherBackground("boardlogo", value);
      break;
    case "detailBoardLogoTextImg":
      setBoardOtherBackground("boardlogotext", value);
      break;
    case "detailBoardLogoMediumImg":
      setBoardOtherBackground("boardlogomedium", value);
      break;
    case "detailBoardLogoSmallImg":
      setBoardOtherBackground("boardlogosmall", value);
      break;
    case "detailBoardLargeSceneBg":
      setBoardOtherBackground("largescene", value);
      break;
    case "detailBoardConversationBg":
      setBoardOtherBackground("conversation", value);
      break;
    case "detailBoardSplashscreenBg":
      setBoardOtherBackground("splashscreen", value);
      break;
    case "detailBoardAudio":
      {
        const audioChanges = value as IBoardAudioChanges;
        setBoardAudio(audioChanges);
        refresh();
      }
      break;
  }
}

function _processImage(id: string, buffer: ArrayBuffer) {
  if (id === "detailBoardSelectImg" && getCurrentBoard().game === 1) {
    // Apply masking
    const rgba32 = new Uint32Array(buffer);

    // Do the two full rows on each edge...
    for (let y = 0; y < 128; y++) {
      rgba32[y] = 0; // 1st row
      rgba32[y + 128] = 0; // 2nd row
      rgba32[y + 128 * 62] = 0; // 2nd to last row
      rgba32[y + 128 * 63] = 0; // last row
    }

    // Then round the corners
    for (let y = 0; y < 6; y++) {
      rgba32[y + 128 * 2] = 0; // Upper left corner
      rgba32[y + 128 * 2 + 122] = 0; // Upper right corner
      rgba32[y + 128 * 61] = 0; // Lower left corner
      rgba32[y + 128 * 61 + 122] = 0; // Lower right corner
    }
    for (let y = 0; y < 4; y++) {
      rgba32[y + 128 * 3] = 0; // Upper left corner
      rgba32[y + 128 * 3 + 124] = 0; // Upper right corner
      rgba32[y + 128 * 60] = 0; // Lower left corner
      rgba32[y + 128 * 60 + 124] = 0; // Lower right corner
    }
    for (let y = 0; y < 3; y++) {
      rgba32[y + 128 * 4] = 0; // Upper left corner
      rgba32[y + 128 * 4 + 125] = 0; // Upper right corner
      rgba32[y + 128 * 59] = 0; // Lower left corner
      rgba32[y + 128 * 59 + 125] = 0; // Lower right corner
    }
    for (let y = 0; y < 2; y++) {
      rgba32[y + 128 * 5] = 0; // Upper left corner
      rgba32[y + 128 * 5 + 126] = 0; // Upper right corner
      rgba32[y + 128 * 58] = 0; // Lower left corner
      rgba32[y + 128 * 58 + 126] = 0; // Lower right corner

      rgba32[y + 128 * 6] = 0; // Upper left corner
      rgba32[y + 128 * 6 + 126] = 0; // Upper right corner
      rgba32[y + 128 * 57] = 0; // Lower left corner
      rgba32[y + 128 * 57 + 126] = 0; // Lower right corner
    }
    rgba32[128 * 7] = 0; // Upper left corner
    rgba32[128 * 7 + 127] = 0; // Upper right corner
    rgba32[128 * 56] = 0; // Lower left corner
    rgba32[128 * 56 + 127] = 0; // Lower right corner

    rgba32[128 * 8] = 0; // Upper left corner
    rgba32[128 * 8 + 127] = 0; // Upper right corner
    rgba32[128 * 55] = 0; // Lower left corner
    rgba32[128 * 55 + 127] = 0; // Lower right corner

    // Validate that the image meets the color limits
    // Technically this is 256 colors when split into 4 tiles
    const colors: { [color: number]: boolean } = {};
    for (let y = 0; y < 32; y++) {
      for (let x = 0; x < 64; x++) {
        colors[rgba32[y * 128 + x]] = true;
      }
    }
    const colors2: { [color: number]: boolean } = {};
    for (let y = 0; y < 32; y++) {
      for (let x = 64; x < 128; x++) {
        colors2[rgba32[y * 128 + 64 + x]] = true;
      }
    }
    const colors3: { [color: number]: boolean } = {};
    for (let y = 32; y < 64; y++) {
      for (let x = 0; x < 64; x++) {
        colors3[rgba32[y * 128 + x]] = true;
      }
    }
    const colors4: { [color: number]: boolean } = {};
    for (let y = 32; y < 64; y++) {
      for (let x = 64; x < 128; x++) {
        colors4[rgba32[y * 128 + 64 + x]] = true;
      }
    }

    if (
      Object.keys(colors).length > 256 ||
      Object.keys(colors2).length > 256 ||
      Object.keys(colors3).length > 256 ||
      Object.keys(colors4).length > 256
    ) {
      showMessage(
        `Sorry, but the palette limit for this image is 256 unique colors. For now, the image has been reduced to 8-bit, but most image editors should be able to reduce the palette for you with higher quality.`,
      );
      make8Bit(rgba32, 128, 64);
    }
  }
  return buffer;
}

interface IDetailsProps {
  board: IBoard;
}

export class Details extends React.Component<IDetailsProps> {
  state = {};

  onTextChange = (id: string, event: any) => {
    _setValue(id, event.target.value, this.props.board);
    this.forceUpdate();
  };

  onRichTextChange = (id: string, value: any) => {
    _setValue(id, value, this.props.board);
    this.forceUpdate();
  };

  onValueChange = (id: string, value: any) => {
    _setValue(id, value, this.props.board);
    this.forceUpdate();
  };

  render() {
    if (!this.props.board) return null;
    let keyId = 0;
    const readonly = boardIsROM(this.props.board);
    const formEls = _getGameDetails().map((detail) => {
      const value = _getValue(detail.id, this.props);
      switch (detail.type) {
        case "richtext": {
          const displayMode = readonly
            ? MPEditorDisplayMode.Readonly
            : MPEditorDisplayMode.Edit;
          return (
            <div className="detailRichTextContainer" key={detail.id}>
              <label htmlFor={detail.id}>{detail.desc}</label>
              <MPEditor
                id={detail.id}
                value={value as string}
                showToolbar={!readonly}
                displayMode={displayMode}
                maxlines={detail.maxlines || 0}
                itemBlacklist={["COLOR", "ADVANCED", "DARKLIGHT"]}
                onValueChange={this.onRichTextChange}
              />
            </div>
          );
        }
        case "image":
          return (
            <DetailsImage
              id={detail.id!}
              desc={detail.desc!}
              readonly={readonly}
              value={value as string}
              key={detail.id}
              onImageSelected={this.onValueChange}
              width={detail.width!}
              height={detail.height!}
            />
          );
        case "audio":
          return (
            <DetailsAudio
              id={detail.id!}
              desc={detail.desc!}
              readonly={readonly}
              value={value as number}
              key={detail.id}
              onAudioSelected={this.onValueChange}
              onAudioDeleted={(id, index) =>
                this.onValueChange(id, {
                  customAudioIndex: index,
                  delete: true,
                })
              }
            />
          );
        case "difficulty":
          return (
            <DetailsDifficulty
              id={detail.id!}
              desc={detail.desc!}
              readonly={readonly}
              value={value}
              key={detail.id}
              onDifficultySelected={this.onValueChange}
            />
          );
        case "costume":
          return (
            <DetailsCostumeType
              id={detail.id!}
              desc={detail.desc!}
              readonly={readonly}
              costumeType={value as CostumeType}
              key={detail.id}
              onCostumeTypeSelected={(type) =>
                this.onValueChange(detail.id!, type)
              }
            />
          );
        case "stats":
          return <DetailsBoardStats key={"stats" + keyId++} />;
        case "header":
          return <h2 key={"header" + keyId++}>{detail.desc!}</h2>;
        case "audioheader":
          return (
            <div key={"header" + keyId++} className="detailsAudioHeaderDiv">
              <h2 className="detailsAudioHeader">
                {detail.desc!}
                <AudioSelectionConfigButton board={this.props.board} />
              </h2>
            </div>
          );
        case "br":
          return <br key={"br" + keyId++} />;
      }
      return null;
    });
    return <div id="detailsForm">{formEls}</div>;
  }
}

interface IDetailsImageProps {
  id: string;
  desc: string;
  readonly: boolean;
  width: number;
  height: number;
  value: string;
  onImageSelected(id: string, src: string): any;
}

class DetailsImage extends React.Component<IDetailsImageProps> {
  handleClick = () => {
    if (currentBoardIsROM()) return;

    openFile("image/*", this.imageSelected.bind(this));
  };

  imageSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const onImageSelected = this.props.onImageSelected;
      const id = this.props.id;
      const width = this.props.width;
      const height = this.props.height;

      const imgData = await getImageData(
        reader.result as string,
        width,
        height,
      );
      let rgba32 = imgData.data.buffer;

      // Extra level of indirection so we can manipulate the image sometimes.
      rgba32 = _processImage(id, rgba32);

      const newSrc = arrayBufferToDataURL(rgba32, width, height);
      onImageSelected(id, newSrc);
    };
    reader.readAsDataURL(file);
  }

  render() {
    const id = this.props.id;
    const desc = this.props.desc;
    const width = this.props.width;
    const height = this.props.height;

    let hoverCover = null;
    if (!this.props.readonly) {
      const hoverCoverSize = `${width} × ${height}`;
      if (width > 100 && height > 50) {
        const hoverCoverMsg = "Choose a new image";
        hoverCover = (
          <div className="detailImgHoverCover">
            <span>{hoverCoverMsg}</span>
            <br />
            <span className="detailImgHoverCoverSize">{hoverCoverSize}</span>
          </div>
        );
      } else {
        hoverCover = (
          <div className="detailImgHoverCover" title={hoverCoverSize}></div>
        );
      }
    }

    const imgSelectStyle = {
      width,
      height,
      minWidth: width,
      minHeight: height,
    };
    return (
      <div className="detailImgContainer">
        <label>{desc}</label>
        <div
          className="detailImgSelect"
          style={imgSelectStyle}
          onClick={this.handleClick}
        >
          {this.props.value ? (
            <img
              id={id}
              className="detailImg"
              height={height}
              width={width}
              style={imgSelectStyle}
              src={this.props.value}
              alt={desc}
            />
          ) : (
            <div className="detailImg" style={imgSelectStyle}></div>
          )}
          {hoverCover}
        </div>
      </div>
    );
  }
}

interface IDetailsAudioProps {
  id: string;
  desc: string;
  readonly: boolean;
  value: number;
  onAudioSelected(id: string, changes: IBoardAudioChanges): any;
  onAudioDeleted(id: string, customAudioIndex: number): void;
}

class DetailsAudio extends React.Component<IDetailsAudioProps> {
  state = {};

  onGameMusicIndexSelection = (e: any) => {
    this.props.onAudioSelected(this.props.id, {
      gameAudioIndex: parseInt(e.target.value),
    });
  };

  onAudioTypeChanged = (audioType: BoardAudioType) => {
    this.props.onAudioSelected(this.props.id, {
      audioType,
    });
  };

  onMidiPrompt = async (customAudioIndex: number) => {
    openFile("audio/midi", (event: any) => {
      const file = event.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (error) => {
        assert(typeof reader.result === "string");
        this.props.onAudioSelected(this.props.id, {
          customAudioIndex,
          midiName: file.name,
          midiData: reader.result,
        });
      };
      reader.readAsDataURL(file);
    });
  };

  onSoundbankIndexPrompt = async (customAudioIndex: number) => {
    let upperBound = 0;
    if (
      romhandler.romIsLoaded() &&
      romhandler.getGameVersion() === getCurrentBoard().game
    ) {
      const seqTable = romhandler.getRom()!.getAudio().getSequenceTable(0)!;
      upperBound = seqTable.soundbanks.banks.length - 1;
    }

    return await promptUser(
      `Enter new soundbank index${
        upperBound ? ` (0 through ${upperBound})` : ""
      }:`,
    ).then((value) => {
      if (!value) {
        return;
      }

      const newSoundbankIndex = parseInt(value);
      if (
        isNaN(newSoundbankIndex) ||
        (upperBound && newSoundbankIndex > upperBound)
      ) {
        showMessage("Invalid soundbank index.");
        return;
      }

      this.props.onAudioSelected(this.props.id, {
        customAudioIndex,
        soundbankIndex: newSoundbankIndex,
      });
    });
  };

  onDeleteAudioEntry = (customAudioIndex: number) => {
    this.props.onAudioDeleted(this.props.id, customAudioIndex);
  };

  render() {
    const currentBoard = getCurrentBoard();

    let audioInputUI;
    switch (currentBoard.audioType) {
      case BoardAudioType.InGame:
        {
          let index = 0;
          const audioNames = getAdapter(currentBoard.game, {})!.getAudioMap(0);
          const audioOptions = audioNames.map((song: string) => {
            const curIndex = index++;
            if (!song) return null;
            return (
              <option value={curIndex} key={curIndex}>
                {song}
              </option>
            );
          });
          audioInputUI = (
            <select
              className="audioSelect"
              value={this.props.value}
              disabled={this.props.readonly}
              onChange={this.onGameMusicIndexSelection}
            >
              {audioOptions}
            </select>
          );
        }
        break;

      case BoardAudioType.Custom:
        audioInputUI = currentBoard.audioData!.map((audioEntry, i) => (
          <DetailsCustomAudioEntry
            key={i + audioEntry.name}
            audioEntry={audioEntry}
            canDelete
            onDeleteAudioEntry={() => this.onDeleteAudioEntry(i)}
            onMidiPrompt={() => this.onMidiPrompt(i)}
            onSoundbankIndexPrompt={() => this.onSoundbankIndexPrompt(i)}
          />
        ));
        audioInputUI.push(
          <DetailsCustomAudioEntry
            key="newentry"
            audioEntry={{
              name: "",
              data: "",
              soundbankIndex: 0,
            }}
            canDelete={false}
            onMidiPrompt={() =>
              this.onMidiPrompt(currentBoard.audioData!.length)
            }
            onSoundbankIndexPrompt={() =>
              this.onSoundbankIndexPrompt(currentBoard.audioData!.length)
            }
          />,
        );
        break;
    }

    return (
      <div className="audioDetailsContainer">
        <div className="audioDetailsRadioGroup">
          <input
            type="radio"
            id={this.props.id + "-romaudio"}
            value="romaudio"
            checked={currentBoard.audioType === BoardAudioType.InGame}
            onChange={() => this.onAudioTypeChanged(BoardAudioType.InGame)}
          />
          <label htmlFor={this.props.id + "-romaudio"}>
            In-Game Music Track
          </label>

          <input
            type="radio"
            id={this.props.id + "-custom"}
            value="custom"
            checked={currentBoard.audioType === BoardAudioType.Custom}
            onChange={() => this.onAudioTypeChanged(BoardAudioType.Custom)}
          />
          <label htmlFor={this.props.id + "-custom"}>Custom Audio</label>
        </div>
        {audioInputUI}
      </div>
    );
  }
}

interface IDetailsCustomAudioEntry {
  audioEntry: IBoardAudioData;
  canDelete: boolean;
  onDeleteAudioEntry?(): void;
  onMidiPrompt(): void;
  onSoundbankIndexPrompt(): void;
}

function DetailsCustomAudioEntry(props: IDetailsCustomAudioEntry) {
  const name = props.audioEntry.name || "(select a midi file)";
  const hasData = !!props.audioEntry.data;

  return (
    <div className="audioCustomEntry">
      <img
        src={audioImage}
        className="audioCustomIcon audioCustomIconAudio"
        title="Custom audio track"
        alt="Custom audio track"
      />
      <div className="audioCustomTextSections">
        <div className="audioCustomSection">
          <span className="detailsSpan">{name}</span>
          <img
            src={editImage}
            className="audioDetailsSmallEditIcon"
            title="Upload midi file"
            alt="Upload midi file"
            onClick={props.onMidiPrompt}
            tabIndex={0}
          />
        </div>
        {hasData && (
          <div className="audioCustomSection">
            <label>Soundbank index: </label>
            <span className="detailsSpan">
              {props.audioEntry.soundbankIndex || 0}
            </span>
            <img
              src={editImage}
              className="audioDetailsSmallEditIcon"
              title="Change soundbank index"
              alt="Change soundbank index"
              onClick={props.onSoundbankIndexPrompt}
              tabIndex={0}
            />
          </div>
        )}
      </div>
      {props.canDelete && (
        <img
          src={deleteImage}
          onClick={props.onDeleteAudioEntry}
          className="audioCustomIcon audioCustomIconDelete"
          title="Remove audio track"
          alt="Remove audio track"
          tabIndex={0}
        />
      )}
    </div>
  );
}

interface IAudioSelectionConfigButtonProps {
  board: IBoard;
}

function AudioSelectionConfigButton(props: IAudioSelectionConfigButtonProps) {
  if (boardIsROM(props.board)) {
    return null;
  }
  if (!get($setting.uiAdvanced)) {
    return null;
  }

  return (
    <div
      className="audioSelectConfigButton"
      title="Add custom code for choosing the music to play each turn"
      tabIndex={0}
      onClick={() => changeView(View.AUDIO_SELECTION_CODE)}
    >
      <img src={audioConfigImage} alt="Configure audio selection" />
    </div>
  );
}

interface IDetailsDifficultyProps {
  id: string;
  desc: string;
  readonly: boolean;
  value: any;
  onDifficultySelected(id: string, level: number): any;
}

interface IDetailsDifficultyState {
  focusedLevel: number;
}

class DetailsDifficulty extends React.Component<
  IDetailsDifficultyProps,
  IDetailsDifficultyState
> {
  constructor(props: IDetailsDifficultyProps) {
    super(props);
    this.state = { focusedLevel: 0 };
  }

  onSelection = (level: number) => {
    if (this.props.readonly) return;
    this.props.onDifficultySelected(this.props.id, level);
  };

  onDifficultyFocused = (level: number) => {
    if (this.props.readonly) return;
    this.setState({ focusedLevel: level });
  };

  render() {
    const levels = [];
    for (let i = 1; i <= 5; i++) {
      levels.push(
        <DetailsDifficultyLevel
          level={i}
          key={i.toString()}
          readonly={this.props.readonly}
          currentLevel={this.props.value}
          focusedLevel={this.state.focusedLevel}
          onDifficultyLevelSelected={this.onSelection}
          onDifficultyFocused={this.onDifficultyFocused}
        />,
      );
    }

    return (
      <div className="difficultyDetailsContainer">
        <label>{this.props.desc}</label>
        <div className="difficultyDetailsLevels">{levels}</div>
      </div>
    );
  }
}

interface IDetailsDifficultyLevelProps {
  level: number;
  currentLevel: number;
  focusedLevel: number;
  readonly: boolean;
  onDifficultyLevelSelected(level: number): any;
  onDifficultyFocused(level: number): any;
}

class DetailsDifficultyLevel extends React.Component<IDetailsDifficultyLevelProps> {
  state = {};

  onClick = () => {
    if (this.props.readonly) return;
    this.props.onDifficultyLevelSelected(this.props.level);
  };

  onMouseEnter = () => {
    if (this.props.readonly) return;
    this.props.onDifficultyFocused(this.props.level);
  };

  onMouseLeave = () => {
    if (this.props.readonly) return;
    this.props.onDifficultyFocused(0);
  };

  render() {
    let className = "difficultyDetailsLevel";
    if (!this.props.readonly) {
      if (this.props.level <= this.props.currentLevel)
        className += " difficultyLevelCurrent";
      if (
        this.props.focusedLevel > 0 &&
        this.props.level <= this.props.focusedLevel
      )
        className += " difficultyLevelFocused";
    }
    return (
      <div
        className={className}
        onClick={this.onClick}
        onMouseEnter={this.onMouseEnter}
        onMouseLeave={this.onMouseLeave}
      ></div>
    );
  }
}

const CostumeTypesArr = [
  CostumeType.NORMAL,
  CostumeType.WESTERN,
  CostumeType.PIRATE,
  CostumeType.HORROR,
  CostumeType.SPACE,
  CostumeType.MYSTERY,
];

const CostumeTypeDescriptions = {
  [CostumeType.NORMAL]: "Normal",
  [CostumeType.WESTERN]: "Western",
  [CostumeType.PIRATE]: "Pirate",
  [CostumeType.HORROR]: "Horror",
  [CostumeType.SPACE]: "Space",
  [CostumeType.MYSTERY]: "Mystery",
};

interface IDetailsCostumeTypeProps {
  costumeType: CostumeType;
  id: string;
  desc: string;
  readonly: boolean;
  onCostumeTypeSelected(costumeType: CostumeType): void;
}

function DetailsCostumeType(props: IDetailsCostumeTypeProps) {
  const costumeOptions: IToggleItem<CostumeType>[] = [];
  for (const costumeType of CostumeTypesArr) {
    costumeOptions.push({
      id: costumeType,
      selected:
        props.costumeType === costumeType ||
        (typeof props.costumeType === "undefined" &&
          costumeType === CostumeType.NORMAL),
      text: CostumeTypeDescriptions[costumeType],
    });
  }

  return (
    <div className="difficultyDetailsContainer">
      <label>{props.desc}</label>
      <ToggleGroup<CostumeType>
        items={costumeOptions}
        allowDeselect={false}
        readonly={props.readonly}
        onToggleClick={(costumeType) =>
          props.onCostumeTypeSelected(costumeType)
        }
      />
    </div>
  );
}
