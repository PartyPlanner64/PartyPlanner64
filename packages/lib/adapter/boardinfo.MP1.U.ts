import { createBoardInfo } from "./boardinfobase";
import { IBoard } from "../../../apps/partyplanner64/boards";
import { arrayToArrayBuffer } from "../utils/arrays";
import { toPack } from "../utils/img/ImgPack";
import { romhandler } from "../romhandler";
import { strToBytes } from "../fs/strings";

// DK's Jungle Adventure - (U) ROM
const MP1_USA_DK = createBoardInfo("MP1_USA_DK", {
  name: "DK's Jungle Adventure",
  canOverwrite: true,
  boardDefFile: 69,
  bgDir: 0,
  pauseBgDir: 4,
  sceneIndex: 0x36, // 54
  mainfsEventFile: [10, 422],
  mainfsBoardFile: [10, 423],
  koopaSpaceInst: 0xd54, // 0x002425F4, 0x800F7330
  bowserSpaceInst: 0xcb8, // 0x00242558
  boosLoopFnOffset: 0x11d8, // 0x00242A78
  boosReadbackFnOffset: 0x10d0, // 0x00242970
  starSpaceArrOffset: 0x3320, // 0x00244BC0
  starSpaceCount: 7,
  toadSpaceArrOffset: [0x3330, 0x3348], // [0x00244BD0, 0x00244BE8]
  audioIndexOffset: 0xbbe, // 0x0024245E
  str: {
    boardSelect: 652,
    koopaIntro: 571,
    starComments: [286, 287, 288, 289, 290, 291, 292],
  },
  img: {
    boardSelectImg: 17,

    //gamemasterplc: overwrite ROM offset 0x25FA08 with 0x006B0226 to hide the comic sans board logo far off the bottom of the screen
    pauseLogoImg: 276,
    introLogoImg: [356, 357],
    introLogoImgDimens: [272, 112],
    titleScreenImg: 385,
  },

  onLoad: function (board: IBoard) {
    const hvqfs = romhandler.getRom()!.getHVQFS();
    board.otherbg.largescene = hvqfs.readBackground(MP1_USA_DK.bgDir + 1).src;
    board.otherbg.conversation = hvqfs.readBackground(MP1_USA_DK.bgDir + 2).src;
    board.otherbg.splashscreen = hvqfs.readBackground(MP1_USA_DK.bgDir + 6).src;
  },

  onAfterOverwrite: function () {
    // Remove the "box" from the game start scenery.
    const scenes = romhandler.getRom()!.getScenes();
    const introSceneView = scenes.getDataView(98);
    introSceneView.setUint32(0x7098, 0xc57a0000); // 0x2A9598 // Some random float to get it away
    introSceneView.setUint32(0x709c, 0); // 0x2A959C
    introSceneView.setUint32(0x70a0, 0); // 0x2A95A0

    // Make Bowser's event text a bit more generic.
    let bytes: number[] = [];
    const strings = romhandler.getRom()!.getStrings();
    bytes = bytes.concat(
      strToBytes("You're looking for Stars?\nHow about this instead..."),
    );
    bytes.push(0xff); // PAUSE
    bytes.push(0x00); // Null byte
    const strBuffer = arrayToArrayBuffer(bytes);
    strings.write(396, strBuffer);
    strings.write(399, strBuffer);
    strings.write(402, strBuffer);
  },
});

// spaceEventTables: [
//   { upper: 0xBD0, lower: 0xBD8 }, // 0x800F71B0, 0x800F71B8
//   { upper: 0xBEC, lower: 0xBF4 }, // 0x800F71CC, 0x800F71D4
//   { upper: 0xC08, lower: 0xC10 }, // 0x800F71E8, 0x800F71F0
//   { upper: 0xC24, lower: 0xC2C }, // 0x800F7204, 0x800F720C
//   // tables: 0x800FA0CC
// ];

