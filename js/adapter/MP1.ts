import { AdapterBase, IBoardInfo } from "./AdapterBase";
import { ISpace, addEventToSpace, IBoard } from "../boards";
import { Space, SpaceSubtype, Game } from "../types";
import { create as createEvent } from "../events/events";
import { parse as parseInst } from "mips-inst";
import { strings } from "../fs/strings";
import { arrayToArrayBuffer, arrayBufferToDataURL } from "../utils/arrays";
import { romhandler } from "../romhandler";
import { fromTiles, toTiles } from "../utils/img/tiler";
import { FORM } from "../models/FORM";
import { mainfs } from "../fs/mainfs";
import { createContext } from "../utils/canvas";
import { BMPfromRGBA } from "../utils/img/BMP";
import { toArrayBuffer } from "../utils/image";
import { toPack } from "../utils/img/ImgPack";
import { prepAsm } from "../events/prepAsm";
import { assemble } from "mips-assembler";

export const MP1 = new class MP1Adapter extends AdapterBase {
  public gameVersion: 1 | 2 | 3 = 1;

  public nintendoLogoFSEntry: number[] = [9, 110];
  public hudsonLogoFSEntry: number[] = [9, 111];
  public boardDefDirectory: number = 10;

  public MAINFS_READ_ADDR: number = 0x000145B0;
  public HEAP_FREE_ADDR: number = 0x00014730;
  public TABLE_HYDRATE_ADDR: number = 0x0004C900;

  public SCENE_TABLE_ROM: number = 0x000C2874;

  constructor() {
    super();
  }

  // Gives a new space the default things it would need.
  hydrateSpace(space: ISpace) {
    if (space.type === Space.STAR) {
      space.star = true;
    }
    else if (space.type === Space.CHANCE) {
      addEventToSpace(space, createEvent("CHANCETIME"));
    }
  }

  onLoad(board: IBoard, boardInfo: IBoardInfo) {
    this._extractKoopa(board, boardInfo);
    this._extractBowser(board, boardInfo);
    this._extractGoomba(board, boardInfo);
  }

  onAfterOverwrite(romView: DataView, board: IBoard, boardInfo: IBoardInfo) {
    this._writeKoopa(board, boardInfo);
    this._writeBowser(board, boardInfo);

    // Patch game to use all 8MB.
    romView.setUint16(0x3BF62, 0x8040); // Main heap now starts at 0x80400000
    romView.setUint16(0x3BF6A, (0x00400000 - this.EVENT_MEM_SIZE) >>> 16); // ... and can fill up through the reserved event location
    romView.setUint16(0x3BF76, 0x0020); // Temp heap fills as much as 0x200000
    romView.setUint16(0x5F3F6, 0x0020);

    // Patch HVQ decode RAM 0x4a3a4 to redirect to raw decode hook.
    let romStartOffset = 0xCBFD0;
    let asmStartOffset = 0xCB3D0;
    romView.setUint32(0x4AFD4, parseInst(`J ${asmStartOffset}`));

    // Patch over some debug strings with logic to handle raw images.
    romView.setUint32(romStartOffset, parseInst("LW S5, 0x0(A0)"));
    romView.setUint32(romStartOffset += 4, parseInst("LUI S6, 0x4856")); // "HV"
    romView.setUint32(romStartOffset += 4, parseInst("ADDIU S6, S6, 0x5120")); // "Q "
    romView.setUint32(romStartOffset += 4, parseInst(`BEQ S5, S6, 12`)); // +12 instructions
    romView.setUint32(romStartOffset += 4, 0); // NOP
    romView.setUint32(romStartOffset += 4, parseInst("ADDU S5, R0, A1"));
    romView.setUint32(romStartOffset += 4, parseInst("ADDIU S6, S5, 0x1800")); // (64 x 48 tile)
    romView.setUint32(romStartOffset += 4, parseInst("ADDU S7, R0, A0"));
    romView.setUint32(romStartOffset += 4, parseInst("LW GP, 0(S7)"));
    romView.setUint32(romStartOffset += 4, parseInst("SW GP, 0(S5)"));
    romView.setUint32(romStartOffset += 4, parseInst("ADDIU S5, S5, 4"));
    romView.setUint32(romStartOffset += 4, parseInst("ADDIU S7, S7, 4")); // ADDIU S7, S7, 4
    romView.setUint32(romStartOffset += 4, parseInst("BEQ S5, S6, 9")); // +9 instructions
    romView.setUint32(romStartOffset += 4, 0); // NOP
    romView.setUint32(romStartOffset += 4, parseInst(`J ${asmStartOffset + 0x20}`)); // J back to LW
    romView.setUint32(romStartOffset += 4, 0); // NOP
    romView.setUint32(romStartOffset += 4, parseInst("ADDU S5, R0, R0"));
    romView.setUint32(romStartOffset += 4, parseInst("ADDU S6, R0, R0"));
    romView.setUint32(romStartOffset += 4, parseInst("ADDU S7, R0, R0"));
    romView.setUint32(romStartOffset += 4, parseInst("ADDU GP, R0, R0"));
    romView.setUint32(romStartOffset += 4, parseInst("JAL 0x7F54C")); // JAL HVQDecode
    romView.setUint32(romStartOffset += 4, 0); // NOP
    romView.setUint32(romStartOffset += 4, parseInst("ADDU S5, R0, R0"));
    romView.setUint32(romStartOffset += 4, parseInst("ADDU S6, R0, R0"));
    romView.setUint32(romStartOffset += 4, parseInst("ADDU S7, R0, R0"));
    romView.setUint32(romStartOffset += 4, parseInst("ADDU GP, R0, R0"));
    romView.setUint32(romStartOffset += 4, parseInst("J 0x4A3DC")); // J back into original function, skipping HVQDecode
    romView.setUint32(romStartOffset += 4, 0); // NOP




    // const asm = prepAsm(`

    // `, undefined, {
    //   boardIndex: 0,
    //   board: board,
    //   curSpaceIndex: 0,
    //   curSpace: null as any,
    //   chains: new Array(),
    //   offset: 0x2418A0,
    //   addr: 0x800F65E0,
    //   game: Game.MP1_USA,
    //   gameVersion: 1,
    //   parameterValues: {},
    // });
    // const buff = assemble(asm) as ArrayBuffer;
    // console.log(buff);
    // saveAs(new Blob([buff]), "reassembly.bin");
  }

  onOverwritePromises(board: IBoard, boardInfo: IBoardInfo) {
    let bgIndex = boardInfo.bgDir;
    let bgPromises = [
      this._writeBackground(bgIndex, board.bg.src, board.bg.width, board.bg.height),
      this._writeBackground(bgIndex + 1, board.otherbg.largescene, 320, 240), // Game start, end
      this._writeBackground(bgIndex + 2, board.otherbg.conversation, 320, 240), // Conversation
      this._writeBackground(bgIndex + 3, board.otherbg.conversation, 320, 240), // Treasure thing...
      this._writeBackground(bgIndex + 4, board.bg.src, 320, 240), // Overview map
      this._writeBackground(bgIndex + 5, board.bg.src, 320, 240), // End game overview map
      this._writeBackground(bgIndex + 6, board.otherbg.splashscreen, 320, 240), // Splashscreen bg
      this.onWriteBoardSelectImg(board, boardInfo), // The board select image/icon
      this.onWriteBoardLogoImg(board, boardInfo), // Various board logos
      this._brandBootSplashscreen(),
    ];

    return Promise.all(bgPromises)
  }

  onWriteEventAsmHook(romView: DataView, boardInfo: IBoardInfo, boardIndex: number) {
    
  }

  onParseStrings(board: IBoard, boardInfo: IBoardInfo) {
    let strs = boardInfo.str || {};
    if (strs.boardSelect) {
      let idx = strs.boardSelect;
      if (Array.isArray(idx))
        idx = idx[0];

      let str = strings.read(idx)
      let lines = str.split("\n");

      // Read the board name and description.
      let nameStart = lines[0].indexOf(">") + 1;
      let nameEnd = lines[0].indexOf("<", nameStart);
      board.name = lines[0].substring(nameStart, nameEnd);
      board.description = [lines[1], lines[2]].join("\n");

      // Parse difficulty star level
      let difficulty = 0;
      let lastIndex = str.indexOf(this.getCharacterMap()[0x2A], 0);
      while (lastIndex !== -1) {
        difficulty++;
        lastIndex = str.indexOf(this.getCharacterMap()[0x2A], lastIndex + 1);
      }
      board.difficulty = difficulty;
    }
  }

  onWriteStrings(board: IBoard, boardInfo: IBoardInfo) {
    let strs = boardInfo.str || {};
    if (strs.boardSelect) {
      let bytes = [];
      bytes.push(0x0B); // Clear?
      bytes.push(0x05); // Start GREEN
      bytes = bytes.concat(strings._strToBytes(board.name || ""));
      bytes.push(0x02); // Start DEFAULT
      bytes.push(0x0A); // \n
      bytes = bytes.concat(strings._strToBytes(board.description || "")); // Assumes \n's are correct within.
      bytes.push(0x0A); // \n
      bytes = bytes.concat([0x10, 0x10, 0x10, 0x10, 0x10, 0x10]); // Spaces
      bytes.push(0x06); // Start BLUE
      bytes = bytes.concat(strings._strToBytes("Map Difficulty  "));
      let star = 0x2A;
      if (board.difficulty > 5 || board.difficulty < 1) { // Hackers!
        bytes.push(star);
        bytes = bytes.concat(strings._strToBytes(" "));
        bytes.push(0x3E); // Little x
        bytes = bytes.concat(strings._strToBytes(" " + board.difficulty.toString()));
      }
      else {
        for (let i = 0; i < board.difficulty; i++)
          bytes.push(star);
      }
      bytes.push(0x02); // Start DEFAULT
      bytes.push(0x00); // Null byte

      let strBuffer = arrayToArrayBuffer(bytes);

      let idx = strs.boardSelect;
      if (Array.isArray(idx)) {
        for (let i = 0; i < idx.length; i++) {
          strings.write(idx[i], strBuffer);
        }
      }
      else {
        strings.write(idx, strBuffer);
      }
    }

    // For now, just make Koopa's intro neutral.
    if (strs.koopaIntro) {
      let bytes: number[] = [];
      bytes = bytes.concat(strings._strToBytes("Welcome, everybody!\nI am your guide,\nKoopa Troopa."));
      bytes.push(0xFF); // PAUSE
      bytes.push(0x0B); // Clear?
      bytes = bytes.concat(strings._strToBytes("Now then,\nlet's decide turn order."));
      bytes.push(0xFF); // PAUSE
      bytes.push(0x00); // Null byte

      let strBuffer = arrayToArrayBuffer(bytes);
      strings.write(strs.koopaIntro, strBuffer);
    }

    // For now, just make a generic comment.
    if (strs.starComments) {
      let bytes: number[] = [];
      bytes = bytes.concat(strings._strToBytes("Good luck!\nWith enough stars, you\ncould be the superstar!"));
      bytes.push(0xFF); // PAUSE
      bytes.push(0x00); // Null byte

      let strBuffer = arrayToArrayBuffer(bytes);
      for (let i = 0; i < strs.starComments.length; i++)
        strings.write(strs.starComments[i], strBuffer);
    }
  }

  onChangeBoardSpaceTypesFromGameSpaceTypes(board: IBoard, chains: number[][]) {
    // Space types match MP1 exactly.
  }

  onChangeGameSpaceTypesFromBoardSpaceTypes(board: IBoard) {
  }

  _extractKoopa(board: IBoard, boardInfo: IBoardInfo) {
    if (!boardInfo.koopaSpaceInst)
      return;

    let boardView = romhandler.getDataView();
    let koopaSpace = boardView.getUint16(boardInfo.koopaSpaceInst + 2);
    if (board.spaces[koopaSpace])
      board.spaces[koopaSpace].subtype = SpaceSubtype.KOOPA;
  }

  _writeKoopa(board: IBoard, boardInfo: IBoardInfo) {
    if (!boardInfo.koopaSpaceInst)
      return;

    let koopaSpace;
    for (let i = 0; i < board.spaces.length; i++) {
      if (board.spaces[i].subtype === SpaceSubtype.KOOPA) {
        koopaSpace = i;
        break;
      }
    }

    koopaSpace = (koopaSpace === undefined ? board._deadSpace! : koopaSpace);
    let boardView = romhandler.getDataView();
    boardView.setUint16(boardInfo.koopaSpaceInst + 2, koopaSpace);
  }

  _extractBowser(board: IBoard, boardInfo: IBoardInfo) {
    if (!boardInfo.bowserSpaceInst)
      return;

    let boardView = romhandler.getDataView();
    let bowserSpace = boardView.getUint16(boardInfo.bowserSpaceInst + 2);
    if (board.spaces[bowserSpace])
      board.spaces[bowserSpace].subtype = SpaceSubtype.BOWSER;
  }

  _writeBowser(board: IBoard, boardInfo: IBoardInfo) {
    if (!boardInfo.bowserSpaceInst)
      return;

    let bowserSpace;
    for (let i = 0; i < board.spaces.length; i++) {
      if (board.spaces[i].subtype === SpaceSubtype.BOWSER) {
        bowserSpace = i;
        break;
      }
    }

    bowserSpace = (bowserSpace === undefined ? board._deadSpace! : bowserSpace);
    let boardView = romhandler.getDataView();
    boardView.setUint16(boardInfo.bowserSpaceInst + 2, bowserSpace);
  }

  _extractGoomba(board: IBoard, boardInfo: IBoardInfo) {
    if (!boardInfo.goombaSpaceInst)
      return;

    let boardView = romhandler.getDataView();
    let goombaSpace = boardView.getUint16(boardInfo.goombaSpaceInst + 2);
    if (board.spaces[goombaSpace])
      board.spaces[goombaSpace].subtype = SpaceSubtype.GOOMBA;
  }

  onParseBoardSelectImg(board: IBoard, boardInfo: IBoardInfo) {
    if (!boardInfo.img.boardSelectImg)
      return;

    let boardSelectFORM = mainfs.get(9, boardInfo.img.boardSelectImg);
    let boardSelectUnpacked = FORM.unpack(boardSelectFORM)!;
    let boardSelectImgTiles = [
      new DataView(boardSelectUnpacked.BMP1[0].parsed.src),
      new DataView(boardSelectUnpacked.BMP1[1].parsed.src),
      new DataView(boardSelectUnpacked.BMP1[2].parsed.src),
      new DataView(boardSelectUnpacked.BMP1[3].parsed.src)
    ];
    let boardSelectImg = fromTiles(boardSelectImgTiles, 2, 2, 64 * 4, 32);
    board.otherbg.boardselect = arrayBufferToDataURL(boardSelectImg, 128, 64);
    // $$log(board.otherbg.boardselect);
  }

  onWriteBoardSelectImg(board: IBoard, boardInfo: IBoardInfo) {
    return new Promise(function(resolve, reject) {
      let boardSelectIndex = boardInfo.img.boardSelectImg;
      if (!boardSelectIndex) {
        resolve();
        return;
      }

      // We need to write the image onto a canvas to get the RGBA32 values.
      let [width, height] = [128, 64];
      let canvasCtx = createContext(width, height);
      let srcImage = new Image();
      let failTimer = setTimeout(() => reject(`Failed to write boardselect for ${boardInfo.name}`), 45000);
      srcImage.onload = () => {
        canvasCtx.drawImage(srcImage, 0, 0, width, height);
        let imgData = canvasCtx.getImageData(0, 0, width, height);

        // First, turn the image back into 4 BMP tiles
        let boardSelectImgTiles = toTiles(imgData.data, 2, 2, (width / 2) * 4, height / 2);
        let boardSelectBmps = boardSelectImgTiles.map(tile => {
          return BMPfromRGBA(tile, 32, 8);
        });

        // Now write the BMPs back into the FORM.
        let boardSelectFORM = mainfs.get(9, boardSelectIndex);
        let boardSelectUnpacked = FORM.unpack(boardSelectFORM)!;
        for (let i = 0; i < 4; i++) {
          let palette = boardSelectBmps[i][1];

          // FIXME: This is padding the palette count a bit.
          // For some reason, the images get corrupt with very low palette count.
          while (palette.colors.length < 17) {
            palette.colors.push(0x00000000);
          }
          FORM.replaceBMP(boardSelectUnpacked, i, boardSelectBmps[i][0], palette);
        }

        // Now write the FORM.
        let boardSelectPacked = FORM.pack(boardSelectUnpacked);
        //saveAs(new Blob([boardSelectPacked]), "formPacked");
        mainfs.write(9, boardSelectIndex, boardSelectPacked);

        clearTimeout(failTimer);
        resolve();
      };
      srcImage.src = board.otherbg.boardselect;
    });
  }

  onParseBoardLogoImg(board: IBoard, boardInfo: IBoardInfo) {
    if (!boardInfo.img.pauseLogoImg)
      return;

    board.otherbg.boardlogo = this._readImgFromMainFS(10, boardInfo.img.pauseLogoImg, 0);
  }

  onWriteBoardLogoImg(board: IBoard, boardInfo: IBoardInfo) {
    return new Promise((resolve, reject) => {
      let introLogoImgs = boardInfo.img.introLogoImg;
      let pauseLogoImg = boardInfo.img.pauseLogoImg;
      if (!introLogoImgs && !pauseLogoImg) {
        resolve();
        return;
      }

      // We need to write the image onto a canvas to get the RGBA32 values.
      let [introWidth, introHeight] = boardInfo.img.introLogoImgDimens;

      let srcImage = new Image();
      let failTimer = setTimeout(() => reject(`Failed to write logos for ${boardInfo.name}`), 45000);
      srcImage.onload = () => {
        // Write the intro logo images.
        if (introLogoImgs) {
          let imgBuffer = toArrayBuffer(srcImage, introWidth, introHeight);

          if (!Array.isArray(introLogoImgs))
            introLogoImgs = [introLogoImgs];
          for (let i = 0; i < introLogoImgs.length; i++) {
            let logoImgIdx = introLogoImgs[i];

            // First, read the old image pack.
            let oldPack = mainfs.get(10, logoImgIdx);

            // Then, pack the image and write it.
            let imgInfoArr = [
              {
                src: imgBuffer,
                width: introWidth,
                height: introHeight,
                bpp: 32,
              }
            ];
            let newPack = toPack(imgInfoArr, 16, 0, oldPack);
            // saveAs(new Blob([newPack]), "imgpack");
            mainfs.write(10, logoImgIdx, newPack);
          }
        }

        if (pauseLogoImg) { // Always 200x82
          let imgBuffer = toArrayBuffer(srcImage, 200, 82);

          // First, read the old image pack.
          let oldPack = mainfs.get(10, pauseLogoImg);
          //saveAs(new Blob([oldPack]), "oldpauseimgpack");
          // Then, pack the image and write it.
          let imgInfoArr = [
            {
              src: imgBuffer,
              width: 200,
              height: 82,
              bpp: 32,
            }
          ];
          let newPack = toPack(imgInfoArr, 16, 0, oldPack);
          //saveAs(new Blob([newPack]), "newPack");
          mainfs.write(10, pauseLogoImg, newPack);
        }

        clearTimeout(failTimer);
        resolve();
      };
      srcImage.src = board.otherbg.boardlogo;
    });
  }

  _clearOtherBoardNames(boardIndex: number) {
    // There is an ugly comic-sansy board name graphic in the after-game results.
    // We will just make it totally transparent because it is not important.
    let resultsBoardNameImgPack = mainfs.get(10, 406 + boardIndex);
    let imgPackU8Array = new Uint8Array(resultsBoardNameImgPack);
    imgPackU8Array.fill(0, 0x2C); // To the end
    mainfs.write(10, 406 + boardIndex, resultsBoardNameImgPack);
  }

  getAudioMap() {
    return [
      "", // "Two Beeps",
      "Mario Party Theme",
      "Peaceful Mushroom Village",
      "",
      "",
      "Option House Theme",
      "Opening", // Mushroom Shop Theme??
      "Mini-Game House Theme",
      "DK's Jungle Adventure Theme",
      "Peach's Birthday Cake Theme",
      "Yoshi's Tropical Island Theme",
      "Wario's Battle Canyon Theme",
      "Luigi's Engine Room Theme",
      "Mario's Rainbow Castle Theme",
      "Magma Mountain Theme",
      "Eternal Star Theme",
      "Outcome of Adventure", // 0x10
      "Start of Adventure",
      "Bowser Meeting",
      "Last 5 Turns",
      "", // "Two Beeps",
      "Play A Mini-Game",
      "Results",
      "", // "Mario's Bandstand Theme",
      "Move to the Mambo",
      "Wide, Wide Ocean",
      "Mushroom Forest",
      "Ducking and Dodging",
      "Full of Danger",
      "Coins of the World",
      "Taking Coins",
      "The Room Underground",
      "Slowly, Slowly", // 0x20
      "Dodging Danger",
      "Let's Limbo!",
      "Let's Go Lightly",
      "Chance Time",
      "Can It Be Done",
      "Faster Than All",
      "Saving Courage",
      "", // "Two Beeps",
      "", // "Two Beeps",
      "Playing the Game",
      "Where Have The Stars Gone?",
      "", // "Two Beeps",
      "", // "Mario Bandstand",
      "", // "Mario Bandstand",
      "The Stolen Star",
      "Bowser's Chance Game", // 0x30
      "Waterfall?",
      "", // "Mini-Game Finished",
      "", // "Mini-Game Finished",
      "", // "Mini-Game Abysmal Finish",
      "", // "Mini-Game Finish?",
      "", // "Mini-Game Finish",
      "", // "Mini-Game Finish",
      "", // "Strange finish",
      "", // "Board Map Fan-fare",
      "", // "Board Map Overview",
      "", // "Selecting star person?",
      "", // "Selecting some person?",
      "", // "Fanfare of some sort",
      "", // "Two Beeps",
      "", // "Following star get fan-fare",
      "After the Victory", // 0x40
      "Mini-Game Island",
      "Mini-Game Island",
      "Mini-Game Island",
      "Mini-Game Island",
      "Mini-Game Island",
      "Mini-Game Island (Bowser)",
      "Mini-Game Island",
      "Mini-Game Island (Aquatic)",
      "", // "Two Beeps",
      "", // "Two Beeps",
      "", // "Two Beeps",
      "", // "Two Beeps",
      "", // "Two Beeps",
      "", // "Two Beeps",
      "", // "Two Beeps",
      "", // "Two Beeps", // 0x50
    ];
  }

  getCharacterMap(): { [num: number]: string } {
    return {
      0x00: "", // NULL terminator
      0x01: "<BLACK>", // Start black font
      0x02: "<DEFAULT>", // Start default font
      0x03: "<RED>", // Start red font
      0x04: "<PURPLE>", // Start purple font
      0x05: "<GREEN>", // Start green font
      0x06: "<BLUE>", // Start blue font
      0x07: "<YELLOW>", // Start yellow font
      0x08: "<WHITE>", // Start white font
      0x09: "<SEIZURE>", // Start flashing font
      0x0A: "\n",
      0x0B: "\u3014", // FEED Carriage return / start of bubble?
      0x0C: "○", // 2ND BYTE OF PLAYER CHOICE
      0x0D: "\t", // UNCONFIRMED / WRONG
      0x0E: "\t", // 1ST BYTE OF PLAYER CHOICE
      // 0x0F - nothing
      0x10: " ",
      0x11: "{0}", // These are format params that get replaced with various things
      0x12: "{1}",
      0x13: "{2}",
      0x14: "{3}",
      0x15: "{4}",
      0x16: "{5}",
      // Theoretically there may be more up through 0x20?
      // 0x18 - nothing
      // 0x20 - nothing
      0x21: "\u3000", // ! A button
      0x22: "\u3001", // " B button
      0x23: "\u3002", //  C-up button
      0x24: "\u3003", //  C-right button
      0x25: "\u3004", //  C-left button
      0x26: "\u3005", // & C-down button
      0x27: "\u3006", // ' Z button
      0x28: "\u3007", // ( Analog stick
      0x29: "\u3008", // ) (coin)
      0x2A: "\u3009", // * Star
      0x2B: "\u3010", // , S button
      0x2C: "\u3011", // , R button
      // 0x2D - nothing
      // 0x2E - nothing
      // 0x2F - nothing
      // 0x30 - 0x39: 0-9 ascii
      0x3A: "\u3012", // Hollow coin
      0x3B: "\u3013", // Hollow star
      0x3C: "+", // <
      0x3D: "-", // =
      0x3E: "x", // > Little x
      0x3F: "->", // Little right ARROW
      // 0x40 - nothing
      // 0x41 - 0x5A: A-Z ascii
      0x5B: "\"", // [ End quotes
      0x5C: "'", // \ Single quote
      0x5D: "(", // ] Open parenthesis
      0x5E: ")",
      0x5F: "/", // _
      // 0x60 - nothing
      // 0x61 - 0x7A: a-z ascii
      0x7B: ":", // :
      0x80: "\"", // Double quote no angle
      0x81: "°", // . Degree
      0x82: ",", // ,
      0x83: "°", // Low circle FIXME
      0x85: ".", // … Period
      0xC0: "“", // A`
      0xC1: "”", // A'
      0xC2: "!", // A^
      0xC3: "?", // A~
      0xFF: "\u3015", // PAUSE
    };
  }
}
