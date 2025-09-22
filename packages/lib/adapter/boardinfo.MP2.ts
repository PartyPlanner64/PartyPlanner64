import { createBoardInfo } from "./boardinfobase";
import { IBoard } from "../../../apps/partyplanner64/boards";
import { strings } from "../fs/strings";
import { arrayToArrayBuffer } from "../utils/arrays";
import { toPack } from "../utils/img/ImgPack";
import { CostumeType } from "../types";
import { romhandler } from "../romhandler";

// Western Land - (U) ROM
const MP2_WESTERN = createBoardInfo("MP2_WESTERN", {
  name: "Western Land",
  canOverwrite: true,
  boardDefFile: 64,
  bgDir: 2,
  animBgSet: 0,
  costumeType: CostumeType.WESTERN,
  str: {
    boardSelect: 197,
    boardNames: [190, 210],
    boardGreeting: [1248, 1249],
    boardWinner: 707,
    boardPlayCount: 1327,
  },
  img: {
    introLogoImg: 406,
    pauseLogoImg: 380,
    boardSelectImg: 30,
    boardSelectIconCoords: [39, 20],
    boardSelectIconMask: 20,
  },
  mainfsEventFile: [10, 682],
  mainfsBoardFile: [10, 683],
  sceneIndex: 0x3e, // 62
  // First I tried 0x0029CF24 / 0x80107C54, but then I included the star event
  // at 0x0029E91C / 0x80?. But then, using items NOP sledded, and I found a mystery
  // table at 0x800DF720 that suggests I should use this actually:
  eventASMStart: 0xd350, // 0x8010FB50, 0x002A4E20
  eventASMEnd: 0xeae4, // 0x801112E4, 0x002A65B4
  // spaceEventsStartAddr: 0x0011280C,
  // spaceEventsStartOffset: 0x002A7ADC,
  // spaceEventsEndOffset: 0x002A7BE0,
  spaceEventTables: [
    { upper: 0x33ec, lower: 0x33f4 }, // 0x80105BEC, 0x80105BF4, table 0x80112484
    { upper: 0x33f8, lower: 0x3400, primary: true }, // 0x80105BF8, 0x80105C00, table 0x8011280C
    { upper: 0x3404, lower: 0x340c }, // 0x80105C04, 0x80105C0C, table 0x801124EC
  ],
  starSpaceArrOffset: [0xf184, 0xf1f4], // [0x002A6C54, 0x002A6CC4], // 0x80111984, 0x801119F4
  starSpaceCount: 7,
  toadSpaceArrOffset: [0xf194, 0xf244], //  [0x002A6C64, 0x002A6D14],
  bankArrOffset: [0xf388], // [0x002A6E58], // 0x80111B88
  bankCoinArrOffset: [0xf26c], // [0x002A6D3C], // 0x80111A6C
  bankCount: 2,
  itemShopArrOffset: [0xf38c], // [0x002A6E5C], // 0x80111B8C
  itemShopCount: 1,
  booArrOffset: [0xf268], // [0x002A6D38], // 0x80111A68
  booCount: 2,
  audioIndexOffset: 0x33aa, // 0x0029AE7A; // 0x80105BAA

  onLoad: function (board: IBoard) {
    const hvqfs = romhandler.getRom()!.getHVQFS();
    board.otherbg.largescene = hvqfs.readBackground(MP2_WESTERN.bgDir + 2).src;
  },

  onAfterOverwrite: function (board: IBoard) {
    // Skip Bowser the Brash fight scene
    // 0x004F is the Bowser scene, 0x0051 is the results scene.
    // To debug, end game early with 0x800F93AF (turn count)
    // Then watch scene change 0x800FA63C
    const scenes = romhandler.getRom()!.getScenes();
    const sceneEndView = scenes.getDataView(82);
    sceneEndView.setUint16(0x2e0e, 0x0051); // 0x8010560C, 0x35BBEE

    // Then, make the scared Koopa's message at the endgame be more chill.
    let bytes: number[] = [];
    bytes.push(0x0b);
    bytes = bytes.concat(strings._strToBytes("Don't listen to Toad!"));
    bytes.push(0x0a); // \n
    bytes = bytes.concat(
      strings._strToBytes("I've got the results. Follow me!"),
    );
    bytes.push(0x00); // Null byte
    strings.write(697, arrayToArrayBuffer(bytes));

    // Hide some intro scene graphics
    // Bowser sign
    const mainfs = romhandler.getRom()?.getMainFS()!;
    let oldPack = mainfs.get(10, 410);
    let imgInfoArr = [
      { src: new ArrayBuffer(144 * 128 * 4), width: 144, height: 128, bpp: 32 },
    ];
    let newPack = toPack(imgInfoArr, 16, 0, oldPack);
    mainfs.write(10, 410, newPack);

    // Hole in ground that Bowser sign sticks into
    oldPack = mainfs.get(10, 411);
    imgInfoArr = [
      { src: new ArrayBuffer(32 * 16 * 4), width: 32, height: 16, bpp: 32 },
    ];
    newPack = toPack(imgInfoArr, 16, 0, oldPack);
    mainfs.write(10, 411, newPack);

    // (unused) Dust in the wind or whatever it is called
    oldPack = mainfs.get(10, 412);
    imgInfoArr = [
      { src: new ArrayBuffer(64 * 64 * 4), width: 64, height: 64, bpp: 32 },
    ];
    newPack = toPack(imgInfoArr, 16, 0, oldPack);
    mainfs.write(10, 412, newPack);

    // Train that rides across, model files can be blanked out
    // Cannot just blank model, does not work on console.
    //mainfs.write(10, 394, new ArrayBuffer(0x200));
    let form = mainfs.get(10, 394);
    let formView = new DataView(form);
    formView.setUint16(0x1fc, 0);
    formView.setUint16(0x1106, 0);
    mainfs.write(10, 394, form);

    //mainfs.write(10, 395, new ArrayBuffer(0x200));
    form = mainfs.get(10, 395);
    formView = new DataView(form);
    formView.setUint16(0x204, 0);
    formView.setUint16(0x616, 0);
    mainfs.write(10, 395, form);
  },
});

