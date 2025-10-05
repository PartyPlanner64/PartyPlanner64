import {
  BoardType,
  Space,
  SpaceSubtype,
  EventCodeLanguage,
  CostumeType,
} from "../../packages/lib/types";
import { copyObject } from "../../packages/lib/utils/obj";
import { ICustomEvent } from "../../packages/lib/events/customevents";
import { getEvent, EventMap } from "../../packages/lib/events/events";
import { getAdapter, getROMAdapter } from "../../packages/lib/adapter/adapters";
import {
  boardsChanged,
  clearUndoHistory,
  currentBoardChanged,
  getAppInstance,
} from "./appControl";
import { IDecisionTreeNode } from "../../packages/lib/ai/aitrees";

import defaultThemeBoardSelect from "./img/themes/default/boardselect.png";
import defaultThemeBoardSelectIcon from "./img/themes/default/boardselecticon.png";
import defaultThemeBoardLogo from "./img/themes/default/boardlogo.png";
import defaultThemeBoardLogoText from "./img/themes/default/boardlogotext.png";
import defaultThemeBoardLogoMedium from "./img/themes/default/boardlogomedium.png";
import defaultThemeBoardLogoSmall from "./img/themes/default/boardlogosmall.png";
import defaultThemeLargeScene from "./img/themes/default/largescene.png";
import defaultThemeConversation from "./img/themes/default/conversation.png";
import defaultThemeSplashscreen from "./img/themes/default/splashscreen.png";
import defaultThemeBg from "./img/themes/default/bg.png";
import defaultThemeBg2 from "./img/themes/default/bg2.png";
import { store } from "./store";
import {
  addAdditionalBackgroundAction,
  addAnimationBackgroundAction,
  addBoardAction,
  addConnectionAction,
  addEventToBoardAction,
  addEventToSpaceAction,
  addEventToSpacesAction,
  addSpaceAction,
  clearBoardsFromROMAction,
  copyCurrentBoardAction,
  deleteBoardAction,
  excludeEventFromBoardAction,
  includeEventInBoardAction,
  removeAdditionalBackgroundAction,
  removeAnimationBackgroundAction,
  removeEventFromBoardAction,
  removeEventFromSpaceAction,
  removeEventsFromSpacesAction,
  removeSpaceAction,
  selectBoards,
  selectCurrentBoard,
  selectCurrentBoardIndex,
  selectCurrentBoardIsROM,
  selectData,
  selectROMBoards,
  setAdditionalBackgroundCodeAction,
  setAudioSelectCodeAction,
  setBackgroundAction,
  setBoardAudioAction,
  setBoardCostumeTypeIndexAction,
  setBoardDescriptionAction,
  setBoardDifficultyAction,
  setBoardNameAction,
  setBoardOtherBgAction,
  setCurrentBoardAction,
  setSpaceHostsStarAction,
  setSpaceRotationAction,
} from "./boardState";
import { getEventsInLibrary } from "../../packages/lib/events/EventLibrary";
import {
  BoardAudioType,
  fixPotentiallyOldBoard,
  forEachEvent,
  IBoard,
  IBoardEvent,
  IEventInstance,
  ISpace,
} from "../../packages/lib/boards";

const _themes = {
  default: {
    boardselect: defaultThemeBoardSelect,
    boardselecticon: defaultThemeBoardSelectIcon,
    boardlogo: defaultThemeBoardLogo,
    boardlogotext: defaultThemeBoardLogoText,
    boardlogomedium: defaultThemeBoardLogoMedium,
    boardlogosmall: defaultThemeBoardLogoSmall,
    largescene: defaultThemeLargeScene,
    conversation: defaultThemeConversation,
    splashscreen: defaultThemeSplashscreen,
    bg: defaultThemeBg,
    bg2: defaultThemeBg2,
  },
};

