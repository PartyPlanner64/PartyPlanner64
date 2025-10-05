import { AdapterBase } from "./AdapterBase";
import {
  IBoard,
  ISpace,
  addEventToSpaceInternal,
} from "../../../apps/partyplanner64/boards";
import { animationfs } from "../fs/animationfs";
import { CostumeType, Space } from "../types";
import { createEventInstance, EventMap } from "../events/events";
import {
  arrayToArrayBuffer,
  arrayBufferToDataURL,
  arrayBufferToImageData,
} from "../utils/arrays";
import { createContext, createImage } from "../utils/canvas";
import { $$log } from "../utils/debug";
import { toArrayBuffer, cutFromWhole } from "../utils/image";
import { imgInfoSrcToArrayBuffer, toPack } from "../utils/img/ImgPack";
import { IBoardInfo } from "./boardinfobase";
import { BankEvent } from "../events/builtin/events.common";
import { getImageData } from "../utils/img/getImageData";
import { createBoardOverlay } from "./MP2.U.boardoverlay";

import mp2boardselectblank1Image from "../../../apps/partyplanner64/img/details/mp2boardselectblank1.png";
import { romhandler } from "../romhandler";

export class MP2Adapter extends AdapterBase {
  public gameVersion: 1 | 2 | 3 = 2;

  public nintendoLogoFSEntry: number[] = [9, 1];
  public hudsonLogoFSEntry: number[] = [9, 2];
  public boardDefDirectory = 10;

  public MAINFS_READ_ADDR = 0x00017680;
  public HEAP_FREE_ADDR = 0x00017800;
  public TABLE_HYDRATE_ADDR = 0x0005568c;

  onLoad(board: IBoard, boardInfo: IBoardInfo, boardWasStashed: boolean) {
    if (!boardWasStashed) {
      this._extractCostumeType(board, boardInfo);
      this._extractBanks(board, boardInfo);
      this._extractItemShops(board, boardInfo);
    }

    this._parseBoardSelectIcon(board, boardInfo);
    this._readAnimationBackgrounds(board, boardInfo);
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
    romView: DataView,
    board: IBoard,
    boardInfo: IBoardInfo,
    boardIndex: number,
  ): void {
    // Patch game to use all 8MB.
    romView.setUint16(0x41602, 0x8040); // Main heap now starts at 0x80400000
    romView.setUint16(0x4160a, (0x00400000 - this.EVENT_MEM_SIZE) >>> 16); // ... and can fill up through reserved event space
    romView.setUint16(0x41616, 0x001a); // Temp heap fills as much as 0x1A8000 (8000 is ORed in)
    romView.setUint16(0x7869e, 0x001a);

    this._writeCostumeType(romView, board, boardIndex);

    // Remove the animations (we might add our own after this though).
    if (typeof boardInfo.animBgSet === "number") {
      animationfs.setSetEntryCount(boardInfo.animBgSet, 0);
    }
  }

  onOverwritePromises(
    board: IBoard,
    boardInfo: IBoardInfo,
    boardIndex: number,
  ) {
    const bgIndex = boardInfo.bgDir;
    const bgPromises = [
      this._writeBackground(
        bgIndex,
        board.bg.src,
        board.bg.width,
        board.bg.height,
      ),
      this._writeAnimationBackgrounds(
        boardInfo.animBgSet!,
        board.bg.width,
        board.bg.height,
        board.bg.src,
        board.animbg,
      ),
      this._writeBackground(bgIndex + 2, board.otherbg.largescene!, 320, 240), // Game start, end
      this._writeOverviewBackground(bgIndex + 6, board.bg.src), // Overview map
      this.onWriteBoardSelectImg(board, boardInfo), // The board select image
      this._writeBoardSelectIcon(board, boardInfo), // The board select icon
      this.onWriteBoardLogoImg(board, boardInfo), // Various board logos
      this._brandBootSplashscreen(),
    ];

    return Promise.all(bgPromises);
  }

  onWriteEvents(board: IBoard) {}

  hydrateSpace(space: ISpace, board: IBoard, eventLibrary: EventMap) {
    if (space.type === Space.BANK) {
      addEventToSpaceInternal(
        board,
        space,
        createEventInstance(BankEvent),
        false,
        eventLibrary,
      );
    }
  }

