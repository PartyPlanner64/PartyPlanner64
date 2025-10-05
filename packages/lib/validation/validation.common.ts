import {
  IBoard,
  getConnections,
  getSpacesOfSubType,
  getStartSpaceIndex,
  getDeadEnds,
  getBoardEvent,
  getAdditionalBackgroundCode,
  IEventInstance,
  BoardAudioType,
  getAudioSelectCode,
} from "../../../apps/partyplanner64/boards";
import {
  ValidationLevel,
  SpaceSubtype,
  Space,
  isArrayEventParameterType,
} from "../types";
import { romhandler } from "../romhandler";
import { CustomAsmHelper } from "../events/customevents";
import { getEvent, isUnsupported } from "../events/events";
import { createRule } from "./validationrules";
import { testAdditionalBgCodeWithGame } from "../events/additionalbg";
import { dataUrlToArrayBuffer } from "../utils/arrays";
import { createGameMidi } from "../audio/midi";
import {
  makeFakeGetAudioIndices,
  testGetAudioCodeWithGame,
} from "../events/getaudiochoice";
import { getEventsInLibrary } from "../events/EventLibrary";

const HasStart = createRule(
  "HASSTART",
  "Has start space",
  ValidationLevel.ERROR,
);
HasStart.fails = function ({ board }, args: any) {
  const curIdx = getStartSpaceIndex(board);
  if (curIdx < 0) return "No start space found on board.";
  return false;
};

const GameVersionMatch = createRule(
  "GAMEVERSION",
  "Game version mismatch",
  ValidationLevel.ERROR,
);
GameVersionMatch.fails = function ({ board }, args: any) {
  const romGame = romhandler.getGameVersion();
  if (romGame !== board.game)
    return `Board is for MP${board.game}, but ROM is MP${romGame}`;
  return false;
};

const DeadEnd = createRule("DEADEND", "No dead ends", ValidationLevel.WARNING);
DeadEnd.fails = function ({ board }, args: any) {
  const deadEnds = getDeadEnds(board);

  const startIndex = getStartSpaceIndex(board);
  if (startIndex < 0) return false; // Let HASSTART rule complain.

  if (deadEnds.indexOf(startIndex) >= 0)
    return "Start space does not lead anywhere.";

  if (deadEnds.length) return "There is a dead end on the board.";

  return false;
};

const TooManySpaces = createRule(
  "TOOMANYSPACES",
  "Too many spaces",
  ValidationLevel.ERROR,
);
TooManySpaces.fails = function ({ board }, args: any) {
  if (board.spaces.length > 0xffff)
    return "There is a hard limit of 65535 spaces.";
  return false;
};

const OverRecommendedSpaces = createRule(
  "OVERRECOMMENDEDSPACES",
  "Over recommended spaces",
  ValidationLevel.WARNING,
);
OverRecommendedSpaces.fails = function ({ board }, args: any) {
  const spaceCount = board.spaces.length;
  if (spaceCount > args.max)
    return `${spaceCount} spaces present, more than ${args.max} spaces can be unstable.`;
  return false;
};

interface IRuleWithLimit {
  limit?: number;
}

const _makeTooManyOfSubtypeRule = function (
  subtype: SpaceSubtype,
  name: string,
) {
  const rule = createRule<IRuleWithLimit>(
    `TOOMANY${name.toUpperCase().replace(/\s+/g, "")}`,
    `Too many ${name}`,
    ValidationLevel.ERROR,
  );
  rule.fails = function ({ board }, args = {}) {
    const limit = args.limit || 0;
    const count = board.spaces.filter((space) => {
      return space && space.subtype === subtype;
    }).length;
    if (count > limit)
      return `There are ${count} ${name}, but the limit is ${limit} for this board.`;
    return false;
  };
};

_makeTooManyOfSubtypeRule(SpaceSubtype.BOO, "Boos");
_makeTooManyOfSubtypeRule(SpaceSubtype.BOWSER, "Bowsers");
_makeTooManyOfSubtypeRule(SpaceSubtype.KOOPA, "Koopas");
_makeTooManyOfSubtypeRule(SpaceSubtype.BANK, "Banks");
_makeTooManyOfSubtypeRule(SpaceSubtype.ITEMSHOP, "Item Shops");
_makeTooManyOfSubtypeRule(SpaceSubtype.GATE, "Gates");

