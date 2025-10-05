import { getDeadSpaceIndex } from "../../../apps/partyplanner64/boards";
import { IBoardInfo } from "./boardinfobase";
import { Game, Space, SpaceSubtype } from "../types";
import { distance, getRawFloat32Format } from "../utils/number";
import { BankEvent, BooEvent, ItemShopEvent } from "../events/builtin/events.common";
import { getAdditionalBgAsmForOverlay, getBoardAdditionalBgHvqIndices } from "../events/additionalbg";
import { getShuffleSeedData } from "./overlayutils";
import { getAudioIndexAsmForOverlay } from "../events/getaudiochoice";
import { getArrowRotationLimit } from "./boardinfo";
import { $$hex } from "../utils/debug";
import { getSymbol } from "../symbols/symbols";
import { IBoard, getSpacesOfSubType, getSpacesWithEvent } from "../boards";

export async function createBoardOverlay(board: IBoard, boardInfo: IBoardInfo, boardIndex: number, audioIndices: number[]): Promise<string> {
  const [mainFsEventDir, mainFsEventFile] = boardInfo.mainfsEventFile!;

  const starIndices = [];
  for (let i = 0; i < board.spaces.length; i++) {
    if (board.spaces[i].star) {
      starIndices.push(i);
    }
  }

  // const show_next_star_fn = starIndices.length ? "show_next_star_spot" : "show_next_star_no_op";
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

  // Find the closest Boo subtype space for each boo event space.
  const booIndices = getSpacesOfSubType(SpaceSubtype.BOO, board);
  const booEventSpaces = getSpacesWithEvent(BooEvent.id, board);
  const bestBooForBooEventSpaces: number[] = [];
  booEventSpaces.forEach(spaceIndex => {
    const eventSpace = board.spaces[spaceIndex];
    let bestDistance = Number.MAX_VALUE;
    let bestBooIdx = getDeadSpaceIndex(board);
    for (let b = 0; b < booIndices.length; b++) {
      const booIdx = booIndices[b];
      const booSpace = board.spaces[booIdx];
      const dist = distance(eventSpace.x, eventSpace.y, booSpace.x, booSpace.y);
      if (dist < bestDistance) {
        bestDistance = dist;
        bestBooIdx = booIdx;
      }
    }
    bestBooForBooEventSpaces.push(bestBooIdx);
  });
  if (!booIndices.length) booIndices.push(getDeadSpaceIndex(board));
  for (let i = 0; i < 2; i++) { // Ensure at least 2
    if (booEventSpaces.length < 2) booEventSpaces.push(getDeadSpaceIndex(board));
  }
  for (let i = 0; i < 2; i++) { // Ensure at least 2
    if (bestBooForBooEventSpaces.length < 2) bestBooForBooEventSpaces.push(getDeadSpaceIndex(board));
  }

  const rotations = [];
  for (let i = 0; i < board.spaces.length; i++) {
    if (board.spaces[i].type === Space.ARROW) {
      rotations.push(board.spaces[i].rotation || 0);
    }
  }
  const addArrowAngleAddr = getSymbol(Game.MP2_USA, "AddArrowAngle");
  const totalArrowsToWrite = getArrowRotationLimit();
  const arrowRotationInstructions = [];
  const loopLimit = Math.min(totalArrowsToWrite, rotations.length);
  for (let i = 0; i < loopLimit; i++) {
    arrowRotationInstructions.push(`LUI A0 hi(${$$hex(getRawFloat32Format(rotations[i]))})`);
    arrowRotationInstructions.push(`JAL ${addArrowAngleAddr}`);
    arrowRotationInstructions.push("MTC1 A0 F12");
  }

  const additionalBgIndices = getBoardAdditionalBgHvqIndices(board);
  const preppedAdditionalBgCode = await getAdditionalBgAsmForOverlay(board, boardInfo.bgDir, additionalBgIndices);
  const preppedAudioIndexCode = await getAudioIndexAsmForOverlay(board, audioIndices);

  return `
.org 0x80102800

.definelabel D_800C9B80,0x800C9B80
.definelabel D_800CAFD8,0x800CAFD8
.definelabel D_800CAFD9,0x800CAFD9
.definelabel D_800CC000,0x800CC000
.definelabel D_800CC001,0x800CC001
.definelabel D_800CC007,0x800CC007
.definelabel D_800CC1F0,0x800CC1F0
.definelabel D_800CC6A8,0x800CC6A8
.definelabel D_800CC6C4,0x800CC6C4
.definelabel D_800CCBDC,0x800CCBDC
.definelabel D_800CCC16,0x800CCC16
.definelabel D_800CCC18,0x800CCC18
.definelabel D_800CCD5C,0x800CCD5C
.definelabel D_800CD414,0x800CD414
.definelabel D_800D0032,0x800D0032
.definelabel D_800F6098,0x800F6098
.definelabel D_800F64B0,0x800F64B0
.definelabel D_800F64C8,0x800F64C8
.definelabel D_800F851A,0x800F851A
.definelabel D_800F8CE4,0x800F8CE4
.definelabel D_800F8D12,0x800F8D12
.definelabel D_800F8D16,0x800F8D16
.definelabel D_800F8D18,0x800F8D18
.definelabel D_800F8D1E,0x800F8D1E
.definelabel D_800F9052,0x800F9052
.definelabel D_800F920C,0x800F920C
.definelabel D_800F93A8,0x800F93A8
.definelabel D_800F93AA,0x800F93AA ; s16 board index to load
.definelabel D_800F93AE,0x800F93AE
.definelabel D_800F93B0,0x800F93B0
.definelabel D_800F93B2,0x800F93B2
.definelabel D_800F93B4,0x800F93B4
.definelabel D_800F93C0,0x800F93C0
.definelabel D_800F93C4,0x800F93C4
.definelabel D_800F93C6,0x800F93C6
.definelabel D_800FA188,0x800FA188
.definelabel D_800FA198,0x800FA198
.definelabel D_800FC734,0x800FC734
.definelabel D_800FC834,0x800FC834
.definelabel D_800FD2C0,0x800FD2C0
.definelabel D_800FD2C2,0x800FD2C2
.definelabel D_800FD2C6,0x800FD2C6
.definelabel D_800FD2D0,0x800FD2D0
.definelabel D_800FD2D2,0x800FD2D2
.definelabel D_800FD2E4,0x800FD2E4
.definelabel D_80100001,0x80100001
.definelabel D_80100009,0x80100009
.definelabel D_80100010,0x80100010
.definelabel D_80100012,0x80100012
.definelabel D_8010008C,0x8010008C
.definelabel D_80101058,0x80101058
.definelabel func_800114E8,0x800114E8
.definelabel func_800115B4,0x800115B4
.definelabel func_80017680,0x80017680
.definelabel func_80017800,0x80017800
.definelabel func_80020070,0x80020070
.definelabel func_80020324,0x80020324
.definelabel func_80026DAC,0x80026DAC
.definelabel func_80027154,0x80027154
.definelabel func_800297E8,0x800297E8
.definelabel func_80029E80,0x80029E80
.definelabel func_80029FE4,0x80029FE4
.definelabel func_8002D0A0,0x8002D0A0
.definelabel func_8002D124,0x8002D124
.definelabel func_8002D4A0,0x8002D4A0
.definelabel func_8004108C,0x8004108C
.definelabel func_80041610,0x80041610
.definelabel func_800417EC,0x800417EC
.definelabel func_800418D8,0x800418D8
.definelabel func_80041A74,0x80041A74
.definelabel func_80041AEC,0x80041AEC
.definelabel func_80041B40,0x80041B40
.definelabel func_80041B60,0x80041B60
.definelabel func_80042BE0,0x80042BE0
.definelabel func_80042D38,0x80042D38
.definelabel func_80043510,0x80043510
.definelabel func_800437F8,0x800437F8
.definelabel func_80043DAC,0x80043DAC
.definelabel func_80043F7C,0x80043F7C
.definelabel func_80044258,0x80044258
.definelabel func_800442DC,0x800442DC
.definelabel func_8004430C,0x8004430C
.definelabel func_80044494,0x80044494
.definelabel func_80044530,0x80044530
.definelabel func_800446B4,0x800446B4
.definelabel func_80044800,0x80044800
.definelabel func_80044D98,0x80044D98
.definelabel func_80045650,0x80045650
.definelabel func_8004655C,0x8004655C
.definelabel func_80046D2C,0x80046D2C
.definelabel func_80046EDC,0x80046EDC
.definelabel func_80046F98,0x80046F98
.definelabel func_80047A50,0x80047A50
.definelabel func_80047BB8,0x80047BB8
.definelabel func_80047D78,0x80047D78
.definelabel func_80047DE8,0x80047DE8
.definelabel func_80047E70,0x80047E70
.definelabel func_80048A48,0x80048A48
.definelabel func_800495A8,0x800495A8
.definelabel func_800495D8,0x800495D8
.definelabel func_80049ED4,0x80049ED4
.definelabel func_80049F90,0x80049F90
.definelabel func_8004B224,0x8004B224
.definelabel func_8004CA14,0x8004CA14
.definelabel func_8004CA34,0x8004CA34
.definelabel func_8004CC7C,0x8004CC7C
.definelabel func_8004CD70,0x8004CD70
.definelabel func_8004CDE0,0x8004CDE0
.definelabel func_8004CE80,0x8004CE80
.definelabel func_8004D5B0,0x8004D5B0
.definelabel func_8004D60C,0x8004D60C
.definelabel func_8004E484,0x8004E484
.definelabel func_80050304,0x80050304
.definelabel func_8005057C,0x8005057C
.definelabel func_8005070C,0x8005070C
.definelabel func_80050860,0x80050860
.definelabel func_800508E4,0x800508E4
.definelabel func_800509C4,0x800509C4
.definelabel func_800509FC,0x800509FC
.definelabel func_80051500,0x80051500
.definelabel func_80052F70,0x80052F70
.definelabel func_80053608,0x80053608
.definelabel func_80053620,0x80053620
.definelabel func_80053980,0x80053980
.definelabel func_80053998,0x80053998
.definelabel func_80053AA0,0x80053AA0
.definelabel func_80053F54,0x80053F54
.definelabel func_80053F7C,0x80053F7C
.definelabel func_800542B8,0x800542B8
.definelabel func_800542E8,0x800542E8
.definelabel func_80054B8C,0x80054B8C
.definelabel func_80054BB0,0x80054BB0
.definelabel func_80054BDC,0x80054BDC
.definelabel func_80054C78,0x80054C78
.definelabel func_80054D3C,0x80054D3C
.definelabel func_8005521C,0x8005521C
.definelabel func_800556F4,0x800556F4
.definelabel func_800558E8,0x800558E8
.definelabel func_800558F4,0x800558F4
.definelabel func_80055928,0x80055928
.definelabel func_80055980,0x80055980
.definelabel func_80055C88,0x80055C88
.definelabel func_80055E3C,0x80055E3C
.definelabel func_80055E60,0x80055E60
.definelabel func_80055E90,0x80055E90
.definelabel func_8005600C,0x8005600C
.definelabel func_800560A4,0x800560A4
.definelabel func_80056124,0x80056124
.definelabel func_80056144,0x80056144
.definelabel func_80056168,0x80056168
.definelabel func_80056368,0x80056368
.definelabel func_80056458,0x80056458
.definelabel func_80056524,0x80056524
.definelabel func_80056658,0x80056658
.definelabel func_8005670C,0x8005670C
.definelabel func_80056728,0x80056728
.definelabel func_80056754,0x80056754
.definelabel func_8005694C,0x8005694C
.definelabel func_80056B78,0x80056B78
.definelabel func_80056C30,0x80056C30
.definelabel func_80056D80,0x80056D80
.definelabel func_80056FD4,0x80056FD4
.definelabel func_80057150,0x80057150
.definelabel func_8005734C,0x8005734C
.definelabel func_800573AC,0x800573AC
.definelabel func_80057718,0x80057718
.definelabel func_80057DC0,0x80057DC0
.definelabel func_80059120,0x80059120
.definelabel func_80059158,0x80059158
.definelabel func_80059FD0,0x80059FD0
.definelabel func_8005A358,0x8005A358
.definelabel func_8005AB50,0x8005AB50
.definelabel func_8005AC6C,0x8005AC6C
.definelabel func_8005B338,0x8005B338
.definelabel func_8005DC30,0x8005DC30
.definelabel func_8005DC3C,0x8005DC3C
.definelabel func_8005DCA0,0x8005DCA0
.definelabel func_8005DD68,0x8005DD68
.definelabel func_8005DDEC,0x8005DDEC
.definelabel func_80060210,0x80060210
.definelabel func_800609D8,0x800609D8
.definelabel func_8006135C,0x8006135C
.definelabel func_800614B4,0x800614B4
.definelabel func_80061518,0x80061518
.definelabel func_80061584,0x80061584
.definelabel func_80062588,0x80062588
.definelabel func_80062824,0x80062824
.definelabel func_8006286C,0x8006286C
.definelabel func_800628C0,0x800628C0
.definelabel func_8006296C,0x8006296C
.definelabel func_800629AC,0x800629AC
.definelabel func_800629F0,0x800629F0
.definelabel func_80062A28,0x80062A28
.definelabel func_80062E10,0x80062E10
.definelabel func_80063178,0x80063178
.definelabel func_800632F0,0x800632F0
.definelabel func_800632FC,0x800632FC
.definelabel func_800636F8,0x800636F8
.definelabel func_80063710,0x80063710
.definelabel func_80063734,0x80063734
.definelabel func_80063C40,0x80063C40
.definelabel func_80064FF8,0x80064FF8
.definelabel func_800650BC,0x800650BC
.definelabel func_80066C34,0x80066C34
.definelabel func_80066F6C,0x80066F6C
.definelabel func_8006706C,0x8006706C
.definelabel func_800670B0,0x800670B0
.definelabel func_80067170,0x80067170
.definelabel func_800672BC,0x800672BC
.definelabel func_8006735C,0x8006735C
.definelabel func_80067558,0x80067558
.definelabel func_80067720,0x80067720
.definelabel func_80067C6C,0x80067C6C
.definelabel func_80068328,0x80068328
.definelabel func_8006836C,0x8006836C
.definelabel func_800683BC,0x800683BC
.definelabel func_80068480,0x80068480
.definelabel func_80076598,0x80076598
.definelabel func_8007695C,0x8007695C
.definelabel func_80076AFC,0x80076AFC
.definelabel func_80076B44,0x80076B44
.definelabel func_80076B70,0x80076B70
.definelabel func_80076FCC,0x80076FCC
.definelabel func_80077160,0x80077160
.definelabel func_800771EC,0x800771EC
.definelabel func_80077574,0x80077574
.definelabel func_80078EC8,0x80078EC8
.definelabel func_80078FF8,0x80078FF8
.definelabel func_80079390,0x80079390
.definelabel func_80079428,0x80079428
.definelabel func_80079464,0x80079464
.definelabel func_800794A8,0x800794A8
.definelabel func_8007959C,0x8007959C
.definelabel func_80079718,0x80079718
.definelabel func_80079798,0x80079798
.definelabel func_800797DC,0x800797DC
.definelabel func_80079848,0x80079848
.definelabel func_8007D700,0x8007D700
.definelabel func_8007D7E8,0x8007D7E8
.definelabel func_8007D838,0x8007D838
.definelabel func_8007D9E0,0x8007D9E0
.definelabel func_8007DA44,0x8007DA44
.definelabel func_8007F8B0,0x8007F8B0
.definelabel func_8007FA6C,0x8007FA6C
.definelabel func_80081AD0,0x80081AD0
.definelabel func_8008218C,0x8008218C
.definelabel func_8008225C,0x8008225C
.definelabel func_800822A8,0x800822A8
.definelabel func_80082384,0x80082384
.definelabel func_80082418,0x80082418
.definelabel func_80082488,0x80082488
.definelabel func_80082660,0x80082660
.definelabel func_80082800,0x80082800
.definelabel func_800890CC,0x800890CC
.definelabel func_80089284,0x80089284
.definelabel func_8008BB48,0x8008BB48
.definelabel func_8008CFD0,0x8008CFD0
.definelabel func_8008D07C,0x8008D07C
.definelabel func_8008D59C,0x8008D59C
.definelabel func_8008D854,0x8008D854
.definelabel func_8008DAC0,0x8008DAC0
.definelabel func_8008E2DC,0x8008E2DC
.definelabel func_8008E4D0,0x8008E4D0
.definelabel func_8008F544,0x8008F544
.definelabel func_8008F5AC,0x8008F5AC
.definelabel func_8008F618,0x8008F618
.definelabel func_8008F624,0x8008F624
.definelabel func_800A4FA0,0x800A4FA0
.definelabel func_800A5660,0x800A5660
.definelabel func_800B1870,0x800B1870
.definelabel func_800B3160,0x800B3160
.definelabel func_800B3170,0x800B3170
.definelabel func_800B31C0,0x800B31C0
.definelabel func_800B3200,0x800B3200
.definelabel func_800B3240,0x800B3240
.definelabel func_800B34B0,0x800B34B0
.definelabel func_800B39F0,0x800B39F0
.definelabel func_800B3B80,0x800B3B80
.definelabel func_800B7890,0x800B7890
.definelabel func_800B83C0,0x800B83C0

.definelabel BOARD_COUNT,6
.definelabel BANK_COUNT,${bankSpaces.length}
.definelabel SHOP_COUNT,${itemShopSpaces.length}
.definelabel STAR_COUNT,${starIndices.length}
.definelabel BOO_COUNT,${booIndices.length}

func_80102800:
/*  */  addiu SP, SP, -0x18
  sw    RA, 0x10(SP)
  lui   A0, hi(D_80111920)
  addiu A0, A0, lo(D_80111920)
  lui   A1, hi(D_800CD414)
  jal   func_80066F6C
   lh    A1, lo(D_800CD414)(A1)
  lw    RA, 0x10(SP)
  jr    RA
   addiu SP, SP, 0x18
  nop
  nop

func_80102830:
  lui   V0, hi(D_800F93B2)
  addiu V0, V0, lo(D_800F93B2)
  lh    V1, 0(V0)
  sll   V1, V1, 1
  addu  V0, V0, V1
  lh    V0, 2(V0)
  sll   V0, V0, 1
  lui   AT, hi(D_80111994)
  addu  AT, AT, V0
  jr    RA
   lh    V0, lo(D_80111994)(AT)

func_8010285C:
  addiu SP, SP, -0x30
  sw    RA, 0x28(SP)
  sw    S5, 0x24(SP)
  sw    S4, 0x20(SP)
  sw    S3, 0x1c(SP)
  sw    S2, 0x18(SP)
  sw    S1, 0x14(SP)
  sw    S0, 0x10(SP)
  lui   S5, hi(D_800F93A8)
  addiu S5, S5, lo(D_800F93A8)
  move  S1, R0
  lui S4, 0x2492
  ori S4, S4, 0x4925
  lui   S3, hi(shuffle_bias)
  addiu S3, S3, lo(shuffle_bias)
  lui   S2, hi(shuffle_order)
  addiu S2, S2, lo(shuffle_order)
L801028A0:
  jal   GetRandomByte
   nop
  andi  V0, V0, 0xff
  multu V0, S4
  mfhi  A0
  subu  V1, V0, A0
  srl   V1, V1, 1
  addu  A0, A0, V1
  srl   A0, A0, 2
  sll   V1, A0, 3
  subu  V1, V1, A0
  subu  V0, V0, V1
  jal   GetRandomByte
   andi  S0, V0, 0xff
  andi  V0, V0, 0xff
  multu V0, S4
  mfhi  A0
  subu  V1, V0, A0
  srl   V1, V1, 1
  addu  A0, A0, V1
  srl   A0, A0, 2
  sll   V1, A0, 3
  subu  V1, V1, A0
  subu  V0, V0, V1
  andi  A0, V0, 0xff
  beq   S0, A0, L80102960
   sll   V1, A0, 1
  addu  A3, V1, S3
  lh    V0, 0(A3)
  slt   V0, S0, V0
  bnel  V0, R0, L80102964
   addiu S1, S1, 1
  sll   A1, S0, 1
  addu  A2, A1, S3
  lh    V0, 0(A2)
  slt   V0, A0, V0
  bnel  V0, R0, L80102964
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
L80102960:
  addiu S1, S1, 1
L80102964:
  slti  V0, S1, 0x3c
  bnez  V0, L801028A0
   nop
  move  S1, R0
  lui   A0, hi(shuffle_order)
  addiu A0, A0, lo(shuffle_order)
  sll   V0, S1, 1
L80102980:
  addu  V1, V0, S5
  addu  V0, V0, A0
  lhu   V0, 0(V0)
  sh    V0, 0xc(V1)
  addiu S1, S1, 1
  slti  V0, S1, STAR_COUNT
  bnez  V0, L80102980
   sll   V0, S1, 1
  lh    V1, 0x1c(S5)
  li    V0, -1
  bne   V1, V0, L80102A20
   move  A1, R0
L801029B0:
  li    V0, 6
  subu  V0, V0, A1
  sll   V0, V0, 1
  addu  V0, V0, S5
  lhu   V0, 0xc(V0)
  sh    V0, 0x1c(S5)
  lui   V1, hi(D_80111970)
  lh    V1, lo(D_80111970)(V1)
  li    V0, -1
  beq   V1, V0, L80102A20
   move  S1, R0
  lui   A2, hi(D_80111970)
  addiu A2, A2, lo(D_80111970)
  lh    V1, 0x1c(S5)
  li    A0, -1
  sll   V0, S1, 1
L801029F0:
  addu  V0, V0, A2
  lh    V0, 0(V0)
  bnel  V1, V0, L80102A08
   addiu S1, S1, 1
  j     L801029B0
   addiu A1, A1, 1
L80102A08:
  sll   V0, S1, 1
  lui   AT, hi(D_80111970)
  addu  AT, AT, V0
  lh    V0, lo(D_80111970)(AT)
  bne   V0, A0, L801029F0
   sll   V0, S1, 1
L80102A20:
  lw    RA, 0x28(SP)
  lw    S5, 0x24(SP)
  lw    S4, 0x20(SP)
  lw    S3, 0x1c(SP)
  lw    S2, 0x18(SP)
  lw    S1, 0x14(SP)
  lw    S0, 0x10(SP)
  jr    RA
   addiu SP, SP, 0x30

func_80102A44:
  addiu SP, SP, -0x28
  sw    RA, 0x24(SP)
  sw    S0, 0x20(SP)
  lui   S0, hi(D_800F93A8)
  addiu S0, S0, lo(D_800F93A8)
  addiu A0, SP, 0x10
  jal   func_8004B224
   li    A1, 6
  lui   AT, hi(D_800F93B2)
  sh    R0, lo(D_800F93B2)(AT)
  move  A0, R0
  addiu A1, SP, 0x10
  sll   V1, A0, 1
L80102A78:
  addu  V1, V1, S0
  addu  V0, A1, A0
  lbu   V0, 0(V0)
  sh    V0, 0xc(V1)
  addiu A0, A0, 1
  slti  V0, A0, 7
  bnel  V0, R0, L80102A78
   sll   V1, A0, 1
  lhu   V0, 0x18(S0)
  sh    V0, 0x1c(S0)
  lw    RA, 0x24(SP)
  lw    S0, 0x20(SP)
  jr    RA
   addiu SP, SP, 0x28

func_80102AB0:
  addiu SP, SP, -0x20
  sw    RA, 0x1c(SP)
  sw    S0, 0x18(SP)
  lui   V0, hi(D_800F93B2)
  lh    V0, lo(D_800F93B2)(V0)
  sll   V1, V0, 1
  lui   AT, hi(D_800F93B4)
  addu  AT, AT, V1
  lhu   V1, lo(D_800F93B4)(AT)
  lui   AT, hi(D_800F93C4)
  sh    V1, lo(D_800F93C4)(AT)
  addiu V0, V0, 0x0001
  lui   AT, hi(D_800F93B2)
  sh    V0, lo(D_800F93B2)(AT)
  sll   V0, V0, 0x10
  sra   V0, V0, 0x10
  slti  V0, V0, 7
  bnez  V0, L80102B44
   nop
  lui   S0, hi(D_800F93C0)
  lh    S0, lo(D_800F93C0)(S0)
  lui   AT, hi(D_800F93B2)
  sh    R0, lo(D_800F93B2)(AT)
  jal   func_8006836C
   li    A0, 68
  jal   func_8010285C
   nop
  lui   V1, hi(D_800F93B4)
  lh    V1, lo(D_800F93B4)(V1)
  bne   S0, V1, L80102B44
   nop
  lui   V0, hi(D_800F93C0)
  lhu   V0, lo(D_800F93C0)(V0)
  lui   AT, hi(D_800F93B4)
  sh    V0, lo(D_800F93B4)(AT)
  lui   AT, hi(D_800F93C0)
  sh    V1, lo(D_800F93C0)(AT)
L80102B44:
  lw    RA, 0x1c(SP)
  lw    S0, 0x18(SP)
  jr    RA
   addiu SP, SP, 0x20

func_80102B54:
  addiu SP, SP, -0x28
  sw    RA, 0x24(SP)
  sw    S2, 0x20(SP)
  sw    S1, 0x1c(SP)
  sw    S0, 0x18(SP)
  lui   S2, hi(D_800F93A8)
  addiu S2, S2, lo(D_800F93A8)
  move  S0, R0
  lui   S1, hi(D_80111974)
  addiu S1, S1, lo(D_80111974)
  sll   V0, S0, 1
L80102B80:
  addu  V0, V0, S1
  lh    A0, 0(V0)
  jal   func_8006836C
   addiu S0, S0, 1
  slti  V0, S0, 7
  bnez  V0, L80102B80
   sll   V0, S0, 1
  lh    V0, 0xa(S2)
  sll   V0, V0, 1
  addu  V0, V0, S2
  lh    V0, 0xc(V0)
  sll   V0, V0, 1
  lui   S0, hi(D_80111984)
  addiu S0, S0, lo(D_80111984)
  lui   A0, hi(D_80111984)
  addu  A0, A0, V0
  lh    A0, lo(D_80111984)(A0)
  jal   func_8005521C
   li    A1, 14
  lh    V0, 0xa(S2)
  sll   V0, V0, 1
  addu  V0, V0, S2
  lh    V0, 0xc(V0)
  sll   V0, V0, 1
  lui   A0, hi(D_80111974)
  addu  A0, A0, V0
  jal   func_800683BC
   lh    A0, lo(D_80111974)(A0)
  lh    V1, 0x1c(S2)
  li    V0, -1
  beq   V1, V0, L80102C24
   sll   V0, V1, 1
  addu  V0, V0, S0
  lh    A0, 0(V0)
  jal   func_8005521C
   li    A1, 15
  lh    V0, 0x1c(S2)
  sll   V0, V0, 1
  addu  V0, V0, S0
  jal   func_800509C4
   lh    A0, 0(V0)
L80102C24:
  lw    RA, 0x24(SP)
  lw    S2, 0x20(SP)
  lw    S1, 0x1c(SP)
  lw    S0, 0x18(SP)
  jr    RA
   addiu SP, SP, 0x28

func_80102C3C:
  addiu SP, SP, -0x28
  sw    RA, 0x20(SP)
  sw    S1, 0x1c(SP)
  sw    S0, 0x18(SP)
  lui   S1, hi(D_800F93A8)
  addiu S1, S1, lo(D_800F93A8)
  move  S0, R0
  lui   A1, hi(D_80111984)
  addiu A1, A1, lo(D_80111984)
  sll   A0, A0, 0x10
  sra   A0, A0, 0x10
  sll   V1, S0, 1
L80102C6C:
  addu  V0, V1, A1
  lh    V0, 0(V0)
  bnel  A0, V0, L80102D04
   addiu S0, S0, 1
  lh    V0, 0xa(S1)
  sll   V0, V0, 1
  addu  V0, V0, S1
  lh    V0, 0xc(V0)
  bne   S0, V0, L80102CAC
   nop
  lui   V0, hi(D_80111974)
  addu  V0, V0, V1
  lhu   V0, lo(D_80111974)(V0)
  sh    V0, 0x1a(S1)
  j     L80102D14
   li    V0, 1
L80102CAC:
  lh    V0, 0x1c(S1)
  beq   S0, V0, L80102D14
   li    V0, 2
  jal   func_80068328
   li    A0, 68
  bnez  V0, L80102CCC
   li    A0, 7
  lh    A0, 0xa(S1)
L80102CCC:
  blez  A0, L80102D10
   move  V1, R0
  sll   V0, V1, 1
L80102CD8:
  addu  V0, V0, S1
  lh    V0, 0xc(V0)
  bne   S0, V0, L80102CF0
   addiu V1, V1, 1
  j     L80102D14
   li    V0, 3
L80102CF0:
  slt   V0, V1, A0
  bnez  V0, L80102CD8
   sll   V0, V1, 1
  j     L80102D14
   move  V0, R0
L80102D04:
  slti  V0, S0, 7
  bnez  V0, L80102C6C
   sll   V1, S0, 1
L80102D10:
  move  V0, R0
L80102D14:
  lw    RA, 0x20(SP)
  lw    S1, 0x1c(SP)
  lw    S0, 0x18(SP)
  jr    RA
   addiu SP, SP, 0x28

func_80102D28:
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
  jal   func_8007D838
   sdc1  F20, 0x20(SP)
  lw    S0, 0x8c(V0)
  jal   func_8007959C
   li    A0, 846
  li    A0, 25
  jal   func_80043510
   move  A1, R0
  move  S1, V0
  lhu   V0, 0xa(S1)
  ori   V0, V0, 4
  sh    V0, 0xa(S1)
  jal   func_80056754
   move  A0, S1
  addiu A0, S1, 0xc
  jal   func_800B3170
   addiu A1, S0, 8
  li    AT, 0x42480000 ;50.0
  mtc1  AT, F0
  nop
  swc1  F0, 0x30(S1)
  move  A0, S1
  jal   func_80049ED4
   move  A1, R0
  move  S2, V0
  li    AT, 0x3DCC0000 ;0.099609
  ori   AT, AT, 0xcccd
  mtc1  AT, F0
  nop
  swc1  F0, 0x18(S2)
  mtc1  R0, F20
  move  S0, R0
  li    AT, 0x3F000000 ;0.500000
  mtc1  AT, F22
L80102DD8:
  mfc1  A1, F20
  mfc1  A2, F20
  mfc1  A3, F20
  nop
  jal   func_800B3160
   addiu A0, S1, 0x24
  jal   func_8007DA44
   add.s F20, F20, F22
  addiu S0, S0, 1
  slti  V0, S0, 6
  bnez  V0, L80102DD8
   nop
  move  S0, R0
  li    AT, 0x3ECC0000
  ori   AT, AT, 0xcccd
  mtc1  AT, F22
L80102E18:
  mfc1  A1, F20
  mfc1  A2, F20
  mfc1  A3, F20
  nop
  jal   func_800B3160
   addiu A0, S1, 0x24
  jal   func_8007DA44
   sub.s F20, F20, F22
  addiu S0, S0, 1
  slti  V0, S0, 3
  bnez  V0, L80102E18
   nop
  jal   func_8007D9E0
   li    A0, 30
  jal   func_8007959C
   li    A0, 812
  mtc1  R0, F22
  li    AT, 0x41A00000 ;20.000000
  mtc1  AT, F30
  li    AT, 0x3D230000 ;0.039795
  ori   AT, AT, 0xd70a
  mtc1  AT, F28
  mtc1  R0, F26
  li    AT, 0x3F990000 ;1.195312
  ori   AT, AT, 0x999a
  mtc1  AT, F24
L80102E80:
  lw    V0, 0x3c(S1)
  lw    V0, 0x40(V0)
  lh    V0, 0(V0)
  sll   A0, V0, 1
  addu  A0, A0, V0
  sll   A0, A0, 6
  lui   V0, hi(D_800FC834)
  lw    V0, lo(D_800FC834)(V0)
  addu  A0, A0, V0
  mfc1  A1, F22
  nop
  jal   func_800B39F0
   addiu A0, A0, 0x74
  sub.s F20, F20, F28
  c.lt.s F20, F26
  nop
  nop
  bc1t  L80102EFC
   add.s F22, F22, F30
  mfc1  A1, F20
  mfc1  A2, F20
  mfc1  A3, F20
  nop
  jal   func_800B3160
   addiu A0, S1, 0x24
  lwc1  F0, 0x30(S1)
  sub.s F0, F0, F24
  jal   func_8007DA44
   swc1  F0, 0x30(S1)
  j     L80102E80
   nop
L80102EFC:
  jal   func_80049F90
   move  A0, S2
  jal   func_8004430C
   move  A0, S1
  lui   AT, hi(D_801136D0)
  sw    R0, lo(D_801136D0)(AT)
  jal   func_80076FCC
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

func_80102F4C:
  addiu SP, SP, -0x28
  sw    RA, 0x18(SP)
  sw    S1, 0x14(SP)
  sw    S0, 0x10(SP)
  sdc1  F20, 0x20(SP)
  move  S1, A0
  lw    S0, 0(S1)
  li    AT, 0x40800000 ;4.000000
  mtc1  AT, F0
  nop
  swc1  F0, 0x34(S0)
  li    AT, 0xBF190000 ;-0.597656
  ori   AT, AT, 0x999a
  mtc1  AT, F0
  nop
  swc1  F0, 0x38(S0)
  jal   func_8007D9E0
   li    A0, 3
  mtc1  R0, F2
  lwc1  F0, 0x38(S0)
  c.eq.s F0, F2
  nop
  bc1t  L80102FCC
   nop
  mtc1  R0, F20
L80102FB0:
  jal   func_8007DA44
   nop
  lwc1  F0, 0x38(S0)
  c.eq.s F0, F20
  nop
  bc1f  L80102FB0
   nop
L80102FCC:
  lw    A0, 0(S1)
  move  A1, R0
  jal   func_80044494
   li    A2, 2
  jal   func_8005B338
   move  A0, S1
  lw    RA, 0x18(SP)
  lw    S1, 0x14(SP)
  lw    S0, 0x10(SP)
  ldc1  F20, 0x20(SP)
  jr    RA
   addiu SP, SP, 0x28

; show_next_star_fn?
func_80102FFC:
  addiu SP, SP, -0x38
  sw    RA, 0x30(SP)
  sw    S3, 0x2c(SP)
  sw    S2, 0x28(SP)
  sw    S1, 0x24(SP)
  sw    S0, 0x20(SP)
  lui   S2, hi(D_800F93A8)
  addiu S2, S2, lo(D_800F93A8)
  move  S3, R0
  lui   AT, hi(D_800CCC18)
  sw    R0, lo(D_800CCC18)(AT)
  lui   V0, hi(D_800F93AA)
  lh    V0, lo(D_800F93AA)(V0)
  sll   V0, V0, 2
  lui   A0, hi(D_800CC6A8)
  addu  A0, A0, V0
  lw    A0, lo(D_800CC6A8)(A0)
  jal   func_80050304
   move  A1, R0
  move  S1, V0
  lui   V0, hi(D_800F93AA)
  lh    V0, lo(D_800F93AA)(V0)
  sll   V0, V0, 2
  lui   AT, hi(D_800CC6C4)
  addu  AT, AT, V0
  jal   func_800B83C0
   lwc1  F12, lo(D_800CC6C4)(AT)
  lw    V0, 0(S1)
  swc1  F0, 0x18(V0)
  lui   V0, hi(D_800F93AA)
  lh    V0, lo(D_800F93AA)(V0)
  sll   V0, V0, 2
  lui   AT, hi(D_800CC6C4)
  addu  AT, AT, V0
  jal   func_800B7890
   lwc1  F12, lo(D_800CC6C4)(AT)
  lw    V0, 0(S1)
  swc1  F0, 0x20(V0)
  jal   func_8005B338
   move  A0, S1
  jal   func_80079390
   li    A0, 17
  lw    A0, 0(S1)
  li    A1, 2
  lui   A3, hi(D_801119A4)
  lw    A3, lo(D_801119A4)(A3)
  jal   func_8005AB50
   li    A2, 8
  jal   func_80067558
   nop
  li    A0, 2
  jal   func_8008F544
   li    A1, 16
L801030D0:
  jal   func_8008F618
   nop
  beqz  V0, L801030F0
   nop
  jal   func_8007DA44
   nop
  j     L801030D0
   nop
L801030F0:
  jal   func_80051500
   nop
  li    AT, 0x40400000 ;3.000000
  mtc1  AT, F12
  jal   func_80053608
   nop
  jal   func_80102F4C
   move  A0, S1
  lh    V0, 0xa(S2)
  bnez  V0, L80103144
   nop
  jal   func_80068328
   li    A0, 68
  bnez  V0, L80103144
   nop
  lui   V0, hi(D_800F8D12)
  lh    V0, lo(D_800F8D12)(V0)
  beqz  V0, L8010315C
   li    A1, 1711
  j     L8010315C
   li    A1, 1713
L80103144:
  lui   V0, hi(D_800F8D12)
  lh    V0, lo(D_800F8D12)(V0)
  sltu  V0, R0, V0
  subu V0, R0, V0
  andi  V0, V0, 0x6b1
  ori   A1, V0, 0x6b0
L8010315C:
  lh    A0, 8(S1)
  li    A2, -1
  jal   func_800890CC
   li    A3, -1
  lh    A0, 8(S1)
  jal   func_8008E2DC
   li    A1, 1
  jal   func_8007959C
   li    A0, 286
  lh    A0, 8(S1)
  jal   func_80057DC0
   nop
  li    V0, 2
  sw    V0, 0x10(SP)
  lw    A0, 0(S1)
  li    A1, -1
  move  A2, R0
  jal   func_80044530
   li    A3, 6
  jal   func_8005B338
   move  A0, S1
  lh    A0, 8(S1)
  jal   func_8008E4D0
   li    A1, 1
  lw    V0, 0(S1)
  lw    V0, 0x3c(V0)
  lw    V0, 0x40(V0)
  jal   func_8002D4A0
   lh    A0, 0(V0)
  lui   V0, hi(D_800F8D12)
  lh    V0, lo(D_800F8D12)(V0)
  beqz  V0, L80103204
   nop
  jal   GetRandomByte
   nop
  andi  S3, V0, 1
  andi  V0, S3, 0xff
  bnez  V0, L80103204
   nop
  lh    V0, 0x1c(S2)
  j     L80103218
   sll   V0, V0, 1
L80103204:
  lh    V0, 0xa(S2)
  sll   V0, V0, 1
  addu  V0, V0, S2
  lh    V0, 0xc(V0)
  sll   V0, V0, 1
L80103218:
  lui   A0, hi(D_80111994)
  addu  A0, A0, V0
  jal   func_80054B8C
   lh    A0, lo(D_80111994)(A0)
  move  S0, V0
  jal   func_80053620
   addiu A0, S0, 8
  li    AT, 0x40600000 ;3.500000
  mtc1  AT, F12
  jal   func_80053980
   nop
  jal   func_8007D9E0
   li    A0, 5
L8010324C:
  jal   func_80053998
   nop
  beqz  V0, L8010326C
   nop
  jal   func_8007DA44
   nop
  j     L8010324C
   nop
L8010326C:
  jal   func_8007D9E0
   li    A0, 5
  lw    A0, 0(S1)
  move  A1, R0
  jal   func_80044494
   li    A2, 2
  jal   func_8005B338
   move  A0, S1
  lui   V0, hi(D_8010008C) ; TODO?
  lh    V0, lo(D_800F8D12)(V0)
  bnez  V0, L801032CC
   move  A2, R0
  lui   A0, hi(func_80102D28)
  addiu A0, A0, lo(func_80102D28)
  li    A1, 18432
  jal   InitProcess
   move  A3, R0
  lui   AT, hi(D_801136D0)
  sw    V0, lo(D_801136D0)(AT)
  sw    S0, lo(D_8010008C)(V0)
  jal   func_8007D9E0
   li    A0, 30
  j     L801032D4
   nop
L801032CC:
  lui   AT, hi(D_801136D0)
  sw    R0, lo(D_801136D0)(AT)
L801032D4:
  lh    V1, 8(S1)
  lui   A0, hi(D_800F920C)
  lw    A0, lo(D_800F920C)(A0)
  sll   V0, V1, 2
  addu  V0, V0, V1
  sll   V0, V0, 5
  subu  V0, V0, V1
  sll   V0, V0, 2
  addu  V0, V0, A0
  li    V1, 1
  jal   func_8007DA44
   sb    V1, 0x20(V0)
  lh    A0, 8(S1)
  jal   func_8008E2DC
   li    A1, 1
  lh    A0, 8(S1)
  jal   func_80057DC0
   nop
  li    V0, 2
  sw    V0, 0x10(SP)
  lw    A0, 0(S1)
  li    A1, -1
  move  A2, R0
  jal   func_80044530
   li    A3, 6
  jal   func_8005B338
   move  A0, S1
  lh    A0, 8(S1)
  jal   func_8008E4D0
   li    A1, 1
  lw    V0, 0(S1)
  lw    V0, 0x3c(V0)
  lw    V0, 0x40(V0)
  jal   func_8002D4A0
   lh    A0, 0(V0)
  lh    V1, 0x1c(S2)
  li    V0, -1
  beq   V1, V0, L801034D0
   nop
  lui   V0, hi(D_801136D0)
  lw    V0, lo(D_801136D0)(V0)
  beqz  V0, L80103398
   nop
L80103380:
  jal   func_8007DA44
   nop
  lui   V0, hi(D_801136D0)
  lw    V0, lo(D_801136D0)(V0)
  bnez  V0, L80103380
   nop
L80103398:
  lui   V0, hi(D_800F8D12)
  lh    V0, lo(D_800F8D12)(V0)
  beqz  V0, L801033C8
   andi  V0, S3, 0xff
  bnez  V0, L801033C8
   nop
  lh    V0, 0xa(S2)
  sll   V0, V0, 1
  addu  V0, V0, S2
  lh    V0, 0xc(V0)
  j     L801033D0
   sll   V0, V0, 1
L801033C8:
  lh    V0, 0x1c(S2)
  sll   V0, V0, 1
L801033D0:
  lui   A0, hi(D_80111994)
  addu  A0, A0, V0
  jal   func_80054B8C
   lh    A0, lo(D_80111994)(A0)
  move  S0, V0
  jal   func_80053620
   addiu A0, S0, 8
  li    AT, 0x40600000 ;3.500000
  mtc1  AT, F12
  jal   func_80053980
   nop
  jal   func_8007D9E0
   li    A0, 5
L80103404:
  jal   func_80053998
   nop
  beqz  V0, L80103424
   nop
  jal   func_8007DA44
   nop
  j     L80103404
   nop
L80103424:
  jal   func_8007D9E0
   li    A0, 5
  lw    A0, 0(S1)
  move  A1, R0
  jal   func_80044494
   li    A2, 2
  lw    V0, 0(S1)
  lw    V0, 0x3c(V0)
  lw    V1, 0x40(V0)
  lh    V0, 2(S2)
  sll   V0, V0, 2
  lh    A0, 0(V1)
  lui   A1, hi(D_801119AC)
  addu  A1, A1, V0
  jal   func_80029FE4
   lw    A1, lo(D_801119AC)(A1)
  jal   func_8005B338
   move  A0, S1
  lw    A0, 0(S1)
  lui   A1, hi(D_801119A8)
  jal   func_8005AC6C
   lw    A1, lo(D_801119A8)(A1)
  lh    V1, 8(S1)
  lui   A0, hi(D_800F920C)
  lw    A0, lo(D_800F920C)(A0)
  sll   V0, V1, 2
  addu  V0, V0, V1
  sll   V0, V0, 5
  subu  V0, V0, V1
  sll   V0, V0, 2
  addu  V0, V0, A0
  li    V1, 1
  jal   func_8007DA44
   sb    V1, 0x20(V0)
  lh    A0, 8(S1)
  jal   func_8008E2DC
   li    A1, 1
  lh    A0, 8(S1)
  jal   func_80057DC0
   nop
  lh    A0, 8(S1)
  jal   func_8008E4D0
   li    A1, 1
L801034D0:
  jal   func_800794A8
   li    A0, 90
  jal   func_8007D9E0
   li    A0, 30
  li    A0, 2
  jal   func_8008F5AC
   li    A1, 16
  jal   func_8007D9E0
   li    A0, 17
  li    V0, 1
  lui   AT, hi(D_800CCC18)
  jal   func_80067720
   sw    V0, lo(D_800CCC18)(AT)
  jal   func_8005057C
   move  A0, S1
  jal   func_80063178
   nop
  jal   func_80077160
   li    A0, 1
  jal   func_80077574
   nop
  jal   func_8007DA44
   nop
  lw    RA, 0x30(SP)
  lw    S3, 0x2c(SP)
  lw    S2, 0x28(SP)
  lw    S1, 0x24(SP)
  lw    S0, 0x20(SP)
  jr    RA
   addiu SP, SP, 0x38

func_80103548:
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
  jal   func_8007D838
   sdc1  F20, 0x38(SP)
  lw    S0, 0x8c(V0)
  jal   func_8005DC3C
   li    A0, -1
  move  S3, V0
  lui   V0, hi(D_801119D0)
  lw    V0, lo(D_801119D0)(V0)
  bnez  V0, L8010359C
   li    A0, 846
  li    A0, 853
L8010359C:
  jal   func_8007959C
   nop
  lui   V0, hi(D_801136D4)
  lw    V0, lo(D_801136D4)(V0)
  bnez  V0, L801035B8
   li    A0, 13
  li    A0, 25
L801035B8:
  jal   func_80043510
   move  A1, R0
  move  S1, V0
  lhu   V0, 0xa(S1)
  ori   V0, V0, 4
  sh    V0, 0xa(S1)
  jal   func_80056754
   move  A0, S1
  lwc1  F2, 0x10(S0)
  li    AT, 0x41200000 ;10.000000
  mtc1  AT, F0
  lw    A1, 0xc(S0)
  add.s F0, F2, F0
  mfc1  A2, F0
  lw    A3, 0x14(S0)
  jal   func_800B3160
   addiu A0, S1, 0xc
  lui   V0, hi(D_800C9B80)
  lw    V0, lo(D_800C9B80)(V0)
  lw    A1, 0xc(V0)
  lw    A2, 0x10(V0)
  lw    A3, 0x14(V0)
  jal   func_800B3160
   addiu A0, SP, 0x10
  li    AT, 0x41700000 ;15.000000
  mtc1  AT, F0
  nop
  swc1  F0, 0x30(S1)
  move  A0, S1
  jal   func_80049ED4
   move  A1, R0
  move  S2, V0
  li    AT, 0x3DCC0000 ;0.099609
  ori AT, AT, 0xcccd
  mtc1  AT, F0
  nop
  swc1  F0, 0x18(S2)
  mtc1  R0, F20
  move  S0, R0
  li    AT, 0x3F000000 ;0.500000
  mtc1  AT, F22
L8010365C:
  mfc1  A1, F20
  mfc1  A2, F20
  mfc1  A3, F20
  nop
  jal   func_800B3160
   addiu A0, S1, 0x24
  jal   func_8007DA44
   add.s F20, F20, F22
  addiu S0, S0, 1
  slti  V0, S0, 6
  bnez  V0, L8010365C
   nop
  move  S0, R0
  li    AT, 0x3ECC0000 ;0.398438
  ori AT, AT, 0xcccd
  mtc1  AT, F22
L8010369C:
  mfc1  A1, F20
  mfc1  A2, F20
  mfc1  A3, F20
  nop
  jal   func_800B3160
   addiu A0, S1, 0x24
  jal   func_8007DA44
   sub.s F20, F20, F22
  addiu S0, S0, 1
  slti  V0, S0, 3
  bnez  V0, L8010369C
   nop
  jal   func_8007D9E0
   li    A0, 20
  jal   func_8007959C
   li    A0, 812
  mtc1  R0, F22
  lw    V0, 0x24(S3)
  lwc1  F2, 0x10(V0)
  li    AT, 0x41200000 ;10.000000
  mtc1  AT, F0
  lw    A1, 0xc(V0)
  sub.s F0, F2, F0
  mfc1  A2, F0
  lw    A3, 0x14(V0)
  jal   func_800B3160
   addiu A0, SP, 0x10
  addiu A2, S1, 0xc
  move  A0, A2
  addiu A1, SP, 0x10
  jal   func_80056D80
   li    A3, 40
  move  S0, R0
  li    AT, 0x41A00000 ;20.000000
  mtc1  AT, F28
  li    AT, 0x3D4C0000 ;0.049805
  ori AT, AT, 0xcccd
  mtc1  AT, F26
  mtc1  R0, F24
L80103738:
  lw    V0, 0x3c(S1)
  lw    V0, 0x40(V0)
  lh    V0, 0(V0)
  sll   A0, V0, 1
  addu  A0, A0, V0
  sll   A0, A0, 6
  lui   V0, hi(D_800FC834)
  lw    V0, lo(D_800FC834)(V0)
  addu  A0, A0, V0
  mfc1  A1, F22
  nop
  jal   func_800B39F0
   addiu A0, A0, 0x74
  sub.s F20, F20, F26
  c.lt.s F20, F24
  nop
  nop
  bc1f  L80103788
   add.s F22, F22, F28
  mov.s F20, F24
L80103788:
  mfc1  A1, F20
  mfc1  A2, F20
  mfc1  A3, F20
  nop
  jal   func_800B3160
   addiu A0, S1, 0x24
  jal   func_8007DA44
   addiu S0, S0, 1
  slti  V0, S0, 0x28
  bnez  V0, L80103738
   nop
  jal   func_8004430C
   move  A0, S1
  jal   func_80049F90
   move  A0, S2
  lw    A0, 0x24(S3)
  jal   func_8005670C
   addiu A0, A0, 0x18
  lui   V0, hi(D_801136D4)
  lw    V0, lo(D_801136D4)(V0)
  bnez  V0, L801038D0
   li    A0, -1
  jal   func_80067170
   li    A1, 5
  lui   V0, hi(D_801119D0)
  lw    V0, lo(D_801119D0)(V0)
  beqz  V0, L80103808
   nop
  jal   func_80079428
   li    A0, 92
  j     L80103810
   nop
L80103808:
  jal   func_80079390
   li    A0, 92
L80103810:
  lui   A0, hi(D_800F93C6)
  addiu A0, A0, lo(D_800F93C6)
  lh    V1, 0(A0)
  sll   V0, V1, 1
  addu  V0, V0, V1
  sll   V0, V0, 2
  addu  V0, V0, V1
  sll   V0, V0, 2
  lui   V1, hi(p1_stars)
  addu  V1, V1, V0
  lhu   V1, lo(p1_stars)(V1)
  addiu V1, V1, 1
  lui   AT, hi(p1_stars)
  addu  AT, AT, V0
  sh    V1, lo(p1_stars)(AT)
  lh    V1, 0(A0)
  sll   V0, V1, 1
  addu  V0, V0, V1
  sll   V0, V0, 2
  addu  V0, V0, V1
  sll   V1, V0, 2
  lui   V0, hi(p1_stars)
  addu  V0, V0, V1
  lh    V0, lo(p1_stars)(V0)
  slti  V0, V0, 0x64
  bnez  V0, L8010388C
   li    A0, -1
  li    V0, 99
  lui   AT, hi(p1_stars)
  addu  AT, AT, V1
  sh    V0, lo(p1_stars)(AT)
L8010388C:
  li    A1, 6
  jal   func_8005DD68
   move  A2, R0
  lui   V1, hi(D_800F93C6)
  lh    V1, lo(D_800F93C6)(V1)
  sll   V0, V1, 1
  addu  V0, V0, V1
  sll   V0, V0, 2
  addu  V0, V0, V1
  sll   V0, V0, 2
  lui   A1, hi(p1_char)
  addu  A1, A1, V0
  lbu   A1, lo(p1_char)(A1)
  jal   func_80079718
   li    A0, 245
  j     L80103928
   nop
L801038D0:
  jal   func_80067170
   li    A1, 5
  jal   func_80079428
   li    A0, 93
  li    A0, -1
  li    A1, 3
  jal   func_8005DD68
   move  A2, R0
  lui   V1, hi(D_800F93C6)
  lh    V1, lo(D_800F93C6)(V1)
  sll   V0, V1, 1
  addu  V0, V0, V1
  sll   V0, V0, 2
  addu  V0, V0, V1
  sll   V0, V0, 2
  lui   A1, hi(p1_char)
  addu  A1, A1, V0
  lbu   A1, lo(p1_char)(A1)
  jal   func_80079718
   li    A0, 273
  jal   func_8007D9E0
   li    A0, 30
L80103928:
  jal   func_8007D9E0
   li    A0, 60
  jal   func_80076FCC
   move  A0, R0
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

func_80103968:
  addiu SP, SP, -0x20
/*  */  sw    RA, 0x18(SP)
  sw    S1, 0x14(SP)
  sw    S0, 0x10(SP)
  move  S1, A0
  lui   AT, hi(D_800FC734)
  sh    R0, lo(D_800FC734)(AT)
  lui   AT, hi(D_801136D4)
  sw    R0, lo(D_801136D4)(AT)
  lui   A0, hi(func_80103548)
  addiu A0, A0, lo(func_80103548)
  li    A1, 18432
  move  A2, R0
  jal   InitProcess
   move  A3, R0
  move  S0, V0
  jal   func_8007D838
   sw    S1, 0x8c(S0)
  move  A0, V0
  jal   func_8007D700
   move  A1, S0
  jal   func_8007D7E8
   nop
  li    V0, 1
  lui   AT, hi(D_800FC734)
  sh    V0, lo(D_800FC734)(AT)
  lw    RA, 0x18(SP)
  lw    S1, 0x14(SP)
  lw    S0, 0x10(SP)
  jr    RA
   addiu SP, SP, 0x20

func_801039E4:
  addiu SP, SP, -0x20
  sw    RA, 0x18(SP)
  sw    S1, 0x14(SP)
  sw    S0, 0x10(SP)
  move  S1, A0
  lui   AT, hi(D_800FC734)
  sh    R0, lo(D_800FC734)(AT)
  li    V0, 1
  lui   AT, hi(D_801136D4)
  sw    V0, lo(D_801136D4)(AT)
  lui   A0, hi(func_80103548)
  addiu A0, A0, lo(func_80103548)
  li    A1, 18432
  move  A2, R0
  jal   InitProcess
   move  A3, R0
  move  S0, V0
  jal   func_8007D838
   sw    S1, 0x8c(S0)
  move  A0, V0
  jal   func_8007D700
   move  A1, S0
  jal   func_8007D7E8
   nop
  li    V0, 1
  lui   AT, hi(D_800FC734)
  sh    V0, lo(D_800FC734)(AT)
  lw    RA, 0x18(SP)
  lw    S1, 0x14(SP)
  lw    S0, 0x10(SP)
  jr    RA
   addiu SP, SP, 0x20

; View map?
__PP64_INTERNAL_VIEW_MAP:
  addiu SP, SP, -0x18
  sw    RA, 0x14(SP)
  sw    S0, 0x10(SP)
  li    S0, 1
  lui   AT, hi(D_800FA198)
  sh    S0, lo(D_800FA198)(AT) ; set 1 to indicate map is being viewed?
  lui   AT, hi(D_800FC734)
  jal   func_8007D838
   sh    R0, lo(D_800FC734)(AT)
  move  A0, V0
  jal   func_80076B44
   li    A1, 128
  lui   V1, hi(D_800F93C6)
  lh    V1, lo(D_800F93C6)(V1)
  sll   V0, V1, 1
  addu  V0, V0, V1
  sll   V0, V0, 2
  addu  V0, V0, V1
  sll   V0, V0, 2
  lui   A0, hi(p1_controller)
  addu  A0, A0, V0
  jal   func_80067C6C
   lbu   A0, lo(p1_controller)(A0)
  jal   func_8007D838
   nop
  move  A0, V0
  jal   func_80076B70
   li    A1, 128
  lui   AT, hi(D_800FA198)
  sh    R0, lo(D_800FA198)(AT)
  lui   AT, hi(D_800FC734)
  sh    S0, lo(D_800FC734)(AT)
  lw    RA, 0x14(SP)
  lw    S0, 0x10(SP)
  jr    RA
   addiu SP, SP, 0x18

func_80103AF4:
  addiu SP, SP, -0x18
  sw    RA, 0x14(SP)
  sw    S0, 0x10(SP)
  li    S0, 1
  lui   AT, hi(D_800FA198)
  sh    S0, lo(D_800FA198)(AT)
  lui   AT, hi(D_800FC734)
  jal   func_8007D838
   sh    R0, lo(D_800FC734)(AT)
  move  A0, V0
  jal   func_80076B44
   li    A1, 128
  lui   V1, hi(D_800F93C6)
  lh    V1, lo(D_800F93C6)(V1)
  sll   V0, V1, 1
  addu  V0, V0, V1
  sll   V0, V0, 2
  addu  V0, V0, V1
  sll   V0, V0, 2
  lui   A0, hi(p1_controller)
  addu  A0, A0, V0
  jal   func_80067C6C
   lbu   A0, lo(p1_controller)(A0)
  lui   AT, hi(D_800FA198)
  sh    R0, lo(D_800FA198)(AT)
  lui   AT, hi(D_800FC734)
  sh    S0, lo(D_800FC734)(AT)
  lw    RA, 0x14(SP)
  lw    S0, 0x10(SP)
  jr    RA
   addiu SP, SP, 0x18

func_80103B70:
  addiu SP, SP, -0x18
  sw    RA, 0x10(SP)
  jal   GetRandomByte
   nop
  andi  V0, V0, 0xff
  mtc1  V0, F0
  nop
  cvt.s.w F0, F0
  li    AT, 0x43800000 ;256.000000
  mtc1  AT, F2
  nop
  div.s F0, F0, F2
  li    AT, 0x42C80000 ;100.000000
  mtc1  AT, F2
  nop
  mul.s F0, F0, F2
  trunc.w.s F2, F0
  mfc1  V0, F2
  lw    RA, 0x10(SP)
  jr    RA
   addiu SP, SP, 0x18

func_80103CF4:
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
  lui   A1, hi(D_80113590)
  addiu A1, A1, lo(D_80113590)
  lwl   V0, 0(A1)
  lwr   V0, 3(A1)
  swl   V0, 0x20(SP)
  swr   V0, 0x23(SP)
  move  S1, R0
  lui   S4, hi(D_800F93C6)
  addiu S4, S4, lo(D_800F93C6)
  addiu S3, SP, 0x18
L80103D44:
  lh    V0, 0(S4)
  bne   S1, V0, L80103E10
   sll   V0, S1, 1
  addu  V0, V0, S1
  sll   V0, V0, 2
  addu  V0, V0, S1
  sll   V0, V0, 2
  lui   AT, hi(D_800FD2C6)
  addu  AT, AT, V0
  lhu   V0, lo(D_800FD2C6)(AT)
  andi  V0, V0, 1
  beqz  V0, L80103DBC
   sll   S0, S1, 1
  jal   func_8011155C
   addiu S1, S1, 1
  move  S2, V0
  lh    V1, 0(S4)
  sll   V0, V1, 1
  addu  V0, V0, V1
  sll   V0, V0, 2
  addu  V0, V0, V1
  sll   V0, V0, 2
  lui   AT, hi(p1_controller)
  addu  AT, AT, V0
  lbu   V0, lo(p1_controller)(AT)
  sll   V0, V0, 1
  addu  V0, V0, S3
  li    V1, 1024
  j     L80103E3C
   sh    V1, 0(V0)
L80103DBC:
  addu  S0, S0, S1
  sll   S0, S0, 2
  addu  S0, S0, S1
  sll   S0, S0, 2
  lui   V0, hi(p1_controller)
  addu  V0, V0, S0
  lbu   V0, lo(p1_controller)(V0)
  addu  V0, SP, V0
  lui   A0, hi(D_800F9052)
  lh    A0, lo(D_800F9052)(A0)
  lbu   A1, 0x20(V0)
  jal   func_8008D59C
   addiu S1, S1, 1
  lui   V0, hi(p1_controller)
  addu  V0, V0, S0
  lbu   V0, lo(p1_controller)(V0)
  sll   V0, V0, 1
  addu  V0, V0, S3
  li    V1, -1
  j     L80103E3C
   sh    V1, 0(V0)
L80103E10:
  addu  V0, V0, S1
  sll   V0, V0, 2
  addu  V0, V0, S1
  sll   V0, V0, 2
  lui   AT, hi(p1_controller)
  addu  AT, AT, V0
  lbu   V0, lo(p1_controller)(AT)
  sll   V0, V0, 1
  addu  V0, V0, S3
  sh    R0, 0(V0)
  addiu S1, S1, 1
L80103E3C:
  slti  V0, S1, 4
  bnez  V0, L80103D44
   nop
  beqz  S2, L80103EFC
   li    A1, 2
  lui   A0, hi(D_800F9052)
  lh    A0, lo(D_800F9052)(A0)
  jal   func_80089284
   li    A2, 2
  move  S0, R0
  addiu S1, SP, 0x18
L80103E68:
  addiu S2, S2, -1
  bnez  S2, L80103EAC
   nop
  lui   V1, hi(D_800F93C6)
  lh    V1, lo(D_800F93C6)(V1)
  sll   V0, V1, 1
  addu  V0, V0, V1
  sll   V0, V0, 2
  addu  V0, V0, V1
  sll   V0, V0, 2
  lui   AT, hi(p1_controller)
  addu  AT, AT, V0
  lbu   V0, lo(p1_controller)(AT)
  sll   V0, V0, 1
  addu  V0, V0, S1
  li    V1, -32768
  sh    V1, 0(V0)
L80103EAC:
  bnez  S0, L80103ED4
   li    V0, 16
  jal   func_80057718
   nop
  lh    A0, 0x18(SP)
  lh    A1, 0x1a(SP)
  lh    A2, 0x1c(SP)
  lh    A3, 0x1e(SP)
  j     L80103EE4
   andi  V0, V0, 0xff
L80103ED4:
  lh    A0, 0x18(SP)
  lh    A1, 0x1a(SP)
  lh    A2, 0x1c(SP)
  lh    A3, 0x1e(SP)
L80103EE4:
  jal   func_8008CFD0
   sw    V0, 0x10(SP)
  bnez  S2, L80103E68
   addiu S0, S0, 1
  j     L80103F14
   move  S1, R0
L80103EFC:
  lh    A0, 0x18(SP)
  lh    A1, 0x1a(SP)
  lh    A2, 0x1c(SP)
  lh    A3, 0x1e(SP)
  jal   func_8008D07C
   move  S1, R0
L80103F14:
  addu  V0, S5, S1
L80103F18:
  lbu   V0, 0(V0)
  bnel  V0, R0, L80103F3C
   addiu S1, S1, 1
  sll   A1, S1, 0x10
  lui   A0, hi(D_800F9052)
  lh    A0, lo(D_800F9052)(A0)
  jal   func_8008D854
   sra   A1, A1, 0x10
  addiu S1, S1, 1
L80103F3C:
  slti  V0, S1, 2
  bnez  V0, L80103F18
   addu  V0, S5, S1
  move  S1, R0
  li    S0, -1
  sll   A1, S1, 0x10
L80103F54:
  lui   A0, hi(D_800F9052)
  lh    A0, lo(D_800F9052)(A0)
  sra   A1, A1, 0x10
  jal   func_8008BB48
   move  A2, R0
  move  S1, V0
  beq   S1, S0, L80103F88
   addu  V0, S5, S1
  lbu   V0, 0(V0)
  beqz  V0, L80103F54
   sll   A1, S1, 0x10
  j     L80103F8C
   move  V0, S1
L80103F88:
  li    V0, -1
L80103F8C:
  lw    RA, 0x40(SP)
  lw    S5, 0x3c(SP)
  lw    S4, 0x38(SP)
  lw    S3, 0x34(SP)
  lw    S2, 0x30(SP)
  lw    S1, 0x2c(SP)
  lw    S0, 0x28(SP)
  jr    RA
   addiu SP, SP, 0x48

__PP64_INTERNAL_RAND_MESSAGE_CHOICE:
func_80103FB0:
  addiu SP, SP, -0x40
  sw    RA, 0x38(SP)
  sw    S3, 0x34(SP)
  sw    S2, 0x30(SP)
  sw    S1, 0x2c(SP)
  sw    S0, 0x28(SP)
  move  S2, R0
  lui   A1, hi(D_80113590)
  addiu A1, A1, lo(D_80113590)
  lwl   V0, 0(A1)
  lwr   V0, 3(A1)
  swl   V0, 0x20(SP)
  swr   V0, 0x23(SP)
  move  S1, R0
  addiu S3, SP, 0x18
L80103FEC:
  lui   V0, hi(D_800F93C6)
  lh    V0, lo(D_800F93C6)(V0)
  bne   S1, V0, L801040A4
   sll   V0, S1, 1
  addu  V0, V0, S1
  sll   V0, V0, 2
  addu  V0, V0, S1
  sll   S0, V0, 2
  lui   V0, hi(D_800FD2C6)
  addu  V0, V0, S0
  lhu   V0, lo(D_800FD2C6)(V0)
  andi  V0, V0, 1
  beql  V0, R0, L80104050
   sll   S0, S1, 1
  jal   func_801118D8
   addiu S1, S1, 1
  move  S2, V0
  lui   V0, hi(p1_controller)
  addu  V0, V0, S0
  lbu   V0, lo(p1_controller)(V0)
  sll   V0, V0, 1
  addu  V0, V0, S3
  li    V1, 1024
  j     L801040D0
   sh    V1, 0(V0)
L80104050:
  addu  S0, S0, S1
  sll   S0, S0, 2
  addu  S0, S0, S1
  sll   S0, S0, 2
  lui   V0, hi(p1_controller)
  addu  V0, V0, S0
  lbu   V0, lo(p1_controller)(V0)
  addu  V0, SP, V0
  lui   A0, hi(D_800F9052)
  lh    A0, lo(D_800F9052)(A0)
  lbu   A1, 0x20(V0)
  jal   func_8008D59C
   addiu S1, S1, 1
  lui   V0, hi(p1_controller)
  addu  V0, V0, S0
  lbu   V0, lo(p1_controller)(V0)
  sll   V0, V0, 1
  addu  V0, V0, S3
  li    V1, -1
  j     L801040D0
   sh    V1, 0(V0)
L801040A4:
  addu  V0, V0, S1
  sll   V0, V0, 2
  addu  V0, V0, S1
  sll   V0, V0, 2
  lui   AT, hi(p1_controller)
  addu  AT, AT, V0
  lbu   V0, lo(p1_controller)(AT)
  sll   V0, V0, 1
  addu  V0, V0, S3
  sh    R0, 0(V0)
  addiu S1, S1, 1
L801040D0:
  slti  V0, S1, 4
  bnez  V0, L80103FEC
   nop
  beqz  S2, L80104190
   li    A1, 2
  lui   A0, hi(D_800F9052)
  lh    A0, lo(D_800F9052)(A0)
  jal   func_80089284
   li    A2, 2
  move  S0, R0
  addiu S1, SP, 0x18
L801040FC:
  addiu S2, S2, -1
  bnez  S2, L80104140
   nop
  lui   V1, hi(D_800F93C6)
  lh    V1, lo(D_800F93C6)(V1)
  sll   V0, V1, 1
  addu  V0, V0, V1
  sll   V0, V0, 2
  addu  V0, V0, V1
  sll   V0, V0, 2
  lui   AT, hi(p1_controller)
  addu  AT, AT, V0
  lbu   V0, lo(p1_controller)(AT)
  sll   V0, V0, 1
  addu  V0, V0, S1
  li    V1, -32768
  sh    V1, 0(V0)
L80104140:
  bnez  S0, L80104168
   li    V0, 16
  jal   func_80057718
   nop
  lh    A0, 0x18(SP)
  lh    A1, 0x1a(SP)
  lh    A2, 0x1c(SP)
  lh    A3, 0x1e(SP)
  j     L80104178
   andi  V0, V0, 0xff
L80104168:
  lh    A0, 0x18(SP)
  lh    A1, 0x1a(SP)
  lh    A2, 0x1c(SP)
  lh    A3, 0x1e(SP)
L80104178:
  jal   func_8008CFD0
   sw    V0, 0x10(SP)
  bnez  S2, L801040FC
   addiu S0, S0, 1
  j     L801041A4
   nop
L80104190:
  lh    A0, 0x18(SP)
  lh    A1, 0x1a(SP)
  lh    A2, 0x1c(SP)
  jal   func_8008D07C
   lh    A3, 0x1e(SP)
L801041A4:
  lui   A0, hi(D_800F9052)
  lh    A0, lo(D_800F9052)(A0)
  move  A1, R0
  jal   func_8008BB48
   li    A2, 1
  lw    RA, 0x38(SP)
  lw    S3, 0x34(SP)
  lw    S2, 0x30(SP)
  lw    S1, 0x2c(SP)
  lw    S0, 0x28(SP)
  jr    RA
   addiu SP, SP, 0x40

func_801041D4:
  addiu SP, SP, -0x40
  sw    RA, 0x38(SP)
  sw    S3, 0x34(SP)
  sw    S2, 0x30(SP)
  sw    S1, 0x2c(SP)
  sw    S0, 0x28(SP)
  move  S3, R0
  lui   A1, hi(D_80113590)
  addiu A1, A1, lo(D_80113590)
  lwl   V0, 0(A1)
  lwr   V0, 3(A1)
  swl   V0, 0x20(SP)
  swr   V0, 0x23(SP)
  move  S1, R0
  addiu S2, SP, 0x18
L80104210:
  lui   V0, hi(D_800F93C6)
  lh    V0, lo(D_800F93C6)(V0)
  bne   S1, V0, L801042C0
   sll   V0, S1, 1
  addu  V0, V0, S1
  sll   V0, V0, 2
  addu  V0, V0, S1
  sll   V1, V0, 2
  lui   V0, hi(D_800FD2C6)
  addu  V0, V0, V1
  lhu   V0, lo(D_800FD2C6)(V0)
  andi  V0, V0, 1
  beqz  V0, L8010426C
   sll   S0, S1, 1
  li    S3, 1
  lui   V0, hi(p1_controller)
  addu  V0, V0, V1
  lbu   V0, lo(p1_controller)(V0)
  sll   V0, V0, 1
  addu  V0, V0, S2
  li    V1, -32768
  j     L801042E8
   sh    V1, 0(V0)
L8010426C:
  addu  S0, S0, S1
  sll   S0, S0, 2
  addu  S0, S0, S1
  sll   S0, S0, 2
  lui   V0, hi(p1_controller)
  addu  V0, V0, S0
  lbu   V0, lo(p1_controller)(V0)
  addu  V0, SP, V0
  lui   A0, hi(D_800F9052)
  lh    A0, lo(D_800F9052)(A0)
  lbu   A1, 0x20(V0)
  jal   func_8008D59C
   addiu S1, S1, 1
  lui   V0, hi(p1_controller)
  addu  V0, V0, S0
  lbu   V0, lo(p1_controller)(V0)
  sll   V0, V0, 1
  addu  V0, V0, S2
  li    V1, -1
  j     L801042EC
   sh    V1, 0(V0)
L801042C0:
  addu  V0, V0, S1
  sll   V0, V0, 2
  addu  V0, V0, S1
  sll   V0, V0, 2
  lui   AT, hi(p1_controller)
  addu  AT, AT, V0
  lbu   V0, lo(p1_controller)(AT)
  sll   V0, V0, 1
  addu  V0, V0, S2
  sh    R0, 0(V0)
L801042E8:
  addiu S1, S1, 1
L801042EC:
  slti  V0, S1, 4
  bnez  V0, L80104210
   nop
  beqz  S3, L8010433C
   li    A1, 2
  lui   A0, hi(D_800F9052)
  lh    A0, lo(D_800F9052)(A0)
  jal   func_80089284
   li    A2, 2
  jal   func_80057718
   nop
  andi  V0, V0, 0xff
  lh    A0, 0x18(SP)
  lh    A1, 0x1a(SP)
  lh    A2, 0x1c(SP)
  lh    A3, 0x1e(SP)
  jal   func_8008CFD0
   sw    V0, 0x10(SP)
  j     L80104350
   nop
L8010433C:
  lh    A0, 0x18(SP)
  lh    A1, 0x1a(SP)
  lh    A2, 0x1c(SP)
  jal   func_8008D07C
   lh    A3, 0x1e(SP)
L80104350:
  lui   A0, hi(D_800F9052)
  lh    A0, lo(D_800F9052)(A0)
  move  A1, R0
  jal   func_8008BB48
   li    A2, 1
  lw    RA, 0x38(SP)
  lw    S3, 0x34(SP)
  lw    S2, 0x30(SP)
  lw    S1, 0x2c(SP)
  lw    S0, 0x28(SP)
  jr    RA
   addiu SP, SP, 0x40

func_80104380:
  addiu SP, SP, -0x20
  sw    RA, 0x18(SP)
  sw    S1, 0x14(SP)
  sw    S0, 0x10(SP)
  move  V1, R0
  lui   A0, hi(D_800F93C6)
  lh    A0, lo(D_800F93C6)(A0)
L8010439C:
  beq   V1, A0, L801043C8
   sll   V0, V1, 1
  addu  V0, V0, V1
  sll   V0, V0, 2
  addu  V0, V0, V1
  sll   V0, V0, 2
  lui   AT, hi(p1_stars)
  addu  AT, AT, V0
  lh    V0, lo(p1_stars)(AT)
  bnez  V0, L801043D8
   li    V0, 4
L801043C8:
  addiu V1, V1, 1
  slti  V0, V1, 4
  bnez  V0, L8010439C
   li    V0, 4
L801043D8:
  beq   V1, V0, L80104534
   nop
  lui   A0, hi(D_800F93C6)
  addiu A0, A0, lo(D_800F93C6)
  lh    V0, 0(A0)
  sll   V1, V0, 1
  addu  V1, V1, V0
  sll   V1, V1, 2
  addu  V1, V1, V0
  sll   V1, V1, 2
  lui   V0, hi(p1_coins)
  addu  V0, V0, V1
  lh    V0, lo(p1_coins)(V0)
  slti  V0, V0, 0x32
  bnez  V0, L80104534
   nop
  lh    V1, -0x18(A0)
  lh    V0, -0x16(A0)
  beq   V1, V0, L801045A4
   li    V0, 1
  lui   V0, hi(D_800F93B0)
  lh    V0, lo(D_800F93B0)(V0)
  slti  V0, V0, 0xa
  beqz  V0, L80104444
   nop
  j     L8010445C
   move  S1, R0
L80104444:
  lui   V0, hi(D_800F93B0)
  lh    V0, lo(D_800F93B0)(V0)
  slti  V0, V0, 0x1e
  beqz  V0, L8010445C
   li    S1, 2
  li    S1, 1
L8010445C:
  lui   V0, hi(D_800F93C6)
  lh    V0, lo(D_800F93C6)(V0)
  sll   V1, V0, 1
  addu  V1, V1, V0
  sll   V1, V1, 2
  addu  V1, V1, V0
  sll   V1, V1, 2
  lui   V0, hi(p1_coins)
  addu  V0, V0, V1
  lh    V0, lo(p1_coins)(V0)
  slti  V0, V0, 0x3d
  bnez  V0, L80104500
   move  S0, R0
  lui   V0, hi(D_800F93C6)
  lh    V0, lo(D_800F93C6)(V0)
  sll   V1, V0, 1
  addu  V1, V1, V0
  sll   V1, V1, 2
  addu  V1, V1, V0
  sll   V1, V1, 2
  lui   V0, hi(p1_coins)
  addu  V0, V0, V1
  lh    V0, lo(p1_coins)(V0)
  slti  V0, V0, 0x47
  bnez  V0, L80104500
   li    S0, 1
  lui   V0, hi(D_800F93C6)
  lh    V0, lo(D_800F93C6)(V0)
  sll   V1, V0, 1
  addu  V1, V1, V0
  sll   V1, V1, 2
  addu  V1, V1, V0
  sll   V1, V1, 2
  lui   V0, hi(p1_coins)
  addu  V0, V0, V1
  lh    V0, lo(p1_coins)(V0)
  slti  V0, V0, 0x65
  xori  V0, V0, 1
  subu V0, R0, V0
  andi  V0, V0, 3
  ori   S0, V0, 2
L80104500:
  jal   func_80103B70
   nop
  lui   A0, hi(D_801119D4)
  addiu A0, A0, lo(D_801119D4)
  sll   V1, S1, 2
  addu  V1, V1, A0
  addu  V1, V1, S0
  lbu   V1, 0(V1)
  slt   V0, V0, V1
  beqz  V0, L80104548
   li    V0, 1
  lui   AT, hi(D_80113710)
  sw    V0, lo(D_80113710)(AT)
L80104534:
  lui   V1, hi(D_80113710)
  lw    V1, lo(D_80113710)(V1)
  li    V0, 1
  beq   V1, V0, L801045AC
   nop
L80104548:
  move  V1, R0
  lui   A0, hi(D_800F93C6)
  lh    A0, lo(D_800F93C6)(A0)
L80104554:
  beq   V1, A0, L80104580
   sll   V0, V1, 1
  addu  V0, V0, V1
  sll   V0, V0, 2
  addu  V0, V0, V1
  sll   V0, V0, 2
  lui   AT, hi(p1_coins)
  addu  AT, AT, V0
  lh    V0, lo(p1_coins)(AT)
  bnez  V0, L80104590
   li    V0, 4
L80104580:
  addiu V1, V1, 1
  slti  V0, V1, 4
  bnez  V0, L80104554
   li    V0, 4
L80104590:
  beq   V1, V0, L801045A4
   li    V0, 2
  lui   AT, hi(D_80113710)
  j     L801045AC
   sw    R0, lo(D_80113710)(AT)
L801045A4:
  lui   AT, hi(D_80113710)
  sw    V0, lo(D_80113710)(AT)
L801045AC:
  lw    RA, 0x18(SP)
  lw    S1, 0x14(SP)
  lw    S0, 0x10(SP)
  jr    RA
   addiu SP, SP, 0x20

func_801045C0:
  addiu SP, SP, -0x38
  sw    RA, 0x34(SP)
  sw    S4, 0x30(SP)
  sw    S3, 0x2c(SP)
  sw    S2, 0x28(SP)
  sw    S1, 0x24(SP)
  sw    S0, 0x20(SP)
  lui   A1, hi(D_80113594)
  addiu A1, A1, lo(D_80113594)
  lw    V0, 0(A1)
  lw    V1, 4(A1)
  lw    A0, 8(A1)
  sw    V0, 0x10(SP)
  sw    V1, 0x14(SP)
  sw    A0, 0x18(SP)
  lw    V0, 0xc(A1)
  sw    V0, 0x1c(SP)
  lui   V0, hi(D_800F93C6)
  lh    V0, lo(D_800F93C6)(V0)
  lui   V1, hi(D_80113700)
  lw    V1, lo(D_80113700)(V1)
  beq   V0, V1, L80104644
   sll   V0, V1, 1
  addu  V0, V0, V1
  sll   V0, V0, 2
  addu  V0, V0, V1
  sll   V0, V0, 2
  lui   A2, hi(p1_coins)
  addu  A2, A2, V0
  lh    A2, lo(p1_coins)(A2)
  li    S1, 1
  j     L80104678
   sw    S1, 0x10(SP)
L80104644:
  lui   V0, hi(D_80113704)
  lw    V0, lo(D_80113704)(V0)
  sll   V1, V0, 1
  addu  V1, V1, V0
  sll   V1, V1, 2
  addu  V1, V1, V0
  sll   V1, V1, 2
  lui   A2, hi(p1_coins)
  addu  A2, A2, V1
  lh    A2, lo(p1_coins)(A2)
  li    S1, 2
  li    V0, 1
  sw    V0, 0x14(SP)
L80104678:
  slti  V0, S1, 4
  beqz  V0, L801046F8
   li    S2, 4
  lui   T2, hi(D_800F93C6)
  addiu T2, T2, lo(D_800F93C6)
  lui   T1, hi(D_80113700)
  addiu T1, T1, lo(D_80113700)
  addiu A3, SP, 0x10
  li    T0, 1
L8010469C:
  lh    V1, 0(T2)
  sll   A1, S1, 2
  addu  V0, A1, T1
  lw    A0, 0(V0)
  beq   V1, A0, L801046E8
   sll   V0, A0, 1
  addu  V0, V0, A0
  sll   V0, V0, 2
  addu  V0, V0, A0
  sll   V0, V0, 2
  lui   AT, hi(p1_coins)
  addu  AT, AT, V0
  lh    V0, lo(p1_coins)(AT)
  addiu V0, V0, 5
  slt   V0, V0, A2
  bnel  V0, R0, L801046EC
   addiu S1, S1, 1
  addu  V0, A1, A3
  sw    T0, 0(V0)
L801046E8:
  addiu S1, S1, 1
L801046EC:
  slti  V0, S1, 4
  bnez  V0, L8010469C
   li    S2, 4
L801046F8:
  move  S1, R0
  addiu S3, SP, 0x10
  lui   S4, hi(D_80113700)
  addiu S4, S4, lo(D_80113700)
  sll   A0, S1, 2
L8010470C:
  addu  V0, A0, S3
  lw    V0, 0(V0)
  beqz  V0, L80104744
   addu  S0, A0, S4
  lw    A0, 0(S0)
  jal   func_80059FD0
   nop
  slt   V0, V0, S2
  beql  V0, R0, L80104748
   addiu S1, S1, 1
  lw    A0, 0(S0)
  jal   func_80059FD0
   nop
  move  S2, V0
L80104744:
  addiu S1, S1, 1
L80104748:
  slti  V0, S1, 4
  bnez  V0, L8010470C
   sll   A0, S1, 2
  move  V0, S2
  lw    RA, 0x34(SP)
  lw    S4, 0x30(SP)
  lw    S3, 0x2c(SP)
  lw    S2, 0x28(SP)
  lw    S1, 0x24(SP)
  lw    S0, 0x20(SP)
  jr    RA
   addiu SP, SP, 0x38

func_80104778:
  addiu SP, SP, -0x30
  sw    RA, 0x28(SP)
  sw    S1, 0x24(SP)
  jal   func_80103B70
/*  */   sw    S0, 0x20(SP)
  lui   S0, hi(D_80113710)
  lw    S0, lo(D_80113710)(S0)
  beqz  S0, L80104AD4
   move  S1, V0
  li    V0, 1
  bne   S0, V0, L80104F68
   nop
  lui   A0, hi(D_800F93AE)
  addiu A0, A0, lo(D_800F93AE)
  lh    V1, 0(A0)
  lh    V0, 2(A0)
  addiu V0, V0, 5
  slt   V1, V1, V0
  beqz  V1, L80104948
   nop
  jal   func_80059FD0
   lh    A0, 0x18(A0)
  move  V1, V0
  beq   V1, S0, L80104880
   slti  V0, V1, 2
  beql  V0, R0, L801047F4
   li    V0, 2
  beqz  V1, L8010480C
   slti  V0, S1, 0x5f
  j     L80104F68
   nop
L801047F4:
  beq   V1, V0, L801048C4
   li    V0, 3
  beq   V1, V0, L80104908
   slti  V0, S1, 0x5f
  j     L80104F68
   nop
L8010480C:
  bnez  V0, L80104DD8
   li    V0, 1
  lui   V0, hi(D_801136F8)
  lw    V0, lo(D_801136F8)(V0)
  sll   V1, V0, 1
  addu  V1, V1, V0
  sll   V1, V1, 2
  addu  V1, V1, V0
  sll   V1, V1, 2
  lui   V0, hi(p1_stars)
  addu  V0, V0, V1
  lh    V0, lo(p1_stars)(V0)
  slti  V0, V0, 2
  beqz  V0, L80104DD8
   li    V0, 1
  lui   V0, hi(D_801136F8)
  lw    V0, lo(D_801136F8)(V0)
  sll   V1, V0, 1
  addu  V1, V1, V0
  sll   V1, V1, 2
  addu  V1, V1, V0
  sll   V1, V1, 2
  lui   V0, hi(p1_stars)
  addu  V0, V0, V1
  lh    V0, lo(p1_stars)(V0)
  bnez  V0, L80104A44
   li    V0, 2
  j     L80104DD8
   li    V0, 1
L80104880:
  slti  V0, S1, 0x5f
  bnez  V0, L80104EF4
   nop
  lui   V0, hi(D_801136F8)
  lw    V0, lo(D_801136F8)(V0)
  sll   V1, V0, 1
  addu  V1, V1, V0
  sll   V1, V1, 2
  addu  V1, V1, V0
  sll   V1, V1, 2
  lui   V0, hi(p1_stars)
  addu  V0, V0, V1
  lh    V0, lo(p1_stars)(V0)
  bnez  V0, L80104A44
   li    V0, 2
  j     L80104EF4
   nop
L801048C4:
  slti  V0, S1, 0x5f
  bnez  V0, L80104EF4
   nop
  lui   V0, hi(D_801136F4)
  lw    V0, lo(D_801136F4)(V0)
  sll   V1, V0, 1
  addu  V1, V1, V0
  sll   V1, V1, 2
  addu  V1, V1, V0
  sll   V1, V1, 2
  lui   V0, hi(p1_stars)
  addu  V0, V0, V1
  lh    V0, lo(p1_stars)(V0)
  bnez  V0, L80104DD8
   li    V0, 1
  j     L80104EF4
   nop
L80104908:
  bnez  V0, L80104EF4
   nop
  lui   V0, hi(D_801136F4)
  lw    V0, lo(D_801136F4)(V0)
  sll   V1, V0, 1
  addu  V1, V1, V0
  sll   V1, V1, 2
  addu  V1, V1, V0
  sll   V1, V1, 2
  lui   V0, hi(p1_stars)
  addu  V0, V0, V1
  lh    V0, lo(p1_stars)(V0)
  bnez  V0, L80104DD8
   li    V0, 1
  j     L80104EF4
   nop
L80104948:
  lui   A0, hi(D_800F93C6)
  jal   func_80059FD0
   lh    A0, lo(D_800F93C6)(A0)
  move  V1, V0
  li    V0, 1
  beq   V1, V0, L80104A08
   slti  V0, V1, 2
  beql  V0, R0, L8010497C
   li    V0, 2
  beqz  V1, L80104994
   slti  V0, S1, 0x50
  j     L80104F68
   nop
L8010497C:
  beq   V1, V0, L80104A50
   li    V0, 3
  beq   V1, V0, L80104A94
   slti  V0, S1, 0x5f
  j     L80104F68
   nop
L80104994:
  bnez  V0, L80104DD8
   li    V0, 1
  lui   V0, hi(D_801136F8)
  lw    V0, lo(D_801136F8)(V0)
  sll   V1, V0, 1
  addu  V1, V1, V0
  sll   V1, V1, 2
  addu  V1, V1, V0
  sll   V1, V1, 2
  lui   V0, hi(p1_stars)
  addu  V0, V0, V1
  lh    V0, lo(p1_stars)(V0)
  slti  V0, V0, 2
  beqz  V0, L80104DD8
   li    V0, 1
  lui   V0, hi(D_801136F8)
  lw    V0, lo(D_801136F8)(V0)
  sll   V1, V0, 1
  addu  V1, V1, V0
  sll   V1, V1, 2
  addu  V1, V1, V0
  sll   V1, V1, 2
  lui   V0, hi(p1_stars)
  addu  V0, V0, V1
  lh    V0, lo(p1_stars)(V0)
  bnez  V0, L80104A44
   li    V0, 2
  j     L80104DD8
   li    V0, 1
L80104A08:
  slti  V0, S1, 0x5a
  bnez  V0, L80104EF4
   nop
  lui   V0, hi(D_801136F8)
  lw    V0, lo(D_801136F8)(V0)
  sll   V1, V0, 1
  addu  V1, V1, V0
  sll   V1, V1, 2
  addu  V1, V1, V0
  sll   V1, V1, 2
  lui   V0, hi(p1_stars)
  addu  V0, V0, V1
  lh    V0, lo(p1_stars)(V0)
  beqz  V0, L80104EF4
   li    V0, 2
L80104A44:
  lui   AT, hi(D_80113718)
  j     L80104F68
   sw    V0, lo(D_80113718)(AT)
L80104A50:
  slti  V0, S1, 0x5a
  bnez  V0, L80104EF4
   nop
  lui   V0, hi(D_801136F4)
  lw    V0, lo(D_801136F4)(V0)
  sll   V1, V0, 1
  addu  V1, V1, V0
  sll   V1, V1, 2
  addu  V1, V1, V0
  sll   V1, V1, 2
  lui   V0, hi(p1_stars)
  addu  V0, V0, V1
  lh    V0, lo(p1_stars)(V0)
  bnez  V0, L80104DD8
   li    V0, 1
  j     L80104EF4
   nop
L80104A94:
  bnez  V0, L80104EF4
   nop
  lui   V0, hi(D_801136F4)
  lw    V0, lo(D_801136F4)(V0)
  sll   V1, V0, 1
  addu  V1, V1, V0
  sll   V1, V1, 2
  addu  V1, V1, V0
  sll   V1, V1, 2
  lui   V0, hi(p1_stars)
  addu  V0, V0, V1
  lh    V0, lo(p1_stars)(V0)
  bnez  V0, L80104DD8
   li    V0, 1
  j     L80104EF4
   nop
L80104AD4:
  move  V1, R0
  move  S0, R0
  addiu A0, SP, 0x10
  sll   V0, V1, 2
L80104AE4:
  addu  V0, V0, A0
  sw    R0, 0(V0)
  addiu V1, V1, 1
  slti  V0, V1, 4
  bnel  V0, R0, L80104AE4
   sll   V0, V1, 2
  beqz  S0, L80104B50
   nop
  lui   V0, hi(D_800F93AE)
  addiu V0, V0, lo(D_800F93AE)
  lh    V1, 0(V0)
  lh    V0, 2(V0)
  beq   V1, V0, L80104B50
   addiu V0, V0, 5
  slt   V0, V1, V0
  beqz  V0, L80104B3C
   nop
  jal   func_80103B70
   nop
  slti  V0, V0, 0x50
  bnez  V0, L80104B50
   nop
L80104B3C:
  jal   func_80103B70
   nop
  slti  V0, V0, 0x28
  beqz  V0, L80104F20
   move  V1, R0
L80104B50:
  lui   A0, hi(D_800F93AE)
  addiu A0, A0, lo(D_800F93AE)
  lh    V1, 0(A0)
  lh    V0, 2(A0)
  addiu V0, V0, 5
  slt   V1, V1, V0
  beqz  V1, L80104D30
   nop
  jal   func_80059FD0
   lh    A0, 0x18(A0)
  bnez  V0, L80104C18
   nop
  lui   V0, hi(D_801136F4)
  lw    V0, lo(D_801136F4)(V0)
  sll   V1, V0, 1
  addu  V1, V1, V0
  sll   V1, V1, 2
  addu  V1, V1, V0
  sll   V1, V1, 2
  lui   V0, hi(p1_coins)
  addu  V0, V0, V1
  lh    V0, lo(p1_coins)(V0)
  beqz  V0, L80104F00
   nop
  lui   A0, hi(D_801136F0)
  addiu A0, A0, lo(D_801136F0)
  lw    V0, 0(A0)
  sll   V1, V0, 1
  addu  V1, V1, V0
  sll   V1, V1, 2
  addu  V1, V1, V0
  sll   V1, V1, 2
  lw    A0, 4(A0)
  sll   V0, A0, 1
  addu  V0, V0, A0
  sll   V0, V0, 2
  addu  V0, V0, A0
  sll   V0, V0, 2
  lui   AT, hi(p1_stars)
  addu  AT, AT, V1
  lh    V1, lo(p1_stars)(AT)
  lui   AT, hi(p1_stars)
  addu  AT, AT, V0
  lh    V0, lo(p1_stars)(AT)
  beq   V1, V0, L80104DD4
   slti  V0, S1, 0x55
  bnez  V0, L80104DD8
   li    V0, 1
  j     L80104F00
   nop
L80104C18:
  lui   V0, hi(D_801136F0)
  lw    V0, lo(D_801136F0)(V0)
  sll   V1, V0, 1
  addu  V1, V1, V0
  sll   V1, V1, 2
  addu  V1, V1, V0
  sll   V1, V1, 2
  lui   V0, hi(p1_coins)
  addu  V0, V0, V1
  lh    V0, lo(p1_coins)(V0)
  beqz  V0, L80104F00
   nop
  lui   A1, hi(D_801136F0)
  addiu A1, A1, lo(D_801136F0)
  lw    V1, 0(A1)
  sll   V0, V1, 1
  addu  V0, V0, V1
  sll   V0, V0, 2
  addu  V0, V0, V1
  sll   V0, V0, 2
  lui   A0, hi(p1_stars)
  addu  A0, A0, V0
  lh    A0, lo(p1_stars)(A0)
  addiu A0, A0, -1
  lw    V1, 4(A1)
  sll   V0, V1, 1
  addu  V0, V0, V1
  sll   V0, V0, 2
  addu  V0, V0, V1
  sll   V0, V0, 2
  lui   AT, hi(p1_stars)
  addu  AT, AT, V0
  lh    V0, lo(p1_stars)(AT)
  slt   V0, V0, A0
  bnez  V0, L80104CB8
   slti  V0, S1, 0x50
  beqz  V0, L80104F00
   nop
  j     L80104EF4
   nop
L80104CB8:
  lw    V1, 0(A1)
  sll   V0, V1, 1
  addu  V0, V0, V1
  sll   V0, V0, 2
  addu  V0, V0, V1
  sll   V0, V0, 2
  lui   A0, hi(p1_stars)
  addu  A0, A0, V0
  lh    A0, lo(p1_stars)(A0)
  addiu A0, A0, -2
  lw    V1, 4(A1)
  sll   V0, V1, 1
  addu  V0, V0, V1
  sll   V0, V0, 2
  addu  V0, V0, V1
  sll   V0, V0, 2
  lui   AT, hi(p1_stars)
  addu  AT, AT, V0
  lh    V0, lo(p1_stars)(AT)
  bne   A0, V0, L80104D20
   slti  V0, S1, 0x5f
  slti  V0, S1, 0x55
  beqz  V0, L80104F00
   nop
  j     L80104EF4
   nop
L80104D20:
  beqz  V0, L80104F00
   nop
  j     L80104EF4
   nop
L80104D30:
  lui   A0, hi(D_800F93C6)
  jal   func_80059FD0
   lh    A0, lo(D_800F93C6)(A0)
  bnez  V0, L80104DE4
   nop
  lui   V0, hi(D_801136F4)
  lw    V0, lo(D_801136F4)(V0)
  sll   V1, V0, 1
  addu  V1, V1, V0
  sll   V1, V1, 2
  addu  V1, V1, V0
  sll   V1, V1, 2
  lui   V0, hi(p1_coins)
  addu  V0, V0, V1
  lh    V0, lo(p1_coins)(V0)
  beqz  V0, L80104F00
   nop
  lui   A0, hi(D_801136F0)
  addiu A0, A0, lo(D_801136F0)
  lw    V0, 0(A0)
  sll   V1, V0, 1
  addu  V1, V1, V0
  sll   V1, V1, 2
  addu  V1, V1, V0
  sll   V1, V1, 2
  lw    A0, 4(A0)
  sll   V0, A0, 1
  addu  V0, V0, A0
  sll   V0, V0, 2
  addu  V0, V0, A0
  sll   V0, V0, 2
  lui   AT, hi(p1_stars)
  addu  AT, AT, V1
  lh    V1, lo(p1_stars)(AT)
  lui   AT, hi(p1_stars)
  addu  AT, AT, V0
  lh    V0, lo(p1_stars)(AT)
  beq   V1, V0, L80104DD4
   slti  V0, S1, 0x23
  beqz  V0, L80104F00
   nop
L80104DD4:
  li    V0, 1
L80104DD8:
  lui   AT, hi(D_80113718)
  j     L80104F68
   sw    V0, lo(D_80113718)(AT)
L80104DE4:
  lui   V0, hi(D_801136F0)
  lw    V0, lo(D_801136F0)(V0)
  sll   V1, V0, 1
  addu  V1, V1, V0
  sll   V1, V1, 2
  addu  V1, V1, V0
  sll   V1, V1, 2
  lui   V0, hi(p1_coins)
  addu  V0, V0, V1
  lh    V0, lo(p1_coins)(V0)
  beqz  V0, L80104F00
   nop
  lui   A1, hi(D_801136F0)
  addiu A1, A1, lo(D_801136F0)
  lw    V1, 0(A1)
  sll   V0, V1, 1
  addu  V0, V0, V1
  sll   V0, V0, 2
  addu  V0, V0, V1
  sll   V0, V0, 2
  lui   A0, hi(p1_stars)
  addu  A0, A0, V0
  lh    A0, lo(p1_stars)(A0)
  addiu A0, A0, -1
  lw    V1, 4(A1)
  sll   V0, V1, 1
  addu  V0, V0, V1
  sll   V0, V0, 2
  addu  V0, V0, V1
  sll   V0, V0, 2
  lui   AT, hi(p1_stars)
  addu  AT, AT, V0
  lh    V0, lo(p1_stars)(AT)
  slt   V0, V0, A0
  bnez  V0, L80104E84
   slti  V0, S1, 0x3c
  beqz  V0, L80104F00
   nop
  j     L80104EF4
   nop
L80104E84:
  lw    V1, 0(A1)
  sll   V0, V1, 1
  addu  V0, V0, V1
  sll   V0, V0, 2
  addu  V0, V0, V1
  sll   V0, V0, 2
  lui   A0, hi(p1_stars)
  addu  A0, A0, V0
  lh    A0, lo(p1_stars)(A0)
  addiu A0, A0, -2
  lw    V1, 4(A1)
  sll   V0, V1, 1
  addu  V0, V0, V1
  sll   V0, V0, 2
  addu  V0, V0, V1
  sll   V0, V0, 2
  lui   AT, hi(p1_stars)
  addu  AT, AT, V0
  lh    V0, lo(p1_stars)(AT)
  bne   A0, V0, L80104EEC
   slti  V0, S1, 0x50
  slti  V0, S1, 0x4b
  beqz  V0, L80104F00
   nop
  j     L80104EF4
   nop
L80104EEC:
  beqz  V0, L80104F00
   nop
L80104EF4:
  lui   AT, hi(D_80113718)
  j     L80104F68
   sw    R0, lo(D_80113718)(AT)
L80104F00:
  jal   func_801045C0
   nop
  lui   AT, hi(D_80113718)
  j     L80104F68
   sw    V0, lo(D_80113718)(AT)
L80104F14:
  lui   AT, hi(D_80113718)
  j     L80104F68
   sw    V1, lo(D_80113718)(AT)
L80104F20:
  lui   A1, hi(D_801136F0)
  addiu A1, A1, lo(D_801136F0)
  addiu A0, SP, 0x10
  sll   V0, V1, 2
L80104F30:
  addu  V0, V0, A1
  lw    V0, 0(V0)
  sll   V0, V0, 2
  addu  V0, V0, A0
  lw    V0, 0(V0)
  beql  V0, R0, L80104F5C
   addiu V1, V1, 1
  addiu S0, S0, -1
  beqz  S0, L80104F14
   nop
  addiu V1, V1, 1
L80104F5C:
  slti  V0, V1, 4
  bnez  V0, L80104F30
   sll   V0, V1, 2
L80104F68:
  lw    RA, 0x28(SP)
  lw    S1, 0x24(SP)
  lw    S0, 0x20(SP)
  jr    RA
   addiu SP, SP, 0x30

func_80104F7C:
  addiu SP, SP, -0x48
  sw    RA, 0x44(SP)
  sw    S4, 0x40(SP)
  sw    S3, 0x3c(SP)
  sw    S2, 0x38(SP)
  sw    S1, 0x34(SP)
  sw    S0, 0x30(SP)
  move  S0, R0
  addiu V1, SP, 0x10
  sll   V0, S0, 2
L80104FA4:
  addu  V0, V0, V1
  sw    R0, 0(V0)
  sw    R0, 0x10(V0)
  addiu S0, S0, 1
  slti  V0, S0, 4
  bnez  V0, L80104FA4
   sll   V0, S0, 2
  move  S0, R0
  addiu S2, SP, 0x10
L80104FC8:
  jal   func_80059FD0
   move  A0, S0
  sll   V0, V0, 2
  addu  V0, V0, S2
  lw    V1, 0(V0)
  addiu V1, V1, 1
  sw    V1, 0(V0)
  move  S1, R0
  move  A0, R0
  sll   V0, S0, 1
  addu  V0, V0, S0
  sll   V0, V0, 2
  addu  V0, V0, S0
  sll   A1, V0, 2
L80105000:
  beq   S0, A0, L80105038
   sll   V0, A0, 1
  addu  V0, V0, A0
  sll   V0, V0, 2
  addu  V0, V0, A0
  sll   V0, V0, 2
  lui   V1, hi(p1_coins)
  addu  V1, V1, A1
  lh    V1, lo(p1_coins)(V1)
  lui   AT, hi(p1_coins)
  addu  AT, AT, V0
  lh    V0, lo(p1_coins)(AT)
  slt   V1, V1, V0
  addu  S1, S1, V1
L80105038:
  addiu A0, A0, 1
  slti  V0, A0, 4
  bnez  V0, L80105000
   sll   V0, S1, 2
  addu  V0, V0, S2
  lw    V1, 0x10(V0)
  addiu V1, V1, 1
  sw    V1, 0x10(V0)
  addiu S0, S0, 1
  slti  V0, S0, 4
  bnez  V0, L80104FC8
   li    A0, -1
  move  S0, R0
  lui   A2, hi(D_801136F0)
  addiu A2, A2, lo(D_801136F0)
  lui   A1, hi(D_80113700)
  addiu A1, A1, lo(D_80113700)
  sll   V0, S0, 2
L80105080:
  addu  V1, V0, A2
  sw    A0, 0(V1)
  addu  V0, V0, A1
  sw    A0, 0(V0)
  addiu S0, S0, 1
  slti  V0, S0, 4
  bnez  V0, L80105080
   sll   V0, S0, 2
  move  S0, R0
  lui   S4, hi(D_801136F0)
  addiu S4, S4, lo(D_801136F0)
  li    S2, -1
  lui   S3, hi(D_80113700)
  addiu S3, S3, lo(D_80113700)
L801050B8:
  jal   func_80059FD0
   move  A0, S0
  move  A0, V0
L801050C4:
  sll   V0, A0, 2
  addu  V0, V0, S4
  lw    V0, 0(V0)
  beq   V0, S2, L801050E0
   sll   V0, A0, 2
  j     L801050C4
   addiu A0, A0, 1
L801050E0:
  addu  V0, V0, S4
  sw    S0, 0(V0)
  move  S1, R0
  move  A0, R0
  sll   V0, S0, 1
  addu  V0, V0, S0
  sll   V0, V0, 2
  addu  V0, V0, S0
  sll   A1, V0, 2
L80105104:
  beq   S0, A0, L8010513C
   sll   V0, A0, 1
  addu  V0, V0, A0
  sll   V0, V0, 2
  addu  V0, V0, A0
  sll   V0, V0, 2
  lui   V1, hi(p1_coins)
  addu  V1, V1, A1
  lh    V1, lo(p1_coins)(V1)
  lui   AT, hi(p1_coins)
  addu  AT, AT, V0
  lh    V0, lo(p1_coins)(AT)
  slt   V1, V1, V0
  addu  S1, S1, V1
L8010513C:
  addiu A0, A0, 1
  slti  V0, A0, 4
  bnez  V0, L80105104
   nop
L8010514C:
  sll   V0, S1, 2
  addu  V0, V0, S3
  lw    V0, 0(V0)
  beq   V0, S2, L80105168
   sll   V0, S1, 2
  j     L8010514C
   addiu S1, S1, 1
L80105168:
  addu  V0, V0, S3
  sw    S0, 0(V0)
  addiu S0, S0, 1
  slti  V0, S0, 4
  bnez  V0, L801050B8
   nop
  li    S0, -1
  lui   AT, hi(D_80113718)
  sw    S0, lo(D_80113718)(AT)
  lui   AT, hi(D_80113714)
  sw    S0, lo(D_80113714)(AT)
  lui   AT, hi(D_80113710)
  jal   func_80104380
   sw    S0, lo(D_80113710)(AT)
  lui   V0, hi(D_80113718)
  lw    V0, lo(D_80113718)(V0)
  bne   V0, S0, L801051C4
   move  A0, V0
  jal   func_80104778
   nop
  lui   V0, hi(D_80113718)
  lw    V0, lo(D_80113718)(V0)
  move  A0, V0
L801051C4:
  sll   V0, V0, 2
  addiu V1, SP, 0x10
  addu  V0, V0, V1
  lw    V0, 0(V0)
  bnez  V0, L80105200
   move  A1, V1
  addiu V0, A0, -1
L801051E0:
  lui   AT, hi(D_80113718)
  sw    V0, lo(D_80113718)(AT)
  move  A0, V0
  sll   V0, V0, 2
  addu  V0, V0, A1
  lw    V0, 0(V0)
  beqz  V0, L801051E0
   addiu V0, A0, -1
L80105200:
  lui   A0, hi(D_800F93C6)
  jal   func_80059FD0
   lh    A0, lo(D_800F93C6)(A0)
  move  V1, V0
  lui   V0, hi(D_80113718)
  lw    V0, lo(D_80113718)(V0)
  bne   V1, V0, L80105234
   sll   V0, V1, 2
  addiu V1, SP, 0x10
  addu  V0, V0, V1
  lw    V1, 0(V0)
  addiu V1, V1, -1
  sw    V1, 0(V0)
L80105234:
  jal   GetRandomByte
   move  S0, R0
  andi  S1, V0, 0xff
  lui   V0, hi(D_80113718)
  lw    V0, lo(D_80113718)(V0)
  sll   V0, V0, 2
  addu  V0, SP, V0
  lw    V0, 0x10(V0)
  div   S1, V0
  bnez  V0, L80105264
   nop
  .word 0x0007000D ; break 7
L80105264:
  li    AT, -1
  bne   V0, AT, L8010527C
   lui   AT, 0x8000
  bne   S1, AT, L8010527C
   nop
  .word 0x0006000D ; break 6
L8010527C:
  mfhi  S1
L80105280:
  lui   V0, hi(D_800F93C6)
  lh    V0, lo(D_800F93C6)(V0)
  beql  S0, V0, L801052C0
   addiu S0, S0, 1
  jal   func_80059FD0
   move  A0, S0
  lui   V1, hi(D_80113718)
  lw    V1, lo(D_80113718)(V1)
  bnel  V1, V0, L801052C0
   addiu S0, S0, 1
  bnel  S1, R0, L801052BC
   addiu S1, S1, -1
  lui   AT, hi(D_80113714)
  j     L801052CC
   sw    S0, lo(D_80113714)(AT)
L801052BC:
  addiu S0, S0, 1
L801052C0:
  slti  V0, S0, 4
  bnez  V0, L80105280
   nop
L801052CC:
  lui   V0, hi(D_80113710)
  lw    V0, lo(D_80113710)(V0)
  bnez  V0, L8010535C
   nop
  lui   V0, hi(D_80113714)
  lw    V0, lo(D_80113714)(V0)
  sll   V1, V0, 1
  addu  V1, V1, V0
  sll   V1, V1, 2
  addu  V1, V1, V0
  sll   V1, V1, 2
  lui   V0, hi(p1_coins)
  addu  V0, V0, V1
  lh    V0, lo(p1_coins)(V0)
  bnez  V0, L8010535C
   move  S0, R0
  lui   V1, hi(D_800F93C6)
  lh    V1, lo(D_800F93C6)(V1)
L80105314:
  beq   S0, V1, L8010534C
   sll   V0, S0, 1
  addu  V0, V0, S0
  sll   V0, V0, 2
  addu  V0, V0, S0
  sll   V0, V0, 2
  lui   AT, hi(p1_coins)
  addu  AT, AT, V0
  lh    V0, lo(p1_coins)(AT)
  beql  V0, R0, L80105350
   addiu S0, S0, 1
  lui   AT, hi(D_80113714)
  j     L8010535C
   sw    S0, lo(D_80113714)(AT)
L8010534C:
  addiu S0, S0, 1
L80105350:
  slti  V0, S0, 4
  bnez  V0, L80105314
   nop
L8010535C:
  lw    RA, 0x44(SP)
  lw    S4, 0x40(SP)
  lw    S3, 0x3c(SP)
  lw    S2, 0x38(SP)
  lw    S1, 0x34(SP)
  lw    S0, 0x30(SP)
  jr    RA
   addiu SP, SP, 0x48

func_8010537C:
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
  lui   A1, hi(D_80113590)
  addiu A1, A1, lo(D_80113590)
  lwl   V0, 0(A1)
  lwr   V0, 3(A1)
  swl   V0, 0x20(SP)
  swr   V0, 0x23(SP)
  move  S1, R0
  lui   S4, hi(D_800F93C6)
  addiu S4, S4, lo(D_800F93C6)
  addiu S3, SP, 0x18
L801053CC:
  lh    V0, 0(S4)
  bne   S1, V0, L801054A0
   sll   V0, S1, 1
  addu  V0, V0, S1
  sll   V0, V0, 2
  addu  V0, V0, S1
  sll   V0, V0, 2
  lui   AT, hi(D_800FD2C6)
  addu  AT, AT, V0
  lhu   V0, lo(D_800FD2C6)(AT)
  andi  V0, V0, 1
  beqz  V0, L8010544C
   sll   S0, S1, 1
  jal   func_80104F7C
   addiu S1, S1, 1
  lui   V0, hi(D_80113710)
  lw    V0, lo(D_80113710)(V0)
  addiu S2, V0, 1
  lh    V1, 0(S4)
  sll   V0, V1, 1
  addu  V0, V0, V1
  sll   V0, V0, 2
  addu  V0, V0, V1
  sll   V0, V0, 2
  lui   AT, hi(p1_controller)
  addu  AT, AT, V0
  lbu   V0, lo(p1_controller)(AT)
  sll   V0, V0, 1
  addu  V0, V0, S3
  li    V1, 1024
  j     L801054CC
   sh    V1, 0(V0)
L8010544C:
  addu  S0, S0, S1
  sll   S0, S0, 2
  addu  S0, S0, S1
  sll   S0, S0, 2
  lui   V0, hi(p1_controller)
  addu  V0, V0, S0
  lbu   V0, lo(p1_controller)(V0)
  addu  V0, SP, V0
  lui   A0, hi(D_800F9052)
  lh    A0, lo(D_800F9052)(A0)
  lbu   A1, 0x20(V0)
  jal   func_8008D59C
   addiu S1, S1, 1
  lui   V0, hi(p1_controller)
  addu  V0, V0, S0
  lbu   V0, lo(p1_controller)(V0)
  sll   V0, V0, 1
  addu  V0, V0, S3
  li    V1, -1
  j     L801054CC
   sh    V1, 0(V0)
L801054A0:
  addu  V0, V0, S1
  sll   V0, V0, 2
  addu  V0, V0, S1
  sll   V0, V0, 2
  lui   AT, hi(p1_controller)
  addu  AT, AT, V0
  lbu   V0, lo(p1_controller)(AT)
  sll   V0, V0, 1
  addu  V0, V0, S3
  sh    R0, 0(V0)
  addiu S1, S1, 1
L801054CC:
  slti  V0, S1, 4
  bnez  V0, L801053CC
   nop
  beqz  S2, L8010558C
   li    A1, 2
  lui   A0, hi(D_800F9052)
  lh    A0, lo(D_800F9052)(A0)
  jal   func_80089284
   li    A2, 2
  move  S0, R0
  addiu S1, SP, 0x18
L801054F8:
  addiu S2, S2, -1
  bnez  S2, L8010553C
   nop
  lui   V1, hi(D_800F93C6)
  lh    V1, lo(D_800F93C6)(V1)
  sll   V0, V1, 1
  addu  V0, V0, V1
  sll   V0, V0, 2
  addu  V0, V0, V1
  sll   V0, V0, 2
  lui   AT, hi(p1_controller)
  addu  AT, AT, V0
  lbu   V0, lo(p1_controller)(AT)
  sll   V0, V0, 1
  addu  V0, V0, S1
  li    V1, -32768
  sh    V1, 0(V0)
L8010553C:
  bnez  S0, L80105564
   li    V0, 16
  jal   func_80057718
   nop
  lh    A0, 0x18(SP)
  lh    A1, 0x1a(SP)
  lh    A2, 0x1c(SP)
  lh    A3, 0x1e(SP)
  j     L80105574
   andi  V0, V0, 0xff
L80105564:
  lh    A0, 0x18(SP)
  lh    A1, 0x1a(SP)
  lh    A2, 0x1c(SP)
  lh    A3, 0x1e(SP)
L80105574:
  jal   func_8008CFD0
   sw    V0, 0x10(SP)
  bnez  S2, L801054F8
   addiu S0, S0, 1
  j     L801055A4
   move  S1, R0
L8010558C:
  lh    A0, 0x18(SP)
  lh    A1, 0x1a(SP)
  lh    A2, 0x1c(SP)
  lh    A3, 0x1e(SP)
  jal   func_8008D07C
   move  S1, R0
L801055A4:
  addu  V0, S5, S1
L801055A8:
  lbu   V0, 0(V0)
  bnel  V0, R0, L801055CC
   addiu S1, S1, 1
  sll   A1, S1, 0x10
  lui   A0, hi(D_800F9052)
  lh    A0, lo(D_800F9052)(A0)
  jal   func_8008D854
   sra   A1, A1, 0x10
  addiu S1, S1, 1
L801055CC:
  slti  V0, S1, 2
  bnez  V0, L801055A8
   addu  V0, S5, S1
  move  S1, R0
  sll   A1, S1, 0x10
L801055E0:
  lui   A0, hi(D_800F9052)
  lh    A0, lo(D_800F9052)(A0)
  sra   A1, A1, 0x10
  jal   func_8008BB48
   li    A2, 1
  move  S1, V0
  addu  V0, S5, S1
  lbu   V0, 0(V0)
  beqz  V0, L801055E0
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

func_80105630:
  addiu SP, SP, -0x40
  sw    RA, 0x3c(SP)
  sw    S4, 0x38(SP)
/*  */  sw    S3, 0x34(SP)
  sw    S2, 0x30(SP)
  sw    S1, 0x2c(SP)
  sw    S0, 0x28(SP)
  move  S4, A1
  move  S2, R0
  lui   A1, hi(D_80113590)
  addiu A1, A1, lo(D_80113590)
  lwl   V0, 0(A1)
  lwr   V0, 3(A1)
  swl   V0, 0x20(SP)
  swr   V0, 0x23(SP)
  move  S1, R0
  addiu S3, SP, 0x18
L80105674:
  lui   V0, hi(D_800F93C6)
  lh    V0, lo(D_800F93C6)(V0)
  bne   S1, V0, L80105730
   sll   V0, S1, 1
  addu  V0, V0, S1
  sll   V0, V0, 2
  addu  V0, V0, S1
  sll   V1, V0, 2
  lui   V0, hi(D_800FD2C6)
  addu  V0, V0, V1
  lhu   V0, lo(D_800FD2C6)(V0)
  andi  V0, V0, 1
  beqz  V0, L801056DC
   sll   S0, S1, 1
  lui   S2, hi(D_80113714)
  lw    S2, lo(D_80113714)(S2)
  slt   V0, S2, S1
  addu  S2, S2, V0
  lui   V0, hi(p1_controller)
  addu  V0, V0, V1
  lbu   V0, lo(p1_controller)(V0)
  sll   V0, V0, 1
  addu  V0, V0, S3
  li    V1, 1024
  j     L80105758
   sh    V1, 0(V0)
L801056DC:
  addu  S0, S0, S1
  sll   S0, S0, 2
  addu  S0, S0, S1
  sll   S0, S0, 2
  lui   V0, hi(p1_controller)
  addu  V0, V0, S0
  lbu   V0, lo(p1_controller)(V0)
  addu  V0, SP, V0
  lui   A0, hi(D_800F9052)
  lh    A0, lo(D_800F9052)(A0)
  lbu   A1, 0x20(V0)
  jal   func_8008D59C
   addiu S1, S1, 1
  lui   V0, hi(p1_controller)
  addu  V0, V0, S0
  lbu   V0, lo(p1_controller)(V0)
  sll   V0, V0, 1
  addu  V0, V0, S3
  li    V1, -1
  j     L8010575C
   sh    V1, 0(V0)
L80105730:
  addu  V0, V0, S1
  sll   V0, V0, 2
  addu  V0, V0, S1
  sll   V0, V0, 2
  lui   AT, hi(p1_controller)
  addu  AT, AT, V0
  lbu   V0, lo(p1_controller)(AT)
  sll   V0, V0, 1
  addu  V0, V0, S3
  sh    R0, 0(V0)
L80105758:
  addiu S1, S1, 1
L8010575C:
  slti  V0, S1, 4
  bnez  V0, L80105674
   nop
  beqz  S2, L801057F4
   li    A1, 2
  lui   A0, hi(D_800F9052)
  lh    A0, lo(D_800F9052)(A0)
  jal   func_80089284
   li    A2, 2
  addiu S0, SP, 0x18
  li    S3, -32768
  li    S1, 16
  addiu S2, S2, -1
L80105790:
  bnez  S2, L801057CC
   nop
  lui   V0, hi(D_800F93C6)
  lh    V0, lo(D_800F93C6)(V0)
  sll   V1, V0, 1
  addu  V1, V1, V0
  sll   V1, V1, 2
  addu  V1, V1, V0
  sll   V1, V1, 2
  lui   V0, hi(p1_controller)
  addu  V0, V0, V1
  lbu   V0, lo(p1_controller)(V0)
  sll   V0, V0, 1
  addu  V0, V0, S0
  sh    S3, 0(V0)
L801057CC:
  lh    A0, 0x18(SP)
  lh    A1, 0x1a(SP)
  lh    A2, 0x1c(SP)
  lh    A3, 0x1e(SP)
  jal   func_8008CFD0
   sw    S1, 0x10(SP)
  bnez  S2, L80105790
   addiu S2, S2, -1
  j     L8010580C
   move  S1, R0
L801057F4:
  lh    A0, 0x18(SP)
  lh    A1, 0x1a(SP)
  lh    A2, 0x1c(SP)
  lh    A3, 0x1e(SP)
  jal   func_8008D07C
   move  S1, R0
L8010580C:
  addu  V0, S4, S1
L80105810:
  lbu   V0, 0(V0)
  bnel  V0, R0, L80105834
   addiu S1, S1, 1
  sll   A1, S1, 0x10
  lui   A0, hi(D_800F9052)
  lh    A0, lo(D_800F9052)(A0)
  jal   func_8008D854
   sra   A1, A1, 0x10
  addiu S1, S1, 1
L80105834:
  slti  V0, S1, 3
  bnez  V0, L80105810
   addu  V0, S4, S1
  move  S1, R0
  li    S0, -1
  sll   A1, S1, 0x10
L8010584C:
  lui   A0, hi(D_800F9052)
  lh    A0, lo(D_800F9052)(A0)
  sra   A1, A1, 0x10
  jal   func_8008BB48
   move  A2, R0
  move  S1, V0
  beq   S1, S0, L80105880
   addu  V0, S4, S1
  lbu   V0, 0(V0)
  beqz  V0, L8010584C
   sll   A1, S1, 0x10
  j     L80105884
   move  V0, S1
L80105880:
  li    V0, -1
L80105884:
  lw    RA, 0x3c(SP)
  lw    S4, 0x38(SP)
  lw    S3, 0x34(SP)
  lw    S2, 0x30(SP)
  lw    S1, 0x2c(SP)
  lw    S0, 0x28(SP)
  jr    RA
   addiu SP, SP, 0x40

overlaycall0:
  addiu SP, SP, -0x18
  sw    RA, 0x10(SP)
; Declare which board index this is.
li    V0, ${boardIndex}
  lui   AT, hi(D_800F93AA)
  sh    V0, lo(D_800F93AA)(AT)
  li    A0, 10
  jal   InitObjSys
   move  A1, R0
  li    A0, 61
  move  A1, R0
  jal   func_800771EC
   li    A2, 402
  lw    RA, 0x10(SP)
  jr    RA
   addiu SP, SP, 0x18

overlaycall1:
  addiu SP, SP, -0x18
  sw    RA, 0x10(SP)
  li    A0, 10
  jal   InitObjSys
   move  A1, R0
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
  jal   func_8006836C
   li    A0, 67
  jal   func_8010285C
   nop
  lui   V0, hi(D_800F8CE4)
  addiu V0, V0, lo(D_800F8CE4)
  sh    R0, 0(V0) ; clearing bank coins?
  sh    R0, 0x3c(V0)
  sh    R0, 0x3a(V0)
  sh    R0, 0x34(V0)
  sh    R0, 0x32(V0)
  sh    R0, 0x2e(V0)
  jal   func_80077160
   li    A0, 1
  lw    RA, 0x10(SP)
  jr    RA
   addiu SP, SP, 0x18

setup_routine:
  addiu SP, SP, -0x20
  sw    RA, 0x18(SP)
  sw    S1, 0x14(SP)
  sw    S0, 0x10(SP)
  li    A0, 160
  jal   InitObjSys
   li    A1, 40
  li    A0, 1
  li    A1, 100
  li    A2, 100
  jal   func_80026DAC
   li    A3, 100
  li    A0, 2
  li    A1, 200
  li    A2, 200
  jal   func_80026DAC
   li    A3, 200
  JAL   __PP64_INTERNAL_ADDITIONAL_BG_CHOICE
   NOP
  move  A0, V0 ; Determined by user-customizable hook
  li    A1, ${boardInfo.boardDefFile}
  li    A2, 8 ; TODO: pauseBgDir?
  jal   func_80062E10 ; setup board?
   move  A3, R0

  lui   A0, hi(D_801119E4)
  addiu A0, A0, lo(D_801119E4)
  jal   func_80055928
   move  S0, R0
  lui   A0, hi(D_801119F4)
  jal   func_80055980
   addiu A0, A0, lo(D_801119F4)

  ; begin arrow rotation
  ${arrowRotationInstructions.join("\n")}
  ; end arrow rotation

  lui   A1, hi(func_8010BA48) ; boo event
  addiu A1, A1, lo(func_8010BA48)
  jal   func_8004D60C
   move  A0, R0
  lui   A1, hi(func_8010C6DC)
  addiu A1, A1, lo(func_8010C6DC)
  jal   func_8004D60C
   li    A0, 1
  lui   A1, hi(func_8010CA78)
  addiu A1, A1, lo(func_8010CA78)
  jal   func_8004D60C
   li    A0, 8
  lui   A1, hi(func_8010CAE8)
  addiu A1, A1, lo(func_8010CAE8)
  jal   func_8004D60C
   li    A0, 2
  lui   A1, hi(func_8010DE58)
  addiu A1, A1, lo(func_8010DE58)
  jal   func_8004D60C
   li    A0, 3
  lui   A1, hi(func_8010E3D0)
  addiu A1, A1, lo(func_8010E3D0)
  jal   func_8004D60C
   li    A0, 4
  lui   A1, hi(func_8010E640)
  addiu A1, A1, lo(func_8010E640)
  jal   func_8004D60C
   li    A0, 5
  lui   A1, hi(func_8010CFCC)
  addiu A1, A1, lo(func_8010CFCC)
  jal   func_8004D60C
   li    A0, 6
  lui   A1, hi(func_8010D9F4)
  addiu A1, A1, lo(func_8010D9F4)
  jal   func_8004D60C
   li    A0, 7
  lui   A1, hi(func_8010E874)
  addiu A1, A1, lo(func_8010E874)
  jal   func_8004D60C
   li    A0, 9
  lui   A1, hi(func_8010EB88)
  addiu A1, A1, lo(func_8010EB88)
  jal   func_8004D60C
   li    A0, 10
  lui   A1, hi(func_8010F1FC)
  addiu A1, A1, lo(func_8010F1FC)
  jal   func_8004D60C
   li    A0, 12
  lui   A1, hi(func_8010F430)
  addiu A1, A1, lo(func_8010F430)
  jal   func_8004D60C
   li    A0, 11
  lui   A1, hi(func_8010F940)
  addiu A1, A1, lo(func_8010F940)
  jal   func_8004D60C
   li    A0, 13
  lui   A0, hi(func_80111338)
  jal   func_80044D98
   addiu A0, A0, lo(func_80111338)
  lui   S1, hi(D_80111994)
  addiu S1, S1, lo(D_80111994)
  sll   V0, S0, 1
L80105AE0:
  addu  V0, V0, S1
  lh    A1, 0(V0)
  jal   func_800542E8
   move  A0, S0
  addiu S0, S0, 1
  slti  V0, S0, STAR_COUNT
  bnez  V0, L80105AE0
   sll   V0, S0, 1
  jal   func_80068328
   li    A0, 77
  beqz  V0, L80105B40
   nop
  jal   func_800683BC
   li    A0, 77
  lui   V0, hi(D_800F8D12)
  lh    V0, lo(D_800F8D12)(V0)
  beqz  V0, L80105B38
   nop
  jal   func_80102A44
   nop
  j     L80105B40
   nop
L80105B38:
  jal   func_80102AB0
   nop
L80105B40:
; drawing things (approximately starting around here)
  jal   func_80102B54
   nop
  jal   func_80105DDC ; baby bowser
   nop
  jal   func_80105D54 ; toad
   nop
  jal   func_8010602C ; boo
   nop
  jal   func_801062F4 ; bank coins
   nop
  ;jal   func_801064B8 ; gates
  ; nop
  jal   func_80106684 ; banks
   nop
  jal   func_801066FC
   nop
  ; jal   func_80106C44 ; train
  ; nop
  lw    RA, 0x18(SP)
  lw    S1, 0x14(SP)
  lw    S0, 0x10(SP)
  jr    RA
   addiu SP, SP, 0x20

${preppedAdditionalBgCode}

; A function that returns the audio index, to let custom events call to get the value.
${preppedAudioIndexCode}

overlaycall2:
  addiu SP, SP, -0x20
  sw    RA, 0x18(SP)

jal __PP64_INTERNAL_GET_BOARD_AUDIO_INDEX
 nop

; Start playing board audio.
  jal   func_80079390
   move  A0, V0
/*  */  jal   func_800632F0
   li    A0, 8 ; TODO also audio?
  jal   func_80020070
   li    A0, 2
  jal   setup_routine
   nop
  lui   V0, hi(func_80106944)
  addiu V0, V0, lo(func_80106944)
  sw    V0, 0x10(SP)
  li    A0, 1000
  move  A1, R0
  move  A2, R0
  jal   func_80076598
   li    A3, -1
  jal   func_80053AA0
   move  A0, R0

  jal hydrate_events
   nop

  jal func_randomize_minigames
   nop

  jal   func_80066C34
   move  A0, R0
  lw    RA, 0x18(SP)
  jr    RA
   addiu SP, SP, 0x20

hydrate_events:
ADDIU SP SP 0xFFE8
SW RA, 0x0010(SP)

// Call for the MainFS to read in the ASM blob.
LUI A0 ${mainFsEventDir}
JAL ReadMainFS
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
JAL EventTableHydrate
ADDIU A0 T4 16 // ADDIU A0, T4, 16

// Well, we copied the buffer... now we should "free" it with this magic JAL...
// Free our T9 reference, which theoretically could be corrupted, but in practice not.
JAL FreeMainFS
ADDU A0 T9 R0

LW RA 0x10(SP)
JR RA
ADDIU SP SP 0x18

; Overwrite the static array entry for this board's duel mini-game.
func_randomize_minigames:
  addiu SP, SP, -0x18
  sw    RA, 0x10(SP)

  ; T0 = GetRandomByte() % BOARD_COUNT;
  jal	GetRandomByte
  nop
  li   A0, BOARD_COUNT
  div  V0, A0
  nop
  mfhi T0
  nop
  andi T0, T0, 0xFF
  nop

  lui T1 hi(DuelMinigamesArray)
  addu T1 T1 T0
  lbu T1, lo(DuelMinigamesArray)(T1)

  lui T2 hi(D_800CCD5C)
  addiu T2 T2 ${boardIndex * 4}
  sw T1 lo(D_800CCD5C)(T2)

  lw    RA, 0x10(SP)
  jr    RA
   addiu SP, SP, 0x18

overlaycall3:
  addiu SP, SP, -0x18
  sw    RA, 0x10(SP)
  jal   func_80020070
   li    A0, 1
  jal   setup_routine
   nop
  jal   func_80066C34
   li    A0, 1
  lw    RA, 0x10(SP)
  jr    RA
   addiu SP, SP, 0x18

func_80105C50:
  addiu SP, SP, -0x20
  sw    RA, 0x1c(SP)
  sw    S2, 0x18(SP)
  sw    S1, 0x14(SP)
  sw    S0, 0x10(SP)
  move  S0, A0
  sll   A0, A0, 0x10
  sra   A0, A0, 0xe
  lui   V0, hi(D_80113720)
  addu  V0, V0, A0
  lw    V0, lo(D_80113720)(V0)
  bnez  V0, L80105D3C
   nop
  lui   V0, hi(D_8011371C)
  lw    V0, lo(D_8011371C)(V0)
  bnez  V0, L80105CBC
   nop
  li    A0, 23
  jal   func_80043510
   move  A1, R0
  move  S2, V0
  jal   func_80043DAC
   move  A0, S2
  lui   AT, hi(D_8011371C)
  sw    S2, lo(D_8011371C)(AT)
  j     L80105CD0
   sll   S0, S0, 0x10
L80105CBC:
  lui   A0, hi(D_8011371C)
  lw    A0, lo(D_8011371C)(A0)
  jal   func_80043F7C
   sll   S0, S0, 0x10
  move  S2, V0
L80105CD0:
  sra   S0, S0, 0x10
  sll   S1, S0, 2
  lui   AT, hi(D_80113720)
  addu  AT, AT, S1
  sw    S2, lo(D_80113720)(AT)
  lhu   V0, 0xa(S2)
  ori   V0, V0, 2
  sh    V0, 0xa(S2)
  jal   func_80056754
   move  A0, S2
  sll   S0, S0, 1
  lui   A0, hi(D_80111A44)
  addu  A0, A0, S0
  jal   func_80054B8C
   lh    A0, lo(D_80111A44)(A0)
  addiu A0, S2, 0xc
  jal   func_800B3170
   addiu A1, V0, 8
  li    A0, 6
  lui   A2, hi(D_80111A04)
  addu  A2, A2, S1
  lh    A2, lo(D_80111A04)(A2)
  lui   A3, hi(D_80111A06)
  addu  A3, A3, S1
  lh    A3, lo(D_80111A06)(A3)
  jal   func_80041AEC
   move  A1, S2
L80105D3C:
  lw    RA, 0x1c(SP)
  lw    S2, 0x18(SP)
  lw    S1, 0x14(SP)
  lw    S0, 0x10(SP)
  jr    RA
   addiu SP, SP, 0x20

func_80105D54:
  addiu SP, SP, -0x20
  sw    RA, 0x1c(SP)
  sw    S2, 0x18(SP)
  sw    S1, 0x14(SP)
  sw    S0, 0x10(SP)
  lui   AT, hi(D_8011371C)
  sw    R0, lo(D_8011371C)(AT)
  move  S0, R0
  lui   S2, hi(D_80113720)
  addiu S2, S2, lo(D_80113720)
  lui   S1, hi(D_80111A54)
  addiu S1, S1, lo(D_80111A54)
  sll   V0, S0, 2
L80105D88:
  addu  V0, V0, S2
  sw    R0, 0(V0)
  sll   V0, S0, 1
  addu  V0, V0, S1
  jal   func_80068328
   lh    A0, 0(V0)
  bnel  V0, R0, L80105DB8
   addiu S0, S0, 1
  sll   A0, S0, 0x10
  jal   func_80105C50
   sra   A0, A0, 0x10
  addiu S0, S0, 1
L80105DB8:
  slti  V0, S0, 7
  bnez  V0, L80105D88
   sll   V0, S0, 2
  lw    RA, 0x1c(SP)
  lw    S2, 0x18(SP)
  lw    S1, 0x14(SP)
  lw    S0, 0x10(SP)
  jr    RA
   addiu SP, SP, 0x20

func_80105DDC:
  addiu SP, SP, -0x20
  sw    RA, 0x18(SP)
  sw    S1, 0x14(SP)
  sw    S0, 0x10(SP)
  lui   S1, hi(D_800F93A8)
  addiu S1, S1, lo(D_800F93A8)
  lui   V1, hi(D_800F93C4)
  lh    V1, lo(D_800F93C4)(V1)
  li    V0, -1
  beq   V1, V0, L80105EA8
   nop
  lui   V0, hi(D_800F8D12)
  lh    V0, lo(D_800F8D12)(V0)
  beqz  V0, L80105E1C
   li    A0, 29
  li    A0, 23
L80105E1C:
  jal   func_80043510
   move  A1, R0
  move  S0, V0
  jal   func_80043DAC
   move  A0, S0
  lui   AT, hi(D_800F64C8)
  sw    S0, lo(D_800F64C8)(AT)
  lhu   V0, 0xa(S0)
  ori V0, V0, 2
  sh    V0, 0xa(S0)
  jal   func_80056754
   move  A0, S0
  lh    V0, 0x1c(S1)
  sll   V0, V0, 1
  lui   A0, hi(D_80111A44)
  addu  A0, A0, V0
  jal   func_80054B8C
   lh    A0, lo(D_80111A44)(A0)
  addiu A0, S0, 0xc
  jal   func_800B3170
   addiu A1, V0, 8
  lh    V0, 0x1c(S1)
  sll   V0, V0, 2
  li    A0, 11
  lui   A2, 0x8011
  addu  A2, A2, V0
  lh    A2, 0x1a04(A2)
  lui   A3, hi(D_80111A06)
  addu  A3, A3, V0
  lh    A3, lo(D_80111A06)(A3)
  jal   func_80041AEC
   move  A1, S0
  lui   AT, hi(D_80111A64)
  j     L80105EB0
   sw    V0, lo(D_80111A64)(AT)
L80105EA8:
  lui   AT, hi(D_800F64C8)
  sw    R0, lo(D_800F64C8)(AT)
L80105EB0:
  lw    RA, 0x18(SP)
  lw    S1, 0x14(SP)
  lw    S0, 0x10(SP)
  jr    RA
   addiu SP, SP, 0x20

func_80105EC4:
  addiu SP, SP, -0x18
  sw    RA, 0x10(SP)
  lui   A0, hi(D_800F64C8)
  lw    A0, lo(D_800F64C8)(A0)
  beqz  A0, L80105EE4
   nop
  jal   func_8004430C
   nop
L80105EE4:
  lui   A0, hi(D_80111A64)
  lw    A0, lo(D_80111A64)(A0)
  li    V0, -1
  beq   A0, V0, L80105F00
   nop
  jal   func_80041B40
   nop
L80105F00:
  lw    RA, 0x10(SP)
  jr    RA
   addiu SP, SP, 0x18

func_80105F0C:
  addiu SP, SP, -0x20
  sw    RA, 0x18(SP)
  sw    S1, 0x14(SP)
  sw    S0, 0x10(SP)
  move  S0, A0
  sll   A0, A0, 0x10
  sra   A0, A0, 0xe
  lui   V0, hi(D_80113740)
  addu  V0, V0, A0
  lw    V0, lo(D_80113740)(V0)
  bnez  V0, L80106018
   nop
  lui   V0, hi(D_8011373C)
  lw    V0, lo(D_8011373C)(V0)
  bnez  V0, L80105F88
   nop
  li    A0, 8
  jal   func_80043510
   move  A1, R0
  move  S1, V0
  lw    V0, 0x3c(S1)
  lw    V0, 0x40(V0)
  jal   func_8002D124
   lh    A0, 0(V0)
  lw    V0, 0x40(S1)
  lw    V0, 0x40(V0)
  jal   func_8002D124
   lh    A0, 0(V0)
  lui   AT, hi(D_8011373C)
  j     L80105F98
   sw    S1, lo(D_8011373C)(AT)
L80105F88:
  lui   A0, hi(D_8011373C)
  jal   func_80043F7C
   lw    A0, lo(D_8011373C)(A0)
  move  S1, V0
L80105F98:
  jal   func_800442DC
   move  A0, S1
  sll   V1, S0, 0x10
  sra   V1, V1, 0x10
  sll   S0, V1, 2
  lui   AT, hi(D_80113740)
  addu  AT, AT, S0
  sw    S1, lo(D_80113740)(AT)
  lhu   V0, 0xa(S1)
  ori   V0, V0, 2
  sh    V0, 0xa(S1)
  li    AT, 0x41200000 ;10.000000
  mtc1  AT, F0
  nop
  swc1  F0, 0x30(S1)
  sll   V1, V1, 1
  lui   A0, hi(D_80111A68)
  addu  A0, A0, V1
  jal   func_80054B8C
   lh    A0, lo(D_80111A68)(A0)
  addiu A0, S1, 0xc
  jal   func_800B3170
   addiu A1, V0, 8
  li    A0, 8
  lui   A2, hi(D_80111A20)
  addu  A2, A2, S0
  lh    A2, lo(D_80111A20)(A2)
  lui   A3, hi(D_80111A22)
  addu  A3, A3, S0
  lh    A3, lo(D_80111A22)(A3)
  jal   func_80041AEC
   move  A1, S1
L80106018:
  lw    RA, 0x18(SP)
  lw    S1, 0x14(SP)
  lw    S0, 0x10(SP)
  jr    RA
   addiu SP, SP, 0x20

func_8010602C:
  addiu SP, SP, -0x20
  sw    RA, 0x18(SP)
  sw    S1, 0x14(SP)
  sw    S0, 0x10(SP)
  lui   AT, hi(D_8011373C)
  sw    R0, lo(D_8011373C)(AT)
  move  S0, R0
  lui   S1, hi(D_80113740)
  addiu S1, S1, lo(D_80113740)
  sll   V0, S0, 2
L80106054:
  addu  V0, V0, S1
  sw    R0, 0(V0)
  sll   A0, S0, 0x10
  jal   func_80105F0C
   sra   A0, A0, 0x10
  addiu S0, S0, 1
  slti  V0, S0, 2
  bnez  V0, L80106054
   sll   V0, S0, 2
  lw    RA, 0x18(SP)
  lw    S1, 0x14(SP)
  lw    S0, 0x10(SP)
  jr    RA
   addiu SP, SP, 0x20

func_8010608C:
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
  lui   S4, hi(D_80113750)
  addiu S4, S4, lo(D_80113750)
L801060C0:
  lui   V0, hi(D_800F8D1E)
  lh    V0, lo(D_800F8D1E)(V0)
  addiu V0, V0, 9
  mult  V0, S5
  mfhi  A1
  sra   V1, A1, 2
  sra   V0, V0, 0x1f
  subu  S1, V1, V0
  slti  V0, S1, 6
  beql  V0, R0, L801060EC
   li    S1, 5
L801060EC:
  blez  S1, L80106120
   move  S0, R0
  sll   V0, S3, 2
  addu  S2, V0, S3
  addu  V0, S2, S0
L80106100:
  sll   V0, V0, 2
  addu  V0, V0, S4
  lw    A0, 0(V0)
  jal   func_80044258
   addiu S0, S0, 1
  slt   V0, S0, S1
  bnez  V0, L80106100
   addu  V0, S2, S0
L80106120:
  slti  V0, S0, 5
  beqz  V0, L80106154
   sll   V0, S3, 2
  addu  S1, V0, S3
  addu  V0, S1, S0
L80106134:
  sll   V0, V0, 2
  addu  V0, V0, S4
  lw    A0, 0(V0)
  jal   func_800442DC
   addiu S0, S0, 1
  slti  V0, S0, 5
  bnez  V0, L80106134
   addu  V0, S1, S0
L80106154:
  addiu S3, S3, 1
  slti  V0, S3, 2
  bnez  V0, L801060C0
   nop
  lw    RA, 0x30(SP)
  lw    S5, 0x2c(SP)
  lw    S4, 0x28(SP)
  lw    S3, 0x24(SP)
  lw    S2, 0x20(SP)
  lw    S1, 0x1c(SP)
  lw    S0, 0x18(SP)
  jr    RA
   addiu SP, SP, 0x38

func_80106188:
  addiu SP, SP, -0x28
  sw    RA, 0x20(SP)
  sw    S3, 0x1c(SP)
  sw    S2, 0x18(SP)
  sw    S1, 0x14(SP)
  sw    S0, 0x10(SP)
  move  S0, A0
  sll   A0, A0, 0x10
  sra   A0, A0, 0xe
  lui   V0, hi(D_80113750)
  addu  V0, V0, A0
  lw    V0, lo(D_80113750)(V0)
  bnez  V0, L801062D8
   nop
  lui   V0, hi(D_80113748)
  lw    V0, lo(D_80113748)(V0)
  bnez  V0, L801061F8
   nop
  li    A0, 108
  jal   func_80043510
   move  A1, R0
  move  S3, V0
  jal   func_80043DAC
   move  A0, S3
  lui   AT, hi(D_80113748)
  sw    S3, lo(D_80113748)(AT)
  j     L8010620C
   sll   V1, S0, 0x10
L801061F8:
  lui   A0, hi(D_80113748)
  jal   func_80043F7C
   lw    A0, lo(D_80113748)(A0)
  move  S3, V0
  sll   V1, S0, 0x10
L8010620C:
  sra   S1, V1, 0x10
  sll   V0, S1, 2
  lui   AT, hi(D_80113750)
  addu  AT, AT, V0
  sw    S3, lo(D_80113750)(AT)
  lhu   V0, 0xa(S3)
  ori   V0, V0, 2
  sh    V0, 0xa(S3)
  lui   V0, 0x6666
  ori   V0, V0, 0x6667
  mult  S1, V0
  mfhi  A3
  sra   S0, A3, 1
  sra   V1, V1, 0x1f
  subu  S0, S0, V1
  sll   V0, S0, 0x10
  sra   V0, V0, 0xf
  lui   A0, hi(D_80111A6C)
  addu  A0, A0, V0
  lh    A0, lo(D_80111A6C)(A0)
  jal   func_80054B8C
   addiu S2, S3, 0xc
  move  A0, S2
  jal   func_800B3170
   addiu A1, V0, 8
  sll   V0, S0, 2
  addu  V0, V0, S0
  subu  S1, S1, V0
  sll   S1, S1, 0x10
  sra   S1, S1, 0x10
  sll   S0, S1, 1
  addu  S0, S0, S1
  sll   S0, S0, 2
  lui   A1, hi(D_80111A70)
  addiu A1, A1, lo(D_80111A70)
  move  A0, S2
  addu  A1, S0, A1
  jal   func_800B31C0
   move  A2, S2
  lw    V0, 0x3c(S3)
  lui   AT, hi(D_80111AAC)
  addu  AT, AT, S0
  lwc1  F0, lo(D_80111AAC)(AT)
  swc1  F0, 0x24(V0)
  lw    V0, 0x3c(S3)
  lui   AT, hi(D_80111AB4)
  addu  AT, AT, S0
  lwc1  F0, lo(D_80111AB4)(AT)
  swc1  F0, 0x2c(V0)
  jal   func_800442DC
   move  A0, S3
L801062D8:
  lw    RA, 0x20(SP)
  lw    S3, 0x1c(SP)
  lw    S2, 0x18(SP)
  lw    S1, 0x14(SP)
  lw    S0, 0x10(SP)
  jr    RA
   addiu SP, SP, 0x28

func_801062F4:
  addiu SP, SP, -0x20
  sw    RA, 0x18(SP)
  sw    S1, 0x14(SP)
  sw    S0, 0x10(SP)
  lui   AT, hi(D_80113748)
  sw    R0, lo(D_80113748)(AT)
  move  S0, R0
  lui   S1, hi(D_80113750)
  addiu S1, S1, lo(D_80113750)
  sll   V0, S0, 2
L8010631C:
  addu  V0, V0, S1
  sw    R0, 0(V0)
  sll   A0, S0, 0x10
  jal   func_80106188
   sra   A0, A0, 0x10
  addiu S0, S0, 1
  slti  V0, S0, 0xa
  bnez  V0, L8010631C
   sll   V0, S0, 2
  jal   func_8010608C
   nop
  lw    RA, 0x18(SP)
  lw    S1, 0x14(SP)
  lw    S0, 0x10(SP)
  jr    RA
   addiu SP, SP, 0x20

func_8010635C:
/*  */  addiu SP, SP, -0x28
  sw    RA, 0x24(SP)
  sw    S2, 0x20(SP)
  sw    S1, 0x1c(SP)
  sw    S0, 0x18(SP)
  move  S0, A0
  sll   A0, A0, 0x10
  sra   A0, A0, 0xe
  lui   V0, hi(D_8011377C)
  addu  V0, V0, A0
  lw    V0, lo(D_8011377C)(V0)
  bnez  V0, L801064A0
   nop
  lui   V0, hi(D_80113778)
  lw    V0, lo(D_80113778)(V0)
  bnez  V0, L801063DC
   nop
  lui   V0, hi(D_800F93AA)
  lh    V0, lo(D_800F93AA)(V0)
  sll   V0, V0, 1
  lui   A0, hi(D_80111AED)
  addu  A0, A0, V0
  lbu   A0, lo(D_80111AED)(A0)
  jal   func_80043510
   move  A1, R0
  move  S2, V0
  jal   func_80043DAC
   move  A0, S2
  lui   AT, hi(D_80113778)
  sw    S2, lo(D_80113778)(AT)
  j     L801063F0
   sll   S0, S0, 0x10
L801063DC:
  lui   A0, hi(D_80113778)
  lw    A0, lo(D_80113778)(A0)
  jal   func_80043F7C
   sll   S0, S0, 0x10
  move  S2, V0
L801063F0:
  sra   S0, S0, 0x10
  sll   S1, S0, 2
  lui   AT, hi(D_8011377C)
  addu  AT, AT, S1
  sw    S2, lo(D_8011377C)(AT)
  lhu   V0, 0xa(S2)
  ori   V0, V0, 2
  sh    V0, 0xa(S2)
  lw    V0, 0x3c(S2)
  lw    V0, 0x40(V0)
  lh    A0, 0(V0)
  li    A1, 2
  jal   func_80029E80
   li    A2, 1
  sll   S0, S0, 1
  lui   A0, hi(D_80111AE8)
  addu  A0, A0, S0
  jal   func_80054B8C
   lh    A0, lo(D_80111AE8)(A0)
  addiu A0, S2, 0xc
  jal   func_800B3170
   addiu A1, V0, 8
  lui   A0, hi(D_80111A3C)
  addu  A0, A0, S1
  jal   func_80054B8C
   lh    A0, lo(D_80111A3C)(A0)
  lui   A0, hi(D_80111A3E)
  addu  A0, A0, S1
  lh    A0, lo(D_80111A3E)(A0)
  jal   func_80054B8C
   move  S0, V0
  addiu A0, V0, 8
  addiu A1, S0, 8
  jal   func_80056658
   addiu A2, S2, 0x18
  li    A0, 12
  lui   A2, hi(D_80111A34)
  addu  A2, A2, S1
  lh    A2, lo(D_80111A34)(A2)
  lui   A3, hi(D_80111A36)
  addu  A3, A3, S1
  lh    A3, lo(D_80111A36)(A3)
  jal   func_80041AEC
   move  A1, S2
L801064A0:
  lw    RA, 0x24(SP)
  lw    S2, 0x20(SP)
  lw    S1, 0x1c(SP)
  lw    S0, 0x18(SP)
  jr    RA
   addiu SP, SP, 0x28

func_801064B8:
  addiu SP, SP, -0x20
  sw    RA, 0x18(SP)
  sw    S1, 0x14(SP)
  sw    S0, 0x10(SP)
  lui   AT, hi(D_80113778)
  sw    R0, lo(D_80113778)(AT)
  move  S0, R0
  lui   S1, hi(D_8011377C)
  addiu S1, S1, lo(D_8011377C)
  sll   V0, S0, 2
L801064E0:
  addu  V0, V0, S1
  sw    R0, 0(V0)
  sll   A0, S0, 0x10
  jal   func_8010635C
   sra   A0, A0, 0x10
  addiu S0, S0, 1
  slti  V0, S0, 2
  bnez  V0, L801064E0
   sll   V0, S0, 2
  lw    RA, 0x18(SP)
  lw    S1, 0x14(SP)
  lw    S0, 0x10(SP)
  jr    RA
   addiu SP, SP, 0x20

func_80106518:
  addiu SP, SP, -0x18
  sw    RA, 0x14(SP)
  sw    S0, 0x10(SP)
  lui   S0, hi(D_800F93AA)
  addiu S0, S0, lo(D_800F93AA)
  lh    V0, 0(S0)
  sll   V0, V0, 2
  lui   A0, hi(D_80111B40)
  addu  A0, A0, V0
  jal   func_8007D9E0
   lw    A0, lo(D_80111B40)(A0)
  lh    V0, 0(S0)
  sll   V0, V0, 2
  lui   A0, hi(D_80111B1E)
  addu  A0, A0, V0
  jal   func_8007959C
   lh    A0, lo(D_80111B1E)(A0)
  jal   func_80076FCC
   move  A0, R0
  lw    RA, 0x14(SP)
  lw    S0, 0x10(SP)
  jr    RA
   addiu SP, SP, 0x18

func_80106618:
  addiu SP, SP, -0x18
  sw    RA, 0x10(SP)
  sll   A0, A0, 2
  lui   V0, hi(D_8011377C)
  addu  V0, V0, A0
  lw    V0, lo(D_8011377C)(V0)
  lw    V0, 0x3c(V0)
  lw    V0, 0x40(V0)
  lh    A0, 0(V0)
  li    A1, 1
  jal   func_80029E80
   li    A2, 4
  lui   V0, hi(D_800F93AA)
  lh    V0, lo(D_800F93AA)(V0)
  lui   V1, hi(D_80111B64)
  addiu V1, V1, lo(D_80111B64)
  sll   V0, V0, 2
  addu  A0, V0, V1
  lw    V1, 0(A0)
  li    V0, -1
  beq   V1, V0, L80106678
   nop
  jal   func_8007959C
   lh    A0, 2(A0)
L80106678:
  lw    RA, 0x10(SP)
  jr    RA
   addiu SP, SP, 0x18

func_80106684:
  addiu SP, SP, -0x20
  sw    RA, 0x18(SP)
  sw    S1, 0x14(SP)
  sw    S0, 0x10(SP)
  move  S0, R0
  lui   S1, hi(D_80111B88)
  addiu S1, S1, lo(D_80111B88)
  sll   V0, S0, 1
L801066A4:
  addu  V0, V0, S1
  jal   func_80054B8C
   lh    A0, 0(V0)
  sll   V1, S0, 2
  li    A0, 10
  lui   A2, hi(D_80111A28)
  addu  A2, A2, V1
  lh    A2, lo(D_80111A28)(A2)
  lui   A3, hi(D_80111A2A)
  addu  A3, A3, V1
  lh    A3, lo(D_80111A2A)(A3)
  jal   func_80041B60
   addiu A1, V0, 8
  addiu S0, S0, 1
  slti  V0, S0, 2
  bnez  V0, L801066A4
   sll   V0, S0, 1
  lw    RA, 0x18(SP)
  lw    S1, 0x14(SP)
  lw    S0, 0x10(SP)
  jr    RA
   addiu SP, SP, 0x20

func_801066FC:
  addiu SP, SP, -0x18
  sw    RA, 0x10(SP)
  lui   A0, hi(D_80111B8C)
  jal   func_80054B8C
   lh    A0, lo(D_80111B8C)(A0)
  lui   V1, hi(D_80111A30)
  addiu V1, V1, lo(D_80111A30)
  li    A0, 9
  lh    A2, 0(V1)
  lh    A3, 2(V1)
  jal   func_80041B60
   addiu A1, V0, 8
  lw    RA, 0x10(SP)
  jr    RA
   addiu SP, SP, 0x18

func_80106738:
  addiu SP, SP, -0x58
  sw    RA, 0x40(SP)
  sw    S3, 0x3c(SP)
  sw    S2, 0x38(SP)
  sw    S1, 0x34(SP)
  sw    S0, 0x30(SP)
  sdc1  F22, 0x50(SP)
  sdc1  F20, 0x48(SP)
  lui   A1, hi(D_80113784)
  lw    A1, lo(D_80113784)(A1)
  addiu A0, SP, 0x10
  jal   func_800B3170
   addiu A1, A1, 0xc
  lui   A0, hi(D_80113784)
  lw    A0, lo(D_80113784)(A0)
  jal   func_80042BE0
   addiu A0, A0, 0x18
  li    AT, 0x43340000 ;180.000000
  mtc1  AT, F2
  nop
  add.s F22, F0, F2
  jal   func_800B83C0
   mov.s F12, F22
  li    AT, 0x41C00000 ;24.000000
  mtc1  AT, F20
  nop
  mul.s F0, F0, F20
  lwc1  F2, 0x10(SP)
  add.s F0, F0, F2
  swc1  F0, 0x20(SP)
  lwc1  F0, 0x14(SP)
  swc1  F0, 0x24(SP)
  jal   func_800B7890
   mov.s F12, F22
  mul.s F0, F0, F20
  lwc1  F8, 0x18(SP)
  add.s F0, F0, F8
  swc1  F0, 0x28(SP)
  lwc1  F2, 0x10(SP)
  lwc1  F4, 0x20(SP)
  sub.s F2, F2, F4
  li    AT, 0x41400000 ;12.000000
  mtc1  AT, F6
  nop
  div.s F2, F2, F6
  swc1  F2, 0x10(SP)
  lwc1  F2, 0x14(SP)
  lwc1  F4, 0x24(SP)
  sub.s F2, F2, F4
  div.s F2, F2, F6
  swc1  F2, 0x14(SP)
  sub.s F8, F8, F0
  div.s F8, F8, F6
  swc1  F8, 0x18(SP)
  move  S1, R0
  lui   S3, hi(D_80113790)
  addiu S3, S3, lo(D_80113790)
  lui   S2, hi(D_80113820)
  addiu S2, S2, lo(D_80113820)
  sll   S0, S1, 1
L80106828:
  addu  S0, S0, S1
  sll   S0, S0, 2
  mtc1  S1, F4
  nop
  cvt.s.w F4, F4
  lwc1  F6, 0x10(SP)
  mul.s F6, F4, F6
  lwc1  F10, 0x20(SP)
  lwc1  F2, 0x14(SP)
  mul.s F2, F4, F2
  lwc1  F8, 0x24(SP)
  lwc1  F0, 0x18(SP)
  mul.s F4, F4, F0
  lwc1  F0, 0x28(SP)
  add.s F10, F6, F10
  mfc1  A1, F10
  add.s F8, F2, F8
  mfc1  A2, F8
  add.s F0, F4, F0
  mfc1  A3, F0
  nop
  jal   func_800B3160
   addu  A0, S0, S3
  lui   A1, hi(D_80113784)
  lw    A1, lo(D_80113784)(A1)
  addu  A0, S0, S2
  jal   func_800B3170
   addiu A1, A1, 0x18
  addiu S1, S1, 1
  slti  V0, S1, 0xc
  bnel  V0, R0, L80106828
   sll   S0, S1, 1
  lui   AT, hi(D_801138B0)
  sw    R0, lo(D_801138B0)(AT)
  lui   A0, hi(D_80113788)
  lw    A0, lo(D_80113788)(A0)
  lui   A1, hi(D_80113790)
  lw    A1, lo(D_80113790)(A1)
  lui   A2, hi(D_80113794)
  lw    A2, lo(D_80113794)(A2)
  lui   A3, hi(D_80113798)
  lw    A3, lo(D_80113798)(A3)
  jal   func_800B3160
   addiu A0, A0, 0xc
  lui   A0, hi(D_80113788)
  lw    A0, lo(D_80113788)(A0)
  lui   V1, hi(D_801138B0)
  lw    V1, lo(D_801138B0)(V1)
  sll   V0, V1, 1
  addu  V0, V0, V1
  sll   V0, V0, 2
  lui   A1, hi(D_80113820)
  addu  A1, A1, V0
  lw    A1, lo(D_80113820)(A1)
  lui   A2, hi(D_80113824)
  addu  A2, A2, V0
  lw    A2, lo(D_80113824)(A2)
  lui   A3, hi(D_80113828)
  addu  A3, A3, V0
  lw    A3, lo(D_80113828)(A3)
  jal   func_800B3160
   addiu A0, A0, 0x18
  lw    RA, 0x40(SP)
  lw    S3, 0x3c(SP)
  lw    S2, 0x38(SP)
  lw    S1, 0x34(SP)
  lw    S0, 0x30(SP)
  ldc1  F22, 0x50(SP)
  ldc1  F20, 0x48(SP)
  jr    RA
   addiu SP, SP, 0x58

func_80106944:
  addiu SP, SP, -0x18
  sw    RA, 0x14(SP)
  sw    S0, 0x10(SP)
  jal   func_8005DC3C
   li    A0, -1
  move  S0, V0
  lui   V0, hi(D_8011378C)
  lw    V0, lo(D_8011378C)(V0)
  beqz  V0, L801069B8
   nop
  lw    A0, 0x24(S0)
  lui   A1, hi(D_80113788)
  lw    A1, lo(D_80113788)(A1)
  addiu A0, A0, 0xc
  jal   func_800B3170
   addiu A1, A1, 0xc
  lw    V0, 0x24(S0)
  lwc1  F0, 0x10(V0)
  li    AT, 0x40E00000 ;7.000000
  mtc1  AT, F2
  nop
  add.s F0, F0, F2
  swc1  F0, 0x10(V0)
  lw    A0, 0x24(S0)
  lui   A1, hi(D_80113788)
  lw    A1, lo(D_80113788)(A1)
  addiu A0, A0, 0x18
  jal   func_800B3170
   addiu A1, A1, 0x18
L801069B8:
  lw    RA, 0x14(SP)
  lw    S0, 0x10(SP)
  jr    RA
   addiu SP, SP, 0x18

func_801069C8:
  addiu SP, SP, -0x18
  sw    RA, 0x10(SP)
  lui   V1, hi(D_801138B0)
  lw    V1, lo(D_801138B0)(V1)
  sll   V0, V1, 1
  addu  V0, V0, V1
  sll   V0, V0, 2
  lui   A0, hi(D_80113784)
  lw    A0, lo(D_80113784)(A0)
  lwc1  F0, 0xc(A0)
  lui   AT, hi(D_80113790)
  addu  AT, AT, V0
  swc1  F0, lo(D_80113790)(AT)
  lwc1  F0, 0x10(A0)
  lui   AT, hi(D_80113794)
  addu  AT, AT, V0
  swc1  F0, lo(D_80113794)(AT)
  lwc1  F0, 0x14(A0)
  lui   AT, hi(D_80113798)
  addu  AT, AT, V0
  swc1  F0, lo(D_80113798)(AT)
  lwc1  F0, 0x18(A0)
  lui   AT, hi(D_80113820)
  addu  AT, AT, V0
  swc1  F0, lo(D_80113820)(AT)
  lwc1  F0, 0x1c(A0)
  lui   AT, hi(D_80113824)
  addu  AT, AT, V0
  swc1  F0, lo(D_80113824)(AT)
  lwc1  F0, 0x20(A0)
  lui   AT, hi(D_80113828)
  addu  AT, AT, V0
  swc1  F0, lo(D_80113828)(AT)
  addiu V1, V1, 1
  lui   AT, hi(D_801138B0)
  sw    V1, lo(D_801138B0)(AT)
  slti  V1, V1, 0xc
  bnez  V1, L80106A6C
   nop
  lui   AT, hi(D_801138B0)
  sw    R0, lo(D_801138B0)(AT)
L80106A6C:
  lui   A0, hi(D_80113788)
  lw    A0, lo(D_80113788)(A0)
  lui   V1, hi(D_801138B0)
  lw    V1, lo(D_801138B0)(V1)
  sll   V0, V1, 1
  addu  V0, V0, V1
  sll   V0, V0, 2
  lui   A1, hi(D_80113790)
  addu  A1, A1, V0
  lw    A1, lo(D_80113790)(A1)
  lui   A2, hi(D_80113794)
  addu  A2, A2, V0
  lw    A2, lo(D_80113794)(A2)
  lui   A3, hi(D_80113798)
  addu  A3, A3, V0
  lw    A3, lo(D_80113798)(A3)
  jal   func_800B3160
   addiu A0, A0, 0xc
  lui   A0, hi(D_80113788)
  lw    A0, lo(D_80113788)(A0)
  lui   V1, hi(D_801138B0)
  lw    V1, lo(D_801138B0)(V1)
  sll   V0, V1, 1
  addu  V0, V0, V1
  sll   V0, V0, 2
  lui   A1, hi(D_80113820)
  addu  A1, A1, V0
  lw    A1, lo(D_80113820)(A1)
  lui   A2, hi(D_80113824)
  addu  A2, A2, V0
  lw    A2, lo(D_80113824)(A2)
  lui   A3, hi(D_80113828)
  addu  A3, A3, V0
  lw    A3, lo(D_80113828)(A3)
  jal   func_800B3160
   addiu A0, A0, 0x18
  lw    RA, 0x10(SP)
  jr    RA
   addiu SP, SP, 0x18

func_80106B08:
  addiu SP, SP, -0x18
  sw    RA, 0x10(SP)
  lui   A0, hi(D_801138B0)
  lw    A0, lo(D_801138B0)(A0)
  sll   V0, A0, 1
  addu  V0, V0, A0
  sll   V0, V0, 2
  lui   V1, hi(D_80113788)
  lw    V1, lo(D_80113788)(V1)
  lwc1  F0, 0xc(V1)
  lui   AT, hi(D_80113790)
  addu  AT, AT, V0
  swc1  F0, lo(D_80113790)(AT)
  lwc1  F0, 0x10(V1)
  lui   AT, hi(D_80113794)
  addu  AT, AT, V0
  swc1  F0, lo(D_80113794)(AT)
  lwc1  F0, 0x14(V1)
  lui   AT, hi(D_80113798)
  addu  AT, AT, V0
  swc1  F0, lo(D_80113798)(AT)
  lwc1  F0, 0x18(V1)
  lui   AT, hi(D_80113820)
  addu  AT, AT, V0
  swc1  F0, lo(D_80113820)(AT)
  lwc1  F0, 0x1c(V1)
  lui   AT, hi(D_80113824)
  addu  AT, AT, V0
  swc1  F0, lo(D_80113824)(AT)
  lwc1  F0, 0x20(V1)
  lui   AT, hi(D_80113828)
  addu  AT, AT, V0
  swc1  F0, lo(D_80113828)(AT)
  addiu A0, A0, -1
  lui   AT, hi(D_801138B0)
  sw    A0, lo(D_801138B0)(AT)
  bgez  A0, L80106BA8
   li    V0, 11
  lui   AT, hi(D_801138B0)
  sw    V0, lo(D_801138B0)(AT)
L80106BA8:
  lui   A0, hi(D_80113784)
  lw    A0, lo(D_80113784)(A0)
  lui   V1, hi(D_801138B0)
  lw    V1, lo(D_801138B0)(V1)
  sll   V0, V1, 1
  addu  V0, V0, V1
  sll   V0, V0, 2
  lui   A1, hi(D_80113790)
  addu  A1, A1, V0
  lw    A1, lo(D_80113790)(A1)
  lui   A2, hi(D_80113794)
  addu  A2, A2, V0
  lw    A2, lo(D_80113794)(A2)
  lui   A3, hi(D_80113798)
  addu  A3, A3, V0
  lw    A3, lo(D_80113798)(A3)
  jal   func_800B3160
   addiu A0, A0, 0xc
  lui   A0, hi(D_80113784)
  lw    A0, lo(D_80113784)(A0)
  lui   V1, hi(D_801138B0)
  lw    V1, lo(D_801138B0)(V1)
  sll   V0, V1, 1
  addu  V0, V0, V1
  sll   V0, V0, 2
  lui   A1, hi(D_80113820)
  addu  A1, A1, V0
  lw    A1, lo(D_80113820)(A1)
  lui   A2, hi(D_80113824)
  addu  A2, A2, V0
  lw    A2, lo(D_80113824)(A2)
  lui   A3, hi(D_80113828)
  addu  A3, A3, V0
  lw    A3, lo(D_80113828)(A3)
  jal   func_800B3160
   addiu A0, A0, 0x18
  lw    RA, 0x10(SP)
  jr    RA
   addiu SP, SP, 0x18

func_80106C44:
  addiu SP, SP, -0x28
  sw    RA, 0x24(SP)
  sw    S2, 0x20(SP)
  sw    S1, 0x1c(SP)
  sw    S0, 0x18(SP)
  li    A0, 116
  jal   func_80043510
   move  A1, R0
  move  S2, V0
  jal   func_80043DAC
   move  A0, S2
  lui   AT, hi(D_80113784)
  sw    S2, lo(D_80113784)(AT)
  lhu   V0, 0xa(S2)
  ori   V0, V0, 2
  sh    V0, 0xa(S2)
  lui   S1, hi(D_800F8CE4)
  addiu S1, S1, lo(D_800F8CE4)
  lh    V0, 0(S1)
  sll   V0, V0, 1
  lui   A0, hi(D_80111B90)
  addu  A0, A0, V0
  lhu   A0, lo(D_80111B90)(A0)
  jal   func_80054BB0
   move  A1, R0
  sll   V0, V0, 0x10
  jal   func_80054B8C
   sra   A0, V0, 0x10
  move  S0, V0
  lh    V0, 0(S1)
  sll   V0, V0, 1
  lui   A0, hi(D_80111B90)
  addu  A0, A0, V0
  lhu   A0, lo(D_80111B90)(A0)
  jal   func_80054BB0
   li    A1, 1
  sll   V0, V0, 0x10
  jal   func_80054B8C
   sra   A0, V0, 0x10
  lwc1  F10, 8(V0)
  lwc1  F6, 8(S0)
  lwc1  F8, 0xc(V0)
  lwc1  F2, 0xc(S0)
  lwc1  F4, 0x10(V0)
  lwc1  F0, 0x10(S0)
  sub.s F6, F10, F6
  mfc1  A1, F6
  sub.s F2, F8, F2
  mfc1  A2, F2
  sub.s F0, F4, F0
  mfc1  A3, F0
  nop
  jal   func_800B3160
   addiu A0, S2, 0x18
  addiu A0, S2, 0xc
  jal   func_800B3170
   addiu A1, S0, 8
  li    A0, 117
  jal   func_80043510
   move  A1, R0
  move  S2, V0
  jal   func_80043DAC
   move  A0, S2
  lui   AT, hi(D_80113788)
  sw    S2, lo(D_80113788)(AT)
  lhu   V0, 0xa(S2)
  ori   V0, V0, 2
  jal   func_80106738
   sh    V0, 0xa(S2)
  lui   AT, hi(D_8011378C)
  sw    R0, lo(D_8011378C)(AT)
  lw    RA, 0x24(SP)
  lw    S2, 0x20(SP)
  lw    S1, 0x1c(SP)
  lw    S0, 0x18(SP)
  jr    RA
   addiu SP, SP, 0x28

func_80106D78:
  addiu SP, SP, -0x18
  sw    RA, 0x14(SP)
  sw    S0, 0x10(SP)
  move  S0, A0
  jal   func_8005DC3C
   lbu   A0, 0x4c(S0)
  move  V1, V0
  lbu   V0, 0x4d(S0)
  bnez  V0, L80106DB0
   nop
  jal   func_800442DC
   lw    A0, 0x24(V1)
  jal   func_8007695C
   move  A0, S0
L80106DB0:
  lbu   V0, 0x4d(S0)
  addiu V0, V0, -1
  sb    V0, 0x4d(S0)
  lw    RA, 0x14(SP)
  lw    S0, 0x10(SP)
  jr    RA
   addiu SP, SP, 0x18

func_80106DCC:
  addiu SP, SP, -0x50
  sw    RA, 0x48(SP)
  sw    S3, 0x44(SP)
  sw    S2, 0x40(SP)
  sw    S1, 0x3c(SP)
  sw    S0, 0x38(SP)
  move  S1, A0
  jal   func_8005DC3C
   move  S2, A1
  move  S3, V0
  sll   S0, S1, 0x10
  sra   S0, S0, 0x10
  li    A0, 936
  jal   func_80079798
   move  A1, S0
  li    A0, 166
  jal   func_80079798
   move  A1, S0
  li    A0, 273
  jal   func_800797DC
   move  A1, S0
  move  A0, S0
  jal   func_80067170
   li    A1, 3
  lui   V0, hi(func_80106D78)
  addiu V0, V0, lo(func_80106D78)
  sw    V0, 0x10(SP)
  li    A0, 4096
  move  A1, R0
  move  A2, R0
  jal   func_80076598
   li    A3, -1
  move  S0, V0
  move  A0, S0
  jal   func_80076AFC
   li    A1, 160
  sb    S1, 0x4c(S0)
  li    V0, 30
  bnez  S2, L80106E78
   sb    V0, 0x4d(S0)
  lui   A0, hi(D_80113784)
  j     L80106E80
   lw    A0, lo(D_80113784)(A0)
L80106E78:
  lui   A0, hi(D_80113788)
  lw    A0, lo(D_80113788)(A0)
L80106E80:
  lw    A1, 0x24(S3)
  addiu A0, A0, 0xc
  addiu A1, A1, 0xc
  jal   func_80056658
   addiu A2, SP, 0x18
  li    AT, 0x3F800000 ;1.000000
  mtc1  AT, F0
  nop
  swc1  F0, 0x1c(SP)
  addiu A0, SP, 0x18
  lui   A1, 0x42c8
  jal   func_800B3240
   move  A2, A0
  lw    A1, 0x24(S3)
  addiu A0, SP, 0x18
  addiu A1, A1, 0xc
  jal   func_800B31C0
   move  A2, A0
  lw    A0, 0x24(S3)
  addiu S0, SP, 0x28
  addiu A0, A0, 0xc
  addiu A1, SP, 0x18
  jal   func_80056658
   move  A2, S0
  jal   func_80042BE0
   move  A0, S0
  li    AT, 0x43960000 ;300.000000
  mtc1  AT, F2
  nop
  c.le.s F2, F0
  nop
  bc1t  L80106F28
   nop
  jal   func_80042BE0
   move  A0, S0
  li    AT, 0x42700000 ;60.000000
  mtc1  AT, F2
  nop
  c.le.s F0, F2
  nop
  bc1f  L80106F50
   nop
L80106F28:
  lw    V0, 0x24(S3)
  lwc1  F0, 0xc(V0)
  li    AT, 0x42480000 ;50.000000
  mtc1  AT, F2
  nop
  add.s F0, F0, F2
  swc1  F0, 0x18(SP)
  lw    V0, 0x24(S3)
  lwc1  F0, 0x14(V0)
  swc1  F0, 0x20(SP)
L80106F50:
  lw    A2, 0x24(S3)
  addiu A2, A2, 0xc
  move  A0, A2
  addiu A1, SP, 0x18
  jal   func_80056D80
   li    A3, 30
  sh    R0, 0x10(S3)
  sh    R0, 0x12(S3)
  sh    R0, 0x14(S3)
  li    V0, 1
  sh    V0, 0x16(S3)
  lw    V1, 0x24(S3)
  lhu   V0, 0xa(V1)
  ori   V0, V0, 1
  sh    V0, 0xa(V1)
  lw    A0, 0x24(S3)
  li    A1, 4
  jal   func_80044494
   li    A2, 2
  lui   A0, hi(D_800F93C6)
  lh    A0, lo(D_800F93C6)(A0)
  li    V0, -1
  beq   A0, V0, L80106FC4
   li    A1, 5
  jal   func_8005DD68
   move  A2, R0
  li    A0, -1
  jal   func_80067170
   move  A1, R0
L80106FC4:
  lw    RA, 0x48(SP)
  lw    S3, 0x44(SP)
  lw    S2, 0x40(SP)
  lw    S1, 0x3c(SP)
  lw    S0, 0x38(SP)
  jr    RA
   addiu SP, SP, 0x50

func_80108C0C:
  addiu SP, SP, -0x40
  sw    RA, 0x14(SP)
  sw    S0, 0x10(SP)
  sdc1  F28, 0x38(SP)
  sdc1  F26, 0x30(SP)
  sdc1  F24, 0x28(SP)
  sdc1  F22, 0x20(SP)
  sdc1  F20, 0x18(SP)
  jal   func_8007959C
   li    A0, 876
  li    A0, 111
  jal   func_80043510
   move  A1, R0
  move  S0, V0
  lui   A1, hi(D_800F64C8)
  lw    A1, lo(D_800F64C8)(A1)
  addiu A0, S0, 0xc
  jal   func_800B3170
   addiu A1, A1, 0xc
  lwc1  F0, 0x14(S0)
  li    AT, 0x41A00000 ;20.000000
  mtc1  AT, F2
  nop
  add.s F0, F0, F2
  swc1  F0, 0x14(S0)
  lwc1  F0, 0x10(S0)
  li    AT, 0x41F00000 ;30.000000
  mtc1  AT, F2
  nop
  add.s F0, F0, F2
  swc1  F0, 0x10(S0)
  mtc1  R0, F22
  li    AT, 0x3F800000 ;1.000000
  mtc1  AT, F20
  li    AT, 0x41A00000 ;20.000000
  mtc1  AT, F28
  lui   AT, hi(D_801135B8)
  ldc1  F24, lo(D_801135B8)(AT)
  li    AT, 0x41200000 ;10.000000
  mtc1  AT, F26
L80108CAC:
  mfc1  A1, F20
  mfc1  A2, F20
  mfc1  A3, F20
  nop
  jal   func_800B3160
   addiu A0, S0, 0x24
  lw    V0, 0x3c(S0)
  lw    V0, 0x40(V0)
  lh    V0, 0(V0)
  sll   A0, V0, 1
  addu  A0, A0, V0
  sll   A0, A0, 6
  lui   V0, hi(D_800FC834)
  lw    V0, lo(D_800FC834)(V0)
  addu  A0, A0, V0
  mfc1  A1, F22
  nop
  jal   func_800B3B80
   addiu A0, A0, 0x74
  jal   func_8007DA44
   add.s F22, F22, F28
  cvt.d.s F0, F20
  add.d F0, F0, F24
  cvt.s.d F20, F0
  c.lt.s F20, F26
  nop
  bc1t  L80108CAC
   nop
  jal   func_80105EC4
   nop
  lui   AT, hi(D_800F8D12) ;AT, 0x8010
  sh    R0, lo(D_800F8D12)(AT)
  jal   func_800542B8
   move  A0, R0
  jal   func_80105DDC
   nop
  li    AT, 0x3F800000 ;1.000000
  mtc1  AT, F0
  nop
  c.le.s F0, F20
  nop
  bc1f  L80108DE0
   nop
  li    AT, 0x41A00000 ;20.000000
  mtc1  AT, F28
  lui   AT, hi(D_801135C0)
  ldc1  F24, lo(D_801135C0)(AT)
  li    AT, 0x3F800000 ;1.000000
  mtc1  AT, F26
L80108D70:
  mfc1  A1, F20
  mfc1  A2, F20
  mfc1  A3, F20
  nop
  jal   func_800B3160
   addiu A0, S0, 0x24
  lw    V0, 0x3c(S0)
  lw    V0, 0x40(V0)
  lh    V0, 0(V0)
  sll   A0, V0, 1
  addu  A0, A0, V0
  sll   A0, A0, 6
  lui   V0, hi(D_800FC834)
  lw    V0, lo(D_800FC834)(V0)
  addu  A0, A0, V0
  mfc1  A1, F22
  nop
  jal   func_800B3B80
   addiu A0, A0, 0x74
  jal   func_8007DA44
   add.s F22, F22, F28
  cvt.d.s F0, F20
  sub.d F0, F0, F24
  cvt.s.d F20, F0
  c.le.s F26, F20
  nop
  bc1t  L80108D70
   nop
L80108DE0:
  jal   func_8004430C
   move  A0, S0
  lw    RA, 0x14(SP)
  lw    S0, 0x10(SP)
  ldc1  F28, 0x38(SP)
  ldc1  F26, 0x30(SP)
  ldc1  F24, 0x28(SP)
  ldc1  F22, 0x20(SP)
  ldc1  F20, 0x18(SP)
  jr    RA
   addiu SP, SP, 0x40

; Star space event
__PP64_INTERNAL_STAR_SPACE_EVENT:
func_80108E0C:
  addiu SP, SP, -0x40
  sw    RA, 0x3c(SP)
  sw    S2, 0x38(SP)
  sw    S1, 0x34(SP)
  jal   func_800558F4
   sw    S0, 0x30(SP)
  move  S0, V0
  lui   S1, hi(D_800F93A8)
  addiu S1, S1, lo(D_800F93A8)
  lui   V1, hi(D_800F93C6)
  lh    V1, lo(D_800F93C6)(V1)
  li    V0, 4
  beq   V1, V0, L80109634
   move  S2, R0
  sll   A0, S0, 0x10
  jal   func_80102C3C
   sra   A0, A0, 0x10
  sll   V0, V0, 0x10
  sra   V0, V0, 0x10
  li    V1, 1
  bne   V0, V1, L801091AC
   sll   A0, S0, 0x10
  lui   A0, hi(D_800F93C6)
  jal   func_80046D2C
   lh    A0, lo(D_800F93C6)(A0)
  li    A0, -1
  li    A1, -1
  jal   func_8005DD68
   li    A2, 2
  jal   func_80102830
   nop
  sll   V0, V0, 0x10
  li    A0, -1
  li    A1, 8
  jal   func_80056C30
   sra   A2, V0, 0x10
  jal   func_8007D838
   nop
  li    AT, 0x3FCC0000 ;1.593750
  ori AT, AT, 0xcccd
  mtc1  AT, F12
  nop
  jal   func_80052F70
   move  S0, V0
  move  A0, S0
  jal   func_8007D700
   move  A1, V0
  jal   func_8007D7E8
   nop
  lui   V1, hi(D_800F93C6)
  lh    V1, lo(D_800F93C6)(V1)
  sll   V0, V1, 1
  addu  V0, V0, V1
  sll   V0, V0, 2
  addu  V0, V0, V1
  sll   V1, V0, 2
  lui   V0, hi(p1_turn_status)
  addu  V0, V0, V1
  lb    V0, lo(p1_turn_status)(V0)
  beqz  V0, L80108F58
   li    V0, 24
  sb    V0, 0x20(SP)
  lui   V0, hi(p1_char)
  addu  V0, V0, V1
  lbu   V0, lo(p1_char)(V0)
  sb    V0, 0x21(SP)
  sb    R0, 0x22(SP)
  sw    R0, 0x10(SP)
  sw    R0, 0x14(SP)
  sw    R0, 0x18(SP)
  li    A0, 3
  li    A1, 561
  addiu A2, SP, 0x20
  jal   func_80056368
   move  A3, R0
  jal   func_80056458
   nop
  jal   func_80056144
   nop
  jal   func_80056168
   nop
  j     L80108F70
   nop
L80108F58:
  lui   V0, hi(D_800F8D12)
  lh    V0, lo(D_800F8D12)(V0)
L80108F60:
  beqz  V0, L80108F70
   li    A0, 3
  jal   func_8005600C
   li    A1, 556
L80108F70:
  lh    V0, 0x1e(S1)
  sll   V1, V0, 1
  addu  V1, V1, V0
  sll   V1, V1, 2
  addu  V1, V1, V0
  sll   V1, V1, 2
  lui   V0, hi(p1_stars)
  addu  V0, V0, V1
  lh    V0, lo(p1_stars)(V0)
  slti  V0, V0, 0x63
  bnez  V0, L80108FB4
   nop
  jal   func_8007959C
   li    A0, 288
  li    A0, 3
  j     L80109174
   li    A1, 555
L80108FB4:
  lh    V0, 0x1e(S1)
  sll   V1, V0, 1
  addu  V1, V1, V0
  sll   V1, V1, 2
  addu  V1, V1, V0
  sll   V1, V1, 2
  lui   V0, hi(p1_coins)
  addu  V0, V0, V1
  lh    V0, lo(p1_coins)(V0)
  slti  V0, V0, 0x14
  bnez  V0, L80109164
   nop
  jal   func_8007959C
   li    A0, 286
  li    A0, 3
L80108FF0:
  jal   func_800560A4
   li    A1, 551
  jal   func_801041D4
   nop
  jal   func_80056144
   move  S0, V0
  jal   func_80056168
   sll   S0, S0, 0x10
  sra   S0, S0, 0x10
  li    V0, 1
  beq   S0, V0, L80109114
   slti  V0, S0, 2
  beql  V0, R0, L80109038
   li    V0, 2
  beqz  S0, L80109048
   nop
  j     L80109634
   nop
L80109038:
  beq   S0, V0, L80109154
   nop
  j     L80109634
   nop
L80109048:
  lh    A0, 0x1e(S1)
  jal   func_8004CA34
   li    A1, -20
  lh    A0, 0x1e(S1)
  jal   func_800614B4
   li    A1, -20
  jal   func_8007D9E0
   li    A0, 30
  bnez  S2, L801090DC
   li    A0, 3
  jal   func_8005600C
   li    A1, 553
  lui   V0, hi(D_800CCC16)
  lb    V0, lo(D_800CCC16)(V0)
  beqz  V0, L801090B0
   nop
  jal   func_80079464
   nop
  lui   A0, hi(D_800F64B0)
  lh    A0, lo(D_800F64B0)(A0)
  jal   func_800114E8
   li    A1, 60
  li    V0, -1
  lui   AT, hi(D_800F64B0)
  j     L801090B8
   sh    V0, lo(D_800F64B0)(AT)
L801090B0:
  jal   func_800794A8
   li    A0, 90
L801090B8:
  lui   A0, hi(D_8011371C)
  jal   func_80103968
   lw    A0, lo(D_8011371C)(A0)
  jal   func_800573AC
   nop
  jal   func_8006706C
   li    A0, 2
  j     L80109634
   nop
L801090DC:
  jal   func_8005600C
   li    A1, 557
  jal   func_80108C0C
   nop
  jal   func_8007D9E0
   li    A0, 30
  lui   A0, hi(D_800F64C8)
  jal   func_801039E4
   lw    A0, lo(D_800F64C8)(A0)
  li    A0, 5
  jal   func_8005600C
   li    A1, 558
  j     L801095F8
   nop
L80109114:
  lui   V0, hi(D_800CCC16)
  lb    V0, lo(D_800CCC16)(V0)
  beqz  V0, L80109144
   li    A0, 3
  lui   A0, hi(D_800F64B0)
  lh    A0, lo(D_800F64B0)(A0)
  jal   func_800114E8
   li    A1, 60
  li    V0, -1
  lui   AT, hi(D_800F64B0)
  sh    V0, lo(D_800F64B0)(AT)
  li    A0, 3
L80109144:
  jal   func_8005600C
   li    A1, 554
  j     L801095F8
   nop
L80109154:
  jal   __PP64_INTERNAL_VIEW_MAP
   nop
  j     L80108FF0
   li    A0, 3
L80109164:
  jal   func_8007959C
   li    A0, 288
  li    A0, 3
  li    A1, 552
L80109174:
  jal   func_8005600C
   nop
  lui   V0, hi(D_800CCC16)
  lb    V0, lo(D_800CCC16)(V0)
  beqz  V0, L801095F8
   nop
  lui   A0, hi(D_800F64B0)
  lh    A0, lo(D_800F64B0)(A0)
  jal   func_800114E8
   li    A1, 60
  li    V0, -1
  lui   AT, hi(D_800F64B0)
  j     L801095F8
   sh    V0, lo(D_800F64B0)(AT)
L801091AC:
  jal   func_80102C3C
   sra   A0, A0, 0x10
  sll   V0, V0, 0x10
  sra   V0, V0, 0x10
  li    V1, 2
  bne   V0, V1, L80109634
   nop
  jal   func_80046D2C
   lh    A0, 0x1e(S1)
  li    A0, -1
  li    A1, -1
  jal   func_8005DD68
   li    A2, 2
  lh    V0, 0x1c(S1)
  sll   V0, V0, 1
  li    A0, -1
  lui   A2, hi(D_80111994)
  addu  A2, A2, V0
  lh    A2, lo(D_80111994)(A2)
  jal   func_80056C30
   li    A1, 8
  jal   func_8007D838
   nop
  li    AT, 0x3FCC0000 ;1.593750
  ori AT, AT, 0xcccd
  mtc1  AT, F12
  nop
  jal   func_80052F70
   move  S0, V0
  move  A0, S0
  jal   func_8007D700
   move  A1, V0
  jal   func_8007D7E8
   nop
  lui   V0, hi(D_800F8D12)
  lh    V0, lo(D_800F8D12)(V0)
  bnez  V0, L8010924C
   nop
  jal   func_8007959C
   li    A0, 867
L8010924C:
  lh    V0, 0x1e(S1)
  sll   V1, V0, 1
  addu  V1, V1, V0
  sll   V1, V1, 2
  addu  V1, V1, V0
  sll   V1, V1, 2
  lui   V0, hi(p1_turn_status)
  addu  V0, V0, V1
  lb    V0, lo(p1_turn_status)(V0)
  beqz  V0, L80109368
   nop
  lui   V0, hi(D_800F8D12)
  lh    V0, lo(D_800F8D12)(V0)
  beqz  V0, L801092C4
   li    A0, 3
  jal   func_8005600C
   li    A1, 559
  jal   func_80108C0C
   nop
  jal   func_8007D9E0
   li    A0, 30
  li    A0, 5
  jal   func_8005600C
   li    A1, 560
  lh    A0, 0x1e(S1)
  jal   func_8004CA34
   li    A1, 20
  lh    A0, 0x1e(S1)
  j     L8010957C
   li    A1, 20
L801092C4:
  lui   V0, hi(D_800F8D18)
  lh    V0, lo(D_800F8D18)(V0)
  bnez  V0, L801092F4
   li    A0, 5
  jal   func_8005600C
   li    A1, 1063
  lh    A0, 0x1e(S1)
  jal   func_8004CA34
   li    A1, 20
  lh    A0, 0x1e(S1)
  j     L8010957C
   li    A1, 20
L801092F4:
  lui   S0, hi(D_800F8D18)
  addiu S0, S0, lo(D_800F8D18)
  lui   A1, hi(D_801135C8)
  addiu A1, A1, lo(D_801135C8)
  lh    A2, 0(S0)
  jal   func_800A5660
   addiu A0, SP, 0x20
  sw    R0, 0x10(SP)
  sw    R0, 0x14(SP)
  sw    R0, 0x18(SP)
  li    A0, 5
  li    A1, 1062
  addiu A2, SP, 0x20
  jal   func_80056368
   move  A3, R0
  jal   func_80056458
   nop
  jal   func_80056144
   nop
  jal   func_80056168
   nop
  lh    A0, 0x1e(S1)
  jal   func_8004CA34
   lh    A1, 0(S0)
  lh    A0, 0x1e(S1)
  jal   func_800614B4
   lh    A1, 0(S0)
  j     L80109584
   sh    R0, 0(S0)
L80109368:
  lui   V0, hi(D_800F8D12)
  lh    V0, lo(D_800F8D12)(V0)
  bnez  V0, L80108F60
   li    S2, 1
  lh    V0, 0x1e(S1)
  sll   V1, V0, 1
  addu  V1, V1, V0
  sll   V1, V1, 2
  addu  V1, V1, V0
  sll   V1, V1, 2
  lui   V0, hi(p1_coins)
  addu  V0, V0, V1
  lh    V0, lo(p1_coins)(V0)
  bnez  V0, L801093B4
   li    A0, 5
  jal   func_8005600C
   li    A1, 1058
  j     L801095F8
   nop
L801093B4:
  jal   func_8005600C
   li    A1, 1057
  lui   A0, hi(D_800F64C8)
  lw    A0, lo(D_800F64C8)(A0)
  lui   A1, 0x4000
  jal   func_80059120
   lui   A2, 0xbf00
  lui   A0, hi(D_800F64C8)
  jal   func_80059158
   lw    A0, lo(D_800F64C8)(A0)
  lui   A0, hi(D_800F64C8)
  lw    A0, lo(D_800F64C8)(A0)
  lui   A1, 0x4000
  jal   func_80059120
   lui   A2, 0xbf00
  lui   A0, hi(D_800F64C8)
  jal   func_80059158
   lw    A0, lo(D_800F64C8)(A0)
  jal   func_80103B70
   nop
  lh    A0, 0x1e(S1)
  jal   func_80059FD0
   move  S0, V0
  lui   AT, hi(D_801122A4)
  addu  AT, AT, V0
  lbu   V0, lo(D_801122A4)(AT)
  slt   S0, S0, V0
  bnel  S0, R0, L80109594
   sw    R0, 0x10(SP)
  lh    V0, 0x1e(S1)
  sll   V1, V0, 1
  addu  V1, V1, V0
  sll   V1, V1, 2
  addu  V1, V1, V0
  sll   V1, V1, 2
  lui   V0, hi(p1_coins)
  addu  V0, V0, V1
  lh    V0, lo(p1_coins)(V0)
  slti  V0, V0, 5
  bnez  V0, L8010948C
   li    A0, 5
  jal   func_8005600C
   li    A1, 1059
  lui   V1, hi(D_800F8D18)
  addiu V1, V1, lo(D_800F8D18)
  lhu   V0, 0(V1)
  addiu V0, V0, 5
  sh    V0, 0(V1)
  lh    A0, 0x1e(S1)
  jal   func_8004CA34
   li    A1, -5
  lh    A0, 0x1e(S1)
  j     L8010957C
   li    A1, -5
L8010948C:
  lh    V1, 0x1e(S1)
  sll   V0, V1, 1
  addu  V0, V0, V1
  sll   V0, V0, 2
  addu  V0, V0, V1
  sll   V0, V0, 2
  lui   A1, hi(D_801135C8)
  addiu A1, A1, lo(D_801135C8)
  lui   A2, hi(p1_coins)
  addu  A2, A2, V0
  lh    A2, lo(p1_coins)(A2)
  jal   func_800A5660
   addiu A0, SP, 0x20
  sw    R0, 0x10(SP)
  sw    R0, 0x14(SP)
  sw    R0, 0x18(SP)
  li    A0, 5
  li    A1, 1061
  addiu A2, SP, 0x20
  jal   func_80056368
   move  A3, R0
  jal   func_80056144
   nop
  jal   func_80056168
   nop
  lui   A0, hi(D_800F8D18)
  addiu A0, A0, lo(D_800F8D18)
  lh    V1, 0x1e(S1)
  sll   V0, V1, 1
  addu  V0, V0, V1
  sll   V0, V0, 2
  addu  V0, V0, V1
  sll   V0, V0, 2
  lhu   V1, 0(A0)
  lui   AT, hi(p1_coins)
  addu  AT, AT, V0
  lhu   V0, lo(p1_coins)(AT)
  addu  V1, V1, V0
  sh    V1, 0(A0)
  lh    A0, 0x1e(S1)
  sll   V0, A0, 1
  addu  V0, V0, A0
  sll   V0, V0, 2
  addu  V0, V0, A0
  sll   V0, V0, 2
  lui   A1, hi(p1_coins)
  addu  A1, A1, V0
  lh    A1, lo(p1_coins)(A1)
  jal   func_8004CA34
   SUBU A1 R0 A1
  lh    A0, 0x1e(S1)
  sll   V0, A0, 1
  addu  V0, V0, A0
  sll   V0, V0, 2
  addu  V0, V0, A0
  sll   V0, V0, 2
  lui   A1, hi(p1_coins)
  addu  A1, A1, V0
  lh    A1, lo(p1_coins)(A1)
  SUBU  A1 R0 A1
L8010957C:
  jal   func_800614B4
   nop
L80109584:
  jal   func_8007D9E0
   li    A0, 30
  j     L801095F8
   nop
L80109594:
  sw    R0, 0x14(SP)
  sw    R0, 0x18(SP)
  li    A0, 5
  li    A1, 1060
  move  A2, R0
  jal   func_80056368
   move  A3, R0
  jal   func_80056144
   nop
  lh    A0, 0x1e(S1)
  jal   func_8004CA34
   li    A1, 5
  lh    A0, 0x1e(S1)
  jal   func_800614B4
   li    A1, 5
  jal   func_8007D9E0
   li    A0, 30
  jal   func_80056124
   nop
  jal   func_80056458
   nop
  jal   func_80056144
   nop
  jal   func_80056168
   nop
L801095F8:
  jal   func_8004655C
   lh    A0, 0x1e(S1)
  jal   func_8007D838
   nop
  li    AT, 0x3FA60000 ;1.296875
  ori AT, AT, 0x6666
  mtc1  AT, F12
  nop
  jal   func_80052F70
   move  S0, V0
  move  A0, S0
  jal   func_8007D700
   move  A1, V0
  jal   func_8007D7E8
   nop
L80109634:
  lw    RA, 0x3c(SP)
  lw    S2, 0x38(SP)
  lw    S1, 0x34(SP)
  lw    S0, 0x30(SP)
  jr    RA
   addiu SP, SP, 0x40

; Bank event
__PP64_INTERNAL_BANK_SPACE_EVENT:
func_8010964C:
  addiu SP, SP, -0x50
  sw    RA, 0x4c(SP)
  sw    S2, 0x48(SP)
  sw    S1, 0x44(SP)
  jal   func_800558F4
   sw    S0, 0x40(SP)
  move  S0, V0
  lui   S2, hi(D_800F93A8)
  addiu S2, S2, lo(D_800F93A8)
  lui   A0, hi(D_800F93C6)
  lh    A0, lo(D_800F93C6)(A0)
  li    V0, 4
  beq   A0, V0, L80109A60
   nop
  jal   func_80047DE8
   nop
  bgtz  V0, L801096A0
   li    A0, -1
  jal   func_80067170
   li    A1, 3
  li    A0, -1
L801096A0:
  li    A1, -1
  jal   func_8005DD68
   li    A2, 2
  sll   V0, S0, 0x10
  sra   V1, V0, 0x10
  li    V0, ${bankEventSpaces[0]}
  beq   V1, V0, L801096D4
   li    V0, ${bankEventSpaces[1]}
  bne   V1, V0, L801096E8
   li    A0, -1
  li    A1, 8
  j     L801096E0
   li    A2, ${bestBankForBankSpaces[1]}
L801096D4:
  li    A0, -1
  li    A1, 8
  li    A2, ${bestBankForBankSpaces[0]}
L801096E0:
  jal   func_80056C30
   nop
L801096E8:
  jal   func_8007D9E0
   li    A0, 8
  jal   func_8007959C
   li    A0, 230
  lh    A0, 0x1e(S2)
  jal   func_80047DE8
   nop
  blez  V0, L8010996C
   nop
  jal   func_80046D2C
   lh    A0, 0x1e(S2)
  lh    V1, 0x1e(S2)
  sll   V0, V1, 1
  addu  V0, V0, V1
  sll   V0, V0, 2
  addu  V0, V0, V1
  sll   V0, V0, 2
  lui   A2, hi(p1_coins)
  addu  A2, A2, V0
  lh    A2, lo(p1_coins)(A2)
  sltu  V0, R0, A2
  slti  V1, A2, 5
  and   V0, V0, V1
  beqz  V0, L80109858
   nop
  lui   A1, hi(D_801135C8)
  addiu A1, A1, lo(D_801135C8)
  jal   func_800A5660
   addiu A0, SP, 0x20
  addiu S1, SP, 0x30
  lui   S0, hi(D_800F8D1E)
  addiu S0, S0, lo(D_800F8D1E)
  lh    A3, 0(S0)
  lh    V1, 0x1e(S2)
  sll   V0, V1, 1
  addu  V0, V0, V1
  sll   V0, V0, 2
  addu  V0, V0, V1
  sll   V0, V0, 2
  lui   A2, hi(p1_coins)
  addu  A2, A2, V0
  lh    A2, lo(p1_coins)(A2)
  move  A0, S1
  lui   A1, hi(D_801135C8)
  addiu A1, A1, lo(D_801135C8)
  jal   func_800A5660
   addu  A2, A3, A2
  sw    R0, 0x10(SP)
  sw    R0, 0x14(SP)
  sw    R0, 0x18(SP)
  li    A0, 2
  li    A1, 23
  addiu A2, SP, 0x20
  jal   func_80056368
   move  A3, S1
  jal   func_80056144
   nop
  lh    V1, 0x1e(S2)
  sll   V0, V1, 1
  addu  V0, V0, V1
  sll   V0, V0, 2
  addu  V0, V0, V1
  sll   V0, V0, 2
  lhu   V1, 0(S0)
  lui   AT, hi(p1_coins)
  addu  AT, AT, V0
  lhu   V0, lo(p1_coins)(AT)
  addu  V1, V1, V0
  jal   func_8010608C
   sh    V1, 0(S0)
  lh    A0, 0x1e(S2)
  sll   V0, A0, 1
  addu  V0, V0, A0
  sll   V0, V0, 2
  addu  V0, V0, A0
  sll   V0, V0, 2
  lui   A1, hi(p1_coins)
  addu  A1, A1, V0
  lh    A1, lo(p1_coins)(A1)
  jal   func_8004CA34
   SUBU A1 R0 A1
  lh    A0, 0x1e(S2)
  sll   V0, A0, 1
  addu  V0, V0, A0
  sll   V0, V0, 2
  addu  V0, V0, A0
  sll   V0, V0, 2
  lui   A1, hi(p1_coins)
  addu  A1, A1, V0
  lh    A1, lo(p1_coins)(A1)
  j     L8010992C
   SUBU A1 R0 A1
L80109858:
  lh    V0, 0x1e(S2)
  sll   V1, V0, 1
  addu  V1, V1, V0
  sll   V1, V1, 2
  addu  V1, V1, V0
  sll   V1, V1, 2
  lui   V0, hi(p1_coins)
  addu  V0, V0, V1
  lh    V0, lo(p1_coins)(V0)
  bnez  V0, L801098C4
   addiu A0, SP, 0x20
  lui   A1, hi(D_801135C8)
  addiu A1, A1, lo(D_801135C8)
  lui   A2, hi(D_800F8D1E)
  lh    A2, lo(D_800F8D1E)(A2)
  jal   func_800A5660
   addiu A0, SP, 0x20
  sw    R0, 0x10(SP)
  sw    R0, 0x14(SP)
  sw    R0, 0x18(SP)
  li    A0, 2
  li    A1, 24
  addiu A2, SP, 0x20
  jal   func_80056368
   move  A3, R0
  j     L80109944
   nop
L801098C4:
  lui   S0, hi(D_800F8D1E)
  addiu S0, S0, lo(D_800F8D1E)
  lh    A2, 0(S0)
  lui   A1, hi(D_801135C8)
  addiu A1, A1, lo(D_801135C8)
  jal   func_800A5660
   addiu A2, A2, 5
  sw    R0, 0x10(SP)
  sw    R0, 0x14(SP)
  sw    R0, 0x18(SP)
  li    A0, 2
  li    A1, 22
  addiu A2, SP, 0x20
  jal   func_80056368
   move  A3, R0
  jal   func_80056144
   nop
  lhu   V0, 0(S0)
  addiu V0, V0, 5
  jal   func_8010608C
   sh    V0, 0(S0)
  lh    A0, 0x1e(S2)
  jal   func_8004CA34
   li    A1, -5
  lh    A0, 0x1e(S2)
  li    A1, -5
L8010992C:
  jal   func_800614B4
   nop
  jal   func_8007D9E0
   li    A0, 30
  jal   func_80056124
   nop
L80109944:
  jal   func_80056458
   nop
  jal   func_80056144
   nop
  jal   func_80056168
   nop
  jal   func_8004655C
   lh    A0, 0x1e(S2)
  j     L80109A60
   nop
L8010996C:
  lui   S0, hi(D_800F8D1E)
  addiu S0, S0, lo(D_800F8D1E)
  lh    A2, 0(S0)
  beqz  A2, L80109A58
   li    A0, 2
  lui   A1, hi(D_801135C8)
  addiu A1, A1, lo(D_801135C8)
  jal   func_800A5660
   addiu A0, SP, 0x20
  sw    R0, 0x10(SP)
  sw    R0, 0x14(SP)
  sw    R0, 0x18(SP)
  li    A0, 2
  li    A1, 25
  addiu A2, SP, 0x20
  jal   func_80056368
   move  A3, R0
  jal   func_80056144
   nop
  lh    A0, 0x1e(S2)
  jal   func_8004CA34
   lh    A1, 0(S0)
  lh    A0, 0x1e(S2)
  jal   func_800614B4
   lh    A1, 0(S0)
  jal   func_8010608C
   sh    R0, 0(S0)
  jal   func_8005DC3C
   li    A0, -1
  lw    A0, 0x24(V0)
  jal   func_8005670C
   addiu A0, A0, 0x18
  li    A0, -1
  li    A1, 5
  jal   func_8005DD68
   move  A2, R0
  lh    V1, 0x1e(S2)
  sll   V0, V1, 1
  addu  V0, V0, V1
  sll   V0, V0, 2
  addu  V0, V0, V1
  sll   V0, V0, 2
  lui   A1, hi(p1_char)
  addu  A1, A1, V0
  lbu   A1, lo(p1_char)(A1)
  jal   func_80079718
   li    A0, 259
  jal   func_8007D9E0
   li    A0, 30
  jal   func_80056124
   nop
  jal   func_80056458
   nop
  jal   func_80056144
   nop
  jal   func_80056168
   nop
  j     L80109A60
   nop
L80109A58:
  jal   func_8005600C
   li    A1, 26
L80109A60:
  lw    RA, 0x4c(SP)
  lw    S2, 0x48(SP)
  lw    S1, 0x44(SP)
  lw    S0, 0x40(SP)
  jr    RA
   addiu SP, SP, 0x50

func_80109A78:
  move  A3, A0
  move  A1, R0
  lui   A2, hi(D_801138B8)
  lw    A2, lo(D_801138B8)(A2)
  lui   V0, hi(D_801138B4)
  lw    V0, lo(D_801138B4)(V0)
  lui   A0, hi(D_801122E0)
  addiu A0, A0, lo(D_801122E0)
  sll   V1, V0, 2
  addu  V1, V1, V0
  addu  V1, V1, A0
  addu  V0, A2, A1
L80109AA8:
  lbu   V0, 0(V0)
  beqz  V0, L80109AC8
   addu  V0, V1, A1
  lb    V0, 0(V0)
  bnel  V0, A3, L80109ACC
   addiu A1, A1, 1
  j     L80109ADC
   move  V0, A1
L80109AC8:
  addiu A1, A1, 1
L80109ACC:
  slti  V0, A1, 5
  bnez  V0, L80109AA8
   addu  V0, A2, A1
  li    V0, -1
L80109ADC:
  jr    RA
   nop

func_80109AE4:
  move  A1, R0
  lui   V0, hi(D_801138B4)
  lw    V0, lo(D_801138B4)(V0)
  lui   A0, hi(D_801122E0)
  addiu A0, A0, lo(D_801122E0)
  sll   V1, V0, 2
  addu  V1, V1, V0
  addu  V1, V1, A0
  li    A0, -1
  addu  V0, V1, A1
L80109B0C:
  lb    V0, 0(V0)
  beq   V0, A0, L80109B28
   nop
  addiu A1, A1, 1
  slti  V0, A1, 5
  bnel  V0, R0, L80109B0C
   addu  V0, V1, A1
L80109B28:
  jr    RA
   move  V0, A1

; Item shop
__PP64_INTERNAL_ITEM_SHOP_EVENT:
func_80109B30:
  addiu SP, SP, -0x70
  sw    RA, 0x68(SP)
  sw    S5, 0x64(SP)
  sw    S4, 0x60(SP)
  sw    S3, 0x5c(SP)
  sw    S2, 0x58(SP)
  sw    S1, 0x54(SP)
  sw    S0, 0x50(SP)
  lui   S4, hi(D_800F93A8)
  addiu S4, S4, lo(D_800F93A8)
  jal   func_8005DC3C
   li    A0, -1
  move  S5, V0
  lui   V1, hi(D_800F93C6)
  lh    V1, lo(D_800F93C6)(V1)
  li    V0, 4
  beq   V1, V0, L8010A118
   li    A0, -1
  li    A1, -1
  jal   func_8005DD68
   li    A2, 2
  li    A0, -1
  li    A1, 8
  jal   func_80056C30
   li    A2, ${bestShopForShopEventSpaces[0]}
  jal   func_8007D9E0
   li    A0, 8
  lui   A0, hi(D_800F93C6)
  jal   func_80046D2C
   lh    A0, lo(D_800F93C6)(A0)
  jal   func_8007959C
   li    A0, 230
  lui   V1, hi(D_800F93B0)
  lh    V1, lo(D_800F93B0)(V1)
  lui   V0, hi(D_800F93AE)
  lh    V0, lo(D_800F93AE)(V0)
  bne   V1, V0, L80109BD8
   li    A0, 1
  jal   func_8005600C
   li    A1, 505
  j     L8010A10C
   nop
L80109BD8:
  lh    V1, 0x1e(S4)
  sll   V0, V1, 1
  addu  V0, V0, V1
  sll   V0, V0, 2
  addu  V0, V0, V1
  sll   V0, V0, 2
  lui   V1, hi(p1_item)
  addu  V1, V1, V0
  lb    V1, lo(p1_item)(V1)
  li    V0, -1
  beq   V1, V0, L80109C18
   nop
  jal   func_8005600C
   li    A1, 496
  j     L8010A10C
   nop
L80109C18:
  lh    V0, 0x1e(S4)
  sll   V1, V0, 1
  addu  V1, V1, V0
  sll   V1, V1, 2
  addu  V1, V1, V0
  sll   V1, V1, 2
  lui   V0, hi(p1_coins)
  addu  V0, V0, V1
  lh    V0, lo(p1_coins)(V0)
  slti  V0, V0, 0xa
  beqz  V0, L80109C58
   li    A0, 1
  jal   func_8005600C
   li    A1, 495
  j     L8010A10C
   nop
L80109C58:
  jal   func_800560A4
   li    A1, 494
  jal   func_80103FB0
   nop
  jal   func_80056144
   move  S0, V0
  jal   func_80056168
   nop
  li    V0, 1
  beq   S0, V0, L8010A0E8
   slti  V0, S0, 2
  beql  V0, R0, L80109C9C
   li    V0, 2
  beqz  S0, L80109CAC
   move  S0, R0
  j     L8010A10C
   nop
L80109C9C:
  beq   S0, V0, L8010A0FC
   nop
  j     L8010A10C
   nop
L80109CAC:
  lh    A1, 8(S4)
  lh    V0, 4(S4)
  lui   A0, hi(D_801122D4)
  addiu A0, A0, lo(D_801122D4)
  sll   V1, V0, 1
  addu  V1, V1, V0
  addu  V1, V1, A0
  addu  A0, V1, S0
L80109CCC:
  lbu   V0, 0(A0)
  slt   V0, A1, V0
  bnel  V0, R0, L80109CF0
   addiu S0, S0, 1
  lbu   V0, 1(A0)
  slt   V0, A1, V0
  bnez  V0, L80109CFC
   nop
  addiu S0, S0, 1
L80109CF0:
  slti  V0, S0, 2
  bnez  V0, L80109CCC
   addu  A0, V1, S0
L80109CFC:
  lh    A0, 0x1e(S4)
  jal   func_80059FD0
   move  S2, R0
  lui   A0, hi(D_801122C8)
  addiu A0, A0, lo(D_801122C8)
  sll   V1, S0, 2
  addu  V1, V1, A0
  addu  V1, V1, V0
  lbu   S3, 0(V1)
  move  S0, R0
  addiu T2, SP, 0x20
  li    T0, 1
  addiu A3, SP, 0x28
  lui   V1, hi(D_801122E0)
  addiu V1, V1, lo(D_801122E0)
  sll   V0, S3, 2
  addu  V0, V0, S3
  addu  T1, V0, V1
  li    T3, -1
  addu  A2, T2, S0
L80109D4C:
  sb    T0, 0(A2)
  sll   V0, S0, 2
  addu  A1, A3, V0
  sb    R0, 0(A1)
  addu  V0, T1, S0
  lb    V0, 0(V0)
  beql  V0, T3, L80109DC0
   addiu S0, S0, 1
  lui   A0, hi(D_800CC000)
  addu  A0, A0, V0
  lbu   A0, lo(D_800CC000)(A0)
  lh    V1, 0x1e(S4)
  sll   V0, V1, 1
  addu  V0, V0, V1
  sll   V0, V0, 2
  addu  V0, V0, V1
  sll   V0, V0, 2
  lui   AT, hi(p1_coins)
  addu  AT, AT, V0
  lh    V0, lo(p1_coins)(AT)
  slt   V0, V0, A0
  beqz  V0, L80109DB0
   sll   V0, S0, 2
  sb    R0, 0(A2)
  sb    T0, 0(A1)
L80109DB0:
  addu  V0, A3, V0
  sb    R0, 1(V0)
  addiu S2, S2, 1
  addiu S0, S0, 1
L80109DC0:
  slti  V0, S0, 5
  bnez  V0, L80109D4C
   addu  A2, T2, S0
  slti  V0, S0, 8
  beqz  V0, L80109DF4
   addiu V1, SP, 0x20
  li    A0, 1
  addu  V0, V1, S0
L80109DE0:
  sb    A0, 0(V0)
  addiu S0, S0, 1
  slti  V0, S0, 8
  bnez  V0, L80109DE0
   addu  V0, V1, S0
L80109DF4:
  jal   func_8008DAC0
   li    A0, 40
  jal   func_80056524
   li    A0, 40
  sll   V1, S3, 2
  addiu V0, SP, 0x30
  sw    V0, 0x10(SP)
  addiu V0, SP, 0x34
  sw    V0, 0x14(SP)
  addiu V0, SP, 0x38
  sw    V0, 0x18(SP)
  li    A0, 1
  lui   A1, hi(D_80112304)
  addu  A1, A1, V1
  lw    A1, lo(D_80112304)(A1)
  addiu A2, SP, 0x28
  jal   func_80056368
   addiu A3, SP, 0x2c
  jal   func_80056524
   move  A0, R0
  lui   AT, hi(D_801138B4)
  sw    S3, lo(D_801138B4)(AT)
  addiu A0, SP, 0x20
  lui   AT, hi(D_801138B8)
  jal   func_80103CF4
   sw    A0, lo(D_801138B8)(AT)
  jal   func_80056144
   move  S1, V0
  jal   func_80056168
   nop
  bne   S1, S2, L80109E98
   addiu V0, S2, 1
  lui   AT, hi(D_800FC734)
  sh    R0, lo(D_800FC734)(AT)
  lh    A0, 0x1e(S4)
  jal   func_8004E484
   move  S0, R0
  li    V0, 1
  lui   AT, hi(D_800FC734)
  j     L80109CAC
   sh    V0, lo(D_800FC734)(AT)
L80109E98:
  xor   V0, S1, V0
  sltiu V0, V0, 1
  nor   V1, R0, S1
  sltiu V1, V1, 1
  or    V0, V0, V1
  bnel  V0, R0, L80109C58
   li    A0, 1
  lui   V0, hi(D_801122E0)
  addiu V0, V0, lo(D_801122E0)
  sll   S0, S3, 2
  addu  S0, S0, S3
  addu  S0, S0, V0
  addu  S0, S0, S1
  lb    V0, 0(S0)
  lui   A1, hi(D_800CC000)
  addu  A1, A1, V0
  lbu   A1, lo(D_800CC000)(A1)
  lh    A0, 0x1e(S4)
  jal   func_8004CA34
   SUBU A1 R0 A1
  lb    V0, 0(S0)
  lui   A1, hi(D_800CC000)
  addu  A1, A1, V0
  lbu   A1, lo(D_800CC000)(A1)
  lh    A0, 0x1e(S4)
  jal   func_800614B4
   SUBU A1 R0 A1
  jal   func_8007D9E0
   li    A0, 30
  lh    V1, 0x1e(S4)
  sll   V0, V1, 1
  addu  V0, V0, V1
  sll   V0, V0, 2
  addu  V0, V0, V1
  sll   V0, V0, 2
  lbu   V1, 0(S0)
  lui   AT, hi(p1_item)
  addu  AT, AT, V0
  sb    V1, lo(p1_item)(AT)
  li    A0, 1
  jal   func_8007FA6C
   li    A1, 5
  move  S2, V0
  lb    V0, 0(S0)
  sll   V0, V0, 2
  lui   A0, hi(D_800CCBDC)
  addu  A0, A0, V0
  lw    A0, lo(D_800CCBDC)(A0)
  jal   func_80017680
   sll   S1, S2, 0x10
  move  S0, V0
  jal   func_80082800
   move  A0, S0
  move  S3, V0
  jal   func_80017800
   move  A0, S0
  sll   S0, S2, 0x10
  sra   S0, S0, 0x10
  sll   A2, S3, 0x10
  move  A0, S0
  move  A1, R0
  sra   A2, A2, 0x10
  jal   func_8008218C
   move  A3, R0
  move  A0, S0
  move  A1, R0
  jal   func_80082384
   li    A2, 10
  move  A0, S0
  move  A1, R0
  jal   func_8008225C
   move  A2, R0
  move  A0, S0
  move  A1, R0
  jal   func_80082418
   li    A2, 4096
  move  A0, S0
  move  A1, R0
  li    A2, 160
  jal   func_80081AD0
   li    A3, 90
  move  A0, S0
  move  A1, R0
  jal   func_80082488
   move  A2, R0
  addiu S0, SP, 0x40
  jal   func_8005670C
   move  A0, S0
  lw    A2, 0x24(S5)
  addiu A2, A2, 0x18
  move  A0, A2
  move  A1, S0
  jal   func_80056B78
   li    A3, 10
  jal   func_8007959C
   li    A0, 25
  move  S0, R0
  sll   A2, S0, 1
L8010A020:
  addu  A2, A2, S0
  sll   A2, A2, 3
  addu  A2, A2, S0
  sra   A0, S1, 0x10
  move  A1, R0
  jal   func_80082488
   andi  A2, A2, 0xffff
  jal   func_8007DA44
   addiu S0, S0, 1
  slti  V0, S0, 0xa
  bnez  V0, L8010A020
   sll   A2, S0, 1
  sll   S0, S2, 0x10
  sra   S0, S0, 0x10
  move  A0, S0
  move  A1, R0
  jal   func_80082488
   li    A2, 256
  li    A0, -1
  li    A1, 5
  jal   func_8005DD68
   move  A2, R0
  jal   func_8007D9E0
   li    A0, 5
  lh    V1, 0x1e(S4)
  sll   V0, V1, 1
  addu  V0, V0, V1
  sll   V0, V0, 2
  addu  V0, V0, V1
  sll   V0, V0, 2
  lui   A1, hi(p1_char)
  addu  A1, A1, V0
  lbu   A1, lo(p1_char)(A1)
  jal   func_80079718
   li    A0, 259
  jal   func_8007D9E0
   li    A0, 45
  li    A0, -1
  li    A1, -1
  jal   func_8005DD68
   li    A2, 2
  jal   func_8007D9E0
   li    A0, 10
  sll   A0, S3, 0x10
  jal   func_80082660
   sra   A0, A0, 0x10
  jal   func_8007F8B0
   move  A0, S0
  j     L8010A10C
   nop
L8010A0E8:
  li    A0, 1
  jal   func_8005600C
   li    A1, 497
  j     L8010A10C
   nop
L8010A0FC:
  jal   __PP64_INTERNAL_VIEW_MAP
   nop
  j     L80109C58
   li    A0, 1
L8010A10C:
  lh    A0, 0x1e(S4)
  jal   func_8004655C
   nop
L8010A118:
  lw    RA, 0x68(SP)
  lw    S5, 0x64(SP)
  lw    S4, 0x60(SP)
  lw    S3, 0x5c(SP)
  lw    S2, 0x58(SP)
  lw    S1, 0x54(SP)
  lw    S0, 0x50(SP)
  jr    RA
   addiu SP, SP, 0x70

func_8010A13C:
  addiu SP, SP, -0x20
  sw    RA, 0x1c(SP)
  sw    S2, 0x18(SP)
  sw    S1, 0x14(SP)
  sw    S0, 0x10(SP)
  jal   func_80044258
   move  S2, A0
  move  S1, R0
L8010A15C:
  lw    V0, 0x3c(S2)
  lw    V0, 0x40(V0)
  andi  S0, S1, 0xff
  lh    A0, 0(V0)
  jal   func_8002D0A0
   move  A1, S0
  lw    V0, 0x40(S2)
  lw    V0, 0x40(V0)
  lh    A0, 0(V0)
  jal   func_8002D0A0
   move  A1, S0
  jal   func_8007DA44
   addiu S1, S1, 0xc
  slti  V0, S1, 0x100
  bnez  V0, L8010A15C
   nop
  lw    V0, 0x3c(S2)
  lw    V0, 0x40(V0)
  lh    A0, 0(V0)
  jal   func_8002D0A0
   li    A1, 255
  lw    V0, 0x40(S2)
  lw    V0, 0x40(V0)
  lh    A0, 0(V0)
  jal   func_8002D0A0
   li    A1, 255
  lw    RA, 0x1c(SP)
  lw    S2, 0x18(SP)
  lw    S1, 0x14(SP)
  lw    S0, 0x10(SP)
  jr    RA
   addiu SP, SP, 0x20

func_8010A1DC:
  addiu SP, SP, -0x20
  sw    RA, 0x1c(SP)
  sw    S2, 0x18(SP)
  sw    S1, 0x14(SP)
  sw    S0, 0x10(SP)
  move  S2, A0
  li    S1, 255
L8010A1F8:
  lw    V0, 0x3c(S2)
  lw    V0, 0x40(V0)
  andi  S0, S1, 0xff
  lh    A0, 0(V0)
  jal   func_8002D0A0
   move  A1, S0
  lw    V0, 0x40(S2)
  lw    V0, 0x40(V0)
  lh    A0, 0(V0)
  jal   func_8002D0A0
   move  A1, S0
  jal   func_8007DA44
   addiu S1, S1, -0xc
  bgez  S1, L8010A1F8
   nop
  lw    V0, 0x3c(S2)
  lw    V0, 0x40(V0)
  lh    A0, 0(V0)
  jal   func_8002D0A0
   move  A1, R0
  lw    V0, 0x40(S2)
  lw    V0, 0x40(V0)
  lh    A0, 0(V0)
  jal   func_8002D0A0
   move  A1, R0
  jal   func_800442DC
   move  A0, S2
  lw    RA, 0x1c(SP)
  lw    S2, 0x18(SP)
  lw    S1, 0x14(SP)
  lw    S0, 0x10(SP)
  jr    RA
   addiu SP, SP, 0x20

func_8010A27C:
  addiu SP, SP, -0x58
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
  sdc1  F24, 0x50(SP)
  sdc1  F22, 0x48(SP)
  sdc1  F20, 0x40(SP)
  move  S3, A0
  li    V0, -1
  bnel  S3, V0, L8010A784
   li    A0, 1
  lui A0, 0xa
  jal   func_80017680
   ori A0, A0, 0xb
  move  S0, V0
  jal   func_80082800
   move  A0, S0
  move  FP, V0
  jal   func_80017800
   move  A0, S0
  move  S1, R0
  addiu S2, SP, 0x10
L8010A2F0:
  lui   V0, hi(D_800F93C6)
  lh    V0, lo(D_800F93C6)(V0)
  beq   S1, V0, L8010A324
   sll   V0, S1, 1
  addu  V0, V0, S1
  sll   V0, V0, 2
  addu  V0, V0, S1
  sll   V0, V0, 2
  lui   AT, hi(p1_stars)
  addu  AT, AT, V0
  lh    V0, lo(p1_stars)(AT)
  bnez  V0, L8010A338
   li    A0, 1
L8010A324:
  sll   V0, S1, 1
  addu  V0, V0, S2
  li    V1, -1
  j     L8010A3F8
   sh    V1, 0(V0)
L8010A338:
  jal   func_8007FA6C
   li    A1, 5
  sll   S0, S1, 1
  addu  S0, S0, S2
  sh    V0, 0(S0)
  sll   V0, V0, 0x10
  sll   A2, FP, 0x10
  sra   A0, V0, 0x10
  move  A1, R0
  sra   A2, A2, 0x10
  jal   func_8008218C
   move  A3, R0
  lh    A0, 0(S0)
  move  A1, R0
  jal   func_80082384
   li    A2, 10
  lh    A0, 0(S0)
  move  A1, R0
  jal   func_8008225C
   move  A2, R0
  lh    A0, 0(S0)
  move  A1, R0
  jal   func_80082418
   li    A2, 4096
  sll   V0, S1, 3
  lui   AT, hi(D_8011233C)
  addu  AT, AT, V0
  lwc1  F0, lo(D_8011233C)(AT)
  trunc.w.s F2, F0
  mfc1  A2, F2
  nop
  sll   A2, A2, 0x10
  lui   AT, hi(D_80112340)
  addu  AT, AT, V0
  lwc1  F0, lo(D_80112340)(AT)
  trunc.w.s F2, F0
  mfc1  A3, F2
  nop
  sll   A3, A3, 0x10
  lh    A0, 0(S0)
  move  A1, R0
  sra   A2, A2, 0x10
  jal   func_80081AD0
   sra   A3, A3, 0x10
  lh    A0, 0(S0)
  move  A1, R0
  jal   func_80082488
   move  A2, R0
L8010A3F8:
  addiu S1, S1, 1
  slti  V0, S1, 4
  bnez  V0, L8010A2F0
   nop
  jal   func_8007959C
   li    A0, 887
  move  S2, R0
  addiu S4, SP, 0x10
  li    S5, -1
  move  S1, R0
L8010A420:
  sll   S3, S2, 4
  sll   V0, S1, 1
L8010A428:
  addu  S0, V0, S4
  lh    A0, 0(S0)
  beq   A0, S5, L8010A4C4
   sll   V0, S1, 3
  mtc1  S2, F4
  nop
  cvt.s.w F4, F4
  lui   AT, hi(D_8011235C)
  addu  AT, AT, V0
  lwc1  F0, lo(D_8011235C)(AT)
  mul.s F0, F4, F0
  lui   AT, hi(D_8011233C)
  addu  AT, AT, V0
  lwc1  F2, lo(D_8011233C)(AT)
  add.s F0, F0, F2
  trunc.w.s F2, F0
  mfc1  A2, F2
  nop
  sll   A2, A2, 0x10
  lui   AT, hi(D_80112360)
  addu  AT, AT, V0
  lwc1  F0, lo(D_80112360)(AT)
  mul.s F4, F4, F0
  lui   AT, hi(D_80112340)
  addu  AT, AT, V0
  lwc1  F0, lo(D_80112340)(AT)
  add.s F4, F4, F0
  trunc.w.s F0, F4
  mfc1  A3, F0
  nop
  sll   A3, A3, 0x10
  move  A1, R0
  sra   A2, A2, 0x10
  jal   func_80081AD0
   sra   A3, A3, 0x10
  lh    A0, 0(S0)
  move  A1, R0
  jal   func_80082488
   andi  A2, S3, 0xffff
L8010A4C4:
  addiu S1, S1, 1
  slti  V0, S1, 4
  bnez  V0, L8010A428
   sll   V0, S1, 1
  jal   func_8007DA44
   addiu S2, S2, 1
  slti  V0, S2, 0x11
  bnez  V0, L8010A420
   move  S1, R0
  move  S6, R0
  addiu S2, SP, 0x10
  li    S4, -1
  lui   S3, hi(D_800FD2C0)
  addiu S3, S3, lo(D_800FD2C0)
  sll   S0, S1, 1
L8010A500:
  addu  V0, S0, S2
  lh    A0, 0(V0)
  beql  A0, S4, L8010A55C
   addiu S1, S1, 1
  move  A1, R0
  jal   func_80082488
   li    A2, 255
  addu  V0, S0, S1
  sll   V0, V0, 2
  addu  V0, V0, S1
  sll   V0, V0, 2
  addu  V1, V0, S3
  lui   AT, hi(p1_stars)
  addu  AT, AT, V0
  lhu   V0, lo(p1_stars)(AT)
  addiu V0, V0, -1
  sh    V0, 0xe(V1)
  addiu S6, S6, 1
  sll   A0, S1, 0x10
  sra   A0, A0, 0x10
  jal   func_80067170
   li    A1, 5
  addiu S1, S1, 1
L8010A55C:
  slti  V0, S1, 4
  bnez  V0, L8010A500
   sll   S0, S1, 1
  jal   func_8007959C
   li    A0, 228
  move  S2, R0
  addiu S5, SP, 0x10
  li    S7, -1
  li    AT, 0x41800000 ;16.000000
  mtc1  AT, F22
  move  S1, R0
L8010A588:
  sll   V1, S2, 1
  addu  V1, V1, S2
  sll   V0, V1, 4
  subu  V0, V0, V1
  sll   S4, V0, 1
  sll   V0, S1, 1
L8010A5A0:
  addu  S3, V0, S5
  lh    V0, 0(S3)
  beq   V0, S7, L8010A64C
   sll   S0, S1, 3
  lui   AT,hi(D_80112360)
  addu  AT, AT, S0
  lwc1  F20, lo(D_80112360)(AT)
  mul.s F20, F20, F22
  lui   AT, hi(D_80112340)
  addu  AT, AT, S0
  lwc1  F0, lo(D_80112340)(AT)
  add.s F20, F20, F0
  mtc1  S4, F12
  nop
  cvt.d.w F12, F12
  lui   AT, hi(D_801135D0)
  ldc1  F0, lo(D_801135D0)(AT)
  mul.d F12, F12, F0
  jal   func_800A4FA0
   cvt.s.d F12, F12
  add.s F0, F0, F0
  add.s F20, F20, F0
  trunc.w.s F0, F20
  mfc1  A3, F0
  nop
  sll   A3, A3, 0x10
  lui   AT, hi(D_8011235C)
  addu  AT, AT, S0
  lwc1  F0, lo(D_8011235C)(AT)
  mul.s F0, F0, F22
  lui   AT, hi(D_8011233C)
  addu  AT, AT, S0
  lwc1  F2, lo(D_8011233C)(AT)
  add.s F0, F0, F2
  trunc.w.s F2, F0
  mfc1  A2, F2
  nop
  sll   A2, A2, 0x10
  lh    A0, 0(S3)
  move  A1, R0
  sra   A2, A2, 0x10
  jal   func_80081AD0
   sra   A3, A3, 0x10
L8010A64C:
  addiu S1, S1, 1
  slti  V0, S1, 4
  bnez  V0, L8010A5A0
   sll   V0, S1, 1
  jal   func_8007DA44
   addiu S2, S2, 1
  slti  V0, S2, 0x1e
  bnez  V0, L8010A588
   move  S1, R0
  li    S2, 16
  addiu S4, SP, 0x10
  li    S5, -1
L8010A67C:
  sll   S3, S2, 4
  sll   V0, S1, 1
L8010A684:
  addu  S0, V0, S4
  lh    A0, 0(S0)
  beq   A0, S5, L8010A720
   sll   V0, S1, 3
  mtc1  S2, F4
  nop
  cvt.s.w F4, F4
  lui   AT, hi(D_8011235C)
  addu  AT, AT, V0
  lwc1  F0, lo(D_8011235C)(AT)
  mul.s F0, F4, F0
  lui   AT, hi(D_8011233C)
  addu  AT, AT, V0
  lwc1  F2, lo(D_8011233C)(AT)
  add.s F0, F0, F2
  trunc.w.s F2, F0
  mfc1  A2, F2
  nop
  sll   A2, A2, 0x10
  lui   AT, hi(D_80112360)
  addu  AT, AT, V0
  lwc1  F0, lo(D_80112360)(AT)
  mul.s F4, F4, F0
  lui   AT, hi(D_80112340)
  addu  AT, AT, V0
  lwc1  F0, lo(D_80112340)(AT)
  add.s F4, F4, F0
  trunc.w.s F0, F4
  mfc1  A3, F0
  nop
  sll   A3, A3, 0x10
  move  A1, R0
  sra   A2, A2, 0x10
  jal   func_80081AD0
   sra   A3, A3, 0x10
  lh    A0, 0(S0)
  move  A1, R0
  jal   func_80082488
   andi  A2, S3, 0xffff
L8010A720:
  addiu S1, S1, 1
  slti  V0, S1, 4
  bnez  V0, L8010A684
   sll   V0, S1, 1
  jal   func_8007DA44
   addiu S2, S2, -1
  bgez  S2, L8010A67C
   move  S1, R0
  addiu S0, SP, 0x10
  li    S2, -1
  sll   V0, S1, 1
L8010A74C:
  addu  V0, V0, S0
  lh    A0, 0(V0)
  beq   A0, S2, L8010A764
   addiu S1, S1, 1
  jal   func_8007F8B0
   nop
L8010A764:
  slti  V0, S1, 4
  bnez  V0, L8010A74C
   sll   V0, S1, 1
  sll   A0, FP, 0x10
  jal   func_80082660
   sra   A0, A0, 0x10
  j     L8010AB1C
   move  V0, S6
L8010A784:
  jal   func_8007FA6C
   li    A1, 5
  move  S4, V0
  lui A0, 0xa
  jal   func_80017680
   ori A0, A0, 0xb
  move  S0, V0
  jal   func_80082800
   move  A0, S0
  move  S5, V0
  jal   func_80017800
   move  A0, S0
  sll   S0, S4, 0x10
  sra   S0, S0, 0x10
  sll   A2, S5, 0x10
  move  A0, S0
  move  A1, R0
  sra   A2, A2, 0x10
  jal   func_8008218C
   move  A3, R0
  move  A0, S0
  move  A1, R0
  jal   func_80082384
   li    A2, 10
  move  A0, S0
  move  A1, R0
  jal   func_8008225C
   move  A2, R0
  move  A0, S0
  move  A1, R0
  jal   func_80082418
   li    A2, 4096
  sll   V0, S3, 3
  lui   AT, hi(D_8011233C)
  addu  AT, AT, V0
  lwc1  F0, lo(D_8011233C)(AT)
  trunc.w.s F2, F0
  mfc1  A2, F2
  nop
  sll   A2, A2, 0x10
  lui   AT, hi(D_80112340)
  addu  AT, AT, V0
  lwc1  F0, lo(D_80112340)(AT)
  trunc.w.s F2, F0
  mfc1  A3, F2
  nop
  sll   A3, A3, 0x10
  move  A0, S0
  move  A1, R0
  sra   A2, A2, 0x10
  jal   func_80081AD0
   sra   A3, A3, 0x10
  move  A0, S0
  move  A1, R0
  jal   func_80082488
   move  A2, R0
  jal   func_8007959C
   li    A0, 887
  move  S0, R0
  sll   V0, S4, 0x10
  sra   S2, V0, 0x10
  sll   S1, S3, 3
L8010A87C:
  mtc1  S0, F4
  nop
  cvt.s.w F4, F4
  lui   AT, hi(D_8011235C)
  addu  AT, AT, S1
  lwc1  F0, lo(D_8011235C)(AT)
  mul.s F0, F4, F0
  lui   AT, hi(D_8011233C)
  addu  AT, AT, S1
  lwc1  F2, lo(D_8011233C)(AT)
  add.s F0, F0, F2
  trunc.w.s F2, F0
  mfc1  A2, F2
  nop
  sll   A2, A2, 0x10
  lui   AT, hi(D_80112360)
  addu  AT, AT, S1
  lwc1  F0, lo(D_80112360)(AT)
  mul.s F4, F4, F0
  lui   AT, hi(D_80112340)
  addu  AT, AT, S1
  lwc1  F0, lo(D_80112340)(AT)
  add.s F4, F4, F0
  trunc.w.s F0, F4
  mfc1  A3, F0
  nop
  sll   A3, A3, 0x10
  move  A0, S2
  move  A1, R0
  sra   A2, A2, 0x10
  jal   func_80081AD0
   sra   A3, A3, 0x10
  sll   A2, S0, 4
  move  A0, S2
  move  A1, R0
  jal   func_80082488
   andi  A2, A2, 0xffff
  jal   func_8007DA44
   addiu S0, S0, 1
  slti  V0, S0, 0x11
  bnez  V0, L8010A87C
   sll   A0, S4, 0x10
  sra   A0, A0, 0x10
  move  A1, R0
  jal   func_80082488
   li    A2, 255
  sll   V0, S3, 1
  addu  V0, V0, S3
  sll   V0, V0, 2
  addu  V0, V0, S3
  sll   V0, V0, 2
  lui   V1, hi(p1_stars)
  addu  V1, V1, V0
  lhu   V1, lo(p1_stars)(V1)
  addiu V1, V1, -1
  lui   AT, hi(p1_stars)
  addu  AT, AT, V0
  sh    V1, lo(p1_stars)(AT)
  sll   A0, S3, 0x10
  sra   A0, A0, 0x10
  jal   func_80067170
   li    A1, 5
  jal   func_8007959C
   li    A0, 228
  move  S0, R0
  sll   S1, S3, 3
  li    AT, 0x41800000 ;16.000000
  mtc1  AT, F22
  lui   AT, hi(D_801135D8)
  ldc1  F24, lo(D_801135D8)(AT)
  sll   S2, S4, 0x10
L8010A998:
  lui   AT, hi(D_80112360)
  addu  AT, AT, S1
  lwc1  F20, lo(D_80112360)(AT)
  mul.s F20, F20, F22
  lui   AT, hi(D_80112340)
  addu  AT, AT, S1
  lwc1  F0, lo(D_80112340)(AT)
  add.s F20, F20, F0
  sll   V1, S0, 1
  addu  V1, V1, S0
  sll   V0, V1, 4
  subu  V0, V0, V1
  sll   V0, V0, 1
  mtc1  V0, F12
  nop
  cvt.d.w F12, F12
  mul.d F12, F12, F24
  jal   func_800A4FA0
   cvt.s.d F12, F12
  add.s F0, F0, F0
  add.s F20, F20, F0
  trunc.w.s F0, F20
  mfc1  A3, F0
  nop
  sll   A3, A3, 0x10
  lui   AT, hi(D_8011235C)
  addu  AT, AT, S1
  lwc1  F0, lo(D_8011235C)(AT)
  mul.s F0, F0, F22
  lui   AT, hi(D_8011233C)
  addu  AT, AT, S1
  lwc1  F2, lo(D_8011233C)(AT)
  add.s F0, F0, F2
  trunc.w.s F2, F0
  mfc1  A2, F2
  nop
  sll   A2, A2, 0x10
  sra   A0, S2, 0x10
  move  A1, R0
  sra   A2, A2, 0x10
  jal   func_80081AD0
   sra   A3, A3, 0x10
  jal   func_8007DA44
   addiu S0, S0, 1
  slti  V0, S0, 0x1e
  bnez  V0, L8010A998
   sll   V0, S4, 0x10
  li    S0, 16
  sra   S2, V0, 0x10
  sll   S1, S3, 3
L8010AA60:
  mtc1  S0, F4
  nop
  cvt.s.w F4, F4
  lui   AT, hi(D_8011235C)
  addu  AT, AT, S1
  lwc1  F0, lo(D_8011235C)(AT)
  mul.s F0, F4, F0
  lui   AT, hi(D_8011233C)
  addu  AT, AT, S1
  lwc1  F2, lo(D_8011233C)(AT)
  add.s F0, F0, F2
  trunc.w.s F2, F0
  mfc1  A2, F2
  nop
  sll   A2, A2, 0x10
  lui   AT, hi(D_80112360)
  addu  AT, AT, S1
  lwc1  F0, lo(D_80112360)(AT)
  mul.s F4, F4, F0
  lui   AT, hi(D_80112340)
  addu  AT, AT, S1
  lwc1  F0, lo(D_80112340)(AT)
  add.s F4, F4, F0
  trunc.w.s F0, F4
  mfc1  A3, F0
  nop
  sll   A3, A3, 0x10
  move  A0, S2
  move  A1, R0
  sra   A2, A2, 0x10
  jal   func_80081AD0
   sra   A3, A3, 0x10
  sll   A2, S0, 4
  move  A0, S2
  move  A1, R0
  jal   func_80082488
   andi  A2, A2, 0xffff
  jal   func_8007DA44
   addiu S0, S0, -1
  bgez  S0, L8010AA60
   sll   A0, S4, 0x10
  jal   func_8007F8B0
   sra   A0, A0, 0x10
  sll   A0, S5, 0x10
  jal   func_80082660
   sra   A0, A0, 0x10
  li    V0, 1
L8010AB1C:
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
  ldc1  F24, 0x50(SP)
  ldc1  F22, 0x48(SP)
  ldc1  F20, 0x40(SP)
  jr    RA
   addiu SP, SP, 0x58

func_8010AB58:
  addiu SP, SP, -0x18
  sw    RA, 0x10(SP)
  jal   func_80055E60
   nop
  jal   func_80076FCC
   move  A0, R0
  lw    RA, 0x10(SP)
  jr    RA
   addiu SP, SP, 0x18

func_8010AB7C:
  addiu SP, SP, -0xb8
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
  sdc1  F26, 0xb0(SP)
  sdc1  F24, 0xa8(SP)
  sdc1  F22, 0xa0(SP)
  sdc1  F20, 0x98(SP)
  move  S4, A0
  li    A0, 1
  jal   func_8007FA6C
   li    A1, 5
  sh    V0, 0x2e(SP)
  lui A0, 0xa
  jal   func_80017680
   ori A0, A0, 0xb
  move  S0, V0
  jal   func_80082800
   move  A0, S0
  sh    V0, 0x36(SP)
  jal   func_80017800
   move  A0, S0
  lhu   T0, 0x2e(SP)
  sll   S0, T0, 0x10
  sra   S0, S0, 0x10
  lhu   T0, 0x36(SP)
  sll   A2, T0, 0x10
  move  A0, S0
  move  A1, R0
  sra   A2, A2, 0x10
  jal   func_8008218C
   move  A3, R0
  move  A0, S0
  move  A1, R0
  jal   func_80082384
   li    A2, 10
  move  A0, S0
  move  A1, R0
  jal   func_8008225C
   move  A2, R0
  move  A0, S0
  move  A1, R0
  jal   func_80082418
   li    A2, 4096
  sll   V0, S4, 3
  lui   AT, hi(D_8011233C)
  addu  AT, AT, V0
  lwc1  F0, lo(D_8011233C)(AT)
  trunc.w.s F2, F0
  mfc1  A2, F2
  nop
  sll   A2, A2, 0x10
  lui   AT, hi(D_80112340)
  addu  AT, AT, V0
  lwc1  F0, lo(D_80112340)(AT)
  trunc.w.s F2, F0
  mfc1  A3, F2
  nop
  sll   A3, A3, 0x10
  move  A0, S0
  move  A1, R0
  sra   A2, A2, 0x10
  jal   func_80081AD0
   sra   A3, A3, 0x10
  move  A0, S0
  move  A1, R0
  jal   func_80082488
   move  A2, R0
  li    A0, 1
  jal   func_8007FA6C
   li    A1, 5
  sh    V0, 0x3e(SP)
  sll   V0, S4, 1
  addu  V0, V0, S4
  sll   V0, V0, 2
  addu  V0, V0, S4
  sll   V0, V0, 2
  lui   AT, hi(p1_char)
  addu  AT, AT, V0
  lbu   V0, lo(p1_char)(AT)
  sll   V0, V0, 2
  lui   A0, hi(D_8011237C)
  addu  A0, A0, V0
  lw    A0, lo(D_8011237C)(A0)
  jal   func_80017680
   move  S7, R0
  move  S0, V0
  jal   func_80082800
   move  A0, S0
  sh    V0, 0x46(SP)
  jal   func_80017800
   move  A0, S0
  lhu   T0, 0x3e(SP)
  sll   V0, T0, 0x10
  sra   S0, V0, 0x10
  lhu   T0, 0x46(SP)
  sll   A2, T0, 0x10
  move  A0, S0
  move  A1, R0
  sra   A2, A2, 0x10
  jal   func_8008218C
   move  A3, R0
  move  A0, S0
  move  A1, R0
  jal   func_80082384
   li    A2, 10
  move  A0, S0
  move  A1, R0
  jal   func_8008225C
   li    A2, 1
  andi  V0, S4, 1
  beqz  V0, L8010AD68
   move  A0, S0
  move  A1, R0
  j     L8010AD7C
   li    A2, 4097
L8010AD68:
  lhu   T0, 0x3e(SP)
  sll   A0, T0, 0x10
  sra   A0, A0, 0x10
  move  A1, R0
  li    A2, 4096
L8010AD7C:
  jal   func_80082418
   move  S1, R0
  lhu   T0, 0x3e(SP)
  sll   S0, T0, 0x10
  sra   S0, S0, 0x10
  sll   V0, S4, 3
  lui   AT, hi(D_8011235C)
  addu  AT, AT, V0
  lwc1  F2, lo(D_8011235C)(AT)
  li    AT, 0x41800000 ;16.000000
  mtc1  AT, F4
  nop
  mul.s F2, F2, F4
  lui   AT, hi(D_8011233C)
  addu  AT, AT, V0
  lwc1  F0, lo(D_8011233C)(AT)
  sub.s F0, F0, F2
  li    AT, 0x41000000 ;8.000000
  mtc1  AT, F2
  nop
  sub.s F0, F0, F2
  trunc.w.s F2, F0
  mfc1  A2, F2
  nop
  sll   A2, A2, 0x10
  lui   AT, hi(D_80112360)
  addu  AT, AT, V0
  lwc1  F0, lo(D_80112360)(AT)
  mul.s F0, F0, F4
  lui   AT, hi(D_80112340)
  addu  AT, AT, V0
  lwc1  F2, lo(D_80112340)(AT)
  add.s F0, F0, F2
  trunc.w.s F2, F0
  mfc1  A3, F2
  nop
  sll   A3, A3, 0x10
  move  A0, S0
  move  A1, R0
  sra   A2, A2, 0x10
  jal   func_80081AD0
   sra   A3, A3, 0x10
  move  A0, S0
  move  A1, R0
  jal   func_80082488
   move  A2, R0
  lhu   T0, 0x2e(SP)
  sll   V0, T0, 0x10
  sra   S3, V0, 0x10
  sll   S2, S4, 3
  lhu   T0, 0x3e(SP)
  sll   S5, T0, 0x10
L8010AE4C:
  mtc1  S1, F4
  nop
  cvt.s.w F4, F4
  lui   AT, hi(D_8011235C)
  addu  AT, AT, S2
  lwc1  F0, lo(D_8011235C)(AT)
  mul.s F0, F4, F0
  lui   AT, hi(D_8011233C)
  addu  AT, AT, S2
  lwc1  F2, lo(D_8011233C)(AT)
  add.s F0, F0, F2
  trunc.w.s F2, F0
  mfc1  A2, F2
  nop
  sll   A2, A2, 0x10
  lui   AT, hi(D_80112360)
  addu  AT, AT, S2
  lwc1  F0, lo(D_80112360)(AT)
  mul.s F4, F4, F0
  lui   AT, hi(D_80112340)
  addu  AT, AT, S2
  lwc1  F0, lo(D_80112340)(AT)
  add.s F4, F4, F0
  trunc.w.s F0, F4
  mfc1  A3, F0
  nop
  sll   A3, A3, 0x10
  move  A0, S3
  move  A1, R0
  sra   A2, A2, 0x10
  jal   func_80081AD0
   sra   A3, A3, 0x10
  sll   S0, S1, 4
  andi  S0, S0, 0xffff
  move  A0, S3
  move  A1, R0
  jal   func_80082488
   move  A2, S0
  sra   A0, S5, 0x10
  move  A1, R0
  jal   func_80082488
   move  A2, S0
  jal   func_8007DA44
   addiu S1, S1, 1
  slti  V0, S1, 0x11
  bnez  V0, L8010AE4C
   move  A1, R0
  lhu   T0, 0x2e(SP)
  sll   A0, T0, 0x10
  sra   A0, A0, 0x10
  jal   func_80082488
   li    A2, 255
  lhu   T0, 0x3e(SP)
  sll   A0, T0, 0x10
  sra   A0, A0, 0x10
  move  A1, R0
  jal   func_80082488
   li    A2, 255
  li    V0, 24
  sb    V0, 0x18(SP)
  sll   V0, S4, 1
  addu  V0, V0, S4
  sll   V0, V0, 2
  addu  V0, V0, S4
  sll   V0, V0, 2
  lui   AT, hi(p1_char)
  addu  AT, AT, V0
  lbu   V0, lo(p1_char)(AT)
  sb    V0, 0x19(SP)
  sb    R0, 0x1a(SP)
  sw    R0, 0x10(SP)
  sw    R0, 0x14(SP)
  li    A0, 1722
  addiu A1, SP, 0x18
  move  A2, R0
  jal   func_80055C88
   move  A3, R0
  sll   S0, S4, 0x10
  sra   S0, S0, 0x10
  move  A0, S0
  jal   func_80067170
   li    A1, 2
  jal   func_80055E3C
   move  A0, S4
  move  FP, R0
  move  S2, R0
  jal   func_8007959C
   li    A0, 886
  move  A0, S0
  li    A1, 3
  jal   func_800672BC
   li    A2, 5
  li    AT, 0x41200000 ;10.000000
  mtc1  AT, F12
  nop
  jal   func_8005A358
   sw    V0, 0x4c(SP)
  addiu S5, V0, 1
  move  S1, R0
  move  S6, R0
  sll   S0, S4, 3
  li    AT, 0x41800000 ;16.000000
  mtc1  AT, F24
  li    AT, 0x41000000 ;8.000000
  mtc1  AT, F26
  lhu   T0, 0x3e(SP)
  sll   T0, T0, 0x10
  sw    T0, 0x54(SP)
  sll   V0, S4, 1
  addu  V0, V0, S4
  sll   V0, V0, 2
  addu  V0, V0, S4
  sll   V0, V0, 2
  sw    V0, 0x5c(SP)
  sll   V0, S4, 1
  addu  V0, V0, S4
  sll   V0, V0, 2
  sw    V0, 0x64(SP)
  move  T0, V0
  addu  T0, T0, S4
  sw    T0, 0x64(SP)
  sll   V0, S4, 1
  addu  V0, V0, S4
  sll   V0, V0, 2
  sw    V0, 0x6c(SP)
  move  T0, V0
  addu  T0, T0, S4
  sw    T0, 0x6c(SP)
  lw    T0, 0x54(SP)
  sra   S3, T0, 0x10
L8010B054:
  sll   V0, S5, 0x10
  bnez  V0, L8010B080
   slti  V0, S2, 2
  jal   func_8007959C
   li    A0, 228
  li    AT, 0x41700000 ;15.000000
  mtc1  AT, F12
  jal   func_8005A358
   nop
  addiu S5, V0, 0x1e
  slti  V0, S2, 2
L8010B080:
  xori  V0, V0, 1
  subu  S2, S2, V0
  bnez  S2, L8010B150
   li    V0, 9
  lui   AT, hi(D_80112360)
  addu  AT, AT, S0
  lwc1  F20, lo(D_80112360)(AT)
  mul.s F20, F20, F24
  lui   AT, hi(D_80112340)
  addu  AT, AT, S0
  lwc1  F0, lo(D_80112340)(AT)
  add.s F20, F20, F0
  sll   V1, S1, 1
  addu  V1, V1, S1
  sll   V0, V1, 4
  subu  V0, V0, V1
  sll   V0, V0, 1
  mtc1  V0, F12
  nop
  cvt.d.w F12, F12
  lui   AT, hi(D_801135E0)
  ldc1  F0, lo(D_801135E0)(AT)
  mul.d F12, F12, F0
  jal   func_800A4FA0
   cvt.s.d F12, F12
  add.s F0, F0, F0
  add.s F20, F20, F0
  trunc.w.s F0, F20
  mfc1  A3, F0
  nop
  sll   A3, A3, 0x10
  lhu   T0, 0x2e(SP)
  sll   A0, T0, 0x10
  lui   AT, hi(D_8011235C)
  addu  AT, AT, S0
  lwc1  F0, lo(D_8011235C)(AT)
  mul.s F0, F0, F24
  lui   AT, hi(D_8011233C)
  addu  AT, AT, S0
  lwc1  F2, lo(D_8011233C)(AT)
  add.s F0, F0, F2
/*  */  trunc.w.s F2, F0
  mfc1  A2, F2
  nop
  sll   A2, A2, 0x10
  sra   A0, A0, 0x10
  move  A1, R0
  sra   A2, A2, 0x10
  jal   func_80081AD0
   sra   A3, A3, 0x10
  j     L8010B28C
   nop
L8010B150:
  bne   S2, V0, L8010B28C
   sll   V1, S6, 1
  lui   AT, hi(D_8011235C)
  addu  AT, AT, S0
  lwc1  F20, lo(D_8011235C)(AT)
  mul.s F20, F20, F24
  lui   AT, hi(D_8011233C)
  addu  AT, AT, S0
  lwc1  F0, lo(D_8011233C)(AT)
  add.s F20, F20, F0
  addu  V1, V1, S6
  sll   V0, V1, 4
  subu  V0, V0, V1
  sll   V0, V0, 1
  mtc1  V0, F22
  nop
  cvt.d.w F22, F22
  lui   AT, hi(D_801135E8)
  ldc1  F0, lo(D_801135E8)(AT)
  mul.d F22, F22, F0
  cvt.s.d F22, F22
  jal   func_800A4FA0
   mov.s F12, F22
  add.s F0, F0, F0
  add.s F20, F20, F0
  trunc.w.s F0, F20
  mfc1  A2, F0
  nop
  sll   A2, A2, 0x10
  lhu   T0, 0x2e(SP)
  sll   A0, T0, 0x10
  lui   AT, hi(D_80112360)
  addu  AT, AT, S0
  lwc1  F0, lo(D_80112360)(AT)
  mul.s F0, F0, F24
  lui   AT, hi(D_80112340)
  addu  AT, AT, S0
  lwc1  F2, lo(D_80112340)(AT)
  add.s F0, F0, F2
  trunc.w.s F2, F0
  mfc1  A3, F2
  nop
  sll   A3, A3, 0x10
  sra   A0, A0, 0x10
  move  A1, R0
  sra   A2, A2, 0x10
  jal   func_80081AD0
   sra   A3, A3, 0x10
  lui   AT, hi(D_8011233C)
  addu  AT, AT, S0
  lwc1  F20, lo(D_8011233C)(AT)
  sub.s F20, F20, F26
  jal   func_800A4FA0
   mov.s F12, F22
  add.s F0, F0, F0
  add.s F20, F20, F0
  trunc.w.s F0, F20
  mfc1  A2, F0
  nop
  sll   A2, A2, 0x10
  lui   AT, hi(D_80112360)
  addu  AT, AT, S0
  lwc1  F0, lo(D_80112360)(AT)
  mul.s F0, F0, F24
  lui   AT, hi(D_80112340)
  addu  AT, AT, S0
  lwc1  F2, lo(D_80112340)(AT)
  add.s F0, F0, F2
  trunc.w.s F2, F0
  mfc1  A3, F2
  nop
  sll   A3, A3, 0x10
  lw    T0, 0x54(SP)
  sra   A0, T0, 0x10
  move  A1, R0
  sra   A2, A2, 0x10
  jal   func_80081AD0
   sra   A3, A3, 0x10
  addiu S6, S6, 1
L8010B28C:
  lw    T0, 0x5c(SP)
  lui   V0, hi(D_800FD2C6)
  addu  V0, V0, T0
  lhu   V0, lo(D_800FD2C6)(V0)
  andi  V0, V0, 1
  beqz  V0, L8010B318
   nop
  beql  S2, R0, L8010B34C
   addiu FP, FP, 1
  lui   V0, hi(D_800FD2C2)
  addu  V0, V0, T0
  lbu   V0, lo(D_800FD2C2)(V0)
  bnez  V0, L8010B2D4
   slti  V0, S2, 7
  bnel  V0, R0, L8010B34C
   addiu FP, FP, 1
  j     L8010B3E4
   sltiu V1, S2, 1
L8010B2D4:
  lw    T0, 0x64(SP)
  sll   V0, T0, 2
  lui   V1, hi(D_800FD2C2)
  addu  V1, V1, V0
  lbu   V1, lo(D_800FD2C2)(V1)
  li    V0, 1
  bne   V1, V0, L8010B308
   slti  V0, S2, 0xa
  slti  V0, S2, 8
  bnel  V0, R0, L8010B34C
   addiu FP, FP, 1
  j     L8010B3E4
   sltiu V1, S2, 1
L8010B308:
  bnel  V0, R0, L8010B34C
   addiu FP, FP, 1
  j     L8010B3E4
   sltiu V1, S2, 1
L8010B318:
  lw    T0, 0x6c(SP)
  sll   V0, T0, 2
  lui   AT, hi(p1_controller)
  addu  AT, AT, V0
  lbu   V0, lo(p1_controller)(AT)
  sll   V0, V0, 1
  lui   AT, hi(D_800F6098)
  addu  AT, AT, V0
  lhu   V0, lo(D_800F6098)(AT)
  andi  V0, V0, 0x8000
  beqz  V0, L8010B3E4
   sltiu V1, S2, 1
  addiu FP, FP, 1
L8010B34C:
  bnez  S7, L8010B3E0
   li    S2, 10
  move  A0, S3
  move  A1, R0
  li    A2, 1
  jal   func_800822A8
   move  A3, R0
  move  A0, S3
  move  A1, R0
  jal   func_8008225C
   li    A2, 1
  li    S7, 1
  lui   AT, hi(D_8011233C)
  addu  AT, AT, S0
  lwc1  F0, lo(D_8011233C)(AT)
  sub.s F0, F0, F26
  trunc.w.s F2, F0
  mfc1  A2, F2
  nop
  sll   A2, A2, 0x10
  lui   AT, hi(D_80112360)
  addu  AT, AT, S0
  lwc1  F0, lo(D_80112360)(AT)
  mul.s F0, F0, F24
  lui   AT, hi(D_80112340)
  addu  AT, AT, S0
  lwc1  F2, lo(D_80112340)(AT)
  add.s F0, F0, F2
  trunc.w.s F2, F0
  mfc1  A3, F2
  nop
  sll   A3, A3, 0x10
  move  A0, S3
  move  A1, R0
  sra   A2, A2, 0x10
  jal   func_80081AD0
   sra   A3, A3, 0x10
L8010B3E0:
  sltiu V1, S2, 1
L8010B3E4:
  xori  V0, S7, 1
  sltiu V0, V0, 1
  and   V1, V1, V0
  beqz  V1, L8010B494
   move  A0, S3
  move  A1, R0
  move  A2, R0
  jal   func_800822A8
   move  A3, R0
  move  A0, S3
  move  A1, R0
  jal   func_8008225C
   li    A2, 1
  move  S7, R0
  lui   AT, hi(D_8011235C)
  addu  AT, AT, S0
  lwc1  F2, lo(D_8011235C)(AT)
  mul.s F2, F2, F24
  lui   AT, hi(D_8011233C)
  addu  AT, AT, S0
  lwc1  F0, lo(D_8011233C)(AT)
  sub.s F0, F0, F2
  sub.s F0, F0, F26
  trunc.w.s F2, F0
  mfc1  A2, F2
  nop
  sll   A2, A2, 0x10
  lui   AT, hi(D_80112360)
  addu  AT, AT, S0
  lwc1  F0, lo(D_80112360)(AT)
  mul.s F0, F0, F24
  lui   AT, hi(D_80112340)
  addu  AT, AT, S0
  lwc1  F2, lo(D_80112340)(AT)
  add.s F0, F0, F2
  trunc.w.s F2, F0
  mfc1  A3, F2
  nop
  sll   A3, A3, 0x10
  move  A0, S3
  move  A1, R0
  sra   A2, A2, 0x10
  jal   func_80081AD0
   sra   A3, A3, 0x10
L8010B494:
  jal   func_8007DA44
   addiu S1, S1, 1
  slti  V0, S1, 0x96
  bnez  V0, L8010B054
   addiu S5, S5, -1
  lw    A0, 0x4c(SP)
  jal   func_8006735C
   nop
  lui   A0, hi(func_8010AB58)
  addiu A0, A0, lo(func_8010AB58)
  li    A1, 4096
  move  A2, R0
  jal   InitProcess
   move  A3, R0
  bnez  FP, L8010B5AC
   li    S1, 16
  lhu   T0, 0x2e(SP)
  sll   V0, T0, 0x10
  sra   S3, V0, 0x10
  sll   S2, S4, 3
  lhu   T0, 0x3e(SP)
  sll   S5, T0, 0x10
L8010B4EC:
  mtc1  S1, F4
  nop
  cvt.s.w F4, F4
  lui   AT, hi(D_8011235C)
  addu  AT, AT, S2
  lwc1  F0, lo(D_8011235C)(AT)
  mul.s F0, F4, F0
  lui   AT, hi(D_8011233C)
  addu  AT, AT, S2
  lwc1  F2, lo(D_8011233C)(AT)
  add.s F0, F0, F2
  trunc.w.s F2, F0
  mfc1  A2, F2
  nop
  sll   A2, A2, 0x10
  lui   AT, hi(D_80112360)
  addu  AT, AT, S2
  lwc1  F0, lo(D_80112360)(AT)
  mul.s F4, F4, F0
  lui   AT, hi(D_80112340)
  addu  AT, AT, S2
  lwc1  F0, lo(D_80112340)(AT)
  add.s F4, F4, F0
  trunc.w.s F0, F4
  mfc1  A3, F0
  nop
  sll   A3, A3, 0x10
  move  A0, S3
  move  A1, R0
  sra   A2, A2, 0x10
  jal   func_80081AD0
   sra   A3, A3, 0x10
  sll   S0, S1, 4
  andi  S0, S0, 0xffff
  move  A0, S3
  move  A1, R0
  jal   func_80082488
   move  A2, S0
  sra   A0, S5, 0x10
  move  A1, R0
  jal   func_80082488
   move  A2, S0
  jal   func_8007DA44
   addiu S1, S1, -2
  bltz  S1, L8010B744
   nop
  j     L8010B4EC
   nop
L8010B5AC:
  lhu   T0, 0x2e(SP)
  sll   S2, T0, 0x10
  sll   S0, S4, 3
L8010B5B8:
  mtc1  S1, F20
  nop
  cvt.s.w F20, F20
  lui   AT, hi(D_8011235C)
  addu  AT, AT, S0
  lwc1  F0, lo(D_8011235C)(AT)
  mul.s F0, F20, F0
  lui   AT, hi(D_8011233C)
  addu  AT, AT, S0
  lwc1  F2, lo(D_8011233C)(AT)
  add.s F0, F0, F2
  trunc.w.s F2, F0
  mfc1  A2, F2
  nop
  sll   A2, A2, 0x10
  lui   AT, hi(D_80112360)
  addu  AT, AT, S0
  lwc1  F0, lo(D_80112360)(AT)
  mul.s F0, F20, F0
  lui   AT, hi(D_80112340)
  addu  AT, AT, S0
  lwc1  F2, lo(D_80112340)(AT)
  add.s F0, F0, F2
  trunc.w.s F2, F0
  mfc1  A3, F2
  nop
  sll   A3, A3, 0x10
  sra   A0, S2, 0x10
  move  A1, R0
  sra   A2, A2, 0x10
  jal   func_80081AD0
   sra   A3, A3, 0x10
  lhu   T0, 0x3e(SP)
  sll   A0, T0, 0x10
  addiu V0, S1, -0x10
  mtc1  V0, F0
  nop
  cvt.s.w F0, F0
  lui   AT, hi(D_8011235C)
  addu  AT, AT, S0
  lwc1  F2, lo(D_8011235C)(AT)
  mul.s F0, F0, F2
  lui   AT, hi(D_8011233C)
  addu  AT, AT, S0
  lwc1  F2, lo(D_8011233C)(AT)
  add.s F0, F0, F2
  li    AT, 0x41000000 ;8.000000
  mtc1  AT, F2
  nop
  sub.s F0, F0, F2
  trunc.w.s F2, F0
  mfc1  A2, F2
  nop
  sll   A2, A2, 0x10
  lui   AT, hi(D_80112360)
  addu  AT, AT, S0
  lwc1  F0, lo(D_80112360)(AT)
  mul.s F20, F20, F0
  lui   AT, hi(D_80112340)
  addu  AT, AT, S0
  lwc1  F0, lo(D_80112340)(AT)
  add.s F20, F20, F0
  trunc.w.s F0, F20
  mfc1  A3, F0
  nop
  sll   A3, A3, 0x10
  sra   A0, A0, 0x10
  move  A1, R0
  sra   A2, A2, 0x10
  jal   func_80081AD0
   sra   A3, A3, 0x10
  jal   func_8007DA44
   addiu S1, S1, -2
  slti  V0, S1, -0x10
  beqz  V0, L8010B5B8
   move  A1, R0
  lhu   T0, 0x3e(SP)
  sll   S0, T0, 0x10
  sra   S0, S0, 0x10
  move  A0, S0
  move  A2, R0
  jal   func_800822A8
   move  A3, R0
  move  A0, S0
  move  A1, R0
  jal   func_8008225C
   li    A2, 1
  li    S1, 16
  lhu   T0, 0x2e(SP)
  sll   S0, T0, 0x10
  sll   A2, S1, 4
L8010B724:
  sra   A0, S0, 0x10
  move  A1, R0
  jal   func_80082488
   andi  A2, A2, 0xffff
  jal   func_8007DA44
   addiu S1, S1, -2
  bgez  S1, L8010B724
   sll   A2, S1, 4
L8010B744:
  lhu   T0, 0x2e(SP)
  sll   A0, T0, 0x10
  jal   func_8007F8B0
   sra   A0, A0, 0x10
  lhu   T0, 0x36(SP)
  sll   A0, T0, 0x10
  jal   func_80082660
   sra   A0, A0, 0x10
  lhu   T0, 0x3e(SP)
  sll   A0, T0, 0x10
  jal   func_8007F8B0
   sra   A0, A0, 0x10
  lhu   T0, 0x46(SP)
  sll   A0, T0, 0x10
  jal   func_80082660
   sra   A0, A0, 0x10
  move  S1, R0
  lui   A0, hi(D_800F93B0)
  lh    A0, lo(D_800F93B0)(A0)
  sll   V0, S1, 1
L8010B794:
  addu  V1, V0, S1
  lui   V0, hi(D_80112394)
  addu  V0, V0, V1
  lbu   V0, lo(D_80112394)(V0)
  slt   V0, A0, V0
  bnel  V0, R0, L8010B7CC
   addiu S1, S1, 1
  lui   V0, hi(D_80112395)
  addu  V0, V0, V1
  lbu   V0, lo(D_80112395)(V0)
  slt   V0, V0, A0
  beqz  V0, L8010B7D8
   sll   V0, S1, 1
  addiu S1, S1, 1
L8010B7CC:
  sltiu V0, S1, 6
  bnez  V0, L8010B794
   sll   V0, S1, 1
L8010B7D8:
  addu  V0, V0, S1
  lui   S7, hi(D_80112396)
  addu  S7, S7, V0
  lbu   S7, lo(D_80112396)(S7)
  move  S1, R0
  sll   V0, S1, 1
L8010B7F0:
  addu  V1, V0, S1
  lui   V0, hi(D_801123A8)
  addu  V0, V0, V1
  lbu   V0, lo(D_801123A8)(V0)
  slt   V0, FP, V0
  bnel  V0, R0, L8010B828
   addiu S1, S1, 1
  lui   V0, hi(D_801123A9)
  addu  V0, V0, V1
  lbu   V0, lo(D_801123A9)(V0)
  slt   V0, V0, FP
  beqz  V0, L8010B834
   sll   V0, S1, 1
  addiu S1, S1, 1
L8010B828:
  sltiu V0, S1, 0xe
  bnez  V0, L8010B7F0
   sll   V0, S1, 1
L8010B834:
  addu  V0, V0, S1
  lui   AT, hi(D_801123AA)
  addu  AT, AT, V0
  lbu   V0, lo(D_801123AA)(AT)
  subu  S7, S7, V0
  sll   V0, S4, 1
  addu  V0, V0, S4
  sll   V0, V0, 2
  addu  V0, V0, S4
  sll   V0, V0, 2
  lui   AT, hi(p1_coins)
  addu  AT, AT, V0
  lh    V0, lo(p1_coins)(AT)
  slt   V0, S7, V0
  beql  V0, R0, L8010B874
   li    S7, -1
L8010B874:
  move  V0, S7
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
  ldc1  F26, 0xb0(SP)
  ldc1  F24, 0xa8(SP)
  ldc1  F22, 0xa0(SP)
  ldc1  F20, 0x98(SP)
  jr    RA
   addiu SP, SP, 0xb8

func_8010B8B8:
  addiu SP, SP, -0x40
  sw    RA, 0x18(SP)
  sw    S1, 0x14(SP)
  sw    S0, 0x10(SP)
  sdc1  F26, 0x38(SP)
  sdc1  F24, 0x30(SP)
  sdc1  F22, 0x28(SP)
  jal   func_8007D838
   sdc1  F20, 0x20(SP)
  lw    S1, 0x8c(V0)
  lui   A0, hi(D_801138BC)
  jal   func_80043F7C
   lw    A0, lo(D_801138BC)(A0)
  move  S0, V0
  addiu A0, S0, 0xc
  jal   func_800B3170
   addiu A1, S1, 0xc
  addiu A0, S0, 0x24
  lui   A1, 0x4000
  move  A2, A1
  jal   func_800B3160
   move  A3, A1
  lwc1  F0, 0x30(S1)
  li    AT, 0x41200000 ;10.000000
  mtc1  AT, F2
  nop
  add.s F0, F0, F2
  swc1  F0, 0x30(S0)
  jal   func_80044258
   move  A0, S0
  li    AT, 0x43B40000 ;360.000000
  mtc1  AT, F12
  jal   func_8005A358
   nop
  mtc1  V0, F20
  nop
  cvt.s.w F20, F20
  lui   AT, hi(D_801135F0)
  ldc1  F22, lo(D_801135F0)(AT)
  li    AT, 0x420C0000 ;35.000000
  mtc1  AT, F26
  li    AT, 0x42200000 ;40.000000
  mtc1  AT, F24
L8010B964:
  jal   func_8007DA44
   nop
  lwc1  F0, 0x30(S0)
  cvt.d.s F0, F0
  add.d F0, F0, F22
  cvt.s.d F0, F0
  swc1  F0, 0x30(S0)
  lwc1  F2, 0x30(S1)
  add.s F2, F2, F26
  c.le.s F2, F0
  nop
  bc1t  L8010B9D8
   nop
  add.s F20, F20, F24
  lw    V0, 0x3c(S0)
  lw    V0, 0x40(V0)
  lh    V0, 0(V0)
  sll   A0, V0, 1
  addu  A0, A0, V0
  sll   A0, A0, 6
  lui   V0, hi(D_800FC834)
  lw    V0, lo(D_800FC834)(V0)
  addu  A0, A0, V0
  mfc1  A1, F20
  nop
  jal   func_800B39F0
   addiu A0, A0, 0x74
  j     L8010B964
   nop
L8010B9D8:
  jal   func_8004430C
   move  A0, S0
  jal   func_80076FCC
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

func_8010BA0C:
  addiu SP, SP, -0x18
  sw    RA, 0x14(SP)
  sw    S0, 0x10(SP)
  move  S0, A0
  lui   A0, hi(func_8010B8B8)
  addiu A0, A0, lo(func_8010B8B8)
  li    A1, 4096
  move  A2, R0
  jal   InitProcess
   move  A3, R0
  sw    S0, 0x8c(V0)
  lw    RA, 0x14(SP)
  lw    S0, 0x10(SP)
  jr    RA
   addiu SP, SP, 0x18

; Boo event
__PP64_INTERNAL_BOO_SPACE_EVENT:
func_8010BA48:
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
  jal   func_800558F4
   sdc1  F20, 0x98(SP)
  move  S1, V0
  lui   S3, hi(D_800F93A8)
  addiu S3, S3, lo(D_800F93A8)
  lui   A0, hi(D_800F93C6)
  lh    A0, lo(D_800F93C6)(A0)
  li    V0, 4
  beq   A0, V0, L8010C410
   nop
  jal   func_80046D2C
   move  FP, R0
  sw    V0, 0x6c(SP)
  li    A0, -1
  li    A1, -1
  jal   func_8005DD68
   li    A2, 2
  sll   V0, S1, 0x10
  sra   V1, V0, 0x10
  li    V0, ${booEventSpaces[0]}
  beq   V1, V0, L8010BAE4
   li    V0, ${booEventSpaces[0]}
  beq   V1, V0, L8010BAF0
   li    S7, 1
  j     L8010BAF8
   li    S7, -1
L8010BAE4:
  move  S7, R0
  j     L8010BB58
   li    S0, ${bestBooForBooEventSpaces[0]}
L8010BAF0:
  j     L8010BB58
   li    S0, ${bestBooForBooEventSpaces[1]}
L8010BAF8:
  lui   A0, hi(D_8011373C)
  lw    A0, lo(D_8011373C)(A0)
  jal   func_80043F7C
   li    S0, -1
  move  S2, V0
  jal   func_800442DC
   move  A0, S2
  li    AT, 0x41200000 ;10.000000
  mtc1  AT, F20
  nop
  swc1  F20, 0x30(S2)
  sll   A0, S1, 0x10
  jal   func_80054B8C
   sra   A0, A0, 0x10
  move  V1, V0
  lwc1  F0, 0xc(V1)
  lw    A1, 8(V1)
  add.s F20, F0, F20
  mfc1  A2, F20
  lw    A3, 0x10(V1)
  jal   func_800B3160
   addiu A0, S2, 0xc
  j     L8010BB68
   nop
L8010BB58:
  sll   V0, S7, 2
  lui   S2, hi(D_80113740)
  addu  S2, S2, V0
  lw    S2, lo(D_80113740)(S2)
L8010BB68:
  jal   func_8007959C
   li    A0, 235
  jal   func_8010A13C
   move  A0, S2
  sll   A0, S1, 0x10
  jal   func_80054B8C
   sra   A0, A0, 0x10
  move  V1, V0
  sll   V0, S0, 0x10
  sra   S0, V0, 0x10
  li    V0, -1
  beq   S0, V0, L8010BBF4
   move  A0, S2
  addiu A1, V1, 8
  jal   func_800446B4
   li    A2, 10
  li    A0, -1
  li    A1, 8
  jal   func_80056C30
   move  A2, S0
  jal   func_8007D9E0
   li    A0, 10
  jal   func_8007D838
   nop
  li    AT, 0x3FCC0000 ;1.593750
  ori AT, AT, 0xcccd
  mtc1  AT, F12
  nop
  jal   func_80052F70
   move  S0, V0
  move  A0, S0
  jal   func_8007D700
   move  A1, V0
  jal   func_8007D7E8
   nop
L8010BBF4:
  lh    V0, 0x1e(S3)
  sll   V1, V0, 1
  addu  V1, V1, V0
  sll   V1, V1, 2
  addu  V1, V1, V0
  sll   V1, V1, 2
  lui   V0, hi(p1_coins)
  addu  V0, V0, V1
  lh    V0, lo(p1_coins)(V0)
  slti  V0, V0, 5
  beqz  V0, L8010BC34
   li    A0, 7
  jal   func_8005600C
   li    A1, 1718
  j     L8010C384
   sll   V0, FP, 0x10
L8010BC34:
  move  S0, R0
L8010BC38:
  lh    V1, 0x1e(S3)
L8010BC3C:
  beq   S0, V1, L8010BC68
   sll   V0, S0, 1
  addu  V0, V0, S0
  sll   V0, V0, 2
  addu  V0, V0, S0
  sll   V0, V0, 2
  lui   AT, hi(p1_coins)
  addu  AT, AT, V0
  lh    V0, lo(p1_coins)(AT)
  bnez  V0, L8010BC78
   li    V0, 4
L8010BC68:
  addiu S0, S0, 1
  slti  V0, S0, 4
  bnez  V0, L8010BC3C
   li    V0, 4
L8010BC78:
  bne   S0, V0, L8010BC90
   li    V0, 8
  li    V0, 1
  sb    V0, 0x20(SP)
  j     L8010BC9C
   sb    R0, 0x60(SP)
L8010BC90:
  sb    V0, 0x20(SP)
  li    V0, 1
  sb    V0, 0x60(SP)
L8010BC9C:
  sb    R0, 0x21(SP)
  move  S0, R0
  lh    V1, 0x1e(S3)
L8010BCA8:
  beq   S0, V1, L8010BCD4
   sll   V0, S0, 1
  addu  V0, V0, S0
  sll   V0, V0, 2
  addu  V0, V0, S0
  sll   V0, V0, 2
  lui   AT, hi(p1_stars)
  addu  AT, AT, V0
  lh    V0, lo(p1_stars)(AT)
  bnez  V0, L8010BCE4
   li    V0, 4
L8010BCD4:
  addiu S0, S0, 1
  slti  V0, S0, 4
  bnez  V0, L8010BCA8
   li    V0, 4
L8010BCE4:
  beq   S0, V0, L8010BD38
   li    V0, 1
  lh    V0, 0x1e(S3)
  sll   V1, V0, 1
  addu  V1, V1, V0
  sll   V1, V1, 2
  addu  V1, V1, V0
  sll   V1, V1, 2
  lui   V0, hi(p1_coins)
  addu  V0, V0, V1
  lh    V0, lo(p1_coins)(V0)
  slti  V0, V0, 0x32
  bnez  V0, L8010BD38
   li    V0, 1
  lui   V0, hi(p1_stars)
  addu  V0, V0, V1
  lh    V0, lo(p1_stars)(V0)
  slti  V0, V0, 0x63
  bnez  V0, L8010BD44
   li    V0, 8
  li    V0, 1
L8010BD38:
  sb    V0, 0x30(SP)
  j     L8010BD50
   sb    R0, 0x61(SP)
L8010BD44:
  sb    V0, 0x30(SP)
  li    V0, 1
  sb    V0, 0x61(SP)
L8010BD50:
  sb    R0, 0x31(SP)
  li    V0, 1
  sb    V0, 0x63(SP)
  sb    V0, 0x62(SP)
  sw    R0, 0x10(SP)
  sw    R0, 0x14(SP)
  sw    R0, 0x18(SP)
  li    A0, 7
  li    A1, 1717
  addiu A2, SP, 0x20
  jal   func_80056368
   addiu A3, SP, 0x30
  jal   func_8010537C
   addiu A0, SP, 0x60
  move  S0, V0
  jal   func_80056144
   move  FP, S0
  jal   func_80056168
   sll   S0, S0, 0x10
  sra   S0, S0, 0x10
  li    V0, 2
  beq   S0, V0, L8010C32C
   slti  V0, S0, 3
  bnez  V0, L8010BDC4
   li    V0, 3
  beq   S0, V0, L8010C348
   li    V0, -1
  j     L8010C384
   sll   V0, FP, 0x10
L8010BDC4:
  bltz  S0, L8010C380
   move  S0, R0
  move  A0, R0
L8010BDD0:
  sll   V0, FP, 0x10
  sra   T1, V0, 0x10
  addiu A2, SP, 0x60
  addiu A1, SP, 0x20
  li    A3, 1
  li    T0, 8
  li    T2, 24
L8010BDEC:
  lh    V0, 0x1e(S3)
  beql  S0, V0, L8010BEB0
   addiu S0, S0, 1
  bnez  T1, L8010BE2C
   sll   V0, S0, 1
  addu  V0, V0, S0
  sll   V0, V0, 2
  addu  V0, V0, S0
  sll   V0, V0, 2
  lui   AT, hi(p1_coins)
  addu  AT, AT, V0
  lh    V0, lo(p1_coins)(AT)
  beqz  V0, L8010BE50
   addu  V0, A2, A0
  j     L8010BE68
   sb    A3, 0(V0)
L8010BE2C:
  addu  V0, V0, S0
  sll   V0, V0, 2
  addu  V0, V0, S0
  sll   V0, V0, 2
  lui   AT, hi(p1_stars)
  addu  AT, AT, V0
  lh    V0, lo(p1_stars)(AT)
  bnez  V0, L8010BE64
   addu  V0, A2, A0
L8010BE50:
  sb    R0, 0(V0)
  sll   V0, A0, 4
  addu  V0, A1, V0
  j     L8010BE74
   sb    A3, 0(V0)
L8010BE64:
  sb    A3, 0(V0)
L8010BE68:
  sll   V0, A0, 4
  addu  V0, A1, V0
  sb    T0, 0(V0)
L8010BE74:
  sll   V0, A0, 4
  addu  V0, A1, V0
  sb    T2, 1(V0)
  sll   V1, S0, 1
  addu  V1, V1, S0
  sll   V1, V1, 2
  addu  V1, V1, S0
  sll   V1, V1, 2
  lui   AT, hi(p1_char)
  addu  AT, AT, V1
  lbu   V1, lo(p1_char)(AT)
  sb    V1, 2(V0)
  sb    R0, 3(V0)
  addiu A0, A0, 1
  addiu S0, S0, 1
L8010BEB0:
  slti  V0, S0, 4
  bnez  V0, L8010BDEC
   li    S1, 1
  sb    S1, 0x63(SP)
  addiu V0, SP, 0x40
  sw    V0, 0x10(SP)
  sw    R0, 0x14(SP)
  sw    R0, 0x18(SP)
  li    A0, 7
  li    A1, 1720
  addiu A2, SP, 0x20
  jal   func_80056368
   addiu A3, SP, 0x30
  sll   A0, FP, 0x10
  sra   A0, A0, 0x10
  jal   func_80105630
   addiu A1, SP, 0x60
  move  S0, V0
  jal   func_80056144
   move  S5, S0
  jal   func_80056168
   sll   S0, S0, 0x10
  sra   S0, S0, 0x10
  li    V1, -1
  beq   S0, V1, L8010BC34
   li    V0, 3
  bnel  S0, V0, L8010BF54
   sll   V0, FP, 0x10
  bne   S7, V1, L8010BF44
   nop
  jal   func_80103AF4
   move  S0, R0
  lui   AT, hi(D_800F851A)
  jal   func_80078EC8
   sb    S1, lo(D_800F851A)(AT)
  j     L8010BDD0
   move  A0, R0
L8010BF44:
  jal   __PP64_INTERNAL_VIEW_MAP
   move  S0, R0
  j     L8010BDD0
   move  A0, R0
L8010BF54:
  bnez  V0, L8010BF74
   nop
  lh    A0, 0x1e(S3)
  jal   func_8004CA34
   li    A1, -5
  lh    A0, 0x1e(S3)
  j     L8010BF88
   li    A1, -5
L8010BF74:
  lh    A0, 0x1e(S3)
  jal   func_8004CA34
   li    A1, -50
  lh    A0, 0x1e(S3)
  li    A1, -50
L8010BF88:
  jal   func_800614B4
   nop
  jal   func_8007D9E0
   li    A0, 30
  jal   func_8010A1DC
   move  A0, S2
  sll   V0, FP, 0x10
  bnez  V0, L8010C2B8
   nop
  lh    V1, 0x1e(S3)
  lui   S4, hi(D_80112330)
  addiu S4, S4, lo(D_80112330)
  sll   V0, V1, 1
  addu  V0, V0, V1
  addu  V0, V0, S4
  sll   V1, S5, 0x10
  sra   S0, V1, 0x10
  addu  V0, V0, S0
  jal   func_8010AB7C
   lbu   A0, 0(V0)
  move  S1, V0
  jal   func_8010A13C
   move  A0, S2
  li    V0, -1
  bnel  S1, V0, L8010C054
   move  S0, R0
  lh    V1, 0x1e(S3)
  sll   V0, V1, 1
  addu  V0, V0, V1
  addu  V0, V0, S4
  addu  V0, V0, S0
  lbu   V1, 0(V0)
  sll   V0, V1, 1
  addu  V0, V0, V1
  sll   V0, V0, 2
  addu  V0, V0, V1
  sll   V0, V0, 2
  lui   S1, hi(p1_coins)
  addu  S1, S1, V0
  lh    S1, lo(p1_coins)(S1)
  addiu A0, SP, 0x20
  lui   A1, hi(D_801135C8)
  addiu A1, A1, lo(D_801135C8)
  jal   func_800A5660
   move  A2, S1
  sw    R0, 0x10(SP)
  sw    R0, 0x14(SP)
  sw    R0, 0x18(SP)
  li    A0, 7
  j     L8010C118
   li    A1, 1727
L8010C054:
  lh    A0, 8(S3)
  sll   V0, S0, 2
L8010C05C:
  addu  V1, V0, S0
  lui   V0, hi(D_801123D4)
  addu  V0, V0, V1
  lbu   V0, lo(D_801123D4)(V0)
  slt   V0, A0, V0
  bnel  V0, R0, L8010C0C4
   addiu S0, S0, 1
  lui   V0, hi(D_801123D5)
  addu  V0, V0, V1
  lbu   V0, lo(D_801123D5)(V0)
  slt   V0, V0, A0
  bnel  V0, R0, L8010C0C4
   addiu S0, S0, 1
  lui   V0, hi(D_801123D6)
  addu  V0, V0, V1
  lbu   V0, lo(D_801123D6)(V0)
  slt   V0, S1, V0
  bnel  V0, R0, L8010C0C4
   addiu S0, S0, 1
  lui   V0, hi(D_801123D7)
  addu  V0, V0, V1
  lbu   V0, lo(D_801123D7)(V0)
  slt   V0, V0, S1
  beql  V0, R0, L8010C0D4
   addiu A0, SP, 0x20
  addiu S0, S0, 1
L8010C0C4:
  sltiu V0, S0, 0x18
  bnez  V0, L8010C05C
   sll   V0, S0, 2
  addiu A0, SP, 0x20
L8010C0D4:
  lui   A1, hi(D_801135C8)
  addiu A1, A1, lo(D_801135C8)
  jal   func_800A5660
   move  A2, S1
  sll   V0, S0, 2
  addu  V0, V0, S0
  lui   AT, hi(D_801123D8)
  addu  AT, AT, V0
  lbu   V0, lo(D_801123D8)(AT)
  sll   V0, V0, 1
  lui   A1, hi(D_8011243E)
  addu  A1, A1, V0
  lh    A1, lo(D_8011243E)(A1)
  sw    R0, 0x10(SP)
  sw    R0, 0x14(SP)
  sw    R0, 0x18(SP)
  li    A0, 7
L8010C118:
  addiu A2, SP, 0x20
  jal   func_80056368
   move  A3, R0
  jal   func_80056144
   nop
  jal   func_80056168
   nop
  mtc1  S1, F24
  nop
  cvt.s.w F24, F24
  li    AT, 0x42B40000 ;90.000000
  mtc1  AT, F0
  nop
  div.s F24, F24, F0
  mtc1  R0, F20
  li    A0, 24
  jal   func_80043510
   move  A1, R0
  lui   AT, hi(D_801138BC)
  sw    V0, lo(D_801138BC)(AT)
  jal   func_80043DAC
   move  A0, V0
  lui   A0, hi(D_801138BC)
  jal   func_800442DC
   lw    A0, lo(D_801138BC)(A0)
  lh    V1, 0x1e(S3)
  lui   A0, hi(D_80112330)
  addiu A0, A0, lo(D_80112330)
  sll   V0, V1, 1
  addu  V0, V0, V1
  addu  V0, V0, A0
  sll   V1, S5, 0x10
  sra   V1, V1, 0x10
  addu  V0, V0, V1
  lbu   A0, 0(V0)
  li    A1, 3
  jal   func_800672BC
   li    A2, 5
  beqz  S1, L8010C234
   move  S4, V0
  li    AT, 0x3F800000 ;1.000000
  mtc1  AT, F22
  lui   S6, hi(D_80112330)
  addiu S6, S6, lo(D_80112330)
  sll   V0, S5, 0x10
  sra   S0, V0, 0x10
  add.s F20, F20, F24
L8010C1D4:
  c.le.s F22, F20
  nop
  bc1f  L8010C224
   nop
  sub.s F20, F20, F22
  jal   func_8010BA0C
   move  A0, S2
  lh    A0, 0x1e(S3)
  jal   func_800614B4
   li    A1, 1
  lh    V1, 0x1e(S3)
  sll   V0, V1, 1
  addu  V0, V0, V1
  addu  V0, V0, S6
  addu  V0, V0, S0
  lbu   A0, 0(V0)
  li    A1, -1
  jal   func_8006135C
   move  A2, R0
  addiu S1, S1, -1
L8010C224:
  jal   func_8007DA44
   nop
  bnel  S1, R0, L8010C1D4
   add.s F20, F20, F24
L8010C234:
  jal   func_8006735C
   move  A0, S4
  jal   func_8007D9E0
   li    A0, 20
  lui   A0, hi(D_801138BC)
  jal   func_8004430C
   lw    A0, lo(D_801138BC)(A0)
  jal   func_8005DC3C
   li    A0, -1
  lw    A0, 0x24(V0)
  jal   func_8005670C
   addiu A0, A0, 0x18
  li    A0, -1
  li    A1, 5
  jal   func_8005DD68
   move  A2, R0
  jal   func_8007D9E0
   li    A0, 5
  lh    V1, 0x1e(S3)
  sll   V0, V1, 1
  addu  V0, V0, V1
  sll   V0, V0, 2
  addu  V0, V0, V1
  sll   V0, V0, 2
  lui   A1, hi(p1_char)
  addu  A1, A1, V0
  lbu   A1, lo(p1_char)(A1)
  jal   func_80079718
   li    A0, 259
  jal   func_8007D9E0
   li    A0, 45
  j     L8010C30C
   li    V0, -1
L8010C2B8:
  lh    V1, 0x1e(S3)
  lui   A0, hi(D_80112330)
  addiu A0, A0, lo(D_80112330)
  sll   V0, V1, 1
  addu  V0, V0, V1
  addu  V0, V0, A0
  sll   V1, S5, 0x10
  sra   V1, V1, 0x10
  addu  V0, V0, V1
  jal   func_8010A27C
   lbu   A0, 0(V0)
  jal   func_8010A13C
   move  A0, S2
  li    V0, 1
  lui   AT, hi(D_801119D0)
  sw    V0, lo(D_801119D0)(AT)
  jal   func_80103968
   move  A0, S2
  lui   AT, hi(D_801119D0)
  sw    R0, lo(D_801119D0)(AT)
  li    V0, -1
L8010C30C:
  bne   S7, V0, L8010C384
   sll   V0, FP, 0x10
  li    A0, -1
  li    A1, -1
  jal   func_8005DD68
   li    A2, 2
  j     L8010C384
   sll   V0, FP, 0x10
L8010C32C:
  jal   func_8010A1DC
   move  A0, S2
  li    A0, 7
  jal   func_8005600C
   li    A1, 1719
  j     L8010C384
   sll   V0, FP, 0x10
L8010C348:
  bne   S7, V0, L8010C370
   nop
  jal   func_80103AF4
   move  S0, R0
  li    V0, 1
  lui   AT, hi(D_800F851A)
  jal   func_80078EC8
   sb    V0, lo(D_800F851A)(AT)
  j     L8010BC38
   nop
L8010C370:
  jal   __PP64_INTERNAL_VIEW_MAP
   move  S0, R0
  j     L8010BC38
   nop
L8010C380:
  sll   V0, FP, 0x10
L8010C384:
  sra   V0, V0, 0x10
  li    V1, 2
  beq   V0, V1, L8010C39C
   nop
  jal   func_8010A1DC
   move  A0, S2
L8010C39C:
  jal   func_8005670C
   addiu A0, S2, 0x18
  li    V0, -1
  bne   S7, V0, L8010C3B8
   nop
  jal   func_8004430C
   move  A0, S2
L8010C3B8:
  lw    T3, 0x6c(SP)
  beqz  T3, L8010C3D4
   li    V0, -1
  lh    A0, 0x1e(S3)
  jal   func_8004655C
   nop
  li    V0, -1
L8010C3D4:
  beq   S7, V0, L8010C410
   nop
  jal   func_8007D838
   nop
  li    AT, 0x3FA60000 ;1.296875
  ori AT, AT, 0x6666
  mtc1  AT, F12
  nop
  jal   func_80052F70
   move  S0, V0
  move  A0, S0
  jal   func_8007D700
   move  A1, V0
  jal   func_8007D7E8
   nop
L8010C410:
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

; Gate event
func_8010C44C:
  addiu SP, SP, -0x18
  sw    RA, 0x10(SP)
  jal   func_80106618
   move  A0, R0
  lw    RA, 0x10(SP)
  jr    RA
   addiu SP, SP, 0x18

; Gate event
func_8010C468:
/*  */  addiu SP, SP, -0x18
  sw    RA, 0x10(SP)
  jal   func_80106618
   li    A0, 1
  lw    RA, 0x10(SP)
  jr    RA
   addiu SP, SP, 0x18

func_8010C484:
  addiu SP, SP, -0x40
  sw    RA, 0x2c(SP)
  sw    S4, 0x28(SP)
  sw    S3, 0x24(SP)
  sw    S2, 0x20(SP)
  sw    S1, 0x1c(SP)
  sw    S0, 0x18(SP)
  sdc1  F22, 0x38(SP)
  sdc1  F20, 0x30(SP)
  move  S2, A0
  mtc1  A1, F20
  mtc1  A2, F22
  lw    S0, 0x50(SP)
  move  S4, A3
  lui   V0, hi(func_8010C5C4)
  addiu V0, V0, lo(func_8010C5C4)
  sw    V0, 0x10(SP)
  li    A0, 500
  move  A1, R0
  move  A2, R0
  jal   func_80076598
   li    A3, -1
  move  S3, V0
  li    A0, 32
  jal   func_80027154
   li    A1, 31000
  move  S1, V0
  sw    S1, 0x50(S3)
  li    AT, 0x437F0000 ;255.000000
  mtc1  AT, F0
  nop
  swc1  F0, 0xc(S1)
  swc1  F20, 0x10(S1)
  swc1  F22, 0x14(S1)
  move  A0, S1
  jal   func_800B3170
   move  A1, S0
  sw    R0, 0x10(SP)
  lui A0, 0xa
  ori A0, A0, 0x15c
  move  A1, R0
  lui   A2, 0x3f80
  jal   func_800437F8
   move  A3, R0
  move  S0, V0
  lw    V0, 0x3c(S0)
  lw    V0, 0x40(V0)
  lh    A0, 0(V0)
  move  A1, R0
  move  A2, A1
  jal   func_800297E8
   move  A3, A1
  lwc1  F0, 0(S2)
  swc1  F0, 0xc(S0)
  lwc1  F0, 4(S2)
  swc1  F0, 0x10(S0)
  lwc1  F0, 8(S2)
  swc1  F0, 0x14(S0)
  lw    V0, 0x3c(S0)
  lw    V0, 0x40(V0)
  jal   func_8002D124
   lh    A0, 0(V0)
  lw    V0, 0x3c(S0)
  lw    V0, 0x40(V0)
  lh    A0, 0(V0)
  jal   func_8002D0A0
   li    A1, 255
  sw    S0, 0x18(S1)
  sh    S4, 0x1c(S1)
  move  V0, S3
  lw    RA, 0x2c(SP)
  lw    S4, 0x28(SP)
  lw    S3, 0x24(SP)
  lw    S2, 0x20(SP)
  lw    S1, 0x1c(SP)
  lw    S0, 0x18(SP)
  ldc1  F22, 0x38(SP)
  ldc1  F20, 0x30(SP)
  jr    RA
   addiu SP, SP, 0x40

func_8010C5C4:
  addiu SP, SP, -0x20
  sw    RA, 0x1c(SP)
  sw    S2, 0x18(SP)
  sw    S1, 0x14(SP)
  sw    S0, 0x10(SP)
  move  S2, A0
  lw    S0, 0x50(S2)
  lw    S1, 0x18(S0)
  addiu A1, S1, 0xc
  move  A0, A1
  jal   func_800B31C0
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
  nop
  c.lt.s F0, F2
  nop
  nop
  bc1f  L8010C668
   swc1  F0, 0xc(S0)
  swc1  F2, 0xc(S0)
  lhu   V0, 0x1c(S0)
  beqz  V0, L8010C660
   move  A0, S2
  lw    A0, 0x18(S0)
  jal   func_8004430C
   nop
  jal   func_8007695C
   move  A0, S2
  j     L8010C6C4
   nop
L8010C660:
  jal   func_80076AFC
   li    A1, 8
L8010C668:
  lw    V0, 0x3c(S1)
  lw    V0, 0x40(V0)
  lh    A0, 0(V0)
  lwc1  F2, 0xc(S0)
  li    AT, 0x4F000000 ;2147483648.000000
  mtc1  AT, F0
  nop
  c.le.s F0, F2
  nop
  nop
  bc1tl L8010C6A8
   sub.s F0, F2, F0
  trunc.w.s F0, F2
  mfc1  A1, F0
  j     L8010C6BC
   nop
L8010C6A8:
  lui   V0, 0x8000
  trunc.w.s F2, F0
  mfc1  A1, F2
  nop
  or    A1, A1, V0
L8010C6BC:
  jal   func_8002D0A0
   andi  A1, A1, 0xff
L8010C6C4:
  lw    RA, 0x1c(SP)
  lw    S2, 0x18(SP)
  lw    S1, 0x14(SP)
  lw    S0, 0x10(SP)
  jr    RA
   addiu SP, SP, 0x20

func_8010C6DC:
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
  lui   S7, hi(D_800F93A8)
  addiu S7, S7, lo(D_800F93A8)
  jal   func_8005DC3C
   li    A0, -1
  jal   func_8010D37C
   move  S3, V0
  li    A0, 113
  jal   func_80043510
   move  A1, R0
  move  S1, V0
  lw    V0, 0x3c(S1)
  lw    V0, 0x40(V0)
  lh    A0, 0(V0)
  move  A1, R0
  move  A2, A1
  jal   func_800297E8
   move  A3, A1
  lw    A1, 0x24(S3)
  addiu A0, S1, 0xc
  jal   func_800B3170
   addiu A1, A1, 0xc
  li    AT, 0x42C80000 ;100.000000
  mtc1  AT, F0
  nop
  swc1  F0, 0x10(S1)
  li    AT, 0x3F800000 ;1.000000
  mtc1  AT, F22
  li    AT, 0x41F00000 ;30.000000
  mtc1  AT, F20
  lwc1  F0, 0x10(S1)
  sub.s F0, F0, F22
L8010C788:
  jal   func_8007DA44
   swc1  F0, 0x10(S1)
  lwc1  F0, 0x10(S1)
  c.lt.s F20, F0
  nop
  nop
  bc1tl L8010C788
   sub.s F0, F0, F22
  jal   func_8007959C
   li    A0, 870
  lui   A0, hi(D_800FA188)
  lh    A0, lo(D_800FA188)(A0)
  jal   func_800114E8
   li    A1, 180
  li    A0, -1
  li    A1, 3
  jal   func_800672BC
   li    A2, 5
  move  S5, V0
  li    S2, 180
  move  S0, R0
  lui   S6, hi(D_80113658)
  addiu S6, S6, lo(D_80113658)
  li    AT, 0x41F00000 ;30.000000
  mtc1  AT, F22
  li    AT, 0x41700000 ;15.000000
  mtc1  AT, F20
  addiu S4, SP, 0x28
L8010C7F8:
  addiu A3, SP, 0x28
  lui   A2, hi(D_801135F8)
  addiu A2, A2, lo(D_801135F8)
L8010C804:
  lw    V0, 0(A2)
  lw    V1, 4(A2)
  lw    A0, 8(A2)
  lw    A1, 0xc(A2)
  sw    V0, 0(A3)
  sw    V1, 4(A3)
  sw    A0, 8(A3)
  sw    A1, 0xc(A3)
  addiu A2, A2, 0x10
  bne   A2, S6, L8010C804
   addiu A3, A3, 0x10
  mtc1  S2, F12
  nop
  jal   func_800B83C0
   cvt.s.w F12, F12
  add.s F0, F0, F0
  add.s F0, F0, F22
  andi  V0, S0, 1
  beqz  V0, L8010C8BC
   swc1  F0, 0x10(S1)
  lw    A1, 0xc(S1)
  mfc1  A2, F0
  lw    A3, 0x14(S1)
  jal   func_800B3160
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
  addiu A0, SP, 0x18
  lui A1, 0x3dcc
  ori A1, A1, 0xcccd
  lui   A2, 0x4000
  jal   func_8010C484
   li    A3, 1
L8010C8BC:
  jal   func_8007DA44
   addiu S2, S2, 0x14
  slti  V0, S2, 0x438
  bnez  V0, L8010C7F8
   addiu S0, S0, 1
  jal   func_8006735C
   move  A0, S5
  li    A0, 255
  li    A1, 255
  jal   func_8008F624
   li    A2, 255
  lh    V0, 0xa(S7)
  sll   V0, V0, 1
  addu  V0, V0, S7
  lh    V0, 0xc(V0)
  sll   V0, V0, 1
  lui   A0, hi(D_80111984)
  addu  A0, A0, V0
  lh    A0, lo(D_80111984)(A0)
  addiu A1, SP, 0x88
  jal   func_80054C78
   addiu A2, SP, 0x8a
  lhu   V1, 0x88(SP)
  sh    V1, 0x10(S3)
  lhu   V0, 0x8a(SP)
  sh    V0, 0x12(S3)
  sh    V1, 0x14(S3)
  addiu V0, V0, 1
  jal   func_800650BC
   sh    V0, 0x16(S3)
  jal   func_80078FF8
   nop
  lui   S4, hi(D_80113658)
  addiu S4, S4, lo(D_80113658)
  li    AT, 0x41F00000 ;30.000000
  mtc1  AT, F22
  li    AT, 0x41700000 ;15.000000
  mtc1  AT, F20
  addiu S3, SP, 0x90
  addiu A3, SP, 0x90
L8010C95C:
  lui   A2, hi(D_801135F8)
  addiu A2, A2, lo(D_801135F8)
L8010C964:
  lw    V0, 0(A2)
  lw    V1, 4(A2)
  lw    A0, 8(A2)
  lw    A1, 0xc(A2)
  sw    V0, 0(A3)
  sw    V1, 4(A3)
  sw    A0, 8(A3)
  sw    A1, 0xc(A3)
  addiu A2, A2, 0x10
  bne   A2, S4, L8010C964
   addiu A3, A3, 0x10
  mtc1  S2, F12
  nop
  jal   func_800B83C0
   cvt.s.w F12, F12
  add.s F0, F0, F0
  add.s F0, F0, F22
  andi  V0, S0, 1
  beqz  V0, L8010CA1C
   swc1  F0, 0x10(S1)
  lw    A1, 0xc(S1)
  mfc1  A2, F0
  lw    A3, 0x14(S1)
  jal   func_800B3160
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
  addiu A0, SP, 0x18
  lui   A1, 0x3dcc
  ori   A1, A1, 0xcccd
  lui   A2, 0x4000
  jal   func_8010C484
   li    A3, 1
L8010CA1C:
  jal   func_8007DA44
   addiu S0, S0, 1
  addiu S2, S2, 0x14
  li    V0, 1280
  bnel  S2, V0, L8010C95C
   addiu A3, SP, 0x90
  jal   func_800115B4
   move  A0, R0
  j     L8010C95C
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

func_8010CA78:
  addiu SP, SP, -0x18
  sw    RA, 0x10(SP)
  li    V0, 1
  lui   AT, hi(D_800CCC16)
  sb    V0, lo(D_800CCC16)(AT)
  lui   V0, hi(D_800F93B2)
  lh    V0, lo(D_800F93B2)(V0)
  sll   V0, V0, 1
  lui   AT, hi(D_800F93B4)
  addu  AT, AT, V0
  lh    V0, lo(D_800F93B4)(AT)
  sll   V0, V0, 1
  lui   A0, hi(D_80111984)
  addu  A0, A0, V0
  lh    A0, lo(D_80111984)(A0)
  jal   func_800556F4
   li    A1, 1
  lui   AT, hi(D_800CCC16)
  jal   func_800670B0
   sb    R0, lo(D_800CCC16)(AT)
  sll   V0, V0, 0x10
  bltz  V0, L8010CADC
   nop
  jal   func_8007D9E0
   li    A0, -1
L8010CADC:
  lw    RA, 0x10(SP)
  jr    RA
   addiu SP, SP, 0x18

func_8010CAE8:
  addiu SP, SP, -0x28
  sw    RA, 0x20(SP)
  sw    S1, 0x1c(SP)
  sw    S0, 0x18(SP)
  lui   S1, hi(D_800F93C6)
  lh    S1, lo(D_800F93C6)(S1)
  jal   func_8005DC3C
   li    A0, -1
  jal   func_8010D37C
   move  S0, V0
  jal   func_80047A50
   move  A0, S1
  jal   func_8006836C
   li    A0, 4
  jal   func_80046F98
   move  A0, S1
  jal   func_80078FF8
   nop
  jal   func_80064FF8
   nop
  jal   func_8007D9E0
   li    A0, 5
  li    A0, -1
  jal   func_80067170
   li    A1, 3
  jal   func_8007D9E0
   li    A0, 25
  move  A0, S1
  li    A1, 2
  jal   func_8005DD68
   move  A2, R0
  sll   V0, S1, 1
  addu  V0, V0, S1
  sll   V0, V0, 2
  addu  V0, V0, S1
  sll   V0, V0, 2
  lui   A0, hi(D_800FD2E4)
  addu  A0, A0, V0
  lw    A0, lo(D_800FD2E4)(A0)
  lui   A1, 0x4000
  lui A2, 0xbe99
  jal   func_80059120
   ori A2, A2, 0x999a
  jal   func_8007D9E0
   li    A0, 5
  jal   func_80047BB8
   move  A0, S1
  li    V0, 2
  sw    V0, 0x10(SP)
  move  A0, S1
  li    A1, -1
  move  A2, R0
  jal   func_8005DDEC
   li    A3, 10
  jal   func_8007D9E0
   li    A0, 20
  jal   func_80053F7C
   nop
  jal   func_8004CDE0
   nop
  jal   func_8004CE80
   nop
  jal   func_8004D5B0
   nop
  jal   func_80053F54
   nop
  jal   func_800683BC
   li    A0, 4
  jal   func_80046F98
   move  A0, S1
  sll   V0, V0, 0x10
  jal   func_80079848
   sra   A0, V0, 0x10
  jal   func_80046EDC
   move  A0, S1
  jal   func_80060210
   li    A0, 25
L8010CC1C:
  jal   func_800609D8
   nop
  beqz  V0, L8010CC3C
   nop
  jal   func_8007DA44
   nop
  j     L8010CC1C
   nop
L8010CC3C:
  jal   func_80062824
   move  A0, R0
  jal   func_80060210
   li    A0, 26
L8010CC4C:
  jal   func_800609D8
   nop
  beqz  V0, L8010CC6C
   move  A0, S1
  jal   func_8007DA44
   nop
  j     L8010CC4C
   nop
L8010CC6C:
  jal   func_80047D78
   li    A1, -1
  lhu   A0, 0x10(S0)
  jal   func_80054BB0
   lhu   A1, 0x12(S0)
  sll   S0, V0, 0x10
  sra   S0, S0, 0x10
  jal   func_800558E8
   move  A0, S0
  move  A0, S0
  jal   func_800556F4
   li    A1, 1
  jal   func_800670B0
   nop
  sll   V0, V0, 0x10
  bltz  V0, L8010CCB8
   nop
  jal   func_8007D9E0
   li    A0, -1
L8010CCB8:
  jal   func_80045650
   move  A0, S1
  lw    RA, 0x20(SP)
  lw    S1, 0x1c(SP)
  lw    S0, 0x18(SP)
  jr    RA
   addiu SP, SP, 0x28

func_8010CCD4:
  addiu SP, SP, -0x38
  sw    RA, 0x24(SP)
  sw    S2, 0x20(SP)
  sw    S1, 0x1c(SP)
  sw    S0, 0x18(SP)
  sdc1  F22, 0x30(SP)
  sdc1  F20, 0x28(SP)
  jal   func_8007D838
   li    S1, 1
  lw    S0, 0x8c(V0)
  lh    V0, 4(S0)
  lh    V1, 0(S0)
  subu  V0, V0, V1
  mtc1  V0, F22
  nop
  cvt.s.w F22, F22
  lh    V0, 8(S0)
  mtc1  V0, F0
  nop
  cvt.s.w F0, F0
  div.s F22, F22, F0
  lh    V0, 6(S0)
  lh    V1, 2(S0)
  subu  V0, V0, V1
  mtc1  V0, F20
  nop
  cvt.s.w F20, F20
  div.s F20, F20, F0
  lui   A0, hi(D_800F93C6)
  lh    A0, lo(D_800F93C6)(A0)
  addiu A1, SP, 0x10
  jal   func_8006296C
   addiu A2, SP, 0x14
  lh    V0, 8(S0)
  blez  V0, L8010CE4C
   nop
  li    S2, -1
L8010CD68:
  lh    A0, 0xa(S0)
  beq   A0, S2, L8010CDDC
   move  A1, R0
  lh    V0, 0(S0)
  mtc1  V0, F2
  nop
  cvt.s.w F2, F2
  mtc1  S1, F4
  nop
  cvt.s.w F4, F4
  mul.s F0, F22, F4
  add.s F2, F2, F0
  trunc.w.s F0, F2
  mfc1  A2, F0
  nop
  sll   A2, A2, 0x10
  lh    V0, 2(S0)
  mtc1  V0, F0
  nop
  cvt.s.w F0, F0
  mul.s F4, F20, F4
  add.s F0, F0, F4
  trunc.w.s F2, F0
  mfc1  A3, F2
  nop
  sll   A3, A3, 0x10
  sra   A2, A2, 0x10
  jal   func_80081AD0
   sra   A3, A3, 0x10
L8010CDDC:
  mtc1  S1, F4
  nop
  cvt.s.w F4, F4
  mul.s F0, F22, F4
  lwc1  F2, 0x10(SP)
  add.s F0, F0, F2
  trunc.w.s F2, F0
  mfc1  A1, F2
  nop
  sll   A1, A1, 0x10
  mul.s F4, F20, F4
  lwc1  F0, 0x14(SP)
  add.s F4, F4, F0
  trunc.w.s F0, F4
  mfc1  A2, F0
  nop
  sll   A2, A2, 0x10
  lui   A0, hi(D_800F93C6)
  lh    A0, lo(D_800F93C6)(A0)
  sra   A1, A1, 0x10
  jal   func_800629AC
   sra   A2, A2, 0x10
  jal   func_8007DA44
   addiu S1, S1, 1
  lh    V0, 8(S0)
  slt   V0, V0, S1
  beqz  V0, L8010CD68
   nop
L8010CE4C:
  lh    A0, 0xa(S0)
  li    V0, -1
  beq   A0, V0, L8010CE6C
   nop
  lh    A2, 4(S0)
  lh    A3, 6(S0)
  jal   func_80081AD0
   move  A1, R0
L8010CE6C:
  lh    V0, 4(S0)
  mtc1  V0, F0
  nop
  cvt.s.w F0, F0
  lwc1  F2, 0x10(SP)
  add.s F0, F0, F2
  lh    V0, 0(S0)
  mtc1  V0, F2
  nop
  cvt.s.w F2, F2
  sub.s F0, F0, F2
  trunc.w.s F2, F0
  mfc1  A1, F2
  nop
  sll   A1, A1, 0x10
  lh    V0, 6(S0)
  mtc1  V0, F0
  nop
  cvt.s.w F0, F0
  lwc1  F2, 0x14(SP)
  add.s F0, F0, F2
  lh    V0, 2(S0)
  mtc1  V0, F2
  nop
  cvt.s.w F2, F2
  sub.s F0, F0, F2
  trunc.w.s F2, F0
  mfc1  A2, F2
  nop
  sll   A2, A2, 0x10
  lui   A0, hi(D_800F93C6)
  lh    A0, lo(D_800F93C6)(A0)
  sra   A1, A1, 0x10
  jal   func_800629AC
   sra   A2, A2, 0x10
  jal   func_80076FCC
   move  A0, R0
  lw    RA, 0x24(SP)
  lw    S2, 0x20(SP)
  lw    S1, 0x1c(SP)
  lw    S0, 0x18(SP)
  ldc1  F22, 0x30(SP)
  ldc1  F20, 0x28(SP)
  jr    RA
   addiu SP, SP, 0x38

func_8010CF20:
  addiu SP, SP, -0x30
  sw    RA, 0x2c(SP)
  sw    S6, 0x28(SP)
  sw    S5, 0x24(SP)
  sw    S4, 0x20(SP)
  sw    S3, 0x1c(SP)
  sw    S2, 0x18(SP)
  sw    S1, 0x14(SP)
  sw    S0, 0x10(SP)
  move  S6, A0
  move  S1, A1
  move  S2, A2
  move  S3, A3
  lhu   S4, 0x42(SP)
  lhu   S5, 0x46(SP)
  lui   A0, hi(func_8010CCD4)
  addiu A0, A0, lo(func_8010CCD4)
  li    A1, 16385
  move  A2, R0
  jal   InitProcess
   li    A3, 64
  move  S0, V0
  lw    A0, 0x18(S0)
  jal   func_80068480
   li    A1, 16
  sw    V0, 0x8c(S0)
  sh    S1, 0(V0)
  sh    S2, 2(V0)
  sh    S3, 4(V0)
  sh    S4, 6(V0)
  sh    S5, 8(V0)
  sh    S6, 0xa(V0)
  move  V0, S0
  lw    RA, 0x2c(SP)
  lw    S6, 0x28(SP)
  lw    S5, 0x24(SP)
  lw    S4, 0x20(SP)
  lw    S3, 0x1c(SP)
  lw    S2, 0x18(SP)
  lw    S1, 0x14(SP)
  lw    S0, 0x10(SP)
  jr    RA
   addiu SP, SP, 0x30

func_8010CFCC:
  addiu SP, SP, -0x30
  sw    RA, 0x2c(SP)
  sw    S4, 0x28(SP)
  sw    S3, 0x24(SP)
  sw    S2, 0x20(SP)
  sw    S1, 0x1c(SP)
  sw    S0, 0x18(SP)
  lui   S2, hi(D_800F93A8)
  addiu S2, S2, lo(D_800F93A8)
  li    A0, 1
  jal   func_8007FA6C
   li    A1, 5
  move  S3, V0
  lui   V1, hi(D_800F93C6)
  lh    V1, lo(D_800F93C6)(V1)
  sll   V0, V1, 1
  addu  V0, V0, V1
  sll   V0, V0, 2
  addu  V0, V0, V1
  sll   V0, V0, 2
  lui   AT, hi(p1_char)
  addu  AT, AT, V0
  lbu   V0, lo(p1_char)(AT)
  sll   V0, V0, 2
  lui   A0, hi(D_8011237C)
  addu  A0, A0, V0
  jal   func_80017680
   lw    A0, lo(D_8011237C)(A0)
  move  S0, V0
  jal   func_80082800
   move  A0, S0
  move  S4, V0
  jal   func_80017800
   move  A0, S0
  sll   V0, S3, 0x10
  sra   S0, V0, 0x10
  sll   A2, S4, 0x10
  move  A0, S0
  move  A1, R0
  sra   A2, A2, 0x10
  jal   func_8008218C
   move  A3, R0
  move  A0, S0
  move  A1, R0
  jal   func_80082384
   li    A2, 10
  move  A0, S0
  move  A1, R0
  jal   func_8008225C
   li    A2, 1
  lui   V0, hi(D_800F93C6)
  lhu   V0, lo(D_800F93C6)(V0)
  andi  V0, V0, 1
  beqz  V0, L8010D0B4
   move  A0, S0
  move  A1, R0
  j     L8010D0C4
   li    A2, 4097
L8010D0B4:
  sll   A0, S3, 0x10
  sra   A0, A0, 0x10
  move  A1, R0
  li    A2, 4096
L8010D0C4:
  jal   func_80082418
   sll   S0, S3, 0x10
  sra   S0, S0, 0x10
  lh    V0, 0x1e(S2)
  sll   V0, V0, 3
  lui   AT, hi(D_80112504)
  addu  AT, AT, V0
  lwc1  F0, lo(D_80112504)(AT)
  trunc.w.s F2, F0
  mfc1  A2, F2
  nop
  sll   A2, A2, 0x10
  lui   AT, hi(D_80112508)
  addu  AT, AT, V0
  lwc1  F0, lo(D_80112508)(AT)
  trunc.w.s F2, F0
  mfc1  A3, F2
  nop
  sll   A3, A3, 0x10
  move  A0, S0
  move  A1, R0
  sra   A2, A2, 0x10
  jal   func_80081AD0
   sra   A3, A3, 0x10
  move  A0, S0
  move  A1, R0
  jal   func_80082488
   move  A2, R0
  move  S0, R0
  sll   S1, S3, 0x10
  sll   A2, S0, 4
L8010D140:
  sra   A0, S1, 0x10
  move  A1, R0
  jal   func_80082488
   andi  A2, A2, 0xffff
  jal   func_8007DA44
   addiu S0, S0, 1
  slti  V0, S0, 0x11
  bnel  V0, R0, L8010D140
   sll   A2, S0, 4
  sll   S0, S3, 0x10
  sra   S0, S0, 0x10
  move  A0, S0
  move  A1, R0
  jal   func_80082488
   li    A2, 255
  move  A0, S0
  move  A1, R0
  li    A2, 1
  jal   func_800822A8
   move  A3, R0
  move  A0, S0
  move  A1, R0
  jal   func_8008225C
   li    A2, 1
  jal   func_8007D9E0
   li    A0, 20
  jal   func_8007959C
   li    A0, 885
  jal   func_8007D838
   nop
  move  S1, V0
  lh    V0, 0x1e(S2)
  sll   V0, V0, 3
  lui   AT, hi(D_80112504)
  addu  AT, AT, V0
  lwc1  F0, lo(D_80112504)(AT)
  trunc.w.s F2, F0
  mfc1  A1, F2
  nop
  sll   A1, A1, 0x10
  lui   AT, hi(D_80112508)
  addu  AT, AT, V0
  lwc1  F0, lo(D_80112508)(AT)
  trunc.w.s F2, F0
  mfc1  A2, F2
  nop
  sll   A2, A2, 0x10
  lui   AT, hi(D_80112524)
  addu  AT, AT, V0
  lwc1  F0, lo(D_80112524)(AT)
  trunc.w.s F2, F0
  mfc1  A3, F2
  nop
  sll   A3, A3, 0x10
  lui   AT, hi(D_80112528)
  addu  AT, AT, V0
  lwc1  F0, lo(D_80112528)(AT)
  trunc.w.s F2, F0
  mfc1  V0, F2
  nop
  sll   V0, V0, 0x10
  sra   V0, V0, 0x10
  sw    V0, 0x10(SP)
  li    V0, 30
  sw    V0, 0x14(SP)
  move  A0, S0
  sra   A1, A1, 0x10
  sra   A2, A2, 0x10
  jal   func_8010CF20
   sra   A3, A3, 0x10
  move  A0, S1
  jal   func_8007D700
   move  A1, V0
  jal   func_8007D7E8
   li    S1, 255
  jal   func_8007D9E0
   li    A0, 10
  move  A0, S0
  move  A1, R0
  move  A2, R0
  jal   func_800822A8
   move  A3, R0
  move  A0, S0
  move  A1, R0
  jal   func_8008225C
   li    A2, 1
  li    S0, 1
  sll   A1, S0, 1
L8010D2A0:
  addu  A1, A1, S0
  sll   A1, A1, 3
  addu  A1, A1, S0
  subu  A1, S1, A1
  sll   A1, A1, 0x10
  lh    A0, 0x1e(S2)
  jal   func_800629F0
   sra   A1, A1, 0x10
  lh    A0, 0x1e(S2)
  lui   A2, 0x4000
  jal   func_800628C0
   move  A1, R0
  jal   func_8007DA44
   addiu S0, S0, 1
  slti  V0, S0, 0xa
  bnez  V0, L8010D2A0
   sll   A1, S0, 1
  lh    A0, 0x1e(S2)
  jal   func_800629F0
   move  A1, R0
  li    A0, -1
  li    A1, 5
  jal   func_8005DD68
   move  A2, R0
  lh    V1, 0x1e(S2)
  sll   V0, V1, 1
  addu  V0, V0, V1
  sll   V0, V0, 2
  addu  V0, V0, V1
  sll   V0, V0, 2
  lui   A1, hi(p1_char)
  addu  A1, A1, V0
  lbu   A1, lo(p1_char)(A1)
  jal   func_80079718
   li    A0, 259
  jal   func_8007D9E0
   li    A0, 50
  li    A0, -1
  li    A1, -1
  jal   func_8005DD68
   li    A2, 2
  sll   A0, S3, 0x10
  jal   func_8007F8B0
   sra   A0, A0, 0x10
  sll   A0, S4, 0x10
  jal   func_80082660
   sra   A0, A0, 0x10
  lw    RA, 0x2c(SP)
  lw    S4, 0x28(SP)
  lw    S3, 0x24(SP)
  lw    S2, 0x20(SP)
  lw    S1, 0x1c(SP)
  lw    S0, 0x18(SP)
  jr    RA
   addiu SP, SP, 0x30

func_8010D37C:
  addiu SP, SP, -0x38
  sw    RA, 0x34(SP)
  sw    S6, 0x30(SP)
  sw    S5, 0x2c(SP)
  sw    S4, 0x28(SP)
  sw    S3, 0x24(SP)
  sw    S2, 0x20(SP)
  sw    S1, 0x1c(SP)
  sw    S0, 0x18(SP)
  lui   S5, hi(D_800F93A8)
  addiu S5, S5, lo(D_800F93A8)
  li    A0, 1
  jal   func_8007FA6C
   li    A1, 5
  move  S2, V0
  lui   V1, hi(D_800F93C6)
  lh    V1, lo(D_800F93C6)(V1)
  sll   V0, V1, 1
  addu  V0, V0, V1
  sll   V0, V0, 2
  addu  V0, V0, V1
  sll   V0, V0, 2
  lui   AT, hi(p1_char)
  addu  AT, AT, V0
  lbu   V0, lo(p1_char)(AT)
  sll   V0, V0, 2
  lui   A0, hi(D_8011237C)
  addu  A0, A0, V0
  jal   func_80017680
   lw    A0, lo(D_8011237C)(A0)
  move  S0, V0
  jal   func_80082800
   move  A0, S0
  move  S6, V0
  jal   func_80017800
   move  A0, S0
  sll   V0, S2, 0x10
  sra   S0, V0, 0x10
  sll   A2, S6, 0x10
  move  A0, S0
  move  A1, R0
  sra   A2, A2, 0x10
  jal   func_8008218C
   move  A3, R0
  move  A0, S0
  move  A1, R0
  jal   func_80082384
   li    A2, 10
  move  A0, S0
  move  A1, R0
  jal   func_8008225C
   li    A2, 1
  lui   V0, hi(D_800F93C6)
  lhu   V0, lo(D_800F93C6)(V0)
  andi  V0, V0, 1
  beqz  V0, L8010D46C
   move  A0, S0
  move  A1, R0
  j     L8010D47C
   li    A2, 4097
L8010D46C:
  sll   A0, S2, 0x10
  sra   A0, A0, 0x10
  move  A1, R0
  li    A2, 4096
L8010D47C:
  jal   func_80082418
   sll   S0, S2, 0x10
  sra   S0, S0, 0x10
  lh    V0, 0x1e(S5)
  sll   V0, V0, 3
  lui   AT, hi(D_80112504)
  addu  AT, AT, V0
  lwc1  F0, lo(D_80112504)(AT)
  trunc.w.s F2, F0
  mfc1  A2, F2
  nop
  sll   A2, A2, 0x10
  lui   AT, hi(D_80112508)
  addu  AT, AT, V0
  lwc1  F0, lo(D_80112508)(AT)
  trunc.w.s F2, F0
  mfc1  A3, F2
  nop
  sll   A3, A3, 0x10
  move  A0, S0
  move  A1, R0
  sra   A2, A2, 0x10
  jal   func_80081AD0
   sra   A3, A3, 0x10
  move  A0, S0
  move  A1, R0
  jal   func_80082488
   move  A2, R0
  move  S1, R0
  sll   S0, S2, 0x10
  sll   A2, S1, 4
L8010D4F8:
  sra   A0, S0, 0x10
  move  A1, R0
  jal   func_80082488
   andi  A2, A2, 0xffff
  jal   func_8007DA44
   addiu S1, S1, 1
  slti  V0, S1, 0x11
  bnel  V0, R0, L8010D4F8
   sll   A2, S1, 4
  sll   S0, S2, 0x10
  sra   S0, S0, 0x10
  move  A0, S0
  move  A1, R0
  jal   func_80082488
   li    A2, 255
  move  A0, S0
  move  A1, R0
  li    A2, 1
  jal   func_800822A8
   move  A3, R0
  move  A0, S0
  move  A1, R0
  jal   func_8008225C
   li    A2, 1
  jal   func_8007D9E0
   li    A0, 20
  jal   func_8007959C
   li    A0, 885
  lh    V0, 0x1e(S5)
  sll   V0, V0, 3
  lui   AT, hi(D_80112504)
  addu  AT, AT, V0
  lwc1  F0, lo(D_80112504)(AT)
  trunc.w.s F2, F0
  mfc1  A1, F2
  nop
  sll   A1, A1, 0x10
  lui   AT, hi(D_80112508)
  addu  AT, AT, V0
  lwc1  F0, lo(D_80112508)(AT)
  trunc.w.s F2, F0
  mfc1  A2, F2
  nop
  sll   A2, A2, 0x10
  lui   AT, hi(D_80112544)
  addu  AT, AT, V0
  lwc1  F0, lo(D_80112544)(AT)
  trunc.w.s F2, F0
  mfc1  A3, F2
  nop
  sll   A3, A3, 0x10
  lui   AT, hi(D_80112548)
  addu  AT, AT, V0
  lwc1  F0, lo(D_80112548)(AT)
  trunc.w.s F2, F0
  mfc1  V0, F2
  nop
  sll   V0, V0, 0x10
  sra   V0, V0, 0x10
  sw    V0, 0x10(SP)
  li    V0, 30
  sw    V0, 0x14(SP)
  move  A0, S0
  sra   A1, A1, 0x10
  sra   A2, A2, 0x10
  jal   func_8010CF20
   sra   A3, A3, 0x10
  jal   func_8007D9E0
   li    A0, 20
  li    S1, 1
  li    S4, 255
  sll   S3, S2, 0x10
  sll   S0, S1, 1
L8010D61C:
  addu  S0, S0, S1
  sll   S0, S0, 3
  addu  S0, S0, S1
  subu  S0, S4, S0
  sll   A1, S0, 0x10
  lh    A0, 0x1e(S5)
  jal   func_800629F0
   sra   A1, A1, 0x10
  sra   A0, S3, 0x10
  move  A1, R0
  jal   func_80082488
   andi  A2, S0, 0xffff
  jal   func_8007DA44
   addiu S1, S1, 1
  slti  V0, S1, 0xa
  bnez  V0, L8010D61C
   sll   S0, S1, 1
  lh    A0, 0x1e(S5)
  jal   func_800629F0
   move  A1, R0
  sll   S0, S2, 0x10
  sra   S0, S0, 0x10
  move  A0, S0
  move  A1, R0
  jal   func_80082488
   move  A2, R0
  jal   func_8007D9E0
   li    A0, 2
  jal   func_8007F8B0
   move  A0, S0
  sll   A0, S6, 0x10
  jal   func_80082660
   sra   A0, A0, 0x10
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

func_8010D6C8:
  addiu SP, SP, -0x30
/*  */  sw    RA, 0x2c(SP)
  sw    S4, 0x28(SP)
  sw    S3, 0x24(SP)
  sw    S2, 0x20(SP)
  sw    S1, 0x1c(SP)
  sw    S0, 0x18(SP)
  lui   S3, hi(D_800F93A8)
  addiu S3, S3, lo(D_800F93A8)
  li    A0, 1
  jal   func_8007FA6C
   li    A1, 5
  move  S2, V0
  lui   V1, hi(D_800F93C6)
  lh    V1, lo(D_800F93C6)(V1)
  sll   V0, V1, 1
  addu  V0, V0, V1
  sll   V0, V0, 2
  addu  V0, V0, V1
  sll   V0, V0, 2
  lui   AT, hi(p1_char)
  addu  AT, AT, V0
  lbu   V0, lo(p1_char)(AT)
  sll   V0, V0, 2
  lui   A0, hi(D_8011237C)
  addu  A0, A0, V0
  jal   func_80017680
   lw    A0, lo(D_8011237C)(A0)
  move  S0, V0
  jal   func_80082800
   move  A0, S0
  move  S4, V0
  jal   func_80017800
   move  A0, S0
  sll   V0, S2, 0x10
  sra   S0, V0, 0x10
  sll   A2, S4, 0x10
  move  A0, S0
  move  A1, R0
  sra   A2, A2, 0x10
  jal   func_8008218C
   move  A3, R0
  move  A0, S0
  move  A1, R0
  jal   func_80082384
   li    A2, 10
  move  A0, S0
  move  A1, R0
  jal   func_8008225C
   li    A2, 1
  lui   V0, hi(D_800F93C6)
  lhu   V0, lo(D_800F93C6)(V0)
  andi  V0, V0, 1
  beqz  V0, L8010D7B0
   move  A0, S0
  move  A1, R0
  j     L8010D7C0
   li    A2, 4097
L8010D7B0:
  sll   A0, S2, 0x10
  sra   A0, A0, 0x10
  move  A1, R0
  li    A2, 4096
L8010D7C0:
  jal   func_80082418
   sll   S0, S2, 0x10
  sra   S0, S0, 0x10
  lh    V0, 0x1e(S3)
  sll   V0, V0, 3
  lui   AT, hi(D_80112564)
  addu  AT, AT, V0
  lwc1  F0, lo(D_80112564)(AT)
  trunc.w.s F2, F0
  mfc1  A2, F2
  nop
  sll   A2, A2, 0x10
  lui   AT, hi(D_80112568)
  addu  AT, AT, V0
  lwc1  F0, lo(D_80112568)(AT)
  trunc.w.s F2, F0
  mfc1  A3, F2
  nop
  sll   A3, A3, 0x10
  move  A0, S0
  move  A1, R0
  sra   A2, A2, 0x10
  jal   func_80081AD0
   sra   A3, A3, 0x10
  move  A0, S0
  move  A1, R0
  jal   func_80082488
   move  A2, R0
  move  S0, R0
  sll   S1, S2, 0x10
  sll   A2, S0, 4
L8010D83C:
  sra   A0, S1, 0x10
  move  A1, R0
  jal   func_80082488
   andi  A2, A2, 0xffff
  jal   func_8007DA44
   addiu S0, S0, 1
  slti  V0, S0, 0x11
  bnel  V0, R0, L8010D83C
   sll   A2, S0, 4
  sll   S0, S2, 0x10
  sra   S0, S0, 0x10
  move  A0, S0
  move  A1, R0
  jal   func_80082488
   li    A2, 255
  move  A0, S0
  move  A1, R0
  li    A2, 1
  jal   func_800822A8
   move  A3, R0
  move  A0, S0
  move  A1, R0
  jal   func_8008225C
   li    A2, 1
  jal   func_8007D9E0
   li    A0, 20
  jal   func_8007959C
   li    A0, 885
  jal   func_8007D838
   nop
  move  S1, V0
  lh    V0, 0x1e(S3)
  sll   V0, V0, 3
  lui   AT, hi(D_80112564)
  addu  AT, AT, V0
  lwc1  F0, lo(D_80112564)(AT)
  trunc.w.s F2, F0
  mfc1  A1, F2
  nop
  sll   A1, A1, 0x10
  lui   AT, hi(D_80112568)
  addu  AT, AT, V0
  lwc1  F0, lo(D_80112568)(AT)
  trunc.w.s F2, F0
  mfc1  A2, F2
  nop
  sll   A2, A2, 0x10
  lui   AT, hi(D_80112504)
  addu  AT, AT, V0
  lwc1  F0, lo(D_80112504)(AT)
  trunc.w.s F2, F0
  mfc1  A3, F2
  nop
  sll   A3, A3, 0x10
  lui   AT, hi(D_80112508)
  addu  AT, AT, V0
  lwc1  F0, lo(D_80112508)(AT)
  trunc.w.s F2, F0
  mfc1  V0, F2
  nop
  sll   V0, V0, 0x10
  sra   V0, V0, 0x10
  sw    V0, 0x10(SP)
  li    V0, 30
  sw    V0, 0x14(SP)
  move  A0, S0
  sra   A1, A1, 0x10
  sra   A2, A2, 0x10
  jal   func_8010CF20
   sra   A3, A3, 0x10
  move  A0, S1
  jal   func_8007D700
   move  A1, V0
  jal   func_8007D7E8
   li    S0, 1
  sll   S1, S2, 0x10
  li    S3, 255
  sll   A2, S0, 1
L8010D974:
  addu  A2, A2, S0
  sll   A2, A2, 3
  addu  A2, A2, S0
  subu  A2, S3, A2
  sra   A0, S1, 0x10
  move  A1, R0
  jal   func_80082488
   andi  A2, A2, 0xffff
  jal   func_8007DA44
   addiu S0, S0, 1
  slti  V0, S0, 0xa
  bnez  V0, L8010D974
   sll   A2, S0, 1
  sll   S0, S2, 0x10
  sra   S0, S0, 0x10
  move  A0, S0
  move  A1, R0
  jal   func_80082488
   move  A2, R0
  jal   func_8007F8B0
   move  A0, S0
  sll   A0, S4, 0x10
  jal   func_80082660
   sra   A0, A0, 0x10
  lw    RA, 0x2c(SP)
  lw    S4, 0x28(SP)
  lw    S3, 0x24(SP)
  lw    S2, 0x20(SP)
  lw    S1, 0x1c(SP)
  lw    S0, 0x18(SP)
  jr    RA
   addiu SP, SP, 0x30

func_8010D9F4:
  addiu SP, SP, -0x40
  sw    RA, 0x30(SP)
  sw    S5, 0x2c(SP)
  sw    S4, 0x28(SP)
  sw    S3, 0x24(SP)
  sw    S2, 0x20(SP)
  sw    S1, 0x1c(SP)
  sw    S0, 0x18(SP)
  sdc1  F20, 0x38(SP)
  lui   S4, hi(D_800F93A8)
  addiu S4, S4, lo(D_800F93A8)
  li    A0, 1
  jal   func_8007FA6C
   li    A1, 5
  move  S2, V0
  lui   V1, hi(D_800F93C6)
  lh    V1, lo(D_800F93C6)(V1)
  sll   V0, V1, 1
  addu  V0, V0, V1
  sll   V0, V0, 2
  addu  V0, V0, V1
  sll   V0, V0, 2
  lui   AT, hi(p1_char)
  addu  AT, AT, V0
  lbu   V0, lo(p1_char)(AT)
  sll   V0, V0, 2
  lui   A0, hi(D_8011237C)
  addu  A0, A0, V0
  jal   func_80017680
   lw    A0, lo(D_8011237C)(A0)
  move  S0, V0
  jal   func_80082800
   move  A0, S0
  move  S5, V0
  jal   func_80017800
   move  A0, S0
  sll   V0, S2, 0x10
  sra   S0, V0, 0x10
  sll   A2, S5, 0x10
  move  A0, S0
  move  A1, R0
  sra   A2, A2, 0x10
  jal   func_8008218C
   move  A3, R0
  move  A0, S0
  move  A1, R0
  jal   func_80082384
   li    A2, 10
  move  A0, S0
  move  A1, R0
  jal   func_8008225C
   li    A2, 1
  lui   V0, hi(D_800F93C6)
  lhu   V0, lo(D_800F93C6)(V0)
  andi  V0, V0, 1
  beqz  V0, L8010DAE4
   move  A0, S0
  move  A1, R0
  j     L8010DAF4
   li    A2, 4097
L8010DAE4:
  sll   A0, S2, 0x10
  sra   A0, A0, 0x10
  move  A1, R0
  li    A2, 4096
L8010DAF4:
  jal   func_80082418
   sll   S0, S2, 0x10
  sra   S0, S0, 0x10
  lh    V0, 0x1e(S4)
  sll   V0, V0, 3
  lui   AT, hi(D_80112504)
  addu  AT, AT, V0
  lwc1  F0, lo(D_80112504)(AT)
  trunc.w.s F2, F0
  mfc1  A2, F2
  nop
  sll   A2, A2, 0x10
  lui   AT, hi(D_80112508)
  addu  AT, AT, V0
  lwc1  F0, lo(D_80112508)(AT)
  trunc.w.s F2, F0
  mfc1  A3, F2
  nop
  sll   A3, A3, 0x10
  move  A0, S0
  move  A1, R0
  sra   A2, A2, 0x10
  jal   func_80081AD0
   sra   A3, A3, 0x10
  move  A0, S0
  move  A1, R0
  jal   func_80082488
   move  A2, R0
  move  S0, R0
  sll   S1, S2, 0x10
  sll   A2, S0, 4
L8010DB70:
  sra   A0, S1, 0x10
  move  A1, R0
  jal   func_80082488
   andi  A2, A2, 0xffff
  jal   func_8007DA44
   addiu S0, S0, 1
  slti  V0, S0, 0x11
  bnel  V0, R0, L8010DB70
   sll   A2, S0, 4
  sll   S0, S2, 0x10
  sra   S0, S0, 0x10
  move  A0, S0
  move  A1, R0
  jal   func_80082488
   li    A2, 255
  move  A0, S0
  move  A1, R0
  li    A2, 1
  jal   func_800822A8
   move  A3, R0
  move  A0, S0
  move  A1, R0
  jal   func_8008225C
   li    A2, 1
  jal   func_8007D9E0
   li    A0, 20
  jal   func_8007959C
   li    A0, 885
  jal   func_8007D838
   li    S3, 255
  move  S1, V0
  lh    V0, 0x1e(S4)
  sll   V0, V0, 3
  lui   AT, hi(D_80112504)
  addu  AT, AT, V0
  lwc1  F0, lo(D_80112504)(AT)
  trunc.w.s F2, F0
  mfc1  A1, F2
  nop
  sll   A1, A1, 0x10
  lui   AT, hi(D_80112508)
  addu  AT, AT, V0
  lwc1  F0, lo(D_80112508)(AT)
  trunc.w.s F2, F0
  mfc1  A2, F2
  nop
  sll   A2, A2, 0x10
  lui   AT, hi(D_80112524)
  addu  AT, AT, V0
  lwc1  F0, lo(D_80112524)(AT)
  trunc.w.s F2, F0
  mfc1  A3, F2
  nop
  sll   A3, A3, 0x10
  lui   AT, hi(D_80112528)
  addu  AT, AT, V0
  lwc1  F0, lo(D_80112528)(AT)
  trunc.w.s F2, F0
  mfc1  V0, F2
  nop
  sll   V0, V0, 0x10
  sra   V0, V0, 0x10
  sw    V0, 0x10(SP)
  li    V0, 30
  sw    V0, 0x14(SP)
  move  A0, S0
  sra   A1, A1, 0x10
  sra   A2, A2, 0x10
  jal   func_8010CF20
   sra   A3, A3, 0x10
  move  A0, S1
  jal   func_8007D700
   move  A1, V0
  jal   func_8007D7E8
   sll   S1, S2, 0x10
  jal   func_8007D9E0
   li    A0, 10
  move  A0, S0
  move  A1, R0
  move  A2, R0
  jal   func_800822A8
   move  A3, R0
  move  A0, S0
  move  A1, R0
  jal   func_8008225C
   li    A2, 1
  li    S0, 1
  sll   A2, S0, 1
L8010DCD0:
  addu  A2, A2, S0
  sll   A2, A2, 3
  addu  A2, A2, S0
  subu  A2, S3, A2
  sra   A0, S1, 0x10
  move  A1, R0
  jal   func_80082488
   andi  A2, A2, 0xffff
  jal   func_8007DA44
   addiu S0, S0, 1
  slti  V0, S0, 0xa
  bnez  V0, L8010DCD0
   sll   A2, S0, 1
  sll   A0, S2, 0x10
  sra   A0, A0, 0x10
  move  A1, R0
  jal   func_80082488
   move  A2, R0
  lh    V1, 0x1e(S4)
  sll   V0, V1, 1
  addu  V0, V0, V1
  sll   V0, V0, 2
  addu  V0, V0, V1
  sll   V0, V0, 2
  lui   V1, hi(p1_item)
  addu  V1, V1, V0
  lb    V1, lo(p1_item)(V1)
  li    V0, 7
  bne   V1, V0, L8010DD54
   move  S0, R0
  jal   func_8007959C
   li    A0, 873
  move  S0, R0
L8010DD54:
  li    AT, 0x41F00000 ;30.000000
  mtc1  AT, F20
L8010DD5C:
  mtc1  S0, F12
  nop
  cvt.s.w F12, F12
  jal   func_800B83C0
   addiu S0, S0, 0x1e
  lh    A0, 0x1e(S4)
  mul.s F0, F0, F20
  mfc1  A1, F0
  jal   func_80062A28
   nop
  jal   func_8007DA44
   nop
  slti  V0, S0, 0x439
  bnez  V0, L8010DD5C
   nop
  li    S1, 1
  li    S3, 255
  li    AT, 0x41F00000 ;30.000000
  mtc1  AT, F20
  sll   A1, S1, 1
L8010DDAC:
  addu  A1, A1, S1
  sll   A1, A1, 3
  addu  A1, A1, S1
  subu  A1, S3, A1
  sll   A1, A1, 0x10
  lh    A0, 0x1e(S4)
  jal   func_800629F0
   sra   A1, A1, 0x10
  mtc1  S0, F12
  nop
  cvt.s.w F12, F12
  jal   func_800B83C0
   addiu S0, S0, 0x1e
  lh    A0, 0x1e(S4)
  mul.s F0, F0, F20
  mfc1  A1, F0
  nop
  jal   func_80062A28
   addiu S1, S1, 1
  jal   func_8007DA44
   nop
  slti  V0, S1, 0xa
  bnez  V0, L8010DDAC
   sll   A1, S1, 1
  lh    A0, 0x1e(S4)
  jal   func_800629F0
   move  A1, R0
  sll   A0, S2, 0x10
  jal   func_8007F8B0
   sra   A0, A0, 0x10
  sll   A0, S5, 0x10
  jal   func_80082660
   sra   A0, A0, 0x10
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

func_8010DE58:
  addiu SP, SP, -0x88
  sw    RA, 0x58(SP)
  sw    S3, 0x54(SP)
  sw    S2, 0x50(SP)
  sw    S1, 0x4c(SP)
  sw    S0, 0x48(SP)
  sdc1  F28, 0x80(SP)
  sdc1  F26, 0x78(SP)
  sdc1  F24, 0x70(SP)
  sdc1  F22, 0x68(SP)
  sdc1  F20, 0x60(SP)
  lui   S3, hi(D_800F93A8)
  addiu S3, S3, lo(D_800F93A8)
  jal   func_8010D37C
   move  S1, R0
  jal   func_8007D838
   nop
  move  S0, V0
  lui   V0, hi(D_800F93C6)
  lh    V0, lo(D_800F93C6)(V0)
  sll   V0, V0, 3
  lui   AT, hi(D_80112544)
  addu  AT, AT, V0
  lwc1  F0, lo(D_80112544)(AT)
  trunc.w.s F2, F0
  mfc1  A1, F2
  nop
  sll   A1, A1, 0x10
  lui   AT, hi(D_80112548)
  addu  AT, AT, V0
  lwc1  F0, lo(D_80112548)(AT)
  trunc.w.s F2, F0
  mfc1  A2, F2
  nop
  sll   A2, A2, 0x10
  lui   AT, hi(D_80112524)
  addu  AT, AT, V0
  lwc1  F0, lo(D_80112524)(AT)
  trunc.w.s F2, F0
  mfc1  A3, F2
  nop
  sll   A3, A3, 0x10
  lui   AT, hi(D_80112528)
  addu  AT, AT, V0
  lwc1  F0, lo(D_80112528)(AT)
  trunc.w.s F2, F0
  mfc1  V0, F2
  nop
  sll   V0, V0, 0x10
  sra   V0, V0, 0x10
  sw    V0, 0x10(SP)
  li    V0, 1
  sw    V0, 0x14(SP)
  li    A0, -1
  sra   A1, A1, 0x10
  sra   A2, A2, 0x10
  jal   func_8010CF20
   sra   A3, A3, 0x10
  move  A0, S0
  jal   func_8007D700
   move  A1, V0
  jal   func_8007D7E8
   move  S0, R0
  li    A0, -1
  addiu V1, SP, 0x20
L8010DF5C:
  lh    V0, 0x1e(S3)
  beq   S0, V0, L8010DF94
   sll   V0, S0, 1
  addu  V0, V0, S0
  sll   V0, V0, 2
  addu  V0, V0, S0
  sll   V0, V0, 2
  lui   AT, hi(p1_item)
  addu  AT, AT, V0
  lb    V0, lo(p1_item)(AT)
  beq   V0, A0, L8010DF94
   addu  V0, V1, S1
  sb    S0, 0(V0)
  addiu S1, S1, 1
L8010DF94:
  addiu S0, S0, 1
  slti  V0, S0, 4
  bnez  V0, L8010DF5C
   nop
  li    A0, 110
  jal   func_80043510
   move  A1, R0
  move  S2, V0
  lw    V0, 0x3c(S2)
  lw    V0, 0x40(V0)
  lh    A0, 0(V0)
  move  A1, R0
  move  A2, A1
  jal   func_800297E8
   move  A3, A1
  jal   func_8005DC3C
   li    A0, -1
  lw    A1, 0x24(V0)
  addiu A0, S2, 0xc
  jal   func_800B3170
   addiu A1, A1, 0xc
  lw    V0, 0x3c(S2)
  lw    V0, 0x40(V0)
  lh    A0, 0(V0)
  li    A1, 2
  jal   func_80029E80
   li    A2, 1
  li    AT, 0x42C80000 ;100.000000
  mtc1  AT, F0
  nop
  swc1  F0, 0x30(S2)
  li    AT, 0x3F800000 ;1.000000
  mtc1  AT, F22
  li    AT, 0x41F00000 ;30.000000
  mtc1  AT, F20
  lwc1  F0, 0x30(S2)
  sub.s F0, F0, F22
L8010E028:
  jal   func_8007DA44
   swc1  F0, 0x30(S2)
  lwc1  F0, 0x30(S2)
  c.lt.s F20, F0
  nop
  nop
  bc1tl L8010E028
   sub.s F0, F0, F22
  beqz  S1, L8010E0D4
   nop
  jal   func_8007959C
   li    A0, 875
  move  S0, R0
  li    AT, 0x40000000 ;2.000000
  mtc1  AT, F28
  li    AT, 0x3F800000 ;1.000000
  mtc1  AT, F26
L8010E06C:
  mtc1  S0, F22
  nop
  cvt.s.w F22, F22
  jal   func_800B83C0
   mov.s F12, F22
  div.s F24, F0, F28
  add.s F24, F24, F26
  jal   func_800B83C0
   mov.s F12, F22
  div.s F20, F0, F28
  add.s F20, F20, F26
  jal   func_800B83C0
   mov.s F12, F22
  div.s F0, F0, F28
  mfc1  A1, F24
  mfc1  A2, F20
  add.s F0, F0, F26
  mfc1  A3, F0
  nop
  jal   func_800B3160
   addiu A0, S2, 0x24
  jal   func_8007DA44
   addiu S0, S0, 0x1e
  slti  V0, S0, 0x439
  bnez  V0, L8010E06C
   nop
L8010E0D4:
  lw    V0, 0x3c(S2)
  lw    V0, 0x40(V0)
  lh    A0, 0(V0)
  li    A1, 1
  jal   func_80029E80
   move  A2, R0
  jal   func_8007D9E0
   li    A0, 20
  bnez  S1, L8010E160
   nop
  li    A0, -1
  li    A1, 3
  jal   func_8005DD68
   move  A2, R0
  jal   func_8007D9E0
   li    A0, 20
  jal   func_80055E90
   li    A0, 483
  li    A0, -1
  li    A1, -1
  jal   func_8005DD68
   li    A2, 2
  jal   func_8004430C
   move  A0, S2
  lh    V0, 0x1e(S3)
  sll   V1, V0, 1
  addu  V1, V1, V0
  sll   V1, V1, 2
  addu  V1, V1, V0
  sll   V1, V1, 2
  li    V0, -1
  lui   AT, hi(p1_item)
  addu  AT, AT, V1
  j     L8010E3A0
   sb    V0, lo(p1_item)(AT)
L8010E160:
  mtc1  S1, F12
  nop
  jal   func_8005A358
   cvt.s.w F12, F12
  addu  V0, SP, V0
  lb    S1, 0x20(V0)
  lh    V1, 0x1e(S3)
  sll   V0, V1, 1
  addu  V0, V0, V1
  sll   V0, V0, 2
  addu  V0, V0, V1
  sll   V0, V0, 2
  sll   S0, S1, 1
  addu  S0, S0, S1
  sll   S0, S0, 2
  addu  S0, S0, S1
  sll   S0, S0, 2
  lui   V1, hi(p1_item)
  addu  V1, V1, S0
  lbu   V1, lo(p1_item)(V1)
  lui   AT, hi(p1_item)
  addu  AT, AT, V0
  sb    V1, lo(p1_item)(AT)
  li    V0, -1
  lui   AT, hi(p1_item)
  addu  AT, AT, S0
  sb    V0, lo(p1_item)(AT)
  move  A0, S1
  jal   func_80067170
   li    A1, 3
  move  A0, S1
  jal   func_800629F0
   move  A1, R0
  lh    A0, 0x1e(S3)
  jal   func_80062588
   nop
  lh    A0, 0x1e(S3)
  jal   func_800629F0
   li    A1, 256
  jal   func_8007959C
   li    A0, 25
  jal   func_8007D838
   nop
  move  S1, V0
  lh    V0, 0x1e(S3)
  sll   V0, V0, 3
  lui   AT, hi(D_80112524)
  addu  AT, AT, V0
  lwc1  F0, lo(D_80112524)(AT)
  trunc.w.s F2, F0
  mfc1  A1, F2
  nop
  sll   A1, A1, 0x10
  lui   AT, hi(D_80112528)
  addu  AT, AT, V0
  lwc1  F0, lo(D_80112528)(AT)
  trunc.w.s F2, F0
  mfc1  A2, F2
  nop
  sll   A2, A2, 0x10
  lui   AT, hi(D_80112564)
  addu  AT, AT, V0
  lwc1  F0, lo(D_80112564)(AT)
  trunc.w.s F2, F0
  mfc1  A3, F2
  nop
  sll   A3, A3, 0x10
  lui   AT, hi(D_80112568)
  addu  AT, AT, V0
  lwc1  F0, lo(D_80112568)(AT)
  trunc.w.s F2, F0
  mfc1  V0, F2
  nop
  sll   V0, V0, 0x10
  sra   V0, V0, 0x10
  sw    V0, 0x10(SP)
  li    V0, 5
  sw    V0, 0x14(SP)
  li    A0, -1
  sra   A1, A1, 0x10
  sra   A2, A2, 0x10
  jal   func_8010CF20
   sra   A3, A3, 0x10
  move  A0, S1
  jal   func_8007D700
   move  A1, V0
  jal   func_8007D7E8
   nop
  lh    V1, 0x1e(S3)
  sll   V0, V1, 1
  addu  V0, V0, V1
  sll   V0, V0, 2
  addu  V0, V0, V1
  sll   V0, V0, 2
  lui   A1, hi(p1_char)
  addu  A1, A1, V0
  lbu   A1, lo(p1_char)(A1)
  jal   func_80079718
   li    A0, 245
  li    A0, -1
  li    A1, 5
  jal   func_8005DD68
   move  A2, R0
  jal   func_8007D9E0
   li    A0, 50
  li    A0, -1
  li    A1, -1
  jal   func_8005DD68
   li    A2, 2
  jal   func_8004430C
   move  A0, S2
  li    V1, 24
  sb    V1, 0x28(SP)
  lui   V0, hi(p1_char)
  addu  V0, V0, S0
  lbu   V0, lo(p1_char)(V0)
  sb    V0, 0x29(SP)
  sb    R0, 0x2a(SP)
  sb    V1, 0x38(SP)
  lh    V1, 0x1e(S3)
  sll   V0, V1, 1
  addu  V0, V0, V1
  sll   V0, V0, 2
  addu  V0, V0, V1
  sll   V0, V0, 2
  lui   AT, hi(p1_char)
  addu  AT, AT, V0
  lbu   V0, lo(p1_char)(AT)
  sb    V0, 0x39(SP)
  sb    R0, 0x3a(SP)
  sw    R0, 0x10(SP)
  sw    R0, 0x14(SP)
  sw    R0, 0x18(SP)
  li    A0, -1
  li    A1, 482
  addiu A2, SP, 0x28
  jal   func_80056368
   addiu A3, SP, 0x38
  jal   func_80056144
   nop
  jal   func_80056168
   nop
  jal   func_8010D6C8
   nop
L8010E3A0:
  lw    RA, 0x58(SP)
  lw    S3, 0x54(SP)
  lw    S2, 0x50(SP)
  lw    S1, 0x4c(SP)
  lw    S0, 0x48(SP)
  ldc1  F28, 0x80(SP)
  ldc1  F26, 0x78(SP)
  ldc1  F24, 0x70(SP)
  ldc1  F22, 0x68(SP)
  ldc1  F20, 0x60(SP)
  jr    RA
   addiu SP, SP, 0x88

func_8010E3D0:
  addiu SP, SP, -0x48
  sw    RA, 0x18(SP)
  sw    S1, 0x14(SP)
  sw    S0, 0x10(SP)
  sdc1  F28, 0x40(SP)
  sdc1  F26, 0x38(SP)
  sdc1  F24, 0x30(SP)
  sdc1  F22, 0x28(SP)
  sdc1  F20, 0x20(SP)
  jal   func_8005DC3C
   li    A0, -1
  jal   func_8005070C
   move  S1, V0
  lui   A0, hi(D_800CC1F0)
  jal   func_800442DC
   lw    A0, lo(D_800CC1F0)(A0)
  lui   V1, hi(D_800CC1F0)
  lw    V1, lo(D_800CC1F0)(V1)
  lw    V0, 0x3c(V1)
  sw    R0, 0x30(V0)
  lw    V0, 0x3c(V1)
  sw    R0, 0x34(V0)
  lw    V0, 0x3c(V1)
  sw    R0, 0x38(V0)
  li    A0, -1
  jal   func_80067170
   li    A1, 3
  jal   func_8007959C
   li    A0, 876
  li    A0, 111
  jal   func_80043510
   move  A1, R0
  move  S0, V0
  lw    A1, 0x24(S1)
  addiu A0, S0, 0xc
  jal   func_800B3170
   addiu A1, A1, 0xc
  lwc1  F0, 0x14(S0)
  li    AT, 0x41A00000 ;20.000000
  mtc1  AT, F2
  nop
  add.s F0, F0, F2
  swc1  F0, 0x14(S0)
  lwc1  F0, 0x10(S0)
  li    AT, 0x41F00000 ;30.000000
  mtc1  AT, F2
  nop
  add.s F0, F0, F2
  swc1  F0, 0x10(S0)
  mtc1  R0, F22
  li    AT, 0x3F800000 ;1.000000
  mtc1  AT, F20
  li    AT, 0x41A00000 ;20.000000
  mtc1  AT, F28
  lui   AT, hi(D_80113658)
  ldc1  F24, lo(D_80113658)(AT)
  li    AT, 0x41200000 ;10.000000
  mtc1  AT, F26
L8010E4B8:
  mfc1  A1, F20
  mfc1  A2, F20
  mfc1  A3, F20
  nop
  jal   func_800B3160
   addiu A0, S0, 0x24
  lw    V0, 0x3c(S0)
  lw    V0, 0x40(V0)
  lh    V0, 0(V0)
  sll   A0, V0, 1
  addu  A0, A0, V0
  sll   A0, A0, 6
  lui   V0, hi(D_800FC834)
  lw    V0, lo(D_800FC834)(V0)
  addu  A0, A0, V0
  mfc1  A1, F22
  nop
  jal   func_800B3B80
   addiu A0, A0, 0x74
  jal   func_8007DA44
   add.s F22, F22, F28
  cvt.d.s F0, F20
  add.d F0, F0, F24
  cvt.s.d F20, F0
  c.lt.s F20, F26
  nop
  bc1t  L8010E4B8
   nop
  jal   func_800442DC
   lw    A0, 0x24(S1)
  lui   A0, hi(D_800CC1F0)
  jal   func_80044258
   lw    A0, lo(D_800CC1F0)(A0)
  li    AT, 0x3F800000 ;1.000000
  mtc1  AT, F0
  nop
  c.le.s F0, F20
  nop
  bc1f  L8010E5E0
   nop
  li    AT, 0x41A00000 ;20.000000
  mtc1  AT, F28
  lui   AT, hi(D_80113660)
  ldc1  F24, lo(D_80113660)(AT)
  li    AT, 0x3F800000 ;1.000000
  mtc1  AT, F26
L8010E570:
  mfc1  A1, F20
  mfc1  A2, F20
  mfc1  A3, F20
  nop
  jal   func_800B3160
   addiu A0, S0, 0x24
  lw    V0, 0x3c(S0)
  lw    V0, 0x40(V0)
  lh    V0, 0(V0)
  sll   A0, V0, 1
  addu  A0, A0, V0
  sll   A0, A0, 6
  lui   V0, hi(D_800FC834)
  lw    V0, lo(D_800FC834)(V0)
  addu  A0, A0, V0
  mfc1  A1, F22
  nop
  jal   func_800B3B80
   addiu A0, A0, 0x74
  jal   func_8007DA44
   add.s F22, F22, F28
  cvt.d.s F0, F20
  sub.d F0, F0, F24
  cvt.s.d F20, F0
  c.le.s F26, F20
  nop
  bc1t  L8010E570
   nop
L8010E5E0:
  jal   func_8004430C
   move  A0, S0
  jal   func_8007D9E0
   li    A0, 20
  li    A0, 5
  jal   func_800508E4
   li    A1, 2
  jal   func_8007D9E0
   li    A0, 40
  li    A0, -1
  jal   func_800508E4
   li    A1, 2
  jal   func_80055E90
   li    A0, 486
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

func_8010E640:
/*  */  addiu SP, SP, -0x58
  sw    RA, 0x28(SP)
  sw    S1, 0x24(SP)
  sw    S0, 0x20(SP)
  sdc1  F28, 0x50(SP)
  sdc1  F26, 0x48(SP)
  sdc1  F24, 0x40(SP)
  sdc1  F22, 0x38(SP)
  sdc1  F20, 0x30(SP)
  jal   func_8005DC3C
   li    A0, -1
  move  S1, V0
  li    A0, -1
  jal   func_800508E4
   li    A1, 2
  jal   func_8005670C
   addiu A0, SP, 0x10
  lw    A2, 0x24(S1)
  addiu A2, A2, 0x18
  move  A0, A2
  addiu A1, SP, 0x10
  jal   func_80056B78
   li    A3, 8
  jal   func_8007D9E0
   li    A0, 8
  jal   func_8007959C
   li    A0, 876
  li    A0, 111
  jal   func_80043510
   move  A1, R0
  move  S0, V0
  lw    A1, 0x24(S1)
  addiu A0, S0, 0xc
  jal   func_800B3170
   addiu A1, A1, 0xc
  lwc1  F0, 0x14(S0)
  li    AT, 0x41A00000 ;20.000000
  mtc1  AT, F2
  nop
  add.s F0, F0, F2
  swc1  F0, 0x14(S0)
  lwc1  F0, 0x10(S0)
  li    AT, 0x41F00000 ;30.000000
  mtc1  AT, F2
  nop
  add.s F0, F0, F2
  swc1  F0, 0x10(S0)
  mtc1  R0, F22
  li    AT, 0x3F800000 ;1.000000
  mtc1  AT, F20
  li    AT, 0x41A00000 ;20.000000
  mtc1  AT, F28
  lui   AT, hi(D_80113668)
  ldc1  F24, lo(D_80113668)(AT)
  li    AT, 0x41200000 ;10.000000
  mtc1  AT, F26
L8010E720:
  mfc1  A1, F20
  mfc1  A2, F20
  mfc1  A3, F20
  nop
  jal   func_800B3160
   addiu A0, S0, 0x24
  lw    V0, 0x3c(S0)
  lw    V0, 0x40(V0)
  lh    V0, 0(V0)
  sll   A0, V0, 1
  addu  A0, A0, V0
  sll   A0, A0, 6
  lui   V0, hi(D_800FC834)
  lw    V0, lo(D_800FC834)(V0)
  addu  A0, A0, V0
  mfc1  A1, F22
  nop
  jal   func_800B3B80
   addiu A0, A0, 0x74
  jal   func_8007DA44
   add.s F22, F22, F28
  cvt.d.s F0, F20
  add.d F0, F0, F24
  cvt.s.d F20, F0
  c.lt.s F20, F26
  nop
  bc1t  L8010E720
   nop
  jal   func_80044258
   lw    A0, 0x24(S1)
  jal   func_80050860
   nop
  li    AT, 0x3F800000 ;1.000000
  mtc1  AT, F0
  nop
  c.le.s F0, F20
  nop
  bc1f  L8010E844
   nop
  li    AT, 0x41A00000 ;20.000000
  mtc1  AT, F28
  lui   AT, hi(D_80113670)
  ldc1  F24, lo(D_80113670)(AT)
  li    AT, 0x3F800000 ;1.000000
  mtc1  AT, F26
L8010E7D4:
  mfc1  A1, F20
  mfc1  A2, F20
  mfc1  A3, F20
  nop
  jal   func_800B3160
   addiu A0, S0, 0x24
  lw    V0, 0x3c(S0)
  lw    V0, 0x40(V0)
  lh    V0, 0(V0)
  sll   A0, V0, 1
  addu  A0, A0, V0
  sll   A0, A0, 6
  lui   V0, hi(D_800FC834)
  lw    V0, lo(D_800FC834)(V0)
  addu  A0, A0, V0
  mfc1  A1, F22
  nop
  jal   func_800B3B80
   addiu A0, A0, 0x74
  jal   func_8007DA44
   add.s F22, F22, F28
  cvt.d.s F0, F20
  sub.d F0, F0, F24
  cvt.s.d F20, F0
  c.le.s F26, F20
  nop
  bc1t  L8010E7D4
   nop
L8010E844:
  jal   func_8004430C
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

func_8010E874:
  addiu SP, SP, -0x28
  sw    RA, 0x20(SP)
  sw    S1, 0x1c(SP)
  sw    S0, 0x18(SP)
  lui   S1, hi(D_800F93A8)
  addiu S1, S1, lo(D_800F93A8)
  lui   V0, hi(D_800F93C6)
  lh    V0, lo(D_800F93C6)(V0)
  sll   V1, V0, 1
  addu  V1, V1, V0
  sll   V1, V1, 2
  addu  V1, V1, V0
  sll   V1, V1, 2
  li    V0, 3
  lui   AT, hi(p1_item)
  addu  AT, AT, V1
  sb    V0, lo(p1_item)(AT)
  jal   func_80060210
   li    A0, 25
L8010E8C0:
  jal   func_800609D8
   nop
  beqz  V0, L8010E8E0
   nop
  jal   func_8007DA44
   nop
  j     L8010E8C0
   nop
L8010E8E0:
  jal   func_80062824
   li    A0, 1
  lh    A0, 0x1e(S1)
  jal   func_800629F0
   move  A1, R0
  jal   func_80060210
   li    A0, 26
L8010E8FC:
  jal   func_800609D8
   nop
  beqz  V0, L8010E91C
   nop
  jal   func_8007DA44
   nop
  j     L8010E8FC
   nop
L8010E91C:
  jal   func_8007D838
   nop
  move  S0, V0
  lh    V0, 0x1e(S1)
  sll   V0, V0, 3
  lui   AT, hi(D_80112504)
  addu  AT, AT, V0
  lwc1  F0, lo(D_80112504)(AT)
  trunc.w.s F2, F0
  mfc1  A1, F2
  nop
  sll   A1, A1, 0x10
  lui   AT, hi(D_80112508)
  addu  AT, AT, V0
  lwc1  F0, lo(D_80112508)(AT)
  trunc.w.s F2, F0
  mfc1  A2, F2
  nop
  sll   A2, A2, 0x10
  lui   AT, hi(D_80112524)
  addu  AT, AT, V0
  lwc1  F0, lo(D_80112524)(AT)
  trunc.w.s F2, F0
  mfc1  A3, F2
  nop
  sll   A3, A3, 0x10
  lui   AT, hi(D_80112528)
  addu  AT, AT, V0
  lwc1  F0, lo(D_80112528)(AT)
  trunc.w.s F2, F0
  mfc1  V0, F2
  nop
  sll   V0, V0, 0x10
  sra   V0, V0, 0x10
  sw    V0, 0x10(SP)
  li    V0, 1
  sw    V0, 0x14(SP)
  li    A0, -1
  sra   A1, A1, 0x10
  sra   A2, A2, 0x10
  jal   func_8010CF20
   sra   A3, A3, 0x10
  move  A0, S0
  jal   func_8007D700
   move  A1, V0
  jal   func_8007D7E8
   li    S0, 1
  jal   func_8007959C
   li    A0, 25
  sll   A1, S0, 1
L8010E9E4:
  addu  A1, A1, S0
  sll   A1, A1, 3
  addu  A1, A1, S0
  sll   A1, A1, 0x10
  lh    A0, 0x1e(S1)
  jal   func_800629F0
   sra   A1, A1, 0x10
  jal   func_8007DA44
   addiu S0, S0, 1
  slti  V0, S0, 0xa
  bnel  V0, R0, L8010E9E4
   sll   A1, S0, 1
  lh    A0, 0x1e(S1)
  jal   func_800629F0
   li    A1, 256
  li    A0, -1
  li    A1, 3
  jal   func_8005DD68
   move  A2, R0
  jal   func_8007D9E0
   li    A0, 30
  lh    V0, 2(S1)
  sll   V0, V0, 2
  lui   A0, hi(D_80112584)
  addu  A0, A0, V0
  jal   func_80055E90
   lw    A0, lo(D_80112584)(A0)
  jal   func_8007959C
   li    A0, 885
  jal   func_8007D838
   nop
  move  S0, V0
  lh    V0, 0x1e(S1)
  sll   V0, V0, 3
  lui   AT, hi(D_80112524)
  addu  AT, AT, V0
  lwc1  F0, lo(D_80112524)(AT)
  trunc.w.s F2, F0
  mfc1  A1, F2
  nop
  sll   A1, A1, 0x10
  lui   AT, hi(D_80112528)
  addu  AT, AT, V0
  lwc1  F0, lo(D_80112528)(AT)
  trunc.w.s F2, F0
  mfc1  A2, F2
  nop
  sll   A2, A2, 0x10
  lui   AT, hi(D_80112504)
  addu  AT, AT, V0
  lwc1  F0, lo(D_80112504)(AT)
  trunc.w.s F2, F0
  mfc1  A3, F2
  nop
  sll   A3, A3, 0x10
  lui   AT, hi(D_80112508)
  addu  AT, AT, V0
  lwc1  F0, lo(D_80112508)(AT)
  trunc.w.s F2, F0
  mfc1  V0, F2
  nop
  sll   V0, V0, 0x10
  sra   V0, V0, 0x10
  sw    V0, 0x10(SP)
  li    V0, 30
  sw    V0, 0x14(SP)
  li    A0, -1
  sra   A1, A1, 0x10
  sra   A2, A2, 0x10
  jal   func_8010CF20
   sra   A3, A3, 0x10
  move  A0, S0
  jal   func_8007D700
   move  A1, V0
  jal   func_8007D7E8
   nop
  jal   func_8007D9E0
   li    A0, 10
  jal   func_80060210
   li    A0, 25
L8010EB24:
  jal   func_800609D8
   nop
  beqz  V0, L8010EB44
   nop
  jal   func_8007DA44
   nop
  j     L8010EB24
   nop
L8010EB44:
  jal   func_80062824
   move  A0, R0
  jal   func_80060210
   li    A0, 26
L8010EB54:
  jal   func_800609D8
   nop
  beqz  V0, L8010EB74
   nop
  jal   func_8007DA44
   nop
  j     L8010EB54
   nop
L8010EB74:
  lw    RA, 0x20(SP)
  lw    S1, 0x1c(SP)
  lw    S0, 0x18(SP)
  jr    RA
   addiu SP, SP, 0x28

func_8010EB88:
  addiu SP, SP, -0x78
  sw    RA, 0x48(SP)
  sw    S5, 0x44(SP)
  sw    S4, 0x40(SP)
  sw    S3, 0x3c(SP)
  sw    S2, 0x38(SP)
  sw    S1, 0x34(SP)
  sw    S0, 0x30(SP)
  sdc1  F28, 0x70(SP)
  sdc1  F26, 0x68(SP)
  sdc1  F24, 0x60(SP)
  sdc1  F22, 0x58(SP)
  sdc1  F20, 0x50(SP)
  jal   func_8005DC3C
   li    A0, -1
  lui   S4, hi(D_800F93A8)
  addiu S4, S4, lo(D_800F93A8)
  jal   func_8007D838
   move  S3, V0
  li    AT, 0x3FA60000 ;1.296875
  ori AT, AT, 0x6666
  mtc1  AT, F12
  nop
  jal   func_80052F70
   move  S0, V0
  move  A0, S0
  jal   func_8007D700
   move  A1, V0
  jal   func_8007D7E8
   move  S1, R0
  li    S5, 255
  sll   V0, S1, 1
L8010EC08:
  addu  V0, V0, S1
  sll   V0, V0, 2
  addu  V0, V0, S1
  sll   V0, V0, 2
  lui   V1, hi(p1_item)
  addu  V1, V1, V0
  lb    V1, lo(p1_item)(V1)
  li    V0, 3
  bnel  V1, V0, L8010EE04
   addiu S1, S1, 1
  jal   func_80060210
   li    A0, 25
L8010EC38:
  jal   func_800609D8
   nop
  beqz  V0, L8010EC58
   nop
  jal   func_8007DA44
   nop
  j     L8010EC38
   nop
L8010EC58:
  jal   func_80062824
   li    A0, 1
  move  A0, S1
  jal   func_800629F0
   li    A1, 256
  jal   func_80060210
   li    A0, 26
L8010EC74:
  jal   func_800609D8
   nop
  beqz  V0, L8010EC94
   nop
  jal   func_8007DA44
   nop
  j     L8010EC74
   nop
L8010EC94:
  jal   func_8007D9E0
   li    A0, 20
  jal   func_800636F8
   li    A0, 3
  lh    S2, 0x1e(S4)
  sh    S1, 0x1e(S4)
  jal   func_8007959C
   li    A0, 885
  jal   func_8007D838
   nop
  move  S0, V0
  lh    V0, 0x1e(S4)
  sll   V0, V0, 3
  lui   AT, hi(D_80112504)
  addu  AT, AT, V0
  lwc1  F0, lo(D_80112504)(AT)
  trunc.w.s F2, F0
  mfc1  A1, F2
  nop
  sll   A1, A1, 0x10
  lui   AT, hi(D_80112508)
  addu  AT, AT, V0
  lwc1  F0, lo(D_80112508)(AT)
  trunc.w.s F2, F0
  mfc1  A2, F2
  nop
  sll   A2, A2, 0x10
  lui   AT, hi(D_80112524)
  addu  AT, AT, V0
  lwc1  F0, lo(D_80112524)(AT)
  trunc.w.s F2, F0
  mfc1  A3, F2
  nop
  sll   A3, A3, 0x10
  lui   AT, hi(D_80112528)
  addu  AT, AT, V0
  lwc1  F0, lo(D_80112528)(AT)
  trunc.w.s F2, F0
  mfc1  V0, F2
  nop
  sll   V0, V0, 0x10
  sra   V0, V0, 0x10
  sw    V0, 0x10(SP)
  li    V0, 30
  sw    V0, 0x14(SP)
  li    A0, -1
  sra   A1, A1, 0x10
  sra   A2, A2, 0x10
  jal   func_8010CF20
   sra   A3, A3, 0x10
  move  A0, S0
  jal   func_8007D700
   move  A1, V0
  jal   func_8007D7E8
   li    S0, 1
  jal   func_8007D9E0
   li    A0, 20
  sll   A1, S0, 1
L8010ED7C:
  addu  A1, A1, S0
  sll   A1, A1, 3
  addu  A1, A1, S0
  subu  A1, S5, A1
  sll   A1, A1, 0x10
  move  A0, S1
  jal   func_800629F0
   sra   A1, A1, 0x10
  move  A0, S1
  lui   A2, 0x4000
  jal   func_800628C0
   move  A1, R0
  jal   func_8007DA44
   addiu S0, S0, 1
  slti  V0, S0, 0xa
  bnez  V0, L8010ED7C
   sll   A1, S0, 1
  move  A0, S1
  jal   func_800629F0
   move  A1, R0
  sll   V0, S1, 1
  addu  V0, V0, S1
  sll   V0, V0, 2
  addu  V0, V0, S1
  sll   V0, V0, 2
  li    V1, -1
  lui   AT, hi(p1_item)
  addu  AT, AT, V0
  sb    V1, lo(p1_item)(AT)
  sh    S2, 0x1e(S4)
  jal   func_800636F8
   li    A0, 1
  j     L8010EE10
   nop
L8010EE04:
  slti  V0, S1, 4
  bnez  V0, L8010EC08
   sll   V0, S1, 1
L8010EE10:
  lui   V0, hi(D_800F8D12)
  lh    V0, lo(D_800F8D12)(V0)
  beql  V0, R0, L8010EE34
   move  A0, R0
  jal   func_80108C0C
   nop
  jal   func_8007D9E0
   li    A0, 30
  move  A0, R0
L8010EE34:
  jal   func_80067170
   li    A1, 4
  li    A0, 1
  jal   func_80067170
   li    A1, 4
  li    A0, 2
  jal   func_80067170
   li    A1, 4
  li    A0, 3
  jal   func_80067170
   li    A1, 4
  jal   func_8007959C
   li    A0, 876
  li    A0, 111
  jal   func_80043510
   move  A1, R0
  move  S0, V0
  lui   A1, hi(D_800F64C8)
  lw    A1, lo(D_800F64C8)(A1)
  addiu A0, S0, 0xc
  jal   func_800B3170
   addiu A1, A1, 0xc
  lwc1  F0, 0x14(S0)
  li    AT, 0x41A00000 ;20.000000
  mtc1  AT, F2
  nop
  add.s F0, F0, F2
  swc1  F0, 0x14(S0)
  lwc1  F0, 0x10(S0)
  li    AT, 0x41F00000 ;30.000000
  mtc1  AT, F2
  nop
  add.s F0, F0, F2
  swc1  F0, 0x10(S0)
  mtc1  R0, F22
  li    AT, 0x3F800000 ;1.000000
  mtc1  AT, F20
  li    AT, 0x41A00000 ;20.000000
  mtc1  AT, F28
  lui   AT, hi(D_80113678)
  ldc1  F24, lo(D_80113678)(AT)
  li    AT, 0x41200000 ;10.000000
  mtc1  AT, F26
L8010EEE0:
  mfc1  A1, F20
  mfc1  A2, F20
  mfc1  A3, F20
  nop
  jal   func_800B3160
   addiu A0, S0, 0x24
  lw    V0, 0x3c(S0)
  lw    V0, 0x40(V0)
  lh    V0, 0(V0)
  sll   A0, V0, 1
  addu  A0, A0, V0
  sll   A0, A0, 6
  lui   V0, hi(D_800FC834)
  lw    V0, lo(D_800FC834)(V0)
  addu  A0, A0, V0
  mfc1  A1, F22
  nop
  jal   func_800B3B80
   addiu A0, A0, 0x74
  jal   func_8007DA44
   add.s F22, F22, F28
  cvt.d.s F0, F20
  add.d F0, F0, F24
  cvt.s.d F20, F0
  c.lt.s F20, F26
  nop
  bc1t  L8010EEE0
   nop
  jal   func_800509FC
   nop
  lui   A0, hi(D_800F64C8)
  jal   func_800442DC
   lw    A0, lo(D_800F64C8)(A0)
  li    AT, 0x3F800000 ;1.000000
  mtc1  AT, F0
  nop
  c.le.s F0, F20
  nop
  bc1f  L8010F008
   nop
  li    AT, 0x41A00000 ;20.000000
  mtc1  AT, F28
  lui   AT, hi(D_80113680)
  ldc1  F24, lo(D_80113680)(AT)
  li    AT, 0x3F800000 ;1.000000
  mtc1  AT, F26
L8010EF98:
  mfc1  A1, F20
  mfc1  A2, F20
  mfc1  A3, F20
  nop
  jal   func_800B3160
   addiu A0, S0, 0x24
  lw    V0, 0x3c(S0)
  lw    V0, 0x40(V0)
  lh    V0, 0(V0)
  sll   A0, V0, 1
  addu  A0, A0, V0
  sll   A0, A0, 6
  lui   V0, hi(D_800FC834)
  lw    V0, lo(D_800FC834)(V0)
  addu  A0, A0, V0
  mfc1  A1, F22
  nop
  jal   func_800B3B80
   addiu A0, A0, 0x74
  jal   func_8007DA44
   add.s F22, F22, F28
  cvt.d.s F0, F20
  sub.d F0, F0, F24
  cvt.s.d F20, F0
  c.le.s F26, F20
  nop
  bc1t  L8010EF98
   nop
L8010F008:
  jal   func_8004430C
   move  A0, S0
  lh    V0, 0x1c(S4)
  sll   V0, V0, 1
  lui   A0, hi(D_80111984)
  addu  A0, A0, V0
  lh    A0, lo(D_80111984)(A0)
  addiu A1, S3, 0x10
  jal   func_80054C78
   addiu A2, S3, 0x12
  lhu   V0, 0x10(S3)
  sh    V0, 0x14(S3)
  lhu   V0, 0x12(S3)
  addiu V0, V0, 1
  sh    V0, 0x16(S3)
  lh    V0, 0x1c(S4)
  sll   V0, V0, 1
  lui   A0, hi(D_80111984)
  addu  A0, A0, V0
  jal   func_80054B8C
   lh    A0, lo(D_80111984)(A0)
  lw    A0, 0x24(S3)
  addiu S0, V0, 8
  addiu A0, A0, 0xc
  move  A1, S0
  jal   func_80056658
   addiu A2, SP, 0x18
  lw    A2, 0x24(S3)
  addiu A2, A2, 0x18
  move  A0, A2
  addiu A1, SP, 0x18
  jal   func_80056B78
   li    A3, 8
  jal   func_8007D9E0
   li    A0, 8
  move  A0, R0
  jal   func_800508E4
   li    A1, 2
  lw    A2, 0x24(S3)
  addiu A2, A2, 0xc
  move  A0, A2
  move  A1, S0
  jal   func_80056D80
   li    A3, 10
  jal   func_8007D9E0
   li    A0, 10
  li    A0, -1
  jal   func_800508E4
   li    A1, 2
  jal   func_8006286C
   move  A0, R0
  beqz  V0, L8010F134
   nop
  jal   func_80060210
   li    A0, 25
L8010F0E4:
  jal   func_800609D8
   nop
  beqz  V0, L8010F104
   nop
  jal   func_8007DA44
   nop
  j     L8010F0E4
   nop
L8010F104:
  jal   func_80062824
   move  A0, R0
  jal   func_80060210
   li    A0, 26
L8010F114:
  jal   func_800609D8
   nop
  beqz  V0, L8010F134
   nop
  jal   func_8007DA44
   nop
  j     L8010F114
   nop
L8010F134:
  jal   func_8005670C
   addiu A0, SP, 0x18
  lw    A2, 0x24(S3)
  addiu A2, A2, 0x18
  move  A0, A2
  addiu A1, SP, 0x18
  jal   func_80056B78
   li    A3, 8
  jal   func_8007D9E0
   li    A0, 8
  li    A0, 5
  jal   func_800508E4
   li    A1, 2
  jal   func_8007D9E0
   li    A0, 30
  jal   func_8007959C
   li    A0, 291
  lh    V0, 2(S4)
  sll   V1, V0, 1
  sll   V0, V0, 2
  lui   A1, hi(D_80112584)
  addu  A1, A1, V0
  lw    A1, lo(D_80112584)(A1)
  lui   A0, hi(D_8011259C)
  addu  A0, A0, V1
  lh    A0, lo(D_8011259C)(A0)
  jal   func_8005600C
   addiu A1, A1, 1
  li    A0, -1
  jal   func_800508E4
   li    A1, 2
  jal   func_8007DA44
   nop
  lh    A0, 0x1e(S4)
  jal   func_800495D8
   li    A1, 3
  lw    RA, 0x48(SP)
  lw    S5, 0x44(SP)
  lw    S4, 0x40(SP)
  lw    S3, 0x3c(SP)
  lw    S2, 0x38(SP)
  lw    S1, 0x34(SP)
  lw    S0, 0x30(SP)
  ldc1  F28, 0x70(SP)
  ldc1  F26, 0x68(SP)
  ldc1  F24, 0x60(SP)
  ldc1  F22, 0x58(SP)
  ldc1  F20, 0x50(SP)
  jr    RA
   addiu SP, SP, 0x78

func_8010F1FC:
  addiu SP, SP, -0x40
  sw    RA, 0x14(SP)
  sw    S0, 0x10(SP)
  sdc1  F28, 0x38(SP)
  sdc1  F26, 0x30(SP)
  sdc1  F24, 0x28(SP)
  sdc1  F22, 0x20(SP)
  sdc1  F20, 0x18(SP)
  jal   func_800794A8
   li    A0, 60
  jal   func_8007959C
   li    A0, 876
  li    A0, 111
  jal   func_80043510
   move  A1, R0
  move  S0, V0
  lui   A1, hi(D_800CC1F0)
  lw    A1, lo(D_800CC1F0)(A1)
  addiu A0, S0, 0xc
  jal   func_800B3170
   addiu A1, A1, 0xc
  lwc1  F0, 0x14(S0)
  li    AT, 0x41A00000 ;20.000000
  mtc1  AT, F2
  nop
  add.s F0, F0, F2
  swc1  F0, 0x14(S0)
  lwc1  F0, 0x10(S0)
  li    AT, 0x41F00000 ;30.000000
  mtc1  AT, F2
  nop
  add.s F0, F0, F2
  swc1  F0, 0x10(S0)
  mtc1  R0, F22
  li    AT, 0x3F800000 ;1.000000
  mtc1  AT, F20
  li    AT, 0x41A00000 ;20.000000
  mtc1  AT, F28
  lui   AT, hi(D_80113688)
  ldc1  F24, lo(D_80113688)(AT)
  li    AT, 0x41200000 ;10.000000
  mtc1  AT, F26
L8010F2A4:
  mfc1  A1, F20
  mfc1  A2, F20
  mfc1  A3, F20
  nop
  jal   func_800B3160
   addiu A0, S0, 0x24
  lw    V0, 0x3c(S0)
  lw    V0, 0x40(V0)
  lh    V0, 0(V0)
  sll   A0, V0, 1
  addu  A0, A0, V0
  sll   A0, A0, 6
  lui   V0, hi(D_800FC834)
  lw    V0, lo(D_800FC834)(V0)
  addu  A0, A0, V0
  mfc1  A1, F22
  nop
  jal   func_800B3B80
   addiu A0, A0, 0x74
  jal   func_8007DA44
   add.s F22, F22, F28
  cvt.d.s F0, F20
  add.d F0, F0, F24
  cvt.s.d F20, F0
  c.lt.s F20, F26
  nop
  bc1t  L8010F2A4
   nop
  jal   func_800636F8
   li    A0, 3
  jal   func_80050860
   nop
  li    AT, 0x3F800000 ;1.000000
  mtc1  AT, F0
  nop
  c.le.s F0, F20
  nop
  bc1f  L8010F3C8
   nop
  li    AT, 0x41A00000 ;20.000000
  mtc1  AT, F28
  lui   AT, hi(D_80113690)
  ldc1  F24, lo(D_80113690)(AT)
  li    AT, 0x3F800000 ;1.000000
  mtc1  AT, F26
L8010F358:
  mfc1  A1, F20
  mfc1  A2, F20
  mfc1  A3, F20
  nop
  jal   func_800B3160
   addiu A0, S0, 0x24
  lw    V0, 0x3c(S0)
  lw    V0, 0x40(V0)
  lh    V0, 0(V0)
  sll   A0, V0, 1
  addu  A0, A0, V0
  sll   A0, A0, 6
  lui   V0, hi(D_800FC834)
  lw    V0, lo(D_800FC834)(V0)
  addu  A0, A0, V0
  mfc1  A1, F22
  nop
  jal   func_800B3B80
   addiu A0, A0, 0x74
  jal   func_8007DA44
   add.s F22, F22, F28
  cvt.d.s F0, F20
  sub.d F0, F0, F24
  cvt.s.d F20, F0
  c.le.s F26, F20
  nop
  bc1t  L8010F358
   nop
L8010F3C8:
  jal   func_8004430C
   move  A0, S0
  jal   func_800632FC
   nop
  sll   V0, V0, 0x10
  jal   func_80079390
   sra   A0, V0, 0x10
  lui   V0, hi(D_800F93AA)
  lh    V0, lo(D_800F93AA)(V0)
  sll   V0, V0, 2
  lui   A0, hi(D_80112584)
  addu  A0, A0, V0
  lw    A0, lo(D_80112584)(A0)
  jal   func_80055E90
   addiu A0, A0, 8
  lui   AT, hi(D_800F8D16)
  sh    R0, lo(D_800F8D16)(AT)
  lw    RA, 0x14(SP)
  lw    S0, 0x10(SP)
  ldc1  F28, 0x38(SP)
  ldc1  F26, 0x30(SP)
  ldc1  F24, 0x28(SP)
  ldc1  F22, 0x20(SP)
  ldc1  F20, 0x18(SP)
  jr    RA
   addiu SP, SP, 0x40

func_8010F430:
  addiu SP, SP, -0x90
  sw    RA, 0x8c(SP)
  sw    FP, 0x88(SP)
  sw    S7, 0x84(SP)
  sw    S6, 0x80(SP)
  sw    S5, 0x7c(SP)
  sw    S4, 0x78(SP)
  sw    S3, 0x74(SP)
  sw    S2, 0x70(SP)
  sw    S1, 0x6c(SP)
  sw    S0, 0x68(SP)
  lui   S0, hi(D_800F93C6)
  addiu S0, S0, lo(D_800F93C6)
  lh    S4, 0(S0)
  jal   func_8005DC3C
   li    A0, -1
  move  S6, V0
  addiu S7, S0, -0x1e
  move  S2, R0
  move  S1, R0
  sll   V0, S4, 1
  addu  V0, V0, S4
  sll   V0, V0, 2
  addu  V0, V0, S4
  sll   S3, V0, 2
  addiu S5, SP, 0x20
L8010F498:
  lui   A0, hi(D_800FD2D0)
  addu  A0, A0, S3
  lhu   A0, lo(D_800FD2D0)(A0)
  lui   A1, hi(D_800FD2D2)
  addu  A1, A1, S3
  jal   func_80054BB0
   lhu   A1, lo(D_800FD2D2)(A1)
  move  S0, V0
  sll   V0, S1, 1
  addu  V0, V0, S1
  sll   V0, V0, 2
  addu  V0, V0, S1
  sll   V0, V0, 2
  lui   A0, hi(D_800FD2D0)
  addu  A0, A0, V0
  lhu   A0, lo(D_800FD2D0)(A0)
  lui   A1, hi(D_800FD2D2)
  addu  A1, A1, V0
  lhu   A1, lo(D_800FD2D2)(A1)
  jal   func_80054BB0
   sll   S0, S0, 0x10
  sra   S0, S0, 0x10
  sll   V0, V0, 0x10
  sra   V0, V0, 0x10
  bnel  S0, V0, L8010F520
   addiu S1, S1, 1
  addu  V0, S5, S2
  sb    S1, 0(V0)
  addiu S2, S2, 1
  sll   A0, S1, 0x10
  sra   A0, A0, 0x10
  jal   func_80067170
   li    A1, 4
  addiu S1, S1, 1
L8010F520:
  slti  V0, S1, 4
  bnez  V0, L8010F498
   nop
  beqz  S2, L8010F910
   nop
  jal   func_80046D2C
   move  A0, S4
  move  FP, V0
  li    A0, -1
  jal   func_800508E4
   li    A1, 2
  addiu S0, SP, 0x28
  jal   func_8005670C
   move  A0, S0
  lw    A2, 0x24(S6)
  addiu A2, A2, 0x18
  move  A0, A2
  move  A1, S0
  jal   func_80056B78
   li    A3, 8
  jal   func_8007D9E0
   li    A0, 8
  jal   func_8007959C
   li    A0, 291
  move  A0, R0
  blez  S2, L8010F5CC
   move  S1, R0
  addiu A1, SP, 0x20
  addu  V0, A1, S1
L8010F594:
  lb    V1, 0(V0)
  sll   V0, V1, 1
  addu  V0, V0, V1
  sll   V0, V0, 2
  addu  V0, V0, V1
  sll   V0, V0, 2
  lui   AT, hi(p1_coins)
  addu  AT, AT, V0
  lh    V0, lo(p1_coins)(AT)
  addu  A0, A0, V0
  addiu S1, S1, 1
  slt   V0, S1, S2
  bnez  V0, L8010F594
   addu  V0, A1, S1
L8010F5CC:
  bnel  A0, R0, L8010F6A4
   sb    R0, 0x44(SP)
  li    V0, 1
  bne   S2, V0, L8010F670
   li    V0, 24
  sb    V0, 0x38(SP)
  lb    V1, 0x20(SP)
  sll   V0, V1, 1
  addu  V0, V0, V1
  sll   V0, V0, 2
  addu  V0, V0, V1
  sll   V0, V0, 2
  lui   AT, hi(p1_char)
  addu  AT, AT, V0
  lbu   V0, lo(p1_char)(AT)
  sb    V0, 0x39(SP)
  sb    R0, 0x3a(SP)
  lh    V0, 2(S7)
  sll   V1, V0, 1
  lui   A0, hi(D_8011259C)
  addu  A0, A0, V1
  lh    A0, lo(D_8011259C)(A0)
  sll   V0, V0, 2
  lui   A1, hi(D_80112584)
  addu  A1, A1, V0
  lw    A1, lo(D_80112584)(A1)
  sw    R0, 0x10(SP)
  sw    R0, 0x14(SP)
  sw    R0, 0x18(SP)
  addiu A1, A1, 6
  addiu A2, SP, 0x38
  jal   func_80056368
   move  A3, R0
  jal   func_80056458
   nop
  jal   func_80056144
   nop
  jal   func_80056168
   nop
  j     L8010F8F0
   nop
L8010F670:
  lh    V0, 2(S7)
  sll   V1, V0, 1
  sll   V0, V0, 2
  lui   A1, hi(D_80112584)
  addu  A1, A1, V0
  lw    A1, lo(D_80112584)(A1)
  lui   A0, hi(D_8011259C)
  addu  A0, A0, V1
  lh    A0, lo(D_8011259C)(A0)
  jal   func_8005600C
   addiu A1, A1, 7
  j     L8010F8F0
   nop
L8010F6A4:
  sb    R0, 0x40(SP)
  sb    R0, 0x3c(SP)
  sb    R0, 0x38(SP)
  blez  S2, L8010F70C
   move  S1, R0
  addiu A2, SP, 0x38
  li    A3, 24
  addiu A1, SP, 0x20
L8010F6C4:
  sll   A0, S1, 2
  addu  A0, A2, A0
  sb    A3, 0(A0)
  addu  V0, A1, S1
  lb    V1, 0(V0)
  sll   V0, V1, 1
  addu  V0, V0, V1
  sll   V0, V0, 2
  addu  V0, V0, V1
  sll   V0, V0, 2
  lui   AT, hi(p1_char)
  addu  AT, AT, V0
  lbu   V0, lo(p1_char)(AT)
  sb    V0, 1(A0)
  addiu S1, S1, 1
  slt   V0, S1, S2
  bnez  V0, L8010F6C4
   sb    R0, 2(A0)
L8010F70C:
  lh    V0, 2(S7)
  sll   V1, V0, 1
  lui   A0, hi(D_8011259C)
  addu  A0, A0, V1
  lh    A0, lo(D_8011259C)(A0)
  sll   V0, V0, 2
  addiu V1, S2, 1
  lui   A1, hi(D_80112584)
  addu  A1, A1, V0
  lw    A1, lo(D_80112584)(A1)
  addiu V0, SP, 0x40
  sw    V0, 0x10(SP)
  addiu V0, SP, 0x44
  sw    V0, 0x14(SP)
  sw    R0, 0x18(SP)
  addu  A1, V1, A1
  addiu A2, SP, 0x38
  jal   func_80056368
   addiu A3, SP, 0x3c
  jal   func_80056458
   nop
  lh    V1, 2(S7)
  li    V0, 4
  bne   V1, V0, L8010F778
   nop
  jal   func_80056458
   nop
L8010F778:
  jal   func_80056144
   li    S3, -1
  jal   func_80056168
   move  S1, R0
  blez  S2, L8010F7DC
   move  A1, R0
  addiu A2, SP, 0x20
  addu  V0, A2, S1
L8010F798:
  lb    V1, 0(V0)
  sll   V0, V1, 1
  addu  V0, V0, V1
  sll   V0, V0, 2
  addu  V0, V0, V1
  sll   V0, V0, 2
  lui   A0, hi(p1_coins)
  addu  A0, A0, V0
  lh    A0, lo(p1_coins)(A0)
  slt   V0, A1, A0
  beqz  V0, L8010F7D0
   addiu S1, S1, 1
  move  S3, V1
  move  A1, A0
L8010F7D0:
  slt   V0, S1, S2
  bnez  V0, L8010F798
   addu  V0, A2, S1
L8010F7DC:
  blez  S2, L8010F8DC
   move  S1, R0
  addiu S4, SP, 0x20
  sll   V0, S3, 1
  addu  V0, V0, S3
  sll   V0, V0, 2
  addu  V0, V0, S3
  sll   S5, V0, 2
  addu  V0, S4, S1
L8010F800:
  lb    A1, 0(V0)
  sll   V0, A1, 1
  addu  V0, V0, A1
  sll   V0, V0, 2
  addu  V0, V0, A1
  sll   V0, V0, 2
  lui   AT, hi(p1_coins)
  addu  AT, AT, V0
  lh    V0, lo(p1_coins)(AT)
  slti  V0, V0, 5
  bnez  V0, L8010F83C
   addu  S0, S4, S1
  jal   func_800797DC
   li    A0, 252
  addu  S0, S4, S1
L8010F83C:
  lb    A0, 0(S0)
  jal   func_80067170
   li    A1, 3
  lb    A0, 0(S0)
  sll   V0, A0, 1
  addu  V0, V0, A0
  sll   V0, V0, 2
  addu  V0, V0, A0
  sll   V0, V0, 2
  lui   A1, hi(p1_coins)
  addu  A1, A1, V0
  lh    A1, lo(p1_coins)(A1)
  jal   func_8004CA14
   SUBU A1 R0 A1
  lb    V0, 0(S0)
  bne   S3, V0, L8010F89C
   addu  V0, S4, S1
  lui   A1, hi(p1_coins)
  addu  A1, A1, S5
  lh    A1, lo(p1_coins)(A1)
  move  A0, S3
  SUBU  A1 R0 A1
  j     L8010F8C8
   li    A2, 1
L8010F89C:
  lb    A0, 0(V0)
  sll   V0, A0, 1
  addu  V0, V0, A0
  sll   V0, V0, 2
  addu  V0, V0, A0
  sll   V0, V0, 2
  lui   A1, hi(p1_coins)
  addu  A1, A1, V0
  lh    A1, lo(p1_coins)(A1)
  SUBU  A1 R0 A1
  move  A2, R0
L8010F8C8:
  jal   func_8006135C
   addiu S1, S1, 1
  slt   V0, S1, S2
  bnez  V0, L8010F800
   addu  V0, S4, S1
L8010F8DC:
  li    A0, 5
  jal   func_800508E4
   li    A1, 2
  jal   func_8007D9E0
   li    A0, 30
L8010F8F0:
  beqz  FP, L8010F908
   move  A0, R0
  lui   A0, hi(D_800F93C6)
  jal   func_8004655C
   lh    A0, lo(D_800F93C6)(A0)
  move  A0, R0
L8010F908:
  jal   func_800508E4
   li    A1, 2
L8010F910:
  lw    RA, 0x8c(SP)
  lw    FP, 0x88(SP)
  lw    S7, 0x84(SP)
  lw    S6, 0x80(SP)
  lw    S5, 0x7c(SP)
  lw    S4, 0x78(SP)
  lw    S3, 0x74(SP)
  lw    S2, 0x70(SP)
  lw    S1, 0x6c(SP)
  lw    S0, 0x68(SP)
  jr    RA
   addiu SP, SP, 0x90

func_8010F940:
  addiu SP, SP, -0x28
  sw    RA, 0x24(SP)
/*  */  sw    S4, 0x20(SP)
  sw    S3, 0x1c(SP)
  sw    S2, 0x18(SP)
  sw    S1, 0x14(SP)
  li    AT, 0x40C00000 ;6.000000
  mtc1  AT, F12
  nop
  jal   func_8005A358
   sw    S0, 0x10(SP)
  move  S3, V0
  slti  V0, S3, 5
  beql  V0, R0, L8010F97C
   li    S3, -1
L8010F97C:
  li    V0, -1
  beql  S3, V0, L8010FB1C
   li    A0, -1
  li    A0, 1
  jal   func_8007FA6C
   li    A1, 5
  move  S2, V0
  sll   V0, S3, 1
  lui   AT, hi(D_800CAFD8)
  addu  AT, AT, V0
  lhu   V0, lo(D_800CAFD8)(AT)
  sll   V0, V0, 2
  lui   A0, hi(D_800CCBDC)
  addu  A0, A0, V0
  lw    A0, lo(D_800CCBDC)(A0)
  jal   func_80017680
   sll   S1, S2, 0x10
  move  S0, V0
  jal   func_80082800
   move  A0, S0
  move  S4, V0
  jal   func_80017800
   move  A0, S0
  sll   S0, S2, 0x10
  sra   S0, S0, 0x10
  sll   A2, S4, 0x10
  move  A0, S0
  move  A1, R0
  sra   A2, A2, 0x10
  jal   func_8008218C
   move  A3, R0
  move  A0, S0
  move  A1, R0
  jal   func_80082384
   li    A2, 10
  move  A0, S0
  move  A1, R0
  jal   func_8008225C
   move  A2, R0
  move  A0, S0
  move  A1, R0
  jal   func_80082418
   li    A2, 4096
  move  A0, S0
  move  A1, R0
  li    A2, 160
  jal   func_80081AD0
   li    A3, 90
  move  A0, S0
  move  A1, R0
  jal   func_80082488
   move  A2, R0
  move  S0, R0
  sll   A2, S0, 1
L8010FA54:
  addu  A2, A2, S0
  sll   A2, A2, 3
  addu  A2, A2, S0
  sra   A0, S1, 0x10
  move  A1, R0
  jal   func_80082488
   andi  A2, A2, 0xffff
  jal   func_8007DA44
   addiu S0, S0, 1
  slti  V0, S0, 0xa
  bnez  V0, L8010FA54
   sll   A2, S0, 1
  sll   S0, S2, 0x10
  sra   S0, S0, 0x10
  move  A0, S0
  move  A1, R0
  jal   func_80082488
   li    A2, 256
  li    A0, -1
  li    A1, 5
  jal   func_8005DD68
   move  A2, R0
  jal   func_8007D9E0
   li    A0, 50
  li    A0, -1
  li    A1, -1
  jal   func_8005DD68
   li    A2, 2
  jal   func_8007D9E0
   li    A0, 10
  sll   A0, S4, 0x10
  jal   func_80082660
   sra   A0, A0, 0x10
  jal   func_8007F8B0
   move  A0, S0
  lui   V1, hi(D_800F93C6)
  lh    V1, lo(D_800F93C6)(V1)
  sll   V0, V1, 1
  addu  V0, V0, V1
  sll   V0, V0, 2
  addu  V0, V0, V1
  sll   V0, V0, 2
  sll   V1, S3, 1
  lui   AT, hi(D_800CAFD9)
  addu  AT, AT, V1
  lbu   V1, lo(D_800CAFD9)(AT)
  lui   AT, hi(p1_item)
  addu  AT, AT, V0
  j     L8010FB30
   sb    V1, lo(p1_item)(AT)
L8010FB1C:
  li    A1, 3
  jal   func_8005DD68
   move  A2, R0
  jal   func_8007D9E0
   li    A0, 50
L8010FB30:
  lw    RA, 0x24(SP)
  lw    S4, 0x20(SP)
  lw    S3, 0x1c(SP)
  lw    S2, 0x18(SP)
  lw    S1, 0x14(SP)
  lw    S0, 0x10(SP)
  jr    RA
   addiu SP, SP, 0x28

overlaycall4:
  addiu SP, SP, -0x18
  sw    RA, 0x10(SP)
  jal   func_80020070
   li    A0, 2
  lui   A1, hi(D_80112914)
  addiu A1, A1, lo(D_80112914)
  jal   func_80020324
   li    A0, 1
  jal   setup_routine
   nop
  jal   func_80066C34
   li    A0, 2
  lui   A0, hi(func_80102FFC)
  addiu A0, A0, lo(func_80102FFC)
  li    A1, 4101
  li    A2, 4096
  jal   InitProcess
   move  A3, R0
  lw    RA, 0x10(SP)
  jr    RA
   addiu SP, SP, 0x18

func_80111338:
  addiu SP, SP, -0x18
  sw    RA, 0x14(SP)
  jal   func_8005DC30
   sw    S0, 0x10(SP)
  sll   V0, V0, 0x10
  sra   S0, V0, 0x10
  lui   A0, hi(D_800F93A8)
  addiu A0, A0, lo(D_800F93A8)
  sll   V0, S0, 1
  addu  V0, V0, S0
  sll   V0, V0, 2
  addu  V0, V0, S0
  sll   V0, V0, 2
  lui   AT, hi(p1_item)
  addu  AT, AT, V0
  lbu   V0, lo(p1_item)(AT)
  addiu V0, V0, 1
  sll   V0, V0, 0x18
  sra   V1, V0, 0x18
  sltiu V0, V1, 0xb
  beqz  V0, L80111548
   sll   V0, V1, 2
  lui   AT, hi(D_80113698)
  addu  AT, AT, V0
  lw    V0, lo(D_80113698)(AT)
  jr    V0
   nop
D_801113A4:
  lh    V1, 6(A0)
  lh    V0, 8(A0)
  beq   V1, V0, L8011154C
   li    V0, 1
  jal   func_8005694C
   li    A0, 80
  sll   V0, V0, 0x10
  bnez  V0, L8011154C
   li    V0, 1
D_801113C8:
  j     L8011154C
   move  V0, R0
D_801113D0:
  lh    V1, 6(A0)
  lh    V0, 8(A0)
  beql  V1, V0, L8011154C
   li    V0, 1
  lui   A0, hi(D_80112F24)
  jal   func_80044800
   addiu A0, A0, lo(D_80112F24)
  j     func_801114F4
   sll   V0, V0, 0x10
D_801113F4:
  lh    V1, 6(A0)
  lh    V0, 8(A0)
  beql  V1, V0, L8011154C
   li    V0, 1
  lui   A0, hi(D_80112F84)
  jal   func_80044800
   addiu A0, A0, lo(D_80112F84)
  j     func_801114F4
   sll   V0, V0, 0x10
D_80111418:
  lui   A0, hi(D_80113248)
  jal   func_80044800
   addiu A0, A0, lo(D_80113248)
  j     func_801114F4
   sll   V0, V0, 0x10
D_8011142C:
  move  A0, R0
L80111430:
  beq   A0, S0, L80111470
   sll   V0, A0, 1
  addu  V0, V0, A0
  sll   V0, V0, 2
  addu  V0, V0, A0
  sll   V0, V0, 2
  lui   AT, hi(p1_item)
  addu  AT, AT, V0
  lb    V0, lo(p1_item)(AT)
  nor   V1, R0, V0
  sltu  V1, R0, V1
  xori  V0, V0, 3
  sltu  V0, R0, V0
  and   V1, V1, V0
  bnez  V1, L80111480
   li    V0, 4
L80111470:
  addiu A0, A0, 1
  slti  V0, A0, 4
  bnez  V0, L80111430
   li    V0, 4
L80111480:
  bne   A0, V0, L8011154C
   li    V0, 1
  j     L8011154C
   move  V0, R0
D_80111490:
  sll   V0, S0, 1
  addu  V0, V0, S0
  sll   V0, V0, 2
  addu  V0, V0, S0
  sll   V0, V0, 2
  lui   AT, hi(p1_coins)
  addu  AT, AT, V0
  lh    V0, lo(p1_coins)(AT)
  j     func_801114F4
   slti  V0, V0, 5
D_801114B8:
  lui   A0, hi(D_801133BC)
  jal   func_80044800
   addiu A0, A0, lo(D_801133BC)
  sll   V0, V0, 0x10
  bnez  V0, L8011154C
   move  V0, R0
  sll   V0, S0, 1
  addu  V0, V0, S0
  sll   V0, V0, 2
  addu  V0, V0, S0
  sll   V0, V0, 2
  lui   AT, hi(p1_coins)
  addu  AT, AT, V0
  lh    V0, lo(p1_coins)(AT)
  slti  V0, V0, 0x14
func_801114F4:
  beqz  V0, L8011154C
   li    V0, 1
  j     L8011154C
   move  V0, R0
D_80111504:
  sll   V0, S0, 1
  addu  V0, V0, S0
  sll   V0, V0, 2
  addu  V0, V0, S0
  sll   V0, V0, 2
  lui   AT, hi(p1_coins)
  addu  AT, AT, V0
  lh    V0, lo(p1_coins)(AT)
  slti  V0, V0, 0xa
  beqz  V0, L8011154C
   li    V0, 1
  lui   V0, hi(D_800F93AE)
  addiu V0, V0, lo(D_800F93AE)
  lh    V1, 0(V0)
  lh    V0, 2(V0)
  bne   V1, V0, L8011154C
   move  V0, R0
L80111548:
  li    V0, 1
L8011154C:
  lw    RA, 0x14(SP)
  lw    S0, 0x10(SP)
  jr    RA
   addiu SP, SP, 0x18

func_8011155C:
  addiu SP, SP, -0x40
  sw    RA, 0x38(SP)
  sw    S7, 0x34(SP)
  sw    S6, 0x30(SP)
  sw    S5, 0x2c(SP)
  sw    S4, 0x28(SP)
  sw    S3, 0x24(SP)
  sw    S2, 0x20(SP)
  sw    S1, 0x1c(SP)
  sw    S0, 0x18(SP)
  lui   S4, hi(D_800F93A8)
  addiu S4, S4, lo(D_800F93A8)
  jal   func_8005DC3C
   li    A0, -1
  move  S3, V0
  li    S2, -1
  lbu   V0, 4(S3)
  move  V1, V0
  lui   AT, hi(D_80113588)
  addu  AT, AT, V0
  lbu   V0, lo(D_80113588)(AT)
  blez  V0, L8011167C
   move  S1, R0
  lui   S7, hi(D_80113510)
  addiu S7, S7, lo(D_80113510)
  li    S6, -1
  lui   S5, hi(D_80113570)
  addiu S5, S5, lo(D_80113570)
  sll   V0, V1, 2
L801115D0:
  addu  V0, V0, S7
  lw    V0, 0(V0)
  addu  V0, V0, S1
  lbu   S0, 0(V0)
  jal   func_80109A78
   move  A0, S0
  move  S2, V0
  beql  S2, S6, L80111660
   addiu S1, S1, 1
  lui   A0, hi(D_800CC000)
  addu  A0, A0, S0
  lbu   A0, lo(D_800CC000)(A0)
  addiu A0, A0, 0x14
  lh    V1, 0x1e(S4)
  sll   V0, V1, 1
  addu  V0, V0, V1
  sll   V0, V0, 2
  addu  V0, V0, V1
  sll   V0, V0, 2
  lui   AT, hi(p1_coins)
  addu  AT, AT, V0
  lh    V0, lo(p1_coins)(AT)
  slt   V0, V0, A0
  bnel  V0, R0, L80111660
   addiu S1, S1, 1
  lbu   V0, 4(S3)
  sll   V0, V0, 2
  addu  V0, V0, S5
  lw    V0, 0(V0)
  addu  V0, V0, S1
  jal   func_8005694C
   lb    A0, 0(V0)
  sll   V0, V0, 0x10
  bnez  V0, L8011167C
   nop
  addiu S1, S1, 1
L80111660:
  lbu   V1, 4(S3)
  lui   V0, hi(D_80113588)
  addu  V0, V0, V1
  lbu   V0, lo(D_80113588)(V0)
  slt   V0, S1, V0
  bnez  V0, L801115D0
   sll   V0, V1, 2
L8011167C:
  lbu   V0, 4(S3)
  lui   AT, hi(D_80113588)
  addu  AT, AT, V0
  lbu   V0, lo(D_80113588)(AT)
  beql  S1, V0, L80111694
   li    S2, -1
L80111694:
  li    V0, -1
  beq   S2, V0, L801116FC
   nop
  jal   func_80109A78
   li    A0, 9
  beq   V0, S2, L801118AC
   addiu V0, S2, 1
  jal   func_80109A78
   li    A0, 7
  bne   V0, S2, L801116FC
   nop
  lui   A0, hi(D_800CC007)
  lbu   A0, lo(D_800CC007)(A0)
  addiu A0, A0, 0x32
  lh    V1, 0x1e(S4)
  sll   V0, V1, 1
  addu  V0, V0, V1
  sll   V0, V0, 2
  addu  V0, V0, V1
  sll   V0, V0, 2
  lui   AT, hi(p1_coins)
  addu  AT, AT, V0
  lh    V0, lo(p1_coins)(AT)
  slt   V0, V0, A0
  beqz  V0, L801118AC
   addiu V0, S2, 1
L801116FC:
  lui   A0, hi(D_8011341C)
  jal   func_80044800
   addiu A0, A0, lo(D_8011341C)
  sll   V0, V0, 0x10
  bnez  V0, L80111768
   li    V0, -1
  lh    V1, 0x1e(S4)
  sll   V0, V1, 1
  addu  V0, V0, V1
  sll   V0, V0, 2
  addu  V0, V0, V1
  sll   V0, V0, 2
  lui   AT, hi(p1_coins)
  addu  AT, AT, V0
  lh    V0, lo(p1_coins)(AT)
  lui   V1, hi(D_800CC001)
  lbu   V1, lo(D_800CC001)(V1)
  slt   V0, V0, V1
  bnez  V0, L80111768
   li    V0, -1
  jal   func_80109A78
   li    A0, 1
  move  V1, V0
  li    V0, -1
  bne   V1, V0, L801118AC
   addiu V0, V1, 1
  li    V0, -1
L80111768:
  bne   S2, V0, L801118AC
   addiu V0, S2, 1
  lui   A0, hi(D_80113434)
  jal   func_80044800
   addiu A0, A0, lo(D_80113434)
  sll   V0, V0, 0x10
  sra   S1, V0, 0x10
  bnez  S1, L80111864
   nop
  lbu   V0, 4(S3)
  move  V1, V0
  lui   AT, hi(D_80113588)
  addu  AT, AT, V0
  lbu   V0, lo(D_80113588)(AT)
  slt   V0, S1, V0
  beqz  V0, L80111864
   sll   V0, V1, 2
  lui   S7, hi(D_80113510)
  addiu S7, S7, lo(D_80113510)
  li    S6, -1
  lui   S5, hi(D_80113570)
  addiu S5, S5, lo(D_80113570)
L801117C0:
  addu  V0, V0, S7
  lw    V0, 0(V0)
  addu  V0, V0, S1
  lbu   S0, 0(V0)
  jal   func_80109A78
   move  A0, S0
  move  S2, V0
  beql  S2, S6, L80111848
   addiu S1, S1, 1
  lui   A0, hi(D_800CC000)
  addu  A0, A0, S0
  lbu   A0, lo(D_800CC000)(A0)
  lh    V1, 0x1e(S4)
  sll   V0, V1, 1
  addu  V0, V0, V1
  sll   V0, V0, 2
  addu  V0, V0, V1
  sll   V0, V0, 2
  lui   AT, hi(p1_coins)
  addu  AT, AT, V0
  lh    V0, lo(p1_coins)(AT)
  slt   V0, V0, A0
  bnel  V0, R0, L80111848
   addiu S1, S1, 1
  lbu   V0, 4(S3)
  sll   V0, V0, 2
  addu  V0, V0, S5
  lw    V0, 0(V0)
  addu  V0, V0, S1
  jal   func_8005694C
   lb    A0, 0(V0)
  sll   V0, V0, 0x10
  bnez  V0, L801118A8
   addiu S1, S1, 1
L80111848:
  lbu   V1, 4(S3)
  lui   V0, hi(D_80113588)
  addu  V0, V0, V1
  lbu   V0, lo(D_80113588)(V0)
  slt   V0, S1, V0
  bnez  V0, L801117C0
   sll   V0, V1, 2
L80111864:
  lh    V1, 2(S4)
  li    V0, 4
  bne   V1, V0, L80111888
   li    V0, 1
  lui   AT, hi(D_801134C4)
  jal   func_80109AE4
   sw    V0, lo(D_801134C4)(AT)
  j     L801118AC
   addiu V0, V0, 2
L80111888:
  jal   func_80109A78
   move  A0, R0
  move  S2, V0
  li    V0, -1
  bne   S2, V0, L801118AC
   addiu V0, S2, 1
  j     L801118AC
   li    V0, 1
L801118A8:
  addiu V0, S2, 1
L801118AC:
  lw    RA, 0x38(SP)
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

func_801118D8:
  addiu SP, SP, -0x18
  sw    RA, 0x10(SP)
  lui   V0, hi(D_801134C4)
  lw    V0, lo(D_801134C4)(V0)
  bnel  V0, R0, L8011190C
   li    V0, 2
  lui   A0, hi(D_801134A0)
  jal   func_80044800
   addiu A0, A0, lo(D_801134A0)
  sll   V0, V0, 0x10
  sra   V0, V0, 0x10
  j     L80111914
   addiu V0, V0, 1
L8011190C:
  lui   AT, hi(D_801134C4)
  sw    R0, lo(D_801134C4)(AT)
L80111914:
  lw    RA, 0x10(SP)
  jr    RA
   addiu SP, SP, 0x18

.align 16

; data

D_80111920:
.halfword 0, 0
.word overlaycall0
.halfword 1, 0
.word overlaycall1
.halfword 2, 0
.word overlaycall2
.halfword 3, 0
.word overlaycall3
.halfword 4, 0
.word overlaycall4
.halfword -1, 0

.align 16

; probably relates to star selection order.
shuffle_order:
.halfword ${shuffleData.order.join(",")}
.align 4

shuffle_bias:
.halfword ${shuffleData.bias.join(",")}
.align 4

D_80111970:
.halfword 0x0006 0xFFFF
.align 4

D_80111974:
.halfword 0x0046 0x0047 0x0048 0x0049 0x004A 0x004B 0x004C 0x0000
.align 4

D_80111984:
.halfword ${starIndices.join(",") || 0}
.align 4

; Toads stand on these spaces
D_80111994:
.halfword ${toadIndices.join(",") || 0}
.align 4

; Toad faces
D_801119A4: .halfword 0x0008 0x0039

D_801119A8: .halfword 0x0008 0x003A

;toad animation speed "By the way, Baby Bowser is over here..."
D_801119AC:
.word 0x40A00000
.word 0x40A00000
.word 0x40000000
.word 0x40000000
.word 0x40400000
.word 0x40A00000
.word 0x40A00000
.word 0x40A00000
.word 0x40A00000

D_801119D0: .word 0x00000000

D_801119D4:
.word 0x3C465055
.word 0x46505A5F
.word 0x505A5F5F

D_801119E0: .word 0x00000000

; hidden blocks cant spawn on these blue spaces
D_801119E4: .halfword -1
.align 4

; star spaces that you walk over
D_801119F4:
.halfword ${starIndices.join(",") || 0} 0xFFFF
.align 4

D_80111A04: .halfword 0x0003
D_80111A06: .halfword 0xFFFC
D_80111A08: .halfword 0xFFFE
D_80111A0A: .halfword 0xFFFE
D_80111A0C: .halfword 0x0002
D_80111A0E: .halfword 0xFFFA
D_80111A10: .halfword 0x0000
D_80111A12: .halfword 0x0000
D_80111A14: .halfword 0x0000
D_80111A16: .halfword 0xFFFC
D_80111A18: .halfword 0x0004
D_80111A1A: .halfword 0x0000
D_80111A1C: .halfword 0x0001
D_80111A1E: .halfword 0xFFFA

D_80111A20: .halfword 0xFFFE
D_80111A22: .halfword 0x0000
D_80111A24: .halfword 0x0002
D_80111A26: .halfword 0x0000

D_80111A28: .halfword 0x0000
D_80111A2A: .halfword 0xFFFE
D_80111A2C: .halfword 0x0004
D_80111A2E: .halfword 0x0000

D_80111A30: .halfword 0x0000
D_80111A32: .halfword 0xFFFC

D_80111A34: .halfword 0x0000
D_80111A36: .halfword 0x0000
D_80111A38: .halfword 0x0000
D_80111A3A: .halfword 0xFFFD

; gate related
D_80111A3C: .halfword 0x00A9

D_80111A3E: .halfword 0x0031
D_80111A40: .halfword 0x00AA
D_80111A42: .halfword 0x0029

D_80111A44:
.halfword ${toadIndices.join(",") || 0}
.align 4

D_80111A54:
.halfword 0x0046 0x0047 0x0048 0x0049 0x004A 0x004B 0x004C 0x0000

D_80111A64: .word 0xFFFFFFFF

D_80111A68:
.halfword ${booIndices.join(",")}
.align 4

D_80111A6C:
.halfword ${bankCoinSpaces.join(",")}
.align 4

; bank coin coordinates?
D_80111A70:
.word 0x00000000 0x00000000 0x00000000 0xC0400000
.word 0x40000000 0xC0000000 0x3F800000 0x40B00000
.word 0xC0400000 0x40600000 0x41000000 0x40800000
.word 0xBF800000 0x41400000 0x41300000

D_80111AAC: .word 0x00000000 0x00000000

D_80111AB4:
.word 0x00000000 0x00000000 0x00000000 0x00000000
.word 0xC1700000 0x00000000 0x00000000 0x41A00000
.word 0x00000000 0xC1F00000 0x42340000 0x00000000 0x42340000

; gate spaces
D_80111AE8:
.halfword 0x0094 0x0095

D_80111AEC: .byte 0x00
D_80111AED: .byte 0x73
D_80111AEE: .halfword 0x007C
D_80111AF0: .halfword 0x0080
D_80111AF2: .halfword 0x0081
D_80111AF4: .halfword 0x0082
D_80111AF6: .halfword 0x0083

D_80111AF8: .word 0x0000039B
D_80111AFC: .word 0x000003B0
D_80111B00: .word 0x000003CF
D_80111B04: .word 0x000003CA
D_80111B08: .word 0x000003F0
D_80111B0C: .word 0x00000405
D_80111B10: .word 0xFFFFFFFF
D_80111B14: .word 0xFFFFFFFF
D_80111B18: .word 0xFFFFFFFF

D_80111B1C: .halfword 0xFFFF

D_80111B1E: .halfword 0xFFFF

D_80111B20: .word 0xFFFFFFFF
D_80111B24: .word 0xFFFFFFFF
D_80111B28: .word 0xFFFFFFFF
D_80111B2C: .word 0x000003F1
D_80111B30: .word 0xFFFFFFFF
D_80111B34: .word 0xFFFFFFFF
D_80111B38: .word 0xFFFFFFFF
D_80111B3C: .word 0xFFFFFFFF

D_80111B40: .word 0xFFFFFFFF
D_80111B44: .word 0xFFFFFFFF
D_80111B48: .word 0xFFFFFFFF
D_80111B4C: .word 0xFFFFFFFF
D_80111B50: .word 0x00000028
D_80111B54: .word 0xFFFFFFFF
D_80111B58: .word 0xFFFFFFFF
D_80111B5C: .word 0xFFFFFFFF
D_80111B60: .word 0xFFFFFFFF

D_80111B64: .word 0x0000039C
D_80111B68: .word 0xFFFFFFFF
D_80111B6C: .word 0x000003D0
D_80111B70: .word 0xFFFFFFFF
D_80111B74: .word 0xFFFFFFFF
D_80111B78: .word 0xFFFFFFFF
D_80111B7C: .word 0xFFFFFFFF
D_80111B80: .word 0xFFFFFFFF
D_80111B84: .word 0xFFFFFFFF

; bank model spaces
D_80111B88:
.halfword ${bankSpaces.join(",")}
.align 4

; shop model spaces
D_80111B8C:
.halfword ${itemShopSpaces.join(",")}
.align 4

; train related somehow
D_80111B90:
.halfword 0x0013, 0x0014, 0x0015, 0
.align 4

D_80111B98: .word 0x002D0034 0x00350036 0x00370038 0x0039003A 0x003B003D 0x003E003F 0x00400041
.align 4

D_80111BB4: .word 0x00440045 0x00460048 0x0049004A 0x004B004C 0x004D004E 0x004F0050 0x00520000
.align 4

D_80111BD0: .word 0x00550056 0x00570058 0x0059005A 0x005B005D 0x005E005F 0x00600061 0x0065005C 0x00670072 0x007D0000
.align 4

D_80111BF4:
.word D_80111B98
.word D_80111BB4
.word D_80111BD0

D_80111C00: .word 0x41A00000

D_80111C04: .word 0x00000000

D_80111C08: .word 0x00000000
D_80111C0C: .word 0x00000000
D_80111C10: .word 0x00000000
D_80111C14: .word 0x41A00000
D_80111C18: .word 0xC1A00000
D_80111C1C: .word 0x00000000
D_80111C20: .word 0x00000000

; AI table(s)
D_80111C24: .word 0x04000000 0x00000000 0x00006446
D_80111C30: .word 0x00000000 0x00000000 0x00003232
D_80111C3C: .word 0x02000000 0x00000001 0x00006446
D_80111C48: .word 0x02000000 0x00000054 0x00016446
D_80111C54: .word 0x02000000 0x0000000A D_80111C24
D_80111C60: .word 0x00000000 0x00000000 0x00003232
D_80111C6C: .word 0x02000000 0x00000008 0x00016446
D_80111C78: .word 0x09000000 0x00000008 0x00006446
D_80111C84: .word 0x00000000 0x00000000 0x00003232

; an AI decision tree
D_80111F60:
.word 0x00000000 0x00000000 0x00003232

; an AI decision tree
D_80111F6C:
.word 0x0E000000 0x00080007 0x00003232
.word 0x00000000 0x00000000 0x00004646
D_80111F84:
.word 0x0E000000 0x00020012 D_80111F6C
.word 0x00000000 0x00000000 0x00014646

D_80112160: .word 0x02000000 0x0000000E 0x00016464
D_8011216C: .word 0x00000000 0x00000000 0x00006464
D_80112178: .word 0x02000000 0x00000040 0x00016464
D_80112184: .word 0x10000000 0x00000001 D_80112160
D_80112190: .word 0x00000000 0x00000000 0x00006464

D_801122A4: .byte 0x02 0x05 0x0F 0x14

D_801122A8:
.word 0x00010001 func_80108E0C
.word 0 0

D_801122B8:
.word 0x00010001 func_8010964C
.word 0 0

D_801122C8: .word 0x00000101
D_801122CC: .word 0x01020303
D_801122D0: .word 0x04050606

D_801122D4: .word 0x01061001
D_801122D8: .word 0x0B150110
D_801122DC: .word 0x24000000

D_801122E0: .word 0x0001FFFF
D_801122E4: .word 0xFF000106
D_801122E8: .word 0xFFFF0001
D_801122EC: .word 0x0206FF00
D_801122F0: .word 0x010406FF
D_801122F4: .word 0x00010204
D_801122F8: .word 0x06000104
D_801122FC: .word 0x05060001
D_80112300: .word 0x05060900

D_80112304: .word 0x000001F2
D_80112308: .word 0x000001F3
D_8011230C: .word 0x000001F4
D_80112310: .word 0x000001F5
D_80112314: .word 0x000001F6
D_80112318: .word 0x000001F7
D_8011231C: .word 0x000001F8

D_80112320: .word 0x00010001 func_80109B30
D_80112328: .word 0x00000000 0x00000000

D_80112330: .word 0x01020300
D_80112334: .word 0x02030001
D_80112338: .word 0x03000102

D_8011233C: .word 0x42980000

D_80112340: .word 0x42500000
D_80112344: .word 0x43740000
D_80112348: .word 0x42500000
D_8011234C: .word 0x42980000
D_80112350: .word 0x43400000
D_80112354: .word 0x43740000
D_80112358: .word 0x43400000

D_8011235C: .word 0xBF800000
D_80112360: .word 0xBF800000
D_80112364: .word 0x3F800000
D_80112368: .word 0xBF800000
D_8011236C: .word 0xBF800000
D_80112370: .word 0x3F800000
D_80112374: .word 0x3F800000
D_80112378: .word 0x3F800000

D_8011237C: .word 0x00000086
D_80112380: .word 0x00000087
D_80112384: .word 0x00000088
D_80112388: .word 0x00000089
D_8011238C: .word 0x0000008A
D_80112390: .word 0x0000008B

D_80112394: .byte 0x01
D_80112395: .byte 0x05
D_80112396: .byte 0x0F
D_80112397: .byte 0x06
D_80112398: .word 0x0F191019
D_8011239C: .word 0x1B1A231E
D_801123A0: .word 0x242D202E
D_801123A4: .word 0x32230000

D_801123A8: .byte 0
D_801123A9: .byte 0
D_801123AA: .byte 0
D_801123AB: .byte 1
D_801123AC: .word 0x0A010B0B
D_801123B0: .word 0x040C1402
D_801123B4: .word 0x15150416
D_801123B8: .word 0x1E031F28
D_801123BC: .word 0x04292C05
D_801123C0: .word 0x2D2E0233
D_801123C4: .word 0x3806393D
D_801123C8: .word 0x053E4607
D_801123CC: .word 0x47470848
D_801123D0: .word 0xFF090000

D_801123D4: .byte 0x01
D_801123D5: .byte 0x05
D_801123D6: .byte 0x06
D_801123D7: .byte 0x09

D_801123D8: .word 0x0701050A
D_801123DC: .word 0x0C080105
D_801123E0: .word 0x0D0E0901
D_801123E4: .word 0x050F0F0A
D_801123E8: .word 0x060F1013
D_801123EC: .word 0x07060F14
D_801123F0: .word 0x1608060F
D_801123F4: .word 0x17180906
D_801123F8: .word 0x0F19190A
D_801123FC: .word 0x10191215
D_80112400: .word 0x07101916
D_80112404: .word 0x18081019
D_80112408: .word 0x191A0910
D_8011240C: .word 0x191B1B0A
D_80112410: .word 0x1A231518
D_80112414: .word 0x071A2319
D_80112418: .word 0x1B081A23
D_8011241C: .word 0x1C1D091A
D_80112420: .word 0x231E1E0A
D_80112424: .word 0x242D171A
D_80112428: .word 0x07242D1B
D_8011242C: .word 0x1D08242D
D_80112430: .word 0x1E1F0924
D_80112434: .word 0x2D20200A
D_80112438: .word 0x2E321A1D

D_8011243C: .byte 0x07
D_8011243D: .byte 0x2E

D_8011243E: .byte 0x32
D_8011243F: .byte 0x1E
D_80112440: .word 0x20082E32
D_80112444: .word 0x2122092E
D_80112448: .word 0x3223230A
D_8011244C: .word 0x06BB06BC
D_80112450: .word 0x06BD06BE

;D_80112454:
;.word 0x00010001 func_8010BA48
;.word 0 0

;D_80112464:
;.word 0x00010001 func_8010C44C
;.word 0 0

;D_80112474:
;.word 0x00010001 func_8010C468
;.word 0 0

; An event table
; D_80112484:
; .word 0x00370000 D_801122A8 ; star spaces
; .word 0x00480000 D_801122A8
; .word 0x00870000 D_801122A8
; .word 0x008E0000 D_801122A8
; .word 0x007E0000 D_801122A8
; .word 0x005A0000 D_801122A8
; .word 0x002F0000 D_801122A8
; .word 0x008A0000 D_801122B8 ; bank spaces
; .word 0x005E0000 D_801122B8
; .word 0x00A70000 D_80112320 ; item space
; .word 0x00940000 D_80112464 ; gate
; .word 0x00950000 D_80112474 ; gate
; .word 0xFFFF0000 0

; An event table
; D_801124EC:
; .word 0x00AF0000 D_80112454 ; boos
; .word 0x00B40000 D_80112454
; .word 0xFFFF0000 0

.align 8
D_80112504: .word 0x42D80000
D_80112508: .word 0x42240000
.word 0x43740000
.word 0x42240000
.word 0x42D80000
.word 0x43510000
.word 0x43740000
.word 0x43510000

D_80112524: .word 0x43240000
D_80112528: .word 0x42980000
.word 0x430C0000
.word 0x42980000
.word 0x43240000
.word 0x42980000
.word 0x430C0000
.word 0x42980000

D_80112544: .word 0x43040000
D_80112548: .word 0x42780000
.word 0x435C0000
.word 0x42780000
.word 0x43040000
.word 0x43340000
.word 0x435C0000
.word 0x43340000

D_80112564: .word 0x43240000
D_80112568: .word 0x42840000
.word 0x430C0000
.word 0x42840000
.word 0x43240000
.word 0x42840000
.word 0x430C0000
.word 0x42840000

D_80112584:
.word 0x000002C5
.word 0x000002DC
.word 0x000002FA
.word 0x00000317
.word 0x00000337
.word 0x00000357

D_8011259C:
.word 0x001A001B
.word 0x0024001E
.word 0x00230025

D_801125A8: .word 0x0F000000 0x00000028 0x00003214
D_801125B4: .word 0x00000000 0x00000000 0x00003C1E
D_801125C0: .word 0x0E000000 0x0002000A D_801125A8
D_801125CC: .word 0x00000000 0x00000000 0x00000514
D_801125D8: .word 0x0E000000 0x00040002 D_801125A8
D_801125E4: .word 0x0E000000 0x00030005 D_801125A8
D_801125F0: .word 0x0E000000 0x000E0006 D_801125A8
D_801125FC: .word 0x00000000 0x00000000 0x00000514
D_80112608: .word 0x0E000000 0x000E0002 D_801125A8
D_80112614: .word 0x0E000000 0x000C0002 D_801125A8
D_80112620: .word 0x0E000000 0x000B0007 D_801125A8
D_8011262C: .word 0x0E000000 0x00090004 D_801125A8
D_80112638: .word 0x00000000 0x00000000 0x00000514
D_80112644: .word 0x00000000 0x00000000 0x0000000A
D_80112650: .word 0x0E000000 0x000B0004 D_801125A8
D_8011265C: .word 0x0E000000 0x00080007 D_801125A8
D_80112668: .word 0x00000000 0x00000000 0x00000514
D_80112674: .word 0x0E000000 0x00160304 D_801125A8
D_80112680: .word 0x0E000000 0x00110001 D_801125A8
D_8011268C: .word 0x0E000000 0x00100004 D_801125A8
D_80112698: .word 0x00000000 0x00000000 0x00000514
D_801126A4: .word 0x0E000000 0x00120005 D_801125A8
D_801126B0: .word 0x00000000 0x00000000 0x00000514
D_801126BC: .word 0x02000000 0x00000001 D_801125C0
D_801126C8: .word 0x02000000 0x00000002 D_801125D8
D_801126D4: .word 0x02000000 0x00000004 D_80112608
D_801126E0: .word 0x02000000 0x00000008 D_80112644
D_801126EC: .word 0x02000000 0x00000010 D_80112650
D_801126F8: .word 0x02000000 0x00000020 D_80112674
D_80112704: .word 0x02000000 0x00000040 D_801126A4
D_80112710: .word 0x00000000 0x00000000 0x00003232

D_80112760: .word 0x41A00000
D_80112764: .word 0xC0A00000
.word 0x41F00000
.word 0xC0A00000
.word 0x41A00000
.word 0x40A00000
.word 0x41F00000
.word 0x40A00000

D_80112780: .word 0x02000000 0x0000006A 0x00006446
D_8011278C: .word 0x02000000 0x00000001 0x0001645A
D_80112798: .word 0x00000000 0x00000000 0x00003232
D_801127A4: .word 0x02000000 0x00000075 0x00006446
D_801127B0: .word 0x02000000 0x00000008 0x0001645A
D_801127BC: .word 0x00000000 0x00000000 0x00003232
D_801127C8: .word 0x02000000 0x00000001 0x00006446
D_801127D4: .word 0x02000000 0x00000060 0x0001645A
D_801127E0: .word 0x00000000 0x00000000 0x00003232

D_80112914: .word 0x00000000
.word 0x00000000
.word 0x43A00000
.word 0x43700000

D_80112924: .word 0x0F000000 0x00000019 0x0000001E
D_80112930: .word 0x04000000 0x00000002 0x00005A3C
D_8011293C: .word 0x00000000 0x00000000 0x00000A1E
D_80112948: .word 0x0D000000 0x00170206 D_80112924
D_80112954: .word 0x0D000000 0x00050004 D_80112924
D_80112960: .word 0x0D000000 0x00060002 D_80112924
D_8011296C: .word 0x0F000000 0x00000014 0x0000001E
D_80112978: .word 0x0D000000 0x00020004 0x00005A3C
D_80112984: .word 0x0D000000 0x00010003 0x00005A3C
D_80112990: .word 0x0D000000 0x00070005 0x00005A3C
D_8011299C: .word 0x0D000000 0x00000001 0x00005A3C
D_801129A8: .word 0x00000000 0x00000000 0x00000A1E
D_801129B4: .word 0x0F000000 0x00000019 0x0000001E
D_801129C0: .word 0x04000000 0x00000000 0x00005A3C
D_801129CC: .word 0x00000000 0x00000000 0x00000A1E
D_801129D8: .word 0x0F000000 0x0000001E 0x0000001E
D_801129E4: .word 0x0D000000 0x000E0002 0x00005A3C
D_801129F0: .word 0x0D000000 0x000C0002 0x00005A3C
D_801129FC: .word 0x0D000000 0x000B0007 0x00005A3C
D_80112A08: .word 0x00000000 0x00000000 0x00000A1E
D_80112A14: .word 0x0F000000 0x0000001E 0x0000001E
D_80112A20: .word 0x0D000000 0x000B0004 0x00005A3C
D_80112A2C: .word 0x00000000 0x00000000 0x00000A1E
D_80112A38: .word 0x0D000000 0x00020004 D_801129B4
D_80112A44: .word 0x0D000000 0x00010004 D_801129B4
D_80112A50: .word 0x0D000000 0x00000001 D_801129B4
D_80112A5C: .word 0x0D000000 0x00070205 D_801129B4
D_80112A68: .word 0x0F000000 0x00000005 0x00000000
D_80112A74: .word 0x0D000000 0x00020610 0x00005A3C
D_80112A80: .word 0x0F000000 0x00000014 0x0000001E
D_80112A8C: .word 0x0D000000 0x00030003 0x00005A3C
D_80112A98: .word 0x0D000000 0x00021112 0x00005A3C
D_80112AA4: .word 0x0D000000 0x000A0005 0x00005A3C
D_80112AB0: .word 0x0F000000 0x00000019 0x0000001E
D_80112ABC: .word 0x0D000000 0x000E0304 0x00005A3C
D_80112AC8: .word 0x0D000000 0x00090004 0x00005A3C
D_80112AD4: .word 0x09000000 0x00000004 D_801129D8
D_80112AE0: .word 0x0D000000 0x000E0002 0x00005A3C
D_80112AEC: .word 0x0D000000 0x000C0002 0x00005A3C
D_80112AF8: .word 0x0D000000 0x000B0507 0x00005A3C
D_80112B04: .word 0x09000000 0x00000010 D_80112A14
D_80112B10: .word 0x0D000000 0x000B0004 0x00005A3C
D_80112B1C: .word 0x00000000 0x00000000 0x00000A1E
D_80112B28: .word 0x0F000000 0x00000019 0x0000001E
D_80112B34: .word 0x0D000000 0x000B0004 0x00005A3C
D_80112B40: .word 0x00000000 0x00000000 0x00000A1E
D_80112B4C: .word 0x0F000000 0x00000014 0x0000001E
D_80112B58: .word 0x0D000000 0x00090004 0x00005A3C
D_80112B64: .word 0x0D000000 0x00080007 0x00005A3C
D_80112B70: .word 0x09000000 0x00000010 D_80112B28
D_80112B7C: .word 0x0D000000 0x000B0004 0x00005A3C
D_80112B88: .word 0x00000000 0x00000000 0x00000A1E
D_80112B94: .word 0x0F000000 0x0000001E 0x0000001E
D_80112BA0: .word 0x04000000 0x00000000 0x00005A3C
D_80112BAC: .word 0x00000000 0x00000000 0x00000A1E
D_80112BB8: .word 0x09000000 0x00000002 D_80112B94
D_80112BC4: .word 0x0F000000 0x00000019 0x0000001E
D_80112BD0: .word 0x04000000 0x00000000 0x00005A3C
D_80112BDC: .word 0x00000000 0x00000000 0x00000A1E
D_80112BE8: .word 0x0F000000 0x00000023 0x0000001E
D_80112BF4: .word 0x0D000000 0x000E0002 0x00005A3C
D_80112C00: .word 0x0D000000 0x000C0002 0x00005A3C
D_80112C0C: .word 0x0D000000 0x000B0507 0x00005A3C
D_80112C18: .word 0x00000000 0x00000000 0x00000A1E
D_80112C24: .word 0x0F000000 0x0000001E 0x0000001E
D_80112C30: .word 0x0D000000 0x000E0002 0x00005A3C
D_80112C3C: .word 0x0D000000 0x000C0002 0x00005A3C
D_80112C48: .word 0x0D000000 0x000B0507 0x00005A3C
D_80112C54: .word 0x00000000 0x00000000 0x00000A1E
D_80112C60: .word 0x0F000000 0x00000019 0x0000001E
D_80112C6C: .word 0x0D000000 0x00030005 0x00005A3C
D_80112C78: .word 0x0D000000 0x00040002 0x00005A3C
D_80112C84: .word 0x0D000000 0x000A0005 0x00005A3C
D_80112C90: .word 0x0D000000 0x00021112 0x00005A3C
D_80112C9C: .word 0x0D000000 0x000E0506 0x00005A3C
D_80112CA8: .word 0x0F000000 0x0000001E 0x0000001E
D_80112CB4: .word 0x0D000000 0x000E0304 0x00005A3C
D_80112CC0: .word 0x09000000 0x00000004 D_80112BE8
D_80112CCC: .word 0x0D000000 0x000E0002 0x00005A3C
D_80112CD8: .word 0x0D000000 0x000C0002 0x00005A3C
D_80112CE4: .word 0x0D000000 0x000B0507 0x00005A3C
D_80112CF0: .word 0x00000000 0x00000000 0x00000A1E
D_80112CFC: .word 0x0D000000 0x00020004 D_80112BB8
D_80112D08: .word 0x0D000000 0x00010004 D_80112BB8
D_80112D14: .word 0x0F000000 0x00000005 0x00000000
D_80112D20: .word 0x0D000000 0x00020C10 0x00005A3C
D_80112D2C: .word 0x0F000000 0x00000014 0x0000001E
D_80112D38: .word 0x09000000 0x00000002 D_80112C60
D_80112D44: .word 0x0D000000 0x00030005 0x00005A3C
D_80112D50: .word 0x0D000000 0x00040002 0x00005A3C
D_80112D5C: .word 0x0D000000 0x000A0005 0x00005A3C
D_80112D68: .word 0x0D000000 0x00021112 0x00005A3C
D_80112D74: .word 0x0D000000 0x000E0506 0x00005A3C
D_80112D80: .word 0x0F000000 0x00000019 0x0000001E
D_80112D8C: .word 0x0D000000 0x000E0304 0x00005A3C
D_80112D98: .word 0x09000000 0x00000004 D_80112C24
D_80112DA4: .word 0x0D000000 0x000E0002 0x00005A3C
D_80112DB0: .word 0x0D000000 0x000C0002 0x00005A3C
D_80112DBC: .word 0x0D000000 0x000B0507 0x00005A3C
D_80112DC8: .word 0x00000000 0x00000000 0x00000A1E
D_80112DD4: .word 0x0F000000 0x00000014 0x0000001E
D_80112DE0: .word 0x0D000000 0x00080007 0x00005A3C
D_80112DEC: .word 0x0D000000 0x00010003 0x00005A3C
D_80112DF8: .word 0x0D000000 0x00000001 0x00005A3C
D_80112E04: .word 0x0D000000 0x00070005 0x00005A3C
D_80112E10: .word 0x00000000 0x00000000 0x00000A1E
D_80112E1C: .word 0x0F000000 0x00000019 0x0000001E
D_80112E28: .word 0x04000000 0x00000001 0x00005A3C
D_80112E34: .word 0x00000000 0x00000000 0x00000A1E
D_80112E40: .word 0x0F000000 0x0000000A 0x00000000
D_80112E4C: .word 0x0D000000 0x00170001 0x00005A3C
D_80112E58: .word 0x00000000 0x00000000 0x00000A1E
D_80112E64: .word 0x0D000000 0x00030003 D_80112E1C
D_80112E70: .word 0x0D000000 0x000A0005 D_80112E1C
D_80112E7C: .word 0x0D000000 0x00020B12 D_80112E1C
D_80112E88: .word 0x0F000000 0x00000005 0x00000000
D_80112E94: .word 0x0D000000 0x00060006 0x00005A3C
D_80112EA0: .word 0x0D000000 0x00050004 0x00005A3C
D_80112EAC: .word 0x0D000000 0x00040307 0x00005A3C
D_80112EB8: .word 0x0D000000 0x00170206 0x00005A3C
D_80112EC4: .word 0x09000000 0x00000008 D_80112E40
D_80112ED0: .word 0x0D000000 0x00170001 0x00005A3C
D_80112EDC: .word 0x0F000000 0x00000014 0x0000001E
D_80112EE8: .word 0x0D000000 0x00100003 0x00005A3C
D_80112EF4: .word 0x00000000 0x00000000 0x00000A1E
D_80112F00: .word 0x0D000000 0x00090001 0x00005A3C
D_80112F0C: .word 0x0D000000 0x00080007 0x00005A3C
D_80112F18: .word 0x00000000 0x00000000 0x00000A1E
D_80112F24: .word 0x02000000 0x00000001 D_80112948
D_80112F30: .word 0x02000000 0x00000002 D_80112A38
D_80112F3C: .word 0x02000000 0x00000004 D_80112B4C
D_80112F48: .word 0x02000000 0x00000008 D_80112CFC
D_80112F54: .word 0x02000000 0x00000010 D_80112DD4
D_80112F60: .word 0x02000000 0x00000020 D_80112E64
D_80112F6C: .word 0x02000000 0x00000040 D_80112F00
D_80112F78: .word 0x00000000 0x00000000 0x00000000

D_80112F84: .word 0x00000000 0x00000000 0x00005032
D_80112F90: .word 0x0E000000 0x0002000A 0x00005A3C
D_80112F9C: .word 0x00000000 0x00000000 0x0000001E

D_80112FA8: .word 0x0E000000 0x0002000A 0x00005A3C
D_80112FB4: .word 0x0E000000 0x00010004 0x00005A3C
D_80112FC0: .word 0x00000000 0x00000000 0x0000001E
D_80112FCC: .word 0x0D000000 0x0002000A 0x0000000A
D_80112FD8: .word 0x0D000000 0x00010004 D_80112F90
D_80112FE4: .word 0x0D000000 0x00070005 D_80112FA8
D_80112FF0: .word 0x0D000000 0x00000001 D_80112FA8
D_80112FFC: .word 0x0E000000 0x0002000A 0x00005A3C
D_80113008: .word 0x0E000000 0x00010004 0x00005A3C
D_80113014: .word 0x0E000000 0x00070005 0x00005A3C
D_80113020: .word 0x00000000 0x00000000 0x00001E1E
D_8011302C: .word 0x0D000000 0x00040002 0x0000000A
D_80113038: .word 0x0D000000 0x00030005 0x0000000A
D_80113044: .word 0x0D000000 0x000E0006 0x0000000A
D_80113050: .word 0x0E000000 0x00040002 0x00005A3C
D_8011305C: .word 0x0E000000 0x00030005 0x00005A3C
D_80113068: .word 0x0E000000 0x000E0006 0x00005A3C
D_80113074: .word 0x00000000 0x00000000 0x00001E1E
D_80113080: .word 0x0D000000 0x000E0002 0x0000000A
D_8011308C: .word 0x0D000000 0x000C0002 0x0000000A
D_80113098: .word 0x0D000000 0x000B0107 0x0000000A
D_801130A4: .word 0x0D000000 0x00090004 0x0000000A
D_801130B0: .word 0x0E000000 0x000E0002 0x00005A3C
D_801130BC: .word 0x0E000000 0x000C0002 0x00005A3C
D_801130C8: .word 0x0E000000 0x000B0107 0x00005A3C
D_801130D4: .word 0x0E000000 0x00090004 0x00005A3C
D_801130E0: .word 0x00000000 0x00000000 0x00001E1E
D_801130EC: .word 0x0E000000 0x00170001 0x00005A3C
D_801130F8: .word 0x0E000000 0x00040007 0x00005A3C
D_80113104: .word 0x00000000 0x00000000 0x00001E1E
D_80113110: .word 0x0D000000 0x00170001 0x0000000A
D_8011311C: .word 0x0D000000 0x00040007 0x0000000A
D_80113128: .word 0x0D000000 0x00030005 D_801130EC
D_80113134: .word 0x0D000000 0x000E0006 D_801130EC
D_80113140: .word 0x0E000000 0x00170001 0x00005A3C
D_8011314C: .word 0x0E000000 0x00040007 0x00005A3C
D_80113158: .word 0x0E000000 0x00030005 0x00005A3C
D_80113164: .word 0x0E000000 0x000E0006 0x00005A3C
D_80113170: .word 0x00000000 0x00000000 0x00001E1E
D_8011317C: .word 0x0E000000 0x000B0004 0x00005A3C
D_80113188: .word 0x00000000 0x00000000 0x00001E1E
D_80113194: .word 0x0D000000 0x000B0004 0x0000000A
D_801131A0: .word 0x0D000000 0x00080007 D_8011317C
D_801131AC: .word 0x00000000 0x00000000 0x00001E1E
D_801131B8: .word 0x0D000000 0x00160004 0x0000000A
D_801131C4: .word 0x0D000000 0x00110001 0x0000000A
D_801131D0: .word 0x0D000000 0x00100004 0x0000000A
D_801131DC: .word 0x0D000000 0x00060006 0x0000000A
D_801131E8: .word 0x0E000000 0x00160004 0x00005A3C
D_801131F4: .word 0x0E000000 0x00110001 0x00005A3C
D_80113200: .word 0x0E000000 0x00100004 0x00005A3C
D_8011320C: .word 0x0E000000 0x00060006 0x00005A3C
D_80113218: .word 0x00000000 0x00000000 0x00001E1E
D_80113224: .word 0x0D000000 0x00120005 0x0000000A
D_80113230: .word 0x0E000000 0x00120005 0x00005A3C
D_8011323C: .word 0x00000000 0x00000000 0x00003C1E
D_80113248: .word 0x02000000 0x00000001 D_80112FCC
D_80113254: .word 0x02000000 0x00000002 D_8011302C
D_80113260: .word 0x02000000 0x00000004 D_80113080
D_8011326C: .word 0x02000000 0x00000008 D_80113110
D_80113278: .word 0x02000000 0x00000010 D_80113194
D_80113284: .word 0x02000000 0x00000020 D_801131B8
D_80113290: .word 0x02000000 0x00000040 D_80113224
D_8011329C: .word 0x00000000 0x00000000 0x00000000
D_801132A8: .word 0x0D000000 0x0002040A 0x00000000
D_801132B4: .word 0x00000000 0x00000000 0x00006464
D_801132C0: .word 0x0D000000 0x00040002 0x00000000
D_801132CC: .word 0x0D000000 0x00030205 0x00000000
D_801132D8: .word 0x0D000000 0x000E0406 0x00000000
D_801132E4: .word 0x00000000 0x00000000 0x00006464
D_801132F0: .word 0x0D000000 0x000E0002 0x00000000
D_801132FC: .word 0x0D000000 0x000C0002 0x00000000
D_80113308: .word 0x0D000000 0x000B0507 0x00000000
D_80113314: .word 0x00000000 0x00000000 0x00006464
D_80113320: .word 0x0D000000 0x00170001 0x00000000
D_8011332C: .word 0x0D000000 0x00040207 0x00000000
D_80113338: .word 0x00000000 0x00000000 0x00006464
D_80113344: .word 0x0D000000 0x000B0004 0x00000000
D_80113350: .word 0x0D000000 0x00080607 0x00000000
D_8011335C: .word 0x00000000 0x00000000 0x00006464
D_80113368: .word 0x0D000000 0x00160004 0x00000000
D_80113374: .word 0x0D000000 0x00060406 0x00000000
D_80113380: .word 0x0D000000 0x00110001 0x00000000
D_8011338C: .word 0x0D000000 0x00100204 0x00000000
D_80113398: .word 0x00000000 0x00000000 0x00006464
D_801133A4: .word 0x0D000000 0x00120005 0x00000000
D_801133B0: .word 0x00000000 0x00000000 0x00006464
D_801133BC: .word 0x02000000 0x00000001 D_801132A8
D_801133C8: .word 0x02000000 0x00000002 D_801132C0
D_801133D4: .word 0x02000000 0x00000004 D_801132F0
D_801133E0: .word 0x02000000 0x00000008 D_80113320
D_801133EC: .word 0x02000000 0x00000010 D_80113344
D_801133F8: .word 0x02000000 0x00000020 D_80113368
D_80113404: .word 0x02000000 0x00000040 D_801133A4
D_80113410: .word 0x00000000 0x00000000 0x00000000
D_8011341C: .word 0x02000000 0x00000040 0x00005A3C
D_80113428: .word 0x00000000 0x00000000 0x00000000
D_80113434: .word 0x02000000 0x00000071 0x00005A3C
D_80113440: .word 0x00000000 0x00000000 0x00000000
D_8011344C: .word 0x01000000 0x0000001E 0x00006446
D_80113458: .word 0x00000000 0x00000000 0x0000001E
D_80113464: .word 0x0A000000 0x00000009 D_8011344C
D_80113470: .word 0x01000000 0x00000032 0x00006446
D_8011347C: .word 0x01000000 0x00000028 0x0000503C
D_80113488: .word 0x01000000 0x0000001E 0x00003232
D_80113494: .word 0x00000000 0x00000000 0x00001432
D_801134A0: .word 0x02000000 0x00000004 D_80113464
D_801134AC: .word 0x01000000 0x0000001E 0x00006446
D_801134B8: .word 0x00000000 0x00000000 0x00005A3C

D_801134C4: .word 0x00000000

D_801134C8: .word 0x09060007 0x04080205 0x01000000
D_801134D4: .word 0x09010607 0x04080002 0x05000000
D_801134E0: .word 0x09070206 0x04080005 0x01000000
D_801134EC: .word 0x09050706 0x04080002 0x01000000
D_801134F8: .word 0x09040807 0x06000205 0x01000000
D_80113504: .word 0x09070604 0x08000205 0x01000000
D_80113510: .word D_801134C8
D_80113514: .word D_801134D4
D_80113518: .word D_801134E0
D_8011351C: .word D_801134EC
D_80113520: .word D_801134F8
D_80113524: .word D_80113504

D_80113528: .word 0x64463C00 0x32001E1E 0x0A000000
D_80113534: .word 0x64463C00 0x3200141E 0x1E000000
D_80113540: .word 0x64463C3C 0x3200141E 0x0A000000
D_8011354C: .word 0x64463C3C 0x3200141E 0x0A000000
D_80113558: .word 0x64463C00 0x3C141E1E 0x0A000000
D_80113564: .word 0x64463C32 0x00141E1E 0x0A000000
D_80113570: .word D_80113528
D_80113574: .word D_80113534
D_80113578: .word D_80113540
D_8011357C: .word D_8011354C
D_80113580: .word D_80113558
D_80113584: .word D_80113564

D_80113588: .word 0x09090909 0x09090000

D_80113590: .word 0x01020408

D_80113594: .word 0x00000000

D_80113598: .word 0x00000000
D_8011359C: .word 0x00000000
D_801135A0: .word 0x00000000

D_801135A4: .word 0x000E000D 0x00110000

D_801135AC: .word 0x00000000
D_801135B0: .word 0x00000000
D_801135B4: .word 0x00000000

.align 8
; Doubles
D_801135B8: .word 0x3FF00000
D_801135BC: .word 0x00000000

D_801135C0: .word 0x3FF00000
D_801135C4: .word 0x00000000

D_801135C8: .word 0x25640000
D_801135CC: .word 0x00000000

D_801135D0: .word 0x3F91DF46
D_801135D4: .word 0xA2529D39

D_801135D8: .word 0x3F91DF46
D_801135DC: .word 0xA2529D39

D_801135E0: .word 0x3F91DF46
D_801135E4: .word 0xA2529D39

D_801135E8: .word 0x3F91DF46
D_801135EC: .word 0xA2529D39

D_801135F0: .word 0x3FF80000
D_801135F4: .word 0x00000000

D_801135F8:
.word 0x3F800000
.word 0x3F800000
.word 0x3F800000
.word 0x3F800000
.word 0x40000000
.word 0x3F800000
.word 0x00000000
.word 0x40000000
.word 0x3F800000
.word 0xBF800000
.word 0x3F800000
.word 0x3F800000
.word 0xBF800000
.word 0xBF800000
.word 0x3F800000
.word 0x00000000
.word 0xBF800000
.word 0x3F800000
.word 0xBF800000
.word 0x40000000
.word 0x3F800000
.word 0x3F800000
.word 0xBF800000
.word 0x3F800000

.align 8
D_80113658: .word 0x3FE00000
D_8011365C: .word 0x00000000

D_80113660: .word 0x3FE00000
D_80113664: .word 0x00000000

D_80113668: .word 0x3FE00000
D_8011366C: .word 0x00000000

D_80113670: .word 0x3FE00000
D_80113674: .word 0x00000000

D_80113678: .word 0x3FF00000
D_8011367C: .word 0x00000000

D_80113680: .word 0x3FF00000
D_80113684: .word 0x00000000

D_80113688: .word 0x3FF00000
D_8011368C: .word 0x00000000

D_80113690: .word 0x3FF00000
D_80113694: .word 0x00000000

DuelMinigamesArray:
.byte 0x3F ; Western Land minigame index
.byte 0x42 ; Pirate Land minigame index
.byte 0x44 ; Horror Land minigame index
.byte 0x46 ; Space Land minigame index
.byte 0x48 ; Mystery Land minigame index
.byte 0x4A ; Bowser Land minigame index
.align 4

; jump table
D_80113698:
.word D_801113C8
.word D_801113A4
.word D_801113C8
.word D_8011142C
.word D_801113C8
.word D_80111504
.word D_80111418
.word D_801113D0
.word D_80111490
.word D_801113F4
.word D_801114B8

.align 16

; bss
D_801136D0: .word 0
D_801136D4: .word 0
D_801136D8: .word 0
D_801136DC: .word 0
D_801136E0: .word 0
D_801136E4: .word 0
D_801136E8: .word 0
D_801136EC: .word 0
D_801136F0: .word 0
D_801136F4: .word 0
D_801136F8: .word 0
D_801136FC: .word 0
D_80113700: .word 0
D_80113704: .word 0
D_80113708: .word 0
D_8011370C: .word 0
D_80113710: .word 0
D_80113714: .word 0
D_80113718: .word 0
D_8011371C: .word 0
D_80113720: .word 0
D_80113724: .word 0
D_80113728: .word 0
D_8011372C: .word 0
D_80113730: .word 0
D_80113734: .word 0
D_80113738: .word 0
D_8011373C: .word 0
D_80113740: .word 0
D_80113744: .word 0
D_80113748: .word 0
D_8011374C: .word 0
D_80113750: .word 0
D_80113754: .word 0
D_80113758: .word 0
D_8011375C: .word 0
D_80113760: .word 0
D_80113764: .word 0
D_80113768: .word 0
D_8011376C: .word 0
D_80113770: .word 0
D_80113774: .word 0
D_80113778: .word 0
D_8011377C: .word 0
D_80113780: .word 0
D_80113784: .word 0
D_80113788: .word 0
D_8011378C: .word 0
D_80113790: .word 0
D_80113794: .word 0
D_80113798: .word 0
D_8011379C: .word 0
D_801137A0: .word 0
D_801137A4: .word 0
D_801137A8: .word 0
D_801137AC: .word 0
D_801137B0: .word 0
D_801137B4: .word 0
D_801137B8: .word 0
D_801137BC: .word 0
D_801137C0: .word 0
D_801137C4: .word 0
D_801137C8: .word 0
D_801137CC: .word 0
D_801137D0: .word 0
D_801137D4: .word 0
D_801137D8: .word 0
D_801137DC: .word 0
D_801137E0: .word 0
D_801137E4: .word 0
D_801137E8: .word 0
D_801137EC: .word 0
D_801137F0: .word 0
D_801137F4: .word 0
D_801137F8: .word 0
D_801137FC: .word 0
D_80113800: .word 0
D_80113804: .word 0
D_80113808: .word 0
D_8011380C: .word 0
D_80113810: .word 0
D_80113814: .word 0
D_80113818: .word 0
D_8011381C: .word 0
D_80113820: .word 0
D_80113824: .word 0
D_80113828: .word 0
D_8011382C: .word 0
D_80113830: .word 0
D_80113834: .word 0
D_80113838: .word 0
D_8011383C: .word 0
D_80113840: .word 0
D_80113844: .word 0
D_80113848: .word 0
D_8011384C: .word 0
D_80113850: .word 0
D_80113854: .word 0
D_80113858: .word 0
D_8011385C: .word 0
D_80113860: .word 0
D_80113864: .word 0
D_80113868: .word 0
D_8011386C: .word 0
D_80113870: .word 0
D_80113874: .word 0
D_80113878: .word 0
D_8011387C: .word 0
D_80113880: .word 0
D_80113884: .word 0
D_80113888: .word 0
D_8011388C: .word 0
D_80113890: .word 0
D_80113894: .word 0
D_80113898: .word 0
D_8011389C: .word 0
D_801138A0: .word 0
D_801138A4: .word 0
D_801138A8: .word 0
D_801138AC: .word 0
D_801138B0: .word 0
D_801138B4: .word 0
D_801138B8: .word 0
D_801138BC: .word 0
`;
}
