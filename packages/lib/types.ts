// Defines commonly used types.

/** Different pages in PP64. */
export enum View {
  EDITOR = 0,
  DETAILS = 1,
  SETTINGS = 2,
  ABOUT = 3,
  MODELS = 4,
  PATCHES = 5,
  STRINGS = 6,
  EVENTS = 7,
  CREATEEVENT_ASM = 8,
  CREATEEVENT_C = 9,
  DEBUG = 10,
  AUDIO = 11,
  ADDITIONAL_BGS = 12,
  AUDIO_SELECTION_CODE = 13,
  SPRITES = 14,
  BOARD_BROWSER = 15,
}

export enum Space {
  OTHER = 0,
  BLUE = 1,
  RED = 2,
  MINIGAME = 3,
  HAPPENING = 4,
  STAR = 5,
  CHANCE = 6,
  START = 7,
  SHROOM = 8,
  BOWSER = 9,
  ITEM = 10,
  BATTLE = 11,
  BANK = 12,
  ARROW = 13,
  BLACKSTAR = 14,
  GAMEGUY = 15,
  DUEL_BASIC = 16,
  DUEL_START_BLUE = 17,
  DUEL_START_RED = 18,
  DUEL_POWERUP = 19,
  DUEL_REVERSE = 20,
}

export enum SpaceSubtype {
  TOAD = 0,
  BOWSER = 1,
  KOOPA = 2,
  BOO = 3,
  GOOMBA = 4,
  BANK = 5,
  BANKCOIN = 6,
  ITEMSHOP = 7,
  GATE = 8,
}

export enum BoardType {
  NORMAL = "NORMAL",
  DUEL = "DUEL",
}

/** Player costume types. */
export enum CostumeType {
  NORMAL = 0,
  WESTERN = 1,
  PIRATE = 2,
  HORROR = 3,
  SPACE = 4,
  MYSTERY = 5,
}

export enum Action {
  MOVE = 0,
  LINE = 1,
  LINE_STICKY = 2,
  ROTATE = 3,
  ERASE = 4,
  ROM_LOAD = 5,
  ROM_UNLOAD = 6,
  BOARD_LOAD = 7,
  BOARD_SAVE = 8,
  BOARD_NEW = 9,
  BOARD_WRITE = 10,
  BOARD_DETAILS = 11,
  BOARD_EDITOR = 12,
  BOARD_COPY = 13,
  MODEL_VIEWER = 13.3,
  STRINGS_EDITOR = 13.4,
  SPRITE_VIEWER = 13.45,
  EVENTS = 13.5,
  CREATEEVENT = 13.6,
  BACK_TO_EVENTS = 13.7,
  SAVE_EVENT = 13.8,
  EVENT_LOAD = 13.9,
  SET_BG = 14,
  SCREENSHOT = 14.1,
  SAVE_ADDITIONALBG = 14.2,
  ADDITIONALBG_BACK = 14.3,
  SAVE_AUDIOSELECTCODE = 14.2,
  AUDIOSELECTCODE_BACK = 14.3,
  ROM_SAVE = 15,
  SETTINGS = 15.1,
  ABOUT = 15.2,
  PATCHES = 15.3,
  DEBUG = 15.4,
  AUDIO = 15.5,

  ADD_OTHER = 16,
  ADD_BLUE = 17,
  ADD_RED = 18,
  ADD_MINIGAME = 19,
  ADD_HAPPENING = 20,
  ADD_STAR = 21,
  ADD_BLACKSTAR = 21.2,
  ADD_START = 21.3,
  ADD_CHANCE = 22,
  ADD_SHROOM = 23,
  ADD_BOWSER = 24,
  ADD_TOAD_CHARACTER = 25,
  ADD_BOWSER_CHARACTER = 26,
  ADD_KOOPA_CHARACTER = 27,
  ADD_BOO_CHARACTER = 28,
  ADD_ITEM = 29,
  ADD_BATTLE = 30,
  ADD_BANK = 31,
  ADD_GAMEGUY = 32,
  ADD_ARROW = 32.2,
  MARK_STAR = 33,
  MARK_GATE = 33.1,
  ADD_BANK_SUBTYPE = 34,
  ADD_BANKCOIN_SUBTYPE = 35,
  ADD_ITEMSHOP_SUBTYPE = 36,
  ADD_DUEL_BASIC = 37,
  ADD_DUEL_REVERSE = 38,
  ADD_DUEL_POWERUP = 39,
  ADD_DUEL_START_BLUE = 40,
  ADD_DUEL_START_RED = 41,
  TELESCOPE = 42,
  BOARD_BROWSE = 43,
}