function _getStarSpaceCount(board: IBoard): number {
  return board.spaces.filter((space) => {
    return space && space.star;
  }).length;
}

interface IBadStarCountProps {
  low: number;
  high: number;
  disallowed?: { [count: number]: boolean };
}

const BadStarCount = createRule(
  "BADSTARCOUNT",
  "Bad star count",
  ValidationLevel.ERROR,
);
BadStarCount.fails = function ({ board }, args: IBadStarCountProps) {
  const count = _getStarSpaceCount(board);

  const disallowed = args.disallowed || {};
  if (disallowed[count]) {
    if (count === 1) return `There cannot be exactly 1 star space.`;
    else return `There cannot be exactly ${count} star spaces.`;
  }

  const low = args.low || 0;
  const high = args.high || 0;

  if (count < low || count > high) {
    if (low !== high)
      return `There are ${count} stars, but the range is ${low}-${high} for this board.`;
    else
      return `There are ${count} stars, but the count must be ${low} for this board.`;
  }
  return false;
};

const WarnNoStarSpaces = createRule(
  "WARNNOSTARSPACES",
  "No star spaces",
  ValidationLevel.WARNING,
);
WarnNoStarSpaces.fails = function ({ board }, args: any = {}) {
  const count = _getStarSpaceCount(board);
  if (count === 0) {
    return `There are no star spaces, this may be unintentional.`;
  }
  return false;
};

interface IRuleWithBounds {
  low?: number;
}

const _makeTooFewOfSpaceTypeRule = function (type: Space, name: string) {
  const rule = createRule<IRuleWithBounds>(
    `TOOFEW${name.toUpperCase().replace(/\s+/g, "")}SPACES`,
    `Too few ${name} spaces`,
    ValidationLevel.ERROR,
  );
  rule.fails = function ({ board }, args = {}) {
    const low = args.low || 0;
    const count = board.spaces.filter((space) => {
      return space && space.type === type;
    }).length;
    if (count < low)
      return `There are ${count} ${name} spaces, need at least ${low} spaces of this type.`;
    return false;
  };
};

_makeTooFewOfSpaceTypeRule(Space.BLUE, "Blue");
_makeTooFewOfSpaceTypeRule(Space.RED, "Red");

const TooManyOfEvent = createRule(
  "TOOMANYOFEVENT",
  "Too many of event",
  ValidationLevel.ERROR,
);
TooManyOfEvent.fails = function ({ board }, args: any) {
  let count = 0;
  board.spaces.forEach((space) => {
    if (!space || !space.events) return;
    space.events.forEach((event) => {
      if (event.id === args.event.id) count++;
    });
  });

  const low = args.low || 0;
  const high = args.high || 0;
  if (count < low || count > high) {
    if (low && high)
      return `There are ${count} of event ${args.event.name}, but the range is ${low}-${high} for this board.`;
    if (low)
      return `There are ${count} of event ${args.event.name}, but there must be at least ${low} for this board.`;
    else if (high)
      return `There are ${count} of event ${args.event.name}, but there can be at most ${high} for this board.`;
  }
  return false;
};

const UnrecognizedEvents = createRule(
  "UNRECOGNIZEDEVENTS",
  "Unrecognized events",
  ValidationLevel.ERROR,
);
UnrecognizedEvents.fails = function ({ board }, args: any) {
  const unrecognizedEvents = Object.create(null);
  board.spaces.forEach((space) => {
    if (!space || !space.events) return;
    space.events.forEach((spaceEvent) => {
      if (!getEvent(spaceEvent.id, board, getEventsInLibrary()))
        unrecognizedEvents[spaceEvent.id] = true;
    });
  });

  const ids = [];
  for (const id in unrecognizedEvents) {
    ids.push(id);
  }

  if (!ids.length) return false;

  let error = "The following events were unrecognized:\n";
  ids.forEach((id) => {
    error += "\t" + id + "\n";
  });
  return error;
};