export function _makeDefaultBoard(
  gameVersion: 1 | 2 | 3 = 1,
  type: BoardType = BoardType.NORMAL,
): IBoard {
  const board: any = {
    name: "Untitled",
    description: "Use your Star Power to finish\nthis board.",
    game: gameVersion,
    type: type,
    difficulty: 3,
    spaces: [],
    links: {},
    events: {},
    audioType: BoardAudioType.InGame,
  };
  switch (gameVersion) {
    case 1:
      board.bg = {
        width: 960,
        height: 720,
        src: true, // Replaced with theme url later.
        fov: 17,
        scaleFactor: 1,
        cameraEyePosX: 0,
        cameraEyePosY: 1355,
        cameraEyePosZ: 1780,
        lookatPointX: 0,
        lookatPointY: 0,
        lookatPointZ: 0,
      };
      board.otherbg = {
        boardselect: true, // Replaced with theme url later.
        boardlogo: true,
        largescene: true,
        conversation: true,
        splashscreen: true,
      };
      board.audioIndex = 0x18; // Mambo!
      break;
    case 2:
      board.bg = {
        width: 1152,
        height: 864,
        src: true,
        fov: 3,
        scaleFactor: 0.1,
        cameraEyePosX: 0,
        cameraEyePosY: 1570,
        cameraEyePosZ: 1577,
        lookatPointX: 0,
        lookatPointY: 0,
        lookatPointZ: 0,
      };
      board.animbg = [];
      board.otherbg = {
        boardselect: true,
        boardselecticon: true,
        boardlogo: true,
        largescene: true,
      };
      board.audioIndex = 0x36; // Mini-Game Stadium
      board.costumeTypeIndex = CostumeType.NORMAL;
      break;
    case 3:
      switch (type) {
        case BoardType.NORMAL:
          board.bg = {
            width: 1152,
            height: 864,
            src: true,
            fov: 15,
            scaleFactor: 0.1,
            cameraEyePosX: 0,
            cameraEyePosY: 300,
            cameraEyePosZ: 300,
            lookatPointX: 0,
            lookatPointY: 0,
            lookatPointZ: 0,
          };
          board.audioIndex = 0x29; // VS Millenium Star!
          break;
        case BoardType.DUEL:
          board.bg = {
            width: 896,
            height: 672,
            src: true,
            fov: 15,
            scaleFactor: 0.1,
            cameraEyePosX: 0,
            cameraEyePosY: 210,
            cameraEyePosZ: 210,
            lookatPointX: 0,
            lookatPointY: 0,
            lookatPointZ: 0,
          };
          board.audioIndex = 0; // TODO
          break;
      }

      board.otherbg = {
        boardselect: true,
        boardlogo: true,
        boardlogotext: true,
        boardlogomedium: true,
        boardlogosmall: true,
        largescene: true,
      };
      break;
  }

  if (type === BoardType.DUEL) {
    board.spaces.push({
      x: 200,
      y: 200,
      type: Space.DUEL_START_BLUE,
    });
    board.spaces.push({
      x: board.bg.width - 200,
      y: board.bg.height - 200,
      type: Space.DUEL_START_RED,
    });
  } else {
    board.spaces.push({
      x: board.bg.width - 200,
      y: board.bg.height - 200,
      type: Space.START,
    });
  }
  applyTheme(board);
  return board;
}

function applyTheme(board: IBoard, name: "default" = "default") {
  const themeImages = _themes[name];

  if (board.otherbg.boardselect)
    board.otherbg.boardselect = themeImages.boardselect;
  if (board.otherbg.boardselecticon)
    board.otherbg.boardselecticon = themeImages.boardselecticon;
  if (board.otherbg.boardlogo) board.otherbg.boardlogo = themeImages.boardlogo;
  if (board.otherbg.boardlogotext)
    board.otherbg.boardlogotext = themeImages.boardlogotext;
  if (board.otherbg.boardlogomedium)
    board.otherbg.boardlogomedium = themeImages.boardlogomedium;
  if (board.otherbg.boardlogosmall)
    board.otherbg.boardlogosmall = themeImages.boardlogosmall;
  if (board.otherbg.largescene)
    board.otherbg.largescene = themeImages.largescene;
  if (board.otherbg.conversation)
    board.otherbg.conversation = themeImages.conversation;
  if (board.otherbg.splashscreen)
    board.otherbg.splashscreen = themeImages.splashscreen;
  switch (board.game) {
    case 1:
      board.bg.src = themeImages.bg;
      break;
    case 2:
    case 3:
      board.bg.src = themeImages.bg2;
      break;
  }
}

