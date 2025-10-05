import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { IBoardAudioChanges, _makeDefaultBoard } from "./boards";
import {
  createCustomEvent,
  ICustomEvent,
} from "../../packages/lib/events/customevents";
import {
  EventMap,
  EventParameterValue,
  IEvent,
  IEventParameter,
} from "../../packages/lib/events/events";
import {
  CostumeType,
  EditorEventActivationType,
  EventCodeLanguage,
  EventParameterType,
  Space,
  SpaceSubtype,
} from "../../packages/lib/types";
import { assert } from "../../packages/lib/utils/debug";
import { lineDistance } from "../../packages/lib/utils/number";
import { copyObject } from "../../packages/lib/utils/obj";
import { RootState } from "./store";
import {
  addSpaceInternal,
  BoardAudioType,
  forEachEvent,
  forEachEventParameter,
  getBoardEvent,
  IBoard,
  IEventInstance,
  includeEventInBoardInternal,
  addEventToSpaceInternal,
  ISpace,
  addConnectionInternal,
} from "../../packages/lib/boards";

export type SpaceIndexMap = { [index: number]: boolean };

export enum EventType {
  None,
  Library,
  Board,
}

type Coords = [number, number, number, number];

export interface BoardState {
  boards: IBoard[];
  romBoards: IBoard[];
  currentBoardIndex: number;
  currentBoardIsROM: boolean;
  selectedSpaceIndices: SpaceIndexMap;
  selectionBoxCoords: Coords | null;
  highlightedSpaceIndices: number[] | null;
  temporaryConnections: Coords[] | null;

  eventLibrary: EventMap;
  currentEventId: string | null;
  currentEventType: EventType;
  hoveredBoardEventIndex: number;
}

const initialState: BoardState = {
  boards: [],
  romBoards: [],
  currentBoardIndex: 0,
  currentBoardIsROM: false,
  selectedSpaceIndices: {},
  selectionBoxCoords: null,
  highlightedSpaceIndices: null,
  temporaryConnections: null,

  eventLibrary: {},
  currentEventId: null,
  currentEventType: EventType.None,
  hoveredBoardEventIndex: -1,
};

