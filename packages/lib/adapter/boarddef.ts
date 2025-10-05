import { Space } from "../types";
import { midpoint, distance } from "../utils/number";
import { $$log, $$hex } from "../utils/debug";
import { copyObject } from "../utils/obj";
import { romhandler } from "../romhandler";
import {
  IBoard,
  ISpace,
  hasConnection,
  getStartSpaceIndex,
  getConnections,
  addSpaceInternal,
} from "../boards";
import { getEventsInLibrary } from "../events/EventLibrary";

export function parse(buffer: ArrayBufferLike, board: Partial<IBoard>): IBoard {
  const header = _parseHeader(buffer);
  board.spaces = _parseSpaces(buffer, header);
  const linkResult = _parseLinks(buffer, header);
  board.links = linkResult.links;
  (board as any)._chains = linkResult.chains; // We need this for event parsing.
  $$log(
    `Parsing board def, ${$$hex(header.spaceCount)} (${
      header.spaceCount
    }) spaces`,
  );
  return board as IBoard;
}

interface IHeader {
  spaceCount: number;
  chainCount: number;
  spaceStartOffset: number;
  linkStartOffset: number;
}

function _parseHeader(buffer: ArrayBufferLike): IHeader {
  const board16View = new DataView(buffer);
  const game = romhandler.getGameVersion();
  switch (game) {
    case 1:
      return {
        spaceCount: board16View.getUint16(0),
        chainCount: board16View.getUint16(4),
        spaceStartOffset: board16View.getUint16(6),
        linkStartOffset: board16View.getUint16(10),
      };
    case 2:
    case 3:
      return {
        spaceCount: board16View.getUint16(0),
        chainCount: board16View.getUint16(2),
        spaceStartOffset: board16View.getUint16(4),
        linkStartOffset: board16View.getUint16(6),
      };
  }

  throw new Error("Unrecongized game " + game);
}

function _parseSpaces(buffer: ArrayBufferLike, header: IHeader) {
  const spaceView = new DataView(buffer, header.spaceStartOffset);
  const spaces = [];
  let bufferIdx = 0;
  for (let i = 0; i < header.spaceCount; i++) {
    spaces.push({
      type: spaceView.getUint8(bufferIdx + 3),
      x: spaceView.getFloat32(bufferIdx + 4),
      y: spaceView.getFloat32(bufferIdx + 12),
      z: spaceView.getFloat32(bufferIdx + 8),
    });
    bufferIdx += 16;
  }

  return spaces;
}

function _parseLinks(buffer: ArrayBufferLike, header: IHeader) {
  const chains = new Array(header.chainCount);
  const links: any = {};
  const linksView = new DataView(buffer, header.linkStartOffset);
  for (let i = 0; i < header.chainCount; i++) {
    const chainOffset = linksView.getUint16(i * 2);
    const chainView = new DataView(
      buffer,
      header.linkStartOffset + chainOffset,
    );
    const chainLen = chainView.getUint16(0);
    chains[i] = [];
    if (chainLen === 1) {
      // The loop won't work.
      chains[i].push(chainView.getUint16(2));
    } else {
      for (let j = 1; j < chainLen; j++) {
        const start = chainView.getUint16(j * 2);
        const end = chainView.getUint16((j + 1) * 2);
        if (links.hasOwnProperty(start)) {
          if (!Array.isArray(links[start])) links[start] = [links[start]];
          if (links[start].indexOf(end) === -1) links[start].push(end);
        } else links[start] = end;
        chains[i].push(start);
        if (j + 1 === chainLen) chains[i].push(end);
      }
    }
  }

  return {
    links: links,
    chains: chains,
  };
}

export function create(board: IBoard, chains = determineChains(board)) {
  const boardDefBuffer = new ArrayBuffer(_boardDefSize(board, chains));
  _writeHeader(boardDefBuffer, board, chains);
  _writeSpaces(boardDefBuffer, board.spaces);
  _writeChains(boardDefBuffer, chains);
  return boardDefBuffer;
}

// Calculates the byte length needed to create a board def.
function _boardDefSize(board: IBoard, chains: number[][]) {
  const headerSize = _boardDefHeaderSize();
  const spacesSize = board.spaces.length * 16;

  let chainsSize = chains.length * 2; // The 16-bit offsets for each chain.
  chains.forEach((chain) => {
    chainsSize += (chain.length + 1) * 2; // +1 for chain length short
  });

  return headerSize + spacesSize + chainsSize;
}

function _boardDefHeaderSize() {
  let headerSize;
  const game = romhandler.getGameVersion();
  switch (game) {
    case 1:
      headerSize = 12;
      break;
    case 2:
    case 3:
      headerSize = 8;
      break;
    default:
      throw new Error(`_boardDefHeaderSize: unknown game version ${game}`);
  }

  return headerSize;
}