/**
 * Adds a board to the board collection.
 * @param board The board to add. If not passed, a default board is generated.
 * @param opts.rom The board is from the ROM
 * @param opts.type Board type to use
 * @param opts.game Game version for the board
 * @returns The index of the inserted board.
 */
export function addBoard(
  board?: IBoard | null,
  opts: { rom?: boolean; game?: 1 | 2 | 3; type?: BoardType } = {},
) {
  if (!board)
    board = _makeDefaultBoard(opts.game || 1, opts.type || BoardType.NORMAL);

  if (opts.rom) {
    board._rom = true;
  }

  fixPotentiallyOldBoard(board);

  store.dispatch(addBoardAction({ board, rom: opts.rom }));

  const app = getAppInstance();
  if (app) boardsChanged();
  const storeData = selectData(store.getState());
  const collection = opts.rom ? storeData.romBoards : storeData.boards;

  return collection.length - 1;
}

export function getCurrentBoard(): IBoard {
  const board = selectCurrentBoard(store.getState());
  return board;
}

export function indexOfBoard(board: IBoard) {
  return selectBoards(store.getState()).indexOf(board);
}

export function setCurrentBoard(index: number, isRom?: boolean) {
  store.dispatch(setCurrentBoardAction({ index, rom: !!isRom }));

  currentBoardChanged();
}

export function boardIsROM(board: IBoard) {
  return !!board._rom;
}

/**
 * Tests if there is a connection from startIdx to endIdx.
 * If endIdx is "*"" or not passed, test if any connection is outbound from startIdx.
 */
export function hasConnection(
  startIdx: number,
  endIdx: number | "*",
  board: IBoard = getCurrentBoard(),
) {
  if (Array.isArray(board.links[startIdx])) {
    if (endIdx === "*" || endIdx === undefined) return true; // Asking if any connections exist out of startIdx
    return (board.links[startIdx] as number[]).indexOf(endIdx) >= 0;
  }
  if (board.links[startIdx] !== undefined && board.links[startIdx] !== null) {
    if (endIdx === "*" || endIdx === undefined) return true;
    return board.links[startIdx] === endIdx;
  }
  return false;
}

/** Adds an event to be executed during specific moments. */
export function addEventToBoard(event: IEventInstance) {
  store.dispatch(addEventToBoardAction({ event }));
}

/** Removes an event from `boardevents`. */
export function removeEventFromBoard(eventIndex: number) {
  store.dispatch(removeEventFromBoardAction({ eventIndex }));
}

export function addEventToSpace(event: IEventInstance, toStart?: boolean) {
  store.dispatch(addEventToSpaceAction({ event, toStart }));
}

export function addEventToSpaces(
  event: IEventInstance,
  spaceIndices: number[],
) {
  store.dispatch(addEventToSpacesAction({ event, spaceIndices }));
}

export function addEventToSpaceInternal(
  board: IBoard,
  space: ISpace,
  event: IEventInstance,
  toStart: boolean,
  eventLibrary: EventMap,
) {
  space.events = space.events || [];
  if (event) {
    if (toStart) space.events.unshift(event);
    else space.events.push(event);

    if (event.custom) {
      const customEvent = getEvent(
        event.id,
        board,
        eventLibrary,
      ) as ICustomEvent;
      includeEventInBoardInternal(board, customEvent);
    }
  }
}

export function removeEventFromSpace(eventIndex: number) {
  store.dispatch(removeEventFromSpaceAction({ eventIndex }));
}

export function removeEventsFromSpaces(
  eventIndices: number[],
  spaceIndices: number[],
) {
  store.dispatch(removeEventsFromSpacesAction({ eventIndices, spaceIndices }));
}

export function getBoardEvent(
  board: IBoard,
  eventId: string,
): IBoardEvent | null {
  if (board.events) {
    const boardEvent = board.events[eventId];
    if (typeof boardEvent === "string") {
      return { language: EventCodeLanguage.MIPS, code: boardEvent };
    }
    return boardEvent || null;
  }
  return null;
}

/** Includes an event in the collection of events kept within the board file. */
export function includeEventInBoard(event: ICustomEvent) {
  store.dispatch(includeEventInBoardAction({ event }));
}

