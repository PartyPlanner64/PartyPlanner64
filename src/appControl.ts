import { romhandler } from "./romhandler";
import { IBoard, ISpace, IEventInstance } from "./boards";
import { Action } from "./types";
import { IEvent } from "./events/events";
import { Notification } from "./components/notifications";
import { IDecisionTreeNode } from "./ai/aitrees";
import { store } from "./app/store";
import { confirmFromUserAction, promptUserAction, showMessageAction, showMessageHTMLAction } from "./app/blocker";

export function getAppInstance(): import("./app").PP64App {
  return (window as any)._PP64instance;
}

export function currentBoardChanged(currentBoard: IBoard) {
  getAppInstance().setState({
    currentBoard: currentBoard,
    selectedSpaces: null,
    currentAction: Action.MOVE,
    overrideBg: null,
    aiTree: null,
  });
}

export function boardsChanged(boards: IBoard[]) {
  getAppInstance().setState({ boards, aiTree: null }); // : getBoards()
}

export function romLoadedChanged() {
  getAppInstance().setState({ romLoaded: romhandler.romIsLoaded() });
}

export function changeCurrentAction(action: Action) {
  getAppInstance().setState({ currentAction: action });
}

export function getCurrentAction() {
  return getAppInstance().state.currentAction;
}

export function changeSelectedSpaces(selectedSpaces: ISpace[]) {
  getAppInstance().setState({ selectedSpaces, aiTree: null });
}

export function getSelectedSpaces() {
  return getAppInstance().state.selectedSpaces;
}

export function changeCurrentEvent(event: IEvent | null, board?: IBoard) {
  getAppInstance().setState({
    currentEvent: event,
    currentEventIsBoardEvent: !!board,
  });
}

export function getCurrentEvent() {
  return getAppInstance().state.currentEvent;
}

export function getCurrentEventIsBoardEvent(): boolean {
  return getAppInstance().state.currentEventIsBoardEvent;
}

export function setHoveredBoardEvent(hoveredBoardEvent: IEventInstance | null) {
  getAppInstance().setState({ hoveredBoardEvent });
}

export function getHoveredBoardEvent(): IEventInstance | null {
  return getAppInstance().state.hoveredBoardEvent;
}

export function setOverrideBg(overrideBg: string | null) {
  getAppInstance().setState({ overrideBg });
}

export function getOverrideBg(): string | null {
  return getAppInstance()?.state.overrideBg || null;
}


export function showMessage(message?: string) {
  store.dispatch(showMessageAction(message));
}

export function showMessageHTML(html: string) {
  store.dispatch(showMessageHTMLAction(html));
}

export function confirmFromUser(message: string): Promise<boolean> {
  let resolveFunction: (value: boolean) => void;
  const promise = new Promise<boolean>((resolve) => {
    resolveFunction = resolve;
  });
  store.dispatch(confirmFromUserAction({
    message,
    onConfirmed: (value?: string) => {
      resolveFunction(value !== undefined);
    }
  }));
  return promise;
}

/**
 * Displays a "modal" prompt to collect a value from the user.
 * Promise resolves to undefined if the user cancels.
 */
export function promptUser(message: string): Promise<string | undefined> {
  let resolveFunction: (value?: string) => void;
  const promise = new Promise<string | undefined>((resolve) => {
    resolveFunction = resolve;
  });
  store.dispatch(promptUserAction({ message, onSubmit: resolveFunction! }));
  return promise;
}

export function refresh() {
  getAppInstance().forceUpdate();
}

export function addNotification(notification: React.ReactElement<Notification>) {
  const notifications = getAppInstance().state.notifications.slice();
  notifications.push(notification);
  getAppInstance().setState({ notifications });
}

export function removeNotification(notification: React.ReactElement<Notification>) {
  const notifications = getAppInstance().state.notifications.slice();
  const index = notifications.indexOf(notification);
  notifications.splice(index, 1);
  getAppInstance().setState({ notifications });
}

export function changeDecisionTree(tree: IDecisionTreeNode[] | null): void {
  getAppInstance().setState({ aiTree: tree });
}