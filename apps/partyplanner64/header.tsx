import {
  Action,
  BoardType,
  View,
  EventCodeLanguage,
} from "../../packages/lib/types";
import * as React from "react";
import * as ReactDOM from "react-dom";
import { useState, useEffect } from "react";
import { Screenshot } from "./screenshot";
import { NewBoard } from "./newboard";
import {
  setCurrentBoard,
  addBoard,
  clearBoardsFromROM,
  getCurrentBoard,
  loadBoardsFromROM,
  indexOfBoard,
  IBoard,
  boardIsROM,
  setBG,
  copyCurrentBoard,
} from "./boards";
import { recordEvent } from "../../packages/lib/utils/analytics";
import { $$log } from "../../packages/lib/utils/debug";
import { getROMAdapter } from "../../packages/lib/adapter/adapters";
import {
  validateCurrentBoardForOverwrite,
  IValidationResult,
} from "../../packages/lib/validation/validation";
import { makeKeyClick } from "./utils/react";
import { equal } from "../../packages/lib/utils/arrays";
import { get, $setting } from "./views/settings";
import { romhandler } from "../../packages/lib/romhandler";
import {
  createCustomEvent,
  validateCustomEvent,
} from "../../packages/lib/events/customevents";
import { openFile } from "../../packages/lib/utils/input";
import {
  saveEvent,
  createEventPromptExit,
  NewEventDropdown,
} from "./views/createevent_shared";
import {
  boardsChanged,
  romLoadedChanged,
  changeCurrentEvent,
  showMessage,
  addNotification,
  removeNotification,
  blockUI,
  changeView,
} from "./appControl";
import {
  Notification,
  NotificationColor,
  NotificationButton,
} from "./components/notifications";
import { addEventToLibrary } from "../../packages/lib/events/EventLibrary";
import {
  saveBasicCodeEditorCode,
  basicCodeViewPromptExit,
} from "./views/basiccodeeditorview";
import { saveAs } from "file-saver";
import { isElectron } from "../../packages/lib/utils/electron";

import logoImage from "./img/header/logo.png";
import romCartImage from "./img/header/romcart.png";
import newboardImage from "./img/header/newboard.png";
import loadboardImage from "./img/header/loadboard.png";
import saveboardImage from "./img/header/saveboard.png";
import debugImage from "./img/header/debug.png";
import screenshotImage from "./img/header/screenshot.png";
import eventsImage from "./img/header/events.png";
import eventloadImage from "./img/header/eventload.png";
import settingsImage from "./img/header/settings.png";
import aboutImage from "./img/header/about.png";
import romcloseImage from "./img/header/romclose.png";
import romsaveImage from "./img/header/romsave.png";
import rompatchImage from "./img/header/rompatch.png";
import romoverwriteImage from "./img/header/romoverwrite.png";
import audioImage from "./img/header/audio.png";
import modelviewerImage from "./img/header/modelviewer.png";
import spritesImage from "./img/header/sprites.png";
//import stringseditorImage from "./img/header/stringseditor.png";
import backImage from "./img/header/back.png";
import addImage from "./img/header/add.png";
import saveImage from "./img/header/save.png";
//import moreImage from "./img/header/more.png";
import boardwarningImage from "./img/header/boardwarning.png";
import boarderrorImage from "./img/header/boarderror.png";
import loadingSquaresImage from "./img/assets/loadingsquares.gif";

import "./css/header.scss";

interface IHeaderActionItem {
  name: string;
  icon: string;
  type: Action;
  details: string;
  dropdownFn?: (closeFn: VoidFunction, props: IHeaderDropdownProps) => any;
  advanced?: boolean;
  show?: () => boolean;
}


function browseBoardsDropdown(closeFn: VoidFunction) {
  return <BrowseBoardsDropdown onClose={closeFn} />;
}

