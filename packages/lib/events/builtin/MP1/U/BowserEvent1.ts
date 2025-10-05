import { IEventParseInfo, IEventWriteInfo, IEvent } from "../../../events";
import {
  EditorEventActivationType,
  EventExecutionType,
  Game,
} from "../../../../types";
import { hashEqual } from "../../../../utils/arrays";
import { IEventInstance } from "../../../../boards";
import { addEventToLibrary } from "../../../EventLibrary";

export const Bowser: IEvent = {
  id: "BOWSER",
  name: "Visit Bowser",
  activationType: EditorEventActivationType.WALKOVER,
  executionType: EventExecutionType.DIRECT,
  supportedGames: [Game.MP1_USA],
  parse(dataView: DataView, info: IEventParseInfo) {
    const hashes = {
      PLAYER_DIRECTION_CHANGE: "DAD5E635FE90ED982D02B3F1D5C0CE21", // +0x14
      METHOD_END: "8A835D982BE35F1804E9ABD65C5699F4", // [0x1C]+0x1C
    };

    if (
      hashEqual(
        [dataView.buffer, info.offset, 0x14],
        hashes.PLAYER_DIRECTION_CHANGE,
      ) &&
      hashEqual([dataView.buffer, info.offset + 0x1c, 0x1c], hashes.METHOD_END)
    ) {
      // Check whether this points to any of the Bowser scenes.
      const sceneNum = dataView.getUint16(info.offset + 0x1a);
      const isBowserScene =
        [0x48, 0x49, 0x4f, 0x53, 0x54, 0x5b, 0x5d].indexOf(sceneNum) !== -1;
      return isBowserScene;
    }

    return false;
  },
  write(
    dataView: DataView,
    event: IEventInstance,
    info: IEventWriteInfo,
    temp: any,
  ) {
    // Any of these "work" but only the corresponding one has the right background.
    const bowserSceneNum = [0x48, 0x49, 0x4f, 0x53, 0x54, 0x5b, 0x5d][
      info.boardIndex
    ];

    return `
      addiu SP, SP, -0x18
      sw    RA, 0x10(SP)

      ; TODO: Turn player towards bowser
      ;addiu A0, R0, -1 ; current player
      ;addiu A1, R0, 8
      ;jal   0x8004D2A4
      ;addiu A2, R0, BOWSER_STANDING_SPACE_INDEX

      addiu A0, R0, ${bowserSceneNum}
      addu  A1, R0, R0
      addiu A2, R0, 3
      jal   0x800587BC
      addiu A3, R0, 1

      lw    RA, 0x10(SP)
      jr    RA
      addiu SP, SP, 0x18
    `;
  },
};
addEventToLibrary(Bowser);
