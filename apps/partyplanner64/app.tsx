// This is the top level of the application, and includes the root React view.

import { View, Action, EventCodeLanguage } from "../../packages/lib/types";
import {
  setAdditionalBackgroundCode,
  setAudioSelectCode,
  _makeDefaultBoard,
} from "./boards";
import * as React from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
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
import {
  Notification,
  NotificationBar,
  NotificationButton,
  NotificationColor,
} from "./components/notifications";
import { Header } from "./header";
import { ToolWindow } from "./toolwindow";
import { Toolbar } from "./toolbar";
import { SpaceProperties } from "./spaceproperties";
import { BoardProperties } from "./boardproperties";
import "./utils/onbeforeunload";
import "../../packages/lib/events/builtin/events.include";
import "file-saver";
import { DebugView } from "./views/debug";
import { AudioViewer } from "./views/audio";
import { BasicCodeEditorView } from "./views/basiccodeeditorview";
import { DecisionTreeEditor } from "./aieditor";
import { IDecisionTreeNode } from "../../packages/lib/ai/aitrees";
import { isElectron } from "../../packages/lib/utils/electron";
import {
  blockUI,
  showMessage,
  changeDecisionTree,
  undo,
  redo,
  clearUndoHistory,
} from "./appControl";
import { Blocker } from "./components/blocker";
import { killEvent } from "./utils/react";
import {
  getDefaultAdditionalBgCode,
  testAdditionalBgCodeAllGames,
} from "../../packages/lib/events/additionalbg";
import {
  getDefaultGetAudioCode,
  testGetAudioCodeAllGames,
} from "../../packages/lib/events/getaudiochoice";
import { SpriteView } from "./views/sprites";
import { store } from "./store";
import {
  selectCurrentAction,
  selectCurrentView,
  selectNotifications,
  selectRomLoaded,
  selectUpdateExists,
  setHideUpdateNotification,
  setUpdateExistsAction,
} from "./appState";
import { useCallback } from "react";
import {
  useAppDispatch,
  useAppSelector,
  useEditorThemeClass,
  useSelectedSpaceCount,
  useWindowTitle,
} from "./hooks";
import {
  selectBlocked,
  selectConfirm,
  selectMessage,
  selectMessageHTML,
  selectOnBlockerFinished,
  selectPrompt,
} from "./blocker";
import {
  addEventToLibraryAction,
  selectBoards,
  selectCurrentBoard,
  setBoardsAction,
} from "./boardState";
import { BasicErrorBoundary } from "./components/BasicErrorBoundary";
import { useHotkeys } from "react-hotkeys-hook";
import {
  getSavedBoards,
  getSavedEvents,
} from "../../packages/lib/utils/localstorage";
import { IEvent } from "../../packages/lib/events/events";
import {
  createCustomEvent,
  ICustomEvent,
} from "../../packages/lib/events/customevents";
import { setEventLibraryImplementation } from "../../packages/lib/events/EventLibrary";
import { ReduxEventLibrary } from "./events/ReduxEventLibrary";
import {
  fixPotentiallyOldBoard,
  getAdditionalBackgroundCode,
  getAudioSelectCode,
  IBoard,
} from "../../packages/lib/boards";
import { setWebCanvasImplementation } from "./utils/canvas";

/* eslint-disable jsx-a11y/anchor-is-valid */

interface IPP64AppState {
  aiTree: IDecisionTreeNode[] | null;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  initialized: boolean;
}

export class PP64App extends React.Component<{}, IPP64AppState> {
  state: IPP64AppState = {
    aiTree: null,
    error: null,
    errorInfo: null,
    initialized: false,
  };

  render() {
    if (this.state.error) {
      return (
        <ErrorDisplay
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onClearError={() => {
            this.setState({ error: null, errorInfo: null });
            blockUI(false);
          }}
        />
      );
    }

    if (!this.state.initialized) {
      return null; // Init in componentDidMount
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
      } catch (e) {
        console.error("Auto update failed in componentDidMount: ", e);
      }
    }

    if (!this.state.initialized) {
      initializeState();
      this.setState({ initialized: true });
    }
  }

  componentWillUnmount() {
    if (isElectron) {
      try {
        const ipcRenderer = (window as any).require("electron").ipcRenderer;
        ipcRenderer.removeListener(
          "update-check-hasupdate",
          this._onUpdateCheckHasUpdate,
        );
      } catch (e) {
        console.error("Auto update failed in componentWillUnmount: ", e);
      }
    }
  }

  _onUpdateCheckHasUpdate = () => {
    store.dispatch(setUpdateExistsAction(true));
  };
}