const actions_norom: IHeaderActionItem[] = [
  {
    name: "Load ROM",
    icon: romCartImage,
    type: Action.ROM_LOAD,
    details: "Load a ROM image and read its boards",
  },
  {
    name: "New board",
    icon: newboardImage,
    type: Action.BOARD_NEW,
    details: "Create a new board",
    dropdownFn: newboardDropdown,
  },
  {
    name: "Import board",
    icon: loadboardImage,
    type: Action.BOARD_LOAD,
    details: "Import a board file into the editor",
  },
  {
    name: "Browse boards",
    icon: loadboardImage,
    type: Action.BOARD_BROWSE,
    details: "Browse and import boards from the PartyPlanner API",
  },
  {
    name: "Export board",
    icon: saveboardImage,
    type: Action.BOARD_SAVE,
    details: "Export a board file for distribution",
  },
  {
    name: "Debug",
    icon: debugImage,
    type: Action.DEBUG,
    details: "Debug functionality",
    advanced: true,
  },
  {
    name: "Screenshot",
    icon: screenshotImage,
    type: Action.SCREENSHOT,
    details: "Take a screenshot of the current board",
    dropdownFn: screenshotDropdown,
  },
  {
    name: "Events",
    icon: eventsImage,
    type: Action.EVENTS,
    details: "View and manage events",
    advanced: true,
  },
  {
    name: "Settings",
    icon: settingsImage,
    type: Action.SETTINGS,
    details: "Editor settings",
  },
  {
    name: "About",
    icon: aboutImage,
    type: Action.ABOUT,
    details: "About PartyPlanner64",
  },
];

const actions_rom_romboard: IHeaderActionItem[] = [
  {
    name: "Close ROM",
    icon: romcloseImage,
    type: Action.ROM_UNLOAD,
    details: "Close the ROM file and remove its boards",
  },
  {
    name: "Save ROM",
    icon: romsaveImage,
    type: Action.ROM_SAVE,
    details: "Save changes out to a ROM file",
  },
  {
    name: "New board",
    icon: newboardImage,
    type: Action.BOARD_NEW,
    details: "Create a new board",
    dropdownFn: newboardDropdown,
  },
  {
    name: "Import board",
    icon: loadboardImage,
    type: Action.BOARD_LOAD,
    details: "Import a board file into the editor",
  },
  {
    name: "Browse boards",
    icon: loadboardImage,
    type: Action.BOARD_BROWSE,
    details: "Browse and import boards from the PartyPlanner API",
    dropdownFn: browseBoardsDropdown,
  },
  {
    name: "Export board",
    icon: saveboardImage,
    type: Action.BOARD_SAVE,
    details: "Export a board file for distribution",
  },
  {
    name: "Debug",
    icon: debugImage,
    type: Action.DEBUG,
    details: "Debug functionality",
    advanced: true,
  },
  {
    name: "Screenshot",
    icon: screenshotImage,
    type: Action.SCREENSHOT,
    details: "Take a screenshot of the current board",
    dropdownFn: screenshotDropdown,
  },
  {
    name: "Events",
    icon: eventsImage,
    type: Action.EVENTS,
    details: "View and manage events",
    advanced: true,
  },
  {
    name: "Patches",
    icon: rompatchImage,
    type: Action.PATCHES,
    details: "Apply patches to the ROM",
    advanced: true,
  },
  {
    name: "Model Viewer",
    icon: modelviewerImage,
    type: Action.MODEL_VIEWER,
    details: "View 3D model data in the ROM",
  },
  {
    name: "Sprites",
    icon: spritesImage,
    type: Action.SPRITE_VIEWER,
    details: "View sprite data in the ROM",
    advanced: true,
  },
  //{ "name": "Strings", "icon": stringseditorImage, "type": Action.STRINGS_EDITOR, "details": "View and edit strings in the ROM" },
  {
    name: "Audio",
    icon: audioImage,
    type: Action.AUDIO,
    details: "Game audio options",
    advanced: true,
  },
  {
    name: "Settings",
    icon: settingsImage,
    type: Action.SETTINGS,
    details: "Editor settings",
  },
  {
    name: "About",
    icon: aboutImage,
    type: Action.ABOUT,
    details: "About PartyPlanner64",
  },
];

