import { romhandler } from "../romhandler";
import { getBoardInfos, getBoardInfoByIndex, getArrowRotationLimit } from "./boardinfo";
import { hvqfs } from "../fs/hvqfs";
import { mainfs } from "../fs/mainfs";
import { audio } from "../fs/audio";
import { IBoard, addSpace, addEventByIndex, getConnections, addEventToSpace, getSpacesOfSubType, getCurrentBoard, ISpace } from "../boards";
import { copyObject } from "../utils/obj";
import { determineChains, padChains, create as createBoardDef, parse as parseBoardDef } from "./boarddef";
import { Space, BoardType, EventActivationType, SpaceSubtype } from "../types";
import { $$log, $$hex } from "../utils/debug";
import { getSymbol } from "../symbols/symbols";
import { scenes } from "../fs/scenes";
import { findCalls, getRegSetAddress } from "../utils/MIPS";
import { SpaceEventTable } from "./eventtable";
import { SpaceEventList } from "./eventlist";
import { create as createEvent, IEventWriteInfo, write as writeEvent, parse as parseEvent, EventParameterType } from "../events/events";
import { toU32 } from "../utils/string";
import { makeDivisibleBy, distance, getRawFloat32Format } from "../utils/number";
import { parse as parstInst } from "mips-inst";
import { assemble } from "mips-assembler";
import { createContext } from "../utils/canvas";
import { toArrayBuffer } from "../utils/image";
import { RGBA5551fromRGBA32 } from "../utils/img/RGBA5551";
import { toPack, fromPack } from "../utils/img/ImgPack";
import { arrayBufferToDataURL } from "../utils/arrays";
import { get, $setting } from "../settings";
import { render } from "../renderer";
import { showMessage } from "../appControl";
import { makeGameSymbolLabels, prepSingleEventAsm } from "../events/prepAsm";

export type IBoardInfo = any;

export abstract class AdapterBase {
  /** The arbitrary upper bound size of the events ASM blob. */
  public EVENT_MEM_SIZE: number = 0x50000;

  /**
   * Location that custom ASM will be placed in RAM.
   * 0x807B0000 right now
   */
  public EVENT_RAM_LOC: number = (0x80000000 | (0x800000 - this.EVENT_MEM_SIZE)) >>> 0;

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

  constructor() {}

  loadBoards() {
    let boards = [];
    let boardInfos = getBoardInfos(romhandler.getROMGame()!);

    for (let i = 0; i < boardInfos.length; i++) {
      if ($$debug)
        console.group(`Board ${i}`);

      let boardInfo = boardInfos[i];
      let bgDir = boardInfo.bgDir;
      let background = hvqfs.readBackground(bgDir);
      let partialBoard = {
        "game": this.gameVersion,
        "type": boardInfo.type || BoardType.NORMAL,
        "bg": background,
        "otherbg": {},
      };

      let boardBuffer = mainfs.get(this.boardDefDirectory, boardInfo.boardDefFile);
      let newBoard = parseBoardDef(boardBuffer, partialBoard);
      let chains: number[][] = (newBoard as any)._chains;
      delete (newBoard as any)._chains;
      $$log(`Board ${i} chains: `, chains);

      this.onChangeBoardSpaceTypesFromGameSpaceTypes(newBoard, chains);
      this._cleanLoadedBoard(newBoard);

      this.onParseStrings(newBoard, boardInfo);
      if (!newBoard.name)
        newBoard.name = boardInfo.name || "";

      this.onParseBoardSelectImg(newBoard, boardInfo);
      this.onParseBoardLogoImg(newBoard, boardInfo);

      this._parseAudio(newBoard, boardInfo);

      this._findEventTableLocations(boardInfo);
      this._extractEvents(boardInfo, newBoard, i, chains);
      this._extractStarGuardians(newBoard, boardInfo);
      this._extractBoos(newBoard, boardInfo);

      if (boardInfo.onLoad)
        boardInfo.onLoad(newBoard);

      if (this.onLoad)
        this.onLoad(newBoard, boardInfo);

      boards.push(newBoard);

      if ($$debug)
        console.groupEnd();
    }

    if ($$debug) {
      // Debug if audio offsets are right.
      let audioSectionCount = audio.getPatchInfo().length;
      for (let i = 0; i < audioSectionCount; i++)
        audio.getROMOffset(i);
    }

    return boards;
  }

  protected abstract onLoad?(board: IBoard, boardInfo: IBoardInfo): void;
  protected abstract onAfterOverwrite?(romView: DataView, boardCopy: IBoard, boardInfo: IBoardInfo): void;

  overwriteBoard(boardIndex: number, board: IBoard) {
    let boardCopy = copyObject(board);
    const boardInfo = getBoardInfoByIndex(romhandler.getROMGame()!, boardIndex);

    let chains = determineChains(boardCopy);
    padChains(boardCopy, chains);

    // If the user didn't place enough 3d characters, banish them to this dead space off screen.
    let deadSpace = addSpace(boardCopy.bg.width + 150, boardCopy.bg.height + 100, Space.OTHER, undefined, boardCopy);
    boardCopy._deadSpace = deadSpace;

    this.onChangeGameSpaceTypesFromBoardSpaceTypes(boardCopy);

    let boarddef = createBoardDef(boardCopy, chains);
    mainfs.write(this.boardDefDirectory, boardInfo.boardDefFile, boarddef);

    // Wipe out the space event definition array.
    // let spaceEventStart = boardInfo.spaceEventsStartOffset;
    // let spaceEventEnd = boardInfo.spaceEventsEndOffset;
    let romView = romhandler.getDataView();
    // for (let offset = spaceEventStart; offset < spaceEventEnd; offset += 4)
    //   romView.setUint32(offset, 0xFFFF0000);

    // Wipe out the event ASM from those events.
    let eventASMStart = boardInfo.eventASMStart;
    if (eventASMStart) {
      let eventASMEnd = boardInfo.eventASMEnd;
      for (let offset = eventASMStart; offset < eventASMEnd; offset += 4)
        romView.setUint32(offset, 0);
    }

    this.onWriteStrings(boardCopy, boardInfo);
    this.onWriteAudio(boardCopy, boardInfo, boardIndex);

    // Write out the board events to ROM.
    this.onCreateChainEvents(boardCopy, chains);
    this._createStarEvents(boardCopy);
    this._createGateEvents(boardCopy, boardInfo, chains);
    if (boardInfo.onWriteEvents)
      boardInfo.onWriteEvents(boardCopy);
    this._writeEvents(boardCopy, boardInfo, boardIndex, chains);
    this._writeStarInfo(boardCopy, boardInfo);
    this._writeBoos(boardCopy, boardInfo);

    this._clearOtherBoardNames(boardIndex);

    if (boardInfo.onAfterOverwrite)
      boardInfo.onAfterOverwrite(romView, boardCopy);

    if (this.onAfterOverwrite)
      this.onAfterOverwrite(romView, boardCopy, boardInfo);

    return this.onOverwritePromises(board, boardInfo);
  }

  onAfterSave(romView: DataView): void
  {
  }

  onOverwritePromises(board: IBoard, boardInfo: IBoardInfo): Promise<any> {
    throw "Adapter does not implement onOverwritePromises";
  }

  // Gives a new space the default things it would need.
  hydrateSpace(space: ISpace) {
    throw "hydrateSpace not implemented";
  }

  onParseStrings(board: IBoard, boardInfo: IBoardInfo) {
    $$log("Adapter does not implement onParseStrings");
  }

  onWriteStrings(board: IBoard, boardInfo: IBoardInfo) {
    $$log("Adapter does not implement onWriteStrings");
  }