// Pirate Land - (U) ROM
const MP2_PIRATE = createBoardInfo("MP2_PIRATE");
MP2_PIRATE.name = "Pirate Land";
MP2_PIRATE.boardDefFile = 65;
MP2_PIRATE.bgDir = 10;
MP2_PIRATE.animBgSet = 1;
MP2_PIRATE.costumeType = CostumeType.PIRATE;
MP2_PIRATE.str = {
  boardSelect: 198,
};
MP2_PIRATE.img = {
  introLogoImg: 422,
  pauseLogoImg: 381,
  boardSelectImg: 31,
  boardSelectIconCoords: [35, 61],
};
//MP2_PIRATE.sceneIndex = 0x3F; // 63
MP2_PIRATE.arrowRotStartOffset = 0x00; // 0x801059F0
MP2_PIRATE.arrowRotEndOffset = 0x00; // 0x80105A30

// Horror Land - (U) ROM
const MP2_HORROR = createBoardInfo("MP2_HORROR");
MP2_HORROR.name = "Horror Land";
MP2_HORROR.boardDefFile = 66;
MP2_HORROR.bgDir = 21;
MP2_HORROR.animBgSet = 2;
MP2_HORROR.costumeType = CostumeType.HORROR;
MP2_HORROR.str = {
  boardSelect: 201,
};
MP2_HORROR.img = {
  introLogoImg: 581,
  pauseLogoImg: 382,
  boardSelectImg: 32,
  boardSelectIconCoords: [133, 60],
};
MP2_HORROR.sceneIndex = 0x43; // 67
MP2_HORROR.eventASMStart = 0; // 0x80112248 ballpark for safe start
MP2_HORROR.eventASMEnd = 0; // 0x80112C2C same, c2c is big boo event b2w
// MP2_HORROR.spaceEventsStartAddr = 0x0011466C; // There's more...
// MP2_HORROR.spaceEventsStartOffset = 0x002D9B5C;
// MP2_HORROR.spaceEventsEndOffset = 0x002D9CD4;
MP2_HORROR.spaceEventTables = [
  // Tables around 0x80114xxx
  { upper: 0x3854, lower: 0x385c }, // 0x80106054, 0x8010605C
  { upper: 0x3860, lower: 0x3868 }, // 0x80106060, 0x80106068
  { upper: 0x3898, lower: 0x38a0 }, // 0x80106098, 0x801060A0
  { upper: 0x38a4, lower: 0x38a8 }, // 0x801060A4, 0x801060A8 // Puts the JAL afterwards for some reason.
];

// Space Land - (U) ROM
const MP2_SPACE = createBoardInfo("MP2_SPACE");
MP2_SPACE.name = "Space Land";
MP2_SPACE.boardDefFile = 67;
MP2_SPACE.bgDir = 24;
MP2_SPACE.animBgSet = 3;
MP2_SPACE.costumeType = CostumeType.SPACE;
MP2_SPACE.str = {
  boardSelect: 199,
  boardNames: [193, 212],
};
MP2_SPACE.img = {
  introLogoImg: 500,
  pauseLogoImg: 383,
  boardSelectImg: 33,
  boardSelectIconCoords: [93, 10],
};