export const boardStateSlice = createSlice({
  name: "boardState",
  initialState,
  reducers: {
    setBoardsAction: (
      state,
      action: PayloadAction<{
        boards: IBoard[]; // ref ok
      }>,
    ) => {
      const { boards } = action.payload;

      state.boards = boards;
    },
    addBoardAction: (
      state,
      action: PayloadAction<{
        board: IBoard; // ref ok
        rom?: boolean;
      }>,
    ) => {
      const { board, rom } = action.payload;

      const collection = rom ? state.romBoards : state.boards;
      collection.push(board);
    },
    deleteBoardAction: (
      state,
      action: PayloadAction<{
        boardIndex: number;
      }>,
    ) => {
      const { boardIndex } = action.payload;

      if (
        isNaN(boardIndex) ||
        boardIndex < 0 ||
        boardIndex >= state.boards.length
      )
        return;

      if (state.boards.length === 1) {
        state.boards.push(_makeDefaultBoard()); // Can never leave empty.
      }

      state.boards.splice(boardIndex, 1);

      let nextBoardIndex = -1;
      if (state.currentBoardIndex > boardIndex)
        nextBoardIndex = state.currentBoardIndex - 1;
      else if (state.boards.length === 1)
        nextBoardIndex = 0; // We deleted the last remaining board
      else if (
        state.currentBoardIndex === boardIndex &&
        state.currentBoardIndex === state.boards.length
      )
        nextBoardIndex = state.currentBoardIndex - 1; // We deleted the end and current entry.

      if (nextBoardIndex >= 0) {
        state.currentBoardIndex = nextBoardIndex;
        state.currentBoardIsROM = false;
      }
    },
    setCurrentBoardAction: (
      state,
      action: PayloadAction<{
        index: number;
        rom: boolean;
      }>,
    ) => {
      const { index, rom } = action.payload;

      const changing =
        state.currentBoardIndex !== index || state.currentBoardIsROM !== rom;

      state.currentBoardIndex = index;
      state.currentBoardIsROM = rom;

      if (changing) {
        state.selectedSpaceIndices = {};
        state.selectionBoxCoords = null;
        state.hoveredBoardEventIndex = -1;
        state.temporaryConnections = null;
        state.highlightedSpaceIndices = null;
      }
    },
    clearBoardsFromROMAction: (state) => {
      state.romBoards = [];

      if (!state.boards.length) {
        state.boards.push(_makeDefaultBoard()); // Can never leave empty.
      }
    },
    copyCurrentBoardAction: (
      state,
      action: PayloadAction<{ makeCurrent?: boolean }>,
    ) => {
      const source = getCurrentBoard(state);

      const copy = copyObject(source);
      delete copy._rom;
      copy.name = "Copy of " + copy.name;

      let insertionIndex;
      if (state.currentBoardIsROM) {
        insertionIndex = state.boards.length;
        state.boards.push(copy);
      } else {
        insertionIndex = state.currentBoardIndex + 1;
        state.boards.splice(insertionIndex, 0, copy);
      }

      if (action.payload.makeCurrent) {
        state.currentBoardIndex = insertionIndex;
        state.currentBoardIsROM = false;
      }
    },
    setBoardNameAction: (
      state,
      action: PayloadAction<{
        name: string;
      }>,
    ) => {
      const currentBoard = getCurrentBoard(state);
      currentBoard.name = action.payload.name;
    },
    setBoardDescriptionAction: (
      state,
      action: PayloadAction<{
        description: string;
      }>,
    ) => {
      const currentBoard = getCurrentBoard(state);
      currentBoard.description = action.payload.description;
    },
    setBoardDifficultyAction: (
      state,
      action: PayloadAction<{
        difficulty: number;
      }>,
    ) => {
      const currentBoard = getCurrentBoard(state);
      currentBoard.difficulty = action.payload.difficulty;
    },
    setBoardCostumeTypeIndexAction: (
      state,
      action: PayloadAction<{
        costumeType: CostumeType;
      }>,
    ) => {
      const currentBoard = getCurrentBoard(state);
      currentBoard.costumeTypeIndex = action.payload.costumeType;
    },
    setBackgroundAction: (
      state,
      action: PayloadAction<{
        bg: string;
      }>,
    ) => {
      const { bg } = action.payload;
      const currentBoard = getCurrentBoard(state);
      currentBoard.bg.src = bg;
    },
    setBoardOtherBgAction: (
      state,
      action: PayloadAction<{
        name: keyof IBoard["otherbg"];
        value: string;
      }>,
    ) => {
      const { name, value } = action.payload;
      const currentBoard = getCurrentBoard(state);
      currentBoard.otherbg[name] = value;
    },
    addAnimationBackgroundAction: (
      state,
      action: PayloadAction<{
        bg: string;
      }>,
    ) => {
      const { bg } = action.payload;
      const board = getCurrentBoard(state);
      board.animbg = board.animbg || [];
      board.animbg.push(bg);
    },
    removeAnimationBackgroundAction: (
      state,
      action: PayloadAction<{
        index: number;
      }>,
    ) => {
      const { index } = action.payload;
      const board = getCurrentBoard(state);
      if (!board.animbg || board.animbg.length <= index || index < 0) return;

      board.animbg.splice(index, 1);
    },
    addAdditionalBackgroundAction: (
      state,
      action: PayloadAction<{
        bg: string;
      }>,
    ) => {
      const { bg } = action.payload;
      const board = getCurrentBoard(state);
      board.additionalbg = board.additionalbg || [];
      board.additionalbg.push(bg);
    },
    removeAdditionalBackgroundAction: (
      state,
      action: PayloadAction<{
        index: number;
      }>,
    ) => {
      const { index } = action.payload;
      const board = getCurrentBoard(state);
      if (
        !board.additionalbg ||
        board.additionalbg.length <= index ||
        index < 0
      )
        return;

      board.additionalbg.splice(index, 1);
    },
    setAdditionalBackgroundCodeAction: (
      state,
      action: PayloadAction<{
        code: string;
        language: EventCodeLanguage;
      }>,
    ) => {
      const { code, language } = action.payload;
      const board = getCurrentBoard(state);
      if (code) {
        board.additionalbgcode = {
          code,
          language,
        };
      } else {
        delete board.additionalbgcode;
      }
    },
    setAudioSelectCodeAction: (
      state,
      action: PayloadAction<{
        code: string;
        language: EventCodeLanguage;
      }>,
    ) => {
      const { code, language } = action.payload;
      const board = getCurrentBoard(state);
      if (code) {
        board.audioSelectCode = {
          code,
          language,
        };
      } else {
        delete board.audioSelectCode;
      }
    },
    setBoardAudioAction: (
      state,
      action: PayloadAction<{
        audioChanges: IBoardAudioChanges;
      }>,
    ) => {
      const { audioChanges } = action.payload;
      const board = getCurrentBoard(state);

      if ("audioType" in audioChanges) {
        board.audioType = audioChanges.audioType!;
        switch (audioChanges.audioType) {
          case BoardAudioType.Custom:
            if (!board.audioData) {
              board.audioData = [];
            }
            break;
        }
      }

      if (typeof audioChanges.gameAudioIndex === "number") {
        board.audioIndex = audioChanges.gameAudioIndex;
      }

      const customAudioIndex = audioChanges.customAudioIndex;
      if (typeof customAudioIndex === "number") {
        assert(Array.isArray(board.audioData));
        assert(customAudioIndex <= board.audioData.length);

        if (customAudioIndex === board.audioData.length) {
          board.audioData.push({
            name: "(select a midi file)",
            data: "",
            soundbankIndex: 0,
          });
        }

        if (audioChanges.delete) {
          assert(customAudioIndex < board.audioData.length);
          board.audioData.splice(customAudioIndex, 1);
        } else {
          if (audioChanges.midiName) {
            board.audioData[customAudioIndex].name = audioChanges.midiName;
          }
          if (audioChanges.midiData) {
            board.audioData[customAudioIndex].data = audioChanges.midiData;
          }
          if (typeof audioChanges.soundbankIndex === "number") {
            board.audioData[customAudioIndex].soundbankIndex =
              audioChanges.soundbankIndex;
          }
        }
      }
    },
    addSpaceAction: (
      state,
      action: PayloadAction<{
        x: number;
        y: number;
        type: Space;
        subtype?: SpaceSubtype;
      }>,
    ) => {
      const { x, y, type, subtype } = action.payload;
      const board = getCurrentBoard(state);
      addSpaceInternal(x, y, type, subtype, board, state.eventLibrary);
    },
    removeSpaceAction: (
      state,
      action: PayloadAction<{
        index: number;
      }>,
    ) => {
      const { index } = action.payload;
      const currentBoard = getCurrentBoard(state);
      removeSpace(state, currentBoard, index);
    },
    removeSpacesAction: (
      state,
      action: PayloadAction<{
        spaceIndices: number[];
      }>,
    ) => {
      const { spaceIndices } = action.payload;
      const currentBoard = getCurrentBoard(state);
      for (let i = 0; i < spaceIndices.length; i++) {
        const spaceIndex = spaceIndices[i];
        if (removeSpace(state, currentBoard, spaceIndex)) {
          // Adjust indices, since deleting index N affects the indices after N.
          for (let j = i + 1; j < spaceIndices.length; j++) {
            if (spaceIndices[j] > spaceIndex) {
              spaceIndices[j]--;
            }
          }
        }
      }
    },

    addConnectionAction: (
      state,
      action: PayloadAction<{
        startSpaceIndex: number;
        endSpaceIndex: number;
      }>,
    ) => {
      const { startSpaceIndex, endSpaceIndex } = action.payload;
      const board = getCurrentBoard(state);

      addConnectionInternal(startSpaceIndex, endSpaceIndex, board);

      // Otherwise this may show up in undo/redo states.
      state.temporaryConnections = null;
    },
    eraseConnectionsAction: (
      state,
      action: PayloadAction<{
        x: number;
        y: number;
      }>,
    ) => {
      const { x, y } = action.payload;
      const currentBoard = getCurrentBoard(state);
      _eraseLines(currentBoard, x, y);
    },
    setTemporaryUIConnections: (
      state,
      action: PayloadAction<{
        connections: Coords[] | null;
      }>,
    ) => {
      const { connections } = action.payload;
      state.temporaryConnections = connections;
    },

    setSpacePositionsAction: (
      state,
      action: PayloadAction<{
        spaceIndices: number[];
        coords: { x?: number; y?: number; z?: number }[];
      }>,
    ) => {
      const { spaceIndices, coords } = action.payload;
      const currentBoard = getCurrentBoard(state);
      for (let i = 0; i < spaceIndices.length; i++) {
        const space = currentBoard.spaces[spaceIndices[i]];
        const coordSet = coords[i];
        if (typeof coordSet.x === "number") {
          space.x = coordSet.x;
        }
        if (typeof coordSet.y === "number") {
          space.y = coordSet.y;
        }
        if (typeof coordSet.z === "number") {
          space.z = coordSet.z;
        }
      }
    },
    setSpaceTypeAction: (
      state,
      action: PayloadAction<{
        spaceIndices: number[];
        type: Space;
        subtype: SpaceSubtype | undefined;
      }>,
    ) => {
      const { spaceIndices, type, subtype } = action.payload;
      const currentBoard = getCurrentBoard(state);
      for (let i = 0; i < spaceIndices.length; i++) {
        const space = currentBoard.spaces[spaceIndices[i]];
        if (type !== undefined) {
          space.type = type;
          if (space.rotation) {
            delete space.rotation;
          }
        }
        if (subtype !== undefined) space.subtype = subtype;
        else delete space.subtype;
      }
    },
    setSpaceSubtypeAction: (
      state,
      action: PayloadAction<{
        spaceIndices: number[];
        subtype: SpaceSubtype | undefined;
      }>,
    ) => {
      const { spaceIndices, subtype } = action.payload;
      const currentBoard = getCurrentBoard(state);
      for (let i = 0; i < spaceIndices.length; i++) {
        const space = currentBoard.spaces[spaceIndices[i]];
        if (typeof subtype === "undefined") {
          delete space.subtype;
        } else {
          space.subtype = subtype;
        }
      }
    },
    setSpaceHostsStarAction: (
      state,
      action: PayloadAction<{
        spaceIndices: number[];
        hostsStar: boolean;
      }>,
    ) => {
      const { spaceIndices, hostsStar } = action.payload;
      const currentBoard = getCurrentBoard(state);
      for (let i = 0; i < spaceIndices.length; i++) {
        const space = currentBoard.spaces[spaceIndices[i]];
        if (hostsStar) {
          space.star = true;
        } else {
          delete space.star;
        }
      }
    },
    setSpaceRotationAction: (
      state,
      action: PayloadAction<{
        spaceIndex: number;
        angleYAxisDeg: number;
      }>,
    ) => {
      const { spaceIndex, angleYAxisDeg } = action.payload;
      assertNotROMBoard(state);

      const board = getCurrentBoard(state);
      const space = board.spaces[spaceIndex];
      if (!space) {
        throw new Error("setSpaceRotation: Invalid space index " + spaceIndex);
      }
      space.rotation = Math.round(angleYAxisDeg);
    },

    addSelectedSpaceAction: (state, action: PayloadAction<number>) => {
      const spaceIndex = action.payload;
      state.selectedSpaceIndices[spaceIndex] = true;
    },
    setSelectedSpaceAction: (state, action: PayloadAction<number>) => {
      const spaceIndex = action.payload;
      state.selectedSpaceIndices = { [spaceIndex]: true };
    },
    setSelectedSpacesAction: (state, action: PayloadAction<number[]>) => {
      const spaceIndices = action.payload;
      const selectedSpaceIndices: { [index: number]: boolean } = {};
      for (const index of spaceIndices) {
        selectedSpaceIndices[index] = true;
      }
      state.selectedSpaceIndices = selectedSpaceIndices;
    },
    clearSelectedSpacesAction: (state, action: PayloadAction) => {
      state.selectedSpaceIndices = {};
    },

    setHighlightedSpacesAction: (
      state,
      action: PayloadAction<{
        spaceIndices: number[] | null;
      }>,
    ) => {
      const { spaceIndices } = action.payload;
      state.highlightedSpaceIndices = spaceIndices;
    },

    setSelectionBoxCoordsAction: (
      state,
      action: PayloadAction<{
        selectionCoords: Coords | null;
      }>,
    ) => {
      const { selectionCoords } = action.payload;
      state.selectionBoxCoords = selectionCoords;
    },

    changeCurrentEventAction: (
      state,
      action: PayloadAction<{
        id: string | null;
        type: EventType;
      }>,
    ) => {
      const { id, type } = action.payload;
      state.currentEventId = id;
      state.currentEventType = type;
    },
    addEventToLibraryAction: (
      state,
      action: PayloadAction<{
        event: IEvent; // ref ok
      }>,
    ) => {
      const { event } = action.payload;
      state.eventLibrary[event.id] = event;
    },
    removeEventFromLibraryAction: (
      state,
      action: PayloadAction<{
        eventId: string;
      }>,
    ) => {
      const { eventId } = action.payload;
      if (!state.eventLibrary[eventId])
        throw new Error(
          `Cannot remove event ${eventId}, as it isn't in the event library`,
        );

      if (!state.eventLibrary[eventId].custom)
        throw new Error(
          `Cannot remove event ${eventId}, as it is a built-in event`,
        );

      delete state.eventLibrary[eventId];
    },
    addEventToBoardAction: (
      state,
      action: PayloadAction<{
        event: IEventInstance; // ref ok
      }>,
    ) => {
      const { event } = action.payload;
      const board = getCurrentBoard(state);
      if (!board.boardevents) {
        board.boardevents = [];
      }

      board.boardevents.push(event);

      if (event.custom) {
        const customEvent = getEvent(state, event.id, board) as ICustomEvent;
        includeEventInBoardInternal(board, customEvent);
      }
    },
    removeEventFromBoardAction: (
      state,
      action: PayloadAction<{
        eventIndex: number;
      }>,
    ) => {
      const { eventIndex } = action.payload;
      const board = getCurrentBoard(state);
      removeEventFromBoard(board, eventIndex);
    },
    includeEventInBoardAction: (
      state,
      action: PayloadAction<{
        event: ICustomEvent; // ref ok
      }>,
    ) => {
      const { event } = action.payload;
      const board = getCurrentBoard(state);
      includeEventInBoardInternal(board, event);
    },
    excludeEventFromBoardAction: (
      state,
      action: PayloadAction<{
        eventId: string;
      }>,
    ) => {
      const { eventId } = action.payload;
      const board = getCurrentBoard(state);
      excludeEventFromBoard(board, eventId);
    },
    setHoveredBoardEventIndexAction: (
      state,
      action: PayloadAction<{
        eventIndex: number;
      }>,
    ) => {
      const { eventIndex } = action.payload;
      state.hoveredBoardEventIndex = eventIndex;
    },
    setBoardEventActivationTypeAction: (
      state,
      action: PayloadAction<{
        eventIndex: number;
        activationType: EditorEventActivationType;
      }>,
    ) => {
      const { eventIndex, activationType } = action.payload;
      const board = getCurrentBoard(state);
      const eventInstance = board.boardevents![eventIndex];
      eventInstance.activationType = activationType;
    },
    setBoardEventEventParameterAction: (
      state,
      action: PayloadAction<{
        eventIndex: number;
        name: string;
        value: EventParameterValue;
      }>,
    ) => {
      const { eventIndex, name, value } = action.payload;
      const board = getCurrentBoard(state);
      const eventInstance = board.boardevents![eventIndex];
      if (!eventInstance.parameterValues) {
        eventInstance.parameterValues = {};
      }
      eventInstance.parameterValues[name] = value;
    },

    addEventToSpaceAction: (
      state,
      action: PayloadAction<{
        event: IEventInstance; // ref ok
        toStart?: boolean;
      }>,
    ) => {
      const { event, toStart } = action.payload;
      const board = getCurrentBoard(state);
      const selectedSpace = getCurrentSingleSelectedSpace(state);
      addEventToSpaceInternal(
        board,
        selectedSpace,
        event,
        toStart || false,
        state.eventLibrary,
      );
    },
    addEventToSpacesAction: (
      state,
      action: PayloadAction<{
        event: IEventInstance;
        spaceIndices: number[];
      }>,
    ) => {
      const { event, spaceIndices } = action.payload;
      const board = getCurrentBoard(state);
      for (const spaceIndex of spaceIndices) {
        const space = board.spaces[spaceIndex];
        addEventToSpaceInternal(board, space, event, false, state.eventLibrary);
      }
    },
    removeEventFromSpaceAction: (
      state,
      action: PayloadAction<{
        eventIndex: number;
      }>,
    ) => {
      const { eventIndex } = action.payload;
      const selectedSpace = getCurrentSingleSelectedSpace(state);
      removeEventFromSpace(selectedSpace, eventIndex);
    },
    removeEventsFromSpacesAction: (
      state,
      action: PayloadAction<{
        eventIndices: number[];
        spaceIndices: number[];
      }>,
    ) => {
      const { eventIndices, spaceIndices } = action.payload;
      assert(eventIndices.length === spaceIndices.length);
      const board = getCurrentBoard(state);
      for (let i = 0; i < eventIndices.length; i++) {
        const eventIndex = eventIndices[i];
        const spaceIndex = spaceIndices[i];
        const space = board.spaces[spaceIndex];
        removeEventFromSpace(space, eventIndex);
      }
    },
    setSpaceEventActivationTypeAction: (
      state,
      action: PayloadAction<{
        eventIndex: number;
        activationType: EditorEventActivationType;
      }>,
    ) => {
      const { eventIndex, activationType } = action.payload;
      const selectedSpace = getCurrentSingleSelectedSpace(state);
      const eventInstance = selectedSpace.events![eventIndex];
      eventInstance.activationType = activationType;
    },
    setSpaceEventsActivationTypeAction: (
      state,
      action: PayloadAction<{
        spaceIndices: number[];
        eventIndices: number[];
        activationType: EditorEventActivationType;
      }>,
    ) => {
      const { spaceIndices, eventIndices, activationType } = action.payload;
      const board = getCurrentBoard(state);
      for (let i = 0; i < eventIndices.length; i++) {
        const eventIndex = eventIndices[i];
        const spaceIndex = spaceIndices[i];
        const space = board.spaces[spaceIndex];
        const eventInstance = space.events![eventIndex];
        eventInstance.activationType = activationType;
      }
    },
    setSpaceEventEventParameterAction: (
      state,
      action: PayloadAction<{
        eventIndex: number;
        name: string;
        value: EventParameterValue;
      }>,
    ) => {
      const { eventIndex, name, value } = action.payload;
      const selectedSpace = getCurrentSingleSelectedSpace(state);
      const eventInstance = selectedSpace.events![eventIndex];
      if (!eventInstance.parameterValues) {
        eventInstance.parameterValues = {};
      }
      eventInstance.parameterValues[name] = value;
    },
    setSpaceEventsEventParameterAction: (
      state,
      action: PayloadAction<{
        spaceIndices: number[];
        eventIndices: number[];
        name: string;
        value: EventParameterValue;
      }>,
    ) => {
      const { spaceIndices, eventIndices, name, value } = action.payload;
      const board = getCurrentBoard(state);
      for (let i = 0; i < eventIndices.length; i++) {
        const eventIndex = eventIndices[i];
        const spaceIndex = spaceIndices[i];
        const space = board.spaces[spaceIndex];
        const eventInstance = space.events![eventIndex];
        if (!eventInstance.parameterValues) {
          eventInstance.parameterValues = {};
        }
        eventInstance.parameterValues[name] = value;
      }
    },
  },
});

