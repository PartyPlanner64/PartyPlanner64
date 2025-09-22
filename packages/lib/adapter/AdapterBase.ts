import { romhandler } from "../romhandler";
import { getBoardInfos, getBoardInfoByIndex } from "./boardinfo";
import { audio } from "../fs/audio";
import {
  IBoard,
  addEventByIndex,
  getConnections,
  getSpacesOfSubType,
  ISpace,
  IEventInstance,
  getDeadSpace,
  getDeadSpaceIndex,
  BoardAudioType,
  addEventToSpaceInternal,
} from "../../../apps/partyplanner64/boards";
import { copyObject } from "../utils/obj";
import {
  determineChains,
  padChains,
  create as createBoardDef,
  parse as parseBoardDef,
} from "./boarddef";
import {
  BoardType,
  EventActivationType,
  SpaceSubtype,
  getEventActivationTypeFromEditorType,
  EditorEventActivationType,
} from "../types";
import { $$log, $$hex, assert } from "../utils/debug";
import { getSymbol } from "../symbols/symbols";
import { ISceneInfo } from "../fs/scenes";
import { findCalls, getRegSetAddress } from "../utils/MIPS";
import { SpaceEventTable } from "./eventtable";
import { SpaceEventList } from "./eventlist";
import {
  createEventInstance,
  write as writeEvent,
  parse as parseEvent,
  getEvent,
  IEventWriteInfo,
  EventMap,
} from "../events/events";
import { stringToArrayBuffer, stringFromArrayBuffer } from "../utils/string";
import { distance } from "../utils/number";
import { assemble } from "mips-assembler";
import { createContext, createImage } from "../utils/canvas";
import { toArrayBuffer } from "../utils/image";
import { RGBA5551fromRGBA32 } from "../utils/img/RGBA5551";
import {
  toPack,
  fromPack,
  imgInfoSrcToDataView,
  imgInfoSrcToArrayBuffer,
} from "../utils/img/ImgPack";
import { arrayBufferToDataURL, dataUrlToArrayBuffer } from "../utils/arrays";
import {
  makeGameSymbolLabels,
  prepSingleEventAsm,
  makeGenericSymbolsForAddresses,
} from "../events/prepAsm";
import * as THREE from "three";
import { IBoardInfo } from "./boardinfobase";
import { ChainSplit1 } from "../events/builtin/MP1/U/ChainSplit1";
import { ChainMerge } from "../events/builtin/ChainMergeEvent";
import { StarEvent, Gate, GateClose } from "../events/builtin/events.common";
import { ChainSplit2 } from "../events/builtin/MP2/U/ChainSplit2";
import { isDebug } from "../../../apps/partyplanner64/debug";
import { getImageData } from "../utils/img/getImageData";
import { createGameMidi } from "../audio/midi";
import { getEventsInLibrary } from "../events/EventLibrary";
import {
  getBoardAdditionalBgHvqIndices,
  makeBgSymbolLabels,
} from "../events/additionalbg";
import { makeAudioSymbolLabels } from "../events/getaudiochoice";

import bootsplashImage from "../../../apps/partyplanner64/img/bootsplash.png";

export interface IAdapterOptions {
  writeBranding?: boolean;
}

export abstract class AdapterBase {
  /** The arbitrary upper bound size of the events ASM blob. */
  public EVENT_MEM_SIZE = 0x50000;

  /**
   * Location that custom ASM will be placed in RAM.
   * 0x807B0000 right now
   */
  public EVENT_RAM_LOC: number =
    (0x80000000 | (0x800000 - this.EVENT_MEM_SIZE)) >>> 0;

  /**
   * We reserve a 16 byte header, mainly to allow the ASM hook to be flexible
   * in where it transfers this blob to in RAM.
   */
  public EVENT_HEADER_SIZE = 16;

  public abstract gameVersion: 1 | 2 | 3;
  public abstract boardDefDirectory: number;
  public abstract nintendoLogoFSEntry?: number[];
  public abstract hudsonLogoFSEntry?: number[];
  public abstract MAINFS_READ_ADDR: number;
  public abstract TABLE_HYDRATE_ADDR: number;
  public abstract HEAP_FREE_ADDR: number;

  protected options: IAdapterOptions;

  public constructor(options: IAdapterOptions) {
    this.options = options;

    // Defaults
    if (!("writeBranding" in this.options)) {
      this.options.writeBranding = true;
    }
  }

  public loadBoards(): IBoard[] {
    const boards = [];
    const game = romhandler.getROMGame()!;
    const boardInfos = getBoardInfos(game);
    if (!boardInfos) {
      $$log(`Game ${game} has no board infos defined in PP64`);
      return [];
    }

    for (let i = 0; i < boardInfos.length; i++) {
      if (isDebug()) console.group(`Board ${i}`);

      const boardInfo = boardInfos[i];
      const bgDir = boardInfo.bgDir;
      const hvqfs = romhandler.getRom()!.getHVQFS();
      const background = hvqfs.readBackground(bgDir);

      let newBoard: IBoard;
      const boardFromRom = this._pullBoardFromRom(boardInfo);
      if (boardFromRom) {
        newBoard = boardFromRom;
        newBoard.bg = background;
        newBoard.otherbg = {};
      } else {
        const partialBoard = {
          game: this.gameVersion,
          type: boardInfo.type || BoardType.NORMAL,
          bg: background,
          otherbg: {},
          events: {},
        };
        const mainfs = romhandler.getRom()?.getMainFS()!;
        const boardBuffer = mainfs.get(
          this.boardDefDirectory,
          boardInfo.boardDefFile,
        );
        newBoard = parseBoardDef(boardBuffer, partialBoard);
        const chains: number[][] = (newBoard as any)._chains;
        delete (newBoard as any)._chains;
        $$log(`Board ${i} chains: `, chains);

        this.onChangeBoardSpaceTypesFromGameSpaceTypes(newBoard, chains);
        this._applyPerspective(newBoard);
        this._cleanLoadedBoard(newBoard);

        this._parseAudio(newBoard, boardInfo);

        this._findEventTableLocations(boardInfo);
        this._extractEvents(boardInfo, newBoard, i, chains);
        this._extractStarGuardians(newBoard, boardInfo);
        this._extractBoos(newBoard, boardInfo);
      }

      this.onParseStrings(newBoard, boardInfo);
      if (!newBoard.name) newBoard.name = boardInfo.name || "";

      this.onParseBoardSelectImg(newBoard, boardInfo);
      this.onParseBoardLogoImg(newBoard, boardInfo);

      if (boardInfo.onLoad) boardInfo.onLoad(newBoard);

      if (this.onLoad) this.onLoad(newBoard, boardInfo, !!boardFromRom);

      boards.push(newBoard);

      if (isDebug()) console.groupEnd();
    }

    if (isDebug()) {
      // Debug if audio offsets are right.
      const audioSectionCount = audio.getPatchInfo().length;
      for (let i = 0; i < audioSectionCount; i++) audio.getROMOffset(i);
    }

    return boards;
  }

  protected abstract onLoad?(
    board: IBoard,
    boardInfo: IBoardInfo,
    boardWasStashed: boolean,
  ): void;
  protected abstract onAfterOverwrite?(
    romView: DataView,
    boardCopy: IBoard,
    boardInfo: IBoardInfo,
    boardIndex: number,
  ): void;
  protected abstract onWriteEvents?(board: IBoard): void;

