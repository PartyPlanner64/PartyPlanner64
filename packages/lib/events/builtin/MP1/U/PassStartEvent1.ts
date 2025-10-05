import { hashEqual } from "../../../../utils/arrays";
import { IEventParseInfo, IEvent, IEventWriteInfo } from "../../../events";
import {
  EditorEventActivationType,
  EventExecutionType,
  Game,
} from "../../../../types";
import { IEventInstance } from "../../../../boards";
import { addEventToLibrary } from "../../../EventLibrary";

export const PassStart: IEvent = {
  id: "PASSSTART",
  name: "Pass start",
  activationType: EditorEventActivationType.WALKOVER,
  executionType: EventExecutionType.PROCESS,
  supportedGames: [Game.MP1_USA],
  parse(dataView: DataView, info: IEventParseInfo) {
    const hashes = {
      // DK hash:
      METHOD_START: "D87057256E3E3CA9A6878AA03EF4C486", // +0x16
      METHOD_END: "9AB28DCC38CFBE9AE8FEA4515E86D7B2", //[0x1C]+0x18
    };

    if (
      hashEqual([dataView.buffer, info.offset, 0x16], hashes.METHOD_START) &&
      hashEqual([dataView.buffer, info.offset + 0x1c, 0x18], hashes.METHOD_END)
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

      ; TODO: Face player towards koopa troopa
      ;addiu A0, R0, -1
      ;addiu A1, R0, 8
      ;jal   0x8004D2A4
      ;addiu A2, R0, KOOPA_TROOPA_STANDING_SPACE_INDEX

      jal   koopa_start_space_event_inner
      NOP
      jal   EndProcess
      addu  A0, R0, R0
      lw    RA, 0x10(SP)
      jr    RA
      addiu SP, SP, 0x18

  .definelabel CORE_800ED192,0x800ED192

  koopa_start_space_event_inner:
      addiu SP, SP, -0x18
      sw    RA, 0x14(SP)
      sw    S0, 0x10(SP)
      lui   S0, hi(CORE_800ED192)
      addiu S0, S0, lo(CORE_800ED192)
      lhu   V0, 0(S0)
      addiu V0, V0, 1
      sh    V0, 0(S0)
      jal   IsBoardFeatureFlagSet
      addiu A0, R0, 66
      bne   V0, R0, L800F965C
      lui   V1, 0x6666
      lhu   V0, 0(S0)
      sll   V0, V0, 0x10
      sra   A0, V0, 0x10
      ori V1, V1, 0x6667
      mult  A0, V1
      mfhi  A3
      sra   V1, A3, 2
      sra   V0, V0, 0x1f
      subu  V1, V1, V0
      sll   V0, V1, 2
      addu  V0, V0, V1
      sll   V0, V0, 1
      subu  A0, A0, V0
      sll   A0, A0, 0x10
      beq   A0, R0, L800F9624
      NOP
      jal   IsBoardFeatureFlagSet
      addiu A0, R0, 77
      bne   V0, R0, L800F965C
      NOP
    L800F9624:
      jal   IsBoardFeatureFlagSet
      addiu A0, R0, 77
      beq   V0, R0, L800F963C
      addiu A0, R0, -1
      jal   0x80058910
      addiu A1, R0, 1
    L800F963C:
      jal   SetBoardFeatureFlag
      addiu A0, R0, 77
      addiu A0, R0, 95
      addu  A1, R0, R0
      jal   0x800587EC
      addiu A2, R0, 1
      j     L800F9664
      NOP
    L800F965C:
      jal   receive_koopa_bonus
      NOP
    L800F9664:
      lw    RA, 0x14(SP)
      lw    S0, 0x10(SP)
      jr    RA
      addiu SP, SP, 0x18

  receive_koopa_bonus:
      addiu SP, SP, -0x20
      sw    RA, 0x1c(SP)
      sw    S2, 0x18(SP)
      sw    S1, 0x14(SP)
      jal   GetCurrentPlayerIndex
      sw    S0, 0x10(SP)
      addu  S1, V0, R0
      sll   A0, S1, 0x10
      jal   0x800405DC
      sra   A0, A0, 0x10
      addiu A0, R0, -1
      addiu A1, R0, -1
      jal   0x80052BE8
      addiu A2, R0, 2
      jal   IsBoardFeatureFlagSet
      addiu A0, R0, 66
      bnel  V0, R0, L800F94F0
      addiu A0, R0, 65
      addiu A0, R0, 72
      addiu A1, R0, 60
      addiu A2, R0, 16
      jal   CreateTextWindow
      addiu A3, R0, 3
      addu  S0, V0, R0
      sll   V0, V0, 0x10
      sra   A0, V0, 0x10
      addiu A1, R0, 569 ; "Nice work! Take this 10 Coin Bonus! Use it wisely"
      addiu A2, R0, -1
      jal   LoadStringIntoWindow
      addiu A3, R0, -1
      j     L800F9520
      addiu S2, R0, 10
    L800F94F0:
      addiu A1, R0, 60
      addiu A2, R0, 17
      jal   CreateTextWindow
      addiu A3, R0, 3
      addu  S0, V0, R0
      sll   V0, V0, 0x10
      sra   A0, V0, 0x10
      addiu    A1, R0, 570 ; "Nice work! Take this 20 Coin Bonus! Just a little bit longer..."
      addiu    A2, R0, -1
      jal   LoadStringIntoWindow
      addiu    A3, R0, -1
      addiu    S2, R0, 20
    L800F9520:
      sll   S0, S0, 0x10
      sra   S0, S0, 0x10
      addu  A0, S0, R0
      jal   SetTextCharsPerFrame
      addu  A1, R0, R0
      jal   ShowTextWindow
      addu  A0, S0, R0
      jal   PlaySound
      addiu A0, R0, 1074  ; Metal metal? :D
      sll   S1, S1, 0x10
      sra   S1, S1, 0x10
      addu  A0, S0, R0
      jal   0x8004DBD4
      addu  A1, S1, R0
      jal   HideTextWindow
      addu  A0, S0, R0
      addu  S0, S2, R0
      addu  A0, S1, R0
      jal   AdjustPlayerCoinsGradual
      addu  A1, S0, R0
      addu  A0, S1, R0
      jal   ShowPlayerCoinChange
      addu  A1, S0, R0
      jal   SleepProcess
      addiu A0, R0, 30 ; 30 frames
      jal   0x8003FEFC
      addu  A0, S1, R0
      lw    RA, 0x1c(SP)
      lw    S2, 0x18(SP)
      lw    S1, 0x14(SP)
      lw    S0, 0x10(SP)
      jr    RA
      addiu SP, SP, 0x20
    `;
  },
};
addEventToLibrary(PassStart);
