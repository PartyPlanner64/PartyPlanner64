import { IBoard } from "../boards";
import { BoardType, CostumeType } from "../types";

// BoardInfos are a PP64-specific object that represents known info about each game board.
const _boardInfos = Object.create(null);

export interface IBoardInfo {
  /** Called when the board is being parsed. */
  onLoad?: (board: IBoard) => void;
  /** Called after the board has been written to ROM. */
  onAfterOverwrite?: (board: IBoard) => void;
  /** Called prior to writing events. */
  onWriteEvents?: (board: IBoard) => void;

  name: string;
  type?: BoardType;
  canOverwrite?: boolean;
  boardDefFile: number;
  bgDir: number;
  pauseBgDir?: number;
  animBgSet?: number;
  costumeType?: CostumeType;
  str: {
    boardSelect?: number | number[] | number[][];
    boardNames?: number[] | number[][];
    boardGreeting?: number[];
    boardGreetingDuel?: number[];
    boardWinner?: number;
    boardPlayCount?: number;
    koopaIntro?: number;
    starComments?: number[];
  };
  img: {
    boardSelectImg?: number;
    boardSelectIconCoords?: number[];
    boardSelectIconMask?: number;
    pauseLogoImg?: number;
    statsLogoImg?: [dir: number, file: number];
    introLogoImg?: number | number[];
    introLogoImgDimens?: number[];
    titleScreenImg?: number;
    splashLogoImg?: number;
    splashLogoTextImg?: number;
    gateImg?: number;
    miniMapWithBg?: number;
    miniMapDots?: number;
  };
  sceneIndex?: number;
  mainfsEventFile?: number[];
  mainfsBoardFile?: number[];
  eventASMStart?: number;
  eventASMEnd?: number;
  spaceEventTables?: any[];
  koopaSpaceInst?: number;
  bowserSpaceInst?: number;
  goombaSpaceInst?: number;
  booSpaceInst?: number;
  boosLoopFnOffset?: number;
  boosReadbackFnOffset?: number;
  booCount?: number;
  booArrOffset?: number[];
  starSpaceArrOffset?: number | number[];
  starSpaceCount?: number;
  toadSpaceInst?: number;
  toadSpaceArrOffset?: number | number[];
  audioIndexOffset?: number;
  bankArrOffset?: number[];
  bankCoinArrOffset?: number[];
  bankCount?: number;
  itemShopArrOffset?: number[];
  itemShopCount?: number;
  arrowRotStartOffset?: number;
  arrowRotEndOffset?: number;
  gateNeighborsOffset?: number[];
  gateArrOffset?: number[];
  gateCount?: number;
}

const BoardInfoBase = {};

export function createBoardInfo(
  id: string,
  props?: Partial<IBoardInfo>,
): IBoardInfo {
  if (_boardInfos[id])
    throw new Error(`Cannot create an already existing BoardInfo ${id}.`);
  const boardInfo = Object.create(BoardInfoBase);
  if (props) {
    Object.assign(boardInfo, props);
  }
  _boardInfos[id] = boardInfo;
  return boardInfo;
}

export const dummyBoardInfo: IBoardInfo = {
  name: "Test Info",
  boardDefFile: 1,
  bgDir: 1,
  str: {},
  img: {},
};