  async overwriteBoard(boardIndex: number, board: IBoard) {
    const boardCopy = copyObject(board);
    const boardInfo = getBoardInfoByIndex(romhandler.getROMGame()!, boardIndex);

    const chains = determineChains(boardCopy);
    padChains(boardCopy, chains);

    // If the user didn't place enough 3d characters, banish them to this dead space off screen.
    getDeadSpace(boardCopy); // Trigger creation before boarddef is created.

    this.onChangeGameSpaceTypesFromBoardSpaceTypes(boardCopy);
    this._reversePerspective(boardCopy);

    const boarddef = createBoardDef(boardCopy, chains);
    const mainfs = romhandler.getRom()?.getMainFS()!;
    mainfs.write(this.boardDefDirectory, boardInfo.boardDefFile, boarddef);

    this._createGateEvents(boardCopy, boardInfo, chains);
    const audioIndices = this.onWriteAudio(boardCopy, boardInfo, boardIndex);

    const eventSyms: string = await this._writeNewBoardOverlay(
      boardCopy,
      boardInfo,
      boardIndex,
      audioIndices,
    );

    this.onWriteStrings(boardCopy, boardInfo);

    // Write out the board events to ROM.
    this.onCreateChainEvents(boardCopy, chains);
    this._createStarEvents(boardCopy);
    if (boardInfo.onWriteEvents) boardInfo.onWriteEvents(boardCopy);
    if (this.onWriteEvents) this.onWriteEvents(boardCopy);
    await this._writeEvents(
      boardCopy,
      boardInfo,
      boardIndex,
      chains,
      eventSyms,
      audioIndices,
    );

    this._clearOtherBoardNames(boardIndex);
    this._stashBoardIntoRom(board, boardInfo); // Don't use the boardCopy here

    const hvqfs = romhandler.getRom()!.getHVQFS();
    hvqfs.updateMetadata(boardInfo.bgDir, boardCopy.bg);

    if (boardInfo.onAfterOverwrite) boardInfo.onAfterOverwrite(boardCopy);

    const romView = romhandler.getDataView();
    if (this.onAfterOverwrite)
      this.onAfterOverwrite(romView, boardCopy, boardInfo, boardIndex);

    await this.onOverwritePromises(board, boardInfo, boardIndex);
  }

  private async _writeNewBoardOverlay(
    board: IBoard,
    boardInfo: IBoardInfo,
    boardIndex: number,
    audioIndices: number[],
  ): Promise<string> {
    const overlayAsm = await this.onCreateBoardOverlay(
      board,
      boardInfo,
      boardIndex,
      audioIndices,
    );
    const game = romhandler.getROMGame()!;
    const asm = `
        ${makeGameSymbolLabels(game, true).join("\n")}
        ${makeGenericSymbolsForAddresses(overlayAsm).join("\n")}

        ${overlayAsm}
      `;
    $$log(asm);
    const outSyms = Object.create(null);
    const buffer = assemble(asm, { symbolOutputMap: outSyms }) as ArrayBuffer;

    // TODO if (buffer.byteLength > some max) {
    //   throw new Error(``);
    // }

    const scenes = romhandler.getRom()?.getScenes()!;
    const sceneInfo = scenes.getInfo(boardInfo.sceneIndex!);
    const eventSyms: string = this._makeSymbolsForEventAssembly(
      outSyms,
      sceneInfo,
    );

    // Replace the overlay. We actually have enough info to accurately define
    // the code/rodata/bss regions.
    scenes.replace(boardInfo.sceneIndex!, buffer.slice(0, outSyms.bss), {
      code_end: sceneInfo.code_start + outSyms.rodata,
      rodata_start: sceneInfo.code_start + outSyms.rodata,
      rodata_end: sceneInfo.code_start + outSyms.bss,
      bss_start: sceneInfo.code_start + outSyms.bss,
      bss_end: sceneInfo.code_start + buffer.byteLength,
    });
    return eventSyms;
  }

  async onCreateBoardOverlay(
    board: IBoard,
    boardInfo: IBoardInfo,
    boardIndex: number,
    audioIndices: number[],
  ): Promise<string> {
    throw new Error("Adapter does not implement onCreateBoardOverlay");
  }

  onAfterSave(romView: DataView): void {}

  onOverwritePromises(
    board: IBoard,
    boardInfo: IBoardInfo,
    boardIndex: number,
  ): Promise<any> {
    throw new Error("Adapter does not implement onOverwritePromises");
  }

  // Gives a new space the default things it would need.
  hydrateSpace(space: ISpace, board: IBoard, eventLibrary: EventMap) {
    throw new Error("hydrateSpace not implemented");
  }

  onParseStrings(board: IBoard, boardInfo: IBoardInfo) {
    $$log("Adapter does not implement onParseStrings");
  }

  onWriteStrings(board: IBoard, boardInfo: IBoardInfo) {
    $$log("Adapter does not implement onWriteStrings");
  }

  _applyPerspective(board: IBoard) {
    const bg = board.bg;
    const [width, height] = [bg.width, bg.height];
    const camera = new THREE.PerspectiveCamera(
      bg.fov,
      width / height,
      1,
      10000,
    );
    if (board.game === 1) {
      camera.position.set(bg.cameraEyePosX, bg.cameraEyePosY, bg.cameraEyePosZ);
    } else {
      // gamemasterplc says don't divide anything by 1.2 if bg.cameraEyePosY === 1000,
      // according to game logic.
      // Observation: 18 / 15 == 1.2, this relates to tile count
      camera.position.set(
        bg.cameraEyePosX / 1.2,
        bg.cameraEyePosY / 1.2,
        bg.cameraEyePosZ / 1.2,
      );
    }
    camera.lookAt(
      new THREE.Vector3(bg.lookatPointX, bg.lookatPointY, bg.lookatPointZ),
    );
    camera.scale.y = -1;
    camera.updateMatrix();
    camera.updateMatrixWorld(true);
    camera.updateProjectionMatrix();

    for (let spaceIdx = 0; spaceIdx < board.spaces.length; spaceIdx++) {
      const space = board.spaces[spaceIdx];

      const spacePoint = new THREE.Vector3(space.x, space.y, space.z || 0);
      if (board.game === 2 || board.game === 3) {
        spacePoint.x *= bg.scaleFactor / 1.2;
        spacePoint.y *= bg.scaleFactor / 1.2;
        spacePoint.z *= bg.scaleFactor / 1.2;
      }

      const vector = spacePoint.project(camera);
      const widthHalf = width / 2;
      const heightHalf = height / 2;
      space.x = Math.round(vector.x * widthHalf + widthHalf);
      space.y = Math.round(-(vector.y * heightHalf) + heightHalf);
      space.z = 0;
    }
  }

  _reversePerspective(board: IBoard) {
    const bg = board.bg;
    const [width, height] = [bg.width, bg.height];
    const camera = new THREE.PerspectiveCamera(
      bg.fov,
      width / height,
      1,
      10000,
    );

    if (board.game === 1) {
      camera.position.set(bg.cameraEyePosX, bg.cameraEyePosY, bg.cameraEyePosZ);
    } else {
      // gamemasterplc says don't divide anything by 1.2 if bg.cameraEyePosY === 1000,
      // according to game logic.
      // Observation: 18 / 15 == 1.2, this relates to tile count
      camera.position.set(
        bg.cameraEyePosX / 1.2,
        bg.cameraEyePosY / 1.2,
        bg.cameraEyePosZ / 1.2,
      );
    }
    camera.lookAt(
      new THREE.Vector3(bg.lookatPointX, bg.lookatPointY, bg.lookatPointZ),
    );
    camera.scale.y = -1;
    camera.updateMatrix();
    camera.updateMatrixWorld(true);
    camera.updateProjectionMatrix();

    for (let spaceIdx = 0; spaceIdx < board.spaces.length; spaceIdx++) {
      const space = board.spaces[spaceIdx];

      const vec2d = new THREE.Vector3(
        (space.x / width) * 2 - 1,
        -(space.y / height) * 2 + 1,
        0.5,
      );

      vec2d.unproject(camera);
      vec2d.sub(camera.position).normalize();
      const distance = -camera.position.z / vec2d.z;
      const pos = new THREE.Vector3();
      pos.copy(camera.position).add(vec2d.multiplyScalar(distance));

      if (board.game === 2 || board.game === 3) {
        pos.x /= bg.scaleFactor / 1.2;
        pos.y /= bg.scaleFactor / 1.2;
        pos.z /= bg.scaleFactor / 1.2;
      }

      space.x = pos.x;
      space.y = pos.y;
      space.z = pos.z;
    }
  }

