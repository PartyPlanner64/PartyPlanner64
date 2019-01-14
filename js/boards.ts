import { BoardType, Space, SpaceSubtype } from "./types";
import { getSavedBoards } from "./utils/localstorage";
import { copyObject } from "./utils/obj";
import { createCustomEvent } from "./events/customevents";
import { getEvent } from "./events/events";
import { getAdapter, getROMAdapter } from "./adapter/adapters";
import { getAppInstance, boardsChanged, currentBoardChanged } from "./appControl";

export interface IBoard {
  name: string;
  description: string;
  type: BoardType;
  difficulty: number;
  spaces: ISpace[];
  links: { [startingSpaceIndex: number]: (number | number[]) };
  game: 1 | 2 | 3;
  bg: IBoardBgDetails;
  otherbg: any;
  animbg?: any;
  audioIndex: number;
  _rom?: boolean;
  _deadSpace?: number;
}

interface IBoardBgDetails {
  width: number;
  height: number;
  src: string; // sometimes boolean inside this file.

  fov: number;
  unk: number;
  cameraEyePosX: number;
  cameraEyePosY: number;
  cameraEyePosZ: number;
  lookatPointX: number;
  lookatPointY: number;
  lookatPointZ: number;
}

export interface ISpace {
  x: number;
  y: number;
  z: number;
  rotation?: number;
  type: Space;
  subtype?: SpaceSubtype;
  events?: any[];
  star?: boolean;
}

let currentBoard: number = 0;
let currentBoardIsRom: boolean = false;

function _makeDefaultBoard(gameVersion: 1 | 2 | 3 = 1, type: BoardType = BoardType.NORMAL): IBoard {
  const board: any = {
    name: "Untitled",
    description: "Use your Star Power to finish\nthis board.",
    type: type,
    difficulty: 3,
    spaces: [],
    links: {},
    game: gameVersion,
  };
  switch (gameVersion) {
    case 1:
      board.bg = {
        "width": 960,
        "height": 720,
        "src": true, // Replaced with theme url later.
        fov: 17,
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
        fov: 17,
      };
      board.animbg = [];
      board.otherbg = {
        boardselect: true,
        boardselecticon: true,
        boardlogo: true,
        largescene: true,
      };
      break;
    case 3:
      switch (type) {
        case BoardType.NORMAL:
          board.bg = {
            width: 1152,
            height: 864,
            src: true,
            fov: 17,
          };
          break;
        case BoardType.DUEL:
          board.bg = {
            width: 896,
            height: 672,
            src: true,
            fov: 17,
          };
          break;
      }

      board.otherbg = {
        boardselect: true,
        boardlogo: true,
        boardlogotext: true,
        largescene: true,
      };
      break;
  }

  if (type === BoardType.DUEL) {
    board.spaces.push({
      x: 200,
      y: 200,
      type: Space.DUEL_START_BLUE
    });
    board.spaces.push({
      x: board.bg.width - 200,
      y: board.bg.height - 200,
      type: Space.DUEL_START_RED
    });
  }
  else {
    board.spaces.push({
      x: board.bg.width - 200,
      y: board.bg.height - 200,
      type: Space.START
    });
  }
  applyTheme(board);
  return board;
}

let boards: IBoard[];
let romBoards: IBoard[] = [];

let cachedBoards = getSavedBoards();
if (cachedBoards && cachedBoards.length) {
  boards = [];
  // Go through addBoard to collect any custom events.
  cachedBoards.forEach(board => addBoard(board));
}
else {
  boards = [ _makeDefaultBoard(1) ];
}

/**
 * Adds a board to the board collection.
 * @param board The board to add. If not passed, a default board is generated.
 * @param opts.rom The board is from the ROM
 * @param opts.type Board type to use
 * @param opts.game Game version for the board
 * @returns The index of the inserted board.
 */
export function addBoard(board?: IBoard | null, opts: { rom?: boolean, game?: 1 | 2 | 3, type?: BoardType } = {}) {
  if (!board)
    board = _makeDefaultBoard(opts.game || 1, opts.type || BoardType.NORMAL);

  const collection = opts.rom ? romBoards : boards;
  if (opts.rom) {
    board._rom = true;
    collection.push(board);
  }
  else
    collection.push(board);

  _findAllCustomEvents(board);

  const app = getAppInstance();
  if (app)
    boardsChanged(getBoards());

  return collection.length - 1;
}

