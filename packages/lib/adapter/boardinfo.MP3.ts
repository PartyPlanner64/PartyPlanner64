import { createBoardInfo } from "./boardinfobase";
import { IBoard } from "../../../apps/partyplanner64/boards";
import { BoardType } from "../types";
import { romhandler } from "../romhandler";

// Chilly Waters - (U) ROM
const MP3_CHILLY = createBoardInfo("MP3_CHILLY", {
  name: "Chilly Waters",
  canOverwrite: true,
  boardDefFile: 570,
  bgDir: 3,
  pauseBgDir: 5,
  str: {
    boardSelect: [
      [21, 30],
      [26, 17],
    ],
    boardGreeting: [24, 12],
    boardGreetingDuel: [24, 0],
    boardNames: [
      [49, 39],
      [83, 43],
      // [93, 23], This is the songs list, so we can leave it
    ],
  },
  img: {
    boardSelectImg: 72,
    splashLogoImg: 22,
    splashLogoTextImg: 28,
    pauseLogoImg: 125,
    statsLogoImg: [19, 105],
    gateImg: 354, // dir 19
  },
  sceneIndex: 0x48,
  mainfsEventFile: [19, 618],
  mainfsBoardFile: [19, 619],
  eventASMStart: 0x14af0, // 0x00330000 // ballpark, but this is wrong -> // 0x0031E814, // is this 0x8011A490 ?
  eventASMEnd: 0x16bec, // 0x003320FC, 0x8011C58C
  // spaceEventsStartAddr: 0x0011E718,
  // spaceEventsStartOffset: 0x00334288,
  // spaceEventsEndOffset: 0x18F18, // 0x00334428,
  spaceEventTables: [
    { upper: 0x26a8, lower: 0x26b0 }, // 0x80108048, 0x80108050, table 0x8011E2CC
    { upper: 0x26b4, lower: 0x26bc }, // 0x80108054, 0x8010805C, table 0x8011E718
    // { upper: 0x31DBD0, lower: 0x31DBD8 }, // 0x80108060, 0x80108068 // This is not a table actually, it is related to the happening spaces
    { upper: 0x26cc, lower: 0x26d4 }, // 0x8010806C, 0x80108074, table 0x8011E344
    // A table, but if we remove it Poison Shrooms break and probably other things
    // { upper: 0x31DBE8, lower: 0x31DBF0 }, // 0x80108078, 0x80108080, table 0x8011E4D8
  ],
  starSpaceArrOffset: [0x17910, 0x17980], // [0x00332E20, 0x00332E90] // 0x8011D2B0, 0x8011D320
  starSpaceCount: 8,
  toadSpaceArrOffset: [0x17920, 0x179dc], // [0x00332E30, 0x00332EEC] // 0x8011D2C0, 0x8011D37C
  bankArrOffset: [0x17b64], //  [0x00333074] // 0x8011D504
  bankCoinArrOffset: [0x17a00], // [0x00332F10] // 0x8011D3A0
  bankCount: 2,
  itemShopArrOffset: [0x17b68], // [0x00333078] // 0x8011D508
  itemShopCount: 2,
  booArrOffset: [0x179fc], // [0x00332F0C] // 0x8011D39C
  booCount: 1,
  gateNeighborsOffset: [0x179d4], //  [0x00332EE4] // 0x8011D374
  gateArrOffset: [0x17a7c], // [0x00332F8C] // 0x8011D41C
  gateCount: 2,
  arrowRotStartOffset: 0x2398, // 0x0031D8A8 // 0x80107D38
  arrowRotEndOffset: 0x2440, // 0x0031D950 // 0x80107DDC
  audioIndexOffset: 0x2682, // 0x0031DB92 // 0x80108022

  onLoad: function (board: IBoard) {
    const hvqfs = romhandler.getRom()!.getHVQFS();
    board.otherbg.largescene = hvqfs.readBackground(MP3_CHILLY.bgDir + 1).src;
  },
});