  onGetGameCoordsFromBoardCoords(
    x: number,
    y: number,
    z: number,
    board: IBoard,
  ) {
    $$log("Adapter does not implement onGetGameCoordsFromBoardCoords");
    return [x, y, z];
  }

  onChangeBoardSpaceTypesFromGameSpaceTypes(board: IBoard, chains: number[][]) {
    $$log(
      "Adapter does not implement onChangeBoardSpaceTypesFromGameSpaceTypes",
    );
  }

  onChangeGameSpaceTypesFromBoardSpaceTypes(board: IBoard) {
    $$log(
      "Adapter does not implement onChangeGameSpaceTypesFromBoardSpaceTypes",
    );
  }

  /**
   * Converts a ROM address to an in-game RAM offset.
   * Assumes the offset is within the scene overlay for the given board.
   * @param {number} offset ROM offset to convert
   * @param {object} boardInfo Board info related to the offset
   */
  _offsetToAddr(offset: number, boardInfo: IBoardInfo) {
    if (typeof boardInfo.sceneIndex === "number" && boardInfo.sceneIndex >= 0) {
      const scenes = romhandler.getRom()?.getScenes()!;
      const sceneInfo = scenes.getInfo(boardInfo.sceneIndex);
      if (offset < sceneInfo.rom_start) {
        // This is an offset that is already relative to the scene.
        return (sceneInfo.ram_start & 0x7fffffff) + offset;
      } else {
        return (
          (sceneInfo.ram_start & 0x7fffffff) - (sceneInfo.rom_start - offset)
        );
      }
    }

    throw new Error("How do I _offsetToAddr?");
  }

  _offsetToAddrBase(offset: number, base: number) {
    return (base + offset) >>> 0;
  }

  _addrToOffsetBase(addr: number, base: number) {
    return ((addr & 0x7fffffff) - (base & 0x7fffffff)) >>> 0;
  }

  _stashBoardIntoRom(board: IBoard, boardInfo: IBoardInfo) {
    if (!boardInfo.mainfsBoardFile) return;

    const boardCopy = copyObject(board);
    delete boardCopy.bg;
    delete boardCopy.otherbg;
    delete boardCopy.animbg;
    const boardJsonBuffer = stringToArrayBuffer(JSON.stringify(boardCopy));

    const [dir, file] = boardInfo.mainfsBoardFile;
    const mainfs = romhandler.getRom()?.getMainFS()!;
    mainfs.write(dir, file, boardJsonBuffer);
  }

  _pullBoardFromRom(boardInfo: IBoardInfo): IBoard | null {
    if (!boardInfo.mainfsBoardFile) return null;

    const [dir, file] = boardInfo.mainfsBoardFile;
    const mainfs = romhandler.getRom()?.getMainFS()!;
    if (!mainfs.has(dir, file)) return null;

    const boardJsonBuffer = mainfs.get(dir, file);
    const board: IBoard = JSON.parse(stringFromArrayBuffer(boardJsonBuffer));
    return board;
  }

  // Handles any _deadSpace we may have added in overwriteBoard
  _cleanLoadedBoard(board: IBoard) {
    const lastIdx = board.spaces.length - 1;
    const lastSpace = board.spaces[board.spaces.length - 1];
    if (
      lastSpace &&
      lastSpace.x > board.bg.width + 50 &&
      lastSpace.y > board.bg.height + 50
    ) {
      $$log("Pruning dead space", lastSpace);
      board.spaces.splice(lastIdx, 1);
    }
  }

  _findEventTableLocations(boardInfo: IBoardInfo) {
    if (typeof boardInfo.sceneIndex !== "number" || boardInfo.sceneIndex < 0)
      return;

    const rom = romhandler.getRom()!;
    const game = rom.getGame()!;
    const hydrateEventTableAddr = getSymbol(game, "EventTableHydrate");
    const scenes = rom.getScenes();
    const sceneInfo = scenes.getInfo(boardInfo.sceneIndex);
    const boardCodeDataView = scenes.getCodeDataView(boardInfo.sceneIndex);
    const tableCalls = findCalls(boardCodeDataView, hydrateEventTableAddr);

    const spaceEventTables: any[] = [];
    if (!boardInfo.spaceEventTables) {
      boardInfo.spaceEventTables = spaceEventTables;
    }
    for (let i = 0; i < tableCalls.length; i++) {
      const callOffset = tableCalls[i];
      const upper = boardCodeDataView.getUint32(callOffset - 4);
      const lower = boardCodeDataView.getUint32(callOffset + 4);
      const tableAddr = getRegSetAddress(upper, lower);
      const tableOffset = this._addrToOffsetBase(
        tableAddr,
        sceneInfo.ram_start,
      );
      $$log(
        `Found event table ${$$hex(tableAddr)} (ROM ${$$hex(tableOffset)})`,
      );
      spaceEventTables.push({ tableOffset });
    }
  }

  _extractEvents(
    boardInfo: IBoardInfo,
    board: IBoard,
    boardIndex: number,
    chains: number[][],
  ) {
    if (!boardInfo.spaceEventTables || !boardInfo.sceneIndex) return;

    // PP64 sometimes stores board ASM in the main filesystem. We need to
    // be able to parse both that or the stock boards.
    let buffer: ArrayBuffer | undefined;
    let bufferView: DataView<ArrayBuffer> | undefined;
    const eventTable = new SpaceEventTable();
    if (boardInfo.mainfsEventFile) {
      const [mainFsDir, mainFsFile] = boardInfo.mainfsEventFile;
      const mainfs = romhandler.getRom()?.getMainFS()!;
      if (mainfs.has(mainFsDir, mainFsFile)) {
        buffer = mainfs.get(mainFsDir, mainFsFile);
        bufferView = new DataView(buffer);

        eventTable.parse(buffer, 0x10); // TODO: Multi-table.
      }
    }

    const scenes = romhandler.getRom()?.getScenes()!;
    const sceneInfo = scenes.getInfo(boardInfo.sceneIndex);
    if (!buffer) {
      bufferView = scenes.getDataView(boardInfo.sceneIndex);
      buffer = bufferView.buffer;

      boardInfo.spaceEventTables.forEach((tableDeflateCall: any) => {
        // Each board can have several event tables, which it "deflates" by
        // passing the table address to some function. We are parsing the table
        // addresses from those calls, because that gives us the flexibility
        // to reposition the tables and find them again later.
        let tableOffset;
        if (tableDeflateCall.tableOffset) {
          tableOffset = tableDeflateCall.tableOffset;
        } else {
          const upper = bufferView!.getUint32(tableDeflateCall.upper);
          const lower = bufferView!.getUint32(tableDeflateCall.lower);
          if (!upper && !lower) return;
          const tableAddr = getRegSetAddress(upper, lower);
          tableOffset = this._addrToOffsetBase(tableAddr, sceneInfo.ram_start);
        }

        eventTable.parse(buffer!, tableOffset); // Build up all the events into one collection.
      });
    }

    eventTable.forEach((eventTableEntry: any) => {
      const curSpaceIndex = eventTableEntry.spaceIndex;
      if (curSpaceIndex < 0) {
        $$log(`Space event on negative space ${curSpaceIndex}`);
      }

      // Figure out the current info struct offset in the ROM.
      const curInfoAddr = eventTableEntry.address & 0x7fffffff;
      let curInfoOffset;
      if (curInfoAddr > (this.EVENT_RAM_LOC & 0x7fffffff))
        curInfoOffset = this._addrToOffsetBase(curInfoAddr, this.EVENT_RAM_LOC);
      else
        curInfoOffset = this._addrToOffsetBase(
          curInfoAddr,
          sceneInfo.ram_start,
        );
      const boardList = new SpaceEventList();
      boardList.parse(buffer!, curInfoOffset);
      boardList.forEach((listEntry) => {
        // Figure out the event ASM info in ROM.
        const asmAddr = (listEntry.address as number) & 0x7fffffff;
        let asmOffset, codeView;
        if (asmAddr > (this.EVENT_RAM_LOC & 0x7fffffff)) {
          asmOffset = this._addrToOffsetBase(asmAddr, this.EVENT_RAM_LOC);
          codeView = bufferView!;
        } else {
          // This event actually points back to the original ROM.
          asmOffset = this._addrToOffsetBase(asmAddr, sceneInfo.ram_start);
          codeView = scenes.getDataView(boardInfo.sceneIndex!);
        }

        const eventInfo = parseEvent(codeView, {
          addr: asmAddr,
          offset: asmOffset,
          board,
          boardIndex,
          curSpace: curSpaceIndex, // TODO: Pass space or get rid of this
          curSpaceIndex,
          chains,
          game: romhandler.getROMGame()!,
          gameVersion: this.gameVersion,
        });

        // We parsed an actual event.
        if (eventInfo && eventInfo !== true) {
          eventInfo.activationType = listEntry.activationType;
          eventInfo.executionType = listEntry.executionType;
          addEventByIndex(
            board,
            curSpaceIndex,
            eventInfo,
            false,
            getEventsInLibrary(),
          );

          //console.log(`Found event 0x${asmOffset.toString(16)} (${eventInfo.name})`);
        } else if (!eventInfo) {
          //console.log(`Unknown event 0x${asmOffset.toString(16)} on board ${boardIndex} (${boardInfo.name})`);
        }

        if (isDebug()) {
          if (
            (Object as any).values &&
            (Object as any)
              .values(EventActivationType)
              .indexOf(listEntry.activationType) === -1
          )
            $$log(
              `Unknown event activation type ${$$hex(
                listEntry.activationType,
              )}, boardIndex: ${boardIndex}, spaceIndex: ${$$hex(
                curSpaceIndex,
              )}`,
            );
        }
      });
    });
  }