const UnsupportedEvents = createRule(
  "UNSUPPORTEDEVENTS",
  "Unsupported events",
  ValidationLevel.ERROR,
);
UnsupportedEvents.fails = function ({ board }, args: any) {
  const unsupportedEvents = Object.create(null);
  const gameID = romhandler.getROMGame()!;
  board.spaces.forEach((space) => {
    if (!space || !space.events) return;
    space.events.forEach((spaceEvent) => {
      const event = getEvent(spaceEvent.id, board, getEventsInLibrary());
      if (!event) {
        return; // Let the other rule handle this.
      }
      if (isUnsupported(event, gameID)) unsupportedEvents[spaceEvent.id] = true;
    });
  });

  const ids = [];
  for (const id in unsupportedEvents) {
    ids.push(id);
  }

  if (!ids.length) return false;

  let error = "The following events cannot be written to this ROM:\n";
  ids.forEach((id) => {
    error += "\t" + id + "\n";
  });
  return error;
};

const FailingCustomEvents = createRule(
  "CUSTOMEVENTFAIL",
  "Custom event errors",
  ValidationLevel.ERROR,
);
FailingCustomEvents.fails = async function ({ board, boardInfo }, args: any) {
  const failingEvents = Object.create(null);
  const gameID = romhandler.getROMGame()!;

  async function testEvent(event: IEventInstance): Promise<void> {
    try {
      const customEvent = getEvent(event.id, board, getEventsInLibrary())!;
      const boardEvent = getBoardEvent(board, event.id)!;
      await CustomAsmHelper.testCustomEvent(
        boardEvent.language,
        boardEvent.code,
        customEvent.parameters,
        {
          game: gameID,
          audioIndices: makeFakeGetAudioIndices(board),
          board,
          boardInfo,
        },
      );
    } catch (e) {
      console.error(e);
      if (!failingEvents[event.id]) failingEvents[event.id] = true;
    }
  }

  for (const space of board.spaces) {
    if (!space || !space.events) continue;
    for (const event of space.events) {
      if (!event) continue; // Let the other rule handle this.
      if (!event.custom) continue;
      await testEvent(event);
    }
  }

  if (board.boardevents) {
    for (const event of board.boardevents) {
      if (!event.custom) continue;
      await testEvent(event);
    }
  }

  const ids = [];
  for (const id in failingEvents) {
    ids.push(id);
  }

  if (!ids.length) return false;

  let error = "The following custom events fail to assemble:\n";
  ids.forEach((id) => {
    error += "\t" + id + "\n";
  });
  return error;
};

const BadCustomEventParameters = createRule(
  "CUSTOMEVENTBADPARAMS",
  "Custom event parameter issues",
  ValidationLevel.ERROR,
);
BadCustomEventParameters.fails = function ({ board }, args: any) {
  const missingParams = Object.create(null);

  function testParameters(event: IEventInstance): void {
    const customEvent = getEvent(event.id, board, getEventsInLibrary())!;
    const parameters = customEvent.parameters;
    if (parameters && parameters.length) {
      for (const parameter of parameters) {
        if (isArrayEventParameterType(parameter.type)) {
          continue; // Not enforcing these are set right now.
        }
        if (
          !event.parameterValues ||
          !event.parameterValues.hasOwnProperty(parameter.name)
        ) {
          if (!missingParams[parameter.name]) missingParams[parameter.name] = 0;
          missingParams[parameter.name]++;
        }
      }
    }
  }

  board.spaces.forEach((space) => {
    if (!space || !space.events) return;
    space.events.forEach((event) => {
      if (!event) return; // Let the other rule handle this.
      if (!event.custom) return;
      testParameters(event);
    });
  });

  if (board.boardevents) {
    for (const event of board.boardevents) {
      if (!event.custom) continue;
      testParameters(event);
    }
  }

  const errorLines = [];
  for (const id in missingParams) {
    const count = missingParams[id];
    if (!count) continue; // ?
    errorLines.push(
      `\t${count} ${id} event parameter${count > 1 ? "s are " : " is "}not set`,
    );
  }

  if (!errorLines.length) return false;

  return "Some event parameters need to be set:\n" + errorLines.join("\n");
};

const TooManyPathOptions = createRule(
  "TOOMANYPATHOPTIONS",
  "Too many path options",
  ValidationLevel.ERROR,
);
TooManyPathOptions.fails = function ({ board }, args: any = {}) {
  const limit = args.limit || 2;
  for (const space in board.links) {
    const links = board.links[space];
    if (Array.isArray(links) && links.length > limit)
      return `A space branches in ${links.length} directions, but the maximum is ${limit}.`;
  }
  return false;
};

