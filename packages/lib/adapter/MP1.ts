import { AdapterBase } from "./AdapterBase";
import {
  addEventToSpaceInternal,
  getDeadSpaceIndex,
} from "../../../apps/partyplanner64/boards";
import { Space, SpaceSubtype, GameVersion } from "../types";
import { createEventInstance, EventMap } from "../events/events";
import { parse as parseInst } from "mips-inst";
import { arrayToArrayBuffer, arrayBufferToDataURL } from "../utils/arrays";
import { fromTiles, toTiles } from "../utils/img/tiler";
import { FORM } from "../models/FORM";
import { BMPfromRGBA } from "../utils/img/BMP";
import { toArrayBuffer } from "../utils/image";
import { toPack } from "../utils/img/ImgPack";
import { assemble } from "mips-assembler";
import { createBoardOverlay } from "./MP1.U.boardoverlay";
import { IBoardInfo } from "./boardinfobase";
import { ChanceTime } from "../events/builtin/MP1/U/ChanceTimeEvent1";
import { StarChanceEvent } from "../events/builtin/MP1/U/StarChanceEvent1";
import { getImageData } from "../utils/img/getImageData";
import { getSoundEffectMapMP1 } from "./MP1.U.soundeffects";
import { getEventsInLibrary } from "../events/EventLibrary";
import { getAudioMapMP1 } from "./MP1.U.audio";
import { createImage } from "../utils/canvas";
import { romhandler } from "../romhandler";
import { strToBytes } from "../fs/strings";
import { IBoard, ISpace } from "../boards";

export class MP1Adapter extends AdapterBase {
  public gameVersion: GameVersion = 1;

  public nintendoLogoFSEntry: number[] = [9, 110];
  public hudsonLogoFSEntry: number[] = [9, 111];
  public boardDefDirectory = 10;

  public MAINFS_READ_ADDR = 0x000145b0;
  public HEAP_FREE_ADDR = 0x00014730;
  public TABLE_HYDRATE_ADDR = 0x0004c900;

  // Gives a new space the default things it would need.
  hydrateSpace(space: ISpace, board: IBoard, eventLibrary: EventMap) {
    if (space.type === Space.STAR) {
      space.star = true;
    } else if (space.type === Space.CHANCE) {
      addEventToSpaceInternal(
        board,
        space,
        createEventInstance(ChanceTime),
        false,
        eventLibrary,
      );
    }
  }

  onLoad(board: IBoard, boardInfo: IBoardInfo, boardWasStashed: boolean) {
    if (!boardWasStashed) {
      this._extractKoopa(board, boardInfo);
      this._extractBowser(board, boardInfo);
      this._extractGoomba(board, boardInfo);
    }
  }

  onCreateBoardOverlay(
    board: IBoard,
    boardInfo: IBoardInfo,
    boardIndex: number,
    audioIndices: number[],
  ) {
    return createBoardOverlay(board, boardInfo, boardIndex, audioIndices);
  }

  onAfterOverwrite(
    romView: DataView<ArrayBuffer>,
    board: IBoard,
    boardInfo: IBoardInfo,
    boardIndex: number,
  ): void {
    // this._writeKoopa(board, boardInfo);
    // this._writeBowser(board, boardInfo);

    // Patch game to use all 8MB.
    romView.setUint16(0x3bf62, 0x8040); // Main heap now starts at 0x80400000
    romView.setUint16(0x3bf6a, (0x00400000 - this.EVENT_MEM_SIZE) >>> 16); // ... and can fill up through the reserved event location
    romView.setUint16(0x3bf76, 0x0020); // Temp heap fills as much as 0x200000
    romView.setUint16(0x5f3f6, 0x0020);

    // Patch HVQ decode RAM 0x4a3a4 to redirect to raw decode hook.
    const romStartOffset = 0xcbfd0;
    const asmStartOffset = 0xcb3d0;
    romView.setUint32(0x4afd4, parseInst(`J ${asmStartOffset}`));

    // Patch over some debug strings with logic to handle raw images.
    const hvqAsm = `
      .orga ${romStartOffset}
      LW S5, 0x0(A0)
      LUI S6, 0x4856 // "HV"
      ADDIU S6, S6, 0x5120 // "Q "
      BEQ S5, S6, call_hvq_decode
      NOP
      ADDU S5, R0, A1
      ADDIU S6, S5, 0x1800 // (64 x 48 tile)
      ADDU S7, R0, A0
      LW GP, 0(S7)
      SW GP, 0(S5)
      ADDIU S5, S5, 4
      ADDIU S7, S7, 4
      BEQ S5, S6, ret_to_hook
      NOP
      J ${asmStartOffset + 0x20} // J back to LW
      NOP
    call_hvq_decode:
      ADDU S5, R0, R0
      ADDU S6, R0, R0
      ADDU S7, R0, R0
      ADDU GP, R0, R0
      JAL 0x7F54C // JAL HVQDecode
      NOP
    ret_to_hook:
      ADDU S5, R0, R0
      ADDU S6, R0, R0
      ADDU S7, R0, R0
      ADDU GP, R0, R0
      J 0x4A3DC // J back into original function, skipping HVQDecode
      NOP
    `;
    assemble(hvqAsm, { buffer: romView.buffer });
  }