export function getCurrentBoard(forExport: boolean = false): IBoard {
  let board;
  if (currentBoardIsRom) {
    board = romBoards[currentBoard];
  }
  else {
    board = boards[currentBoard];
  }
  if (forExport)
    board = stripPrivateProps(board);
  return board;
}

export function indexOfBoard(board: IBoard) {
  return boards.indexOf(board);
}

export function setCurrentBoard(index: number, isRom?: boolean) {
  currentBoardIsRom = !!isRom;
  currentBoard = index;
  // FIXME: Circular dependency
  currentBoardChanged(getCurrentBoard());
}

export function boardIsROM(board: IBoard) {
    return !!board._rom;
}

/**
 * Tests if there is a connection from startIdx to endIdx.
 * If endIdx is "*"" or not passed, test if any connection is outbound from startIdx.
 */
export function hasConnection(startIdx: number, endIdx: number | "*", board: IBoard = getCurrentBoard()) {
  if (Array.isArray(board.links[startIdx])) {
    if (endIdx === "*" || endIdx === undefined)
      return true; // Asking if any connections exist out of startIdx
    return (board.links[startIdx] as number[]).indexOf(endIdx) >= 0;
  }
  if (board.links[startIdx] !== undefined && board.links[startIdx] !== null) {
    if (endIdx === "*" || endIdx === undefined)
      return true;
    return board.links[startIdx] === endIdx;
  }
  return false;
}

// Removes all connections to a certain space.
function _removeConnections(spaceIdx: number, board: IBoard) {
  if (!board.links)
    return;

  delete board.links[spaceIdx];
  for (let startSpace in board.links) {
    let value = board.links[startSpace];
    if (Array.isArray(value)) {
      let entry = value.indexOf(spaceIdx);
      if (entry !== -1)
        value.splice(entry, 1);
      if (value.length === 1)
        board.links[startSpace] = value[0];
      else if (!value.length)
        delete board.links[startSpace];
    }
    else if (value === spaceIdx) {
      delete board.links[startSpace];
    }
  }
}

function _removeAssociations(spaceIdx: number, board: IBoard) {
  _forEachEventParameter(board, (parameter: any, event: any) => {
    if (parameter.type === "Space") {
      if (event.parameterValues && event.parameterValues.hasOwnProperty(parameter.name)) {
        if (event.parameterValues[parameter.name] === spaceIdx) {
          delete event.parameterValues[parameter.name];
        }
      }
    }
  });
}

function _forEachEventParameter(board: IBoard, fn: any) {
  const spaces = board.spaces;
  if (spaces && spaces.length) {
    for (let s = 0; s < spaces.length; s++) {
      const space = spaces[s];
      if (space.events && space.events.length) {
        for (let i = 0; i < space.events.length; i++) {
          const event = space.events[i];
          if (event.parameters) {
            for (let p = 0; p < event.parameters.length; p++) {
              const parameter = event.parameters[p];
              fn(parameter, event, space);
            }
          }
        }
      }
    }
  }
}

// Removes any _ prefixed property from a board.
function stripPrivateProps(obj: any = {}): any {
  if (typeof obj !== "object")
    return obj;

  obj = JSON.parse(JSON.stringify(obj));
  for (var prop in obj) {
    if (!obj.hasOwnProperty(prop))
      continue;
    if (prop.charAt(0) === '_')
      delete obj[prop];
    if (typeof obj[prop] === "object" && obj[prop] !== null)
      obj[prop] = stripPrivateProps(obj[prop]);
  }
  return obj;
}

export function addEventToSpace(space: ISpace, event: any, toStart?: boolean) {
  space.events = space.events || [];
  if (event) {
    if (toStart)
      space.events.unshift(event);
    else
      space.events.push(event);
  }
}

