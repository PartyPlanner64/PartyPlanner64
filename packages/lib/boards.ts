import { getAdapter } from "./adapter/adapters";
import { IDecisionTreeNode } from "./ai/aitrees";
import { ICustomEvent } from "./events/customevents";
import {
  EventMap,
  EventParameterValues,
  getEvent,
  IEventParameter,
} from "./events/events";
import {
  BoardType,
  CostumeType,
  EditorEventActivationType,
  EventCodeLanguage,
  EventExecutionType,
  GameVersion,
  Space,
  SpaceSubtype,
} from "./types";
import { assert } from "./utils/debug";
import { copyObject } from "./utils/obj";

interface IBoardImage {
  width: number;
  height: number;
  src: string; // sometimes boolean inside this file.
}

interface IBoardBgDetails extends IBoardImage {
  fov: number;
  scaleFactor: number;
  cameraEyePosX: number;
  cameraEyePosY: number;
  cameraEyePosZ: number;
  lookatPointX: number;
  lookatPointY: number;
  lookatPointZ: number;
}

export interface IBoardEvent {
  language: EventCodeLanguage;
  code: string;
}

export interface IBoardAudioData {
  name: string;
  data: string;
  soundbankIndex: number;
}

/** Type of board audio. */
export enum BoardAudioType {
  /** Song from the original game. */
  InGame = 0,
  /** Song provided by the user. */
  Custom = 1,
}

/** The subset of an IEvent that is kept on a space in the board. */
export interface IEventInstance {
  id: string;
  activationType: EditorEventActivationType;
  executionType: EventExecutionType;
  parameterValues?: EventParameterValues;
  custom?: boolean;
}

export interface ISpace {
  x: number;
  y: number;
  z: number;
  rotation?: number;
  type: Space;
  subtype?: SpaceSubtype;
  events?: IEventInstance[];
  star?: boolean;
  aiTree?: IDecisionTreeNode[];
}

export interface IBoard {
  name: string;
  description: string;
  game: GameVersion;
  type: BoardType;
  difficulty: number;
  spaces: ISpace[];
  links: { [startingSpaceIndex: number]: number | number[] };
  events: { [name: string]: IBoardEvent | string };
  boardevents?: IEventInstance[];
  bg: IBoardBgDetails;
  otherbg: {
    boardselect?: string;
    boardselecticon?: string;
    boardlogo?: string;
    boardlogotext?: string;
    boardlogomedium?: string;
    boardlogosmall?: string;
    largescene?: string;
    conversation?: string;
    splashscreen?: string;
  };
  animbg?: string[];
  additionalbg?: string[];
  additionalbgcode?: IBoardEvent | string;
  audioType?: BoardAudioType;
  audioIndex?: number;
  audioData?: IBoardAudioData[];
  audioSelectCode?: IBoardEvent;
  costumeTypeIndex?: CostumeType;
  _rom?: boolean;
  _deadSpace?: number;
}

/**
 * Applies "fixes" to a board which may be from an older editor version.
 * @param board Board from an arbitrary PP64 version.
 * @returns Given board.
 */
export function fixPotentiallyOldBoard(board: IBoard): IBoard {
  if (!("game" in (board as Partial<IBoard>))) {
    board.game = 1;
  }

  if (!("type" in (board as Partial<IBoard>))) {
    board.type = BoardType.NORMAL;
  }

  if (!("events" in (board as Partial<IBoard>))) {
    board.events = {};
  }

  for (const eventId in board.events) {
    const eventData = board.events[eventId];
    if (typeof eventData === "string") {
      board.events[eventId] = {
        code: eventData,
        language: EventCodeLanguage.MIPS,
      };
    }
  }

  if (typeof board.audioType === "undefined") {
    board.audioType = BoardAudioType.InGame;
  }

  if (board.audioData && !Array.isArray(board.audioData)) {
    board.audioData = [(board as any).audioData];
  }

  if (board.game === 2 && typeof board.costumeTypeIndex !== "number") {
    board.costumeTypeIndex = CostumeType.NORMAL;
  }

  _migrateOldCustomEvents(board);

  if (!("fov" in board.bg)) {
    switch (board.game) {
      case 3:
        if (board.type === BoardType.DUEL) {
          Object.assign(board.bg, {
            fov: 15,
            scaleFactor: 0.1,
            cameraEyePosX: 0,
            cameraEyePosY: 210,
            cameraEyePosZ: 210,
            lookatPointX: 0,
            lookatPointY: 0,
            lookatPointZ: 0,
          });
        } else {
          Object.assign(board.bg, {
            fov: 15,
            scaleFactor: 0.1,
            cameraEyePosX: 0,
            cameraEyePosY: 300,
            cameraEyePosZ: 300,
            lookatPointX: 0,
            lookatPointY: 0,
            lookatPointZ: 0,
          });
        }
        break;
      case 2:
        Object.assign(board.bg, {
          fov: 3,
          scaleFactor: 0.1,
          cameraEyePosX: 0,
          cameraEyePosY: 1570,
          cameraEyePosZ: 1577,
          lookatPointX: 0,
          lookatPointY: 0,
          lookatPointZ: 0,
        });
        break;
      case 1:
        Object.assign(board.bg, {
          fov: 17,
          scaleFactor: 1,
          cameraEyePosX: 0,
          cameraEyePosY: 1355,
          cameraEyePosZ: 1780,
          lookatPointX: 0,
          lookatPointY: 0,
          lookatPointZ: 0,
        });
        break;
    }
  }

  return board;
}

