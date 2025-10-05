import { AdapterBase } from "./AdapterBase";
import {
  getConnections,
  addEventByIndex,
  addEventToSpaceInternal,
} from "../../../apps/partyplanner64/boards";
import {
  Space,
  BoardType,
  SpaceSubtype,
  EventExecutionType,
  EditorEventActivationType,
  getEventActivationTypeFromEditorType,
} from "../types";
import { $$log } from "../utils/debug";
import { createEventInstance, EventMap } from "../events/events";
import { arrayToArrayBuffer } from "../utils/arrays";
import { toArrayBuffer } from "../utils/image";
import { toPack } from "../utils/img/ImgPack";
import { BMPfromRGBA } from "../utils/img/BMP";
import { FORM } from "../models/FORM";
import { SpaceEventList } from "./eventlist";
import { IBoardInfo } from "./boardinfobase";
import { ChainSplit3 } from "../events/builtin/MP3/U/ChainSplit3";
import { ChainMerge3 } from "../events/builtin/MP3/U/ChainMergeEvent3";
import { ChainMerge } from "../events/builtin/ChainMergeEvent";
import { BankEvent } from "../events/builtin/events.common";
import { createBoardOverlay } from "./MP3.U.boardoverlay";
import { getSoundEffectMapMP3 } from "./MP3.U.soundeffects";
import { getImageData } from "../utils/img/getImageData";
import { getEventsInLibrary } from "../events/EventLibrary";

import genericgateImage from "../../../apps/partyplanner64/img/assets/genericgate.png";
import { createImage } from "../utils/canvas";
import { romhandler } from "../romhandler";
import { strToBytes } from "../fs/strings";
import { IBoard, ISpace } from "../boards";

export class MP3Adapter extends AdapterBase {
  public gameVersion: 1 | 2 | 3 = 3;

  public nintendoLogoFSEntry: number[] = [17, 1];
  public hudsonLogoFSEntry: number[] = [17, 2];
  public boardDefDirectory = 19;

  public MAINFS_READ_ADDR = 0x00009c10;
  public HEAP_FREE_ADDR = 0x00009e6c;
  public TABLE_HYDRATE_ADDR = 0x000eba60;