const actions_rom_normalboard: IHeaderActionItem[] = [
  {
    name: "Close ROM",
    icon: romcloseImage,
    type: Action.ROM_UNLOAD,
    details: "Close the ROM file and remove its boards",
  },
  {
    name: "Save ROM",
    icon: romsaveImage,
    type: Action.ROM_SAVE,
    details: "Save changes out to a ROM file",
  },
  {
    name: "Overwrite",
    icon: romoverwriteImage,
    type: Action.BOARD_WRITE,
    details: "Overwrite a ROM board with the current board",
    dropdownFn: overwriteDropdown,
  },
  {
    name: "New board",
    icon: newboardImage,
    type: Action.BOARD_NEW,
    details: "Create a new board",
    dropdownFn: newboardDropdown,
  },
  {
    name: "Import board",
    icon: loadboardImage,
    type: Action.BOARD_LOAD,
    details: "Import a board file into the editor",
  },
  {
    name: "Browse boards",
    icon: loadboardImage,
    type: Action.BOARD_BROWSE,
    details: "Browse and import boards from the PartyPlanner API",
    dropdownFn: browseBoardsDropdown,
  },
  {
    name: "Export board",
    icon: saveboardImage,
    type: Action.BOARD_SAVE,
    details: "Export a board file for distribution",
  },
  {
    name: "Debug",
    icon: debugImage,
    type: Action.DEBUG,
    details: "Debug functionality",
    advanced: true,
  },
  {
    name: "Screenshot",
    icon: screenshotImage,
    type: Action.SCREENSHOT,
    details: "Take a screenshot of the current board",
    dropdownFn: screenshotDropdown,
  },
  {
    name: "Events",
    icon: eventsImage,
    type: Action.EVENTS,
    details: "View and manage events",
    advanced: true,
  },
  {
    name: "Patches",
    icon: rompatchImage,
    type: Action.PATCHES,
    details: "Apply patches to the ROM",
    advanced: true,
  },
  {
    name: "Model Viewer",
    icon: modelviewerImage,
    type: Action.MODEL_VIEWER,
    details: "View 3D model data in the ROM",
  },
  {
    name: "Sprites",
    icon: spritesImage,
    type: Action.SPRITE_VIEWER,
    details: "View sprite data in the ROM",
    advanced: true,
  },
  //{ "name": "Strings", "icon": stringseditorImage, "type": Action.STRINGS_EDITOR, "details": "View and edit strings in the ROM" },
  {
    name: "Audio",
    icon: audioImage,
    type: Action.AUDIO,
    details: "Game audio options",
    advanced: true,
  },
  {
    name: "Settings",
    icon: settingsImage,
    type: Action.SETTINGS,
    details: "Editor settings",
  },
  {
    name: "About",
    icon: aboutImage,
    type: Action.ABOUT,
    details: "About PartyPlanner64",
  },
];

const actions_back: IHeaderActionItem[] = [
  {
    name: "Back to editor",
    icon: backImage,
    type: Action.BOARD_EDITOR,
    details: "Return to the board editor",
  },
];

const actions_events: IHeaderActionItem[] = actions_back.concat([
  {
    name: "Create Event",
    icon: addImage,
    type: Action.CREATEEVENT,
    details: "Create your own event code",
    dropdownFn: newEventDropdown,
  },
  {
    name: "Import Event",
    icon: eventloadImage,
    type: Action.EVENT_LOAD,
    details: "Load event code from a file",
  },
]);

const actions_createevent: IHeaderActionItem[] = [
  {
    name: "Back to event list",
    icon: backImage,
    type: Action.BACK_TO_EVENTS,
    details: "Return to the event list",
  },
  {
    name: "Save",
    icon: saveImage,
    type: Action.SAVE_EVENT,
    details: "Save the event",
  },
];

const actions_additionalbg: IHeaderActionItem[] = [
  {
    name: "Back to editor",
    icon: backImage,
    type: Action.ADDITIONALBG_BACK,
    details: "Return to the board editor",
  },
  {
    name: "Save",
    icon: saveImage,
    type: Action.SAVE_ADDITIONALBG,
    details: "Save the code",
  },
];

const actions_audioselectioncode: IHeaderActionItem[] = [
  {
    name: "Back to editor",
    icon: backImage,
    type: Action.AUDIOSELECTCODE_BACK,
    details: "Return to the board editor",
  },
  {
    name: "Save",
    icon: saveImage,
    type: Action.SAVE_AUDIOSELECTCODE,
    details: "Save the code",
  },
];

//const action_overflow = { "name": "", "icon": moreImage, "type": "MORE", "details": "More options" };
const action_overflow: IHeaderActionItem = {
  name: "",
  icon: "",
  type: "MORE" as any,
  details: "More options",
};