const CharactersOnPath = createRule(
  "CHARACTERSONPATH",
  "Characters are on path",
  ValidationLevel.WARNING,
);
CharactersOnPath.fails = function ({ board }, args: any = {}) {
  for (const spaceIdx in board.links) {
    const space = board.spaces[spaceIdx];
    if (space.hasOwnProperty("subtype") && space.subtype !== SpaceSubtype.GATE)
      return "Characters and objects <a href='https://github.com/PartyPlanner64/PartyPlanner64/wiki/Creating-a-Board#special-charactersobjects' target='_blank'>should not be on the player path</a>.";
  }
  return false;
};

const SplitAtNonInvisibleSpace = createRule(
  "SPLITATNONINVISIBLESPACE",
  "Split at non-invisible space",
  ValidationLevel.WARNING,
);
SplitAtNonInvisibleSpace.fails = function ({ board }, args: any = {}) {
  const preferredSplitTypes = [
    Space.OTHER,
    Space.STAR,
    Space.START,
    Space.BLACKSTAR,
    Space.ARROW,
  ];
  for (const spaceIdx in board.links) {
    const links = getConnections(parseInt(spaceIdx), board)!;
    if (links.length > 1) {
      const space = board.spaces[spaceIdx];
      if (preferredSplitTypes.indexOf(space.type) === -1)
        return "There is a <a href='https://github.com/PartyPlanner64/PartyPlanner64/wiki/Creating-a-Board#board-flow' target='_blank'>non-conventional path split</a>.";
    }
  }
  return false;
};

const TooManyArrowRotations = createRule(
  "TOOMANYARROWROTATIONS",
  "Too many arrow rotations",
  ValidationLevel.WARNING,
);
TooManyArrowRotations.fails = function ({ board }, args: any = {}) {
  let rotationCount = 0;
  board.spaces.forEach((space) => {
    if (!space) return;
    if (typeof space.rotation === "number") {
      rotationCount++;
    }
  });
  if (rotationCount > args.limit) {
    return `Only ${args.limit} arrows will be rotated in-game.`;
  }
  return false;
};

const GateSetup = createRule(
  "GATESETUP",
  "Incorrect gate setup",
  ValidationLevel.ERROR,
);
GateSetup.fails = function ({ board }, args: any = {}) {
  const gateSpaceIndices = getSpacesOfSubType(SpaceSubtype.GATE, board);

  for (let i = 0; i < gateSpaceIndices.length; i++) {
    const gateSpaceIndex = gateSpaceIndices[i];

    // We want the gate to be on an invisible space.
    const gateSpace = board.spaces[gateSpaceIndex];
    if (gateSpace.type !== Space.OTHER)
      return "Only invisible spaces can have gates."; // UI should prevent this pretty well

    // Check space/link structure after gate space.
    const exitingSpaces = getConnections(gateSpaceIndex, board)!;
    if (exitingSpaces.length !== 1)
      return "A single path should leave a gate space.";
    const exitSpaceIndex = exitingSpaces[0];
    const exitSpace = board.spaces[exitSpaceIndex];
    if (!exitSpace || exitSpace.type !== Space.OTHER)
      return "Space after a gate space must be invisible.";
    if (exitSpace.subtype === SpaceSubtype.GATE)
      return "Gate spaces must be 2 or more spaces apart.";
    if (_getPointingSpaceIndices(exitSpaceIndex).length !== 1)
      return "A single path should connect to the space after a gate space.";

    const nextSpaces = getConnections(exitSpaceIndex, board)!;
    if (nextSpaces.length !== 1)
      return "A single path should leave the space after a gate space";
    const nextSpaceIndex = nextSpaces[0];
    const nextSpace = board.spaces[nextSpaceIndex];
    if (nextSpace.subtype === SpaceSubtype.GATE)
      return "Gate spaces must be 2 or more spaces apart.";

    // Check space/link structure before gate space.
    const enteringSpaces = _getPointingSpaceIndices(gateSpaceIndex);
    if (enteringSpaces.length !== 1)
      return "A single path should connect to a gate space.";
    const enteringSpaceIndex = enteringSpaces[0];
    const enteringSpace = board.spaces[enteringSpaceIndex];
    if (!enteringSpace || enteringSpace.type !== Space.OTHER)
      return "Space before a gate space must be invisible.";
    if (enteringSpace.subtype === SpaceSubtype.GATE)
      return "Gate spaces must be 2 or more spaces apart.";

    const prevSpaces = _getPointingSpaceIndices(enteringSpaceIndex);
    if (prevSpaces.length !== 1)
      return "A single path should connect to the space before a gate space.";
    //FIXME: This is broken.
    //if (prevSpaces[0].subtype === SpaceSubtype.GATE)
    //  return "Gate spaces must be 2 or more spaces apart.";
  }

  function _getPointingSpaceIndices(pointedAtIndex: number) {
    const pointingIndices: number[] = [];
    for (const startIdx in board.links) {
      const ends = getConnections(parseInt(startIdx), board)!;
      ends.forEach((end) => {
        if (end === pointedAtIndex) pointingIndices.push(Number(startIdx));
      });
    }
    return pointingIndices;
  }

  return false;
};