export const {
  setBoardsAction,
  addBoardAction,
  deleteBoardAction,
  setCurrentBoardAction,
  clearBoardsFromROMAction,
  copyCurrentBoardAction,
  setBoardNameAction,
  setBoardDescriptionAction,
  setBoardDifficultyAction,
  setBoardCostumeTypeIndexAction,
  setBackgroundAction,
  setBoardOtherBgAction,
  addAnimationBackgroundAction,
  removeAnimationBackgroundAction,
  addAdditionalBackgroundAction,
  removeAdditionalBackgroundAction,
  setAdditionalBackgroundCodeAction,
  setAudioSelectCodeAction,
  setBoardAudioAction,

  addConnectionAction,
  eraseConnectionsAction,
  setTemporaryUIConnections,

  addSpaceAction,
  removeSpaceAction,
  removeSpacesAction,
  setSpacePositionsAction,
  setSpaceTypeAction,
  setSpaceSubtypeAction,
  setSpaceHostsStarAction,
  setSpaceRotationAction,

  addSelectedSpaceAction,
  setSelectedSpaceAction,
  setSelectedSpacesAction,
  clearSelectedSpacesAction,

  setHighlightedSpacesAction,

  setSelectionBoxCoordsAction,

  changeCurrentEventAction,
  addEventToLibraryAction,
  removeEventFromLibraryAction,
  addEventToBoardAction,
  removeEventFromBoardAction,
  includeEventInBoardAction,
  excludeEventFromBoardAction,
  setHoveredBoardEventIndexAction,
  setBoardEventActivationTypeAction,
  setBoardEventEventParameterAction,

  addEventToSpaceAction,
  addEventToSpacesAction,
  removeEventFromSpaceAction,
  removeEventsFromSpacesAction,
  setSpaceEventActivationTypeAction,
  setSpaceEventsActivationTypeAction,
  setSpaceEventEventParameterAction,
  setSpaceEventsEventParameterAction,
} = boardStateSlice.actions;