async function _handleAction(action: Action) {
  switch (action) {
    case Action.ROM_LOAD:
      openFile(".z64,.v64,.rom,.n64", romSelected);
      break;
    case Action.ROM_UNLOAD:
      romhandler.clear();
      clearBoardsFromROM();
      boardsChanged();
      setCurrentBoard(0);
      romLoadedChanged();
      break;
    case Action.ROM_SAVE:
      blockUI(true);
      setTimeout(() => {
        const writeDecompressed = !!get($setting.writeDecompressed);
        const newROMBuffer = romhandler.saveROM(writeDecompressed);
        const romBlob = new Blob([newROMBuffer]);
        saveAs(romBlob, `MyMarioParty${romhandler.getGameVersion()}.z64`);
        blockUI(false);
        _showEmulatorInstructionsNotification();
      }, 0);
      break;
    case Action.BOARD_LOAD:
      openFile(".json", boardSelected);
      break;
    case Action.BOARD_SAVE:
      {
        let curBoard = getCurrentBoard();
        curBoard = stripPrivateProps(curBoard);
        const boardBlob = new Blob([JSON.stringify(curBoard)]);
        saveAs(boardBlob, curBoard.name + ".json");
      }
      break;
    case Action.BOARD_COPY:
      copyCurrentBoard();
      break;
    case Action.BOARD_DETAILS:
      changeView(View.DETAILS);
      break;
    case Action.BOARD_EDITOR:
      changeView(View.EDITOR);
      break;
    case Action.SETTINGS:
      changeView(View.SETTINGS);
      break;
    case Action.ABOUT:
      changeView(View.ABOUT);
      break;
    case Action.MODEL_VIEWER:
      changeView(View.MODELS);
      break;
    case Action.SPRITE_VIEWER:
      changeView(View.SPRITES);
      break;
    case Action.EVENTS:
      changeView(View.EVENTS);
      break;
    case Action.BACK_TO_EVENTS:
      if (await createEventPromptExit()) {
        changeCurrentEvent(null);
        changeView(View.EVENTS);
      }
      break;
    case Action.EVENT_LOAD:
      openFile(".c,.s", eventFileSelected);
      break;
    case Action.SAVE_EVENT:
      saveEvent();
      break;
    case Action.STRINGS_EDITOR:
      changeView(View.STRINGS);
      break;
    case Action.PATCHES:
      changeView(View.PATCHES);
      break;
    case Action.DEBUG:
      changeView(View.DEBUG);
      break;
    case Action.AUDIO:
      changeView(View.AUDIO);
      break;
    case Action.SET_BG:
      openFile("image/*", bgSelected);
      break;
    case Action.SAVE_ADDITIONALBG:
    case Action.SAVE_AUDIOSELECTCODE:
      saveBasicCodeEditorCode();
      break;
    case Action.ADDITIONALBG_BACK:
      if (await basicCodeViewPromptExit()) {
        changeView(View.EDITOR);
      }
      break;
    case Action.AUDIOSELECTCODE_BACK:
      if (await basicCodeViewPromptExit()) {
        changeView(View.DETAILS);
      }
      break;
    case Action.BOARD_BROWSE:
      changeView(View.BOARD_BROWSER);
      break;
    default:
      break;
  }
}

// Removes any _ prefixed property from a board.
function stripPrivateProps(obj: any = {}): any {
  if (typeof obj !== "object") return obj;

  obj = JSON.parse(JSON.stringify(obj));
  for (const prop in obj) {
    if (!obj.hasOwnProperty(prop)) continue;
    if (prop.charAt(0) === "_") delete obj[prop];
    if (typeof obj[prop] === "object" && obj[prop] !== null)
      obj[prop] = stripPrivateProps(obj[prop]);
  }
  return obj;
}

function romSelected(event: any) {
  const file = event.target.files[0];
  if (!file) return;

  blockUI(true);
  const reader = new FileReader();
  reader.onload = (e: any) => {
    if (!e.target.result) {
      blockUI(false);
      return;
    }

    const skipSupportedCheck = !!get($setting.uiAllowAllRoms);
    const promise = romhandler.setROMBuffer(
      e.target.result,
      skipSupportedCheck,
      showMessage,
    );
    promise.then(
      (value) => {
        if (!value) {
          // The ROM handler showed a message, so we don't need to unblock UI
          return;
        }

        romLoadedChanged();
        loadBoardsFromROM();
        blockUI(false);
        $$log("ROM loaded");
      },
      (reason) => {
        console.error(reason);
        showMessage(`Error loading the ROM file.\n\n${reason}`);
      },
    );
  };
  reader.readAsArrayBuffer(file);
}

function boardSelected(event: any) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    let board;
    try {
      board = JSON.parse(reader.result as string);
    } catch (e) {
      showMessage("Board could not be parsed.");
      return;
    }
    const boardIndex = addBoard(board);
    setCurrentBoard(boardIndex);
  };
  reader.readAsText(file);
}