export enum Game {
  MP1_USA = "CLBE",
  MP1_JPN = "CLBJ",
  MP1_PAL = "NLBP",

  MP2_USA = "NMWE",
  MP2_JPN = "NMWJ",
  MP2_PAL = "NMWP",

  MP3_USA = "NMVE",
  MP3_JPN = "NMVJ",
  MP3_PAL = "NMVP",
}

export type GameVersion = 1 | 2 | 3;

export function getGameName(id: string): string | null {
  for (const key in Game) {
    const value = (Game as any)[key];
    if (value === id) return key;
  }
  return null;
}

/** Supported languages for custom event code. */
export enum EventCodeLanguage {
  MIPS = 0,
  C = 1,
}

/** What conditions the event code is executed. */
export enum EventActivationType {
  WALKOVER = 1,
  //"MYSTERY" = 2, // Executed after WALKOVER
  LANDON = 3,
  //"MYSTERY" = 4, // Executed after LANDON

  /** Indicates one of the negative space indices is used for this event. */
  SPECIAL = 7,

  // Not in some games?
  BEGINORWALKOVER = 8,
  //"MYSTERY" = 9,
}

/** What conditions the event code is executed. */
export enum EditorEventActivationType {
  WALKOVER = 1,
  LANDON = 3,

  // These aren't real activation types in the game, they're really special space types.
  // But assigning events to one of these is effectively picking an activation type.

  /** Before each player's dice roll. */
  BEFORE_DICE_ROLL = -5,
  /** Just before a player's turn. (Right as "PLAYER START" appears on screen.) */
  BEFORE_PLAYER_TURN = -4,
  /** After each turn. (After last player lands on space, before Mini-Game selection comes up.) */
  AFTER_TURN = -3,
  /** Before each turn. (Right as "PLAYER START" appears for the first player.) */
  BEFORE_TURN = -2,

  BEGINORWALKOVER = 8,
}

export function getEventActivationTypeFromEditorType(
  editorType: EditorEventActivationType,
): EventActivationType {
  switch (editorType) {
    case EditorEventActivationType.LANDON:
      return EventActivationType.LANDON;
    case EditorEventActivationType.WALKOVER:
      return EventActivationType.WALKOVER;

    case EditorEventActivationType.BEFORE_TURN:
    case EditorEventActivationType.AFTER_TURN:
    case EditorEventActivationType.BEFORE_PLAYER_TURN:
    case EditorEventActivationType.BEFORE_DICE_ROLL:
      return EventActivationType.SPECIAL;

    case EditorEventActivationType.BEGINORWALKOVER:
      return EventActivationType.BEGINORWALKOVER;

    default:
      throw new Error(`Unrecognized editor activation type ${editorType}`);
  }
}

export enum EventExecutionType {
  DIRECT = 1,
  PROCESS = 2,
}

export function getExecutionTypeName(executionType: EventExecutionType) {
  switch (executionType) {
    case 1:
      return "Direct";
    case 2:
      return "Process";
  }
  throw new Error(`Unknown execution type ${executionType}.`);
}

export function getExecutionTypeByName(
  name: string,
): EventExecutionType | null {
  switch (name) {
    case "Direct":
      return 1;
    case "Process":
      return 2;
  }
  return null;
}

export enum ValidationLevel {
  ERROR = 1,
  WARNING = 2,
}

export const EventParameterTypes = [
  "Boolean",
  "Number",
  "+Number",
  "Number[]",
  "Space",
  "Space[]",
];

/** Types of event parameters allowed. */
export enum EventParameterType {
  Boolean = "Boolean",
  Number = "Number",
  PositiveNumber = "+Number",
  NumberArray = "Number[]",
  Space = "Space",
  SpaceArray = "Space[]",
}

/** True if the event parameter type is an array value type. */
export function isArrayEventParameterType(type: EventParameterType): boolean {
  return type.endsWith("[]");
}

/** UI color themes for PartyPlanner64. */
export enum EditorThemes {
  Classic = "classic",
  DarkGray = "dark-gray",
}