export const selectData = (state: RootState) => state.data.present;

export const selectBoards = (state: RootState) => state.data.present.boards;

export const selectROMBoards = (state: RootState) =>
  state.data.present.romBoards;

export const selectCurrentBoardIndex = (state: RootState) => {
  return state.data.present.currentBoardIndex;
};

export const selectCurrentBoardIsROM = (state: RootState) => {
  return state.data.present.currentBoardIsROM;
};

export const selectCurrentBoard = (state: RootState) => {
  if (state.data.present.currentBoardIsROM) {
    return state.data.present.romBoards[state.data.present.currentBoardIndex];
  }
  return state.data.present.boards[state.data.present.currentBoardIndex];
};

export const selectSelectionBoxCoords = (state: RootState) =>
  state.data.present.selectionBoxCoords;
export const selectHoveredBoardEventIndex = (state: RootState) =>
  state.data.present.hoveredBoardEventIndex;
export const selectHighlightedSpaceIndices = (state: RootState) =>
  state.data?.present?.highlightedSpaceIndices;
export const selectTemporaryConnections = (state: RootState) =>
  state.data.present.temporaryConnections;

export const selectSelectedSpaceIndices = (state: RootState) =>
  state.data.present.selectedSpaceIndices;

export const selectCurrentEvent = (state: RootState) => {
  switch (state.data.present.currentEventType) {
    case EventType.Board: {
      assert(!!state.data.present.currentEventId);
      const boardEvent =
        selectCurrentBoard(state).events[state.data.present.currentEventId];
      assert(typeof boardEvent !== "string");
      return createCustomEvent(boardEvent.language, boardEvent.code);
    }
    case EventType.Library:
      assert(!!state.data.present.currentEventId);
      return state.data.present.eventLibrary[state.data.present.currentEventId];
    case EventType.None:
    default:
      return null;
  }
};