// Deep Bloober Sea - (U) ROM
const MP3_BLOOBER = createBoardInfo("MP3_BLOOBER", {
  name: "Deep Bloober Sea",
  canOverwrite: true,
  boardDefFile: 571,
  bgDir: 6,
  pauseBgDir: 8,
  str: {
    boardSelect: [
      [21, 31],
      [26, 18],
    ],
    boardGreeting: [24, 13],
    boardGreetingDuel: [24, 2],
    boardNames: [
      [49, 40],
      [83, 44],
      // [93, 24], This is the songs list, so we can leave it
    ],
  },
  img: {
    boardSelectImg: 73,
    splashLogoImg: 23,
    splashLogoTextImg: 29,
    pauseLogoImg: 126,
    statsLogoImg: [19, 106],
    gateImg: 359, // dir 19
  },
  sceneIndex: 0x49,
  mainfsEventFile: [19, 620],
  mainfsBoardFile: [19, 621],

  onLoad: function (board: IBoard) {
    const hvqfs = romhandler.getRom()!.getHVQFS();
    board.otherbg.largescene = hvqfs.readBackground(MP3_BLOOBER.bgDir + 1).src;
  },
});
// Works, but needs other values to parse right:
// spaceEventTables = [
//   { upper: 0x003377C0, lower: 0x003377C8 }, // 0x80107B80, 0x80107B88, table 0x8011D688
//   { upper: 0x003377CC, lower: 0x003377D4 }, // 0x80107B8C, 0x80107B94, table 0x8011D9CC
//   // 0x800F8D48 call in between
//   { upper: 0x003377E4, lower: 0x003377EC }, // 0x80107BA4, 0x80107BAC, table 0x8011D700
//   { upper: 0x003377F0, lower: 0x003377F8 }, // 0x80107BB0, 0x80107BB8, table 0x8011D894
// ];

// Spiny Desert - (U) ROM
const MP3_SPINY = createBoardInfo("MP3_SPINY", {
  name: "Spiny Desert",
  canOverwrite: true,
  boardDefFile: 572,
  bgDir: 9,
  pauseBgDir: 11,
  str: {
    boardSelect: [
      [21, 32],
      [26, 19],
    ],
    boardGreeting: [24, 14],
    boardGreetingDuel: [24, 4],
    boardNames: [
      [49, 41],
      [83, 45],
      // [93, 25], This is the songs list, so we can leave it
    ],
  },
  img: {
    boardSelectImg: 74,
    splashLogoImg: 24,
    splashLogoTextImg: 30,
    pauseLogoImg: 127,
    statsLogoImg: [19, 107],
    gateImg: 366, // dir 19
  },

  sceneIndex: 0x4a,
  mainfsEventFile: [19, 622],
  mainfsBoardFile: [19, 623],

  onLoad: function (board: IBoard) {
    const hvqfs = romhandler.getRom()!.getHVQFS();
    board.otherbg.largescene = hvqfs.readBackground(MP3_SPINY.bgDir + 1).src;
  },
});

// Woody Woods - (U) ROM
const MP3_WOODY = createBoardInfo("MP3_WOODY", {
  name: "Woody Woods",
  canOverwrite: true,
  boardDefFile: 573,
  bgDir: 12,
  pauseBgDir: 14,
  str: {
    boardSelect: [
      [21, 33],
      [26, 20],
    ],
    boardGreeting: [24, 15],
    boardGreetingDuel: [24, 6],
    boardNames: [
      [49, 42],
      [83, 46],
      // [93, 26], This is the songs list, so we can leave it
    ],
  },
  img: {
    boardSelectImg: 75,
    splashLogoImg: 25,
    splashLogoTextImg: 31,
    pauseLogoImg: 128,
    statsLogoImg: [19, 108],
    gateImg: 373, // dir 19
  },

  sceneIndex: 0x4b,
  mainfsEventFile: [19, 624],
  mainfsBoardFile: [19, 625],

  onLoad: function (board: IBoard) {
    const hvqfs = romhandler.getRom()!.getHVQFS();
    board.otherbg.largescene = hvqfs.readBackground(MP3_WOODY.bgDir + 1).src;
  },
});