// Peach's Birthday Cake - (U) ROM
const MP1_USA_PEACH = createBoardInfo("MP1_USA_PEACH", {
  name: "Peach's Birthday Cake",
  canOverwrite: true,
  boardDefFile: 70,
  bgDir: 7,
  pauseBgDir: 14,
  str: {
    boardSelect: 653,
    koopaIntro: 572,
  },
  img: {
    boardSelectImg: 20,
    pauseLogoImg: 277,
    introLogoImg: [359],
    introLogoImgDimens: [284, 126],
    titleScreenImg: 382,
  },
  sceneIndex: 0x37, // 55
  mainfsEventFile: [10, 424],
  mainfsBoardFile: [10, 425],
  eventASMStart: 0x00,
  // spaceEventsStartAddr: 0x000F7C70
  // spaceEventsStartOffset: 0x00246C50
  // spaceEventsEndOffset: 0x00246D10
  koopaSpaceInst: 0x7c0, // 0x00245D80
  bowserSpaceInst: 0x988, // // 0x00245F48
  goombaSpaceInst: 0x900, // 0x00245EC0

  onLoad: function (board: IBoard) {
    const hvqfs = romhandler.getRom()!.getHVQFS();
    board.otherbg.largescene = hvqfs.readBackground(
      MP1_USA_PEACH.bgDir + 1,
    ).src;
    board.otherbg.conversation = hvqfs.readBackground(
      MP1_USA_PEACH.bgDir + 2,
    ).src;
    board.otherbg.splashscreen = hvqfs.readBackground(
      MP1_USA_PEACH.bgDir + 10,
    ).src;
  },

  onAfterOverwrite: function (board: IBoard) {
    // Text banner that appears over the logo
    const mainfs = romhandler.getRom()?.getMainFS()!;
    const oldPack = mainfs.get(10, 360);
    const imgInfoArr = [
      { src: new ArrayBuffer(250 * 50 * 4), width: 250, height: 50, bpp: 32 },
    ];
    const newPack = toPack(imgInfoArr, 16, 0, oldPack);
    mainfs.write(10, 360, newPack);

    // TODO: There's some cake graphics in the end cutscenes that could be wiped.
  },
});

// Yoshi's Tropical Island - (U) ROM
const MP1_USA_YOSHI = createBoardInfo("MP1_USA_YOSHI", {
  name: "Yoshi's Tropical Island",
  canOverwrite: true,
  boardDefFile: 71,
  bgDir: 18,
  pauseBgDir: 25,
  str: {
    boardSelect: 654,
    koopaIntro: 573,
  },
  img: {
    boardSelectImg: 18,
    pauseLogoImg: 278,
    introLogoImg: [362],
    introLogoImgDimens: [270, 120],
    titleScreenImg: 383,
  },
  sceneIndex: 0x38, // 56
  mainfsEventFile: [10, 426],
  mainfsBoardFile: [10, 427],
  // spaceEventsStartAddr: 0x000F861C;
  // spaceEventsStartOffset: 0x00248E2C;
  // spaceEventsEndOffset: 0x00248EE4;

  onLoad: function (board: IBoard) {
    const hvqfs = romhandler.getRom()!.getHVQFS();
    board.otherbg.largescene = hvqfs.readBackground(
      MP1_USA_YOSHI.bgDir + 1,
    ).src;
    board.otherbg.conversation = hvqfs.readBackground(
      MP1_USA_YOSHI.bgDir + 2,
    ).src;
    board.otherbg.splashscreen = hvqfs.readBackground(
      MP1_USA_YOSHI.bgDir + 8,
    ).src;
  },

  onAfterOverwrite: function (board: IBoard) {
    // Text banner that appears over the logo
    const mainfs = romhandler.getRom()?.getMainFS()!;
    const oldPack = mainfs.get(10, 363);
    const imgInfoArr = [
      { src: new ArrayBuffer(208 * 40 * 4), width: 208, height: 40, bpp: 32 },
    ];
    const newPack = toPack(imgInfoArr, 16, 0, oldPack);
    mainfs.write(10, 363, newPack);

    // TODO: Yoshis and whirlpools in the intro board showing
    // TODO: Koopa Troopa rides a shell into the intro
  },
});

// Wario's Battle Canyon = (U) ROM
const MP1_USA_WARIO = createBoardInfo("MP1_USA_WARIO", {
  name: "Wario's Battle Canyon",
  canOverwrite: true,
  boardDefFile: 72,
  bgDir: 27,
  pauseBgDir: 36,
  str: {
    boardSelect: 655,
    koopaIntro: 574,
  },
  img: {
    boardSelectImg: 19,
    pauseLogoImg: 279,
    introLogoImg: [365],
    introLogoImgDimens: [290, 114],
    titleScreenImg: 384,
  },
  sceneIndex: 0x39, // 57
  mainfsEventFile: [10, 428],
  mainfsBoardFile: [10, 429],
  // spaceEventsStartAddr: 0x000F99C4,
  // spaceEventsStartOffset: 0x0024C2E4,
  // spaceEventsEndOffset: 0x0024C38C,
  koopaSpaceInst: 0xed0, // 0x00249DD0,
  bowserSpaceInst: 0xda8, // 0x00249CA8,
  boosLoopFnOffset: 0x119c, // 0x0024A09C,
  boosReadbackFnOffset: 0x1094, // 0x00249F94,
  starSpaceArrOffset: 0x3240, // 0x0024C140,
  starSpaceCount: 7,
  toadSpaceArrOffset: [0x3250, 0x3270], // [0x0024C150, 0x0024C170]

  onLoad: function (board: IBoard) {
    const hvqfs = romhandler.getRom()!.getHVQFS();
    board.otherbg.largescene = hvqfs.readBackground(
      MP1_USA_WARIO.bgDir + 1,
    ).src;
    board.otherbg.conversation = hvqfs.readBackground(
      MP1_USA_WARIO.bgDir + 2,
    ).src;
    board.otherbg.splashscreen = hvqfs.readBackground(
      MP1_USA_WARIO.bgDir + 11,
    ).src;
  },

  onAfterOverwrite: function (board: IBoard) {
    // Text banner that appears over the logo
    const mainfs = romhandler.getRom()?.getMainFS()!;
    const oldPack = mainfs.get(10, 366);
    const imgInfoArr = [
      { src: new ArrayBuffer(280 * 76 * 4), width: 280, height: 76, bpp: 32 },
    ];
    const newPack = toPack(imgInfoArr, 16, 0, oldPack);
    mainfs.write(10, 366, newPack);
  },
});