export const selectCurrentEventType = (state: RootState) =>
  state.data.present.currentEventType;

export const selectEventLibrary = (state: RootState) =>
  state.data.present.eventLibrary;

function removeSpace(state: BoardState, board: IBoard, index: number): boolean {
  if (index < 0 || index >= board.spaces.length) return false;

  // Remove any attached connections.
  _removeConnections(index, board);
  _removeAssociations(index, board, state.eventLibrary);

  // Remove the actual space.
  const oldSpaceLen = board.spaces.length;
  board.spaces.splice(index, 1);

  function _adjust(oldIdx: any) {
    return parseInt(oldIdx) > parseInt(index as any) ? oldIdx - 1 : oldIdx;
  }

  // Update the links that are at a greater index.
  let start, end;
  for (let i = 0; i < oldSpaceLen; i++) {
    if (!board.links.hasOwnProperty(i)) continue;

    start = _adjust(i);
    end = board.links[i];
    if (start !== i) delete board.links[i];
    if (Array.isArray(end)) board.links[start] = end.map(_adjust);
    else board.links[start] = _adjust(end);
  }

  // Update space event parameter indices
  forEachEventParameter(
    board,
    state.eventLibrary,
    (parameter: IEventParameter, event: IEventInstance) => {
      switch (parameter.type) {
        case EventParameterType.Space:
          if (
            event.parameterValues &&
            event.parameterValues.hasOwnProperty(parameter.name)
          ) {
            event.parameterValues[parameter.name] = _adjust(
              event.parameterValues[parameter.name],
            );
          }
          break;

        case EventParameterType.SpaceArray:
          {
            const parameterValue = event.parameterValues?.[parameter.name];
            if (event.parameterValues && Array.isArray(parameterValue)) {
              event.parameterValues[parameter.name] =
                parameterValue.map(_adjust);
            }
          }
          break;
      }
    },
  );

  return true;
}