  onParseStrings(board: IBoard, boardInfo: IBoardInfo) {
    const strs = boardInfo.str || {};
    if (strs.boardSelect) {
      const idx = strs.boardSelect;
      // if (Array.isArray(idx))
      //   idx = idx[0];

      const strings = romhandler.getRom()!.getStrings();
      const str = strings.read(idx as number) as string;
      const lines = str.split("\n");

      // Read the board name and description.
      const nameStart = lines[0].indexOf(">") + 1;
      const nameEnd = lines[0].indexOf("\u0019", nameStart);
      board.name = lines[0].substring(nameStart, nameEnd);
      board.description = [lines[1], lines[2]].join("\n");

      // Parse difficulty star level
      let difficulty = 0;
      let lastIndex = str.indexOf(this.getCharacterMap()[0x3b], 0);
      while (lastIndex !== -1) {
        difficulty++;
        lastIndex = str.indexOf(this.getCharacterMap()[0x3b], lastIndex + 1);
      }
      board.difficulty = difficulty;
    }
  }

  onWriteStrings(board: IBoard, boardInfo: IBoardInfo) {
    const strs = boardInfo.str || {};
    const strings = romhandler.getRom()!.getStrings();

    // Various details about the board when selecting it
    if (strs.boardSelect) {
      let bytes = [];
      bytes.push(0x0b); // Clear?
      bytes.push(0x06); // Start BLUE
      bytes = bytes.concat(strings._strToBytes(board.name || ""));
      bytes.push(0x19);
      bytes.push(0x04); // Start Purple?
      bytes = bytes.concat([0x0e, 0x0e]); // Tabs
      bytes = bytes.concat(strings._strToBytes("Difficulty"));
      bytes.push(0x19);
      bytes = bytes.concat(strings._strToBytes(" : "));
      const star = 0x3b;
      if (board.difficulty > 5 || board.difficulty < 1) {
        // Hackers!
        bytes.push(star);
        bytes = bytes.concat(strings._strToBytes(" "));
        bytes.push(0x3e); // Little x
        bytes = bytes.concat(
          strings._strToBytes(" " + board.difficulty.toString()),
        );
      } else {
        for (let i = 0; i < board.difficulty; i++) bytes.push(star);
      }
      bytes.push(0x0a); // \n
      bytes = bytes.concat(strings._strToBytes(board.description || "")); // Assumes \n's are correct within.
      bytes.push(0x00); // Null byte

      const strBuffer = arrayToArrayBuffer(bytes);

      const idx = strs.boardSelect as number;
      strings.write(idx, strBuffer);
    }

    // Simple strings that just have the board name
    if (strs.boardNames && strs.boardNames.length) {
      let bytes = [];
      bytes.push(0x0b);
      bytes.push(0x06);
      bytes = bytes.concat(strings._strToBytes(board.name || ""));
      bytes.push(0x19);
      bytes.push(0x00); // Null byte
      const strBuffer = arrayToArrayBuffer(bytes);

      for (let i = 0; i < strs.boardNames.length; i++) {
        const idx = strs.boardNames[i] as number;
        strings.write(idx, strBuffer);
      }
    }

    // Toad's greeting to players at start
    // One piece is pre-bowser sign, one is after
    if (strs.boardGreeting && strs.boardGreeting.length) {
      let bytes = [];
      bytes.push(0x0b);
      bytes = bytes.concat(strings._strToBytes("We're here, everyone!"));
      bytes.push(0x0a); // \n
      bytes = bytes.concat(strings._strToBytes("This is "));
      bytes.push(0x06); // Blue
      bytes.push(0x0f);
      bytes = bytes.concat(strings._strToBytes((board.name || "") + "!!!"));
      bytes.push(0x16);
      bytes.push(0x19);
      bytes.push(0xff);
      // bytes.push(0x0B);
      // bytes = bytes.concat(strings._strToBytes("Your objective this time,"));
      bytes.push(0x00); // Null byte

      let strBuffer = arrayToArrayBuffer(bytes);
      strings.write(strs.boardGreeting[0], strBuffer);

      bytes = [];
      bytes.push(0x0b);
      bytes = bytes.concat(
        strings._strToBytes("Now, before this adventure begins,"),
      );
      bytes.push(0x0a); // \n
      bytes = bytes.concat(strings._strToBytes("we must decide turn order."));
      bytes.push(0xff);
      bytes.push(0x00); // Null byte

      strBuffer = arrayToArrayBuffer(bytes);
      strings.write(strs.boardGreeting[1], strBuffer);
    }

    // String congratulating a player for winning
    if (strs.boardWinner) {
      let bytes = [];
      bytes.push(0x0b);
      bytes = bytes.concat(strings._strToBytes("Well done, "));
      bytes.push(0x11); // Player
      bytes = bytes.concat(strings._strToBytes("!"));
      bytes.push(0x0a); // \n
      bytes = bytes.concat(strings._strToBytes("You are the "));
      bytes.push(0x07); // Yellow
      bytes.push(0x0f);
      bytes = bytes.concat(strings._strToBytes("Super Star"));
      bytes.push(0x16);
      bytes.push(0x19);
      bytes.push(0x0a); // \n
      bytes = bytes.concat(strings._strToBytes("of "));
      bytes.push(0x06); // Blue
      bytes.push(0x0f);
      bytes = bytes.concat(strings._strToBytes((board.name || "") + "!!!"));
      bytes.push(0x16);
      bytes.push(0x19);
      bytes.push(0x00); // Null byte

      const strBuffer = arrayToArrayBuffer(bytes);
      strings.write(strs.boardWinner, strBuffer);
    }

    // "board name   {0} Time(s)"
    if (strs.boardPlayCount) {
      let bytes = [];
      bytes.push(0x0b);
      bytes = bytes.concat(strings._strToBytes(board.name || ""));
      bytes = bytes.concat([0x0e, 0x0e, 0x0e, 0x0e, 0x0e, 0x0e]); // Tabs
      bytes.push(0x11); // Play count
      bytes = bytes.concat(strings._strToBytes(" Time(s)"));
      bytes.push(0x00); // Null byte

      const strBuffer = arrayToArrayBuffer(bytes);
      strings.write(strs.boardPlayCount, strBuffer);
    }
  }

