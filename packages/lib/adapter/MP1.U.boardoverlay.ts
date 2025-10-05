import { getSpacesOfSubType, getDeadSpaceIndex } from "../../../apps/partyplanner64/boards";
import { SpaceSubtype, Game } from "../types";
import { distance } from "../utils/number";
import { IBoardInfo } from "./boardinfobase";
import { getSymbol } from "../symbols/symbols";
import { getShuffleSeedData } from "./overlayutils";
import { getAdditionalBgAsmForOverlay, getBoardAdditionalBgHvqIndices } from "../events/additionalbg";
import { getAudioIndexAsmForOverlay } from "../events/getaudiochoice";
import { IBoard } from "../boards";

export async function createBoardOverlay(board: IBoard, boardInfo: IBoardInfo, boardIndex: number, audioIndices: number[]): Promise<string> {
  const [mainFsEventDir, mainFsEventFile] = boardInfo.mainfsEventFile!;

  const booIndices = getSpacesOfSubType(SpaceSubtype.BOO, board);

  const koopaIndices = getSpacesOfSubType(SpaceSubtype.KOOPA, board);
  const koopaIndex = (!koopaIndices.length ? getDeadSpaceIndex(board) : koopaIndices[0]);

  const bowserIndices = getSpacesOfSubType(SpaceSubtype.BOWSER, board);
  const bowserIndex = (!bowserIndices.length ? getDeadSpaceIndex(board) : bowserIndices[0]);

  const starIndices = [];
  for (let i = 0; i < board.spaces.length; i++) {
    if (board.spaces[i].star)
      starIndices.push(i);
  }

  const show_next_star_fn = starIndices.length ? "show_next_star_spot" : "show_next_star_no_op";
  const shuffleData = getShuffleSeedData(starIndices.length);

  const toadSpaces = getSpacesOfSubType(SpaceSubtype.TOAD, board);
  const toadIndices = [];

  // Determine the toad spaces, using distance formula for now.
  for (let starIdx = 0; starIdx < starIndices.length; starIdx++) {
    const starSpace = board.spaces[starIndices[starIdx]];
    let bestDistance = Number.MAX_VALUE;
    let bestToadIdx = starIndices[starIdx]; // By default, no toad spaces = put toad on star space for now.
    for (let t = 0; t < toadSpaces.length; t++) {
      const toadIdx = toadSpaces[t];
      const toadSpace = board.spaces[toadIdx];
      const dist = distance(starSpace.x, starSpace.y, toadSpace.x, toadSpace.y);
      if (dist < bestDistance) {
        bestDistance = dist;
        bestToadIdx = toadIdx;
      }
    }
    toadIndices.push(bestToadIdx);
  }

  // This runs before we've written the additional bgs, but we can predict the directories.
  const additionalBgIndices = getBoardAdditionalBgHvqIndices(board);

  const preppedAdditionalBgCode = await getAdditionalBgAsmForOverlay(board, boardInfo.bgDir, additionalBgIndices);
  const preppedAudioIndexCode = await getAudioIndexAsmForOverlay(board, audioIndices);

return `
.org 0x800F65E0

.definelabel CORE_800C597A,0x800C597A
.definelabel CORE_800ED154,0x800ED154
.definelabel CORE_800ED156,0x800ED156
.definelabel CORE_800ED158,0x800ED158
.definelabel CORE_800ED172,0x800ED172
.definelabel CORE_800ED192,0x800ED192
.definelabel CORE_800ED5C0,0x800ED5C0
.definelabel CORE_800ED5C2,0x800ED5C2
.definelabel CORE_800ED5CA,0x800ED5CA
.definelabel CORE_800ED5CC,0x800ED5CC
.definelabel CORE_800ED5D8,0x800ED5D8
.definelabel CORE_800EE320,0x800EE320
.definelabel CORE_800F2B7C,0x800F2B7C

.definelabel STAR_COUNT,${starIndices.length}
.definelabel BOO_COUNT,${booIndices.length}

main:
  addiu SP, SP, -0x18
  sw    RA, 0x10(SP)
  lui   A0, hi(overlaycalls)
  addiu A0, A0, lo(overlaycalls)
  lui   A1, hi(CORE_800C597A)
  jal   ExecBoardScene
   lh    A1, lo(CORE_800C597A)(A1)
  lw    RA, 0x10(SP)
  jr    RA
   addiu SP, SP, 0x18
  NOP
  NOP

__PP64_INTERNAL_GET_NEXT_TOAD_INDEX:
  lui   V0, hi(CORE_800ED5CA)
  addiu V0, V0, lo(CORE_800ED5CA)
  lh    V1, 0(V0)
  sll   V1, V1, 1
  addu  V0, V0, V1
  lh    V0, 2(V0) ; get next toad index?
  sll   V0, V0, 1
  lui   AT, hi(toad_space_indices)
  addu  AT, AT, V0
  jr    RA
   lh    V0, lo(toad_space_indices)(AT)

func_800F663C:
  addiu SP, SP, -0x30
  sw    RA, 0x28(SP)
  sw    S5, 0x24(SP)
  sw    S4, 0x20(SP)
  sw    S3, 0x1c(SP)
  sw    S2, 0x18(SP)
  sw    S1, 0x14(SP)
  sw    S0, 0x10(SP)
  lui   S5, hi(CORE_800ED5C0)
  addiu S5, S5, lo(CORE_800ED5C0)
  addu  S1, R0, R0
  lui   S3, hi(shuffle_bias)
  addiu S3, S3, lo(shuffle_bias)
  lui   S2, hi(shuffle_order)
  addiu S2, S2, lo(shuffle_order)

L800F6680:
  ; rand1 = GetRandomByte() % STAR_COUNT;
  jal	GetRandomByte
  nop
  li   S4, STAR_COUNT
  div  V0, S4
  nop
  mfhi S0
  nop
  andi  S0, S0, 0xff
  nop

  ; rand2 = GetRandomByte() % STAR_COUNT;
  jal	GetRandomByte
  nop
  li   S4, STAR_COUNT
  div  V0, S4
  nop
  mfhi A0
  nop
  andi  A0, A0, 0xff
  nop

  beq   S0, A0, L800F6740
   sll   V1, A0, 1
  addu  A3, V1, S3
  lh    V0, 0(A3)
  slt   V0, S0, V0
  bnel V0, R0, L800F6744
   addiu S1, S1, 1
  sll   A1, S0, 1
  addu  A2, A1, S3
  lh    V0, 0(A2)
  slt   V0, A0, V0
  bnel V0, R0, L800F6744
   addiu S1, S1, 1
  addu  A0, A1, S2
  lh    A1, 0(A0)
  addu  V1, V1, S2
  lhu   V0, 0(V1)
  sh    V0, 0(A0)
  sh    A1, 0(V1)
  lh    A1, 0(A2)
  lhu   V0, 0(A3)
  sh    V0, 0(A2)
  sh    A1, 0(A3)
L800F6740:
  addiu S1, S1, 1
L800F6744:
  slti  V0, S1, 0x1e
  bne  V0, R0, L800F6680
   NOP
  addu  S1, R0, R0
  lui   A0, hi(shuffle_order)
  addiu A0, A0, lo(shuffle_order)
  sll   V0, S1, 1
L800F6760:
  addu  V1, V0, S5
  addu  V0, V0, A0
  lhu   V0, 0(V0)
  sh    V0, 0xc(V1)
  addiu S1, S1, 1
  slti  V0, S1, STAR_COUNT
  bne  V0, R0, L800F6760
   sll   V0, S1, 1
  lw    RA, 0x28(SP)
  lw    S5, 0x24(SP)
  lw    S4, 0x20(SP)
  lw    S3, 0x1c(SP)
  lw    S2, 0x18(SP)
  lw    S1, 0x14(SP)
  lw    S0, 0x10(SP)
  jr    RA
   addiu SP, SP, 0x30

func_800F67A4:
  addiu SP, SP, -0x18
  sw    RA, 0x14(SP)
  sw    S0, 0x10(SP)
  lui   V0, hi(CORE_800ED5CA)
  lhu   V0, lo(CORE_800ED5CA)(V0)
  addiu V0, V0, 1
  lui   AT, hi(CORE_800ED5CA)
  sh    V0, lo(CORE_800ED5CA)(AT)
  sll   V0, V0, 0x10
  sra   V0, V0, 0x10
  slti  V0, V0, STAR_COUNT
  bne  V0, R0, L800F6820
   NOP
  lui   S0, hi(CORE_800ED5D8)
  lh    S0, lo(CORE_800ED5D8)(S0)
  lui   AT, hi(CORE_800ED5CA)
  sh    R0, lo(CORE_800ED5CA)(AT)
  jal   SetBoardFeatureFlag
   addiu    A0, R0, 68
  jal   func_800F663C
   NOP
  lui   V1, hi(CORE_800ED5CC)
  lh    V1, lo(CORE_800ED5CC)(V1)
  bne   S0, V1, L800F6820
   NOP
  lui   V0, hi(CORE_800ED5D8)
  lhu   V0, lo(CORE_800ED5D8)(V0)
  lui   AT, hi(CORE_800ED5CC)
  sh    V0, lo(CORE_800ED5CC)(AT)
  lui   AT, hi(CORE_800ED5D8)
  sh    V1, lo(CORE_800ED5D8)(AT)
L800F6820:
  lw    RA, 0x14(SP)
  lw    S0, 0x10(SP)
  jr    RA
   addiu SP, SP, 0x18

; Ensures star space shows a star, past stars are chance time
draw_star_space_state:
  addiu SP, SP, -0x30
  sw    RA, 0x2c(SP)
  sw    S4, 0x28(SP)
  sw    S3, 0x24(SP)
  sw    S2, 0x20(SP)
  sw    S1, 0x1c(SP)
  sw    S0, 0x18(SP)
  lui   S2, hi(CORE_800ED5C0)
  addiu S2, S2, lo(CORE_800ED5C0)
  addu  S1, R0, R0
  lui   S4, hi(star_space_indices)
  addiu S4, S4, lo(star_space_indices)
  lui   S3, hi(data_mystery_40s_list)
  addiu S3, S3, lo(data_mystery_40s_list)
  sll   S0, S1, 1
L800F686C:
  addu  V0, S0, S4
  lh    A0, 0(V0)
  jal   SetSpaceType
   addiu    A1, R0, 1
  addu  S0, S0, S3
  lh    A0, 0(S0)
  jal   SetBoardFeatureFlag
   addiu S1, S1, 1
  slti  V0, S1, STAR_COUNT
  bnel V0, R0, L800F686C
   sll   S0, S1, 1
  jal   IsBoardFeatureFlagSet
   addiu    A0, R0, 68
  bne  V0, R0, L800F68AC
   addiu    S0, R0, STAR_COUNT
  lh    S0, 0xa(S2)
L800F68AC:
  blez  S0, L800F68EC
   addu  S1, R0, R0
  lui   S3, hi(star_space_indices)
  addiu S3, S3, lo(star_space_indices)
  sll   V0, S1, 1
L800F68C0:
  addu  V0, V0, S2
  lh    V0, 0xc(V0)
  sll   V0, V0, 1
  addu  V0, V0, S3
  lh    A0, 0(V0)
  jal   SetSpaceType
   addiu    A1, R0, 6 ; Chance
  addiu S1, S1, 1
  slt   V0, S1, S0
  bne  V0, R0, L800F68C0
   sll   V0, S1, 1
L800F68EC:
  lh    V0, 0xa(S2)
  sll   V0, V0, 1
  addu  V0, V0, S2
  lh    V0, 0xc(V0)
  sll   V0, V0, 1
  lui   A0, hi(star_space_indices)
  addu  A0, A0, V0
  lh    A0, lo(star_space_indices)(A0)
  jal   SetSpaceType
   addiu    A1, R0, 5 ; Star
  lh    V0, 0xa(S2)
  sll   V0, V0, 1
  addu  V0, V0, S2
  lh    V0, 0xc(V0)
  sll   V0, V0, 1
  lui   A0, hi(data_mystery_40s_list)
  addu  A0, A0, V0
  jal   ClearBoardFeatureFlag
   lh    A0, lo(data_mystery_40s_list)(A0)
  lw    RA, 0x2c(SP)
  lw    S4, 0x28(SP)
  lw    S3, 0x24(SP)
  lw    S2, 0x20(SP)
  lw    S1, 0x1c(SP)
  lw    S0, 0x18(SP)
  jr    RA
   addiu SP, SP, 0x30

__PP64_INTERNAL_STAR_SPACE:
  addiu SP, SP, -0x28
  sw    RA, 0x20(SP)
  sw    S1, 0x1c(SP)
  sw    S0, 0x18(SP)
  lui   S1, hi(CORE_800ED5C0)
  addiu S1, S1, lo(CORE_800ED5C0)
  addu  S0, R0, R0
  lui   A1, hi(star_space_indices)
  addiu A1, A1, lo(star_space_indices)
  sll   A0, A0, 0x10
  sra   A0, A0, 0x10
  lui   A2, hi(data_mystery_40s_list)
  addiu A2, A2, lo(data_mystery_40s_list)
  sll   V1, S0, 1
L800F6990:
  addu  V0, V1, A1
  lh    V0, 0(V0)
  bnel  A0, V0, L800F6A14
   addiu S0, S0, 1
  lh    V0, 0xa(S1)
  sll   V0, V0, 1
  addu  V0, V0, S1
  lh    V0, 0xc(V0)
  bne   S0, V0, L800F69C8
   addu  V0, V1, A2
  lhu   V0, 0(V0)
  sh    V0, 0x1a(S1)
  j     L800F6A24
   addiu    V0, R0, 1
L800F69C8:
  jal   IsBoardFeatureFlagSet
   addiu    A0, R0, 68
  bne  V0, R0, L800F69DC
   addiu    A0, R0, STAR_COUNT
  lh    A0, 0xa(S1)
L800F69DC:
  blez  A0, L800F6A20
   addu  V1, R0, R0
  sll   V0, V1, 1
L800F69E8:
  addu  V0, V0, S1
  lh    V0, 0xc(V0)
  bne   S0, V0, L800F6A00
   addiu V1, V1, 1
  j     L800F6A24
   addiu    V0, R0, 2
L800F6A00:
  slt   V0, V1, A0
  bne  V0, R0, L800F69E8
   sll   V0, V1, 1
  j     L800F6A24
   addu  V0, R0, R0
L800F6A14:
  slti  V0, S0, STAR_COUNT
  bne  V0, R0, L800F6990
   sll   V1, S0, 1
L800F6A20:
  addu  V0, R0, R0
L800F6A24:
  lw    RA, 0x20(SP)
  lw    S1, 0x1c(SP)
  lw    S0, 0x18(SP)
  jr    RA
   addiu SP, SP, 0x28

show_next_star_spot_process:
  addiu SP, SP, -0x50
  sw    RA, 0x1c(SP)
  sw    S2, 0x18(SP)
  sw    S1, 0x14(SP)
  sw    S0, 0x10(SP)
  sdc1  F30, 0x48(SP)
  sdc1  F28, 0x40(SP)
  sdc1  F26, 0x38(SP)
  sdc1  F24, 0x30(SP)
  sdc1  F22, 0x28(SP)
  jal   0x800633A8
   sdc1  F20, 0x20(SP)
  lw    S0, 0x8c(V0)
  jal   PlaySound
   addiu    A0, R0, 109
  addiu    A0, R0, 64
  jal   0x8003DBE0
   addu  A1, R0, R0
  addu  S1, V0, R0
  lhu   V0, 0xa(S1)
  ori   V0, V0, 4
  sh    V0, 0xa(S1)
  jal   0x8004CDCC
   addu  A0, S1, R0
  addiu A0, S1, 0xc
  jal   0x800A0D50 ; posmodel
   addiu A1, S0, 4
  lui    AT, 0x43FA ; 500.000000
  mtc1  AT, F0
  NOP
  swc1  F0, 0x30(S1)
  addu  A0, S1, R0
  jal   0x80042728
   addu  A1, R0, R0
  addu  S2, V0, R0
  mtc1  R0, F20
  addu  S0, R0, R0
  lui   AT, 0x3ECC
  ori   AT, AT, 0xCCCD
  mtc1  AT, F22
L800F6AD8:
  mfc1  A1, F20
  mfc1  A2, F20
  mfc1  A3, F20
  NOP
  jal   0x800A0D00
   addiu A0, S1, 0x24
  jal   SleepVProcess
   ADD.S F20, F20, F22
  addiu S0, S0, 1
  slti  V0, S0, 6
  bne  V0, R0, L800F6AD8
   NOP
  addu  S0, R0, R0
  lui   AT, 0x3ECC
  ori   AT, AT, 0xCCCD
  mtc1  AT, F22
L800F6B18:
  mfc1  A1, F20
  mfc1  A2, F20
  mfc1  A3, F20
  NOP
  jal   0x800A0D00
   addiu A0, S1, 0x24
  jal   SleepVProcess
   SUB.S F20, F20, F22
  addiu S0, S0, 1
  slti  V0, S0, 3
  bne  V0, R0, L800F6B18
   NOP
  jal   SleepProcess
   addiu    A0, R0, 30
  jal   PlaySound
   addiu    A0, R0, 68
  mtc1  R0, F22
  lui   AT, 0x41A0 ; 20.000000
  mtc1  AT, F30
  lui   AT, 0x3CA3
  ori AT, AT, 0xd70a
  mtc1  AT, F28
  mtc1  R0, F26
  lui   AT, 0x40C0 ; 6.000000
  mtc1  AT, F24
L800F6B7C:
  lw    V0, 0x3c(S1)
  lw    V0, 0x40(V0)
  lh    V0, 0(V0)
  sll   A0, V0, 1
  addu  A0, A0, V0
  sll   A0, A0, 6
  lui   V0, hi(CORE_800F2B7C)
  lw    V0, lo(CORE_800F2B7C)(V0)  ; gets a pointer
  addu  A0, A0, V0
  mfc1  A1, F22
  NOP
  jal   0x800A40D0
   addiu A0, A0, 0x7c
  SUB.S F20, F20, F28
  C.LT.S F20, F26
  NOP
  NOP
  bc1t  L800F6BF8
   ADD.S F22, F22, F30
  mfc1  A1, F20
  mfc1  A2, F20
  mfc1  A3, F20
  NOP
  jal   0x800A0D00
   addiu A0, S1, 0x24
  lwc1  F0, 0x30(S1)
  SUB.S F0, F0, F24
  jal   SleepVProcess
   swc1  F0, 0x30(S1)
  j     L800F6B7C
   NOP
L800F6BF8:
  jal   0x800427D4
   addu  A0, S2, R0
  jal   SleepProcess
   addiu    A0, R0, 30
  jal   0x8003E694
   addu  A0, S1, R0
  jal   EndProcess
   addu  A0, R0, R0
  lw    RA, 0x1c(SP)
  lw    S2, 0x18(SP)
  lw    S1, 0x14(SP)
  lw    S0, 0x10(SP)
  ldc1  F30, 0x48(SP)
  ldc1  F28, 0x40(SP)
  ldc1  F26, 0x38(SP)
  ldc1  F24, 0x30(SP)
  ldc1  F22, 0x28(SP)
  ldc1  F20, 0x20(SP)
  jr    RA
   addiu SP, SP, 0x50

show_next_star_spot_inner:
  addiu SP, SP, -0x18
  sw    RA, 0x14(SP)
  sw    S0, 0x10(SP)
  addu  S0, A0, R0
  lw    V0, 0(S0)
  lui   AT, 0x41A0 ; 20.000000
  mtc1  AT, F0
  NOP
  swc1  F0, 0x34(V0)
  lui   AT, 0xC040 ; -3.000000
  mtc1  AT, F0
  NOP
  swc1  F0, 0x38(V0)
  lw    A0, 0(S0)
  addu  A1, R0, R0
  jal   0x8003E81C
   addu  A2, R0, R0
  jal   SleepProcess
   addiu    A0, R0, 3
L800F6C94:
  lw    A0, 0(S0)
  jal   0x8003E940
   NOP
  andi  V0, V0, 0xffff
  bne  V0, R0, L800F6CBC
   addiu    A1, R0, -1
  jal   SleepVProcess
   NOP
  j     L800F6C94
   NOP
L800F6CBC:
  lw    A0, 0(S0)
  jal   0x8003E81C
   addiu    A2, R0, 2
  lw    RA, 0x14(SP)
  lw    S0, 0x10(SP)
  jr    RA
   addiu SP, SP, 0x18

show_next_star_spot:
  addiu SP, SP, -0x20
  sw    RA, 0x1c(SP)
  sw    S2, 0x18(SP)
  sw    S1, 0x14(SP)
  sw    S0, 0x10(SP)
  lui   S2, hi(CORE_800ED5C0)
  addiu S2, S2, lo(CORE_800ED5C0)
  jal   0x80060128
   addiu    A0, R0, 43
  lui   A0, hi(data_star_related_800F9920)
  jal   0x80048224
   addiu A0, A0, lo(data_star_related_800F9920)
  addu  S0, V0, R0
  addiu    A0, R0, 2
  jal   0x80072644
   addiu    A1, R0, 16
L800F6D18:
  jal   0x80072718
   NOP
  beq  V0, R0, L800F6D38
   NOP
  jal   SleepVProcess
   NOP
  j     L800F6D18
   NOP
L800F6D38:
  jal   0x8004A520
   NOP
  lui   AT, 0x4040  ; 3.000000
  mtc1  AT, F12
  jal   0x8004B5C4
   NOP
  jal   show_next_star_spot_inner
   addu  A0, S0, R0
  lh    V0, 0xa(S2)
  bne  V0, R0, L800F6D78
   addiu    A1, R0, 1258
  jal   IsBoardFeatureFlagSet
   addiu    A0, R0, 68
  bnel V0, R0, L800F6D78
   addiu    A1, R0, 1258 ; "Let me show you where to find the next Star."
  addiu    A1, R0, 1256 ; "Let me show you where to find the first Star."
L800F6D78:
  lh    A0, 8(S0)
  addiu    A2, R0, -1
  jal   LoadStringIntoWindow
   addiu    A3, R0, -1
  lh    A0, 8(S0)
  jal   0x80071C8C
   addiu    A1, R0, 1
  jal   PlaySound
   addiu    A0, R0, 1125
  lh    A0, 8(S0)
  jal   WaitForTextConfirmation
   NOP
  lh    A0, 8(S0)
  jal   0x80071E80
   addiu    A1, R0, 1
  lh    A0, 8(S0)
  jal   0x8006EB40
   NOP
  lh    V0, 0xa(S2)
  sll   V0, V0, 1
  addu  V0, V0, S2
  lh    V0, 0xc(V0)
  sll   V0, V0, 1
  lui   A0, hi(toad_space_indices)
  addu  A0, A0, V0
  jal   GetSpaceData
   lh    A0, lo(toad_space_indices)(A0)
  addu  S1, V0, R0
  jal   0x8004B5DC
   addiu A0, S1, 4
  lui    AT, 0x40A0 ; 5.000000
  mtc1  AT, F12
  jal   0x8004B838
   NOP
  jal   SleepProcess
   addiu    A0, R0, 5
L800F6E08:
  jal   0x8004B850
   NOP
  beq  V0, R0, L800F6E28
   NOP
  jal   SleepVProcess
   NOP
  j     L800F6E08
   NOP
L800F6E28:
  jal   SleepProcess
   addiu    A0, R0, 5
  lui   A0, hi(show_next_star_spot_process)
  addiu A0, A0, lo(show_next_star_spot_process)
  addiu    A1, R0, 18432
  addu  A2, R0, R0
  jal   InitProcess
   addu  A3, R0, R0
  sw    S1, 0x8c(V0)
  jal   SleepProcess
   addiu    A0, R0, 30
  lh    V0, 0xa(S2)
  bne  V0, R0, L800F6E74
   addiu    A1, R0, 1259
  jal   IsBoardFeatureFlagSet
   addiu    A0, R0, 68
  bnel V0, R0, L800F6E74
   addiu    A1, R0, 1259 ; "This is the star spot. Get the star by giving Toad 20 coins"
  addiu    A1, R0, 1257 ; same?: "This is the star spot. Get the star by giving Toad 20 coins"
L800F6E74:
  lh    A0, 8(S0)
  addiu    A2, R0, -1
  jal   LoadStringIntoWindow
   addiu    A3, R0, -1
  lh    A0, 8(S0)
  jal   0x80071C8C
   addiu    A1, R0, 1
  lh    A0, 8(S0)
  jal   WaitForTextConfirmation
   NOP
  lh    A0, 8(S0)
  jal   0x80071E80
   addiu    A1, R0, 1
  jal   0x800601D4
   addiu    A0, R0, 90
  jal   SleepProcess
   addiu    A0, R0, 30
  addiu    A0, R0, 2
  jal   0x800726AC
   addiu    A1, R0, 16
  jal   SleepProcess
   addiu    A0, R0, 17
  jal   0x8004847C
   addu  A0, S0, R0
  jal   0x80056AF4
   NOP
  jal   0x8005DFB8
   addiu    A0, R0, 1
  jal   0x8005E3A8
   NOP
  jal   SleepVProcess
   NOP
  lw    RA, 0x1c(SP)
  lw    S2, 0x18(SP)
  lw    S1, 0x14(SP)
  lw    S0, 0x10(SP)
  jr    RA
   addiu SP, SP, 0x20

; This custom alternative is the minimum necessary to skip Toad's star showing.
show_next_star_no_op:
  addiu SP, SP, -0x18
  sw    RA, 0x10(SP)

  ; Causes fade back in (star shaped fade in)
  addiu    A0, R0, 2
  jal   0x80072644
  addiu    A1, R0, 16

  ; One or more of these may be unnecessary...
  jal   0x800601D4
  addiu    A0, R0, 90
  jal   0x80056AF4
  NOP
  jal   0x8005DFB8
  addiu    A0, R0, 1
  jal   0x8005E3A8
  NOP

  jal SleepVProcess
  nop

  lw    RA, 0x10(SP)
  jr    RA
  addiu SP, SP, 0x18

overlaycall0:
  addiu SP, SP, -0x18
  sw    RA, 0x10(SP)
  lui   AT, hi(CORE_800ED5C2)
  sh    R0, lo(CORE_800ED5C2)(AT)
  addiu    A0, R0, 10 ; max_objects
  jal   InitObjectSystem
   addu  A1, R0, R0 ; max_processes
  addiu    A0, R0, 53
  addu  A1, R0, R0
  jal   0x8005E044
   addiu    A2, R0, 146
  lw    RA, 0x10(SP)
  jr    RA
   addiu SP, SP, 0x18

overlaycall1:
  addiu SP, SP, -0x18
  sw    RA, 0x10(SP)
  addiu    A0, R0, 10
  jal   InitObjectSystem
   addu  A1, R0, R0
; Set players at starting chain
  addu  A0, R0, R0
  addu  A1, R0, R0
  jal   SetPlayerOntoChain
   addu  A2, R0, R0
  addiu    A0, R0, 1
  addu  A1, R0, R0
  jal   SetPlayerOntoChain
   addu  A2, R0, R0
  addiu    A0, R0, 2
  addu  A1, R0, R0
  jal   SetPlayerOntoChain
   addu  A2, R0, R0
  addiu    A0, R0, 3
  addu  A1, R0, R0
  jal   SetPlayerOntoChain
   addu  A2, R0, R0
  lui   V1, hi(CORE_800ED5C0)
  lh    V1, lo(CORE_800ED5C0)(V1)
  beq  V1, R0, L800F6FB8
   addiu    V0, R0, 1
  beq   V1, V0, L800F6FD8
   NOP
  j     L800F6FEC
   NOP
L800F6FB8:
  jal   SetBoardFeatureFlag
   addiu    A0, R0, 0x46
  jal   SetBoardFeatureFlag
   addiu    A0, R0, 0x47
  jal   SetBoardFeatureFlag
   addiu    A0, R0, 0x49
  j     L800F6FE4
   addiu    A0, R0, 0x4B
L800F6FD8:
  jal   SetBoardFeatureFlag
   addiu    A0, R0, 0x47
  addiu    A0, R0, 0x49
L800F6FE4:
  jal   SetBoardFeatureFlag
   NOP
L800F6FEC:
  jal   SetBoardFeatureFlag
   addiu    A0, R0, 0x43
  jal   func_800F663C
   NOP
  ; Clear board-specific persistent state values
  lui   V0, hi(CORE_800ED154)
  addiu V0, V0, lo(CORE_800ED154)
  sh    R0, 0(V0)
  sh    R0, 2(V0)
  sh    R0, 4(V0)
  jal   0x8005DFB8
   addiu    A0, R0, 1
  lw    RA, 0x10(SP)
  jr    RA
   addiu SP, SP, 0x18

; called from multiple places
setup_routine:
  addiu SP, SP, -0x20
  sw    RA, 0x18(SP)
  sw    S1, 0x14(SP)
  sw    S0, 0x10(SP)
  addiu    A0, R0, 80
  jal   InitObjectSystem
   addiu    A1, R0, 40
  jal   0x80060088
   addu  S1, R0, R0
  jal   0x80023448
   addiu    A0, R0, 1
  addu  A0, R0, R0
  addiu    A1, R0, 120
  addiu    A2, R0, 120
  jal   0x800234B8
   addiu    A3, R0, 120
  addiu    A0, R0, 1
  addiu    A1, R0, 64
  addiu    A2, R0, 64
  jal   0x800234B8
   addiu    A3, R0, 96
  lui   A1, 0xc2c8 ; -100.0
  lui   A2, 0x42c8 ; 100.0
  lui   A3, 0x4396 ; 300.0
  jal   0x80023504
   addiu    A0, R0, 1

  JAL   __PP64_INTERNAL_ADDITIONAL_BG_CHOICE
   NOP
  move  A0, V0 ; Determined by user-customizable hook
  addiu  A1, R0, ${boardInfo.boardDefFile}
  addiu  A2, R0, ${boardInfo.pauseBgDir!}
  jal   0x80056A08 ; setup board?
   addu  A3, R0, R0

  jal   0x80052E84 ; reset animations for characters?
   addu  A0, R0, R0
  jal   0x80052E84
   addiu    A0, R0, 1
  jal   0x80052E84
   addiu    A0, R0, 2
  jal   0x80052E84
   addiu    A0, R0, 3
L800F70C0:
  jal   GetPlayerStruct
   addu  A0, S1, R0
  addu  S0, V0, R0
  lw    A0, 0x20(S0)
  jal   0x8003E174
   addiu S1, S1, 1
  lw    V1, 0x20(S0)
  lhu   V0, 0xa(V1)
  ori   V0, V0, 2
  sh    V0, 0xa(V1)
  slti  V0, S1, 4
  bne  V0, R0, L800F70C0
   NOP
  jal   IsBoardFeatureFlagSet
   addiu    A0, R0, 78
  beq  V0, R0, L800F7114
   NOP
  jal   ClearBoardFeatureFlag
   addiu    A0, R0, 78
  jal   func_800F67A4
   NOP
L800F7114:
.if STAR_COUNT
  jal   draw_star_space_state
   NOP
  jal   draw_toads_outer
   NOP
.endif
  jal   IsBoardFeatureFlagSet
   addiu    A0, R0, 14
  bne  V0, R0, L800F714C
   NOP
  jal   koopa_draw_outer
   NOP
L800F714C:
  jal   IsBoardFeatureFlagSet
   addiu    A0, R0, 15
  bne  V0, R0, L800F7164
   NOP
.if BOO_COUNT
  jal   boo_draw_outer
.endif
   NOP
L800F7164:
  jal   IsBoardFeatureFlagSet
   addiu    A0, R0, 13
  bne  V0, R0, L800F717C
   NOP
  jal   bowser_draw_outer
   NOP
L800F717C:
  lw    RA, 0x18(SP)
  lw    S1, 0x14(SP)
  lw    S0, 0x10(SP)
  jr    RA
   addiu SP, SP, 0x20

${preppedAdditionalBgCode}

; A function that returns the audio index, to let custom events call to get the value.
${preppedAudioIndexCode}

overlaycall2:
  addiu SP, SP, -0x18
  sw    RA, 0x10(SP)

  jal __PP64_INTERNAL_GET_BOARD_AUDIO_INDEX
   nop

  ; Start playing board audio.
  jal   0x80060128
   move A0, V0

  jal   0x8001D240
   addiu A0, R0, 2
  jal   setup_routine
   NOP
  JAL hydrate_events
   NOP

; TODO: Support the disabled koopa, boo, bowser setting with split event tables
;  jal   IsBoardFeatureFlagSet
;   addiu A0, R0, 14
;  bne  V0, R0, L800F71D8
;   NOP
;  lui   A0, hi(koopa_event_table)
;  jal   EventTableHydrate
;   addiu A0, A0, lo(koopa_event_table)
;L800F71D8:
;  jal   IsBoardFeatureFlagSet
;   addiu A0, R0, 15
;  bne  V0, R0, L800F71F4
;   NOP
;  lui   A0, hi(boo_event_table)
;  jal   EventTableHydrate
;   addiu A0, A0, lo(boo_event_table)
;L800F71F4:
;  jal   IsBoardFeatureFlagSet
;   addiu A0, R0, 13
;  bne  V0, R0, L800F7210
;   NOP
;  lui   A0, hi(bowser_event_table)
;  jal   EventTableHydrate
;   addiu A0, A0, lo(bowser_event_table)
L800F7210:
  jal   0x800584F0
   addu  A0, R0, R0
  lw    RA, 0x10(SP)
  jr    RA
   addiu SP, SP, 0x18

overlaycall3:
  addiu SP, SP, -0x18
  sw    RA, 0x10(SP)
  jal   0x8001D240
   addiu A0, R0, 1
  jal   setup_routine
   NOP
  jal   0x800584F0
   addiu A0, R0, 1
  lw    RA, 0x10(SP)
  jr    RA
   addiu SP, SP, 0x18

bowser_draw_inner:
  addiu SP, SP, -0x18
  sw    RA, 0x14(SP)
  sw    S0, 0x10(SP)
  lui   V0, hi(bss_bowser_model)
  lw    V0, lo(bss_bowser_model)(V0)
  bne  V0, R0, L800F72BC
   addiu A0, R0, 59 ; bowser model model_info index
  jal   0x8003DBE0
   addu  A1, R0, R0
  addu  S0, V0, R0
  jal   0x8003E174
   addu  A0, S0, R0
  lui   AT, hi(bss_bowser_model)
  sw    S0, lo(bss_bowser_model)(AT)
  lhu   V0, 0xa(S0)
  ori   V0, V0, 2
  sh    V0, 0xa(S0)
  jal   GetSpaceData
   addiu A0, R0, ${bowserIndex}
  addiu A0, S0, 0xc
  jal   0x800A0D50 ; posmodel
   addiu A1, V0, 4
  addiu    A0, R0, 7
  addu  A1, S0, R0
  addiu    A2, R0, -2
  jal   0x8003C314
   addu  A3, R0, R0
L800F72BC:
  lw    RA, 0x14(SP)
  lw    S0, 0x10(SP)
  jr    RA
   addiu SP, SP, 0x18

bowser_draw_outer:
  addiu SP, SP, -0x18
  sw    RA, 0x10(SP)
  lui   AT, hi(bss_bowser_model)
  jal   bowser_draw_inner
   sw    R0, lo(bss_bowser_model)(AT)
  lw    RA, 0x10(SP)
  jr    RA
   addiu SP, SP, 0x18

koopa_draw_inner:
  addiu SP, SP, -0x18
  sw    RA, 0x14(SP)
  sw    S0, 0x10(SP)
  lui   V0, hi(bss_koopa_model)
  lw    V0, lo(bss_koopa_model)(V0)
  bne   V0, R0, L800F7358
   addiu A0, R0, 57 ; koopa model model_info index
  jal   0x8003DBE0 ; loads model
   addu  A1, R0, R0
  addu  S0, V0, R0
  jal   0x8003E174
   addu  A0, S0, R0
  lui   AT, hi(bss_koopa_model)
  sw    S0, lo(bss_koopa_model)(AT)
  lhu   V0, 0xa(S0)
  ori   V0, V0, 2
  sh    V0, 0xa(S0)
  jal   GetSpaceData
   addiu A0, R0, ${koopaIndex}
  addiu A0, S0, 0xc
  jal   0x800A0D50 ; posmodel
   addiu A1, V0, 4
  addiu A0, R0, 9
  addu  A1, S0, R0
  addiu A2, R0, -1
  jal   0x8003C314
   addiu A3, R0, -3
L800F7358:
  lw    RA, 0x14(SP)
  lw    S0, 0x10(SP)
  jr    RA
   addiu SP, SP, 0x18

koopa_draw_outer:
  addiu SP, SP, -0x18
  sw    RA, 0x10(SP)
  lui   AT, hi(bss_koopa_model)
  jal   koopa_draw_inner
   sw    R0, lo(bss_koopa_model)(AT)
  lw    RA, 0x10(SP)
  jr    RA
   addiu SP, SP, 0x18

draw_toads_inner:
  addiu SP, SP, -0x20
  sw    RA, 0x1c(SP)
  sw    S2, 0x18(SP)
  sw    S1, 0x14(SP)
  sw    S0, 0x10(SP)
  addu  S0, A0, R0
  sll   A0, A0, 0x10
  sra   A0, A0, 0xe
  lui   V0, hi(bss_toad_instances)
  addu  V0, V0, A0
  lw    V0, lo(bss_toad_instances)(V0)
  bne  V0, R0, L800F7474
   NOP
  lui   V0, hi(bss_toad_model)
  lw    V0, lo(bss_toad_model)(V0)
  bne  V0, R0, L800F73F4
   NOP
  addiu    A0, R0, 58 ; Toads model_info index
  jal   0x8003DBE0
   addu  A1, R0, R0
  addu  S2, V0, R0
  jal   0x8003E174
   addu  A0, S2, R0
  lui   AT, hi(bss_toad_model)
  sw    S2, lo(bss_toad_model)(AT)
  j     L800F7408
   sll   S0, S0, 0x10
L800F73F4:
  lui   A0, hi(bss_toad_model)
  lw    A0, lo(bss_toad_model)(A0)
  jal   0x8003E320
   sll   S0, S0, 0x10
  addu  S2, V0, R0
L800F7408:
  sra   S0, S0, 0x10
  sll   S1, S0, 2
  lui   AT, hi(bss_toad_instances)
  addu  AT, AT, S1
  sw    S2, lo(bss_toad_instances)(AT)
  lhu   V0, 0xa(S2)
  ori   V0, V0, 2
  sh    V0, 0xa(S2)
  jal   0x8004CDCC
   addu  A0, S2, R0
  sll   S0, S0, 1
  lui   A0, hi(toad_space_indices_repeat)
  addu  A0, A0, S0
  jal   GetSpaceData
   lh    A0, lo(toad_space_indices_repeat)(A0)
  addiu A0, S2, 0xc
  jal   0x800A0D50 ; posmodel
   addiu A1, V0, 4
  addiu    A0, R0, 6
  lui   A2, hi(RO_800F9948)
  addu  A2, A2, S1
  lh    A2, lo(RO_800F9948)(A2)
  lui   A3, hi(RO_800F994A)
  addu  A3, A3, S1
  lh    A3, lo(RO_800F994A)(A3)
  jal   0x8003C314
   addu  A1, S2, R0
L800F7474:
  lw    RA, 0x1c(SP)
  lw    S2, 0x18(SP)
  lw    S1, 0x14(SP)
  lw    S0, 0x10(SP)
  jr    RA
   addiu SP, SP, 0x20

draw_toads_outer:
  addiu SP, SP, -0x20
  sw    RA, 0x1c(SP)
  sw    S2, 0x18(SP)
  sw    S1, 0x14(SP)
  sw    S0, 0x10(SP)
  lui   AT, hi(bss_toad_model)
  sw    R0, lo(bss_toad_model)(AT)
  addu  S0, R0, R0
  lui   S2, hi(bss_toad_instances)
  addiu S2, S2, lo(bss_toad_instances)
  lui   S1, hi(data_mystery_40s_list_2)
  addiu S1, S1, lo(data_mystery_40s_list_2)
  sll   V0, S0, 2
L800F74C0:
  addu  V0, V0, S2
  sw    R0, 0(V0)
  sll   V0, S0, 1
  addu  V0, V0, S1
  jal   IsBoardFeatureFlagSet
   lh    A0, 0(V0)
  bnel V0, R0, L800F74F0
   addiu S0, S0, 1
  sll   A0, S0, 0x10
  jal   draw_toads_inner
   sra   A0, A0, 0x10
  addiu S0, S0, 1
L800F74F0:
  slti  V0, S0, STAR_COUNT
  bne  V0, R0, L800F74C0
   sll   V0, S0, 2
  lw    RA, 0x1c(SP)
  lw    S2, 0x18(SP)
  lw    S1, 0x14(SP)
  lw    S0, 0x10(SP)
  jr    RA
   addiu SP, SP, 0x20

.if BOO_COUNT
boo_draw_inner:
  ; A0 = index of boo to draw
  addiu SP, SP, -0x20
  sw    RA, 0x18(SP)
  sw    S1, 0x14(SP)
  sw    S0, 0x10(SP)
  addu  S0, A0, R0
  ; V0 = bss_boo_instances[A0]
  sll   A0, A0, 0x10
  sra   A0, A0, 0xe
  lui   V0, hi(bss_boo_instances)
  addu  V0, V0, A0
  lw    V0, lo(bss_boo_instances)(V0)
  ; If we have a non-zero in bss_boo_instances[A0], exit.
  bne  V0, R0, boo_draw_inner_exit
   NOP
  ; V0 = bss_boo_model
  lui   V0, hi(bss_boo_model)
  lw    V0, lo(bss_boo_model)(V0)
  ; If we have already loaded the boo model, jump ahead
  bne  V0, R0, L800F7714
   addiu    A0, R0, 106 ; Boo model_info index
  jal   0x8003DBE0
   addu  A1, R0, R0
  addu  S1, V0, R0
  jal   0x8003E174
   addu  A0, S1, R0
  lui   AT, hi(bss_boo_model)
  sw    S1, lo(bss_boo_model)(AT)
  j     L800F7728
   sll   S0, S0, 0x10
L800F7714:
  ; A0 = bss_boo_model
  lui   A0, hi(bss_boo_model)
  lw    A0, lo(bss_boo_model)(A0)
  jal   0x8003E320
   sll   S0, S0, 0x10
  addu  S1, V0, R0
L800F7728:
  sra   S0, S0, 0x10
  sll   V0, S0, 2
  ; bss_boo_instances[original index] = S1
  lui   AT, hi(bss_boo_instances)
  addu  AT, AT, V0
  sw    S1, lo(bss_boo_instances)(AT)
  lhu   V0, 0xa(S1)
  ori   V0, V0, 2
  sh    V0, 0xa(S1)
  addiu A0, S1, 0x24
  lui A1, 0x3f19
  ori A1, A1, 0x999a ; 0.6
  addu  A2, A1, R0 ; 0.6
  jal   0x800A0D00
   addu  A3, A1, R0 ; 0.6
  lui   AT, 0x42C8 ; 100.000000
  mtc1  AT, F0
  NOP
  swc1  F0, 0x30(S1)
  ; Get the space data for boo_space_indices[original index]
  sll   S0, S0, 1
  lui   A0, hi(boo_space_indices)
  addu  A0, A0, S0
  jal   GetSpaceData
   lh    A0, lo(boo_space_indices)(A0)
  addiu A0, S1, 0xc
  jal   0x800A0D50 ; posmodel
   addiu A1, V0, 4
  addiu    A0, R0, 8
  addu  A1, S1, R0
  addu  A2, R0, R0
  jal   0x8003C314
   addu  A3, R0, R0
boo_draw_inner_exit:
  lw    RA, 0x18(SP)
  lw    S1, 0x14(SP)
  lw    S0, 0x10(SP)
  jr    RA
   addiu SP, SP, 0x20

boo_draw_outer:
  addiu SP, SP, -0x18
  sw    RA, 0x14(SP)
  sw    S0, 0x10(SP)
  ; bss_boo_model = 0
  lui   AT, hi(bss_boo_model)
  sw    R0, lo(bss_boo_model)(AT)
  addu  S0, R0, R0
  sll   A0, S0, 0x10
boo_draw_outer_loop:
  jal   boo_draw_inner
   sra   A0, A0, 0x10
  addiu S0, S0, 1
  slti  V0, S0, BOO_COUNT
  bne  V0, R0, boo_draw_outer_loop
   sll   A0, S0, 0x10
  lw    RA, 0x14(SP)
  lw    S0, 0x10(SP)
  jr    RA
   addiu SP, SP, 0x18
.endif ; BOO_COUNT

overlaycall4:
  addiu SP, SP, -0x18
  sw    RA, 0x10(SP)
  jal   InitCameras
   addiu    A0, R0, 2 ; camera count
  lui   A1, hi(data_screen_dimensions)
  addiu A1, A1, lo(data_screen_dimensions)
  jal   0x8001D4D4
   addiu    A0, R0, 1
  jal   setup_routine
   NOP
  jal   0x800584F0
   addiu    A0, R0, 2
  lui   A0, hi(${show_next_star_fn})
  addiu A0, A0, lo(${show_next_star_fn})
  addiu    A1, R0, 4101
  addu  A2, R0, R0
  jal   InitProcess
   addu  A3, R0, R0
  lw    RA, 0x10(SP)
  jr    RA
   addiu SP, SP, 0x18

hydrate_events:
  ADDIU SP SP 0xFFE8
  SW RA, 0x0010(SP)

  // Call for the MainFS to read in the ASM blob.
  LUI A0 ${mainFsEventDir}
  JAL ${getSymbol(Game.MP1_USA, "ReadMainFS")}
  ADDIU A0 A0 ${mainFsEventFile}

  // Now, V0 has the location that the MainFSRead put the blob... it isn't
  // where we want it, it is in the heap somewhere, so we will move it.

  // This is a pretty simple copy loop
  // T4 = Copy of V0, Current source RAM location
  // T0 = Current dest RAM location
  // T1 = Size of buffer remaining to copy
  // T2 = Temp word register to do the copy
  ADDU T4 V0 R0 // Copy V0 -> T4
  LW T0 0x4(T4) // LW T0, 0x4(T4) [RAM dest]
  LW T1 0x8(T4) // LW T1, 0x8(T4) [Buffer size]
hydrate_events_loop_start:
  LW T2 0(T4)
  SW T2 0(T0)
  ADDIU T4 T4 4
  ADDIU T0 T0 4
  ADDIU T1 T1 -4
  BGTZ T1 hydrate_events_loop_start
  NOP

  // Now we can hydrate the table.
  // T9 = V0 copy
  // T4 = Dest buffer addr + 0x10, where the table really starts
  ADDU T9 V0 R0 // Copy V0 -> T9
  LW T4 4(T9) // LW T4, 0x4(T9) [RAM dest]
  JAL ${getSymbol(Game.MP1_USA, "EventTableHydrate")}
  ADDIU A0 T4 16 // ADDIU A0, T4, 16

  // Well, we copied the buffer... now we should "free" it with this magic JAL...
  // Free our T9 reference, which theoretically could be corrupted, but in practice not.
  JAL ${getSymbol(Game.MP1_USA, "FreeMainFS")}
  ADDU A0 T9 R0

  LW RA 0x10(SP)
  JR RA
  ADDIU SP SP 0x18
.align 16

; 800F9890
rodata:
overlaycalls:
.word 0x00000000, overlaycall0
.word 0x00010000, overlaycall1
.word 0x00020000, overlaycall2
.word 0x00030000, overlaycall3
.word 0x00040000, overlaycall4
.word 0xFFFF0000, 0

data_screen_dimensions:
.word 0x00000000
.word 0x00000000
.word 0x43A00000 ; 320
.word 0x43700000 ; 240

shuffle_order:
.halfword ${shuffleData.order.join(",")}

.align 4
shuffle_bias:
.halfword ${shuffleData.bias.join(",")}

.align 4
data_mystery_40s_list:
.halfword 0x46, 0x47, 0x48, 0x49, 0x4A, 0x4B, 0x4C

.align 4
star_space_indices:
.halfword ${starIndices.join(",") || 0}

.align 4
toad_space_indices:
.halfword ${toadIndices.join(",") || 0}

.align 4
data_star_related_800F9920:
.word 0x00000001, 0x00070003

.align 4
toad_space_indices_repeat:
.halfword ${toadIndices.join(",") || 0}

.align 4
data_mystery_40s_list_2:
.halfword 0x46, 0x47, 0x48, 0x49, 0x4A, 0x4B, 0x4C, 0

RO_800F9948:
.halfword 6
RO_800F994A:
.halfword 0
.word 0x0000FFFD, 0x0000FFF8, 0xFFFD0000, 0xFFFE0000, 0xFFFE0000, 0xFFFD0000

.if BOO_COUNT
boo_space_indices:
.halfword ${booIndices.join(",")}
.endif

.align 16

bss:
bss_bowser_model: .word 0

bss_koopa_model: .word 0

bss_toad_model: .word 0
bss_toad_instances: .word ${toadIndices.map(() => 0).join(",") || 0}

.if BOO_COUNT
bss_boo_model: .word 0
bss_boo_instances: .word ${booIndices.map(() => 0).join(",")}
.endif

.align 16

`;
}