  // Creates the chain-based event objects that we abstract out in the UI.
  onCreateChainEvents(board: IBoard, chains: number[][]) {
    // There is either a merge or a split at the end of each chain.
    for (let i = 0; i < chains.length; i++) {
      const chain = chains[i];
      const lastSpace = chain[chain.length - 1];
      const links = getConnections(lastSpace, board)!;
      let event;
      if (links.length > 1) {
        // A split, figure out the end points.
        const endpoints: number[] = [];
        links.forEach((link) => {
          endpoints.push(_getChainWithSpace(link)!);
        });
        if (links.length > 2) {
          throw new Error(
            `Encountered branch with ${links.length} directions, only 2 are supported currently`,
          );
        }
        event = createEventInstance(
          this.gameVersion === 1 ? ChainSplit1 : ChainSplit2,
          {
            parameterValues: {
              left_space: links[0],
              right_space: links[1],
              chains: endpoints,
            },
          },
        );
      } else if (links.length > 0) {
        event = createEventInstance(ChainMerge, {
          parameterValues: {
            chain: _getChainWithSpace(links[0])!,
          },
        });
      }

      if (event) {
        addEventByIndex(board, lastSpace, event, true, getEventsInLibrary());
      }
    }

    function _getChainWithSpace(space: number) {
      for (let c = 0; c < chains.length; c++) {
        if (chains[c].indexOf(space) >= 0)
          // Should really be 0 always - game does support supplied index other than 0 though.
          return c;
      }
    }
  }

  // Adds the star events we abstract in the UI.
  _createStarEvents(board: IBoard) {
    for (let i = 0; i < board.spaces.length; i++) {
      const space = board.spaces[i];
      if (!space || !space.star) continue;
      const events = space.events || [];
      const hasStarEvent = events.some((e) => {
        return e.id === "STAR";
      }); // Pretty unlikely
      if (!hasStarEvent)
        addEventToSpaceInternal(
          board,
          space,
          createEventInstance(StarEvent),
          false,
          getEventsInLibrary(),
        );
    }
  }

  // Adds the gate events we abstract in the UI.
  _createGateEvents(board: IBoard, boardInfo: IBoardInfo, chains: number[][]) {
    let gateIndex = 0;
    for (let i = 0; i < board.spaces.length; i++) {
      const space = board.spaces[i];
      if (!space || space.subtype !== SpaceSubtype.GATE) continue;

      // We actually put an event before and after the gate, not actually on it.
      const entrySpaceIndex = _getPointingSpaceIndex(i);
      const entrySpace = board.spaces[entrySpaceIndex];
      if (!entrySpace) throw new Error(`Gate did not have entry space`);

      const prevSpaceIndex = _getPointingSpaceIndex(entrySpaceIndex);
      const prevSpace = board.spaces[prevSpaceIndex];
      if (!prevSpace) throw new Error(`Gate did not have previous space`);

      const prevChainIndex = _getChainWithSpace(prevSpaceIndex)!;
      const prevChainSpaceIndex =
        chains[prevChainIndex].indexOf(prevSpaceIndex);

      const exitSpaceIndex = _getNextSpaceIndex(i);
      const exitSpace = board.spaces[exitSpaceIndex];
      if (!exitSpace) throw new Error(`Gate did not have exit space`);

      const nextSpaceIndex = _getNextSpaceIndex(exitSpaceIndex);
      const nextSpace = board.spaces[nextSpaceIndex];
      if (!nextSpace) throw new Error(`Gate did not have next space`);

      const nextChainIndex = _getChainWithSpace(nextSpaceIndex)!;
      const nextChainSpaceIndex =
        chains[nextChainIndex].indexOf(nextSpaceIndex);

      // Redundant to write event twice, except we need it attached to both spaces.
      const gateEvent = createEventInstance(Gate, {
        parameterValues: {
          gatePrevChain: [prevChainIndex, prevChainSpaceIndex],
          gateEntryIndex: entrySpaceIndex,
          gateSpaceIndex: i,
          gateExitIndex: exitSpaceIndex,
          gateNextChain: [nextChainIndex, nextChainSpaceIndex],
        },
      });
      addEventToSpaceInternal(
        board,
        entrySpace,
        gateEvent,
        false,
        getEventsInLibrary(),
      );
      addEventToSpaceInternal(
        board,
        exitSpace,
        gateEvent,
        false,
        getEventsInLibrary(),
      );

      // Need an additional event to close the gate.
      addEventToSpaceInternal(
        board,
        space,
        createEventInstance(GateClose, {
          parameterValues: {
            gateIndex,
          },
        }),
        false,
        getEventsInLibrary(),
      );

      // There is also a listing of the entry/exit spaces, probably used by the gate animation.
      // if (boardInfo.gateNeighborsOffset) {
      //   const sceneView = scenes.getDataView(boardInfo.sceneIndex!);
      //   for (let gateAddrIndex = 0; gateAddrIndex < boardInfo.gateNeighborsOffset.length; gateAddrIndex++) {
      //     let gateAddr = boardInfo.gateNeighborsOffset[gateAddrIndex];
      //     gateAddr += (gateIndex * 4);

      //     sceneView.setUint16(gateAddr, entrySpaceIndex);
      //     sceneView.setUint16(gateAddr + 2, exitSpaceIndex);
      //   }
      // }

      gateIndex++;
    }

    function _getPointingSpaceIndex(pointedAtIndex: number) {
      for (const startIdx in board.links) {
        const ends = getConnections(parseInt(startIdx), board)!;
        for (let i = 0; i < ends.length; i++) {
          if (ends[i] === pointedAtIndex) return Number(startIdx);
        }
      }
      return -1;
    }

    function _getNextSpaceIndex(spaceIndex: number) {
      const ends = getConnections(spaceIndex, board)!;
      return ends[0];
    }

    function _getChainWithSpace(spaceIndex: number) {
      for (let c = 0; c < chains.length; c++) {
        if (chains[c].indexOf(spaceIndex) >= 0) return c;
      }
    }
  }