  onChangeBoardSpaceTypesFromGameSpaceTypes(board: IBoard, chains: number[][]) {
    const typeMap: { [index: number]: Space } = {
      0: Space.OTHER, // Sometimes START
      3: Space.OTHER,
      5: Space.CHANCE,
      6: Space.ITEM,
      7: Space.BANK,
      8: Space.OTHER,
      9: Space.BATTLE,
      12: Space.BOWSER,
      14: Space.STAR,
      15: Space.BLACKSTAR,
      16: Space.OTHER, // Toad
      17: Space.OTHER, // Baby Bowser the COHORT
    };
    board.spaces.forEach((space) => {
      const oldType = space.type;
      const newType = typeMap[oldType];
      if (newType !== undefined) space.type = newType;
    });

    if (chains.length) {
      const startSpaceIndex = chains[0][0];
      if (!isNaN(startSpaceIndex))
        board.spaces[startSpaceIndex].type = Space.START;
    }
  }

  onChangeGameSpaceTypesFromBoardSpaceTypes(board: IBoard) {
    const typeMap: { [space in Space]: number } = {
      [Space.OTHER]: 0,
      [Space.BLUE]: 1,
      [Space.RED]: 2,
      [Space.MINIGAME]: 0, // N/A
      [Space.HAPPENING]: 4,
      [Space.STAR]: 14,
      [Space.CHANCE]: 5,
      [Space.START]: 0, // N/A
      [Space.SHROOM]: 0, // N/A
      [Space.BOWSER]: 12,
      [Space.ITEM]: 6,
      [Space.BATTLE]: 9,
      [Space.BANK]: 7,
      [Space.ARROW]: 13,
      [Space.BLACKSTAR]: 15,
      [Space.GAMEGUY]: 0, // N/A
      [Space.DUEL_BASIC]: 0, // N/A
      [Space.DUEL_START_BLUE]: 0, // N/A
      [Space.DUEL_START_RED]: 0, // N/A
      [Space.DUEL_POWERUP]: 0, // N/A
      [Space.DUEL_REVERSE]: 0, // N/A
    };
    board.spaces.forEach((space) => {
      const newType = typeMap[space.type];
      if (newType !== undefined) space.type = newType;
    });
  }

