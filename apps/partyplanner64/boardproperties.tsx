import * as React from "react";
import { useCallback } from "react";
import { playAnimation, stopAnimation, animationPlaying } from "./renderer";
import {
  addAnimBG,
  removeAnimBG,
  setBG,
  addAdditionalBG,
  removeAdditionalBG,
  boardIsROM,
  addEventToBoard,
  removeEventFromBoard,
} from "./boards";
import { openFile } from "../../packages/lib/utils/input";
import {
  BoardType,
  View,
  EditorEventActivationType,
} from "../../packages/lib/types";
import { $$log } from "../../packages/lib/utils/debug";
import {
  changeView,
  highlightSpaces,
  promptUser,
  setHoveredBoardEvent,
  setOverrideBg,
} from "./appControl";
import { $setting, get } from "./views/settings";
import { isDebug } from "./debug";
import { SectionHeading } from "./propertiesshared";
import { useForceUpdate } from "./utils/react";
import { createEventInstance, IEvent } from "../../packages/lib/events/events";
import { EventsList } from "./components/EventList";

import boardImage from "./img/header/board.png";
import setbgImage from "./img/header/setbg.png";
import editdetailsImage from "./img/header/editdetails.png";
import deadendImage from "./img/editor/boardproperties/deadend.png";
import animaddImage from "./img/toolbar/animadd.png";
import { store } from "./store";
import {
  setBoardEventActivationTypeAction,
  setBoardEventEventParameterAction,
} from "./boardState";
import { useAppSelector, useCurrentBoard } from "./hooks";
import {
  getDeadEnds,
  IBoard,
  IEventInstance,
  supportsAdditionalBackgrounds,
  supportsAnimationBackgrounds,
} from "../../packages/lib/boards";

interface IBoardPropertiesProps {
  currentBoard: IBoard;
}

export class BoardProperties extends React.Component<IBoardPropertiesProps> {
  state = {};

  render() {
    const board = this.props.currentBoard;
    const romBoard = boardIsROM(board);

    let animationBGList;
    if (supportsAnimationBackgrounds(board)) {
      animationBGList = (
        <BackgroundList
          list="animbg"
          title="Animation Backgrounds"
          onAddBackground={this.onAddAnimBG}
          onRemoveBackground={this.onRemoveAnimBG}
          onSetOverrideBackground={this.onSetOverrideBackground}
        >
          <AnimationPlayButton board={board} />
        </BackgroundList>
      );
    }

    let additionalBGList;
    if (supportsAdditionalBackgrounds(board)) {
      const advanced = !!get($setting.uiAdvanced);
      const hasBgs = board.additionalbg && board.additionalbg.length;
      const hasBgCode = !!board.additionalbgcode;
      additionalBGList = (advanced || hasBgs || hasBgCode) && (
        <BackgroundList
          list="additionalbg"
          title="Additional Backgrounds"
          onAddBackground={this.onAddAdditionalBG}
          onRemoveBackground={this.onRemoveAdditionalBG}
          onSetOverrideBackground={this.onSetOverrideBackground}
        >
          <AdditionalBackgroundConfigButton />
        </BackgroundList>
      );
    }

    return (
      <div className="properties">
        {isDebug() && <FindSpace />}
        <EditDetails romBoard={romBoard} />
        {!romBoard && (
          <BGSelect gameVersion={board.game} boardType={board.type} />
        )}
        {!romBoard && <CheckDeadEnds board={this.props.currentBoard} />}
        {animationBGList}
        {additionalBGList}
        {!romBoard && <BoardEventList board={board} />}
      </div>
    );
  }

  onAddAnimBG = (bg: string) => {
    addAnimBG(bg);
    this.forceUpdate();
  };

  onRemoveAnimBG = (index: number) => {
    removeAnimBG(index);
    this.forceUpdate();
  };

  onAddAdditionalBG = (bg: string) => {
    addAdditionalBG(bg);
    this.forceUpdate();
  };

  onRemoveAdditionalBG = (index: number) => {
    removeAdditionalBG(index);
    this.forceUpdate();
  };

  onSetOverrideBackground = (bg: string | null) => {
    setOverrideBg(bg);
    this.forceUpdate();
  };
}

interface IBGSelectProps {
  gameVersion: number;
  boardType: BoardType;
}