  onOverwritePromises(
    board: IBoard,
    boardInfo: IBoardInfo,
    boardIndex: number,
  ) {
    const bgIndex = boardInfo.bgDir;
    let bgPromises = [
      this.onWriteBoardSelectImg(board, boardInfo), // The board select image/icon
      this.onWriteBoardLogoImg(board, boardInfo), // Various board logos
      this._brandBootSplashscreen(),
      this._writeBackground(
        bgIndex,
        board.bg.src,
        board.bg.width,
        board.bg.height,
      ),
      this._writeBackground(boardInfo.pauseBgDir!, board.bg.src, 320, 240), // Overview map
      this._writeAdditionalBackgrounds(board),
    ];

    switch (boardIndex) {
      case 0: // DK board
        bgPromises = bgPromises.concat([
          this._writeBackground(
            bgIndex + 1,
            board.otherbg.largescene!,
            320,
            240,
          ), // Game start, end
          this._writeBackground(
            bgIndex + 2,
            board.otherbg.conversation!,
            320,
            240,
          ), // Conversation
          this._writeBackground(
            bgIndex + 3,
            board.otherbg.conversation!,
            320,
            240,
          ), // Treasure thing...
          // Pause bg
          this._writeBackground(bgIndex + 5, board.bg.src, 320, 240), // End game overview map
          this._writeBackground(
            bgIndex + 6,
            board.otherbg.splashscreen!,
            320,
            240,
          ), // Splashscreen bg
        ]);
        break;

      case 1: // Peach board
        bgPromises = bgPromises.concat([
          this._writeBackground(
            bgIndex + 1,
            board.otherbg.largescene!,
            320,
            240,
          ), // Game start, end
          this._writeBackground(
            bgIndex + 2,
            board.otherbg.conversation!,
            320,
            240,
          ), // Mini-Game results, Boo?
          this._writeBackground(
            bgIndex + 3,
            board.otherbg.conversation!,
            320,
            240,
          ), // Conversation
          this._writeBackground(
            bgIndex + 4,
            board.otherbg.conversation!,
            320,
            240,
          ), // Visit Toad
          this._writeBackground(
            bgIndex + 5,
            board.otherbg.conversation!,
            320,
            240,
          ),
          this._writeBackground(
            bgIndex + 6,
            board.otherbg.largescene!,
            320,
            240,
          ), // Third end game cutscene bg
          // Pause bg
          this._writeBackground(bgIndex + 8, board.bg.src, 320, 240), // First end game cutscene bg
          this._writeBackground(bgIndex + 9, board.bg.src, 320, 240), // Second end game cutscene bg
          this._writeBackground(
            bgIndex + 10,
            board.otherbg.splashscreen!,
            320,
            240,
          ), // Splashscreen
        ]);
        break;

      case 2: // Yoshi board
        bgPromises = bgPromises.concat([
          // 18: bgDir
          this._writeBackground(
            bgIndex + 1 /* 19 */,
            board.otherbg.largescene!,
            320,
            240,
          ), // Game start, end
          this._writeBackground(
            bgIndex + 2 /* 20 */,
            board.otherbg.conversation!,
            320,
            240,
          ), // Conversation, Boo, Koopa
          this._writeBackground(
            bgIndex + 3 /* 21 */,
            board.otherbg.conversation!,
            320,
            240,
          ), // Conversation
          this._writeBackground(
            bgIndex + 4 /* 22 */,
            board.otherbg.conversation!,
            320,
            240,
          ), // Conversation, Toad
          this._writeBackground(
            bgIndex + 5 /* 23 */,
            board.otherbg.conversation!,
            320,
            240,
          ), // Conversation, Bowser
          this._writeBackground(bgIndex + 6 /* 24 */, board.bg.src, 320, 240), //
          // 25: Pause bg
          this._writeBackground(
            bgIndex + 8 /* 26 */,
            board.otherbg.splashscreen!,
            320,
            240,
          ), // Splashscreen
        ]);
        break;

      case 3: // Wario board
        bgPromises = bgPromises.concat([
          // 27: bgDir
          this._writeBackground(
            bgIndex + 1 /* 28 */,
            board.otherbg.largescene!,
            320,
            240,
          ), // Game start, end
          this._writeBackground(
            bgIndex + 2 /* 29 */,
            board.otherbg.conversation!,
            320,
            240,
          ), // Conversation, Koopa
          this._writeBackground(
            bgIndex + 3 /* 30 */,
            board.otherbg.conversation!,
            320,
            240,
          ), // Conversation, Bowser, Boo
          this._writeBackground(
            bgIndex + 4 /* 31 */,
            board.otherbg.conversation!,
            320,
            240,
          ), //
          this._writeBackground(
            bgIndex + 5 /* 32 */,
            board.otherbg.conversation!,
            320,
            240,
          ), // Conversation, Bowser, Toad
          this._writeBackground(bgIndex + 6 /* 33 */, board.bg.src, 320, 240), //
          this._writeBackground(
            bgIndex + 7 /* 34 */,
            board.otherbg.conversation!,
            320,
            240,
          ), //
          this._writeBackground(
            bgIndex + 8 /* 35 */,
            board.otherbg.conversation!,
            320,
            240,
          ), //
          // 36: Pause bg
          this._writeBackground(
            bgIndex + 10 /* 37 */,
            board.otherbg.conversation!,
            320,
            240,
          ), //
          this._writeBackground(
            bgIndex + 11 /* 38 */,
            board.otherbg.splashscreen!,
            320,
            240,
          ), // Splashscreen
        ]);
        break;
    }

    return Promise.all(bgPromises);
  }