  _extractCostumeType(board: IBoard, boardInfo: IBoardInfo): void {
    board.costumeTypeIndex = boardInfo.costumeType!;
  }

  /** Overwrite character costumes. */
  _writeCostumeType(
    romView: DataView,
    board: IBoard,
    boardIndex: number,
  ): void {
    const costumeModelMap = {
      [CostumeType.NORMAL]: {
        small: 0xd3, // 211
        big: 0xd1, // 209
        toad: 0x00080000,
        player2d: [
          0x000a0282, // 10/642
          0x000a0283,
          0x000a0285,
          0x000a0286,
          0x000a0284,
          0x000a0287,
        ],
        bowser2d: [
          0x000a029a, // 10/666
          0x000a029b,
          0x000a029d,
          0x000a029e,
          0x000a029c,
          0x000a029f,
        ],
      },
      [CostumeType.WESTERN]: {
        small: 0xd4, // 212
        big: 0xd5, // 213
        toad: 0x0008000e,
        player2d: [
          0x000a0264, // 10/612
          0x000a0265,
          0x000a0267,
          0x000a0268,
          0x000a0266,
          0x000a0269,
        ],
        bowser2d: [
          0x000a0288, // 10/648
          0x000a0289,
          0x000a028b,
          0x000a028c,
          0x000a028a,
          0x000a028d,
        ],
      },
      [CostumeType.PIRATE]: {
        small: 0xd6, // 214
        big: 0xd7, // 215,
        toad: 0x00080016,
        player2d: [
          0x000a026a, // 10/618
          0x000a026b,
          0x000a026d,
          0x000a026e,
          0x000a026c,
          0x000a026f,
        ],
        bowser2d: [
          0x000a028e, 0x000a028f, 0x000a0291, 0x000a0292, 0x000a0290,
          0x000a0293,
        ],
      },
      [CostumeType.HORROR]: {
        small: 0xd8, // 216
        big: 0xd9, // 217
        toad: 0x00080028,
        player2d: [
          0x000a0270, 0x000a0271, 0x000a0273, 0x000a0274, 0x000a0272,
          0x000a0275,
        ],
        bowser2d: [
          0x000a0294, 0x000a0295, 0x000a0297, 0x000a0298, 0x000a0296,
          0x000a0299,
        ],
      },
      [CostumeType.SPACE]: {
        small: 0xda, // 218
        big: 0xdb, // 219
        toad: 0x0008001c,
        player2d: [
          0x000a0276, 0x000a0277, 0x000a0279, 0x000a027a, 0x000a0278,
          0x000a027b,
        ],
        bowser2d: [
          0x000a029a, // same as normal
          0x000a029b,
          0x000a029d,
          0x000a029e,
          0x000a029c,
          0x000a029f,
        ],
      },
      [CostumeType.MYSTERY]: {
        small: 0xdc, // 220
        big: 0xdd, // 221
        toad: 0x00080023,
        player2d: [
          0x000a027c, // 10/636
          0x000a027d,
          0x000a027f,
          0x000a0280,
          0x000a027e,
          0x000a0281,
        ],
        bowser2d: [
          0x000a02a0, 0x000a02a1, 0x000a02a3, 0x000a02a4, 0x000a02a2,
          0x000a02a5,
        ],
      },
    };

    const costumeInfo =
      costumeModelMap[board.costumeTypeIndex ?? CostumeType.NORMAL];

    const boardModelRowsIndex = 0xcbf40 + boardIndex * (16 * 12); // 16 bytes per model entry * 12 rows (6 big, 6 small models)
    const CHARACTER_COUNT = 6;

    for (let i = 0; i < CHARACTER_COUNT; i++) {
      // Table at ROM 0xCBF40 has the "small/big" models for each character.
      // Ex: 2/D4 is Western small, 2/D5 is western big, 2/D6 pirate small, 2/D7 pirate big.
      romView.setUint16(boardModelRowsIndex + i * 16 + 2, costumeInfo.small);
      romView.setUint16(boardModelRowsIndex + 96 + i * 16 + 2, costumeInfo.big);

      // Table at ROM 0xCC4C0 has costumed toads.

      // Table at ROM 0xCDA28 has list of 2d model renders of themed characters.
      romView.setUint32(
        0xcda28 + boardIndex * 6 * 4 + i * 4,
        costumeInfo.player2d[i],
      );

      // Table at ROM 0xCDAE8 has list of themed bowser suits.
      romView.setUint32(
        0xcdae8 + boardIndex * 6 * 4 + i * 4,
        costumeInfo.bowser2d[i],
      );
    }

    // The following somewhat replaces the toad models, but animations aren't yet replaced.

    // if (boardIndex < 5) { // Not bowser land
    //   // Table at ROM 0xCC4C0 has costumed toads. None for Bowser Land.
    //   romView.setUint32(0xCC4C0 + (boardIndex * 16), costumeInfo.toad);
    // }

    // // 0x35CF64 also has the toad models.
    // let sceneView = scenes.getDataView(82);
    // sceneView.setUint32(0x4184 + (boardIndex * 4), costumeInfo.toad);

    // // And animations following?

    // // 0x37EA64 also has the toad models, used when selecting board.
    // // RAM: 80113364
    // // Overlay 88 (0x58) offset +68452 (+0x10B64)
    // sceneView = scenes.getDataView(88);
    // sceneView.setUint32(0x10B64 + (boardIndex * 4), costumeInfo.toad);

    // // And animations following?

    // // 0x3900F4 also has the toad models
    // // RAM: 80113444
    // // Overlay 91 (0x5B) offset +68676 (+0x10C44)
    // sceneView = scenes.getDataView(91);
    // sceneView.setUint32(0x10C44 + (boardIndex * 4), costumeInfo.toad);

    // // And animations following?
  }