export function removeEventFromSpace(space: ISpace, event: any) {
  if (!space || !event || !space.events)
    return;

  // Try to just splice a given reference.
  let eventIndex = space.events.indexOf(event);
  if (eventIndex !== -1) {
    space.events.splice(eventIndex, 1);
    return;
  }

  // Otherwise, try to search for essentially the same thing?
}

function applyTheme(board: IBoard, name = "default") {
  const themePathPrefix = "img/themes/";

  if (board.otherbg.boardselect)
    board.otherbg.boardselect = themePathPrefix + name + "/boardselect.png";
  if (board.otherbg.boardselecticon)
    board.otherbg.boardselecticon = themePathPrefix + name + "/boardselecticon.png";
  if (board.otherbg.boardlogo)
    board.otherbg.boardlogo = themePathPrefix + name + "/boardlogo.png";
  if (board.otherbg.boardlogotext)
    board.otherbg.boardlogotext = themePathPrefix + name + "/boardlogotext.png";
  if (board.otherbg.largescene)
    board.otherbg.largescene = themePathPrefix + name + "/largescene.png";
  if (board.otherbg.conversation)
    board.otherbg.conversation = themePathPrefix + name + "/conversation.png";
  if (board.otherbg.splashscreen)
    board.otherbg.splashscreen = themePathPrefix + name + "/splashscreen.png";
  switch (board.game) {
    case 1:
      board.bg.src = themePathPrefix + name + "/bg.png";
      break;
    case 2:
    case 3:
      board.bg.src = themePathPrefix + name + "/bg2.png";
      break;
  }
}

export function getDeadEnds(board: IBoard) {
  const deadEnds: number[] = [];
  let spaces = _getSpacesCopy(board);

  function _getSpacesCopy(board: IBoard) {
    return copyObject(board.spaces);
  }

  function _checkDeadEnd(spaceIndex: number): boolean | undefined {
    if (spaces[spaceIndex]._seen)
      return false; // We have reached a previous space - no dead end.
    if (!board.links.hasOwnProperty(spaceIndex)) {
      deadEnds.push(spaceIndex);
      return true;
    }

    spaces[spaceIndex]._seen = true;
    let nextSpaces = board.links[spaceIndex];
    let result;
    if (Array.isArray(nextSpaces)) {
      for (var i = 0; i < nextSpaces.length; i++) {
        result = _checkDeadEnd(nextSpaces[i]);
        if (result)
          return result;
      }
    }
    else {
      result = _checkDeadEnd(nextSpaces);
      if (result)
        return result;
    }
  }

  // Build a reverse lookup of space to _pointing_ spaces.
  var pointingMap: { [index: number]: number[] } = {};
  for (let s = 0; s < spaces.length; s++) {
    if (spaces[s])
      pointingMap[s] = [];
  }
  for (let startIdx in board.links) {
    let ends = getConnections(parseInt(startIdx), board)!;
    ends.forEach(end => {
      pointingMap[end].push(Number(startIdx));
    });
  }

  // Returns true if the given space is linked to from another space besides
  // the previous space.
  function spaceIsLinkedFromByAnother(spaceIdx: number, prevIdx?: number) {
    // If no previous index passed, just see if anything points.
    if (prevIdx === undefined)
      return !!pointingMap[spaceIdx].length;

    if (!pointingMap[spaceIdx].length)
      return false;
    if (pointingMap[spaceIdx].indexOf(Number(prevIdx)) === -1)
      return true;
    if (pointingMap[spaceIdx].length > 1)
      return true; // Assumes prevIdx is not duplicated
    return false; // length === 1 && only entry is prevIdx
  }

  let startIdx = getStartSpaceIndex(board);
  if (startIdx >= 0)
    _checkDeadEnd(startIdx);

  for (let s = 0; s < spaces.length; s++) {
    if (!spaces[s])
      continue;
    if (spaces[s]._seen)
      continue; // Don't even need to check, we already visited it.

    // The latter condition is not totally necessary, but I don't know that
    // we want to or can handle single-space chains.
    if (!spaceIsLinkedFromByAnother(s) && hasConnection(s, null as any, board)) { // FIXME: passing null?
      _checkDeadEnd(s);
    }
  }

  return deadEnds;
}