interface PP64AppInternalProps {
  aiTree: IDecisionTreeNode[] | null;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

function PP64AppInternal(props: PP64AppInternalProps) {
  const currentView = useAppSelector(selectCurrentView);
  const blocked = useAppSelector(selectBlocked);
  const boards = useAppSelector(selectBoards);
  const currentBoard = useAppSelector(selectCurrentBoard);
  const currentAction = useAppSelector(selectCurrentAction);
  const romLoaded = useAppSelector(selectRomLoaded);

  useWindowTitle(currentBoard.name);
  useEditorThemeClass();
  usePP64Hotkeys();

  let mainView;
  switch (currentView) {
    case View.EDITOR:
      mainView = <Editor />;
      break;
    case View.DETAILS:
      mainView = <Details board={currentBoard} />;
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
      mainView = (
        <BasicErrorBoundary>
          <EventsView />
        </BasicErrorBoundary>
      );
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
      mainView = (
        <BasicCodeEditorView
          board={currentBoard}
          title="Additional Background Configuration"
          getExistingCode={() => getAdditionalBackgroundCode(currentBoard)}
          getDefaultCode={(lang) => getDefaultAdditionalBgCode(lang)}
          onSetCode={(code, lang) => setAdditionalBackgroundCode(code, lang)}
          canSaveAndExit={(code, lang) =>
            testAdditionalBgCodeAllGames(code, lang, currentBoard)
          }
        />
      );
      break;
    case View.AUDIO_SELECTION_CODE:
      mainView = (
        <BasicCodeEditorView
          board={currentBoard}
          title="Background Music Selection Code"
          getExistingCode={() => getAudioSelectCode(currentBoard)}
          getDefaultCode={(lang) => getDefaultGetAudioCode(lang)}
          onSetCode={(code, lang) => setAudioSelectCode(code, lang)}
          canSaveAndExit={(code, lang) =>
            testGetAudioCodeAllGames(code, lang, currentBoard)
          }
        />
      );
      break;
  }

  let sidebar;
  switch (currentView) {
    case View.EDITOR:
    case View.DETAILS:
    case View.EVENTS:
      sidebar = (
        <div className="sidebar">
          <BoardMenu boards={boards} />
        </div>
      );
      break;
  }

  let bodyClass = "body";
  if (currentAction === Action.ERASE) bodyClass += " eraser";

  return (
    <div className={bodyClass}>
      <PP64NotificationBar />
      <Header view={currentView} romLoaded={romLoaded} board={currentBoard} />
      <div
        className="content"
        onKeyDownCapture={blocked ? killEvent : undefined}
      >
        {sidebar}
        <div className="main">
          {mainView}
          <div className="mainOverlay">
            <ToolWindow
              name="Toolbox"
              position="TopRight"
              visible={currentView === View.EDITOR}
            >
              <Toolbar
                currentAction={currentAction}
                gameVersion={currentBoard.game}
                boardType={currentBoard.type}
              />
            </ToolWindow>
            <SpacePropertiesToolWindow
              currentView={currentView}
              currentBoard={currentBoard}
            />
            <ToolWindow
              name="Board Properties"
              position="BottomLeft"
              visible={currentView === View.EDITOR}
            >
              <BoardProperties currentBoard={currentBoard} />
            </ToolWindow>
            {props.aiTree && (
              <ToolWindow
                name="AI Decision Tree"
                position="TopLeft"
                visible={currentView === View.EDITOR}
                canClose
                onCloseClick={() => changeDecisionTree(null)}
              >
                <DecisionTreeEditor root={props.aiTree} />
              </ToolWindow>
            )}
          </div>
          <div id="dragZone"></div>
        </div>
      </div>
      <PP64Blocker />
    </div>
  );
}

interface ISpacePropertiesToolWindowProps {
  currentView: View;
  currentBoard: IBoard;
}

function SpacePropertiesToolWindow({
  currentView,
  currentBoard,
}: ISpacePropertiesToolWindowProps) {
  const selectedSpaceCount = useSelectedSpaceCount();
  let title = "Space Properties";
  if (selectedSpaceCount > 1) {
    title += ` (${selectedSpaceCount} selected)`;
  }
  return (
    <ToolWindow
      name={title}
      position="BottomRight"
      visible={currentView === View.EDITOR}
    >
      <SpaceProperties
        gameVersion={currentBoard.game}
        boardType={currentBoard.type}
      />
    </ToolWindow>
  );
}

function usePP64Hotkeys(): void {
  const currentView = useAppSelector(selectCurrentView);
  const blocked = useAppSelector(selectBlocked);

  const allowUndoRedo = !blocked && currentView === View.EDITOR;

  useHotkeys(
    "ctrl+z",
    (event, handler) => {
      undo();
    },
    {
      enabled: allowUndoRedo,
      enableOnFormTags: ["INPUT", "SELECT"],
    },
  );

  useHotkeys(
    "ctrl+y",
    (event, handler) => {
      redo();
    },
    {
      enabled: allowUndoRedo,
      enableOnFormTags: ["INPUT", "SELECT"],
    },
  );
}

function PP64NotificationBar() {
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

  const updateHideNotification = useAppSelector(
    (state) => state.app.updateHideNotification,
  );

  const updateExists = useAppSelector(selectUpdateExists);
  const notifications = useAppSelector(selectNotifications).slice();

  if (updateExists && !updateHideNotification) {
    notifications.push(
      <Notification
        key="update"
        color={NotificationColor.Blue}
        onClose={onUpdateNotificationClosed}
      >
        An update is available.
        <NotificationButton onClick={onUpdateNotificationInstallClicked}>
          Install
        </NotificationButton>
      </Notification>,
    );
  }

  return <NotificationBar>{notifications}</NotificationBar>;
}

function PP64Blocker() {
  const blocked = useAppSelector(selectBlocked);
  const message = useAppSelector(selectMessage);
  const messageHTML = useAppSelector(selectMessageHTML);
  const prompt = useAppSelector(selectPrompt);
  const confirm = useAppSelector(selectConfirm);
  const onBlockerFinished = useAppSelector(selectOnBlockerFinished);

  if (!blocked) {
    return null;
  }

  return (
    <Blocker
      message={message}
      messageHTML={messageHTML}
      prompt={prompt}
      confirm={confirm}
      onAccept={(value?: string) => {
        showMessage();
        if (onBlockerFinished) {
          onBlockerFinished(value);
        }
      }}
      onCancel={() => {
        showMessage();
        if (onBlockerFinished) {
          onBlockerFinished();
        }
      }}
      onForceClose={() => blockUI(false)}
    />
  );
}

// Capture errors that don't happen during rendering.
window.onerror = function (msg, url, lineNo, columnNo, error) {
  const app = (window as any)._PP64instance;
  if (error) {
    if (app) {
      _onError(app, error, null);
    } else {
      // Occurred during ReactDOM.render?
      alert(error);
    }
  }
};

function initializeState(): void {
  setEventLibraryImplementation(new ReduxEventLibrary());

  let boards;
  const cachedBoards = getSavedBoards();
  if (cachedBoards && cachedBoards.length) {
    boards = cachedBoards.map((board) => fixPotentiallyOldBoard(board));
  } else {
    boards = [_makeDefaultBoard(1)];
  }
  store.dispatch(setBoardsAction({ boards }));

  const cachedEvents = getSavedEvents();
  if (cachedEvents && cachedEvents.length) {
    cachedEvents.forEach((eventObj: IEvent) => {
      if (!eventObj || !(eventObj as ICustomEvent).asm) return;
      try {
        const customEventObj = eventObj as ICustomEvent;
        const customEvent = createCustomEvent(
          customEventObj.language || EventCodeLanguage.MIPS,
          customEventObj.asm,
        );
        store.dispatch(addEventToLibraryAction({ event: customEvent }));
      } catch (e) {
        // Just let the error slide, event format changed or something?
        console.error("Error reading cached event", e);
      }
    });
  }

  clearUndoHistory();
}

setWebCanvasImplementation();

const body = document.getElementById("body");
const root = createRoot(body!);
root.render(
  <Provider store={store}>
    <PP64App ref={(app) => ((window as any)._PP64instance = app)} />
  </Provider>,
);

function _onError(
  app: PP64App,
  error: Error,
  errorInfo: React.ErrorInfo | null,
) {
  app.setState({
    error,
    errorInfo,
  });
  console.error(error, errorInfo);
}

interface IErrorDisplayProps {
  error: Error;
  errorInfo: React.ErrorInfo | null;
  onClearError(): void;
}

function ErrorDisplay(props: IErrorDisplayProps) {
  const componentStack = props.errorInfo && props.errorInfo.componentStack;
  return (
    <div className="errorDiv selectable">
      <h2>
        Hey, it seeems like {"something's"} wrong in&nbsp;
        <span className="errorStrikeoutText">Mushroom Village</span>&nbsp;
        PartyPlanner64.
      </h2>
      <p>
        Please &nbsp;
        <a
          href="https://github.com/PartyPlanner64/PartyPlanner64/issues"
          target="_blank"
          rel="noopener noreferrer"
        >
          file an issue
        </a>
        &nbsp; with the following details, and refresh the page. Or &nbsp;
        <a href="#" onClick={props.onClearError}>
          click here
        </a>
        &nbsp; to dismiss this error, but you may be in a bad state.
      </p>
      <pre>{props.error.toString()}</pre>
      {props.error.stack ? (
        <React.Fragment>
          <div>Stack Error Details:</div>
          <pre>{props.error.stack}</pre>
        </React.Fragment>
      ) : null}
      <div>Component Stack Error Details:</div>
      <pre>{componentStack || "N/A"}</pre>
    </div>
  );
}