  _readAnimationBackgrounds(board: IBoard, boardInfo: IBoardInfo) {
    if (typeof boardInfo.animBgSet !== "number" || !boardInfo.bgDir) return;

    // Perf: This is a bit redundant because we read the data URI previously.
    const hvqfs = romhandler.getRom()!.getHVQFS();
    const mainBgImgData = hvqfs.readBackgroundImgData(boardInfo.bgDir);

    const animBgs = animationfs.readAnimationBackgrounds(
      boardInfo.animBgSet,
      mainBgImgData,
      board.bg.width,
      board.bg.height,
    );
    if (animBgs && animBgs.length) board.animbg = animBgs;
  }

  async _writeAnimationBackgrounds(
    setIndex: number,
    width: number,
    height: number,
    mainBgSrc: string,
    animSources?: string[],
  ): Promise<void> {
    if (isNaN(setIndex) || !animSources || !animSources.length) {
      return;
    }

    const failTimer = setTimeout(() => {
      throw new Error(`Failed to write animations`);
    }, 45000);

    let mainBgImgData: ImageData;
    const animImgData = new Array(animSources.length);

    const mainBgPromise = new Promise<void>((resolve) => {
      getImageData(mainBgSrc, width, height).then((imgData) => {
        mainBgImgData = imgData;
        resolve();
      });
    });

    const animPromises = [mainBgPromise];
    for (let i = 0; i < animSources.length; i++) {
      const animPromise = new Promise<void>((resolve) => {
        const index = i;
        getImageData(animSources[i], width, height).then((imgData) => {
          animImgData[index] = imgData;
          resolve();
        });
      });
      animPromises.push(animPromise);
    }

    await Promise.all(animPromises);

    for (let i = 0; i < animImgData.length; i++) {
      animationfs.writeAnimationBackground(
        setIndex,
        i,
        mainBgImgData!,
        animImgData[i],
        width,
        height,
      );
    }
    $$log("Wrote animations");
    clearTimeout(failTimer);
  }

  onParseBoardSelectImg(board: IBoard, boardInfo: IBoardInfo) {
    if (!boardInfo.img.boardSelectImg) return;

    board.otherbg.boardselect = this._readImgFromMainFS(
      9,
      boardInfo.img.boardSelectImg,
      0,
    );
  }