function _writeHeader(
  boardDefBuffer: ArrayBuffer,
  board: IBoard,
  chains: number[][],
) {
  const boardDefView = new DataView(boardDefBuffer);
  const game = romhandler.getGameVersion();
  const chainOffset = _boardDefHeaderSize() + board.spaces.length * 16;
  switch (game) {
    case 1:
      boardDefView.setUint16(0, board.spaces.length);
      boardDefView.setUint16(4, chains.length);
      boardDefView.setUint16(6, 0xc);
      boardDefView.setUint16(8, chainOffset);
      boardDefView.setUint16(10, chainOffset);
      break;
    case 2:
    case 3:
      boardDefView.setUint16(0, board.spaces.length);
      boardDefView.setUint16(2, chains.length);
      boardDefView.setUint16(4, 0x8);
      boardDefView.setUint16(6, chainOffset);
      break;
  }
}

function _writeSpaces(boardDefBuffer: ArrayBuffer, spaces: ISpace[]) {
  const boardDefView = new DataView(boardDefBuffer);
  let curOffset = _boardDefHeaderSize();
  spaces.forEach((space) => {
    boardDefView.setUint32(curOffset, space.type);
    boardDefView.setFloat32(curOffset + 4, space.x);
    boardDefView.setFloat32(curOffset + 8, space.z || 0);
    boardDefView.setFloat32(curOffset + 12, space.y);
    curOffset += 16;
  });
}

function _writeChains(boardDefBuffer: ArrayBuffer, chains: number[][]) {
  const boardDefView = new DataView(boardDefBuffer);

  let offsetsOffset = _parseHeader(boardDefBuffer).linkStartOffset; // Yuck!
  const chainRegionOffset = offsetsOffset;

  let chainOffset = chains.length * 2;
  for (let i = 0; i < chains.length; i++) {
    // Write the entry into the chain offsets.
    boardDefView.setUint16(offsetsOffset, chainOffset);

    // Write the chain size.
    boardDefView.setUint16(chainRegionOffset + chainOffset, chains[i].length);
    chainOffset += 2;

    // Write the chain indices.
    for (let j = 0; j < chains[i].length; j++) {
      boardDefView.setUint16(chainRegionOffset + chainOffset, chains[i][j]);
      chainOffset += 2;
    }

    offsetsOffset += 2;
  }
}

type ISpaceInternal = ISpace & { _seen?: boolean };

// Builds an array of arrays of space indices representing the board chains.
export function determineChains(board: IBoard) {
  board = copyObject(board);
  const spaces = board.spaces as ISpaceInternal[];
  const links = board.links;
  const chains: number[][] = [];

  // Recursive chain parsing function.
  function parseChain(startingSpaceIdx: number) {
    const chain: number[] = []; // Given first space always goes in.
    let curSpaceIdx = startingSpaceIdx;
    let nextSpaceIdx;
    while (!spaces[curSpaceIdx]._seen) {
      spaces[curSpaceIdx]._seen = true;
      chain.push(curSpaceIdx);
      nextSpaceIdx = links[curSpaceIdx];

      // Must break the chain if path divides.
      if (Array.isArray(nextSpaceIdx)) {
        chains.push(chain);
        nextSpaceIdx.forEach((idx) => {
          parseChain(idx);
        });
        return;
      }

      // Hit a dead end. Just warn but keep going.
      if (typeof nextSpaceIdx !== "number") {
        console.warn(
          `determineChains.parseChain hit a dead end at ${$$hex(
            curSpaceIdx,
          )} (${curSpaceIdx})`,
        );
        chains.push(chain);
        return;
      }

      // Must break the chain if a chain intersects the next space.
      if (spaceIsLinkedFromByAnother(nextSpaceIdx, curSpaceIdx)) {
        chains.push(chain);
        parseChain(nextSpaceIdx);
        return;
      }

      curSpaceIdx = nextSpaceIdx;
    }

    // There will be no chain len if this parseChain call was previously made.
    if (chain.length) chains.push(chain);
  }

  // Build a reverse lookup of space to _pointing_ spaces.
  const pointingMap: { [end: number]: number[] } = {};
  for (let s = 0; s < spaces.length; s++) {
    if (spaces[s]) pointingMap[s] = [];
  }
  for (const startIdx in links) {
    const ends = getConnections(parseInt(startIdx, 10), board)!;
    ends.forEach((end) => {
      pointingMap[end].push(Number(startIdx));
    });
  }

  // Returns true if the given space is linked to from another space besides
  // the previous space.
  function spaceIsLinkedFromByAnother(spaceIdx: number, prevIdx?: number) {
    // If no previous index passed, just see if anything points.
    if (prevIdx === undefined) return !!pointingMap[spaceIdx].length;

    if (!pointingMap[spaceIdx].length) return false;
    if (pointingMap[spaceIdx].indexOf(Number(prevIdx)) === -1) return true;
    if (pointingMap[spaceIdx].length > 1) return true; // Assumes prevIdx is not duplicated
    return false; // length === 1 && only entry is prevIdx
  }

  // We want to generate chains starting at the start space, and starting
  // from any space that doesn't have anything pointing at it.
  // The latter is for dead ends that you can only reach via going in reverse
  // in MP3, or perhaps in the future if we have warps or something.
  // Doing start space first is important because MP2/3 assume start space
  // is first space of first chain.

  // 1. Parse from start space.
  parseChain(getStartSpaceIndex(board));

  // 2. Parse from other "starting spaces" of paths.
  for (let s = 0; s < spaces.length; s++) {
    if (!spaces[s]) continue;
    if (spaces[s]._seen) continue; // Don't even need to check, we already visited it.

    // The latter condition is not totally necessary, but I don't know that
    // we want to or can handle single-space chains.
    if (!spaceIsLinkedFromByAnother(s) && hasConnection(s, "*", board))
      parseChain(s);
  }

  // 3. Catch any "cycles" that might be left, if they reached this point.
  for (let s = 0; s < spaces.length; s++) {
    if (!spaces[s] || spaces[s]._seen) continue;

    // Handle all others, even single decorative spaces.
    parseChain(s);
  }

  $$log("chains: ", chains);
  return chains;
}