function _findAllCustomEvents(board: IBoard) {
  if (!board.spaces)
    return;

  for (let s = 0; s < board.spaces.length; s++) {
    const space = board.spaces[s];
    if (!space.events)
      continue;

    for (let e = 0; e < space.events.length; e++) {
      const event = space.events[e];
      if (!event.asm)
        continue;

      if (getEvent(event.id))
        continue; // Already exists

      try {
        createCustomEvent(event.asm);
      }
      catch (e) {
        console.error("Error reading custom event from loaded board: " + e.toString());
        // Since it errored out, I guess remove it?
        space.events.splice(e, 1);
      }
    }
  }
}

export function getCurrentBoardIndex() {
  return currentBoard;
}

export function currentBoardIsROM() {
  return currentBoardIsRom;
}

export function getBoardCount() {
  return boards.length;
}

export function getBoards() {
  return boards;
}

export function getROMBoards() {
  return romBoards;
}

export function setBG(bg: any, board = getCurrentBoard()) {
  board.bg.src = bg;
}

export function addAnimBG(bg: any, board = getCurrentBoard()) {
  board.animbg = board.animbg || [];
  board.animbg.push(bg);
}

export function removeAnimBG(index: number, board = getCurrentBoard()) {
  if (!board.animbg || board.animbg.length <= index || index < 0)
    return;

  board.animbg.splice(index, 1);
}

export function deleteBoard(boardIdx: number) {
  if (isNaN(boardIdx) || boardIdx < 0 || boardIdx >= boards.length)
    return;

  if (boards.length === 1)
    addBoard(); // Can never be empty.

  boards.splice(boardIdx, 1);

  if (currentBoard > boardIdx)
    setCurrentBoard(currentBoard - 1);
  else if (boards.length === 1)
    setCurrentBoard(0); // We deleted the last remaining board
  else if (currentBoard === boardIdx && currentBoard === boards.length)
    setCurrentBoard(currentBoard - 1); // We deleted the end and current entry.

  boardsChanged(getBoards());
  currentBoardChanged(getCurrentBoard());
}

export function copyCurrentBoard(): number {
  let source;
  if (currentBoardIsRom) {
    source = romBoards[currentBoard];
  }
  else {
    source = boards[currentBoard];
  }
  let copy = JSON.parse(JSON.stringify(source));
  delete copy._rom;
  copy.name = "Copy of " + copy.name;

  let insertionIndex;
  if (currentBoardIsRom) {
    insertionIndex = boards.length;
    boards.push(copy);
  }
  else {
    insertionIndex = currentBoard + 1;
    boards.splice(insertionIndex, 0, copy);
  }

  boardsChanged(getBoards());

  return insertionIndex;
}

export function addSpace(x: number, y: number, type: Space,
  subtype?: SpaceSubtype, board: IBoard = getCurrentBoard()) {
  let newSpace: any = {
    x,
    y,
    z: 0,
    type: type
  };

  if (subtype !== undefined)
    newSpace.subtype = subtype;

  let adapter = getAdapter(board.game || 1);
  if (adapter)
    adapter.hydrateSpace(newSpace);

  for (let i = 0; i < board.spaces.length; i++) {
    // FIXME: This was clearly not working.
    // if (board.spaces === null) {
    //   board.spaces[i] = newSpace;
    //   return i;
    // }
  }

  board.spaces.push(newSpace);
  return board.spaces.length - 1;
}

export function removeSpace(index: number, board: IBoard = getCurrentBoard()) {
  if (index < 0 || index >= board.spaces.length)
    return;

  // Remove any attached connections.
  _removeConnections(index, board);
  _removeAssociations(index, board);

  // Remove the actual space.
  let oldSpaceLen = board.spaces.length;
  board.spaces.splice(index, 1);

  function _adjust(oldIdx: any) {
    return parseInt(oldIdx) > parseInt(index as any) ? oldIdx - 1 : oldIdx;
  }

  // Update the links that are at a greater index.
  let start, end;
  for (let i = 0; i < oldSpaceLen; i++) {
    if (!board.links.hasOwnProperty(i))
      continue;

    start = _adjust(i);
    end = board.links[i];
    if (start !== i)
      delete board.links[i];
    if (Array.isArray(end))
      board.links[start] = end.map(_adjust);
    else
      board.links[start] = _adjust(end);
  }

  // Update space event parameter indices
  _forEachEventParameter(board, (parameter: any, event: any) => {
    if (parameter.type === "Space") {
      if (event.parameterValues && event.parameterValues.hasOwnProperty(parameter.name)) {
        event.parameterValues[parameter.name] = _adjust(event.parameterValues[parameter.name]);
      }
    }
  });
}