// Luigi's Engine Room - (U) ROM
const MP1_USA_LUIGI = createBoardInfo("MP1_USA_LUIGI");
MP1_USA_LUIGI.name = "Luigi's Engine Room";
MP1_USA_LUIGI.boardDefFile = 73;
MP1_USA_LUIGI.bgDir = 39;
MP1_USA_LUIGI.str = {
  boardSelect: 656,
  koopaIntro: 575,
};
MP1_USA_LUIGI.img = {
  boardSelectImg: 21,
  pauseLogoImg: 280,
  introLogoImg: [368],
  introLogoImgDimens: [276, 128],
  titleScreenImg: 381,
};
MP1_USA_LUIGI.sceneIndex = 0x3a; // 58
MP1_USA_LUIGI.eventASMStart = 0x00;
// MP1_USA_LUIGI.spaceEventsStartAddr = 0x000F9B90;
// MP1_USA_LUIGI.spaceEventsStartOffset = 0x0024F940;
// MP1_USA_LUIGI.spaceEventsEndOffset = 0x0024FA70;
MP1_USA_LUIGI.starSpaceArrOffset = 0x2f60; // 0x0024F2F0;
MP1_USA_LUIGI.starSpaceCount = 7;
MP1_USA_LUIGI.toadSpaceArrOffset = [0x2f70, 0x2ff4]; // [0x0024F300, 0x0024F384];

// Mario's Rainbow Castle - (U) ROM
const MP1_USA_MARIO = createBoardInfo("MP1_USA_MARIO");
MP1_USA_MARIO.name = "Mario's Rainbow Castle";
MP1_USA_MARIO.boardDefFile = 74;
MP1_USA_MARIO.bgDir = 47;
MP1_USA_MARIO.str = {
  boardSelect: 657,
  koopaIntro: 576,
};
MP1_USA_MARIO.img = {
  boardSelectImg: 22,
  pauseLogoImg: 281,
  introLogoImg: [371],
  introLogoImgDimens: [270, 96],
  titleScreenImg: 380,
};
MP1_USA_MARIO.sceneIndex = 0x3b; // 59
MP1_USA_MARIO.eventASMStart = 0x00;
// MP1_USA_MARIO.spaceEventsStartAddr = 0x000F8390;
// MP1_USA_MARIO.spaceEventsStartOffset = 0x00251830;
// MP1_USA_MARIO.spaceEventsEndOffset = 0x002518D0;

// Bowser's Magma Mountain - (U) ROM
const MP1_USA_BOWSER = createBoardInfo("MP1_USA_BOWSER");
MP1_USA_BOWSER.name = "Bowser's Magma Mountain";
MP1_USA_BOWSER.boardDefFile = 75;
MP1_USA_BOWSER.bgDir = 56;
MP1_USA_BOWSER.str = {
  boardSelect: 658,
  koopaIntro: 577,
};
MP1_USA_BOWSER.img = {
  boardSelectImg: 23,
  pauseLogoImg: 282,
  introLogoImg: [374],
  introLogoImgDimens: [270, 106],
};
MP1_USA_BOWSER.sceneIndex = 0x3c; // 60
MP1_USA_BOWSER.eventASMStart = 0x00;
// MP1_USA_BOWSER.spaceEventsStartAddr = 0x000F9080;
// MP1_USA_BOWSER.spaceEventsStartOffset = 0x00254370;
// MP1_USA_BOWSER.spaceEventsEndOffset = 0x00254450;
MP1_USA_BOWSER.starSpaceArrOffset = 0x2298; // 0x00253B68;
MP1_USA_BOWSER.starSpaceCount = 7;
MP1_USA_BOWSER.toadSpaceArrOffset = [0x22a8, 0x22c8]; // [0x00253B78, 0x00253B98];

