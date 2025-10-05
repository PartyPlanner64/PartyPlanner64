import { IEventParseInfo, IEventWriteInfo, IEvent } from "../../../events";
import {
  EditorEventActivationType,
  EventExecutionType,
  Game,
} from "../../../../types";
import { hashEqual } from "../../../../utils/arrays";
import { IEventInstance } from "../../../../boards";

export const StarEvent1: IEvent = {
  id: "STAR1",
  name: "Buy star",
  activationType: EditorEventActivationType.WALKOVER,
  executionType: EventExecutionType.DIRECT,
  fakeEvent: true,
  supportedGames: [Game.MP1_USA],
  parse(dataView: DataView, info: IEventParseInfo) {
    const hashes = {
      // DK, Wario, Luigi
      METHOD_START: "14A3FD0F13B034F8C90659FF589A17DB", // +0x14
      // Skip a method call (two possibilities [DK, Wario, Luigi], [Bowser, Eternal])
      METHOD_MID: "B48ABB1B1FDBF7B5EF9765FD61C3940E", // [0x18]+0x10
      // Skip a relative branch
      // Skip A0, R0, Event# (44, 5E)
      METHOD_END: "5FEE3364FDCA8B0E9247BFB37A391358", //[0x30]+0x34
    };

    if (
      hashEqual([dataView.buffer, info.offset, 0x14], hashes.METHOD_START) &&
      hashEqual(
        [dataView.buffer, info.offset + 0x18, 0x10],
        hashes.METHOD_MID,
      ) &&
      hashEqual([dataView.buffer, info.offset + 0x30, 0x34], hashes.METHOD_END)
    ) {
      return true;
    }

    return false;
  },
  write(
    dataView: DataView,
    event: IEventInstance,
    info: IEventWriteInfo,
    temp: any,
  ) {
    return `
      addiu SP, SP, -0x18
      sw    RA, 0x10(SP)
      jal   GetCurrentSpaceIndex
      NOP
      sll   V0, V0, 0x10
      jal   __PP64_INTERNAL_STAR_SPACE
      sra   A0, V0, 0x10
      sll   V0, V0, 0x10
      sra   V0, V0, 0x10
      addiu V1, R0, 1
      bne   V0, V1, L800F9700 ; test if player bought star?
      addiu A0, R0, 68
      addu  A1, R0, R0
      jal   0x800587EC
      addiu A2, R0, 2
      jal   __PP64_INTERNAL_GET_NEXT_TOAD_INDEX
      NOP
      sll   V0, V0, 0x10
      addiu A0, R0, -1
      addiu A1, R0, 8
      jal   0x8004D2A4
      sra   A2, V0, 0x10
    L800F9700:
      lw    RA, 0x10(SP)
      jr    RA
      addiu SP, SP, 0x18
    `;
  },
};