  // Write out all of the events ASM.
  async _writeEvents(
    board: IBoard,
    boardInfo: IBoardInfo,
    boardIndex: number,
    chains: number[][],
    eventSyms: string,
    audioIndices: number[],
  ) {
    if (boardInfo.mainfsEventFile) {
      await this._writeEventsNew2(
        board,
        boardInfo,
        boardIndex,
        chains,
        eventSyms,
        audioIndices,
      );
    }
  }

  async _writeEventsNew2(
    board: IBoard,
    boardInfo: IBoardInfo,
    boardIndex: number,
    chains: number[][],
    eventSyms: string,
    audioIndices: number[],
  ) {
    if (!boardInfo.mainfsEventFile)
      throw new Error(
        `No MainFS file specified to place board ASM for board ${boardIndex}.`,
      );

    const game = romhandler.getROMGame()!;
    const eventTable = new SpaceEventTable();
    const eventLists: SpaceEventList[] = [];
    const eventAsms: string[] = [];
    const eventTemp: any = {};
    const staticsWritten: { [eventName: string]: boolean } = {};
    for (let i = 0; i < board.spaces.length; i++) {
      const space = board.spaces[i];
      if (!space.events || !space.events.length) continue;
      eventTable.add(i, 0);

      const eventList = new SpaceEventList(i);
      for (let e = 0; e < space.events.length; e++) {
        const eventInstance = space.events[e];
        const activationType = getEventActivationTypeFromEditorType(
          eventInstance.activationType,
        );
        eventList.add(
          activationType,
          eventInstance.executionType || (eventInstance as any).mystery,
          0,
        );

        const temp = eventTemp[eventInstance.id] || {};
        const info: IEventWriteInfo = {
          boardIndex,
          board,
          boardInfo,
          audioIndices,
          curSpaceIndex: i,
          curSpace: space,
          chains,
          game,
          gameVersion: this.gameVersion,
        };

        const eventAsm = await writeEvent(
          new ArrayBuffer(0),
          eventInstance,
          info,
          temp,
        );
        eventTemp[eventInstance.id] = temp;

        if (!(typeof eventAsm === "string")) {
          throw new Error(
            `Event ${eventInstance.id} did not return a string to assemble`,
          );
        }

        const event = getEvent(eventInstance.id, board, getEventsInLibrary());
        assert(!!event);
        eventAsms.push(
          prepSingleEventAsm(
            eventAsm,
            event,
            eventInstance,
            info,
            !staticsWritten[eventInstance.id],
            e,
          ),
        );

        staticsWritten[eventInstance.id] = true;
      }
      eventLists.push(eventList);
    }

    // Write any board events
    const type5 = new SpaceEventList(-5);
    const type4 = new SpaceEventList(-4);
    const type3 = new SpaceEventList(-3);
    const type2 = new SpaceEventList(-2);
    const boardEventTypeInfos = [
      {
        index: -5,
        list: type5,
        type: EditorEventActivationType.BEFORE_DICE_ROLL,
      },
      {
        index: -4,
        list: type4,
        type: EditorEventActivationType.BEFORE_PLAYER_TURN,
      },
      { index: -3, list: type3, type: EditorEventActivationType.AFTER_TURN },
      { index: -2, list: type2, type: EditorEventActivationType.BEFORE_TURN },
    ];
    for (const { index, list, type } of boardEventTypeInfos) {
      const events = _getEventsWithActivationType(
        board.boardevents || [],
        type,
      );
      const activationType = getEventActivationTypeFromEditorType(type); // Always SPECIAL
      for (let e = 0; e < events.length; e++) {
        const eventInstance = events[e];
        list.add(activationType, eventInstance.executionType, 0);

        const temp = eventTemp[eventInstance.id] || {};
        const info: IEventWriteInfo = {
          boardIndex,
          board,
          boardInfo,
          audioIndices,
          curSpaceIndex: index,
          curSpace: null,
          chains,
          game,
          gameVersion: this.gameVersion,
        };

        const eventAsm = await writeEvent(
          new ArrayBuffer(0),
          eventInstance,
          info,
          temp,
        );
        eventTemp[eventInstance.id] = temp;

        if (!(typeof eventAsm === "string")) {
          throw new Error(
            `Event ${eventInstance.id} did not return a string to assemble`,
          );
        }

        const event = getEvent(eventInstance.id, board, getEventsInLibrary());
        assert(!!event);
        eventAsms.push(
          prepSingleEventAsm(
            eventAsm,
            event,
            eventInstance,
            info,
            !staticsWritten[eventInstance.id],
            e,
          ),
        );

        staticsWritten[eventInstance.id] = true;
      }

      this.onAddDefaultBoardEvents(type, list);

      if (list.count() > 0) {
        eventTable.add(index, 0);
        eventLists.push(list);
      }
    }

    const eventAsmCombinedString = eventAsms.join("\n");
    const genericAddrSymbols = makeGenericSymbolsForAddresses(
      eventAsmCombinedString,
    );

    const asm = `
.org ${$$hex(this.EVENT_RAM_LOC)}
.ascii "PP64"
.word ${$$hex(this.EVENT_RAM_LOC)}
.word 0 // Populated with buffer size later
.align 16

${eventSyms}

${makeGameSymbolLabels(game, false).join("\n")}
${makeBgSymbolLabels(
  boardInfo.bgDir,
  getBoardAdditionalBgHvqIndices(board),
).join("\n")}
${makeAudioSymbolLabels(audioIndices).join("\n")}
${genericAddrSymbols.join("\n")}

${eventTable.getAssembly()}
${eventLists.map((eventList) => eventList.getAssembly()).join("\n")}
${eventAsmCombinedString}
`;

    $$log(asm);

    let buffer: ArrayBuffer;
    const symbolMap = Object.create(null);
    try {
      buffer = assemble(asm, { symbolOutputMap: symbolMap }) as ArrayBuffer;
    } catch (e) {
      const fullError = `Error during board assembly: ${e}\nContext: ${asm}`;
      throw new Error(fullError);
    }

    $$log("Overlay symbols: ", symbolMap);

    const bufferView = new DataView(buffer);

    if (buffer.byteLength > this.EVENT_MEM_SIZE) {
      throw new Error(
        `Event code exceeded available memory space (${buffer.byteLength}/${this.EVENT_MEM_SIZE})`,
      );
    }

    // We can write the size of the event buffer to the header now, for the hook to use.
    bufferView.setUint32(8, buffer.byteLength);

    // We write list blob of ASM/structures into the MainFS, in a location
    // that is not used by the game.
    const [mainFsDir, mainFsFile] = boardInfo.mainfsEventFile;
    const mainfs = romhandler.getRom()?.getMainFS()!;
    mainfs.write(mainFsDir, mainFsFile, buffer);

    //saveAs(new Blob([buffer]), "eventBuffer");
  }

  _makeSymbolsForEventAssembly(
    syms: { [symbol: string]: number },
    sceneInfo: ISceneInfo,
  ): string {
    let result = "";
    for (const symName in syms) {
      if (symName.indexOf("__PP64_INTERNAL_VAL_") === 0) {
        result += `.definelabel ${symName},${$$hex(syms[symName])}\n`;
      } else if (symName.indexOf("__PP64_INTERNAL") === 0) {
        result += `.definelabel ${symName},${$$hex(
          sceneInfo.ram_start + syms[symName],
        )}\n`;
      }
    }
    return result;
  }

  onWriteEventAsmHook(
    romView: DataView,
    boardInfo: IBoardInfo,
    boardIndex: number,
  ) {
    throw new Error("Adapter does not implement onWriteEventAsmHook");
  }