// Removes all connections to a certain space.
function _removeConnections(spaceIdx: number, board: IBoard) {
  if (!board.links) return;

  delete board.links[spaceIdx];
  for (const startSpace in board.links) {
    const value = board.links[startSpace];
    if (Array.isArray(value)) {
      const entry = value.indexOf(spaceIdx);
      if (entry !== -1) value.splice(entry, 1);
      if (value.length === 1) board.links[startSpace] = value[0];
      else if (!value.length) delete board.links[startSpace];
    } else if (value === spaceIdx) {
      delete board.links[startSpace];
    }
  }
}

function _eraseLines(board: IBoard, x: number, y: number): boolean {
  const spaces = board.spaces;
  const links = board.links;
  let somethingErased = false;
  for (const startIdx in links) {
    const startSpace = spaces[startIdx];
    let endSpace;
    let endLinks = links[startIdx];
    if (Array.isArray(endLinks)) {
      let i = 0;
      while (i < endLinks.length) {
        endSpace = spaces[endLinks[i]];
        if (_shouldEraseLine(startSpace, endSpace, x, y)) {
          endLinks.splice(i, 1);
          somethingErased = true;
        } else i++;
      }
      if (endLinks.length === 1) links[startIdx] = endLinks = endLinks[0];
      else if (!endLinks.length) delete links[startIdx];
    } else {
      endSpace = spaces[endLinks];
      if (_shouldEraseLine(startSpace, endSpace, x, y)) {
        delete links[startIdx];
        somethingErased = true;
      }
    }
  }
  return somethingErased;
}