function bgSelected(event: any) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    setBG(reader.result as string);
  };
  reader.readAsDataURL(file);
}

function eventFileSelected(event: any) {
  const files = event.target && event.target.files;
  if (!(files && files[0])) return;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const language = getCodeLanguageFromFileName(file.name);
        const code = reader.result as string;
        const customEvent = createCustomEvent(language, code);
        await validateCustomEvent(customEvent);
        addEventToLibrary(customEvent);
      } catch (e) {
        showMessage("Event file load failed. " + e);
        return;
      }
    };
    reader.readAsText(file);
  }
}

function getCodeLanguageFromFileName(name: string): EventCodeLanguage {
  const lower = name.toLowerCase();
  if (lower.endsWith(".s")) {
    return EventCodeLanguage.MIPS;
  } else if (lower.endsWith(".c")) {
    return EventCodeLanguage.C;
  }

  throw new Error(
    `Only .s or .c file extensions are recongized. (Saw ${name})`,
  );
}

function getActions(view: View, board: IBoard, romLoaded: boolean) {
  // Pick the set of actions based on the state.
  let actions;
  if (view !== View.EDITOR) {
    if (view === View.EVENTS) actions = actions_events;
    else if (view === View.CREATEEVENT_ASM || view === View.CREATEEVENT_C)
      actions = actions_createevent;
    else if (view === View.ADDITIONAL_BGS) actions = actions_additionalbg;
    else if (view === View.AUDIO_SELECTION_CODE)
      actions = actions_audioselectioncode;
    else actions = actions_back;
  } else if (!romLoaded) actions = actions_norom;
  else if (boardIsROM(board)) actions = actions_rom_romboard;
  else actions = actions_rom_normalboard;

  if (!get($setting.uiAdvanced)) {
    actions = actions.filter((a) => !a.advanced);
  }

  actions = actions.filter((a) => {
    return !a.show || a.show();
  });

  return actions;
}

function _showEmulatorInstructionsNotification() {
  const emulatorNoticeKey = "romSaveNotice";
  const removeNotificationHandler = () => {
    removeNotification(emulatorNoticeKey);
  };

  addNotification(
    <Notification
      key={emulatorNoticeKey}
      color={NotificationColor.Green}
      onClose={removeNotificationHandler}
    >
      Before trying the game, review{" "}
      <a
        href="https://github.com/PartyPlanner64/PartyPlanner64/wiki/Emulator-Setup"
        target="_blank"
        rel="noopener noreferrer"
      >
        emulator setup instructions
      </a>
      .
      <NotificationButton onClick={removeNotificationHandler}>
        Got it
      </NotificationButton>
    </Notification>,
  );
}

interface IHeaderProps {
  view: View;
  board: IBoard;
  romLoaded: boolean;
}

interface IHeaderState {
  actions: IHeaderActionItem[];
  totalActions: IHeaderActionItem[];
  overflow: any[];
}

let _headerMounted = false;

export const Header = class Header extends React.Component<
  IHeaderProps,
  IHeaderState