const BGSelect = class BGSelect extends React.Component<IBGSelectProps> {
  state = {};

  onChangeBg = () => {
    openFile("image/*", this.bgSelected);
  };

  bgSelected = (event: any) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (error) => {
      setBG(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  render() {
    let title;
    switch (this.props.gameVersion) {
      case 1:
        title = "960 x 720";
        break;
      case 2:
      case 3:
        if (this.props.boardType === BoardType.DUEL) title = "896 x 672";
        else title = "1152 x 864";
        break;
    }

    return (
      <div
        className="propertiesActionButton"
        onClick={this.onChangeBg}
        title={title}
      >
        <img
          src={setbgImage}
          className="propertiesActionButtonImg"
          width="24"
          height="24"
          alt=""
        />
        <span className="propertiesActionButtonSpan">
          Change main background
        </span>
      </div>
    );
  }
};

interface IEditDetailsProps {
  romBoard: boolean;
}

function EditDetails(props: IEditDetailsProps) {
  const onEditDetails = useCallback(() => {
    changeView(View.DETAILS);
  }, []);

  const text = props.romBoard ? "View board details" : "Edit board details";
  return (
    <div className="propertiesActionButton" onClick={onEditDetails}>
      <img
        src={editdetailsImage}
        className="propertiesActionButtonImg"
        width="24"
        height="24"
        alt=""
      />
      <span className="propertiesActionButtonSpan">{text}</span>
    </div>
  );
}

interface ICheckDeadEndsProps {
  board: IBoard;
}

class CheckDeadEnds extends React.Component<ICheckDeadEndsProps> {
  private _noDeadEndsTimeout: any;

  state = {
    noDeadEnds: false, // Set to true briefly after running
  };

  checkForDeadEnds = () => {
    const deadEnds = getDeadEnds(this.props.board);
    $$log("Dead ends", deadEnds);

    if (deadEnds.length) {
      highlightSpaces(deadEnds);
    } else {
      this.setState({ noDeadEnds: true });
      this._noDeadEndsTimeout = setTimeout(() => {
        delete this._noDeadEndsTimeout;
        this.setState({ noDeadEnds: false });
      }, 1000);
    }
  };

  componentWillUnmount() {
    if (this._noDeadEndsTimeout) {
      delete this._noDeadEndsTimeout;
      clearTimeout(this._noDeadEndsTimeout);
    }
  }

  render() {
    let text, handler;
    if (this.state.noDeadEnds) {
      text = "✓ No dead ends";
    } else {
      text = "Check for dead ends";
      handler = this.checkForDeadEnds;
    }
    return (
      <div className="propertiesActionButton" onClick={handler}>
        <img
          src={deadendImage}
          className="propertiesActionButtonImg"
          width="24"
          height="24"
          alt=""
        />
        <span className="propertiesActionButtonSpan">{text}</span>
      </div>
    );
  }
}

interface IBackgroundListProps {
  children?: React.ReactNode;
  list: "animbg" | "additionalbg";
  title: string;
  onAddBackground(bg: string): void;
  onRemoveBackground(index: number): void;
  onSetOverrideBackground(bg: string | null): void;
}

const BackgroundList: React.FC<IBackgroundListProps> = (props) => {
  const board = useCurrentBoard();
  const overrideBg = useAppSelector((state) => state.app.overrideBg);

  const bgs = board[props.list] || [];
  let i = 0;
  const entries = bgs.map((bg) => {
    i++;
    return (
      <BackgroundListEntry
        bg={bg}
        text={"Background " + i}
        key={i}
        index={i - 1}
        showing={bg === overrideBg}
        onRemoveBackground={props.onRemoveBackground}
        onSetOverrideBackground={props.onSetOverrideBackground}
      />
    );
  });

  const romBoard = boardIsROM(board);

  let addButton;
  if (!romBoard) {
    addButton = <AddBackgroundButton onAddBackground={props.onAddBackground} />;
  }

  if (!addButton && !entries.length) {
    return null;
  }

  return (
    <div className="propertiesAnimationBGList">
      <SectionHeading text={props.title}>{props.children}</SectionHeading>
      {entries}
      {addButton}
    </div>
  );
};

interface IBackgroundListEntryProps {
  bg: string;
  index: number;
  text: string;
  showing: boolean;
  onRemoveBackground(index: number): void;
  onSetOverrideBackground(bg: string | null): void;
}

class BackgroundListEntry extends React.Component<IBackgroundListEntryProps> {
  state = {};

  onRemove = (event: React.MouseEvent) => {
    event.stopPropagation();
    this.props.onRemoveBackground(this.props.index);
    if (this.props.showing) {
      this.props.onSetOverrideBackground(null);
    }
  };

  onEyeClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!animationPlaying()) {
      this.props.onSetOverrideBackground(
        this.props.showing ? null : this.props.bg,
      );
    }
  };

  render() {
    let eyeClassName = "propertiesActionButtonEyeBtn";
    if (this.props.showing) {
      eyeClassName += " propertiesActionButtonEyeBtnShowing";
    }
    return (
      <div className="propertiesActionButton">
        <img
          src={this.props.bg}
          className="propertiesActionButtonImg"
          width="24"
          height="24"
          alt=""
        />
        <span className="propertiesActionButtonSpan">{this.props.text}</span>
        <span className="propertiesActionButtonSpacer" />
        <div
          role="button"
          onClick={this.onEyeClick}
          className={eyeClassName}
          title="Show this background until dismissed"
        ></div>
        <div
          role="button"
          className="propertiesActionButtonDeleteBtn"
          onClick={this.onRemove}
          title="Remove this background"
        ></div>
      </div>
    );
  }
}

interface IAddBackgroundButtonProps {
  onAddBackground(bg: string): void;
}

class AddBackgroundButton extends React.Component<IAddBackgroundButtonProps> {
  state = {};

  onAddAnimBg = () => {
    openFile("image/*", this.bgSelected);
  };