  onWriteBoardSelectImg(board: IBoard, boardInfo: IBoardInfo): Promise<void> {
    return new Promise((resolve, reject) => {
      const boardSelectImg = boardInfo.img.boardSelectImg;
      if (!boardSelectImg) {
        resolve();
        return;
      }

      const srcImage = createImage();
      const failTimer = setTimeout(
        () => reject(`Failed to write board select for ${boardInfo.name}`),
        45000,
      );
      srcImage.onload = () => {
        const imgBuffer = toArrayBuffer(srcImage, 64, 48);

        // First, read the old image pack.
        const mainfs = romhandler.getRom()?.getMainFS()!;
        const oldPack = mainfs.get(9, boardSelectImg!);

        // Then, pack the image and write it.
        const imgInfoArr = [
          {
            src: imgBuffer,
            width: 64,
            height: 48,
            bpp: 32,
          },
        ];
        const newPack = toPack(imgInfoArr, 16, 0, oldPack);
        mainfs.write(9, boardSelectImg!, newPack);

        clearTimeout(failTimer);
        resolve();
      };
      srcImage.src = board.otherbg.boardselect!;
    });
  }

  _parseBoardSelectIcon(board: IBoard, boardInfo: IBoardInfo) {
    if (!boardInfo.img.boardSelectIconCoords) return;

    const bgInfo = this._readImgInfoFromMainFS(9, 15, 0);
    const [x, y] = boardInfo.img.boardSelectIconCoords;
    const icon = cutFromWhole(
      imgInfoSrcToArrayBuffer(bgInfo.src!),
      bgInfo.width,
      bgInfo.height,
      32,
      x,
      y,
      32,
      32,
    );
    const dataUrl = arrayBufferToDataURL(icon, 32, 32);
    board.otherbg.boardselecticon = dataUrl;
  }