function _migrateOldCustomEvents(board: IBoard) {
  forEachEvent(board, (spaceEvent: IEventInstance) => {
    // Unnecessary properties of space events.
    if ("parameters" in spaceEvent) {
      delete (spaceEvent as any).parameters;
    }
    if ("supportedGames" in spaceEvent) {
      delete (spaceEvent as any).supportedGames;
    }

    // Move any asm into the single collection.
    if ((spaceEvent as ICustomEvent).asm) {
      spaceEvent.id = (spaceEvent as any).name;
      if (
        board.events[spaceEvent.id] &&
        board.events[spaceEvent.id] !== (spaceEvent as ICustomEvent).asm
      ) {
        console.warn(
          `When updating the format of ${board.name}, event ${spaceEvent.id} had multiple versions. Only one will be kept.`,
        );
      }
      board.events[spaceEvent.id] = (spaceEvent as ICustomEvent).asm;
      delete (spaceEvent as any).asm;
    }
  });
}

/**
 * Tests if there is a connection from startIdx to endIdx.
 * If endIdx is "*"" or not passed, test if any connection is outbound from startIdx.
 */
export function hasConnection(
  startIdx: number,
  endIdx: number | "*",
  board: IBoard,
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

// Returns array of space indices connected to from a space.
export function getConnections(spaceIndex: number, board: IBoard) {
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

export function getAudioSelectCode(board: IBoard): IBoardEvent | null {
  return board.audioSelectCode || null;
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

export function supportsAnimationBackgrounds(board: IBoard): boolean {
  return board.game === 2;
}

export function supportsAdditionalBackgrounds(board: IBoard): boolean {
  return board.game !== 2;
}

export function getSpaceIndex(space: ISpace, board: IBoard) {
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

export function getSpacesOfType(type: Space, board: IBoard): number[] {
  const spaces = board.spaces;
  const typeSpaces = [];
  for (let i = 0; i < spaces.length; i++) {
    if (!spaces[i]) continue;
    if (spaces[i].type === type) typeSpaces.push(i);
  }
  return typeSpaces;
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

export function getSpacesOfSubType(
  subtype: SpaceSubtype,
  board: IBoard,
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
export function getSpacesWithEvent(eventName: string, board: IBoard): number[] {
  const eventSpaces: number[] = [];
  forEachEvent(board, (event, eventIndex, space, spaceIndex) => {
    if (space && event.id === eventName) {
      eventSpaces.push(spaceIndex!);
    }
  });
  return eventSpaces;
}

interface ForEachEventCallback {
  (
    event: IEventInstance,
    eventIndex: number,
    space?: ISpace,
    spaceIndex?: number,
  ): void;
}

export function forEachEvent(board: IBoard, fn: ForEachEventCallback) {
  if (board.boardevents) {
    // Reverse to allow deletion in callback.
    for (let i = board.boardevents.length - 1; i >= 0; i--) {
      const event = board.boardevents[i];
      fn(event, i);
    }
  }

  const spaces = board.spaces;
  if (spaces && spaces.length) {
    for (let s = 0; s < spaces.length; s++) {
      const space = spaces[s];
      if (space.events && space.events.length) {
        for (let i = space.events.length - 1; i >= 0; i--) {
          const event = space.events[i];
          fn(event, i, space, s);
        }
      }
    }
  }
}

interface ForEachEventParameterCallback {
  (
    param: IEventParameter,
    event: IEventInstance,
    eventIndex: number,
    space?: ISpace,
    spaceIndex?: number,
  ): void;
}

export function forEachEventParameter(
  board: IBoard,
  eventLibrary: EventMap,
  fn: ForEachEventParameterCallback,
) {
  forEachEvent(board, (eventInstance, eventIndex, space, spaceIndex) => {
    const event = getEvent(eventInstance.id, board, eventLibrary);
    assert(!!event);
    if (event.parameters) {
      for (let p = 0; p < event.parameters.length; p++) {
        const parameter = event.parameters[p];
        fn(parameter, eventInstance, eventIndex, space, spaceIndex);
      }
    }
  });
}