// WTF is this?
// There are bytes that can live right where DK's chains get written.
// If we don't overwrite these and have a 1-length chain, it becomes part of the chain and CRASH.
// If we pad to at least 2-length chains, we guarantee to overwrite it, and
// who knows if 1-length chains actually work anyways.
export function padChains(board: IBoard, chains: number[][]) {
  const spaces = board.spaces;
  const links = board.links;
  for (let i = 0; i < chains.length; i++) {
    const chain = chains[i];
    if (chain.length === 1) {
      // Padding is done by adding an extra transparent space in such a way that the player won't notice.
      const lastSpaceIdx = chain[0];
      const lastSpace = spaces[lastSpaceIdx];
      const oldLinks = links[lastSpaceIdx];
      let padX, padY;
      if (Array.isArray(oldLinks)) {
        if (oldLinks.length === 1) {
          // Shouldn't happen, but there was a bug where some boards might have these 1 length arrays.
          // CHAINMERGE
          // Just put it half way in between, who cares.
          const nextSpace = spaces[oldLinks[0]];
          const mid = midpoint(
            lastSpace.x,
            lastSpace.y,
            nextSpace.x,
            nextSpace.y,
          );
          padX = mid.x;
          padY = mid.y;
        } else if (oldLinks.length === 2) {
          // CHAINSPLIT
          // TODO: Very precisely push it towards the split spaces, otherwise the player faces down always.
          const nextLeft = spaces[oldLinks[0]];
          const nextRight = spaces[oldLinks[1]];
          const destMidpoint = midpoint(
            nextLeft.x,
            nextLeft.y,
            nextRight.x,
            nextRight.y,
          );
          // padX = lastSpace.x + 0.01;
          // padY = ((destMidpoint.y - lastSpace.y) / (destMidpoint.x - lastSpace.x)) * (padX - lastSpace.x) + lastSpace.y;
          const dist = distance(
            lastSpace.x,
            lastSpace.y,
            destMidpoint.x,
            destMidpoint.y,
          );
          const ratio = 0.01 / dist;
          padX = (1 - ratio) * lastSpace.x + ratio * destMidpoint.x;
          padY = (1 - ratio) * lastSpace.y + ratio * destMidpoint.y;
          $$log(
            `Padding branch x: ${lastSpace.x}, y: ${lastSpace.y}, padX: ${padX}, padY: ${padY}`,
          );
        } else {
          // FIXME when multi-split works.
          padX = lastSpace.x;
          padY = lastSpace.y;
        }
      } else if (typeof oldLinks === "number") {
        // CHAINMERGE
        // Just put it half way in between, who cares.
        const nextSpace = spaces[oldLinks];
        const mid = midpoint(
          lastSpace.x,
          lastSpace.y,
          nextSpace.x,
          nextSpace.y,
        );
        padX = mid.x;
        padY = mid.y;
      }

      if (typeof padX === "number" && typeof padY === "number") {
        const newLink = addSpaceInternal(
          padX,
          padY,
          Space.OTHER,
          undefined,
          board,
          getEventsInLibrary(),
        );
        chain.push(newLink);

        // CS classic, insert into linkedish list.
        links[lastSpaceIdx] = newLink;
        links[newLink] = oldLinks;
      }
    }
  }
}

export function trimChains(board: IBoard, chains: number[][]) {
  // TODO: This would make board parsing not have weird extra spaces.
}

/**
 * Gets the "chain index" and "chain space index" for an absolute
 * space index found somewhere within the chains.
 */
export function getChainIndexValuesFromAbsoluteIndex(
  chains: number[][],
  absSpaceIndex: number,
) {
  for (let c = 0; c < chains.length; c++) {
    const chain = chains[c];
    const chainSpaceIndex = chain.indexOf(absSpaceIndex);
    if (chainSpaceIndex >= 0) {
      return [c, chainSpaceIndex];
    }
  }
  return [-1, -1];
}