  _writeBoardSelectIcon(board: IBoard, boardInfo: IBoardInfo): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!boardInfo.img.boardSelectIconCoords) {
        resolve();
        return;
      }
      const boardSelectIconSrc = board.otherbg.boardselecticon;
      if (!boardSelectIconSrc) {
        resolve();
        return;
      }

      const failTimer = setTimeout(
        () => reject(`Failed to write board select icon for ${boardInfo.name}`),
        45000,
      );

      let blankBackImage: HTMLImageElement,
        newBoardSelectIconImage: HTMLImageElement;

      const blankBackPromise = new Promise<void>(function (resolve) {
        blankBackImage = createImage();
        blankBackImage.onload = function () {
          resolve();
        };
        blankBackImage.src = mp2boardselectblank1Image;
      });

      const newIconPromise = new Promise<void>(function (resolve) {
        newBoardSelectIconImage = createImage();
        newBoardSelectIconImage.onload = function () {
          resolve();
        };
        newBoardSelectIconImage.src = boardSelectIconSrc!;
      });

      const iconPromises = [blankBackPromise, newIconPromise];
      Promise.all(iconPromises).then(
        () => {
          const bgInfo = this._readImgInfoFromMainFS(9, 15, 0); // Read the existing icon select thing

          // Draw the original onto a canvas
          const canvasCtx = createContext(bgInfo.width, bgInfo.height);
          const origImageData = arrayBufferToImageData(
            imgInfoSrcToArrayBuffer(bgInfo.src!),
            bgInfo.width,
            bgInfo.height,
          );
          canvasCtx.putImageData(origImageData, 0, 0);

          // Then draw the "clean slate" for the icon, and the given icon.
          const [x, y] = boardInfo.img.boardSelectIconCoords!;
          canvasCtx.drawImage(blankBackImage, x, y, 32, 32);
          canvasCtx.drawImage(newBoardSelectIconImage, x, y, 32, 32);

          // Place edited icon select thing back into ROM
          const finalIconSelectThingBuffer = canvasCtx.getImageData(
            0,
            0,
            bgInfo.width,
            bgInfo.height,
          ).data.buffer;

          // Read the old image pack.
          const mainfs = romhandler.getRom()?.getMainFS()!;
          const oldPack = mainfs.get(9, 15);

          // Then, pack the image and write it.
          const imgInfoArr = [
            {
              src: finalIconSelectThingBuffer,
              width: bgInfo.width,
              height: bgInfo.height,
              bpp: 32,
            },
          ];
          const newPack = toPack(imgInfoArr, 16, 0, oldPack);
          mainfs.write(9, 15, newPack);

          // Write the hover mask for the new image
          if (boardInfo.img.boardSelectIconMask) {
            const mask = this._createBoardSelectIconHoverMask(
              newBoardSelectIconImage,
            );

            const oldPack = mainfs.get(9, boardInfo.img.boardSelectIconMask);

            // Then, pack the image and write it.
            const imgInfoArr = [
              {
                src: mask,
                width: 32,
                height: 32,
                bpp: 32,
              },
            ];
            const newPack = toPack(imgInfoArr, 16, 0, oldPack);
            mainfs.write(9, boardInfo.img.boardSelectIconMask, newPack);
          }

          $$log("Wrote board select icon");
          clearTimeout(failTimer);
          resolve();
        },
        (reason) => {
          $$log(`Error writing board select icon: ${reason}`);
          reject();
        },
      );
    });
  }

  // This creates the asset that is used to create the rainbow hover effect
  // over the board select icon. The effect is a bit crude now; the original
  // mask can have some semi-transparent edges, but this just either adds
  // a #00000000 or #BBBBBBFF pixel based on the given icon.
  _createBoardSelectIconHoverMask(newIconImage: HTMLImageElement) {
    const newIconBuffer = toArrayBuffer(newIconImage, 32, 32);
    const maskBuffer = new ArrayBuffer(newIconBuffer.byteLength);

    const newIconView = new DataView(newIconBuffer);
    const maskView = new DataView(maskBuffer);

    let hasTransparency = false;

    for (let i = 0; i < maskBuffer.byteLength; i += 4) {
      if (newIconView.getUint32(i) === 0) {
        maskView.setUint32(i, 0);
        hasTransparency = true;
      } else maskView.setUint32(i, 0xbbbbbbff);
    }

    // If someone gives a totally non-transparent image... well the mask won't
    // work very well. We will just clear out the mask, no hover effect then.
    if (!hasTransparency) {
      return new ArrayBuffer(newIconBuffer.byteLength);
    }

    return maskBuffer;
  }

  onParseBoardLogoImg(board: IBoard, boardInfo: IBoardInfo) {
    if (!boardInfo.img.introLogoImg) return;

    board.otherbg.boardlogo = this._readImgFromMainFS(
      10,
      boardInfo.img.introLogoImg as number,
      0,
    );
  }

  onWriteBoardLogoImg(board: IBoard, boardInfo: IBoardInfo): Promise<void> {
    return new Promise((resolve, reject) => {
      const introLogoImg = boardInfo.img.introLogoImg;
      if (!introLogoImg) {
        resolve();
        return;
      }

      const mainfs = romhandler.getRom()?.getMainFS()!;
      const srcImage = createImage();
      const failTimer = setTimeout(
        () => reject(`Failed to write logos for ${boardInfo.name}`),
        45000,
      );
      srcImage.onload = () => {
        // Write the intro logo images.
        const imgBuffer = toArrayBuffer(srcImage, 260, 120);

        // First, read the old image pack.
        const oldPack = mainfs.get(10, introLogoImg as number);

        // Then, pack the image and write it.
        const imgInfoArr = [
          {
            src: imgBuffer,
            width: 260,
            height: 120,
            bpp: 32,
          },
        ];
        const newPack = toPack(imgInfoArr, 16, 0, oldPack);
        mainfs.write(10, introLogoImg as number, newPack);

        clearTimeout(failTimer);
        resolve();
      };
      srcImage.src = board.otherbg.boardlogo!;

      // Just blank out the pause logo, it is not worth replacing.
      const pauseLogoImg = boardInfo.img.pauseLogoImg;
      if (pauseLogoImg) {
        const oldPack = mainfs.get(10, pauseLogoImg);
        const imgInfoArr = [
          {
            src: new ArrayBuffer(130 * 60 * 4),
            width: 130,
            height: 60,
            bpp: 32,
          },
        ];
        const newPack = toPack(imgInfoArr, 16, 0, oldPack);
        mainfs.write(10, pauseLogoImg, newPack);
      }
    });
  }

  // Same as _writeBackground essentially, but for some reason MP2 overview background
  // doesn't line up when just shrinking the background naively.
  // If we shift it up by 1 tile's worth of height, it lines up better.
  async _writeOverviewBackground(bgIndex: number, src: string): Promise<void> {
    const imgData = await getImageData(src, 320, 240);

    const failTimer = setTimeout(() => {
      throw new Error(`Failed to write bg ${bgIndex}`);
    }, 45000);

    const canvasCtx = createContext(320, 240);
    canvasCtx.putImageData(imgData, 0, -10);

    const imgDataShifted = canvasCtx.getImageData(0, 0, 320, 240);
    const hvqfs = romhandler.getRom()!.getHVQFS();
    hvqfs.writeBackground(bgIndex, imgDataShifted, 320, 240);
    clearTimeout(failTimer);
  }

  // Writes to 0x800CD524, break 0x80079390
  getAudioMap(tableIndex: number): string[] {
    return [
      "", // 0x00 Two Beeps
      "Story One",
      "Go Lucky",
      "Welcome to Mario Land",
      "Laboratory",
      "Rules Land",
      "Credits", // ?
      "In the Pipe",
      "Western Land",
      "Pirate Land",
      "Space Land",
      "Horror Land",
      "Mystery Land",
      "Bowser Land", // ?
      "Adventure Begins",
      "The Adventure Ends",
      "Ending", // 0x10
      "Star Spot",
      "Bowser's Theme",
      "A Ways to Go",
      "How Many",
      "Take the Coin",
      "Let the Game Begin",
      "", // Two Beeps
      "", // Two Beeps
      "", // Two Beeps
      "", // Two Beeps
      "Going for the Coins",
      "Not Gonna Lose",
      "Keepin' on the Path",
      "Couldn't be Better",
      "Know What I Mean?",
      "That's All of It", // 0x20
      "Let's Have Some Fun",
      "The Blue Skies Yonder",
      "Chance Time",
      "Going Somewhere",
      "Duel!",
      "No Fright, No Fear",
      "Don't Look Back",
      "Got an Item",
      "This Way That",
      "Walking Underwater",
      "Spinning Polka",
      "Spinning Polka 2", // ?
      "Spinning Polka 3", // ?
      "", //"Jamming Groove", // ?
      "", //"Electronic Groove", // ? These two from visiting characters?
      "", // 0x30 Two Beeps
      "", //"Plays in 'facing' direction mini-game",
      "Mini-Game Land",
      "Woody",
      "Mini-Game Park",
      "Battle Start",
      "Mini-Game Stadium",
      "", // Two Beeps
      "Coaster",
      "", //"Anticipatory dingles",
      "The Way to Play",
      "The Star Appears",
      "Bowser Appears",
      "I Can Do It!",
      "Bowser's Parade",
      "Ending", //"Finale song",
      "Story Intro 2", // 0x40
      "Story Intro 3",
      "Mini-Game Coaster Results",
      "Drum Roll",
      "Win (One Winner)",
      "Lose",
      "", // Two Beeps
      "Know What I Mean",
      "Instant Replay",
      "Coaster (Double Mix)",
      "Coaster (Single Mix)",
      "Coaster (Hip Hip Mix)",
      "Coaster (Duo Mix)",
      "Coaster (Hermit Mix)",
      "Coaster (Speed Mix)",
      "Coaster (Survival Mix)",
      //"", 0x50 Two Beeps
      // "Success Mini-Game Result",
      // "Success Mini-Game Result",
      // "Kind of Success Mini-Game Result",
      // "Mini-Game turned sour",
      // "Great fanfare",
      // "Failure fanfare",
      // "Disappointing result",
      // "Fanfare",
      // "Players run across screen intro fanfare",
      // "Silent",
      // "Intro To Mario Land - Bowser Land Appears",
      // "Fanfare",
      // "Anti-fanfare",
      // "Genie Theme",
      // "Silent",
      // "Fanfare", // 0x60
    ];
  }

  // Mostly a MP1 copy for now.
  getCharacterMap(): { [num: number]: string } {
    return {
      0x00: "", // NULL terminator
      0x01: "<BLACK>",
      0x02: "<DEFAULT>",
      0x03: "<RED>",
      0x04: "<PURPLE>",
      0x05: "<GREEN>",
      0x06: "<BLUE>",
      0x07: "<YELLOW>",
      0x08: "<WHITE>",
      0x09: "<SEIZURE>",
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
