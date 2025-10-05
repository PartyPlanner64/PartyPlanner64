import {
  Game,
  EventExecutionType,
  EventParameterType,
  EventCodeLanguage,
  EditorEventActivationType,
} from "../types";
import { copyObject } from "../utils/obj";
import {
  getCurrentBoard,
  getBoardEvent,
} from "../../../apps/partyplanner64/boards";
import { romhandler } from "../romhandler";
import {
  ICustomEvent,
  writeCustomEvent,
  createCustomEvent,
} from "./customevents";
import { getEventFromLibrary, getEventsInLibrary } from "./EventLibrary";
import { IBoardInfo } from "../adapter/boardinfobase";
import { IBoard, IEventInstance, ISpace } from "../boards";

export type EventMap = { [id: string]: IEvent };

export interface IEvent {
  readonly id: string;
  readonly name: string;
  readonly parse?: (dataView: DataView, info: IEventParseInfo) => boolean;
  readonly write?: (
    dataView: DataView,
    event: IEventInstance,
    info: IEventWriteInfo,
    temp: any,
  ) => [number, number, number] | string | false;
  readonly activationType: EditorEventActivationType;
  readonly executionType: EventExecutionType;
  readonly fakeEvent?: boolean;
  readonly supportedGames: Game[];
  readonly parameters?: IEventParameter[];
  readonly custom?: boolean;
  readonly language?: EventCodeLanguage;
}

/** Parameter provided to an event. */
export interface IEventParameter {
  name: string;
  type: EventParameterType;
}

export type EventParameterValue = number | number[] | boolean;

export type EventParameterValues = { [name: string]: EventParameterValue };

function _supportedGamesMatch(supportedGames: Game[], gameVersion: number) {
  for (let i = 0; i < supportedGames.length; i++) {
    switch (supportedGames[i]) {
      case Game.MP1_USA:
      case Game.MP1_JPN:
      case Game.MP1_PAL:
        if (gameVersion === 1) return true;
        break;
      case Game.MP2_USA:
      case Game.MP2_JPN:
      case Game.MP2_PAL:
        if (gameVersion === 2) return true;
        break;
      case Game.MP3_USA:
      case Game.MP3_JPN:
      case Game.MP3_PAL:
        if (gameVersion === 3) return true;
        break;
    }
  }
  return false;
}

/** Gets an event, either from the board's set or the global library. */
export function getEvent(
  eventId: string,
  board: IBoard,
  eventLibrary: EventMap,
): IEvent | undefined {
  if (board && board.events && !!getBoardEvent(board, eventId)) {
    const boardEvent = getBoardEvent(board, eventId);
    return createCustomEvent(boardEvent!.language, boardEvent!.code);
  }
  return eventLibrary[eventId];
}

/** Creates an event instance (the object stored in the board json for a given event) */
export function createEventInstance(
  event: IEvent,
  args?: Partial<IEventInstance>,
): IEventInstance {
  const spaceEvent = Object.assign(
    {
      id: event.id,
      activationType: event.activationType,
      executionType: event.executionType,
    },
    args,
  );
  if (event.custom) spaceEvent.custom = true;

  return spaceEvent;
}

export interface IEventParseInfo {
  addr: number;
  offset: number;
  board: IBoard;
  boardIndex: number;
  curSpace: number;
  curSpaceIndex: number;
  chains: number[][];
  game: Game;
  gameVersion: 1 | 2 | 3;
}

export function parse(romView: DataView, info: IEventParseInfo) {
  const currentGame = romhandler.getROMGame()!;
  const _events = getEventsInLibrary();
  for (const eventId in _events) {
    const event = _events[eventId];
    if (!event.parse) continue;
    if (event.supportedGames.indexOf(currentGame) === -1) continue;
    const args = event.parse(romView, info);
    if (args) {
      if (event.fakeEvent) return true;
      const result: any = {
        id: eventId,
      };
      if (args !== true) result.args = args;
      return result;
    }
  }
  return false;
}

export function getAvailableEvents(): IEvent[] {
  const events = [];
  const _events = getEventsInLibrary();
  const curGameVersion = getCurrentBoard().game || 1;
  for (const id in _events) {
    const event = _events[id];
    if (
      _supportedGamesMatch(event.supportedGames, curGameVersion) &&
      !event.fakeEvent
    )
      events.push(event);
  }
  return events;
}

export function getCustomEvents(): ICustomEvent[] {
  const events = [];
  const _events = getEventsInLibrary();
  for (const id in _events) {
    const event = _events[id];
    if (event.custom) events.push(copyObject(event));
  }
  return events;
}

export interface IEventWriteInfo {
  boardIndex: number;
  board: IBoard;
  boardInfo: IBoardInfo;
  audioIndices: number[];
  curSpaceIndex: number;
  curSpace: ISpace | null;
  chains: number[][];
  offset?: number;
  addr?: number;
  game: Game;
  gameVersion: 1 | 2 | 3;
  argsAddr?: number;
  testCompile?: boolean;
}

export async function write(
  buffer: ArrayBuffer,
  event: IEventInstance,
  info: IEventWriteInfo,
  temp: any,
) {
  const asmView = new DataView(buffer, info.offset);

  let result;
  if (event.custom) {
    const boardEvent = getBoardEvent(info.board, event.id)!;
    if (!boardEvent)
      throw new Error(
        `A space had the ${event.id} custom event, but its code wasn't in the board file`,
      );
    result = await writeCustomEvent(
      asmView,
      event,
      info,
      boardEvent.language,
      boardEvent.code,
      temp,
    );
  } else {
    const libEvent = getEventFromLibrary(event.id);
    if (!libEvent) {
      throw new Error(
        `Could not find/write ${event.id} for game ${info.gameVersion}`,
      );
    }
    result = libEvent.write!(asmView, event, info, temp);
  }

  if (result === false)
    throw new Error(`Could not write ${event.id} for game ${info.gameVersion}`);

  return result;
}

export function isUnsupported(event: IEvent, gameId: Game) {
  return event.supportedGames.indexOf(gameId) === -1;
}
