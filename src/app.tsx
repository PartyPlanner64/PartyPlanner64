// This is the top level of the application, and includes the root React view.

import { View, Action } from "./types";
import { IBoard, ISpace, getBoards, getCurrentBoard, IEventInstance, getAdditionalBackgroundCode, setAdditionalBackgroundCode, getAudioSelectCode, setAudioSelectCode } from "./boards";
import * as React from "react";
import * as ReactDOM from "react-dom";
import { Provider } from "react-redux";
import { IEvent } from "./events/events";
import { updateWindowTitle } from "./utils/browser";
import { Editor } from "./renderer";
import { Details } from "./views/details";
import { Settings } from "./views/settings";
import { About } from "./views/about";
import { ModelViewer } from "./views/models";
import { EventsView } from "./views/eventsview";
import { CreateASMEventView } from "./views/createevent_asm";
import { CreateCEventView } from "./views/createevent_c";
import { StringsViewer } from "./views/strings";
import { GamesharkView } from "./views/gameshark";
import { BoardMenu } from "./boardmenu";
import { Notification, NotificationBar, NotificationButton, NotificationColor } from "./components/notifications";
import { Header } from "./header";
import { ToolWindow } from "./toolwindow";
import { Toolbar } from "./toolbar";
import { SpaceProperties } from "./spaceproperties";
import { BoardProperties } from "./boardproperties";
import "./utils/onbeforeunload";
import "./events/builtin/events.common";
import "./events/builtin/MP1/events.MP1";
import "./events/builtin/MP2/events.MP2";
import "./events/builtin/MP3/events.MP3";
import "file-saver";
import { DebugView } from "./views/debug";
import { AudioViewer } from "./views/audio";
import { BasicCodeEditorView } from "./views/basiccodeeditorview";
import { IDecisionTreeNode } from "./ai/aitrees";
import { DecisionTreeEditor } from "./ai/aieditor";
import { isElectron } from "./utils/electron";
import { showMessage, blockUI, changeDecisionTree } from "./appControl";
import { Blocker } from "./components/blocker";
import { killEvent } from "./utils/react";
import { getDefaultAdditionalBgCode, testAdditionalBgCodeAllGames } from "./events/additionalbg";
import { getDefaultGetAudioCode, testGetAudioCodeAllGames } from "./events/getaudiochoice";
import { SpriteView } from "./views/sprites";
import { store } from "./app/store";
import { selectCurrentView, setHideUpdateNotification } from "./app/appState";
import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "./app/hooks";

/* eslint-disable jsx-a11y/anchor-is-valid */