export function includeEventInBoardInternal(
  board: IBoard,
  event: ICustomEvent,
) {
  if (!event.asm)
    throw new Error(
      `Attempting to add event ${event.name} but it doesn't have code`,
    );
  board.events[event.name] = {
    language: event.language!,
    code: event.asm,
  };
}

/** Removes an event from the collection of events stored in the board file. */
export function excludeEventFromBoard(eventId: string): void {
  store.dispatch(excludeEventFromBoardAction({ eventId }));
}

export function getAdditionalBackgroundCode(board: IBoard): IBoardEvent | null {
  if (board.additionalbgcode) {
    const additionalBgCode = board.additionalbgcode;
    if (typeof additionalBgCode === "string") {
      return { language: EventCodeLanguage.MIPS, code: additionalBgCode };
    }
    return additionalBgCode || null;
  }
  return null;
}

export function setAdditionalBackgroundCode(
  code: string,
  language: EventCodeLanguage,
): void {
  store.dispatch(setAdditionalBackgroundCodeAction({ code, language }));
}

export function getAudioSelectCode(board: IBoard): IBoardEvent | null {
  return board.audioSelectCode || null;
}

export function setAudioSelectCode(
  code: string,
  language: EventCodeLanguage,
): void {
  store.dispatch(setAudioSelectCodeAction({ code, language }));
}

export function getDeadEnds(board: IBoard) {
  const deadEnds: number[] = [];
  const spaces = _getSpacesCopy(board);

  function _getSpacesCopy(board: IBoard) {
    return copyObject(board.spaces);
  }

  function _checkDeadEnd(spaceIndex: number): boolean | undefined {
    if (spaces[spaceIndex]._seen) return false; // We have reached a previous space - no dead end.
    if (!board.links.hasOwnProperty(spaceIndex)) {
      deadEnds.push(spaceIndex);
      return true;
    }

    spaces[spaceIndex]._seen = true;
    const nextSpaces = board.links[spaceIndex];
    let result;
    if (Array.isArray(nextSpaces)) {
      for (let i = 0; i < nextSpaces.length; i++) {
        result = _checkDeadEnd(nextSpaces[i]);
        if (result) return result;
      }
    } else {
      result = _checkDeadEnd(nextSpaces);
      if (result) return result;
    }
  }

  // Build a reverse lookup of space to _pointing_ spaces.
  const pointingMap: { [index: number]: number[] } = {};
  for (let s = 0; s < spaces.length; s++) {
    if (spaces[s]) pointingMap[s] = [];
  }
  for (const startIdx in board.links) {
    const ends = getConnections(parseInt(startIdx), board)!;
    ends.forEach((end) => {
      pointingMap[end].push(Number(startIdx));
    });
  }

  // Returns true if the given space is linked to from another space besides
  // the previous space.
  function spaceIsLinkedFromByAnother(spaceIdx: number, prevIdx?: number) {
    // If no previous index passed, just see if anything points.
    if (prevIdx === undefined) return !!pointingMap[spaceIdx].length;

    if (!pointingMap[spaceIdx].length) return false;
    if (pointingMap[spaceIdx].indexOf(Number(prevIdx)) === -1) return true;
    if (pointingMap[spaceIdx].length > 1) return true; // Assumes prevIdx is not duplicated
    return false; // length === 1 && only entry is prevIdx
  }

  const startIdx = getStartSpaceIndex(board);
  if (startIdx >= 0) _checkDeadEnd(startIdx);

  for (let s = 0; s < spaces.length; s++) {
    if (!spaces[s]) continue;
    if (spaces[s]._seen) continue; // Don't even need to check, we already visited it.

    // The latter condition is not totally necessary, but I don't know that
    // we want to or can handle single-space chains.
    if (
      !spaceIsLinkedFromByAnother(s) &&
      hasConnection(s, null as any, board)
    ) {
      // FIXME: passing null?
      _checkDeadEnd(s);
    }
  }

  return deadEnds;
}

export function getCurrentBoardIndex() {
  return selectCurrentBoardIndex(store.getState());
}

export function currentBoardIsROM() {
  return selectCurrentBoardIsROM(store.getState());
}

export function getBoardCount() {
  return selectBoards(store.getState()).length;
}

export function getBoards() {
  return selectBoards(store.getState());
}

export function getROMBoards() {
  return selectROMBoards(store.getState());
}

