import { IBoardInfo } from "./boardinfobase";
import { SpaceSubtype, Game, Space } from "../types";
import { distance, getRawFloat32Format } from "../utils/number";
import { getSymbol } from "../symbols/symbols";
import { BankEvent, BooEvent, ItemShopEvent, Gate } from "../events/builtin/events.common";
import { GateParameterNames } from "../events/builtin/MP3/U/GateEvent3";
import { getArrowRotationLimit } from "./boardinfo";
import { $$hex } from "../utils/debug";
import { getAdditionalBgAsmForOverlay, getBoardAdditionalBgHvqIndices } from "../events/additionalbg";
import { getShuffleSeedData } from "./overlayutils";
import { getAudioIndexAsmForOverlay } from "../events/getaudiochoice";
import { forEachEvent, IBoard, getSpacesOfSubType, getSpacesWithEvent, getDeadSpaceIndex } from "../boards";

export async function createBoardOverlay(board: IBoard, boardInfo: IBoardInfo, boardIndex: number, audioIndices: number[]): Promise<string> {
  const [mainFsEventDir, mainFsEventFile] = boardInfo.mainfsEventFile!;

  const booIndices = getSpacesOfSubType(SpaceSubtype.BOO, board);
  const booIndex = (!booIndices.length ? getDeadSpaceIndex(board) : booIndices[0]);
  let booEventSpaces = getSpacesWithEvent(BooEvent.id, board);
  let primaryBooEventSpace = -1;
  if (!booEventSpaces.length) {
    booEventSpaces = [getDeadSpaceIndex(board)];
  }
  else {
    let bestDistance = Number.MAX_VALUE;
    const booSpace = board.spaces[booIndex];
    if (booSpace) {
      for (const booEventSpaceIndex of booEventSpaces) {
        const booEventSpace = board.spaces[booEventSpaceIndex];
        const dist = distance(booEventSpace.x, booEventSpace.y, booSpace.x, booSpace.y);
        if (dist < bestDistance) {
          bestDistance = dist;
          primaryBooEventSpace = booEventSpaceIndex;
        }
      }
    }
  }

  const starIndices = [];
  for (let i = 0; i < board.spaces.length; i++) {
    if (board.spaces[i].star) {
      starIndices.push(i);
    }
  }

  const show_next_star_fn = starIndices.length ? "show_next_star_spot" : "show_next_star_no_op";
  const shuffleData = getShuffleSeedData(starIndices.length);

  const toadSpaces = getSpacesOfSubType(SpaceSubtype.TOAD, board);

  // Determine the toad spaces, using distance formula for now.
  const toadIndices = [];
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

  const bankCoinSpaces = getSpacesOfSubType(SpaceSubtype.BANKCOIN, board);
  for (let i = 0; i < 2; i++) { // Ensure at least 2
    if (bankCoinSpaces.length < 2) bankCoinSpaces.push(getDeadSpaceIndex(board));
  }

  // Find the closest Bank subtype space for each bank event space.
  const bankSpaces = getSpacesOfSubType(SpaceSubtype.BANK, board);
  const bankEventSpaces = getSpacesWithEvent(BankEvent.id, board);
  const bestBankForBankSpaces: number[] = [];
  bankEventSpaces.forEach(spaceIndex => {
    const eventSpace = board.spaces[spaceIndex];
    let bestDistance = Number.MAX_VALUE;
    let bestBankIdx = getDeadSpaceIndex(board);
    for (let b = 0; b < bankSpaces.length; b++) {
      const bankIdx = bankSpaces[b];
      const bankSpace = board.spaces[bankIdx];
      const dist = distance(eventSpace.x, eventSpace.y, bankSpace.x, bankSpace.y);
      if (dist < bestDistance) {
        bestDistance = dist;
        bestBankIdx = bankIdx;
      }
    }
    bestBankForBankSpaces.push(bestBankIdx);
  });
  if (!bankSpaces.length) bankSpaces.push(getDeadSpaceIndex(board));
  for (let i = 0; i < 2; i++) { // Ensure at least 2
    if (bankEventSpaces.length < 2) bankEventSpaces.push(getDeadSpaceIndex(board));
  }
  for (let i = 0; i < 2; i++) { // Ensure at least 2
    if (bestBankForBankSpaces.length < 2) bestBankForBankSpaces.push(getDeadSpaceIndex(board));
  }

  // Find the closest ItemShop subtype space for each shop event space.
  const itemShopSpaces = getSpacesOfSubType(SpaceSubtype.ITEMSHOP, board);
  const itemShopEventSpaces = getSpacesWithEvent(ItemShopEvent.id, board);
  const bestShopForShopEventSpaces: number[] = [];
  itemShopEventSpaces.forEach(spaceIndex => {
    const eventSpace = board.spaces[spaceIndex];
    let bestDistance = Number.MAX_VALUE;
    let bestShopIdx = getDeadSpaceIndex(board);
    for (let b = 0; b < itemShopSpaces.length; b++) {
      const shopIdx = itemShopSpaces[b];
      const shopSpace = board.spaces[shopIdx];
      const dist = distance(eventSpace.x, eventSpace.y, shopSpace.x, shopSpace.y);
      if (dist < bestDistance) {
        bestDistance = dist;
        bestShopIdx = shopIdx;
      }
    }
    bestShopForShopEventSpaces.push(bestShopIdx);
  });
  if (!itemShopSpaces.length) itemShopSpaces.push(getDeadSpaceIndex(board));
  for (let i = 0; i < 2; i++) { // Ensure at least 2
    if (itemShopEventSpaces.length < 2) itemShopEventSpaces.push(getDeadSpaceIndex(board));
  }
  for (let i = 0; i < 2; i++) { // Ensure at least 2
    if (bestShopForShopEventSpaces.length < 2) bestShopForShopEventSpaces.push(getDeadSpaceIndex(board));
  }

  // We want to get the important details about the gate event
  // spaces - only the ones that are the "entry" data.
  const _spacesWithGateEvents = getSpacesWithEvent(Gate.id, board);
  const gateEventInfos: GateParameterNames[] = [];

  function _alreadyAddedGateEventInfo(gateSpaceIndex: number): boolean {
    let found = false;
    gateEventInfos.forEach(info => {
      if (info.gateSpaceIndex === gateSpaceIndex) {
        found = true;
      }
    });
    return found;
  }

  _spacesWithGateEvents.forEach(spaceIndex => {
    const gateEventSpace = board.spaces[spaceIndex];
    forEachEvent(board, (event, eventIndex, space) => {
      if (event.id !== Gate.id) {
        return;
      }
      if (space !== gateEventSpace) {
        return;
      }
      const gateSpaceIndex = event.parameterValues!.gateSpaceIndex as number;
      if (!_alreadyAddedGateEventInfo(gateSpaceIndex)) {
        const {
          gateEntryIndex,
          gateSpaceIndex,
          gateExitIndex,
          gatePrevChain,
          gateNextChain,
        } = (event.parameterValues as any as GateParameterNames)!;
        gateEventInfos.push({
          gateEntryIndex,
          gateSpaceIndex,
          gateExitIndex,
          gatePrevChain,
          gateNextChain,
        });
      }
    })
  });
  for (let i = 0; i < 2; i++) { // Ensure at least 2
    if (gateEventInfos.length < 2) gateEventInfos.push({
      gateEntryIndex: getDeadSpaceIndex(board),
      gateSpaceIndex: getDeadSpaceIndex(board),
      gateExitIndex: getDeadSpaceIndex(board),
      gatePrevChain: [0, 0],
      gateNextChain: [0, 0],
    });
  }

  const rotations = [];
  for (let i = 0; i < board.spaces.length; i++) {
    if (board.spaces[i].type === Space.ARROW) {
      rotations.push(board.spaces[i].rotation || 0);
    }
  }
  const addArrowAngleAddr = getSymbol(Game.MP3_USA, "AddArrowAngle");
  const totalArrowsToWrite = getArrowRotationLimit();
  const arrowRotationInstructions = [];
  const loopLimit = Math.min(totalArrowsToWrite, rotations.length);
  for (let i = 0; i < loopLimit; i++) {
    arrowRotationInstructions.push(`LUI A0 hi(${$$hex(getRawFloat32Format(rotations[i]))})`);
    arrowRotationInstructions.push(`JAL ${addArrowAngleAddr}`);
    arrowRotationInstructions.push("MTC1 A0 F12");
  }

  const mirageStarEnabled = false; // Hard code to false for now.

  const additionalBgIndices = getBoardAdditionalBgHvqIndices(board);
  const preppedAdditionalBgCode = await getAdditionalBgAsmForOverlay(board, boardInfo.bgDir, additionalBgIndices);
  const preppedAudioIndexCode = await getAudioIndexAsmForOverlay(board, audioIndices);

  return `
.org 0x801059A0

; Symbols that are used, but unknown
.definelabel CORE_800A0550,0x800A0550
.definelabel CORE_800A12D0,0x800A12D0
.definelabel CORE_800A12D4,0x800A12D4
.definelabel CORE_800A12D8,0x800A12D8
.definelabel CORE_800A1764,0x800A1764
.definelabel CORE_800C9520,0x800C9520
.definelabel CORE_800C9930,0x800C9930
.definelabel CORE_800CB99C,0x800CB99C
.definelabel CORE_800CCF58,0x800CCF58
.definelabel CORE_800CD058,0x800CD058
.definelabel CORE_800CD059,0x800CD059
.definelabel CORE_800CD05D,0x800CD05D
.definelabel CORE_800CD05E,0x800CD05E
.definelabel CORE_800CD065,0x800CD065
.definelabel CORE_800CD06D,0x800CD06D
.definelabel CORE_800CD096,0x800CD096
.definelabel CORE_800CD098,0x800CD098
.definelabel CORE_800CD0A8,0x800CD0A8
.definelabel CORE_800CD0AA,0x800CD0AA
.definelabel CORE_800CD0AC,0x800CD0AC
.definelabel CORE_800CD0AE,0x800CD0AE
.definelabel CORE_800CD0B2,0x800CD0B2
.definelabel CORE_800CDBC8,0x800CDBC8
.definelabel CORE_800CDD58,0x800CDD58
.definelabel CORE_800CE198,0x800CE198
.definelabel CORE_800D037C,0x800D037C
.definelabel CORE_800D03F8,0x800D03F8
.definelabel CORE_800D110C,0x800D110C ; v & 1 == player is CPU, holds other bits?
.definelabel CORE_800D110E,0x800D110E ; u16, holds coins temporarily
.definelabel CORE_800D1123,0x800D1123 ; bool bowser suit. set at 800E3234
.definelabel CORE_800D112C,0x800D112C ; points to player "object"
.definelabel CORE_800D51F8,0x800D51F8
.definelabel CORE_80100F94,0x80100F94
.definelabel CORE_80100F95,0x80100F95
.definelabel CORE_80100F9F,0x80100F9F
.definelabel CORE_80100FA8,0x80100FA8
.definelabel CORE_80100FF4,0x80100FF4
.definelabel CORE_80101040,0x80101040
.definelabel CORE_801011FC,0x801011FC
.definelabel CORE_801014A0,0x801014A0
.definelabel CORE_80101734,0x80101734
.definelabel CORE_8010197C,0x8010197C
.definelabel CORE_80101980,0x80101980
.definelabel CORE_801019C4,0x801019C4
.definelabel CORE_80105702_window_id,0x80105702
.definelabel CORE_8010570C,0x8010570C

; Item constants
.definelabel ITEM_SKELETON_KEY,0x1
.definelabel ITEM_CELLULAR_SHOPPER,0x4
.definelabel ITEM_LUCKY_LAMP,0x9
.definelabel ITEM_BOO_REPELLANT,0xC
.definelabel ITEM_KOOPA_CARD,0xF
.definelabel ITEM_LUCKY_CHARM,0x11

.definelabel MAX_PLAYER_STAR_COUNT,0x63

; CORE_800CD096
; CORE_800CD098 ; persistent storage area?

.definelabel BANK_COUNT,${bankSpaces.length}
.definelabel SHOP_COUNT,${itemShopSpaces.length}
.definelabel GATE_COUNT,${gateEventInfos.length}
.definelabel STAR_COUNT,${starIndices.length}
.definelabel BOO_COUNT,${booIndices.length}

main:
addiu SP, SP, -0x18
sw    RA, 0x10(SP)
lui   A0, hi(overlaycalls)
addiu A0, A0, lo(overlaycalls)
lui   A1, hi(CORE_800A1764)
jal   0x800359E0
 lh    A1, lo(CORE_800A1764)(A1)
lw    RA, 0x10(SP)
jr    RA
 addiu SP, SP, 0x18
      NOP
      NOP

func_80105E80:
lui   V0, hi(CORE_800CD05D)
lb    V0, lo(CORE_800CD05D)(V0)
lui   AT, hi(CORE_800CD05E)
addu  AT, AT, V0
lb    V0, lo(CORE_800CD05E)(AT)
sll   V0, V0, 1
lui   AT, hi(D_8011D2C0)
addu  AT, AT, V0
jr    RA
 lh    V0, lo(D_8011D2C0)(AT)

func_80105EA8:
addiu SP, SP, -0x28
sw    RA, 0x24(SP)
sw    S4, 0x20(SP)
sw    S3, 0x1c(SP)
sw    S2, 0x18(SP)
sw    S1, 0x14(SP)
sw    S0, 0x10(SP)
lui   S4, hi(CORE_800CD058)
addiu S4, S4, lo(CORE_800CD058)
move  S1, R0
lui   S3, hi(shuffle_bias)
addiu S3, S3, lo(shuffle_bias)
lui   S2, hi(shuffle_order)
addiu S2, S2, lo(shuffle_order)

L80105EE0:
; rand1 = GetRandomByte() % STAR_COUNT;
jal	GetRandomByte
nop
li   A0, STAR_COUNT
div  V0, A0
nop
mfhi S0
nop
andi  S0, S0, 0xff
nop

; rand2 = GetRandomByte() % STAR_COUNT;
jal	GetRandomByte
nop
li   A0, STAR_COUNT
div  V0, A0
nop
mfhi A0
nop
andi  A0, A0, 0xff
nop

beq   S0, A0, L80105F50
 sll   V1, A0, 1
addu  A3, V1, S3
lh    V0, 0(A3)
slt   V0, S0, V0
bnezl V0, L80105F54
 addiu S1, S1, 1
sll   A1, S0, 1
addu  A2, A1, S3
lh    V0, 0(A2)
slt   V0, A0, V0
bnezl V0, L80105F54
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
L80105F50:
addiu S1, S1, 1
L80105F54:
slti  V0, S1, 0x3c
bnez  V0, L80105EE0
       NOP
move  S1, R0
lui   A0, hi(shuffle_order)
addiu A0, A0, lo(shuffle_order)
addu  V1, S4, S1
L80105F70:
sll   V0, S1, 1
addu  V0, V0, A0
lbu   V0, 1(V0)
sb    V0, 6(V1)
addiu S1, S1, 1
slti  V0, S1, STAR_COUNT
bnez  V0, L80105F70
 addu  V1, S4, S1
lw    RA, 0x24(SP)
lw    S4, 0x20(SP)
lw    S3, 0x1c(SP)
lw    S2, 0x18(SP)
lw    S1, 0x14(SP)
lw    S0, 0x10(SP)
jr    RA
 addiu SP, SP, 0x28

func_80105FB0:
addiu SP, SP, -0x18
sw    RA, 0x14(SP)
sw    S0, 0x10(SP)
lui   V0, hi(CORE_800CD05D)
lbu   V0, lo(CORE_800CD05D)(V0)
addiu V0, V0, 1
lui   AT, hi(CORE_800CD05D)
sb    V0, lo(CORE_800CD05D)(AT)
sll   V0, V0, 0x18
sra   V0, V0, 0x18
slti  V0, V0, STAR_COUNT
bnez  V0, L8010602C
       NOP
lui   S0, hi(CORE_800CD065)
lb    S0, lo(CORE_800CD065)(S0)
lui   AT, hi(CORE_800CD05D)
sb    R0, lo(CORE_800CD05D)(AT)
jal   0x80035FDC
 li    A0, 4
jal   func_80105EA8
       NOP
lui   V1, hi(CORE_800CD05E)
lb    V1, lo(CORE_800CD05E)(V1)
bne   S0, V1, L8010602C
       NOP
lui   V0, hi(CORE_800CD065)
lbu   V0, lo(CORE_800CD065)(V0)
lui   AT, hi(CORE_800CD05E)
sb    V0, lo(CORE_800CD05E)(AT)
lui   AT, hi(CORE_800CD065)
sb    V1, lo(CORE_800CD065)(AT)
L8010602C:
lw    RA, 0x14(SP)
lw    S0, 0x10(SP)
jr    RA
 addiu SP, SP, 0x18

draw_star_space_state:
addiu SP, SP, -0x20
sw    RA, 0x1c(SP)
sw    S2, 0x18(SP)
sw    S1, 0x14(SP)
sw    S0, 0x10(SP)
lui   S1, hi(CORE_800CD058)
addiu S1, S1, lo(CORE_800CD058)
move  S0, R0
lui   S2, hi(D_8011D2A0)
addiu S2, S2, lo(D_8011D2A0)
sll   V0, S0, 1
L80106068:
addu  V0, V0, S2
lh    A0, 0(V0)
jal   0x80035FDC
 addiu S0, S0, 1
slti  V0, S0, STAR_COUNT
bnez  V0, L80106068
 sll   V0, S0, 1
lb    V0, 5(S1)
addu  V0, S1, V0
lb    V0, 6(V0)
sll   V0, V0, 1
lui   A0, hi(star_space_indices)
addu  A0, A0, V0
lh    A0, lo(star_space_indices)(A0)
jal   SetSpaceType
 li    A1, 14 ; Star space type
lb    V0, 5(S1)
addu  V0, S1, V0
lb    V0, 6(V0)
sll   V0, V0, 1
lui   A0, hi(D_8011D2A0)
addu  A0, A0, V0
jal   0x8003602C ; board feature enabled?
 lh    A0, lo(D_8011D2A0)(A0)
lw    RA, 0x1c(SP)
lw    S2, 0x18(SP)
lw    S1, 0x14(SP)
lw    S0, 0x10(SP)
jr    RA
 addiu SP, SP, 0x20

func_801060E0:
lui   A2, hi(CORE_800CD058)
addiu A2, A2, lo(CORE_800CD058)
move  V1, R0
lui   A3, hi(star_space_indices)
addiu A3, A3, lo(star_space_indices)
sll   A0, A0, 0x10
sra   A0, A0, 0x10
lui   T0, hi(D_8011D2A0)
addiu T0, T0, lo(D_8011D2A0)
sll   A1, V1, 1
L80106108:
addu  V0, A1, A3
lh    V0, 0(V0)
bnel  A0, V0, L8010613C
 addiu V1, V1, 1
lb    V0, 5(A2)
addu  V0, A2, V0
lb    V0, 6(V0)
bne   V1, V0, L80106148
 addu  V0, A1, T0
lbu   V0, 1(V0)
sb    V0, 0xe(A2)
j     L8010614C
 li    V0, 1
L8010613C:
slti  V0, V1, STAR_COUNT
bnez  V0, L80106108
 sll   A1, V1, 1
L80106148:
move  V0, R0
L8010614C:
jr    RA
       NOP

func_80106154:
addiu SP, SP, -0x50
sw    RA, 0x20(SP)
sw    S3, 0x1c(SP)
sw    S2, 0x18(SP)
sw    S1, 0x14(SP)
sw    S0, 0x10(SP)
sdc1  F28, 0x48(SP)
sdc1  F26, 0x40(SP)
sdc1  F24, 0x38(SP)
sdc1  F22, 0x30(SP)
jal   0x8004EE68
 sdc1  F20, 0x28(SP)
lw    S0, 0x8c(V0)
jal   PlaySound
 li    A0, 283
li    A0, 58
jal   0x800D90C8
 move  A1, R0
lui   AT, hi(D_8011FABC)
sw    V0, lo(D_8011FABC)(AT)
move  S1, V0
lw    V0, 0x3c(S1)
lw    V0, 0x40(V0)
jal   0x800461B4
 lh    A0, 0(V0)
lhu   V0, 0xa(S1)
ori   V0, V0, 4
sh    V0, 0xa(S1)
jal   0x800ECC54
 move  A0, S1
addiu A0, S1, 0xc
jal   0x80089A20
 addiu A1, S0, 8
li    AT, 0x42480000 ; 50.000000
mtc1  AT, F0
      NOP
swc1  F0, 0x30(S1)
lui A0, 0xB
ori A0, A0, 4
jal   0x8000CED8
 li    A1, 2729
sll   V0, V0, 0x10
sra   S3, V0, 0x10
move  S0, S3
lui   A1, 0x4000
lui   A2, 0x41a0
lui   A3, 0x3f80
jal   0x8000CD00
 move  A0, S0
lui   A1, 0x41f0
jal   0x8000D018
 move  A0, S0
lwc1  F2, 0x10(S1)
lwc1  F0, 0x30(S1)
lw    A1, 0xc(S1)
add.s F0, F2, F0
mfc1  A2, F0
lw    A3, 0x14(S1)
jal   0x8000CFA4
 move  A0, S0
move  A0, S0
jal   0x8001C8A8
 li    A1, 1
mtc1  R0, F20
move  S0, R0
li    AT, 0x3F000000 ; 0.500000
mtc1  AT, F24
sll   S2, S3, 0x10
li    AT, 0x41F00000 ; 30.000000
mtc1  AT, F22
L8010626C:
mfc1  A1, F20
mfc1  A2, F20
mfc1  A3, F20
      NOP
jal   0x80089A10
 addiu A0, S1, 0x24
add.s F20, F20, F24
mul.s F4, F20, F22
mfc1  A1, F4
      NOP
jal   0x8000D018
 sra   A0, S2, 0x10
jal   SleepVProcess
 addiu S0, S0, 1
slti  V0, S0, 6
bnez  V0, L8010626C
       NOP
move  S0, R0
li    AT, 0x3ECC0000 ; 0.398438
ori   AT, AT, 0xcccd
mtc1  AT, F24
sll   S2, S3, 0x10
li    AT, 0x41F00000 ; 30.000000
mtc1  AT, F22
L801062CC:
mfc1  A1, F20
mfc1  A2, F20
mfc1  A3, F20
      NOP
jal   0x80089A10
 addiu A0, S1, 0x24
sub.s F20, F20, F24
mul.s F4, F20, F22
mfc1  A1, F4
      NOP
jal   0x8000D018
 sra   A0, S2, 0x10
jal   SleepVProcess
 addiu S0, S0, 1
slti  V0, S0, 3
bnez  V0, L801062CC
       NOP
li    AT, 0x41F00000 ; 30.000000
mtc1  AT, F0
      NOP
mul.s F0, F20, F0
mfc1  A1, F0
      NOP
jal   0x8000D018
 move  A0, S3
jal   SleepProcess
 li    A0, 30
jal   PlaySound
 li    A0, 306
mtc1  R0, F22
li    AT, 0x43B40000 ; 360.000000
mtc1  AT, F28
li    AT, 0x3F190000 ; 0.597656
ori   AT, AT, 0x999a
mtc1  AT, F26
li    AT, 0x41200000 ; 10.000000
mtc1  AT, F24
move  S0, S3
func_80106364:
lw    V0, 0x3c(S1)
lw    V0, 0x40(V0)
lh    V0, 0(V0)
sll   A0, V0, 1
addu  A0, A0, V0
sll   A0, A0, 6
lui   V0, hi(CORE_800D03F8)
lw    V0, lo(CORE_800D03F8)(V0)
addu  A0, A0, V0
mfc1  A1, F22
      NOP
jal   0x8008A2A0
 addiu A0, A0, 0x74
li    AT, 0x41A00000 ; 20.000000
mtc1  AT, F0
      NOP
add.s F22, F22, F0
c.le.s F28, F22
      NOP
      NOP
bc1tl L801063BC
 sub.s F22, F22, F28
L801063BC:
c.lt.s F26, F20
      NOP
bc1f  L801063E0
       NOP
li    AT, 0x3D230000 ; 0.039795
ori   AT, AT, 0xd70a
mtc1  AT, F0
      NOP
sub.s F20, F20, F0
L801063E0:
mfc1  A1, F20
mfc1  A2, F20
mfc1  A3, F20
      NOP
jal   0x80089A10
 addiu A0, S1, 0x24
lwc1  F2, 0x30(S1)
c.lt.s F24, F2
      NOP
bc1f  L80106424
       NOP
li    AT, 0x3F990000 ; 1.195312
ori   AT, AT, 0x999a
mtc1  AT, F0
      NOP
sub.s F0, F2, F0
swc1  F0, 0x30(S1)
L80106424:
li    AT, 0x41F00000 ; 30.000000
mtc1  AT, F0
      NOP
mul.s F0, F20, F0
mfc1  A1, F0
      NOP
jal   0x8000D018
 move  A0, S0
lwc1  F2, 0x10(S1)
lwc1  F0, 0x30(S1)
lw    A1, 0xc(S1)
add.s F0, F2, F0
mfc1  A2, F0
lw    A3, 0x14(S1)
jal   0x8000CFA4
 move  A0, S0
lwc1  F0, 0x30(S1)
c.le.s F0, F24
      NOP
      NOP
bc1t  L80106480
 li    V0, 1
move  V0, R0
L80106480:
c.le.s F20, F26
      NOP
      NOP
bc1t  L80106498
 li    V1, 1
move  V1, R0
L80106498:
and   V0, V0, V1
beqz  V0, L801064BC
       NOP
mtc1  R0, F0
      NOP
c.eq.s F22, F0
      NOP
bc1t  L801064CC
       NOP
L801064BC:
jal   SleepVProcess
       NOP
j     func_80106364
       NOP
L801064CC:
lw    V0, 0x3c(S1)
lw    V0, 0x40(V0)
lh    V0, 0(V0)
sll   A0, V0, 1
addu  A0, A0, V0
sll   A0, A0, 6
lui   V0, hi(CORE_800D03F8)
lw    V0, lo(CORE_800D03F8)(V0)
addu  A0, A0, V0
addiu A0, A0, 0x74
jal   0x8008A2A0
 move  A1, R0
jal   0x8000D044
 move  A0, S3
lui   AT, hi(D_8011FAB8)
sw    R0, lo(D_8011FAB8)(AT)
jal   EndProcess
 move  A0, R0
lw    RA, 0x20(SP)
lw    S3, 0x1c(SP)
lw    S2, 0x18(SP)
lw    S1, 0x14(SP)
lw    S0, 0x10(SP)
ldc1  F28, 0x48(SP)
ldc1  F26, 0x40(SP)
ldc1  F24, 0x38(SP)
ldc1  F22, 0x30(SP)
ldc1  F20, 0x28(SP)
jr    RA
 addiu SP, SP, 0x50

func_80106544:
addiu SP, SP, -0x20
sw    RA, 0x14(SP)
sw    S0, 0x10(SP)
sdc1  F20, 0x18(SP)
lw    S0, 0(A0)
li    AT, 0x40800000 ; 4.000000
mtc1  AT, F0
      NOP
swc1  F0, 0x34(S0)
li    AT, 0xBF190000 ; -0.597656
ori   AT, AT, 0x999a
mtc1  AT, F0
      NOP
swc1  F0, 0x38(S0)
jal   SleepProcess
 li    A0, 3
mtc1  R0, F2
lwc1  F0, 0x38(S0)
c.eq.s F0, F2
      NOP
bc1t  L801065BC
       NOP
mtc1  R0, F20
L801065A0:
jal   SleepVProcess
       NOP
lwc1  F0, 0x38(S0)
c.eq.s F0, F20
      NOP
bc1f  L801065A0
       NOP
L801065BC:
lw    RA, 0x14(SP)
lw    S0, 0x10(SP)
ldc1  F20, 0x18(SP)
jr    RA
 addiu SP, SP, 0x20

show_next_star_spot:
addiu SP, SP, -0x30
sw    RA, 0x28(SP)
sw    S3, 0x24(SP)
sw    S2, 0x20(SP)
sw    S1, 0x1c(SP)
sw    S0, 0x18(SP)
lui   S2, hi(CORE_800CD058)
addiu S2, S2, lo(CORE_800CD058)
lui   AT, hi(CORE_800A12D4)
sw    R0, lo(CORE_800A12D4)(AT)
move  A0, R0
jal   0x800E5DD4
 move  A1, R0
move  S1, V0
jal   0x8004A520
 li    A0, 18 ; Here's the Star audio track
lw    A0, 0(S1)
li    A1, 2
lui   A3, hi(tumble_face_tex_grin)
lw    A3, lo(tumble_face_tex_grin)(A3)
jal   0x800EEFEC
 li    A2, 15
jal   0x800FFF44
       NOP
lb    V0, 5(S2)
lui   AT, hi(CORE_800CD05E)
addu  AT, AT, V0
lb    V0, lo(CORE_800CD05E)(AT)
sll   V0, V0, 2
lui   A0, hi(D_8011FA78)
addu  A0, A0, V0
jal   0x800D9B24
 lw    A0, lo(D_8011FA78)(A0)
li    A0, 2
jal   InitFadeIn
 li    A1, 16
L80106660:
jal   GetFadeStatus
       NOP
beqz  V0, L80106680
       NOP
jal   SleepVProcess
       NOP
j     L80106660
       NOP
L80106680:
jal   0x800E6FCC
       NOP
li    AT, 0x40400000 ; 3.000000
mtc1  AT, F12
jal   0x800E9730
       NOP
jal   func_80106544
 move  A0, S1
lb    V0, 5(S2)
bnez  V0, L801066D8
       NOP
jal   0x80035F98
 li    A0, 4
bnez  V0, L801066D8
       NOP
li    V0, ${mirageStarEnabled ? 1 : 0}
subu  V0, R0, V0
andi  V0, V0, 0x5e09
j     L801066F0
 ori   A1, V0, 0x5e00
L801066D8:
li    V0, ${mirageStarEnabled ? 1 : 0}
subu  V0, R0, V0
andi  V0, V0, 0x5e09 ; I'll show you where the first star your after is. Theres another star here! One is a mirage.
ori   A1, V0, 0x5e01 ; OK! The next star youre after is over this way!
L801066F0:
lh    A0, 8(S1)
li    A2, -1
jal   0x8005B43C
 li    A3, -1
lh    A0, 8(S1)
jal   0x80060C14
 li    A1, 1
jal   PlaySound
 li    A0, 679
lh    A0, 8(S1)
jal   0x800EE2C0
 li    S0, 2        ; TODO: Is this Spiny Desert's index, or just coincidence?
sw    S0, 0x10(SP)
lw    A0, 0(S1)
li    A1, -1
move  A2, R0
jal   0x800D9D84
 li    A3, 6
lh    A0, 8(S1)
jal   0x80060EA8
 li    A1, 1
lw    V0, 0(S1)
lw    V0, 0x3c(V0)
lw    V0, 0x40(V0)
jal   0x8001FDE8
 lh    A0, 0(V0)
li    V0, ${mirageStarEnabled ? 1 : 0}
beqz  V0, L80106778
       NOP
jal   GetRandomByte
       NOP
andi  V0, V0, 1
beqz  V0, L8010679C
       NOP
L80106778:
lb    V0, 5(S2)
addu  V0, S2, V0
lb    V0, 6(V0)
sll   V0, V0, 1
lui   A0, hi(D_8011D2C0)
addu  A0, A0, V0
jal   GetSpaceData
 lh    A0, lo(D_8011D2C0)(A0)
move  S3, V0
L8010679C:
jal   0x800E9748
 addiu A0, S3, 8
li    AT, 0x40A00000 ; 5.000000
mtc1  AT, F12
jal   0x800E9AC8
       NOP
jal   SleepProcess
 li    A0, 5
L801067BC:
jal   0x800E9AE0
       NOP
beqz  V0, L801067DC
       NOP
jal   SleepVProcess
       NOP
j     L801067BC
       NOP
L801067DC:
jal   SleepProcess
 li    A0, 5
li    AT, 0x40E00000 ; 7.000000
mtc1  AT, F12
jal   0x800EEF80
       NOP
move  S0, V0
sll   V0, S0, 2
lw    A0, 0(S1)
lui   A1, hi(D_8011D2D0)
addu  A1, A1, V0
jal   0x800EF070
 lw    A1, lo(D_8011D2D0)(A1)
lw    A0, 0(S1)
li    A1, -1
jal   0x800D9CE8
 li    A2, 2
li    V0, ${mirageStarEnabled ? 1 : 0}
bnez   V0, L80106860
 move  A2, R0
lui   A0, hi(func_80106154)
addiu A0, A0, lo(func_80106154)
li    A1, 18432
jal   InitProcess
 move  A3, R0
lui   AT, hi(D_8011FAB8)
sw    V0, lo(D_8011FAB8)(AT)
sw    S3, 0x8c(V0)
jal   SleepProcess
 li    A0, 30
j     L8010686C
 sll   V0, S0, 2
L80106860:
lui   AT, hi(D_8011FAB8)
sw    R0, lo(D_8011FAB8)(AT)
sll   V0, S0, 2
L8010686C:
lh    A0, 8(S1)
lui   A1, hi(D_8011D2EC)
addu  A1, A1, V0
lw    A1, lo(D_8011D2EC)(A1)
li    A2, -1
jal   0x8005B43C
 li    A3, -1
lh    A0, 8(S1)
jal   0x80060C14
 li    A1, 1
lh    A0, 8(S1)
jal   0x800EE2C0
       NOP
li    V0, 2
sw    V0, 0x10(SP)
lw    A0, 0(S1)
li    A1, -1
move  A2, R0
jal   0x800D9D84
 li    A3, 6
lh    A0, 8(S1)
jal   0x80060EA8
 li    A1, 1
jal   0x8004A994
 li    A0, 90
jal   SleepProcess
 li    A0, 30
li    A0, 2
jal   InitFadeOut
 li    A1, 16
jal   SleepProcess
 li    A0, 17
li    V0, 1
lui   AT, hi(CORE_800A12D4)
jal   0x80100130
 sw    V0, lo(CORE_800A12D4)(AT)
lui   V0, hi(D_8011FABC)
lw    V0, lo(D_8011FABC)(V0)
lw    V0, 0x3c(V0)
lw    V0, 0x40(V0)
jal   0x80046558
 lh    A0, 0(V0)
lui   A0, hi(D_8011FABC)
jal   0x800D9B54
 lw    A0, lo(D_8011FABC)(A0)
lui   V0, hi(CORE_800CD05D)
lb    V0, lo(CORE_800CD05D)(V0)
lui   AT, hi(CORE_800CD05E)
addu  AT, AT, V0
lb    V0, lo(CORE_800CD05E)(AT)
sll   V0, V0, 2
lui   A0, hi(D_8011FA78)
addu  A0, A0, V0
jal   0x800D9AA4
 lw    A0, lo(D_8011FA78)(A0)
jal   0x800E60D8
 move  A0, S1
jal   0x800F8C74
       NOP
jal   0x8004819C
 li    A0, 1
jal   0x8004849C
       NOP
jal   SleepVProcess
       NOP
lw    RA, 0x28(SP)
lw    S3, 0x24(SP)
lw    S2, 0x20(SP)
lw    S1, 0x1c(SP)
lw    S0, 0x18(SP)
jr    RA
 addiu SP, SP, 0x30

; This custom alternative is the minimum necessary to skip the star showing.
show_next_star_no_op:
addiu SP, SP, -0x18
sw    RA, 0x10(SP)

; Causes fade back in (star shaped fade in)
li    A0, 2
jal   InitFadeIn
 li    A1, 16

; One or more of these may be unnecessary...
jal   0x800F8C74
 nop
jal   0x8004819C
 li    A0, 1
jal   0x8004849C
 nop

jal SleepVProcess
nop

lw    RA, 0x10(SP)
jr    RA
addiu SP, SP, 0x18

; separate process that does "star get" celebration.
func_8010698C:
addiu SP, SP, -0x60
sw    RA, 0x34(SP)
sw    S4, 0x30(SP)
sw    S3, 0x2c(SP)
sw    S2, 0x28(SP)
sw    S1, 0x24(SP)
sw    S0, 0x20(SP)
sdc1  F28, 0x58(SP)
sdc1  F26, 0x50(SP)
sdc1  F24, 0x48(SP)
sdc1  F22, 0x40(SP)
jal   0x8004EE68
 sdc1  F20, 0x38(SP)
lw    S2, 0x8c(V0)
jal   GetPlayerStruct
 li    A0, -1
move  S4, V0
jal   PlaySound
 li    A0, 283
li    A0, 26
jal   0x800D90C8
 move  A1, R0
move  S1, V0
lhu   V0, 0xa(S1)
ori   V0, V0, 4
sh    V0, 0xa(S1)
jal   0x800ECC54
 move  A0, S1
jal   GetPlayerStruct
 li    A0, -1
lbu   S0, 0xf(V0)
sll   S0, S0, 0x18
sra   S0, S0, 0x18
andi  S0, S0, 0xffff
jal   GetPlayerStruct
 li    A0, -1
lbu   A1, 0x10(V0)
sll   A1, A1, 0x18
sra   A1, A1, 0x18
move  A0, S0
jal   GetAbsSpaceIndexFromChainSpaceIndex
 andi  A1, A1, 0xffff
sll   V0, V0, 0x10
sra   V0, V0, 0x10
li    V1, 146
bne   V0, V1, L80106A9C
       NOP
lwc1  F2, 0x10(S2)
li    AT, 0x41200000 ; 10.000000
mtc1  AT, F0
lw    A1, 0xc(S2)
add.s F0, F2, F0
mfc1  A2, F0
lw    A3, 0x14(S2)
jal   0x80089A10
 addiu A0, S1, 0xc
lui   V0, hi(CORE_800A0550)
lw    V0, lo(CORE_800A0550)(V0)
lw    A1, 0x10(V0)
lw    A2, 0x14(V0)
lw    A3, 0x18(V0)
jal   0x80089A10
 addiu A0, SP, 0x10
li    AT, 0x41700000 ; 15.000000
mtc1  AT, F0
      NOP
j     L80106B00
 swc1  F0, 0x30(S1)
L80106A9C:
lwc1  F6, 0x10(S2)
li    AT, 0x41200000 ; 10.000000
mtc1  AT, F2
lwc1  F4, 0x14(S2)
li    AT, 0x41F00000 ; 30.000000
mtc1  AT, F0
lw    A1, 0xc(S2)
add.s F2, F6, F2
mfc1  A2, F2
add.s F0, F4, F0
mfc1  A3, F0
      NOP
jal   0x80089A10
 addiu A0, S1, 0xc
lui   V0, hi(CORE_800A0550)
lw    V0, lo(CORE_800A0550)(V0)
lw    A1, 0x10(V0)
lw    A2, 0x14(V0)
lw    A3, 0x18(V0)
jal   0x80089A10
 addiu A0, SP, 0x10
li    AT, 0x420C0000 ; 35.000000
mtc1  AT, F0
      NOP
swc1  F0, 0x30(S1)
L80106B00:
lui A0, 0xb
ori A0, A0, 4
jal   0x8000CED8
 li    A1, 2729
sll   V0, V0, 0x10
sra   S3, V0, 0x10
move  S0, S3
move  A0, S0
lui   A1, 0x3f80
lui   A2, 0x41a0
jal   0x8000CD00
 move  A3, A1
lui   A1, 0x4170
jal   0x8000D018
 move  A0, S0
move  A0, S0
jal   0x8001C8A8
 li    A1, 1
lwc1  F2, 0x10(S1)
lwc1  F0, 0x30(S1)
lw    A1, 0xc(S1)
add.s F0, F2, F0
mfc1  A2, F0
lw    A3, 0x14(S1)
jal   0x8000CFA4
 move  A0, S0
mtc1  R0, F20
move  S0, R0
li    AT, 0x3F000000 ; 0.500000
mtc1  AT, F24
sll   S2, S3, 0x10
li    AT, 0x41700000 ; 15.000000
mtc1  AT, F22
L80106B84:
mfc1  A1, F20
mfc1  A2, F20
mfc1  A3, F20
      NOP
jal   0x80089A10
 addiu A0, S1, 0x24
add.s F20, F20, F24
mul.s F8, F20, F22
mfc1  A1, F8
      NOP
jal   0x8000D018
 sra   A0, S2, 0x10
jal   SleepVProcess
 addiu S0, S0, 1
slti  V0, S0, 6
bnez  V0, L80106B84
       NOP
move  S0, R0
li    AT, 0x3ECC0000 ; 0.398438
ori   AT, AT, 0xcccd
mtc1  AT, F24
sll   S2, S3, 0x10
li    AT, 0x41700000 ; 15.000000
mtc1  AT, F22
L80106BE4:
mfc1  A1, F20
mfc1  A2, F20
mfc1  A3, F20
      NOP
jal   0x80089A10
 addiu A0, S1, 0x24
sub.s F20, F20, F24
mul.s F8, F20, F22
mfc1  A1, F8
      NOP
jal   0x8000D018
 sra   A0, S2, 0x10
jal   SleepVProcess
 addiu S0, S0, 1
slti  V0, S0, 3
bnez  V0, L80106BE4
       NOP
li    AT, 0x41700000 ; 15.000000
mtc1  AT, F0
      NOP
mul.s F0, F20, F0
mfc1  A1, F0
      NOP
jal   0x8000D018
 move  A0, S3
jal   SleepProcess
 li    A0, 20
jal   PlaySound
 li    A0, 306
mtc1  R0, F22
lw    V0, 0x24(S4)
lwc1  F2, 0x10(V0)
li    AT, 0x41200000 ; 10.000000
mtc1  AT, F0
lw    A1, 0xc(V0)
sub.s F0, F2, F0
mfc1  A2, F0
lw    A3, 0x14(V0)
jal   0x80089A10
 addiu A0, SP, 0x10
addiu A2, S1, 0xc
move  A0, A2
addiu A1, SP, 0x10
jal   0x800ED35C
 li    A3, 40
move  S0, R0
li    AT, 0x41A00000 ; 20.000000
mtc1  AT, F28
li    AT, 0x3D4C0000 ; 0.049805
ori   AT, AT, 0xcccd
mtc1  AT, F26
mtc1  R0, F24
move  S2, S3
L80106CB8:
lw    V0, 0x3c(S1)
lw    V0, 0x40(V0)
lh    V0, 0(V0)
sll   A0, V0, 1
addu  A0, A0, V0
sll   A0, A0, 6
lui   V0, hi(CORE_800D03F8)
lw    V0, lo(CORE_800D03F8)(V0)
addu  A0, A0, V0
mfc1  A1, F22
      NOP
jal   0x8008A2A0
 addiu A0, A0, 0x74
sub.s F20, F20, F26
c.lt.s F20, F24
      NOP
      NOP
bc1f  L80106D08
 add.s F22, F22, F28
mov.s F20, F24
L80106D08:
mfc1  A1, F20
mfc1  A2, F20
mfc1  A3, F20
      NOP
jal   0x80089A10
 addiu A0, S1, 0x24
li    AT, 0x41700000 ; 15.000000
mtc1  AT, F0
      NOP
mul.s F0, F20, F0
mfc1  A1, F0
      NOP
jal   0x8000D018
 move  A0, S2
lwc1  F2, 0x10(S1)
lwc1  F0, 0x30(S1)
lw    A1, 0xc(S1)
add.s F0, F2, F0
mfc1  A2, F0
lw    A3, 0x14(S1)
jal   0x8000CFA4
 move  A0, S2
jal   SleepVProcess
 addiu S0, S0, 1
slti  V0, S0, 0x28
bnez  V0, L80106CB8
       NOP
jal   0x800D9B54
 move  A0, S1
jal   0x8000D044
 move  A0, S3
lw    A0, 0x24(S4)
jal   0x800ECC0C
 addiu A0, A0, 0x18
li    A0, -1
jal   0x800FF900
 li    A1, 5
lui   V0, hi(D_8011D308)
lw    V0, lo(D_8011D308)(V0)
beqz  V0, L80106DBC
       NOP
jal   0x8004A670
 li    A0, 14
j     L80106DC4
       NOP
L80106DBC:
jal   0x8004A520
 li    A0, 111 ; Fanfare audio track
L80106DC4:
lui   A0, hi(current_player_index)
addiu A0, A0, lo(current_player_index)
lb    V0, 0(A0)
sll   V1, V0, 3
subu  V1, V1, V0
sll   V1, V1, 3
lui   V0, hi(p1_stars)
addu  V0, V0, V1
lbu   V0, lo(p1_stars)(V0)
addiu V0, V0, 1 ; add 1 star
lui   AT, hi(p1_stars)
addu  AT, AT, V1
sb    V0, lo(p1_stars)(AT)
lb    V1, 0(A0)
sll   V0, V1, 3
subu  V0, V0, V1
sll   V1, V0, 3
lui   V0, hi(p1_stars)
addu  V0, V0, V1
lb    V0, lo(p1_stars)(V0)
slti  V0, V0, 0x64
bnez  V0, L80106E30
 li    A0, -1
li    V0, 99
lui   AT, hi(p1_stars)
addu  AT, AT, V1
sb    V0, lo(p1_stars)(AT)
L80106E30:
li    A1, 6
jal   0x800F2304
 move  A2, R0
lui   A1, hi(current_player_index)
lb    A1, lo(current_player_index)(A1)
jal   0x8004ACE0
 li    A0, 610
lui   V0, hi(D_8011D308)
lw    V0, lo(D_8011D308)(V0)
beqz  V0, L80106EA8
       NOP
jal   SleepProcess
 li    A0, 16
lui   A0, hi(CORE_800CDBC8)
jal   0x80003A70
 lh    A0, lo(CORE_800CDBC8)(A0)
jal   0x8004A918
 li    A0, 111
jal   0x8004A880
 move  A0, R0
jal   SleepProcess
 li    A0, 110
lui   A0, hi(CORE_800CDBC8)
lh    A0, lo(CORE_800CDBC8)(A0)
jal   0x80003B70
 move  A1, R0
jal   0x8004A72C
 li    A0, 15
j     L80106EB0
       NOP
L80106EA8:
jal   SleepProcess
 li    A0, 60
L80106EB0:
jal   EndProcess
 move  A0, R0
lw    RA, 0x34(SP)
lw    S4, 0x30(SP)
lw    S3, 0x2c(SP)
lw    S2, 0x28(SP)
lw    S1, 0x24(SP)
lw    S0, 0x20(SP)
ldc1  F28, 0x58(SP)
ldc1  F26, 0x50(SP)
ldc1  F24, 0x48(SP)
ldc1  F22, 0x40(SP)
ldc1  F20, 0x38(SP)
jr    RA
 addiu SP, SP, 0x60

func_80106EEC:
addiu SP, SP, -0x20
sw    RA, 0x18(SP)
sw    S1, 0x14(SP)
sw    S0, 0x10(SP)
move  S1, A0
lui   AT, hi(CORE_800D037C)
sh    R0, lo(CORE_800D037C)(AT)
lui   A0, hi(func_8010698C)
addiu A0, A0, lo(func_8010698C)
li    A1, 18432
move  A2, R0
jal   InitProcess
 move  A3, R0
move  S0, V0
jal   0x8004EE68
 sw    S1, 0x8c(S0)
move  A0, V0
jal   0x8004ED30
 move  A1, S0
jal   0x8004EE18
       NOP
li    V0, 1
lui   AT, hi(CORE_800D037C)
sh    V0, lo(CORE_800D037C)(AT)
lw    RA, 0x18(SP)
lw    S1, 0x14(SP)
lw    S0, 0x10(SP)
jr    RA
 addiu SP, SP, 0x20

; View map handling?
__PP64_INTERNAL_VIEW_MAP:
addiu SP, SP, -0x18
sw    RA, 0x14(SP)
sw    S0, 0x10(SP)
li    S0, 1
lui   AT, hi(CORE_800CDD58)
sh    S0, lo(CORE_800CDD58)(AT) ; set 1 to indicate map is being viewed?
lui   AT, hi(CORE_800D037C)
jal   0x8004EE68
 sh    R0, lo(CORE_800D037C)(AT)
move  A0, V0
jal   0x80047B80
 li    A1, 128
lui   V1, hi(current_player_index)
lb    V1, lo(current_player_index)(V1)
sll   V0, V1, 3
subu  V0, V0, V1
sll   V0, V0, 3
lui   A0, hi(p1_controller)
addu  A0, A0, V0
jal   0x8010067C
 lbu   A0, lo(p1_controller)(A0)
jal   0x8004EE68
       NOP
move  A0, V0
jal   0x80047BAC
 li    A1, 128
lui   AT, hi(CORE_800CDD58)
sh    R0, lo(CORE_800CDD58)(AT)
lui   AT, hi(CORE_800D037C)
sh    S0, lo(CORE_800D037C)(AT)
lw    RA, 0x14(SP)
lw    S0, 0x10(SP)
jr    RA
 addiu SP, SP, 0x18

; Could this be executed when returning to the board, from "view map" or other modes?
func_80106FE8:
addiu SP, SP, -0x18
sw    RA, 0x10(SP)
lui   AT, hi(CORE_800D037C)
jal   0x8004EE68
 sh    R0, lo(CORE_800D037C)(AT)
move  A0, V0
jal   0x80047B80
 li    A1, 128
lui   V0, hi(current_player_index)
lb    V0, lo(current_player_index)(V0)
sll   V1, V0, 3
subu  V1, V1, V0
sll   V1, V1, 3
lui   A0, hi(p1_controller)
addu  A0, A0, V1
jal   0x8010067C
 lbu   A0, lo(p1_controller)(A0)
li    V0, 1
lui   AT, hi(CORE_800D037C)
sh    V0, lo(CORE_800D037C)(AT)
lw    RA, 0x10(SP)
jr    RA
 addiu SP, SP, 0x18

; Helper for choosing an item from the item shop message box
func_80107174:
addiu SP, SP, -0x48
sw    RA, 0x40(SP)
sw    S5, 0x3c(SP)
sw    S4, 0x38(SP)
sw    S3, 0x34(SP)
sw    S2, 0x30(SP)
sw    S1, 0x2c(SP)
sw    S0, 0x28(SP)
move  S5, A0
move  S2, R0
lui   A1, hi(D_8011F8D0)
addiu A1, A1, lo(D_8011F8D0)
lwl   V0, 0(A1)
lwr   V0, 3(A1)
swl   V0, 0x20(SP)
swr   V0, 0x23(SP)
move  S1, R0
lui   S4, hi(current_player_index)
addiu S4, S4, lo(current_player_index)
addiu S3, SP, 0x18
L801071C4:
lb    V0, 0(S4)
bne   S1, V0, L80107278
 sll   V0, S1, 3
subu  V0, V0, S1
sll   V0, V0, 3
lui   AT, hi(CORE_800D110C)
addu  AT, AT, V0
lbu   V0, lo(CORE_800D110C)(AT)
andi  V0, V0, 1
beqz  V0, L8010722C
 sll   S0, S1, 3
jal   func_8011CE94
 addiu S1, S1, 1
move  S2, V0
lb    V1, 0(S4)
sll   V0, V1, 3
subu  V0, V0, V1
sll   V0, V0, 3
lui   AT, hi(p1_controller)
addu  AT, AT, V0
lbu   V0, lo(p1_controller)(AT)
sll   V0, V0, 1
addu  V0, V0, S3
li    V1, 1024
j     L8010729C
 sh    V1, 0(V0)
L8010722C:
subu  S0, S0, S1
sll   S0, S0, 3
lui   V0, hi(p1_controller)
addu  V0, V0, S0
lbu   V0, lo(p1_controller)(V0)
addu  V0, SP, V0
lui   A0, hi(CORE_80105702_window_id)
lh    A0, lo(CORE_80105702_window_id)(A0)
lbu   A1, 0x20(V0)
jal   0x8005FE54
 addiu S1, S1, 1
lui   V0, hi(p1_controller)
addu  V0, V0, S0
lbu   V0, lo(p1_controller)(V0)
sll   V0, V0, 1
addu  V0, V0, S3
li    V1, -1
j     L8010729C
 sh    V1, 0(V0)
L80107278:
subu  V0, V0, S1
sll   V0, V0, 3
lui   AT, hi(p1_controller)
addu  AT, AT, V0
lbu   V0, lo(p1_controller)(AT)
sll   V0, V0, 1
addu  V0, V0, S3
sh    R0, 0(V0)
addiu S1, S1, 1
L8010729C:
slti  V0, S1, 4
bnez  V0, L801071C4
       NOP
beqz  S2, L80107354
 li    A1, 2
lui   A0, hi(CORE_80105702_window_id)
lh    A0, lo(CORE_80105702_window_id)(A0)
jal   0x8005B63C
 li    A2, 2
move  S0, R0
addiu S1, SP, 0x18
L801072C8:
addiu S2, S2, -1
bnez  S2, L80107304
       NOP
lui   V1, hi(current_player_index)
lb    V1, lo(current_player_index)(V1)
sll   V0, V1, 3
subu  V0, V0, V1
sll   V0, V0, 3
lui   AT, hi(p1_controller)
addu  AT, AT, V0
lbu   V0, lo(p1_controller)(AT)
sll   V0, V0, 1
addu  V0, V0, S1
li    V1, -32768
sh    V1, 0(V0)
L80107304:
bnez  S0, L8010732C
 li    V0, 5
jal   0x800EDC40
       NOP
lh    A0, 0x18(SP)
lh    A1, 0x1a(SP)
lh    A2, 0x1c(SP)
lh    A3, 0x1e(SP)
j     L8010733C
 andi  V0, V0, 0xff
L8010732C:
lh    A0, 0x18(SP)
lh    A1, 0x1a(SP)
lh    A2, 0x1c(SP)
lh    A3, 0x1e(SP)
L8010733C:
jal   0x8005F698
 sw    V0, 0x10(SP)
bnez  S2, L801072C8
 addiu S0, S0, 1
j     L8010736C
 move  S1, R0
L80107354:
lh    A0, 0x18(SP)
lh    A1, 0x1a(SP)
lh    A2, 0x1c(SP)
lh    A3, 0x1e(SP)
jal   0x8005F744
 move  S1, R0
L8010736C:
addu  V0, S5, S1
L80107370:
lbu   V0, 0(V0)
bnezl V0, L80107394
 addiu S1, S1, 1
sll   A1, S1, 0x10
lui   A0, hi(CORE_80105702_window_id)
lh    A0, lo(CORE_80105702_window_id)(A0)
jal   0x8006010C
 sra   A1, A1, 0x10
addiu S1, S1, 1
L80107394:
slti  V0, S1, 9
bnez  V0, L80107370
 addu  V0, S5, S1
move  S1, R0
li    S0, -1
sll   A1, S1, 0x10
L801073AC:
lui   A0, hi(CORE_80105702_window_id)
lh    A0, lo(CORE_80105702_window_id)(A0)
sra   A1, A1, 0x10
jal   0x8005E1D8
 move  A2, R0
move  S1, V0
beq   S1, S0, L801073E0
 addu  V0, S5, S1
lbu   V0, 0(V0)
beqz  V0, L801073AC
 sll   A1, S1, 0x10
j     L801073E4
 move  V0, S1
L801073E0:
li    V0, -1
L801073E4:
lw    RA, 0x40(SP)
lw    S5, 0x3c(SP)
lw    S4, 0x38(SP)
lw    S3, 0x34(SP)
lw    S2, 0x30(SP)
lw    S1, 0x2c(SP)
lw    S0, 0x28(SP)
jr    RA
 addiu SP, SP, 0x48

; Helper for choosing an item from the item shop message box
func_80107408:
addiu SP, SP, -0x48
sw    RA, 0x40(SP)
sw    S5, 0x3c(SP)
sw    S4, 0x38(SP)
sw    S3, 0x34(SP)
sw    S2, 0x30(SP)
sw    S1, 0x2c(SP)
sw    S0, 0x28(SP)
move  S2, R0
lui   A1, hi(D_8011F8D0)
addiu A1, A1, lo(D_8011F8D0)
lwl   V0, 0(A1)
lwr   V0, 3(A1)
swl   V0, 0x20(SP)
swr   V0, 0x23(SP)
move  S1, R0
addiu S3, SP, 0x18
li    S5, 1024
addiu S4, SP, 0x20
L80107454:
lui   V0, hi(current_player_index)
lb    V0, lo(current_player_index)(V0)
bne   S1, V0, L801074F8
 sll   V0, S1, 3
subu  V0, V0, S1
sll   S0, V0, 3
lui   V0, hi(CORE_800D110C)
addu  V0, V0, S0
lbu   V0, lo(CORE_800D110C)(V0)
andi  V0, V0, 1
beql  V0, R0, L801074AC
 sll   S0, S1, 3
jal   func_8011D1F8
 addiu S1, S1, 1
move  S2, V0
lui   V0, hi(p1_controller)
addu  V0, V0, S0
lbu   V0, lo(p1_controller)(V0)
sll   V0, V0, 1
addu  V0, V0, S3
j     L8010751C
 sh    S5, 0(V0)
L801074AC:
subu  S0, S0, S1
sll   S0, S0, 3
lui   V0, hi(p1_controller)
addu  V0, V0, S0
lbu   V0, lo(p1_controller)(V0)
addu  V0, S4, V0
lui   A0, hi(CORE_80105702_window_id)
lh    A0, lo(CORE_80105702_window_id)(A0)
lbu   A1, 0(V0)
jal   0x8005FE54
 addiu S1, S1, 1
lui   V0, hi(p1_controller)
addu  V0, V0, S0
lbu   V0, lo(p1_controller)(V0)
sll   V0, V0, 1
addu  V0, V0, S3
li    V1, -1
j     L8010751C
 sh    V1, 0(V0)
L801074F8:
subu  V0, V0, S1
sll   V0, V0, 3
lui   AT, hi(p1_controller)
addu  AT, AT, V0
lbu   V0, lo(p1_controller)(AT)
sll   V0, V0, 1
addu  V0, V0, S3
sh    R0, 0(V0)
addiu S1, S1, 1
L8010751C:
slti  V0, S1, 4
bnez  V0, L80107454
       NOP
beqz  S2, L801075D4
 li    A1, 2
lui   A0, hi(CORE_80105702_window_id)
lh    A0, lo(CORE_80105702_window_id)(A0)
jal   0x8005B63C
 li    A2, 2
move  S0, R0
addiu S1, SP, 0x18
L80107548:
addiu S2, S2, -1
bnez  S2, L80107584
       NOP
lui   V1, hi(current_player_index)
lb    V1, lo(current_player_index)(V1)
sll   V0, V1, 3
subu  V0, V0, V1
sll   V0, V0, 3
lui   AT, hi(p1_controller)
addu  AT, AT, V0
lbu   V0, lo(p1_controller)(AT)
sll   V0, V0, 1
addu  V0, V0, S1
li    V1, -32768
sh    V1, 0(V0)
L80107584:
bnez  S0, L801075AC
 li    V0, 5
jal   0x800EDC40
       NOP
lh    A0, 0x18(SP)
lh    A1, 0x1a(SP)
lh    A2, 0x1c(SP)
lh    A3, 0x1e(SP)
j     L801075BC
 andi  V0, V0, 0xff
L801075AC:
lh    A0, 0x18(SP)
lh    A1, 0x1a(SP)
lh    A2, 0x1c(SP)
lh    A3, 0x1e(SP)
L801075BC:
jal   0x8005F698
 sw    V0, 0x10(SP)
bnez  S2, L80107548
 addiu S0, S0, 1
j     L801075E8
       NOP
L801075D4:
lh    A0, 0x18(SP)
lh    A1, 0x1a(SP)
lh    A2, 0x1c(SP)
jal   0x8005F744
 lh    A3, 0x1e(SP)
L801075E8:
lui   A0, hi(CORE_80105702_window_id)
lh    A0, lo(CORE_80105702_window_id)(A0)
move  A1, R0
jal   0x8005E1D8
 li    A2, 1
lw    RA, 0x40(SP)
lw    S5, 0x3c(SP)
lw    S4, 0x38(SP)
lw    S3, 0x34(SP)
lw    S2, 0x30(SP)
lw    S1, 0x2c(SP)
lw    S0, 0x28(SP)
jr    RA
 addiu SP, SP, 0x48

func_80107620:
addiu SP, SP, -0x20
sw    RA, 0x18(SP)
sw    S1, 0x14(SP)
sw    S0, 0x10(SP)
lui   S1, hi(current_player_index)
lb    S1, lo(current_player_index)(S1)
move  V1, R0
L8010763C:
beq   V1, S1, L80107660
 sll   V0, V1, 3
subu  V0, V0, V1
sll   V0, V0, 3
lui   AT, hi(p1_stars)
addu  AT, AT, V0
lb    V0, lo(p1_stars)(AT)
bnez  V0, L80107670
 li    V0, 4
L80107660:
addiu V1, V1, 1
slti  V0, V1, 4
bnez  V0, L8010763C
 li    V0, 4
L80107670:
beq   V1, V0, L801076E4
 sll   V0, S1, 3
subu  V0, V0, S1
sll   S0, V0, 3
lui   V0, hi(p1_coins)
addu  V0, V0, S0
lh    V0, lo(p1_coins)(V0)
slti  V0, V0, 0x32
bnez  V0, L801076E8
 move  V1, R0
li    AT, 0x42C80000 ; 100.000000
mtc1  AT, F12
jal   0x800EEF80
       NOP
lui   V1, hi(p1_coins)
addu  V1, V1, S0
lh    V1, lo(p1_coins)(V1)
addiu V1, V1, 0xa
slt   V0, V0, V1
beqz  V0, L801076E4
 li    V0, 1
lui   AT, hi(D_8011FAD4)
sw    V0, lo(D_8011FAD4)(AT)
lui   V0, hi(p1_stars)
addu  V0, V0, S0
lb    V0, lo(p1_stars)(V0)
slti  V0, V0, MAX_PLAYER_STAR_COUNT
bnez  V0, L8010773C
       NOP
L801076E4:
move  V1, R0
L801076E8:
beq   V1, S1, L80107710
 sll   V0, V1, 3
subu  V0, V0, V1
sll   V0, V0, 3
lui   AT, hi(p1_coins)
addu  AT, AT, V0
lh    V0, lo(p1_coins)(AT)
slti  V0, V0, 5
beqz  V0, L80107720
 li    V0, 4
L80107710:
addiu V1, V1, 1
slti  V0, V1, 4
bnez  V0, L801076E8
 li    V0, 4
L80107720:
beq   V1, V0, L80107734
 li    V0, 2
lui   AT, hi(D_8011FAD4)
j     L8010773C
 sw    R0, lo(D_8011FAD4)(AT)
L80107734:
lui   AT, hi(D_8011FAD4)
sw    V0, lo(D_8011FAD4)(AT)
L8010773C:
lw    RA, 0x18(SP)
lw    S1, 0x14(SP)
lw    S0, 0x10(SP)
jr    RA
 addiu SP, SP, 0x20

func_80107750:
addiu SP, SP, -0x38
sw    RA, 0x30(SP)
sw    S3, 0x2c(SP)
sw    S2, 0x28(SP)
sw    S1, 0x24(SP)
sw    S0, 0x20(SP)
lui   S3, hi(current_player_index)
lb    S3, lo(current_player_index)(S3)
move  S0, R0
addiu V1, SP, 0x10
li    A0, -1
sll   V0, S0, 2
L80107780:
addu  V0, V0, V1
sw    A0, 0(V0)
addiu S0, S0, 1
slti  V0, S0, 4
bnez  V0, L80107780
 sll   V0, S0, 2
move  S0, R0
addiu S1, SP, 0x10
li    S2, -1
L801077A4:
jal   0x800EEA58
 move  A0, S0
move  V1, V0
L801077B0:
sll   V0, V1, 2
addu  V0, V0, S1
lw    V0, 0(V0)
beq   V0, S2, L801077CC
 sll   V0, V1, 2
j     L801077B0
 addiu V1, V1, 1
L801077CC:
addu  V0, V0, S1
sw    S0, 0(V0)
addiu S0, S0, 1
slti  V0, S0, 4
bnez  V0, L801077A4
       NOP
jal   func_80107620
       NOP
lui   V1, hi(D_8011FAD4)
lw    V1, lo(D_8011FAD4)(V1)
li    V0, 1
bne   V1, V0, L8010785C
 addiu A0, SP, 0x10
move  S0, R0
sll   V0, S0, 2
L80107808:
addu  V0, V0, A0
lw    V1, 0(V0)
beq   V1, S3, L80107834
 sll   V0, V1, 3
subu  V0, V0, V1
sll   V0, V0, 3
lui   AT, hi(p1_stars)
addu  AT, AT, V0
lb    V0, lo(p1_stars)(AT)
bnez  V0, L8010784C
       NOP
L80107834:
addiu S0, S0, 1
slti  V0, S0, 4
bnez  V0, L80107808
 sll   V0, S0, 2
j     L801078BC
 li    V0, 4
L8010784C:
lui   AT, hi(D_8011FAD8)
sw    V1, lo(D_8011FAD8)(AT)
j     L801078BC
 li    V0, 4
L8010785C:
lui   V0, hi(D_8011FAD4)
lw    V0, lo(D_8011FAD4)(V0)
bnez  V0, L801078BC
 li    V0, 4
move  S0, R0
addiu A0, SP, 0x10
sll   V0, S0, 2
L80107878:
addu  V0, V0, A0
lw    V1, 0(V0)
beq   V1, S3, L801078A8
 sll   V0, V1, 3
subu  V0, V0, V1
sll   V0, V0, 3
lui   AT, hi(p1_coins)
addu  AT, AT, V0
lh    V0, lo(p1_coins)(AT)
slti  V0, V0, 5
beqz  V0, L8010784C
       NOP
L801078A8:
addiu S0, S0, 1
slti  V0, S0, 4
bnez  V0, L80107878
 sll   V0, S0, 2
li    V0, 4
L801078BC:
bne   S0, V0, L801078CC
 li    V0, 2
lui   AT, hi(D_8011FAD4)
sw    V0, lo(D_8011FAD4)(AT)
L801078CC:
lw    RA, 0x30(SP)
lw    S3, 0x2c(SP)
lw    S2, 0x28(SP)
lw    S1, 0x24(SP)
lw    S0, 0x20(SP)
jr    RA
 addiu SP, SP, 0x38

func_801078E8:
addiu SP, SP, -0x48
sw    RA, 0x44(SP)
sw    S6, 0x40(SP)
sw    S5, 0x3c(SP)
sw    S4, 0x38(SP)
sw    S3, 0x34(SP)
sw    S2, 0x30(SP)
sw    S1, 0x2c(SP)
sw    S0, 0x28(SP)
move  S5, A0
move  S6, A1
move  S4, A2
move  S2, R0
lui   A1, hi(D_8011F8D0)
addiu A1, A1, lo(D_8011F8D0)
lwl   V0, 0(A1)
lwr   V0, 3(A1)
swl   V0, 0x20(SP)
swr   V0, 0x23(SP)
move  S1, R0
addiu S3, SP, 0x18
L8010793C:
lui   V0, hi(current_player_index)
lb    V0, lo(current_player_index)(V0)
bne   S1, V0, L80107A18
 sll   V0, S1, 3
subu  V0, V0, S1
sll   V0, V0, 3
lui   AT, hi(CORE_800D110C)
addu  AT, AT, V0
lbu   V0, lo(CORE_800D110C)(AT)
andi  V0, V0, 1
beqz  V0, L801079CC
 sll   S0, S1, 3
bnez  S6, L8010798C
       NOP
jal   func_80107750
       NOP
lui   V0, hi(D_8011FAD4)
lw    V0, lo(D_8011FAD4)(V0)
j     L80107998
 addiu S2, V0, 1
L8010798C:
lui   V0, hi(D_8011FAD8)
lw    V0, lo(D_8011FAD8)(V0)
addiu S2, V0, 1
L80107998:
lui   V1, hi(current_player_index)
lb    V1, lo(current_player_index)(V1)
sll   V0, V1, 3
subu  V0, V0, V1
sll   V0, V0, 3
lui   AT, hi(p1_controller)
addu  AT, AT, V0
lbu   V0, lo(p1_controller)(AT)
sll   V0, V0, 1
addu  V0, V0, S3
li    V1, 1024
j     L80107A38
 sh    V1, 0(V0)
L801079CC:
subu  S0, S0, S1
sll   S0, S0, 3
lui   V0, hi(p1_controller)
addu  V0, V0, S0
lbu   V0, lo(p1_controller)(V0)
addu  V0, SP, V0
lui   A0, hi(CORE_80105702_window_id)
lh    A0, lo(CORE_80105702_window_id)(A0)
lbu   A1, 0x20(V0)
jal   0x8005FE54
 addiu S1, S1, 1
lui   V0, hi(p1_controller)
addu  V0, V0, S0
lbu   V0, lo(p1_controller)(V0)
sll   V0, V0, 1
addu  V0, V0, S3
li    V1, -1
j     L80107A3C
 sh    V1, 0(V0)
L80107A18:
subu  V0, V0, S1
sll   V0, V0, 3
lui   AT, hi(p1_controller)
addu  AT, AT, V0
lbu   V0, lo(p1_controller)(AT)
sll   V0, V0, 1
addu  V0, V0, S3
sh    R0, 0(V0)
L80107A38:
addiu S1, S1, 1
L80107A3C:
slti  V0, S1, 4
bnez  V0, L8010793C
       NOP
beqz  S2, L80107AF4
 li    A1, 2
lui   A0, hi(CORE_80105702_window_id)
lh    A0, lo(CORE_80105702_window_id)(A0)
jal   0x8005B63C
 li    A2, 2
move  S0, R0
addiu S1, SP, 0x18
L80107A68:
addiu S2, S2, -1
bnez  S2, L80107AA4
       NOP
lui   V1, hi(current_player_index)
lb    V1, lo(current_player_index)(V1)
sll   V0, V1, 3
subu  V0, V0, V1
sll   V0, V0, 3
lui   AT, hi(p1_controller)
addu  AT, AT, V0
lbu   V0, lo(p1_controller)(AT)
sll   V0, V0, 1
addu  V0, V0, S1
li    V1, -32768
sh    V1, 0(V0)
L80107AA4:
bnez  S0, L80107ACC
 li    V0, 5
jal   0x800EDC40
       NOP
lh    A0, 0x18(SP)
lh    A1, 0x1a(SP)
lh    A2, 0x1c(SP)
lh    A3, 0x1e(SP)
j     L80107ADC
 andi  V0, V0, 0xff
L80107ACC:
lh    A0, 0x18(SP)
lh    A1, 0x1a(SP)
lh    A2, 0x1c(SP)
lh    A3, 0x1e(SP)
L80107ADC:
jal   0x8005F698
 sw    V0, 0x10(SP)
bnez  S2, L80107A68
 addiu S0, S0, 1
j     L80107B0C
 move  S1, R0
L80107AF4:
lh    A0, 0x18(SP)
lh    A1, 0x1a(SP)
lh    A2, 0x1c(SP)
lh    A3, 0x1e(SP)
jal   0x8005F744
 move  S1, R0
L80107B0C:
addu  V0, S5, S1
L80107B10:
lbu   V0, 0(V0)
bnezl V0, L80107B34
 addiu S1, S1, 1
sll   A1, S1, 0x10
lui   A0, hi(CORE_80105702_window_id)
lh    A0, lo(CORE_80105702_window_id)(A0)
jal   0x8006010C
 sra   A1, A1, 0x10
addiu S1, S1, 1
L80107B34:
slti  V0, S1, 4
bnez  V0, L80107B10
 addu  V0, S5, S1
move  S1, R0
li    S0, -1
sll   A1, S1, 0x10
L80107B4C:
lui   A0, hi(CORE_80105702_window_id)
lh    A0, lo(CORE_80105702_window_id)(A0)
sra   A1, A1, 0x10
jal   0x8005E1D8
 move  A2, S4
bnez  S4, L80107B78
 move  S1, V0
bne   S1, S0, L80107B7C
 addu  V0, S5, S1
j     L80107B8C
 li    V0, -1
L80107B78:
addu  V0, S5, S1
L80107B7C:
lbu   V0, 0(V0)
beqz  V0, L80107B4C
 sll   A1, S1, 0x10
move  V0, S1
L80107B8C:
lw    RA, 0x44(SP)
lw    S6, 0x40(SP)
lw    S5, 0x3c(SP)
lw    S4, 0x38(SP)
lw    S3, 0x34(SP)
lw    S2, 0x30(SP)
lw    S1, 0x2c(SP)
lw    S0, 0x28(SP)
jr    RA
 addiu SP, SP, 0x48

func_80107BB4:
addiu SP, SP, -0x18
sw    RA, 0x10(SP)
move  A1, R0
jal   func_801078E8
 li    A2, 1
lw    RA, 0x10(SP)
jr    RA
 addiu SP, SP, 0x18

func_80107BD4:
addiu SP, SP, -0x18
sw    RA, 0x10(SP)
li    A1, 1
jal   func_801078E8
 move  A2, R0
lw    RA, 0x10(SP)
jr    RA
 addiu SP, SP, 0x18

overlaycall0:
addiu SP, SP, -0x18
sw    RA, 0x10(SP)
; Declare which board index this is.
li    V0, ${boardIndex}
lui   AT, hi(CORE_800CD059)
sb    V0, lo(CORE_800CD059)(AT)
li    A0, 10
jal   InitObjSys
 move  A1, R0
li    A0, 71
move  A1, R0
jal   0x80048228
 li    A2, 402
lw    RA, 0x10(SP)
jr    RA
 addiu SP, SP, 0x18

; does setup that only occurs once per board game
overlaycall1:
addiu SP, SP, -0x18
sw    RA, 0x10(SP)
li    A0, 10
jal   InitObjSys
 move  A1, R0
; set players onto the 0 chain
move  A0, R0
move  A1, R0
jal   SetPlayerOntoChain
 move  A2, R0
li    A0, 1
move  A1, R0
jal   SetPlayerOntoChain
 move  A2, R0
li    A0, 2
move  A1, R0
jal   SetPlayerOntoChain
 move  A2, R0
li    A0, 3
move  A1, R0
jal   SetPlayerOntoChain
 move  A2, R0
jal   0x80035FDC
 li    A0, 3
jal   func_80105EA8
       NOP
jal   0x8003602C
 li    A0, 18
lui   V0, hi(bank_coin_total)
addiu V0, V0, lo(bank_coin_total)
sh    R0, 0(V0) ; clear the bank coins
sh    R0, -6(V0)
sh    R0, -8(V0)
sh    R0, -0x1c(V0) ; 800CD098
jal   0x8004819C
 li    A0, 1
lw    RA, 0x10(SP)
jr    RA
 addiu SP, SP, 0x18

setup_routine:
addiu SP, SP, -0x38
sw    RA, 0x28(SP)
sw    S1, 0x24(SP)
sw    S0, 0x20(SP)
sdc1  F20, 0x30(SP)
li    A0, 160
jal   InitObjSys
 li    A1, 40
li    A0, 1
li    A1, 255
li    A2, 255
jal   0x80019514
 li    A3, 255
li    A0, 2
li    A1, 200
li    A2, 200
jal   0x80019514
 li    A3, 200
JAL   __PP64_INTERNAL_ADDITIONAL_BG_CHOICE
 NOP
move  A0, V0 ; Determined by user-customizable hook
li    A1, ${boardInfo.boardDefFile}
li    A2, ${boardInfo.pauseBgDir!}
jal   0x800F89D0 ; setup board?
 move  A3, R0
lui   A0, hi(D_8011D31C)
jal   0x800EBCFC
 addiu A0, A0, lo(D_8011D31C)
lui   A0, hi(D_8011D320)
jal   0x800EBD54
 addiu A0, A0, lo(D_8011D320)

; begin arrow rotation
${arrowRotationInstructions.join("\n")}
; end arrow rotation

lui   A1, hi(boo_event)
addiu A1, A1, lo(boo_event)
jal   0x800E2960
 move  A0, R0
lui   A1, hi(func_8010F2FC)
addiu A1, A1, lo(func_8010F2FC)
jal   0x800E2960
 li    A0, 1
lui   A1, hi(func_8010F6C4)
addiu A1, A1, lo(func_8010F6C4)
jal   0x800E2960
 li    A0, 9
lui   A1, hi(func_8010F730)
addiu A1, A1, lo(func_8010F730)
jal   0x800E2960
 li    A0, 2
lui   A1, hi(D_80117C60)
addiu A1, A1, lo(D_80117C60)
jal   0x800E2960
 li    A0, 3
lui   A1, hi(D_8011093C)
addiu A1, A1, lo(D_8011093C)
jal   0x800E2960
 li    A0, 4
lui   A1, hi(D_80110BC8)
addiu A1, A1, lo(D_80110BC8)
jal   0x800E2960
 li    A0, 5
lui   A1, hi(D_8010FC24)
addiu A1, A1, lo(D_8010FC24)
jal   0x800E2960
 li    A0, 6
lui   A1, hi(D_80110194)
addiu A1, A1, lo(D_80110194)
jal   0x800E2960
 li    A0, 7
lui   A1, hi(D_801104E0)
addiu A1, A1, lo(D_801104E0)
jal   0x800E2960
 li    A0, 8
lui   A1, hi(D_80116F5C)
addiu A1, A1, lo(D_80116F5C)
jal   0x800E2960
 li    A0, 10
lui   A1, hi(D_801177DC)
addiu A1, A1, lo(D_801177DC)
jal   0x800E2960
 li    A0, 11
lui   A1, hi(D_80111018)
addiu A1, A1, lo(D_80111018)
jal   0x800E2960
 li    A0, 14
lui   A1, hi(D_801112D8)
addiu A1, A1, lo(D_801112D8)
jal   0x800E2960
 li    A0, 15
lui   A1, hi(D_80111678)
addiu A1, A1, lo(D_80111678)
jal   0x800E2960
 li    A0, 16
lui   A1, hi(D_80112074)
addiu A1, A1, lo(D_80112074)
jal   0x800E2960
 li    A0, 17
lui   A1, hi(D_80112BCC)
addiu A1, A1, lo(D_80112BCC)
jal   0x800E2960
 li    A0, 18
lui   A1, hi(barter_box_item_code)
addiu A1, A1, lo(barter_box_item_code)
jal   0x800E2960
 li    A0, 19
lui   A1, hi(game_guy_lucky_charm)
addiu A1, A1, lo(game_guy_lucky_charm)
jal   0x800E2960
 li    A0, 20
lui   A1, hi(D_80115B80)
addiu A1, A1, lo(D_80115B80)
jal   0x800E2960
 li    A0, 21
lui   A1, hi(D_80116DAC)
addiu A1, A1, lo(D_80116DAC)
jal   0x800E2960
 li    A0, 12
lui   A1, hi(D_801176A4)
addiu A1, A1, lo(D_801176A4)
jal   0x800E2960
 li    A0, 13
lui   A0, hi(D_8011C88C)
addiu A0, A0, lo(D_8011C88C)
jal   0x800DA748
 move  S0, R0
lui   S1, hi(D_8011D2C0)
addiu S1, S1, lo(D_8011D2C0)
sll   V0, S0, 1
L80107F5C:
addu  V0, V0, S1
lh    A1, 0(V0)
jal   0x800EA6E0
 move  A0, S0
addiu S0, S0, 1
slti  V0, S0, STAR_COUNT
bnez  V0, L80107F5C
 sll   V0, S0, 1
jal   0x80035F98
 li    A0, 14
beqz  V0, L80107F9C
       NOP
jal   0x8003602C
 li    A0, 14
jal   func_80105FB0
       NOP
; drawing things
L80107F9C:
.if STAR_COUNT
jal   draw_star_space_state
       NOP
jal   draw_millenium_stars
       NOP
.endif
jal   draw_boo
       NOP
jal   draw_bank_coins
       NOP
jal   draw_gates_outer
       NOP
jal   func_80108B24 ; bank?
       NOP
jal   func_80108BA4
       NOP
jal   func_80116AA0
       NOP
jal   0x800EBDAC
       NOP
lw    RA, 0x28(SP)
lw    S1, 0x24(SP)
lw    S0, 0x20(SP)
ldc1  F20, 0x30(SP)
jr    RA
 addiu SP, SP, 0x38

${preppedAdditionalBgCode}

; A function that returns the audio index, to let custom events call to get the value.
${preppedAudioIndexCode}

overlaycall2:
addiu SP, SP, -0x18
sw    RA, 0x10(SP)

jal __PP64_INTERNAL_GET_BOARD_AUDIO_INDEX
 nop

; Start playing board audio.
jal   0x8004A520
 move    A0, V0

; On the chance that there are side effects of reordering this code, just call again.
jal __PP64_INTERNAL_GET_BOARD_AUDIO_INDEX
nop

lui   AT, hi(CORE_800CE198)
sh    V0, lo(CORE_800CE198)(AT)
jal   0x800F8D6C
 move  A0, V0

jal   InitCameras
 li    A0, 2
jal   setup_routine
       NOP

JAL hydrate_events
 NOP

; Sets up shared happening space code.
lui   A0, hi(shared_happening_event)
jal   0x800F8D48
addiu A0, A0, lo(shared_happening_event)

jal   0x800FF41C
 move  A0, R0
lw    RA, 0x10(SP)
jr    RA
 addiu SP, SP, 0x18

hydrate_events:
ADDIU SP SP 0xFFE8
SW RA, 0x0010(SP)

// Call for the MainFS to read in the ASM blob.
LUI A0 ${mainFsEventDir}
JAL ${getSymbol(Game.MP3_USA, "ReadMainFS")}
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
JAL ${getSymbol(Game.MP3_USA, "EventTableHydrate")}
ADDIU A0 T4 16 // ADDIU A0, T4, 16

// Well, we copied the buffer... now we should "free" it with this magic JAL...
// Free our T9 reference, which theoretically could be corrupted, but in practice not.
JAL ${getSymbol(Game.MP3_USA, "FreeMainFS")}
ADDU A0 T9 R0

LW RA 0x10(SP)
JR RA
ADDIU SP SP 0x18

overlaycall3:
addiu SP, SP, -0x18
sw    RA, 0x10(SP)
jal   InitCameras
 li    A0, 1
jal   setup_routine
       NOP
jal   0x800FF41C
 li    A0, 1
lw    RA, 0x10(SP)
jr    RA
 addiu SP, SP, 0x18

draw_millenium_star_inner:
addiu SP, SP, -0x20
sw    RA, 0x1c(SP)
sw    S2, 0x18(SP)
sw    S1, 0x14(SP)
sw    S0, 0x10(SP)
move  S0, A0
sll   A0, A0, 0x10
sra   A0, A0, 0xe
lui   V0, hi(D_8011FA78)
addu  V0, V0, A0
lw    V0, lo(D_8011FA78)(V0)
bnez  V0, L801081D4
 li    A0, 58
jal   0x800D90C8
 move  A1, R0
move  S2, V0
lw    V0, 0x3c(S2)
lw    V0, 0x40(V0)
jal   0x800461B4
 lh    A0, 0(V0)
lui   V0, hi(D_8011FA70)
lw    V0, lo(D_8011FA70)(V0)
bnez  V0, L8010812C
 sll   S0, S0, 0x10
lui   AT, hi(D_8011FA70)
sw    S2, lo(D_8011FA70)(AT)
L8010812C:
sra   S0, S0, 0x10
sll   S1, S0, 2
lui   AT, hi(D_8011FA78)
addu  AT, AT, S1
sw    S2, lo(D_8011FA78)(AT)
lhu   V0, 0xa(S2)
ori   V0, V0, 2
sh    V0, 0xa(S2)
addiu A0, S2, 0x24
lui   A1, 0x3f19
ori   A1, A1, 0x999a
move  A2, A1
jal   0x80089A10
 move  A3, A1
li    AT, 0x41200000 ; 10.000000
mtc1  AT, F0
      NOP
swc1  F0, 0x30(S2)
lui   A1, 0x40c0
lui   A2, 0x4000
jal   0x800EDB98
 move  A0, S2
lui   AT, hi(D_8011FA98)
addu  AT, AT, S1
sw    V0, lo(D_8011FA98)(AT)
sll   S0, S0, 1
lui   A0, hi(D_8011D37C)
addu  A0, A0, S0
jal   GetSpaceData
 lh    A0, lo(D_8011D37C)(A0)
addiu A0, S2, 0xc
jal   0x80089A20
 addiu A1, V0, 8
li    A0, 11
lui   A2, hi(D_8011D334)
addu  A2, A2, S1
lh    A2, lo(D_8011D334)(A2)
lui   A3, hi(D_8011D336)
addu  A3, A3, S1
lh    A3, lo(D_8011D336)(A3)
jal   0x800D771C
 move  A1, S2
L801081D4:
lw    RA, 0x1c(SP)
lw    S2, 0x18(SP)
lw    S1, 0x14(SP)
lw    S0, 0x10(SP)
jr    RA
 addiu SP, SP, 0x20

func_801081EC:
addiu SP, SP, -0x20
sw    RA, 0x1c(SP)
sw    S2, 0x18(SP)
sw    S1, 0x14(SP)
sw    S0, 0x10(SP)
move  S0, R0
lui   S2, hi(D_8011FA98)
addiu S2, S2, lo(D_8011FA98)
sll   V0, S0, 2
L80108210:
addu  S1, V0, S2
lw    A0, 0(S1)
beqz  A0, L8010822C
 addiu S0, S0, 1
jal   EndProcess
       NOP
sw    R0, 0(S1)
L8010822C:
slti  V0, S0, STAR_COUNT
bnez  V0, L80108210
 sll   V0, S0, 2
lw    RA, 0x1c(SP)
lw    S2, 0x18(SP)
lw    S1, 0x14(SP)
lw    S0, 0x10(SP)
jr    RA
 addiu SP, SP, 0x20

draw_millenium_stars:
addiu SP, SP, -0x28
sw    RA, 0x20(SP)
sw    S3, 0x1c(SP)
sw    S2, 0x18(SP)
sw    S1, 0x14(SP)
sw    S0, 0x10(SP)
lui   AT, hi(D_8011FA70)
sw    R0, lo(D_8011FA70)(AT)
move  S0, R0
lui   S3, hi(D_8011FA78)
addiu S3, S3, lo(D_8011FA78)
lui   S2, hi(D_8011FA98)
addiu S2, S2, lo(D_8011FA98)
lui   S1, hi(D_8011D38C)
addiu S1, S1, lo(D_8011D38C)
sll   V1, S0, 2
L80108290:
addu  V0, V1, S3
sw    R0, 0(V0)
addu  V1, V1, S2
lui   A0, hi(func_801081EC)
addiu A0, A0, lo(func_801081EC)
jal   0x800F8D60
 sw    R0, 0(V1)
sll   V0, S0, 1
addu  V0, V0, S1
jal   0x80035F98
 lh    A0, 0(V0)
bnezl V0, L801082D4
 addiu S0, S0, 1
sll   A0, S0, 0x10
jal   draw_millenium_star_inner
 sra   A0, A0, 0x10
addiu S0, S0, 1
L801082D4:
slti  V0, S0, STAR_COUNT ; or M-star count?
bnez  V0, L80108290
 sll   V1, S0, 2
lw    RA, 0x20(SP)
lw    S3, 0x1c(SP)
lw    S2, 0x18(SP)
lw    S1, 0x14(SP)
lw    S0, 0x10(SP)
jr    RA
 addiu SP, SP, 0x28

draw_boo_inner:
addiu SP, SP, -0x20
sw    RA, 0x18(SP)
sw    S1, 0x14(SP)
sw    S0, 0x10(SP)
move  S0, A0
sll   A0, A0, 0x10
sra   A0, A0, 0xe
lui   V0, hi(D_8011FB0C)
addu  V0, V0, A0
lw    V0, lo(D_8011FB0C)(V0)
bnez  V0, L80108408
       NOP
lui   V0, hi(D_8011FB08)
lw    V0, lo(D_8011FB08)(V0)
bnez  V0, L80108378
       NOP
li    A0, 10
jal   0x800D90C8
 move  A1, R0
move  S1, V0
lw    V0, 0x3c(S1)
lw    V0, 0x40(V0)
jal   0x8001FA68
 lh    A0, 0(V0)
lw    V0, 0x40(S1)
lw    V0, 0x40(V0)
jal   0x8001FA68
 lh    A0, 0(V0)
lui   AT, hi(D_8011FB08)
j     L80108388
 sw    S1, lo(D_8011FB08)(AT)
L80108378:
lui   A0, hi(D_8011FB08)
jal   0x800D975C
 lw    A0, lo(D_8011FB08)(A0)
move  S1, V0
L80108388:
jal   0x800D9B24
 move  A0, S1
sll   V1, S0, 0x10
sra   V1, V1, 0x10
sll   S0, V1, 2
lui   AT, hi(D_8011FB0C)
addu  AT, AT, S0
sw    S1, lo(D_8011FB0C)(AT)
lhu   V0, 0xa(S1)
ori   V0, V0, 2
sh    V0, 0xa(S1)
li    AT, 0x41700000 ; 15.000000
mtc1  AT, F0
      NOP
swc1  F0, 0x30(S1)
sll   V1, V1, 1
lui   A0, hi(boo_space_indices)
addu  A0, A0, V1
jal   GetSpaceData
 lh    A0, lo(boo_space_indices)(A0)
addiu A0, S1, 0xc
jal   0x80089A20
 addiu A1, V0, 8
li    A0, 10
lui   A2, hi(D_8011D354)
addu  A2, A2, S0
lh    A2, lo(D_8011D354)(A2)
lui   A3, hi(D_8011D356)
addu  A3, A3, S0
lh    A3, lo(D_8011D356)(A3)
jal   0x800D771C
 move  A1, S1
L80108408:
lw    RA, 0x18(SP)
lw    S1, 0x14(SP)
lw    S0, 0x10(SP)
jr    RA
 addiu SP, SP, 0x20

draw_boo:
addiu SP, SP, -0x20
sw    RA, 0x18(SP)
sw    S1, 0x14(SP)
sw    S0, 0x10(SP)
lui   AT, hi(D_8011FB08)
sw    R0, lo(D_8011FB08)(AT)
move  S0, R0
lui   S1, hi(D_8011FB0C)
addiu S1, S1, lo(D_8011FB0C)
sll   V0, S0, 2
L80108444:
addu  V0, V0, S1
sw    R0, 0(V0)
sll   A0, S0, 0x10
jal   draw_boo_inner
 sra   A0, A0, 0x10
addiu S0, S0, 1
blez  S0, L80108444 ; TODO: Consider BOO_COUNT here
 sll   V0, S0, 2
lw    RA, 0x18(SP)
lw    S1, 0x14(SP)
lw    S0, 0x10(SP)
jr    RA
 addiu SP, SP, 0x20

func_80108478:
addiu SP, SP, -0x38
sw    RA, 0x30(SP)
sw    S5, 0x2c(SP)
sw    S4, 0x28(SP)
sw    S3, 0x24(SP)
sw    S2, 0x20(SP)
sw    S1, 0x1c(SP)
sw    S0, 0x18(SP)
move  S3, R0
lui S5, 0x6666
ori S5, S5, 0x6667
lui   S4, hi(D_8011FB18)
addiu S4, S4, lo(D_8011FB18)
L801084AC:
lui   V0, hi(bank_coin_total)
lh    V0, lo(bank_coin_total)(V0)
addiu V0, V0, 9
mult  V0, S5
mfhi  A1
sra   V1, A1, 2
sra   V0, V0, 0x1f
subu  S1, V1, V0
slti  V0, S1, 6
beql  V0, R0, L801084D8
 li    S1, 5
L801084D8:
blez  S1, L8010850C
 move  S0, R0
sll   V0, S3, 2
addu  S2, V0, S3
addu  V0, S2, S0
L801084EC:
sll   V0, V0, 2
addu  V0, V0, S4
lw    A0, 0(V0)
jal   0x800D9AA4
 addiu S0, S0, 1
slt   V0, S0, S1
bnez  V0, L801084EC
 addu  V0, S2, S0
L8010850C:
slti  V0, S0, 5
beqz  V0, L80108540
 sll   V0, S3, 2
addu  S1, V0, S3
addu  V0, S1, S0
L80108520:
sll   V0, V0, 2
addu  V0, V0, S4
lw    A0, 0(V0)
jal   0x800D9B24
 addiu S0, S0, 1
slti  V0, S0, 5
bnez  V0, L80108520
 addu  V0, S1, S0
L80108540:
addiu S3, S3, 1
slti  V0, S3, 2
bnez  V0, L801084AC
       NOP
lw    RA, 0x30(SP)
lw    S5, 0x2c(SP)
lw    S4, 0x28(SP)
lw    S3, 0x24(SP)
lw    S2, 0x20(SP)
lw    S1, 0x1c(SP)
lw    S0, 0x18(SP)
jr    RA
 addiu SP, SP, 0x38

draw_bank_coins_inner:
addiu SP, SP, -0x28
sw    RA, 0x20(SP)
sw    S3, 0x1c(SP)
sw    S2, 0x18(SP)
sw    S1, 0x14(SP)
sw    S0, 0x10(SP)
move  S0, A0
sll   A0, A0, 0x10
sra   A0, A0, 0xe
lui   V0, hi(D_8011FB18)
addu  V0, V0, A0
lw    V0, lo(D_8011FB18)(V0)
bnez  V0, L801086C4
       NOP
lui   V0, hi(D_8011FB10)
lw    V0, lo(D_8011FB10)(V0)
bnez  V0, L801085E4
       NOP
li    A0, 30
jal   0x800D90C8
 move  A1, R0
move  S3, V0
jal   0x800D9714
 move  A0, S3
lui   AT, hi(D_8011FB10)
sw    S3, lo(D_8011FB10)(AT)
j     L801085F8
 sll   V1, S0, 0x10
L801085E4:
lui   A0, hi(D_8011FB10)
jal   0x800D975C
 lw    A0, lo(D_8011FB10)(A0)
move  S3, V0
sll   V1, S0, 0x10
L801085F8:
sra   S1, V1, 0x10
sll   V0, S1, 2
lui   AT, hi(D_8011FB18)
addu  AT, AT, V0
sw    S3, lo(D_8011FB18)(AT)
lhu   V0, 0xa(S3)
ori   V0, V0, 2
sh    V0, 0xa(S3)
lui V0, 0x6666
ori V0, V0, 0x6667
mult  S1, V0
mfhi  A3
sra   S0, A3, 1
sra   V1, V1, 0x1f
subu  S0, S0, V1
sll   V0, S0, 0x10
sra   V0, V0, 0xf
lui   A0, hi(bank_coin_space_indices)
addu  A0, A0, V0
lh    A0, lo(bank_coin_space_indices)(A0)
jal   GetSpaceData
 addiu S2, S3, 0xc
move  A0, S2
jal   0x80089A20
 addiu A1, V0, 8
sll   V0, S0, 2
addu  V0, V0, S0
subu  S1, S1, V0
sll   S1, S1, 0x10
sra   S1, S1, 0x10
sll   S0, S1, 1
addu  S0, S0, S1
sll   S0, S0, 2
lui   A1, hi(D_8011D3A4)
addiu A1, A1, lo(D_8011D3A4)
move  A0, S2
addu  A1, S0, A1
jal   0x80089A70
 move  A2, S2
lw    V0, 0x3c(S3)
lui   AT, hi(D_8011D3E0)
addu  AT, AT, S0
lwc1  F0, lo(D_8011D3E0)(AT)
swc1  F0, 0x24(V0)
lw    V0, 0x3c(S3)
lui   AT, hi(D_8011D3E8)
addu  AT, AT, S0
lwc1  F0, lo(D_8011D3E8)(AT)
swc1  F0, 0x2c(V0)
jal   0x800D9B24
 move  A0, S3
L801086C4:
lw    RA, 0x20(SP)
lw    S3, 0x1c(SP)
lw    S2, 0x18(SP)
lw    S1, 0x14(SP)
lw    S0, 0x10(SP)
jr    RA
 addiu SP, SP, 0x28

draw_bank_coins:
addiu SP, SP, -0x20
sw    RA, 0x18(SP)
sw    S1, 0x14(SP)
sw    S0, 0x10(SP)
lui   AT, hi(D_8011FB10)
sw    R0, lo(D_8011FB10)(AT)
move  S0, R0
lui   S1, hi(D_8011FB18)
addiu S1, S1, lo(D_8011FB18)
sll   V0, S0, 2
L80108708:
addu  V0, V0, S1
sw    R0, 0(V0)
sll   A0, S0, 0x10
jal   draw_bank_coins_inner
 sra   A0, A0, 0x10
addiu S0, S0, 1
slti  V0, S0, 0xa
bnez  V0, L80108708
 sll   V0, S0, 2
jal   func_80108478
       NOP
lw    RA, 0x18(SP)
lw    S1, 0x14(SP)
lw    S0, 0x10(SP)
jr    RA
 addiu SP, SP, 0x20

;draw gates inner
func_80108748:
addiu SP, SP, -0x28
sw    RA, 0x24(SP)
sw    S2, 0x20(SP)
sw    S1, 0x1c(SP)
sw    S0, 0x18(SP)
move  S0, A0
sll   A0, A0, 0x10
sra   A0, A0, 0xe
lui   V0, hi(D_8011FB44)
addu  V0, V0, A0
lw    V0, lo(D_8011FB44)(V0)
bnez  V0, L8010889C
       NOP
lui   V0, hi(D_8011FB40)
lw    V0, lo(D_8011FB40)(V0)
bnez  V0, L801087D8
       NOP
lui   V0, hi(CORE_800CD059)
lb    V0, lo(CORE_800CD059)(V0) ; getting board index?
sll   V1, V0, 1
sll   V0, V0, 2
;li    V0, 0 ; TODO: Hard code board index to 0, so we always use the same gate animation/sound/file.
lui   A0, hi(D_8011D421)
addu  A0, A0, V1
lbu   A0, lo(D_8011D421)(A0)
lui   A1, hi(D_8011D45C)
addu  A1, A1, V0
lw    A1, lo(D_8011D45C)(A1)
jal   0x800D90C8
 sll   S0, S0, 0x10
move  S2, V0
jal   0x800D9714
 move  A0, S2
lui   AT, hi(D_8011FB40)
sw    S2, lo(D_8011FB40)(AT)
j     L801087F0
 sra   S0, S0, 0x10
L801087D8:
lui   A0, hi(D_8011FB40)
lw    A0, lo(D_8011FB40)(A0)
jal   0x800D975C
 sll   S0, S0, 0x10
move  S2, V0
sra   S0, S0, 0x10
L801087F0:
sll   S1, S0, 2
lui   AT, hi(D_8011FB44)
addu  AT, AT, S1
sw    S2, lo(D_8011FB44)(AT)
lhu   V0, 0xa(S2)
ori   V0, V0, 2
sh    V0, 0xa(S2)
lw    V0, 0x3c(S2)
lw    V0, 0x40(V0)
lh    A0, 0(V0)
li    A1, 2
jal   0x8001C814
 li    A2, 1
sll   S0, S0, 1
lui   A0, hi(gate_spaces)
addu  A0, A0, S0
jal   GetSpaceData
 lh    A0, lo(gate_spaces)(A0)
addiu A0, S2, 0xc
jal   0x80089A20
 addiu A1, V0, 8
lui   A0, hi(gate_entrance_spaces)
addu  A0, A0, S1
jal   GetSpaceData
 lh    A0, lo(gate_entrance_spaces)(A0)
lui   A0, hi(gate_exit_spaces)
addu  A0, A0, S1
lh    A0, lo(gate_exit_spaces)(A0)
jal   GetSpaceData
 move  S0, V0
addiu A0, V0, 8
addiu A1, S0, 8
jal   GetAngleBetweenSpaces
 addiu A2, S2, 0x18
li    A0, 12
lui   A2, hi(D_8011D36C)
addu  A2, A2, S1
lh    A2, lo(D_8011D36C)(A2)
lui   A3, hi(D_8011D36E)
addu  A3, A3, S1
lh    A3, lo(D_8011D36E)(A3)
jal   0x800D771C
 move  A1, S2
L8010889C:
lw    RA, 0x24(SP)
lw    S2, 0x20(SP)
lw    S1, 0x1c(SP)
lw    S0, 0x18(SP)
jr    RA
 addiu SP, SP, 0x28

draw_gates_outer:
addiu SP, SP, -0x20
sw    RA, 0x18(SP)
sw    S1, 0x14(SP)
sw    S0, 0x10(SP)
lui   AT, hi(D_8011FB40)
sw    R0, lo(D_8011FB40)(AT)
move  S0, R0
lui   S1, hi(D_8011FB44)
addiu S1, S1, lo(D_8011FB44)
sll   V0, S0, 2
__draw_gates_outer_loop:
addu  V0, V0, S1
sw    R0, 0(V0)
sll   A0, S0, 0x10
jal   func_80108748
 sra   A0, A0, 0x10
addiu S0, S0, 1
slti  V0, S0, GATE_COUNT
bnez  V0, __draw_gates_outer_loop
 sll   V0, S0, 2
lw    RA, 0x18(SP)
lw    S1, 0x14(SP)
lw    S0, 0x10(SP)
jr    RA
 addiu SP, SP, 0x20

D_80108914:
addiu SP, SP, -0x18
sw    RA, 0x14(SP)
sw    S0, 0x10(SP)
lui   S0, hi(CORE_800CD059)
addiu S0, S0, lo(CORE_800CD059)
lb    V0, 0(S0)
sll   V0, V0, 2
lui   A0, hi(D_8011D4BC)
addu  A0, A0, V0
jal   SleepProcess
 lw    A0, lo(D_8011D4BC)(A0)
lb    V0, 0(S0)
sll   V0, V0, 2
lui   A0, hi(D_8011D49A)
addu  A0, A0, V0
jal   PlaySound
 lh    A0, lo(D_8011D49A)(A0)
jal   EndProcess
 move  A0, R0
lw    RA, 0x14(SP)
lw    S0, 0x10(SP)
jr    RA
 addiu SP, SP, 0x18

func_gate_80108970:
addiu SP, SP, -0x18
sw    RA, 0x14(SP)
sw    S0, 0x10(SP)
lui   V0, hi(D_8011FB44)
addiu V0, V0, lo(D_8011FB44)
sll   S0, A0, 2
addu  S0, S0, V0
addiu A1, A1, -1
sll   A1, A1, 0x10
lw    A0, 0(S0)
sra   A1, A1, 0x10
jal   0x800D9CE8
 move  A2, R0
lw    V0, 0(S0)
lw    V0, 0x3c(V0)
lw    V0, 0x40(V0)
lh    A0, 0(V0)
li    A1, 5
jal   0x8001C814
 move  A2, R0
lui   V0, hi(CORE_800CD059)
lb    V0, lo(CORE_800CD059)(V0)
lui   V1, hi(D_8011D474)
addiu V1, V1, lo(D_8011D474)
sll   V0, V0, 2
addu  A0, V0, V1
lw    V1, 0(A0)
li    V0, -1
beq   V1, V0, L801089F0
       NOP
jal   PlaySound
 lh    A0, 2(A0)
L801089F0:
lui   V0, hi(CORE_800CD059)
lb    V0, lo(CORE_800CD059)(V0)
sll   V0, V0, 2
lui   V1, hi(D_8011D498)
addu  V1, V1, V0
lw    V1, lo(D_8011D498)(V1)
li    V0, -1
beq   V1, V0, L80108A28
 li    A1, 4096
lui   A0, hi(D_80108914)
addiu A0, A0, lo(D_80108914)
move  A2, R0
jal   InitProcess
 move  A3, R0
L80108A28:
lw    RA, 0x14(SP)
lw    S0, 0x10(SP)
jr    RA
 addiu SP, SP, 0x18

gate_spaces_event_process:
addiu SP, SP, -0x18
sw    RA, 0x14(SP)
jal   0x8004EE68
 sw    S0, 0x10(SP)
lw    S0, 0x8c(V0)
lui   V1, hi(CORE_800CD06D)
lb    V1, lo(CORE_800CD06D)(V1)
beqz  V1, L80108A6C
 li    V0, 1
beq   V1, V0, L80108A70
 li    A0, 10
j     L80108A70
 li    A0, 15
L80108A6C:
li    A0, 5
L80108A70:
jal   SleepProcess
       NOP
sll   V0, S0, 2
lui   AT, hi(D_8011FB44)
addu  AT, AT, V0
lw    V0, lo(D_8011FB44)(AT)
lw    V0, 0x3c(V0)
lw    V0, 0x40(V0)
lh    A0, 0(V0)
li    A1, 1
jal   0x8001C814
 li    A2, 4
lui   V0, hi(CORE_800CD059)
lb    V0, lo(CORE_800CD059)(V0)
lui   V1, hi(D_8011D4E0)
addiu V1, V1, lo(D_8011D4E0)
sll   V0, V0, 2
addu  A0, V0, V1
lw    V1, 0(A0)
li    V0, -1
beq   V1, V0, L80108AD0
       NOP
jal   PlaySound
 lh    A0, 2(A0)
L80108AD0:
jal   EndProcess
 move  A0, R0
lw    RA, 0x14(SP)
lw    S0, 0x10(SP)
jr    RA
 addiu SP, SP, 0x18

__PP64_INTERNAL_GATE_CLOSE_EVENT:
gate_spaces_event:
addiu SP, SP, -0x18
sw    RA, 0x14(SP)
sw    S0, 0x10(SP)
move  S0, A0
lui   A0, hi(gate_spaces_event_process)
addiu A0, A0, lo(gate_spaces_event_process)
li    A1, 4096
move  A2, R0
jal   InitProcess
 move  A3, R0
sw    S0, 0x8c(V0)
lw    RA, 0x14(SP)
lw    S0, 0x10(SP)
jr    RA
 addiu SP, SP, 0x18

; draw bank outer?
func_80108B24:
addiu SP, SP, -0x20
sw    RA, 0x18(SP)
sw    S1, 0x14(SP)
sw    S0, 0x10(SP)
lui   AT, hi(D_8011FB40)
sw    R0, lo(D_8011FB40)(AT)
move  S0, R0
lui   S1, hi(bank_model_space_indices)
addiu S1, S1, lo(bank_model_space_indices)
sll   V0, S0, 1
L80108B4C:
addu  V0, V0, S1
jal   GetSpaceData
 lh    A0, 0(V0)
sll   V1, S0, 2
li    A0, 8
lui   A2, hi(D_8011D35C)
addu  A2, A2, V1
lh    A2, lo(D_8011D35C)(A2)
lui   A3, hi(D_8011D35E)
addu  A3, A3, V1
lh    A3, lo(D_8011D35E)(A3)
jal   0x800D7790
 addiu A1, V0, 8
addiu S0, S0, 1
slti  V0, S0, BANK_COUNT
bnez  V0, L80108B4C
 sll   V0, S0, 1
lw    RA, 0x18(SP)
lw    S1, 0x14(SP)
lw    S0, 0x10(SP)
jr    RA
 addiu SP, SP, 0x20

func_80108BA4:
addiu SP, SP, -0x20
sw    RA, 0x18(SP)
sw    S1, 0x14(SP)
sw    S0, 0x10(SP)
move  S0, R0
lui   S1, hi(item_shop_model_space_indices)
addiu S1, S1, lo(item_shop_model_space_indices)
sll   V0, S0, 1
L80108BC4:
addu  V0, V0, S1
jal   GetSpaceData
 lh    A0, 0(V0)
sll   V1, S0, 2
li    A0, 9
lui   A2, hi(D_8011D364)
addu  A2, A2, V1
lh    A2, lo(D_8011D364)(A2)
lui   A3, hi(D_8011D366)
addu  A3, A3, V1
lh    A3, lo(D_8011D366)(A3)
jal   0x800D7790
 addiu A1, V0, 8
addiu S0, S0, 1
slti  V0, S0, SHOP_COUNT
bnez  V0, L80108BC4
 sll   V0, S0, 1
lw    RA, 0x18(SP)
lw    S1, 0x14(SP)
lw    S0, 0x10(SP)
jr    RA
 addiu SP, SP, 0x20

__PP64_INTERNAL_GATE_EVENT:
gate_event:
addiu SP, SP, -0x28
sw    RA, 0x24(SP)
sw    S4, 0x20(SP)
sw    S3, 0x1c(SP)
sw    S2, 0x18(SP)
sw    S1, 0x14(SP)
sw    S0, 0x10(SP)
li    S4, 1
lui   S3, hi(CORE_800CD058)
addiu S3, S3, lo(CORE_800CD058)
jal   GetPlayerStruct
 li    A0, -1
move  S2, V0
lbu   A0, 0xf(S2)
sll   A0, A0, 0x18
sra   A0, A0, 0x18
lbu   A1, 0x10(S2)
sll   A1, A1, 0x18
sra   A1, A1, 0x18
andi  A0, A0, 0xffff
jal   GetAbsSpaceIndexFromChainSpaceIndex
 andi  A1, A1, 0xffff
sll   V0, V0, 0x10
sra   S1, V0, 0x10
xori  V1, S1, ${gateEventInfos[0].gateEntryIndex}
sltiu V1, V1, 1
xori  V0, S1, ${gateEventInfos[1].gateEntryIndex}
sltiu V0, V0, 1
or    V1, V1, V0
beqz  V1, L80109B64
 xori  V1, S1, ${gateEventInfos[0].gateExitIndex}
lbu   V0, 0x17(S2)
andi  V0, V0, 1
bnez  V0, L80109E5C
       NOP
L80109B64:
sltiu V1, V1, 1
xori  V0, S1, ${gateEventInfos[1].gateExitIndex}
sltiu V0, V0, 1
or    V1, V1, V0
beqz  V1, L80109B8C
 li    A0, -1
lbu   V0, 0x17(S2) ; testing player flag bit
andi  V0, V0, 1
beqz  V0, L80109E5C
       NOP
L80109B8C:
li    A1, -1
jal   0x800F2304
 li    A2, 2
lb    A0, 0xf(S3)
jal   PlayerHasItem
 li    A1, ITEM_SKELETON_KEY
li    V1, -1
beq   V0, V1, L80109DC8
 li    A0, -1
lb    A0, 0xf(S3)
jal   0x800DBEC0
       NOP
li    V0, ${gateEventInfos[0].gateExitIndex}
beq   S1, V0, L80109BD0
 li    V0, ${gateEventInfos[0].gateEntryIndex}
bne   S1, V0, L80109BE0
 li    A0, -1
L80109BD0:
li    A0, -1
li    A1, 8
j     L80109BE8
 li    A2, ${gateEventInfos[0].gateSpaceIndex}
L80109BE0:
li    A1, 8
li    A2, ${gateEventInfos[1].gateSpaceIndex}
L80109BE8:
jal   0x800ED20C
       NOP
jal   0x8004EE68
       NOP
li    AT, 0x3FCC0000
ori   AT, AT, 0xcccd
mtc1  AT, F12
      NOP
jal   0x800E8EDC
 move  S0, V0
move  A0, S0
jal   0x8004ED30
 move  A1, V0
jal   0x8004EE18
       NOP
li    A0, -1
jal   0x800FF900
 li    A1, 1
li    A0, 56
L80109C34:
jal   0x800EC628
 li    A1, 0x4103 ; "Hi I'm the Skeleton Key! Shall I use my skills..."
li    A0, 2
jal   __PP64_INTERNAL_BASIC_MESSAGE_CHOICE
 move  A1, R0
jal   0x800EC6C8
 move  S0, V0
jal   0x800EC6EC
       NOP
li    V0, 1
beq   S0, V0, L80109D5C
 slti  V0, S0, 2
beql  V0, R0, L80109C7C
 li    V0, 2
beqz  S0, L80109C8C
 li    A0, 56
j     L80109D80
       NOP
L80109C7C:
beq   S0, V0, L80109D70
       NOP
j     L80109D80
       NOP
L80109C8C:
jal   0x800EC590
 li    A1, 16644
lb    A0, 0xf(S3)
jal   PlayerHasItem
 li    A1, ITEM_SKELETON_KEY
lb    A0, 0xf(S3)
sll   V1, A0, 3
subu  V1, V1, A0
sll   V1, V1, 3
lui   A0, hi(p1_item1) ; p1_item1, reaching into items...
addiu A0, A0, lo(p1_item1)
addu  V1, V1, A0
addu  V1, V1, V0
li    V0, -1
sb    V0, 0(V1) ; clearing item?
lui   A0, hi(current_player_index)
jal   FixUpPlayerItemSlots
 lb    A0, lo(current_player_index)(A0)
jal   0x800F63F0
 li    A0, -1
li    V0, ${gateEventInfos[1].gateEntryIndex}
beq   S1, V0, L80109D18
 ADDIU V0 R0 ${gateEventInfos[0].gateEntryIndex} ; slti  V0, S1, gateEntryIndex
beq   S1, V0, L80109D00 ; was beqz
 li    V0, ${gateEventInfos[0].gateExitIndex}
beq   S1, V0, L80109D24
 move  A0, R0
j     L80109D24
 li    A0, 1
L80109D00:
li    V0, ${gateEventInfos[0].gateEntryIndex}
bnel  S1, V0, L80109D24
 li    A0, 1
move  A0, R0
j     L80109D28
 move  A1, R0
L80109D18:
li    A0, 1
j     L80109D28
 move  A1, R0
L80109D24:
li    A1, 1
L80109D28:
jal   func_gate_80108970
 move  S4, R0
li    A0, -1
li    A1, 2
jal   0x800FFA4C
 li    A2, 5
move  S0, V0
jal   SleepProcess
 li    A0, 20
jal   0x800FFAEC
 move  A0, S0
j     L80109D80
       NOP
L80109D5C:
li    A0, 56
jal   0x800EC590
 li    A1, 16645
j     L80109D80
       NOP
L80109D70:
jal   __PP64_INTERNAL_VIEW_MAP
       NOP
j     L80109C34
 li    A0, 56
L80109D80:
lb    A0, 0xf(S3)
jal   0x800DB884
       NOP
jal   0x8004EE68
       NOP
li    AT, 0x3FA60000 ; 1.296875
ori   AT, AT, 0x6666
mtc1  AT, F12
      NOP
jal   0x800E8EDC
 move  S0, V0
move  A0, S0
jal   0x8004ED30
 move  A1, V0
jal   0x8004EE18
       NOP
j     L80109DD0
       NOP
L80109DC8:
jal   0x800EC590
 li    A1, 0x4106 ; "You don't have a Skeleton Key, ..."
L80109DD0:
beqz  S4, L80109E5C
 li    V0, ${gateEventInfos[1].gateEntryIndex}
beq   S1, V0, L80109E28
 li    A0, -1
ADDIU V0 R0 ${gateEventInfos[0].gateEntryIndex} ; slti  V0, S1, 0x7a
beq   S1, V0, L80109DFC
 li    V0, ${gateEventInfos[0].gateExitIndex}
beq   S1, V0, L80109E20
 li    A1, ${gateEventInfos[0].gateNextChain[0]}
j     L80109E44
 li    A1, ${gateEventInfos[1].gateNextChain[0]}
L80109DFC:
li    V0, ${gateEventInfos[0].gateEntryIndex}
bne   S1, V0, L80109E40
 li    A0, -1
li    A1, ${gateEventInfos[0].gatePrevChain[0]}
jal   SetNextChainAndSpace
 li  A2, ${gateEventInfos[0].gatePrevChain[1]}
lbu   V0, 0x17(S2)
j     L80109E58
 ori   V0, V0, 1
L80109E20:
j     L80109E48
 li    A2, ${gateEventInfos[0].gateNextChain[1]}
L80109E28:
li    A1, ${gateEventInfos[1].gatePrevChain[0]}
jal   SetNextChainAndSpace
 li    A2, ${gateEventInfos[1].gatePrevChain[1]}
lbu   V0, 0x17(S2)
j     L80109E58
 ori   V0, V0, 1
L80109E40:
li    A1, ${gateEventInfos[1].gateNextChain[0]}
L80109E44:
li    A2, ${gateEventInfos[1].gateNextChain[1]}
L80109E48:
jal   SetNextChainAndSpace
       NOP
lbu   V0, 0x17(S2)
andi  V0, V0, 0xfe
L80109E58:
sb    V0, 0x17(S2)
L80109E5C:
jal   EndProcess
 move  A0, R0
lw    RA, 0x24(SP)
lw    S4, 0x20(SP)
lw    S3, 0x1c(SP)
lw    S2, 0x18(SP)
lw    S1, 0x14(SP)
lw    S0, 0x10(SP)
jr    RA
 addiu SP, SP, 0x28

; Helper used when prompted between textbox options.
; If A0 is a pointer to AI data, the AI logic is ran to pick for CPUs.
; If A0 is 0 or 1, the 0th or 1st option is chosen by CPUs.
; If A0 is 2, then the value of A1 is the CPUs option index choice.
__PP64_INTERNAL_BASIC_MESSAGE_CHOICE:
addiu SP, SP, -0x48
sw    RA, 0x40(SP)
sw    S5, 0x3c(SP)
sw    S4, 0x38(SP)
sw    S3, 0x34(SP)
sw    S2, 0x30(SP)
sw    S1, 0x2c(SP)
sw    S0, 0x28(SP)
move  S3, A0
move  S5, A1
move  S2, R0
lui   A1, hi(D_8011F8D0)
addiu A1, A1, lo(D_8011F8D0)
lwl   V0, 0(A1)
lwr   V0, 3(A1)
swl   V0, 0x20(SP)
swr   V0, 0x23(SP)
move  S1, R0
addiu S4, SP, 0x18
; begin looping over each player
L8010A180:
lui   V0, hi(current_player_index)
lb    V0, lo(current_player_index)(V0)
bne   S1, V0, L8010A290 ; if S1 != current player index
 sll   V0, S1, 3
; procesing when S1 == current player
subu  V0, V0, S1
sll   V0, V0, 3
lui   AT, hi(CORE_800D110C)
addu  AT, AT, V0
lbu   V0, lo(CORE_800D110C)(AT)
andi  V0, V0, 1
beqz  V0, L8010A240 ; if (value at 800D110C & 0x01) == 0
 li    V0, 1
beq   S3, V0, L8010A1F0 ; Is A0 == 1?
 slti  V0, S3, 2
beql  V0, R0, L8010A1D0 ; Is A0 >= 2?
 li    V0, 2
beqz  S3, L8010A1E0 ; Is A0 == 0?
       NOP
j     L8010A200
       NOP
L8010A1D0:
beq   S3, V0, L8010A214 ; Is A0 == 2?
 addiu S2, S5, 1
j     L8010A200
       NOP
L8010A1E0:
jal   0x800EF0D8
 move  A0, R0
j     L8010A214
 addiu S2, V0, 1
L8010A1F0:
jal   0x800EF0D8
 li    A0, 1
j     L8010A214
 addiu S2, V0, 1
L8010A200:
jal   0x800DA190
 move  A0, S3
sll   V0, V0, 0x10
sra   V0, V0, 0x10
addiu S2, V0, 1
L8010A214:
sll   V0, S1, 3
subu  V0, V0, S1
sll   V0, V0, 3
lui   AT, hi(p1_controller)
addu  AT, AT, V0
lbu   V0, lo(p1_controller)(AT)
sll   V0, V0, 1
addu  V0, V0, S4
li    V1, 1024
j     L8010A2B0
 sh    V1, 0(V0)
L8010A240:
sll   S0, S1, 3
subu  S0, S0, S1
sll   S0, S0, 3
lui   V0, hi(p1_controller)
addu  V0, V0, S0
lbu   V0, lo(p1_controller)(V0)
addu  V0, SP, V0
lui   A0, hi(CORE_80105702_window_id)
lh    A0, lo(CORE_80105702_window_id)(A0)
lbu   A1, 0x20(V0)
jal   0x8005FE54
 addiu S1, S1, 1
lui   V0, hi(p1_controller)
addu  V0, V0, S0
lbu   V0, lo(p1_controller)(V0)
sll   V0, V0, 1
addu  V0, V0, S4
li    V1, -1
j     L8010A2B4
 sh    V1, 0(V0)
L8010A290:
subu  V0, V0, S1
sll   V0, V0, 3
lui   AT, hi(p1_controller)
addu  AT, AT, V0
lbu   V0, lo(p1_controller)(AT)
sll   V0, V0, 1
addu  V0, V0, S4
sh    R0, 0(V0) ; mutate a player's controller index?
L8010A2B0:
addiu S1, S1, 1
L8010A2B4:
slti  V0, S1, 4
bnez  V0, L8010A180
       NOP
beqz  S2, L8010A36C
 li    A1, 2
lui   A0, hi(CORE_80105702_window_id)
lh    A0, lo(CORE_80105702_window_id)(A0)
jal   0x8005B63C
 li    A2, 2
move  S0, R0
addiu S1, SP, 0x18
L8010A2E0:
addiu S2, S2, -1
bnez  S2, L8010A31C
       NOP
lui   V1, hi(current_player_index)
lb    V1, lo(current_player_index)(V1)
sll   V0, V1, 3
subu  V0, V0, V1
sll   V0, V0, 3
lui   AT, hi(p1_controller)
addu  AT, AT, V0
lbu   V0, lo(p1_controller)(AT)
sll   V0, V0, 1
addu  V0, V0, S1
li    V1, -32768
sh    V1, 0(V0)
L8010A31C:
bnez  S0, L8010A344
 li    V0, 5
jal   0x800EDC40
       NOP
lh    A0, 0x18(SP)
lh    A1, 0x1a(SP)
lh    A2, 0x1c(SP)
lh    A3, 0x1e(SP)
j     L8010A354
 andi  V0, V0, 0xff
L8010A344:
lh    A0, 0x18(SP)
lh    A1, 0x1a(SP)
lh    A2, 0x1c(SP)
lh    A3, 0x1e(SP)
L8010A354:
jal   0x8005F698
 sw    V0, 0x10(SP)
bnez  S2, L8010A2E0
 addiu S0, S0, 1
j     L8010A380
       NOP
L8010A36C:
lh    A0, 0x18(SP)
lh    A1, 0x1a(SP)
lh    A2, 0x1c(SP)
jal   0x8005F744
 lh    A3, 0x1e(SP)
L8010A380:
lui   A0, hi(CORE_80105702_window_id)
lh    A0, lo(CORE_80105702_window_id)(A0)
move  A1, R0
jal   0x8005E1D8
 li    A2, 1
lw    RA, 0x40(SP)
lw    S5, 0x3c(SP)
lw    S4, 0x38(SP)
lw    S3, 0x34(SP)
lw    S2, 0x30(SP)
lw    S1, 0x2c(SP)
lw    S0, 0x28(SP)
jr    RA
 addiu SP, SP, 0x48

func_8010A3B8:
addiu SP, SP, -0x30
sw    RA, 0x28(SP)
sw    S3, 0x24(SP)
sw    S2, 0x20(SP)
sw    S1, 0x1c(SP)
sw    S0, 0x18(SP)
move  S0, A0
move  S2, A1
move  S1, A2
move  S3, A3
li    A0, 1
addiu A1, SP, 0x10
jal   0x80060394
 move  A2, S2
sll   S0, S0, 0x10
sll   S1, S1, 0x10
sra   A0, S0, 0x10
addiu A1, SP, 0x10
jal   0x800EBFE8
 sra   A2, S1, 0x10
move  S0, V0
lui   AT, hi(CORE_80105702_window_id)
sh    S0, lo(CORE_80105702_window_id)(AT)
sll   S0, S0, 0x10
sra   S0, S0, 0x10
move  A0, S0
move  A1, S2
li    A2, -1
jal   0x8005B43C
 li    A3, -1
jal   0x80061388
 move  A0, S0
move  A0, S0
jal   0x800EBF98
 move  A1, S3
move  A0, S0
jal   0x80061A5C
 move  A1, R0
jal   0x8005F364
 move  A0, S0
lw    RA, 0x28(SP)
lw    S3, 0x24(SP)
lw    S2, 0x20(SP)
lw    S1, 0x1c(SP)
lw    S0, 0x18(SP)
jr    RA
 addiu SP, SP, 0x30

func_8010A474:
addiu SP, SP, -0x18
sw    RA, 0x10(SP)
L8010A47C:
jal   0x800E4A7C
       NOP
lui   A0, hi(current_player_index)
lb    A0, lo(current_player_index)(A0)
move  A1, V0
jal   0x800F69F8
 li    A2, 32768
jal   SleepVProcess
       NOP
j     L8010A47C
       NOP
lw    RA, 0x10(SP)
jr    RA
 addiu SP, SP, 0x18

__PP64_INTERNAL_STAR_SPACE_EVENT:
star_space_event:
addiu SP, SP, -0x30
sw    RA, 0x28(SP)
sw    S1, 0x24(SP)
jal   GetCurrentSpaceIndex
 sw    S0, 0x20(SP)
lui   S1, hi(CORE_800CD058)
addiu S1, S1, lo(CORE_800CD058)
sll   V0, V0, 0x10
jal   func_801060E0
 sra   A0, V0, 0x10
sll   V0, V0, 0x10
sra   V0, V0, 0x10
li    V1, 1
bne   V0, V1, L8010A844
       NOP
lui   A0, hi(current_player_index)
jal   0x800DBEC0
 lb    A0, lo(current_player_index)(A0)
li    A0, -1
li    A1, -1
jal   0x800F2304
 li    A2, 2
jal   func_80105E80
       NOP
sll   V0, V0, 0x10
li    A0, -1
li    A1, 8
jal   0x800ED20C
 sra   A2, V0, 0x10
jal   0x8004EE68
       NOP
li    AT, 0x3FCC0000 ; 1.593750
ori   AT, AT, 0xcccd
mtc1  AT, F12
      NOP
jal   0x800E8EDC
 move  S0, V0
move  A0, S0
jal   0x8004ED30
 move  A1, V0
jal   0x8004EE18
       NOP
jal   PlaySound
 li    A0, 345
lui   V1, hi(current_player_index)
lb    V1, lo(current_player_index)(V1)
sll   V0, V1, 3
subu  V0, V0, V1
sll   V1, V0, 3
lui   V0, hi(CORE_800D1123)
addu  V0, V0, V1
lb    V0, lo(CORE_800D1123)(V0)
beqz  V0, L8010A5CC
 li    A0, 22
lui   A2, hi(p1_char)
addu  A2, A2, V1
lbu   A2, lo(p1_char)(A2)
sw    R0, 0x10(SP)
sw    R0, 0x14(SP)
sw    R0, 0x18(SP)
li    A1, 0x4805
addiu A2, A2, 0x1c00
jal   0x800EC8EC ; ShowMessage: "WAHH! Buh-Bowser! Oh, pardon me. Please, take this! ..."
 move  A3, R0
jal   0x800EC9DC
       NOP
jal   0x800EC6C8
       NOP
jal   0x800EC6EC
       NOP
L8010A5CC:
lb    V0, 0xf(S1)
sll   V1, V0, 3
subu  V1, V1, V0
sll   V1, V1, 3
lui   V0, hi(p1_stars)
addu  V0, V0, V1
lb    V0, lo(p1_stars)(V0)
slti  V0, V0, MAX_PLAYER_STAR_COUNT
bnez  V0, L8010A5FC
 li    A0, 22
j     L8010A7B8
 li    A1, 0x4804 ; "You can't carry any more stars"
L8010A5FC:
lb    V0, 0xf(S1)
sll   V1, V0, 3
subu  V1, V1, V0
sll   V1, V1, 3
lui   V0, hi(p1_coins)
addu  V0, V0, V1
lh    V0, lo(p1_coins)(V0)
slti  V0, V0, 0x14
bnezl V0, L8010A7B8
 li    A1, 0x4801 ; "Oh dear, you don't have 20 coins"
L8010A624:
lb    V1, 0xf(S1)
sll   V0, V1, 3
subu  V0, V0, V1
sll   V0, V0, 3
lui   A2, hi(p1_char)
addu  A2, A2, V0
lbu   A2, lo(p1_char)(A2)
sw    R0, 0x10(SP)
sw    R0, 0x14(SP)
sw    R0, 0x18(SP)
li    A0, 22
li    A1, 0x4800
addiu A2, A2, 0x1c00
jal   0x800EC8EC ; ShowMessage: "You made it! So you want to trade coins for a star?"
 move  A3, R0
li    A0, 2
jal   __PP64_INTERNAL_BASIC_MESSAGE_CHOICE
 move  A1, R0
jal   0x800EC6C8
 move  S0, V0
jal   0x800EC6EC
 sll   S0, S0, 0x10
sra   S0, S0, 0x10
li    V0, 1
beq   S0, V0, L8010A74C ; Did they choose No?
 slti  V0, S0, 2
beql  V0, R0, L8010A6A4 ; is choice >= 2?
 li    V0, 2
beqz  S0, L8010A6B4 ; Did they choose yes?
       NOP
j     L8010A844
       NOP
L8010A6A4:
beq   S0, V0, L8010A7A8 ; Did they choose View Map?
       NOP
j     L8010A844
       NOP
L8010A6B4:
lb    A0, 0xf(S1)
jal   ShowPlayerCoinChange
 li    A1, -20
lb    A0, 0xf(S1)
jal   AdjustPlayerCoinsGradual
 li    A1, -20
jal   SleepProcess
 li    A0, 30
li    A0, 22
jal   0x800EC590 ; update existing window with new message?
 li    A1, 0x4802  ; "Then take this star"
lui   V0, hi(CORE_800A12D0)
lb    V0, lo(CORE_800A12D0)(V0)
beqz  V0, L8010A718
       NOP
jal   0x8004A950
       NOP
lui   A0, hi(CORE_800C9930)
lh    A0, lo(CORE_800C9930)(A0)
jal   0x800039A4
 li    A1, 60
li    V0, -1
lui   AT, hi(CORE_800C9930)
j     L8010A720
 sh    V0, lo(CORE_800C9930)(AT)
L8010A718:
jal   0x8004A994
 li    A0, 90
L8010A720:
lui   A0, hi(D_8011FA70)
jal   func_80106EEC
 lw    A0, lo(D_8011FA70)(A0)
jal   SleepProcess
 li    A0, 30
jal   0x800EDA58
       NOP
jal   0x800FF7F0
 li    A0, 2
j     L8010A844
       NOP
L8010A74C:
lui   V0, hi(CORE_800A12D0)
lb    V0, lo(CORE_800A12D0)(V0)
beqz  V0, L8010A798
 li    A0, 22
lui   A0, hi(CORE_800C9930)
lh    A0, lo(CORE_800C9930)(A0)
jal   0x800039A4
 li    A1, 60
lui   A0, hi(CORE_800CE198)
jal   0x80003310
 lh    A0, lo(CORE_800CE198)(A0)
jal   0x8004A670
 move  A0, R0
jal   0x8004A72C
 li    A0, 90
li    V0, -1
lui   AT, hi(CORE_800C9930)
sh    V0, lo(CORE_800C9930)(AT)
li    A0, 22
L8010A798:
jal   0x800EC590
 li    A1, 0x4803 ; "What?!? You don't need a star? ..."
j     L8010A808
       NOP
L8010A7A8:
jal   __PP64_INTERNAL_VIEW_MAP
       NOP
j     L8010A624
       NOP
L8010A7B8:
jal   0x800EC590
       NOP
lui   V0, hi(CORE_800A12D0)
lb    V0, lo(CORE_800A12D0)(V0)
beqz  V0, L8010A808
       NOP
lui   A0, hi(CORE_800C9930)
lh    A0, lo(CORE_800C9930)(A0)
jal   0x800039A4
 li    A1, 60
lui   A0, hi(CORE_800CE198)
jal   0x80003310
 lh    A0, lo(CORE_800CE198)(A0)
jal   0x8004A670
 move  A0, R0
jal   0x8004A72C
 li    A0, 90
li    V0, -1
lui   AT, hi(CORE_800C9930)
sh    V0, lo(CORE_800C9930)(AT)
L8010A808:
jal   0x800DB884
 lb    A0, 0xf(S1)
jal   0x8004EE68
       NOP
li    AT, 0x3FA60000 ; 1.296875
ori   AT, AT, 0x6666
mtc1  AT, F12
      NOP
jal   0x800E8EDC
 move  S0, V0
move  A0, S0
jal   0x8004ED30
 move  A1, V0
jal   0x8004EE18
       NOP
L8010A844:
lw    RA, 0x28(SP)
lw    S1, 0x24(SP)
lw    S0, 0x20(SP)
jr    RA
 addiu SP, SP, 0x30

__PP64_INTERNAL_BANK_SPACE_EVENT:
bank_space_event:
addiu SP, SP, -0xa0
sw    RA, 0x68(SP)
sw    S5, 0x64(SP)
sw    S4, 0x60(SP)
sw    S3, 0x5c(SP)
sw    S2, 0x58(SP)
sw    S1, 0x54(SP)
sw    S0, 0x50(SP)
sdc1  F30, 0x98(SP)
sdc1  F28, 0x90(SP)
sdc1  F26, 0x88(SP)
sdc1  F24, 0x80(SP)
sdc1  F22, 0x78(SP)
sdc1  F20, 0x70(SP)
jal   GetCurrentSpaceIndex
 move  S5, R0
move  S0, V0
lui   S4, hi(CORE_800CD058)
addiu S4, S4, lo(CORE_800CD058)
move  S1, R0
lui   A0, hi(current_player_index)
lb    A0, lo(current_player_index)(A0)
jal   0x800DCD9C
 move  S3, R0
bgtz  V0, L8010A8D4
 li    A0, -1
jal   0x800FF900
 li    A1, 3
li    A0, -1
L8010A8D4:
li    A1, -1
jal   0x800F2304
 li    A2, 2
sll   V0, S0, 0x10
sra   V1, V0, 0x10
li    V0, ${bankEventSpaces[0]}
beq   V1, V0, L8010A91C
 li    V0, ${bankEventSpaces[1]}
bne   V1, V0, L8010A948
 li    A0, -1
li    A1, 8
jal   0x800ED20C
 li    A2, ${bestBankForBankSpaces[1]}
jal   GetSpaceData
 li    A0, ${bestBankForBankSpaces[1]}
move  S1, V0
j     L8010A93C
 li    A0, ${bankEventSpaces[1]}
L8010A91C:
li    A0, -1
li    A1, 8
jal   0x800ED20C
 li    A2, ${bestBankForBankSpaces[0]}
jal   GetSpaceData
 li    A0, ${bestBankForBankSpaces[0]}
move  S1, V0
li    A0, ${bankEventSpaces[0]}
L8010A93C:
jal   GetSpaceData
       NOP
move  S3, V0
L8010A948:
jal   SleepProcess
 li    A0, 8
lb    A0, 0xf(S4)
jal   0x800DCD9C
       NOP
blez  V0, L8010A96C
       NOP
jal   0x800DBEC0
 lb    A0, 0xf(S4)
L8010A96C:
jal   PlaySound
 li    A0, 276
li    A0, 50
jal   0x800D90C8
 move  A1, R0
move  S2, V0
jal   0x800D9714
 move  A0, S2
addiu S0, SP, 0x40
addiu S1, S1, 8
move  A0, S0
addiu A1, S3, 8
jal   midpoint
 move  A2, S1
jal   0x800D88E8
 move  A0, S0
addiu A0, S2, 0x18
jal   0x80089A20
 move  A1, S0
sw    R0, 0x28(S2)
addiu A0, S2, 0xc
jal   0x80089A20
 move  A1, S1
move  A0, S2
li    A1, -1
jal   0x800D9CE8
 li    A2, 1
jal   0x800D9A40
 move  A0, S2
lui   A1, hi(D_8011E070)
addiu A1, A1, lo(D_8011E070)
jal   0x800D90C8
 li    A0, 53
move  S3, V0
jal   0x800D9714
 move  A0, S3
addiu A0, S3, 0x18
jal   0x80089A20
 move  A1, S0
addiu A0, S3, 0xc
jal   0x80089A20
 move  A1, S1
li    AT, 0x3F990000 ; 1.195312
ori   AT, AT, 0x999a
mtc1  AT, F0
      NOP
swc1  F0, 0x2c(S3)
swc1  F0, 0x24(S3)
swc1  F0, 0x28(S3)
jal   0x800D9B24
 move  A0, S3
li    AT, 0x42480000 ; 50.000000
mtc1  AT, F12
jal   0x8008EF20
       NOP
li    AT, 0x3F800000 ; 1.000000
mtc1  AT, F2
      NOP
div.s F22, F2, F0
mtc1  R0, F20
li    AT, 0x3E4C0000 ; 0.199219
ori   AT, AT, 0xcccd
mtc1  AT, F26
li    AT, 0x3F4C0000 ; 0.796875
ori   AT, AT, 0xcccd
mtc1  AT, F24
li    AT, 0x41340000 ; 11.250000
mtc1  AT, F30
li    AT, 0x42B40000 ; 90.000000
mtc1  AT, F28
      NOP
L8010AA88:
jal   0x8008EF20
 mov.s F12, F20
mul.s F0, F0, F22
swc1  F0, 0x28(S2)
jal   0x8008EF20
 mov.s F12, F20
mul.s F0, F0, F22
      NOP
mul.s F0, F0, F26
add.s F0, F0, F24
swc1  F0, 0x24(S2)
jal   0x8008EF20
 mov.s F12, F20
mul.s F0, F0, F22
      NOP
mul.s F0, F0, F26
add.s F0, F0, F24
jal   SleepVProcess
 swc1  F0, 0x2c(S2)
add.s F20, F20, F30
c.lt.s F20, F28
      NOP
bc1t  L8010AA88
       NOP
li    AT, 0x42480000 ; 50.000000
mtc1  AT, F0
      NOP
c.lt.s F0, F20
      NOP
bc1f  L8010AB90
       NOP
li    AT, 0x3E4C0000 ; 0.199219
ori   AT, AT, 0xcccd
mtc1  AT, F26
li    AT, 0x3F4C0000 ; 0.796875
ori   AT, AT, 0xcccd
mtc1  AT, F24
li    AT, 0x41340000 ; 11.250000
mtc1  AT, F30
li    AT, 0x42480000 ; 50.000000
mtc1  AT, F28
      NOP
L8010AB30:
jal   0x8008EF20
 mov.s F12, F20
mul.s F0, F0, F22
swc1  F0, 0x28(S2)
jal   0x8008EF20
 mov.s F12, F20
mul.s F0, F0, F22
      NOP
mul.s F0, F0, F26
add.s F0, F0, F24
swc1  F0, 0x24(S2)
jal   0x8008EF20
 mov.s F12, F20
mul.s F0, F0, F22
      NOP
mul.s F0, F0, F26
add.s F0, F0, F24
jal   SleepVProcess
 swc1  F0, 0x2c(S2)
sub.s F20, F20, F30
c.lt.s F28, F20
      NOP
bc1t  L8010AB30
       NOP
L8010AB90:
li    AT, 0x3F800000 ; 1.000000
mtc1  AT, F0
      NOP
swc1  F0, 0x28(S2)
swc1  F0, 0x24(S2)
swc1  F0, 0x2c(S2)
jal   0x800D9A40
 move  A0, S3
li    A0, -1
jal   PlayerHasItem
 li    A1, ITEM_KOOPA_CARD
li    V1, -1
beq   V0, V1, L8010AC3C
 move  A0, S2
sw    R0, 0x10(SP)
L8010ABCC:
sw    R0, 0x14(SP)
sw    R0, 0x18(SP)
li    A0, -1
li    A1, 0x3A1D ; "Would you like to use your Koopa Kard at this bank?"
move  A2, R0
jal   0x800EC8EC ; ShowMessage
 move  A3, R0
lui   A0, hi(D_8011E058)
addiu A0, A0, lo(D_8011E058)
jal   __PP64_INTERNAL_BASIC_MESSAGE_CHOICE
 move  A1, R0
jal   0x800EC6C8
 move  S0, V0
jal   0x800EC6EC
       NOP
beqz  S0, L8010AC20
 li    V0, 2
beq   S0, V0, L8010AC28
 move  A0, S2
j     L8010AC3C
       NOP
L8010AC20:
j     L8010AC38
 li    S5, 1
L8010AC28:
jal   __PP64_INTERNAL_VIEW_MAP
       NOP
j     L8010ABCC
 sw    R0, 0x10(SP)
L8010AC38:
move  A0, S2
L8010AC3C:
li    A1, -1
jal   0x800D9CE8
 move  A2, R0
lw    V0, 0x3c(S2)
lw    V0, 0x40(V0)
lh    A0, 0(V0)
lui A1, 0x3f99
jal   0x8001C92C
 ori A1, A1, 0x999a
L8010AC60:
jal   0x800D9E0C
 move  A0, S2
andi  V0, V0, 0xffff
bnez  V0, L8010AC84
       NOP
jal   SleepVProcess
       NOP
j     L8010AC60
       NOP
L8010AC84:
jal   PlaySound
 li    A0, 601
move  A0, S3
move  A1, R0
jal   0x800D9CE8
 move  A2, R0
L8010AC9C:
jal   0x800D9E0C
 move  A0, S3
andi  V0, V0, 0xffff
bnez  V0, L8010ACC0
 move  A0, S3
jal   SleepVProcess
       NOP
j     L8010AC9C
       NOP
L8010ACC0:
li    A1, -1
jal   0x800D9CE8
 li    A2, 2
beqz  S5, L8010AE0C
       NOP
lui   S0, hi(bank_coin_total)
addiu S0, S0, lo(bank_coin_total)
lui   A1, hi(percent_d_str_format)
addiu A1, A1, lo(percent_d_str_format)
lh    A2, 0(S0)
jal   sprintf
 addiu A0, SP, 0x20
lh    V0, 0(S0)
beqz  V0, L8010AD14
 li    A0, 2
sw    R0, 0x10(SP)
sw    R0, 0x14(SP)
sw    R0, 0x18(SP)
li    A1, 14878
j     L8010AD28
 addiu A2, SP, 0x20
L8010AD14:
sw    R0, 0x10(SP)
sw    R0, 0x14(SP)
sw    R0, 0x18(SP)
li    A1, 0x3A1F ; "So you'd like to use your card today?"
move  A2, R0
L8010AD28:
jal   0x800EC8EC ; ShowMessage
 move  A3, R0
jal   0x800EC9DC
       NOP
jal   0x800EC6C8
       NOP
jal   0x800EC6EC
       NOP
lui   V0, hi(bank_coin_total)
lh    V0, lo(bank_coin_total)(V0)
beql  V0, R0, L8010AD74
 sw    R0, 0x10(SP)
lui   AT, hi(CORE_800D037C)
jal   func_80112FA8
 sh    R0, lo(CORE_800D037C)(AT)
li    V0, 1
lui   AT, hi(CORE_800D037C)
j     func_8010ADEC
 sh    V0, lo(CORE_800D037C)(AT)
L8010AD74:
sw    R0, 0x14(SP)
sw    R0, 0x18(SP)
li    A0, 2
li    A1, 14881
move  A2, R0
jal   0x800EC8EC ; ShowMessage
 move  A3, R0
jal   0x800EC9DC
       NOP
jal   0x800EC6C8
       NOP
jal   0x800EC6EC
       NOP
li    A0, -1
jal   PlayerHasItem
 li    A1, ITEM_KOOPA_CARD
lb    A0, 0xf(S4)
sll   V1, A0, 3
subu  V1, V1, A0
sll   V1, V1, 3
lui   A0, hi(p1_item1)
addiu A0, A0, lo(p1_item1)
addu  V1, V1, A0
addu  V1, V1, V0
li    V0, -1
sb    V0, 0(V1)
jal   FixUpPlayerItemSlots
 lb    A0, 0xf(S4)
jal   0x800F63F0
 lb    A0, 0xf(S4)
func_8010ADEC:
jal   0x800DCD9C
 lb    A0, 0xf(S4)
blez  V0, L8010B138
       NOP
jal   0x800DB884
 lb    A0, 0xf(S4)
j     L8010B138
       NOP
L8010AE0C:
jal   0x800DCD9C
 lb    A0, 0xf(S4)
blez  V0, L8010B04C
       NOP
lb    V1, 0xf(S4)
sll   V0, V1, 3
subu  V0, V0, V1
sll   V0, V0, 3
lui   A2, hi(p1_coins)
addu  A2, A2, V0
lh    A2, lo(p1_coins)(A2)
sltu  V0, R0, A2
slti  V1, A2, 5
and   V0, V0, V1
beqz  V0, L8010AF38
       NOP
lui   A1, hi(percent_d_str_format)
addiu A1, A1, lo(percent_d_str_format)
jal   sprintf
 addiu A0, SP, 0x20
addiu S1, SP, 0x30
lui   S0, hi(bank_coin_total)
addiu S0, S0, lo(bank_coin_total)
lh    A3, 0(S0)
lb    V1, 0xf(S4)
sll   V0, V1, 3
subu  V0, V0, V1
sll   V0, V0, 3
lui   A2, hi(p1_coins)
addu  A2, A2, V0
lh    A2, lo(p1_coins)(A2)
move  A0, S1
lui   A1, hi(percent_d_str_format)
addiu A1, A1, lo(percent_d_str_format)
jal   sprintf
 addu  A2, A3, A2
sw    R0, 0x10(SP)
sw    R0, 0x14(SP)
sw    R0, 0x18(SP)
li    A0, 2
li    A1, 0x1201
addiu A2, SP, 0x20
jal   0x800EC8EC ; ShowMessage: "Welcome to the Koopa Bank."
 move  A3, S1
jal   0x800EC6C8
       NOP
lb    V1, 0xf(S4)
sll   V0, V1, 3
subu  V0, V0, V1
sll   V0, V0, 3
lhu   V1, 0(S0)
lui   AT, hi(p1_coins)
addu  AT, AT, V0
lhu   V0, lo(p1_coins)(AT)
addu  V1, V1, V0
jal   func_80108478
 sh    V1, 0(S0)
lb    A0, 0xf(S4)
sll   V0, A0, 3
subu  V0, V0, A0
sll   V0, V0, 3
lui   A1, hi(p1_coins)
addu  A1, A1, V0
lh    A1, lo(p1_coins)(A1)
jal   ShowPlayerCoinChange
 subu  A1, R0, A1
lb    A0, 0xf(S4)
sll   V0, A0, 3
subu  V0, V0, A0
sll   V0, V0, 3
lui   A1, hi(p1_coins)
addu  A1, A1, V0
lh    A1, lo(p1_coins)(A1)
j     func_8010B004
 subu  A1, R0, A1
L8010AF38:
lb    V0, 0xf(S4)
sll   V1, V0, 3
subu  V1, V1, V0
sll   V1, V1, 3
lui   V0, hi(p1_coins)
addu  V0, V0, V1
lh    V0, lo(p1_coins)(V0)
bnezl V0, L8010AF9C
 addiu A0, SP, 0x20
lui   A1, hi(percent_d_str_format)
addiu A1, A1, lo(percent_d_str_format)
lui   A2, hi(bank_coin_total)
lh    A2, lo(bank_coin_total)(A2)
jal   sprintf
 addiu A0, SP, 0x20
sw    R0, 0x10(SP)
sw    R0, 0x14(SP)
sw    R0, 0x18(SP)
li    A0, 2
li    A1, 4610
addiu A2, SP, 0x20
jal   0x800EC8EC ; ShowMessage
 move  A3, R0
j     func_8010B01C
       NOP
L8010AF9C:
lui   S0, hi(bank_coin_total)
addiu S0, S0, lo(bank_coin_total)
lh    A2, 0(S0)
lui   A1, hi(percent_d_str_format)
addiu A1, A1, lo(percent_d_str_format)
jal   sprintf
 addiu A2, A2, 5
sw    R0, 0x10(SP)
sw    R0, 0x14(SP)
sw    R0, 0x18(SP)
li    A0, 2
li    A1, 0x1200
addiu A2, SP, 0x20
jal   0x800EC8EC ; ShowMessage "I must ask for a deposit..."
 move  A3, R0
jal   0x800EC6C8
       NOP
lhu   V0, 0(S0)
addiu V0, V0, 5
jal   func_80108478
 sh    V0, 0(S0)
lb    A0, 0xf(S4)
jal   ShowPlayerCoinChange
 li    A1, -5
lb    A0, 0xf(S4)
li    A1, -5
func_8010B004:
jal   AdjustPlayerCoinsGradual
       NOP
jal   SleepProcess
 li    A0, 30
jal   0x800EC6A8
       NOP
func_8010B01C:
jal   0x800EC9DC
       NOP
jal   0x800EC6C8
       NOP
jal   0x800EC6EC
       NOP
jal   0x800DB884
 lb    A0, 0xf(S4)
jal   SleepProcess
 li    A0, 10
j     L8010B138
       NOP
L8010B04C:
lui   S0, hi(bank_coin_total)
addiu S0, S0, lo(bank_coin_total)
lh    A2, 0(S0)
beql  A2, R0, L8010B130
 li    A0, 2
lui   A1, hi(percent_d_str_format)
addiu A1, A1, lo(percent_d_str_format)
jal   sprintf
 addiu A0, SP, 0x20
sw    R0, 0x10(SP)
sw    R0, 0x14(SP)
sw    R0, 0x18(SP)
li    A0, 2
li    A1, 0x1203
addiu A2, SP, 0x20
jal   0x800EC8EC ; ShowMessage "Hooray! ... you get all the coins we've collected! ..."
 move  A3, R0
jal   0x800EC9DC
       NOP
jal   0x800EC6C8
       NOP
lb    A0, 0xf(S4)
jal   ShowPlayerCoinChange
 lh    A1, 0(S0)
lb    A0, 0xf(S4)
jal   AdjustPlayerCoinsGradual
 lh    A1, 0(S0)
jal   func_80108478
 sh    R0, 0(S0)
jal   GetPlayerStruct
 li    A0, -1
lw    A0, 0x24(V0)
jal   0x800ECC0C
 addiu A0, A0, 0x18
li    A0, -1
li    A1, 5
jal   0x800F2304
 move  A2, R0
lb    A1, 0xf(S4)
jal   0x8004ACE0
 li    A0, 628
jal   SleepProcess
 li    A0, 30
li    A0, -1
li    A1, -1
jal   0x800F2304
 li    A2, 2
jal   0x800EC6A8
       NOP
jal   0x800EC9DC
       NOP
jal   0x800EC6C8
       NOP
jal   0x800EC6EC
       NOP
j     L8010B138
       NOP
L8010B130:
jal   0x800EC590
 li    A1, 0x1204 ; "You won ... we don't have even 1 coin"
L8010B138:
jal   PlaySound
 li    A0, 277
move  A0, S2
li    A1, -1
jal   0x800D9CE8
 li    A2, 4
lw    V0, 0x3c(S2)
lw    V0, 0x40(V0)
lh    A0, 0(V0)
lui A1, 0x3f99
jal   0x8001C92C
 ori A1, A1, 0x999a
lw    V0, 0x3c(S2)
lw    V0, 0x40(V0)
lh    A0, 0(V0)
lui   V1, hi(CORE_800D03F8)
lw    V1, lo(CORE_800D03F8)(V1)
sll   V0, A0, 1
addu  V0, V0, A0
sll   V0, V0, 6
addu  V0, V0, V1
lbu   V1, 2(V0)
lui   A1, hi(CORE_800CCF58)
lw    A1, lo(CORE_800CCF58)(A1)
sll   V0, V1, 1
addu  V0, V0, V1
sll   V0, V0, 3
addu  V0, V0, A1
lh    V0, 2(V0)
mtc1  V0, F4
      NOP
cvt.s.w F4, F4
mfc1  A1, F4
jal   0x8001C6A8
       NOP
L8010B1C4:
jal   0x800D9E80
 move  A0, S2
andi  V0, V0, 0xffff
bnez  V0, L8010B1E8
       NOP
jal   SleepVProcess
       NOP
j     L8010B1C4
       NOP
L8010B1E8:
jal   0x800D9B24
 move  A0, S3
li    AT, 0x42480000 ; 50.000000
mtc1  AT, F12
jal   0x8008EF20
       NOP
li    AT, 0x3F800000 ; 1.000000
mtc1  AT, F2
      NOP
div.s F22, F2, F0
li    AT, 0x42480000 ; 50.000000
mtc1  AT, F20
li    AT, 0x3E4C0000 ; 0.199219
ori AT, AT, 0xcccd
mtc1  AT, F26
li    AT, 0x3F4C0000 ; 0.796875
ori AT, AT, 0xcccd
mtc1  AT, F24
li    AT, 0x41340000 ; 11.250000
mtc1  AT, F30
li    AT, 0x42B40000 ; 90.000000
mtc1  AT, F28
      NOP
L8010B244:
jal   0x8008EF20
 mov.s F12, F20
mul.s F0, F0, F22
swc1  F0, 0x28(S2)
jal   0x8008EF20
 mov.s F12, F20
mul.s F0, F0, F22
      NOP
mul.s F0, F0, F26
add.s F0, F0, F24
swc1  F0, 0x24(S2)
jal   0x8008EF20
 mov.s F12, F20
mul.s F0, F0, F22
      NOP
mul.s F0, F0, F26
add.s F0, F0, F24
jal   SleepVProcess
 swc1  F0, 0x2c(S2)
add.s F20, F20, F30
c.lt.s F20, F28
      NOP
bc1t  L8010B244
       NOP
li    AT, 0x42B40000 ; 90.000000
mtc1  AT, F20
li    AT, 0x3E4C0000 ; 0.199219
ori AT, AT, 0xcccd
mtc1  AT, F26
li    AT, 0x3F4C0000 ; 0.796875
ori AT, AT, 0xcccd
mtc1  AT, F24
li    AT, 0x41340000 ; 11.250000
mtc1  AT, F30
mtc1  R0, F28
      NOP
L8010B2D4:
jal   0x8008EF20
 mov.s F12, F20
mul.s F0, F0, F22
swc1  F0, 0x28(S2)
jal   0x8008EF20
 mov.s F12, F20
mul.s F0, F0, F22
      NOP
mul.s F0, F0, F26
add.s F0, F0, F24
swc1  F0, 0x24(S2)
jal   0x8008EF20
 mov.s F12, F20
mul.s F0, F0, F22
      NOP
mul.s F0, F0, F26
add.s F0, F0, F24
jal   SleepVProcess
 swc1  F0, 0x2c(S2)
sub.s F20, F20, F30
c.lt.s F28, F20
      NOP
bc1t  L8010B2D4
       NOP
sw    R0, 0x28(S2)
sw    R0, 0x24(S2)
sw    R0, 0x2c(S2)
jal   0x800D9B54
 move  A0, S2
jal   0x800D9B54
 move  A0, S3
lw    RA, 0x68(SP)
lw    S5, 0x64(SP)
lw    S4, 0x60(SP)
lw    S3, 0x5c(SP)
lw    S2, 0x58(SP)
lw    S1, 0x54(SP)
lw    S0, 0x50(SP)
ldc1  F30, 0x98(SP)
ldc1  F28, 0x90(SP)
ldc1  F26, 0x88(SP)
ldc1  F24, 0x80(SP)
ldc1  F22, 0x78(SP)
ldc1  F20, 0x70(SP)
jr    RA
 addiu SP, SP, 0xa0

func_8010B394:
move  A3, A0
move  A1, R0
lui   A2, hi(D_8011FB54)
lw    A2, lo(D_8011FB54)(A2)
lui   V0, hi(D_8011FB4C)
lw    V0, lo(D_8011FB4C)(V0)
lui   A0, hi(D_8011E0A0)
addiu A0, A0, lo(D_8011E0A0)
sll   V1, V0, 3
addu  V1, V1, V0
sll   V1, V1, 2
subu  V1, V1, V0
addu  V1, V1, A0
lui   A0, hi(D_8011FB50)
lw    A0, lo(D_8011FB50)(A0)
sll   V0, A0, 3
subu  V0, V0, A0
addu  V1, V0, V1
addu  V0, A2, A1
L8010B3E0:
lbu   V0, 0(V0)
beqz  V0, L8010B400
 addu  V0, V1, A1
lb    V0, 0(V0)
bnel  V0, A3, L8010B404
 addiu A1, A1, 1
j     L8010B414
 move  V0, A1
L8010B400:
addiu A1, A1, 1
L8010B404:
slti  V0, A1, 7
bnez  V0, L8010B3E0
 addu  V0, A2, A1
li    V0, -1
L8010B414:
jr    RA
       NOP

func_8010B41C:
move  A1, R0
lui   V0, hi(D_8011FB4C)
lw    V0, lo(D_8011FB4C)(V0)
lui   A0, hi(D_8011E0A0)
addiu A0, A0, lo(D_8011E0A0)
sll   V1, V0, 3
addu  V1, V1, V0
sll   V1, V1, 2
subu  V1, V1, V0
addu  V1, V1, A0
lui   A0, hi(D_8011FB50)
lw    A0, lo(D_8011FB50)(A0)
sll   V0, A0, 3
subu  V0, V0, A0
addu  V1, V0, V1
li    A0, -1
addu  V0, V1, A1
L8010B460:
lb    V0, 0(V0)
beq   V0, A0, L8010B47C
       NOP
addiu A1, A1, 1
slti  V0, A1, 7
bnezl V0, L8010B460
 addu  V0, V1, A1
L8010B47C:
jr    RA
 move  V0, A1

D_8010B484:
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
jal   0x8004EE68
 sdc1  F20, 0x20(SP)
lw    S1, 0x8c(V0)
lui   A0, hi(current_player_index)
lb    A0, lo(current_player_index)(A0)
jal   GetPlayerStruct
 sll   S0, S1, 0x10
li    A0, -1
jal   0x800FF900
 li    A1, 2
jal   PlaySound
 li    A0, 346
mtc1  R0, F20
li    S2, 0x3FC00000 ; 1.500000
li    AT, 0x3F800000 ; 1.000000
mtc1  AT, F24
li    AT, 0x3F000000 ; 0.500000
mtc1  AT, F30
li    AT, 0x41A00000 ; 20.000000
mtc1  AT, F28
li    AT, 0x43340000 ; 180.000000
mtc1  AT, F26
      NOP
L8010B508:
jal   0x8008EF20
 mov.s F12, F20
mtc1  S2, F2
      NOP
mul.s F0, F0, F2
add.s F22, F0, F24
jal   0x8008EF20
 mov.s F12, F20
mul.s F0, F0, F30
sra   A0, S0, 0x10
mfc1  A2, F22
sub.s F0, F24, F0
mfc1  A3, F0
      NOP
jal   0x800551D8
 move  A1, R0
jal   SleepVProcess
       NOP
add.s F20, F20, F28
c.lt.s F20, F26
      NOP
bc1t  L8010B508
       NOP
li    AT, 0x43B40000 ; 360.000000
mtc1  AT, F0
      NOP
c.lt.s F20, F0
      NOP
      NOP
bc1f  L8010B610
 sll   A0, S1, 0x10
li    S2, 0x3F000000 ; 0.500000
li    AT, 0x3F800000 ; 1.000000
mtc1  AT, F24
li    AT, 0x3E800000 ; 0.250000
mtc1  AT, F30
sll   S0, S1, 0x10
li    AT, 0x41A00000 ; 20.000000
mtc1  AT, F28
li    AT, 0x43B40000 ; 360.000000
mtc1  AT, F26
      NOP
L8010B5B0:
jal   0x8008EF20
 mov.s F12, F20
mtc1  S2, F2
      NOP
mul.s F0, F0, F2
add.s F22, F0, F24
jal   0x8008EF20
 mov.s F12, F20
mul.s F0, F0, F30
sra   A0, S0, 0x10
mfc1  A2, F22
sub.s F0, F24, F0
mfc1  A3, F0
      NOP
jal   0x800551D8
 move  A1, R0
jal   SleepVProcess
       NOP
add.s F20, F20, F28
c.lt.s F20, F26
      NOP
      NOP
bc1t  L8010B5B0
 sll   A0, S1, 0x10
L8010B610:
sra   A0, A0, 0x10
move  A1, R0
lui   A2, 0x3f80
jal   0x800551D8
 move  A3, A2
jal   EndProcess
 move  A0, R0
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

__PP64_INTERNAL_ITEM_SHOP_EVENT:
item_shop_event:
addiu SP, SP, -0xe8
sw    RA, 0xb4(SP)
sw    FP, 0xb0(SP)
sw    S7, 0xac(SP)
sw    S6, 0xa8(SP)
sw    S5, 0xa4(SP)
sw    S4, 0xa0(SP)
sw    S3, 0x9c(SP)
sw    S2, 0x98(SP)
sw    S1, 0x94(SP)
sw    S0, 0x90(SP)
sdc1  F30, 0xe0(SP)
sdc1  F28, 0xd8(SP)
sdc1  F26, 0xd0(SP)
sdc1  F24, 0xc8(SP)
sdc1  F22, 0xc0(SP)
sdc1  F20, 0xb8(SP)
jal   GetPlayerStruct
 li    A0, -1
sw    V0, 0x74(SP)
move  S5, R0
move  S3, R0
move  S4, R0
sw    R0, 0x7c(SP)
li    A0, -1
li    A1, -1
jal   0x800F2304
 li    A2, 2
lw    T5, 0x74(SP)
lbu   A0, 0xf(T5)
sll   A0, A0, 0x18
sra   A0, A0, 0x18
lbu   A1, 0x10(T5)
sll   A1, A1, 0x18
sra   A1, A1, 0x18
andi  A0, A0, 0xffff
jal   GetAbsSpaceIndexFromChainSpaceIndex
 andi  A1, A1, 0xffff
sll   V0, V0, 0x10
sra   V1, V0, 0x10
li    V0, ${itemShopEventSpaces[0]}
beq   V1, V0, L8010B718
 li    V0, ${itemShopEventSpaces[1]}
beq   V1, V0, L8010B744
 li    T5, ${bestShopForShopEventSpaces[1]}
j     L8010B770
 li    T5, -1
L8010B718:
li    T5, ${bestShopForShopEventSpaces[0]}
sh    T5, 0x6e(SP)
jal   GetSpaceData
 li    A0, ${bestShopForShopEventSpaces[0]}
move  S5, V0
jal   GetSpaceData
 li    A0, ${itemShopEventSpaces[0]}
lui   AT, hi(D_8011E1D8)
sw    R0, lo(D_8011E1D8)(AT)
j     L8010B774
 move  S3, V0
L8010B744:
sh    T5, 0x6e(SP)
jal   GetSpaceData
 li    A0, ${bestShopForShopEventSpaces[1]}
move  S5, V0
jal   GetSpaceData
 li    A0, ${itemShopEventSpaces[1]}
move  S3, V0
li    V0, 1
lui   AT, hi(D_8011E1D8)
j     L8010B774
 sw    V0, lo(D_8011E1D8)(AT)
L8010B770:
sh    T5, 0x6e(SP)
L8010B774:
lhu   T5, 0x6e(SP)
sll   V0, T5, 0x10
sra   A2, V0, 0x10
li    V0, -1
beq   A2, V0, L8010B79C
 li    A0, -1
jal   0x800ED20C
 li    A1, 8
jal   SleepProcess
 li    A0, 8
L8010B79C:
lui   A0, hi(current_player_index)
jal   0x800DBEC0
 lb    A0, lo(current_player_index)(A0)
lui   V1, hi(CORE_800CD0AC)
lh    V1, lo(CORE_800CD0AC)(V1)
beqz  V1, L8010B7C8
 li    V0, 1
beq   V1, V0, L8010B7DC
 move  S6, R0
j     L8010B7DC
 li    S6, 1
L8010B7C8:
jal   RNGPercentChance
 li    A0, 66
sll   V0, V0, 0x10
sltiu V0, V0, 1
move  S6, V0
L8010B7DC:
move  V0, S6
beqz  V0, L8010B7EC
 li    FP, 3
li    FP, 5
L8010B7EC:
lhu   T5, 0x6e(SP)
sll   V0, T5, 0x10
sra   V0, V0, 0x10
li    V1, -1
beq   V0, V1, L8010BB6C
 move  S2, S6
subu  S0, R0, S6
andi  S0, S0, 0x31
ori   S0, S0, 0x30
jal   PlaySound
 li    A0, 276 ; raw 0x50, shop appearing noise
andi  A0, S0, 0xff
jal   0x800D90C8
 move  A1, R0
move  S4, V0
jal   0x800D9714
 move  A0, S4
addiu S0, SP, 0x48
addiu S1, S5, 8
move  A0, S0
addiu A1, S3, 8
jal   midpoint
 move  A2, S1
jal   0x800D88E8
 move  A0, S0
addiu A0, S4, 0x18
jal   0x80089A20
 move  A1, S0
sw    R0, 0x28(S4)
move  A0, S4
li    A1, -1
jal   0x800D9CE8
 li    A2, 1
jal   0x800D9A40
 move  A0, S4
addiu A0, S4, 0xc
jal   0x80089A20
 move  A1, S1
beqz  S2, L8010B898
 li    A0, 57
lui   A1, hi(D_8011E1D0)
j     L8010B8A4
 addiu A1, A1, lo(D_8011E1D0)
L8010B898:
li    A0, 27
lui   A1, hi(D_8011E1C8)
addiu A1, A1, lo(D_8011E1C8)
L8010B8A4:
jal   0x800D90C8
       NOP
sw    V0, 0x7c(SP)
jal   0x800D9714
 lw    A0, 0x7c(SP)
lw    T5, 0x7c(SP)
addiu A0, T5, 0x18
jal   0x80089A20
 addiu A1, SP, 0x48
lw    T5, 0x7c(SP)
addiu A0, T5, 0xc
jal   0x80089A20
 addiu A1, S5, 8
li    AT, 0x3F990000 ; 1.195312
ori   AT, AT, 0x999a
mtc1  AT, F0
lw    T5, 0x7c(SP)
swc1  F0, 0x2c(T5)
swc1  F0, 0x24(T5)
swc1  F0, 0x28(T5)
jal   0x800D9B24
 lw    A0, 0x7c(SP)
li    AT, 0x42480000 ; 50.000000
mtc1  AT, F12
jal   0x8008EF20
       NOP
li    AT, 0x3F800000 ; 1.000000
mtc1  AT, F2
      NOP
div.s F22, F2, F0
mtc1  R0, F20
li    AT, 0x3E4C0000 ; 0.199219
ori   AT, AT, 0xcccd
mtc1  AT, F26
li    AT, 0x3F4C0000 ; 0.796875
ori   AT, AT, 0xcccd
mtc1  AT, F24
li    AT, 0x41340000 ; 11.250000
mtc1  AT, F30
li    AT, 0x42B40000 ; 90.000000
mtc1  AT, F28
      NOP
L8010B94C:
jal   0x8008EF20
 mov.s F12, F20
mul.s F0, F0, F22
swc1  F0, 0x28(S4)
jal   0x8008EF20
 mov.s F12, F20
mul.s F0, F0, F22
      NOP
mul.s F0, F0, F26
add.s F0, F0, F24
swc1  F0, 0x24(S4)
jal   0x8008EF20
 mov.s F12, F20
mul.s F0, F0, F22
      NOP
mul.s F0, F0, F26
add.s F0, F0, F24
jal   SleepVProcess
 swc1  F0, 0x2c(S4)
add.s F20, F20, F30
c.lt.s F20, F28
      NOP
bc1t  L8010B94C
       NOP
li    AT, 0x42480000 ; 50.000000
mtc1  AT, F0
      NOP
c.lt.s F0, F20
      NOP
bc1f  L8010BA54
       NOP
li    AT, 0x3E4C0000 ; 0.199219
ori   AT, AT, 0xcccd
mtc1  AT, F26
li    AT, 0x3F4C0000 ; 0.796875
ori   AT, AT, 0xcccd
mtc1  AT, F24
li    AT, 0x41340000 ; 11.250000
mtc1  AT, F30
li    AT, 0x42480000 ; 50.000000
mtc1  AT, F28
      NOP
L8010B9F4:
jal   0x8008EF20
 mov.s F12, F20
mul.s F0, F0, F22
swc1  F0, 0x28(S4)
jal   0x8008EF20
 mov.s F12, F20
mul.s F0, F0, F22
      NOP
mul.s F0, F0, F26
add.s F0, F0, F24
swc1  F0, 0x24(S4)
jal   0x8008EF20
 mov.s F12, F20
mul.s F0, F0, F22
      NOP
mul.s F0, F0, F26
add.s F0, F0, F24
jal   SleepVProcess
 swc1  F0, 0x2c(S4)
sub.s F20, F20, F30
c.lt.s F28, F20
      NOP
bc1t  L8010B9F4
       NOP
L8010BA54:
li    AT, 0x3F800000 ; 1.000000
mtc1  AT, F0
      NOP
swc1  F0, 0x2c(S4)
swc1  F0, 0x24(S4)
swc1  F0, 0x28(S4)
jal   0x800D9A40
 lw    A0, 0x7c(SP)
move  A0, S4
li    A1, -1
jal   0x800D9CE8
 move  A2, R0
lw    V0, 0x3c(S4)
lw    V0, 0x40(V0)
lh    A0, 0(V0)
lui   A1, 0x3f99
jal   0x8001C92C
 ori   A1, A1, 0x999a
L8010BA9C:
jal   0x800D9E0C
 move  A0, S4
andi  V0, V0, 0xffff
bnez  V0, L8010BAC0
 move  A1, R0
jal   SleepVProcess
       NOP
j     L8010BA9C
       NOP
L8010BAC0:
lw    A0, 0x7c(SP)
jal   0x800D9CE8
 move  A2, R0
move  V0, S6
bnez  V0, L8010BB34
 li    A0, 672
lui   A0, hi(current_player_index)
lb    A0, lo(current_player_index)(A0)
sll   V0, A0, 3
subu  V0, V0, A0
sll   V0, V0, 3
lui   AT, hi(p1_coins)
addu  AT, AT, V0
lh    V0, lo(p1_coins)(AT)
slti  V0, V0, 5
bnezl V0, L8010BB34
 li    A0, 666
jal   PlayerHasEmptyItemSlot
       NOP
li    V1, -1
beq   V0, V1, L8010BB34
 li    A0, 666
lui   V1, hi(current_turn)
lb    V1, lo(current_turn)(V1)
lui   V0, hi(total_turns)
lb    V0, lo(total_turns)(V0)
bne   V1, V0, L8010BB34
 li    A0, 664
li    A0, 666
L8010BB34:
jal   PlaySound
       NOP
L8010BB3C:
jal   0x800D9E0C
 lw    A0, 0x7c(SP)
andi  V0, V0, 0xffff
bnez  V0, L8010BB60
 li    A1, -1
jal   SleepVProcess
       NOP
j     L8010BB3C
       NOP
L8010BB60:
lw    A0, 0x7c(SP)
jal   0x800D9CE8
 li    A2, 2
L8010BB6C:
lui   V1, hi(current_turn)
lb    V1, lo(current_turn)(V1)
lui   V0, hi(total_turns)
lb    V0, lo(total_turns)(V0)
bne   V1, V0, L8010BBA0
 sll   V0, S6, 2
lui   A1, hi(item_shop_closed_messages)
addu  A1, A1, V0
lw    A1, lo(item_shop_closed_messages)(A1)
jal   0x800EC590
 move  A0, FP
j     L8010C684
       NOP
L8010BBA0:
lui   A0, hi(current_player_index)
jal   PlayerHasEmptyItemSlot
 lb    A0, lo(current_player_index)(A0)
li    V1, -1
bne   V0, V1, L8010BBD4
 sll   V0, S6, 2
lui   A1, hi(item_shop_already_have_three_items_messages)
addu  A1, A1, V0
lw    A1, lo(item_shop_already_have_three_items_messages)(A1)
jal   0x800EC590
 move  A0, FP
j     L8010C684
       NOP
L8010BBD4:
lui   V0, hi(current_player_index)
lb    V0, lo(current_player_index)(V0)
sll   V1, V0, 3
subu  V1, V1, V0
sll   V1, V1, 3
lui   V0, hi(p1_coins)
addu  V0, V0, V1
lh    V0, lo(p1_coins)(V0)
slti  V0, V0, 5
beqz  V0, L8010BC1C
 sll   V0, S6, 2
lui   A1, hi(item_shop_not_enough_coins_messages)
addu  A1, A1, V0
lw    A1, lo(item_shop_not_enough_coins_messages)(A1)
jal   0x800EC590
 move  A0, FP
j     L8010C684
       NOP
L8010BC1C:
lui   A1, hi(item_shop_prompt_to_buy_messages)
addu  A1, A1, V0
lw    A1, lo(item_shop_prompt_to_buy_messages)(A1)
jal   0x800EC628
 move  A0, FP
jal   func_80107408
       NOP
jal   0x800EC6C8
 move  S0, V0
jal   0x800EC6EC
       NOP
li    V0, 1
beq   S0, V0, L8010C620
 slti  V0, S0, 2
beql  V0, R0, L8010BC6C
 li    V0, 2
beqz  S0, L8010BC7C
       NOP
j     L8010C684
       NOP
L8010BC6C:
beq   S0, V0, L8010C640
 li    V1, -1
j     L8010C684
       NOP
L8010BC7C:
jal   0x800FB578
 li    A0, -1
lui   A0, hi(current_player_index)
lb    A0, lo(current_player_index)(A0)
jal   0x800EE9C0
 move  S1, V0
move  A0, S6
lui   A1, hi(D_8011E088)
addiu A1, A1, lo(D_8011E088)
sll   V1, A0, 1
addu  V1, V1, A0
sll   V1, V1, 2
addu  V1, V1, A1
sll   A0, S1, 2
addu  A0, A0, V1
addu  A0, A0, V0
lbu   S3, 0(A0)
move  S2, R0
move  A1, R0
move  V1, S6
lui   A0, hi(D_8011E0A0)
addiu A0, A0, lo(D_8011E0A0)
sll   V0, V1, 3
addu  V0, V0, V1
sll   V0, V0, 2
subu  V0, V0, V1
addu  V0, V0, A0
sll   V1, S3, 3
subu  V1, V1, S3
addu  V1, V1, V0
li    A3, -1
addiu A0, SP, 0x20
li    A2, 1
addu  V0, V1, A1
L8010BD04:
lb    V0, 0(V0)
beq   V0, A3, L8010BD20
 slti  V0, V0, 6
beqz  V0, L8010BD30
 addu  V0, A0, A1
sb    A2, 0(V0)
addiu S2, S2, 1
L8010BD20:
addiu A1, A1, 1
slti  V0, A1, 7
bnez  V0, L8010BD04
 addu  V0, V1, A1
L8010BD30:
slti  V0, A1, 7
beqz  V0, L8010BDF8
 move  S1, R0
addiu T3, SP, 0x20
li    T1, 1
addiu T0, SP, 0x30
move  V1, S6
lui   A0, hi(D_8011E0A0)
addiu A0, A0, lo(D_8011E0A0)
sll   V0, V1, 3
addu  V0, V0, V1
sll   V0, V0, 2
subu  V0, V0, V1
addu  V0, V0, A0
sll   V1, S3, 3
subu  V1, V1, S3
addu  T2, V1, V0
li    T4, -1
L8010BD78:
addu  A3, T3, A1
sb    T1, 0(A3)
sll   V0, S1, 2
addu  A2, T0, V0
sb    R0, 0(A2)
addu  V0, T2, A1
lb    V0, 0(V0)
beql  V0, T4, L8010BDEC
 addiu A1, A1, 1
lui   A0, hi(CORE_80100F94)
addu  A0, A0, V0
lbu   A0, lo(CORE_80100F94)(A0)
lui   V1, hi(current_player_index)
lb    V1, lo(current_player_index)(V1)
sll   V0, V1, 3
subu  V0, V0, V1
sll   V0, V0, 3
lui   AT, hi(p1_coins)
addu  AT, AT, V0
lh    V0, lo(p1_coins)(AT)
slt   V0, V0, A0
beqz  V0, L8010BDDC
 sll   V0, S1, 2
sb    R0, 0(A3)
sb    T1, 0(A2)
L8010BDDC:
addu  V0, T0, V0
sb    R0, 1(V0)
addiu S2, S2, 1
addiu A1, A1, 1
L8010BDEC:
slti  V0, A1, 7
bnez  V0, L8010BD78
 addiu S1, S1, 1
L8010BDF8:
slti  V0, A1, 9
beqz  V0, L8010BE20
 addiu V1, SP, 0x20
li    A0, 1
addu  V0, V1, A1
L8010BE0C:
sb    A0, 0(V0)
addiu A1, A1, 1
slti  V0, A1, 9
bnez  V0, L8010BE0C
 addu  V0, V1, A1
L8010BE20:
lui   V1, hi(item_shop_purchase_selection_messages)
addiu V1, V1, lo(item_shop_purchase_selection_messages)
sll   V0, S3, 3
addu  V0, V0, V1
move  S0, S6
sll   V1, S0, 2
addu  V1, V1, V0
addiu V0, SP, 0x38
sw    V0, 0x10(SP)
addiu V0, SP, 0x3c
sw    V0, 0x14(SP)
addiu V0, SP, 0x40
sw    V0, 0x18(SP)
move  A0, FP
lw    A1, 0(V1)
addiu A2, SP, 0x30
jal   0x800EC8EC ; ShowMessage to select item to buy
 addiu A3, SP, 0x34
jal   0x800ECAA8
 move  A0, R0
lui   AT, hi(D_8011FB4C)
sw    S0, lo(D_8011FB4C)(AT)
lui   AT, hi(D_8011FB50)
sw    S3, lo(D_8011FB50)(AT)
addiu A0, SP, 0x20
lui   AT, hi(D_8011FB54)
jal   func_80107174
 sw    A0, lo(D_8011FB54)(AT)
jal   0x800EC6C8
 move  S7, V0
jal   0x800EC6EC
       NOP
bne   S7, S2, L8010BED0
 addiu V0, S2, 1
lui   AT, hi(CORE_800D037C)
jal   0x800E4A6C
 sh    R0, lo(CORE_800D037C)(AT)
lui   A0, hi(current_player_index)
jal   0x800E44E4
 lb    A0, lo(current_player_index)(A0)
li    V0, 1
lui   AT, hi(CORE_800D037C)
j     L8010BC7C
 sh    V0, lo(CORE_800D037C)(AT)
L8010BED0:
xor   V0, S7, V0
sltiu V0, V0, 1
nor   V1, R0, S7
sltiu V1, V1, 1
or    V0, V0, V1
bnez  V0, L8010BC1C
 sll   V0, S6, 2
lw    T5, 0x74(SP)
lw    FP, 0x24(T5)
move  S1, S6
lui   V1, hi(D_8011E0A0)
addiu V1, V1, lo(D_8011E0A0)
sll   V0, S1, 3
addu  V0, V0, S1
sll   V0, V0, 2
subu  V0, V0, S1
addu  V0, V0, V1
sll   S0, S3, 3
subu  S0, S0, S3
addu  S0, S0, V0
addu  S0, S0, S7
lb    V0, 0(S0)
lui   A1, hi(CORE_80100F94)
addu  A1, A1, V0
lbu   A1, lo(CORE_80100F94)(A1)
lui   A0, hi(current_player_index)
lb    A0, lo(current_player_index)(A0)
jal   ShowPlayerCoinChange
 subu  A1, R0, A1
lb    V0, 0(S0)
lui   A1, hi(CORE_80100F94)
addu  A1, A1, V0
lbu   A1, lo(CORE_80100F94)(A1)
lui   A0, hi(current_player_index)
lb    A0, lo(current_player_index)(A0)
jal   AdjustPlayerCoinsGradual
 subu  A1, R0, A1
jal   SleepProcess
 li    A0, 30
lb    V1, 0(S0)
li    V0, 19
beq   V1, V0, L8010BFE8
 addiu S5, S1, 0x13
lui   A0, hi(current_player_index)
jal   PlayerHasEmptyItemSlot
 lb    A0, lo(current_player_index)(A0)
lui   V1, hi(current_player_index)
lb    V1, lo(current_player_index)(V1)
sll   A0, V1, 3
subu  A0, A0, V1
sll   A0, A0, 3
lui   V1, hi(p1_item1)
addiu V1, V1, lo(p1_item1)
addu  A0, A0, V1
addu  A0, A0, V0
move  V0, S6
lui   A1, hi(D_8011E0A0)
addiu A1, A1, lo(D_8011E0A0)
sll   V1, V0, 3
addu  V1, V1, V0
sll   V1, V1, 2
subu  V1, V1, V0
addu  V1, V1, A1
sll   V0, S3, 3
subu  V0, V0, S3
addu  V0, V0, V1
addu  V0, V0, S7
lbu   V1, 0(V0)
sb    V1, 0(A0)
lb    S5, 0(V0)
L8010BFE8:
li    A0, 1
jal   0x8005279C
 li    A1, 5
sll   V0, V0, 0x10
sra   V0, V0, 0x10
sw    V0, 0x5c(SP)
sll   V0, S5, 2
lui   A0, hi(CORE_8010197C)
addu  A0, A0, V0
lw    A0, lo(CORE_8010197C)(A0)
jal   ReadMainFS
 move  S1, R0
move  S0, V0
jal   ImgPackParse
 move  A0, S0
sh    V0, 0x66(SP)
jal   FreeMainFS
 move  A0, S0
lw    S0, 0x5c(SP)
lhu   T5, 0x66(SP)
sll   A2, T5, 0x10
move  A0, S0
move  A1, R0
sra   A2, A2, 0x10
jal   0x80055024
 move  A3, R0
move  A0, S0
move  A1, R0
jal   0x80055294
 li    A2, 10
move  A0, S0
move  A1, R0
jal   0x800550F4
 move  A2, R0
move  A0, S0
move  A1, R0
jal   0x800553A8
 li    A2, 6156
move  A0, S0
move  A1, R0
li    A2, 160
jal   0x80054904
 li    A3, 90
move  A0, S0
move  A1, R0
jal   0x80055458
 move  A2, R0
addiu S0, SP, 0x48
jal   0x800ECC0C
 move  A0, S0
lw    T5, 0x74(SP)
lw    A2, 0x24(T5)
addiu A2, A2, 0x18
move  A0, A2
move  A1, S0
jal   0x800ED128
 li    A3, 10
jal   PlaySound
 li    A0, 25
lw    T5, 0x5c(SP)
sll   S0, T5, 0x10
sll   A2, S1, 1
L8010C0E0:
addu  A2, A2, S1
sll   A2, A2, 3
addu  A2, A2, S1
sra   A0, S0, 0x10
move  A1, R0
jal   0x80055458
 andi  A2, A2, 0xffff
jal   SleepVProcess
 addiu S1, S1, 1
slti  V0, S1, 0xa
bnez  V0, L8010C0E0
 sll   A2, S1, 1
lw    A0, 0x5c(SP)
move  A1, R0
jal   0x80055458
 li    A2, 256
move  V0, S6
lui   A0, hi(D_8011E0A0)
addiu A0, A0, lo(D_8011E0A0)
sll   V1, V0, 3
addu  V1, V1, V0
sll   V1, V1, 2
subu  V1, V1, V0
addu  V1, V1, A0
sll   V0, S3, 3
subu  V0, V0, S3
addu  V0, V0, V1
addu  V0, V0, S7
lb    V1, 0(V0)
li    V0, 19
bne   V1, V0, L8010C598
 move  S7, S6
lui   V0, hi(D_8011E0E8)
addiu V0, V0, lo(D_8011E0E8)
sll   V1, S7, 1
addu  V1, V1, S7
sw    V1, 0x84(SP)
sll   V1, V1, 2
addu  V1, V1, V0
sw    V1, 0x8c(SP)
L8010C180:
lui   A0, hi(current_player_index)
jal   PlayerHasEmptyItemSlot
 lb    A0, lo(current_player_index)(A0)
li    T5, -1
beq   V0, T5, L8010C578
 li    V1, -1
jal   0x800FB578
 li    A0, -1
lui   A0, hi(current_player_index)
lb    A0, lo(current_player_index)(A0)
jal   0x800EE9C0
 move  S0, V0
sll   S0, S0, 2
lw    T5, 0x8c(SP)
addu  S0, S0, T5
addu  S0, S0, V0
lbu   S0, 0(S0)
li    AT, 0x42C80000 ; 100.000000
mtc1  AT, F12
      NOP
jal   0x800EEF80
 move  S1, R0
move  A0, V0
lw    T5, 0x84(SP)
sll   V1, T5, 3
addu  V1, V1, S7
sll   V1, V1, 1
lui   T5, hi(D_8011E100)
addiu T5, T5, lo(D_8011E100)
addu  V1, V1, T5
sll   V0, S0, 2
addu  V0, V0, S0
sll   V0, V0, 1
addu  V1, V0, V1
addu  V0, V1, S1
L8010C20C:
lb    V0, 0(V0)
slt   V0, A0, V0
bnez  V0, L8010C22C
       NOP
addiu S1, S1, 1
slti  V0, S1, 0xa
bnez  V0, L8010C20C
 addu  V0, V1, S1
L8010C22C:
lui   V0, hi(D_8011E164)
addiu V0, V0, lo(D_8011E164)
sll   V1, S7, 2
addu  V1, V1, S7
sll   V1, V1, 1
addu  V1, V1, V0
addu  V1, V1, S1
lbu   S5, 0(V1)
lhu   T5, 0x6e(SP)
sll   V0, T5, 0x10
sra   V0, V0, 0x10
li    T5, -1
beq   V0, T5, L8010C270
 li    A0, 21
li    A1, 160
j     L8010C284
 li    A2, 1
L8010C270:
lhu   V0, 0xa(FP)
ori   V0, V0, 0x10
sh    V0, 0xa(FP)
li    A1, 160
move  A2, R0
L8010C284:
jal   0x800E210C
 li    S0, 30
move  S1, V0
lui   V1, hi(current_player_index)
lb    V1, lo(current_player_index)(V1)
sll   V0, V1, 3
subu  V0, V0, V1
sll   V0, V0, 3
lui   AT, hi(p1_controller)
addu  AT, AT, V0
lbu   V0, lo(p1_controller)(AT)
sll   V0, V0, 1
lui   AT, hi(CORE_800C9520)
addu  AT, AT, V0
lhu   V0, lo(CORE_800C9520)(AT)
andi  V0, V0, 0x8000
bnez  V0, L8010C330
       NOP
lui   S3, hi(CORE_800C9520)
addiu S3, S3, lo(CORE_800C9520)
L8010C2D4:
jal   PlayerIsCPU
 li    A0, -1
beqz  V0, L8010C2F0
 li    T5, -1
addiu S0, S0, -1
beq   S0, T5, L8010C330
       NOP
L8010C2F0:
jal   SleepVProcess
       NOP
lui   V1, hi(current_player_index)
lb    V1, lo(current_player_index)(V1)
sll   V0, V1, 3
subu  V0, V0, V1
sll   V0, V0, 3
lui   AT, hi(p1_controller)
addu  AT, AT, V0
lbu   V0, lo(p1_controller)(AT)
sll   V0, V0, 1
addu  V0, V0, S3
lhu   V0, 0(V0)
andi  V0, V0, 0x8000
beqz  V0, L8010C2D4
       NOP
L8010C330:
jal   0x800E21F4
 move  A0, S1
lui   A0, hi(current_player_index)
lb    A0, lo(current_player_index)(A0)
li    A1, 2
jal   0x800F2304
 move  A2, R0
lui   A1, 0x4000
lui   A2, 0xbe99
ori   A2, A2, 0x999a
jal   0x800EE688
 move  A0, FP
jal   SleepProcess
 li    A0, 5
lui   A0, hi(D_8010B484)
addiu A0, A0, lo(D_8010B484)
li    A1, 16386
move  A2, R0
jal   InitProcess
 move  A3, R0
lw    T5, 0x5c(SP)
sw    T5, 0x8c(V0)
jal   0x800EE6C0
 move  A0, FP
li    A0, -1
li    A1, -1
jal   0x800F2304
 li    A2, 2
li    A0, 1
jal   0x8005279C
 li    A1, 5
sll   V0, V0, 0x10
sra   S3, V0, 0x10
sll   V0, S5, 2
lui   A0, hi(CORE_8010197C)
addu  A0, A0, V0
lw    A0, lo(CORE_8010197C)(A0)
jal   ReadMainFS
 move  S1, R0
move  S0, V0
jal   ImgPackParse
 move  A0, S0
sll   V0, V0, 0x10
sra   S6, V0, 0x10
jal   FreeMainFS
 move  A0, S0
move  S0, S3
move  A0, S0
move  A1, R0
move  A2, S6
jal   0x80055024
 move  A3, R0
move  A0, S0
move  A1, R0
jal   0x80055294
 li    A2, 11
move  A0, S0
move  A1, R0
jal   0x800550F4
 move  A2, R0
move  A0, S0
move  A1, R0
jal   0x800553A8
 li    A2, 4096
move  A0, S0
move  A1, R0
li    A2, 160
jal   0x80054904
 li    A3, 90
move  A0, S0
move  A1, R0
jal   0x80055458
 move  A2, R0
addiu S0, SP, 0x48
jal   0x800ECC0C
 move  A0, S0
lw    T5, 0x74(SP)
lw    A2, 0x24(T5)
addiu A2, A2, 0x18
move  A0, A2
move  A1, S0
jal   0x800ED128
 li    A3, 10
li    S2, 90
mtc1  R0, F20
move  S0, S3
li    AT, 0x3DCC0000 ; 0.099609
ori   AT, AT, 0xcccd
mtc1  AT, F22
L8010C494:
sll   A3, S2, 0x10
move  A0, S0
move  A1, R0
li    A2, 160
jal   0x80054904
 sra   A3, A3, 0x10
sll   A2, S1, 1
addu  A2, A2, S1
sll   A2, A2, 3
addu  A2, A2, S1
move  A0, S0
move  A1, R0
jal   0x80055458
 andi  A2, A2, 0xffff
move  A0, S0
mfc1  A2, F20
mfc1  A3, F20
      NOP
jal   0x800551D8
 move  A1, R0
jal   SleepVProcess
 addiu S1, S1, 1
addiu S2, S2, -3
slti  V0, S1, 0xa
bnez  V0, L8010C494
 add.s F20, F20, F22
move  S0, S3
move  A0, S0
move  A1, R0
lui   A2, 0x3f80
jal   0x800551D8
 move  A3, A2
move  A0, S0
move  A1, R0
jal   0x80055458
 li    A2, 256
jal   SleepProcess
 li    A0, 10
lui   A0, hi(current_player_index)
jal   PlayerHasEmptyItemSlot
 lb    A0, lo(current_player_index)(A0)
lui   A0, hi(current_player_index)
lb    A0, lo(current_player_index)(A0)
sll   V1, A0, 3
subu  V1, V1, A0
sll   V1, V1, 3
lui   A0, hi(p1_item1)
addiu A0, A0, lo(p1_item1)
addu  V1, V1, A0
addu  V1, V1, V0
sb    S5, 0(V1)
jal   0x800525C8
 move  A0, S0
jal   FreeGraphics
 move  A0, S6
j     L8010C180
       NOP
L8010C578:
lhu   T5, 0x6e(SP)
sll   V0, T5, 0x10
sra   V0, V0, 0x10
bne   V0, V1, L8010C598
       NOP
lhu   V0, 0xa(FP)
andi  V0, V0, 0xffef
sh    V0, 0xa(FP)
L8010C598:
jal   SleepProcess
 li    A0, 5
li    A0, -1
li    A1, 5
jal   0x800F2304
 move  A2, R0
jal   SleepProcess
 li    A0, 5
lui   A1, hi(current_player_index)
lb    A1, lo(current_player_index)(A1)
jal   0x8004ACE0
 li    A0, 628
jal   SleepProcess
 li    A0, 20
jal   SleepVProcess
       NOP
li    V0, 2
sw    V0, 0x10(SP)
li    A0, -1
li    A1, -1
move  A2, R0
jal   0x800F2388
 li    A3, 5
jal   SleepProcess
 li    A0, 10
lw    A0, 0x5c(SP)
jal   0x800525C8
       NOP
lhu   T5, 0x66(SP)
sll   A0, T5, 0x10
jal   FreeGraphics
 sra   A0, A0, 0x10
j     L8010C684
       NOP
L8010C620:
sll   V0, S6, 2
lui   A1, hi(item_shop_cancelled_purchase_messages)
addu  A1, A1, V0
lw    A1, lo(item_shop_cancelled_purchase_messages)(A1)
jal   0x800EC590
 move  A0, FP
j     L8010C684
       NOP
L8010C640:
lhu   T5, 0x6e(SP)
sll   V0, T5, 0x10
sra   V0, V0, 0x10
bne   V0, V1, L8010C674
       NOP
jal   func_80106FE8
       NOP
li    V0, 1
lui   AT, hi(CORE_800CB99C)
jal   0x80049FB8
 sb    V0, lo(CORE_800CB99C)(AT)
j     L8010BC1C
 sll   V0, S6, 2
L8010C674:
jal   __PP64_INTERNAL_VIEW_MAP
       NOP
j     L8010BC1C
 sll   V0, S6, 2
L8010C684:
lhu   T5, 0x6e(SP)
sll   V0, T5, 0x10
sra   V0, V0, 0x10
li    V1, -1
beq   V0, V1, L8010C8B8
       NOP
jal   PlaySound
 li    A0, 277
move  A0, S4
li    A1, -1
jal   0x800D9CE8
 li    A2, 4
lw    V0, 0x3c(S4)
lw    V0, 0x40(V0)
lh    A0, 0(V0)
lui   A1, 0x3f99
jal   0x8001C92C
 ori  A1, A1, 0x999a
lw    V0, 0x3c(S4)
lw    V0, 0x40(V0)
lh    A0, 0(V0)
lui   V1, hi(CORE_800D03F8)
lw    V1, lo(CORE_800D03F8)(V1)
sll   V0, A0, 1
addu  V0, V0, A0
sll   V0, V0, 6
addu  V0, V0, V1
lbu   V1, 2(V0)
lui   A1, hi(CORE_800CCF58)
lw    A1, lo(CORE_800CCF58)(A1)
sll   V0, V1, 1
addu  V0, V0, V1
sll   V0, V0, 3
addu  V0, V0, A1
lh    V0, 2(V0)
mtc1  V0, F4
      NOP
cvt.s.w F4, F4
mfc1  A1, F4
jal   0x8001C6A8
       NOP
L8010C728:
jal   0x800D9E80
 move  A0, S4
andi  V0, V0, 0xffff
bnez  V0, L8010C74C
       NOP
jal   SleepVProcess
       NOP
j     L8010C728
       NOP
L8010C74C:
jal   0x800D9B24
 lw    A0, 0x7c(SP)
li    AT, 0x42480000 ; 50.000000
mtc1  AT, F12
jal   0x8008EF20
       NOP
li    AT, 0x3F800000 ; 1.000000
mtc1  AT, F2
      NOP
div.s F22, F2, F0
li    AT, 0x42480000 ; 50.000000
mtc1  AT, F20
li    AT, 0x3E4C0000 ; 0.199219
ori AT, AT, 0xcccd
mtc1  AT, F26
li    AT, 0x3F4C0000 ; 0.796875
ori AT, AT, 0xcccd
mtc1  AT, F24
li    AT, 0x41340000 ; 11.250000
mtc1  AT, F30
li    AT, 0x42B40000 ; 90.000000
mtc1  AT, F28
      NOP
L8010C7A8:
jal   0x8008EF20
 mov.s F12, F20
mul.s F0, F0, F22
swc1  F0, 0x28(S4)
jal   0x8008EF20
 mov.s F12, F20
mul.s F0, F0, F22
      NOP
mul.s F0, F0, F26
add.s F0, F0, F24
swc1  F0, 0x24(S4)
jal   0x8008EF20
 mov.s F12, F20
mul.s F0, F0, F22
      NOP
mul.s F0, F0, F26
add.s F0, F0, F24
jal   SleepVProcess
 swc1  F0, 0x2c(S4)
add.s F20, F20, F30
c.lt.s F20, F28
      NOP
bc1t  L8010C7A8
       NOP
li    AT, 0x42B40000 ; 90.000000
mtc1  AT, F20
li    AT, 0x3E4C0000 ; 0.199219
ori AT, AT, 0xcccd
mtc1  AT, F26
li    AT, 0x3F4C0000 ; 0.796875
ori AT, AT, 0xcccd
mtc1  AT, F24
li    AT, 0x41340000 ; 11.250000
mtc1  AT, F30
mtc1  R0, F28
      NOP
L8010C838:
jal   0x8008EF20
 mov.s F12, F20
mul.s F0, F0, F22
swc1  F0, 0x28(S4)
jal   0x8008EF20
 mov.s F12, F20
mul.s F0, F0, F22
      NOP
mul.s F0, F0, F26
add.s F0, F0, F24
swc1  F0, 0x24(S4)
jal   0x8008EF20
 mov.s F12, F20
mul.s F0, F0, F22
      NOP
mul.s F0, F0, F26
add.s F0, F0, F24
jal   SleepVProcess
 swc1  F0, 0x2c(S4)
sub.s F20, F20, F30
c.lt.s F28, F20
      NOP
bc1t  L8010C838
       NOP
sw    R0, 0x28(S4)
sw    R0, 0x24(S4)
sw    R0, 0x2c(S4)
jal   0x800D9B54
 move  A0, S4
lw    A0, 0x7c(SP)
jal   0x800D9B54
       NOP
L8010C8B8:
lui   A0, hi(current_player_index)
jal   0x800DB884
 lb    A0, lo(current_player_index)(A0)
jal   SleepProcess
 li    A0, 10
lw    RA, 0xb4(SP)
lw    FP, 0xb0(SP)
lw    S7, 0xac(SP)
lw    S6, 0xa8(SP)
lw    S5, 0xa4(SP)
lw    S4, 0xa0(SP)
lw    S3, 0x9c(SP)
lw    S2, 0x98(SP)
lw    S1, 0x94(SP)
lw    S0, 0x90(SP)
ldc1  F30, 0xe0(SP)
ldc1  F28, 0xd8(SP)
ldc1  F26, 0xd0(SP)
ldc1  F24, 0xc8(SP)
ldc1  F22, 0xc0(SP)
ldc1  F20, 0xb8(SP)
jr    RA
 addiu SP, SP, 0xe8

func_8010C914:
addiu SP, SP, -0x20
sw    RA, 0x1c(SP)
sw    S2, 0x18(SP)
sw    S1, 0x14(SP)
sw    S0, 0x10(SP)
jal   0x800D9AA4
 move  S2, A0
move  S1, R0
L8010C934:
lw    V0, 0x3c(S2)
lw    V0, 0x40(V0)
andi  S0, S1, 0xff
lh    A0, 0(V0)
jal   0x8001F9E4
 move  A1, S0
lw    V0, 0x40(S2)
lw    V0, 0x40(V0)
lh    A0, 0(V0)
jal   0x8001F9E4
 move  A1, S0
jal   SleepVProcess
 addiu S1, S1, 0xc
slti  V0, S1, 0x100
bnez  V0, L8010C934
       NOP
lw    V0, 0x3c(S2)
lw    V0, 0x40(V0)
lh    A0, 0(V0)
jal   0x8001F9E4
 li    A1, 255
lw    V0, 0x40(S2)
lw    V0, 0x40(V0)
lh    A0, 0(V0)
jal   0x8001F9E4
 li    A1, 255
lw    RA, 0x1c(SP)
lw    S2, 0x18(SP)
lw    S1, 0x14(SP)
lw    S0, 0x10(SP)
jr    RA
 addiu SP, SP, 0x20

func_8010C9B4:
addiu SP, SP, -0x20
sw    RA, 0x1c(SP)
sw    S2, 0x18(SP)
sw    S1, 0x14(SP)
sw    S0, 0x10(SP)
move  S2, A0
li    S1, 255
L8010C9D0:
lw    V0, 0x3c(S2)
lw    V0, 0x40(V0)
andi  S0, S1, 0xff
lh    A0, 0(V0)
jal   0x8001F9E4
 move  A1, S0
lw    V0, 0x40(S2)
lw    V0, 0x40(V0)
lh    A0, 0(V0)
jal   0x8001F9E4
 move  A1, S0
jal   SleepVProcess
 addiu S1, S1, -0xc
bgez  S1, L8010C9D0
       NOP
lw    V0, 0x3c(S2)
lw    V0, 0x40(V0)
lh    A0, 0(V0)
jal   0x8001F9E4
 move  A1, R0
lw    V0, 0x40(S2)
lw    V0, 0x40(V0)
lh    A0, 0(V0)
jal   0x8001F9E4
 move  A1, R0
jal   0x800D9B24
 move  A0, S2
lw    RA, 0x1c(SP)
lw    S2, 0x18(SP)
lw    S1, 0x14(SP)
lw    S0, 0x10(SP)
jr    RA
 addiu SP, SP, 0x20

func_8010CA54:
addiu SP, SP, -0x50
sw    RA, 0x38(SP)
sw    S7, 0x34(SP)
sw    S6, 0x30(SP)
sw    S5, 0x2c(SP)
sw    S4, 0x28(SP)
sw    S3, 0x24(SP)
sw    S2, 0x20(SP)
sw    S1, 0x1c(SP)
sw    S0, 0x18(SP)
sdc1  F22, 0x48(SP)
sdc1  F20, 0x40(SP)
move  S3, A0
move  S6, R0
li    A0, 1
jal   0x8005279C
 li    A1, 5
move  S5, V0
lui A0, 0x13
jal   ReadMainFS
 ori A0, A0, 0x20e
move  S0, V0
jal   ImgPackParse
 move  A0, S0
move  S7, V0
jal   FreeMainFS
 move  A0, S0
sll   S0, S5, 0x10
sra   S0, S0, 0x10
sll   A2, S7, 0x10
move  A0, S0
move  A1, R0
sra   A2, A2, 0x10
jal   0x80055024
 move  A3, R0
move  A0, S0
move  A1, R0
jal   0x80055294
 li    A2, 10
move  A0, S0
move  A1, R0
jal   0x800550F4
 move  A2, R0
move  A0, S0
move  A1, R0
jal   0x800553A8
 li    A2, 4096
sll   V0, S3, 3
lui   AT, hi(D_8011E1EC)
addu  AT, AT, V0
lwc1  F0, lo(D_8011E1EC)(AT)
trunc.w.s F2, F0
mfc1  A2, F2
      NOP
sll   A2, A2, 0x10
lui   AT, hi(D_8011E1F0)
addu  AT, AT, V0
lwc1  F0, lo(D_8011E1F0)(AT)
trunc.w.s F2, F0
mfc1  A3, F2
      NOP
sll   A3, A3, 0x10
move  A0, S0
move  A1, R0
sra   A2, A2, 0x10
jal   0x80054904
 sra   A3, A3, 0x10
move  A0, S0
move  A1, R0
jal   0x80055458
 move  A2, R0
jal   PlaySound
 li    A0, 308
move  S0, R0
sll   V0, S5, 0x10
sra   S2, V0, 0x10
sll   S1, S3, 3
L8010CB88:
mtc1  S0, F4
      NOP
cvt.s.w F4, F4
lui   AT, hi(D_8011E20C)
addu  AT, AT, S1
lwc1  F0, lo(D_8011E20C)(AT)
mul.s F0, F4, F0
lui   AT, hi(D_8011E1EC)
addu  AT, AT, S1
lwc1  F2, lo(D_8011E1EC)(AT)
add.s F0, F0, F2
trunc.w.s F2, F0
mfc1  A2, F2
      NOP
sll   A2, A2, 0x10
lui   AT, hi(D_8011E210)
addu  AT, AT, S1
lwc1  F0, lo(D_8011E210)(AT)
mul.s F4, F4, F0
lui   AT, hi(D_8011E1F0)
addu  AT, AT, S1
lwc1  F0, lo(D_8011E1F0)(AT)
add.s F4, F4, F0
trunc.w.s F0, F4
mfc1  A3, F0
      NOP
sll   A3, A3, 0x10
move  A0, S2
move  A1, R0
sra   A2, A2, 0x10
jal   0x80054904
 sra   A3, A3, 0x10
sll   A2, S0, 4
move  A0, S2
move  A1, R0
jal   0x80055458
 andi  A2, A2, 0xffff
jal   SleepVProcess
 addiu S0, S0, 1
slti  V0, S0, 0x11
bnez  V0, L8010CB88
 sll   A0, S5, 0x10
sra   A0, A0, 0x10
move  A1, R0
jal   0x80055458
 li    A2, 255
move  A0, S3
jal   PlayerHasItem
 li    A1, ITEM_BOO_REPELLANT
li    V1, -1
beq   V0, V1, L8010CC74
 li    A1, 16386
li    S6, 1
lui   A0, hi(D_801127D8)
addiu A0, A0, lo(D_801127D8)
move  A2, R0
jal   InitProcess
 move  A3, R0
sw    S3, 0x8c(V0)
L8010CC74:
bnez  S6, L8010CCA4
 sll   A0, S3, 0x10
sll   V1, S3, 3
subu  V1, V1, S3
sll   V1, V1, 3
lui   V0, hi(p1_stars)
addu  V0, V0, V1
lbu   V0, lo(p1_stars)(V0)
addiu V0, V0, -1
lui   AT, hi(p1_stars)
addu  AT, AT, V1
sb    V0, lo(p1_stars)(AT)
L8010CCA4:
sra   A0, A0, 0x10
jal   0x800FF900
 li    A1, 5
jal   PlaySound
 li    A0, 599
beqz  S6, L8010CCC4
 li    S2, 30
li    S2, 120
L8010CCC4:
beqz  S2, L8010CD9C
 move  S0, R0
sll   S1, S3, 3
li    AT, 0x41800000 ; 16.000000
mtc1  AT, F20
li    AT, 0x40800000 ; 4.000000
mtc1  AT, F22
sll   S4, S5, 0x10
sll   V1, S0, 1
L8010CCE8:
addu  V1, V1, S0
sll   V0, V1, 4
subu  V0, V0, V1
sll   V0, V0, 1
mtc1  V0, F12
      NOP
cvt.s.w F12, F12
jal   0x8008EF20
 addiu S0, S0, 1
lui   AT, hi(D_8011E210)
addu  AT, AT, S1
lwc1  F2, lo(D_8011E210)(AT)
mul.s F2, F2, F20
lui   AT, hi(D_8011E1F0)
addu  AT, AT, S1
lwc1  F4, lo(D_8011E1F0)(AT)
add.s F2, F2, F4
mul.s F0, F0, F22
add.s F2, F2, F0
trunc.w.s F0, F2
mfc1  A3, F0
      NOP
sll   A3, A3, 0x10
lui   AT, hi(D_8011E20C)
addu  AT, AT, S1
lwc1  F0, lo(D_8011E20C)(AT)
mul.s F0, F0, F20
lui   AT, hi(D_8011E1EC)
addu  AT, AT, S1
lwc1  F2, lo(D_8011E1EC)(AT)
add.s F0, F0, F2
trunc.w.s F2, F0
mfc1  A2, F2
      NOP
sll   A2, A2, 0x10
sra   A0, S4, 0x10
move  A1, R0
sra   A2, A2, 0x10
jal   0x80054904
 sra   A3, A3, 0x10
jal   SleepVProcess
       NOP
slt   V0, S0, S2
bnez  V0, L8010CCE8
 sll   V1, S0, 1
L8010CD9C:
li    S0, 16
sll   V0, S5, 0x10
sra   S2, V0, 0x10
sll   S1, S3, 3
L8010CDAC:
mtc1  S0, F4
      NOP
cvt.s.w F4, F4
lui   AT, hi(D_8011E20C)
addu  AT, AT, S1
lwc1  F0, lo(D_8011E20C)(AT)
mul.s F0, F4, F0
lui   AT, hi(D_8011E1EC)
addu  AT, AT, S1
lwc1  F2, lo(D_8011E1EC)(AT)
add.s F0, F0, F2
trunc.w.s F2, F0
mfc1  A2, F2
      NOP
sll   A2, A2, 0x10
lui   AT, hi(D_8011E210)
addu  AT, AT, S1
lwc1  F0, lo(D_8011E210)(AT)
mul.s F4, F4, F0
lui   AT, hi(D_8011E1F0)
addu  AT, AT, S1
lwc1  F0, lo(D_8011E1F0)(AT)
add.s F4, F4, F0
trunc.w.s F0, F4
mfc1  A3, F0
      NOP
sll   A3, A3, 0x10
move  A0, S2
move  A1, R0
sra   A2, A2, 0x10
jal   0x80054904
 sra   A3, A3, 0x10
sll   A2, S0, 4
move  A0, S2
move  A1, R0
jal   0x80055458
 andi  A2, A2, 0xffff
jal   SleepVProcess
 addiu S0, S0, -1
bgez  S0, L8010CDAC
 sll   A0, S5, 0x10
jal   0x800525C8
 sra   A0, A0, 0x10
sll   A0, S7, 0x10
jal   FreeGraphics
 sra   A0, A0, 0x10
sltiu V0, S6, 1
lw    RA, 0x38(SP)
lw    S7, 0x34(SP)
lw    S6, 0x30(SP)
lw    S5, 0x2c(SP)
lw    S4, 0x28(SP)
lw    S3, 0x24(SP)
lw    S2, 0x20(SP)
lw    S1, 0x1c(SP)
lw    S0, 0x18(SP)
ldc1  F22, 0x48(SP)
ldc1  F20, 0x40(SP)
jr    RA
 addiu SP, SP, 0x50

D_8010CE9C:
addiu SP, SP, -0x18
sw    RA, 0x10(SP)
jal   0x800EC3E4
       NOP
jal   EndProcess
 move  A0, R0
lw    RA, 0x10(SP)
jr    RA
 addiu SP, SP, 0x18

func_8010CEC0:
addiu SP, SP, -0xb0
sw    RA, 0x94(SP)
sw    FP, 0x90(SP)
sw    S7, 0x8c(SP)
sw    S6, 0x88(SP)
sw    S5, 0x84(SP)
sw    S4, 0x80(SP)
sw    S3, 0x7c(SP)
sw    S2, 0x78(SP)
sw    S1, 0x74(SP)
sw    S0, 0x70(SP)
sdc1  F24, 0xa8(SP)
sdc1  F22, 0xa0(SP)
sdc1  F20, 0x98(SP)
move  S4, A0
sw    R0, 0x1c(SP)
li    A0, 1
jal   0x8005279C
 li    A1, 5
sh    V0, 0x26(SP)
lui A0, 0x13
jal   ReadMainFS
 ori A0, A0, 0x20e
move  S0, V0
jal   ImgPackParse
 move  A0, S0
sh    V0, 0x2e(SP)
jal   FreeMainFS
 move  A0, S0
lhu   T0, 0x26(SP)
sll   S1, T0, 0x10
sra   S1, S1, 0x10
lhu   T0, 0x2e(SP)
sll   A2, T0, 0x10
move  A0, S1
move  A1, R0
sra   A2, A2, 0x10
jal   0x80055024
 move  A3, R0
move  A0, S1
move  A1, R0
jal   0x80055294
 li    A2, 10
move  A0, S1
move  A1, R0
jal   0x800550F4
 move  A2, R0
move  A0, S1
move  A1, R0
jal   0x800553A8
 li    A2, 4096
sll   S0, S4, 3
lui   AT, hi(D_8011E1EC)
addu  AT, AT, S0
lwc1  F0, lo(D_8011E1EC)(AT)
trunc.w.s F2, F0
mfc1  A2, F2
      NOP
sll   A2, A2, 0x10
lui   AT, hi(D_8011E1F0)
addu  AT, AT, S0
lwc1  F0, lo(D_8011E1F0)(AT)
trunc.w.s F2, F0
mfc1  A3, F2
      NOP
sll   A3, A3, 0x10
move  A0, S1
move  A1, R0
sra   A2, A2, 0x10
jal   0x80054904
 sra   A3, A3, 0x10
move  A0, S1
move  A1, R0
jal   0x80055458
 move  A2, R0
li    A0, 1
jal   0x8005279C
 li    A1, 5
sh    V0, 0x36(SP)
subu  S0, S0, S4
sll   S0, S0, 3
lui   V0, hi(p1_char)
addu  V0, V0, S0
lbu   V0, lo(p1_char)(V0)
sll   V0, V0, 2
lui   A0, hi(CORE_80101040)
addu  A0, A0, V0
lw    A0, lo(CORE_80101040)(A0)
jal   ReadMainFS
 move  S5, R0
move  S0, V0
jal   ImgPackParse
 move  A0, S0
sh    V0, 0x3e(SP)
jal   FreeMainFS
 move  A0, S0
lhu   T0, 0x36(SP)
sll   V0, T0, 0x10
sra   S0, V0, 0x10
lhu   T0, 0x3e(SP)
sll   A2, T0, 0x10
move  A0, S0
move  A1, R0
sra   A2, A2, 0x10
jal   0x80055024
 move  A3, R0
move  A0, S0
move  A1, R0
jal   0x80055294
 li    A2, 10
move  A0, S0
move  A1, R0
jal   0x800550F4
 li    A2, 1
andi  V0, S4, 1
beqz  V0, L8010D0A0
 move  A0, S0
move  A1, R0
j     L8010D0B4
 li    A2, 4097
L8010D0A0:
lhu   T0, 0x36(SP)
sll   A0, T0, 0x10
sra   A0, A0, 0x10
move  A1, R0
li    A2, 4096
L8010D0B4:
jal   0x800553A8
       NOP
move  A0, S4
jal   PlayerHasItem
 li    A1, ITEM_BOO_REPELLANT
li    V1, -1
beq   V0, V1, L8010D0E8
 move  A1, R0
lhu   T0, 0x36(SP)
sll   A0, T0, 0x10
sra   A0, A0, 0x10
jal   0x800553A8
 li    A2, 32768
L8010D0E8:
lhu   T0, 0x36(SP)
sll   S0, T0, 0x10
sra   S0, S0, 0x10
sll   V0, S4, 3
lui   AT, hi(D_8011E20C)
addu  AT, AT, V0
lwc1  F2, lo(D_8011E20C)(AT)
li    AT, 0x41800000 ; 16.000000
mtc1  AT, F4
      NOP
mul.s F2, F2, F4
lui   AT, hi(D_8011E1EC)
addu  AT, AT, V0
lwc1  F0, lo(D_8011E1EC)(AT)
sub.s F0, F0, F2
li    AT, 0x41000000 ; 8.000000
mtc1  AT, F2
      NOP
sub.s F0, F0, F2
trunc.w.s F2, F0
mfc1  A2, F2
      NOP
sll   A2, A2, 0x10
lui   AT, hi(D_8011E210)
addu  AT, AT, V0
lwc1  F0, lo(D_8011E210)(AT)
mul.s F0, F0, F4
lui   AT, hi(D_8011E1F0)
addu  AT, AT, V0
lwc1  F2, lo(D_8011E1F0)(AT)
add.s F0, F0, F2
trunc.w.s F2, F0
mfc1  A3, F2
      NOP
sll   A3, A3, 0x10
move  A0, S0
move  A1, R0
sra   A2, A2, 0x10
jal   0x80054904
 sra   A3, A3, 0x10
move  A0, S0
move  A1, R0
jal   0x80055458
 move  A2, R0
jal   PlaySound
 li    A0, 307
move  S1, R0
lhu   T0, 0x26(SP)
sll   V0, T0, 0x10
sra   S3, V0, 0x10
sll   S2, S4, 3
lhu   T0, 0x36(SP)
sll   S6, T0, 0x10
L8010D1BC:
mtc1  S1, F4
      NOP
cvt.s.w F4, F4
lui   AT, hi(D_8011E20C)
addu  AT, AT, S2
lwc1  F0, lo(D_8011E20C)(AT)
mul.s F0, F4, F0
lui   AT, hi(D_8011E1EC)
addu  AT, AT, S2
lwc1  F2, lo(D_8011E1EC)(AT)
add.s F0, F0, F2
trunc.w.s F2, F0
mfc1  A2, F2
      NOP
sll   A2, A2, 0x10
lui   AT, hi(D_8011E210)
addu  AT, AT, S2
lwc1  F0, lo(D_8011E210)(AT)
mul.s F4, F4, F0
lui   AT, hi(D_8011E1F0)
addu  AT, AT, S2
lwc1  F0, lo(D_8011E1F0)(AT)
add.s F4, F4, F0
trunc.w.s F0, F4
mfc1  A3, F0
      NOP
sll   A3, A3, 0x10
move  A0, S3
move  A1, R0
sra   A2, A2, 0x10
jal   0x80054904
 sra   A3, A3, 0x10
sll   S0, S1, 4
andi  S0, S0, 0xffff
move  A0, S3
move  A1, R0
jal   0x80055458
 move  A2, S0
sra   A0, S6, 0x10
move  A1, R0
jal   0x80055458
 move  A2, S0
jal   SleepVProcess
 addiu S1, S1, 1
slti  V0, S1, 0x11
bnez  V0, L8010D1BC
 move  A1, R0
lhu   T0, 0x26(SP)
sll   A0, T0, 0x10
sra   A0, A0, 0x10
jal   0x80055458
 li    A2, 255
lhu   T0, 0x36(SP)
sll   A0, T0, 0x10
sra   A0, A0, 0x10
move  A1, R0
jal   0x80055458
 li    A2, 255
move  A0, S4
jal   PlayerHasItem
 li    A1, ITEM_BOO_REPELLANT
li    S0, -1
nor   V0, R0, V0
sltu  V0, R0, V0
subu  V0, R0, V0
andi  V0, V0, 0x620f
sll   V1, S4, 3
subu  V1, V1, S4
sll   V1, V1, 3
lui   AT, hi(p1_char)
addu  AT, AT, V1
lbu   V1, lo(p1_char)(AT)
sll   V1, V1, 2
sw    R0, 0x10(SP)
sw    R0, 0x14(SP)
ori   A0, V0, 0x620e
lui   A1, hi(CORE_801014A0)
addu  A1, A1, V1
lw    A1, lo(CORE_801014A0)(A1)
move  A2, R0
jal   0x800EC1E8
 move  A3, R0
sll   A0, S4, 0x10
sra   A0, A0, 0x10
jal   0x800FF900
 li    A1, 2
jal   0x800EC3C0
 move  A0, S4
move  A0, S4
jal   PlayerHasItem
 li    A1, ITEM_BOO_REPELLANT
beq   V0, S0, L8010D34C
 li    A1, 4096
lui   A0, hi(D_8010CE9C)
addiu A0, A0, lo(D_8010CE9C)
move  A2, R0
jal   InitProcess
 move  A3, R0
jal   SleepProcess
 li    A0, 20
L8010D34C:
move  FP, R0
move  S2, R0
move  A0, S4
jal   PlayerHasItem
 li    A1, ITEM_BOO_REPELLANT
li    V1, -1
beq   V0, V1, L8010D390
 li    T0, 1
li    FP, 1
sw    T0, 0x1c(SP)
lui   A0, hi(D_801127D8)
addiu A0, A0, lo(D_801127D8)
li    A1, 16386
move  A2, R0
jal   InitProcess
 move  A3, R0
sw    S4, 0x8c(V0)
L8010D390:
jal   PlaySound
 li    A0, 307
sll   A0, S4, 0x10
sra   A0, A0, 0x10
li    A1, 3
jal   0x800FFA4C
 li    A2, 5
li    AT, 0x41200000 ; 10.000000
mtc1  AT, F12
      NOP
jal   0x800EEF80
 sw    V0, 0x44(SP)
addiu S6, V0, 1
move  S1, R0
move  S7, R0
sll   S0, S4, 3
li    AT, 0x41800000 ; 16.000000
mtc1  AT, F22
li    AT, 0x41000000 ; 8.000000
mtc1  AT, F24
lhu   T0, 0x36(SP)
sll   T0, T0, 0x10
sw    T0, 0x4c(SP)
sll   V0, S4, 3
subu  V0, V0, S4
sll   V0, V0, 3
sw    V0, 0x54(SP)
sll   T0, S4, 3
subu  T0, T0, S4
sw    T0, 0x5c(SP)
sll   T0, S4, 3
subu  T0, T0, S4
sw    T0, 0x64(SP)
sll   T0, S4, 3
subu  T0, T0, S4
sw    T0, 0x6c(SP)
lw    T0, 0x4c(SP)
sra   S3, T0, 0x10
L8010D428:
sll   V0, S6, 0x10
bnez  V0, L8010D454
 slti  V0, S2, 2
jal   PlaySound
 li    A0, 599
li    AT, 0x41700000 ; 15.000000
mtc1  AT, F12
jal   0x800EEF80
       NOP
addiu S6, V0, 0x1e
slti  V0, S2, 2
L8010D454:
xori  V0, V0, 1
subu  S2, S2, V0
bnez  S2, L8010D514
 li    V0, 9
sll   V1, S1, 1
addu  V1, V1, S1
sll   V0, V1, 4
subu  V0, V0, V1
sll   V0, V0, 1
mtc1  V0, F12
      NOP
jal   0x8008EF20
 cvt.s.w F12, F12
lui   AT, hi(D_8011E210)
addu  AT, AT, S0
lwc1  F2, lo(D_8011E210)(AT)
mul.s F2, F2, F22
lui   AT, hi(D_8011E1F0)
addu  AT, AT, S0
lwc1  F4, lo(D_8011E1F0)(AT)
add.s F2, F2, F4
add.s F0, F0, F0
add.s F2, F2, F0
trunc.w.s F0, F2
mfc1  A3, F0
      NOP
sll   A3, A3, 0x10
lhu   T0, 0x26(SP)
sll   A0, T0, 0x10
lui   AT, hi(D_8011E20C)
addu  AT, AT, S0
lwc1  F0, lo(D_8011E20C)(AT)
mul.s F0, F0, F22
lui   AT, hi(D_8011E1EC)
addu  AT, AT, S0
lwc1  F2, lo(D_8011E1EC)(AT)
add.s F0, F0, F2
trunc.w.s F2, F0
mfc1  A2, F2
      NOP
sll   A2, A2, 0x10
sra   A0, A0, 0x10
move  A1, R0
sra   A2, A2, 0x10
jal   0x80054904
 sra   A3, A3, 0x10
j     L8010D640
       NOP
L8010D514:
bne   S2, V0, L8010D640
 sll   V1, S7, 1
addu  V1, V1, S7
sll   V0, V1, 4
subu  V0, V0, V1
sll   V0, V0, 1
mtc1  V0, F20
      NOP
cvt.s.w F20, F20
jal   0x8008EF20
 mov.s F12, F20
lui   AT, hi(D_8011E20C)
addu  AT, AT, S0
lwc1  F2, lo(D_8011E20C)(AT)
mul.s F2, F2, F22
lui   AT, hi(D_8011E1EC)
addu  AT, AT, S0
lwc1  F4, lo(D_8011E1EC)(AT)
add.s F2, F2, F4
add.s F0, F0, F0
add.s F2, F2, F0
trunc.w.s F0, F2
mfc1  A2, F0
      NOP
sll   A2, A2, 0x10
lhu   T0, 0x26(SP)
sll   A0, T0, 0x10
lui   AT, hi(D_8011E210)
addu  AT, AT, S0
lwc1  F0, lo(D_8011E210)(AT)
mul.s F0, F0, F22
lui   AT, hi(D_8011E1F0)
addu  AT, AT, S0
lwc1  F2, lo(D_8011E1F0)(AT)
add.s F0, F0, F2
trunc.w.s F2, F0
mfc1  A3, F2
      NOP
sll   A3, A3, 0x10
sra   A0, A0, 0x10
move  A1, R0
sra   A2, A2, 0x10
jal   0x80054904
 sra   A3, A3, 0x10
jal   0x8008EF20
 mov.s F12, F20
lui   AT, hi(D_8011E1EC)
addu  AT, AT, S0
lwc1  F2, lo(D_8011E1EC)(AT)
sub.s F2, F2, F24
add.s F0, F0, F0
add.s F2, F2, F0
trunc.w.s F0, F2
mfc1  A2, F0
      NOP
sll   A2, A2, 0x10
lui   AT, hi(D_8011E210)
addu  AT, AT, S0
lwc1  F0, lo(D_8011E210)(AT)
mul.s F0, F0, F22
lui   AT, hi(D_8011E1F0)
addu  AT, AT, S0
lwc1  F2, lo(D_8011E1F0)(AT)
add.s F0, F0, F2
trunc.w.s F2, F0
mfc1  A3, F2
      NOP
sll   A3, A3, 0x10
lw    T0, 0x4c(SP)
sra   A0, T0, 0x10
move  A1, R0
sra   A2, A2, 0x10
jal   0x80054904
 sra   A3, A3, 0x10
addiu S7, S7, 1
L8010D640:
lw    T0, 0x54(SP)
lui   V0, hi(CORE_800D110C)
addu  V0, V0, T0
lbu   V0, lo(CORE_800D110C)(V0)
andi  V0, V0, 1
beqz  V0, L8010D72C
       NOP
beqz  S2, L8010D75C
       NOP
lui   V0, hi(p1_cpu_difficulty)
addu  V0, V0, T0
lbu   V0, lo(p1_cpu_difficulty)(V0)
bnez  V0, L8010D690
       NOP
li    AT, 0x40400000 ; 3.000000
mtc1  AT, F12
jal   0x800EEF80
       NOP
j     L8010D714
 li    V1, 6
L8010D690:
lw    T0, 0x5c(SP)
sll   V0, T0, 3
lui   V1, hi(p1_cpu_difficulty)
addu  V1, V1, V0
lbu   V1, lo(p1_cpu_difficulty)(V1)
li    V0, 1
bne   V1, V0, L8010D6C8
       NOP
li    AT, 0x40400000 ; 3.000000
mtc1  AT, F12
jal   0x800EEF80
       NOP
j     L8010D714
 li    V1, 7
L8010D6C8:
lw    T0, 0x64(SP)
sll   V0, T0, 3
lui   V1, hi(p1_cpu_difficulty)
addu  V1, V1, V0
lbu   V1, lo(p1_cpu_difficulty)(V1)
li    V0, 2
bne   V1, V0, L8010D700
       NOP
li    AT, 0x40400000 ; 3.000000
mtc1  AT, F12
jal   0x800EEF80
       NOP
j     L8010D714
 li    V1, 8
L8010D700:
li    AT, 0x40000000 ; 2.000000
mtc1  AT, F12
jal   0x800EEF80
       NOP
li    V1, 9
L8010D714:
subu  V1, V1, V0
slt   V1, V1, S2
beqz  V1, L8010D75C
 sltiu V1, S2, 1
j     L8010D804
       NOP
L8010D72C:
lw    T0, 0x6c(SP)
sll   V0, T0, 3
lui   AT, hi(p1_controller)
addu  AT, AT, V0
lbu   V0, lo(p1_controller)(AT)
sll   V0, V0, 1
lui   AT, hi(CORE_800C9520)
addu  AT, AT, V0
lhu   V0, lo(CORE_800C9520)(AT)
andi  V0, V0, 0x8000
beqz  V0, L8010D804
 sltiu V1, S2, 1
L8010D75C:
lw    T0, 0x1c(SP)
bnez  T0, L8010D804
 sltiu V1, S2, 1
addiu FP, FP, 1
bnez  S5, L8010D800
 li    S2, 10
move  A0, S3
move  A1, R0
li    A2, 1
jal   0x80055140
 move  A3, R0
move  A0, S3
move  A1, R0
jal   0x800550F4
 li    A2, 1
li    S5, 1
lui   AT, hi(D_8011E1EC)
addu  AT, AT, S0
lwc1  F0, lo(D_8011E1EC)(AT)
sub.s F0, F0, F24
trunc.w.s F2, F0
mfc1  A2, F2
      NOP
sll   A2, A2, 0x10
lui   AT, hi(D_8011E210)
addu  AT, AT, S0
lwc1  F0, lo(D_8011E210)(AT)
mul.s F0, F0, F22
lui   AT, hi(D_8011E1F0)
addu  AT, AT, S0
lwc1  F2, lo(D_8011E1F0)(AT)
add.s F0, F0, F2
trunc.w.s F2, F0
mfc1  A3, F2
      NOP
sll   A3, A3, 0x10
move  A0, S3
move  A1, R0
sra   A2, A2, 0x10
jal   0x80054904
 sra   A3, A3, 0x10
L8010D800:
sltiu V1, S2, 1
L8010D804:
xori  V0, S5, 1
sltiu V0, V0, 1
and   V1, V1, V0
beqz  V1, L8010D8B4
 move  A0, S3
move  A1, R0
move  A2, R0
jal   0x80055140
 move  A3, R0
move  A0, S3
move  A1, R0
jal   0x800550F4
 li    A2, 1
move  S5, R0
lui   AT, hi(D_8011E20C)
addu  AT, AT, S0
lwc1  F2, lo(D_8011E20C)(AT)
mul.s F2, F2, F22
lui   AT, hi(D_8011E1EC)
addu  AT, AT, S0
lwc1  F0, lo(D_8011E1EC)(AT)
sub.s F0, F0, F2
sub.s F0, F0, F24
trunc.w.s F2, F0
mfc1  A2, F2
      NOP
sll   A2, A2, 0x10
lui   AT, hi(D_8011E210)
addu  AT, AT, S0
lwc1  F0, lo(D_8011E210)(AT)
mul.s F0, F0, F22
lui   AT, hi(D_8011E1F0)
addu  AT, AT, S0
lwc1  F2, lo(D_8011E1F0)(AT)
add.s F0, F0, F2
trunc.w.s F2, F0
mfc1  A3, F2
      NOP
sll   A3, A3, 0x10
move  A0, S3
move  A1, R0
sra   A2, A2, 0x10
jal   0x80054904
 sra   A3, A3, 0x10
L8010D8B4:
jal   SleepVProcess
 addiu S1, S1, 1
slti  V0, S1, 0x78
bnez  V0, L8010D428
 addiu S6, S6, -1
lw    A0, 0x44(SP)
jal   0x800FFAEC
       NOP
lw    T0, 0x1c(SP)
bnez  T0, L8010D8F4
 li    A1, 4096
lui   A0, hi(D_8010CE9C)
addiu A0, A0, lo(D_8010CE9C)
move  A2, R0
jal   InitProcess
 move  A3, R0
L8010D8F4:
bnez  FP, L8010D9D4
 li    S1, 16
lhu   T0, 0x26(SP)
sll   V0, T0, 0x10
sra   S3, V0, 0x10
sll   S2, S4, 3
lhu   T0, 0x36(SP)
sll   S5, T0, 0x10
L8010D914:
mtc1  S1, F4
      NOP
cvt.s.w F4, F4
lui   AT, hi(D_8011E20C)
addu  AT, AT, S2
lwc1  F0, lo(D_8011E20C)(AT)
mul.s F0, F4, F0
lui   AT, hi(D_8011E1EC)
addu  AT, AT, S2
lwc1  F2, lo(D_8011E1EC)(AT)
add.s F0, F0, F2
trunc.w.s F2, F0
mfc1  A2, F2
      NOP
sll   A2, A2, 0x10
lui   AT, hi(D_8011E210)
addu  AT, AT, S2
lwc1  F0, lo(D_8011E210)(AT)
mul.s F4, F4, F0
lui   AT, hi(D_8011E1F0)
addu  AT, AT, S2
lwc1  F0, lo(D_8011E1F0)(AT)
add.s F4, F4, F0
trunc.w.s F0, F4
mfc1  A3, F0
      NOP
sll   A3, A3, 0x10
move  A0, S3
move  A1, R0
sra   A2, A2, 0x10
jal   0x80054904
 sra   A3, A3, 0x10
sll   S0, S1, 4
andi  S0, S0, 0xffff
move  A0, S3
move  A1, R0
jal   0x80055458
 move  A2, S0
sra   A0, S5, 0x10
move  A1, R0
jal   0x80055458
 move  A2, S0
jal   SleepVProcess
 addiu S1, S1, -2
bltz  S1, L8010DB78
       NOP
j     L8010D914
       NOP
L8010D9D4:
lhu   T0, 0x26(SP)
sll   S2, T0, 0x10
sll   S0, S4, 3
L8010D9E0:
mtc1  S1, F20
      NOP
cvt.s.w F20, F20
lui   AT, hi(D_8011E20C)
addu  AT, AT, S0
lwc1  F0, lo(D_8011E20C)(AT)
mul.s F0, F20, F0
lui   AT, hi(D_8011E1EC)
addu  AT, AT, S0
lwc1  F2, lo(D_8011E1EC)(AT)
add.s F0, F0, F2
trunc.w.s F2, F0
mfc1  A2, F2
      NOP
sll   A2, A2, 0x10
lui   AT, hi(D_8011E210)
addu  AT, AT, S0
lwc1  F0, lo(D_8011E210)(AT)
mul.s F0, F20, F0
lui   AT, hi(D_8011E1F0)
addu  AT, AT, S0
lwc1  F2, lo(D_8011E1F0)(AT)
add.s F0, F0, F2
trunc.w.s F2, F0
mfc1  A3, F2
      NOP
sll   A3, A3, 0x10
sra   A0, S2, 0x10
move  A1, R0
sra   A2, A2, 0x10
jal   0x80054904
 sra   A3, A3, 0x10
lhu   T0, 0x36(SP)
sll   A0, T0, 0x10
addiu V0, S1, -0x10
mtc1  V0, F0
      NOP
cvt.s.w F0, F0
lui   AT, hi(D_8011E20C)
addu  AT, AT, S0
lwc1  F2, lo(D_8011E20C)(AT)
mul.s F0, F0, F2
lui   AT, hi(D_8011E1EC)
addu  AT, AT, S0
lwc1  F2, lo(D_8011E1EC)(AT)
add.s F0, F0, F2
li    AT, 0x41000000 ; 8.000000
mtc1  AT, F2
      NOP
sub.s F0, F0, F2
trunc.w.s F2, F0
mfc1  A2, F2
      NOP
sll   A2, A2, 0x10
lui   AT, hi(D_8011E210)
addu  AT, AT, S0
lwc1  F0, lo(D_8011E210)(AT)
mul.s F20, F20, F0
lui   AT, hi(D_8011E1F0)
addu  AT, AT, S0
lwc1  F0, lo(D_8011E1F0)(AT)
add.s F20, F20, F0
trunc.w.s F0, F20
mfc1  A3, F0
      NOP
sll   A3, A3, 0x10
sra   A0, A0, 0x10
move  A1, R0
sra   A2, A2, 0x10
jal   0x80054904
 sra   A3, A3, 0x10
lw    T0, 0x1c(SP)
bnezl T0, L8010DB08
 addiu S1, S1, -2
L8010DB08:
jal   SleepVProcess
 addiu S1, S1, -2
slti  V0, S1, -0x10
beqz  V0, L8010D9E0
 move  A1, R0
lhu   T0, 0x36(SP)
sll   S0, T0, 0x10
sra   S0, S0, 0x10
move  A0, S0
move  A2, R0
jal   0x80055140
 move  A3, R0
move  A0, S0
move  A1, R0
jal   0x800550F4
 li    A2, 1
li    S1, 16
lhu   T0, 0x26(SP)
sll   S0, T0, 0x10
sll   A2, S1, 4
L8010DB58:
sra   A0, S0, 0x10
move  A1, R0
jal   0x80055458
 andi  A2, A2, 0xffff
jal   SleepVProcess
 addiu S1, S1, -2
bgez  S1, L8010DB58
 sll   A2, S1, 4
L8010DB78:
lhu   T0, 0x26(SP)
sll   A0, T0, 0x10
jal   0x800525C8
 sra   A0, A0, 0x10
lhu   T0, 0x2e(SP)
sll   A0, T0, 0x10
jal   FreeGraphics
 sra   A0, A0, 0x10
lhu   T0, 0x36(SP)
sll   A0, T0, 0x10
jal   0x800525C8
 sra   A0, A0, 0x10
lhu   T0, 0x3e(SP)
sll   A0, T0, 0x10
jal   FreeGraphics
 sra   A0, A0, 0x10
lw    T0, 0x1c(SP)
bnez  T0, L8010DCAC
 li    S5, -2
move  S1, R0
lui   A0, hi(current_turn)
lb    A0, lo(current_turn)(A0)
sll   V0, S1, 1
L8010DBD4:
addu  V1, V0, S1
lui   V0, hi(D_8011E22C)
addu  V0, V0, V1
lbu   V0, lo(D_8011E22C)(V0)
slt   V0, A0, V0
bnezl V0, L8010DC0C
 addiu S1, S1, 1
lui   V0, hi(D_8011E22D)
addu  V0, V0, V1
lbu   V0, lo(D_8011E22D)(V0)
slt   V0, V0, A0
beqz  V0, L8010DC18
 sll   V0, S1, 1
addiu S1, S1, 1
L8010DC0C:
sltiu V0, S1, 6
bnez  V0, L8010DBD4
 sll   V0, S1, 1
L8010DC18:
addu  V0, V0, S1
lui   S5, hi(D_8011E22E)
addu  S5, S5, V0
lbu   S5, lo(D_8011E22E)(S5)
move  S1, R0
sll   V0, S1, 1
L8010DC30:
addu  V1, V0, S1
lui   V0, hi(D_8011E240)
addu  V0, V0, V1
lbu   V0, lo(D_8011E240)(V0)
slt   V0, FP, V0
bnezl V0, L8010DC68
 addiu S1, S1, 1
lui   V0, hi(D_8011E241)
addu  V0, V0, V1
lbu   V0, lo(D_8011E241)(V0)
slt   V0, V0, FP
beqz  V0, L8010DC74
 sll   V0, S1, 1
addiu S1, S1, 1
L8010DC68:
sltiu V0, S1, 0xe
bnez  V0, L8010DC30
 sll   V0, S1, 1
L8010DC74:
addu  V0, V0, S1
lui   AT, hi(D_8011E242)
addu  AT, AT, V0
lbu   V0, lo(D_8011E242)(AT)
subu  S5, S5, V0
sll   V0, S4, 3
subu  V0, V0, S4
sll   V0, V0, 3
lui   AT, hi(p1_coins)
addu  AT, AT, V0
lh    V0, lo(p1_coins)(AT)
slt   V0, S5, V0
beql  V0, R0, L8010DCAC
 li    S5, -1
L8010DCAC:
move  V0, S5
lw    RA, 0x94(SP)
lw    FP, 0x90(SP)
lw    S7, 0x8c(SP)
lw    S6, 0x88(SP)
lw    S5, 0x84(SP)
lw    S4, 0x80(SP)
lw    S3, 0x7c(SP)
lw    S2, 0x78(SP)
lw    S1, 0x74(SP)
lw    S0, 0x70(SP)
ldc1  F24, 0xa8(SP)
ldc1  F22, 0xa0(SP)
ldc1  F20, 0x98(SP)
jr    RA
 addiu SP, SP, 0xb0

boo_event_helper_process:
addiu SP, SP, -0x40
sw    RA, 0x18(SP)
sw    S1, 0x14(SP)
sw    S0, 0x10(SP)
sdc1  F26, 0x38(SP)
sdc1  F24, 0x30(SP)
sdc1  F22, 0x28(SP)
jal   0x8004EE68
 sdc1  F20, 0x20(SP)
lw    S1, 0x8c(V0)
lui   A0, hi(D_8011FB58)
jal   0x800D975C
 lw    A0, lo(D_8011FB58)(A0)
move  S0, V0
addiu A0, S0, 0xc
jal   0x80089A20
 addiu A1, S1, 0xc
addiu A0, S0, 0x24
lui   A1, 0x4000
move  A2, A1
jal   0x80089A10
 move  A3, A1
lwc1  F0, 0x30(S1)
li    AT, 0x41200000 ; 10.000000
mtc1  AT, F2
      NOP
add.s F0, F0, F2
swc1  F0, 0x30(S0)
jal   0x800D9AA4
 move  A0, S0
li    AT, 0x43B40000 ; 360.000000
mtc1  AT, F12
jal   0x800EEF80
       NOP
mtc1  V0, F20
      NOP
cvt.s.w F20, F20
lui   AT, hi(D_8011F8D8)
ldc1  F22, lo(D_8011F8D8)(AT)
li    AT, 0x420C0000 ; 35.000000
mtc1  AT, F26
li    AT, 0x42200000 ; 40.000000
mtc1  AT, F24
L8010DD98:
jal   SleepVProcess
       NOP
lwc1  F0, 0x30(S0)
cvt.d.s F0, F0
add.d F0, F0, F22
cvt.s.d F0, F0
swc1  F0, 0x30(S0)
lwc1  F2, 0x30(S1)
add.s F2, F2, F26
c.le.s F2, F0
      NOP
bc1t  L8010DE0C
       NOP
add.s F20, F20, F24
lw    V0, 0x3c(S0)
lw    V0, 0x40(V0)
lh    V0, 0(V0)
sll   A0, V0, 1
addu  A0, A0, V0
sll   A0, A0, 6
lui   V0, hi(CORE_800D03F8)
lw    V0, lo(CORE_800D03F8)(V0)
addu  A0, A0, V0
mfc1  A1, F20
      NOP
jal   0x8008A2A0
 addiu A0, A0, 0x74
j     L8010DD98
       NOP
L8010DE0C:
jal   0x800D9B54
 move  A0, S0
jal   EndProcess
 move  A0, R0
lw    RA, 0x18(SP)
lw    S1, 0x14(SP)
lw    S0, 0x10(SP)
ldc1  F26, 0x38(SP)
ldc1  F24, 0x30(SP)
ldc1  F22, 0x28(SP)
ldc1  F20, 0x20(SP)
jr    RA
 addiu SP, SP, 0x40

boo_event_helper:
addiu SP, SP, -0x18
sw    RA, 0x14(SP)
sw    S0, 0x10(SP)
move  S0, A0
lui   A0, hi(boo_event_helper_process)
addiu A0, A0, lo(boo_event_helper_process)
li    A1, 4096
move  A2, R0
jal   InitProcess
 move  A3, R0
sw    S0, 0x8c(V0)
lw    RA, 0x14(SP)
lw    S0, 0x10(SP)
jr    RA
 addiu SP, SP, 0x18

__PP64_INTERNAL_BOO_SPACE_EVENT:
boo_event:
addiu SP, SP, -0x118
sw    RA, 0xe4(SP)
sw    FP, 0xe0(SP)
sw    S7, 0xdc(SP)
sw    S6, 0xd8(SP)
sw    S5, 0xd4(SP)
sw    S4, 0xd0(SP)
sw    S3, 0xcc(SP)
sw    S2, 0xc8(SP)
sw    S1, 0xc4(SP)
sw    S0, 0xc0(SP)
sdc1  F30, 0x110(SP)
sdc1  F28, 0x108(SP)
sdc1  F26, 0x100(SP)
sdc1  F24, 0xf8(SP)
sdc1  F22, 0xf0(SP)
sdc1  F20, 0xe8(SP)
move  S4, R0
move  S6, R0
jal   GetCurrentSpaceIndex
 sw    R0, 0x9c(SP)
lui   S7, hi(CORE_800CD058)
addiu S7, S7, lo(CORE_800CD058)
jal   GetPlayerStruct
 li    A0, -1
lui   A0, hi(current_player_index)
lb    A0, lo(current_player_index)(A0)
jal   0x800DBEC0
 move  S0, V0
sw    V0, 0xb4(SP)
li    A0, -1
li    A1, -1
jal   0x800F2304
 li    A2, 2
sh    R0, 0xae(SP)
lbu   A0, 0xf(S0)
sll   A0, A0, 0x18
sra   A0, A0, 0x18
lbu   A1, 0x10(S0)
sll   A1, A1, 0x18
sra   A1, A1, 0x18
andi  A0, A0, 0xffff
jal   GetAbsSpaceIndexFromChainSpaceIndex
 andi  A1, A1, 0xffff
move  S2, V0
sll   V0, S2, 0x10
sra   S0, V0, 0x10
li    V0, ${primaryBooEventSpace}
beq   S0, V0, L8010DFB4
 li    T0, -1
sw    T0, 0x94(SP)
li    T0, -1
sh    T0, 0xa6(SP)
lui   A0, hi(D_8011FB08)
jal   0x800D975C
 lw    A0, lo(D_8011FB08)(A0)
sw    V0, 0x8c(SP)
jal   0x800D9B24
 lw    A0, 0x8c(SP)
li    AT, 0x41F00000 ; 30.000000
mtc1  AT, F0
lw    T0, 0x8c(SP)
swc1  F0, 0x30(T0)
jal   GetSpaceData
 move  A0, S0
move  S1, V0
lwc1  F2, 0xc(S1)
li    AT, 0x41200000 ; 10.000000
mtc1  AT, F0
lw    T0, 0x8c(SP)
lw    A1, 8(S1)
add.s F0, F2, F0
mfc1  A2, F0
lw    A3, 0x10(S1)
jal   0x80089A10
 addiu A0, T0, 0xc
j     L8010E2D8
       NOP
L8010DFB4:
sw    R0, 0x94(SP)
li    T0, ${booIndex}
sh    T0, 0xa6(SP)
jal   GetSpaceData
 li    A0, ${booIndex}
move  S1, V0
lui   T0, hi(D_8011FB0C)
lw    T0, lo(D_8011FB0C)(T0)
sw    T0, 0x8c(SP)
jal   PlaySound
 li    A0, 293
li    A0, 51
jal   0x800D90C8
 move  A1, R0
move  S4, V0
lb    V0, 1(S7)
sll   V0, V0, 2
lui   AT, hi(D_8011E280)
addu  AT, AT, V0
lw    V0, lo(D_8011E280)(AT)
beqz  V0, L8010E01C
       NOP
lw    V0, 0x3c(S4)
lw    V0, 0x40(V0)
jal   0x8001ED54
 lh    A0, 0(V0)
L8010E01C:
lw    V0, 0x3c(S4)
lw    V0, 0x40(V0)
lh    A0, 0(V0)
jal   0x8001C448
 addiu S1, S1, 8
jal   0x800D9714
 move  A0, S4
sll   A0, S2, 0x10
jal   GetSpaceData
 sra   A0, A0, 0x10
addiu S0, SP, 0x68
move  A0, S0
addiu A1, V0, 8
jal   midpoint
 move  A2, S1
jal   0x800D88E8
 move  A0, S0
addiu A0, S4, 0x18
jal   0x80089A20
 move  A1, S0
sw    R0, 0x28(S4)
addiu A0, S4, 0xc
jal   0x80089A20
 move  A1, S1
move  A0, S4
li    A1, -1
jal   0x800D9CE8
 li    A2, 1
jal   0x800D9AA4
 move  A0, S4
li    AT, 0x42480000 ; 50.000000
mtc1  AT, F12
jal   0x8008EF20
       NOP
li    AT, 0x3F800000 ; 1.000000
mtc1  AT, F2
      NOP
div.s F22, F2, F0
mtc1  R0, F20
li    AT, 0x3F7D0000 ; 0.988281
ori AT, AT, 0x70a4
mtc1  AT, F26
li    AT, 0x3C230000 ; 0.009949
ori AT, AT, 0xd70a
mtc1  AT, F24
lui   S0, hi(D_8011E280)
addiu S0, S0, lo(D_8011E280)
li    AT, 0x41340000 ; 11.250000
mtc1  AT, F30
li    AT, 0x42B40000 ; 90.000000
mtc1  AT, F28
      NOP
L8010E0EC:
jal   0x8008EF20
 mov.s F12, F20
mul.s F0, F0, F22
swc1  F0, 0x28(S4)
jal   0x8008EF20
 mov.s F12, F20
mul.s F0, F0, F22
      NOP
mul.s F0, F0, F26
add.s F0, F0, F24
swc1  F0, 0x24(S4)
jal   0x8008EF20
 mov.s F12, F20
mul.s F0, F0, F22
      NOP
mul.s F0, F0, F26
add.s F0, F0, F24
swc1  F0, 0x2c(S4)
lb    V0, 1(S7)
sll   V0, V0, 2
addu  V0, V0, S0
lw    V0, 0(V0)
beqz  V0, L8010E158
       NOP
lwc1  F0, 0x24(S4)
neg.s F0, F0
swc1  F0, 0x24(S4)
L8010E158:
jal   SleepVProcess
       NOP
add.s F20, F20, F30
c.lt.s F20, F28
      NOP
bc1t  L8010E0EC
       NOP
li    AT, 0x42480000 ; 50.000000
mtc1  AT, F0
      NOP
c.lt.s F0, F20
      NOP
bc1f  L8010E24C
       NOP
li    AT, 0x3F7D0000 ; 0.988281
ori AT, AT, 0x70a4
mtc1  AT, F26
li    AT, 0x3C230000 ; 0.009949
ori AT, AT, 0xd70a
mtc1  AT, F24
lui   S0, hi(D_8011E280)
addiu S0, S0, lo(D_8011E280)
li    AT, 0x41340000 ; 11.250000
mtc1  AT, F30
li    AT, 0x42480000 ; 50.000000
mtc1  AT, F28
      NOP
L8010E1C4:
jal   0x8008EF20
 mov.s F12, F20
mul.s F0, F0, F22
swc1  F0, 0x28(S4)
jal   0x8008EF20
 mov.s F12, F20
mul.s F0, F0, F22
      NOP
mul.s F0, F0, F26
add.s F0, F0, F24
swc1  F0, 0x24(S4)
jal   0x8008EF20
 mov.s F12, F20
mul.s F0, F0, F22
      NOP
mul.s F0, F0, F26
add.s F0, F0, F24
swc1  F0, 0x2c(S4)
lb    V0, 1(S7)
sll   V0, V0, 2
addu  V0, V0, S0
lw    V0, 0(V0)
beqz  V0, L8010E230
       NOP
lwc1  F0, 0x24(S4)
neg.s F0, F0
swc1  F0, 0x24(S4)
L8010E230:
jal   SleepVProcess
       NOP
sub.s F20, F20, F30
c.lt.s F28, F20
      NOP
bc1t  L8010E1C4
       NOP
L8010E24C:
li    AT, 0x3F800000 ; 1.000000
mtc1  AT, F0
      NOP
swc1  F0, 0x28(S4)
swc1  F0, 0x24(S4)
swc1  F0, 0x2c(S4)
lb    V0, 1(S7)
sll   V0, V0, 2
lui   AT, hi(D_8011E280)
addu  AT, AT, V0
lw    V0, lo(D_8011E280)(AT)
beqz  V0, L8010E290
 move  A0, S4
li    AT, 0xBF800000 ; -1.000000
mtc1  AT, F0
      NOP
swc1  F0, 0x24(S4)
L8010E290:
li    A1, -1
jal   0x800D9CE8
 move  A2, R0
lw    V0, 0x3c(S4)
lw    V0, 0x40(V0)
lh    A0, 0(V0)
lui A1, 0x3f99
jal   0x8001C92C
 ori A1, A1, 0x999a
L8010E2B4:
jal   0x800D9E0C
 move  A0, S4
andi  V0, V0, 0xffff
bnez  V0, L8010E2D8
       NOP
jal   SleepVProcess
       NOP
j     L8010E2B4
       NOP
L8010E2D8:
jal   PlaySound
 li    A0, 599
lw    A0, 0x8c(SP)
jal   func_8010C914
       NOP
sll   A0, S2, 0x10
jal   GetSpaceData
 sra   A0, A0, 0x10
move  S1, V0
lhu   T0, 0xa6(SP)
sll   V0, T0, 0x10
sra   S0, V0, 0x10
li    V0, -1
beq   S0, V0, L8010E36C
 addiu A1, S1, 8
lw    A0, 0x8c(SP)
jal   0x800D9F5C
 li    A2, 5
li    A0, -1
li    A1, 5
jal   0x800ED20C
 move  A2, S0
jal   SleepProcess
 li    A0, 5
jal   0x8004EE68
       NOP
li    AT, 0x3FCC0000 ; 1.593750
ori AT, AT, 0xcccd
mtc1  AT, F12
      NOP
jal   0x800E8EDC
 move  S0, V0
move  A0, S0
jal   0x8004ED30
 move  A1, V0
jal   0x8004EE18
       NOP
L8010E36C:
lb    V0, 0xf(S7)
sll   V1, V0, 3
subu  V1, V1, V0
sll   V1, V1, 3
lui   V0, hi(p1_coins)
addu  V0, V0, V1
lh    V0, lo(p1_coins)(V0)
slti  V0, V0, 5
beqz  V0, L8010E3A4
 li    A0, 7
jal   0x800EC590
 li    A1, 0x6201 ; "Don't trouble me if you have no coins! Shoo! Shoo!"
j     L8010ECE0
       NOP
L8010E3A4:
move  S0, R0
L8010E3A8:
lb    A0, 0xf(S7)
L8010E3AC:
beq   S0, A0, L8010E3E4
 sll   V0, S0, 3
subu  V0, V0, S0
sll   V1, V0, 3
lui   V0, hi(p1_coins)
addu  V0, V0, V1
lh    V0, lo(p1_coins)(V0)
bnez  V0, L8010E3F4
 slti  V0, S0, 4
lui   V0, hi(p1_stars)
addu  V0, V0, V1
lb    V0, lo(p1_stars)(V0)
bnez  V0, L8010E3F4
 slti  V0, S0, 4 ; total players
L8010E3E4:
addiu S0, S0, 1
slti  V0, S0, 4 ; total players
bnez  V0, L8010E3AC
       NOP
L8010E3F4:
bnez  V0, L8010E410
 move  S0, R0
li    A0, 7
jal   0x800EC590
 li    A1, 0x6202 ; "There isn't a soul with coins or stars ..."
j     L8010ECE0
       NOP
L8010E410:
lb    V1, 0xf(S7)
L8010E414:
beq   S0, V1, L8010E438
 sll   V0, S0, 3
subu  V0, V0, S0
sll   V0, V0, 3
lui   AT, hi(p1_coins)
addu  AT, AT, V0
lh    V0, lo(p1_coins)(AT)
bnez  V0, L8010E448
 li    V0, 4
L8010E438:
addiu S0, S0, 1
slti  V0, S0, 4
bnez  V0, L8010E414
 li    V0, 4
L8010E448:
bne   S0, V0, L8010E460
 li    V0, 8
li    V0, 1
sb    V0, 0x20(SP)
j     L8010E46C
 sb    R0, 0x60(SP)
L8010E460:
sb    V0, 0x20(SP)
li    V0, 1
sb    V0, 0x60(SP)
L8010E46C:
sb    R0, 0x21(SP)
move  S0, R0
lb    V1, 0xf(S7)
L8010E478:
beq   S0, V1, L8010E49C
 sll   V0, S0, 3
subu  V0, V0, S0
sll   V0, V0, 3
lui   AT, hi(p1_stars)
addu  AT, AT, V0
lb    V0, lo(p1_stars)(AT)
bnez  V0, L8010E4AC
 li    V0, 4
L8010E49C:
addiu S0, S0, 1
slti  V0, S0, 4
bnez  V0, L8010E478
 li    V0, 4
L8010E4AC:
beq   S0, V0, L8010E4F8
 li    V0, 1
lb    V0, 0xf(S7)
sll   V1, V0, 3
subu  V1, V1, V0
sll   V1, V1, 3
lui   V0, hi(p1_coins)
addu  V0, V0, V1
lh    V0, lo(p1_coins)(V0)
slti  V0, V0, 0x32
bnez  V0, L8010E4F8
 li    V0, 1
lui   V0, hi(p1_stars)
addu  V0, V0, V1
lb    V0, lo(p1_stars)(V0)
slti  V0, V0, MAX_PLAYER_STAR_COUNT
bnez  V0, L8010E504
 li    V0, 8
li    V0, 1
L8010E4F8:
sb    V0, 0x30(SP)
j     L8010E510
 sb    R0, 0x61(SP)
L8010E504:
sb    V0, 0x30(SP)
li    V0, 1
sb    V0, 0x61(SP)
L8010E510:
sb    R0, 0x31(SP)
li    V0, 1
sb    V0, 0x63(SP)
sb    V0, 0x62(SP)
sw    R0, 0x10(SP)
sw    R0, 0x14(SP)
sw    R0, 0x18(SP)
li    A0, 7
li    A1, 0x6200 ; "Ooo, hoo, hoo! Which shall I steal? ..."
addiu A2, SP, 0x20
jal   0x800EC8EC ; ShowMessage
 addiu A3, SP, 0x30
jal   func_80107BB4
 addiu A0, SP, 0x60
move  S0, V0
jal   0x800EC6C8
 sh    S0, 0xae(SP)
jal   0x800EC6EC
 sll   S0, S0, 0x10
sra   S0, S0, 0x10
li    V0, 2
beq   S0, V0, L8010EC88
 slti  V0, S0, 3
bnez  V0, L8010E584
 li    V0, 3
beq   S0, V0, L8010ECA4
 li    V0, -1
j     L8010ECE0
       NOP
L8010E584:
bltz  S0, L8010ECE0
 move  S0, R0
move  S1, R0
L8010E590:
addiu S3, SP, 0x60
L8010E594:
addiu S2, SP, 0x20
li    S5, 1
lhu   T0, 0xae(SP)
sll   V0, T0, 0x10
sra   V0, V0, 0x10
sw    V0, 0xbc(SP)
li    FP, 8
L8010E5B0:
lb    V0, 0xf(S7)
beql  S0, V0, L8010E608
 addu  V0, S3, S1
lw    T0, 0xbc(SP)
bnez  T0, L8010E5EC
 sll   V0, S0, 3
subu  V0, V0, S0
sll   V0, V0, 3
lui   AT, hi(p1_coins)
addu  AT, AT, V0
lh    V0, lo(p1_coins)(AT)
beqz  V0, L8010E608
 addu  V0, S3, S1
j     L8010E620
 sb    S5, 0(V0)
L8010E5EC:
subu  V0, V0, S0
sll   V0, V0, 3
lui   AT, hi(p1_stars)
addu  AT, AT, V0
lb    V0, lo(p1_stars)(AT)
bnez  V0, L8010E61C
 addu  V0, S3, S1
L8010E608:
sb    R0, 0(V0)
sll   V0, S1, 4
addu  V0, S2, V0
j     L8010E62C
 sb    S5, 0(V0)
L8010E61C:
sb    S5, 0(V0)
L8010E620:
sll   V0, S1, 4
addu  V0, S2, V0
sb    FP, 0(V0)
L8010E62C:
sll   A1, S1, 4
addu  A1, S2, A1
move  A0, S0
jal   0x800E2260
 addiu A1, A1, 1
addiu S0, S0, 1
slti  V0, S0, 4
bnez  V0, L8010E5B0
 addiu S1, S1, 1
li    V0, 1
sb    V0, 0x64(SP)
sb    V0, 0x65(SP)
addiu V0, SP, 0x40
sw    V0, 0x10(SP)
addiu V0, SP, 0x50
sw    V0, 0x14(SP)
sw    R0, 0x18(SP)
li    A0, 7
li    A1, 0x5C02
addiu A2, SP, 0x20
jal   0x800EC8EC ; ShowMessage "Who's your opponent?"
 addiu A3, SP, 0x30
jal   func_80107BD4
 addiu A0, SP, 0x60
move  S0, V0
jal   0x800EC6C8
 move  S2, S0
jal   0x800EC6EC
 move  S1, R0
sll   S0, S0, 0x10
sra   S0, S0, 0x10
li    V0, 4
beq   S0, V0, L8010E718 ; Your Choice
 slti  V0, S0, 5
beqz  V0, L8010E6CC
 li    V0, -1
beq   S0, V0, L8010E3A8
 move  S0, R0
j     L8010E8A4
       NOP
L8010E6CC:
li    V0, 5
bne   S0, V0, L8010E8A4
 li    V0, -1
lw    T0, 0x94(SP)
bne   T0, V0, L8010E708
       NOP
jal   func_80106FE8
 move  S0, R0
li    V0, 1
lui   AT, hi(CORE_800CB99C)
sb    V0, lo(CORE_800CB99C)(AT)
jal   0x80049FB8
 move  S1, R0
j     L8010E594
 addiu S3, SP, 0x60
L8010E708:
jal   __PP64_INTERNAL_VIEW_MAP
 move  S0, R0
j     L8010E590
 move  S1, R0
L8010E718:
move  S0, R0
move  S2, R0
addiu S3, SP, 0x20
move  S1, R0
L8010E728:
jal   0x800EE9C0
 move  A0, S1
bnel  S0, V0, L8010E754
 addiu S1, S1, 1
lb    V0, 0xf(S7)
beq   V0, S1, L8010E750
 sll   V0, S2, 2
addu  V0, V0, S3
sw    S1, 0x58(V0)
addiu S2, S2, 1
L8010E750:
addiu S1, S1, 1
L8010E754:
slti  V0, S1, 4
bnez  V0, L8010E728
       NOP
addiu S0, S0, 1
slti  V0, S0, 4
bnezl V0, L8010E728
 move  S1, R0
li    AT, 0x42C80000 ; 100.000000
mtc1  AT, F12
      NOP
jal   0x800EEF80
 move  S0, R0
move  V1, V0
lui   A0, hi(D_8011E274)
addiu A0, A0, lo(D_8011E274)
sll   V0, S0, 2
L8010E794:
addu  V0, V0, A0
lw    V0, 0(V0)
slt   V0, V1, V0
bnez  V0, L8010E7B8
       NOP
addiu S0, S0, 1
slti  V0, S0, 3
bnez  V0, L8010E794
 sll   V0, S0, 2
L8010E7B8:
lhu   T0, 0xae(SP)
sll   V0, T0, 0x10
beqz  V0, L8010E808
 addiu A0, SP, 0x20
L8010E7C8:
sll   V0, S0, 2
addu  V0, V0, A0
lw    V1, 0x58(V0)
sll   V0, V1, 3
subu  V0, V0, V1
sll   V0, V0, 3
lui   AT, hi(p1_stars)
addu  AT, AT, V0
lb    V0, lo(p1_stars)(AT)
beql  V0, R0, L8010E7C8
 addiu S0, S0, -1
lb    V0, 0xf(S7)
beql  V1, V0, L8010E7C8
 addiu S0, S0, -1
j     L8010E898
 sll   V0, S0, 2
L8010E808:
bltz  S0, L8010E84C
 sll   V0, S0, 2
L8010E810:
addu  V0, V0, A0
lw    V1, 0x58(V0)
sll   V0, V1, 3
subu  V0, V0, V1
sll   V0, V0, 3
lui   AT, hi(p1_coins)
addu  AT, AT, V0
lh    V0, lo(p1_coins)(AT)
beqz  V0, L8010E844
 addiu S0, S0, -1
lb    V0, 0xf(S7)
bnel  V1, V0, L8010E850
 li    S0, 2
L8010E844:
bgez  S0, L8010E810
 sll   V0, S0, 2
L8010E84C:
li    S0, 2
L8010E850:
addiu A0, SP, 0x20
sll   V0, S0, 2
L8010E858:
addu  V0, V0, A0
lw    V1, 0x58(V0)
sll   V0, V1, 3
subu  V0, V0, V1
sll   V0, V0, 3
lui   AT, hi(p1_coins)
addu  AT, AT, V0
lh    V0, lo(p1_coins)(AT)
beql  V0, R0, L8010E890
 addiu S0, S0, -1
lb    V0, 0xf(S7)
bne   V1, V0, L8010E898
 sll   V0, S0, 2
addiu S0, S0, -1
L8010E890:
bgez  S0, L8010E858
 sll   V0, S0, 2
L8010E898:
addu  V0, SP, V0
lhu   S2, 0x7a(V0)
li    S1, 1
L8010E8A4:
lhu   T0, 0xae(SP)
sll   V0, T0, 0x10
bnez  V0, L8010E8CC
       NOP
; paying to steal coins
lb    A0, 0xf(S7)
jal   ShowPlayerCoinChange
 li    A1, -5
lb    A0, 0xf(S7)
j     L8010E8E0
 li    A1, -5
L8010E8CC: ; paying to steal a star
lb    A0, 0xf(S7)
jal   ShowPlayerCoinChange
 li    A1, -50
lb    A0, 0xf(S7)
li    A1, -50
L8010E8E0:
jal   AdjustPlayerCoinsGradual
       NOP
jal   SleepProcess
 li    A0, 30
lhu   T0, 0xae(SP)
sll   V0, T0, 0x10
sra   V0, V0, 0x10
li    V1, 1
bne   V0, V1, L8010E918
 move  S0, R0
beqz  S1, L8010E9AC
 li    A0, 7
j     L8010E9A4
 li    A1, 25094
L8010E918:
lui   A0, hi(current_turn)
lb    A0, lo(current_turn)(A0)
sll   V0, S0, 1
L8010E924:
addu  V1, V0, S0
lui   V0, hi(D_8011E22C)
addu  V0, V0, V1
lbu   V0, lo(D_8011E22C)(V0)
slt   V0, A0, V0
bnezl V0, L8010E95C
 addiu S0, S0, 1
lui   V0, hi(D_8011E22D)
addu  V0, V0, V1
lbu   V0, lo(D_8011E22D)(V0)
slt   V0, V0, A0
beqz  V0, L8010E968
 sll   V0, S0, 1
addiu S0, S0, 1
L8010E95C:
sltiu V0, S0, 6
bnez  V0, L8010E924
 sll   V0, S0, 1
L8010E968:
addu  V0, V0, S0
lui   AT, hi(D_8011E22E)
addu  AT, AT, V0
lbu   V0, lo(D_8011E22E)(AT)
bnez  S1, L8010E99C
 sw    V0, 0x9c(SP)
li    AT, 0x40C00000 ; 6.000000
mtc1  AT, F12
jal   0x800EEF80
       NOP
li    A0, 7
j     L8010E9A4
 addiu A1, V0, 0x6207 ; "Good! Here I go... I feel great! Great! Leave it to me!"
L8010E99C:
li    A0, 7
li    A1, 0x620D ; "Good, good... I'll steal coins from that no-good fool..."
L8010E9A4:
jal   0x800EC590
       NOP
L8010E9AC:
jal   func_8010C9B4
 lw    A0, 0x8c(SP)
lhu   T0, 0xae(SP)
sll   V0, T0, 0x10
bnez  V0, L8010EBEC
 sll   A0, S2, 0x10
sll   V0, S2, 0x10
sra   S0, V0, 0x10
jal   func_8010CEC0
 move  A0, S0
lw    A0, 0x8c(SP)
jal   func_8010C914
 move  S6, V0
li    V0, -2
beq   S6, V0, L8010EC38
 li    V0, -1
bne   S6, V0, L8010EA34
 addiu A0, SP, 0x20
sll   V0, S0, 3
subu  V0, V0, S0
sll   V0, V0, 3
lui   S6, hi(p1_coins)
addu  S6, S6, V0
lh    S6, lo(p1_coins)(S6)
lui   A1, hi(percent_d_str_format)
addiu A1, A1, lo(percent_d_str_format)
jal   sprintf
 move  A2, S6
sw    R0, 0x10(SP)
sw    R0, 0x14(SP)
sw    R0, 0x18(SP)
li    A0, 7
j     L8010EA8C
 li    A1, 25108
L8010EA34:
lui   A1, hi(percent_d_str_format)
addiu A1, A1, lo(percent_d_str_format)
jal   sprintf
 move  A2, S6
lw    T0, 0x9c(SP)
subu  V1, T0, S6
move  S0, R0
L8010EA50:
lui   V0, hi(D_8011E26C)
addu  V0, V0, S0
lbu   V0, lo(D_8011E26C)(V0)
slt   V0, V1, V0
beql  V0, R0, L8010EA7C
 sw    R0, 0x10(SP)
addiu S0, S0, 1
slti  V0, S0, 4
bnez  V0, L8010EA50
       NOP
sw    R0, 0x10(SP)
L8010EA7C:
sw    R0, 0x14(SP)
sw    R0, 0x18(SP)
li    A0, 7
addiu A1, S0, 0x6210
L8010EA8C:
addiu A2, SP, 0x20
jal   0x800EC8EC ; ShowMessage: "That's rediculous! I only got _ coins!"
 move  A3, R0
jal   0x800EC6C8
       NOP
jal   0x800EC6EC
       NOP
li    V0, -2
beq   S6, V0, L8010EC38
 li    A0, 25
lui   AT, hi(CORE_800D037C)
sh    R0, lo(CORE_800D037C)(AT)
mtc1  S6, F24
      NOP
cvt.s.w F24, F24
li    AT, 0x42B40000 ; 90.000000
mtc1  AT, F0
      NOP
div.s F24, F24, F0
mtc1  R0, F20
      NOP
jal   0x800D90C8
 move  A1, R0
lui   AT, hi(D_8011FB58)
sw    V0, lo(D_8011FB58)(AT)
jal   0x800D9714
 move  A0, V0
lui   A0, hi(D_8011FB58)
jal   0x800D9B24
 lw    A0, lo(D_8011FB58)(A0)
sll   A0, S2, 0x10
sra   A0, A0, 0x10
li    A1, 3
jal   0x800FFA4C
 li    A2, 5
beqz  S6, L8010EB7C
 move  S1, V0
li    AT, 0x3F800000
mtc1  AT, F22
sll   S0, S2, 0x10
add.s F20, F20, F24
L8010EB30:
c.le.s F22, F20
      NOP
bc1f  L8010EB6C
       NOP
lw    A0, 0x8c(SP)
jal   boo_event_helper
 sub.s F20, F20, F22
lb    A0, 0xf(S7)
jal   AdjustPlayerCoinsGradual
 li    A1, 1
sra   A0, S0, 0x10
li    A1, -1
jal   0x800F5BF4
 move  A2, R0
addiu S6, S6, -1
L8010EB6C:
jal   SleepVProcess
       NOP
bnezl S6, L8010EB30
 add.s F20, F20, F24
L8010EB7C:
jal   0x800FFAEC
 move  A0, S1
jal   SleepProcess
 li    A0, 20
lui   A0, hi(D_8011FB58)
jal   0x800D9B54
 lw    A0, lo(D_8011FB58)(A0)
jal   GetPlayerStruct
 li    A0, -1
lw    A0, 0x24(V0)
jal   0x800ECC0C
 addiu A0, A0, 0x18
li    A0, -1
li    A1, 5
jal   0x800F2304
 move  A2, R0
jal   SleepProcess
 li    A0, 5
lb    A1, 0xf(S7)
jal   0x8004ACE0
 li    A0, 628
jal   SleepProcess
 li    A0, 45
li    V0, 1
lui   AT, hi(CORE_800D037C)
sh    V0, lo(CORE_800D037C)(AT)
j     L8010EC3C
 li    V0, -1
L8010EBEC:
jal   func_8010CA54
 sra   A0, A0, 0x10
lw    A0, 0x8c(SP)
jal   func_8010C914
 move  S0, V0
beqz  S0, L8010EC34
 li    A0, 7
jal   0x800EC590
 li    A1, 0x6205 ; "I got a star! ..."
li    V0, 1
lui   AT, hi(D_8011D308)
sw    V0, lo(D_8011D308)(AT)
jal   func_80106EEC
 lw    A0, 0x8c(SP)
lui   AT, hi(D_8011D308)
sw    R0, lo(D_8011D308)(AT)
j     L8010EC3C
 li    V0, -1
L8010EC34:
li    S6, -2
L8010EC38:
li    V0, -1
L8010EC3C:
lw    T0, 0x94(SP)
bne   T0, V0, L8010EC64
 li    V0, -2
jal   SleepProcess
 li    A0, 20
li    A0, -1
li    A1, -1
jal   0x800F2304
 li    A2, 2
li    V0, -2
L8010EC64:
bne   S6, V0, L8010ECE0
       NOP
jal   SleepProcess
 li    A0, 30
li    A0, 7
jal   0x800EC590
 li    A1, 0x6215 ; "There was weird gas all over the place! I feel awful!"
j     L8010ECE0
       NOP
L8010EC88:
jal   func_8010C9B4
 lw    A0, 0x8c(SP)
li    A0, 7
jal   0x800EC590
 li    A1, 0x6203 ; "What are you thinking? I can't believe it! Ooo, hoo, hoo!"
j     L8010ECE0
       NOP
L8010ECA4:
lw    T0, 0x94(SP)
bne   T0, V0, L8010ECD0
       NOP
jal   func_80106FE8
 move  S0, R0
li    V0, 1
lui   AT, hi(CORE_800CB99C)
jal   0x80049FB8
 sb    V0, lo(CORE_800CB99C)(AT)
j     L8010E3A8
       NOP
L8010ECD0:
jal   __PP64_INTERNAL_VIEW_MAP
 move  S0, R0
j     L8010E3A8
       NOP
L8010ECE0:
lhu   T0, 0xae(SP)
sll   V0, T0, 0x10
sra   V0, V0, 0x10
li    V1, 2
beq   V0, V1, L8010ED00
       NOP
jal   func_8010C9B4
 lw    A0, 0x8c(SP)
L8010ED00:
lw    T0, 0x8c(SP)
jal   0x800ECC0C
 addiu A0, T0, 0x18
li    V0, -1
lw    T0, 0x94(SP)
bne   T0, V0, L8010ED24
       NOP
jal   0x800D9B54
 lw    A0, 0x8c(SP)
L8010ED24:
lhu   T0, 0xa6(SP)
sll   V0, T0, 0x10
sra   V0, V0, 0x10
li    V1, -1
beq   V0, V1, L8010EFA4
       NOP
jal   PlaySound
 li    A0, 294
move  A0, S4
li    A1, -1
jal   0x800D9CE8
 li    A2, 4
lw    V0, 0x3c(S4)
lw    V0, 0x40(V0)
lh    A0, 0(V0)
lui   A1, 0x3f99
jal   0x8001C92C
 ori A1, A1, 0x999a
lw    V0, 0x3c(S4)
lw    V0, 0x40(V0)
lh    A0, 0(V0)
lui   V1, hi(CORE_800D03F8)
lw    V1, lo(CORE_800D03F8)(V1)
sll   V0, A0, 1
addu  V0, V0, A0
sll   V0, V0, 6
addu  V0, V0, V1
lbu   V1, 2(V0)
lui   A1, hi(CORE_800CCF58)
lw    A1, lo(CORE_800CCF58)(A1)
sll   V0, V1, 1
addu  V0, V0, V1
sll   V0, V0, 3
addu  V0, V0, A1
lh    V0, 2(V0)
mtc1  V0, F4
      NOP
cvt.s.w F4, F4
mfc1  A1, F4
jal   0x8001C6A8
       NOP
L8010EDC8:
jal   0x800D9E80
 move  A0, S4
andi  V0, V0, 0xffff
bnez  V0, L8010EDEC
       NOP
jal   SleepVProcess
       NOP
j     L8010EDC8
       NOP
L8010EDEC:
li    AT, 0x42480000 ; 50.000000
mtc1  AT, F12
jal   0x8008EF20
       NOP
li    AT, 0x3F800000 ; 1.000000
mtc1  AT, F2
      NOP
div.s F22, F2, F0
li    AT, 0x42480000 ; 50.000000
mtc1  AT, F20
li    AT, 0x3E4C0000 ; 0.199219
ori   AT, AT, 0xcccd
mtc1  AT, F26
li    AT, 0x3F4C0000 ; 0.796875
ori   AT, AT, 0xcccd
mtc1  AT, F24
lui   S0, hi(D_8011E280)
addiu S0, S0, lo(D_8011E280)
li    AT, 0x41340000 ; 11.250000
mtc1  AT, F30
li    AT, 0x42B40000 ; 90.000000
mtc1  AT, F28
      NOP
L8010EE48:
jal   0x8008EF20
 mov.s F12, F20
mul.s F0, F0, F22
swc1  F0, 0x28(S4)
jal   0x8008EF20
 mov.s F12, F20
mul.s F0, F0, F22
      NOP
mul.s F0, F0, F26
add.s F0, F0, F24
swc1  F0, 0x24(S4)
jal   0x8008EF20
 mov.s F12, F20
mul.s F0, F0, F22
      NOP
mul.s F0, F0, F26
add.s F0, F0, F24
swc1  F0, 0x2c(S4)
lb    V0, 1(S7)
sll   V0, V0, 2
addu  V0, V0, S0
lw    V0, 0(V0)
beqz  V0, L8010EEB4
       NOP
lwc1  F0, 0x24(S4)
neg.s F0, F0
swc1  F0, 0x24(S4)
L8010EEB4:
jal   SleepVProcess
       NOP
add.s F20, F20, F30
c.lt.s F20, F28
      NOP
bc1t  L8010EE48
       NOP
li    AT, 0x42B40000 ; 90.000000
mtc1  AT, F20
li    AT, 0x3E4C0000 ; 0.199219
ori   AT, AT, 0xcccd
mtc1  AT, F26
li    AT, 0x3F4C0000 ; 0.796875
ori   AT, AT, 0xcccd
mtc1  AT, F24
lui   S0, hi(D_8011E280)
addiu S0, S0, lo(D_8011E280)
li    AT, 0x41340000 ; 11.250000
mtc1  AT, F30
mtc1  R0, F28
      NOP
L8010EF08:
jal   0x8008EF20
 mov.s F12, F20
mul.s F0, F0, F22
swc1  F0, 0x28(S4)
jal   0x8008EF20
 mov.s F12, F20
mul.s F0, F0, F22
      NOP
mul.s F0, F0, F26
add.s F0, F0, F24
swc1  F0, 0x24(S4)
jal   0x8008EF20
 mov.s F12, F20
mul.s F0, F0, F22
      NOP
mul.s F0, F0, F26
add.s F0, F0, F24
swc1  F0, 0x2c(S4)
lb    V0, 1(S7)
sll   V0, V0, 2
addu  V0, V0, S0
lw    V0, 0(V0)
beqz  V0, L8010EF74
       NOP
lwc1  F0, 0x24(S4)
neg.s F0, F0
swc1  F0, 0x24(S4)
L8010EF74:
jal   SleepVProcess
       NOP
sub.s F20, F20, F30
c.lt.s F28, F20
      NOP
bc1t  L8010EF08
       NOP
sw    R0, 0x28(S4)
sw    R0, 0x24(S4)
sw    R0, 0x2c(S4)
jal   0x800D9B54
 move  A0, S4
L8010EFA4:
lw    T0, 0xb4(SP)
beqz  T0, L8010EFC0
 li    V0, -1
lb    A0, 0xf(S7)
jal   0x800DB884
       NOP
li    V0, -1
L8010EFC0:
lw    T0, 0x94(SP)
beq   T0, V0, L8010F000
       NOP
jal   0x8004EE68
       NOP
li    AT, 0x3FA60000 ; 1.296875
ori   AT, AT, 0x6666
mtc1  AT, F12
      NOP
jal   0x800E8EDC
 move  S0, V0
move  A0, S0
jal   0x8004ED30
 move  A1, V0
jal   0x8004EE18
       NOP
L8010F000:
lw    RA, 0xe4(SP)
lw    FP, 0xe0(SP)
lw    S7, 0xdc(SP)
lw    S6, 0xd8(SP)
lw    S5, 0xd4(SP)
lw    S4, 0xd0(SP)
lw    S3, 0xcc(SP)
lw    S2, 0xc8(SP)
lw    S1, 0xc4(SP)
lw    S0, 0xc0(SP)
ldc1  F30, 0x110(SP)
ldc1  F28, 0x108(SP)
ldc1  F26, 0x100(SP)
ldc1  F24, 0xf8(SP)
ldc1  F22, 0xf0(SP)
ldc1  F20, 0xe8(SP)
jr    RA
 addiu SP, SP, 0x118

func_8010F088:
addiu SP, SP, -0x48
sw    RA, 0x30(SP)
sw    S5, 0x2c(SP)
sw    S4, 0x28(SP)
sw    S3, 0x24(SP)
sw    S2, 0x20(SP)
sw    S1, 0x1c(SP)
sw    S0, 0x18(SP)
sdc1  F22, 0x40(SP)
sdc1  F20, 0x38(SP)
move  S3, A0
mtc1  A1, F20
mtc1  A2, F22
lw    S0, 0x58(SP)
lw    S1, 0x5c(SP)
move  S5, A3
lui   V0, hi(D_8010F1E4)
addiu V0, V0, lo(D_8010F1E4)
sw    V0, 0x10(SP)
li    A0, 500
move  A1, R0
move  A2, R0
jal   0x80047620
 li    A3, -1
move  S4, V0
li    A0, 32
jal   0x80019A14
 li    A1, 31000
sw    V0, 0x5c(S4)
move  S2, V0
li    AT, 0x437F0000 ; 255.000000
mtc1  AT, F0
      NOP
swc1  F0, 0xc(S2)
swc1  F20, 0x10(S2)
swc1  F22, 0x14(S2)
move  A0, S2
jal   0x80089A20
 move  A1, S0
beqz  S1, L8010F138
 lui A0, 0x13
sw    R0, 0x10(SP)
j     L8010F140
 ori A0, A0, 0x1f8
L8010F138:
sw    R0, 0x10(SP)
ori   A0, A0, 0x1f7
L8010F140:
move  A1, R0
lui   A2, 0x3f80
jal   0x800D912C
 move  A3, R0
move  S0, V0
lw    V0, 0x3c(S0)
lw    V0, 0x40(V0)
lh    A0, 0(V0)
move  A1, R0
move  A2, A1
jal   0x8001C1A0
 move  A3, A1
lwc1  F0, 0(S3)
swc1  F0, 0xc(S0)
lwc1  F0, 4(S3)
swc1  F0, 0x10(S0)
lwc1  F0, 8(S3)
swc1  F0, 0x14(S0)
lw    V0, 0x3c(S0)
lw    V0, 0x40(V0)
jal   0x8001FA68
 lh    A0, 0(V0)
lw    V0, 0x3c(S0)
lw    V0, 0x40(V0)
lh    A0, 0(V0)
jal   0x8001F9E4
 li    A1, 255
sw    S0, 0x18(S2)
sh    S5, 0x1c(S2)
move  V0, S4
lw    RA, 0x30(SP)
lw    S5, 0x2c(SP)
lw    S4, 0x28(SP)
lw    S3, 0x24(SP)
lw    S2, 0x20(SP)
lw    S1, 0x1c(SP)
lw    S0, 0x18(SP)
ldc1  F22, 0x40(SP)
ldc1  F20, 0x38(SP)
jr    RA
 addiu SP, SP, 0x48

D_8010F1E4:
addiu SP, SP, -0x20
sw    RA, 0x1c(SP)
sw    S2, 0x18(SP)
sw    S1, 0x14(SP)
sw    S0, 0x10(SP)
move  S2, A0
lw    S0, 0x5c(S2)
lw    S1, 0x18(S0)
addiu A1, S1, 0xc
move  A0, A1
jal   0x80089A70
 move  A2, S0
lwc1  F0, 0x2c(S1)
lwc1  F2, 0x10(S0)
add.s F0, F0, F2
swc1  F0, 0x2c(S1)
swc1  F0, 0x28(S1)
swc1  F0, 0x24(S1)
lwc1  F0, 0xc(S0)
lwc1  F2, 0x14(S0)
sub.s F0, F0, F2
mtc1  R0, F2
      NOP
c.lt.s F0, F2
      NOP
      NOP
bc1f  L8010F288
 swc1  F0, 0xc(S0)
swc1  F2, 0xc(S0)
lhu   V0, 0x1c(S0)
beqz  V0, L8010F280
 move  A0, S2
lw    A0, 0x18(S0)
jal   0x800D9B54
       NOP
jal   0x800479AC
 move  A0, S2
j     L8010F2E4
       NOP
L8010F280:
jal   0x80047B38
 li    A1, 8
L8010F288:
lw    V0, 0x3c(S1)
lw    V0, 0x40(V0)
lh    A0, 0(V0)
lwc1  F2, 0xc(S0)
li    AT, 0x4F000000 ; 2147483648.000000
mtc1  AT, F0
      NOP
c.le.s F0, F2
      NOP
      NOP
bc1tl L8010F2C8
 sub.s F0, F2, F0
trunc.w.s F0, F2
mfc1  A1, F0
j     L8010F2DC
       NOP
L8010F2C8:
lui   V0, 0x8000
trunc.w.s F2, F0
mfc1  A1, F2
      NOP
or    A1, A1, V0
L8010F2DC:
jal   0x8001F9E4
 andi  A1, A1, 0xff
L8010F2E4:
lw    RA, 0x1c(SP)
lw    S2, 0x18(SP)
lw    S1, 0x14(SP)
lw    S0, 0x10(SP)
jr    RA
 addiu SP, SP, 0x20

func_8010F2FC:
addiu SP, SP, -0x128
sw    RA, 0x110(SP)
sw    S7, 0x10c(SP)
sw    S6, 0x108(SP)
sw    S5, 0x104(SP)
sw    S4, 0x100(SP)
sw    S3, 0xfc(SP)
sw    S2, 0xf8(SP)
sw    S1, 0xf4(SP)
sw    S0, 0xf0(SP)
sdc1  F22, 0x120(SP)
sdc1  F20, 0x118(SP)
lui   S7, hi(CORE_800CD058)
addiu S7, S7, lo(CORE_800CD058)
jal   GetPlayerStruct
 li    A0, -1
jal   func_8010FE54
 move  S3, V0
li    A0, 36
jal   0x800D90C8
 move  A1, R0
move  S1, V0
lw    V0, 0x3c(S1)
lw    V0, 0x40(V0)
lh    A0, 0(V0)
move  A1, R0
move  A2, A1
jal   0x8001C1A0
 move  A3, A1
lw    A1, 0x24(S3)
addiu A0, S1, 0xc
jal   0x80089A20
 addiu A1, A1, 0xc
li    AT, 0x42C80000 ; 100.000000
mtc1  AT, F0
      NOP
swc1  F0, 0x10(S1)
li    AT, 0x3F800000 ; 1.000000
mtc1  AT, F22
li    AT, 0x41F00000 ; 30.000000
mtc1  AT, F20
lwc1  F0, 0x10(S1)
sub.s F0, F0, F22
L8010F3A8:
jal   SleepVProcess
 swc1  F0, 0x10(S1)
lwc1  F0, 0x10(S1)
c.lt.s F20, F0
      NOP
      NOP
bc1tl L8010F3A8
 sub.s F0, F0, F22
jal   PlaySound
 li    A0, 295
jal   0x8004A7C4
 li    A0, 180
li    A0, -1
li    A1, 4
jal   0x800FFA4C
 li    A2, 5
move  S5, V0
li    S2, 180
move  S0, R0
lui   S6, hi(D_8011F940)
addiu S6, S6, lo(D_8011F940)
li    AT, 0x41F00000 ; 30.000000
mtc1  AT, F22
li    AT, 0x41700000 ; 15.000000
mtc1  AT, F20
addiu S4, SP, 0x28
L8010F410:
addiu A3, SP, 0x28
lui   A2, hi(D_8011F8E0)
addiu A2, A2, lo(D_8011F8E0)
L8010F41C:
lw    V0, 0(A2)
lw    V1, 4(A2)
lw    A0, 8(A2)
lw    A1, 0xc(A2)
sw    V0, 0(A3)
sw    V1, 4(A3)
sw    A0, 8(A3)
sw    A1, 0xc(A3)
addiu A2, A2, 0x10
bne   A2, S6, L8010F41C
 addiu A3, A3, 0x10
mtc1  S2, F12
      NOP
jal   0x8008EF20
 cvt.s.w F12, F12
add.s F0, F0, F0
add.s F0, F0, F22
andi  V0, S0, 1
beqz  V0, L8010F4D8
 swc1  F0, 0x10(S1)
lw    A1, 0xc(S1)
mfc1  A2, F0
lw    A3, 0x14(S1)
jal   0x80089A10
 addiu A0, SP, 0x18
lwc1  F0, 0x18(SP)
sub.s F0, F0, F20
swc1  F0, 0x18(SP)
lwc1  F0, 0x1c(SP)
add.s F0, F0, F20
swc1  F0, 0x1c(SP)
srl   V1, S0, 0x1f
addu  V1, S0, V1
sra   V1, V1, 1
andi  V1, V1, 7
sll   V0, V1, 1
addu  V0, V0, V1
sll   V0, V0, 2
addu  V0, S4, V0
sw    V0, 0x10(SP)
sw    R0, 0x14(SP)
addiu A0, SP, 0x18
lui A1, 0x3dcc
ori A1, A1, 0xcccd
lui   A2, 0x4000
jal   func_8010F088
 li    A3, 1
L8010F4D8:
jal   SleepVProcess
 addiu S2, S2, 0x14
slti  V0, S2, 0x438
bnez  V0, L8010F410
 addiu S0, S0, 1
jal   0x800FFAEC
 move  A0, S5
li    A0, 255
li    A1, 255
jal   0x800620C8
 li    A2, 255
lb    V0, 5(S7)
addu  V0, S7, V0
lb    V0, 6(V0)
sll   V0, V0, 1
lui   A0, hi(star_space_indices)
addu  A0, A0, V0
lh    A0, lo(star_space_indices)(A0)
addiu A1, SP, 0x88
jal   0x800EB24C
 addiu A2, SP, 0x89
lbu   V0, 0x88(SP)
sb    V0, 0xf(S3)
lbu   V0, 0x89(SP)
sb    V0, 0x10(S3)
lbu   V0, 0x88(SP)
sb    V0, 0x11(S3)
lbu   V0, 0x89(SP)
addiu V0, V0, 1
sb    V0, 0x12(S3)
lbu   V0, 0x88(SP)
sb    V0, 0x15(S3)
lbu   V0, 0x89(SP)
addiu V0, V0, -1
sb    V0, 0x16(S3)
lbu   V0, 0x17(S3)
andi  V0, V0, 0xfe
jal   0x800FC9E0
 sb    V0, 0x17(S3)
jal   PlaySound
 li    A0, 296
jal   0x8004A0E0
       NOP
lui   S4, hi(D_8011F940)
addiu S4, S4, lo(D_8011F940)
li    AT, 0x41F00000 ; 30.000000
mtc1  AT, F22
li    AT, 0x41700000 ; 15.000000
mtc1  AT, F20
addiu S3, SP, 0x90
addiu A3, SP, 0x90
L8010F5A4:
lui   A2, hi(D_8011F8E0)
addiu A2, A2, lo(D_8011F8E0)
L8010F5AC:
lw    V0, 0(A2)
lw    V1, 4(A2)
lw    A0, 8(A2)
lw    A1, 0xc(A2)
sw    V0, 0(A3)
sw    V1, 4(A3)
sw    A0, 8(A3)
sw    A1, 0xc(A3)
addiu A2, A2, 0x10
bne   A2, S4, L8010F5AC
 addiu A3, A3, 0x10
mtc1  S2, F12
      NOP
jal   0x8008EF20
 cvt.s.w F12, F12
add.s F0, F0, F0
add.s F0, F0, F22
andi  V0, S0, 1
beqz  V0, L8010F668
 swc1  F0, 0x10(S1)
lw    A1, 0xc(S1)
mfc1  A2, F0
lw    A3, 0x14(S1)
jal   0x80089A10
 addiu A0, SP, 0x18
lwc1  F0, 0x18(SP)
sub.s F0, F0, F20
swc1  F0, 0x18(SP)
lwc1  F0, 0x1c(SP)
add.s F0, F0, F20
swc1  F0, 0x1c(SP)
srl   V1, S0, 0x1f
addu  V1, S0, V1
sra   V1, V1, 1
andi  V1, V1, 7
sll   V0, V1, 1
addu  V0, V0, V1
sll   V0, V0, 2
addu  V0, S3, V0
sw    V0, 0x10(SP)
sw    R0, 0x14(SP)
addiu A0, SP, 0x18
lui   A1, 0x3dcc
ori   A1, A1, 0xcccd
lui   A2, 0x4000
jal   func_8010F088
 li    A3, 1
L8010F668:
jal   SleepVProcess
 addiu S0, S0, 1
addiu S2, S2, 0x14
li    V0, 1280
bnel  S2, V0, L8010F5A4
 addiu A3, SP, 0x90
jal   0x80003A70
 move  A0, R0
j     L8010F5A4
 addiu A3, SP, 0x90
lw    RA, 0x110(SP)
lw    S7, 0x10c(SP)
lw    S6, 0x108(SP)
lw    S5, 0x104(SP)
lw    S4, 0x100(SP)
lw    S3, 0xfc(SP)
lw    S2, 0xf8(SP)
lw    S1, 0xf4(SP)
lw    S0, 0xf0(SP)
ldc1  F22, 0x120(SP)
ldc1  F20, 0x118(SP)
jr    RA
 addiu SP, SP, 0x128

func_8010F6C4:
addiu SP, SP, -0x18
sw    RA, 0x10(SP)
li    V0, 1
lui   AT, hi(CORE_800A12D0)
sb    V0, lo(CORE_800A12D0)(AT)
lui   V0, hi(CORE_800CD05D)
lb    V0, lo(CORE_800CD05D)(V0)
lui   AT, hi(CORE_800CD05E)
addu  AT, AT, V0
lb    V0, lo(CORE_800CD05E)(AT)
sll   V0, V0, 1
lui   A0, hi(star_space_indices)
addu  A0, A0, V0
lh    A0, lo(star_space_indices)(A0)
jal   0x800EBAC8
 li    A1, 1
lui   AT, hi(CORE_800A12D0)
jal   0x800FF834
 sb    R0, lo(CORE_800A12D0)(AT)
sll   V0, V0, 0x10
bltz  V0, L8010F724
       NOP
jal   SleepProcess
 li    A0, -1
L8010F724:
lw    RA, 0x10(SP)
jr    RA
 addiu SP, SP, 0x18

func_8010F730:
addiu SP, SP, -0x28
sw    RA, 0x24(SP)
sw    S2, 0x20(SP)
sw    S1, 0x1c(SP)
sw    S0, 0x18(SP)
lui   S2, hi(current_player_index)
lb    S2, lo(current_player_index)(S2)
jal   GetPlayerStruct
 li    A0, -1
jal   func_8010FE54
 move  S1, V0
jal   0x800DCA64
 move  A0, S2
li    A0, -1
jal   0x800FF900
 li    A1, 3
jal   0x80035FDC
 li    A0, 17
jal   0x800DC128
 move  A0, S2
jal   0x800EF0D8
 li    A0, 1
jal   0x8004A0E0
 move  S0, V0
jal   0x800FC8A4
 sll   S0, S0, 0x10
jal   SleepProcess
 li    A0, 5
jal   SleepProcess
 li    A0, 25
move  A0, S2
li    A1, 2
jal   0x800F2304
 move  A2, R0
sll   V0, S2, 3
subu  V0, V0, S2
sll   V0, V0, 3
lui   A0, hi(CORE_800D112C)
addu  A0, A0, V0
lw    A0, lo(CORE_800D112C)(A0)
lui   A1, 0x4000
lui   A2, 0xbe99
jal   0x800EE688
 ori A2, A2, 0x999a
jal   SleepProcess
 li    A0, 5
jal   0x800DCBCC
 move  A0, S2
li    V0, 2
sw    V0, 0x10(SP)
move  A0, S2
li    A1, -1
move  A2, R0
jal   0x800F2388
 li    A3, 10
jal   SleepProcess
 li    A0, 20
jal   0x800E22B4
       NOP
jal   0x800E2354
 sra   A0, S0, 0x10
jal   0x800E2904
       NOP
jal   0x8003602C
 li    A0, 17
jal   0x800DC128
 move  A0, S2
sll   V0, V0, 0x10
jal   0x8004AD50
 sra   A0, V0, 0x10
jal   0x800DC06C
 move  A0, S2
jal   0x800F6BC4
 li    A0, -1
jal   0x800F66DC
 move  A0, R0
jal   0x800F6ECC
 li    A0, -1
move  A0, S2
jal   0x800DCD2C
 li    A1, -1
lbu   A0, 0xf(S1)
sll   A0, A0, 0x18
sra   A0, A0, 0x18
lbu   A1, 0x10(S1)
sll   A1, A1, 0x18
sra   A1, A1, 0x18
andi  A0, A0, 0xffff
jal   GetAbsSpaceIndexFromChainSpaceIndex
 andi  A1, A1, 0xffff
sll   S0, V0, 0x10
sra   S0, S0, 0x10
jal   0x800EBCBC
 move  A0, S0
move  A0, S0
jal   0x800EBAC8
 li    A1, 1
jal   0x800FF834
       NOP
sll   V0, V0, 0x10
bltz  V0, L8010F8D0
       NOP
jal   SleepProcess
 li    A0, -1
L8010F8D0:
jal   0x800DAA40
 move  A0, S2
lw    RA, 0x24(SP)
lw    S2, 0x20(SP)
lw    S1, 0x1c(SP)
lw    S0, 0x18(SP)
jr    RA
 addiu SP, SP, 0x28

func_8010F8F0:
addiu SP, SP, -0x38
sw    RA, 0x20(SP)
sw    S1, 0x1c(SP)
sw    S0, 0x18(SP)
sdc1  F22, 0x30(SP)
sdc1  F20, 0x28(SP)
jal   0x8004EE68
 li    S1, 1
lw    S0, 0x8c(V0)
lh    V0, 4(S0)
lh    V1, 0(S0)
subu  V0, V0, V1
mtc1  V0, F22
      NOP
cvt.s.w F22, F22
lh    V0, 8(S0)
mtc1  V0, F0
      NOP
cvt.s.w F0, F0
div.s F22, F22, F0
lh    V0, 6(S0)
lh    V1, 2(S0)
subu  V0, V0, V1
mtc1  V0, F20
      NOP
cvt.s.w F20, F20
jal   0x800E4A7C
 div.s F20, F20, F0
lui   A0, hi(current_player_index)
lb    A0, lo(current_player_index)(A0)
move  A1, V0
addiu A2, SP, 0x10
jal   0x800F6848
 addiu A3, SP, 0x14
lh    V0, 8(S0)
blez  V0, L8010FA78
       NOP
L8010F984:
lh    A0, 0xa(S0)
li    V0, -1
beq   A0, V0, L8010F9FC
 move  A1, R0
lh    V0, 0(S0)
mtc1  V0, F2
      NOP
cvt.s.w F2, F2
mtc1  S1, F4
      NOP
cvt.s.w F4, F4
mul.s F0, F22, F4
add.s F2, F2, F0
trunc.w.s F0, F2
mfc1  A2, F0
      NOP
sll   A2, A2, 0x10
lh    V0, 2(S0)
mtc1  V0, F0
      NOP
cvt.s.w F0, F0
mul.s F4, F20, F4
add.s F0, F0, F4
trunc.w.s F2, F0
mfc1  A3, F2
      NOP
sll   A3, A3, 0x10
sra   A2, A2, 0x10
jal   0x80054904
 sra   A3, A3, 0x10
L8010F9FC:
jal   0x800E4A7C
       NOP
mtc1  S1, F4
      NOP
cvt.s.w F4, F4
mul.s F0, F22, F4
lwc1  F2, 0x10(SP)
add.s F0, F0, F2
trunc.w.s F2, F0
mfc1  A2, F2
      NOP
sll   A2, A2, 0x10
mul.s F4, F20, F4
lwc1  F0, 0x14(SP)
add.s F4, F4, F0
trunc.w.s F0, F4
mfc1  A3, F0
      NOP
sll   A3, A3, 0x10
lui   A0, hi(current_player_index)
lb    A0, lo(current_player_index)(A0)
move  A1, V0
sra   A2, A2, 0x10
jal   0x800F688C
 sra   A3, A3, 0x10
jal   SleepVProcess
 addiu S1, S1, 1
lh    V0, 8(S0)
slt   V0, V0, S1
beqz  V0, L8010F984
       NOP
L8010FA78:
lh    A0, 0xa(S0)
li    V0, -1
beq   A0, V0, L8010FA98
       NOP
lh    A2, 4(S0)
lh    A3, 6(S0)
jal   0x80054904
 move  A1, R0
L8010FA98:
jal   0x800E4A7C
       NOP
lh    V1, 4(S0)
mtc1  V1, F0
      NOP
cvt.s.w F0, F0
lwc1  F2, 0x10(SP)
add.s F0, F0, F2
lh    V1, 0(S0)
mtc1  V1, F2
      NOP
cvt.s.w F2, F2
sub.s F0, F0, F2
trunc.w.s F2, F0
mfc1  A2, F2
      NOP
sll   A2, A2, 0x10
lh    V1, 6(S0)
mtc1  V1, F0
      NOP
cvt.s.w F0, F0
lwc1  F2, 0x14(SP)
add.s F0, F0, F2
lh    V1, 2(S0)
mtc1  V1, F2
      NOP
cvt.s.w F2, F2
sub.s F0, F0, F2
trunc.w.s F2, F0
mfc1  A3, F2
      NOP
sll   A3, A3, 0x10
lui   A0, hi(current_player_index)
lb    A0, lo(current_player_index)(A0)
move  A1, V0
sra   A2, A2, 0x10
jal   0x800F688C
 sra   A3, A3, 0x10
jal   EndProcess
 move  A0, R0
lw    RA, 0x20(SP)
lw    S1, 0x1c(SP)
lw    S0, 0x18(SP)
ldc1  F22, 0x30(SP)
ldc1  F20, 0x28(SP)
jr    RA
 addiu SP, SP, 0x38

func_8010FB54:
addiu SP, SP, -0x38
sw    RA, 0x30(SP)
sw    S7, 0x2c(SP)
sw    S6, 0x28(SP)
sw    S5, 0x24(SP)
sw    S4, 0x20(SP)
sw    S3, 0x1c(SP)
sw    S2, 0x18(SP)
sw    S1, 0x14(SP)
sw    S0, 0x10(SP)
move  S7, A0
lw    S0, 0x4c(SP)
move  S1, A1
move  S2, A2
move  S3, A3
lhu   S4, 0x4a(SP)
move  S6, S0
lui   A0, hi(func_8010F8F0)
addiu A0, A0, lo(func_8010F8F0)
li    A1, 16386
move  A2, R0
jal   InitProcess
 li    A3, 64
move  S5, V0
lw    A0, 0x18(S5)
jal   0x800360F0
 li    A1, 16
move  V1, V0
sw    V1, 0x8c(S5)
sh    S1, 0(V1)
sh    S2, 2(V1)
sh    S3, 4(V1)
sll   S0, S0, 0x10
sra   S0, S0, 0x10
li    V0, -1
bne   S0, V0, L8010FBEC
 sh    S4, 6(V1)
li    S6, 25
L8010FBEC:
sh    S6, 8(V1)
sh    S7, 0xa(V1)
move  V0, S5
lw    RA, 0x30(SP)
lw    S7, 0x2c(SP)
lw    S6, 0x28(SP)
lw    S5, 0x24(SP)
lw    S4, 0x20(SP)
lw    S3, 0x1c(SP)
lw    S2, 0x18(SP)
lw    S1, 0x14(SP)
lw    S0, 0x10(SP)
jr    RA
 addiu SP, SP, 0x38

D_8010FC24:
addiu SP, SP, -0x30
sw    RA, 0x2c(SP)
sw    S2, 0x28(SP)
sw    S1, 0x24(SP)
sw    S0, 0x20(SP)
lui   S1, hi(CORE_800CD058)
addiu S1, S1, lo(CORE_800CD058)
lui   A0, hi(CORE_8010570C)
lh    A0, lo(CORE_8010570C)(A0)
move  A1, R0
li    A2, 1
jal   0x80055140
 move  A3, R0
lui   A0, hi(CORE_8010570C)
lh    A0, lo(CORE_8010570C)(A0)
move  A1, R0
jal   0x800550F4
 li    A2, 1
jal   SleepProcess
 li    A0, 20
jal   PlaySound
 li    A0, 325
lui   A0, hi(CORE_8010570C)
lh    A0, lo(CORE_8010570C)(A0)
move  A1, R0
addiu A2, SP, 0x18
jal   0x800F6748
 addiu A3, SP, 0x1c
jal   0x8004EE68
 li    S2, 255
move  S0, V0
lui   A0, hi(CORE_8010570C)
lh    A0, lo(CORE_8010570C)(A0)
lwc1  F0, 0x18(SP)
trunc.w.s F2, F0
mfc1  A1, F2
      NOP
sll   A1, A1, 0x10
lwc1  F0, 0x1c(SP)
trunc.w.s F2, F0
mfc1  A2, F2
      NOP
sll   A2, A2, 0x10
lui   V0, hi(current_player_index)
lb    V0, lo(current_player_index)(V0)
sll   V0, V0, 3
lui   AT, hi(D_8011E354)
addu  AT, AT, V0
lwc1  F0, lo(D_8011E354)(AT)
trunc.w.s F2, F0
mfc1  A3, F2
      NOP
sll   A3, A3, 0x10
lui   AT, hi(D_8011E358)
addu  AT, AT, V0
lwc1  F0, lo(D_8011E358)(AT)
trunc.w.s F2, F0
mfc1  V0, F2
      NOP
sll   V0, V0, 0x10
sra   V0, V0, 0x10
sw    V0, 0x10(SP)
li    V0, -1
sw    V0, 0x14(SP)
sra   A1, A1, 0x10
sra   A2, A2, 0x10
jal   func_8010FB54
 sra   A3, A3, 0x10
move  A0, S0
jal   0x8004ED30
 move  A1, V0
jal   0x8004EE18
 li    S0, 1
jal   SleepProcess
 li    A0, 10
lui   A0, hi(CORE_8010570C)
lh    A0, lo(CORE_8010570C)(A0)
move  A1, R0
move  A2, R0
jal   0x80055140
 move  A3, R0
lui   A0, hi(CORE_8010570C)
lh    A0, lo(CORE_8010570C)(A0)
move  A1, R0
jal   0x800550F4
 li    A2, 1
L8010FD7C:
jal   0x800E4A7C
       NOP
sll   A2, S0, 1
addu  A2, A2, S0
sll   A2, A2, 3
addu  A2, A2, S0
subu  A2, S2, A2
sll   A2, A2, 0x10
lb    A0, 0xf(S1)
move  A1, V0
jal   0x800F68E0
 sra   A2, A2, 0x10
jal   0x800E4A7C
 addiu S0, S0, 1
lb    A0, 0xf(S1)
move  A1, V0
lui   A3, 0x4000
jal   0x800F6780
 move  A2, R0
jal   SleepVProcess
       NOP
slti  V0, S0, 0xa
bnez  V0, L8010FD7C
       NOP
jal   0x800E4A7C
       NOP
lb    A0, 0xf(S1)
move  A1, V0
jal   0x800F68E0
 move  A2, R0
li    A0, -1
li    A1, 5
jal   0x800F2304
 move  A2, R0
lb    A1, 0xf(S1)
jal   0x8004ACE0
 li    A0, 628
jal   SleepProcess
 li    A0, 50
li    A0, -1
li    A1, -1
jal   0x800F2304
 li    A2, 2
lui   A0, hi(CORE_8010570C)
lh    A0, lo(CORE_8010570C)(A0)
move  A1, R0
jal   0x800553A8
 li    A2, 32768
lw    RA, 0x2c(SP)
lw    S2, 0x28(SP)
lw    S1, 0x24(SP)
lw    S0, 0x20(SP)
jr    RA
 addiu SP, SP, 0x30

func_8010FE54:
addiu SP, SP, -0x38
sw    RA, 0x30(SP)
sw    S3, 0x2c(SP)
sw    S2, 0x28(SP)
sw    S1, 0x24(SP)
sw    S0, 0x20(SP)
lui   S3, hi(CORE_800CD058)
addiu S3, S3, lo(CORE_800CD058)
lui   A0, hi(CORE_8010570C)
lh    A0, lo(CORE_8010570C)(A0)
move  A1, R0
li    A2, 1
jal   0x80055140
 move  A3, R0
lui   A0, hi(CORE_8010570C)
lh    A0, lo(CORE_8010570C)(A0)
move  A1, R0
jal   0x800550F4
 li    A2, 1
jal   SleepProcess
 li    A0, 20
jal   PlaySound
 li    A0, 325
lui   A0, hi(CORE_8010570C)
lh    A0, lo(CORE_8010570C)(A0)
move  A1, R0
addiu A2, SP, 0x18
jal   0x800F6748
 addiu A3, SP, 0x1c
lui   A0, hi(CORE_8010570C)
lh    A0, lo(CORE_8010570C)(A0)
lwc1  F0, 0x18(SP)
trunc.w.s F2, F0
mfc1  A1, F2
      NOP
sll   A1, A1, 0x10
lwc1  F0, 0x1c(SP)
trunc.w.s F2, F0
mfc1  A2, F2
      NOP
sll   A2, A2, 0x10
lui   V0, hi(current_player_index)
lb    V0, lo(current_player_index)(V0)
sll   V0, V0, 3
lui   AT, hi(D_8011E374)
addu  AT, AT, V0
lwc1  F0, lo(D_8011E374)(AT)
trunc.w.s F2, F0
mfc1  A3, F2
      NOP
sll   A3, A3, 0x10
lui   AT, hi(D_8011E378)
addu  AT, AT, V0
lwc1  F0, lo(D_8011E378)(AT)
trunc.w.s F2, F0
mfc1  V0, F2
      NOP
sll   V0, V0, 0x10
sra   V0, V0, 0x10
sw    V0, 0x10(SP)
li    V0, -1
sw    V0, 0x14(SP)
sra   A1, A1, 0x10
sra   A2, A2, 0x10
jal   func_8010FB54
 sra   A3, A3, 0x10
jal   SleepProcess
 li    A0, 20
li    S1, 1
li    S2, 255
L8010FF6C:
jal   0x800E4A7C
 sll   S0, S1, 1
addu  S0, S0, S1
sll   S0, S0, 3
addu  S0, S0, S1
subu  S0, S2, S0
sll   A2, S0, 0x10
lb    A0, 0xf(S3)
move  A1, V0
jal   0x800F68E0
 sra   A2, A2, 0x10
lui   A0, hi(CORE_8010570C)
lh    A0, lo(CORE_8010570C)(A0)
move  A1, R0
jal   0x80055458
 andi  A2, S0, 0xffff
jal   SleepVProcess
 addiu S1, S1, 1
slti  V0, S1, 0xa
bnez  V0, L8010FF6C
       NOP
jal   0x800E4A7C
       NOP
lb    A0, 0xf(S3)
move  A1, V0
jal   0x800F68E0
 move  A2, R0
lui   A0, hi(CORE_8010570C)
lh    A0, lo(CORE_8010570C)(A0)
move  A1, R0
jal   0x80055458
 move  A2, R0
jal   SleepProcess
 li    A0, 2
lui   A0, hi(CORE_8010570C)
lh    A0, lo(CORE_8010570C)(A0)
move  A1, R0
jal   0x800553A8
 li    A2, 32768
lw    RA, 0x30(SP)
lw    S3, 0x2c(SP)
lw    S2, 0x28(SP)
lw    S1, 0x24(SP)
lw    S0, 0x20(SP)
jr    RA
 addiu SP, SP, 0x38

func_80110024:
addiu SP, SP, -0x38
sw    RA, 0x30(SP)
sw    S1, 0x2c(SP)
sw    S0, 0x28(SP)
lui   A0, hi(CORE_8010570C)
lh    A0, lo(CORE_8010570C)(A0)
move  A1, R0
li    A2, 1
jal   0x80055140
 move  A3, R0
lui   A0, hi(CORE_8010570C)
lh    A0, lo(CORE_8010570C)(A0)
move  A1, R0
jal   0x800550F4
 li    A2, 1
jal   SleepProcess
 li    A0, 20
jal   PlaySound
 li    A0, 325
jal   0x800E4A7C
 li    S1, 255
lui   A0, hi(current_player_index)
lb    A0, lo(current_player_index)(A0)
move  A1, V0
addiu A2, SP, 0x18
jal   0x800F6848
 addiu A3, SP, 0x1c
jal   0x800E4A7C
       NOP
li    A0, -1
move  A1, V0
addiu A2, SP, 0x20
jal   0x800F6E4C
 addiu A3, SP, 0x24
jal   0x8004EE68
       NOP
move  S0, V0
lui   A0, hi(CORE_8010570C)
lh    A0, lo(CORE_8010570C)(A0)
lwc1  F0, 0x18(SP)
trunc.w.s F2, F0
mfc1  A1, F2
      NOP
sll   A1, A1, 0x10
lwc1  F0, 0x1c(SP)
trunc.w.s F2, F0
mfc1  A2, F2
      NOP
sll   A2, A2, 0x10
lh    A3, 0x22(SP)
lh    V0, 0x26(SP)
sw    V0, 0x10(SP)
li    V0, -1
sw    V0, 0x14(SP)
sra   A1, A1, 0x10
jal   func_8010FB54
 sra   A2, A2, 0x10
move  A0, S0
jal   0x8004ED30
 move  A1, V0
jal   0x8004EE18
 li    S0, 1
sll   A2, S0, 1
L80110120:
addu  A2, A2, S0
sll   A2, A2, 3
addu  A2, A2, S0
subu  A2, S1, A2
lui   A0, hi(CORE_8010570C)
lh    A0, lo(CORE_8010570C)(A0)
move  A1, R0
jal   0x80055458
 andi  A2, A2, 0xffff
jal   SleepVProcess
 addiu S0, S0, 1
slti  V0, S0, 0xa
bnez  V0, L80110120
 sll   A2, S0, 1
lui   A0, hi(CORE_8010570C)
lh    A0, lo(CORE_8010570C)(A0)
move  A1, R0
jal   0x80055458
 move  A2, R0
lui   A0, hi(CORE_8010570C)
lh    A0, lo(CORE_8010570C)(A0)
move  A1, R0
jal   0x800553A8
 li    A2, 32768
lw    RA, 0x30(SP)
lw    S1, 0x2c(SP)
lw    S0, 0x28(SP)
jr    RA
 addiu SP, SP, 0x38

D_80110194:
addiu SP, SP, -0x40
sw    RA, 0x34(SP)
sw    S4, 0x30(SP)
sw    S3, 0x2c(SP)
sw    S2, 0x28(SP)
sw    S1, 0x24(SP)
sw    S0, 0x20(SP)
sdc1  F20, 0x38(SP)
lui   S3, hi(CORE_800CD058)
addiu S3, S3, lo(CORE_800CD058)
lui   A0, hi(CORE_8010570C)
lh    A0, lo(CORE_8010570C)(A0)
move  A1, R0
li    A2, 1
jal   0x80055140
 move  A3, R0
lui   A0, hi(CORE_8010570C)
lh    A0, lo(CORE_8010570C)(A0)
move  A1, R0
jal   0x800550F4
 li    A2, 1
jal   SleepProcess
 li    A0, 20
jal   PlaySound
 li    A0, 325
lui   A0, hi(CORE_8010570C)
lh    A0, lo(CORE_8010570C)(A0)
move  A1, R0
addiu A2, SP, 0x18
jal   0x800F6748
 addiu A3, SP, 0x1c
jal   0x8004EE68
 li    S1, 1
move  S0, V0
lui   A0, hi(CORE_8010570C)
lh    A0, lo(CORE_8010570C)(A0)
lwc1  F0, 0x18(SP)
trunc.w.s F2, F0
mfc1  A1, F2
      NOP
sll   A1, A1, 0x10
lwc1  F0, 0x1c(SP)
trunc.w.s F2, F0
mfc1  A2, F2
      NOP
sll   A2, A2, 0x10
lui   V0, hi(current_player_index)
lb    V0, lo(current_player_index)(V0)
sll   V0, V0, 3
lui   AT, hi(D_8011E354)
addu  AT, AT, V0
lwc1  F0, lo(D_8011E354)(AT)
trunc.w.s F2, F0
mfc1  A3, F2
      NOP
sll   A3, A3, 0x10
lui   AT, hi(D_8011E358)
addu  AT, AT, V0
lwc1  F0, lo(D_8011E358)(AT)
trunc.w.s F2, F0
mfc1  V0, F2
      NOP
sll   V0, V0, 0x10
sra   V0, V0, 0x10
sw    V0, 0x10(SP)
li    V0, -1
sw    V0, 0x14(SP)
sra   A1, A1, 0x10
sra   A2, A2, 0x10
jal   func_8010FB54
 sra   A3, A3, 0x10
move  A0, S0
jal   0x8004ED30
 move  A1, V0
jal   0x8004EE18
 li    S0, 255
jal   SleepProcess
 li    A0, 10
lui   A0, hi(CORE_8010570C)
lh    A0, lo(CORE_8010570C)(A0)
move  A1, R0
move  A2, R0
jal   0x80055140
 move  A3, R0
lui   A0, hi(CORE_8010570C)
lh    A0, lo(CORE_8010570C)(A0)
move  A1, R0
jal   0x800550F4
 li    A2, 1
sll   A2, S1, 1
L801102FC:
addu  A2, A2, S1
sll   A2, A2, 3
addu  A2, A2, S1
subu  A2, S0, A2
lui   A0, hi(CORE_8010570C)
lh    A0, lo(CORE_8010570C)(A0)
move  A1, R0
jal   0x80055458
 andi  A2, A2, 0xffff
jal   SleepVProcess
 addiu S1, S1, 1
slti  V0, S1, 0xa
bnez  V0, L801102FC
 sll   A2, S1, 1
lui   A0, hi(CORE_8010570C)
lh    A0, lo(CORE_8010570C)(A0)
move  A1, R0
jal   0x80055458
 move  A2, R0
jal   0x800E4A7C
       NOP
lb    A0, 0xf(S3)
sll   V1, A0, 3
subu  V1, V1, A0
sll   V1, V1, 3
lui   S0, hi(p1_item1)
addiu S0, S0, lo(p1_item1)
addu  V1, V1, S0
addu  V1, V1, V0
lb    V1, 0(V1)
li    V0, 11
beq   V1, V0, L801103B0
       NOP
jal   0x800E4A7C
       NOP
lb    A0, 0xf(S3)
sll   V1, A0, 3
subu  V1, V1, A0
sll   V1, V1, 3
addu  V1, V1, S0
addu  V1, V1, V0
lb    V1, 0(V1)
li    V0, 8
bne   V1, V0, L801103BC
 move  S1, R0
L801103B0:
jal   PlaySound
 li    A0, 321
move  S1, R0
L801103BC:
li    AT, 0x41F00000 ; 30.000000
mtc1  AT, F20
L801103C4:
jal   0x800E4A7C
       NOP
mtc1  S1, F12
      NOP
cvt.s.w F12, F12
jal   0x8008EF20
 move  S0, V0
lb    A0, 0xf(S3)
mul.s F0, F0, F20
mfc1  A2, F0
      NOP
jal   0x800F6928
 move  A1, S0
jal   SleepVProcess
 addiu S1, S1, 0x1e
slti  V0, S1, 0x439
bnez  V0, L801103C4
 li    S2, 1
li    S4, 255
li    AT, 0x41F00000 ; 30.000000
mtc1  AT, F20
L80110418:
jal   0x800E4A7C
       NOP
sll   A2, S2, 1
addu  A2, A2, S2
sll   A2, A2, 3
addu  A2, A2, S2
subu  A2, S4, A2
sll   A2, A2, 0x10
lb    A0, 0xf(S3)
move  A1, V0
jal   0x800F68E0
 sra   A2, A2, 0x10
jal   0x800E4A7C
 addiu S2, S2, 1
mtc1  S1, F12
      NOP
cvt.s.w F12, F12
jal   0x8008EF20
 move  S0, V0
lb    A0, 0xf(S3)
mul.s F0, F0, F20
mfc1  A2, F0
      NOP
jal   0x800F6928
 move  A1, S0
jal   SleepVProcess
 addiu S1, S1, 0x1e
slti  V0, S2, 0xa
bnez  V0, L80110418
       NOP
jal   0x800E4A7C
       NOP
lb    A0, 0xf(S3)
move  A1, V0
jal   0x800F68E0
 move  A2, R0
lui   A0, hi(CORE_8010570C)
lh    A0, lo(CORE_8010570C)(A0)
move  A1, R0
jal   0x800553A8
 li    A2, 32768
lw    RA, 0x34(SP)
lw    S4, 0x30(SP)
lw    S3, 0x2c(SP)
lw    S2, 0x28(SP)
lw    S1, 0x24(SP)
lw    S0, 0x20(SP)
ldc1  F20, 0x38(SP)
jr    RA
 addiu SP, SP, 0x40

D_801104E0:
addiu SP, SP, -0x30
sw    RA, 0x28(SP)
sw    S1, 0x24(SP)
sw    S0, 0x20(SP)
lui   A0, hi(CORE_8010570C)
lh    A0, lo(CORE_8010570C)(A0)
move  A1, R0
li    A2, 1
jal   0x80055140
 move  A3, R0
lui   A0, hi(CORE_8010570C)
lh    A0, lo(CORE_8010570C)(A0)
move  A1, R0
jal   0x800550F4
 li    A2, 1
jal   SleepProcess
 li    A0, 20
jal   PlaySound
 li    A0, 325
lui   A0, hi(CORE_8010570C)
lh    A0, lo(CORE_8010570C)(A0)
move  A1, R0
addiu A2, SP, 0x18
jal   0x800F6748
 addiu A3, SP, 0x1c
jal   0x8004EE68
 li    S1, 255
move  S0, V0
lui   A0, hi(CORE_8010570C)
lh    A0, lo(CORE_8010570C)(A0)
lwc1  F0, 0x18(SP)
trunc.w.s F2, F0
mfc1  A1, F2
      NOP
sll   A1, A1, 0x10
lwc1  F0, 0x1c(SP)
trunc.w.s F2, F0
mfc1  A2, F2
      NOP
sll   A2, A2, 0x10
lui   V0, hi(current_player_index)
lb    V0, lo(current_player_index)(V0)
sll   V0, V0, 3
lui   AT, hi(D_8011E354)
addu  AT, AT, V0
lwc1  F0, lo(D_8011E354)(AT)
trunc.w.s F2, F0
mfc1  A3, F2
      NOP
sll   A3, A3, 0x10
lui   AT, hi(D_8011E358)
addu  AT, AT, V0
lwc1  F0, lo(D_8011E358)(AT)
trunc.w.s F2, F0
mfc1  V0, F2
      NOP
sll   V0, V0, 0x10
sra   V0, V0, 0x10
sw    V0, 0x10(SP)
li    V0, -1
sw    V0, 0x14(SP)
sra   A1, A1, 0x10
sra   A2, A2, 0x10
jal   func_8010FB54
 sra   A3, A3, 0x10
move  A0, S0
jal   0x8004ED30
 move  A1, V0
jal   0x8004EE18
 li    S0, 1
jal   SleepProcess
 li    A0, 10
lui   A0, hi(CORE_8010570C)
lh    A0, lo(CORE_8010570C)(A0)
move  A1, R0
move  A2, R0
jal   0x80055140
 move  A3, R0
lui   A0, hi(CORE_8010570C)
lh    A0, lo(CORE_8010570C)(A0)
move  A1, R0
jal   0x800550F4
 li    A2, 1
sll   A2, S0, 1
L80110630:
addu  A2, A2, S0
sll   A2, A2, 3
addu  A2, A2, S0
subu  A2, S1, A2
lui   A0, hi(CORE_8010570C)
lh    A0, lo(CORE_8010570C)(A0)
move  A1, R0
jal   0x80055458
 andi  A2, A2, 0xffff
jal   SleepVProcess
 addiu S0, S0, 1
slti  V0, S0, 0xa
bnez  V0, L80110630
 sll   A2, S0, 1
lui   A0, hi(CORE_8010570C)
lh    A0, lo(CORE_8010570C)(A0)
move  A1, R0
jal   0x80055458
 move  A2, R0
lui   A0, hi(CORE_8010570C)
lh    A0, lo(CORE_8010570C)(A0)
move  A1, R0
jal   0x800553A8
 li    A2, 32768
lw    RA, 0x28(SP)
lw    S1, 0x24(SP)
lw    S0, 0x20(SP)
jr    RA
 addiu SP, SP, 0x30

func_801106A4:
addiu SP, SP, -0x58
sw    RA, 0x34(SP)
sw    S6, 0x30(SP)
sw    S5, 0x2c(SP)
sw    S4, 0x28(SP)
sw    S3, 0x24(SP)
sw    S2, 0x20(SP)
sw    S1, 0x1c(SP)
sw    S0, 0x18(SP)
sdc1  F26, 0x50(SP)
sdc1  F24, 0x48(SP)
sdc1  F22, 0x40(SP)
sdc1  F20, 0x38(SP)
move  S2, A0
move  S3, A1
move  S1, A2
lw    S6, 0x68(SP)
li    V0, 2
bne   S6, V0, L801106FC
 move  S4, A3
jal   PlaySound
 li    A0, 325
L801106FC:
move  A0, S2
move  A1, S3
addiu A2, SP, 0x10
jal   0x800F6848
 addiu A3, SP, 0x14
lwc1  F2, 0(S4)
lwc1  F0, 0x10(SP)
sub.s F22, F2, F0
mtc1  S1, F4
      NOP
cvt.s.w F4, F4
div.s F22, F22, F4
lwc1  F2, 4(S4)
lwc1  F0, 0x14(SP)
sub.s F20, F2, F0
div.s F20, F20, F4
beqz  S1, L80110830
 li    S0, 2
xori  V0, S6, 1
sltiu S5, V0, 1
li    AT, 0x3D8F0000 ; 0.069824
ori AT, AT, 0x5c29
mtc1  AT, F26
li    AT, 0x3E990000 ; 0.298828
ori AT, AT, 0x999a
mtc1  AT, F24
L80110764:
lwc1  F2, 0x10(SP)
add.s F2, F22, F2
swc1  F2, 0x10(SP)
lwc1  F0, 0x14(SP)
add.s F0, F20, F0
swc1  F0, 0x14(SP)
trunc.w.s F4, F2
mfc1  A2, F4
      NOP
sll   A2, A2, 0x10
trunc.w.s F2, F0
mfc1  A3, F2
      NOP
sll   A3, A3, 0x10
move  A0, S2
move  A1, S3
sra   A2, A2, 0x10
jal   0x800F688C
 sra   A3, A3, 0x10
slti  V0, S0, 0xb
and   V0, S5, V0
beqz  V0, L80110820
 sll   A2, S0, 1
addu  A2, A2, S0
sll   A2, A2, 3
addu  A2, A2, S0
sll   A2, A2, 0x10
move  A0, S2
move  A1, S3
jal   0x800F68E0
 sra   A2, A2, 0x10
mtc1  S0, F4
      NOP
cvt.s.w F4, F4
mul.s F4, F4, F26
cvt.d.s F2, F4
lui   AT, hi(D_8011F940)
ldc1  F0, lo(D_8011F940)(AT)
add.d F2, F2, F0
move  A0, S2
add.s F4, F4, F24
mfc1  A2, F4
cvt.s.d F2, F2
mfc1  A3, F2
      NOP
jal   0x800F696C
 move  A1, S3
L80110820:
jal   SleepVProcess
 addiu S1, S1, -1
bnez  S1, L80110764
 addiu S0, S0, 1
L80110830:
lwc1  F0, 0(S4)
trunc.w.s F2, F0
mfc1  A2, F2
      NOP
sll   A2, A2, 0x10
lwc1  F0, 4(S4)
trunc.w.s F2, F0
mfc1  A3, F2
      NOP
sll   A3, A3, 0x10
move  A0, S2
move  A1, S3
sra   A2, A2, 0x10
jal   0x800F688C
 sra   A3, A3, 0x10
bnez  S6, L80110904
 li    S0, 1
li    S1, 255
li    AT, 0x3DCC0000 ; 0.099609
ori   AT, AT, 0xcccd
mtc1  AT, F22
li    AT, 0x3F800000 ; 1.000000
mtc1  AT, F20
sll   A2, S0, 1
L80110890:
addu  A2, A2, S0
sll   A2, A2, 3
addu  A2, A2, S0
subu  A2, S1, A2
sll   A2, A2, 0x10
move  A0, S2
move  A1, S3
jal   0x800F68E0
 sra   A2, A2, 0x10
mtc1  S0, F0
      NOP
cvt.s.w F0, F0
mul.s F0, F0, F22
sub.s F0, F20, F0
move  A0, S2
mfc1  A2, F0
mfc1  A3, F0
      NOP
jal   0x800F696C
 move  A1, S3
jal   SleepVProcess
 addiu S0, S0, 1
slti  V0, S0, 0xa
bnez  V0, L80110890
 sll   A2, S0, 1
move  A0, S2
move  A1, S3
jal   0x800F68E0
 move  A2, R0
L80110904:
lw    RA, 0x34(SP)
lw    S6, 0x30(SP)
lw    S5, 0x2c(SP)
lw    S4, 0x28(SP)
lw    S3, 0x24(SP)
lw    S2, 0x20(SP)
lw    S1, 0x1c(SP)
lw    S0, 0x18(SP)
ldc1  F26, 0x50(SP)
ldc1  F24, 0x48(SP)
ldc1  F22, 0x40(SP)
ldc1  F20, 0x38(SP)
jr    RA
 addiu SP, SP, 0x58

D_8011093C:
addiu SP, SP, -0x48
sw    RA, 0x18(SP)
sw    S1, 0x14(SP)
sw    S0, 0x10(SP)
sdc1  F28, 0x40(SP)
sdc1  F26, 0x38(SP)
sdc1  F24, 0x30(SP)
sdc1  F22, 0x28(SP)
sdc1  F20, 0x20(SP)
jal   GetPlayerStruct
 li    A0, -1
jal   0x800E6264
 move  S1, V0
lui   A0, hi(CORE_801011FC)
jal   0x800D9B24
 lw    A0, lo(CORE_801011FC)(A0)
lui   V1, hi(CORE_801011FC)
lw    V1, lo(CORE_801011FC)(V1)
lw    V0, 0x3c(V1)
sw    R0, 0x30(V0)
lw    V0, 0x3c(V1)
sw    R0, 0x34(V0)
lw    V0, 0x3c(V1)
sw    R0, 0x38(V0)
li    A0, -1
jal   0x800FF900
 li    A1, 3
jal   PlaySound
 li    A0, 323
li    A0, 34
jal   0x800D90C8
 move  A1, R0
move  S0, V0
lw    V0, 0x3c(S0)
lw    V0, 0x40(V0)
lh    A0, 0(V0)
li    A1, 384
jal   0x8001C258
 move  A2, R0
lw    V0, 0x3c(S0)
lw    V0, 0x40(V0)
lh    A0, 0(V0)
jal   0x8001C8E4
 li    A1, 6144
lw    V0, 0x3c(S0)
lw    V0, 0x40(V0)
jal   0x8001C448
 lh    A0, 0(V0)
lw    A1, 0x24(S1)
addiu A0, S0, 0xc
jal   0x80089A20
 addiu A1, A1, 0xc
mtc1  R0, F22
li    AT, 0x3F800000 ; 1.000000
mtc1  AT, F20
li    AT, 0x41A00000 ; 20.000000
mtc1  AT, F28
lui   AT, hi(D_8011F948)
ldc1  F24, lo(D_8011F948)(AT)
li    AT, 0x41200000 ; 10.000000
mtc1  AT, F26
L80110A30:
mfc1  A1, F20
mfc1  A2, F20
mfc1  A3, F20
      NOP
jal   0x80089A10
 addiu A0, S0, 0x24
lw    V0, 0x3c(S0)
lw    V0, 0x40(V0)
lh    V0, 0(V0)
sll   A0, V0, 1
addu  A0, A0, V0
sll   A0, A0, 6
lui   V0, hi(CORE_800D03F8)
lw    V0, lo(CORE_800D03F8)(V0)
addu  A0, A0, V0
mfc1  A1, F22
      NOP
jal   0x8008A430
 addiu A0, A0, 0x74
jal   SleepVProcess
 add.s F22, F22, F28
cvt.d.s F0, F20
add.d F0, F0, F24
cvt.s.d F20, F0
c.lt.s F20, F26
      NOP
bc1t  L80110A30
       NOP
jal   0x800D9B24
 lw    A0, 0x24(S1)
lui   A0, hi(CORE_801011FC)
jal   0x800D9AA4
 lw    A0, lo(CORE_801011FC)(A0)
li    AT, 0x3F800000 ; 1.000000
mtc1  AT, F0
      NOP
c.le.s F0, F20
      NOP
bc1f  L80110B58
       NOP
li    AT, 0x41A00000 ; 20.000000
mtc1  AT, F28
lui   AT, hi(D_8011F950)
ldc1  F24, lo(D_8011F950)(AT)
li    AT, 0x3F800000 ; 1.000000
mtc1  AT, F26
L80110AE8:
mfc1  A1, F20
mfc1  A2, F20
mfc1  A3, F20
      NOP
jal   0x80089A10
 addiu A0, S0, 0x24
lw    V0, 0x3c(S0)
lw    V0, 0x40(V0)
lh    V0, 0(V0)
sll   A0, V0, 1
addu  A0, A0, V0
sll   A0, A0, 6
lui   V0, hi(CORE_800D03F8)
lw    V0, lo(CORE_800D03F8)(V0)
addu  A0, A0, V0
mfc1  A1, F22
      NOP
jal   0x8008A430
 addiu A0, A0, 0x74
jal   SleepVProcess
 add.s F22, F22, F28
cvt.d.s F0, F20
sub.d F0, F0, F24
cvt.s.d F20, F0
c.le.s F26, F20
      NOP
bc1t  L80110AE8
       NOP
L80110B58:
jal   0x800D9B54
 move  A0, S0
jal   SleepProcess
 li    A0, 20
lui   A1, hi(current_player_index)
lb    A1, lo(current_player_index)(A1)
jal   0x8004ACE0
 li    A0, 628
li    A0, 5
jal   0x800E6420
 li    A1, 2
jal   SleepProcess
 li    A0, 40
li    A0, -1
jal   0x800E6420
 li    A1, 2
jal   0x800EC414
 li    A0, 14868
lw    RA, 0x18(SP)
lw    S1, 0x14(SP)
lw    S0, 0x10(SP)
ldc1  F28, 0x40(SP)
ldc1  F26, 0x38(SP)
ldc1  F24, 0x30(SP)
ldc1  F22, 0x28(SP)
ldc1  F20, 0x20(SP)
jr    RA
 addiu SP, SP, 0x48

D_80110BC8:
addiu SP, SP, -0x58
sw    RA, 0x28(SP)
sw    S1, 0x24(SP)
sw    S0, 0x20(SP)
sdc1  F28, 0x50(SP)
sdc1  F26, 0x48(SP)
sdc1  F24, 0x40(SP)
sdc1  F22, 0x38(SP)
sdc1  F20, 0x30(SP)
jal   GetPlayerStruct
 li    A0, -1
move  S1, V0
li    A0, -1
jal   0x800E6420
 li    A1, 2
jal   0x800ECC0C
 addiu A0, SP, 0x10
lw    A2, 0x24(S1)
addiu A2, A2, 0x18
move  A0, A2
addiu A1, SP, 0x10
jal   0x800ED128
 li    A3, 8
jal   SleepProcess
 li    A0, 8
jal   PlaySound
 li    A0, 323
li    A0, 34
jal   0x800D90C8
 move  A1, R0
move  S0, V0
lw    V0, 0x3c(S0)
lw    V0, 0x40(V0)
lh    A0, 0(V0)
li    A1, 384
jal   0x8001C258
 move  A2, R0
lw    V0, 0x3c(S0)
lw    V0, 0x40(V0)
lh    A0, 0(V0)
jal   0x8001C8E4
 li    A1, 6144
lw    V0, 0x3c(S0)
lw    V0, 0x40(V0)
jal   0x8001C448
 lh    A0, 0(V0)
lw    A1, 0x24(S1)
addiu A0, S0, 0xc
jal   0x80089A20
 addiu A1, A1, 0xc
mtc1  R0, F22
li    AT, 0x3F800000 ; 1.000000
mtc1  AT, F20
li    AT, 0x41A00000 ; 20.000000
mtc1  AT, F28
lui   AT, hi(D_8011F958)
ldc1  F24, lo(D_8011F958)(AT)
li    AT, 0x41200000 ; 10.000000
mtc1  AT, F26
L80110CB4:
mfc1  A1, F20
mfc1  A2, F20
mfc1  A3, F20
      NOP
jal   0x80089A10
 addiu A0, S0, 0x24
lw    V0, 0x3c(S0)
lw    V0, 0x40(V0)
lh    V0, 0(V0)
sll   A0, V0, 1
addu  A0, A0, V0
sll   A0, A0, 6
lui   V0, hi(CORE_800D03F8)
lw    V0, lo(CORE_800D03F8)(V0)
addu  A0, A0, V0
mfc1  A1, F22
      NOP
jal   0x8008A430
 addiu A0, A0, 0x74
jal   SleepVProcess
 add.s F22, F22, F28
cvt.d.s F0, F20
add.d F0, F0, F24
cvt.s.d F20, F0
c.lt.s F20, F26
      NOP
bc1t  L80110CB4
       NOP
jal   0x800D9AA4
 lw    A0, 0x24(S1)
jal   0x800E639C
       NOP
li    AT, 0x3F800000 ; 1.000000
mtc1  AT, F0
      NOP
c.le.s F0, F20
      NOP
bc1f  L80110DD8
       NOP
li    AT, 0x41A00000 ; 20.000000
mtc1  AT, F28
lui   AT, hi(D_8011F960)
ldc1  F24, lo(D_8011F960)(AT)
li    AT, 0x3F800000 ; 1.000000
mtc1  AT, F26
L80110D68:
mfc1  A1, F20
mfc1  A2, F20
mfc1  A3, F20
      NOP
jal   0x80089A10
 addiu A0, S0, 0x24
lw    V0, 0x3c(S0)
lw    V0, 0x40(V0)
lh    V0, 0(V0)
sll   A0, V0, 1
addu  A0, A0, V0
sll   A0, A0, 6
lui   V0, hi(CORE_800D03F8)
lw    V0, lo(CORE_800D03F8)(V0)
addu  A0, A0, V0
mfc1  A1, F22
      NOP
jal   0x8008A430
 addiu A0, A0, 0x74
jal   SleepVProcess
 add.s F22, F22, F28
cvt.d.s F0, F20
sub.d F0, F0, F24
cvt.s.d F20, F0
c.le.s F26, F20
      NOP
bc1t  L80110D68
       NOP
L80110DD8:
jal   0x800D9B54
 move  A0, S0
lw    RA, 0x28(SP)
lw    S1, 0x24(SP)
lw    S0, 0x20(SP)
ldc1  F28, 0x50(SP)
ldc1  F26, 0x48(SP)
ldc1  F24, 0x40(SP)
ldc1  F22, 0x38(SP)
ldc1  F20, 0x30(SP)
jr    RA
 addiu SP, SP, 0x58

D_80110E08:
addiu SP, SP, -0x48
sw    RA, 0x30(SP)
sw    S3, 0x2c(SP)
sw    S2, 0x28(SP)
sw    S1, 0x24(SP)
sw    S0, 0x20(SP)
sdc1  F22, 0x40(SP)
jal   0x8004EE68
 sdc1  F20, 0x38(SP)
lw    S1, 0x8c(V0)
li    A0, -1
li    A1, 1
jal   0x800FFA4C
 li    A2, 5
move  S3, V0
li    A0, 1
jal   0x8005279C
 move  A1, R0
sll   V0, V0, 0x10
sra   S2, V0, 0x10
move  S0, S2
move  A0, S0
move  A1, R0
lui   A2, hi(D_8011FB5E)
lh    A2, lo(D_8011FB5E)(A2)
jal   0x80055024
 move  A3, R0
move  A0, S0
move  A1, R0
jal   0x80055294
 li    A2, 18304
move  A0, S0
move  A1, R0
jal   0x800553A8
 li    A2, 4096
jal   0x800E4A7C
 sll   S1, S1, 2
lui   A0, hi(current_player_index)
lb    A0, lo(current_player_index)(A0)
move  A1, V0
addiu A2, SP, 0x18
jal   0x800F6848
 addiu A3, SP, 0x1c
lwc1  F2, 0x18(SP)
li    AT, 0x41A00000 ; 20.000000
mtc1  AT, F4
      NOP
add.s F2, F2, F4
swc1  F2, 0x18(SP)
lwc1  F0, 0x1c(SP)
sub.s F0, F0, F4
swc1  F0, 0x1c(SP)
trunc.w.s F4, F2
mfc1  A2, F4
      NOP
sll   A2, A2, 0x10
trunc.w.s F2, F0
mfc1  A3, F2
      NOP
sll   A3, A3, 0x10
move  A0, S0
move  A1, R0
sra   A2, A2, 0x10
jal   0x80054904
 sra   A3, A3, 0x10
sw    R0, 0x10(SP)
move  A0, S0
move  A1, R0
li    A2, 255
jal   0x80055420
 li    A3, 255
li    S0, 255
lui   AT, hi(D_8011E440)
addu  AT, AT, S1
lwc1  F20, lo(D_8011E440)(AT)
cvt.s.w F20, F20
li    AT, 0x40A00000 ; 5.000000
mtc1  AT, F22
move  S1, S2
L80110F44:
jal   0x8008E3F0
 mov.s F12, F20
mul.s F0, F0, F22
lwc1  F2, 0x18(SP)
add.s F0, F0, F2
swc1  F0, 0x18(SP)
jal   0x8008EF20
 mov.s F12, F20
mul.s F0, F0, F22
lwc1  F2, 0x1c(SP)
sub.s F2, F2, F0
swc1  F2, 0x1c(SP)
lwc1  F0, 0x18(SP)
trunc.w.s F4, F0
mfc1  A2, F4
      NOP
sll   A2, A2, 0x10
trunc.w.s F0, F2
mfc1  A3, F0
      NOP
sll   A3, A3, 0x10
move  A0, S1
move  A1, R0
sra   A2, A2, 0x10
jal   0x80054904
 sra   A3, A3, 0x10
move  A0, S1
move  A1, R0
jal   0x80055458
 andi  A2, S0, 0xffff
jal   SleepVProcess
 addiu S0, S0, -0x14
bgez  S0, L80110F44
 move  A0, S2
move  S0, S2
move  A1, R0
jal   0x80055458
 move  A2, R0
jal   0x800FFAEC
 move  A0, S3
jal   0x800525C8
 move  A0, S0
jal   EndProcess
 move  A0, R0
lw    RA, 0x30(SP)
lw    S3, 0x2c(SP)
lw    S2, 0x28(SP)
lw    S1, 0x24(SP)
lw    S0, 0x20(SP)
ldc1  F22, 0x40(SP)
ldc1  F20, 0x38(SP)
jr    RA
 addiu SP, SP, 0x48

D_80111018:
addiu SP, SP, -0x38
sw    RA, 0x30(SP)
sw    S3, 0x2c(SP)
sw    S2, 0x28(SP)
sw    S1, 0x24(SP)
sw    S0, 0x20(SP)
lui   S3, hi(CORE_800CD058)
addiu S3, S3, lo(CORE_800CD058)
lui A0, 0x13
jal   ReadMainFS
 ori A0, A0, 0x1b8
move  S0, V0
jal   ImgPackParse
 move  A0, S0
sll   V0, V0, 0x10
sra   V0, V0, 0x10
lui   AT, hi(D_8011FB5C)
sw    V0, lo(D_8011FB5C)(AT)
jal   FreeMainFS
 move  A0, S0
jal   D_801104E0
       NOP
sw    R0, 0x10(SP)
func_80111074:
sw    R0, 0x14(SP)
sw    R0, 0x18(SP)
li    A0, -1
li    A1, 0x3A01 ; "Which shop will you call?"
move  A2, R0
jal   0x800EC8EC ; ShowMessage
 move  A3, R0
lui   A0, hi(D_8011E3D4)
addiu A0, A0, lo(D_8011E3D4)
jal   __PP64_INTERNAL_BASIC_MESSAGE_CHOICE
 move  A1, R0
jal   0x800EC6C8
 move  S2, V0
jal   0x800EC6EC
       NOP
slti  V0, S2, 2
beqz  V0, L801110D0
       NOP
bltz  S2, L801110D0
 addiu V0, S2, 1
lui   AT, hi(CORE_800CD0AC)
j     L80111128
 sh    V0, lo(CORE_800CD0AC)(AT)
L801110D0:
lui   A0, hi(func_8010A474)
addiu A0, A0, lo(func_8010A474)
move  A1, R0
move  A2, R0
jal   InitProcess
 move  A3, R0
move  S0, V0
move  A0, S0
jal   0x80047B80
 li    A1, 128
jal   func_80106FE8
       NOP
li    V0, 1
lui   AT, hi(CORE_800CB99C)
jal   0x80049FB8
 sb    V0, lo(CORE_800CB99C)(AT)
jal   EndProcess
 move  A0, S0
jal   0x800FC8A4
       NOP
j     func_80111074
 sw    R0, 0x10(SP)
L80111128:
jal   SleepProcess
 li    A0, 30
jal   PlaySound
 li    A0, 327
move  S1, R0
L8011113C:
lui   A0, hi(D_80110E08)
addiu A0, A0, lo(D_80110E08)
li    A1, 16386
move  A2, R0
jal   InitProcess
 move  A3, R0
move  S0, V0
jal   0x8004EE68
 sw    S1, 0x8c(S0)
move  A0, V0
jal   0x8004ED30
 move  A1, S0
jal   SleepProcess
 li    A0, 3
addiu S1, S1, 1
slti  V0, S1, 5
bnez  V0, L8011113C
       NOP
jal   0x8004EE18
 move  S1, R0
jal   SleepProcess
 li    A0, 20
L80111194:
lui   A0, hi(D_80110E08)
addiu A0, A0, lo(D_80110E08)
li    A1, 16386
move  A2, R0
jal   InitProcess
 move  A3, R0
move  S0, V0
jal   0x8004EE68
 sw    S1, 0x8c(S0)
move  A0, V0
jal   0x8004ED30
 move  A1, S0
jal   SleepProcess
 li    A0, 3
addiu S1, S1, 1
slti  V0, S1, 5
bnez  V0, L80111194
       NOP
jal   0x8004EE18
       NOP
jal   SleepProcess
 li    A0, 20
jal   0x800E4A7C
       NOP
lb    A0, 0xf(S3)
sll   V1, A0, 3
subu  V1, V1, A0
sll   V1, V1, 3
lui   A0, hi(p1_item1)
addiu A0, A0, lo(p1_item1)
addu  V1, V1, A0
addu  V1, V1, V0
li    V0, -1
sb    V0, 0(V1)
jal   FixUpPlayerItemSlots
 lb    A0, 0xf(S3)
jal   0x800E4A7C
       NOP
lb    A0, 0xf(S3)
move  A1, V0
jal   0x800F68E0
 move  A2, R0
lui   A0, hi(D_8011FB5E)
jal   FreeGraphics
 lh    A0, lo(D_8011FB5E)(A0)
jal   0x800F6BC4
 li    A0, -1
jal   0x800F66DC
 move  A0, R0
jal   0x800F6ECC
 li    A0, -1
bnez  S2, L801112A4
 li    A0, 672
lb    V0, 0xf(S3)
sll   V1, V0, 3
subu  V1, V1, V0
sll   V1, V1, 3
lui   V0, hi(p1_coins)
addu  V0, V0, V1
lh    V0, lo(p1_coins)(V0)
slti  V0, V0, 5
bnez  V0, L801112A4
 li    A0, 666
lb    V1, 3(S3)
lb    V0, 2(S3)
bne   V1, V0, L801112A4
 li    A0, 664
li    A0, 666
L801112A4:
jal   PlaySound
       NOP
jal   item_shop_event
       NOP
lui   AT, hi(CORE_800CD0AC)
sh    R0, lo(CORE_800CD0AC)(AT)
lw    RA, 0x30(SP)
lw    S3, 0x2c(SP)
lw    S2, 0x28(SP)
lw    S1, 0x24(SP)
lw    S0, 0x20(SP)
jr    RA
 addiu SP, SP, 0x38

; Item that calls bowser
D_801112D8:
addiu SP, SP, -0x30
sw    RA, 0x2c(SP)
sw    S2, 0x28(SP)
sw    S1, 0x24(SP)
sw    S0, 0x20(SP)
lui   S2, hi(CORE_800CD058)
addiu S2, S2, lo(CORE_800CD058)
lui A0, 0x13
jal   ReadMainFS
 ori A0, A0, 0x1b8
move  S0, V0
jal   ImgPackParse
 move  A0, S0
sll   V0, V0, 0x10
sra   V0, V0, 0x10
lui   AT, hi(D_8011FB5C)
sw    V0, lo(D_8011FB5C)(AT)
jal   FreeMainFS
 move  A0, S0
jal   D_801104E0
 move  S1, R0
jal   SleepProcess
 li    A0, 30
jal   PlaySound
 li    A0, 327
L8011133C:
lui   A0, hi(D_80110E08)
addiu A0, A0, lo(D_80110E08)
li    A1, 16386
move  A2, R0
jal   InitProcess
 move  A3, R0
move  S0, V0
jal   0x8004EE68
 sw    S1, 0x8c(S0)
move  A0, V0
jal   0x8004ED30
 move  A1, S0
jal   SleepProcess
 li    A0, 3
addiu S1, S1, 1
slti  V0, S1, 5
bnez  V0, L8011133C
       NOP
jal   0x8004EE18
 move  S1, R0
jal   SleepProcess
 li    A0, 20
L80111394:
lui   A0, hi(D_80110E08)
addiu A0, A0, lo(D_80110E08)
li    A1, 16386
move  A2, R0
jal   InitProcess
 move  A3, R0
move  S0, V0
jal   0x8004EE68
 sw    S1, 0x8c(S0)
move  A0, V0
jal   0x8004ED30
 move  A1, S0
jal   SleepProcess
 li    A0, 3
addiu S1, S1, 1
slti  V0, S1, 5
bnez  V0, L80111394
       NOP
jal   0x8004EE18
       NOP
jal   SleepProcess
 li    A0, 20
jal   PlaySound
 li    A0, 671
func_801113F4:
lui   V1, hi(p1_char)
addiu V1, V1, lo(p1_char)
lbu   A2, 0(V1)
lui   A0, hi(CORE_801014A0)
addiu A0, A0, lo(CORE_801014A0)
sll   A2, A2, 2
addu  A2, A2, A0
lbu   A3, 0x38(V1)
sll   A3, A3, 2
addu  A3, A3, A0
lbu   V0, 0x70(V1)
sll   V0, V0, 2
addu  V0, V0, A0
lw    V0, 0(V0)
sw    V0, 0x10(SP)
lbu   V0, 0xa8(V1)
sll   V0, V0, 2
addu  V0, V0, A0
lw    V0, 0(V0)
sw    V0, 0x14(SP)
sw    R0, 0x18(SP)
li    A0, 4
lw    A2, 0(A2)
lw    A3, 0(A3)
jal   0x800EC8EC ; ShowMessage
 li    A1, 0x3A0A ; "Hello? Yeah, this is Bowser. Who are you???"
lb    V1, 0xf(S2)
sll   V0, V1, 3
subu  V0, V0, V1
sll   V0, V0, 3
lui   AT, hi(p1_coins)
addu  AT, AT, V0
lh    V0, lo(p1_coins)(AT)
beqz  V0, L80111488
 li    A0, 1
j     L80111490
 move  A1, R0
L80111488:
li    A0, 2
lb    A1, 0xf(S2)
L80111490:
jal   __PP64_INTERNAL_BASIC_MESSAGE_CHOICE
       NOP
jal   0x800EC6C8
 move  S0, V0
jal   0x800EC6EC
       NOP
li    V0, 4
beq   S0, V0, L801114C4
 li    V0, 5
beq   S0, V0, L801114EC
 move  A1, R0
j     L80111540
 sll   V0, S0, 3

L801114C4:
jal   0x800EF0D8
 move  A0, R0
move  S0, V0
sw    R0, 0x10(SP)
sw    R0, 0x14(SP)
sw    R0, 0x18(SP)
li    A0, 4
li    A1, 14860
j     func_80111578
 move  A2, R0

L801114EC:
lui   A0, hi(func_8010A474)
addiu A0, A0, lo(func_8010A474)
move  A2, R0
jal   InitProcess
 move  A3, R0
move  S0, V0
move  A0, S0
jal   0x80047B80
 li    A1, 128
jal   func_80106FE8
       NOP
li    V0, 1
lui   AT, hi(CORE_800CB99C)
jal   0x80049FB8
 sb    V0, lo(CORE_800CB99C)(AT)
jal   EndProcess
 move  A0, S0
jal   0x800FC8A4
       NOP
j     func_801113F4
       NOP
L80111540:
subu  V0, V0, S0
sll   V0, V0, 3
lui   AT, hi(p1_char)
addu  AT, AT, V0
lbu   V0, lo(p1_char)(AT)
sll   V0, V0, 2
sw    R0, 0x10(SP)
sw    R0, 0x14(SP)
sw    R0, 0x18(SP)
li    A0, 4
li    A1, 14859
lui   A2, hi(CORE_801014A0)
addu  A2, A2, V0
lw    A2, lo(CORE_801014A0)(A2)
func_80111578:
jal   0x800EC8EC ; ShowMessage
 move  A3, R0
jal   0x800EC6C8
       NOP
jal   0x800EC6EC
       NOP
jal   PlaySound
 li    A0, 668
jal   0x800E4A7C
       NOP
lb    A0, 0xf(S2)
sll   V1, A0, 3
subu  V1, V1, A0
sll   V1, V1, 3
lui   A0, hi(p1_item1)
addiu A0, A0, lo(p1_item1)
addu  V1, V1, A0
addu  V1, V1, V0
li    V0, -1
sb    V0, 0(V1)
jal   FixUpPlayerItemSlots
 lb    A0, 0xf(S2)
jal   0x800E4A7C
       NOP
lb    A0, 0xf(S2)
move  A1, V0
jal   0x800F68E0
 move  A2, R0
lui   A0, hi(D_8011FB5E)
jal   FreeGraphics
 lh    A0, lo(D_8011FB5E)(A0)
jal   0x800DEB2C
 lb    A0, 0xf(S2)
li    V1, 3
bne   V0, V1, L80111618
       NOP
jal   0x80035FDC
 li    A0, 23
j     L80111620
       NOP
L80111618:
jal   0x8003602C
 li    A0, 23
L80111620:
lui   AT, hi(CORE_800CD0B2)
jal   0x800FCA4C
 sh    S0, lo(CORE_800CD0B2)(AT)
li    A0, 80
move  A1, R0
li    A2, 3
jal   0x800FF794
 li    A3, 1
jal   0x800FC8A4
       NOP
jal   0x800FF7F0
 li    A0, 2
jal   0x8004A0E0
       NOP
jal   SleepProcess
 li    A0, -1
lw    RA, 0x2c(SP)
lw    S2, 0x28(SP)
lw    S1, 0x24(SP)
lw    S0, 0x20(SP)
jr    RA
 addiu SP, SP, 0x30

 ; Jeanie?
D_80111678:
addiu SP, SP, -0x160
sw    RA, 0x134(SP)
sw    FP, 0x130(SP)
sw    S7, 0x12c(SP)
sw    S6, 0x128(SP)
sw    S5, 0x124(SP)
sw    S4, 0x120(SP)
sw    S3, 0x11c(SP)
sw    S2, 0x118(SP)
sw    S1, 0x114(SP)
sw    S0, 0x110(SP)
sdc1  F28, 0x158(SP)
sdc1  F26, 0x150(SP)
sdc1  F24, 0x148(SP)
sdc1  F22, 0x140(SP)
sdc1  F20, 0x138(SP)
lui   S7, hi(CORE_800CD058)
addiu S7, S7, lo(CORE_800CD058)
jal   GetPlayerStruct
 li    A0, -1
move  S0, V0
li    A0, 60
jal   0x800D90C8
 move  A1, R0
move  S3, V0
move  A0, S3
li    A1, -1
jal   0x800D9CE8
 li    A2, 1
lw    V0, 0x3c(S3)
lw    V0, 0x40(V0)
lh    A0, 0(V0)
move  A1, R0
move  A2, A1
jal   0x8001C1A0
 move  A3, A1
lw    A1, 0x24(S0)
addiu A0, S3, 0xc
jal   0x80089A20
 addiu A1, A1, 0xc
li    AT, 0x41F00000 ; 30.000000
mtc1  AT, F0
      NOP
swc1  F0, 0x30(S3)
lhu   V0, 0xa(S3)
ori   V0, V0, 1
sh    V0, 0xa(S3)
addiu A0, S3, 0x24
move  A1, R0
move  A2, A1
jal   0x80089A10
 move  A3, A1
jal   0x800D9B24
 move  A0, S3
jal   func_8010FE54
       NOP
li    A0, -1
jal   PlayerHasItem
 li    A1, ITEM_LUCKY_LAMP
lui   A0, hi(current_player_index)
lb    A0, lo(current_player_index)(A0)
sll   V1, A0, 3
subu  V1, V1, A0
sll   V1, V1, 3
lui   A0, hi(p1_item1)
addiu A0, A0, lo(p1_item1)
addu  V1, V1, A0
addu  V1, V1, V0
li    V0, -1
sb    V0, 0(V1)
lui   A0, hi(current_player_index)
jal   FixUpPlayerItemSlots
 lb    A0, lo(current_player_index)(A0)
li    A0, 61
jal   0x800D90C8
 move  A1, R0
move  S1, V0
lw    V0, 0x3c(S1)
lw    V0, 0x40(V0)
jal   0x8001FA68
 lh    A0, 0(V0)
lw    V0, 0x3c(S1)
lw    V0, 0x40(V0)
lh    A0, 0(V0)
jal   0x8001F9E4
 li    A1, 255
lw    V0, 0x3c(S1)
lw    V0, 0x40(V0)
lh    A0, 0(V0)
move  A1, R0
move  A2, A1
jal   0x8001C1A0
 move  A3, A1
lw    A1, 0x24(S0)
addiu A0, S1, 0xc
jal   0x80089A20
 addiu A1, A1, 0xc
li    AT, 0x42C80000 ; 100.000000
mtc1  AT, F0
      NOP
swc1  F0, 0x10(S1)
li    AT, 0x3F800000 ; 1.000000
mtc1  AT, F22
li    AT, 0x41F00000 ; 30.000000
mtc1  AT, F20
lwc1  F0, 0x10(S1)
sub.s F0, F0, F22
L80111824:
jal   SleepVProcess
 swc1  F0, 0x10(S1)
lwc1  F0, 0x10(S1)
c.lt.s F20, F0
      NOP
      NOP
bc1tl L80111824
 sub.s F0, F0, F22
jal   PlaySound
 li    A0, 295
lui   A0, hi(CORE_800CDBC8)
lh    A0, lo(CORE_800CDBC8)(A0)
jal   0x800039A4
 li    A1, 180
li    A0, -1
li    A1, 3
jal   0x800FFA4C
 li    A2, 5
sw    V0, 0x10c(SP)
li    S4, 180
move  S0, R0
lui   S6, hi(D_8011F940)
addiu S6, S6, lo(D_8011F940)
li    AT, 0x41F00000 ; 30.000000
mtc1  AT, F22
addiu S2, SP, 0x28
li    AT, 0x41700000 ; 15.000000
mtc1  AT, F20
addiu S5, SP, 0x48
L80111898:
addiu A3, SP, 0x48
lui   A2, hi(D_8011F8E0)
addiu A2, A2, lo(D_8011F8E0)
L801118A4:
lw    V0, 0(A2)
lw    V1, 4(A2)
lw    A0, 8(A2)
lw    A1, 0xc(A2)
sw    V0, 0(A3)
sw    V1, 4(A3)
sw    A0, 8(A3)
sw    A1, 0xc(A3)
addiu A2, A2, 0x10
bne   A2, S6, L801118A4
 addiu A3, A3, 0x10
mtc1  S4, F12
      NOP
jal   0x8008EF20
 cvt.s.w F12, F12
add.s F0, F0, F0
add.s F0, F0, F22
andi  V0, S0, 1
beqz  V0, L80111964
 swc1  F0, 0x10(S1)
lw    A1, 0xc(S1)
mfc1  A2, F0
lw    A3, 0x14(S1)
jal   0x80089A10
 move  A0, S2
lwc1  F0, 0x28(SP)
sub.s F0, F0, F20
swc1  F0, 0x28(SP)
lwc1  F0, 0x2c(SP)
add.s F0, F0, F20
swc1  F0, 0x2c(SP)
srl   V1, S0, 0x1f
addu  V1, S0, V1
sra   V1, V1, 1
andi  V1, V1, 7
sll   V0, V1, 1
addu  V0, V0, V1
sll   V0, V0, 2
addu  V0, S5, V0
sw    V0, 0x10(SP)
li    V0, 1
sw    V0, 0x14(SP)
move  A0, S2
lui A1, 0x3dcc
ori A1, A1, 0xcccd
lui   A2, 0x4000
jal   func_8010F088
 li    A3, 1
L80111964:
jal   SleepVProcess
 addiu S4, S4, 0x14
slti  V0, S4, 0x438
bnez  V0, L80111898
 addiu S0, S0, 1
li    S2, 255
mtc1  R0, F20
lui   FP, hi(D_8011F940)
addiu FP, FP, lo(D_8011F940)
addiu S5, SP, 0x28
li    AT, 0x41700000 ; 15.000000
mtc1  AT, F22
addiu S6, SP, 0xa8
addiu A3, SP, 0xa8
func_8011199C:
lui   A2, hi(D_8011F8E0)
addiu A2, A2, lo(D_8011F8E0)
L801119A4:
lw    V0, 0(A2)
lw    V1, 4(A2)
lw    A0, 8(A2)
lw    A1, 0xc(A2)
sw    V0, 0(A3)
sw    V1, 4(A3)
sw    A0, 8(A3)
sw    A1, 0xc(A3)
addiu A2, A2, 0x10
bne   A2, FP, L801119A4
 addiu A3, A3, 0x10
mtc1  S4, F12
      NOP
jal   0x8008EF20
 cvt.s.w F12, F12
add.s F0, F0, F0
li    AT, 0x41F00000 ; 30.000000
mtc1  AT, F2
      NOP
add.s F0, F0, F2
andi  V0, S0, 1
beqz  V0, L80111A70
 swc1  F0, 0x10(S1)
lw    A1, 0xc(S1)
mfc1  A2, F0
lw    A3, 0x14(S1)
jal   0x80089A10
 move  A0, S5
lwc1  F0, 0x28(SP)
sub.s F0, F0, F22
swc1  F0, 0x28(SP)
lwc1  F0, 0x2c(SP)
add.s F0, F0, F22
swc1  F0, 0x2c(SP)
srl   V1, S0, 0x1f
addu  V1, S0, V1
sra   V1, V1, 1
andi  V1, V1, 7
sll   V0, V1, 1
addu  V0, V0, V1
sll   V0, V0, 2
addu  V0, S6, V0
sw    V0, 0x10(SP)
li    V0, 1
sw    V0, 0x14(SP)
move  A0, S5
lui A1, 0x3dcc
ori A1, A1, 0xcccd
lui   A2, 0x4000
jal   func_8010F088
 li    A3, 1
L80111A70:
bgtz  S2, L80111AD4
       NOP
jal   0x800D9B24
 move  A0, S1
jal   0x800D9A40
 move  A0, S3
li    AT, 0x3DCC0000 ; 0.099609
ori AT, AT, 0xcccd
mtc1  AT, F0
      NOP
add.s F20, F20, F0
swc1  F20, 0x2c(S3)
swc1  F20, 0x28(S3)
li    AT, 0x3F800000 ; 1.000000
mtc1  AT, F0
      NOP
c.lt.s F0, F20
      NOP
      NOP
bc1f  L80111AEC
 swc1  F20, 0x24(S3)
jal   0x8004A520
 li    A0, 61 ; Jeanie's Theme
j     func_80111AFC
       NOP
L80111AD4:
lw    V0, 0x3c(S1)
lw    V0, 0x40(V0)
lh    A0, 0(V0)
jal   0x8001F9E4
 andi  A1, S2, 0xff
addiu S2, S2, -0xc
L80111AEC:
jal   SleepVProcess
 addiu S0, S0, 1
j     func_8011199C
 addiu A3, SP, 0xa8
func_80111AFC:
li    AT, 0x3F800000 ; 1.000000
mtc1  AT, F0
      NOP
swc1  F0, 0x2c(S3)
swc1  F0, 0x28(S3)
swc1  F0, 0x24(S3)
lui   A1, 0x4040
lui   A2, 0x4000
jal   0x800EDB98
 move  A0, S3
lw    A0, 0x10c(SP)
jal   0x800FFAEC
 move  S4, V0
jal   SleepProcess
 li    A0, 30
li    A0, 60
jal   0x800EC590
 li    A1, 0x3A2F ; "What do you want? I'm the Mushroom Jeanie who lives in the Lucky Lamp..."
jal   EndProcess
 move  A0, S4
li    S0, 1
lwc1  F0, 0x10(S3)
lwc1  F2, 0x30(S3)
sub.s F0, F0, F2
swc1  F0, 0x10(S3)
lui   A1, hi(CORE_800A0550)
lw    A1, lo(CORE_800A0550)(A1)
addiu A0, SP, 0x18
addiu A1, A1, 0x10
jal   midpoint
 addiu A2, S3, 0xc
jal   0x800D88E8
 addiu A0, SP, 0x18
lwc1  F0, 0x10(S3)
lwc1  F2, 0x30(S3)
add.s F0, F0, F2
swc1  F0, 0x10(S3)
li    AT, 0x44E10000 ; 1800.000000
mtc1  AT, F2
lwc1  F0, 0x30(S3)
c.lt.s F0, F2
      NOP
bc1f  L80111C78
       NOP
li    AT, 0x42200000 ; 40.000000
ori AT, AT, 0xcccd
mtc1  AT, F20
li    AT, 0x42200000 ; 40.000000
mtc1  AT, F26
li    AT, 0x43960000 ; 300.000000
mtc1  AT, F24
li    AT, 0x44E10000 ; 1800.000000
mtc1  AT, F22
L80111BD0:
lwc1  F0, 0x18(SP)
mul.s F0, F0, F20
lwc1  F2, 0xc(S3)
add.s F0, F0, F2
swc1  F0, 0xc(S3)
lwc1  F0, 0x1c(SP)
mul.s F0, F0, F26
lwc1  F2, 0x30(S3)
add.s F0, F0, F2
swc1  F0, 0x30(S3)
lwc1  F0, 0x20(SP)
mul.s F0, F0, F20
lwc1  F2, 0x14(S3)
add.s F0, F0, F2
swc1  F0, 0x14(S3)
lwc1  F0, 0x30(S3)
c.lt.s F24, F0
      NOP
      NOP
bc1t  L80111C28
 li    V1, 1
move  V1, R0
L80111C28:
sltu  V0, R0, S0
and   V0, V1, V0
beqz  V0, L80111C5C
 li    A0, 255
move  S0, R0
li    A1, 255
jal   0x800620C8
 li    A2, 255
li    A0, 11
jal   InitFadeOut
 li    A1, 50
jal   PlaySound
 li    A0, 296
L80111C5C:
jal   SleepVProcess
       NOP
lwc1  F0, 0x30(S3)
c.lt.s F0, F22
      NOP
bc1t  L80111BD0
       NOP
L80111C78:
jal   GetFadeStatus
       NOP
beqz  V0, L80111C98
       NOP
jal   SleepVProcess
       NOP
j     L80111C78
       NOP
L80111C98:
lb    V0, 5(S7)
addu  V0, S7, V0
lb    V0, 6(V0)
sll   V0, V0, 1
lui   A0, hi(star_space_indices)
addu  A0, A0, V0
jal   GetSpaceData
 lh    A0, lo(star_space_indices)(A0)
move  S1, V0
lb    V0, 5(S7)
addu  V0, S7, V0
lb    V0, 6(V0)
sll   V0, V0, 1
lui   A0, hi(D_8011D2C0)
addu  A0, A0, V0
lh    A0, lo(D_8011D2C0)(A0)
jal   GetSpaceData
 addiu S1, S1, 8
move  S2, V0
addiu S0, SP, 0x38
move  A0, S0
jal   0x80089A20
 move  A1, S1
jal   0x800E9748
 move  A0, S0
jal   0x800F915C
 li    A0, 4
jal   0x800F9198
 move  A0, S0
lhu   V0, 0xa(S3)
andi  V0, V0, 0xfffe
sh    V0, 0xa(S3)
addiu A0, S3, 0xc
jal   0x80089A20
 move  A1, S1
addiu A0, SP, 0x18
addiu A1, S2, 8
jal   midpoint
 move  A2, S1
jal   0x800D88E8
 addiu A0, SP, 0x18
lwc1  F2, 0x18(SP)
li    AT, 0x41A00000 ; 20.000000
mtc1  AT, F4
      NOP
mul.s F2, F2, F4
lwc1  F0, 0xc(S3)
sub.s F0, F0, F2
swc1  F0, 0xc(S3)
lwc1  F2, 0x20(SP)
mul.s F2, F2, F4
lwc1  F0, 0x14(S3)
sub.s F0, F0, F2
swc1  F0, 0x14(S3)
jal   PlaySound
 li    A0, 297
li    A0, 11
jal   InitFadeIn
 li    A1, 50
li    AT, 0x42C80000 ; 100.000000
mtc1  AT, F0
      NOP
swc1  F0, 0x30(S3)
li    AT, 0x40400000 ; 3.000000
mtc1  AT, F22
li    AT, 0x41F00000 ; 30.000000
mtc1  AT, F20
L80111DA4:
jal   SleepVProcess
       NOP
lwc1  F0, 0x30(S3)
sub.s F0, F0, F22
c.lt.s F20, F0
      NOP
      NOP
bc1t  L80111DA4
 swc1  F0, 0x30(S3)
L80111DC8:
jal   GetFadeStatus
       NOP
beqz  V0, L80111DE8
       NOP
jal   SleepVProcess
       NOP
j     L80111DC8
       NOP
L80111DE8:
jal   0x8004EE68
       NOP
move  S0, V0
addiu A2, S3, 0x18
move  A0, A2
addiu A1, SP, 0x18
jal   0x800ED128
 li    A3, 16
move  A0, S0
jal   0x8004ED30
 move  A1, V0
jal   0x8004EE18
 move  S0, R0
lui   A1, 0x4040
lui   A2, 0x4000
jal   0x800EDB98
 move  A0, S3
move  S4, V0
li    A0, 60
jal   0x800EC590
 li    A1, 14896
jal   PlaySound
 li    A0, 300
move  A0, S3
li    A1, -1
jal   0x800D9CE8
 move  A2, R0
jal   SleepProcess
 li    A0, 20
li    S3, 1
lui   S2, hi(D_8011FA98)
addiu S2, S2, lo(D_8011FA98)
sll   V0, S0, 2
L80111E6C:
addu  S1, V0, S2
lw    A0, 0(S1)
beqz  A0, L80111E88
 addiu S0, S0, 1
jal   EndProcess
       NOP
sw    R0, 0(S1)
L80111E88:
slti  V0, S0, STAR_COUNT
bnez  V0, L80111E6C
 sll   V0, S0, 2
lb    V0, 5(S7)
addu  V0, S7, V0
lb    V0, 6(V0)
sll   V0, V0, 2
lui   S0, hi(D_8011FA78)
addu  S0, S0, V0
lw    S0, lo(D_8011FA78)(S0)
jal   0x8004A994
 li    A0, 90
mtc1  R0, F20
li    AT, 0x43C80000 ; 400.000000
mtc1  AT, F2
lwc1  F0, 0x30(S0)
c.lt.s F0, F2
      NOP
      NOP
bc1f  L80112028
 mov.s F4, F0
li    AT, 0x40400000 ; 3.000000
mtc1  AT, F22
li    AT, 0x43B40000 ; 360.000000
mtc1  AT, F24
li    AT, 0x42480000 ; 50.000000
mtc1  AT, F28
li    AT, 0x43C80000 ; 400.000000
mtc1  AT, F26
add.s F0, F4, F22
L80111F00:
swc1  F0, 0x30(S0)
lwc1  F0, 0x18(SP)
mul.s F0, F0, F22
lwc1  F2, 0xc(S0)
add.s F0, F0, F2
swc1  F0, 0xc(S0)
lwc1  F0, 0x20(SP)
mul.s F0, F0, F22
lwc1  F2, 0x14(S0)
add.s F0, F0, F2
swc1  F0, 0x14(S0)
jal   0x8008EF20
 mov.s F12, F20
neg.s F0, F0
swc1  F0, 0x18(S0)
jal   0x8008E3F0
 mov.s F12, F20
swc1  F0, 0x20(S0)
li    AT, 0x42340000 ; 45.000000
mtc1  AT, F0
      NOP
add.s F20, F20, F0
c.lt.s F24, F20
      NOP
      NOP
bc1tl L80111F6C
 sub.s F20, F20, F24
L80111F6C:
lwc1  F0, 0x30(S0)
c.lt.s F28, F0
      NOP
      NOP
bc1t  L80111F88
 li    V1, 1
move  V1, R0
L80111F88:
sltu  V0, R0, S3
and   V0, V1, V0
beqz  V0, L80112008
       NOP
jal   0x800DEB2C
 lb    A0, 0xf(S7)
li    V1, 3
bne   V0, V1, L80111FBC
       NOP
jal   0x80035FDC
 li    A0, 23
j     L80111FC8
 move  S3, R0
L80111FBC:
jal   0x8003602C
 li    A0, 23
move  S3, R0
L80111FC8:
move  A0, R0
move  A1, R0
jal   0x800620C8
 move  A2, R0
jal   EndProcess
 move  A0, S4
jal   0x800EDA58
       NOP
jal   0x800FC8A4
       NOP
jal   0x800FF7F0
 li    A0, 2
jal   0x800FCA14
       NOP
jal   0x8004A0E0
       NOP
L80112008:
jal   SleepVProcess
       NOP
lwc1  F4, 0x30(S0)
c.lt.s F4, F26
      NOP
      NOP
bc1tl L80111F00
 add.s F0, F4, F22
L80112028:
jal   SleepProcess
 li    A0, -1
lw    RA, 0x134(SP)
lw    FP, 0x130(SP)
lw    S7, 0x12c(SP)
lw    S6, 0x128(SP)
lw    S5, 0x124(SP)
lw    S4, 0x120(SP)
lw    S3, 0x11c(SP)
lw    S2, 0x118(SP)
lw    S1, 0x114(SP)
lw    S0, 0x110(SP)
ldc1  F28, 0x158(SP)
ldc1  F26, 0x150(SP)
ldc1  F24, 0x148(SP)
ldc1  F22, 0x140(SP)
ldc1  F20, 0x138(SP)
jr    RA
 addiu SP, SP, 0x160

; item 17?
D_80112074:
addiu SP, SP, -0x58
sw    RA, 0x3c(SP)
sw    S4, 0x38(SP)
sw    S3, 0x34(SP)
sw    S2, 0x30(SP)
sw    S1, 0x2c(SP)
sw    S0, 0x28(SP)
sdc1  F24, 0x50(SP)
sdc1  F22, 0x48(SP)
sdc1  F20, 0x40(SP)
lui   S1, hi(CORE_800CD058)
addiu S1, S1, lo(CORE_800CD058)
lb    S2, 0xf(S1)
li    A0, 1
jal   0x8005279C
 move  A1, R0
sll   V0, V0, 0x10
lui   A0, hi(CORE_80101980)
lw    A0, lo(CORE_80101980)(A0)
jal   ReadMainFS
 sra   S3, V0, 0x10
move  S0, V0
jal   ImgPackParse
 move  A0, S0
sll   V0, V0, 0x10
sra   S4, V0, 0x10
jal   FreeMainFS
 move  A0, S0
move  S0, S3
move  A0, S0
move  A1, R0
move  A2, S4
jal   0x80055024
 move  A3, R0
move  A0, S0
move  A1, R0
jal   0x80055294
 li    A2, 18304
move  A0, S0
move  A1, R0
jal   0x800553A8
 li    A2, 36864
lui   A0, hi(CORE_8010570C)
lh    A0, lo(CORE_8010570C)(A0)
move  A1, R0
li    A2, 1
jal   0x80055140
 move  A3, R0
lui   A0, hi(CORE_8010570C)
lh    A0, lo(CORE_8010570C)(A0)
move  A1, R0
jal   0x800550F4
 li    A2, 1
jal   SleepProcess
 li    A0, 20
jal   PlaySound
 li    A0, 325
lui   A0, hi(CORE_8010570C)
lh    A0, lo(CORE_8010570C)(A0)
move  A1, R0
addiu A2, SP, 0x20
jal   0x800F6748
 addiu A3, SP, 0x24
jal   0x8004EE68
       NOP
move  S0, V0
lui   A0, hi(CORE_8010570C)
lh    A0, lo(CORE_8010570C)(A0)
lwc1  F0, 0x20(SP)
trunc.w.s F2, F0
mfc1  A1, F2
      NOP
sll   A1, A1, 0x10
lwc1  F0, 0x24(SP)
trunc.w.s F2, F0
mfc1  A2, F2
      NOP
sll   A2, A2, 0x10
lb    V0, 0xf(S1)
sll   V0, V0, 3
lui   AT, hi(D_8011E354)
addu  AT, AT, V0
lwc1  F0, lo(D_8011E354)(AT)
trunc.w.s F2, F0
mfc1  A3, F2
      NOP
sll   A3, A3, 0x10
lui   AT, hi(D_8011E358)
addu  AT, AT, V0
lwc1  F0, lo(D_8011E358)(AT)
trunc.w.s F2, F0
mfc1  V0, F2
      NOP
sll   V0, V0, 0x10
sra   V0, V0, 0x10
sw    V0, 0x10(SP)
li    V0, -1
sw    V0, 0x14(SP)
sra   A1, A1, 0x10
sra   A2, A2, 0x10
jal   func_8010FB54
 sra   A3, A3, 0x10
move  A0, S0
jal   0x8004ED30
 move  A1, V0
jal   0x8004EE18
 li    S0, 1
jal   SleepProcess
 li    A0, 10
lui   A0, hi(CORE_8010570C)
lh    A0, lo(CORE_8010570C)(A0)
move  A1, R0
move  A2, R0
jal   0x80055140
 move  A3, R0
lui   A0, hi(CORE_8010570C)
lh    A0, lo(CORE_8010570C)(A0)
move  A1, R0
jal   0x800550F4
 li    A2, 1
li    S1, 255
sll   A2, S0, 1
L8011225C:
addu  A2, A2, S0
sll   A2, A2, 3
addu  A2, A2, S0
subu  A2, S1, A2
lui   A0, hi(CORE_8010570C)
lh    A0, lo(CORE_8010570C)(A0)
move  A1, R0
jal   0x80055458
 andi  A2, A2, 0xffff
jal   SleepVProcess
 addiu S0, S0, 1
slti  V0, S0, 0xa
bnezl V0, L8011225C
 sll   A2, S0, 1
lui   A0, hi(CORE_8010570C)
lh    A0, lo(CORE_8010570C)(A0)
move  A1, R0
jal   0x80055458
 move  A2, R0
lui   A0, hi(CORE_8010570C)
lh    A0, lo(CORE_8010570C)(A0)
move  A1, R0
jal   0x800553A8
 li    A2, 32768
jal   0x800E4A7C
 move  S0, S3
sll   V1, S2, 3
subu  V1, V1, S2
sll   V1, V1, 3
lui   A0, hi(p1_item1)
addiu A0, A0, lo(p1_item1)
addu  V1, V1, A0
addu  V1, V1, V0
li    V0, -1
jal   0x800E4A7C
 sb    V0, 0(V1)
move  A0, S2
move  A1, V0
jal   0x800F68E0
 move  A2, R0
jal   0x800E4A7C
       NOP
move  A0, S2
move  A1, V0
addiu A2, SP, 0x20
jal   0x800F6848
 addiu A3, SP, 0x24
lwc1  F0, 0x20(SP)
trunc.w.s F2, F0
mfc1  A2, F2
      NOP
sll   A2, A2, 0x10
lwc1  F0, 0x24(SP)
trunc.w.s F2, F0
mfc1  A3, F2
      NOP
sll   A3, A3, 0x10
move  A0, S0
move  A1, R0
sra   A2, A2, 0x10
jal   0x80054904
 sra   A3, A3, 0x10
move  A0, S0
move  A1, R0
jal   0x8005532C
 li    A2, 32768
jal   FixUpPlayerItemSlots
 move  A0, S2
jal   0x800F6BC4
 li    A0, -1
jal   0x800F66DC
 move  A0, R0
jal   0x800F6ECC
 li    A0, -1
sw    R0, 0x10(SP)
func_80112388:
sw    R0, 0x14(SP)
sw    R0, 0x18(SP)
li    A0, 56
li    A1, 0x4100 ; "Hey Im the skeleton key. Youre not throwing me away right?"
move  A2, R0
jal   0x800EC8EC ; ShowMessage
 move  A3, R0
lui   A0, hi(D_8011E454)
addiu A0, A0, lo(D_8011E454)
jal   __PP64_INTERNAL_BASIC_MESSAGE_CHOICE
 move  A1, R0
jal   0x800EC6C8
 move  S0, V0
jal   0x800EC6EC
       NOP
beqz  S0, L801123DC
 li    V0, 1
beql  S0, V0, L80112404
 sw    R0, 0x10(SP)
j     L8011247C
 move  S0, S3
L801123DC:
sw    R0, 0x10(SP)
sw    R0, 0x14(SP)
sw    R0, 0x18(SP)
li    A0, 56
li    A1, 16641
move  A2, R0
jal   0x800EC8EC ; ShowMessage
 move  A3, R0
j     L801124BC
       NOP
L80112404:
sw    R0, 0x14(SP)
sw    R0, 0x18(SP)
li    A0, 56
li    A1, 16642
move  A2, R0
jal   0x800EC8EC ; ShowMessage
 move  A3, R0
move  A0, S3
move  A1, R0
jal   0x800553A8
 li    A2, 32768
jal   PlayerHasEmptyItemSlot
 move  A0, S2
sll   V1, S2, 3
subu  V1, V1, S2
sll   V1, V1, 3
lui   A0, hi(p1_item1)
addiu A0, A0, lo(p1_item1)
addu  V1, V1, A0
addu  V1, V1, V0
li    V0, 1
sb    V0, 0(V1)
jal   FixUpPlayerItemSlots
 move  A0, S2
lui   V1, hi(CORE_800CD0A8)
addiu V1, V1, lo(CORE_800CD0A8)
lhu   V0, 0(V1)
andi  V0, V0, 0xfffe
j     L801124BC
 sh    V0, 0(V1)
L8011247C:
move  A0, S0
move  A1, R0
jal   0x800553A8
 li    A2, 32768
jal   func_80106FE8
       NOP
li    V0, 1
lui   AT, hi(CORE_800CB99C)
jal   0x80049FB8
 sb    V0, lo(CORE_800CB99C)(AT)
move  A0, S0
move  A1, R0
jal   0x8005532C
 li    A2, 32768
j     func_80112388
 sw    R0, 0x10(SP)
L801124BC:
jal   0x800EC6C8
       NOP
jal   0x800EC6EC
       NOP
bnez  S0, L80112580
       NOP
jal   SleepProcess
 li    A0, 10
li    S0, 1
move  S1, S3
li    AT, 0x407E0000 ; 3.968750
ori AT, AT, 0xf9db
mtc1  AT, F24
li    AT, 0x437F0000 ; 255.000000
mtc1  AT, F22
li    AT, 0x4F000000 ; 2147483648.000000
mtc1  AT, F20
lui   S2, 0x8000
L80112504:
mtc1  S0, F0
      NOP
cvt.s.w F0, F0
mul.s F0, F0, F24
sub.s F2, F22, F0
c.le.s F20, F2
      NOP
      NOP
bc1tl L80112540
 sub.s F0, F2, F20
trunc.w.s F0, F2
mfc1  A2, F0
      NOP
j     L80112554
 move  A0, S1
L80112540:
trunc.w.s F2, F0
mfc1  A2, F2
      NOP
or    A2, A2, S2
move  A0, S1
L80112554:
move  A1, R0
jal   0x80055458
 andi  A2, A2, 0xffff
jal   SleepVProcess
 addiu S0, S0, 1
slti  V0, S0, 0x40
bnez  V0, L80112504
 move  A1, R0
move  A0, S3
jal   0x80055458
 move  A2, R0
L80112580:
jal   0x800525C8
 move  A0, S3
jal   FreeGraphics
 move  A0, S4
lw    RA, 0x3c(SP)
lw    S4, 0x38(SP)
lw    S3, 0x34(SP)
lw    S2, 0x30(SP)
lw    S1, 0x2c(SP)
lw    S0, 0x28(SP)
ldc1  F24, 0x50(SP)
ldc1  F22, 0x48(SP)
ldc1  F20, 0x40(SP)
jr    RA
 addiu SP, SP, 0x58

D_801125BC:
addiu SP, SP, -0x40
sw    RA, 0x2c(SP)
sw    S2, 0x28(SP)
sw    S1, 0x24(SP)
sw    S0, 0x20(SP)
sdc1  F22, 0x38(SP)
jal   0x8004EE68
 sdc1  F20, 0x30(SP)
lw    S1, 0x8c(V0)
li    A0, 1
jal   0x8005279C
 move  A1, R0
sll   V0, V0, 0x10
sra   S2, V0, 0x10
move  S0, S2
move  A0, S0
move  A1, R0
lui   A2, hi(D_8011FB66)
lh    A2, lo(D_8011FB66)(A2)
jal   0x80055024
 move  A3, R0
move  A0, S0
move  A1, R0
jal   0x80055294
 li    A2, 9
move  A0, S0
move  A1, R0
jal   0x800553A8
 li    A2, 4096
lui   A0, hi(D_8011FB60)
lw    A0, lo(D_8011FB60)(A0)
move  A1, R0
addiu A2, SP, 0x18
jal   0x800F6E4C
 addiu A3, SP, 0x1c
lui   V0, hi(D_8011FB60)
lw    V0, lo(D_8011FB60)(V0)
sll   V0, V0, 3
lui   AT, hi(D_8011E20C)
addu  AT, AT, V0
lwc1  F0, lo(D_8011E20C)(AT)
li    AT, 0x41800000 ; 16.000000
mtc1  AT, F4
      NOP
mul.s F0, F0, F4
lui   AT, hi(D_8011E1EC)
addu  AT, AT, V0
lwc1  F2, lo(D_8011E1EC)(AT)
add.s F0, F0, F2
trunc.w.s F2, F0
swc1  F2, 0x18(SP)
lui   AT, hi(D_8011E210)
addu  AT, AT, V0
lwc1  F0, lo(D_8011E210)(AT)
mul.s F0, F0, F4
lui   AT, hi(D_8011E1F0)
addu  AT, AT, V0
lwc1  F2, lo(D_8011E1F0)(AT)
add.s F0, F0, F2
trunc.w.s F2, F0
swc1  F2, 0x1c(SP)
lwc1  F0, 0x18(SP)
cvt.s.w F0, F0
sll   S1, S1, 3
lui   AT, hi(D_8011E460)
addu  AT, AT, S1
lwc1  F2, lo(D_8011E460)(AT)
add.s F0, F0, F2
trunc.w.s F2, F0
mfc1  A2, F2
      NOP
sll   A2, A2, 0x10
lwc1  F0, 0x1c(SP)
cvt.s.w F0, F0
lui   AT, hi(D_8011E464)
addu  AT, AT, S1
lwc1  F2, lo(D_8011E464)(AT)
add.s F0, F0, F2
trunc.w.s F2, F0
mfc1  A3, F2
      NOP
sll   A3, A3, 0x10
move  A0, S0
move  A1, R0
sra   A2, A2, 0x10
jal   0x80054904
 sra   A3, A3, 0x10
li    V0, 255
sw    V0, 0x10(SP)
move  A0, S0
move  A1, R0
li    A2, 255
jal   0x80055420
 li    A3, 255
move  A0, S0
move  A1, R0
jal   0x80055458
 li    A2, 255
mtc1  R0, F20
li    S0, 255
move  S1, S2
li    AT, 0x3DCC0000 ; 0.099609
ori AT, AT, 0xcccd
mtc1  AT, F22
L8011275C:
move  A0, S1
mfc1  A2, F20
mfc1  A3, F20
      NOP
jal   0x800551D8
 move  A1, R0
move  A0, S1
move  A1, R0
jal   0x80055458
 andi  A2, S0, 0xffff
jal   SleepVProcess
 addiu S0, S0, -0xa
bgez  S0, L8011275C
 add.s F20, F20, F22
move  S0, S2
move  A0, S0
move  A1, R0
jal   0x80055458
 move  A2, R0
jal   0x800525C8
 move  A0, S0
jal   EndProcess
 move  A0, R0
lw    RA, 0x2c(SP)
lw    S2, 0x28(SP)
lw    S1, 0x24(SP)
lw    S0, 0x20(SP)
ldc1  F22, 0x38(SP)
ldc1  F20, 0x30(SP)
jr    RA
 addiu SP, SP, 0x40

D_801127D8:
addiu SP, SP, -0x38
sw    RA, 0x34(SP)
sw    S6, 0x30(SP)
sw    S5, 0x2c(SP)
sw    S4, 0x28(SP)
sw    S3, 0x24(SP)
sw    S2, 0x20(SP)
sw    S1, 0x1c(SP)
jal   0x8004EE68
 sw    S0, 0x18(SP)
lw    S1, 0x8c(V0)
lui A0, 0x21
jal   ReadMainFS
 ori A0, A0, 0x2c
move  S0, V0
jal   ImgPackParse
 move  A0, S0
sll   V0, V0, 0x10
sra   S6, V0, 0x10
jal   FreeMainFS
 move  A0, S0
lui A0, 0x13
jal   ReadMainFS
 ori A0, A0, 0x1ba
move  S0, V0
jal   ImgPackParse
 move  A0, S0
sll   V0, V0, 0x10
sra   S5, V0, 0x10
jal   FreeMainFS
 move  A0, S0
lui A0, 0x13
jal   ReadMainFS
 ori A0, A0, 0x1b9
move  S0, V0
jal   ImgPackParse
 move  A0, S0
sll   V0, V0, 0x10
sra   V0, V0, 0x10
lui   AT, hi(D_8011FB64)
sw    V0, lo(D_8011FB64)(AT)
jal   FreeMainFS
 move  A0, S0
li    A0, 2
jal   0x8005279C
 li    A1, 2
sll   V0, V0, 0x10
sra   S3, V0, 0x10
move  S0, S3
move  A0, S0
move  A1, R0
jal   0x800550F4
 li    A2, 1
move  A0, S0
move  A1, R0
move  A2, S6
jal   0x80055024
 li    A3, 12
move  A0, S0
move  A1, R0
jal   0x80055294
 li    A2, 9
move  A0, S0
move  A1, R0
jal   0x800553A8
 li    A2, 4096
move  A0, S0
move  A1, R0
jal   0x800554C4
 li    A2, -1
move  A0, S0
li    A1, 1
move  A2, S5
jal   0x80055024
 move  A3, R0
move  A0, S0
li    A1, 1
jal   0x80055294
 li    A2, 9
move  A0, S0
li    A1, 1
jal   0x800553A8
 li    A2, 36864
li    V0, 255
sw    V0, 0x10(SP)
move  A0, S0
li    A1, 1
li    A2, 255
jal   0x80055420
 li    A3, 255
move  A0, S0
li    A1, 1
jal   0x80055458
 li    A2, 255
move  A0, S0
li    A1, 1
lui   A2, 0x4000
jal   0x800551D8
 move  A3, A2
move  A0, S0
li    A1, 1
jal   0x800554C4
 move  A2, R0
andi  V0, S1, 1
beqz  V0, L801129B0
 li    S2, 200
move  A0, S0
move  A1, R0
jal   0x800553A8
 li    A2, 1
move  A0, S0
li    A1, 1
jal   0x800553A8
 li    A2, 1
move  A0, S0
li    A1, 1
j     L801129C0
 li    A2, 20
L801129B0:
li    S2, 120
move  A0, S3
li    A1, 1
li    A2, -20
L801129C0:
jal   0x80054904
 li    A3, -5
slti  V0, S1, 2
beqz  V0, L801129D8
 li    S0, 272
li    S0, -32
L801129D8:
jal   SleepProcess
 li    A0, 20
move  A0, S1
jal   PlayerHasItem
 li    A1, ITEM_BOO_REPELLANT
sll   V1, S1, 3
subu  V1, V1, S1
sll   V1, V1, 3
lui   A0, hi(p1_item1)
addiu A0, A0, lo(p1_item1)
addu  V1, V1, A0
addu  V1, V1, V0
li    V0, -1
sb    V0, 0(V1)
jal   FixUpPlayerItemSlots
 move  A0, S1
jal   0x800F63F0
 move  A0, S1
slti  V0, S1, 2
beql  V0, R0, L80112A44
 addiu S0, S0, -5
addiu S0, S0, 5
slti  V0, S0, 0x33
beqz  V0, L80112A88
 sll   A3, S0, 0x10
j     L80112A50
       NOP
L80112A44:
slti  V0, S0, 0xd2
bnez  V0, L80112A88
 sll   A3, S0, 0x10
L80112A50:
move  A0, S3
move  A1, R0
move  A2, S2
jal   0x80054904
 sra   A3, A3, 0x10
jal   SleepVProcess
       NOP
slti  V0, S1, 2
beql  V0, R0, L80112A44
 addiu S0, S0, -5
addiu S0, S0, 5
slti  V0, S0, 0x33
bnez  V0, L80112A50
 sll   A3, S0, 0x10
L80112A88:
jal   SleepProcess
 li    A0, 10
move  A0, S3
li    A1, 1
jal   0x8005532C
 li    A2, 32768
jal   PlaySound
 li    A0, 332
sll   V0, V0, 0x10
sra   S4, V0, 0x10
lui   AT, hi(D_8011FB60)
sw    S1, lo(D_8011FB60)(AT)
move  S2, R0
move  S0, R0
L80112AC0:
lui   A0, hi(D_801125BC)
addiu A0, A0, lo(D_801125BC)
li    A1, 16386
move  A2, R0
jal   InitProcess
 move  A3, R0
move  S1, V0
sw    S0, 0x8c(S1)
jal   SleepProcess
 li    A0, 2
addiu S0, S0, 1
slti  V0, S0, 6
bnez  V0, L80112AC0
       NOP
jal   SleepProcess
 li    A0, 5
addiu S2, S2, 1
slti  V0, S2, 4
bnez  V0, L80112AC0
 move  S0, R0
jal   0x8004EE68
 li    S0, 255
move  A0, V0
jal   0x8004ED30
 move  A1, S1
jal   0x8004EE18
 sll   S1, S3, 0x10
jal   0x8004AD50
 move  A0, S4
move  A0, S3
li    A1, 1
jal   0x80055458
 move  A2, R0
sra   A0, S1, 0x10
L80112B48:
move  A1, R0
jal   0x80055458
 andi  A2, S0, 0xffff
jal   SleepVProcess
 addiu S0, S0, -0x1e
bgezl S0, L80112B48
 sra   A0, S1, 0x10
move  S0, S3
move  A0, S0
move  A1, R0
jal   0x80055458
 move  A2, R0
jal   0x800525C8
 move  A0, S0
lui   A0, hi(D_8011FB66)
jal   FreeGraphics
 lh    A0, lo(D_8011FB66)(A0)
jal   FreeGraphics
 move  A0, S5
jal   FreeGraphics
 move  A0, S6
jal   EndProcess
 move  A0, R0
lw    RA, 0x34(SP)
lw    S6, 0x30(SP)
lw    S5, 0x2c(SP)
lw    S4, 0x28(SP)
lw    S3, 0x24(SP)
lw    S2, 0x20(SP)
lw    S1, 0x1c(SP)
lw    S0, 0x18(SP)
jr    RA
 addiu SP, SP, 0x38

D_80112BCC:
addiu SP, SP, -0x28
sw    RA, 0x14(SP)
sw    S0, 0x10(SP)
sdc1  F22, 0x20(SP)
sdc1  F20, 0x18(SP)
jal   SleepProcess
 li    A0, 10
li    S0, 1
li    AT, 0x407E0000 ; 3.968750
ori   AT, AT, 0xf9db
mtc1  AT, F22
li    AT, 0x437F0000 ; 255.000000
mtc1  AT, F20
L80112C00:
jal   0x800E4A7C
       NOP
mtc1  S0, F0
      NOP
cvt.s.w F0, F0
mul.s F0, F0, F22
sub.s F0, F20, F0
trunc.w.s F2, F0
mfc1  A2, F2
      NOP
sll   A2, A2, 0x10
lui   A0, hi(current_player_index)
lb    A0, lo(current_player_index)(A0)
move  A1, V0
jal   0x800F68E0
 sra   A2, A2, 0x10
jal   SleepVProcess
 addiu S0, S0, 1
slti  V0, S0, 0x40
bnez  V0, L80112C00
       NOP
jal   0x800E4A7C
       NOP
lui   A0, hi(current_player_index)
lb    A0, lo(current_player_index)(A0)
move  A1, V0
jal   0x800F68E0
 move  A2, R0
lw    RA, 0x14(SP)
lw    S0, 0x10(SP)
ldc1  F22, 0x20(SP)
ldc1  F20, 0x18(SP)
jr    RA
 addiu SP, SP, 0x28

D_80112C88:
addiu SP, SP, -0x40
sw    RA, 0x18(SP)
sw    S1, 0x14(SP)
sw    S0, 0x10(SP)
sdc1  F26, 0x38(SP)
sdc1  F24, 0x30(SP)
sdc1  F22, 0x28(SP)
jal   0x8004EE68
 sdc1  F20, 0x20(SP)
lw    S1, 0x8c(V0)
lui   A0, hi(D_8011FB68)
jal   0x800D975C
 lw    A0, lo(D_8011FB68)(A0)
move  S0, V0
addiu A0, S0, 0xc
jal   0x80089A20
 addiu A1, S1, 0xc
addiu A0, S0, 0x24
lui   A1, 0x4000
move  A2, A1
jal   0x80089A10
 move  A3, A1
lwc1  F0, 0x30(S1)
li    AT, 0x41200000 ; 10.000000
mtc1  AT, F2
      NOP
add.s F0, F0, F2
swc1  F0, 0x30(S0)
jal   0x800D9AA4
 move  A0, S0
li    AT, 0x43B40000 ; 360.000000
mtc1  AT, F12
jal   0x800EEF80
       NOP
mtc1  V0, F20
      NOP
cvt.s.w F20, F20
lui   AT, hi(D_8011F968)
ldc1  F22, lo(D_8011F968)(AT)
li    AT, 0x420C0000 ; 35.000000
mtc1  AT, F26
li    AT, 0x42200000 ; 40.000000
mtc1  AT, F24
func_80112D34:
jal   SleepVProcess
       NOP
lwc1  F0, 0x30(S0)
cvt.d.s F0, F0
add.d F0, F0, F22
cvt.s.d F0, F0
swc1  F0, 0x30(S0)
lwc1  F2, 0x30(S1)
add.s F2, F2, F26
c.le.s F2, F0
      NOP
bc1t  L80112DA8
       NOP
add.s F20, F20, F24
lw    V0, 0x3c(S0)
lw    V0, 0x40(V0)
lh    V0, 0(V0)
sll   A0, V0, 1
addu  A0, A0, V0
sll   A0, A0, 6
lui   V0, hi(CORE_800D03F8)
lw    V0, lo(CORE_800D03F8)(V0)
addu  A0, A0, V0
mfc1  A1, F20
      NOP
jal   0x8008A2A0
 addiu A0, A0, 0x74
j     func_80112D34
       NOP
L80112DA8:
jal   0x800D9B54
 move  A0, S0
jal   EndProcess
 move  A0, R0
lw    RA, 0x18(SP)
lw    S1, 0x14(SP)
lw    S0, 0x10(SP)
ldc1  F26, 0x38(SP)
ldc1  F24, 0x30(SP)
ldc1  F22, 0x28(SP)
ldc1  F20, 0x20(SP)
jr    RA
 addiu SP, SP, 0x40

func_80112DDC:
addiu SP, SP, -0x18
sw    RA, 0x14(SP)
sw    S0, 0x10(SP)
move  S0, A0
lui   A0, hi(D_80112C88)
addiu A0, A0, lo(D_80112C88)
li    A1, 4096
move  A2, R0
jal   InitProcess
 move  A3, R0
sw    S0, 0x8c(V0)
lw    RA, 0x14(SP)
lw    S0, 0x10(SP)
jr    RA
 addiu SP, SP, 0x18

D_80112E18:
addiu SP, SP, -0x50
sw    RA, 0x18(SP)
sw    S1, 0x14(SP)
sw    S0, 0x10(SP)
sdc1  F30, 0x48(SP)
sdc1  F28, 0x40(SP)
sdc1  F26, 0x38(SP)
sdc1  F24, 0x30(SP)
sdc1  F22, 0x28(SP)
jal   0x8004EE68
 sdc1  F20, 0x20(SP)
lw    S0, 0x8c(V0)
mtc1  R0, F20
li    AT, 0x3F800000 ; 1.000000
mtc1  AT, F22
lui   S1, hi(CORE_800CD058)
addiu S1, S1, lo(CORE_800CD058)
li    AT, 0x41F00000 ; 30.000000
mtc1  AT, F30
li    AT, 0x43B40000 ; 360.000000
mtc1  AT, F24
li    AT, 0x3DCC0000 ; 0.099609
ori AT, AT, 0xcccd
mtc1  AT, F28
mtc1  R0, F26
      NOP
func_80112E80:
jal   0x8008EF20
 mov.s F12, F20
lui   V0, hi(D_8011FB6C)
lw    V0, lo(D_8011FB6C)(V0)
neg.s F0, F0
swc1  F0, 0x18(V0)
jal   0x8008E3F0
 mov.s F12, F20
lui   V0, hi(D_8011FB6C)
lw    V0, lo(D_8011FB6C)(V0)
add.s F20, F20, F30
c.lt.s F24, F20
      NOP
      NOP
bc1f  L80112EC4
 swc1  F0, 0x20(V0)
sub.s F20, F20, F24
L80112EC4:
lw    V0, 0(S0)
beqz  V0, L80112EFC
       NOP
lui   V0, hi(D_8011FB6C)
lw    V0, lo(D_8011FB6C)(V0)
swc1  F22, 0x2c(V0)
swc1  F22, 0x28(V0)
swc1  F22, 0x24(V0)
sub.s F22, F22, F28
c.le.s F22, F26
      NOP
      NOP
bc1t  L80112F0C
 li    A0, -1
L80112EFC:
jal   SleepVProcess
       NOP
j     func_80112E80
       NOP
L80112F0C:
lui   V0, hi(D_8011FB6C)
lw    V0, lo(D_8011FB6C)(V0)
mtc1  R0, F0
      NOP
swc1  F0, 0x2c(V0)
swc1  F0, 0x28(V0)
swc1  F0, 0x24(V0)
jal   PlayerHasItem
 li    A1, ITEM_KOOPA_CARD
lb    A0, 0xf(S1)
sll   V1, A0, 3
subu  V1, V1, A0
sll   V1, V1, 3
lui   A0, hi(p1_item1)
addiu A0, A0, lo(p1_item1)
addu  V1, V1, A0
addu  V1, V1, V0
li    V0, -1
sb    V0, 0(V1)
jal   FixUpPlayerItemSlots
 lb    A0, 0xf(S1)
jal   0x800F63F0
 lb    A0, 0xf(S1)
lui   A0, hi(D_8011FB6C)
jal   0x800D9B54
 lw    A0, lo(D_8011FB6C)(A0)
jal   EndProcess
 move  A0, R0
lw    RA, 0x18(SP)
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

func_80112FA8:
addiu SP, SP, -0x50
sw    RA, 0x34(SP)
sw    S4, 0x30(SP)
sw    S3, 0x2c(SP)
sw    S2, 0x28(SP)
sw    S1, 0x24(SP)
sw    S0, 0x20(SP)
sdc1  F24, 0x48(SP)
sdc1  F22, 0x40(SP)
sdc1  F20, 0x38(SP)
sw    R0, 0x18(SP)
lui   S4, hi(CORE_800CD058)
addiu S4, S4, lo(CORE_800CD058)
li    A0, 1
jal   0x8005279C
 li    A1, 5
lui   AT, hi(CORE_8010570C)
sh    V0, lo(CORE_8010570C)(AT)
lui   V1, hi(current_player_index)
lb    V1, lo(current_player_index)(V1)
sll   V0, V1, 3
subu  V0, V0, V1
sll   V0, V0, 3
lui   AT, hi(p1_char)
addu  AT, AT, V0
lbu   V0, lo(p1_char)(AT)
sll   V0, V0, 2
lui   A0, hi(CORE_80101040)
addu  A0, A0, V0
jal   ReadMainFS
 lw    A0, lo(CORE_80101040)(A0)
move  S1, V0
jal   ImgPackParse
 move  A0, S1
sll   S0, V0, 0x10
sra   S0, S0, 0x10
jal   FreeMainFS
 move  A0, S1
lui   A0, hi(CORE_8010570C)
lh    A0, lo(CORE_8010570C)(A0)
move  A1, R0
move  A2, S0
jal   0x80055024
 move  A3, R0
lui   A0, hi(CORE_8010570C)
lh    A0, lo(CORE_8010570C)(A0)
move  A1, R0
jal   0x80055294
 li    A2, 10
lui   A0, hi(CORE_8010570C)
lh    A0, lo(CORE_8010570C)(A0)
move  A1, R0
jal   0x800550F4
 li    A2, 1
lui   A0, hi(CORE_8010570C)
lh    A0, lo(CORE_8010570C)(A0)
move  A1, R0
jal   0x800553A8
 li    A2, 32768
li    A0, -1
move  A1, R0
addiu A2, SP, 0x10
jal   0x800F6E4C
 addiu A3, SP, 0x14
lui   A0, hi(CORE_8010570C)
lh    A0, lo(CORE_8010570C)(A0)
lh    A2, 0x12(SP)
lh    A3, 0x16(SP)
jal   0x80054904
 move  A1, R0
jal   0x800F6BC4
 li    A0, -1
jal   0x800F66DC
 li    A0, 1
jal   0x800F6ECC
 li    A0, -1
li    A0, -1
jal   PlayerHasItem
 li    A1, ITEM_KOOPA_CARD
jal   0x800E4A88
 move  A0, V0
jal   func_8010FE54
       NOP
li    A0, 68
jal   0x800D90C8
 move  A1, R0
lui   AT, hi(D_8011FB6C)
sw    V0, lo(D_8011FB6C)(AT)
jal   GetPlayerStruct
 li    A0, -1
lw    A1, 0x24(V0)
lui   A0, hi(D_8011FB6C)
lw    A0, lo(D_8011FB6C)(A0)
addiu A0, A0, 0xc
jal   0x80089A20
 addiu A1, A1, 0xc
lui   V0, hi(D_8011FB6C)
lw    V0, lo(D_8011FB6C)(V0)
li    AT, 0x42C80000 ; 100.000000
mtc1  AT, F0
      NOP
swc1  F0, 0x30(V0)
li    AT, 0x3F800000 ; 1.000000
mtc1  AT, F22
li    AT, 0x41F00000 ; 30.000000
mtc1  AT, F20
lui   V0, hi(D_8011FB6C)
lw    V0, lo(D_8011FB6C)(V0)
lwc1  F0, 0x30(V0)
sub.s F0, F0, F22
L80113160:
jal   SleepVProcess
 swc1  F0, 0x30(V0)
lui   V0, hi(D_8011FB6C)
lw    V0, lo(D_8011FB6C)(V0)
lwc1  F0, 0x30(V0)
c.lt.s F20, F0
      NOP
      NOP
bc1tl L80113160
 sub.s F0, F0, F22
jal   0x800F6BC4
 li    A0, -1
jal   0x800F66DC
 move  A0, R0
jal   0x800F6ECC
 li    A0, -1
lui   A0, hi(D_80112E18)
addiu A0, A0, lo(D_80112E18)
li    A1, 16386
move  A2, R0
jal   InitProcess
 move  A3, R0
addiu V1, SP, 0x18
sw    V1, 0x8c(V0)
li    A0, -1
li    A1, 4
jal   0x800FFA4C
 li    A2, 5
move  S3, V0
lui   S1, hi(bank_coin_total)
lh    S1, lo(bank_coin_total)(S1)
mtc1  S1, F24
      NOP
cvt.s.w F24, F24
li    AT, 0x41F00000 ; 30.000000
mtc1  AT, F0
      NOP
div.s F24, F24, F0
mtc1  R0, F20
li    A0, 25
jal   0x800D90C8
 move  A1, R0
lui   AT, hi(D_8011FB68)
sw    V0, lo(D_8011FB68)(AT)
jal   0x800D9714
 move  A0, V0
lui   A0, hi(D_8011FB68)
jal   0x800D9B24
 lw    A0, lo(D_8011FB68)(A0)
beqz  S1, L801132C4
       NOP
li    AT, 0x3F800000 ; 1.000000
mtc1  AT, F22
lui   S2, hi(bank_coin_total)
addiu S2, S2, lo(bank_coin_total)
add.s F20, F20, F24
L80113240:
c.le.s F22, F20
      NOP
      NOP
bc1f  L8011326C
 move  S0, R0
L80113254:
sub.s F20, F20, F22
c.le.s F22, F20
      NOP
      NOP
bc1t  L80113254
 addiu S0, S0, 1
L8011326C:
beqz  S0, L801132BC
       NOP
lui   A0, hi(D_8011FB6C)
jal   func_80112DDC
 lw    A0, lo(D_8011FB6C)(A0)
subu  V0, S1, S0
bltzl V0, L8011328C
 move  S0, S1
L8011328C:
subu  S1, S1, S0
lb    A0, 0xf(S4)
jal   AdjustPlayerCoins
 move  A1, S0
jal   PlaySound
 li    A0, 262
lhu   V0, 0(S2)
subu  V0, V0, S0
jal   func_80108478
 sh    V0, 0(S2)
jal   SleepProcess
 li    A0, 5
L801132BC:
bnezl S1, L80113240
 add.s F20, F20, F24
L801132C4:
jal   0x800FFAEC
 move  A0, S3
li    V0, 1
sw    V0, 0x18(SP)
jal   SleepProcess
 li    A0, 20
lui   A0, hi(D_8011FB68)
jal   0x800D9B54
 lw    A0, lo(D_8011FB68)(A0)
jal   GetPlayerStruct
 li    A0, -1
lw    A0, 0x24(V0)
jal   0x800ECC0C
 addiu A0, A0, 0x18
li    A0, -1
li    A1, 5
jal   0x800F2304
 move  A2, R0
jal   SleepProcess
 li    A0, 5
lb    A1, 0xf(S4)
jal   0x8004ACE0
 li    A0, 628
jal   SleepProcess
 li    A0, 45
li    A0, -1
li    A1, -1
jal   0x800F2304
 li    A2, 2
lw    RA, 0x34(SP)
lw    S4, 0x30(SP)
lw    S3, 0x2c(SP)
lw    S2, 0x28(SP)
lw    S1, 0x24(SP)
lw    S0, 0x20(SP)
ldc1  F24, 0x48(SP)
ldc1  F22, 0x40(SP)
ldc1  F20, 0x38(SP)
jr    RA
 addiu SP, SP, 0x50

; Called after "Who's your opponent" textbox
func_80113364:
addiu SP, SP, -0x48
sw    RA, 0x40(SP)
sw    S5, 0x3c(SP)
sw    S4, 0x38(SP)
sw    S3, 0x34(SP)
sw    S2, 0x30(SP)
sw    S1, 0x2c(SP)
sw    S0, 0x28(SP)
move  S4, A0
move  S5, A1
move  S2, R0
lui   A1, hi(D_8011F8D0)
addiu A1, A1, lo(D_8011F8D0)
lwl   V0, 0(A1)
lwr   V0, 3(A1)
swl   V0, 0x20(SP)
swr   V0, 0x23(SP)
move  S1, R0
addiu S3, SP, 0x18
L801133B0:
lui   V0, hi(current_player_index)
lb    V0, lo(current_player_index)(V0)
bne   S1, V0, L8011347C
 sll   V0, S1, 3
subu  V0, V0, S1
sll   V0, V0, 3
lui   AT, hi(CORE_800D110C)
addu  AT, AT, V0
lbu   V0, lo(CORE_800D110C)(AT)
andi  V0, V0, 1
beqz  V0, L80113430
 sll   S0, S1, 3
beqz  S5, L801133F8
       NOP
lui   V0, hi(D_8011FB70)
lw    V0, lo(D_8011FB70)(V0)
j     L80113404
 addiu S2, V0, 1
L801133F8:
lui   V0, hi(D_8011FB74)
lw    V0, lo(D_8011FB74)(V0)
addiu S2, V0, 1
L80113404:
sll   V0, S1, 3
subu  V0, V0, S1
sll   V0, V0, 3
lui   AT, hi(p1_controller)
addu  AT, AT, V0
lbu   V0, lo(p1_controller)(AT)
sll   V0, V0, 1
addu  V0, V0, S3
li    V1, 1024
j     L8011349C
 sh    V1, 0(V0)
L80113430:
subu  S0, S0, S1
sll   S0, S0, 3
lui   V0, hi(p1_controller)
addu  V0, V0, S0
lbu   V0, lo(p1_controller)(V0)
addu  V0, SP, V0
lui   A0, hi(CORE_80105702_window_id)
lh    A0, lo(CORE_80105702_window_id)(A0)
lbu   A1, 0x20(V0)
jal   0x8005FE54
 addiu S1, S1, 1
lui   V0, hi(p1_controller)
addu  V0, V0, S0
lbu   V0, lo(p1_controller)(V0)
sll   V0, V0, 1
addu  V0, V0, S3
li    V1, -1
j     L801134A0
 sh    V1, 0(V0)
L8011347C:
subu  V0, V0, S1
sll   V0, V0, 3
lui   AT, hi(p1_controller)
addu  AT, AT, V0
lbu   V0, lo(p1_controller)(AT)
sll   V0, V0, 1
addu  V0, V0, S3
sh    R0, 0(V0)
L8011349C:
addiu S1, S1, 1
L801134A0:
slti  V0, S1, 4
bnez  V0, L801133B0
       NOP
beqz  S2, L80113558
 li    A1, 2
lui   A0, hi(CORE_80105702_window_id)
lh    A0, lo(CORE_80105702_window_id)(A0)
jal   0x8005B63C
 li    A2, 2
move  S0, R0
addiu S1, SP, 0x18
L801134CC:
addiu S2, S2, -1
bnez  S2, L80113508
       NOP
lui   V1, hi(current_player_index)
lb    V1, lo(current_player_index)(V1)
sll   V0, V1, 3
subu  V0, V0, V1
sll   V0, V0, 3
lui   AT, hi(p1_controller)
addu  AT, AT, V0
lbu   V0, lo(p1_controller)(AT)
sll   V0, V0, 1
addu  V0, V0, S1
li    V1, -32768
sh    V1, 0(V0)
L80113508:
bnez  S0, L80113530
 li    V0, 5
jal   0x800EDC40
       NOP
lh    A0, 0x18(SP)
lh    A1, 0x1a(SP)
lh    A2, 0x1c(SP)
lh    A3, 0x1e(SP)
j     func_80113540
 andi  V0, V0, 0xff
L80113530:
lh    A0, 0x18(SP)
lh    A1, 0x1a(SP)
lh    A2, 0x1c(SP)
lh    A3, 0x1e(SP)
func_80113540:
jal   0x8005F698
 sw    V0, 0x10(SP)
bnez  S2, L801134CC
 addiu S0, S0, 1
j     func_80113570
 move  S1, R0
L80113558:
lh    A0, 0x18(SP)
lh    A1, 0x1a(SP)
lh    A2, 0x1c(SP)
lh    A3, 0x1e(SP)
jal   0x8005F744
 move  S1, R0
func_80113570:
addu  V0, S4, S1
L80113574:
lbu   V0, 0(V0)
bnezl V0, L80113598
 addiu S1, S1, 1
sll   A1, S1, 0x10
lui   A0, hi(CORE_80105702_window_id)
lh    A0, lo(CORE_80105702_window_id)(A0)
jal   0x8006010C
 sra   A1, A1, 0x10
addiu S1, S1, 1
L80113598:
slti  V0, S1, 4
bnez  V0, L80113574
 addu  V0, S4, S1
move  S1, R0
sll   A1, S1, 0x10
L801135AC:
lui   A0, hi(CORE_80105702_window_id)
lh    A0, lo(CORE_80105702_window_id)(A0)
sra   A1, A1, 0x10
jal   0x8005E1D8
 li    A2, 1
move  S1, V0
addu  V0, S4, S1
lbu   V0, 0(V0)
beqz  V0, L801135AC
 sll   A1, S1, 0x10
move  V0, S1
lw    RA, 0x40(SP)
lw    S5, 0x3c(SP)
lw    S4, 0x38(SP)
lw    S3, 0x34(SP)
lw    S2, 0x30(SP)
lw    S1, 0x2c(SP)
lw    S0, 0x28(SP)
jr    RA
 addiu SP, SP, 0x48

func_801135FC:
addiu SP, SP, -0x38
sw    RA, 0x30(SP)
sw    S5, 0x2c(SP)
sw    S4, 0x28(SP)
sw    S3, 0x24(SP)
sw    S2, 0x20(SP)
sw    S1, 0x1c(SP)
jal   0x8004EE68
 sw    S0, 0x18(SP)
lw    S3, 0x8c(V0)
lh    A0, 0x8e(V0)
jal   0x800FF900
 li    A1, 4
li    S1, 128
sll   V0, S3, 3
subu  V0, V0, S3
sll   V0, V0, 3
lui   V1, hi(p1_item1)
addiu V1, V1, lo(p1_item1)
addu  S4, V0, V1
move  S0, R0
L80113650:
li    S5, -1
sll   S2, S1, 0x10
addu  V0, S4, S0
L8011365C:
lb    V0, 0(V0)
beq   V0, S5, L80113674
 move  A0, S3
move  A1, S0
jal   0x800F68E0
 sra   A2, S2, 0x10
L80113674:
addiu S0, S0, 1
slti  V0, S0, 3
bnez  V0, L8011365C
 addu  V0, S4, S0
jal   SleepVProcess
 addiu S1, S1, -0xa
bgtz  S1, L80113650
 move  S0, R0
sll   V0, S3, 3
subu  V0, V0, S3
sll   V0, V0, 3
lui   V1, hi(p1_item1)
addiu V1, V1, lo(p1_item1)
addu  S1, V0, V1
li    S2, -1
addu  V0, S1, S0
L801136B4:
lb    V0, 0(V0)
beq   V0, S2, L801136CC
 move  A0, S3
move  A1, S0
jal   0x800F68E0
 move  A2, R0
L801136CC:
addiu S0, S0, 1
slti  V0, S0, 3
bnez  V0, L801136B4
 addu  V0, S1, S0
jal   EndProcess
 move  A0, R0
lw    RA, 0x30(SP)
lw    S5, 0x2c(SP)
lw    S4, 0x28(SP)
lw    S3, 0x24(SP)
lw    S2, 0x20(SP)
lw    S1, 0x1c(SP)
lw    S0, 0x18(SP)
jr    RA
 addiu SP, SP, 0x38

func_80113708:
addiu SP, SP, -0x40
sw    RA, 0x30(SP)
sw    S5, 0x2c(SP)
sw    S4, 0x28(SP)
sw    S3, 0x24(SP)
sw    S2, 0x20(SP)
sw    S1, 0x1c(SP)
sw    S0, 0x18(SP)
sdc1  F20, 0x38(SP)
jal   0x8004EE68
 move  S0, R0
lw    S2, 0x8c(V0)
lui   S3, hi(CORE_800CD058)
addiu S3, S3, lo(CORE_800CD058)
move  S1, R0
lui   S5, hi(p1_item1)
addiu S5, S5, lo(p1_item1)
li    S4, -1
li    AT, 0x3F800000 ; 1.000000
mtc1  AT, F20
L80113758:
lb    A0, 0xf(S3)
sll   V0, A0, 3
subu  V0, V0, A0
sll   V0, V0, 3
addu  V0, V0, S5
addu  V0, V0, S0
lb    V0, 0(V0)
beql  V0, S4, L801137D0
 addiu S0, S0, 1
mfc1  A2, F20
mfc1  A3, F20
      NOP
jal   0x800F696C
 move  A1, S0
move  A0, S2
move  A1, S1
addiu A2, SP, 0x10
jal   0x800F6E4C
 addiu A3, SP, 0x14
lb    A0, 0xf(S3)
lh    A2, 0x12(SP)
lh    A3, 0x16(SP)
jal   0x800F688C
 move  A1, S0
jal   0x800E4A7C
       NOP
xor   V0, S0, V0
sltu  V0, R0, V0
addu  S1, S1, V0
addiu S0, S0, 1
L801137D0:
slti  V0, S0, 3
bnez  V0, L80113758
       NOP
move  S1, R0
lui   S5, hi(p1_item1)
addiu S5, S5, lo(p1_item1)
li    S4, -1
move  S0, R0
L801137F0:
sll   S2, S1, 0x10
L801137F4:
lb    V0, 0xf(S3)
sll   V1, V0, 3
subu  V1, V1, V0
sll   V1, V1, 3
addu  V1, V1, S5
addu  V1, V1, S0
lb    V0, 0(V1)
beql  V0, S4, L80113838
 addiu S0, S0, 1
jal   0x800E4A7C
       NOP
beq   S0, V0, L80113834
 move  A1, S0
lb    A0, 0xf(S3)
jal   0x800F68E0
 sra   A2, S2, 0x10
L80113834:
addiu S0, S0, 1
L80113838:
slti  V0, S0, 3
bnez  V0, L801137F4
       NOP
jal   SleepVProcess
 addiu S1, S1, 0x14
slti  V0, S1, 0x80
bnez  V0, L801137F0
 move  S0, R0
lui   S2, hi(p1_item1)
addiu S2, S2, lo(p1_item1)
li    S1, -1
L80113864:
lb    V0, 0xf(S3)
sll   V1, V0, 3
subu  V1, V1, V0
sll   V1, V1, 3
addu  V1, V1, S2
addu  V1, V1, S0
lb    V0, 0(V1)
beql  V0, S1, L801138A8
 addiu S0, S0, 1
jal   0x800E4A7C
       NOP
beq   S0, V0, L801138A4
 move  A1, S0
lb    A0, 0xf(S3)
jal   0x800F68E0
 li    A2, 128
L801138A4:
addiu S0, S0, 1
L801138A8:
slti  V0, S0, 3
bnez  V0, L80113864
       NOP
jal   EndProcess
 move  A0, R0
lw    RA, 0x30(SP)
lw    S5, 0x2c(SP)
lw    S4, 0x28(SP)
lw    S3, 0x24(SP)
lw    S2, 0x20(SP)
lw    S1, 0x1c(SP)
lw    S0, 0x18(SP)
ldc1  F20, 0x38(SP)
jr    RA
 addiu SP, SP, 0x40

; Trade items
barter_box_item_code:
func_801138E4:
addiu SP, SP, -0xd8
sw    RA, 0xa8(SP)
sw    S7, 0xa4(SP)
sw    S6, 0xa0(SP)
sw    S5, 0x9c(SP)
sw    S4, 0x98(SP)
sw    S3, 0x94(SP)
sw    S2, 0x90(SP)
sw    S1, 0x8c(SP)
sw    S0, 0x88(SP)
sdc1  F28, 0xd0(SP)
sdc1  F26, 0xc8(SP)
sdc1  F24, 0xc0(SP)
sdc1  F22, 0xb8(SP)
sdc1  F20, 0xb0(SP)
lui   S6, hi(CORE_800CD058)
addiu S6, S6, lo(CORE_800CD058)
jal   func_8010FE54
 move  S7, R0
li    A0, 32
jal   0x800D90C8
 move  A1, R0
move  S5, V0
lw    V0, 0x3c(S5)
lw    V0, 0x40(V0)
lh    A0, 0(V0)
lui   A1, 2
jal   0x8001C2FC
 lui   A2, 2
lw    V0, 0x3c(S5)
lw    V0, 0x40(V0)
jal   0x8001C448
 lh    A0, 0(V0)
lw    V0, 0x3c(S5)
lw    V0, 0x40(V0)
jal   0x8001C954
 lh    A0, 0(V0)
lw    V0, 0x3c(S5)
lw    V0, 0x40(V0)
jal   0x8001C514
 lh    A0, 0(V0)
lw    V0, 0x3c(S5)
lw    V0, 0x40(V0)
lh    A0, 0(V0)
move  A1, R0
move  A2, A1
jal   0x8001C1A0
 move  A3, A1
jal   GetPlayerStruct
 li    A0, -1
lw    A1, 0x24(V0)
addiu A0, S5, 0xc
jal   0x80089A20
 addiu A1, A1, 0xc
lw    V0, 0x3c(S5)
lw    V0, 0x40(V0)
lh    A0, 0(V0)
li    A1, 2
jal   0x8001C814
 li    A2, 1
li    AT, 0x42C80000 ; 100.000000
mtc1  AT, F0
      NOP
swc1  F0, 0x30(S5)
jal   PlaySound
 li    A0, 322
li    AT, 0x41F00000 ; 30.000000
mtc1  AT, F2
lwc1  F0, 0x30(S5)
c.lt.s F2, F0
      NOP
      NOP
bc1f  L80113A40
 mov.s F4, F0
li    AT, 0x3F800000 ; 1.000000
mtc1  AT, F22
li    AT, 0x41F00000 ; 30.000000
mtc1  AT, F20
sub.s F0, F4, F22
L80113A20:
jal   SleepVProcess
 swc1  F0, 0x30(S5)
lwc1  F4, 0x30(S5)
c.lt.s F20, F4
      NOP
      NOP
bc1tl L80113A20
 sub.s F0, F4, F22
L80113A40:
move  S1, R0
addiu S0, SP, 0x20
li    S3, 1
addiu S2, SP, 0x60
li    S4, 8
L80113A54:
lui   V0, hi(current_player_index)
lb    V0, lo(current_player_index)(V0)
bne   V0, S1, L80113A78
 sll   V0, S1, 4
addu  V0, S0, V0
sb    S3, 0(V0)
addu  V0, S2, S1
j     L80113A88
 sb    R0, 0(V0)
L80113A78:
addu  V0, S0, V0
sb    S4, 0(V0)
addu  V0, S2, S1
sb    S3, 0(V0)
L80113A88:
sll   A1, S1, 4
addu  A1, S0, A1
move  A0, S1
jal   0x800E2260
 addiu A1, A1, 1
addiu S1, S1, 1
slti  V0, S1, 4
bnez  V0, L80113A54
 li    V0, 1
sb    V0, 0x64(SP)
sb    V0, 0x65(SP)
addiu V0, SP, 0x40
sw    V0, 0x10(SP)
addiu V0, SP, 0x50
sw    V0, 0x14(SP)
sw    R0, 0x18(SP)
li    A0, -1
li    A1, 0x5C01 ; "Who's your opponent?"
addiu A2, SP, 0x20
jal   0x800EC8EC ; ShowMessage
 addiu A3, SP, 0x30
addiu A0, SP, 0x60
jal   func_80113364
 li    A1, 1
jal   0x800EC6C8
 move  S4, V0
jal   0x800EC6EC
       NOP
li    V0, 4
bne   S4, V0, L80113B10
       NOP
jal   0x800EF0D8
 li    A0, 1
move  S4, V0
L80113B10:
jal   0x800E4A7C
       NOP
lui   A1, hi(current_player_index)
lb    A1, lo(current_player_index)(A1)
sll   V1, A1, 3
subu  V1, V1, A1
sll   V1, V1, 3
lui   A0, hi(p1_item1)
addiu A0, A0, lo(p1_item1)
addu  V1, V1, A0
addu  V1, V1, V0
lb    V1, 0(V1)
li    V0, 16
bne   V1, V0, L80113B70
       NOP
jal   PlayerHasEmptyItemSlot
 move  A0, A1
li    V1, 1
bne   V0, V1, L80113B70
       NOP
jal   PlayerHasEmptyItemSlot
 move  A0, S4
beql  V0, R0, L80113B70
 li    S7, 1
L80113B70:
bnez  S7, L80114328
       NOP
jal   PlaySound
 li    A0, 329
lw    V0, 0x3c(S5)
lw    V0, 0x40(V0)
lh    A0, 0(V0)
li    A1, 1
jal   0x8001C814
 move  A2, R0
jal   SleepProcess
 li    A0, 20
li    AT, 0x43200000 ; 160.000000
mtc1  AT, F0
      NOP
swc1  F0, 0x70(SP)
li    AT, 0x42A80000 ; 84.000000
mtc1  AT, F0
      NOP
swc1  F0, 0x74(SP)
move  S1, R0
lui   S3, hi(p1_item1)
addiu S3, S3, lo(p1_item1)
li    S2, -1
move  S0, R0
L80113BD4:
bne   S0, S1, L80113BE0
 li    A2, 18320
li    A2, 18310
L80113BE0:
lb    A0, 0xf(S6)
move  A1, S0
jal   0x800F69B0
 andi  A2, A2, 0xffff
addiu S0, S0, 1
slti  V0, S0, 3
bnez  V0, L80113BD4
       NOP
lb    V0, 0xf(S6)
sll   V1, V0, 3
subu  V1, V1, V0
sll   V1, V1, 3
addu  V1, V1, S3
addu  V1, V1, S1
lb    V0, 0(V1)
beql  V0, S2, L80113C54
 addiu S1, S1, 1
jal   0x800E4A7C
       NOP
beq   S1, V0, L80113C50
 move  A1, S1
lb    A0, 0xf(S6)
sw    R0, 0x10(SP)
li    A2, 10
jal   func_801106A4
 addiu A3, SP, 0x70
jal   SleepProcess
 li    A0, 2
L80113C50:
addiu S1, S1, 1
L80113C54:
slti  V0, S1, 3
bnezl V0, L80113BD4
 move  S0, R0
lw    V0, 0x3c(S5)
lw    V0, 0x40(V0)
lh    A0, 0(V0)
li    A1, 4
jal   0x8001C814
 li    A2, 4
lw    V0, 0x3c(S5)
lw    V0, 0x40(V0)
lh    V1, 0(V0)
lui   A0, hi(CORE_800D03F8)
lw    A0, lo(CORE_800D03F8)(A0)
sll   V0, V1, 1
addu  V0, V0, V1
sll   V0, V0, 6
addu  V0, V0, A0
mtc1  R0, F2
lwc1  F0, 0x40(V0)
c.eq.s F0, F2
      NOP
bc1t  L80113CF8
       NOP
mtc1  R0, F20
L80113CB8:
jal   SleepVProcess
       NOP
lw    V0, 0x3c(S5)
lw    V0, 0x40(V0)
lh    V1, 0(V0)
lui   A0, hi(CORE_800D03F8)
lw    A0, lo(CORE_800D03F8)(A0)
sll   V0, V1, 1
addu  V0, V0, V1
sll   V0, V0, 6
addu  V0, V0, A0
lwc1  F0, 0x40(V0)
c.eq.s F0, F20
      NOP
bc1f  L80113CB8
       NOP
L80113CF8:
jal   PlaySound
 li    A0, 336
jal   SleepProcess
 li    A0, 20
lui   A0, hi(func_801135FC)
addiu A0, A0, lo(func_801135FC)
li    A1, 18432
move  A2, R0
jal   InitProcess
 move  A3, R0
sw    S4, 0x8c(V0)
jal   PlaySound
 li    A0, 337
mtc1  R0, F20
li    AT, 0x40A00000 ; 5.000000
mtc1  AT, F22
move  S0, R0
li    AT, 0x43B40000 ; 360.000000
mtc1  AT, F26
li    AT, 0x40000000 ; 2.000000
mtc1  AT, F28
li    AT, 0x42340000 ; 45.000000
mtc1  AT, F24
      NOP
L80113D58:
jal   0x8008EF20
 mov.s F12, F20
neg.s F0, F0
swc1  F0, 0x18(S5)
jal   0x8008E3F0
 mov.s F12, F20
add.s F20, F20, F22
c.lt.s F26, F20
      NOP
      NOP
bc1f  L80113D8C
 swc1  F0, 0x20(S5)
sub.s F20, F20, F26
L80113D8C:
add.s F22, F22, F28
c.lt.s F24, F22
      NOP
      NOP
bc1f  L80113DB4
 move  V0, S0
mov.s F22, F24
slti  V0, V0, 0x1f
beqz  V0, L80113DC4
 addiu S0, S0, 1
L80113DB4:
jal   SleepVProcess
       NOP
j     L80113D58
       NOP
L80113DC4:
move  S0, R0
li    AT, 0x43B40000 ; 360.000000
mtc1  AT, F26
li    AT, 0x40000000 ; 2.000000
mtc1  AT, F28
li    AT, 0x40A00000 ; 5.000000
mtc1  AT, F24
      NOP
L80113DE4:
jal   0x8008EF20
 mov.s F12, F20
neg.s F0, F0
swc1  F0, 0x18(S5)
jal   0x8008E3F0
 mov.s F12, F20
add.s F20, F20, F22
c.lt.s F26, F20
      NOP
      NOP
bc1f  L80113E24
 swc1  F0, 0x20(S5)
addiu S0, S0, 1
slti  V0, S0, 2
beqz  V0, L80113E4C
 sub.s F20, F20, F26
L80113E24:
sub.s F22, F22, F28
c.lt.s F22, F24
      NOP
      NOP
bc1tl L80113E3C
 mov.s F22, F24
L80113E3C:
jal   SleepVProcess
       NOP
j     L80113DE4
       NOP
L80113E4C:
sw    R0, 0x18(S5)
li    AT, 0x3F800000 ; 1.000000
mtc1  AT, F0
      NOP
swc1  F0, 0x20(S5)
jal   PlaySound
 li    A0, 338
move  S1, R0
li    AT, 0x3FC00000 ; 1.500000
mtc1  AT, F28
li    AT, 0x3F800000 ; 1.000000
mtc1  AT, F26
L80113E7C:
mtc1  S1, F22
      NOP
cvt.s.w F22, F22
jal   0x8008EF20
 mov.s F12, F22
div.s F24, F0, F28
add.s F24, F24, F26
jal   0x8008EF20
 mov.s F12, F22
div.s F20, F0, F28
add.s F20, F20, F26
jal   0x8008EF20
 mov.s F12, F22
div.s F0, F0, F28
mfc1  A1, F24
mfc1  A2, F20
add.s F0, F0, F26
mfc1  A3, F0
      NOP
jal   0x80089A10
 addiu A0, S5, 0x24
jal   SleepVProcess
 addiu S1, S1, 0x28
slti  V0, S1, 0x5a1
bnez  V0, L80113E7C
       NOP
jal   PlaySound
 li    A0, 329
lw    V0, 0x3c(S5)
lw    V0, 0x40(V0)
lh    A0, 0(V0)
li    A1, 4
jal   0x8001C814
 move  A2, R0
jal   SleepProcess
 li    A0, 20
lui   A0, hi(func_80113708)
addiu A0, A0, lo(func_80113708)
li    A1, 18432
move  A2, R0
jal   InitProcess
 move  A3, R0
sw    S4, 0x8c(V0)
jal   PlayerHasEmptyItemSlot
 move  A0, S4
move  V1, V0
li    AT, 0x428C0000 ; 70.000000
mtc1  AT, F0
li    V0, 1
beq   V1, V0, L80113F74
 swc1  F0, 0x7c(SP)
slti  V0, V1, 2
beql  V0, R0, L80113F64
 li    V0, 2
beqz  V1, L80114320
       NOP
j     L80114150
       NOP
L80113F64:
beql  V1, V0, L80114018
 move  A0, S4
j     L80114150
       NOP
L80113F74:
li    AT, 0x43200000 ; 160.000000
mtc1  AT, F0
      NOP
swc1  F0, 0x78(SP)
move  A0, S4
move  A1, R0
li    A2, 160
jal   0x800F688C
 li    A3, 84
addiu S0, SP, 0x78
li    V0, 1
sw    V0, 0x10(SP)
move  A0, S4
move  A1, R0
li    A2, 10
jal   func_801106A4
 move  A3, S0
jal   SleepProcess
 li    A0, 20
lb    A0, 0xf(S6)
move  A1, R0
addiu A2, SP, 0x80
jal   0x800F6E4C
 addiu A3, SP, 0x84
lwc1  F0, 0x80(SP)
cvt.s.w F0, F0
swc1  F0, 0x78(SP)
lwc1  F0, 0x84(SP)
cvt.s.w F0, F0
swc1  F0, 0x7c(SP)
move  A0, S4
move  A1, R0
jal   0x800F69B0
 li    A2, 18320
li    V0, 2
sw    V0, 0x10(SP)
move  A0, S4
move  A1, R0
li    A2, 7
j     L80114318
 move  A3, S0
L80114018:
li    AT, 0x43020000 ; 130.000000
mtc1  AT, F0
      NOP
swc1  F0, 0x78(SP)
move  A1, R0
li    A2, 160
jal   0x800F688C
 li    A3, 84
addiu S1, SP, 0x78
li    S0, 1
sw    S0, 0x10(SP)
move  A0, S4
move  A1, R0
li    A2, 10
jal   func_801106A4
 move  A3, S1
li    AT, 0x433E0000 ; 190.000000
mtc1  AT, F0
      NOP
swc1  F0, 0x78(SP)
move  A0, S4
li    A1, 1
li    A2, 160
jal   0x800F688C
 li    A3, 84
sw    S0, 0x10(SP)
move  A0, S4
li    A1, 1
li    A2, 10
jal   func_801106A4
 move  A3, S1
jal   SleepProcess
 li    A0, 20
addiu S2, SP, 0x80
addiu S3, SP, 0x84
lb    A0, 0xf(S6)
move  A1, R0
move  A2, S2
jal   0x800F6E4C
 move  A3, S3
lwc1  F0, 0x80(SP)
cvt.s.w F0, F0
swc1  F0, 0x78(SP)
lwc1  F0, 0x84(SP)
cvt.s.w F0, F0
swc1  F0, 0x7c(SP)
move  A0, S4
move  A1, R0
jal   0x800F69B0
 li    A2, 18320
li    S0, 2
sw    S0, 0x10(SP)
move  A0, S4
move  A1, R0
li    A2, 7
jal   func_801106A4
 move  A3, S1
lb    A0, 0xf(S6)
li    A1, 1
move  A2, S2
jal   0x800F6E4C
 move  A3, S3
lwc1  F0, 0x80(SP)
cvt.s.w F0, F0
swc1  F0, 0x78(SP)
lwc1  F0, 0x84(SP)
cvt.s.w F0, F0
swc1  F0, 0x7c(SP)
move  A0, S4
li    A1, 1
jal   0x800F69B0
 li    A2, 18319
sw    S0, 0x10(SP)
move  A0, S4
li    A1, 1
li    A2, 7
j     L80114318
 move  A3, S1
L80114150:
li    AT, 0x42DC0000 ; 110.000000
mtc1  AT, F0
      NOP
swc1  F0, 0x78(SP)
move  A0, S4
move  A1, R0
li    A2, 160
jal   0x800F688C
 li    A3, 84
addiu S3, SP, 0x78
li    S0, 1
sw    S0, 0x10(SP)
move  A0, S4
move  A1, R0
li    A2, 10
jal   func_801106A4
 move  A3, S3
li    AT, 0x43520000 ; 210.000000
mtc1  AT, F0
      NOP
swc1  F0, 0x78(SP)
move  A0, S4
li    A1, 1
li    A2, 160
jal   0x800F688C
 li    A3, 84
sw    S0, 0x10(SP)
move  A0, S4
li    A1, 1
li    A2, 10
jal   func_801106A4
 move  A3, S3
li    AT, 0x43200000 ; 160.000000
mtc1  AT, F0
      NOP
swc1  F0, 0x78(SP)
move  A0, S4
li    A1, 2
li    A2, 160
jal   0x800F688C
 li    A3, 84
sw    S0, 0x10(SP)
move  A0, S4
li    A1, 2
li    A2, 10
jal   func_801106A4
 move  A3, S3
jal   SleepProcess
 li    A0, 20
addiu S1, SP, 0x80
addiu S2, SP, 0x84
lb    A0, 0xf(S6)
move  A1, R0
move  A2, S1
jal   0x800F6E4C
 move  A3, S2
lwc1  F0, 0x80(SP)
cvt.s.w F0, F0
swc1  F0, 0x78(SP)
lwc1  F0, 0x84(SP)
cvt.s.w F0, F0
swc1  F0, 0x7c(SP)
move  A0, S4
move  A1, R0
jal   0x800F69B0
 li    A2, 18320
li    S0, 2
sw    S0, 0x10(SP)
move  A0, S4
move  A1, R0
li    A2, 7
jal   func_801106A4
 move  A3, S3
lb    A0, 0xf(S6)
li    A1, 1
move  A2, S1
jal   0x800F6E4C
 move  A3, S2
lwc1  F0, 0x80(SP)
cvt.s.w F0, F0
swc1  F0, 0x78(SP)
lwc1  F0, 0x84(SP)
cvt.s.w F0, F0
swc1  F0, 0x7c(SP)
move  A0, S4
li    A1, 1
jal   0x800F69B0
 li    A2, 18319
sw    S0, 0x10(SP)
move  A0, S4
li    A1, 1
li    A2, 7
jal   func_801106A4
 move  A3, S3
lb    A0, 0xf(S6)
li    A1, 2
move  A2, S1
jal   0x800F6E4C
 move  A3, S2
lwc1  F0, 0x80(SP)
cvt.s.w F0, F0
swc1  F0, 0x78(SP)
lwc1  F0, 0x84(SP)
cvt.s.w F0, F0
swc1  F0, 0x7c(SP)
move  A0, S4
li    A1, 2
jal   0x800F69B0
 li    A2, 18318
sw    S0, 0x10(SP)
move  A0, S4
li    A1, 2
li    A2, 7
move  A3, S3
L80114318:
jal   func_801106A4
       NOP
L80114320:
jal   SleepProcess
 li    A0, 2
L80114328:
jal   0x800E4A7C
 move  S1, R0
lb    A0, 0xf(S6)
sll   V1, A0, 3
subu  V1, V1, A0
sll   V1, V1, 3
lui   A0, hi(p1_item1)
addiu A0, A0, lo(p1_item1)
addu  V1, V1, A0
addu  V1, V1, V0
li    V0, -1
sb    V0, 0(V1)
jal   FixUpPlayerItemSlots
 lb    A0, 0xf(S6)
sll   V0, S4, 3
subu  V0, V0, S4
sll   V0, V0, 3
lui   A2, hi(p1_item1)
addiu A2, A2, lo(p1_item1)
addu  A3, V0, A2
addu  A0, A3, S1
L8011437C:
lb    A1, 0(A0)
lb    V1, 0xf(S6)
sll   V0, V1, 3
subu  V0, V0, V1
sll   V0, V0, 3
addu  V0, V0, A2
addu  V0, V0, S1
lbu   V0, 0(V0)
sb    V0, 0(A0)
lb    V1, 0xf(S6)
sll   V0, V1, 3
subu  V0, V0, V1
sll   V0, V0, 3
addu  V0, V0, A2
addu  V0, V0, S1
sb    A1, 0(V0)
addiu S1, S1, 1
slti  V0, S1, 3
bnezl V0, L8011437C
 addu  A0, A3, S1
bnezl S7, L801143E8
 li    A0, 20
jal   0x800F641C
 li    A0, -1
jal   0x800F641C
 move  A0, S4
li    A0, 10
L801143E8:
jal   SleepProcess
 move  S0, R0
jal   PlaySound
 li    A0, 347
li    AT, 0x3DCC0000 ; 0.099609
ori AT, AT, 0xcccd
mtc1  AT, F20
li    AT, 0x3D380000 ; 0.044922
ori AT, AT, 0x51eb
mtc1  AT, F24
li    AT, 0x41200000 ; 10.000000
mtc1  AT, F22
add.s F20, F20, F24
L8011441C:
lw    V0, 0x3c(S5)
lw    V0, 0x40(V0)
lh    A0, 0(V0)
mfc1  A1, F20
mul.s F6, F20, F22
mfc1  A2, F6
      NOP
jal   0x8001D558
 li    A3, 1
jal   SleepVProcess
 addiu S0, S0, 1
slti  V0, S0, 0x14
bnezl V0, L8011441C
 add.s F20, F20, F24
jal   0x800D9B54
 move  A0, S5
beqz  S7, L80114488
       NOP
lb    A1, 0xf(S6)
jal   0x8004ACE0
 li    A0, 646
li    A0, -1
li    A1, 3
jal   0x800F2304
 move  A2, R0
j     L801144A8
 li    A0, 70
L80114488:
lb    A1, 0xf(S6)
jal   0x8004ACE0
 li    A0, 628
li    A0, -1
li    A1, 5
jal   0x800F2304
 move  A2, R0
li    A0, 50
L801144A8:
jal   SleepProcess
       NOP
li    V0, 2
sw    V0, 0x10(SP)
li    A0, -1
li    A1, -1
move  A2, R0
jal   0x800F2388
 li    A3, 10
beqz  S7, L801144D8
 li    A1, 0x3a2d ; "{0} and {1} traded items!"
li    A1, 0x3a2e ; "Neither {0} nor {1} have any items to trade!"
L801144D8:
lb    V1, 0xf(S6)
sll   V0, V1, 3
subu  V0, V0, V1
sll   V0, V0, 3
lui   V1, hi(p1_char)
addu  V1, V1, V0
lbu   V1, lo(p1_char)(V1)
lui   A0, hi(CORE_801014A0)
addiu A0, A0, lo(CORE_801014A0)
sll   V1, V1, 2
addu  V1, V1, A0
sll   V0, S4, 3
subu  V0, V0, S4
sll   V0, V0, 3
lui   AT, hi(p1_char)
addu  AT, AT, V0
lbu   V0, lo(p1_char)(AT)
sll   V0, V0, 2
addu  V0, V0, A0
sw    R0, 0x10(SP)
sw    R0, 0x14(SP)
sw    R0, 0x18(SP)
lw    A2, 0(V1)
lw    A3, 0(V0)
jal   0x800EC8EC ; ShowMessage
 li    A0, -1
jal   0x800EC6C8
       NOP
jal   0x800EC6EC
       NOP
lw    RA, 0xa8(SP)
lw    S7, 0xa4(SP)
lw    S6, 0xa0(SP)
lw    S5, 0x9c(SP)
lw    S4, 0x98(SP)
lw    S3, 0x94(SP)
lw    S2, 0x90(SP)
lw    S1, 0x8c(SP)
lw    S0, 0x88(SP)
ldc1  F28, 0xd0(SP)
ldc1  F26, 0xc8(SP)
ldc1  F24, 0xc0(SP)
ldc1  F22, 0xb8(SP)
ldc1  F20, 0xb0(SP)
jr    RA
 addiu SP, SP, 0xd8

D_80114590:
addiu SP, SP, -0x20
sw    RA, 0x1c(SP)
sw    S2, 0x18(SP)
sw    S1, 0x14(SP)
jal   0x8004EE68
 sw    S0, 0x10(SP)
lw    S2, 0x8c(V0)
lw    S1, 0(S2)
lw    S0, 4(S2)
move  A0, S1
lhu   A2, 0xa(S2)
jal   0x800D9CE8
 li    A1, -1
addiu A0, S1, 0xc
jal   0x80089A20
 addiu A1, S0, 0xc
lwc1  F0, 0x30(S0)
li    AT, 0x41200000 ; 10.000000
mtc1  AT, F2
      NOP
sub.s F0, F0, F2
lwc1  F2, 0x10(S1)
add.s F0, F0, F2
swc1  F0, 0x10(S1)
jal   0x800D9A40
 move  A0, S1
func_801145F8:
jal   0x800D9E0C
 move  A0, S1
andi  V0, V0, 0xffff
bnez  V0, L80114628
       NOP
lw    V0, 0xc(S2)
bnez  V0, L80114628
       NOP
jal   SleepVProcess
       NOP
j     func_801145F8
       NOP
L80114628:
jal   0x800D9B54
 move  A0, S1
jal   EndProcess
 move  A0, R0
lw    RA, 0x1c(SP)
lw    S2, 0x18(SP)
lw    S1, 0x14(SP)
lw    S0, 0x10(SP)
jr    RA
 addiu SP, SP, 0x20

D_80114650:
addiu SP, SP, -0x60
sw    RA, 0x28(SP)
sw    S5, 0x24(SP)
sw    S4, 0x20(SP)
sw    S3, 0x1c(SP)
sw    S2, 0x18(SP)
sw    S1, 0x14(SP)
sw    S0, 0x10(SP)
sdc1  F30, 0x58(SP)
sdc1  F28, 0x50(SP)
sdc1  F26, 0x48(SP)
sdc1  F24, 0x40(SP)
sdc1  F22, 0x38(SP)
jal   0x8004EE68
 sdc1  F20, 0x30(SP)
lw    S4, 0x8c(V0)
lui   S1, hi(D_8011FB78)
lw    S1, lo(D_8011FB78)(S1)
li    A0, 69
jal   0x800D90C8
 move  A1, R0
move  S5, V0
jal   0x800D9B24
 move  A0, S5
lui A0, 0xb
ori A0, A0, 4
jal   0x8000CED8
 li    A1, 2729
sll   V0, V0, 0x10
sra   S2, V0, 0x10
move  S0, S2
move  A0, S0
lui   A1, 0x3f80
lui   A2, 0x41a0
jal   0x8000CD00
 move  A3, A1
lui   A1, 0x4120
jal   0x8000D018
 move  A0, S0
move  A0, S0
jal   0x8001C8A8
 li    A1, 1
jal   PlaySound
 li    A0, 588
mtc1  R0, F20
li    AT, 0x40000000 ; 2.000000
mtc1  AT, F22
li    AT, 0x43B40000 ; 360.000000
mtc1  AT, F26
li    AT, 0x3F800000 ; 1.000000
mtc1  AT, F28
li    AT, 0x42A00000 ; 80.000000
mtc1  AT, F24
sll   S0, S2, 0x10
L80114728:
jal   0x8008EF20
 mov.s F12, F20
neg.s F0, F0
swc1  F0, 0x18(S1)
jal   0x8008E3F0
 mov.s F12, F20
add.s F20, F20, F22
c.lt.s F26, F20
      NOP
      NOP
bc1f  L8011475C
 swc1  F0, 0x20(S1)
sub.s F20, F20, F26
L8011475C:
add.s F22, F22, F28
c.lt.s F24, F22
      NOP
      NOP
bc1tl L80114774
 mov.s F22, F24
L80114774:
lwc1  F2, 0x10(S1)
lwc1  F0, 0x30(S1)
lw    A1, 0xc(S1)
add.s F0, F2, F0
mfc1  A2, F0
lw    A3, 0x14(S1)
jal   0x8000CFA4
 sra   A0, S0, 0x10
jal   SleepVProcess
       NOP
c.lt.s F22, F24
      NOP
bc1t  L80114728
       NOP
jal   PlaySound
 li    A0, 330
li    AT, 0x42DC0000 ; 110.000000
mtc1  AT, F2
lwc1  F0, 0x30(S1)
c.lt.s F0, F2
      NOP
      NOP
bc1f  L8011486C
 mov.s F4, F0
li    AT, 0x40E00000 ; 7.000000
mtc1  AT, F28
li    AT, 0x43B40000 ; 360.000000
mtc1  AT, F24
sll   S0, S2, 0x10
li    AT, 0x42DC0000 ; 110.000000
mtc1  AT, F26
add.s F0, F4, F28
L801147F4:
swc1  F0, 0x30(S1)
jal   0x8008EF20
 mov.s F12, F20
neg.s F0, F0
swc1  F0, 0x18(S1)
jal   0x8008E3F0
 mov.s F12, F20
add.s F20, F20, F22
c.lt.s F24, F20
      NOP
      NOP
bc1f  L8011482C
 swc1  F0, 0x20(S1)
sub.s F20, F20, F24
L8011482C:
lwc1  F2, 0x10(S1)
lwc1  F0, 0x30(S1)
lw    A1, 0xc(S1)
add.s F0, F2, F0
mfc1  A2, F0
lw    A3, 0x14(S1)
jal   0x8000CFA4
 sra   A0, S0, 0x10
jal   SleepVProcess
       NOP
lwc1  F4, 0x30(S1)
c.lt.s F4, F26
      NOP
      NOP
bc1tl L801147F4
 add.s F0, F4, F28
L8011486C:
sw    R0, 0(S4)
li    S3, -1
sll   S0, S2, 0x10
L80114878:
lui   A0, hi(D_8011E490)
lw    A0, lo(D_8011E490)(A0)
beq   A0, S3, L801148C0
       NOP
jal   GetPlayerStruct
       NOP
lw    A1, 0x24(V0)
addiu A0, S1, 0xc
jal   0x80089A20
 addiu A1, A1, 0xc
lwc1  F2, 0x10(S1)
lwc1  F0, 0x30(S1)
lw    A1, 0xc(S1)
add.s F0, F2, F0
mfc1  A2, F0
lw    A3, 0x14(S1)
jal   0x8000CFA4
 sra   A0, S0, 0x10
L801148C0:
jal   SleepVProcess
       NOP
lw    V0, 0(S4)
beqz  V0, L80114878
       NOP
jal   PlaySound
 li    A0, 331
li    AT, 0x40400000 ; 3.000000
mtc1  AT, F24
li    AT, 0x41F00000 ; 30.000000
mtc1  AT, F2
lwc1  F0, 0x30(S1)
c.lt.s F2, F0
      NOP
      NOP
bc1f  L801149C0
 mov.s F4, F0
li    S3, 0x3F800000 ; 1.000000
li    AT, 0x3E4C0000 ; 0.199219
ori AT, AT, 0xcccd
mtc1  AT, F30
li    AT, 0x43B40000 ; 360.000000
mtc1  AT, F26
sll   S0, S2, 0x10
li    AT, 0x41F00000 ; 30.000000
mtc1  AT, F28
sub.s F0, F4, F24
L8011492C:
mtc1  S3, F6
      NOP
c.lt.s F6, F24
      NOP
      NOP
bc1f  L8011494C
 swc1  F0, 0x30(S1)
sub.s F24, F24, F30
L8011494C:
jal   0x8008EF20
 mov.s F12, F20
neg.s F0, F0
swc1  F0, 0x18(S1)
jal   0x8008E3F0
 mov.s F12, F20
add.s F20, F20, F22
c.lt.s F26, F20
      NOP
      NOP
bc1f  L80114980
 swc1  F0, 0x20(S1)
sub.s F20, F20, F26
L80114980:
lwc1  F2, 0x10(S1)
lwc1  F0, 0x30(S1)
lw    A1, 0xc(S1)
add.s F0, F2, F0
mfc1  A2, F0
lw    A3, 0x14(S1)
jal   0x8000CFA4
 sra   A0, S0, 0x10
jal   SleepVProcess
       NOP
lwc1  F4, 0x30(S1)
c.lt.s F28, F4
      NOP
      NOP
bc1tl L8011492C
 sub.s F0, F4, F24
L801149C0:
li    AT, 0x43B40000 ; 360.000000
mtc1  AT, F24
li    S3, 0x41700000 ; 15.000000
li    AT, 0x40400000 ; 3.000000
mtc1  AT, F30
li    AT, 0x3F000000 ; 0.500000
mtc1  AT, F28
li    AT, 0x3F800000 ; 1.000000
mtc1  AT, F26
sll   S0, S2, 0x10
func_801149E8:
jal   0x8008EF20
 mov.s F12, F20
neg.s F0, F0
swc1  F0, 0x18(S1)
jal   0x8008E3F0
 mov.s F12, F20
add.s F20, F20, F22
c.lt.s F24, F20
      NOP
      NOP
bc1f  L80114A1C
 swc1  F0, 0x20(S1)
sub.s F20, F20, F24
L80114A1C:
mtc1  S3, F6
      NOP
c.lt.s F6, F22
      NOP
      NOP
bc1fl L80114A3C
 sub.s F22, F22, F28
sub.s F22, F22, F30
L80114A3C:
c.lt.s F22, F26
      NOP
bc1t  L80114A7C
       NOP
lwc1  F2, 0x10(S1)
lwc1  F0, 0x30(S1)
lw    A1, 0xc(S1)
add.s F0, F2, F0
mfc1  A2, F0
lw    A3, 0x14(S1)
jal   0x8000CFA4
 sra   A0, S0, 0x10
jal   SleepVProcess
       NOP
j     func_801149E8
       NOP
L80114A7C:
jal   0x8000D044
 move  A0, S2
lui   A0, hi(D_80114590)
addiu A0, A0, lo(D_80114590)
li    A1, 18432
move  A2, R0
jal   InitProcess
 li    A3, 64
move  S0, V0
lw    A0, 0x18(S0)
jal   0x800360F0
 li    A1, 32
sw    V0, 0x8c(S0)
sw    S5, 0(V0)
sw    S1, 4(V0)
sw    R0, 8(V0)
sw    R0, 0xc(V0)
jal   SleepProcess
 li    A0, 3
sw    R0, 0(S4)
jal   PlaySound
 li    A0, 589
move  S0, R0
li    AT, 0x3DCC0000 ; 0.099609
ori AT, AT, 0xcccd
mtc1  AT, F20
li    AT, 0x3D380000 ; 0.044922
ori AT, AT, 0x51eb
mtc1  AT, F24
li    AT, 0x41200000 ; 10.000000
mtc1  AT, F22
add.s F20, F20, F24
L80114AFC:
lw    V0, 0x3c(S1)
lw    V0, 0x40(V0)
lh    A0, 0(V0)
mfc1  A1, F20
mul.s F6, F20, F22
mfc1  A2, F6
      NOP
jal   0x8001D558
 li    A3, 1
jal   SleepVProcess
 addiu S0, S0, 1
slti  V0, S0, 0x14
bnezl V0, L80114AFC
 add.s F20, F20, F24
jal   0x800D9B54
 move  A0, S1
jal   EndProcess
 move  A0, R0
lw    RA, 0x28(SP)
lw    S5, 0x24(SP)
lw    S4, 0x20(SP)
lw    S3, 0x1c(SP)
lw    S2, 0x18(SP)
lw    S1, 0x14(SP)
lw    S0, 0x10(SP)
ldc1  F30, 0x58(SP)
ldc1  F28, 0x50(SP)
ldc1  F26, 0x48(SP)
ldc1  F24, 0x40(SP)
ldc1  F22, 0x38(SP)
ldc1  F20, 0x30(SP)
jr    RA
 addiu SP, SP, 0x60

game_guy_lucky_charm:
addiu SP, SP, -0x68
sw    RA, 0x50(SP)
sw    S5, 0x4c(SP)
sw    S4, 0x48(SP)
sw    S3, 0x44(SP)
sw    S2, 0x40(SP)
sw    S1, 0x3c(SP)
sw    S0, 0x38(SP)
sdc1  F22, 0x60(SP)
sdc1  F20, 0x58(SP)
lui   S5, hi(CORE_800CD058)
jal   func_8010FE54
 addiu S5, S5, lo(CORE_800CD058)
li    A0, -1
jal   PlayerHasItem
 li    A1, ITEM_LUCKY_CHARM
lui   A0, hi(current_player_index)
lb    A0, lo(current_player_index)(A0)
sll   V1, A0, 3
subu  V1, V1, A0
sll   V1, V1, 3
lui   A0, hi(p1_item1)
addiu A0, A0, lo(p1_item1)
addu  V1, V1, A0
addu  V1, V1, V0
li    V0, -1
sb    V0, 0(V1) ; Clear the lucky charm item slot
lui   A0, hi(current_player_index)
jal   FixUpPlayerItemSlots
 lb    A0, lo(current_player_index)(A0)
lui   A0, hi(current_player_index)
jal   0x800F63F0
 lb    A0, lo(current_player_index)(A0)
jal   0x800F6BC4
 li    A0, -1
jal   0x800F66DC
 move  A0, R0
jal   0x800F6ECC
 li    A0, -1
li    A0, 62
jal   0x800D90C8
 move  A1, R0
move  S1, V0
lw    V0, 0x3c(S1)
lw    V0, 0x40(V0)
lh    A0, 0(V0)
move  A1, R0
move  A2, A1
jal   0x8001C1A0
 move  A3, A1
jal   0x800D9714
 move  A0, S1
li    AT, 0x41F00000 ; 30.000000
mtc1  AT, F20
      NOP
swc1  F20, 0x30(S1)
jal   0x800D9B24
 move  A0, S1
li    A0, 67
jal   0x800D90C8
 move  A1, R0
move  S0, V0
lui   AT, hi(D_8011FB78)
sw    S0, lo(D_8011FB78)(AT)
lw    V0, 0x3c(S0)
lw    V0, 0x40(V0)
lh    A0, 0(V0)
lui   A1, 2
jal   0x8001C2FC
 lui   A2, 2
lw    V0, 0x3c(S0)
lw    V0, 0x40(V0)
jal   0x8001C448
 lh    A0, 0(V0)
lw    V0, 0x3c(S0)
lw    V0, 0x40(V0)
jal   0x8001C954
 lh    A0, 0(V0)
lw    V0, 0x3c(S0)
lw    V0, 0x40(V0)
jal   0x8001C514
 lh    A0, 0(V0)
jal   GetPlayerStruct
 li    A0, -1
lw    A1, 0x24(V0)
addiu A0, S0, 0xc
jal   0x80089A20
 addiu A1, A1, 0xc
lw    V0, 0x3c(S0)
lw    V0, 0x40(V0)
lh    A0, 0(V0)
li    A1, 2
jal   0x8001C814
 li    A2, 1
li    AT, 0x42C80000 ; 100.000000
mtc1  AT, F0
      NOP
swc1  F0, 0x30(S0)
jal   PlaySound
 li    A0, 331
lwc1  F0, 0x30(S0)
c.lt.s F20, F0
      NOP
      NOP
bc1f  L80114D58
 mov.s F2, F0
li    AT, 0x3F800000 ; 1.000000
mtc1  AT, F22
      NOP
sub.s F0, F2, F22
L80114D38:
jal   SleepVProcess
 swc1  F0, 0x30(S0)
lwc1  F2, 0x30(S0)
c.lt.s F20, F2
      NOP
      NOP
bc1tl L80114D38
 sub.s F0, F2, F22
L80114D58:
lui   V1, hi(p1_char)
addiu V1, V1, lo(p1_char)
lbu   A2, 0(V1)
lbu   A3, 0x38(V1)
lbu   V0, 0x70(V1)
addiu V0, V0, 0x1c00
sw    V0, 0x10(SP)
lbu   V0, 0xa8(V1)
addiu V0, V0, 0x1c00
sw    V0, 0x14(SP)
sw    R0, 0x18(SP)
li    A0, -1
li    A1, 0x5C00 ; "Who's your opponent?"
addiu A2, A2, 0x1c00
jal   0x800EC8EC ; ShowMessage
 addiu A3, A3, 0x1c00
move  A0, R0
jal   __PP64_INTERNAL_BASIC_MESSAGE_CHOICE
 move  A1, R0
jal   0x800EC6C8
 move  S2, V0
jal   0x800EC6EC
       NOP
bltz  S2, L80114DE0
 slti  V0, S2, 4
bnez  V0, L80114E04
 li    V0, 1
li    V0, 4
bne   S2, V0, L80114DE0
       NOP
jal   0x800EF0D8
 move  A0, R0
j     L80114E00
 move  S2, V0
L80114DE0:
jal   func_80106FE8
       NOP
li    V0, 1
lui   AT, hi(CORE_800CB99C)
jal   0x80049FB8
 sb    V0, lo(CORE_800CB99C)(AT)
j     L80114D58
       NOP
L80114E00:
li    V0, 1
L80114E04:
sw    V0, 0x20(SP)
lui   A0, hi(D_80114650)
addiu A0, A0, lo(D_80114650)
li    A1, 16386
move  A2, R0
jal   InitProcess
 move  A3, R0
addiu V1, SP, 0x20
sw    V1, 0x8c(V0)
lw    V0, 0x20(SP)
beqz  V0, L80114E48
       NOP
L80114E34:
jal   SleepVProcess
       NOP
lw    V0, 0x20(SP)
bnez  V0, L80114E34
       NOP
L80114E48:
lb    V0, 0xf(S5)
beq   S2, V0, L80114EC8
 move  A0, R0
jal   InitFadeOut
 li    A1, 16
jal   SleepProcess
 li    A0, 16
lui   AT, hi(D_8011E490)
sw    S2, lo(D_8011E490)(AT)
jal   0x800F915C
 li    A0, 2
jal   GetPlayerStruct
 move  A0, S2
lw    A0, 0x24(V0)
jal   0x800F9174
 addiu A0, A0, 0xc
jal   GetPlayerStruct
 move  A0, S2
lw    A0, 0x24(V0)
jal   0x800E9748
 addiu A0, A0, 0xc
jal   SleepVProcess
       NOP
jal   SleepProcess
 li    A0, 10
move  A0, R0
jal   InitFadeIn
 li    A1, 16
jal   SleepProcess
 li    A0, 16
j     L80114EDC
 li    V0, 1
L80114EC8:
jal   SleepProcess
 li    A0, 30
lui   AT, hi(D_8011E490)
sw    S2, lo(D_8011E490)(AT)
li    V0, 1
L80114EDC:
sw    V0, 0x20(SP)
L80114EE0:
jal   SleepVProcess
       NOP
lw    V0, 0x20(SP)
bnez  V0, L80114EE0
       NOP
jal   GetPlayerStruct
 move  A0, S2
lw    S3, 0x24(V0)
lui   A1, 0x40a0
lui   A2, 0x4000
jal   0x800EDB98
 move  A0, S1
move  S4, V0
addiu A0, S1, 0xc
jal   0x80089A20
 addiu A1, S3, 0xc
jal   0x800D9A40
 move  A0, S1
mtc1  R0, F0
      NOP
swc1  F0, 0x2c(S1)
swc1  F0, 0x28(S1)
swc1  F0, 0x24(S1)
li    AT, 0x3E4C0000 ; 0.199219
ori AT, AT, 0xcccd
mtc1  AT, F22
li    AT, 0x3F800000 ; 1.000000
mtc1  AT, F20
L80114F50:
lwc1  F0, 0x2c(S1)
add.s F0, F0, F22
swc1  F0, 0x2c(S1)
swc1  F0, 0x28(S1)
jal   SleepVProcess
 swc1  F0, 0x24(S1)
lwc1  F0, 0x24(S1)
c.lt.s F0, F20
      NOP
      NOP
bc1t  L80114F50
 sll   A0, S2, 0x10
sra   A0, A0, 0x10
jal   0x800FF900
 li    A1, 4
jal   PlaySound
 li    A0, 673
sll   V0, S2, 3
subu  V0, V0, S2
sll   S0, V0, 3
lui   V0, hi(p1_coins)
addu  V0, V0, S0
lh    V0, lo(p1_coins)(V0)
beqz  V0, L801150F4
 li    A1, 0x2F00 ; "It's time for a Game Guy Mini-Game! First I'll take all your coins"
li    A0, 10
li    A2, -1
jal   func_8010A3B8
 move  A3, S2
lui   V0, hi(p1_coins)
addu  V0, V0, S0
lhu   V0, lo(p1_coins)(V0)
lui   AT, hi(CORE_800D110E)
addu  AT, AT, S0
sh    V0, lo(CORE_800D110E)(AT)
lui   A1, hi(p1_coins)
addu  A1, A1, S0
lh    A1, lo(p1_coins)(A1)
move  A0, S2
jal   ShowPlayerCoinChange
 subu  A1, R0, A1
lui   A1, hi(p1_coins)
addu  A1, A1, S0
lh    A1, lo(p1_coins)(A1)
move  A0, S2
jal   AdjustPlayerCoinsGradual
 subu  A1, R0, A1
jal   SleepProcess
 li    A0, 30
li    A0, 10
li    A1, 0x2F02 ; "We're off to Game Guy's Game Room"
li    A2, -1
jal   func_8010A3B8
 move  A3, S2
jal   EndProcess
 move  A0, S4
li    AT, 0x41200000 ; 10.000000
mtc1  AT, F2
lwc1  F0, 0x30(S1)
c.le.s F2, F0
      NOP
      NOP
bc1f  L80115084
 mov.s F4, F0
li    AT, 0x40000000 ; 2.000000
mtc1  AT, F22
li    AT, 0x41200000 ; 10.000000
mtc1  AT, F20
sub.s F0, F4, F22
L80115064:
jal   SleepVProcess
 swc1  F0, 0x30(S1)
lwc1  F4, 0x30(S1)
c.le.s F20, F4
      NOP
      NOP
bc1tl L80115064
 sub.s F0, F4, F22
L80115084:
jal   SleepProcess
 li    A0, 30
li    AT, 0x42C80000 ; 100.000000
mtc1  AT, F2
lwc1  F0, 0x30(S1)
c.lt.s F0, F2
      NOP
      NOP
bc1f  L801151B8
 mov.s F4, F0
li    AT, 0x40800000 ; 4.000000
mtc1  AT, F20
li    AT, 0x42C80000 ; 100.000000
mtc1  AT, F22
add.s F0, F4, F20
L801150C0:
swc1  F0, 0x30(S1)
lwc1  F0, 0x30(S3)
add.s F0, F0, F20
jal   SleepVProcess
 swc1  F0, 0x30(S3)
lwc1  F4, 0x30(S1)
c.lt.s F4, F22
      NOP
      NOP
bc1tl L801150C0
 add.s F0, F4, F20
j     L801151BC
 sll   A0, S2, 0x10
L801150F4:
li    A0, 10
li    A1, 12033
li    A2, -1
jal   func_8010A3B8
 move  A3, S2
jal   EndProcess
 move  A0, S4
li    AT, 0x42C80000 ; 100.000000
mtc1  AT, F2
lwc1  F0, 0x30(S1)
c.le.s F0, F2
      NOP
      NOP
bc1f  L80115164
 mov.s F4, F0
li    AT, 0x40800000 ; 4.000000
mtc1  AT, F22
li    AT, 0x42C80000 ; 100.000000
mtc1  AT, F20
add.s F0, F4, F22
L80115144:
jal   SleepVProcess
 swc1  F0, 0x30(S1)
lwc1  F4, 0x30(S1)
c.le.s F4, F20
      NOP
      NOP
bc1tl L80115144
 add.s F0, F4, F22
L80115164:
jal   0x800D9B54
 move  A0, S1
li    A0, 9
jal   InitFadeOut
 li    A1, 16
jal   SleepProcess
 li    A0, 17
jal   0x800F915C
 li    A0, 1
jal   GetPlayerStruct
 li    A0, -1
lw    A0, 0x24(V0)
jal   0x800E9748
 addiu A0, A0, 0xc
jal   SleepProcess
 li    A0, 5
li    A0, 9
jal   InitFadeIn
 li    A1, 16
j     L80115458
 li    A0, 17
L801151B8:
sll   A0, S2, 0x10
L801151BC:
jal   PlayerIsCPU
 sra   A0, A0, 0x10
beqz  V0, L80115374
       NOP
lb    V0, 0x16(S5)
beqz  V0, L80115374
 li    A0, 9
jal   InitFadeOut
 li    A1, 16
jal   SleepProcess
 li    A0, 17
jal   0x800D9B54
 move  A0, S1
move  A0, S3
move  A1, R0
jal   0x800EE688
 move  A2, A1
sw    R0, 0x30(S3)
jal   SleepProcess
 li    A0, 5
li    A0, 9
jal   InitFadeIn
 li    A1, 16
jal   SleepProcess
 li    A0, 17
li    AT, 0x42C80000 ; 100.000000
mtc1  AT, F12
jal   0x800EEF80
       NOP
addiu A0, V0, 1
move  V1, R0
sll   V0, V1, 2
L8011523C:
lui   AT, hi(D_8011E49E)
addu  AT, AT, V0
lhu   V0, lo(D_8011E49E)(AT)
slt   V0, V0, A0
beqz  V0, L80115264
 sll   V0, V1, 2
addiu V1, V1, 1
slti  V0, V1, 7
bnez  V0, L8011523C
 sll   V0, V1, 2
L80115264:
lui   V1, hi(D_8011E49C)
addu  V1, V1, V0
lhu   V1, lo(D_8011E49C)(V1)
beqz  V1, L80115314
 sll   V0, S2, 3
subu  V0, V0, S2
sll   V0, V0, 3
lui   S1, hi(CORE_800D110E)
addu  S1, S1, V0
lh    S1, lo(CORE_800D110E)(S1)
mult  S1, V1
mflo  S1
slti  V0, S1, 0x3e8
      NOP
beql  V0, R0, L801152A4
 li    S1, 999
L801152A4:
addiu S0, SP, 0x28
move  A0, S0
lui   A1, hi(percent_d_str_format)
addiu A1, A1, lo(percent_d_str_format)
jal   sprintf
 move  A2, S1
sw    R0, 0x10(SP)
sw    R0, 0x14(SP)
sw    R0, 0x18(SP)
li    A0, -1
li    A1, 0x2F03 ; "Wow you earned X coins playing my Mini-Game!"
move  A2, S0
jal   0x800EC8EC ; ShowMessage
 move  A3, R0
jal   0x800EC6C8
       NOP
jal   0x800EC6EC
       NOP
move  A0, S2
jal   ShowPlayerCoinChange
 move  A1, S1
move  A0, S2
jal   AdjustPlayerCoinsGradual
 move  A1, S1
jal   SleepProcess
 li    A0, 20
j     L80115320
       NOP
L80115314:
li    A0, -1
jal   0x800EC590
 li    A1, 12036
L80115320:
jal   SleepProcess
 li    A0, 10
li    A0, 9
jal   InitFadeOut
 li    A1, 16
jal   SleepProcess
 li    A0, 17
jal   0x800F915C
 li    A0, 1
jal   GetPlayerStruct
 li    A0, -1
lw    A0, 0x24(V0)
jal   0x800E9748
 addiu A0, A0, 0xc
jal   SleepProcess
 li    A0, 5
li    A0, 9
jal   InitFadeIn
 li    A1, 16
j     L80115458
 li    A0, 17
L80115374:
lb    A0, 0xf(S5)
jal   0x800DEB2C
       NOP
li    V1, 3
bne   V0, V1, L8011539C
       NOP
jal   0x80035FDC
 li    A0, 23
j     L801153A8
 move  V1, R0
L8011539C:
jal   0x8003602C
 li    A0, 23
move  V1, R0
L801153A8:
li    A0, 1
sll   V0, V1, 3
L801153B0:
subu  V0, V0, V1
sll   V0, V0, 3
lui   AT, hi(player_structs)
addu  AT, AT, V0
sb    A0, lo(player_structs)(AT)
addiu V1, V1, 1
slti  V0, V1, 4
bnez  V0, L801153B0
 sll   V0, V1, 3
jal   GetPlayerStruct
 move  A0, S2
li    AT, 0x42C80000 ; 100.000000
mtc1  AT, F12
      NOP
jal   0x800EEF80
 sb    R0, 0(V0)
move  A0, V0
move  V1, R0
L801153F8:
lui   V0, hi(D_8011E498)
addu  V0, V0, V1
lbu   V0, lo(D_8011E498)(V0)
slt   V0, A0, V0
bnez  V0, L80115420
 li    V0, 3
addiu V1, V1, 1
sltiu V0, V1, 3
bnez  V0, L801153F8
 li    V0, 3
L80115420:
beql  V1, V0, L80115428
 li    V1, 2
L80115428:
lui   V0, hi(D_8011E494)
addu  V0, V0, V1
lbu   V0, lo(D_8011E494)(V0)
sb    V0, 0x10(S5)
lui   AT, hi(CORE_800CD0B2)
jal   0x800FC998
 sh    S2, lo(CORE_800CD0B2)(AT)
jal   0x8004A0E0
       NOP
jal   0x800FF7F0
 li    A0, 2
li    A0, -1
L80115458:
jal   SleepProcess
       NOP
lw    RA, 0x50(SP)
lw    S5, 0x4c(SP)
lw    S4, 0x48(SP)
lw    S3, 0x44(SP)
lw    S2, 0x40(SP)
lw    S1, 0x3c(SP)
lw    S0, 0x38(SP)
ldc1  F22, 0x60(SP)
ldc1  F20, 0x58(SP)
jr    RA
 addiu SP, SP, 0x68

func_8011548C:
addiu SP, SP, -0x40
sw    RA, 0x28(SP)
sw    S3, 0x24(SP)
sw    S2, 0x20(SP)
sw    S1, 0x1c(SP)
sw    S0, 0x18(SP)
sdc1  F22, 0x38(SP)
sdc1  F20, 0x30(SP)
move  S2, A0
move  S0, A1
move  S1, A2
sll   A0, S2, 0x10
sra   A0, A0, 0x10
move  A1, R0
addiu A2, SP, 0x10
jal   0x800F6748
 addiu A3, SP, 0x14
lwc1  F2, 0(S1)
lwc1  F0, 0x10(SP)
sub.s F22, F2, F0
mtc1  S0, F4
      NOP
cvt.s.w F4, F4
div.s F22, F22, F4
lwc1  F2, 4(S1)
lwc1  F0, 0x14(SP)
sub.s F20, F2, F0
beqz  S0, L80115560
 div.s F20, F20, F4
sll   S3, S2, 0x10
L80115504:
lwc1  F2, 0x10(SP)
add.s F2, F22, F2
swc1  F2, 0x10(SP)
lwc1  F0, 0x14(SP)
add.s F0, F20, F0
swc1  F0, 0x14(SP)
trunc.w.s F4, F2
mfc1  A2, F4
      NOP
sll   A2, A2, 0x10
trunc.w.s F2, F0
mfc1  A3, F2
      NOP
sll   A3, A3, 0x10
sra   A0, S3, 0x10
move  A1, R0
sra   A2, A2, 0x10
jal   0x80054904
 sra   A3, A3, 0x10
jal   SleepVProcess
 addiu S0, S0, -1
bnez  S0, L80115504
       NOP
L80115560:
sll   A0, S2, 0x10
lwc1  F0, 0(S1)
trunc.w.s F2, F0
mfc1  A2, F2
      NOP
sll   A2, A2, 0x10
lwc1  F0, 4(S1)
trunc.w.s F2, F0
mfc1  A3, F2
      NOP
sll   A3, A3, 0x10
sra   A0, A0, 0x10
move  A1, R0
sra   A2, A2, 0x10
jal   0x80054904
 sra   A3, A3, 0x10
lw    RA, 0x28(SP)
lw    S3, 0x24(SP)
lw    S2, 0x20(SP)
lw    S1, 0x1c(SP)
lw    S0, 0x18(SP)
ldc1  F22, 0x38(SP)
ldc1  F20, 0x30(SP)
jr    RA
 addiu SP, SP, 0x40

func_801155C4:
addiu SP, SP, -0x28
sw    RA, 0x24(SP)
sw    S4, 0x20(SP)
sw    S3, 0x1c(SP)
sw    S2, 0x18(SP)
sw    S1, 0x14(SP)
jal   0x8004EE68
 sw    S0, 0x10(SP)
lw    S1, 0x8c(V0)
beqz  S1, L80115604
 li    S3, 10
li    V0, 1
beq   S1, V0, L8011562C
 sll   V0, S1, 2
j     L80115650
 move  A1, R0
L80115604:
sll   V0, S1, 2
lui   A0, hi(D_8011FB82)
addu  A0, A0, V0
lh    A0, lo(D_8011FB82)(A0)
move  A1, R0
li    A2, 177
jal   0x80054904
 li    A3, 44
j     L80115670
 sll   V0, S1, 2
L8011562C:
lui   A0, hi(D_8011FB82)
addu  A0, A0, V0
lh    A0, lo(D_8011FB82)(A0)
move  A1, R0
li    A2, 122
jal   0x80054904
 li    A3, 57
j     L80115670
 sll   V0, S1, 2
L80115650:
lui   A0, hi(D_8011FB82)
addu  A0, A0, V0
lh    A0, lo(D_8011FB82)(A0)
li    A2, 160
jal   0x80054904
 li    A3, 152
li    S3, 30
sll   V0, S1, 2
L80115670:
lui   A0, hi(D_8011FB82)
addu  A0, A0, V0
lh    A0, lo(D_8011FB82)(A0)
move  A1, R0
jal   0x8005532C
 li    A2, 32768
move  S0, R0
lui   V1, hi(D_8011FB80)
addiu V1, V1, lo(D_8011FB80)
sll   V0, S1, 2
addu  S4, V0, V1
li    S2, 255
L801156A0:
lh    A0, 2(S4)
move  A1, R0
jal   0x80055458
 andi  A2, S0, 0xffff
jal   SleepVProcess
       NOP
div   S2, S3
bnez  S3, L801156C8
       NOP
.word 0x0007000D ; break 7
L801156C8:
li    AT, -1
bne   S3, AT, L801156E0
 lui   AT, 0x8000
bne   S2, AT, L801156E0
       NOP
.word 0x0006000D; break 6
L801156E0:
mflo  V0
addu  S0, S0, V0
slti  V0, S0, 0xff
bnez  V0, L801156A0
 sll   V0, S1, 2
lui   A0, hi(D_8011FB82)
addu  A0, A0, V0
lh    A0, lo(D_8011FB82)(A0)
move  A1, R0
jal   0x80055458
 li    A2, 255
jal   EndProcess
 move  A0, R0
lw    RA, 0x24(SP)
lw    S4, 0x20(SP)
lw    S3, 0x1c(SP)
lw    S2, 0x18(SP)
lw    S1, 0x14(SP)
lw    S0, 0x10(SP)
jr    RA
 addiu SP, SP, 0x28

func_80115734:
addiu SP, SP, -0x48
sw    RA, 0x44(SP)
sw    S2, 0x40(SP)
sw    S1, 0x3c(SP)
sw    S0, 0x38(SP)
move  S1, R0
lui S2, 0x8888
ori S2, S2, 0x8889
sll   V0, S1, 1
L80115758:
addu  V0, V0, S1
lui   V1, hi(D_8011E4B8)
addu  V1, V1, V0
lbu   V1, lo(D_8011E4B8)(V1)
sw    V1, 0x18(SP)
lui   A1, hi(D_8011E4B9)
addu  A1, A1, V0
lbu   A1, lo(D_8011E4B9)(A1)
sw    A1, 0x1c(SP)
lui   A2, hi(D_8011E4BA)
addu  A2, A2, V0
lbu   A2, lo(D_8011E4BA)(A2)
sw    A2, 0x20(SP)
addiu V0, S1, 1
sll   A0, V0, 1
addu  A0, A0, V0
lui   V0, hi(D_8011E4B8)
addu  V0, V0, A0
lbu   V0, lo(D_8011E4B8)(V0)
subu  V0, V0, V1
mult  V0, S2
mfhi  T0
addu  V1, T0, V0
sra   V1, V1, 4
sra   V0, V0, 0x1f
subu  V1, V1, V0
sw    V1, 0x28(SP)
lui   V0, hi(D_8011E4B9)
addu  V0, V0, A0
lbu   V0, lo(D_8011E4B9)(V0)
subu  V0, V0, A1
mult  V0, S2
mfhi  T0
addu  V1, T0, V0
sra   V1, V1, 4
sra   V0, V0, 0x1f
subu  V1, V1, V0
sw    V1, 0x2c(SP)
lui   V0, hi(D_8011E4BA)
addu  V0, V0, A0
lbu   V0, lo(D_8011E4BA)(V0)
subu  V0, V0, A2
mult  V0, S2
mfhi  T0
addu  V1, T0, V0
sra   V1, V1, 4
sra   V0, V0, 0x1f
subu  V1, V1, V0
sw    V1, 0x30(SP)
move  S0, R0
L80115820:
lui   A0, hi(D_8011FB8E)
lh    A0, lo(D_8011FB8E)(A0)
lbu   A2, 0x1b(SP)
lbu   A3, 0x1f(SP)
lbu   V0, 0x23(SP)
sw    V0, 0x10(SP)
jal   0x80055420
 move  A1, R0
lw    V0, 0x18(SP)
lw    V1, 0x28(SP)
addu  V0, V0, V1
sw    V0, 0x18(SP)
lw    V0, 0x1c(SP)
lw    V1, 0x2c(SP)
addu  V0, V0, V1
sw    V0, 0x1c(SP)
lw    V0, 0x20(SP)
lw    V1, 0x30(SP)
addu  V0, V0, V1
jal   SleepVProcess
 sw    V0, 0x20(SP)
addiu S0, S0, 1
slti  V0, S0, 0x1e
bnez  V0, L80115820
       NOP
lui   A0, hi(D_8011FB8E)
lh    A0, lo(D_8011FB8E)(A0)
addiu S0, S1, 1
sll   V0, S0, 1
addu  V0, V0, S0
lui   A2, hi(D_8011E4B8)
addu  A2, A2, V0
lbu   A2, lo(D_8011E4B8)(A2)
lui   A3, hi(D_8011E4B9)
addu  A3, A3, V0
lbu   A3, lo(D_8011E4B9)(A3)
lui   AT, hi(D_8011E4BA)
addu  AT, AT, V0
lbu   V0, lo(D_8011E4BA)(AT)
sw    V0, 0x10(SP)
jal   0x80055420
 move  A1, R0
jal   SleepProcess
 li    A0, 10
move  S1, S0
blez  S1, L80115758
 sll   V0, S1, 1
jal   EndProcess
 move  A0, R0
lw    RA, 0x44(SP)
lw    S2, 0x40(SP)
lw    S1, 0x3c(SP)
lw    S0, 0x38(SP)
jr    RA
 addiu SP, SP, 0x48

D_801158FC:
addiu SP, SP, -0x48
sw    RA, 0x1c(SP)
sw    S2, 0x18(SP)
sw    S1, 0x14(SP)
sw    S0, 0x10(SP)
sdc1  F28, 0x40(SP)
sdc1  F26, 0x38(SP)
sdc1  F24, 0x30(SP)
sdc1  F22, 0x28(SP)
jal   0x8004EE68
 sdc1  F20, 0x20(SP)
lw    S1, 0x8c(V0)
jal   PlaySound
 li    A0, 323
lui   S0, hi(D_8011FB90)
lw    S0, lo(D_8011FB90)(S0)
jal   0x800D9A40
 move  A0, S0
mtc1  R0, F22
li    AT, 0x3F800000 ; 1.000000
mtc1  AT, F20
li    AT, 0x41A00000 ; 20.000000
mtc1  AT, F28
lui   AT, hi(D_8011F970)
ldc1  F24, lo(D_8011F970)(AT)
li    AT, 0x41900000 ; 18.000000
mtc1  AT, F26
L80115968:
mfc1  A1, F20
mfc1  A2, F20
mfc1  A3, F20
      NOP
jal   0x80089A10
 addiu A0, S0, 0x24
lw    V0, 0x3c(S0)
lw    V0, 0x40(V0)
lh    V0, 0(V0)
sll   A0, V0, 1
addu  A0, A0, V0
sll   A0, A0, 6
lui   V0, hi(CORE_800D03F8)
lw    V0, lo(CORE_800D03F8)(V0)
addu  A0, A0, V0
mfc1  A1, F22
      NOP
jal   0x8008A430
 addiu A0, A0, 0x74
jal   SleepVProcess
 add.s F22, F22, F28
cvt.d.s F0, F20
add.d F0, F0, F24
cvt.s.d F20, F0
c.lt.s F20, F26
      NOP
      NOP
bc1t  L80115968
 li    V0, 1
lw    V1, 0(S1)
beq   V1, V0, L80115A3C
       NOP
li    AT, 0x41A00000 ; 20.000000
mtc1  AT, F24
li    S2, 1
L801159F4:
lw    V0, 0x3c(S0)
lw    V0, 0x40(V0)
lh    V0, 0(V0)
sll   A0, V0, 1
addu  A0, A0, V0
sll   A0, A0, 6
lui   V0, hi(CORE_800D03F8)
lw    V0, lo(CORE_800D03F8)(V0)
addu  A0, A0, V0
mfc1  A1, F22
      NOP
jal   0x8008A430
 addiu A0, A0, 0x74
jal   SleepVProcess
 add.s F22, F22, F24
lw    V0, 0(S1)
bne   V0, S2, L801159F4
       NOP
L80115A3C:
li    AT, 0x42200000 ; 40.000000
mtc1  AT, F0
      NOP
c.lt.s F20, F0
      NOP
bc1f  L80115AE0
       NOP
li    AT, 0x41A00000 ; 20.000000
mtc1  AT, F28
lui   AT, hi(D_8011F978)
ldc1  F24, lo(D_8011F978)(AT)
li    AT, 0x42200000 ; 40.000000
mtc1  AT, F26
L80115A70:
mfc1  A1, F20
mfc1  A2, F20
mfc1  A3, F20
      NOP
jal   0x80089A10
 addiu A0, S0, 0x24
lw    V0, 0x3c(S0)
lw    V0, 0x40(V0)
lh    V0, 0(V0)
sll   A0, V0, 1
addu  A0, A0, V0
sll   A0, A0, 6
lui   V0, hi(CORE_800D03F8)
lw    V0, lo(CORE_800D03F8)(V0)
addu  A0, A0, V0
mfc1  A1, F22
      NOP
jal   0x8008A430
 addiu A0, A0, 0x74
jal   SleepVProcess
 add.s F22, F22, F28
cvt.d.s F0, F20
add.d F0, F0, F24
cvt.s.d F20, F0
c.lt.s F20, F26
      NOP
bc1t  L80115A70
       NOP
L80115AE0:
lw    V1, 0(S1)
li    V0, 2
beq   V1, V0, L80115B44
       NOP
li    AT, 0x41A00000 ; 20.000000
mtc1  AT, F20
li    S2, 2
L80115AFC:
lw    V0, 0x3c(S0)
lw    V0, 0x40(V0)
lh    V0, 0(V0)
sll   A0, V0, 1
addu  A0, A0, V0
sll   A0, A0, 6
lui   V0, hi(CORE_800D03F8)
lw    V0, lo(CORE_800D03F8)(V0)
addu  A0, A0, V0
mfc1  A1, F22
      NOP
jal   0x8008A430
 addiu A0, A0, 0x74
jal   SleepVProcess
 add.s F22, F22, F20
lw    V0, 0(S1)
bne   V0, S2, L80115AFC
       NOP
L80115B44:
jal   0x800D9B54
 move  A0, S0
jal   EndProcess
 move  A0, R0
lw    RA, 0x1c(SP)
lw    S2, 0x18(SP)
lw    S1, 0x14(SP)
lw    S0, 0x10(SP)
ldc1  F28, 0x40(SP)
ldc1  F26, 0x38(SP)
ldc1  F24, 0x30(SP)
ldc1  F22, 0x28(SP)
ldc1  F20, 0x20(SP)
jr    RA
 addiu SP, SP, 0x48

D_80115B80:
addiu SP, SP, -0x98
sw    RA, 0x68(SP)
sw    S7, 0x64(SP)
sw    S6, 0x60(SP)
sw    S5, 0x5c(SP)
sw    S4, 0x58(SP)
sw    S3, 0x54(SP)
sw    S2, 0x50(SP)
sw    S1, 0x4c(SP)
sw    S0, 0x48(SP)
sdc1  F28, 0x90(SP)
sdc1  F26, 0x88(SP)
sdc1  F24, 0x80(SP)
sdc1  F22, 0x78(SP)
sdc1  F20, 0x70(SP)
lui   S5, hi(CORE_800CD058)
addiu S5, S5, lo(CORE_800CD058)
li    A0, 1
jal   0x8005279C
 move  A1, R0
sll   V0, V0, 0x10
lui   A0, hi(CORE_801019C4)
lw    A0, lo(CORE_801019C4)(A0)
jal   ReadMainFS
 sra   S4, V0, 0x10
move  S2, V0
jal   ImgPackParse
 move  A0, S2
sll   V0, V0, 0x10
sra   S7, V0, 0x10
jal   FreeMainFS
 move  A0, S2
move  S0, S4
move  A0, S0
move  A1, R0
move  A2, S7
jal   0x80055024
 move  A3, R0
move  A0, S0
move  A1, R0
jal   0x80055294
 li    A2, 18294
move  A0, S0
move  A1, R0
jal   0x800553A8
 li    A2, 4096
move  S3, R0
lui   S6, hi(D_8011FB80)
addiu S6, S6, lo(D_8011FB80)
li    A0, 1
L80115C48:
jal   0x8005279C
 move  A1, R0
sll   S0, S3, 2
addu  S1, S0, S6
sll   V0, V0, 0x10
sra   V0, V0, 0x10
sw    V0, 0(S1)
addiu V0, S3, 0x1bb
lui   A0, 0x13
jal   ReadMainFS
 or    A0, V0, A0
move  S2, V0
jal   ImgPackParse
 move  A0, S2
addiu V1, SP, 0x18
addu  S0, S0, V1
sll   V0, V0, 0x10
sra   V0, V0, 0x10
sw    V0, 0(S0)
jal   FreeMainFS
 move  A0, S2
lh    A0, 2(S1)
move  A1, R0
lh    A2, 2(S0)
jal   0x80055024
 move  A3, R0
lh    A0, 2(S1)
move  A1, R0
jal   0x80055294
 li    A2, 18304
lh    A0, 2(S1)
move  A1, R0
jal   0x800553A8
 li    A2, 38924
lh    A0, 2(S1)
move  A1, R0
jal   0x80055458
 move  A2, R0
lh    A0, 2(S1)
sw    R0, 0x10(SP)
move  A1, R0
li    A2, 255
jal   0x80055420
 li    A3, 255
addiu S3, S3, 1
slti  V0, S3, 4
bnezl V0, L80115C48
 li    A0, 1
li    A0, 70
jal   0x800D90C8
 move  A1, R0
move  S0, V0
lui   AT, hi(D_8011FB90)
sw    S0, lo(D_8011FB90)(AT)
lw    V0, 0x3c(S0)
lw    V0, 0x40(V0)
lh    A0, 0(V0)
li    A1, 384
jal   0x8001C258
 move  A2, R0
lw    V0, 0x3c(S0)
lw    V0, 0x40(V0)
lh    A0, 0(V0)
jal   0x8001C8E4
 li    A1, 0x1800
lw    V0, 0x3c(S0)
lw    V0, 0x40(V0)
lh    A0, 0(V0)
jal   0x8001C448
 move  S1, S4
lw    V0, 0x3c(S0)
lw    V0, 0x40(V0)
lh    A0, 0(V0)
move  A1, R0
move  A2, A1
jal   0x8001C1A0
 move  A3, A1
jal   GetPlayerStruct
 li    A0, -1
lw    A1, 0x24(V0)
addiu A0, S0, 0xc
jal   0x80089A20
 addiu A1, A1, 0xc
jal   0x800D9714
 move  A0, S0
jal   0x800D9B24
 move  A0, S0
lui   A0, hi(CORE_8010570C)
lh    A0, lo(CORE_8010570C)(A0)
move  A1, R0
jal   0x800553A8
 li    A2, 0x8000
jal   0x800E4A7C
       NOP
lb    A0, 0xf(S5)
move  A1, V0
jal   0x800F68E0
 move  A2, R0
jal   0x800E4A7C
       NOP
lb    A0, 0xf(S5)
move  A1, V0
addiu A2, SP, 0x30
jal   0x800F6E4C
 addiu A3, SP, 0x34
move  A0, S1
lh    A2, 0x32(SP)
lh    A3, 0x36(SP)
jal   0x80054904
 move  A1, R0
li    AT, 0x43200000 ; 160.000000
mtc1  AT, F0
      NOP
swc1  F0, 0x28(SP)
li    AT, 0x42980000 ; 76.000000
mtc1  AT, F20
      NOP
swc1  F20, 0x2c(SP)
jal   PlaySound
 li    A0, 325
addiu S0, SP, 0x28
move  A0, S4
li    A1, 30
jal   func_8011548C
 move  A2, S0
jal   0x800E4A7C
       NOP
lb    A0, 0xf(S5)
sll   V1, A0, 3
subu  V1, V1, A0
sll   V1, V1, 3
lui   A0, hi(p1_item1)
addiu A0, A0, lo(p1_item1)
addu  V1, V1, A0
addu  V1, V1, V0
li    V0, -1
sb    V0, 0(V1)
jal   FixUpPlayerItemSlots
 lb    A0, 0xf(S5)
jal   0x800F6BC4
 li    A0, -1
jal   0x800F66DC
 move  A0, R0
jal   0x800F6ECC
 li    A0, -1
jal   SleepProcess
 li    A0, 30
li    AT, 0x434B0000 ; 203.000000
mtc1  AT, F0
      NOP
swc1  F0, 0x28(SP)
li    AT, 0x42300000 ; 44.000000
mtc1  AT, F0
      NOP
swc1  F0, 0x2c(SP)
move  A0, S4
li    A1, 10
jal   func_8011548C
 move  A2, S0
lui   A0, hi(func_801155C4)
addiu A0, A0, lo(func_801155C4)
li    A1, 16386
move  A2, R0
jal   InitProcess
 move  A3, R0
move  S2, V0
jal   0x8004EE68
 sw    R0, 0x8c(S2)
move  A0, V0
jal   0x8004ED30
 move  A1, S2
lwc1  F0, 0x28(SP)
sub.s F0, F0, F20
swc1  F0, 0x28(SP)
jal   PlaySound
 li    A0, 333
move  A0, S4
li    A1, 10
jal   func_8011548C
 move  A2, S0
jal   0x8004EE18
       NOP
jal   SleepProcess
 li    A0, 10
lui   A0, hi(func_801155C4)
addiu A0, A0, lo(func_801155C4)
li    A1, 16386
move  A2, R0
jal   InitProcess
 move  A3, R0
move  S2, V0
li    V0, 1
jal   0x8004EE68
 sw    V0, 0x8c(S2)
move  A0, V0
jal   0x8004ED30
 move  A1, S2
lwc1  F0, 0x2c(SP)
li    AT, 0x42800000 ; 64.000000
mtc1  AT, F2
      NOP
add.s F0, F0, F2
swc1  F0, 0x2c(SP)
jal   PlaySound
 li    A0, 333
move  A0, S4
li    A1, 10
jal   func_8011548C
 move  A2, S0
jal   0x8004EE18
       NOP
jal   SleepProcess
 li    A0, 10
jal   PlaySound
 li    A0, 334
move  A0, S1
move  A1, R0
addiu A2, SP, 0x38
jal   0x800F6748
 addiu A3, SP, 0x3c
mtc1  R0, F20
move  S1, R0
li    AT, 0x42B40000 ; 90.000000
mtc1  AT, F22
add.s F0, F20, F20
L80115FCC:
li    AT, 0x43870000 ; 270.000000
mtc1  AT, F12
      NOP
jal   0x8008E3F0
 add.s F12, F0, F12
li    AT, 0x42A00000 ; 80.000000
mtc1  AT, F2
      NOP
mul.s F0, F0, F2
lwc1  F2, 0x38(SP)
add.s F0, F0, F2
trunc.w.s F2, F0
mfc1  S0, F2
      NOP
sll   S0, S0, 0x10
sra   S0, S0, 0x10
jal   0x8008E3F0
 mov.s F12, F20
li    AT, 0x3F800000 ; 1.000000
mtc1  AT, F2
      NOP
sub.s F2, F2, F0
mul.s F2, F2, F22
lwc1  F0, 0x3c(SP)
add.s F2, F2, F0
trunc.w.s F0, F2
mfc1  A3, F0
      NOP
sll   A3, A3, 0x10
move  A0, S4
move  A1, R0
move  A2, S0
jal   0x80054904
 sra   A3, A3, 0x10
li    AT, 0x42580000 ; 54.000000
mtc1  AT, F0
      NOP
c.lt.s F0, F20
      NOP
      NOP
bc1t  L80116078
 li    V1, 1
move  V1, R0
L80116078:
sltiu V0, S1, 1
and   V0, V1, V0
beqz  V0, L801160BC
 li    A1, 16386
li    S1, 1
lui   A0, hi(func_801155C4)
addiu A0, A0, lo(func_801155C4)
move  A2, R0
jal   InitProcess
 move  A3, R0
move  S2, V0
li    V0, 2
jal   0x8004EE68
 sw    V0, 0x8c(S2)
move  A0, V0
jal   0x8004ED30
 move  A1, S2
L801160BC:
jal   SleepVProcess
       NOP
li   AT, 0x40660000 ; 3.593750
ori  AT, AT, 0x6666
mtc1 AT, F0
      NOP
add.s F20, F20, F0
c.lt.s F20, F22
      NOP
      NOP
bc1tl L80115FCC
 add.s F0, F20, F20
li    AT, 0x43E10000 ; 450.000000
mtc1  AT, F12
      NOP
jal   0x8008E3F0
 sll   S1, S4, 0x10
li    AT, 0x42A00000 ; 80.000000
mtc1  AT, F2
      NOP
mul.s F0, F0, F2
lwc1  F2, 0x38(SP)
add.s F0, F0, F2
trunc.w.s F2, F0
mfc1  S0, F2
      NOP
sll   S0, S0, 0x10
li    AT, 0x42B40000 ; 90.000000
mtc1  AT, F12
      NOP
jal   0x8008E3F0
 sra   S0, S0, 0x10
li    AT, 0x3F800000 ; 1.000000
mtc1  AT, F2
      NOP
sub.s F2, F2, F0
li    AT, 0x42B40000 ; 90.000000
mtc1  AT, F0
      NOP
mul.s F2, F2, F0
lwc1  F0, 0x3c(SP)
add.s F2, F2, F0
trunc.w.s F0, F2
mfc1  A3, F0
      NOP
sll   A3, A3, 0x10
move  A0, S4
move  A1, R0
move  A2, S0
jal   0x80054904
 sra   A3, A3, 0x10
li    S0, 255
sra   A0, S1, 0x10
L80116190:
move  A1, R0
jal   0x80055458
 andi  A2, S0, 0xffff
jal   SleepVProcess
 addiu S0, S0, -0x19
bgtz  S0, L80116190
 sra   A0, S1, 0x10
jal   0x800525C8
 move  A0, S4
jal   FreeGraphics
 move  A0, S7
jal   0x8004EE18
 move  S3, R0
lui   S0, hi(D_8011FB80)
addiu S0, S0, lo(D_8011FB80)
sll   V0, S3, 2
L801161D0:
addu  V0, V0, S0
lh    A0, 2(V0)
move  A1, R0
jal   0x800553A8
 li    A2, 32768
addiu S3, S3, 1
slti  V0, S3, 3
bnez  V0, L801161D0
 sll   V0, S3, 2
lui   A0, hi(D_8011FB8E)
lh    A0, lo(D_8011FB8E)(A0)
move  A1, R0
jal   0x8005532C
 li    A2, 32768
lui   A0, hi(D_8011FB8E)
lh    A0, lo(D_8011FB8E)(A0)
move  A1, R0
jal   0x80055458
 li    A2, 255
lui   A0, hi(D_8011FB8E)
lh    A0, lo(D_8011FB8E)(A0)
move  A1, R0
li    A2, 160
jal   0x80054904
 li    A3, 120
jal   0x8004EE68
 move  S3, R0
move  S0, V0
lui   A0, hi(func_80115734)
addiu A0, A0, lo(func_80115734)
li    A1, 16386
move  A2, R0
jal   InitProcess
 move  A3, R0
move  A0, S0
jal   0x8004ED30
 move  A1, V0
sw    R0, 0x40(SP)
lui   A0, hi(D_801158FC)
addiu A0, A0, lo(D_801158FC)
li    A1, 16386
move  A2, R0
jal   InitProcess
 move  A3, R0
addiu V1, SP, 0x40
jal   0x8004EE18
 sw    V1, 0x8c(V0)
jal   PlaySound
 li    A0, 335
li    A0, -1
li    A1, 4
jal   0x800FFA4C
 li    A2, 5
move  S1, V0
li    AT, 0x40000000 ; 2.000000
mtc1  AT, F28
li    AT, 0x3F800000 ; 1.000000
mtc1  AT, F24
li    AT, 0x40400000 ; 3.000000
mtc1  AT, F26
li    S0, 1
L801162C4:
mtc1  S3, F22
      NOP
cvt.s.w F22, F22
jal   0x8008EF20
 mov.s F12, F22
div.s F20, F0, F28
add.s F20, F20, F24
jal   0x8008EF20
 mov.s F12, F22
div.s F0, F0, F26
lui   A0, hi(D_8011FB8E)
lh    A0, lo(D_8011FB8E)(A0)
mfc1  A2, F20
add.s F0, F0, F24
mfc1  A3, F0
      NOP
jal   0x800551D8
 move  A1, R0
slti  V0, S3, 0x5a1
beql  V0, R0, L80116318
 sw    S0, 0x40(SP)
L80116318:
jal   SleepVProcess
 addiu S3, S3, 0x32
slti  V0, S3, 0xb41
bnez  V0, L801162C4
       NOP
jal   PlaySound
 li    A0, 297
li    A0, 255
li    A1, 255
jal   0x800620C8
 li    A2, 255
li    A0, 11
jal   InitFadeOut
 li    A1, 50
jal   0x800FFAEC
 move  A0, S1
mtc1  R0, F20
li    AT, 0x3DCC0000 ; 0.099609
ori AT, AT, 0xcccd
mtc1  AT, F22
func_80116368:
jal   GetFadeStatus
       NOP
beqz  V0, L801163A4
       NOP
lui   A0, hi(D_8011FB8E)
lh    A0, lo(D_8011FB8E)(A0)
mfc1  A2, F20
mfc1  A3, F20
      NOP
jal   0x800551D8
 move  A1, R0
jal   SleepVProcess
       NOP
j     func_80116368
 add.s F20, F20, F22
L801163A4:
jal   GetFadeStatus
       NOP
beqz  V0, L801163C4
 li    V0, 2
jal   SleepVProcess
       NOP
j     L801163A4
       NOP
L801163C4:
sw    V0, 0x40(SP)
move  S3, R0
lui   S2, hi(D_8011FB80)
addiu S2, S2, lo(D_8011FB80)
addiu S1, SP, 0x18
sll   S0, S3, 2
L801163DC:
addu  V0, S0, S2
lh    A0, 2(V0)
jal   0x800525C8
 addu  S0, S0, S1
lh    A0, 2(S0)
jal   FreeGraphics
 addiu S3, S3, 1
slti  V0, S3, 4
bnez  V0, L801163DC
 sll   S0, S3, 2
li    A0, 11
jal   InitFadeIn
 li    A1, 90
L80116410:
jal   GetFadeStatus
       NOP
beqz  V0, L80116430
       NOP
jal   SleepVProcess
       NOP
j     L80116410
       NOP
L80116430:
jal   0x800EC414
 li    A0, 14883
li    V0, 2
lui   AT, hi(CORE_800CD0AA)
sh    V0, lo(CORE_800CD0AA)(AT)
lw    RA, 0x68(SP)
lw    S7, 0x64(SP)
lw    S6, 0x60(SP)
lw    S5, 0x5c(SP)
lw    S4, 0x58(SP)
lw    S3, 0x54(SP)
lw    S2, 0x50(SP)
lw    S1, 0x4c(SP)
lw    S0, 0x48(SP)
ldc1  F28, 0x90(SP)
ldc1  F26, 0x88(SP)
ldc1  F24, 0x80(SP)
ldc1  F22, 0x78(SP)
ldc1  F20, 0x70(SP)
jr    RA
 addiu SP, SP, 0x98

func_8011667C:
addiu SP, SP, -0x20
sw    RA, 0x18(SP)
sw    S1, 0x14(SP)
sw    S0, 0x10(SP)
move  S1, A0
lui   V1, hi(D_8011FBA8)
addiu V1, V1, lo(D_8011FBA8)
sll   V0, S1, 2
addu  S0, V0, V1
lw    A0, 0(S0)
beqz  A0, L801166B8
       NOP
jal   0x800479AC
       NOP
sw    R0, 0(S0)
L801166B8:
lui   V1, hi(D_8011FB98)
addiu V1, V1, lo(D_8011FB98)
sll   V0, S1, 2
addu  S0, V0, V1
lw    A0, 0(S0)
beqz  A0, L801166E0
       NOP
jal   0x800D9B54
       NOP
sw    R0, 0(S0)
L801166E0:
lw    RA, 0x18(SP)
lw    S1, 0x14(SP)
lw    S0, 0x10(SP)
jr    RA
 addiu SP, SP, 0x20

D_801166F4:
addiu SP, SP, -0x20
sw    RA, 0x1c(SP)
sw    S2, 0x18(SP)
sw    S1, 0x14(SP)
sw    S0, 0x10(SP)
move  S0, R0
lui   S2, hi(D_8011FBA8)
addiu S2, S2, lo(D_8011FBA8)
sll   V0, S0, 2
L80116718:
addu  S1, V0, S2
lw    A0, 0(S1)
beqz  A0, L80116734
 addiu S0, S0, 1
jal   0x800479AC
       NOP
sw    R0, 0(S1)
L80116734:
slti  V0, S0, 4
bnez  V0, L80116718
 sll   V0, S0, 2
lw    RA, 0x1c(SP)
lw    S2, 0x18(SP)
lw    S1, 0x14(SP)
lw    S0, 0x10(SP)
jr    RA
 addiu SP, SP, 0x20

D_80116758:
addiu SP, SP, -0x20
sw    RA, 0x1c(SP)
sw    S2, 0x18(SP)
sw    S1, 0x14(SP)
sw    S0, 0x10(SP)
move  S0, A0
lw    S1, 0x4c(S0)
lui   V1, hi(current_player_index)
lb    V1, lo(current_player_index)(V1)
li    V0, 4
bne   V1, V0, L801167BC
       NOP
lw    V0, 0x54(S0)
bnez  V0, L801167BC
       NOP
lw    V0, 0x50(S0)
bnez  V0, L801167AC
 addiu V0, V0, -1
li    V0, 40
j     L801168EC
 sw    V0, 0x50(S0)
L801167AC:
bnez  V0, L801168EC
 sw    V0, 0x50(S0)
li    V0, 1
sw    V0, 0x54(S0)
L801167BC:
jal   GetPlayerStruct
 move  A0, S1
move  S2, V0
sll   V0, S1, 2
lui   S1, hi(D_8011FB98)
addu  S1, S1, V0
lw    S1, lo(D_8011FB98)(S1)
lw    A1, 0x24(S2)
addiu A0, S1, 0xc
jal   0x80089A20
 addiu A1, A1, 0xc
lw    V0, 0x24(S2)
lwc1  F0, 0x30(V0)
li    AT, 0x41A00000 ; 20.000000
mtc1  AT, F2
      NOP
add.s F0, F0, F2
swc1  F0, 0x30(S1)
lw    A1, 0x24(S2)
addiu A0, S1, 0x18
jal   0x80089A20
 addiu A1, A1, 0x18
lwc1  F12, 0x24(S0)
jal   0x8008EF20
       NOP
lwc1  F2, 0x18(S0)
mul.s F0, F0, F2
lwc1  F2, 0xc(S1)
add.s F0, F0, F2
swc1  F0, 0xc(S1)
jal   0x8008E3F0
 lwc1  F12, 0x24(S0)
lwc1  F2, 0x18(S0)
mul.s F0, F0, F2
lwc1  F2, 0x14(S1)
add.s F0, F0, F2
swc1  F0, 0x14(S1)
lwc1  F2, 0x24(S0)
li    AT, 0x40A00000 ; 5.000000
mtc1  AT, F0
      NOP
add.s F0, F2, F0
li    AT, 0x43B40000 ; 360.000000
mtc1  AT, F2
      NOP
c.le.s F2, F0
      NOP
      NOP
bc1f  L8011688C
 swc1  F0, 0x24(S0)
sub.s F0, F0, F2
swc1  F0, 0x24(S0)
L8011688C:
lwc1  F2, 0x18(S0)
li    AT, 0x40A00000 ; 5.000000
mtc1  AT, F0
      NOP
c.le.s F2, F0
      NOP
bc1f  L801168C0
       NOP
li    AT, 0x3E800000 ; 0.250000
mtc1  AT, F0
      NOP
add.s F0, F2, F0
swc1  F0, 0x18(S0)
L801168C0:
lw    V0, 0x24(S2)
lhu   V0, 0xa(V0)
andi  V0, V0, 8
beqz  V0, L801168E4
       NOP
jal   0x800D9A40
 move  A0, S1
j     L801168EC
       NOP
L801168E4:
jal   0x800D9B24
 move  A0, S1
L801168EC:
lw    RA, 0x1c(SP)
lw    S2, 0x18(SP)
lw    S1, 0x14(SP)
lw    S0, 0x10(SP)
jr    RA
 addiu SP, SP, 0x20

func_80116904:
addiu SP, SP, -0x20
sw    RA, 0x1c(SP)
sw    S2, 0x18(SP)
sw    S1, 0x14(SP)
sw    S0, 0x10(SP)
move  S1, A0
jal   GetPlayerStruct
 move  S0, A1
move  S2, V0
sll   V0, S1, 2
lui   AT, hi(D_8011FB98)
addu  AT, AT, V0
lw    V0, lo(D_8011FB98)(AT)
bnez  V0, L801169DC
 sll   V0, S1, 2
li    V0, 1
beq   S0, V0, L80116974
 slti  V0, S0, 2
beql  V0, R0, L80116964
 li    V0, 2
beqz  S0, L80116978
 li    A0, 63
j     L80116978
 li    A0, 66
L80116964:
beq   S0, V0, L80116978
 li    A0, 65
j     L80116978
 li    A0, 66
L80116974:
li    A0, 64
L80116978:
andi  A0, A0, 0xff
jal   0x800D90C8
 move  A1, R0
move  S0, V0
jal   0x800D9714
 move  A0, S0
sll   V0, S1, 2
lui   AT, hi(D_8011FB98)
addu  AT, AT, V0
sw    S0, lo(D_8011FB98)(AT)
lhu   V0, 0xa(S0)
ori   V0, V0, 2
sh    V0, 0xa(S0)
lw    A1, 0x24(S2)
addiu A0, S0, 0xc
jal   0x80089A20
 addiu A1, A1, 0xc
li    AT, 0x41A00000 ; 20.000000
mtc1  AT, F0
      NOP
swc1  F0, 0x30(S0)
jal   0x800ECC0C
 addiu A0, S0, 0x18
j     L801169EC
       NOP
L801169DC:
lui   A0, hi(D_8011FB98)
addu  A0, A0, V0
jal   0x800D9A40
 lw    A0, lo(D_8011FB98)(A0)
L801169EC:
lw    RA, 0x1c(SP)
lw    S2, 0x18(SP)
lw    S1, 0x14(SP)
lw    S0, 0x10(SP)
jr    RA
 addiu SP, SP, 0x20

func_80116A04:
addiu SP, SP, -0x28
sw    RA, 0x20(SP)
sw    S1, 0x1c(SP)
sw    S0, 0x18(SP)
move  S1, A0
lui   V0, hi(D_80116758)
addiu V0, V0, lo(D_80116758)
sw    V0, 0x10(SP)
li    A0, 16383
move  A1, R0
move  A2, R0
jal   0x80047620
 li    A3, -1
lui   V1, hi(D_8011FBA8)
addiu V1, V1, lo(D_8011FBA8)
sll   S0, S1, 2
addu  S0, S0, V1
sw    V0, 0(S0)
sw    S1, 0x4c(V0)
lw    V0, 0(S0)
sw    R0, 0x50(V0)
lw    V0, 0(S0)
li    AT, 0x43B40000 ; 360.000000
mtc1  AT, F12
      NOP
jal   0x800EEF80
 sw    R0, 0x54(V0)
lw    V1, 0(S0)
mtc1  V0, F0
      NOP
cvt.s.w F0, F0
swc1  F0, 0x24(V1)
lw    V0, 0(S0)
sw    R0, 0x18(V0)
lw    RA, 0x20(SP)
lw    S1, 0x1c(SP)
lw    S0, 0x18(SP)
jr    RA
 addiu SP, SP, 0x28

func_80116AA0:
addiu SP, SP, -0x28
sw    RA, 0x24(SP)
sw    S4, 0x20(SP)
sw    S3, 0x1c(SP)
sw    S2, 0x18(SP)
sw    S1, 0x14(SP)
sw    S0, 0x10(SP)
move  S0, R0
lui   S4, hi(D_8011FBA8)
addiu S4, S4, lo(D_8011FBA8)
lui   S3, hi(D_8011FB98)
addiu S3, S3, lo(D_8011FB98)
li    S2, -1
sll   V1, S0, 2
L80116AD8:
addu  V0, V1, S4
sw    R0, 0(V0)
addu  V1, V1, S3
sw    R0, 0(V1)
jal   GetPlayerStruct
 move  A0, S0
lbu   V0, 0x17(V0)
andi  V0, V0, 2
sltiu V0, V0, 1
subu  S1, R0, V0
jal   GetPlayerStruct
 move  A0, S0
lbu   V0, 0x17(V0)
andi  V0, V0, 4
bnezl V0, L80116B18
 li    S1, 1
L80116B18:
jal   GetPlayerStruct
 move  A0, S0
lbu   V0, 0x17(V0)
andi  V0, V0, 0x20
bnezl V0, L80116B30
 li    S1, 2
L80116B30:
jal   GetPlayerStruct
 move  A0, S0
lbu   V0, 0x17(V0)
andi  V0, V0, 0x40
bnezl V0, L80116B48
 li    S1, 3
L80116B48:
beql  S1, S2, L80116B68
 addiu S0, S0, 1
move  A0, S0
jal   func_80116904
 move  A1, S1
jal   func_80116A04
 move  A0, S0
addiu S0, S0, 1
L80116B68:
slti  V0, S0, 4
bnez  V0, L80116AD8
 sll   V1, S0, 2
lui   A0, hi(D_801166F4)
jal   0x800F8D54
 addiu A0, A0, lo(D_801166F4)
lw    RA, 0x24(SP)
lw    S4, 0x20(SP)
lw    S3, 0x1c(SP)
lw    S2, 0x18(SP)
lw    S1, 0x14(SP)
lw    S0, 0x10(SP)
jr    RA
 addiu SP, SP, 0x28

; runs from 0xFFFB event table entry
; Poison / Bowser Curse, reduce movement to 3 spaces.
__PP64_INTERNAL_CURSE_POISON_DICEROLL_EVENT:
addiu SP, SP, -0x38
sw    RA, 0x1c(SP)
sw    S2, 0x18(SP)
sw    S1, 0x14(SP)
sw    S0, 0x10(SP)
sdc1  F24, 0x30(SP)
sdc1  F22, 0x28(SP)
sdc1  F20, 0x20(SP)
lui   S0, hi(CORE_800CD058)
addiu S0, S0, lo(CORE_800CD058)
jal   GetPlayerStruct
 li    A0, -1
move  S1, V0
lh    V0, 0x56(S0)
lui   V1, hi(current_player_index)
lb    V1, lo(current_player_index)(V1)
srav  V0, V0, V1
andi  V0, V0, 1
beqz  V0, L80116D88
       NOP
jal   0x80035FDC
 li    A0, 16
lui   V0, hi(current_player_index)
lb    V0, lo(current_player_index)(V0)
li    V1, 1
sllv  V1, V1, V0
nor   V1, R0, V1
lhu   V0, 0x56(S0)
and   V0, V0, V1
sh    V0, 0x56(S0)
lbu   V0, 0x17(S1)
andi  V0, V0, 0x20
bnez  V0, L80116C40
 li    A0, -1
lw    V0, 0x14(S1)
andi  V0, V0, 0xa
li    V1, 8
bne   V0, V1, L80116C44
 li    A1, 0x3A07 ; "A poison mushroom is limiting your move to three spaces or less"
li    A0, -1
L80116C40:
li    A1, 0x4219 ; "Because of Bowser's Curse, you can move up to only three spaces."
L80116C44:
jal   0x800EC590
       NOP
lbu   V0, 0x17(S1)
andi  V0, V0, 2
beqz  V0, L80116CE4
       NOP
lb    V0, 0xf(S0)
sll   V0, V0, 2
lui   AT, hi(D_8011FB98)
addu  AT, AT, V0
lw    V0, lo(D_8011FB98)(AT)
beqz  V0, L80116CDC
       NOP
li    AT, 0x3F800000 ; 1.000000
mtc1  AT, F20
lui   S2, hi(D_8011FB98)
addiu S2, S2, lo(D_8011FB98)
li    AT, 0x3DA30000 ; 0.079590
ori AT, AT, 0xd70a
mtc1  AT, F24
mtc1  R0, F22
L80116C98:
lb    V0, 0xf(S0)
sll   V0, V0, 2
addu  V0, V0, S2
lw    A0, 0(V0)
mfc1  A1, F20
mfc1  A2, F20
mfc1  A3, F20
      NOP
jal   0x80089A10
 addiu A0, A0, 0x24
jal   SleepVProcess
       NOP
sub.s F20, F20, F24
c.le.s F22, F20
      NOP
bc1t  L80116C98
       NOP
L80116CDC:
jal   func_8011667C
 lb    A0, 0xf(S0)
L80116CE4:
lbu   V0, 0x17(S1)
andi  V0, V0, 8
beqz  V0, L80116D7C
       NOP
lb    V0, 0xf(S0)
sll   V0, V0, 2
lui   AT, hi(D_8011FB98)
addu  AT, AT, V0
lw    V0, lo(D_8011FB98)(AT)
beqz  V0, L80116D74
       NOP
li    AT, 0x3F800000 ; 1.000000
mtc1  AT, F20
lui   S2, hi(D_8011FB98)
addiu S2, S2, lo(D_8011FB98)
li    AT, 0x3DA30000 ; 0.079590
ori AT, AT, 0xd70a
mtc1  AT, F24
mtc1  R0, F22
L80116D30:
lb    V0, 0xf(S0)
sll   V0, V0, 2
addu  V0, V0, S2
lw    A0, 0(V0)
mfc1  A1, F20
mfc1  A2, F20
mfc1  A3, F20
      NOP
jal   0x80089A10
 addiu A0, A0, 0x24
jal   SleepVProcess
       NOP
sub.s F20, F20, F24
c.le.s F22, F20
      NOP
bc1t  L80116D30
       NOP
L80116D74:
jal   func_8011667C
 lb    A0, 0xf(S0)
L80116D7C:
lbu   V0, 0x17(S1)
andi  V0, V0, 0xd5
sb    V0, 0x17(S1)
L80116D88:
lw    RA, 0x1c(SP)
lw    S2, 0x18(SP)
lw    S1, 0x14(SP)
lw    S0, 0x10(SP)
ldc1  F24, 0x30(SP)
ldc1  F22, 0x28(SP)
ldc1  F20, 0x20(SP)
jr    RA
 addiu SP, SP, 0x38

D_80116DAC:
addiu SP, SP, -0x38
sw    RA, 0x1c(SP)
sw    S2, 0x18(SP)
sw    S1, 0x14(SP)
sw    S0, 0x10(SP)
sdc1  F24, 0x30(SP)
sdc1  F22, 0x28(SP)
sdc1  F20, 0x20(SP)
lui   S1, hi(CORE_800CD058)
addiu S1, S1, lo(CORE_800CD058)
jal   GetPlayerStruct
 li    A0, -1
move  S0, V0
lbu   V0, 0x17(S0)
andi  V0, V0, 8
beqz  V0, L80116EE8
       NOP
lui   A0, hi(current_player_index)
jal   0x800DCA64
 lb    A0, lo(current_player_index)(A0)
jal   0x80035FDC
 li    A0, 16
lui   V0, hi(current_player_index)
lb    V0, lo(current_player_index)(V0)
li    V1, 1
sllv  V1, V1, V0
nor   V1, R0, V1
lhu   V0, 0x56(S1)
and   V0, V0, V1
sh    V0, 0x56(S1)
li    A0, -1
jal   0x800EC590
 li    A1, 16921
lui   V0, hi(current_player_index)
lb    V0, lo(current_player_index)(V0)
sll   V0, V0, 2
lui   AT, hi(D_8011FB98)
addu  AT, AT, V0
lw    V0, lo(D_8011FB98)(AT)
beqz  V0, L80116EB4
       NOP
li    AT, 0x3F800000 ; 1.000000
mtc1  AT, F20
lui   S2, hi(D_8011FB98)
addiu S2, S2, lo(D_8011FB98)
li    AT, 0x3DA30000 ; 0.079590
ori AT, AT, 0xd70a
mtc1  AT, F24
mtc1  R0, F22
L80116E70:
lb    V0, 0xf(S1)
sll   V0, V0, 2
addu  V0, V0, S2
lw    A0, 0(V0)
mfc1  A1, F20
mfc1  A2, F20
mfc1  A3, F20
      NOP
jal   0x80089A10
 addiu A0, A0, 0x24
jal   SleepVProcess
       NOP
sub.s F20, F20, F24
c.le.s F22, F20
      NOP
bc1t  L80116E70
       NOP
L80116EB4:
jal   func_8011667C
 lb    A0, 0xf(S1)
lbu   V0, 0x17(S0)
andi  V0, V0, 0xd7
sb    V0, 0x17(S0)
li    A0, -1
jal   0x800FF900
 li    A1, 2
lb    A0, 0xf(S1)
jal   0x800DC128
       NOP
jal   SleepProcess
 li    A0, 15
L80116EE8:
lw    RA, 0x1c(SP)
lw    S2, 0x18(SP)
lw    S1, 0x14(SP)
lw    S0, 0x10(SP)
ldc1  F24, 0x30(SP)
ldc1  F22, 0x28(SP)
ldc1  F20, 0x20(SP)
jr    RA
 addiu SP, SP, 0x38

D_80116F0C:
addiu SP, SP, -0x20
sw    RA, 0x18(SP)
sw    S1, 0x14(SP)
sw    S0, 0x10(SP)
jal   0x8004EE68
 li    S0, 60
lw    S1, 0x8c(V0)
L80116F28:
jal   SleepVProcess
 addiu S0, S0, -1
bnez  S0, L80116F28
       NOP
jal   0x800FFAEC
 move  A0, S1
jal   EndProcess
 move  A0, R0
lw    RA, 0x18(SP)
lw    S1, 0x14(SP)
lw    S0, 0x10(SP)
jr    RA
 addiu SP, SP, 0x20

D_80116F5C:
addiu SP, SP, -0x60
sw    RA, 0x30(SP)
sw    S3, 0x2c(SP)
sw    S2, 0x28(SP)
sw    S1, 0x24(SP)
sw    S0, 0x20(SP)
sdc1  F28, 0x58(SP)
sdc1  F26, 0x50(SP)
sdc1  F24, 0x48(SP)
sdc1  F22, 0x40(SP)
sdc1  F20, 0x38(SP)
lui   S3, hi(CORE_800CD058)
addiu S3, S3, lo(CORE_800CD058)
lui   V1, hi(p1_char)
addiu V1, V1, lo(p1_char)
lbu   A2, 0(V1)
lbu   A3, 0x38(V1)
lbu   V0, 0x70(V1)
addiu V0, V0, 0x1c00
sw    V0, 0x10(SP)
lbu   V0, 0xa8(V1)
addiu V0, V0, 0x1c00
sw    V0, 0x14(SP)
sw    R0, 0x18(SP)
li    A0, -1
li    A1, 0x5C01
addiu A2, A2, 0x1c00
jal   0x800EC8EC ; ShowMessage ; "Who's your opponent?"
 addiu A3, A3, 0x1c00
lui   A1, hi(D_8011FBBC)
lw    A1, lo(D_8011FBBC)(A1)
jal   __PP64_INTERNAL_BASIC_MESSAGE_CHOICE
 li    A0, 2
jal   0x800EC6C8
 move  S0, V0
jal   0x800EC6EC
       NOP
slti  V0, S0, 4
beqz  V0, L80117004
       NOP
bgez  S0, L80117010
 move  S1, S0
L80117004:
jal   0x800EF0D8
 move  A0, R0
move  S1, V0
L80117010:
lui   A1, hi(CORE_800CD0AE)
addiu A1, A1, lo(CORE_800CD0AE)
sll   A0, S1, 0x10
sra   A0, A0, 0x10
li    V1, 1
sllv  V1, V1, A0
lhu   V0, 0(A1)
or    V0, V0, V1
jal   GetPlayerStruct
 sh    V0, 0(A1)
move  S2, V0
li    AT, 0x3F800000 ; 1.000000
mtc1  AT, F20
      NOP
mov.s F22, F20
li    AT, 0x3DCC0000 ; 0.099609
ori AT, AT, 0xcccd
mtc1  AT, F28
li    AT, 0x3D8F0000 ; 0.069824
ori AT, AT, 0x5c29
mtc1  AT, F26
mtc1  R0, F24
sub.s F20, F20, F28
L8011706C:
jal   0x800E4A7C
 add.s F22, F22, F26
lb    A0, 0xf(S3)
mfc1  A2, F20
mfc1  A3, F22
      NOP
jal   0x800F696C
 move  A1, V0
jal   SleepVProcess
       NOP
c.lt.s F24, F20
      NOP
      NOP
bc1tl L8011706C
 sub.s F20, F20, F28
jal   0x800E4A7C
       NOP
lb    A0, 0xf(S3)
move  A1, V0
jal   0x800F68E0
 move  A2, R0
jal   0x800F6BC4
 li    A0, -1
jal   0x800F66DC
 move  A0, R0
jal   0x800F6ECC
 li    A0, -1
sll   V0, S1, 0x10
sra   V0, V0, 0x10
lb    V1, 0xf(S3)
beq   V0, V1, L80117148
 sll   S0, S1, 0x10
move  A0, R0
jal   InitFadeOut
 li    A1, 16
jal   SleepProcess
 li    A0, 16
jal   0x800F915C
 li    A0, 2
lw    A0, 0x24(S2)
jal   0x800F9174
 addiu A0, A0, 0xc
lw    A0, 0x24(S2)
jal   0x800E9748
 addiu A0, A0, 0xc
jal   SleepVProcess
 sll   S0, S1, 0x10
move  A0, R0
jal   InitFadeIn
 li    A1, 16
li    V0, 1
lui   AT, hi(CORE_800A12D8)
sw    V0, lo(CORE_800A12D8)(AT)
jal   SleepProcess
 li    A0, 16
L80117148:
sra   S0, S0, 0x10
jal   func_8011667C
 move  A0, S0
lbu   V0, 0x17(S2)
andi  V0, V0, 0x99
ori   V0, V0, 2
sb    V0, 0x17(S2)
move  A0, S0
jal   func_80116904
 move  A1, R0
mtc1  R0, F20
sll   V0, S1, 0x10
lui   V1, hi(D_8011FB98)
addiu V1, V1, lo(D_8011FB98)
sra   V0, V0, 0xe
addu  S0, V0, V1
li    AT, 0x3DA30000 ; 0.079590
ori   AT, AT, 0xd70a
mtc1  AT, F24
li    AT, 0x3F800000 ; 1.000000
mtc1  AT, F22
L8011719C:
lw    A0, 0(S0)
mfc1  A1, F20
mfc1  A2, F20
mfc1  A3, F20
      NOP
jal   0x80089A10
 addiu A0, A0, 0x24
jal   SleepVProcess
       NOP
add.s F20, F20, F24
c.le.s F20, F22
      NOP
      NOP
bc1t  L8011719C
 sll   V0, S1, 0x10
sra   S0, V0, 0x10
sll   V0, S0, 2
lui   A0, hi(D_8011FB98)
addu  A0, A0, V0
lw    A0, lo(D_8011FB98)(A0)
addiu A0, A0, 0x24
lui   A1, 0x3f80
move  A2, A1
jal   0x80089A10
 move  A3, A1
lb    V0, 0xf(S3)
bnel  S0, V0, L80117224
 sll   A0, S1, 0x10
move  A0, S0
li    A1, 4
jal   0x800F2304
 li    A2, 2
j     L80117240
 sll   S0, S1, 0x10
L80117224:
jal   GetPlayerStruct
 sra   A0, A0, 0x10
lw    A0, 0x24(V0)
li    A1, 4
jal   0x800D9CE8
 li    A2, 2
sll   S0, S1, 0x10
L80117240:
sra   S0, S0, 0x10
sll   V0, S0, 3
subu  V0, V0, S0
sll   V0, V0, 3
lui   A1, hi(p1_char)
addu  A1, A1, V0
lbu   A1, lo(p1_char)(A1)
jal   0x8004AC10
 li    A0, 646
jal   func_80116A04
 move  A0, S0
move  A0, S0
li    A1, 1
jal   0x800FFA4C
 li    A2, 5
move  S0, V0
lui   A0, hi(D_80116F0C)
addiu A0, A0, lo(D_80116F0C)
li    A1, 16386
move  A2, R0
jal   InitProcess
 move  A3, R0
sw    S0, 0x8c(V0)
jal   SleepProcess
 li    A0, 20
lbu   V0, 0xf(S3)
sll   V0, V0, 0x18
sra   S0, V0, 0x18
sb    S1, 0xf(S3)
lbu   V0, 0x17(S2)
andi  V0, V0, 0x80
beqz  V0, L801172CC
 li    A0, -1
jal   0x800EC590
 li    A1, 14857
L801172CC:
li    A0, -1
jal   0x800EC590
 li    A1, 14854
sll   V1, S0, 0x18
sll   V0, S1, 0x10
sra   V0, V0, 0x10
sra   V1, V1, 0x18
bne   V0, V1, L80117308
 sb    S0, 0xf(S3)
li    A0, -1
li    A1, -1
jal   0x800F2304
 li    A2, 2
j     L80117330
 sll   V0, S1, 0x10
L80117308:
sll   A0, S1, 0x10
jal   GetPlayerStruct
 sra   A0, A0, 0x10
lw    A0, 0x24(V0)
li    A1, -1
jal   0x800D9CE8
 li    A2, 2
lui   AT, hi(CORE_800A12D8)
sw    R0, lo(CORE_800A12D8)(AT)
sll   V0, S1, 0x10
L80117330:
sra   V0, V0, 0x10
lb    V1, 0xf(S3)
beq   V0, V1, L80117390
 sll   V0, S1, 0x10
move  A0, R0
jal   InitFadeOut
 li    A1, 16
jal   SleepProcess
 li    A0, 16
jal   0x800F915C
 li    A0, 1
jal   GetPlayerStruct
 li    A0, -1
lw    A0, 0x24(V0)
jal   0x800E9748
 addiu A0, A0, 0xc
jal   SleepVProcess
       NOP
move  A0, R0
jal   InitFadeIn
 li    A1, 16
jal   SleepProcess
 li    A0, 16
sll   V0, S1, 0x10
L80117390:
sra   V0, V0, 0x10
lb    V1, 0xf(S3)
bne   V0, V1, L801174A4
       NOP
jal   0x80035FDC
 li    A0, 16
li    A0, -1
jal   0x800EC590
 li    A1, 14855
li    AT, 0x3F800000 ; 1.000000
mtc1  AT, F20
sll   V0, S1, 0x10
lui   V1, hi(D_8011FB98)
addiu V1, V1, lo(D_8011FB98)
sra   V0, V0, 0xe
addu  S0, V0, V1
li    AT, 0x3DA30000 ; 0.079590
ori   AT, AT, 0xd70a
mtc1  AT, F24
mtc1  R0, F22
L801173E0:
lw    A0, 0(S0)
mfc1  A1, F20
mfc1  A2, F20
mfc1  A3, F20
      NOP
jal   0x80089A10
 addiu A0, A0, 0x24
jal   SleepVProcess
       NOP
sub.s F20, F20, F24
c.le.s F22, F20
      NOP
      NOP
bc1t  L801173E0
 sll   V0, S1, 0x10
sra   V0, V0, 0xe
lui   A0, hi(D_8011FB98)
addu  A0, A0, V0
lw    A0, lo(D_8011FB98)(A0)
addiu A0, A0, 0x24
move  A1, R0
move  A2, A1
jal   0x80089A10
 move  A3, A1
lb    A0, 0xf(S3)
jal   func_8011667C
       NOP
lui   S0, hi(current_player_index)
addiu S0, S0, lo(current_player_index)
jal   0x800DCA64
 lb    A0, 0(S0)
li    A0, -1
jal   0x800FF900
 li    A1, 2
lb    A0, 0(S0)
jal   0x800DC128
       NOP
jal   SleepProcess
 li    A0, 15
lb    V0, 0(S0)
li    V1, 1
sllv  V1, V1, V0
nor   V1, R0, V1
lhu   V0, 0x47(S0)
and   V0, V0, V1
sh    V0, 0x47(S0)
lbu   V0, 0x17(S2)
andi  V0, V0, 0xfd
sb    V0, 0x17(S2)
L801174A4:
lw    RA, 0x30(SP)
lw    S3, 0x2c(SP)
lw    S2, 0x28(SP)
lw    S1, 0x24(SP)
lw    S0, 0x20(SP)
ldc1  F28, 0x58(SP)
ldc1  F26, 0x50(SP)
ldc1  F24, 0x48(SP)
ldc1  F22, 0x40(SP)
ldc1  F20, 0x38(SP)
jr    RA
 addiu SP, SP, 0x60

; Runs from 0xFFFB event table entry
; Reversal (mushroom, curse)
__PP64_INTERNAL_REVERSAL_DICEROLL_EVENT:
addiu SP, SP, -0x38
sw    RA, 0x1c(SP)
sw    S2, 0x18(SP)
sw    S1, 0x14(SP)
sw    S0, 0x10(SP)
sdc1  F24, 0x30(SP)
sdc1  F22, 0x28(SP)
sdc1  F20, 0x20(SP)
lui   S0, hi(CORE_800CD058)
addiu S0, S0, lo(CORE_800CD058)
jal   GetPlayerStruct
 li    A0, -1
move  S1, V0
lbu   V1, 0x17(S1)
andi  V0, V1, 0x80
beqz  V0, L80117680
 andi  V0, V1, 0x40
bnez  V0, L80117538
 li    A0, -1
lw    V0, 0x14(S1)
andi  V0, V0, 0x14
li    V1, 16
bne   V0, V1, L8011753C
 li    A1, 0x3A03 ; "A Reverse Mushroom is forcing you to move in the opposite direction"
li    A0, -1
L80117538:
li    A1, 0x421C ; "Because of the "Reverse Curse", you'll now move in the opposite direction."
L8011753C:
jal   0x800EC590
       NOP
lbu   V0, 0x17(S1)
andi  V0, V0, 4
beqz  V0, L801175DC
       NOP
lb    V0, 0xf(S0)
sll   V0, V0, 2
lui   AT, hi(D_8011FB98)
addu  AT, AT, V0
lw    V0, lo(D_8011FB98)(AT)
beqz  V0, L801175D4
       NOP
li    AT, 0x3F800000 ; 1.000000
mtc1  AT, F20
lui   S2, hi(D_8011FB98)
addiu S2, S2, lo(D_8011FB98)
li    AT, 0x3DA30000 ; 0.079590
ori   AT, AT, 0xd70a
mtc1  AT, F24
mtc1  R0, F22
L80117590:
lb    V0, 0xf(S0)
sll   V0, V0, 2
addu  V0, V0, S2
lw    A0, 0(V0)
mfc1  A1, F20
mfc1  A2, F20
mfc1  A3, F20
      NOP
jal   0x80089A10
 addiu A0, A0, 0x24
jal   SleepVProcess
       NOP
sub.s F20, F20, F24
c.le.s F22, F20
      NOP
bc1t  L80117590
       NOP
L801175D4:
jal   func_8011667C
 lb    A0, 0xf(S0)
L801175DC:
lbu   V0, 0x17(S1)
andi  V0, V0, 0x10
beqz  V0, L80117674
       NOP
lb    V0, 0xf(S0)
sll   V0, V0, 2
lui   AT, hi(D_8011FB98)
addu  AT, AT, V0
lw    V0, lo(D_8011FB98)(AT)
beqz  V0, L8011766C
       NOP
li    AT, 0x3F800000 ; 1.000000
mtc1  AT, F20
lui   S2, hi(D_8011FB98)
addiu S2, S2, lo(D_8011FB98)
li    AT, 0x3DA30000 ; 0.079590
ori   AT, AT, 0xd70a
mtc1  AT, F24
mtc1  R0, F22
L80117628:
lb    V0, 0xf(S0)
sll   V0, V0, 2
addu  V0, V0, S2
lw    A0, 0(V0)
mfc1  A1, F20
mfc1  A2, F20
mfc1  A3, F20
      NOP
jal   0x80089A10
 addiu A0, A0, 0x24
jal   SleepVProcess
       NOP
sub.s F20, F20, F24
c.le.s F22, F20
      NOP
bc1t  L80117628
       NOP
L8011766C:
jal   func_8011667C
 lb    A0, 0xf(S0)
L80117674:
lbu   V0, 0x17(S1)
andi  V0, V0, 0xab
sb    V0, 0x17(S1)
L80117680:
lw    RA, 0x1c(SP)
lw    S2, 0x18(SP)
lw    S1, 0x14(SP)
lw    S0, 0x10(SP)
ldc1  F24, 0x30(SP)
ldc1  F22, 0x28(SP)
ldc1  F20, 0x20(SP)
jr    RA
 addiu SP, SP, 0x38

D_801176A4:
addiu SP, SP, -0x38
sw    RA, 0x1c(SP)
sw    S2, 0x18(SP)
sw    S1, 0x14(SP)
sw    S0, 0x10(SP)
sdc1  F24, 0x30(SP)
sdc1  F22, 0x28(SP)
sdc1  F20, 0x20(SP)
lui   S1, hi(CORE_800CD058)
addiu S1, S1, lo(CORE_800CD058)
jal   GetPlayerStruct
 li    A0, -1
move  S0, V0
lbu   V0, 0x17(S0)
andi  V0, V0, 0x10
beqz  V0, L801177B8
       NOP
lui   A0, hi(current_player_index)
jal   0x800DCA64
 lb    A0, lo(current_player_index)(A0)
li    A0, -1
jal   0x800EC590
 li    A1, 16924
lui   V0, hi(current_player_index)
lb    V0, lo(current_player_index)(V0)
sll   V0, V0, 2
lui   AT, hi(D_8011FB98)
addu  AT, AT, V0
lw    V0, lo(D_8011FB98)(AT)
beqz  V0, L80117784
       NOP
li    AT, 0x3F800000 ; 1.000000
mtc1  AT, F20
lui   S2, hi(D_8011FB98)
addiu S2, S2, lo(D_8011FB98)
li    AT, 0x3DA30000 ; 0.079590
ori   AT, AT, 0xd70a
mtc1  AT, F24
mtc1  R0, F22
L80117740:
lb    V0, 0xf(S1)
sll   V0, V0, 2
addu  V0, V0, S2
lw    A0, 0(V0)
mfc1  A1, F20
mfc1  A2, F20
mfc1  A3, F20
      NOP
jal   0x80089A10
 addiu A0, A0, 0x24
jal   SleepVProcess
       NOP
sub.s F20, F20, F24
c.le.s F22, F20
      NOP
bc1t  L80117740
       NOP
L80117784:
jal   func_8011667C
 lb    A0, 0xf(S1)
lbu   V0, 0x17(S0)
andi  V0, V0, 0xaf
sb    V0, 0x17(S0)
li    A0, -1
jal   0x800FF900
 li    A1, 2
lb    A0, 0xf(S1)
jal   0x800DC128
       NOP
jal   SleepProcess
 li    A0, 15
L801177B8:
lw    RA, 0x1c(SP)
lw    S2, 0x18(SP)
lw    S1, 0x14(SP)
lw    S0, 0x10(SP)
ldc1  F24, 0x30(SP)
ldc1  F22, 0x28(SP)
ldc1  F20, 0x20(SP)
jr    RA
 addiu SP, SP, 0x38

D_801177DC:
addiu SP, SP, -0x68
sw    RA, 0x38(SP)
sw    S3, 0x34(SP)
sw    S2, 0x30(SP)
sw    S1, 0x2c(SP)
sw    S0, 0x28(SP)
sdc1  F28, 0x60(SP)
sdc1  F26, 0x58(SP)
sdc1  F24, 0x50(SP)
sdc1  F22, 0x48(SP)
sdc1  F20, 0x40(SP)
lui   S3, hi(CORE_800CD058)
addiu S3, S3, lo(CORE_800CD058)
lui   V1, hi(p1_char)
addiu V1, V1, lo(p1_char)
lbu   A2, 0(V1)
lbu   A3, 0x38(V1)
lbu   V0, 0x70(V1)
addiu V0, V0, 0x1c00
sw    V0, 0x10(SP)
lbu   V0, 0xa8(V1)
addiu V0, V0, 0x1c00
sw    V0, 0x14(SP)
sw    R0, 0x18(SP)
li    A0, -1
li    A1, 0x5C01
addiu A2, A2, 0x1c00
jal   0x800EC8EC ; ShowMessage: "Who's your opponent?"
 addiu A3, A3, 0x1c00
lui   A1, hi(D_8011FBB8)
lw    A1, lo(D_8011FBB8)(A1)
jal   __PP64_INTERNAL_BASIC_MESSAGE_CHOICE
 li    A0, 2
jal   0x800EC6C8
 move  S0, V0
jal   0x800EC6EC
       NOP
slti  V0, S0, 4
beqz  V0, L80117884
       NOP
bgez  S0, L80117890
 move  S2, S0
L80117884:
jal   0x800EF0D8
 move  A0, R0
move  S2, V0
L80117890:
sll   A0, S2, 0x10
jal   GetPlayerStruct
 sra   A0, A0, 0x10
move  S1, V0
lbu   V0, 0x17(S1)
ori   V0, V0, 0x80
sb    V0, 0x17(S1)
li    AT, 0x3F800000 ; 1.000000
mtc1  AT, F20
      NOP
mov.s F22, F20
li    AT, 0x3DCC0000 ; 0.099609
ori AT, AT, 0xcccd
mtc1  AT, F28
li    AT, 0x3D8F0000 ; 0.069824
ori AT, AT, 0x5c29
mtc1  AT, F26
mtc1  R0, F24
sub.s F20, F20, F28
L801178DC:
jal   0x800E4A7C
 add.s F22, F22, F26
lb    A0, 0xf(S3)
mfc1  A2, F20
mfc1  A3, F22
      NOP
jal   0x800F696C
 move  A1, V0
jal   SleepVProcess
       NOP
c.lt.s F24, F20
      NOP
      NOP
bc1tl L801178DC
 sub.s F20, F20, F28
jal   0x800E4A7C
       NOP
lb    A0, 0xf(S3)
move  A1, V0
jal   0x800F68E0
 move  A2, R0
sll   V0, S2, 0x10
sra   V0, V0, 0x10
lb    V1, 0xf(S3)
beq   V0, V1, L801179A0
 sll   S0, S2, 0x10
move  A0, R0
jal   InitFadeOut
 li    A1, 16
jal   SleepProcess
 li    A0, 16
jal   0x800F915C
 li    A0, 2
lw    A0, 0x24(S1)
jal   0x800F9174
 addiu A0, A0, 0xc
lw    A0, 0x24(S1)
jal   0x800E9748
 addiu A0, A0, 0xc
jal   SleepVProcess
 sll   S0, S2, 0x10
move  A0, R0
jal   InitFadeIn
 li    A1, 16
li    V0, 1
lui   AT, hi(CORE_800A12D8)
sw    V0, lo(CORE_800A12D8)(AT)
jal   SleepProcess
 li    A0, 16
L801179A0:
sra   S0, S0, 0x10
jal   func_8011667C
 move  A0, S0
lbu   V0, 0x17(S1)
andi  V0, V0, 0x99
ori   V0, V0, 4
sb    V0, 0x17(S1)
move  A0, S0
jal   0x800FF900
 li    A1, 3
move  A0, S0
jal   func_80116904
 li    A1, 1
mtc1  R0, F20
sll   V0, S2, 0x10
lui   V1, hi(D_8011FB98)
addiu V1, V1, lo(D_8011FB98)
sra   V0, V0, 0xe
addu  S0, V0, V1
li    AT, 0x3DA30000 ; 0.079590
ori   AT, AT, 0xd70a
mtc1  AT, F24
li    AT, 0x3F800000 ; 1.000000
mtc1  AT, F22
L80117A00:
lw    A0, 0(S0)
mfc1  A1, F20
mfc1  A2, F20
mfc1  A3, F20
      NOP
jal   0x80089A10
 addiu A0, A0, 0x24
jal   SleepVProcess
       NOP
add.s F20, F20, F24
c.le.s F20, F22
      NOP
      NOP
bc1t  L80117A00
 sll   V0, S2, 0x10
sra   S0, V0, 0x10
sll   V0, S0, 2
lui   A0, hi(D_8011FB98)
addu  A0, A0, V0
lw    A0, lo(D_8011FB98)(A0)
addiu A0, A0, 0x24
lui   A1, 0x3f80
move  A2, A1
jal   0x80089A10
 move  A3, A1
lb    V0, 0xf(S3)
bnel  S0, V0, L80117A88
 sll   A0, S2, 0x10
move  A0, S0
li    A1, 4
jal   0x800F2304
 li    A2, 2
j     L80117AA4
 sll   S0, S2, 0x10
L80117A88:
jal   GetPlayerStruct
 sra   A0, A0, 0x10
lw    A0, 0x24(V0)
li    A1, 4
jal   0x800D9CE8
 li    A2, 2
sll   S0, S2, 0x10
L80117AA4:
sra   S0, S0, 0x10
sll   V0, S0, 3
subu  V0, V0, S0
sll   V0, V0, 3
lui   A1, hi(p1_char)
addu  A1, A1, V0
lbu   A1, lo(p1_char)(A1)
jal   0x8004AC10
 li    A0, 646
move  A0, S0
li    A1, 1
jal   0x800FFA4C
 li    A2, 5
move  S1, V0
jal   func_80116A04
 move  A0, S0
lui   A0, hi(D_80116F0C)
addiu A0, A0, lo(D_80116F0C)
li    A1, 16386
move  A2, R0
jal   InitProcess
 move  A3, R0
sw    S1, 0x8c(V0)
jal   SleepProcess
 li    A0, 20
lbu   V0, 0xf(S3)
sll   V0, V0, 0x18
sb    S2, 0xf(S3)
sra   A0, V0, 0x18
bne   A0, S0, L80117B34
 sra   S1, V0, 0x18
jal   0x800DEB2C
       NOP
li    V1, 3
beq   V0, V1, L80117B4C
 li    A0, -1
L80117B34:
lui   V0, hi(CORE_800CD0AE)
lh    V0, lo(CORE_800CD0AE)(V0)
srav  V0, V0, S2
andi  V0, V0, 1
beqz  V0, L80117B54
 li    A0, -1
L80117B4C:
jal   0x800EC590
 li    A1, 14853
L80117B54:
li    A0, -1
jal   0x800EC590
 li    A1, 14850
sll   V1, S1, 0x18
sll   V0, S2, 0x10
sra   V0, V0, 0x10
sra   V1, V1, 0x18
bne   V0, V1, L80117B90
 sb    S1, 0xf(S3)
li    A0, -1
li    A1, -1
jal   0x800F2304
 li    A2, 2
j     L80117BB8
 sll   V0, S2, 0x10
L80117B90:
sll   A0, S2, 0x10
jal   GetPlayerStruct
 sra   A0, A0, 0x10
lw    A0, 0x24(V0)
li    A1, -1
jal   0x800D9CE8
 li    A2, 2
lui   AT, hi(CORE_800A12D8)
sw    R0, lo(CORE_800A12D8)(AT)
sll   V0, S2, 0x10
L80117BB8:
sra   V0, V0, 0x10
lb    V1, 0xf(S3)
beq   V0, V1, L80117C18
 sll   V0, S2, 0x10
move  A0, R0
jal   InitFadeOut
 li    A1, 16
jal   SleepProcess
 li    A0, 16
jal   0x800F915C
 li    A0, 1
jal   GetPlayerStruct
 li    A0, -1
lw    A0, 0x24(V0)
jal   0x800E9748
 addiu A0, A0, 0xc
jal   SleepVProcess
       NOP
move  A0, R0
jal   InitFadeIn
 li    A1, 16
jal   SleepProcess
 li    A0, 16
sll   V0, S2, 0x10
L80117C18:
sra   V0, V0, 0x10
lb    V1, 0xf(S3)
bne   V0, V1, L80117C30
       NOP
jal   __PP64_INTERNAL_REVERSAL_DICEROLL_EVENT
       NOP
L80117C30:
lw    RA, 0x38(SP)
lw    S3, 0x34(SP)
lw    S2, 0x30(SP)
lw    S1, 0x2c(SP)
lw    S0, 0x28(SP)
ldc1  F28, 0x60(SP)
ldc1  F26, 0x58(SP)
ldc1  F24, 0x50(SP)
ldc1  F22, 0x48(SP)
ldc1  F20, 0x40(SP)
jr    RA
 addiu SP, SP, 0x68

; Plunder chest?
D_80117C60:
addiu SP, SP, -0xb8
sw    RA, 0x8c(SP)
sw    S6, 0x88(SP)
sw    S5, 0x84(SP)
sw    S4, 0x80(SP)
sw    S3, 0x7c(SP)
sw    S2, 0x78(SP)
sw    S1, 0x74(SP)
sw    S0, 0x70(SP)
sdc1  F28, 0xb0(SP)
sdc1  F26, 0xa8(SP)
sdc1  F24, 0xa0(SP)
sdc1  F22, 0x98(SP)
sdc1  F20, 0x90(SP)
lui   S6, hi(CORE_800CD058)
addiu S6, S6, lo(CORE_800CD058)
jal   func_8010FE54
 move  S1, R0
li    A0, 33
jal   0x800D90C8
 move  A1, R0
move  S4, V0
lw    V0, 0x3c(S4)
lw    V0, 0x40(V0)
lh    A0, 0(V0)
move  A1, R0
move  A2, A1
jal   0x8001C1A0
 move  A3, A1
jal   GetPlayerStruct
 li    A0, -1
lw    A1, 0x24(V0)
addiu A0, S4, 0xc
jal   0x80089A20
 addiu A1, A1, 0xc
lw    V0, 0x3c(S4)
lw    V0, 0x40(V0)
lh    A0, 0(V0)
li    A1, 2
jal   0x8001C814
 li    A2, 1
li    AT, 0x42C80000 ; 100.000000
mtc1  AT, F0
      NOP
swc1  F0, 0x30(S4)
jal   PlaySound
 li    A0, 322
li    AT, 0x41F00000 ; 30.000000
mtc1  AT, F2
lwc1  F0, 0x30(S4)
c.lt.s F2, F0
      NOP
      NOP
bc1f  L80117D70
 mov.s F4, F0
li    AT, 0x3F800000 ; 1.000000
mtc1  AT, F22
li    AT, 0x41F00000 ; 30.000000
mtc1  AT, F20
sub.s F0, F4, F22
L80117D50:
jal   SleepVProcess
 swc1  F0, 0x30(S4)
lwc1  F4, 0x30(S4)
c.lt.s F20, F4
      NOP
      NOP
bc1tl L80117D50
 sub.s F0, F4, F22
L80117D70:
beqz  S1, L80117DF0
 move  S0, R0
li    AT, 0x40000000 ; 2.000000
mtc1  AT, F28
li    AT, 0x3F800000 ; 1.000000
mtc1  AT, F26
L80117D88:
mtc1  S0, F22
      NOP
cvt.s.w F22, F22
jal   0x8008EF20
 mov.s F12, F22
div.s F24, F0, F28
add.s F24, F24, F26
jal   0x8008EF20
 mov.s F12, F22
div.s F20, F0, F28
add.s F20, F20, F26
jal   0x8008EF20
 mov.s F12, F22
div.s F0, F0, F28
mfc1  A1, F24
mfc1  A2, F20
add.s F0, F0, F26
mfc1  A3, F0
      NOP
jal   0x80089A10
 addiu A0, S4, 0x24
jal   SleepVProcess
 addiu S0, S0, 0x1e
slti  V0, S0, 0x439
bnez  V0, L80117D88
       NOP
L80117DF0:
jal   PlaySound
 li    A0, 329
lw    V0, 0x3c(S4)
lw    V0, 0x40(V0)
lh    A0, 0(V0)
li    A1, 1
jal   0x8001C814
 move  A2, R0
jal   SleepProcess
 li    A0, 20
move  S0, R0
addiu S1, SP, 0x20
li    S3, 1
addiu S2, SP, 0x60
li    S5, 8
L80117E2C:
lui   V0, hi(current_player_index)
lb    V0, lo(current_player_index)(V0)
bne   V0, S0, L80117E50
 sll   V0, S0, 4
addu  V0, S1, V0
sb    S3, 0(V0)
addu  V0, S2, S0
j     L80117E60
 sb    R0, 0(V0)
L80117E50:
addu  V0, S1, V0
sb    S5, 0(V0)
addu  V0, S2, S0
sb    S3, 0(V0)
L80117E60:
sll   A1, S0, 4
addu  A1, S1, A1
move  A0, S0
jal   0x800E2260
 addiu A1, A1, 1
addiu S0, S0, 1
slti  V0, S0, 4
bnez  V0, L80117E2C
 li    V0, 1
sb    V0, 0x64(SP)
sb    V0, 0x65(SP)
addiu V0, SP, 0x40
sw    V0, 0x10(SP)
addiu V0, SP, 0x50
sw    V0, 0x14(SP)
sw    R0, 0x18(SP)
li    A0, -1
li    A1, 0x5C01
addiu A2, SP, 0x20
jal   0x800EC8EC ; ShowMessage: "Who's your opponent?"
 addiu A3, SP, 0x30
addiu A0, SP, 0x60
jal   func_80113364
 move  A1, R0
jal   0x800EC6C8
 move  S1, V0
jal   0x800EC6EC
       NOP
li    V0, 4
bne   S1, V0, L80117EEC
 sll   V0, S1, 3
jal   0x800EF0D8
 li    A0, 1
move  S1, V0
sll   V0, S1, 3
L80117EEC:
subu  V0, V0, S1
sll   V0, V0, 3
lui   V1, hi(p1_item1)
addu  V1, V1, V0
lb    V1, lo(p1_item1)(V1)
li    V0, -1
bne   V1, V0, L80117FCC
 li    A0, -1
li    A1, 3
jal   0x800F2304
 move  A2, R0
lb    A1, 0xf(S6)
jal   0x8004ACE0
 li    A0, 646
jal   SleepProcess
 li    A0, 60
move  A0, S1
jal   0x800E2260
 addiu A1, SP, 0x20
sw    R0, 0x10(SP)
sw    R0, 0x14(SP)
li    A0, 14863
addiu A1, SP, 0x20
move  A2, R0
jal   0x800EC1E8
 move  A3, R0
lb    A0, 0xf(S6)
jal   0x800EC3C0
       NOP
jal   0x800EC3E4
       NOP
li    V0, 2
sw    V0, 0x10(SP)
li    A0, -1
li    A1, -1
move  A2, R0
jal   0x800F2388
 li    A3, 10
jal   0x800D9B54
 move  A0, S4
jal   0x800E4A7C
       NOP
lb    A0, 0xf(S6)
sll   V1, A0, 3
subu  V1, V1, A0
sll   V1, V1, 3
lui   A0, hi(p1_item1)
addiu A0, A0, lo(p1_item1)
addu  V1, V1, A0
addu  V1, V1, V0
li    V0, -1
sb    V0, 0(V1)
jal   FixUpPlayerItemSlots
 lb    A0, 0xf(S6)
j     L801182CC
       NOP
L80117FCC:
jal   PlayerHasEmptyItemSlot
 move  A0, S1
move  S0, V0
li    V0, -1
beql  S0, V0, L80117FE4
 li    S0, 3
L80117FE4:
mtc1  S0, F12
      NOP
jal   0x800EEF80
 cvt.s.w F12, F12
jal   0x800E4A7C
 move  S0, V0
lb    A0, 0xf(S6)
sll   V1, A0, 3
subu  V1, V1, A0
sll   V1, V1, 3
lui   A0, hi(p1_item1)
addiu A0, A0, lo(p1_item1)
addu  V1, V1, A0
addu  V1, V1, V0
sll   V0, S1, 3
subu  V0, V0, S1
sll   V0, V0, 3
addu  V0, V0, A0
addu  V0, V0, S0
lbu   A0, 0(V0)
sb    A0, 0(V1)
li    V1, -1
sb    V1, 0(V0)
jal   FixUpPlayerItemSlots
 move  A0, S1
sll   A0, S1, 0x10
sra   A0, A0, 0x10
jal   0x800FF900
 li    A1, 3
jal   0x800E4A7C
       NOP
bne   V0, S0, L80118080
       NOP
jal   0x800E4A7C
       NOP
move  A0, S1
move  A1, V0
jal   0x800F68E0
 move  A2, R0
L80118080:
jal   0x800F641C
 li    A0, -1
jal   0x800E4A7C
       NOP
lb    A0, 0xf(S6)
sll   V1, A0, 3
lui   AT, hi(D_8011E3B4)
addu  AT, AT, V1
lwc1  F0, lo(D_8011E3B4)(AT)
trunc.w.s F2, F0
mfc1  A2, F2
      NOP
sll   A2, A2, 0x10
lui   AT, hi(D_8011E3B8)
addu  AT, AT, V1
lwc1  F0, lo(D_8011E3B8)(AT)
trunc.w.s F2, F0
mfc1  A3, F2
      NOP
sll   A3, A3, 0x10
move  A1, V0
sra   A2, A2, 0x10
jal   0x800F688C
 sra   A3, A3, 0x10
jal   0x800E4A7C
       NOP
lb    A0, 0xf(S6)
move  A1, V0
jal   0x800F68E0
 li    A2, 256
move  A0, S1
move  A1, S0
jal   0x800F68E0
 move  A2, R0
jal   0x800E4A7C
       NOP
lb    A0, 0xf(S6)
move  A1, V0
jal   0x800F69B0
 li    A2, 18310
jal   0x8004EE68
       NOP
move  S0, V0
lb    V0, 0xf(S6)
sll   V0, V0, 3
lui   AT, hi(D_8011E3B4)
addu  AT, AT, V0
lwc1  F0, lo(D_8011E3B4)(AT)
trunc.w.s F2, F0
mfc1  A1, F2
      NOP
sll   A1, A1, 0x10
lui   AT, hi(D_8011E3B8)
addu  AT, AT, V0
lwc1  F0, lo(D_8011E3B8)(AT)
trunc.w.s F2, F0
mfc1  A2, F2
      NOP
sll   A2, A2, 0x10
lui   AT, hi(D_8011E394)
addu  AT, AT, V0
lwc1  F0, lo(D_8011E394)(AT)
trunc.w.s F2, F0
mfc1  A3, F2
      NOP
sll   A3, A3, 0x10
lui   AT, hi(D_8011E398)
addu  AT, AT, V0
lwc1  F0, lo(D_8011E398)(AT)
trunc.w.s F2, F0
mfc1  V0, F2
      NOP
sll   V0, V0, 0x10
sra   V0, V0, 0x10
sw    V0, 0x10(SP)
li    V0, 5
sw    V0, 0x14(SP)
li    A0, -1
sra   A1, A1, 0x10
sra   A2, A2, 0x10
jal   func_8010FB54
 sra   A3, A3, 0x10
move  A0, S0
jal   0x8004ED30
 move  A1, V0
jal   0x8004EE18
 li    S0, 6
lb    A1, 0xf(S6)
jal   0x8004ACE0
 li    A0, 628
lb    A0, 0xf(S6)
li    A1, 5
jal   0x800DA09C
 li    A2, 49
li    A0, -1
li    A1, 5
jal   0x800F2304
 move  A2, R0
jal   SleepProcess
 li    A0, 50
lb    A0, 0xf(S6)
li    V0, 2
sw    V0, 0x10(SP)
li    A1, -1
move  A2, R0
jal   0x800F2388
 li    A3, 10
jal   SleepProcess
 li    A0, 11
lui   V0, hi(CORE_80101734)
lw    V0, lo(CORE_80101734)(V0)
L8011823C:
addiu S0, S0, -1
bnez  S0, L8011823C
 addiu V0, V0, 4
lb    A0, 0xf(S6)
lhu   A2, 2(V0)
jal   0x800DA09C
 li    A1, 5
jal   0x800D9B54
 move  A0, S4
sll   V0, S1, 3
subu  V0, V0, S1
sll   V0, V0, 3
lui   A2, hi(p1_char)
addu  A2, A2, V0
lbu   A2, lo(p1_char)(A2)
lb    V1, 0xf(S6)
sll   V0, V1, 3
subu  V0, V0, V1
sll   V0, V0, 3
lui   A3, hi(p1_char)
addu  A3, A3, V0
lbu   A3, lo(p1_char)(A3)
sw    R0, 0x10(SP)
sw    R0, 0x14(SP)
sw    R0, 0x18(SP)
li    A0, -1
li    A1, 0x3A0D
addiu A2, A2, 0x1c00
jal   0x800EC8EC ; ShowMessage: "_s item now belongs to _"
 addiu A3, A3, 0x1c00
jal   0x800EC6C8
       NOP
jal   0x800EC6EC
       NOP
jal   func_80110024
       NOP
L801182CC:
lw    RA, 0x8c(SP)
lw    S6, 0x88(SP)
lw    S5, 0x84(SP)
lw    S4, 0x80(SP)
lw    S3, 0x7c(SP)
lw    S2, 0x78(SP)
lw    S1, 0x74(SP)
lw    S0, 0x70(SP)
ldc1  F28, 0xb0(SP)
ldc1  F26, 0xa8(SP)
ldc1  F24, 0xa0(SP)
ldc1  F22, 0x98(SP)
ldc1  F20, 0x90(SP)
jr    RA
 addiu SP, SP, 0xb8

; Shared happening space event.
; Needs to exist and end the process, so that duels on happenings work.
shared_happening_event:
addiu SP, SP, -0x18
sw    RA, 0x10(SP)
jal   EndProcess
move  A0, R0
jr    RA
addiu SP, SP, 0x18

overlaycall4:
addiu SP, SP, -0x18
sw    RA, 0x10(SP)
jal   InitCameras
 li    A0, 2
lui   A1, hi(data_screen_dimensions)
addiu A1, A1, lo(data_screen_dimensions)
jal   0x800124BC
 li    A0, 1
jal   setup_routine
       NOP
jal   0x800FF41C
 li    A0, 2
lui   A0, hi(${show_next_star_fn})
addiu A0, A0, lo(${show_next_star_fn})
li    A1, 4101
li    A2, 4096
jal   InitProcess
 move  A3, R0
lw    RA, 0x10(SP)
jr    RA
 addiu SP, SP, 0x18

func_8011C5E0:
addiu SP, SP, -0x20
sw    RA, 0x1c(SP)
sw    S2, 0x18(SP)
sw    S1, 0x14(SP)
sw    S0, 0x10(SP)
move  S0, R0
jal   GetCurrentPlayerIndex
 li    S1, 99
sll   V0, V0, 0x10
sra   S2, V0, 0x10
L8011C608:
jal   GetCurrentPlayerIndex
       NOP
sll   V0, V0, 0x10
sra   V0, V0, 0x10
beql  S0, V0, L8011C668
 addiu S0, S0, 1
jal   0x800DA778
 move  A0, S0
lui   A0, hi(D_8011F0E4)
jal   0x800DA190
 addiu A0, A0, lo(D_8011F0E4)
sll   V0, V0, 0x10
bnezl V0, L8011C668
 addiu S0, S0, 1
jal   0x800EE9C0
 move  A0, S0
slt   V0, V0, S1
beql  V0, R0, L8011C668
 addiu S0, S0, 1
jal   0x800EE9C0
 move  A0, S0
move  S1, V0
move  S2, S0
addiu S0, S0, 1
L8011C668:
slti  V0, S0, 4
bnez  V0, L8011C608
 move  V0, S2
lw    RA, 0x1c(SP)
lw    S2, 0x18(SP)
lw    S1, 0x14(SP)
lw    S0, 0x10(SP)
jr    RA
 addiu SP, SP, 0x20

func_8011C68C:
addiu SP, SP, -0x20
sw    RA, 0x1c(SP)
sw    S2, 0x18(SP)
sw    S1, 0x14(SP)
jal   GetCurrentPlayerIndex
 sw    S0, 0x10(SP)
sll   V0, V0, 0x10
lui   A0, hi(D_8011F2F4)
addiu A0, A0, lo(D_8011F2F4)
jal   0x800DA190
 sra   S2, V0, 0x10
sll   V0, V0, 0x10
beqz  V0, L8011C738
 move  V0, S2
move  S0, R0
li    S1, 99
L8011C6CC:
jal   GetCurrentPlayerIndex
       NOP
sll   V0, V0, 0x10
sra   V0, V0, 0x10
beql  S0, V0, L8011C72C
 addiu S0, S0, 1
jal   0x800DA778
 move  A0, S0
lui   A0, hi(D_8011F600)
jal   0x800DA190
 addiu A0, A0, lo(D_8011F600)
sll   V0, V0, 0x10
bnezl V0, L8011C72C
 addiu S0, S0, 1
jal   0x800EE9C0
 move  A0, S0
slt   V0, V0, S1
beql  V0, R0, L8011C72C
 addiu S0, S0, 1
jal   0x800EE9C0
 move  A0, S0
move  S1, V0
move  S2, S0
addiu S0, S0, 1
L8011C72C:
slti  V0, S0, 4
bnez  V0, L8011C6CC
 move  V0, S2
L8011C738:
lw    RA, 0x1c(SP)
lw    S2, 0x18(SP)
lw    S1, 0x14(SP)
lw    S0, 0x10(SP)
jr    RA
 addiu SP, SP, 0x20

func_8011C750:
addiu SP, SP, -0x18
sw    RA, 0x14(SP)
sw    S0, 0x10(SP)
lui   S0, hi(total_turns)
lb    S0, lo(total_turns)(S0)
lui   V0, hi(current_turn)
lb    V0, lo(current_turn)(V0)
subu  S0, S0, V0
addiu S0, S0, 1
jal   PlayerHasEmptyItemSlot
 li    A0, -1
move  V1, V0
li    V0, -1
beql  V1, V0, L8011C78C
 li    V1, 3
L8011C78C:
slt   V0, V1, S0
xori  V0, V0, 1
lw    RA, 0x14(SP)
lw    S0, 0x10(SP)
jr    RA
 addiu SP, SP, 0x18

func_8011C7A4:
addiu SP, SP, -0x18
sw    RA, 0x14(SP)
sw    S0, 0x10(SP)
move  T2, A0
li    S0, 1
move  A2, R0
lui   T0, hi(current_player_index)
lb    T0, lo(current_player_index)(T0)
lui   T1, hi(p1_item1)
addiu T1, T1, lo(p1_item1)
L8011C7CC:
beq   A2, T0, L8011C824
 move  A0, R0
sll   V0, A2, 3
subu  V0, V0, A2
sll   V0, V0, 3
addu  A3, V0, T1
addu  V0, A3, A0
L8011C7E8:
lb    V0, 0(V0)
xori  V1, V0, 6
sltiu V1, V1, 1
xori  V0, V0, 0x10
sltiu V0, V0, 1
or    V1, V1, V0
bnez  V1, L8011C81C
 slti  V0, A0, 3
addiu A0, A0, 1
slti  V0, A0, 3
bnez  V0, L8011C7E8
 addu  V0, A3, A0
slti  V0, A0, 3
L8011C81C:
bnez  V0, L8011C834
 slti  V0, A2, 4
L8011C824:
addiu A2, A2, 1
slti  V0, A2, 4
bnez  V0, L8011C7CC
       NOP
L8011C834:
beqz  V0, L8011C878
 sll   V0, A2, 3
subu  V0, V0, A2
sll   V0, V0, 3
lui   A0, hi(p1_cpu_difficulty)
addu  A0, A0, V0
lbu   A0, lo(p1_cpu_difficulty)(A0)
mult  A1, A0
mflo  A0
addu  A0, T2, A0
sll   A0, A0, 0x18
jal   RNGPercentChance
 sra   A0, A0, 0x18
sll   V0, V0, 0x10
sltiu V0, V0, 1
subu  V0, R0, V0
and   S0, V0, S0
L8011C878:
move  V0, S0
lw    RA, 0x14(SP)
lw    S0, 0x10(SP)
jr    RA
 addiu SP, SP, 0x18

D_8011C88C:
addiu SP, SP, -0x48
sw    RA, 0x40(SP)
sw    S7, 0x3c(SP)
sw    S6, 0x38(SP)
sw    S5, 0x34(SP)
sw    S4, 0x30(SP)
sw    S3, 0x2c(SP)
sw    S2, 0x28(SP)
sw    S1, 0x24(SP)
jal   GetCurrentPlayerIndex
 sw    S0, 0x20(SP)
sll   V0, V0, 0x10
sra   S0, V0, 0x10
lui   S2, hi(CORE_800CD058)
addiu S2, S2, lo(CORE_800CD058)
lhu   V0, 0x50(S2)
andi  V0, V0, 1
bnez  V0, L8011CE68
 li    V0, -1
move  S1, R0
li    S3, -1
sll   V0, S0, 3
subu  V0, V0, S0
sll   V0, V0, 3
lui   S4, hi(p1_item1)
addiu S4, S4, lo(p1_item1)
addu  S6, V0, S4
sll   S7, S0, 3
subu  S7, S7, S0
lui   S5, hi(CORE_80100FA8)
addiu S5, S5, lo(CORE_80100FA8)
sll   V0, S1, 2
L8011C90C:
addiu V1, SP, 0x10
addu  V0, V0, V1
sw    S3, 0(V0)
addu  V0, S6, S1
lb    A2, 0(V0)
addiu V1, A2, 1
sltiu V0, V1, 0x14
beqz  V0, L8011CDA0
 sll   V0, V1, 2
lui   AT, hi(D_8011FA20_jump_table)
addu  AT, AT, V0
lw    V0, lo(D_8011FA20_jump_table)(AT)
jr    V0
       NOP
L8011C944:
move  A0, R0
move  V1, R0
addu  V0, S6, A0
L8011C950:
lb    V0, 0(V0)
xor   V0, V0, A2
sltiu V0, V0, 1
addu  V1, V1, V0
addiu A0, A0, 1
slti  V0, A0, 3
bnez  V0, L8011C950
 addu  V0, S6, A0
j     L8011CD98
 slti  V0, V1, 2
L8011C978:
lb    V1, 2(S2)
lb    V0, 3(S2)
bne   V1, V0, L8011C998
       NOP
jal   0x800EEA58
 lb    A0, 0xf(S2)
bnez  V0, L8011CDA4
 sll   V1, S1, 2
L8011C998:
lb    V0, 2(S2)
lb    V1, 3(S2)
subu  V0, V0, V1
slti  V0, V0, 6
bnezl V0, L8011CDCC
 addiu S1, S1, 1
lb    A0, 0xf(S2)
jal   0x800EEA58
       NOP
beqz  V0, L8011CDA4
 sll   V1, S1, 2
j     L8011CDCC
 addiu S1, S1, 1
L8011C9CC:
jal   func_8011C750
       NOP
bnez  V0, L8011CDA4
 sll   V1, S1, 2
j     L8011CBAC
 li    A0, 80
L8011C9E4:
sll   V0, S7, 3
lui   AT, hi(p1_coins)
addu  AT, AT, V0
lh    V0, lo(p1_coins)(AT)
beqz  V0, L8011CDA0
 move  A0, R0
L8011C9FC:
beq   A0, S0, L8011CA20
 sll   V0, A0, 3
subu  V0, V0, A0
sll   V0, V0, 3
lui   AT, hi(p1_coins)
addu  AT, AT, V0
lh    V0, lo(p1_coins)(AT)
beqz  V0, L8011CA30
 slti  V0, A0, 4
L8011CA20:
addiu A0, A0, 1
slti  V0, A0, 4
bnez  V0, L8011C9FC
       NOP
L8011CA30:
beqz  V0, L8011CDA4
 sll   V1, S1, 2
jal   RNGPercentChance
 li    A0, 70
j     L8011CD64
 sll   V0, V0, 0x10
L8011CA48:
jal   func_8011C750
       NOP
bnez  V0, L8011CDA4
 sll   V1, S1, 2
lui   A0, hi(D_8011EB98)
j     L8011CD8C
 addiu A0, A0, lo(D_8011EB98)
L8011CA64:
jal   func_8011C750
       NOP
bnez  V0, L8011CDA4
 sll   V1, S1, 2
lui   A0, hi(D_8011EBEC)
j     L8011CD8C
 addiu A0, A0, lo(D_8011EBEC)
L8011CA80:
lui   A0, hi(D_8011EE38)
j     L8011CD8C
 addiu A0, A0, lo(D_8011EE38)
L8011CA8C:
lui   A0, hi(D_8011F18C)
jal   0x800DA190
 addiu A0, A0, lo(D_8011F18C)
sll   V0, V0, 0x10
bnezl V0, L8011CDCC
 addiu S1, S1, 1
jal   func_8011C5E0
       NOP
lui   AT, hi(D_8011FBBC)
sw    V0, lo(D_8011FBBC)(AT)
lui   V1, hi(CORE_800CD0AE)
lh    V1, lo(CORE_800CD0AE)(V1)
srav  V1, V1, V0
andi  V1, V1, 1
bnezl V1, L8011CDCC
 addiu S1, S1, 1
j     L8011CDA4
 sll   V1, S1, 2
L8011CAD4:
lui   A0, hi(D_8011F4EC)
jal   0x800DA190
 addiu A0, A0, lo(D_8011F4EC)
sll   V0, V0, 0x10
bnezl V0, L8011CDCC
 addiu S1, S1, 1
jal   func_8011C68C
       NOP
lui   AT, hi(D_8011FBB8)
sw    V0, lo(D_8011FBB8)(AT)
sll   V1, V0, 3
subu  V1, V1, V0
sll   V1, V1, 3
lui   V0, hi(p1_status_flags)
addu  V0, V0, V1
lbu   V0, lo(p1_status_flags)(V0)
j     L8011CD98
 andi  V0, V0, 0x80
L8011CB1C:
move  A0, R0
move  A2, R0
lui   AT, hi(D_8011FB74)
sw    S3, lo(D_8011FB74)(AT)
L8011CB2C:
beq   A0, S0, L8011CB84
 sll   V0, A0, 3
move  A1, R0
subu  V0, V0, A0
sll   V0, V0, 3
addu  A3, V0, S4
addu  V0, A3, A1
L8011CB48:
lb    V0, 0(V0)
beq   V0, S3, L8011CB74
 sll   V0, V0, 2
addu  V0, V0, S5
lw    V1, 0(V0)
slt   V0, A2, V1
beql  V0, R0, L8011CB78
 addiu A1, A1, 1
move  A2, V1
lui   AT, hi(D_8011FB74)
sw    A0, lo(D_8011FB74)(AT)
L8011CB74:
addiu A1, A1, 1
L8011CB78:
slti  V0, A1, 3
bnez  V0, L8011CB48
 addu  V0, A3, A1
L8011CB84:
addiu A0, A0, 1
slti  V0, A0, 4
bnez  V0, L8011CB2C
       NOP
lui   V0, hi(D_8011FB74)
lw    V0, lo(D_8011FB74)(V0)
beq   V0, S3, L8011CDC8
 slti  V0, A2, 4
beqz  V0, L8011CDA0
 li    A0, 5
L8011CBAC:
jal   RNGPercentChance
       NOP
sll   V0, V0, 0x10
beql  V0, R0, L8011CDCC
 addiu S1, S1, 1
j     L8011CDA4
 sll   V1, S1, 2
L8011CBC8:
move  A0, R0
move  A2, R0
L8011CBD0:
beql  A0, S1, L8011CC0C
 addiu A0, A0, 1
lb    V1, 0xf(S2)
sll   V0, V1, 3
subu  V0, V0, V1
sll   V0, V0, 3
addu  V0, V0, S4
addu  V0, V0, A0
lb    V0, 0(V0)
beq   V0, S3, L8011CC08
 sll   V0, V0, 2
addu  V0, V0, S5
lw    V0, 0(V0)
addu  A2, A2, V0
L8011CC08:
addiu A0, A0, 1
L8011CC0C:
slti  V0, A0, 3
bnez  V0, L8011CBD0
       NOP
move  A0, R0
lui   AT, hi(D_8011FB70)
sw    S3, lo(D_8011FB70)(AT)
L8011CC24:
beq   A0, S0, L8011CC84
 move  V1, R0
move  A1, R0
sll   V0, A0, 3
subu  V0, V0, A0
sll   V0, V0, 3
addu  A3, V0, S4
addu  V0, A3, A1
L8011CC44:
lb    V0, 0(V0)
beq   V0, S3, L8011CC5C
 sll   V0, V0, 2
addu  V0, V0, S5
lw    V0, 0(V0)
addu  V1, V1, V0
L8011CC5C:
addiu A1, A1, 1
slti  V0, A1, 3
bnez  V0, L8011CC44
 addu  V0, A3, A1
slt   V0, A2, V1
beql  V0, R0, L8011CC88
 addiu A0, A0, 1
lui   AT, hi(D_8011FB70)
sw    A0, lo(D_8011FB70)(AT)
move  A2, V1
L8011CC84:
addiu A0, A0, 1
L8011CC88:
slti  V0, A0, 4
bnez  V0, L8011CC24
       NOP
lui   V0, hi(D_8011FB70)
lw    V0, lo(D_8011FB70)(V0)
beql  V0, S3, L8011CDCC
 addiu S1, S1, 1
j     L8011CDA4
 sll   V1, S1, 2
L8011CCAC:
li    A0, 50
jal   func_8011C7A4
 li    A1, 10
beqz  V0, L8011CDA0
 sll   V0, S0, 3
subu  V0, V0, S0
sll   V0, V0, 3
lui   AT, hi(p1_coins)
addu  AT, AT, V0
lh    V0, lo(p1_coins)(AT)
j     L8011CD98
 slti  V0, V0, 5
L8011CCDC:
lb    V1, 2(S2)
lb    V0, 3(S2)
beq   V1, V0, L8011CDC8
 sll   V0, S0, 3
subu  V0, V0, S0
sll   V0, V0, 3
lui   AT, hi(p1_coins)
addu  AT, AT, V0
lh    V0, lo(p1_coins)(AT)
j     L8011CD98
 slti  V0, V0, 5
L8011CD08:
li    A0, 60
jal   func_8011C7A4
 li    A1, 10
beqz  V0, L8011CDA0
 sll   V0, S0, 3
subu  V0, V0, S0
sll   V0, V0, 3
lui   AT, hi(p1_coins)
addu  AT, AT, V0
lh    V0, lo(p1_coins)(AT)
slti  V0, V0, 0x14
bnezl V0, L8011CDCC
 addiu S1, S1, 1
lui   A0, hi(D_8011EFA0)
j     L8011CD8C
 addiu A0, A0, lo(D_8011EFA0)
L8011CD48:
sll   V0, S0, 3
subu  V0, V0, S0
sll   V0, V0, 3
lui   AT, hi(p1_coins)
addu  AT, AT, V0
lh    V0, lo(p1_coins)(AT)
slti  V0, V0, 0xa
L8011CD64:
beqz  V0, L8011CDA4
 sll   V1, S1, 2
jal   func_8011C750
       NOP
beql  V0, R0, L8011CDCC
 addiu S1, S1, 1
j     L8011CDA4
 sll   V1, S1, 2
L8011CD84:
lui   A0, hi(D_8011F66C)
addiu A0, A0, lo(D_8011F66C)
L8011CD8C:
jal   0x800DA190
       NOP
sll   V0, V0, 0x10
L8011CD98:
bnezl V0, L8011CDCC
 addiu S1, S1, 1
L8011CDA0:
sll   V1, S1, 2
L8011CDA4:
addiu V0, SP, 0x10
addu  V1, V1, V0
sll   V0, S0, 3
subu  V0, V0, S0
sll   V0, V0, 3
addu  V0, V0, S4
addu  V0, V0, S1
lb    V0, 0(V0)
sw    V0, 0(V1)
L8011CDC8:
addiu S1, S1, 1
L8011CDCC:
slti  V0, S1, 3
bnez  V0, L8011C90C
 sll   V0, S1, 2
move  S1, R0
move  A0, R0
move  A1, R0
addiu A3, SP, 0x10
li    T2, -1
li    T1, 18
lui   T0, hi(CORE_80100FF4)
addiu T0, T0, lo(CORE_80100FF4)
sll   V0, A1, 2
L8011CDFC:
addu  V0, V0, A3
lw    A2, 0(V0)
beql  A2, T2, L8011CE50
 addiu A1, A1, 1
lb    V1, 2(S2)
lb    V0, 3(S2)
bne   V1, V0, L8011CE24
 sll   V0, A1, 2
beql  A2, T1, L8011CE68
 move  V0, A1
L8011CE24:
addu  V0, V0, A3
lw    V0, 0(V0)
sll   V0, V0, 2
addu  V0, V0, T0
lw    V1, 0(V0)
slt   V0, S1, V1
beql  V0, R0, L8011CE50
 addiu A1, A1, 1
move  A0, A1
move  S1, V1
addiu A1, A1, 1
L8011CE50:
slti  V0, A1, 3
bnezl V0, L8011CDFC
 sll   V0, A1, 2
beqz  S1, L8011CE68
 li    V0, -1
move  V0, A0
L8011CE68:
lw    RA, 0x40(SP)
lw    S7, 0x3c(SP)
lw    S6, 0x38(SP)
lw    S5, 0x34(SP)
lw    S4, 0x30(SP)
lw    S3, 0x2c(SP)
lw    S2, 0x28(SP)
lw    S1, 0x24(SP)
lw    S0, 0x20(SP)
jr    RA
 addiu SP, SP, 0x48

func_8011CE94:
addiu SP, SP, -0x40
sw    RA, 0x3c(SP)
sw    FP, 0x38(SP)
sw    S7, 0x34(SP)
sw    S6, 0x30(SP)
sw    S5, 0x2c(SP)
sw    S4, 0x28(SP)
sw    S3, 0x24(SP)
sw    S2, 0x20(SP)
sw    S1, 0x1c(SP)
sw    S0, 0x18(SP)
lui   S4, hi(CORE_800CD058)
addiu S4, S4, lo(CORE_800CD058)
jal   GetPlayerStruct
 li    A0, -1
move  S3, V0
li    A2, 1
sw    A2, 0x14(SP)
move  S1, R0
lui   S7, hi(D_8011F7E0)
addiu S7, S7, lo(D_8011F7E0)
li    S6, -1
lui   S5, hi(D_8011F880)
addiu S5, S5, lo(D_8011F880)
L8011CEF4:
lbu   V0, 3(S3)
sll   V0, V0, 2
addu  V0, V0, S7
lw    V0, 0(V0)
addu  V0, V0, S1
lbu   S0, 0(V0)
jal   func_8010B394
 move  A0, S0
move  S2, V0
beql  S2, S6, L8011CF84
 addiu S1, S1, 1
lui   A0, hi(CORE_80100F94)
addu  A0, A0, S0
lbu   A0, lo(CORE_80100F94)(A0)
addiu A0, A0, 0x14
lb    V1, 0xf(S4)
sll   V0, V1, 3
subu  V0, V0, V1
sll   V0, V0, 3
lui   AT, hi(p1_coins)
addu  AT, AT, V0
lh    V0, lo(p1_coins)(AT)
slt   V0, V0, A0
bnezl V0, L8011CF84
 addiu S1, S1, 1
lbu   V0, 3(S3)
sll   V0, V0, 2
addu  V0, V0, S5
lw    V0, 0(V0)
addu  V0, V0, S1
jal   RNGPercentChance
 lb    A0, 0(V0)
sll   V0, V0, 0x10
bnez  V0, L8011CF90
 li    V0, 16
addiu S1, S1, 1
L8011CF84:
slti  V0, S1, 0x10
bnez  V0, L8011CEF4
 li    V0, 16
L8011CF90:
beql  S1, V0, L8011CF98
 li    S2, -1
L8011CF98:
li    V0, -1
beq   S2, V0, L8011D028
       NOP
jal   func_8010B394
 li    A0, 14
beq   V0, S2, L8011D1C8
 addiu V0, S2, 1
jal   func_8010B394
 li    A0, 11
bne   V0, S2, L8011CFF8
       NOP
lui   A0, hi(CORE_80100F9F)
lbu   A0, lo(CORE_80100F9F)(A0)
addiu A0, A0, 0x32
lb    V1, 0xf(S4)
sll   V0, V1, 3
subu  V0, V0, V1
sll   V0, V0, 3
lui   AT, hi(p1_coins)
addu  AT, AT, V0
lh    V0, lo(p1_coins)(AT)
slt   V0, V0, A0
beqz  V0, L8011D1C8
 addiu V0, S2, 1
L8011CFF8:
jal   func_8010B394
 li    A0, 4
bne   V0, S2, L8011D028
       NOP
lb    A0, 0xf(S4)
jal   PlayerHasItem
 li    A1, ITEM_CELLULAR_SHOPPER
li    V1, -1
beq   V0, V1, L8011D028
       NOP
li    S2, -1
sw    R0, 0x14(SP)
L8011D028:
lui   V0, hi(D_8011E1D8)
lw    V0, lo(D_8011E1D8)(V0)
sll   V0, V0, 2
lui   A0, hi(D_8011F8A0)
addu  A0, A0, V0
jal   0x800DA190
 lw    A0, lo(D_8011F8A0)(A0)
sll   V0, V0, 0x10
bnez  V0, L8011D09C
 li    V0, -1
lb    V1, 0xf(S4)
sll   V0, V1, 3
subu  V0, V0, V1
sll   V0, V0, 3
lui   AT, hi(p1_coins)
addu  AT, AT, V0
lh    V0, lo(p1_coins)(AT)
lui   V1, hi(CORE_80100F95)
lbu   V1, lo(CORE_80100F95)(V1)
slt   V0, V0, V1
bnez  V0, L8011D09C
 li    V0, -1
jal   func_8010B394
 li    A0, 1
move  V1, V0
li    V0, -1
bne   V1, V0, L8011D1C8
 addiu V0, V1, 1
li    V0, -1
L8011D09C:
bne   S2, V0, L8011D1C8
 addiu V0, S2, 1
lui   V0, hi(D_8011E1D8)
lw    V0, lo(D_8011E1D8)(V0)
sll   V0, V0, 2
lui   A0, hi(D_8011F8A8)
addu  A0, A0, V0
jal   0x800DA190
 lw    A0, lo(D_8011F8A8)(A0)
sll   V0, V0, 0x10
sra   S1, V0, 0x10
bnez  S1, L8011D194
       NOP
lui   FP, hi(D_8011F7E0)
addiu FP, FP, lo(D_8011F7E0)
lw    A2, 0x14(SP)
sltiu S5, A2, 1
li    S7, -1
lui   S6, hi(D_8011F880)
addiu S6, S6, lo(D_8011F880)
L8011D0EC:
lbu   V0, 3(S3)
sll   V0, V0, 2
addu  V0, V0, FP
lw    V0, 0(V0)
addu  V0, V0, S1
lbu   S0, 0(V0)
xori  V0, S0, 4
sltiu V0, V0, 1
and   V0, V0, S5
bnezl V0, L8011D188
 addiu S1, S1, 1
jal   func_8010B394
 move  A0, S0
move  S2, V0
beql  S2, S7, L8011D188
 addiu S1, S1, 1
lui   A0, hi(CORE_80100F94)
addu  A0, A0, S0
lbu   A0, lo(CORE_80100F94)(A0)
lb    V1, 0xf(S4)
sll   V0, V1, 3
subu  V0, V0, V1
sll   V0, V0, 3
lui   AT, hi(p1_coins)
addu  AT, AT, V0
lh    V0, lo(p1_coins)(AT)
slt   V0, V0, A0
bnezl V0, L8011D188
 addiu S1, S1, 1
lbu   V0, 3(S3)
sll   V0, V0, 2
addu  V0, V0, S6
lw    V0, 0(V0)
addu  V0, V0, S1
jal   RNGPercentChance
 lb    A0, 0(V0)
sll   V0, V0, 0x10
bnez  V0, L8011D1C4
 addiu S1, S1, 1
L8011D188:
slti  V0, S1, 0x10
bnez  V0, L8011D0EC
       NOP
L8011D194:
jal   func_8010B394
 move  A0, R0
move  S2, V0
li    V0, -1
bnel  S2, V0, L8011D1C8
 addiu V0, S2, 1
li    V0, 1
lui   AT, hi(D_8011F75C)
jal   func_8010B41C
 sw    V0, lo(D_8011F75C)(AT)
j     L8011D1C8
 addiu V0, V0, 2
L8011D1C4:
addiu V0, S2, 1
L8011D1C8:
lw    RA, 0x3c(SP)
lw    FP, 0x38(SP)
lw    S7, 0x34(SP)
lw    S6, 0x30(SP)
lw    S5, 0x2c(SP)
lw    S4, 0x28(SP)
lw    S3, 0x24(SP)
lw    S2, 0x20(SP)
lw    S1, 0x1c(SP)
lw    S0, 0x18(SP)
jr    RA
 addiu SP, SP, 0x40

func_8011D1F8:
addiu SP, SP, -0x18
sw    RA, 0x10(SP)
lui   V0, hi(D_8011F75C)
lw    V0, lo(D_8011F75C)(V0)
bnezl V0, L8011D23C
 li    V0, 2
lui   V0, hi(D_8011E1D8)
lw    V0, lo(D_8011E1D8)(V0)
sll   V0, V0, 2
lui   A0, hi(D_8011F8B0)
addu  A0, A0, V0
jal   0x800DA190
 lw    A0, lo(D_8011F8B0)(A0)
sll   V0, V0, 0x10
sra   V0, V0, 0x10
j     L8011D244
 addiu V0, V0, 1
L8011D23C:
lui   AT, hi(D_8011F75C)
sw    R0, lo(D_8011F75C)(AT)
L8011D244:
lw    RA, 0x10(SP)
jr    RA
 addiu SP, SP, 0x18

.align 16

; 8011D250
rodata:
overlaycalls:
.word 0x00000000, overlaycall0
.word 0x00010000, overlaycall1
.word 0x00020000, overlaycall2
.word 0x00030000, overlaycall3
.word 0x00040000, overlaycall4
.word 0xFFFF0000, 0x00000000

.align 4
shuffle_order:
.halfword ${shuffleData.order.join(",")}

.align 4
shuffle_bias:
.halfword ${shuffleData.bias.join(",")}

.align 4
D_8011D2A0:
.halfword 0x6 0x7 0x8 0x9 0xA 0xB 0xC 0xD

.align 4
star_space_indices:
.halfword ${starIndices.join(",") || 0}

.align 4
; toad spaces
D_8011D2C0:
.halfword ${toadIndices.join(",") || 0}

.align 4
; dir/file of various tumble face textures
D_8011D2D0:
tumble_face_tex_grin:
.halfword 0xA 0x7E
tumble_face_tex_frown:
.halfword 0xA 0x7F
tumble_face_tex_sad:
.halfword 0xA 0x80
tumble_face_tex_smile:
.halfword 0xA 0x81
tumble_face_tex_despair:
.halfword 0xA 0x82
tumble_face_tex_gasp:
.halfword 0xA 0x83
tumble_face_tex_beaming:
.halfword 0xA 0x84

D_8011D2EC:
.word 0x00005E02
.word 0x00005E03
.word 0x00005E04
.word 0x00005E05
.word 0x00005E06
.word 0x00005E07
.word 0x00005E08

; used in star celebration?
D_8011D308:
.word 0x00000000

D_8011D30C:
.word 0x00000000

D_8011D310:
.word 0xBF800000

D_8011D314:
.word 0x00000000

D_8011D318:
.word 0x00000000

; passed as addr, may be u16
; is this the array of hidden block banned spaces?
D_8011D31C:
.word 0xFFFF0000

.align 4
; star spaces 2
D_8011D320:
.halfword ${starIndices.join(",")} 0xFFFF

.align 4
; interleaving array?
D_8011D334: .halfword 0x7
D_8011D336: .halfword 0xFFFF
.halfword 0x0001 0xFFFA
.halfword 0x0001 0xFFF9
.halfword 0x0001 0xFFF9
.halfword 0xFFFB 0xFFFB
.halfword 0x0002 0xFFF9
.halfword 0x0001 0xFFF9
.halfword 0xFFFC 0xFFF7

; boo
D_8011D354: .halfword 2
D_8011D356: .halfword 0
D_8011D358: .halfword 2
.align 4

; used with bank, interleaving arrays?
D_8011D35C: .halfword 0x0001
D_8011D35E: .halfword 0xFFFE
.halfword 0x0000 0xFFFC

D_8011D364: .halfword 0x0001
D_8011D366: .halfword 0xFFFC
.halfword 0x0005 0x0000

D_8011D36C: .halfword 0x0000
D_8011D36E: .halfword 0x0000
.halfword 0x00000 0xFFFD

; gate neighbors
gate_entrance_spaces:
.halfword ${gateEventInfos[0].gateEntryIndex}
gate_exit_spaces:
.halfword ${gateEventInfos[0].gateExitIndex}
.halfword ${gateEventInfos[1].gateEntryIndex}
.halfword ${gateEventInfos[1].gateExitIndex}

.align 4
; toad spaces 2
D_8011D37C:
.halfword ${toadIndices.join(",") || 0}

.align 4
D_8011D38C:
.halfword 0x06 0x07 0x08 0x09 0x0A 0x0B 0x0C 0x0D

.align 4
boo_space_indices:
.halfword ${booIndex}

.align 4
bank_coin_space_indices:
.halfword ${bankCoinSpaces.join(",")}

.align 4
; bank coin coordinates?
D_8011D3A4: .word 0xC0400000
D_8011D3A8: .word 0x00000000
D_8011D3AC: .word 0xC0000000
D_8011D3B0: .word 0x00000000
D_8011D3B4: .word 0x40000000
D_8011D3B8: .word 0x40000000
D_8011D3BC: .word 0x3F800000
D_8011D3C0: .word 0x40B00000
D_8011D3C4: .word 0xC0400000
D_8011D3C8: .word 0x40600000
D_8011D3CC: .word 0x41000000
D_8011D3D0: .word 0x40800000
D_8011D3D4: .word 0xBF800000
D_8011D3D8: .word 0x41400000
D_8011D3DC: .word 0x41300000

D_8011D3E0: .word 0x00000000
D_8011D3E4: .word 0x00000000

D_8011D3E8: .word 0x00000000
D_8011D3EC: .word 0x00000000
D_8011D3F0: .word 0x00000000
D_8011D3F4: .word 0x00000000
D_8011D3F8: .word 0xC1700000
D_8011D3FC: .word 0x00000000
D_8011D400: .word 0x00000000
D_8011D404: .word 0x41A00000
D_8011D408: .word 0x00000000
D_8011D40C: .word 0xC1F00000
D_8011D410: .word 0x42340000
D_8011D414: .word 0x00000000
D_8011D418: .word 0x42340000

.align 4
gate_spaces:
.halfword ${gateEventInfos.map(info => info.gateSpaceIndex).join(",")}

.align 16
; indices into a list of main fs models
; for the gate graphics. Don't change.
D_8011D420: .byte 0x00
D_8011D421: .byte 0x26
.halfword 0x27
D_8011D424: .halfword 0x28 0x29
D_8011D428: .halfword 0x2A 0x2B

; MTNX files for each gate type.
D_8011D42C:
.word 0x00000001 0x00130163
D_8011D434:
.word 0x00000001 0x00130168
D_8011D43C:
.word 0x00000001 0x0013016F
D_8011D444:
.word 0x00000001 0x00130176
D_8011D44C:
.word 0x00000001 0x00130180
D_8011D454:
.word 0x00000001 0x00130184

D_8011D45C:
.word D_8011D42C
.word D_8011D434
.word D_8011D43C
.word D_8011D444
.word D_8011D44C
.word D_8011D454

; sound that plays when the gate opens. 0x148 is raw sound 0x7E.
D_8011D474:
.word 0x00000148
.word 0x00000148
.word 0x00000148
.word 0x00000148
.word 0x00000148
.word 0x00000148

D_8011D48C: .word 0xFFFFFFFF
D_8011D490: .word 0xFFFFFFFF
D_8011D494: .word 0xFFFFFFFF
D_8011D498: .halfword 0xFFFF
D_8011D49A: .halfword 0xFFFF
D_8011D49C: .word 0xFFFFFFFF
D_8011D4A0: .word 0xFFFFFFFF
D_8011D4A4: .word 0xFFFFFFFF
D_8011D4A8: .word 0xFFFFFFFF
D_8011D4AC: .word 0xFFFFFFFF
D_8011D4B0: .word 0xFFFFFFFF
D_8011D4B4: .word 0xFFFFFFFF
D_8011D4B8: .word 0xFFFFFFFF

D_8011D4BC: .word 0xFFFFFFFF
D_8011D4C0: .word 0xFFFFFFFF
D_8011D4C4: .word 0xFFFFFFFF
D_8011D4C8: .word 0xFFFFFFFF
D_8011D4CC: .word 0xFFFFFFFF
D_8011D4D0: .word 0xFFFFFFFF
D_8011D4D4: .word 0xFFFFFFFF
D_8011D4D8: .word 0xFFFFFFFF
D_8011D4DC: .word 0xFFFFFFFF

D_8011D4E0: .word 0xFFFFFFFF
D_8011D4E4: .word 0xFFFFFFFF
D_8011D4E8: .word 0xFFFFFFFF
D_8011D4EC: .word 0xFFFFFFFF
D_8011D4F0: .word 0xFFFFFFFF
D_8011D4F4: .word 0xFFFFFFFF
D_8011D4F8: .word 0xFFFFFFFF
D_8011D4FC: .word 0xFFFFFFFF
D_8011D500: .word 0xFFFFFFFF

.align 4
bank_model_space_indices:
.halfword ${bankSpaces.join(",")}

.align 4
item_shop_model_space_indices:
.halfword ${itemShopSpaces.join(",")}

.align 4
; Koopa Kard usage AI
D_8011E058:
.word 0x04000000 0x00F50014 0x0B541E1E
.word 0x00000000 0x00000000 0x1B541E1E

; bank main fs something
D_8011E070:
.word 0x00000001 0x000A009D

D_8011E088: .word 0x00000000
D_8011E08C: .word 0x01000000
D_8011E090: .word 0x02030404
D_8011E094: .word 0x00000000
D_8011E098: .word 0x01000000
D_8011E09C: .word 0x02030404

D_8011E0A0:
.byte 0x00 0x01 0x04 0x05 0x0A 0x0E 0x13
.byte 0x00 0x01 0x04 0x05 0x0A 0x0C 0x13
.byte 0x00 0x01 0x04 0x05 0x0A 0x13 0xFF
.byte 0x00 0x01 0x04 0x08 0x0A 0x0C 0x13
.byte 0x00 0x01 0x08 0x0A 0x0C 0x0E 0x13
.byte 0x01 0x02 0x03 0x06 0x0D 0x0B 0x13
.byte 0x01 0x02 0x03 0x06 0x09 0x0D 0x13
.byte 0x01 0x02 0x03 0x07 0x0D 0x13 0xFF
.byte 0x01 0x03 0x06 0x07 0x09 0x0D 0x13
.byte 0x01 0x03 0x06 0x07 0x09 0x0B 0x13
.byte 0x00 0x00 ; align 4

D_8011E0E8: .word 0x00000101
D_8011E0EC: .word 0x01020203
D_8011E0F0: .word 0x02030304
D_8011E0F4: .word 0x00000101
D_8011E0F8: .word 0x01020203
D_8011E0FC: .word 0x02030304

D_8011E100: .word 0x1937414C
D_8011E104: .word 0x51565B60
D_8011E108: .word 0x62641E32
D_8011E10C: .word 0x3C464B55
D_8011E110: .word 0x5A5F6164
D_8011E114: .word 0x192D343E
D_8011E118: .word 0x4352585F
D_8011E11C: .word 0x61641423
D_8011E120: .word 0x282D374B
D_8011E124: .word 0x555F6164
D_8011E128: .word 0x0F191E28
D_8011E12C: .word 0x2D46505C
D_8011E130: .word 0x5F642135
D_8011E134: .word 0x44494E53
D_8011E138: .word 0x5D626400
D_8011E13C: .word 0x1928373F
D_8011E140: .word 0x49515B62
D_8011E144: .word 0x64001426
D_8011E148: .word 0x3A444B52
D_8011E14C: .word 0x5A626400
D_8011E150: .word 0x0F233741
D_8011E154: .word 0x484F5561
D_8011E158: .word 0x64000F19
D_8011E15C: .word 0x2D37414B
D_8011E160: .word 0x505F6400

D_8011E164: .word 0x00010405
D_8011E168: .word 0x080A0C0E
D_8011E16C: .word 0x0F100102
D_8011E170: .word 0x03060709
D_8011E174: .word 0x0D0B1101

; 3B is toad, 3D is baby bowser
item_shop_purchase_selection_messages:
.word 0x00003B05
.word 0x00003D05
.word 0x00003B06
.word 0x00003D06
.word 0x00003B07
.word 0x00003D07
.word 0x00003B08
.word 0x00003D08
.word 0x00003B09
.word 0x00003D09

D_8011E1A0:
item_shop_prompt_to_buy_messages:
.word 0x00003B00
.word 0x00003D00

D_8011E1A8:
item_shop_not_enough_coins_messages:
.word 0x00003B01
.word 0x00003D01

D_8011E1B0:
item_shop_already_have_three_items_messages:
.word 0x00003B02
.word 0x00003D02

D_8011E1B8:
item_shop_closed_messages:
.word 0x00003B03
.word 0x00003D03

D_8011E1C0:
item_shop_cancelled_purchase_messages:
.word 0x00003B04
.word 0x00003D04

D_8011E1C8:
.word 0x00000001 0x000A0017

D_8011E1D0:
.word 0x00000001 0x000A00F0

D_8011E1D8:
.word 0

D_8011E1EC: .word 0x42980000
D_8011E1F0: .word 0x42500000
D_8011E1F4: .word 0x43740000
D_8011E1F8: .word 0x42500000
D_8011E1FC: .word 0x42980000
D_8011E200: .word 0x43400000
D_8011E204: .word 0x43740000
D_8011E208: .word 0x43400000
D_8011E20C: .word 0xBF800000

D_8011E210: .word 0xBF800000
D_8011E214: .word 0x3F800000
D_8011E218: .word 0xBF800000
D_8011E21C: .word 0xBF800000
D_8011E220: .word 0x3F800000
D_8011E224: .word 0x3F800000
D_8011E228: .word 0x3F800000

D_8011E22C: .byte 0x01
D_8011E22D: .byte 0x05
D_8011E22E: .byte 0x0F 0x06
D_8011E230: .word 0x0F191019
D_8011E234: .word 0x1B1A231E
D_8011E238: .word 0x242D202E
D_8011E23C: .word 0x32230000

D_8011E240: .byte 0x00
D_8011E241: .byte 0x00
D_8011E242: .byte 0x00 0x01
D_8011E244: .word 0x0A010B0B
D_8011E248: .word 0x040C0E02
D_8011E24C: .word 0x0F0F0410
D_8011E250: .word 0x17031821
D_8011E254: .word 0x04222505
D_8011E258: .word 0x26270228
D_8011E25C: .word 0x31063236
D_8011E260: .word 0x05373F07
D_8011E264: .word 0x40400841
D_8011E268: .word 0xFF090000
D_8011E26C: .word 0x09070401
D_8011E270: .word 0x00000000

D_8011E274: .word 0x00000032
D_8011E278: .word 0x00000050
D_8011E27C: .word 0x00000064

D_8011E280: .word 0x00000001
D_8011E284: .word 0x00000000
D_8011E288: .word 0x00000001
D_8011E28C: .word 0x00000000
D_8011E290: .word 0x00000000
D_8011E294: .word 0x00000001
D_8011E298: .word 0x00000000

D_8011E354: .word 0x43240000
D_8011E358: .word 0x42980000
D_8011E35C: .word 0x430C0000
D_8011E360: .word 0x42980000
D_8011E364: .word 0x43240000
D_8011E368: .word 0x42980000
D_8011E36C: .word 0x430C0000
D_8011E370: .word 0x42980000
D_8011E374: .word 0x43040000
D_8011E378: .word 0x42780000
D_8011E37C: .word 0x435C0000
D_8011E380: .word 0x42780000
D_8011E384: .word 0x43040000
D_8011E388: .word 0x43340000
D_8011E38C: .word 0x435C0000
D_8011E390: .word 0x43340000

D_8011E394: .word 0x43240000
D_8011E398: .word 0x42840000
D_8011E39C: .word 0x43240000
D_8011E3A0: .word 0x42840000
D_8011E3A4: .word 0x43240000
D_8011E3A8: .word 0x42840000
D_8011E3AC: .word 0x43240000
D_8011E3B0: .word 0x42840000

D_8011E3B4: .word 0x43240000

D_8011E3B8: .word 0x42980000
D_8011E3BC: .word 0x43240000
D_8011E3C0: .word 0x42980000
D_8011E3C4: .word 0x43240000
D_8011E3C8: .word 0x42980000
D_8011E3CC: .word 0x43240000
D_8011E3D0: .word 0x42980000

; Message box AI - which shop will you choose?
D_8011E3D4:
.word 0x0D000000 0x00000000 0x0A142850
.word 0x0D000000 0x00000001 0x064C9932
.word 0x0D000000 0x00000002 0x03C78F1E
.word 0x0D000000 0x00000003 0x08D1A346
.word 0x0D000000 0x00000004 0x078F1E3C
.word 0x0D000000 0x00000005 0x064C9932
.word 0x0D000000 0x00000006 0x03C78F1E
.word 0x0D000000 0x00000007 0x078F1E3C
.word 0x00000000 0x00000000 0x064C9932

D_8011E440: .word 0x00000014
D_8011E444: .word 0x0000003C
D_8011E448: .word 0x0000001E
D_8011E44C: .word 0x00000032
D_8011E450: .word 0x00000046

; ai tree for throwing away skeleton key
D_8011E454:
.word 0x00000000 00000000 0x0C993264

D_8011E460: .word 0xC1200000
D_8011E464: .word 0x00000000
D_8011E468: .word 0x41200000
D_8011E46C: .word 0xC0A00000
D_8011E470: .word 0x41200000
D_8011E474: .word 0x40A00000
D_8011E478: .word 0xC0A00000
D_8011E47C: .word 0xC0A00000
D_8011E480: .word 0x41200000
D_8011E484: .word 0x00000000
D_8011E488: .word 0xC0A00000
D_8011E48C: .word 0x40A00000

D_8011E490: .word 0xFFFFFFFF

D_8011E494: .byte 0x43 0x44 0x45 0x00

D_8011E498: .byte 0x14 0x3C 0x64 0x00

D_8011E49C: .halfword 0
D_8011E49E: .halfword 0x32
D_8011E4A0: .word 0x00020050
D_8011E4A4: .word 0x0004005A
D_8011E4A8: .word 0x0008005E
D_8011E4AC: .word 0x00100061
D_8011E4B0: .word 0x00200063
D_8011E4B4: .word 0x00400064

D_8011E4B8: .byte 0xF0
D_8011E4B9: .byte 0xDE
D_8011E4BA: .byte 0x35 0xF7
D_8011E4BC: .byte 0x1A 0x42 0x00 0x00

.align 16
data_screen_dimensions:
.word 00000000
.word 00000000
.word 0x43A00000 ; 320
.word 0x43700000 ; 240

D_8011E8C8:
.word 0x0A000000 0x000C0004 0x0C96A846
.word 0x0A000000 0x000D0002 0x0C96A846
.word 0x0A000000 0x000E0003 0x0C96A846
.word 0x00000000 0x00000000 0x00000000
D_8011E8F8:
.word 0x0C000000 0x0000000A 0x0000001E
.word 0x10000000 0x0000000A D_8011E8C8
.word 0x0C000000 0x00000019 0x0000001E
.word 0x0A000000 0x00010008 0x0C96A846
.word 0x0A000000 0x00100004 0x0C96A846
.word 0x0C000000 0x0000001E 0x0000001E
.word 0x0A000000 0x000A0204 0x0C96A846
.word 0x0C000000 0x00000023 0x0000001E
.word 0x0A000000 0x0005080A 0x0C96A846
.word 0x0A000000 0x00080006 0x0C96A846
.word 0x0A000000 0x000A0001 0x0C96A846
.word 0x0A000000 0x00060000 0x0C96A846
.word 0x00000000 0x00000000 0x00000000
D_8011E994:
.word 0x0C000000 0x00000014 0x0000001E
.word 0x0A000000 0x00010B0C 0x0C96A846
.word 0x0A000000 0x000F0006 0x0C96A846
.word 0x0A000000 0x00030305 0x0C96A846
.word 0x0A000000 0x00040001 0x0C96A846
.word 0x0C000000 0x00000019 0x0000001E
.word 0x0A000000 0x0001040A 0x0C96A846
.word 0x0A000000 0x00100104 0x0C96A846
.word 0x00000000 0x00000000 0x00000000
D_8011EA00:
.word 0x0C000000 0x00000014 0x0000001E
.word 0x0A000000 0x00010B0C 0x0C96A846
.word 0x0A000000 0x000F0609 0x0C96A846
.word 0x0A000000 0x00020006 0x0C96A846
.word 0x0A000000 0x00030005 0x0C96A846
.word 0x0C000000 0x00000019 0x0000001E
.word 0x0A000000 0x0001060A 0x0C96A846
.word 0x0A000000 0x00100304 0x0C96A846
.word 0x00000000 0x00000000 0x00000000
D_8011EA6C:
.word 0x0C000000 0x00000014 0x0000001E
.word 0x0A000000 0x000F0009 0x0C96A846
.word 0x0A000000 0x00020006 0x0C96A846
.word 0x0A000000 0x00030305 0x0C96A846
.word 0x0A000000 0x00040001 0x0C96A846
.word 0x0A000000 0x00050003 0x0C96A846
.word 0x0A000000 0x00070007 0x0C96A846
.word 0x00000000 0x00000000 0x00000000
D_8011EACC:
.word 0x0C000000 0x00000014 0x0000001E
.word 0x0A000000 0x000A0208 0x0C96A846
.word 0x0C000000 0x00000019 0x0000001E
.word 0x0A000000 0x00020206 0x0C96A846
.word 0x0A000000 0x0005030A 0x0C96A846
.word 0x0A000000 0x00080006 0x0C96A846
.word 0x0A000000 0x000A0001 0x0C96A846
.word 0x0A000000 0x000B0307 0x0C96A846
.word 0x00000000 0x00000000 0x00000000
D_8011EB38:
.word 0x0C000000 0x00000005 0x0000001E
.word 0x0A000000 0x000A020A 0x0C96A846
.word 0x0A000000 0x000C0003 0x0C96A846
.word 0x0A000000 0x000E0001 0x0C96A846
.word 0x0C000000 0x0000000A 0x0000001E
.word 0x0A000000 0x00080406 0x0C96A846
.word 0x0A000000 0x000A0001 0x0C96A846
.word 0x00000000 0x00000000 0x00000000
D_8011EB98:
.word 0x02000000 0x00000041 D_8011E8F8
.word 0x02000000 0x00000002 D_8011E994
.word 0x02000000 0x00000004 D_8011EA00
.word 0x02000000 0x00000008 D_8011EA6C
.word 0x02000000 0x00000030 D_8011EACC
.word 0x02000000 0x00000080 D_8011EB38
.word 0x00000000 0x00000000 0x00000000

D_8011EBEC:
.word 0x00000000 0x00000000 0x0A119E32

D_8011EBF8:
.word 0x0A000000 0x0001090C 0x0000028A
.word 0x0A000000 0x00020000 0x0000028A
.word 0x0B000000 0x0001090C 0x0B54233C
.word 0x0B000000 0x00020000 0x0B54233C
.word 0x0B000000 0x000C0103 0x0B54233C
.word 0x0B000000 0x000E0002 0x0B54233C
.word 0x00000000 0x00000000 0x02878F1E
D_8011EC4C:
.word 0x0A000000 0x000F0709 0x0000028A
.word 0x0A000000 0x00030001 0x0000028A
.word 0x0B000000 0x000F0709 0x0B54233C
.word 0x0B000000 0x00030001 0x0B54233C
.word 0x0B000000 0x000C0103 0x0B54233C
.word 0x0B000000 0x000E0002 0x0B54233C
.word 0x00000000 0x00000000 0x02878F1E
D_8011ECA0:
.word 0x0A000000 0x00070106 0x0000028A
.word 0x0B000000 0x00070106 0x0B54233C
.word 0x0B000000 0x000C0103 0x0B54233C
.word 0x0B000000 0x000E0002 0x0B54233C
.word 0x00000000 0x00000000 0x02878F1E
D_8011ECDC:
.word 0x0A000000 0x00050408 0x0000028A
.word 0x0B000000 0x00050408 0x0B54233C
.word 0x0A000000 0x000A0004 0x0000028A
.word 0x0B000000 0x000A0004 0x0B54233C
.word 0x0B000000 0x000C0103 0x0B54233C
.word 0x0B000000 0x000E0002 0x0B54233C
.word 0x00000000 0x00000000 0x02878F1E
D_8011ED30:
.word 0x0A000000 0x000A080A 0x0000028A
.word 0x0A000000 0x000B0001 0x0000028A
.word 0x0B000000 0x000A080A 0x0B54233C
.word 0x0B000000 0x000B0001 0x0B54233C
.word 0x0B000000 0x000C0103 0x0B54233C
.word 0x0B000000 0x000E0002 0x0B54233C
.word 0x00000000 0x00000000 0x02878F1E
D_8011ED84:
.word 0x0A000000 0x000C0103 0x0000028A
.word 0x0A000000 0x000D0000 0x0000028A
.word 0x0B000000 0x000C0103 0x0B54233C
.word 0x0B000000 0x000D0000 0x0B54233C
.word 0x00000000 0x00000000 0x02878F1E
D_8011EDC0:
.word 0x0A000000 0x0001080C 0x0000028A
.word 0x0B000000 0x0001080C 0x0B54233C
.word 0x0B000000 0x000C0103 0x0B54233C
.word 0x0B000000 0x000E0002 0x0B54233C
.word 0x00000000 0x00000000 0x02878F1E
D_8011EDFC:
.word 0x0A000000 0x00010002 0x0000028A
.word 0x0A000000 0x000E0102 0x0000028A
.word 0x0B000000 0x0001080C 0x0B54233C
.word 0x0B000000 0x000E0102 0x0B54233C
.word 0x00000000 0x00000000 0x02878F1E
D_8011EE38:
.word 0x02000000 0x00000001 D_8011EBF8
.word 0x02000000 0x00000002 D_8011EC4C
.word 0x02000000 0x00000004 D_8011ECA0
.word 0x02000000 0x00000008 D_8011ECDC
.word 0x02000000 0x00000010 D_8011ED30
.word 0x02000000 0x00000020 D_8011ED84
.word 0x02000000 0x00000040 D_8011EDC0
.word 0x02000000 0x00000080 D_8011EDFC
.word 0x00000000 0x00000000 0x00000000

D_8011EEA4:
.word 0x0A000000 0x0001090C 0x0000028A
.word 0x0A000000 0x00020000 0x0000028A
.word 0x00000000 0x00000000 0x0BF6A83C
D_8011EEC8:
.word 0x0A000000 0x000F0709 0x0000028A
.word 0x0A000000 0x00030001 0x0000028A
.word 0x00000000 0x00000000 0x0BF6A83C
D_8011EEEC:
.word 0x0A000000 0x00070106 0x0000028A
.word 0x00000000 0x00000000 0x0BF6A83C
D_8011EF04:
.word 0x0A000000 0x00050408 0x0000028A
.word 0x00000000 0x00000000 0x0BF6A83C
D_8011EF1C:
.word 0x0A000000 0x000A080A 0x0000028A
.word 0x0A000000 0x000B0001 0x0000028A
.word 0x00000000 0x00000000 0x0BF6A83C
D_8011EF40:
.word 0x0A000000 0x000C0103 0x0000028A
.word 0x0A000000 0x000D0000 0x0000028A
.word 0x00000000 0x00000000 0x0BF6A83C
D_8011EF64:
.word 0x0A000000 0x0001080C 0x0000028A
.word 0x00000000 0x00000000 0x0BF6A83C
D_8011EF7C:
.word 0x0A000000 0x00010002 0x0000028A
.word 0x0A000000 0x000E0102 0x0000028A
.word 0x00000000 0x00000000 0x0BF6A83C
D_8011EFA0:
.word 0x02000000 0x00000001 D_8011EEA4
.word 0x02000000 0x00000002 D_8011EEC8
.word 0x02000000 0x00000004 D_8011EEEC
.word 0x02000000 0x00000008 D_8011EF04
.word 0x02000000 0x00000010 D_8011EF1C
.word 0x02000000 0x00000020 D_8011EF40
.word 0x02000000 0x00000040 D_8011EF64
.word 0x02000000 0x00000080 D_8011EF7C
.word 0x00000000 0x00000000 0x00000000

D_8011F00C:
.word 0x0B000000 0x0001090B 0x0B54233C
.word 0x00000000 0x00000000 0x00000000
D_8011F024:
.word 0x0B000000 0x000F0709 0x0B54233C
.word 0x00000000 0x00000000 0x00000000
D_8011F03C:
.word 0x0B000000 0x00070104 0x0B54233C
.word 0x00000000 0x00000000 0x00000000
D_8011F054:
.word 0x0B000000 0x00050406 0x0B54233C
.word 0x00000000 0x00000000 0x00000000
D_8011F06C:
.word 0x0B000000 0x000A080A 0x0B54233C
.word 0x00000000 0x00000000 0x00000000
D_8011F084:
.word 0x0B000000 0x000C0102 0x0B54233C
.word 0x0B000000 0x000A0A0A 0x0B54233C
.word 0x00000000 0x00000000 0x00000000
D_8011F0A8:
.word 0x0B000000 0x0001080A 0x0B54233C
.word 0x00000000 0x00000000 0x00000000
D_8011F0C0:
.word 0x0B000000 0x00010000 0x0B54233C
.word 0x0B000000 0x000E0102 0x0B54233C
.word 0x00000000 0x00000000 0x00000000
D_8011F0E4:
.word 0x02000000 0x00000001 D_8011F00C
.word 0x02000000 0x00000002 D_8011F024
.word 0x02000000 0x00000004 D_8011F03C
.word 0x02000000 0x00000008 D_8011F054
.word 0x02000000 0x00000010 D_8011F06C
.word 0x02000000 0x00000020 D_8011F084
.word 0x02000000 0x00000040 D_8011F0A8
.word 0x02000000 0x00000080 D_8011F0C0
.word 0x00000000 0x00000000 0x00000000

D_8011F150:
.word 0x0A000000 0x0001080A 0x0B54233C
.word 0x0A000000 0x000A0001 0x0B54233C
.word 0x0A000000 0x00050A0A 0x0B54233C
.word 0x0A000000 0x00040000 0x0B54233C
.word 0x00000000 0x00000000 0x00000000

D_8011F18C:
.word 0x00000000 0x00000000 D_8011F0E4

D_8011F198:
.word 0x00000000 0x00000000 D_8011F150

D_8011F1A4: .word 0x00000000 ; align 16?
D_8011F1A8: .word 0x00000000
D_8011F1AC: .word 0x00000000

D_8011F1B0:
.word 0x0A000000 0x00020206 0x0B54233C
.word 0x0A000000 0x000F0003 0x0B54233C
.word 0x0A000000 0x00030305 0x0B54233C
.word 0x00000000 0x00000000 0x00000000
D_8011F1E0:
.word 0x0A000000 0x00020404 0x0B54233C
.word 0x0A000000 0x00030305 0x0B54233C
.word 0x0A000000 0x00040001 0x0B54233C
.word 0x00000000 0x00000000 0x00000000
D_8011F210:
.word 0x0A000000 0x00050407 0x0B54233C
.word 0x00000000 0x00000000 0x00000000
D_8011F228:
.word 0x0A000000 0x00050A0A 0x0B54233C
.word 0x0A000000 0x00060000 0x0B54233C
.word 0x0A000000 0x000A0001 0x0B54233C
.word 0x00000000 0x00000000 0x00000000
D_8011F258:
.word 0x0A000000 0x000D0000 0x0B54233C
.word 0x0A000000 0x000C0103 0x0B54233C
.word 0x00000000 0x00000000 0x00000000
D_8011F27C:
.word 0x0A000000 0x000B0001 0x0B54233C
.word 0x00000000 0x00000000 0x00000000
D_8011F294:
.word 0x0A000000 0x000F0106 0x0B54233C
.word 0x0A000000 0x00020006 0x0B54233C
.word 0x0A000000 0x00040001 0x0B54233C
.word 0x00000000 0x00000000 0x00000000
D_8011F2C4:
.word 0x0A000000 0x00010405 0x0B54233C
.word 0x0C000000 0x0000000A 0x00028A1E
.word 0x0A000000 0x00010607 0x0B54233C
.word 0x00000000 0x00000000 0x00000000
D_8011F2F4:
.word 0x02000000 0x00000080 D_8011F2C4
.word 0x0C000000 0x00000005 0x00000A1E
.word 0x0A000000 0x00010004 0x0BF6A33C
.word 0x0C000000 0x00000014 0x00028A1E
.word 0x02000000 0x00000001 D_8011F1B0
.word 0x02000000 0x00000002 D_8011F1E0
.word 0x02000000 0x00000004 D_8011F210
.word 0x02000000 0x00000008 D_8011F228
.word 0x02000000 0x00000010 D_8011F258
.word 0x02000000 0x00000020 D_8011F27C
.word 0x02000000 0x00000040 D_8011F294
.word 0x00000000 0x00000000 0x00000000

D_8011F384:
.word 0x0B000000 0x0001090C 0x0B54233C
.word 0x0B000000 0x00020000 0x0B54233C
.word 0x00000000 0x00000000 0x00000A1E
D_8011F3A8:
.word 0x0B000000 0x000F0709 0x0B54233C
.word 0x0B000000 0x00030001 0x0B54233C
.word 0x00000000 0x00000000 0x00000A1E
D_8011F3CC:
.word 0x0B000000 0x00070106 0x0B54233C
.word 0x00000000 0x00000000 0x00000A1E
D_8011F3E4:
.word 0x0B000000 0x00050408 0x0B54233C
.word 0x00000000 0x00000000 0x00000A1E
D_8011F3FC:
.word 0x0B000000 0x000A080A 0x0B54233C
.word 0x0B000000 0x000B0001 0x0B54233C
.word 0x00000000 0x00000000 0x00000A1E
D_8011F420:
.word 0x0B000000 0x000C0103 0x0B54233C
.word 0x0B000000 0x000D0000 0x0B54233C
.word 0x00000000 0x00000000 0x00000A1E
D_8011F444:
.word 0x0B000000 0x0001080C 0x0C94233C
.word 0x00000000 0x00000000 0x00000A1E
D_8011F45C:
.word 0x0B000000 0x00010002 0x0B54233C
.word 0x0B000000 0x000E0102 0x0B54233C
.word 0x00000000 0x00000000 0x00000A1E
D_8011F480:
.word 0x02000000 0x00000001 D_8011F384
.word 0x02000000 0x00000002 D_8011F3A8
.word 0x02000000 0x00000004 D_8011F3CC
.word 0x02000000 0x00000008 D_8011F3E4
.word 0x02000000 0x00000010 D_8011F3FC
.word 0x02000000 0x00000020 D_8011F420
.word 0x02000000 0x00000040 D_8011F444
.word 0x02000000 0x00000080 D_8011F45C
.word 0x00000000 0x00000000 0x00000000

D_8011F4EC:
.word 0x00000000 0x00000000 D_8011F2F4
.word 0x00000000 0x00000000 0x00000000

D_8011F504:
.word 0x0F000000 0x0001090C 0x0B54233C
.word 0x0F000000 0x00020000 0x0B54233C
.word 0x00000000 0x00000000 0x00000A1E
D_8011F528:
.word 0x0F000000 0x000F0709 0x0B54233C
.word 0x0F000000 0x00030001 0x0B54233C
.word 0x00000000 0x00000000 0x00000A1E
D_8011F54C:
.word 0x0F000000 0x00070106 0x0B54233C
.word 0x00000000 0x00000000 0x00000A1E
D_8011F564:
.word 0x0F000000 0x00050408 0x0B54233C
.word 0x00000000 0x00000000 0x00000A1E
D_8011F57C:
.word 0x0F000000 0x000A080A 0x0B54233C
.word 0x0F000000 0x000B0001 0x0B54233C
.word 0x00000000 0x00000000 0x00000A1E
D_8011F5A0:
.word 0x0F000000 0x000C0103 0x0B54233C
.word 0x0F000000 0x000D0000 0x0B54233C
.word 0x00000000 0x00000000 0x00000A1E
D_8011F5C4:
.word 0x0F000000 0x0001080C 0x0B54233C
.word 0x00000000 0x00000000 0x00000A1E
D_8011F5DC:
.word 0x0F000000 0x00010002 0x0B54233C
.word 0x0F000000 0x000E0102 0x0B54233C
.word 0x00000000 0x00000000 0x00000A1E
D_8011F600:
.word 0x02000000 0x00000001 D_8011F504
.word 0x02000000 0x00000002 D_8011F528
.word 0x02000000 0x00000004 D_8011F54C
.word 0x02000000 0x00000008 D_8011F564
.word 0x02000000 0x00000010 D_8011F57C
.word 0x02000000 0x00000020 D_8011F5A0
.word 0x02000000 0x00000040 D_8011F5C4
.word 0x02000000 0x00000080 D_8011F5DC
.word 0x00000000 0x00000000 0x00000000

D_8011F66C: .word 0x00000000 ; nullptr
D_8011F670: .word 0x00000000 ; nullptr
D_8011F674: .word D_8011F480
D_8011F678: .word 0x00000000
D_8011F67C: .word 0x00000000
D_8011F680: .word 0x00000000

D_8011F684:
.word 0x08000000 0x00000001 0x00000514
.word 0x02000000 0x00000004 0x0B54233C
.word 0x00000000 0x00000000 0x00000000

D_8011F6A8:
.word 0x00000000 0x00000000 0x00000000

D_8011F6B4:
.word 0x02000000 0x000000B0 0x08CF1932
.word 0x00000000 0x00000000 0x00000000

D_8011F6CC:
.word 0x02000000 0x00000041 0x08CF1932
.word 0x00000000 0x00000000 0x00000000

D_8011F6E4:
.word 0x01000000 0x00000019 0x0C96A846
.word 0x00000000 0x00000000 0x0000051E
D_8011F6FC:
.word 0x02000000 0x00000002 D_8011F6E4
.word 0x01000000 0x00000019 0x0C96A846
.word 0x00000000 0x00000000 0x0B54233C
D_8011F720:
.word 0x01000000 0x0000001E 0x0C96A846
.word 0x00000000 0x00000000 0x0000051E
D_8011F738:
.word 0x02000000 0x00000030 D_8011F720
.word 0x01000000 0x00000019 0x0C96A846
.word 0x00000000 0x00000000 0x0B54233C

D_8011F75C:
.word 0x00000000

D_8011F760:
.word 0x0E0A0003
.word 0x0204130B
.word 0x05060C0D
.word 0x09070801

D_8011F770:
.word 0x0E010B0A
.word 0x130C0006
.word 0x09030D04
.word 0x08070205

D_8011F780:
.word 0x0E0B0609
.word 0x0C07030D
.word 0x02040A13
.word 0x00080501

D_8011F790:
.word 0x0E05090A
.word 0x0B07130C
.word 0x0006030D
.word 0x04080201

D_8011F7A0:
.word 0x0E080D0B
.word 0x0A130607
.word 0x0C000903
.word 0x04020501

D_8011F7B0:
.word 0x0E030B0A
.word 0x130C0006
.word 0x090D0408
.word 0x07020501

D_8011F7C0:
.word 0x0E020903
.word 0x06070805
.word 0x04130B0D
.word 0x0A0C0001

D_8011F7D0:
.word 0x0E041309
.word 0x0B0A030C
.word 0x07000106
.word 0x0D080205

D_8011F7E0:
.word D_8011F760
.word D_8011F770
.word D_8011F780
.word D_8011F790
.word D_8011F7A0
.word D_8011F7B0
.word D_8011F7C0
.word D_8011F7D0

D_8011F800:
.word 0x5A463C1E
.word 0x14141414
.word 0x0A0A0A0A
.word 0x0A0A0A0A

D_8011F810:
.word 0x50321414
.word 0x140A140A
.word 0x0A0A140A
.word 0x0A0A0A00

D_8011F820:
.word 0x501E321E
.word 0x1E141414
.word 0x14141E14
.word 0x1E0A0A0A

D_8011F830:
.word 0x5A32141E
.word 0x140A140A
.word 0x1E0A0A0A
.word 0x0A0A0A0A

D_8011F840:
.word 0x5A321E1E
.word 0x1E141414
.word 0x0A1E0A0A
.word 0x0A0A0A0A

D_8011F850:
.word 0x5A321E3C
.word 0x14141E14
.word 0x0A0A0A0A
.word 0x0A0A0A0A

D_8011F860:
.word 0x46282828
.word 0x1E141E1E
.word 0x1428281E
.word 0x280A280A

D_8011F870:
.word 0x50323C14
.word 0x141E141E
.word 0x0A1E140A
.word 0x0A0A0A0A

D_8011F880:
.word D_8011F800
.word D_8011F810
.word D_8011F820
.word D_8011F830
.word D_8011F840
.word D_8011F850
.word D_8011F860
.word D_8011F870

D_8011F8A0: .word D_8011F684
D_8011F8A4: .word D_8011F6A8

D_8011F8A8: .word D_8011F6B4
D_8011F8AC: .word D_8011F6CC

D_8011F8B0: .word D_8011F6FC
D_8011F8B4: .word D_8011F738

D_8011F8B8: .word 0x00000000 ; align 16?
D_8011F8BC: .word 0x00000000

D_8011F8C0: .word 0x02021006
D_8011F8C4: .word 0x08061404
D_8011F8C8: .word 0x00000000
D_8011F8CC: .word 0x00000000
D_8011F8D0: .word 0x01020408

percent_d_str_format:
.asciiz "%d" ; 0x25640000
.align 4

.align 8
D_8011F8D8: .word 0x3FF80000
D_8011F8DC: .word 0x00000000

D_8011F8E0: .word 0x3F800000
D_8011F8E4: .word 0x3F800000
D_8011F8E8: .word 0x3F800000
D_8011F8EC: .word 0x3F800000
D_8011F8F0: .word 0x40000000
D_8011F8F4: .word 0x3F800000
D_8011F8F8: .word 0x00000000
D_8011F8FC: .word 0x40000000
D_8011F900: .word 0x3F800000
D_8011F904: .word 0xBF800000
D_8011F908: .word 0x3F800000
D_8011F90C: .word 0x3F800000
D_8011F910: .word 0xBF800000
D_8011F914: .word 0xBF800000
D_8011F918: .word 0x3F800000
D_8011F91C: .word 0x00000000
D_8011F920: .word 0xBF800000
D_8011F924: .word 0x3F800000
D_8011F928: .word 0xBF800000
D_8011F92C: .word 0x40000000
D_8011F930: .word 0x3F800000
D_8011F934: .word 0x3F800000
D_8011F938: .word 0xBF800000
D_8011F93C: .word 0x3F800000

.align 8
D_8011F940: .word 0x3FD33333
D_8011F944: .word 0x33333333

.align 8
D_8011F948: .word 0x3FE00000
D_8011F94C: .word 0x00000000

.align 8
D_8011F950: .word 0x3FE00000
D_8011F954: .word 0x00000000

.align 8
D_8011F958: .word 0x3FE00000
D_8011F95C: .word 0x00000000

.align 8
D_8011F960: .word 0x3FE00000
D_8011F964: .word 0x00000000

.align 8
D_8011F968: .word 0x3FF80000
D_8011F96C: .word 0x00000000

.align 8
D_8011F970: .word 0x3FE99999
D_8011F974: .word 0x9999999A

.align 8
D_8011F978: .word 0x3FE99999
D_8011F97C: .word 0x9999999A

.align 8

D_8011FA20_jump_table:
.word L8011CDC8
.word L8011C9CC
.word L8011C944
.word L8011CA8C
.word L8011CAD4
.word L8011CCDC
.word L8011CA80
.word L8011CB1C
.word L8011C9E4
.word L8011CD48
.word L8011CD84
.word L8011CA48
.word L8011CCAC
.word L8011C944
.word L8011CA64
.word L8011CD08
.word L8011C944
.word L8011CBC8
.word L8011C9CC
.word L8011C978

.align 16

bss:
D_8011FA70:
.word 0
.word 0

D_8011FA78:
.word 0
.word 0
.word 0
.word 0
.word 0
.word 0
.word 0
.word 0

; holds millenium star object pointers?
D_8011FA98:
.word 0
.word 0
.word 0
.word 0
.word 0
.word 0
.word 0
.word 0

.align 8
D_8011FAB8: .word 0

D_8011FABC: .word 0

D_8011FAC0: .word 0

D_8011FAC4: .word 0

D_8011FAD4: .word 0

D_8011FAD8: .word 0

D_8011FAF0:
.word 0
.word 0

D_8011FAF8:
.word 0
.word 0
.word 0
.word 0

; boo
D_8011FB08: .word 0
; boo
D_8011FB0C: .word 0

D_8011FB10:
.word 0
.word 0

D_8011FB18:
.word 0
.word 0
.word 0
.word 0
.word 0
.word 0
.word 0
.word 0
.word 0
.word 0

bank_model_bss:
D_8011FB40: .word 0

; gates bss entries (probably 2 words for 2 gates)
D_8011FB44:
.word 0
.word 0

D_8011FB4C: .word 0

D_8011FB50: .word 0

D_8011FB54: .word 0

D_8011FB58: .word 0

D_8011FB5C: .halfword 0

D_8011FB5E: .halfword 0

D_8011FB60: .word 0

D_8011FB64: .halfword 0

D_8011FB66: .halfword 0

D_8011FB68: .word 0

D_8011FB6C: .word 0

D_8011FB70: .word 0

D_8011FB74: .word 0

D_8011FB78:
.word 0
.word 0

D_8011FB80:
.halfword 0
D_8011FB82:
.halfword 0
.word 0
.word 0

D_8011FB8C: .halfword 0
D_8011FB8E: .halfword 0

D_8011FB90:
.word 0
.word 0

D_8011FB98:
.word 0
.word 0
.word 0
.word 0

D_8011FBA8:
.word 0
.word 0
.word 0
.word 0

; Player index of player that is in the lead (or something)?
D_8011FBB8: .word 0

; Player index of player that is in the lead (or something)?
D_8011FBBC: .word 0

.align 16
  `;
}