// Creepy Cavern - (U) ROM
const MP3_CAVERN = createBoardInfo("MP3_CAVERN", {
  name: "Creepy Cavern",
  canOverwrite: true,
  boardDefFile: 574,
  bgDir: 15,
  pauseBgDir: 17,
  str: {
    boardSelect: [
      [21, 34],
      [26, 21],
    ],
    boardGreeting: [24, 16],
    boardGreetingDuel: [24, 8],
    boardNames: [
      [49, 43],
      [83, 47],
      // [93, 27], This is the songs list, so we can leave it
    ],
  },
  img: {
    boardSelectImg: 76,
    splashLogoImg: 26,
    splashLogoTextImg: 32,
    pauseLogoImg: 129,
    statsLogoImg: [19, 109],
    gateImg: 383, // dir 19
  },

  sceneIndex: 0x4c,
  mainfsEventFile: [19, 626],
  mainfsBoardFile: [19, 627],

  onLoad: function (board: IBoard) {
    const hvqfs = romhandler.getRom()!.getHVQFS();
    board.otherbg.largescene = hvqfs.readBackground(MP3_CAVERN.bgDir + 1).src;
  },
});

// Waluigi's Land - (U) ROM
const MP3_WALUIGI = createBoardInfo("MP3_WALUIGI", {
  name: "Waluigi's Land",
  canOverwrite: true,
  boardDefFile: 575,
  bgDir: 18,
  pauseBgDir: 20,
  str: {
    boardSelect: [
      [21, 35],
      [26, 22],
    ],
    boardGreeting: [24, 17],
    boardGreetingDuel: [24, 10],
    boardNames: [
      [49, 44],
      [83, 48],
      // [93, 28], This is the songs list, so we can leave it
    ],
  },
  img: {
    boardSelectImg: 77,
    splashLogoImg: 27,
    splashLogoTextImg: 33,
    pauseLogoImg: 130,
    statsLogoImg: [19, 110],
    gateImg: 387, // dir 19
  },

  sceneIndex: 0x4d,
  mainfsEventFile: [19, 628],
  mainfsBoardFile: [19, 629],

  onLoad: function (board: IBoard) {
    const hvqfs = romhandler.getRom()!.getHVQFS();
    board.otherbg.largescene = hvqfs.readBackground(MP3_WALUIGI.bgDir + 1).src;
  },
});

// Gate Guy - (U) ROM
const MP3U_GATEGUY = createBoardInfo("MP3U_GATEGUY");
MP3U_GATEGUY.name = "Gate Guy";
MP3U_GATEGUY.type = BoardType.DUEL;
MP3U_GATEGUY.boardDefFile = 577;
MP3U_GATEGUY.bgDir = 24;
// MP3U_GATEGUY.str = {
//   boardSelect: [
//     [36, 21],
//     [41, 27],
//   ],
//   boardNames: [
//     [49, 45],
//     [39, 1],
//     [83, 49],
//   ],
// };
MP3U_GATEGUY.img = {
  boardSelectImg: 81,
  splashLogoImg: 34,
  splashLogoTextImg: 40,
  miniMapWithBg: 279, // dir 19
  miniMapDots: 280,
};
MP3U_GATEGUY.sceneIndex = 0x5b;
// MP3U_GATEGUY.spaceEventsStartAddr = 0x00118914;
// MP3U_GATEGUY.spaceEventsStartOffset = 0x003EBA04;
MP3U_GATEGUY.spaceEventTables = [
  // JAL 800EA46C
  { upper: 0x811c, lower: 0x8124 }, // 0x8010DABC, 0x8010DAC4, table 0x80118914
  { upper: 0x8128, lower: 0x8130 }, // 0x8010DAC8, 0x8010DAD0, table 0x80118DEC
];
MP3U_GATEGUY.onAfterOverwrite = function (board: IBoard) {
  // TODO Need this for duels?
  // This code (right inbetween 800EBA60 calls) sets up a function pointer for happening spaces.
  // Since we don't use any default events, we can overwrite it.
  // romView.setUint32(, 0);
  // romView.setUint32(, 0);
  // romView.setUint32(, 0);
  // TODO: Probably some stuff to NOP around 0x8010DA9C
};