export function setBG(bg: string) {
  store.dispatch(setBackgroundAction({ bg }));
}

export function addAnimBG(bg: string) {
  store.dispatch(addAnimationBackgroundAction({ bg }));
}

export function removeAnimBG(index: number) {
  store.dispatch(removeAnimationBackgroundAction({ index }));
}

export function supportsAnimationBackgrounds(board: IBoard): boolean {
  return board.game === 2;
}

export function addAdditionalBG(bg: string) {
  store.dispatch(addAdditionalBackgroundAction({ bg }));
}

export function removeAdditionalBG(index: number) {
  store.dispatch(removeAdditionalBackgroundAction({ index }));
}

export function supportsAdditionalBackgrounds(board: IBoard): boolean {
  return board.game !== 2;
}

export function addDecisionTree(
  board: IBoard,
  spaceIndex: number,
  tree: IDecisionTreeNode[],
): void {
  // board.spaces[spaceIndex].aiTree = tree;
}

export function deleteBoard(boardIndex: number) {
  store.dispatch(deleteBoardAction({ boardIndex }));
  boardsChanged();
  currentBoardChanged();
}

export function copyCurrentBoard(makeCurrent?: boolean): void {
  store.dispatch(copyCurrentBoardAction({ makeCurrent }));
  boardsChanged();
}

export function setBoardName(name: string): void {
  store.dispatch(setBoardNameAction({ name }));
}

export function setBoardDescription(description: string): void {
  store.dispatch(setBoardDescriptionAction({ description }));
}

export function setBoardDifficulty(difficulty: number): void {
  store.dispatch(setBoardDifficultyAction({ difficulty }));
}

export function setBoardCostumeTypeIndex(costumeType: CostumeType): void {
  store.dispatch(setBoardCostumeTypeIndexAction({ costumeType }));
}

export function setBoardOtherBackground(
  name: keyof IBoard["otherbg"],
  value: string,
): void {
  store.dispatch(setBoardOtherBgAction({ name, value }));
}

export function setHostsStar(spaceIndices: number[], hostsStar: boolean): void {
  store.dispatch(setSpaceHostsStarAction({ spaceIndices, hostsStar }));
}

export interface IBoardAudioChanges {
  audioType?: BoardAudioType;
  gameAudioIndex?: number;
  customAudioIndex?: number;
  midiName?: string;
  midiData?: string;
  soundbankIndex?: number;
  delete?: boolean;
}

export function setBoardAudio(audioChanges: IBoardAudioChanges): void {
  store.dispatch(setBoardAudioAction({ audioChanges }));
}

export function addSpace(
  x: number,
  y: number,
  type: Space,
  subtype?: SpaceSubtype,
  board?: IBoard,
): number {
  // Hack for callers not editing redux state.
  if (board) {
    return addSpaceInternal(x, y, type, subtype, board, getEventsInLibrary());
  } else {
    const newIndex = getCurrentBoard().spaces.length;
    store.dispatch(addSpaceAction({ x, y, type, subtype }));
    return newIndex;
  }
}

export function addSpaceInternal(
  x: number,
  y: number,
  type: Space,
  subtype: SpaceSubtype | undefined,
  board: IBoard,
  eventLibrary: EventMap,
): number {
  const newSpace: any = {
    x,
    y,
    z: 0,
    type: type,
  };

  if (subtype !== undefined) newSpace.subtype = subtype;

  const adapter = getAdapter(board.game || 1, {});
  if (adapter) adapter.hydrateSpace(newSpace, board, eventLibrary);

  board.spaces.push(newSpace);
  return board.spaces.length - 1;
}

export function removeSpace(index: number) {
  store.dispatch(removeSpaceAction({ index }));
}

export function getSpaceIndex(space: ISpace, board = getCurrentBoard()) {
  return board.spaces.indexOf(space);
}

export function getStartSpaceIndex(board: IBoard) {
  const spaces = board.spaces;
  for (let i = 0; i < spaces.length; i++) {
    if (!spaces[i]) continue;
    if (spaces[i].type === Space.START) return i;
  }
  return -1;
}

export function getSpacesOfType(
  type: Space,
  board: IBoard = getCurrentBoard(),
): number[] {
  const spaces = board.spaces;
  const typeSpaces = [];
  for (let i = 0; i < spaces.length; i++) {
    if (!spaces[i]) continue;
    if (spaces[i].type === type) typeSpaces.push(i);
  }
  return typeSpaces;
}