  onWriteEvents(board: IBoard) {
    // Right now the boards always put Chance time spaces where Stars were,
    // so we will just automate adding the post-star chance event.
    const spaces = board.spaces;
    for (let i = 0; i < spaces.length; i++) {
      const space = board.spaces[i];
      if (!space || !space.star) continue;
      const events = space.events || [];
      const hasStarChance = events.some((e) => e.id === "STARCHANCE"); // Pretty unlikely
      if (!hasStarChance)
        addEventToSpaceInternal(
          board,
          space,
          createEventInstance(StarChanceEvent),
          false,
          getEventsInLibrary(),
        );
    }
  }

  onWriteEventAsmHook(
    romView: DataView,
    boardInfo: IBoardInfo,
    boardIndex: number,
  ) {}

  onParseStrings(board: IBoard, boardInfo: IBoardInfo) {
    const strs = boardInfo.str || {};
    if (strs.boardSelect) {
      let idx = strs.boardSelect;
      if (Array.isArray(idx)) idx = idx[0] as number;

      const strings = romhandler.getRom()!.getStrings();
      const str = strings.read(idx) as string;
      const lines = str.split("\n");

      // Read the board name and description.
      const nameStart = lines[0].indexOf(">") + 1;
      const nameEnd = lines[0].indexOf("<", nameStart);
      board.name = lines[0].substring(nameStart, nameEnd);
      board.description = [lines[1], lines[2]].join("\n");

      // Parse difficulty star level
      let difficulty = 0;
      let lastIndex = str.indexOf(this.getCharacterMap()[0x2a], 0);
      while (lastIndex !== -1) {
        difficulty++;
        lastIndex = str.indexOf(this.getCharacterMap()[0x2a], lastIndex + 1);
      }
      board.difficulty = difficulty;
    }
  }