  onLoad(board: IBoard, boardInfo: IBoardInfo, boardWasStashed: boolean) {
    if (!boardWasStashed) {
      this._extractBanks(board, boardInfo);
      this._extractItemShops(board, boardInfo);
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
    romView: DataView,
    board: IBoard,
    boardInfo: IBoardInfo,
    boardIndex: number,
  ): void {
    // Patch game to use all 8MB.
    romView.setUint16(0x360ee, 0x8040); // Main heap now starts at 0x80400000
    romView.setUint16(0x360f6, (0x00400000 - this.EVENT_MEM_SIZE) >>> 16); // ... and can fill up through reserved event space
    romView.setUint16(0x36102, 0x001a); // Temp heap fills as much as 0x1A8000 (8000 is ORed in)
    romView.setUint16(0x495d6, 0x001a);

    // gamemasterplc: patch both ROM address 0x50DA60 and 0x50DA80 with the value 0x24020001 to fix character unlocks
    // gamemasterplc: aka MIPS Instruction ADDIU V0, R0, 0x1
    const scenes = romhandler.getRom()!.getScenes();
    const playerSelectScene = scenes.getDataView(120);
    playerSelectScene.setUint32(0xbe60, 0x24020001); // 0x50DA60
    playerSelectScene.setUint32(0xbe80, 0x24020001); // 0x50DA80

    // This generally fixes duels on happening spaces.
    // gamemasterplc: try making 0x00111F04 in ROM 0x10800009 for a temporary fix for question space duels until we figure out events better
    const boardPlayScene = scenes.getDataView(128);
    //boardPlayScene.setUint32(0x27774, 0x10800009); // 800FE2E4

    // The game will soft hang on the first player's turn when the number of plain spaces
    // (red/blue) is less than a certain lowish number.
    // gamemasterplc says it is related to some save flag check.
    // TODO: Waste time figuring out the exact low space threshold or the detailed cause of the bug.
    // Hang around 0x800FC664
    let blueSpaceCount = 0;
    let redSpaceCount = 0;
    for (let i = 0; i < board.spaces.length; i++) {
      const space = board.spaces[i];
      if (space.type === Space.BLUE) blueSpaceCount++;
      if (space.type === Space.RED) redSpaceCount++;
    }
    if (blueSpaceCount < 14 || redSpaceCount < 1) {
      // Fix low spaces issues
      // gamemasterplc: patch ROM offset 0x001101C4 with 0x10000085 to fix low space hangs
      boardPlayScene.setUint32(0x25a34, 0x10000085); // Something like BEQ R0 R0 0x85, so it always branches
      $$log("Patching for low space count.");
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
      this._writeBackground(bgIndex + 1, board.otherbg.largescene!, 320, 240), // Game start, end
      this._writeBackground(bgIndex + 2, board.bg.src, 320, 240), // Overview map
      this._writeAdditionalBackgrounds(board),
      this.onWriteBoardSelectImg(board, boardInfo),
      this.onWriteBoardLogoImg(board, boardInfo), // Various board logos
      this._onWriteGateImg(board, boardInfo),
      this._brandBootSplashscreen(),
    ];

    return Promise.all(bgPromises);
  }

  onAfterSave(romView: DataView) {
    // This patch makes it so the game will boot if the emulator is misconfigured
    // with something other than 16K EEPROM save type. Obviously users should
    // set the correct save type, but this will let them play at least (with broken saving)
    // gamemasterplc: @PartyPlanner64 the jump you had to overwrite at 8000C2C0 is due
    // to the game needing 16k eeprom and emulators not setting it for modded roms
    romView.setUint32(0x0000cec0, 0);

    // The release ROM has debugger checks in it, which can cause some
    // emulators (Nemu64) to be upset. This stops the debugger checks.
    romView.setUint32(0x0007fc58, 0); // Don't check if KMC worked...
    romView.setUint32(0x0007fc60, 0); // Don't do KMC success action...
    // The "return;" is just hit after this and the rest of the checks are skipped.
  }

  onWriteEvents(board: IBoard) {}

  protected onAddDefaultBoardEvents(
    editorActivationType: EditorEventActivationType,
    list: SpaceEventList,
  ): void {
    if (editorActivationType === EditorEventActivationType.BEFORE_DICE_ROLL) {
      const activationType =
        getEventActivationTypeFromEditorType(editorActivationType);

      // MP3 has two "Before Dice Roll" default events.
      list.add(
        activationType,
        EventExecutionType.DIRECT,
        "__PP64_INTERNAL_CURSE_POISON_DICEROLL_EVENT",
      );
      list.add(
        activationType,
        EventExecutionType.DIRECT,
        "__PP64_INTERNAL_REVERSAL_DICEROLL_EVENT",
      );
    }
  }

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

  onChangeBoardSpaceTypesFromGameSpaceTypes(board: IBoard, chains: number[][]) {
    let typeMap: { [index: number]: Space };
    const isNormalBoard = !board.type || board.type === BoardType.NORMAL;
    if (isNormalBoard) {
      typeMap = {
        0: Space.OTHER, // Sometimes START
        3: Space.OTHER,
        5: Space.CHANCE,
        6: Space.ITEM,
        7: Space.BANK,
        8: Space.OTHER,
        9: Space.BATTLE,
        12: Space.BOWSER,
        14: Space.STAR,
        15: Space.GAMEGUY,
        16: Space.OTHER, // Toad
        17: Space.OTHER, // Baby Bowser the COHORT
      };
    } else if (board.type === BoardType.DUEL) {
      typeMap = {
        1: Space.OTHER,
        2: Space.HAPPENING,
        3: Space.GAMEGUY,
        4: Space.OTHER, // seen on spaces that have events
        5: Space.DUEL_REVERSE,
        6: Space.DUEL_BASIC,
        7: Space.DUEL_START_RED,
        8: Space.MINIGAME,
        9: Space.DUEL_START_BLUE,
        10: Space.DUEL_POWERUP,
      };
    } else {
      throw new Error(`Unrecongized board type: ${board.type}`);
    }

    board.spaces.forEach((space) => {
      const newType = typeMap[space.type];
      if (newType !== undefined) space.type = newType;
    });

    if (isNormalBoard) {
      if (chains.length) {
        const startSpaceIndex = chains[0][0];
        if (!isNaN(startSpaceIndex))
          board.spaces[startSpaceIndex].type = Space.START;
      }
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
      [Space.GAMEGUY]: 15, // ?
      [Space.BLACKSTAR]: 0, // N/A
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

  // Creates the chain-based event objects that we abstract out in the UI.
  // Override from base to also add reverse shroom events and special chain split.
  onCreateChainEvents(board: IBoard, chains: number[][]) {
    // There is either a merge or a split at the end of each chain.
    for (let i = 0; i < chains.length; i++) {
      const chain = chains[i];
      // if (chain.length < 2) {
      //   throw new Error("MP3 onCreateChainEvents assertion failed: chain.length < 2");
      // }

      const firstSpace = chain[0];
      const secondSpace = chain[1];
      const lastSpace = chain[chain.length - 1];
      const prevSpace = chain[chain.length - 2]; // For MP3
      const endLinks = getConnections(lastSpace, board)!;
      let event;
      if (endLinks.length > 1) {
        // A split, figure out the end points.

        if (endLinks.length > 2)
          throw new Error("MP3 cannot support more than 2 split directions");

        const chainIndices: number[] = [];
        endLinks.forEach((link) => {
          chainIndices.push(_getChainWithSpace(link)!);
        });

        // Create the args, which are more sophisticated / declarative in MP3 (yay)
        // The args consist of the space indices and chain indices of the two directions,
        // as well as a couple variations of each when they are used with reverse shroom.
        const spaceIndexArgs = [];
        spaceIndexArgs.push(endLinks[0]); // First two space indices
        spaceIndexArgs.push(endLinks[1]);
        spaceIndexArgs.push(0xffff);

        spaceIndexArgs.push(prevSpace); // As if returning from first link direction
        spaceIndexArgs.push(endLinks[1]);
        spaceIndexArgs.push(0xffff);

        spaceIndexArgs.push(prevSpace); // As if returning from 2nd link direction
        spaceIndexArgs.push(endLinks[0]);
        spaceIndexArgs.push(0xffff);
        spaceIndexArgs.push(0x0000);

        const chainArgs = [];
        chainArgs.push(chainIndices[0]); // Now the two chain indices and the "indices into the chains"
        chainArgs.push(0x0000); // We know these two are always 0 because of how we generate chains.
        chainArgs.push(0x0000); // mystery
        chainArgs.push(chainIndices[1]);
        chainArgs.push(0x0000);
        chainArgs.push(0x0000); // mystery

        chainArgs.push(i);
        chainArgs.push(chain.length - 2); // Return to _near_ end of entering chain
        chainArgs.push(0x0001); // mystery
        chainArgs.push(chainIndices[1]); // ...yes they flip, for confusion
        chainArgs.push(0x0000);
        chainArgs.push(0x0000);

        chainArgs.push(i);
        chainArgs.push(chain.length - 2); // Return to _near_ end of entering chain
        chainArgs.push(0x0001);
        chainArgs.push(chainIndices[0]);
        chainArgs.push(0x0000);
        chainArgs.push(0x0000);

        const chainWithGate = _needsGateChainSplit(chainIndices);
        if (chainWithGate != null) {
          event = createEventInstance(ChainSplit3, {
            parameterValues: {
              spaceIndexArgs,
              chainArgs,
              hasgate: true,
              prevSpace: chains[chainWithGate][0],
              altChain: [
                chainIndices.find((i) => i !== chainWithGate)!, // Chain index
                0, // Index in chain
              ],
            },
          });
        } else {
          event = createEventInstance(ChainSplit3, {
            parameterValues: {
              spaceIndexArgs,
              chainArgs,
            },
          });
        }
        addEventByIndex(board, lastSpace, event, true, getEventsInLibrary());
      } else if (endLinks.length > 0) {
        event = createEventInstance(ChainMerge3, {
          parameterValues: {
            chain: _getChainWithSpace(endLinks[0])!,
            prevSpace, // For MP3
          },
        });
        addEventByIndex(board, lastSpace, event, true, getEventsInLibrary());
      }

      // See if we need a reverse split event, reverse chain merge, or safety chain merge.
      const pointingSpaces = _getSpacesPointingToSpace(firstSpace);
      if (pointingSpaces.length) {
        const chainIndices: number[] = [];
        pointingSpaces.forEach((link) => {
          chainIndices.push(_getChainWithSpace(link)!);
        });
        const pointingChains: number[][] = [];
        chainIndices.forEach((index) => {
          pointingChains.push(chains[index]);
        });

        if (pointingSpaces.length >= 2) {
          // Build a reverse split.
          // FIXME: This obviously only deals with === 2, but rather than
          // restrict boards, we can just arbitrarily not allow going backwards
          // in some particular direction(s) for now.

          // The reverse args are basically the same, except the 1 bit is placed differently.
          const spaceIndexArgs = [];
          spaceIndexArgs.push(secondSpace);
          spaceIndexArgs.push(pointingSpaces[0]);
          spaceIndexArgs.push(0xffff);

          spaceIndexArgs.push(pointingSpaces[1]); // Probably the only indices that matter
          spaceIndexArgs.push(pointingSpaces[0]);
          spaceIndexArgs.push(0xffff);

          spaceIndexArgs.push(pointingSpaces[1]);
          spaceIndexArgs.push(secondSpace);
          spaceIndexArgs.push(0xffff);
          spaceIndexArgs.push(0x0000);

          // Now the chain indices and the "indices into the chains"
          const chainArgs = [];
          chainArgs.push(i);
          chainArgs.push(0x0001); // Second space index
          chainArgs.push(0x0000);
          chainArgs.push(chainIndices[0]);
          chainArgs.push(pointingChains[0].length - 1); // Return to end of entering chain
          chainArgs.push(0x0001);

          chainArgs.push(chainIndices[1]);
          chainArgs.push(pointingChains[1].length - 1);
          chainArgs.push(0x0001);
          chainArgs.push(chainIndices[0]);
          chainArgs.push(pointingChains[0].length - 1);
          chainArgs.push(0x0001);

          chainArgs.push(chainIndices[1]);
          chainArgs.push(pointingChains[1].length - 1);
          chainArgs.push(0x0001);
          chainArgs.push(i);
          chainArgs.push(0x0001); // Second space index
          chainArgs.push(0x0000);

          event = createEventInstance(ChainSplit3, {
            parameterValues: {
              spaceIndexArgs,
              chainArgs,
              reverse: true,
            },
            executionType: EventExecutionType.DIRECT, // Notable difference
          });
          addEventByIndex(board, firstSpace, event, true, getEventsInLibrary());
        } else if (pointingSpaces.length === 1) {
          // Build a reverse merge
          event = createEventInstance(ChainMerge3, {
            parameterValues: {
              chain: chainIndices[0], // Go to pointing chain
              spaceIndex: pointingChains[0].length - 1, // Go to last space of pointing chain
              prevSpace: secondSpace, // The 2nd space of this chain, which would have been previous when going reverse.
            },
          });
          addEventByIndex(board, firstSpace, event, true, getEventsInLibrary());
        }
      } else {
        // If nothing points to this chain, the player could still reverse their
        // way towards the beginning of the chain (start space for example).
        // At the start of these chains, we put a type 8 event to spin them around.
        // It is redundant when going forward on the chain but doesn't hurt.
        const firstLinks = getConnections(firstSpace, board)!;
        if (firstLinks.length > 1) {
          $$log("FIXME: branching isolated chain?");
        } else if (firstLinks.length > 0) {
          // This doesn't crash, but it creates a back forth loop at a dead end.
          // This probably will yield issues if the loop is over invisible spaces.
          // Only do this if `firstLinks.length > 0`; if this is false, this is a single decorative space.
          event = createEventInstance(ChainMerge, {
            // Not CHAINMERGE3
            parameterValues: {
              chain: i,
              spaceIndex: 1, // Because of chain padding, this should be safe
            },
          });
          event.activationType = EditorEventActivationType.BEGINORWALKOVER;
          addEventByIndex(board, firstSpace, event, true, getEventsInLibrary());
        }
      }
    }

    function _getChainWithSpace(space: number) {
      for (let c = 0; c < chains.length; c++) {
        if (chains[c].indexOf(space) >= 0)
          // Should really be 0 always - game does support supplied index other than 0 though.
          return c;
      }
    }

    function _getSpacesPointingToSpace(space: number) {
      const pointingSpaces = [];
      for (let s = 0; s < board.spaces.length; s++) {
        const spaceLinks = getConnections(s, board)!;
        if (spaceLinks.indexOf(space) >= 0) pointingSpaces.push(s);
      }
      return pointingSpaces;
    }

    // Returns space index with gate, or undefined
    function _chainHasGate(chain: number[]) {
      return chain.find((i) => {
        return board.spaces[i].subtype === SpaceSubtype.GATE;
      });
    }

    // Returns index of chain with gate.
    function _needsGateChainSplit(chainIndices: number[]) {
      let chainIndex = null;
      chainIndices.forEach((index) => {
        const spaceIndexWithGate = _chainHasGate(chains[index]);
        if (typeof spaceIndexWithGate === "number") {
          chainIndex = index;
        }
      });
      return chainIndex;
    }
  }

  onParseStrings(board: IBoard, boardInfo: IBoardInfo) {
    const strs = boardInfo.str || {};
    if (strs.boardSelect) {
      if (!Array.isArray(strs.boardSelect))
        throw new Error("Expected number[][]");
      const idx = strs.boardSelect[0] as number[];
      const strings3 = romhandler.getRom()!.getStrings3();
      const str = strings3.read("en", idx[0], idx[1]) as string;
      const lines = str.split("\n");

      // Read the board name and description.
      const nameStart = lines[0].indexOf(">") + 2;
      const nameEnd = lines[0].indexOf("{", nameStart);
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
    const strings3 = romhandler.getRom()!.getStrings3();
    const boardSelect = strs.boardSelect as number[][];
    if (boardSelect && boardSelect.length) {
      let bytes = [];
      bytes.push(0x0b); // Clear?
      bytes.push(0x05); // Start GREEN
      bytes.push(0x0f); // ?
      bytes = bytes.concat(strToBytes(board.name || ""));
      bytes.push(0x16);
      bytes.push(0x19);
      bytes.push(0x0f);
      bytes = bytes.concat([0x20, 0x20, 0x20, 0x20]); // Spaces
      bytes.push(0x16);
      bytes.push(0x03);
      bytes.push(0x0f);
      bytes = bytes.concat(strToBytes("Difficulty: "));
      const star = 0x3b;
      if (board.difficulty > 5 || board.difficulty < 1) {
        // Hackers!
        bytes.push(star);
        bytes = bytes.concat(strToBytes(" "));
        bytes.push(0x3e); // Little x
        bytes = bytes.concat(strToBytes(" " + board.difficulty.toString()));
      } else {
        for (let i = 0; i < board.difficulty; i++) bytes.push(star);
      }
      bytes.push(0x16);
      bytes.push(0x19);
      bytes.push(0x0a); // \n
      bytes = bytes.concat(strToBytes(board.description || "")); // Assumes \n's are correct within.
      bytes.push(0x00); // Null byte

      let strBuffer = arrayToArrayBuffer(bytes);

      let idx = boardSelect[0];
      strings3.write("en", idx[0], idx[1], strBuffer);

      // The second copy is mostly the same, but add a couple more bytes at the end.
      bytes.pop(); // Null byte
      bytes.push(0x19);
      bytes.push(0xff);
      bytes.push(0x00); // Null byte

      strBuffer = arrayToArrayBuffer(bytes);

      idx = boardSelect[1];
      strings3.write("en", idx[0], idx[1], strBuffer);
    }

    if (strs.boardGreeting) {
      let bytes = [];
      bytes.push(0x0b);
      bytes = bytes.concat(strToBytes("You're all here!"));
      bytes.push(0x0a); // \n
      bytes = bytes.concat(this._createBoardGreetingBase(board.name));
      bytes.push(0x0b); // ?
      bytes = bytes.concat(
        strToBytes(
          "Now, before we begin, we need\nto determine the turn order.",
        ),
      );
      bytes.push(0x19); // ?
      bytes.push(0xff); // ?
      bytes.push(0x00); // Null byte

      const strBuffer = arrayToArrayBuffer(bytes);
      strings3.write(
        "en",
        strs.boardGreeting[0],
        strs.boardGreeting[1],
        strBuffer,
      );
    }

    if (strs.boardGreetingDuel) {
      let bytes = [];
      bytes.push(0x0b);
      bytes = bytes.concat(strToBytes("I've been waiting for you, "));
      bytes.push(0x11); // ?
      bytes.push(0xc2); // ?
      bytes.push(0x0a); // \n
      bytes = bytes.concat(this._createBoardGreetingBase(board.name));
      bytes.push(0x0b); // ?
      bytes = bytes.concat(
        strToBytes("And just as promised, if you win here..."),
      );
      bytes.push(0x19); // ?
      bytes.push(0xff); // ?
      bytes.push(0x00); // Null byte

      const strBuffer = arrayToArrayBuffer(bytes);
      strings3.write(
        "en",
        strs.boardGreetingDuel[0],
        strs.boardGreetingDuel[1],
        strBuffer,
      );
    }

    if (strs.boardNames && strs.boardNames.length) {
      let bytes = [];
      bytes.push(0x0b);
      bytes = bytes.concat(strToBytes(board.name));
      bytes.push(0x00); // Null byte
      const strBuffer = arrayToArrayBuffer(bytes);

      for (let i = 0; i < strs.boardNames.length; i++) {
        const idx = strs.boardNames[i] as number[];
        strings3.write("en", idx[0], idx[1], strBuffer);
      }
    }
  }

  _createBoardGreetingBase(boardName: string) {
    const strings = romhandler.getRom()!.getStrings();
    let bytes = strToBytes("Welcome to the legendary ");
    bytes.push(0x05); // Start GREEN
    bytes.push(0x0f); // ?
    bytes = bytes.concat(strToBytes(boardName));
    bytes.push(0x16); // ?
    bytes.push(0x19); // ?
    bytes.push(0xc2); // ?
    bytes.push(0x19); // ?
    bytes.push(0xff); // ?
    bytes.push(0x0b); // ?
    bytes = bytes.concat(
      strToBytes("Here, you'll battle to become\nthe Superstar."),
    );
    bytes.push(0x19); // ?
    bytes.push(0xff); // ?
    return bytes;
  }

  onParseBoardSelectImg(board: IBoard, boardInfo: IBoardInfo) {
    if (!boardInfo.img || !boardInfo.img.boardSelectImg) return;

    board.otherbg.boardselect = this._readImgFromMainFS(
      20,
      boardInfo.img.boardSelectImg,
      0,
    );
  }

  onWriteBoardSelectImg(board: IBoard, boardInfo: IBoardInfo): Promise<void> {
    return new Promise((resolve, reject) => {
      const boardSelectImg = boardInfo.img && boardInfo.img.boardSelectImg;
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
        const imgBuffer = toArrayBuffer(srcImage, 64, 64);

        // First, read the old image pack.
        const mainfs = romhandler.getRom()?.getMainFS()!;
        const oldPack = mainfs.get(20, boardSelectImg!);

        // Then, pack the image and write it.
        const imgInfoArr = [
          {
            src: imgBuffer,
            width: 64,
            height: 64,
            bpp: 32,
          },
        ];
        const newPack = toPack(imgInfoArr, 16, 0, oldPack);
        // saveAs(new Blob([newPack]), "imgpack");
        mainfs.write(20, boardSelectImg!, newPack);

        clearTimeout(failTimer);
        resolve();
      };
      srcImage.src = board.otherbg.boardselect!;
    });
  }

  onParseBoardLogoImg(board: IBoard, boardInfo: IBoardInfo) {
    if (!boardInfo.img || !boardInfo.img.splashLogoImg) return;

    board.otherbg.boardlogo = this._readImgFromMainFS(
      19,
      boardInfo.img.splashLogoImg,
      0,
    );
    board.otherbg.boardlogotext = this._readImgFromMainFS(
      19,
      boardInfo.img.splashLogoTextImg!,
      0,
    );
  }

  async onWriteBoardLogoImg(
    board: IBoard,
    boardInfo: IBoardInfo,
  ): Promise<void> {
    await Promise.all([
      this._writeBoardLogoLarge(board, boardInfo),
      this._writeBoardLogoTextImg(board, boardInfo),
      this._writeBoardLogoMedium(board, boardInfo),
      this._writeBoardLogoSmall(board, boardInfo),
    ]);
  }

  async _writeBoardLogoLarge(
    board: IBoard,
    boardInfo: IBoardInfo,
  ): Promise<void> {
    const splashLogoImg = boardInfo.img && boardInfo.img.splashLogoImg;
    if (!splashLogoImg) {
      return;
    }

    const boardlogo = board.otherbg.boardlogo;
    const [width, height] = [226, 110];
    const imgData = boardlogo
      ? (await getImageData(boardlogo, width, height)).data
      : new ArrayBuffer(width * height * 4);

    // First, read the old image pack.
    const mainfs = romhandler.getRom()?.getMainFS()!;
    const oldPack = mainfs.get(19, splashLogoImg);

    // Then, pack the image and write it.
    const imgInfoArr = [
      {
        src: imgData,
        width,
        height,
        bpp: 32,
      },
    ];
    const newPack = toPack(imgInfoArr, 16, 0, oldPack);
    // saveAs(new Blob([newPack]), "imgpack");
    mainfs.write(19, splashLogoImg, newPack);
  }

  /** Write the intro logo text image. */
  async _writeBoardLogoTextImg(
    board: IBoard,
    boardInfo: IBoardInfo,
  ): Promise<void> {
    const splashLogoTextImg = boardInfo.img && boardInfo.img.splashLogoTextImg;
    if (!splashLogoTextImg) {
      return;
    }

    const [width, height] = [226, 36];
    const boardlogotext = board.otherbg.boardlogotext;
    const imgData = boardlogotext
      ? (await getImageData(boardlogotext, width, height)).data
      : new ArrayBuffer(width * height * 4);

    // First, read the old image pack.
    const mainfs = romhandler.getRom()?.getMainFS()!;
    const oldPack = mainfs.get(19, splashLogoTextImg);

    // Then, pack the image and write it.
    const imgInfoArr = [
      {
        src: imgData,
        width,
        height,
        bpp: 32,
      },
    ];
    const newPack = toPack(imgInfoArr, 16, 0, oldPack);
    // saveAs(new Blob([newPack]), "imgpack");
    mainfs.write(19, splashLogoTextImg, newPack);
  }

  /** Replace the medium board logo. This is shown on the board pause screen. */
  async _writeBoardLogoMedium(
    board: IBoard,
    boardInfo: IBoardInfo,
  ): Promise<void> {
    const pauseLogoImg = boardInfo.img.pauseLogoImg;
    if (!pauseLogoImg) {
      return;
    }

    const [width, height] = [150, 50];
    const boardlogomedium = board.otherbg.boardlogomedium;
    const imgData = boardlogomedium
      ? (await getImageData(boardlogomedium, width, height)).data
      : new ArrayBuffer(width * height * 4);

    const mainfs = romhandler.getRom()?.getMainFS()!;
    const oldPack = mainfs.get(19, pauseLogoImg);
    const imgInfoArr = [
      {
        src: imgData,
        width,
        height,
        bpp: 32,
      },
    ];
    const newPack = toPack(imgInfoArr, 16, 0, oldPack);
    mainfs.write(19, pauseLogoImg, newPack);
  }

  /** Replace the small board logo. This is shown on the game end details viewer. */
  async _writeBoardLogoSmall(
    board: IBoard,
    boardInfo: IBoardInfo,
  ): Promise<void> {
    const statsLogoImg = boardInfo.img.statsLogoImg;
    if (!statsLogoImg) {
      return;
    }

    const [width, height] = [100, 46];
    const boardlogosmall = board.otherbg.boardlogosmall;
    const imgData = boardlogosmall
      ? (await getImageData(boardlogosmall, width, height)).data
      : new ArrayBuffer(width * height * 4);

    const mainfs = romhandler.getRom()?.getMainFS()!;
    const oldPack = mainfs.get(statsLogoImg[0], statsLogoImg[1]);
    const imgInfoArr = [
      {
        src: imgData,
        width,
        height,
        bpp: 32,
      },
    ];
    const newPack = toPack(imgInfoArr, 16, 0, oldPack);
    mainfs.write(statsLogoImg[0], statsLogoImg[1], newPack);
  }

  // Create generic skeleton key gate.
  async _onWriteGateImg(board: IBoard, boardInfo: IBoardInfo): Promise<void> {
    const gateIndex = boardInfo.img && boardInfo.img.gateImg;
    if (!gateIndex) {
      return;
    }

    // We need to write the image onto a canvas to get the RGBA32 values.
    const [width, height] = [64, 64];
    const failTimer = setTimeout(() => {
      throw new Error(`Failed to write gate image for ${boardInfo.name}`);
    }, 45000);

    const imgData = await getImageData(genericgateImage, width, height);

    // First create a BMP
    const gateBmp = BMPfromRGBA(imgData.data.buffer, 32, 8);

    // Now write the BMP back into the FORM.
    const mainfs = romhandler.getRom()?.getMainFS()!;
    const gateFORM = mainfs.get(19, 366); // Always use gate 3 as a base.
    const gateUnpacked = FORM.unpack(gateFORM)!;
    FORM.replaceBMP(gateUnpacked, 0, gateBmp[0], gateBmp[1]);

    // Now write the FORM.
    const gatePacked = FORM.pack(gateUnpacked);
    //saveAs(new Blob([gatePacked]), "gatePacked");
    mainfs.write(19, gateIndex!, gatePacked);

    clearTimeout(failTimer);
  }

  // Writes to 0x800A1904, break 0x8004a520 (JAL 0C012948)
  getAudioMap(tableIndex: number): string[] {
    return [
      "Opening", // 0x00
      "Opening Demo",
      "Title Screen",
      "Select File",
      "Castle Grounds",
      "", // Two Beeps
      "Staff Roll",
      "Inside the Castle",
      "Free-Play Room",
      "Star Lift",
      "Preparations",
      "Rules Map",
      "", // Two Beeps
      "The Adventure Begins",
      "", // Two Beeps
      "The Adventure Ends",
      "Begin Mini-Game", // 0x10
      "", // Two Beeps
      "Here's the Star",
      "Still Going",
      "Mini-Game End 1",
      "Mini-Game End 2",
      "Mini-Game End 3",
      "Commence Attack!",
      "Chilly Waters",
      "Deep Bloober Sea",
      "Spiny Desert",
      "Woody Woods",
      "Creepy Cavern",
      "Waluigi",
      "Good Luck!",
      "The Winner is... Me!",
      "A Winner is ME!", // 0x20
      "Foolish Bowser",
      "", // Two Beeps
      "", // Two Beeps
      "Bowser Event",
      "", // Two Beeps
      "Bring it On!",
      "", // Two Beeps
      "Waluigi Appears!",
      "VS Millennium Star!",
      "Peaceful song, bells",
      "", // Two Beeps
      "Defeat...",
      "Aim",
      "Don't Hurry",
      "Panic!",
      "Fighting Spirit", // 0x30
      "Got It?",
      "Let's Get a Move On",
      "Looking Ahead",
      "Big Trouble!",
      "What To Do!?!",
      "Mustn't Panic",
      "Nice and Easy",
      "On Your Toes",
      "Prologue 1",
      "Prologue 2",
      "Prologue 3",
      "Genie's Theme",
      "Jeanie's Theme",
      "Start Battle",
      "Bang Out a Drum Intro",
      "Bang Out a Drum Fill", // 0x40
      "Stardust Battle",
      "Chance Time",
      "Game Guy Mini-Game",
      "Item Mini-Game",
      "Mushroom Power-Up!",
      "Game Guy Winner!",
      "Game Guy Loser!",
      "Game Guy Dance",
      "Drum Roll",
      "Sound Config",
      "", // Two Beeps
      "Battle Room",
      "Gamble Room",
      "Murmur",
      "Tension Drums",
      "", // Two Beeps // 0x50
      "", // "Chilly Waters splashscreen fanfare" // 0x6E
      "", // "Quick fanfare" // 0x70
      "", // "Sad fanfare" // 0x71
      "", // "Medium fanfare" // 0x72
      "", // "Fanfare" // 0x73
    ];
  }

  getSoundEffectMap(table: number): string[] {
    return getSoundEffectMapMP3(table);
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
      // 0x10: " ", works but not used?
      0x11: "{0}", // These are format params that get replaced with various things
      0x12: "{1}",
      0x13: "{2}",
      0x14: "{3}",
      0x15: "{4}",
      0x16: "{5}",
      // Theoretically there may be more up through 0x20?
      // 0x18 - nothing
      0x20: " ",
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
      0x7e: "&", // ~
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