const AdditionalBackgroundCodeIssue = createRule(
  "ADDITIONALBGCODEISSUE",
  "Additional background code issue",
  ValidationLevel.ERROR,
);
AdditionalBackgroundCodeIssue.fails = async function (
  { board },
  args: any = {},
) {
  const bgCode = getAdditionalBackgroundCode(board);
  if (!bgCode) {
    return false;
  }

  const game = romhandler.getROMGame()!;
  const failures = await testAdditionalBgCodeWithGame(
    bgCode.code,
    bgCode.language,
    board,
    game,
  );

  if (failures.length) {
    console.error(failures);
    return "The additional background code failed a test assembly.";
  }

  return false;
};

const GetAudioIndexCodeIssue = createRule(
  "GETAUDIOINDEXCODEISSUE",
  "Audio selection code issue",
  ValidationLevel.ERROR,
);
GetAudioIndexCodeIssue.fails = async function ({ board }, args: any = {}) {
  const code = getAudioSelectCode(board);
  if (!code) {
    return false;
  }

  const game = romhandler.getROMGame()!;
  const failures = await testGetAudioCodeWithGame(
    code.code,
    code.language,
    board,
    game,
  );

  if (failures.length) {
    console.error(failures);
    return "The music selection code failed a test assembly.";
  }

  return false;
};

const AudioDetailsIssue = createRule(
  "AUDIODETAILSISSUE",
  "Audio details issue",
  ValidationLevel.ERROR,
);
AudioDetailsIssue.fails = async function ({ board }, args: any = {}) {
  if (typeof board.audioType !== "number") {
    return "Expected audioType to be defined.";
  }

  switch (board.audioType) {
    case BoardAudioType.InGame:
      if (typeof board.audioIndex !== "number") {
        return "Expected an audio track index to be defined.";
      }
      // TODO: Validate range of audio index?
      break;

    case BoardAudioType.Custom:
      if (!board.audioData) {
        return "Expected custom audio data to be defined.";
      }
      if (!Array.isArray(board.audioData)) {
        return "Expected custom audio data to be an array.";
      }
      if (!board.audioData.length) {
        return "Custom audio was chosen, but a midi file was not uploaded.";
      }

      const audio = romhandler.getRom()!.getAudio();
      for (const audioEntry of board.audioData) {
        const soundbankIndex = audioEntry.soundbankIndex;
        const seqTable = audio.getSequenceTable(0)!;
        const bankCount = seqTable.soundbanks.banks.length;
        if (soundbankIndex < 0 || soundbankIndex >= bankCount) {
          return `Soundbank index for custom audio is out of range (0 - ${
            bankCount - 1
          })`;
        }

        if (!audioEntry.data) {
          return "Custom audio was chosen, but a midi file was not uploaded.";
        }
        let midiBuffer: ArrayBuffer;
        try {
          midiBuffer = dataUrlToArrayBuffer(audioEntry.data);
        } catch {
          return "Custom audio midi data could not be parsed into an ArrayBuffer.";
        }

        let gameMidi;
        try {
          gameMidi = createGameMidi(midiBuffer, { loop: true });
        } catch {
          return "Custom audio midi data could not be converted into game audio.";
        }
        if (!gameMidi) {
          return "Custom audio midi data could not be converted into game audio.";
        }
      }
      break;
  }

  return false;
};