// Arrowhead - (U) ROM
const MP3U_ARROWHEAD = createBoardInfo("MP3U_ARROWHEAD");
MP3U_ARROWHEAD.name = "Arrowhead";
MP3U_ARROWHEAD.type = BoardType.DUEL;
MP3U_ARROWHEAD.boardDefFile = 578;
MP3U_ARROWHEAD.bgDir = 25;
MP3U_ARROWHEAD.img = {
  boardSelectImg: 82,
  splashLogoImg: 35,
  splashLogoTextImg: 41,
  miniMapWithBg: 310, // dir 19
  miniMapDots: 311,
};

// Pipesqueak - (U) ROM
const MP3U_PIPESQUEAK = createBoardInfo("MP3U_PIPESQUEAK");
MP3U_PIPESQUEAK.name = "Pipesqueak";
MP3U_PIPESQUEAK.type = BoardType.DUEL;
MP3U_PIPESQUEAK.boardDefFile = 579;
MP3U_PIPESQUEAK.bgDir = 26;
MP3U_PIPESQUEAK.img = {
  boardSelectImg: 83,
  splashLogoImg: 36,
  splashLogoTextImg: 42,
  miniMapWithBg: 312, // dir 19
  miniMapDots: 313,
};

// Blowhard - (U) ROM
const MP3U_BLOWHARD = createBoardInfo("MP3U_BLOWHARD");
MP3U_BLOWHARD.name = "Blowhard";
MP3U_BLOWHARD.type = BoardType.DUEL;
MP3U_BLOWHARD.boardDefFile = 580;
MP3U_BLOWHARD.bgDir = 27;
MP3U_BLOWHARD.img = {
  boardSelectImg: 84,
  splashLogoImg: 37,
  splashLogoTextImg: 43,
  miniMapWithBg: 315, // dir 19
  miniMapDots: 316,
};

// Mr. Mover - (U) ROM
const MP3U_MRMOVER = createBoardInfo("MP3U_MRMOVER");
MP3U_MRMOVER.name = "Mr. Mover";
MP3U_MRMOVER.type = BoardType.DUEL;
MP3U_MRMOVER.boardDefFile = 581;
MP3U_MRMOVER.bgDir = 28;
MP3U_MRMOVER.img = {
  boardSelectImg: 85,
  splashLogoImg: 38,
  splashLogoTextImg: 44,
  miniMapWithBg: 317, // dir 19
  miniMapDots: 318,
};

// Backtrack - (U) ROM
const MP3U_BACKTRACK = createBoardInfo("MP3U_BACKTRACK");
MP3U_BACKTRACK.name = "Backtrack";
MP3U_BACKTRACK.type = BoardType.DUEL;
MP3U_BACKTRACK.boardDefFile = 582;
MP3U_BACKTRACK.bgDir = 29;
MP3U_BACKTRACK.img = {
  boardSelectImg: 86,
  splashLogoImg: 39,
  splashLogoTextImg: 45,
  miniMapWithBg: 319, // dir 19
  miniMapDots: 320,
};

export function getBoardInfos() {
  return [
    MP3_CHILLY,
    MP3_BLOOBER,
    MP3_SPINY,
    MP3_WOODY,
    MP3_CAVERN,
    MP3_WALUIGI,

    MP3U_GATEGUY,
    MP3U_ARROWHEAD,
    MP3U_PIPESQUEAK,
    MP3U_BLOWHARD,
    MP3U_MRMOVER,
    MP3U_BACKTRACK,
  ];
}

/*
    {
      "name": "Training?",
      "fileNum": 576,
      "bgNum": 21,
    }
    {
      "name": "mystery",
      "fileNum": 583,
      "bgNum": 30,
    },
  ];
*/