> {
  private actionsEl: HTMLElement | null = null;

  constructor(props: IHeaderProps) {
    super(props);

    const actions = getActions(props.view, props.board, props.romLoaded);
    this.state = {
      actions: actions,
      totalActions: actions, // Array of actions that never changes despite overflow
      overflow: [],
    };
  }

  refresh() {
    const actions = getActions(
      this.props.view,
      this.props.board,
      this.props.romLoaded,
    );
    this.setState({
      actions: actions,
      totalActions: actions,
      overflow: [],
    });
  }

  render() {
    const actionsList = this.state.actions;
    const actions = actionsList.map((item) => {
      if (item.dropdownFn) {
        return (
          <HeaderDropdown key={item.type} action={item} fn={item.dropdownFn} />
        );
      }
      return <HeaderButton key={item.type} action={item} />;
    });
    let overflowAction;
    if (this.state.overflow.length) {
      overflowAction = (
        <HeaderDropdown
          key={action_overflow.type}
          action={action_overflow}
          overflow={this.state.overflow}
          fn={moreDropdown}
        />
      );
    }
    return (
      <div className="header" role="toolbar">
        <HeaderLogo />
        <div
          className="headerActions"
          ref={(actionsEl) => {
            this.actionsEl = actionsEl;
          }}
        >
          {actions}
          {overflowAction}
        </div>
      </div>
    );
  }

  componentDidMount() {
    _headerMounted = true;
    window.addEventListener("resize", this.refresh.bind(this), false);
    setTimeout(() => {
      window.requestAnimationFrame(this.handleOverflow.bind(this));
    }, 0);
  }

  componentDidUpdate() {
    const newActions = getActions(
      this.props.view,
      this.props.board,
      this.props.romLoaded,
    );

    if (!equal(this.state.totalActions, newActions)) {
      this.setState({
        actions: newActions,
        totalActions: newActions,
        overflow: [],
      });
    }

    setTimeout(() => {
      window.requestAnimationFrame(this.handleOverflow.bind(this));
    }, 0);
  }

  componentWillUnmount() {
    _headerMounted = false;
    $$log("Why did Header unmount?");
  }

  handleOverflow() {
    if (!_headerMounted) return;

    const actions = this.state.actions.slice();
    const hasOverflow = this.state.overflow.length;
    const overflow = this.state.overflow.slice();
    const el = ReactDOM.findDOMNode(this) as HTMLElement;
    const actionsEl = this.actionsEl;
    if (!actionsEl) return;

    while (
      actionsEl.offsetWidth >
      el.offsetWidth - 215 - (hasOverflow ? 0 : 80)
    ) {
      // Cut out logo and more if existing
      const lastAction = actionsEl.children[
        actions.length - (hasOverflow ? 2 : 1)
      ] as HTMLElement; // Skip more
      if (!lastAction) break;
      lastAction.style.display = "none";
      overflow.unshift(actions.pop());
    }
    for (
      let i = 0;
      i < actionsEl.children.length - (hasOverflow ? 2 : 1);
      i++
    ) {
      const actionEl = actionsEl.children[i] as HTMLElement;
      actionEl.style.display = "";
    }
    if (
      actions.length === this.state.actions.length &&
      overflow.length === this.state.overflow.length
    )
      return;
    // $$log("Header.handleOverflow -> setState" + actions.length + ", " + overflow.length);
    this.setState({ actions, overflow });
  }
};

const HeaderLogo = class HeaderLogo extends React.Component {
  render() {
    return (
      <img className="headerLogo" src={logoImage} alt="PartyPlanner64 Logo" />
    );
  }
};

interface IHeaderButtonProps {
  action: IHeaderActionItem;
}

const HeaderButton = class HeaderButton extends React.Component<IHeaderButtonProps> {
  handleClick = () => {
    _handleAction(this.props.action.type);
  };

  render() {
    let iconImg;
    if (this.props.action.icon) {
      iconImg = (
        <img
          className="headerButtonIcon"
          src={this.props.action.icon}
          alt=""
        ></img>
      );
    }
    return (
      <div
        className="headerButton"
        title={this.props.action.details}
        role="button"
        tabIndex={0}
        onClick={this.handleClick}
        onKeyDown={makeKeyClick(this.handleClick)}
      >
        {iconImg}
        <span className="headerButtonText">{this.props.action.name}</span>
      </div>
    );
  }
};

interface IHeaderDropdownProps {
  action: IHeaderActionItem;
  fn: (closeFn: VoidFunction, props: IHeaderDropdownProps) => any;
  overflow?: any;
}

const HeaderDropdown = class HeaderDropdown extends React.Component<IHeaderDropdownProps> {
  private dropdown: HTMLElement | null = null;

  state = { opened: false };

  globalClickHandler = (event: any) => {
    if (this.elementIsWithin(event.target)) return;
    this.close();
  };

  addGlobalHandler() {
    document.addEventListener("click", this.globalClickHandler);
  }

  removeGlobalHandler() {
    document.removeEventListener("click", this.globalClickHandler);
  }

  elementIsWithin(el: HTMLElement) {
    if (!this.dropdown) return true;
    return this.dropdown.contains(el);
  }

  componentDidMount() {
    this.addGlobalHandler();
    window.addEventListener("resize", this.close, false);
  }

  componentWillUnmount() {
    this.removeGlobalHandler();
    window.removeEventListener("resize", this.close);
  }

  onButtonClick = (event: any) => {
    if (this.state.opened) {
      event.stopPropagation();
      event.nativeEvent.stopImmediatePropagation();
    }
    this.setState({ opened: !this.state.opened });
  };

  onDropdownClick = (event: any) => {
    event.stopPropagation(); // So that clicking inside the dropdown doesn't call onButtonClick.
  };

  close = () => {
    if (this.state.opened) this.setState({ opened: false });
  };

  render() {
    let btnClass = "headerButton";
    let dropdownContent = null;
    if (this.state.opened) {
      btnClass += " headerButtonExpanded";
      const contents = this.props.fn(this.close, this.props);
      dropdownContent = (
        <div className="headerDropdown" onClick={this.onDropdownClick}>
          {contents}
        </div>
      );
    }
    let iconImg;
    if (this.props.action.icon) {
      iconImg = (
        <img
          className="headerButtonIcon"
          src={this.props.action.icon}
          alt=""
        ></img>
      );
    }
    return (
      <div
        className={btnClass}
        tabIndex={0}
        role="button"
        aria-haspopup="true"
        title={this.props.action.details}
        ref={(el) => (this.dropdown = el)}
        onClick={this.onButtonClick}
      >
        {iconImg}
        <span className="headerButtonText">{this.props.action.name}</span>
        <div className="headerDropdownArrow">▾</div>
        {dropdownContent}
      </div>
    );
  }
};