  /**
   * Overwritten per game to add any default board events.
   * All board events need to be in the same list, so we need to merge defaults with any custom ones.
   */
  protected onAddDefaultBoardEvents(
    editorActivationType: EditorEventActivationType,
    list: SpaceEventList,
  ): void {}

  _extractStarGuardians(board: IBoard, boardInfo: IBoardInfo) {
    // AKA Toads or Baby Bowsers lol
    if (!boardInfo.sceneIndex) return;

    const scenes = romhandler.getRom()!.getScenes();
    const sceneView = scenes.getDataView(boardInfo.sceneIndex);

    // Training writes the toad directly.
    if (boardInfo.toadSpaceInst) {
      const toadSpace = sceneView.getUint16(boardInfo.toadSpaceInst + 2);
      if (board.spaces[toadSpace])
        board.spaces[toadSpace].subtype = SpaceSubtype.TOAD;
    }

    if (boardInfo.starSpaceCount) {
      // Parse the spaces that can be considered for star placement.
      let starSpacesOffset = boardInfo.starSpaceArrOffset!;
      if (Array.isArray(starSpacesOffset))
        starSpacesOffset = starSpacesOffset[0];
      for (let i = 0; i < boardInfo.starSpaceCount; i++) {
        const starSpace = sceneView.getUint16(starSpacesOffset + i * 2);
        if (board.spaces[starSpace]) {
          board.spaces[starSpace].star = true;
        }
      }

      // Parse the associated toads
      for (let i = 0; i < boardInfo.starSpaceCount; i++) {
        let toadSpacesOffset = boardInfo.toadSpaceArrOffset!;
        if (Array.isArray(toadSpacesOffset))
          toadSpacesOffset = toadSpacesOffset[0];
        const toadSpace = sceneView.getUint16(toadSpacesOffset + i * 2);
        if (board.spaces[toadSpace])
          board.spaces[toadSpace].subtype = SpaceSubtype.TOAD;
      }
    }
  }

  _writeStarInfo(board: IBoard, boardInfo: IBoardInfo) {
    const starCount = boardInfo.starSpaceCount;
    if (starCount) {
      const scenes = romhandler.getRom()!.getScenes();
      const sceneView = scenes.getDataView(boardInfo.sceneIndex!);

      const starIndices = [];
      for (let i = 0; i < board.spaces.length; i++) {
        if (board.spaces[i].star) starIndices.push(i);
      }

      let starSpacesOffsets = boardInfo.starSpaceArrOffset!;
      if (!Array.isArray(starSpacesOffsets))
        starSpacesOffsets = [starSpacesOffsets];
      for (let i = 0; i < starSpacesOffsets.length; i++) {
        const offset = starSpacesOffsets[i];
        for (let j = 0; j < starCount; j++) {
          const starIdx = j < starIndices.length ? j : starIndices.length - 1; // Keep writing last space to fill
          sceneView.setUint16(offset + j * 2, starIndices[starIdx]);
        }
      }

      const toadSpaces = getSpacesOfSubType(SpaceSubtype.TOAD, board);

      // Write the toad spaces, using distance formula for now.
      let toadSpacesOffsets = boardInfo.toadSpaceArrOffset!;
      if (!Array.isArray(toadSpacesOffsets))
        toadSpacesOffsets = [toadSpacesOffsets];
      for (let i = 0; i < toadSpacesOffsets.length; i++) {
        const offset = toadSpacesOffsets[i];
        for (let j = 0; j < starCount; j++) {
          const starIdx = j < starIndices.length ? j : starIndices.length - 1;
          const starSpace = board.spaces[starIndices[starIdx]];
          let bestDistance = Number.MAX_VALUE;
          let bestToadIdx = starIndices[starIdx]; // By default, no toad spaces = put toad on star space for now.
          for (let t = 0; t < toadSpaces.length; t++) {
            const toadIdx = toadSpaces[t];
            const toadSpace = board.spaces[toadIdx];
            const dist = distance(
              starSpace.x,
              starSpace.y,
              toadSpace.x,
              toadSpace.y,
            );
            if (dist < bestDistance) {
              bestDistance = dist;
              bestToadIdx = toadIdx;
            }
          }

          sceneView.setUint16(offset + j * 2, bestToadIdx);
        }
      }
    }
  }

  _extractBoos(board: IBoard, boardInfo: IBoardInfo) {
    if (!boardInfo.sceneIndex) return;

    const scenes = romhandler.getRom()!.getScenes();
    const sceneView = scenes.getDataView(boardInfo.sceneIndex);
    let booSpace;
    if (boardInfo.boosLoopFnOffset) {
      let booFnOffset = boardInfo.boosLoopFnOffset;

      // Read the Boo count.
      let booCount = sceneView.getUint16(booFnOffset + 0x2a);
      if (sceneView.getUint32(booFnOffset + 0x28) === 0x1a00fffc)
        // BNEZ when a single boo is made (Wario)
        booCount = 1;
      if (booCount === 0) return;

      booFnOffset = boardInfo.boosReadbackFnOffset!;
      let booRelativeAddr = sceneView.getInt16(booFnOffset + 0xd2);
      booRelativeAddr = 0x00100000 + booRelativeAddr; // Going to be a subtraction.

      const sceneInfo = scenes.getInfo(boardInfo.sceneIndex);
      const booSpacesOffset = this._addrToOffsetBase(
        booRelativeAddr,
        sceneInfo.ram_start,
      );
      for (let i = 0; i < booCount; i++) {
        booSpace = sceneView.getUint16(booSpacesOffset + 2 * i);
        if (board.spaces[booSpace])
          board.spaces[booSpace].subtype = SpaceSubtype.BOO;
      }
    } else if (boardInfo.booSpaceInst) {
      // Just one Boo
      booSpace = sceneView.getUint16(boardInfo.booSpaceInst + 2);
      if (board.spaces[booSpace])
        board.spaces[booSpace].subtype = SpaceSubtype.BOO;
    } else if (boardInfo.booCount) {
      const booArrOffset = boardInfo.booArrOffset!;
      for (let b = 0; b < booArrOffset.length; b++) {
        let curBooSpaceIndexOffset = booArrOffset[b];
        for (let i = 0; i < boardInfo.booCount; i++) {
          const booSpace = sceneView.getUint16(curBooSpaceIndexOffset);
          if (board.spaces[booSpace])
            board.spaces[booSpace].subtype = SpaceSubtype.BOO;
          curBooSpaceIndexOffset += 2;
        }
      }
    }
  }

  _writeBoos(board: IBoard, boardInfo: IBoardInfo) {
    if (!boardInfo.sceneIndex) return;

    // Find the boo spaces
    const booSpaces = getSpacesOfSubType(SpaceSubtype.BOO, board);

    const scenes = romhandler.getRom()!.getScenes();
    const sceneView = scenes.getDataView(boardInfo.sceneIndex);
    if (boardInfo.boosLoopFnOffset) {
      let booFnOffset = boardInfo.boosLoopFnOffset;

      // Read the Boo count.
      let booCount = sceneView.getUint16(booFnOffset + 0x2a);
      if (sceneView.getUint32(booFnOffset + 0x28) === 0x1a00fffc)
        // BNEZ when a single boo is made (Wario)
        booCount = 1;
      else if (booSpaces.length && booCount > booSpaces.length) {
        // Basically lower the boo count if we only have 1 boo instead of 2.
        sceneView.setUint16(booFnOffset + 0x2a, booSpaces.length);
      }
      if (booCount === 0) return;

      booFnOffset = boardInfo.boosReadbackFnOffset!;
      let booRelativeAddr = sceneView.getInt16(booFnOffset + 0xd2);
      booRelativeAddr = 0x00100000 + booRelativeAddr; // Going to be a subtraction.

      const sceneInfo = scenes.getInfo(boardInfo.sceneIndex);
      const booSpacesOffset = this._addrToOffsetBase(
        booRelativeAddr,
        sceneInfo.ram_start,
      );

      for (let i = 0; i < booCount; i++) {
        const booSpace =
          booSpaces[i] === undefined ? getDeadSpaceIndex(board) : booSpaces[i];
        sceneView.setUint16(booSpacesOffset + 2 * i, booSpace!);
      }
    } else if (boardInfo.booSpaceInst) {
      // Just one Boo
      const booSpace =
        booSpaces[0] === undefined ? getDeadSpaceIndex(board) : booSpaces[0];
      sceneView.setUint16(boardInfo.booSpaceInst + 2, booSpace!);
    } else if (boardInfo.booCount) {
      const booArrOffset = boardInfo.booArrOffset!;
      for (let b = 0; b < booArrOffset.length; b++) {
        let curBooSpaceIndexOffset = booArrOffset[b];
        for (let i = 0; i < boardInfo.booCount; i++) {
          const booSpace =
            booSpaces[i] === undefined
              ? getDeadSpaceIndex(board)
              : booSpaces[i];
          sceneView.setUint16(curBooSpaceIndexOffset, booSpace!);
          curBooSpaceIndexOffset += 2;
        }
      }
    }
  }

