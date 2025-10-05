import { IEventParseInfo, IEvent, IEventWriteInfo } from "../../../events";
import {
  EditorEventActivationType,
  EventExecutionType,
  Game,
} from "../../../../types";
import { hashEqual } from "../../../../utils/arrays";
import { IEventInstance } from "../../../../boards";
import { addEventToLibrary } from "../../../EventLibrary";

export const ChanceTime: IEvent = {
  id: "CHANCETIME",
  name: "Chance Time",
  activationType: EditorEventActivationType.LANDON,
  executionType: EventExecutionType.DIRECT,
  supportedGames: [Game.MP1_USA],
  parse(dataView: DataView, info: IEventParseInfo) {
    const hashes = {
      // Peach hash, 0x24699C, 0x800F79BC
      METHOD: "18F44B4AA1F4AAAA839C100E3B0FD863", // +0x6C
    };

    if (hashEqual([dataView.buffer, info.offset, 0x6c], hashes.METHOD)) {
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
      ADDIU SP SP 0xFFE0
      SW RA 0x18(SP)
      SW S1 0x14(SP)
      SW S0 0x10(SP)
      ADDU S1 R0 R0
    loop:
      JAL GetPlayerStruct
      ADDU A0 S1 R0
      JAL GetCurrentPlayerIndex
      ADDU S0 V0 R0
      SLL V0 V0 0x10
      SRA V0 V0 0x10
      XOR V0 S1 V0
      SLTU V0 R0 V0
      SB V0 0(S0)
      ADDIU S1 S1 1
      SLTI V0 S1 4
      BNE V0 R0 loop
      ADDIU A0 R0 1
      ADDU A1 R0 R0
      ADDIU A2 R0 5
      JAL 0x800587BC
      ADDIU A3 R0 1
      LW RA 0x18(SP)
      LW S1 0x14(SP)
      LW S0 0x10(SP)
      JR RA
      ADDIU SP SP 0x20
    `;
  },
};
addEventToLibrary(ChanceTime);