function overwriteDropdown(closeFn: any) {
  const skipValidation = get($setting.uiSkipValidation);
  const validationResultsPromise =
    validateCurrentBoardForOverwrite(skipValidation);
  return (
    <HeaderOverwriteBoardDropdown
      resultsPromise={validationResultsPromise}
      onClose={closeFn}
    />
  );
}

interface IHeaderOverwriteBoardDropdownProps {
  resultsPromise: Promise<IValidationResult[] | null>;
  onClose: VoidFunction;
}

const HeaderOverwriteBoardDropdown: React.FC<
  IHeaderOverwriteBoardDropdownProps
> = (props) => {
  const { resultsPromise, onClose } = props;

  const [validationResults, setValidationResults] = useState<
    IValidationResult[] | null
  >(null);

  useEffect(() => {
    resultsPromise.then(
      (results) => {
        setValidationResults(results);
      },
      (e) => {
        onClose();
        console.error(e);
        showMessage(
          "An error occurred during board validation, please submit an issue.\n\n" +
            e.toString(),
        );
      },
    );
  }, [resultsPromise, onClose]);

  if (!validationResults) return <PendingDropdown />;

  // Fragment only for weird typing bug.
  return (
    <>
      {validationResults.map(function (
        result: IValidationResult,
        index: number,
      ) {
        return (
          <HeaderOverwriteBoardDropdownEntry
            name={result.name}
            errors={result.errors}
            warnings={result.warnings}
            unavailable={result.unavailable}
            forcedDisabled={result.forcedDisabled}
            closeCallback={onClose}
            key={index}
            boardIndex={index - 1}
          />
        );
      })}
    </>
  );
};

interface IHeaderOverwriteBoardDropdownEntryProps {
  name?: string;
  unavailable?: boolean;
  forcedDisabled?: boolean;
  boardIndex: number;
  closeCallback: VoidFunction;
  errors: string[];
  warnings: string[];
}