function _shouldEraseLine(
  startSpace: ISpace,
  endSpace: ISpace,
  targetX: number,
  targetY: number,
) {
  if (targetX > startSpace.x && targetX > endSpace.x) return false;
  if (targetX < startSpace.x && targetX < endSpace.x) return false;
  if (targetY > startSpace.y && targetY > endSpace.y) return false;
  if (targetY < startSpace.y && targetY < endSpace.y) return false;
  return (
    lineDistance(
      targetX,
      targetY,
      startSpace.x,
      startSpace.y,
      endSpace.x,
      endSpace.y,
    ) <= 4
  );
}

function _removeAssociations(
  spaceIdx: number,
  board: IBoard,
  eventLibrary: EventMap,
) {
  forEachEventParameter(
    board,
    eventLibrary,
    (parameter: IEventParameter, event: IEventInstance) => {
      switch (parameter.type) {
        case EventParameterType.Space:
          if (
            event.parameterValues &&
            event.parameterValues.hasOwnProperty(parameter.name)
          ) {
            if (event.parameterValues[parameter.name] === spaceIdx) {
              delete event.parameterValues[parameter.name];
            }
          }
          break;

        case EventParameterType.SpaceArray:
          {
            const parameterValue = event.parameterValues?.[parameter.name];
            if (event.parameterValues && Array.isArray(parameterValue)) {
              event.parameterValues[parameter.name] = parameterValue.filter(
                (s) => s !== spaceIdx,
              );
            }
          }
          break;
      }
    },
  );
}