// Eternal Star - (U) ROM
const MP1_USA_ETERNALSTAR = createBoardInfo("MP1_USA_ETERNALSTAR");
MP1_USA_ETERNALSTAR.name = "Eternal Star";
MP1_USA_ETERNALSTAR.boardDefFile = 76;
MP1_USA_ETERNALSTAR.bgDir = 68;
MP1_USA_ETERNALSTAR.str = {
  boardSelect: [659, 660],
  koopaIntro: 578,
};
MP1_USA_ETERNALSTAR.img = {
  boardSelectImg: 24,
  pauseLogoImg: 283,
  introLogoImg: [378],
  //introLogoImgDimens: [276, 92], // The text  377
  //introLogoImgDimens: [252, 128], // The star  378
};
MP1_USA_ETERNALSTAR.sceneIndex = 0x3d; // 61
MP1_USA_ETERNALSTAR.eventASMStart = 0x00;
// MP1_USA_ETERNALSTAR.spaceEventsStartAddr = 0x000F905C;
// MP1_USA_ETERNALSTAR.spaceEventsStartOffset = 0x00256ECC;
// MP1_USA_ETERNALSTAR.spaceEventsEndOffset = 0x00256FF0;
MP1_USA_ETERNALSTAR.bowserSpaceInst = 0xddc; // 0x0025522C;
MP1_USA_ETERNALSTAR.starSpaceArrOffset = 0x25f0; // 0x00256A40;
MP1_USA_ETERNALSTAR.starSpaceCount = 7;
MP1_USA_ETERNALSTAR.toadSpaceArrOffset = 0x2600; // 0x00256A50;

// Training - (U) ROM
const MP1_USA_TRAINING = createBoardInfo("MP1_USA_TRAINING");
MP1_USA_TRAINING.name = "Training";
MP1_USA_TRAINING.boardDefFile = 77;
MP1_USA_TRAINING.bgDir = 77;
MP1_USA_TRAINING.str = {};
MP1_USA_TRAINING.img = {};
MP1_USA_TRAINING.sceneIndex = 0x3e; // 62
MP1_USA_TRAINING.eventASMStart = 0x00;
// MP1_USA_TRAINING.spaceEventsStartAddr = 0x000F87A8;
// MP1_USA_TRAINING.spaceEventsStartOffset = 0x002591B8;
// MP1_USA_TRAINING.spaceEventsEndOffset = 0x002591E8;
MP1_USA_TRAINING.bowserSpaceInst = 0x32c; // 0x0025731C;
MP1_USA_TRAINING.toadSpaceInst = 0x16c; // 0x0025715C;
MP1_USA_TRAINING.koopaSpaceInst = 0x1f4; // 0x002571E4;
MP1_USA_TRAINING.booSpaceInst = 0x2a4; // 0x00257294;

// Mini-Game Stadium - (U) ROM
const MP1_USA_STADIUM = createBoardInfo("MP1_USA_STADIUM");
MP1_USA_STADIUM.name = "Mini-Game Stadium";
MP1_USA_STADIUM.boardDefFile = 83;
MP1_USA_STADIUM.bgDir = 99;
MP1_USA_STADIUM.str = {};
MP1_USA_STADIUM.img = {};
//MP1_USA_STADIUM.sceneIndex = 0x3F; // 63

// Mini-Game Island - (U) ROM
const MP1_USA_ISLAND = createBoardInfo("MP1_USA_ISLAND");
MP1_USA_ISLAND.name = "Mini-Game Island";
MP1_USA_ISLAND.boardDefFile = 78;
MP1_USA_ISLAND.bgDir = 79;
MP1_USA_ISLAND.str = {};
MP1_USA_ISLAND.img = {};
MP1_USA_ISLAND.sceneIndex = 0x72; // 114
MP1_USA_ISLAND.eventASMStart = 0x00;
// MP1_USA_ISLAND.spaceEventsStartAddr = 0x000F8448;
// MP1_USA_ISLAND.spaceEventsStartOffset = 0x002F8EE8;
// MP1_USA_ISLAND.spaceEventsEndOffset = 0x002F9040;

export function getBoardInfos() {
  return [
    MP1_USA_DK,
    MP1_USA_PEACH,
    MP1_USA_YOSHI,
    MP1_USA_WARIO,
    MP1_USA_LUIGI,
    MP1_USA_MARIO,
    MP1_USA_BOWSER,
    MP1_USA_ETERNALSTAR,
    MP1_USA_TRAINING,
    MP1_USA_ISLAND,
    MP1_USA_STADIUM,
  ];
}