interface IPP64AppState {
  boards: IBoard[];
  currentBoard: IBoard;
  currentEvent: IEvent | null;
  currentEventIsBoardEvent: boolean;
  hoveredBoardEvent: IEventInstance | null;
  overrideBg: string | null;
  romLoaded: boolean;
  currentAction: Action;
  selectedSpaces: ISpace[] | null;
  aiTree: IDecisionTreeNode[] | null;
  blocked: boolean;
  prompt: boolean;
  confirm: boolean;
  message: string;
  messageHTML: string;
  onBlockerFinished?(value?: string): void;
  updateExists: boolean;
  notifications: React.ReactElement<Notification>[];
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class PP64App extends React.Component<{}, IPP64AppState> {
  state: IPP64AppState = {
    boards: getBoards(),
    currentBoard: getCurrentBoard(),
    currentEvent: null,
    currentEventIsBoardEvent: false,
    hoveredBoardEvent: null,
    overrideBg: null,
    romLoaded: false,
    currentAction: Action.MOVE,
    selectedSpaces: null,
    aiTree: null,
    blocked: false,
    prompt: false,
    confirm: false,
    message: "",
    messageHTML: "",
    updateExists: false,
    notifications: [],
    error: null,
    errorInfo: null,
  }

  render() {
    if (this.state.error) {
      return (
        <ErrorDisplay error={this.state.error} errorInfo={this.state.errorInfo}
          onClearError={() => {
            this.setState({ error: null, errorInfo: null, blocked: false });
          }} />
      );
    }

    return <PP64AppInternal {...this.state} />;
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    _onError(this, error, errorInfo);
  }

  componentDidMount() {
    if (isElectron) {
      try {
        const ipcRenderer = (window as any).require("electron").ipcRenderer;
        ipcRenderer.on("update-check-hasupdate", this._onUpdateCheckHasUpdate);
        ipcRenderer.send("update-check-start");
      }
      catch (e) {
        console.error("Auto update failed in componentDidMount: ", e);
      }
    }
  }

  componentWillUnmount() {
    if (isElectron) {
      try {
        const ipcRenderer = (window as any).require("electron").ipcRenderer;
        ipcRenderer.removeListener("update-check-hasupdate", this._onUpdateCheckHasUpdate);
      }
      catch (e) {
        console.error("Auto update failed in componentWillUnmount: ", e);
      }
    }
  }

  _onUpdateCheckHasUpdate = () => {
    this.setState({ updateExists: true });
  }
};

interface PP64AppInternalProps {
  boards: IBoard[];
  currentBoard: IBoard;
  currentEvent: IEvent | null;
  currentEventIsBoardEvent: boolean;
  hoveredBoardEvent: IEventInstance | null;
  overrideBg: string | null;
  romLoaded: boolean;
  currentAction: Action;
  selectedSpaces: ISpace[] | null;
  aiTree: IDecisionTreeNode[] | null;
  blocked: boolean;
  prompt: boolean;
  confirm: boolean;
  message: string;
  messageHTML: string;
  onBlockerFinished?(value?: string): void;
  updateExists: boolean;
  notifications: React.ReactElement<Notification>[];
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

function PP64AppInternal(props: PP64AppInternalProps) {
  const currentView = useAppSelector(selectCurrentView);

  updateWindowTitle(props.currentBoard.name);
  let mainView;
  switch (currentView) {
    case View.EDITOR:
      mainView = <Editor board={props.currentBoard}
        selectedSpaces={props.selectedSpaces}
        hoveredBoardEvent={props.hoveredBoardEvent}
        telescoping={props.currentAction === Action.TELESCOPE} />;
      break;
    case View.DETAILS:
      mainView = <Details board={props.currentBoard} />;
      break;
    case View.SETTINGS:
      mainView = <Settings />;
      break;
    case View.ABOUT:
      mainView = <About />;
      break;
    case View.MODELS:
      mainView = <ModelViewer />;
      break;
    case View.SPRITES:
      mainView = <SpriteView />;
      break;
    case View.EVENTS:
      mainView = <EventsView board={props.currentBoard} />;
      break;
    case View.CREATEEVENT_ASM:
      mainView = <CreateASMEventView />;
      break;
    case View.CREATEEVENT_C:
      mainView = <CreateCEventView />;
      break;
    case View.STRINGS:
      mainView = <StringsViewer />;
      break;
    case View.PATCHES:
      mainView = <GamesharkView />;
      break;
    case View.DEBUG:
      mainView = <DebugView />;
      break;
    case View.AUDIO:
      mainView = <AudioViewer />;
      break;
    case View.ADDITIONAL_BGS:
      mainView = <BasicCodeEditorView board={props.currentBoard}
        title="Additional Background Configuration"
        getExistingCode={() => getAdditionalBackgroundCode(props.currentBoard)}
        getDefaultCode={lang => getDefaultAdditionalBgCode(lang)}
        onSetCode={(code, lang) => setAdditionalBackgroundCode(props.currentBoard, code, lang)}
        canSaveAndExit={(code, lang) => testAdditionalBgCodeAllGames(code, lang, props.currentBoard)} />;
      break;
    case View.AUDIO_SELECTION_CODE:
      mainView = <BasicCodeEditorView board={props.currentBoard}
        title="Background Music Selection Code"
        getExistingCode={() => getAudioSelectCode(props.currentBoard)}
        getDefaultCode={lang => getDefaultGetAudioCode(lang)}
        onSetCode={(code, lang) => setAudioSelectCode(props.currentBoard, code, lang)}
        canSaveAndExit={(code, lang) => testGetAudioCodeAllGames(code, lang, props.currentBoard)} />;
      break;
  }

  let sidebar;
  switch (currentView) {
    case View.EDITOR:
    case View.DETAILS:
    case View.EVENTS:
      sidebar = (
        <div className="sidebar">
          <BoardMenu
            boards={props.boards} />
        </div>
      );
      break;
  }

  let blocked;
  if (props.blocked) {
    blocked = <Blocker
      message={props.message}
      messageHTML={props.messageHTML}
      prompt={props.prompt}
      confirm={props.confirm}
      onAccept={(value?: string) => {
        showMessage();
        if (props.onBlockerFinished) {
          props.onBlockerFinished(value);
        }
      }}
      onCancel={() => {
        showMessage();
        if (props.onBlockerFinished) {
          props.onBlockerFinished();
        }
      }}
      onForceClose={() => blockUI(false)} />
  }

  let bodyClass = "body";
  if (props.currentAction === Action.ERASE)
    bodyClass += " eraser";

  return (
    <div className={bodyClass}>
      <PP64NotificationBar notifications={props.notifications}
        updateExists={props.updateExists} />
      <Header view={currentView} romLoaded={props.romLoaded} board={props.currentBoard} />
      <div className="content"
        onKeyDownCapture={blocked ? killEvent : undefined}>
        {sidebar}
        <div className="main">
          {mainView}
          <div className="mainOverlay">
            <ToolWindow name="Toolbox" position="TopRight"
              visible={currentView === View.EDITOR}>
              <Toolbar currentAction={props.currentAction}
                gameVersion={props.currentBoard.game}
                boardType={props.currentBoard.type} />
            </ToolWindow>
            <ToolWindow name="Space Properties" position="BottomRight"
              visible={currentView === View.EDITOR}>
              <SpaceProperties selectedSpaces={props.selectedSpaces}
                gameVersion={props.currentBoard.game}
                boardType={props.currentBoard.type} />
            </ToolWindow>
            <ToolWindow name="Board Properties" position="BottomLeft"
              visible={currentView === View.EDITOR}>
              <BoardProperties currentBoard={props.currentBoard} />
            </ToolWindow>
            {props.aiTree &&
              <ToolWindow name="AI Decision Tree" position="TopLeft"
                visible={currentView === View.EDITOR}
                canClose onCloseClick={() => changeDecisionTree(null)}>
                <DecisionTreeEditor root={props.aiTree} />
              </ToolWindow>
            }
          </div>
          <div id="dragZone"></div>
        </div>
      </div>
      {blocked}
    </div>
  );
}

interface PP64NotificationBarProps {
  updateExists: boolean;
  notifications: React.ReactElement<Notification>[];
}

function PP64NotificationBar(props: PP64NotificationBarProps) {
  const dispatch = useAppDispatch();

  const onUpdateNotificationClosed = useCallback(() => {
    dispatch(setHideUpdateNotification(true));
  }, [dispatch]);

  const onUpdateNotificationInstallClicked = useCallback(() => {
    dispatch(setHideUpdateNotification(true));
    blockUI(true);

    if (isElectron) {
      const ipcRenderer = (window as any).require("electron").ipcRenderer;
      ipcRenderer.send("update-check-doupdate");
    }
  }, [dispatch]);

  const updateHideNotification = useAppSelector(state => state.app.updateHideNotification);

  const notifications = props.notifications.slice();
  if (props.updateExists && !updateHideNotification) {
    notifications.push(
      <Notification key="update"
        color={NotificationColor.Blue}
        onClose={onUpdateNotificationClosed}>
        An update is available.
        <NotificationButton onClick={onUpdateNotificationInstallClicked}>
          Install
        </NotificationButton>
      </Notification>
    );
  }

  return (
    <NotificationBar>
      {notifications}
    </NotificationBar>
  );
}

// Capture errors that don't happen during rendering.
window.onerror = function (msg, url, lineNo, columnNo, error) {
  const app = (window as any)._PP64instance;
  if (error) {
    if (app) {
      _onError(app, error, null);
    }
    else { // Occurred during ReactDOM.render?
      alert(error);
    }
  }
};

const body = document.getElementById("body");
ReactDOM.render(
  <Provider store={store}>
    <PP64App ref={app => (window as any)._PP64instance = app} />
  </Provider>,
  body
);

function _onError(app: PP64App, error: Error, errorInfo: React.ErrorInfo | null) {
  app.setState({
    error,
    errorInfo,
  });
  console.error(error, errorInfo);
}

interface IErrorDisplayProps {
  error: Error,
  errorInfo: React.ErrorInfo | null,
  onClearError(): void;
}

function ErrorDisplay(props: IErrorDisplayProps) {
  const componentStack = props.errorInfo && props.errorInfo.componentStack;
  return (
    <div className="errorDiv selectable">
      <h2>Hey, it seeems like something's wrong in&nbsp;
        <span className="errorStrikeoutText">Mushroom Village</span>&nbsp;
        PartyPlanner64.</h2>
      <p>Please &nbsp;
        <a href="https://github.com/PartyPlanner64/PartyPlanner64/issues" target="_blank" rel="noopener noreferrer">
          file an issue
        </a>
        &nbsp; with the following details, and refresh the page. Or &nbsp;
        <a href="#" onClick={props.onClearError}>click here</a>&nbsp;
        to dismiss this error, but you may be in a bad state.
      </p>
      <pre>{props.error.toString()}</pre>
      {props.error.stack ? <React.Fragment>
        <div>Stack Error Details:</div>
        <pre>{props.error.stack}</pre>
      </React.Fragment>
        : null
      }
      <div>Component Stack Error Details:</div>
      <pre>{componentStack || "N/A"}</pre>
    </div>
  );
}