  bgSelected = (event: any) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (error) => {
      this.props.onAddBackground(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  render() {
    return (
      <div className="propertiesActionButton" onClick={this.onAddAnimBg}>
        <img
          src={animaddImage}
          className="propertiesActionButtonImg"
          width="24"
          height="24"
          alt=""
        />
        <span className="propertiesActionButtonSpan">Add background</span>
      </div>
    );
  }
}

interface IAnimationPlayButtonProps {
  board: IBoard;
}

interface IAnimationPlayButtonState {
  playing: boolean;
}

class AnimationPlayButton extends React.Component<
  IAnimationPlayButtonProps,
  IAnimationPlayButtonState
> {
  constructor(props: IAnimationPlayButtonProps) {
    super(props);

    this.state = {
      playing: animationPlaying(),
    };
  }

  render() {
    if (!this.props.board.animbg || !this.props.board.animbg.length) {
      return null;
    }

    const icon = this.state.playing ? "▮▮" : "►";
    return (
      <div className="bgListActionButton" onClick={this.onClick}>
        {icon}
      </div>
    );
  }

  onClick = () => {
    this.setState({ playing: !this.state.playing });

    if (!this.state.playing) playAnimation();
    else stopAnimation();
  };

  componentWillUnmount() {
    stopAnimation();
  }
}

function AdditionalBackgroundConfigButton() {
  const onClick = useCallback(() => {
    changeView(View.ADDITIONAL_BGS);
  }, []);

  const icon = "\u2699"; // Gear
  return (
    <div
      className="bgListActionButton"
      title="Configure additional background usage"
      onClick={onClick}
    >
      {icon}
    </div>
  );
}

class FindSpace extends React.Component<{}> {
  state = {};

  async onFindSpace() {
    const value = await promptUser("Enter a space index:");
    if (value) {
      const spaceIndex = parseInt(value);
      if (!isNaN(spaceIndex)) {
        highlightSpaces([spaceIndex]);
      }
    }
  }

  render() {
    return (
      <div className="propertiesActionButton" onClick={this.onFindSpace}>
        <img
          src={boardImage}
          className="propertiesActionButtonImg"
          width="24"
          height="24"
          alt=""
        />
        <span className="propertiesActionButtonSpan">Find space by index</span>
      </div>
    );
  }
}

function getAvailableBoardActivationTypes(
  board: IBoard,
): EditorEventActivationType[] {
  if (board.game === 3) {
    return [
      EditorEventActivationType.BEFORE_TURN,
      EditorEventActivationType.AFTER_TURN,
      EditorEventActivationType.BEFORE_PLAYER_TURN,
      EditorEventActivationType.BEFORE_DICE_ROLL,
    ];
  }

  // AFTER_TURN is not confirmed in other games besides 3.
  return [
    EditorEventActivationType.BEFORE_TURN,
    EditorEventActivationType.BEFORE_PLAYER_TURN,
    EditorEventActivationType.BEFORE_DICE_ROLL,
  ];
}

interface IBoardEventListProps {
  board: IBoard;
}

const BoardEventList: React.FC<IBoardEventListProps> = (props) => {
  const forceUpdate = useForceUpdate();

  function onEventAdded(event: IEvent) {
    const eventInstance = createEventInstance(event, {
      activationType: EditorEventActivationType.BEFORE_PLAYER_TURN,
    });
    addEventToBoard(eventInstance);
    forceUpdate();
  }

  function onEventDeleted(event: IEventInstance, eventIndex: number) {
    removeEventFromBoard(eventIndex);
    forceUpdate();
  }

  function onEventMouseEnter(event: IEventInstance, eventIndex: number) {
    setHoveredBoardEvent(eventIndex);
  }

  function onEventMouseLeave(event: IEventInstance) {
    setHoveredBoardEvent(-1);
  }

  function onEventActivationTypeToggle(
    event: IEventInstance,
    eventIndex: number,
  ) {
    const availableTypes = getAvailableBoardActivationTypes(props.board);
    const curTypeIndex = availableTypes.indexOf(event.activationType);
    if (curTypeIndex === -1) {
      throw new Error(
        `Unexpected board event activation type ${event.activationType}`,
      );
    }

    const activationType =
      availableTypes[(curTypeIndex + 1) % availableTypes.length];
    store.dispatch(
      setBoardEventActivationTypeAction({ eventIndex, activationType }),
    );
  }

  function onEventParameterSet(
    event: IEventInstance,
    eventIndex: number,
    name: string,
    value: number | boolean,
  ) {
    store.dispatch(
      setBoardEventEventParameterAction({ eventIndex, name, value }),
    );
  }

  return (
    <>
      <SectionHeading text="Events" />
      <div className="propertiesPadded">
        <EventsList
          events={props.board.boardevents}
          board={props.board}
          onEventAdded={onEventAdded}
          onEventDeleted={onEventDeleted}
          onEventActivationTypeToggle={onEventActivationTypeToggle}
          onEventParameterSet={onEventParameterSet}
          onEventMouseEnter={onEventMouseEnter}
          onEventMouseLeave={onEventMouseLeave}
        />
      </div>
    </>
  );
};