const HeaderOverwriteBoardDropdownEntry = class HeaderOverwriteBoardDropdownEntry extends React.Component<IHeaderOverwriteBoardDropdownEntryProps> {
  boardClicked = async (event: any) => {
    // The general validation entry cannot be clicked.
    if (!this.props.name) {
      return;
    }

    // Links inside the errors messages should not cause overwrites from warnings.
    if (event.target && event.target.tagName.toUpperCase() === "A") {
      event.stopPropagation();
      return;
    }

    if (
      !this.hasErrors() &&
      !this.props.unavailable &&
      !this.props.forcedDisabled
    ) {
      this.props.closeCallback();

      const adapter = getROMAdapter({
        writeBranding: get($setting.writeBranding),
      });
      if (!adapter) return;

      blockUI(true);

      const currentBoard = getCurrentBoard();
      try {
        await adapter.overwriteBoard(this.props.boardIndex, currentBoard);
      } catch (e) {
        console.error(e);
        showMessage("Error overwriting the board.\n\n" + e);
        return;
      }

      $$log("Board overwritten");
      clearBoardsFromROM();
      loadBoardsFromROM();

      let newBoardIndex = indexOfBoard(currentBoard);
      if (newBoardIndex < 0) newBoardIndex = 0;

      setCurrentBoard(newBoardIndex);

      recordEvent("board_write", {
        event_category: "action",
        event_label: currentBoard.name,
      });

      blockUI(false);
    }
  };

  hasErrors() {
    return !!this.props.errors.length;
  }

  hasWarnings() {
    return !!this.props.warnings.length;
  }

  render() {
    let ddClass = "overwriteEntry";
    let tooltip = "";
    if (this.props.name) {
      ddClass += " overwriteBoardEntry";
      tooltip = `Overwrite ${this.props.name} with the current board.`;
    }

    let failNodes: any = [];
    if (this.props.unavailable) {
      ddClass += " unavailable";
      failNodes.push(
        <div className="overwriteBoardMessage" key="unavailable">
          Board cannot be overwritten currently.
        </div>,
      );
    } else {
      if (this.props.forcedDisabled) {
        ddClass += " unavailable";
        failNodes.push(
          <div className="overwriteBoardMessage" key="unavailable">
            Current issues must be resolved.
          </div>,
        );
      }

      if (this.hasErrors()) {
        ddClass += " failed";
        failNodes = failNodes.concat(
          this.props.errors.map((fail, idx) => {
            return (
              <div className="overwriteBoardMessage" key={idx + "e"}>
                <img
                  src={boarderrorImage}
                  alt=""
                  className="overwriteBoardIssueIcon"
                />
                <span dangerouslySetInnerHTML={{ __html: fail }}></span>
              </div>
            );
          }),
        );
      }
      if (this.hasWarnings()) {
        failNodes = failNodes.concat(
          this.props.warnings.map((fail, idx) => {
            return (
              <div className="overwriteBoardMessage" key={idx + "w"}>
                <img
                  src={boardwarningImage}
                  alt=""
                  className="overwriteBoardIssueIcon"
                />
                <span dangerouslySetInnerHTML={{ __html: fail }}></span>
              </div>
            );
          }),
        );
      }
    }

    if (failNodes.length) {
      tooltip = "Issues with the current board.";
      return (
        <div className={ddClass} onClick={this.boardClicked} title={tooltip}>
          {this.props.name && (
            <>
              <span className="overwriteBoardName">{this.props.name}</span>
              <br />
            </>
          )}
          {failNodes}
        </div>
      );
    }

    if (!this.props.name) {
      // This was the "general" validation result, which shows nothing
      // if we don't have errors.
      return null;
    }

    return (
      <div className={ddClass} onClick={this.boardClicked} title={tooltip}>
        <span className="overwriteBoardName">{this.props.name}</span>
      </div>
    );
  }
};

function moreDropdown(closeFn: VoidFunction, props: any) {
  const overflowItems = props.overflow;
  if (!overflowItems.length) return null;

  return overflowItems.map((item: IHeaderActionItem) => {
    if (item.dropdownFn) {
      return (
        <HeaderDropdown key={item.type} action={item} fn={item.dropdownFn} />
      );
    }
    return <HeaderButton key={item.type} action={item} />;
  });
}

function newboardDropdown(closeFn: VoidFunction) {
  function onAccept(gameVersion: 1 | 2 | 3, type: BoardType, theme: any) {
    closeFn();
    const newBoardIdx = addBoard(null, {
      game: gameVersion,
      type: type,
    });
    setCurrentBoard(newBoardIdx);
  }
  return <NewBoard onAccept={onAccept} />;
}

function screenshotDropdown(closeFn: VoidFunction) {
  function onAccept(dataUri: string, blobPromise: Promise<Blob>) {
    if (isElectron) {
      // Opening the window is sketchy in electron, just use saveAs instead.
      blobPromise.then((blob: Blob) => {
        saveAs(blob, "BoardScreenshot.png");
      });
    } else {
      const win = window.open();
      if (win) {
        const doc = win.document;

        // Normally we can get a document.
        if (doc) {
          doc.write("");
          doc.close();
          doc.body.appendChild(doc.createElement("img")).src = dataUri;
        }
      }
    }

    closeFn();
  }
  return <Screenshot onAccept={onAccept} />;
}

function newEventDropdown(closeFn: VoidFunction) {
  function onAccept(language: EventCodeLanguage) {
    closeFn();

    switch (language) {
      case EventCodeLanguage.MIPS:
        changeView(View.CREATEEVENT_ASM);
        break;

      case EventCodeLanguage.C:
        changeView(View.CREATEEVENT_C);
        break;

      default:
        throw new Error(`Unrecognized event code language ${language}`);
    }
  }
  return <NewEventDropdown onAccept={onAccept} />;
}

const PendingDropdown: React.FC<{}> = () => {
  return (
    <div className="pendingDropdownBox">
      <img
        className="pendingDropdownImage"
        src={loadingSquaresImage}
        alt="Loading"
      ></img>
    </div>
  );
};