  onWriteStrings(board: IBoard, boardInfo: IBoardInfo) {
    const strs = boardInfo.str || {};
    const strings = romhandler.getRom()!.getStrings();
    if (strs.boardSelect) {
      let bytes = [];
      bytes.push(0x0b); // Clear?
      bytes.push(0x05); // Start GREEN
      bytes = bytes.concat(strToBytes(board.name || ""));
      bytes.push(0x02); // Start DEFAULT
      bytes.push(0x0a); // \n
      bytes = bytes.concat(strToBytes(board.description || "")); // Assumes \n's are correct within.
      bytes.push(0x0a); // \n
      bytes = bytes.concat([0x10, 0x10, 0x10, 0x10, 0x10, 0x10]); // Spaces
      bytes.push(0x06); // Start BLUE
      bytes = bytes.concat(strToBytes("Map Difficulty  "));
      const star = 0x2a;
      if (board.difficulty > 5 || board.difficulty < 1) {
        // Hackers!
        bytes.push(star);
        bytes = bytes.concat(strToBytes(" "));
        bytes.push(0x3e); // Little x
        bytes = bytes.concat(strToBytes(" " + board.difficulty.toString()));
      } else {
        for (let i = 0; i < board.difficulty; i++) bytes.push(star);
      }
      bytes.push(0x02); // Start DEFAULT
      bytes.push(0x00); // Null byte

      const strBuffer = arrayToArrayBuffer(bytes);

      const idx = strs.boardSelect;
      if (Array.isArray(idx)) {
        for (let i = 0; i < idx.length; i++) {
          strings.write(idx[i] as number, strBuffer);
        }
      } else {
        strings.write(idx, strBuffer);
      }
    }

    // For now, just make Koopa's intro neutral.
    if (strs.koopaIntro) {
      let bytes: number[] = [];
      bytes = bytes.concat(
        strToBytes("Welcome, everybody!\nI am your guide,\nKoopa Troopa."),
      );
      bytes.push(0xff); // PAUSE
      bytes.push(0x0b); // Clear?
      bytes = bytes.concat(strToBytes("Now then,\nlet's decide turn order."));
      bytes.push(0xff); // PAUSE
      bytes.push(0x00); // Null byte

      const strBuffer = arrayToArrayBuffer(bytes);
      strings.write(strs.koopaIntro, strBuffer);
    }

    // For now, just make a generic comment.
    if (strs.starComments) {
      let bytes: number[] = [];
      bytes = bytes.concat(
        strToBytes(
          "Good luck!\nWith enough stars, you\ncould be the superstar!",
        ),
      );
      bytes.push(0xff); // PAUSE
      bytes.push(0x00); // Null byte

      const strBuffer = arrayToArrayBuffer(bytes);
      for (let i = 0; i < strs.starComments.length; i++)
        strings.write(strs.starComments[i], strBuffer);
    }
  }

  onChangeBoardSpaceTypesFromGameSpaceTypes(board: IBoard, chains: number[][]) {
    // Space types match MP1 exactly.
  }

  onChangeGameSpaceTypesFromBoardSpaceTypes(board: IBoard) {}

  _extractKoopa(board: IBoard, boardInfo: IBoardInfo) {
    if (!boardInfo.koopaSpaceInst || !boardInfo.sceneIndex) return;

    const scenes = romhandler.getRom()!.getScenes();
    const sceneView = scenes.getDataView(boardInfo.sceneIndex);
    const koopaSpace = sceneView.getUint16(boardInfo.koopaSpaceInst + 2);
    if (board.spaces[koopaSpace])
      board.spaces[koopaSpace].subtype = SpaceSubtype.KOOPA;
  }

  _writeKoopa(board: IBoard, boardInfo: IBoardInfo) {
    if (!boardInfo.koopaSpaceInst || !boardInfo.sceneIndex) return;

    let koopaSpace;
    for (let i = 0; i < board.spaces.length; i++) {
      if (board.spaces[i].subtype === SpaceSubtype.KOOPA) {
        koopaSpace = i;
        break;
      }
    }

    koopaSpace =
      koopaSpace === undefined ? getDeadSpaceIndex(board) : koopaSpace;
    const scenes = romhandler.getRom()!.getScenes();
    const sceneView = scenes.getDataView(boardInfo.sceneIndex);
    sceneView.setUint16(boardInfo.koopaSpaceInst + 2, koopaSpace);
  }

  _extractBowser(board: IBoard, boardInfo: IBoardInfo) {
    if (!boardInfo.bowserSpaceInst || !boardInfo.sceneIndex) return;

    const scenes = romhandler.getRom()!.getScenes();
    const sceneView = scenes.getDataView(boardInfo.sceneIndex);
    const bowserSpace = sceneView.getUint16(boardInfo.bowserSpaceInst + 2);
    if (board.spaces[bowserSpace])
      board.spaces[bowserSpace].subtype = SpaceSubtype.BOWSER;
  }