  onChangeBoardSpaceTypesFromGameSpaceTypes(board: IBoard, chains: number[][]) {
    $$log("Adapter does not implement onChangeBoardSpaceTypesFromGameSpaceTypes");
  }

  onChangeGameSpaceTypesFromBoardSpaceTypes(board: IBoard) {
    $$log("Adapter does not implement onChangeGameSpaceTypesFromBoardSpaceTypes");
  }

  /**
   * Converts a ROM address to an in-game RAM offset.
   * Assumes the offset is within the scene overlay for the given board.
   * @param {number} offset ROM offset to convert
   * @param {object} boardInfo Board info related to the offset
   */
  _offsetToAddr(offset: number, boardInfo: IBoardInfo) {
    if (typeof boardInfo.sceneIndex === "number" && boardInfo.sceneIndex >= 0) {
      const sceneInfo = scenes.getInfo(boardInfo.sceneIndex);
      return (sceneInfo.ram_start & 0x7FFFFFFF)
            - (sceneInfo.rom_start - offset);
    }

    return boardInfo.spaceEventsStartAddr
        - (boardInfo.spaceEventsStartOffset - offset);
  }

  _offsetToAddrBase(offset: number, base: number) {
    return (base + offset) >>> 0;
  }

  /**
   * Converts an in-game address to ROM offset.
   * Assumes the address is within the scene overlay for a given board.
   * @param {number} addr Address to convert
   * @param {object} boardInfo Board info related to the address.
   */
  _addrToOffset(addr: number, boardInfo: IBoardInfo) {
    if (typeof boardInfo.sceneIndex === "number" && boardInfo.sceneIndex >= 0) {
      const sceneInfo = scenes.getInfo(boardInfo.sceneIndex);
      return sceneInfo.rom_start
            - ((sceneInfo.ram_start & 0x7FFFFFFF) - (addr & 0x7FFFFFFF));
    }

    return boardInfo.spaceEventsStartOffset
        - (boardInfo.spaceEventsStartAddr - addr);
  }

  _addrToOffsetBase(addr: number, base: number) {
    return ((addr & 0x7FFFFFFF) - (base & 0x7FFFFFFF)) >>> 0;
  }

  // Handles any _deadSpace we may have added in overwriteBoard
  _cleanLoadedBoard(board: IBoard) {
    let lastIdx = board.spaces.length - 1;
    let lastSpace = board.spaces[board.spaces.length - 1];
    if (lastSpace && (lastSpace.x > board.bg.width + 50) && (lastSpace.y > board.bg.height + 50)) {
      $$log("Pruning dead space", lastSpace);
      board.spaces.splice(lastIdx, 1);
    }
  }