export function getSpaceIndex(space: ISpace, board = getCurrentBoard()) {
  return board.spaces.indexOf(space);
}

export function getStartSpaceIndex(board: IBoard) {
  let spaces = board.spaces;
  for (let i = 0; i < spaces.length; i++) {
    if (!spaces[i])
      continue;
    if (spaces[i].type === Space.START)
      return i;
  }
  return -1;
}

export function getSpacesOfType(type: Space, board: IBoard = getCurrentBoard()) {
  let spaces = board.spaces;
  let typeSpaces = [];
  for (let i = 0; i < spaces.length; i++) {
    if (!spaces[i])
      continue;
    if (spaces[i].type === type)
      typeSpaces.push(i);
  }
  return typeSpaces;
}

export function getSpacesOfSubType(subtype: SpaceSubtype, board: IBoard = getCurrentBoard()) {
  let spaces = board.spaces;
  let subtypeSpaces = [];
  for (let i = 0; i < spaces.length; i++) {
    if (!spaces[i])
      continue;
    if (spaces[i].subtype === subtype)
      subtypeSpaces.push(i);
  }
  return subtypeSpaces;
}

  // Returns array of space indices connected to from a space.
export function getConnections(spaceIndex: number, board: IBoard = getCurrentBoard()) {
  if (spaceIndex < 0)
    return null;

  board.links = board.links || {};
  if (Array.isArray(board.links[spaceIndex]))
    return (board.links[spaceIndex] as number[]).slice(0);

  if (typeof board.links[spaceIndex] === "number")
    return [board.links[spaceIndex] as number];

  return [];
}

export function addConnection(startIdx: number, endIdx: number, board = getCurrentBoard()) {
  if (startIdx === endIdx || hasConnection(startIdx, endIdx, board))
    return;

  board.links = board.links || {};
  if (Array.isArray(board.links[startIdx]))
    (board.links[startIdx] as number[]).push(endIdx);
  else if (typeof board.links[startIdx] === "number")
    board.links[startIdx] = [board.links[startIdx] as number, endIdx];
  else if (endIdx >= 0)
    board.links[startIdx] = endIdx;
}

export function addAssociation(startIdx: number, endIdx: number, board: any = getCurrentBoard()) { // TODO: WHAT IS THIS
  board.associations = board.associations || {};
  let startIsSubtype = isNaN(board.spaces[startIdx].subtype);
  let endIsSubtype = isNaN(board.spaces[endIdx].subtype);

  // Cannot associate two subtype spaces or two regular spaces.
  if (startIsSubtype === endIsSubtype)
    return;
}

export function setSpaceRotation(spaceIdx: number, angleYAxisDeg: number, board = getCurrentBoard()) {
  const space = board.spaces[spaceIdx];
  if (!space) {
    throw new Error("setSpaceRotation: Invalid space index " + spaceIdx);
  }

  space.rotation = Math.round(angleYAxisDeg);
}

export function addEventByIndex(board: IBoard, spaceIdx: number, event: any, toStart?: boolean) {
  const space = board.spaces[spaceIdx];
  addEventToSpace(space, event, toStart);
}

export function loadBoardsFromROM() {
  let adapter = getROMAdapter();
  if (!adapter)
    return;

  let gameBoards = adapter.loadBoards();
  for (let i = 0; i < gameBoards.length; i++) {
    gameBoards[i]._rom = true;
    romBoards.push(gameBoards[i]);
  }

  boardsChanged(getBoards());
}

export function clearBoardsFromROM() {
  romBoards = [];

  if (!boards.length)
    addBoard(); // Can never be empty.
}