  _writeBowser(board: IBoard, boardInfo: IBoardInfo) {
    if (!boardInfo.bowserSpaceInst || !boardInfo.sceneIndex) return;

    let bowserSpace;
    for (let i = 0; i < board.spaces.length; i++) {
      if (board.spaces[i].subtype === SpaceSubtype.BOWSER) {
        bowserSpace = i;
        break;
      }
    }

    bowserSpace =
      bowserSpace === undefined ? getDeadSpaceIndex(board) : bowserSpace;
    const scenes = romhandler.getRom()!.getScenes();
    const sceneView = scenes.getDataView(boardInfo.sceneIndex);
    sceneView.setUint16(boardInfo.bowserSpaceInst + 2, bowserSpace);
  }

  _extractGoomba(board: IBoard, boardInfo: IBoardInfo) {
    if (!boardInfo.goombaSpaceInst || !boardInfo.sceneIndex) return;

    const scenes = romhandler.getRom()!.getScenes();
    const sceneView = scenes.getDataView(boardInfo.sceneIndex);
    const goombaSpace = sceneView.getUint16(boardInfo.goombaSpaceInst + 2);
    if (board.spaces[goombaSpace])
      board.spaces[goombaSpace].subtype = SpaceSubtype.GOOMBA;
  }

  onParseBoardSelectImg(board: IBoard, boardInfo: IBoardInfo) {
    if (!boardInfo.img.boardSelectImg) return;

    const mainfs = romhandler.getRom()?.getMainFS()!;
    const boardSelectFORM = mainfs.get(9, boardInfo.img.boardSelectImg);
    const boardSelectUnpacked = FORM.unpack(boardSelectFORM)!;
    const boardSelectImgTiles = [
      new DataView(boardSelectUnpacked.BMP1[0].parsed.src),
      new DataView(boardSelectUnpacked.BMP1[1].parsed.src),
      new DataView(boardSelectUnpacked.BMP1[2].parsed.src),
      new DataView(boardSelectUnpacked.BMP1[3].parsed.src),
    ];
    const boardSelectImg = fromTiles(boardSelectImgTiles, 2, 2, 64 * 4, 32);
    board.otherbg.boardselect = arrayBufferToDataURL(boardSelectImg, 128, 64);
    // $$log(board.otherbg.boardselect);
  }

  async onWriteBoardSelectImg(
    board: IBoard,
    boardInfo: IBoardInfo,
  ): Promise<void> {
    const boardSelectIndex = boardInfo.img.boardSelectImg;
    if (!boardSelectIndex) {
      return;
    }

    // We need to write the image onto a canvas to get the RGBA32 values.
    const [width, height] = [128, 64];
    const imgData = await getImageData(
      board.otherbg.boardselect!,
      width,
      height,
    );

    // First, turn the image back into 4 BMP tiles
    const boardSelectImgTiles = toTiles(
      imgData.data,
      2,
      2,
      (width / 2) * 4,
      height / 2,
    );
    const boardSelectBmps = boardSelectImgTiles.map((tile) => {
      return BMPfromRGBA(tile, 32, 8);
    });

    // Now write the BMPs back into the FORM.
    const mainfs = romhandler.getRom()?.getMainFS()!;
    const boardSelectFORM = mainfs.get(9, boardSelectIndex!);
    const boardSelectUnpacked = FORM.unpack(boardSelectFORM)!;
    for (let i = 0; i < 4; i++) {
      const palette = boardSelectBmps[i][1];

      // FIXME: This is padding the palette count a bit.
      // For some reason, the images get corrupt with very low palette count.
      while (palette.colors.length < 17) {
        palette.colors.push(0x00000000);
      }
      FORM.replaceBMP(boardSelectUnpacked, i, boardSelectBmps[i][0], palette);
    }

    // Now write the FORM.
    const boardSelectPacked = FORM.pack(boardSelectUnpacked);
    //saveAs(new Blob([boardSelectPacked]), "formPacked");
    mainfs.write(9, boardSelectIndex!, boardSelectPacked);
  }

  onParseBoardLogoImg(board: IBoard, boardInfo: IBoardInfo) {
    if (!boardInfo.img.pauseLogoImg) return;

    board.otherbg.boardlogo = this._readImgFromMainFS(
      10,
      boardInfo.img.pauseLogoImg,
      0,
    );
  }