  _extractBanks(board: IBoard, boardInfo: IBoardInfo) {
    if (!boardInfo.bankCount || !boardInfo.sceneIndex) return;

    const scenes = romhandler.getRom()!.getScenes();
    const sceneView = scenes.getDataView(boardInfo.sceneIndex);
    const bankArrOffset = boardInfo.bankArrOffset!;
    for (let b = 0; b < bankArrOffset.length; b++) {
      let curBankSpaceIndexOffset = bankArrOffset[b];
      for (let i = 0; i < boardInfo.bankCount; i++) {
        const bankSpace = sceneView.getUint16(curBankSpaceIndexOffset);
        if (board.spaces[bankSpace])
          board.spaces[bankSpace].subtype = SpaceSubtype.BANK;
        curBankSpaceIndexOffset += 2;
      }
    }
    for (let b = 0; b < boardInfo.bankCoinArrOffset!.length; b++) {
      let curBankCoinSpaceIndexOffset = boardInfo.bankCoinArrOffset![b];
      for (let i = 0; i < boardInfo.bankCount; i++) {
        const bankCoinSpace = sceneView.getUint16(curBankCoinSpaceIndexOffset);
        if (board.spaces[bankCoinSpace])
          board.spaces[bankCoinSpace].subtype = SpaceSubtype.BANKCOIN;
        curBankCoinSpaceIndexOffset += 2;
      }
    }
  }

  _writeBanks(board: IBoard, boardInfo: IBoardInfo) {
    if (!boardInfo.bankCount || !boardInfo.sceneIndex) return;

    const scenes = romhandler.getRom()!.getScenes();
    const sceneView = scenes.getDataView(boardInfo.sceneIndex);
    const bankSpaces = getSpacesOfSubType(SpaceSubtype.BANK, board);
    const bankArrOffset = boardInfo.bankArrOffset!;
    for (let b = 0; b < bankArrOffset.length; b++) {
      let curBankSpaceIndexOffset = bankArrOffset[b];
      for (let i = 0; i < boardInfo.bankCount; i++) {
        const bankSpace =
          bankSpaces[i] === undefined
            ? getDeadSpaceIndex(board)
            : bankSpaces[i];
        sceneView.setUint16(curBankSpaceIndexOffset, bankSpace!);
        curBankSpaceIndexOffset += 2;
      }
    }

    const bankCoinSpaces = getSpacesOfSubType(SpaceSubtype.BANKCOIN, board);
    for (let b = 0; b < boardInfo.bankCoinArrOffset!.length; b++) {
      let curBankCoinSpaceIndexOffset = boardInfo.bankCoinArrOffset![b];
      for (let i = 0; i < boardInfo.bankCount; i++) {
        const bankCoinSpace =
          bankCoinSpaces[i] === undefined
            ? getDeadSpaceIndex(board)
            : bankCoinSpaces[i];
        sceneView.setUint16(curBankCoinSpaceIndexOffset, bankCoinSpace!);
        curBankCoinSpaceIndexOffset += 2;
      }
    }
  }

  _extractItemShops(board: IBoard, boardInfo: IBoardInfo) {
    if (!boardInfo.itemShopCount || !boardInfo.sceneIndex) return;

    const scenes = romhandler.getRom()!.getScenes();
    const sceneView = scenes.getDataView(boardInfo.sceneIndex);
    for (let b = 0; b < boardInfo.itemShopArrOffset!.length; b++) {
      let curItemShopSpaceIndexOffset = boardInfo.itemShopArrOffset![b];
      for (let i = 0; i < boardInfo.itemShopCount; i++) {
        const itemShopSpace = sceneView.getUint16(curItemShopSpaceIndexOffset);
        if (board.spaces[itemShopSpace])
          board.spaces[itemShopSpace].subtype = SpaceSubtype.ITEMSHOP;
        curItemShopSpaceIndexOffset += 2;
      }
    }
  }

  _writeItemShops(board: IBoard, boardInfo: IBoardInfo) {
    if (!boardInfo.itemShopCount || !boardInfo.sceneIndex) return;

    const scenes = romhandler.getRom()!.getScenes();
    const sceneView = scenes.getDataView(boardInfo.sceneIndex);
    const itemShopSpaces = getSpacesOfSubType(SpaceSubtype.ITEMSHOP, board);
    for (let b = 0; b < boardInfo.itemShopArrOffset!.length; b++) {
      let curItemShopSpaceIndexOffset = boardInfo.itemShopArrOffset![b];
      for (let i = 0; i < boardInfo.itemShopCount; i++) {
        const ItemShopSpace =
          itemShopSpaces[i] === undefined
            ? getDeadSpaceIndex(board)
            : itemShopSpaces[i];
        sceneView.setUint16(curItemShopSpaceIndexOffset, ItemShopSpace!);
        curItemShopSpaceIndexOffset += 2;
      }
    }
  }

  // Unused, unless MP2 goes old school.
  _writeGates(board: IBoard, boardInfo: IBoardInfo) {
    if (!boardInfo.gateCount || !boardInfo.sceneIndex) return;

    const scenes = romhandler.getRom()!.getScenes();
    const sceneView = scenes.getDataView(boardInfo.sceneIndex);
    const gateSpaces = [];
    for (let i = 0; i < board.spaces.length; i++) {
      if (board.spaces[i].subtype === SpaceSubtype.GATE) gateSpaces.push(i);
    }

    const gateArrOffset = boardInfo.gateArrOffset!;
    for (let b = 0; b < gateArrOffset.length; b++) {
      let curGateSpaceIndexOffset = gateArrOffset[b];
      for (let i = 0; i < boardInfo.gateCount; i++) {
        const gateSpace =
          gateSpaces[i] === undefined
            ? getDeadSpaceIndex(board)
            : gateSpaces[i];
        sceneView.setUint16(curGateSpaceIndexOffset, gateSpace!);
        curGateSpaceIndexOffset += 2;
      }
    }
  }

  async _writeBackground(
    bgIndex: number,
    src: string,
    width: number,
    height: number,
  ): Promise<void> {
    const imgData = await getImageData(src, width, height);
    const hvqfs = romhandler.getRom()!.getHVQFS();
    hvqfs.writeBackground(bgIndex, imgData, width, height);
  }

  async _writeAdditionalBackgrounds(board: IBoard): Promise<void> {
    const additionalBgs = board.additionalbg;
    if (!additionalBgs || !additionalBgs.length) {
      return;
    }

    const { width, height } = board.bg;
    const bgImgData = new Array(additionalBgs.length);

    const bgPromises = [];
    for (let i = 0; i < additionalBgs.length; i++) {
      const bgPromise = new Promise<void>((resolve) => {
        const index = i;
        getImageData(additionalBgs[i], width, height).then((imgData) => {
          bgImgData[index] = imgData;
          resolve();
        });
      });
      bgPromises.push(bgPromise);
    }

    await Promise.all(bgPromises);

    const hvqfs = romhandler.getRom()!.getHVQFS();
    for (const imgData of bgImgData) {
      // Append each one to the end of the hvq fs.
      hvqfs.writeBackground(
        hvqfs.getDirectoryCount(),
        imgData,
        width,
        height,
        board.bg,
      );
    }
  }