// Mystery Land - (U) ROM
const MP2_MYSTERY = createBoardInfo("MP2_MYSTERY");
MP2_MYSTERY.name = "Mystery Land";
MP2_MYSTERY.boardDefFile = 68;
MP2_MYSTERY.bgDir = 16;
MP2_MYSTERY.costumeType = CostumeType.MYSTERY;
MP2_MYSTERY.str = {
  boardSelect: 200,
};
MP2_MYSTERY.img = {
  introLogoImg: 502,
  pauseLogoImg: 384,
  boardSelectImg: 34,
  boardSelectIconCoords: [139, 19],
};

// Bowser Land - (U) ROM
const MP2_BOWSER = createBoardInfo("MP2_BOWSER");
MP2_BOWSER.name = "Bowser Land";
MP2_BOWSER.boardDefFile = 69;
MP2_BOWSER.bgDir = 37;
MP2_BOWSER.animBgSet = 4;
MP2_BOWSER.costumeType = CostumeType.NORMAL;
MP2_BOWSER.str = {
  boardSelect: 202,
};
MP2_BOWSER.img = {
  introLogoImg: 547,
  pauseLogoImg: 385,
  boardSelectImg: 35,
};

/*
{
  "name": "Mini-Game Stadium",
  "fileNum": 70,
  "bgNum": 37,
  "titleImg": 386,
},
{
  "name": "mystery",
  "fileNum": 71,
  "bgNum": 59,
  "titleImg": 387,
},
{
  "name": "mystery",
  "fileNum": 72,
  "bgNum": 59,
  "titleImg": 387,
},
{
  "name": "mystery",
  "fileNum": 73,
  "bgNum": 59,
  "titleImg": 387,
},
{
  "name": "mystery",
  "fileNum": 74,
  "bgNum": 59,
  "titleImg": 387,
},
{
  "name": "mystery",
  "fileNum": 75,
  "bgNum": 59,
  "titleImg": 387,
},
{
  "name": "mystery",
  "fileNum": 76,
  "bgNum": 59,
  "titleImg": 387,
},
{
  "name": "mystery",
  "fileNum": 77,
  "bgNum": 59,
  "titleImg": 387,
},
{
  "name": "mystery",
  "fileNum": 78,
  "bgNum": 59,
  "titleImg": 387,
},
{
  "name": "mystery",
  "fileNum": 79,
  "bgNum": 59,
  "titleImg": 387,
},
{
  "name": "Rules Land",
  "fileNum": 80,
  "bgNum": 43,
  //"titleImg": ,
},
*/
/*
  const _boardLocData = [
    {
      "name": "Mini-Game Stadium",
      "fileNum": 70,
      "bgNum": 37,
      "titleImg": 386,
    },
    {
      "name": "mystery",
      "fileNum": 71,
      "bgNum": 59,
      "titleImg": 387,
    },
    {
      "name": "mystery",
      "fileNum": 72,
      "bgNum": 59,
      "titleImg": 387,
    },
    {
      "name": "mystery",
      "fileNum": 73,
      "bgNum": 59,
      "titleImg": 387,
    },
    {
      "name": "mystery",
      "fileNum": 74,
      "bgNum": 59,
      "titleImg": 387,
    },
    {
      "name": "mystery",
      "fileNum": 75,
      "bgNum": 59,
      "titleImg": 387,
    },
    {
      "name": "mystery",
      "fileNum": 76,
      "bgNum": 59,
      "titleImg": 387,
    },
    {
      "name": "mystery",
      "fileNum": 77,
      "bgNum": 59,
      "titleImg": 387,
    },
    {
      "name": "mystery",
      "fileNum": 78,
      "bgNum": 59,
      "titleImg": 387,
    },
    {
      "name": "mystery",
      "fileNum": 79,
      "bgNum": 59,
      "titleImg": 387,
    },
    {
      "name": "Rules Land",
      "fileNum": 80,
      "bgNum": 43,
      //"titleImg": ,
    },
  ];*/

export function getBoardInfos() {
  return [
    MP2_WESTERN,
    MP2_PIRATE,
    MP2_HORROR,
    MP2_SPACE,
    MP2_MYSTERY,
    MP2_BOWSER,
  ];
}