  _findEventTableLocations(boardInfo: IBoardInfo) {
    if (typeof boardInfo.sceneIndex !== "number" || boardInfo.sceneIndex < 0)
      return;

    const game = romhandler.getROMGame()!;
    const hydrateEventTableAddr = getSymbol(game, "EventTableHydrate");

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
      const tableOffset = this._addrToOffset(tableAddr, boardInfo);
      $$log(`Found event table ${$$hex(tableAddr)} (ROM ${$$hex(tableOffset)})`);
      spaceEventTables.push({ tableOffset });
    }
  }

  _extractEvents(boardInfo: IBoardInfo, board: IBoard, boardIndex: number, chains: number[][]) {
    if (boardInfo.spaceEventTables) {
      this._extractEventsNew(boardInfo, board, boardIndex, chains);
      return;
    }

    // When we convert everything to spaceEventTables, just remove this and rename _extractEventsNew
    if (!boardInfo.spaceEventsStartAddr)
      return;

    let boardView = romhandler.getDataView();
    let curOffset = boardInfo.spaceEventsStartOffset;

    // Generic events
    while (curOffset < boardInfo.spaceEventsEndOffset) {
      if (boardView.getInt16(curOffset) === -1) { // Sometimes there's -1 dividers.
        curOffset += 8;
        continue;
      }

      // Figure out the current info struct offset in the ROM.
      let curInfoAddr = boardView.getUint32(curOffset + 4) & 0x7FFFFFFF;
      let curInfoOffset = this._addrToOffset(curInfoAddr, boardInfo);
      let eventActivationType = boardView.getUint16(curInfoOffset);

      if (!curInfoAddr && !boardView.getInt16(curOffset)) // Just ran out of events and into 00s.
        break;

      while (eventActivationType) {
        // Figure out the event ASM info in ROM.
        let eventExecutionType = boardView.getUint16(curInfoOffset + 2);
        let asmAddr = boardView.getUint32(curInfoOffset + 4) & 0x7FFFFFFF;
        let asmOffset = boardInfo.spaceEventsStartOffset
          - (boardInfo.spaceEventsStartAddr - asmAddr);

        let curSpace = boardView.getInt16(curOffset);
        let eventInfo = parseEvent(boardView, {
          addr: asmAddr,
          offset: asmOffset,
          board,
          boardIndex,
          curSpace,
          chains,
          game: romhandler.getROMGame()!,
          gameVersion: this.gameVersion,
        } as any);

        // We parsed an actual event.
        if (eventInfo && eventInfo !== true) {
          eventInfo.activationType = eventActivationType;
          eventInfo.executionType = eventExecutionType;
          addEventByIndex(board, curSpace, eventInfo);

          //console.log(`Found event 0x${asmOffset.toString(16)} (${eventInfo.name})`);
        }
        else if (!eventInfo) {
          //console.log(`Unknown event 0x${asmOffset.toString(16)} on board ${boardIndex} (${boardInfo.name})`);
        }

        curInfoAddr += 8;
        curInfoOffset = this._addrToOffset(curInfoAddr, boardInfo);
        eventActivationType = boardView.getUint16(curInfoOffset);
      }

      curOffset += 8;
    }
  }

  _extractEventsNew(boardInfo: IBoardInfo, board: IBoard, boardIndex: number, chains: number[][]) {
    if (!boardInfo.spaceEventTables)
      return;

    // PP64 sometimes stores board ASM in the main filesystem. We need to
    // be able to parse both that or the stock boards.
    let buffer: ArrayBuffer | undefined;
    let bufferView: DataView | undefined;
    let eventTable = new SpaceEventTable();
    if (boardInfo.mainfsEventFile) {
      let [mainFsDir, mainFsFile] = boardInfo.mainfsEventFile;
      if (mainfs.has(mainFsDir, mainFsFile)) {
        buffer = mainfs.get(mainFsDir, mainFsFile);
        bufferView = new DataView(buffer);

        eventTable.parse(buffer, 0x10); // TODO: Multi-table.
      }
    }

    if (!buffer) {
      buffer = romhandler.getROMBuffer()!;
      bufferView = romhandler.getDataView();

      boardInfo.spaceEventTables.forEach((tableDeflateCall: any) => {
        // Each board can have several event tables, which it "deflates" by
        // passing the table address to some function. We are parsing the table
        // addresses from those calls, because that gives us the flexibility
        // to reposition the tables and find them again later.
        let tableOffset;
        if (tableDeflateCall.tableOffset) {
          tableOffset = tableDeflateCall.tableOffset;
        }
        else {
          let upper = bufferView!.getUint32(tableDeflateCall.upper);
          let lower = bufferView!.getUint32(tableDeflateCall.lower);
          if (!upper && !lower)
            return;
          let tableAddr = getRegSetAddress(upper, lower);
          tableOffset = this._addrToOffset(tableAddr, boardInfo);
        }

        eventTable.parse(buffer!, tableOffset); // Build up all the events into one collection.
      });
    }

    eventTable.forEach((eventTableEntry: any) => {
      let curSpaceIndex = eventTableEntry.spaceIndex;

      // Figure out the current info struct offset in the ROM.
      let curInfoAddr = eventTableEntry.address & 0x7FFFFFFF;
      let curInfoOffset;
      if (curInfoAddr > (this.EVENT_RAM_LOC & 0x7FFFFFFF))
        curInfoOffset = this._addrToOffsetBase(curInfoAddr, this.EVENT_RAM_LOC);
      else
        curInfoOffset = this._addrToOffset(curInfoAddr, boardInfo);
      let boardList = new SpaceEventList();
      boardList.parse(buffer!, curInfoOffset);
      boardList.forEach(listEntry => {
        // Figure out the event ASM info in ROM.
        let asmAddr = listEntry.address & 0x7FFFFFFF;
        let asmOffset, codeView;
        if (asmAddr > (this.EVENT_RAM_LOC & 0x7FFFFFFF)) {
          asmOffset = this._addrToOffsetBase(asmAddr, this.EVENT_RAM_LOC);
          codeView = bufferView!;
        }
        else {
          // This event actually points back to the original ROM.
          asmOffset = this._addrToOffset(asmAddr, boardInfo);
          codeView = romhandler.getDataView();
        }

        let eventInfo = parseEvent(codeView, {
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
          addEventByIndex(board, curSpaceIndex, eventInfo);

          //console.log(`Found event 0x${asmOffset.toString(16)} (${eventInfo.name})`);
        }
        else if (!eventInfo) {
          //console.log(`Unknown event 0x${asmOffset.toString(16)} on board ${boardIndex} (${boardInfo.name})`);
        }

        if ($$debug) {
          if ((Object as any).values && (Object as any).values(EventActivationType).indexOf(listEntry.activationType) === -1)
            $$log(`Unknown event activation type ${$$hex(listEntry.activationType)}, boardIndex: ${boardIndex}, spaceIndex: ${$$hex(curSpaceIndex)}`);
        }
      });
    });
  }

  // Creates the chain-based event objects that we abstract out in the UI.
  onCreateChainEvents(board: IBoard, chains: number[][]) {
    // There is either a merge or a split at the end of each chain.
    for (let i = 0; i < chains.length; i++) {
      let chain = chains[i];
      let lastSpace = chain[chain.length - 1];
      let links = getConnections(lastSpace, board)!;
      let event;
      if (links.length > 1) {
        // A split, figure out the end points.
        let endpoints: number[] = [];
        links.forEach(link => {
          endpoints.push(_getChainWithSpace(link)!);
        });
        if (this.gameVersion === 1) {
          if (links.length > 2) {
            throw new Error(`Encountered branch with ${links.length} directions, only 2 are supported currently`);
          }
          event = createEvent("CHAINSPLIT", {
            parameters: [
              { name: "left_space", type: EventParameterType.Space },
              { name: "right_space", type: EventParameterType.Space }
            ],
            parameterValues: {
              left_space: links[0],
              right_space: links[1],
            },
            chains: endpoints,
          });
        }
        else {
          event = createEvent("CHAINSPLIT", {
            inlineArgs: links.concat(0xFFFF),
            chains: endpoints,
          });
        }
      }
      else {
        event = createEvent("CHAINMERGE", {
          chain: _getChainWithSpace(links[0]),
        });
      }

      addEventByIndex(board, lastSpace, event, true);
    }

    function _getChainWithSpace(space: number) {
      for (let c = 0; c < chains.length; c++) {
        if (chains[c].indexOf(space) >= 0) // Should really be 0 always - game does support supplied index other than 0 though.
          return c;
      }
    }
  }

  // Adds the star events we abstract in the UI.
  _createStarEvents(board: IBoard) {
    for (let i = 0; i < board.spaces.length; i++) {
      let space = board.spaces[i];
      if (!space || !space.star)
        continue;
      let events = space.events || [];
      let hasStarEvent = events.some(e => { return e.id === "STAR" }); // Pretty unlikely
      if (!hasStarEvent)
        addEventToSpace(space, createEvent("STAR"));
    }
  }

  // Adds the gate events we abstract in the UI.
  _createGateEvents(board: IBoard, boardInfo: IBoardInfo, chains: number[][]) {
    let gateIndex = 0;
    for (let i = 0; i < board.spaces.length; i++) {
      let space = board.spaces[i];
      if (!space || space.subtype !== SpaceSubtype.GATE)
        continue;

      // We actually put an event before and after the gate, not actually on it.
      let entrySpaceIndex = _getPointingSpaceIndex(i);
      let entrySpace = board.spaces[entrySpaceIndex];
      if (!entrySpace)
        throw `Gate did not have entry space`;

      let prevSpaceIndex = _getPointingSpaceIndex(entrySpaceIndex);
      let prevSpace = board.spaces[prevSpaceIndex];
      if (!prevSpace)
        throw `Gate did not have previous space`;

      let prevChainIndex = _getChainWithSpace(prevSpaceIndex)!;
      let prevChainSpaceIndex = chains[prevChainIndex].indexOf(prevSpaceIndex);

      let exitSpaceIndex = _getNextSpaceIndex(i);
      let exitSpace = board.spaces[exitSpaceIndex];
      if (!exitSpace)
        throw `Gate did not have exit space`;

      let nextSpaceIndex = _getNextSpaceIndex(exitSpaceIndex);
      let nextSpace = board.spaces[nextSpaceIndex];
      if (!nextSpace)
        throw `Gate did not have next space`;

      let nextChainIndex = _getChainWithSpace(nextSpaceIndex)!;
      let nextChainSpaceIndex = chains[nextChainIndex].indexOf(nextSpaceIndex);

      // Redundant to write event twice, except we need it attached to both spaces.
      let gateEvent = createEvent("GATE", {
        gatePrevChain: [prevChainIndex, prevChainSpaceIndex],
        gateEntryIndex: entrySpaceIndex,
        gateSpaceIndex: i,
        gateExitIndex: exitSpaceIndex,
        gateNextChain: [nextChainIndex, nextChainSpaceIndex],
      });
      addEventToSpace(entrySpace, gateEvent);
      addEventToSpace(exitSpace, gateEvent);

      // Need an additional event to close the gate.
      addEventToSpace(space, createEvent("GATECLOSE", { gateIndex }));

      // There is also a listing of the entry/exit spaces, probably used by the gate animation.
      if (boardInfo.gateNeighborsOffset) {
        let romView = romhandler.getDataView();
        for (let gateAddrIndex = 0; gateAddrIndex < boardInfo.gateNeighborsOffset.length; gateAddrIndex++) {
          let gateAddr = boardInfo.gateNeighborsOffset[gateAddrIndex];
          gateAddr += (gateIndex * 4);

          romView.setUint16(gateAddr, entrySpaceIndex);
          romView.setUint16(gateAddr + 2, exitSpaceIndex);
        }
      }

      gateIndex++;
    }

    function _getPointingSpaceIndex(pointedAtIndex: number) {
      for (let startIdx in board.links) {
        let ends = getConnections(parseInt(startIdx), board)!;
        for (let i = 0; i < ends.length; i++) {
          if (ends[i] === pointedAtIndex)
            return Number(startIdx);
        }
      }
      return -1;
    }

    function _getNextSpaceIndex(spaceIndex: number) {
      let ends = getConnections(spaceIndex, board)!;
      return ends[0];
    }

    function _getChainWithSpace(spaceIndex: number) {
      for (let c = 0; c < chains.length; c++) {
        if (chains[c].indexOf(spaceIndex) >= 0)
          return c;
      }
    }
  }

  _getArgsSize(count: number) {
    return (count * 2) + (4 - ((count * 2) % 4));
  }

  // Write out all of the events ASM.
  _writeEvents(board: IBoard, boardInfo: IBoardInfo, boardIndex: number, chains: number[][]) {
    if (boardInfo.mainfsEventFile) {
      if (this.gameVersion === 1) {
        this._writeEventsNew2(board, boardInfo, boardIndex, chains);
      }
      else {
        this._writeEventsNew(board, boardInfo, boardIndex, chains);
      }
      return;
    }

    let romView = romhandler.getDataView();
    let romBytes = romhandler.getByteArray()!;

    let curEventListingOffset = boardInfo.spaceEventsStartOffset;
    let curEventRedirectOffset = curEventListingOffset - 8; // This moves backwards.
    let curASMOffset = boardInfo.eventASMStart;

    romBytes.fill(0, curEventRedirectOffset, curEventRedirectOffset + 8); // Pad zeros between the two sections.

    let eventTemp: any = {};

    for (let i = 0; i < board.spaces.length; i++) {
      let space = board.spaces[i];
      if (!space.events || !space.events.length)
        continue;

      // Prepare the redirection area.
      let redirEntryLen = (space.events.length + 1) * 8;
      space.events.forEach(event => {
        if (event.inlineArgs) {
          redirEntryLen += this._getArgsSize(event.inlineArgs.length);
        }
      });
      curEventRedirectOffset -= redirEntryLen;
      romBytes.fill(0, curEventRedirectOffset, curEventRedirectOffset + redirEntryLen);

      // Reads entries first to last, but leave empty zeroes in front.
      let redirEntry = curEventRedirectOffset + 8;

      let hasWrittenListingOffset = false;

      space.events.forEach(event => {
        let temp = eventTemp[event.id] || {};
        let info: Partial<IEventWriteInfo> = {
          boardIndex,
          offset: curASMOffset,
          addr: this._offsetToAddr(curASMOffset, boardInfo) | 0x80000000,
          game: romhandler.getROMGame()!,
          gameVersion: this.gameVersion,
        };

        // Write any inline arguments
        let argsCount = 0;
        let argsSize = 0;
        if (event.inlineArgs) {
          argsCount = event.inlineArgs.length;
          argsSize = this._getArgsSize(argsCount);
          info.argsAddr = this._offsetToAddr(redirEntry, boardInfo) | 0x80000000;
        }
        for (let arg = 0; arg < argsCount; arg++) {
          let argOffset = redirEntry + (arg * 2);
          romView.setUint16(argOffset, event.inlineArgs[arg]);
        }

        let [writtenASMOffset, len] = writeEvent(romhandler.getROMBuffer()!, event,
          info as IEventWriteInfo, temp) as number[];
        eventTemp[event.id] = temp;

        romView.setUint16(argsSize + redirEntry, event.activationType);
        romView.setUint16(argsSize + redirEntry + 2, event.executionType || event.mystery);
        romView.setUint32(argsSize + redirEntry + 4, this._offsetToAddr(writtenASMOffset, boardInfo) | 0x80000000);

        if (!hasWrittenListingOffset) {
          // Write the event listing for this space once we know the args size.
          romView.setUint16(curEventListingOffset, i); // Space index
          romView.setUint32(curEventListingOffset + 4, this._offsetToAddr(argsSize + redirEntry, boardInfo) | 0x80000000); // Redirect addr

          hasWrittenListingOffset = true;
        }

        redirEntry += 8 + argsSize;

        // If we actually wrote to the new space, update curASMOffset, else assume we reused some ASM.
        if (writtenASMOffset === curASMOffset)
          curASMOffset += len;

        if (curASMOffset > boardInfo.eventASMEnd) {
          showMessage(`Oops! This board is too complicated and overflowed the game's available space.
            Try removing some events or reducing the number of branching paths.
            The ROM has also been corrupted in memory so please close and open it.`); // '
          throw "Overflowed board event ASM region.";
        }
      });

      curEventListingOffset += 8;
    }
  }

  _writeEventsNew(board: IBoard, boardInfo: IBoardInfo, boardIndex: number, chains: number[][]) {
    if (!boardInfo.mainfsEventFile)
      throw `No MainFS file specified to place board ASM for board ${boardIndex}.`;

    // We will make the buffer maximum size, but will shrink it later to what it actually needs to be.
    let eventBuffer = new ArrayBuffer(this.EVENT_MEM_SIZE);
    let eventView = new DataView(eventBuffer);

    let currentOffset = this.EVENT_HEADER_SIZE;

    eventView.setUint32(0, toU32("PP64"));
    eventView.setUint32(4, this.EVENT_RAM_LOC);

    // Create hollow structures for the table and lists to figure out how big they will be.
    let eventTable = new SpaceEventTable();
    let eventLists = [];

    for (let i = 0; i < board.spaces.length; i++) {
      let space = board.spaces[i];
      if (!space.events || !space.events.length)
        continue;
      eventTable.add(i, 0); // Just to keep track of what the table size is, address will be added later.

      let eventList = new SpaceEventList();
      for (let e = 0; e < space.events.length; e++) {
        let event = space.events[e];
        eventList.add(event.activationType, event.executionType || event.mystery, 0); // Also to track size
      }
      eventLists.push(eventList);
    }

    // Figure out size of table and lists
    let tableSize = makeDivisibleBy(eventTable.byteLength(), 16);

    let listsSize = eventLists.reduce((sum, list) => {
      return sum + list.byteLength();
    }, 0);
    listsSize = makeDivisibleBy(listsSize, 16);

    currentOffset += tableSize + listsSize;

    // Now we know where to start writing the ASM event code.
    // As we go along, we can go back and fill in the space and event lists.
    let eventTemp: any = {};
    let eventListIndex = 0;
    let eventListCurrentOffset = this.EVENT_HEADER_SIZE + tableSize;
    for (let i = 0; i < board.spaces.length; i++) {
      let space = board.spaces[i];
      if (!space.events || !space.events.length)
        continue;

      let eventList = eventLists[eventListIndex];
      for (let e = 0; e < space.events.length; e++) {
        let event = space.events[e];
        let temp = eventTemp[event.id] || {};
        let info = {
          boardIndex,
          board,
          curSpaceIndex: i,
          curSpace: space,
          chains,
          offset: currentOffset,
          addr: this._offsetToAddrBase(currentOffset, this.EVENT_RAM_LOC),
          game: romhandler.getROMGame()!,
          gameVersion: this.gameVersion,
        };

        let [writtenOffset, len] = writeEvent(eventBuffer, event, info, temp) as number[];
        eventTemp[event.id] = temp;

        // Apply address to event list.
        // If the writtenOffset is way out of bounds (like > EVENT_MEM_SIZE)
        // it probably means it is directly referencing old code (some 2/3
        // events are like this for now) so we need to calc differently.
        let eventListAsmAddr;
        if (writtenOffset > this.EVENT_MEM_SIZE)
          eventListAsmAddr = this._offsetToAddr(writtenOffset, boardInfo) | 0x80000000;
        else
          eventListAsmAddr = this._offsetToAddrBase(writtenOffset, this.EVENT_RAM_LOC);
        eventList.setAddress(e, eventListAsmAddr);

        currentOffset += len;
      }

      // We can fill in the address of the event listing itself back into the
      // event table (not related to the e loop above, but saves having
      // to loop on spaces again.)
      let eventListAddr = this._offsetToAddrBase(eventListCurrentOffset, this.EVENT_RAM_LOC);
      eventTable.add(i, eventListAddr);

      eventListCurrentOffset += eventList.write(eventBuffer, eventListCurrentOffset);

      eventListIndex++;
    }

    // Now we can write the event table, because all the addresses are set.
    eventTable.write(eventBuffer, this.EVENT_HEADER_SIZE);

    // We can write the size of the event buffer to the header now, for the hook to use.
    eventView.setUint32(8, currentOffset);

    // Shrink the buffer to what was actually needed
    eventBuffer = eventBuffer.slice(0, currentOffset);

    // We write list blob of ASM/structures into the MainFS, in a location
    // that is not used by the game.
    let [mainFsDir, mainFsFile] = boardInfo.mainfsEventFile;
    mainfs.write(mainFsDir, mainFsFile, eventBuffer);

    //saveAs(new Blob([eventBuffer]), "eventBuffer");

    // Write the hook
    this._writeEventAsmHook(boardInfo, boardIndex);
  }

  _writeEventsNew2(board: IBoard, boardInfo: IBoardInfo, boardIndex: number, chains: number[][]) {
    if (!boardInfo.mainfsEventFile)
      throw `No MainFS file specified to place board ASM for board ${boardIndex}.`;

    const eventTable = new SpaceEventTable();
    const eventLists: SpaceEventList[] = [];
    const eventAsms: string[] = [];
    const eventTemp: any = {};
    for (let i = 0; i < board.spaces.length; i++) {
      let space = board.spaces[i];
      if (!space.events || !space.events.length)
        continue;
      eventTable.add(i, 0);

      let eventList = new SpaceEventList(i);
      for (let e = 0; e < space.events.length; e++) {
        let event = space.events[e];
        eventList.add(event.activationType, event.executionType || event.mystery, 0);

        let temp = eventTemp[event.id] || {};
        let info = {
          boardIndex,
          board,
          curSpaceIndex: i,
          curSpace: space,
          chains,
          game: romhandler.getROMGame()!,
          gameVersion: this.gameVersion,
        };

        let eventAsm = writeEvent(new ArrayBuffer(0), event, info, temp);
        eventTemp[event.id] = temp;

        eventAsms.push(prepSingleEventAsm(eventAsm as string, event, info, e));
      }
      eventLists.push(eventList);
    }

    const asm = `
      .org ${$$hex(this.EVENT_RAM_LOC)}
      .ascii "PP64"
      .word ${$$hex(this.EVENT_RAM_LOC)}
      .word 0 // Populated with buffer size later
      .align 16

      ${makeGameSymbolLabels(romhandler.getROMGame()!).join("\n")}

      // TODO: Remove these hacks?
      .definelabel __PP64_INTERNAL_GET_NEXT_TOAD_INDEX,0x800F6610
      .definelabel __PP64_STAR_SPACE_INTERNAL,0x800F6958 // TODO: Probably wrong now

      ${eventTable.getAssembly()}
      ${eventLists.map(eventList => eventList.getAssembly()).join("\n")}
      ${eventAsms.join("\n")}
    `;

    $$log(asm);

    const buffer = assemble(asm) as ArrayBuffer;
    const bufferView = new DataView(buffer);

    if (buffer.byteLength > this.EVENT_MEM_SIZE) {
      throw new Error(`Event code exceeded available memory space (${buffer.byteLength}/${this.EVENT_MEM_SIZE})`);
    }

    // We can write the size of the event buffer to the header now, for the hook to use.
    bufferView.setUint32(8, buffer.byteLength);

    // We write list blob of ASM/structures into the MainFS, in a location
    // that is not used by the game.
    let [mainFsDir, mainFsFile] = boardInfo.mainfsEventFile;
    mainfs.write(mainFsDir, mainFsFile, buffer);

    //saveAs(new Blob([buffer]), "eventBuffer");

    // Write the hook
    this._writeEventAsmHook(boardInfo, boardIndex);
  }

  _writeEventAsmHook(boardInfo: IBoardInfo, boardIndex: number) {
    // The hook logic will be placed at the top of eventASMStart, since
    // we don't put anything there much anymore.
    const hookAddr = this._offsetToAddr(boardInfo.eventASMStart, boardInfo);
    const hookJAL = parstInst(`JAL ${hookAddr}`);

    const romView = romhandler.getDataView();

    // Clear the space event table hydrations, because we want a NOP sled
    // through the old logic basically, and no hook interference.
    this._clearSpaceEventTableCalls(romView, boardInfo);

    // We will JAL to the eventASMStart location from the location where the
    // board data is hydrated.
    const hookOffset = boardInfo.spaceEventTables[0].upper;
    romView.setUint32(hookOffset, hookJAL);

    $$log(`Installed event hook at ROM ${$$hex(hookOffset)}, JAL ${hookAddr}`);

    //this.onWriteEventAsmHook(romView, boardInfo, boardIndex);
    // We essentially repeat the logic that all the boards use to hydrate the
    // MainFS code blob (and bring the blob into RAM of course.)
    let offset = boardInfo.eventASMStart;

    // Set up the stack (this is a legit function call)
    romView.setUint32(offset, parstInst("ADDIU SP SP 0xFFE8"));
    romView.setUint32(offset += 4, parstInst("SW RA, 0x0010(SP)"));

    // Call for the MainFS to read in the ASM blob.
    const [mainFsDir, mainFsFile] = boardInfo.mainfsEventFile;
    romView.setUint32(offset += 4, parstInst(`LUI A0 ${mainFsDir}`));
    romView.setUint32(offset += 4, parstInst(`JAL ${this.MAINFS_READ_ADDR}`));
    romView.setUint32(offset += 4, parstInst(`ADDIU A0 A0 ${mainFsFile}`));

    // Now, V0 has the location that the MainFSRead put the blob... it isn't
    // where we want it, it is in the heap somewhere, so we will move it.

    // This is a pretty simple copy loop
    // T4 = Copy of V0, Current source RAM location
    // T0 = Current dest RAM location
    // T1 = Size of buffer remaining to copy
    // T2 = Temp word register to do the copy
    romView.setUint32(offset += 4, parstInst("ADDU T4 V0 R0")); // Copy V0 -> T4
    romView.setUint32(offset += 4, parstInst("LW T0 0x4(T4)")); // LW T0, 0x4(T4) [RAM dest]
    romView.setUint32(offset += 4, parstInst("LW T1 0x8(T4)")); // LW T1, 0x8(T4) [Buffer size]
    // Loop start:
    romView.setUint32(offset += 4, parstInst("LW T2 0(T4)"));
    romView.setUint32(offset += 4, parstInst("SW T2 0(T0)"));
    romView.setUint32(offset += 4, parstInst("ADDIU T4 T4 4"));
    romView.setUint32(offset += 4, parstInst("ADDIU T0 T0 4"));
    romView.setUint32(offset += 4, parstInst("ADDIU T1 T1 -4"));
    romView.setUint32(offset += 4, parstInst("BGTZ T1 -6")); // BGTZ T1, -5 instructions 0xFFE8
    romView.setUint32(offset += 4, 0); // NOP

    // Now we can hydrate the table.
    // T9 = V0 copy (least likely to be overwritten by an uncontrolled JAL)
    // T4 = Dest buffer addr + 0x10, where the table really starts
    romView.setUint32(offset += 4, parstInst("ADDU T9 V0 R0")); // Copy V0 -> T9
    romView.setUint32(offset += 4, parstInst("LW T4 4(T9)")); // LW T4, 0x4(T9) [RAM dest]
    romView.setUint32(offset += 4, parstInst(`JAL ${this.TABLE_HYDRATE_ADDR}`));
    romView.setUint32(offset += 4, parstInst("ADDIU A0 T4 16")); // ADDIU A0, T4, 16

    // Well, we copied the buffer... now we should "free" it with this magic JAL...
    // Free our T9 reference, which theoretically could be corrupted, but in practice not.
    romView.setUint32(offset += 4, parstInst(`JAL ${this.HEAP_FREE_ADDR}`));
    romView.setUint32(offset += 4, parstInst("ADDU A0 T9 R0"));

    // End the call stack
    romView.setUint32(offset += 4, parstInst("LW RA 0x10(SP)"));
    romView.setUint32(offset += 4, parstInst("JR RA"));
    romView.setUint32(offset += 4, parstInst("ADDIU SP SP 0x18"));
  }

  _clearSpaceEventTableCalls(romView: DataView, boardInfo: IBoardInfo) {
    // The BoardInfo might have special logic.
    if (boardInfo.clearSpaceEventTableCalls) {
      boardInfo.clearSpaceEventTableCalls(romView);
      return;
    }

    // Otherwise, we can probably just clear all memory between the upper and
    // lower for each table.
    let tables = boardInfo.spaceEventTables;
    tables.forEach((tableInfo: any) => {
      for (let offset = tableInfo.upper; offset <= tableInfo.lower; offset += 4)
        romView.setUint32(offset, 0);
    });
  }

  onWriteEventAsmHook(romView: DataView, boardInfo: IBoardInfo, boardIndex: number) {
    throw "Adapter does not implement onWriteEventAsmHook";
  }

  _extractStarGuardians(board: IBoard, boardInfo: IBoardInfo) { // AKA Toads or Baby Bowsers lol
    let boardView = new DataView(romhandler.getROMBuffer()!);

    // Training writes the toad directly.
    if (boardInfo.toadSpaceInst) {
      let toadSpace = boardView.getUint16(boardInfo.toadSpaceInst + 2);
      if (board.spaces[toadSpace])
        board.spaces[toadSpace].subtype = SpaceSubtype.TOAD;
    }

    if (boardInfo.starSpaceCount) {
      // Parse the spaces that can be considered for star placement.
      let starSpacesOffset = boardInfo.starSpaceArrOffset;
      if (Array.isArray(starSpacesOffset))
        starSpacesOffset = starSpacesOffset[0];
      for (let i = 0; i < boardInfo.starSpaceCount; i++) {
        let starSpace = boardView.getUint16(starSpacesOffset + (i * 2));
        if (board.spaces[starSpace]) {
          board.spaces[starSpace].star = true;
        }
      }

      // Parse the associated toads
      for (let i = 0; i < boardInfo.starSpaceCount; i++) {
        let toadSpacesOffset = boardInfo.toadSpaceArrOffset;
        if (Array.isArray(toadSpacesOffset))
          toadSpacesOffset = toadSpacesOffset[0];
        let toadSpace = boardView.getUint16(toadSpacesOffset + (i * 2));
        if (board.spaces[toadSpace])
          board.spaces[toadSpace].subtype = SpaceSubtype.TOAD;
      }
    }
  }

  _writeStarInfo(board: IBoard, boardInfo: IBoardInfo) {
    let starCount = boardInfo.starSpaceCount;
    if (starCount) {
      let romView = romhandler.getDataView();

      let starIndices = [];
      for (let i = 0; i < board.spaces.length; i++) {
        if (board.spaces[i].star)
          starIndices.push(i);
      }

      let starSpacesOffsets = boardInfo.starSpaceArrOffset;
      if (!Array.isArray(starSpacesOffsets))
        starSpacesOffsets = [starSpacesOffsets];
      for (let i = 0; i < starSpacesOffsets.length; i++) {
        let offset = starSpacesOffsets[i];
        for (let j = 0; j < starCount; j++) {
          let starIdx = (j < starIndices.length ? j : starIndices.length - 1); // Keep writing last space to fill
          romView.setUint16(offset + (j * 2), starIndices[starIdx]);
        }
      }

      let toadSpaces = getSpacesOfSubType(SpaceSubtype.TOAD, board);

      // Write the toad spaces, using distance formula for now.
      let toadSpacesOffsets = boardInfo.toadSpaceArrOffset;
      if (!Array.isArray(toadSpacesOffsets))
        toadSpacesOffsets = [toadSpacesOffsets];
      for (let i = 0; i < toadSpacesOffsets.length; i++) {
        let offset = toadSpacesOffsets[i];
        for (let j = 0; j < starCount; j++) {
          let starIdx = (j < starIndices.length ? j : starIndices.length - 1);
          let starSpace = board.spaces[starIndices[starIdx]];
          let bestDistance = Number.MAX_VALUE;
          let bestToadIdx = starIndices[starIdx]; // By default, no toad spaces = put toad on star space for now.
          for (let t = 0; t < toadSpaces.length; t++) {
            let toadIdx = toadSpaces[t];
            let toadSpace = board.spaces[toadIdx];
            let dist = distance(starSpace.x, starSpace.y, toadSpace.x, toadSpace.y);
            if (dist < bestDistance) {
              bestDistance = dist;
              bestToadIdx = toadIdx;
            }
          }

          romView.setUint16(offset + (j * 2), bestToadIdx);
        }
      }
    }
  }

  _extractBoos(board: IBoard, boardInfo: IBoardInfo) {
    let boardView = romhandler.getDataView();
    let booSpace;
    if (boardInfo.boosLoopFnOffset) {
      let booFnOffset = boardInfo.boosLoopFnOffset;

      // Read the Boo count.
      let booCount = boardView.getUint16(booFnOffset + 0x2A);
      if (boardView.getUint32(booFnOffset + 0x28) === 0x1A00FFFC) // BNEZ when a single boo is made (Wario)
        booCount = 1;
      if (booCount === 0)
        return;

      booFnOffset = boardInfo.boosReadbackFnOffset;
      let booRelativeAddr = boardView.getInt16(booFnOffset + 0xD2);
      booRelativeAddr = 0x00100000 + booRelativeAddr; // Going to be a subtraction.

      // Assuming this is less than the space events.
      let booSpacesOffset = boardInfo.spaceEventsStartOffset
        - (boardInfo.spaceEventsStartAddr - booRelativeAddr);

      for (let i = 0; i < booCount; i++) {
        booSpace = boardView.getUint16(booSpacesOffset + (2 * i));
        if (board.spaces[booSpace])
          board.spaces[booSpace].subtype = SpaceSubtype.BOO;
      }
    }
    else if (boardInfo.booSpaceInst) { // Just one Boo
      booSpace = boardView.getUint16(boardInfo.booSpaceInst + 2);
      if (board.spaces[booSpace])
        board.spaces[booSpace].subtype = SpaceSubtype.BOO;
    }
    else if (boardInfo.booCount) {
      for (let b = 0; b < boardInfo.booArrOffset.length; b++) {
        let curBooSpaceIndexOffset = boardInfo.booArrOffset[b];
        for (let i = 0; i < boardInfo.booCount; i++) {
          let booSpace = boardView.getUint16(curBooSpaceIndexOffset);
          if (board.spaces[booSpace])
            board.spaces[booSpace].subtype = SpaceSubtype.BOO;
          curBooSpaceIndexOffset += 2;
        }
      }
    }
  }

  _writeBoos(board: IBoard, boardInfo: IBoardInfo) {
    // Find the boo spaces
    let booSpaces = getSpacesOfSubType(SpaceSubtype.BOO, board);

    let boardView = romhandler.getDataView();
    if (boardInfo.boosLoopFnOffset) {
      let booFnOffset = boardInfo.boosLoopFnOffset;

      // Read the Boo count.
      let booCount = boardView.getUint16(booFnOffset + 0x2A);
      if (boardView.getUint32(booFnOffset + 0x28) === 0x1A00FFFC) // BNEZ when a single boo is made (Wario)
        booCount = 1;
      else if (booSpaces.length && booCount > booSpaces.length) {
        // Basically lower the boo count if we only have 1 boo instead of 2.
        boardView.setUint16(booFnOffset + 0x2A, booSpaces.length);
      }
      if (booCount === 0)
        return;

      booFnOffset = boardInfo.boosReadbackFnOffset;
      let booRelativeAddr = boardView.getInt16(booFnOffset + 0xD2);
      booRelativeAddr = 0x00100000 + booRelativeAddr; // Going to be a subtraction.

      let booSpacesOffset = boardInfo.spaceEventsStartOffset
        - (boardInfo.spaceEventsStartAddr - booRelativeAddr);

      for (let i = 0; i < booCount; i++) {
        let booSpace = (booSpaces[i] === undefined ? board._deadSpace : booSpaces[i]);
        boardView.setUint16(booSpacesOffset + (2 * i), booSpace!);
      }
    }
    else if (boardInfo.booSpaceInst) { // Just one Boo
      let booSpace = (booSpaces[0] === undefined ? board._deadSpace : booSpaces[0]);
      boardView.setUint16(boardInfo.booSpaceInst + 2, booSpace!);
    }
    else if (boardInfo.booCount) {
      for (let b = 0; b < boardInfo.booArrOffset.length; b++) {
        let curBooSpaceIndexOffset = boardInfo.booArrOffset[b];
        for (let i = 0; i < boardInfo.booCount; i++) {
          let booSpace = booSpaces[i] === undefined ? board._deadSpace : booSpaces[i];
          boardView.setUint16(curBooSpaceIndexOffset, booSpace!);
          curBooSpaceIndexOffset += 2;
        }
      }
    }
  }

  _extractBanks(board: IBoard, boardInfo: IBoardInfo) {
    if (!boardInfo.bankCount)
      return;

    let boardView = romhandler.getDataView();
    for (let b = 0; b < boardInfo.bankArrOffset.length; b++) {
      let curBankSpaceIndexOffset = boardInfo.bankArrOffset[b];
      for (let i = 0; i < boardInfo.bankCount; i++) {
        let bankSpace = boardView.getUint16(curBankSpaceIndexOffset);
        if (board.spaces[bankSpace])
          board.spaces[bankSpace].subtype = SpaceSubtype.BANK;
        curBankSpaceIndexOffset += 2;
      }
    }
    for (let b = 0; b < boardInfo.bankCoinArrOffset.length; b++) {
      let curBankCoinSpaceIndexOffset = boardInfo.bankCoinArrOffset[b];
      for (let i = 0; i < boardInfo.bankCount; i++) {
        let bankCoinSpace = boardView.getUint16(curBankCoinSpaceIndexOffset);
        if (board.spaces[bankCoinSpace])
          board.spaces[bankCoinSpace].subtype = SpaceSubtype.BANKCOIN;
        curBankCoinSpaceIndexOffset += 2;
      }
    }
  }

  _writeBanks(board: IBoard, boardInfo: IBoardInfo) {
    let boardView = romhandler.getDataView();
    if (!boardInfo.bankCount)
      return;

    let bankSpaces = getSpacesOfSubType(SpaceSubtype.BANK, board);
    for (let b = 0; b < boardInfo.bankArrOffset.length; b++) {
      let curBankSpaceIndexOffset = boardInfo.bankArrOffset[b];
      for (let i = 0; i < boardInfo.bankCount; i++) {
        let bankSpace = bankSpaces[i] === undefined ? board._deadSpace : bankSpaces[i];
        boardView.setUint16(curBankSpaceIndexOffset, bankSpace!);
        curBankSpaceIndexOffset += 2;
      }
    }

    let bankCoinSpaces = getSpacesOfSubType(SpaceSubtype.BANKCOIN, board);
    for (let b = 0; b < boardInfo.bankCoinArrOffset.length; b++) {
      let curBankCoinSpaceIndexOffset = boardInfo.bankCoinArrOffset[b];
      for (let i = 0; i < boardInfo.bankCount; i++) {
        let bankCoinSpace = bankCoinSpaces[i] === undefined ? board._deadSpace : bankCoinSpaces[i];
        boardView.setUint16(curBankCoinSpaceIndexOffset, bankCoinSpace!);
        curBankCoinSpaceIndexOffset += 2;
      }
    }
  }

  _extractItemShops(board: IBoard, boardInfo: IBoardInfo) {
    if (!boardInfo.itemShopCount)
      return;

    let boardView = romhandler.getDataView();
    for (let b = 0; b < boardInfo.itemShopArrOffset.length; b++) {
      let curItemShopSpaceIndexOffset = boardInfo.itemShopArrOffset[b];
      for (let i = 0; i < boardInfo.itemShopCount; i++) {
        let itemShopSpace = boardView.getUint16(curItemShopSpaceIndexOffset);
        if (board.spaces[itemShopSpace])
          board.spaces[itemShopSpace].subtype = SpaceSubtype.ITEMSHOP;
        curItemShopSpaceIndexOffset += 2;
      }
    }
  }

  _writeItemShops(board: IBoard, boardInfo: IBoardInfo) {
    let boardView = romhandler.getDataView();
    if (!boardInfo.itemShopCount)
      return;

    let itemShopSpaces = getSpacesOfSubType(SpaceSubtype.ITEMSHOP, board);
    for (let b = 0; b < boardInfo.itemShopArrOffset.length; b++) {
      let curItemShopSpaceIndexOffset = boardInfo.itemShopArrOffset[b];
      for (let i = 0; i < boardInfo.itemShopCount; i++) {
        let ItemShopSpace = itemShopSpaces[i] === undefined ? board._deadSpace : itemShopSpaces[i];
        boardView.setUint16(curItemShopSpaceIndexOffset, ItemShopSpace!);
        curItemShopSpaceIndexOffset += 2;
      }
    }
  }

  _writeGates(board: IBoard, boardInfo: IBoardInfo) {
    let boardView = romhandler.getDataView();
    if (!boardInfo.gateCount)
      return;

    let gateSpaces = [];
    for (let i = 0; i < board.spaces.length; i++) {
      if (board.spaces[i].subtype === SpaceSubtype.GATE)
        gateSpaces.push(i);
    }

    for (let b = 0; b < boardInfo.gateArrOffset.length; b++) {
      let curGateSpaceIndexOffset = boardInfo.gateArrOffset[b];
      for (let i = 0; i < boardInfo.gateCount; i++) {
        let gateSpace = gateSpaces[i] === undefined ? board._deadSpace : gateSpaces[i];
        boardView.setUint16(curGateSpaceIndexOffset, gateSpace!);
        curGateSpaceIndexOffset += 2;
      }
    }
  }

  _writeArrowRotations(board: IBoard, boardInfo: IBoardInfo) {
    const romView = romhandler.getDataView();
    const { arrowRotStartOffset, arrowRotEndOffset } = boardInfo;
    if (!arrowRotStartOffset)
      return;

    // Clear the original board's instructions.
    for (let offset = arrowRotStartOffset; offset < arrowRotEndOffset; offset += 4) {
      romView.setUint32(offset, 0);
    }

    const rotations = [];
    for (let i = 0; i < board.spaces.length; i++) {
      if (board.spaces[i].type === Space.ARROW) {
        rotations.push(board.spaces[i].rotation || 0);
      }
    }

    const game = romhandler.getROMGame()!;
    const addArrowAngleAddr = getSymbol(game, "AddArrowAngle");

    const totalArrowsToWrite = getArrowRotationLimit(boardInfo);

    let insts = [`.orga ${arrowRotStartOffset}`];
    const loopLimit = Math.min(totalArrowsToWrite, rotations.length);
    for (let i = 0; i < loopLimit; i++) {
      insts.push(`LUI A0 hi(${$$hex(getRawFloat32Format(rotations[i]))})`);
      insts.push(`JAL ${addArrowAngleAddr}`);
      insts.push("MTC1 A0 F12");
    }

    assemble(insts, { buffer: romView.buffer });
  }

  _writeBackground(bgIndex: number, src: string, width: number, height: number) {
    return new Promise((resolve, reject) => {
      // We need to write the image onto a canvas to get the RGBA32 values.
      let canvasCtx = createContext(width, height);
      let srcImage = new Image();
      let failTimer = setTimeout(() => reject(`Failed to write bg ${bgIndex}`), 45000);
      srcImage.onload = () => {
        canvasCtx.drawImage(srcImage, 0, 0, width, height);

        let imgData = canvasCtx.getImageData(0, 0, width, height);
        hvqfs.writeBackground(bgIndex, imgData, width, height);
        clearTimeout(failTimer);
        resolve();
      };
      srcImage.src = src;
    });
  }

  onParseBoardSelectImg(board: IBoard, boardInfo: IBoardInfo) {
    $$log("Adapter does not implement onParseBoardSelectImg");
  }

  onWriteBoardSelectImg(board: IBoard, boardInfo: IBoardInfo) {
    $$log("Adapter does not implement onWriteBoardSelectImg");
    return new Promise((resolve, reject) => {
      resolve();
    });
  }

  onParseBoardLogoImg(board: IBoard, boardInfo: IBoardInfo) {
    $$log("Adapter does not implement onParseBoardLogoImg");
  }

  onWriteBoardLogoImg(board: IBoard, boardInfo: IBoardInfo) {
    $$log("Adapter does not implement onWriteBoardLogoImgs");
    return new Promise((resolve, reject) => {
      resolve();
    });
  }

  _brandBootSplashscreen() {
    return new Promise((resolve, reject) => {
      if (!get($setting.writeBranding)) {
        resolve();
        return;
      }

      if (!this.nintendoLogoFSEntry || !this.hudsonLogoFSEntry) {
        $$log("Adapter cannot write branding");
        resolve();
        return;
      }

      let srcImage = new Image();
      let failTimer = setTimeout(() => reject(`Failed to overwrite boot logo`), 45000);
      srcImage.onload = () => {
        this._combineSplashcreenLogos();

        let pp64Splash32Buffer = toArrayBuffer(srcImage, 320, 240);
        let pp64Splash16Buffer = RGBA5551fromRGBA32(pp64Splash32Buffer, 320, 240);

        // Then, pack the image and write it.
        let imgInfoArr = [
          {
            src: pp64Splash16Buffer,
            width: 320,
            height: 240,
            bpp: 16,
          }
        ];
        let newPack = toPack(imgInfoArr, 16, 8);
        //saveAs(new Blob([newPack]));
        mainfs.write(this.hudsonLogoFSEntry![0], this.hudsonLogoFSEntry![1], newPack);

        clearTimeout(failTimer);
        resolve();
      };
      srcImage.src = "img/bootsplash.png";
    });
  }

  _combineSplashcreenLogos() {
    let nintendoPack = mainfs.get(this.nintendoLogoFSEntry![0], this.nintendoLogoFSEntry![1]); // (NINTENDO) logo
    if ((new Uint8Array(nintendoPack))[0x1A] !== 0x20)
      return; // We already replaced the splashscreen.

    let hudsonPack = mainfs.get(this.hudsonLogoFSEntry![0], this.hudsonLogoFSEntry![1]); // Hudson logo

    let nintendoImgInfo = fromPack(nintendoPack)[0];
    let hudsonImgInfo = fromPack(hudsonPack)[0];

    let nintendoArr = new Uint8Array(nintendoImgInfo.src!);
    let hudsonArr = new Uint8Array(hudsonImgInfo.src!);

    let comboCanvasCtx = createContext(320, 240);
    comboCanvasCtx.fillStyle = "black";
    comboCanvasCtx.fillRect(0, 0, 320, 240);
    let comboImageData = comboCanvasCtx.getImageData(0, 0, 320, 240);

    for (let i = (320 * 88 * 4); i < (320 * 154 * 4); i++) {
      comboImageData.data[i - (320 * 40 * 4)] = nintendoArr[i];
    }
    for (let i = (320 * 88 * 4); i < (320 * 154 * 4); i++) {
      comboImageData.data[i + (320 * 50 * 4)] = hudsonArr[i];
    }

    //comboCanvasCtx.putImageData(comboImageData, 0, 0);
    //$$log(comboCanvasCtx.canvas.toDataURL());

    let combo16Buffer = RGBA5551fromRGBA32(comboImageData.data.buffer, 320, 240);
    let imgInfoArr = [
      {
        src: combo16Buffer,
        width: 320,
        height: 240,
        bpp: 16,
      }
    ];
    let newPack = toPack(imgInfoArr, 16, 8);
    //saveAs(new Blob([newPack]));
    mainfs.write(this.nintendoLogoFSEntry![0], this.nintendoLogoFSEntry![1], newPack);
  }

  _clearOtherBoardNames(boardIndex: number) {
    $$log("Adapter does not implement _clearOtherBoardNames");
  }

  _readPackedFromMainFS(dir: number, file: number) {
    let imgPackBuffer = mainfs.get(dir, file);
    let imgArr = fromPack(imgPackBuffer);
    if (!imgArr || !imgArr.length)
      return;

    let dataViews = imgArr.map(imgInfo => {
      return new DataView(imgInfo.src!);
    });

    return dataViews;
  }

  _readImgsFromMainFS(dir: number, file: number) {
    let imgPackBuffer = mainfs.get(dir, file);
    let imgArr = fromPack(imgPackBuffer);
    if (!imgArr || !imgArr.length)
      return;

    return imgArr;
  }

  _readImgInfoFromMainFS(dir: number, file: number, imgArrIndex: number) {
    let imgArr = this._readImgsFromMainFS(dir, file)!;
    return imgArr[imgArrIndex || 0];
  }

  _readImgFromMainFS(dir: number, file: number, imgArrIndex: number) {
    let imgInfo = this._readImgInfoFromMainFS(dir, file, imgArrIndex);
    return arrayBufferToDataURL(imgInfo.src!, imgInfo.width, imgInfo.height);
  }

  _parseAudio(board: IBoard, boardInfo: IBoardInfo) {
    if (!boardInfo.audioIndexOffset)
      return;

    let boardView = romhandler.getDataView();
    board.audioIndex = boardView.getUint16(boardInfo.audioIndexOffset);
  }

  onWriteAudio(board: IBoard, boardInfo: IBoardInfo, boardIndex: number) {
    if (!boardInfo.audioIndexOffset)
      return;

    let boardView = romhandler.getDataView();
    let index = board.audioIndex;
    boardView.setUint16(boardInfo.audioIndexOffset, index);
  }

  getAudioMap(): string[] {
    $$log("Adapter does not implement getAudioMap");
    return [];
  }

  getCharacterMap(): { [num: number]: string } {
    $$log("Adapter does not implement getCharacterMap");
    return {};
  }
};
