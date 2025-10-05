import { IEvent, IEventParseInfo, IEventWriteInfo } from "../../../events";
import {
  EditorEventActivationType,
  EventExecutionType,
  Game,
  EventParameterType,
} from "../../../../types";
import { hashEqual } from "../../../../utils/arrays";
import { addConnectionInternal, IEventInstance } from "../../../../boards";
import { addEventToLibrary } from "../../../EventLibrary";

// Represents the "event" where the player decides between two paths.
// This won't be an actual event when exposed to the user.
export const ChainSplit2: IEvent = {
  id: "CHAINSPLIT2",
  name: "",
  activationType: EditorEventActivationType.WALKOVER,
  executionType: EventExecutionType.PROCESS,
  parameters: [
    { name: "left_space", type: EventParameterType.Space },
    { name: "right_space", type: EventParameterType.Space },
    { name: "chains", type: EventParameterType.NumberArray },
  ],
  fakeEvent: true,
  supportedGames: [Game.MP2_USA],
  parse(dataView: DataView, info: IEventParseInfo) {
    const hashes = {
      // From Western Land 0x80107C54 / 0x29CF24:
      METHOD_START: "0C01A009C54E209652DA667F464FB7C0", // +0x2C
      //METHOD_MID1: "", // [0x30]+0x18 // Not sure why this was hashed in MP1
      METHOD_MID2: "FC606B8F8BD2C8D39BB9581B0E4D8398", // [0x4C]+0x1C
      METHOD_END: "2F3A0045D0AC927FF23ACD73B5B62E1C", // [0xF0]+0x28
    };

    // Match a few sections to see if we match.
    if (
      hashEqual([dataView.buffer, info.offset, 0x2c], hashes.METHOD_START) &&
      //hashEqual([dataView.buffer, info.offset + 0x30, 0x18], hashes.METHOD_MID1) &&
      hashEqual(
        [dataView.buffer, info.offset + 0x4c, 0x1c],
        hashes.METHOD_MID2,
      ) &&
      hashEqual([dataView.buffer, info.offset + 0xf0, 0x28], hashes.METHOD_END)
    ) {
      // Read the chain indices.
      const leftChain = dataView.getUint16(info.offset + 0xea);
      const rightChain = dataView.getUint16(info.offset + 0xee);

      const leftSpace = info.chains[leftChain][0]; // Technically, we should check if A2 is really R0.
      const rightSpace = info.chains[rightChain][0];

      addConnectionInternal(info.curSpace, leftSpace, info.board);
      addConnectionInternal(info.curSpace, rightSpace, info.board);
      return true;
    }

    return false;
  },
  write(
    dataView: DataView,
    event: IEventInstance,
    info: IEventWriteInfo,
    temp: { helper1addr: number; helper2addr: number },
  ) {
    const chains = event.parameterValues!["chains"] as number[];
    return `
  addiu SP, SP, -0x28
  sw    RA, 0x24(SP)
  sw    S2, 0x20(SP)
  sw    S1, 0x1c(SP)
  sw    S0, 0x18(SP)

  ; Change player to standing animation?
  li    A0, -1
  li    A1, -1
  jal   func_8005DD68
   li    A2, 2

  jal   func_8007DA44
   nop
  jal   chainsplit_setup_arrows
   nop
  lui   S0, hi(D_800F93C6)
  addiu S0, S0, lo(D_800F93C6)
  lh    A0, 0(S0)
  lui   A1, hi(indices)
  jal   func_80041A74
   addiu A1, A1, lo(indices)
  move  S2, V0
  move  A0, S2
  lh    A1, 0(S0)
  jal   func_800417EC
   move  A2, R0
  jal   func_8005DCA0
   li    A0, -1
  beqz  V0, L80107D14
   li    V0, 4
  lui   A0, hi(ai_random_choice)
  addiu A0, A0, lo(ai_random_choice)
  jal   func_80044800
   move  S0, R0
  sll   V0, V0, 0x10
  sra   S1, V0, 0x10
  blez  S1, L80107D0C
   move  A0, S2
L80107CF4:
  jal   func_80041610
   li    A1, -2
  addiu S0, S0, 1
  slt   V0, S0, S1
  bnez  V0, L80107CF4
   move  A0, S2
L80107D0C:
  jal   func_80041610
   li    A1, -4
L80107D14:
  jal   func_800418D8
   move  A0, S2
  move  S0, V0
  jal   func_8004108C
   move  A0, S2
  jal   chainsplit_hide_arrows
   nop
  bnez  S0, L80107D40
   li    A0, -1
  j     L80107D44
   li    A1, ${chains[0]}
L80107D40:
  li    A1, ${chains[1]}
L80107D44:
  jal   SetNextChainAndSpace
   move  A2, R0
  jal   func_80076FCC
   move  A0, R0
  lw    RA, 0x24(SP)
  lw    S2, 0x20(SP)
  lw    S1, 0x1c(SP)
  lw    S0, 0x18(SP)
  jr    RA
   addiu SP, SP, 0x28

ai_random_choice:
  .word 0x00000000, 0x00000000, 0x00003232

indices:
  .halfword left_space
  .halfword right_space
  .halfword 0xFFFF
  .align 4

.beginstatic

chainsplit_setup_arrows:
/* 298E94 80103BC4 27BDFFE8 */  addiu SP, SP, -0x18
/* 298E98 80103BC8 AFBF0010 */  sw    RA, 0x10(SP)
L80103BCC:
/* 298E9C 80103BCC 0C014E66 */  jal   func_80053998
/* 298EA0 80103BD0 00000000 */   nop
/* 298EA4 80103BD4 10400005 */  beqz  V0, L80103BEC
/* 298EA8 80103BD8 00000000 */   nop
/* 298EAC 80103BDC 0C01F691 */  jal   func_8007DA44
/* 298EB0 80103BE0 00000000 */   nop
/* 298EB4 80103BE4 08040EF3 */  j     L80103BCC
/* 298EB8 80103BE8 00000000 */   nop
L80103BEC:
/* 298EBC 80103BEC 0C01F691 */  jal   func_8007DA44
/* 298EC0 80103BF0 00000000 */   nop
/* 298EC4 80103BF4 00002021 */  move  A0, R0
/* 298EC8 80103BF8 24050092 */  li    A1, 146
/* 298ECC 80103BFC 0C01331F */  jal   func_8004CC7C
/* 298ED0 80103C00 24060001 */   li    A2, 1
/* 298ED4 80103C04 3C018011 */  lui   AT, hi(chainsplit_arrow_memval1)
/* 298ED8 80103C08 AC2236D8 */  sw    V0, lo(chainsplit_arrow_memval1)(AT)
/* 298EDC 80103C0C 24040001 */  li    A0, 1
/* 298EE0 80103C10 240500A0 */  li    A1, 160
/* 298EE4 80103C14 0C01331F */  jal   func_8004CC7C
/* 298EE8 80103C18 24060001 */   li    A2, 1
/* 298EEC 80103C1C 3C018011 */  lui   AT, hi(chainsplit_arrow_memval2)
/* 298EF0 80103C20 AC2236DC */  sw    V0, lo(chainsplit_arrow_memval2)(AT)
/* 298EF4 80103C24 2404000D */  li    A0, 13
/* 298EF8 80103C28 240500AE */  li    A1, 174
/* 298EFC 80103C2C 0C01331F */  jal   func_8004CC7C
/* 298F00 80103C30 24060001 */   li    A2, 1
/* 298F04 80103C34 3C018011 */  lui   AT, hi(chainsplit_arrow_memval3)
/* 298F08 80103C38 AC2236E8 */  sw    V0, lo(chainsplit_arrow_memval3)(AT)
/* 298F0C 80103C3C 24040003 */  li    A0, 3
/* 298F10 80103C40 240500BC */  li    A1, 188
/* 298F14 80103C44 0C01331F */  jal   func_8004CC7C
/* 298F18 80103C48 24060001 */   li    A2, 1
/* 298F1C 80103C4C 3C018011 */  lui   AT, hi(chainsplit_arrow_memval4)
/* 298F20 80103C50 AC2236E0 */  sw    V0, lo(chainsplit_arrow_memval4)(AT)
/* 298F24 80103C54 2404000B */  li    A0, 11
/* 298F28 80103C58 240500CA */  li    A1, 202
/* 298F2C 80103C5C 0C01331F */  jal   func_8004CC7C
/* 298F30 80103C60 24060001 */   li    A2, 1
/* 298F34 80103C64 3C018011 */  lui   AT, hi(chainsplit_arrow_memval5)
/* 298F38 80103C68 AC2236E4 */  sw    V0, lo(chainsplit_arrow_memval5)(AT)
/* 298F3C 80103C6C 0C01F678 */  jal   func_8007D9E0
/* 298F40 80103C70 24040003 */   li    A0, 3
/* 298F44 80103C74 24020001 */  li    V0, 1
/* 298F48 80103C78 3C018010 */  lui   AT, hi(D_800FA198)
/* 298F4C 80103C7C A422A198 */  sh    V0, lo(D_800FA198)(AT)
/* 298F50 80103C80 3C018010 */  lui   AT, hi(D_80101058)
/* 298F54 80103C84 A4221058 */  sh    V0, lo(D_80101058)(AT)
/* 298F58 80103C88 8FBF0010 */  lw    RA, 0x10(SP)
/* 298F5C 80103C8C 03E00008 */  jr    RA
/* 298F60 80103C90 27BD0018 */   addiu SP, SP, 0x18

chainsplit_hide_arrows:
/* 298F64 80103C94 27BDFFE8 */  addiu SP, SP, -0x18
/* 298F68 80103C98 AFBF0010 */  sw    RA, 0x10(SP)
/* 298F6C 80103C9C 3C018010 */  lui   AT, hi(D_800FA198)
/* 298F70 80103CA0 A420A198 */  sh    R0, lo(D_800FA198)(AT)
/* 298F74 80103CA4 3C018010 */  lui   AT, hi(D_80101058)
/* 298F78 80103CA8 A4201058 */  sh    R0, lo(D_80101058)(AT)
/* 298F7C 80103CAC 3C048011 */  lui   A0, hi(chainsplit_arrow_memval1)
/* 298F80 80103CB0 0C01335C */  jal   func_8004CD70
/* 298F84 80103CB4 8C8436D8 */   lw    A0, lo(chainsplit_arrow_memval1)(A0)
/* 298F88 80103CB8 3C048011 */  lui   A0, hi(chainsplit_arrow_memval2)
/* 298F8C 80103CBC 0C01335C */  jal   func_8004CD70
/* 298F90 80103CC0 8C8436DC */   lw    A0, lo(chainsplit_arrow_memval2)(A0)
/* 298F94 80103CC4 3C048011 */  lui   A0, hi(chainsplit_arrow_memval3)
/* 298F98 80103CC8 0C01335C */  jal   func_8004CD70
/* 298F9C 80103CCC 8C8436E8 */   lw    A0, lo(chainsplit_arrow_memval3)(A0)
/* 298FA0 80103CD0 3C048011 */  lui   A0, hi(chainsplit_arrow_memval4)
/* 298FA4 80103CD4 0C01335C */  jal   func_8004CD70
/* 298FA8 80103CD8 8C8436E0 */   lw    A0, lo(chainsplit_arrow_memval4)(A0)
/* 298FAC 80103CDC 3C048011 */  lui   A0, hi(chainsplit_arrow_memval5)
/* 298FB0 80103CE0 0C01335C */  jal   func_8004CD70
/* 298FB4 80103CE4 8C8436E4 */   lw    A0, lo(chainsplit_arrow_memval5)(A0)
/* 298FB8 80103CE8 8FBF0010 */  lw    RA, 0x10(SP)
/* 298FBC 80103CEC 03E00008 */  jr    RA
/* 298FC0 80103CF0 27BD0018 */   addiu SP, SP, 0x18

.align 4
  chainsplit_arrow_memval1:
    .word 0
  chainsplit_arrow_memval2:
    .word 0
  chainsplit_arrow_memval3:
    .word 0
  chainsplit_arrow_memval4:
    .word 0
  chainsplit_arrow_memval5:
    .word 0

.endstatic
`;
  },
};
addEventToLibrary(ChainSplit2);