  onParseBoardSelectImg(board: IBoard, boardInfo: IBoardInfo) {
    $$log("Adapter does not implement onParseBoardSelectImg");
  }

  onWriteBoardSelectImg(board: IBoard, boardInfo: IBoardInfo): Promise<void> {
    $$log("Adapter does not implement onWriteBoardSelectImg");
    return Promise.resolve();
  }

  onParseBoardLogoImg(board: IBoard, boardInfo: IBoardInfo) {
    $$log("Adapter does not implement onParseBoardLogoImg");
  }

  onWriteBoardLogoImg(board: IBoard, boardInfo: IBoardInfo): Promise<void> {
    $$log("Adapter does not implement onWriteBoardLogoImg");
    return Promise.resolve();
  }

  _brandBootSplashscreen(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.options.writeBranding) {
        resolve();
        return;
      }

      if (!this.nintendoLogoFSEntry || !this.hudsonLogoFSEntry) {
        $$log("Adapter cannot write branding");
        resolve();
        return;
      }

      const srcImage = createImage();
      const failTimer = setTimeout(
        () => reject(`Failed to overwrite boot logo`),
        45000,
      );
      srcImage.onload = () => {
        this._combineSplashcreenLogos();

        const pp64Splash32Buffer = toArrayBuffer(srcImage, 320, 240);
        const pp64Splash16Buffer = RGBA5551fromRGBA32(
          pp64Splash32Buffer,
          320,
          240,
        );

        // Then, pack the image and write it.
        const imgInfoArr = [
          {
            src: pp64Splash16Buffer,
            width: 320,
            height: 240,
            bpp: 16,
          },
        ];
        const newPack = toPack(imgInfoArr, 16, 8);
        //saveAs(new Blob([newPack]));
        const mainfs = romhandler.getRom()?.getMainFS()!;
        mainfs.write(
          this.hudsonLogoFSEntry![0],
          this.hudsonLogoFSEntry![1],
          newPack,
        );

        clearTimeout(failTimer);
        resolve();
      };
      srcImage.src = bootsplashImage;
    });
  }

  _combineSplashcreenLogos() {
    const mainfs = romhandler.getRom()?.getMainFS()!;
    const nintendoPack = mainfs.get(
      this.nintendoLogoFSEntry![0],
      this.nintendoLogoFSEntry![1],
    ); // (NINTENDO) logo
    if (new Uint8Array(nintendoPack)[0x1a] !== 0x20) return; // We already replaced the splashscreen.

    const hudsonPack = mainfs.get(
      this.hudsonLogoFSEntry![0],
      this.hudsonLogoFSEntry![1],
    ); // Hudson logo

    const nintendoImgInfo = fromPack(nintendoPack)[0];
    const hudsonImgInfo = fromPack(hudsonPack)[0];

    const nintendoArr = new Uint8Array(nintendoImgInfo.src!);
    const hudsonArr = new Uint8Array(hudsonImgInfo.src!);

    const comboCanvasCtx = createContext(320, 240);
    comboCanvasCtx.fillStyle = "black";
    comboCanvasCtx.fillRect(0, 0, 320, 240);
    const comboImageData = comboCanvasCtx.getImageData(0, 0, 320, 240);

    for (let i = 320 * 88 * 4; i < 320 * 154 * 4; i++) {
      comboImageData.data[i - 320 * 40 * 4] = nintendoArr[i];
    }
    for (let i = 320 * 88 * 4; i < 320 * 154 * 4; i++) {
      comboImageData.data[i + 320 * 50 * 4] = hudsonArr[i];
    }

    //comboCanvasCtx.putImageData(comboImageData, 0, 0);
    //$$log(comboCanvasCtx.canvas.toDataURL());

    const combo16Buffer = RGBA5551fromRGBA32(
      comboImageData.data.buffer,
      320,
      240,
    );
    const imgInfoArr = [
      {
        src: combo16Buffer,
        width: 320,
        height: 240,
        bpp: 16,
      },
    ];
    const newPack = toPack(imgInfoArr, 16, 8);
    //saveAs(new Blob([newPack]));
    mainfs.write(
      this.nintendoLogoFSEntry![0],
      this.nintendoLogoFSEntry![1],
      newPack,
    );
  }

  _clearOtherBoardNames(boardIndex: number) {
    $$log("Adapter does not implement _clearOtherBoardNames");
  }

  _readPackedFromMainFS(dir: number, file: number) {
    const mainfs = romhandler.getRom()?.getMainFS()!;
    const imgPackBuffer = mainfs.get(dir, file);
    const imgArr = fromPack(imgPackBuffer);
    if (!imgArr || !imgArr.length) return;

    const dataViews = imgArr.map((imgInfo) => {
      return imgInfoSrcToDataView(imgInfo.src!);
    });

    return dataViews;
  }

  _readImgsFromMainFS(dir: number, file: number) {
    const mainfs = romhandler.getRom()?.getMainFS()!;
    const imgPackBuffer = mainfs.get(dir, file);
    const imgArr = fromPack(imgPackBuffer);
    if (!imgArr || !imgArr.length) return;

    return imgArr;
  }

  _readImgInfoFromMainFS(dir: number, file: number, imgArrIndex: number) {
    const imgArr = this._readImgsFromMainFS(dir, file)!;
    return imgArr[imgArrIndex || 0];
  }

  _readImgFromMainFS(dir: number, file: number, imgArrIndex: number) {
    const imgInfo = this._readImgInfoFromMainFS(dir, file, imgArrIndex);
    const arrayBuffer = imgInfoSrcToArrayBuffer(imgInfo.src!);
    return arrayBufferToDataURL(arrayBuffer, imgInfo.width, imgInfo.height);
  }

  _parseAudio(board: IBoard, boardInfo: IBoardInfo) {
    if (!boardInfo.audioIndexOffset || !boardInfo.sceneIndex) return;

    const scenes = romhandler.getRom()!.getScenes();
    const sceneView = scenes.getDataView(boardInfo.sceneIndex);
    board.audioIndex = sceneView.getUint16(boardInfo.audioIndexOffset);
  }

  /**
   * Called to apply the background music choice to the ROM.
   * @returns Effective audio index to use.
   */
  onWriteAudio(
    board: IBoard,
    boardInfo: IBoardInfo,
    boardIndex: number,
  ): number[] {
    let audioIndices: number[] = [];
    switch (board.audioType) {
      case BoardAudioType.Custom:
        {
          const seqTable = audio.getSequenceTable(0)!;
          assert(!!seqTable);
          for (const audioEntry of board.audioData!) {
            audioIndices.push(seqTable.midis.length);
            seqTable.midis.push({
              buffer: createGameMidi(dataUrlToArrayBuffer(audioEntry.data), {
                loop: true,
              })!,
              soundbankIndex: audioEntry.soundbankIndex,
            });
          }
        }
        break;

      case BoardAudioType.InGame:
      default:
        audioIndices = [board.audioIndex || 0];
        break;
    }

    return audioIndices;
  }

  getAudioMap(table: number): string[] {
    $$log("Adapter does not implement getAudioMap");
    return [];
  }

  getSoundEffectMap(table: number): string[] {
    $$log("Adapter does not implement getSoundEffectMap");
    return [];
  }

  getCharacterMap(): { [num: number]: string } {
    $$log("Adapter does not implement getCharacterMap");
    return {};
  }
}

function _getEventsWithActivationType(
  events: IEventInstance[],
  activationType: EditorEventActivationType,
): IEventInstance[] {
  return events.filter((e) => e.activationType === activationType);
}