function getCurrentBoard(state: BoardState): IBoard {
  if (state.currentBoardIsROM) {
    return state.romBoards[state.currentBoardIndex];
  } else {
    return state.boards[state.currentBoardIndex];
  }
}

function getCurrentSingleSelectedSpace(state: BoardState): ISpace {
  const selectedSpaceIndices = Object.keys(state.selectedSpaceIndices).map(
    (k) => parseInt(k, 10),
  );
  assert(selectedSpaceIndices.length === 1);
  const space = getCurrentBoard(state).spaces[selectedSpaceIndices[0]];
  assert(!!space);
  return space;
}

/** Removes an event from `boardevents`. */
function removeEventFromBoard(board: IBoard, eventIndex: number) {
  if (board.boardevents?.length) {
    if (eventIndex >= 0) {
      board.boardevents.splice(eventIndex, 1);
    }
  }
}

/** Removes an event from the collection of events stored in the board file. */
function excludeEventFromBoard(board: IBoard, eventId: string): void {
  if (board.events) {
    delete board.events[eventId];
  }

  forEachEvent(board, (event, eventIndex, space) => {
    if (event.id === eventId) {
      if (space) {
        removeEventFromSpace(space, eventIndex);
      } else {
        removeEventFromBoard(board, eventIndex);
      }
    }
  });
}

function removeEventFromSpace(space: ISpace, eventIndex: number) {
  if (!space || !space.events) return;

  if (eventIndex >= 0) {
    space.events.splice(eventIndex, 1);
  }
}

/** Gets an event, either from the board's set or the global library. */
export function getEvent(
  state: BoardState,
  eventId: string,
  board: IBoard,
): IEvent | undefined {
  if (board && board.events && !!getBoardEvent(board, eventId)) {
    const boardEvent = getBoardEvent(board, eventId);
    return createCustomEvent(boardEvent!.language, boardEvent!.code);
  }
  return state.eventLibrary[eventId];
}

function assertNotROMBoard(state: BoardState): void {
  if (state.currentBoardIsROM) {
    throw new Error("Current board must not be a ROM board.");
  }
}

export default boardStateSlice.reducer;