  onWriteBoardLogoImg(board: IBoard, boardInfo: IBoardInfo): Promise<void> {
    return new Promise((resolve, reject) => {
      let introLogoImgs = boardInfo.img.introLogoImg;
      const pauseLogoImg = boardInfo.img.pauseLogoImg;
      if (!introLogoImgs && !pauseLogoImg) {
        resolve();
        return;
      }

      // We need to write the image onto a canvas to get the RGBA32 values.
      const [introWidth, introHeight] = boardInfo.img.introLogoImgDimens!;

      const srcImage = createImage();
      const failTimer = setTimeout(
        () => reject(`Failed to write logos for ${boardInfo.name}`),
        45000,
      );
      srcImage.onload = () => {
        const mainfs = romhandler.getRom()?.getMainFS()!;

        // Write the intro logo images.
        if (introLogoImgs) {
          const imgBuffer = toArrayBuffer(srcImage, introWidth, introHeight);

          if (!Array.isArray(introLogoImgs)) introLogoImgs = [introLogoImgs];
          for (let i = 0; i < introLogoImgs.length; i++) {
            const logoImgIdx = introLogoImgs[i];

            // First, read the old image pack.
            const oldPack = mainfs.get(10, logoImgIdx);

            // Then, pack the image and write it.
            const imgInfoArr = [
              {
                src: imgBuffer,
                width: introWidth,
                height: introHeight,
                bpp: 32,
              },
            ];
            const newPack = toPack(imgInfoArr, 16, 0, oldPack);
            // saveAs(new Blob([newPack]), "imgpack");
            mainfs.write(10, logoImgIdx, newPack);
          }
        }

        if (pauseLogoImg) {
          // Always 200x82
          const imgBuffer = toArrayBuffer(srcImage, 200, 82);

          // First, read the old image pack.
          const oldPack = mainfs.get(10, pauseLogoImg);
          //saveAs(new Blob([oldPack]), "oldpauseimgpack");
          // Then, pack the image and write it.
          const imgInfoArr = [
            {
              src: imgBuffer,
              width: 200,
              height: 82,
              bpp: 32,
            },
          ];
          const newPack = toPack(imgInfoArr, 16, 0, oldPack);
          //saveAs(new Blob([newPack]), "newPack");
          mainfs.write(10, pauseLogoImg, newPack);
        }

        clearTimeout(failTimer);
        resolve();
      };
      srcImage.src = board.otherbg.boardlogo!;
    });
  }

  _clearOtherBoardNames(boardIndex: number) {
    // There is an ugly comic-sansy board name graphic in the after-game results.
    // We will just make it totally transparent because it is not important.
    const mainfs = romhandler.getRom()?.getMainFS()!;
    const resultsBoardNameImgPack = mainfs.get(10, 406 + boardIndex);
    const imgPackU8Array = new Uint8Array(resultsBoardNameImgPack);
    imgPackU8Array.fill(0, 0x2c); // To the end
    mainfs.write(10, 406 + boardIndex, resultsBoardNameImgPack);
  }

  getAudioMap(tableIndex: number): string[] {
    return getAudioMapMP1(tableIndex);
  }

  getSoundEffectMap(table: number): string[] {
    return getSoundEffectMapMP1(table);
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
      0x0a: "\n",
      0x0b: "\u3014", // FEED Carriage return / start of bubble?
      0x0c: "○", // 2ND BYTE OF PLAYER CHOICE
      0x0d: "\t", // UNCONFIRMED / WRONG
      0x0e: "\t", // 1ST BYTE OF PLAYER CHOICE
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
      0x2a: "\u3009", // * Star
      0x2b: "\u3010", // , S button
      0x2c: "\u3011", // , R button
      // 0x2D - nothing
      // 0x2E - nothing
      // 0x2F - nothing
      // 0x30 - 0x39: 0-9 ascii
      0x3a: "\u3012", // Hollow coin
      0x3b: "\u3013", // Hollow star
      0x3c: "+", // <
      0x3d: "-", // =
      0x3e: "x", // > Little x
      0x3f: "->", // Little right ARROW
      // 0x40 - nothing
      // 0x41 - 0x5A: A-Z ascii
      0x5b: '"', // [ End quotes
      0x5c: "'", // \ Single quote
      0x5d: "(", // ] Open parenthesis
      0x5e: ")",
      0x5f: "/", // _
      // 0x60 - nothing
      // 0x61 - 0x7A: a-z ascii
      0x7b: ":", // :
      0x80: '"', // Double quote no angle
      0x81: "°", // . Degree
      0x82: ",", // ,
      0x83: "°", // Low circle FIXME
      0x85: ".", // … Period
      0xc0: "“", // A`
      0xc1: "”", // A'
      0xc2: "!", // A^
      0xc3: "?", // A~
      0xff: "\u3015", // PAUSE
    };
  }
}