export function getSpacesOfSubType(
  subtype: SpaceSubtype,
  board: IBoard = getCurrentBoard(),
): number[] {
  const spaces = board.spaces;
  const subtypeSpaces = [];
  for (let i = 0; i < spaces.length; i++) {
    if (!spaces[i]) continue;
    if (spaces[i].subtype === subtype) subtypeSpaces.push(i);
  }
  return subtypeSpaces;
}

/** Returns array of space indices of spaces with a given event. */
export function getSpacesWithEvent(
  eventName: string,
  board: IBoard = getCurrentBoard(),
): number[] {
  const eventSpaces: number[] = [];
  forEachEvent(board, (event, eventIndex, space, spaceIndex) => {
    if (space && event.id === eventName) {
      eventSpaces.push(spaceIndex!);
    }
  });
  return eventSpaces;
}

/** Gets the index of the "dead space." The space is created if it hasn't been already. */
export function getDeadSpaceIndex(board: IBoard): number {
  if (typeof board._deadSpace === "number") {
    return board._deadSpace;
  }
  const deadSpaceIndex = addSpace(
    board.bg.width + 150,
    board.bg.height + 100,
    Space.OTHER,
    undefined,
    board,
  );
  board._deadSpace = deadSpaceIndex;
  return deadSpaceIndex;
}

/** Gets the "dead space." The space is created if it hasn't been already. */
export function getDeadSpace(board: IBoard): ISpace {
  return board.spaces[getDeadSpaceIndex(board)];
}

// Returns array of space indices connected to from a space.
export function getConnections(
  spaceIndex: number,
  board: IBoard = getCurrentBoard(),
) {
  if (spaceIndex < 0) return null;

  if (!board.links) {
    return [];
  }

  if (Array.isArray(board.links[spaceIndex]))
    return (board.links[spaceIndex] as number[]).slice(0);

  if (typeof board.links[spaceIndex] === "number")
    return [board.links[spaceIndex] as number];

  return [];
}

export function addConnectionInternal(
  startSpaceIndex: number,
  endSpaceIndex: number,
  board: IBoard,
): void {
  if (
    startSpaceIndex === endSpaceIndex ||
    hasConnection(startSpaceIndex, endSpaceIndex, board)
  )
    return;

  board.links = board.links || {};
  if (Array.isArray(board.links[startSpaceIndex]))
    (board.links[startSpaceIndex] as number[]).push(endSpaceIndex);
  else if (typeof board.links[startSpaceIndex] === "number")
    board.links[startSpaceIndex] = [
      board.links[startSpaceIndex] as number,
      endSpaceIndex,
    ];
  else if (endSpaceIndex >= 0) board.links[startSpaceIndex] = endSpaceIndex;
}

export function addConnection(
  startSpaceIndex: number,
  endSpaceIndex: number,
  board?: IBoard,
) {
  if (board) {
    // Hack: the places that do pass a board aren't modifying the redux store.
    addConnectionInternal(startSpaceIndex, endSpaceIndex, board);
  } else {
    store.dispatch(addConnectionAction({ startSpaceIndex, endSpaceIndex }));
  }
}

export function setSpaceRotation(spaceIndex: number, angleYAxisDeg: number) {
  store.dispatch(setSpaceRotationAction({ spaceIndex, angleYAxisDeg }));
}

export function addEventByIndex(
  board: IBoard,
  spaceIdx: number,
  event: any,
  toStart: boolean,
  eventLibrary: EventMap,
) {
  const space = board.spaces[spaceIdx];
  addEventToSpaceInternal(board, space, event, toStart, eventLibrary);
}

export function loadBoardsFromROM() {
  const adapter = getROMAdapter({});
  if (!adapter) return;

  const gameBoards = adapter.loadBoards();
  for (const gameBoard of gameBoards) {
    gameBoard._rom = true;
    store.dispatch(addBoardAction({ board: gameBoard, rom: true }));
  }

  boardsChanged();
  clearUndoHistory();
}

export function clearBoardsFromROM() {
  store.dispatch(clearBoardsFromROMAction());
}
