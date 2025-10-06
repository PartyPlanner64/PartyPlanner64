import * as React from "react";
import {
  useRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  forwardRef,
  useState,
  useMemo,
  useContext,
  useLayoutEffect,
} from "react";
import { getCurrentBoard } from "./boards";
import {
  BoardType,
  Space,
  SpaceSubtype,
  GameVersion,
  EventParameterType,
  isArrayEventParameterType,
  Action,
} from "../../packages/lib/types";
import { degreesToRadians } from "../../packages/lib/utils/number";
import { spaces } from "./spaces";
import { getImage } from "./images";
import { $$hex, $$log, assert } from "../../packages/lib/utils/debug";
import { RightClickMenu } from "./rightclick";
import { attachToCanvas, detachFromCanvas } from "./interaction";
import { getEvent } from "../../packages/lib/events/events";
import { getDistinctColor } from "../../packages/lib/utils/colors";
import { isDebug } from "../../packages/lib/debug";
import { takeScreeny } from "./screenshot";
import { setOverrideBg } from "./appControl";
import { useAppSelector, useCurrentBoard } from "./hooks";
import {
  selectCurrentBoard,
  selectHighlightedSpaceIndices,
  selectHoveredBoardEventIndex,
  selectSelectedSpaceIndices,
  selectSelectionBoxCoords,
  selectTemporaryConnections,
  SpaceIndexMap,
} from "./boardState";
import { isEmpty } from "../../packages/lib/utils/obj";
import { getEventsInLibrary } from "../../packages/lib/events/EventLibrary";
import {
  forEachEventParameter,
  getConnections,
  IBoard,
  IEventInstance,
  ISpace,
} from "../../packages/lib/boards";
import { getMouseCoordsOnCanvas } from "./utils/canvas";

type Canvas = HTMLCanvasElement;
type CanvasContext = CanvasRenderingContext2D;

function _renderConnections(
  lineCanvas: Canvas,
  lineCtx: CanvasContext,
  board: IBoard,
  clear = true,
) {
  if (clear) lineCtx.clearRect(0, 0, lineCanvas.width, lineCanvas.height);

  // Draw connecting lines.
  const links = board.links;
  if (links) {
    for (const startSpace in links) {
      const x1 = board.spaces[startSpace].x;
      const y1 = board.spaces[startSpace].y;

      const endLinks = getConnections(parseInt(startSpace), board)!;
      let x2, y2;
      let bidirectional = false;
      for (let i = 0; i < endLinks.length; i++) {
        x2 = board.spaces[endLinks[i]].x;
        y2 = board.spaces[endLinks[i]].y;
        bidirectional = _isConnectedTo(links, endLinks[i], startSpace);
        if (bidirectional && parseInt(startSpace) > endLinks[i]) continue;
        _drawConnection(lineCtx, x1, y1, x2, y2, bidirectional);
      }
    }
  }
}

function _renderAssociations(
  canvas: Canvas,
  context: CanvasContext,
  board: IBoard,
  selectedSpacesIndices?: SpaceIndexMap,
) {
  context.clearRect(0, 0, canvas.width, canvas.height);

  if (!selectedSpacesIndices) return;

  const selectedIndices = Object.keys(selectedSpacesIndices).map((s) =>
    parseInt(s, 10),
  );
  if (selectedIndices.length !== 1) {
    return;
  }

  const selectedSpaceIndex = selectedIndices[0];
  const eventLibrary = getEventsInLibrary();

  // Draw associated spaces in event params.
  let lastEvent: IEventInstance;
  let associationNum = 0;
  forEachEventParameter(
    board,
    eventLibrary,
    (parameter, event, eventIndex, space, spaceIndex) => {
      if (selectedSpaceIndex !== spaceIndex) return; // Only draw associations for the selected space.

      // Reset coloring for each event.
      if (lastEvent !== event) {
        associationNum = 0;
      }
      lastEvent = event;

      let spaceIndicesToAssociate: number[] | undefined;
      switch (parameter.type) {
        case EventParameterType.Space:
          {
            const associatedSpaceIndex =
              event.parameterValues && event.parameterValues[parameter.name];
            if (typeof associatedSpaceIndex === "number") {
              spaceIndicesToAssociate = [associatedSpaceIndex];
            }
          }
          break;

        case EventParameterType.SpaceArray:
          spaceIndicesToAssociate =
            event.parameterValues &&
            (event.parameterValues[parameter.name] as number[]);
          break;
      }

      if (spaceIndicesToAssociate) {
        spaceIndicesToAssociate.forEach((spaceIndex) => {
          const associatedSpace = board.spaces[spaceIndex];
          if (!associatedSpace) return; // Probably shouldn't happen.

          const dotsColor = `rgba(${getDistinctColor(associationNum).join(
            ", ",
          )}, 0.9)`;
          drawAssociation(
            context,
            space!.x,
            space!.y,
            associatedSpace.x,
            associatedSpace.y,
            dotsColor,
          );
          associationNum++;
        });
      }
    },
  );
}

function _isConnectedTo(links: any, start: number, end: any) {
  const startLinks = links[start];
  if (Array.isArray(startLinks)) return startLinks.indexOf(parseInt(end)) >= 0;
  else return startLinks == end; /* eslint-disable-line */ // Can be string vs int?
}

export interface ISpaceRenderOpts {
  skipHiddenSpaces?: boolean;
  skipBadges?: boolean;
  skipCharacters?: boolean;
}

// opts:
//   skipHiddenSpaces: true to not render start, invisible spaces
//   skipBadges: false to skip event and star badges
function _renderSpaces(
  spaceCanvas: Canvas,
  spaceCtx: CanvasContext,
  board: IBoard,
  clear = true,
  opts: ISpaceRenderOpts = {},
) {
  if (clear) spaceCtx.clearRect(0, 0, spaceCanvas.width, spaceCanvas.height);

  // Draw spaces
  for (let index = 0; index < board.spaces.length; index++) {
    const space = board.spaces[index];
    if (space === null) continue;

    drawSpace(spaceCtx, board, space, index, opts);
  }
}

function drawSpace(
  spaceCtx: CanvasContext,
  board: IBoard,
  space: ISpace,
  spaceIndex: number,
  opts: ISpaceRenderOpts = {},
) {
  const game = board.game || 1;
  const boardType = board.type || BoardType.NORMAL;
  const x = space.x;
  const y = space.y;
  const rotation = space.rotation;
  const type = space.type;
  const subtype = space.subtype;

  if (typeof rotation === "number") {
    spaceCtx.save();
    spaceCtx.translate(x, y);
    const adjustedAngleRad = -rotation;
    spaceCtx.rotate(degreesToRadians(adjustedAngleRad));
    spaceCtx.translate(-x, -y);
  }

  switch (type) {
    case Space.OTHER:
      if (opts.skipHiddenSpaces) break;
      if (game === 3) spaces.drawOther3(spaceCtx, x, y);
      else spaces.drawOther(spaceCtx, x, y);
      break;
    case Space.BLUE:
      if (game === 3) spaces.drawBlue3(spaceCtx, x, y);
      else spaces.drawBlue(spaceCtx, x, y);
      break;
    case Space.RED:
      if (game === 3) spaces.drawRed3(spaceCtx, x, y);
      else spaces.drawRed(spaceCtx, x, y);
      break;
    case Space.MINIGAME:
      if (boardType === BoardType.DUEL)
        spaces.drawMiniGameDuel3(spaceCtx, x, y);
      else spaces.drawMiniGame(spaceCtx, x, y);
      break;
    case Space.HAPPENING:
      if (game === 3) {
        if (boardType === BoardType.DUEL)
          spaces.drawHappeningDuel3(spaceCtx, x, y);
        else spaces.drawHappening3(spaceCtx, x, y);
      } else spaces.drawHappening(spaceCtx, x, y);
      break;
    case Space.STAR:
      if (game === 3) spaces.drawStar3(spaceCtx, x, y);
      else spaces.drawStar(spaceCtx, x, y);
      break;
    case Space.CHANCE:
      if (game === 3) spaces.drawChance3(spaceCtx, x, y);
      else if (game === 2) spaces.drawChance2(spaceCtx, x, y);
      else spaces.drawChance(spaceCtx, x, y);
      break;
    case Space.START:
      if (opts.skipHiddenSpaces) break;
      if (game === 3) spaces.drawStart3(spaceCtx, x, y);
      else spaces.drawStart(spaceCtx, x, y);
      break;
    case Space.SHROOM:
      spaces.drawShroom(spaceCtx, x, y);
      break;
    case Space.BOWSER:
      if (game === 3) spaces.drawBowser3(spaceCtx, x, y);
      else spaces.drawBowser(spaceCtx, x, y);
      break;
    case Space.ITEM:
      if (game === 3) spaces.drawItem3(spaceCtx, x, y);
      else spaces.drawItem2(spaceCtx, x, y);
      break;
    case Space.BATTLE:
      if (game === 3) spaces.drawBattle3(spaceCtx, x, y);
      else spaces.drawBattle2(spaceCtx, x, y);
      break;
    case Space.BANK:
      if (game === 3) spaces.drawBank3(spaceCtx, x, y);
      else spaces.drawBank2(spaceCtx, x, y);
      break;
    case Space.ARROW:
      spaces.drawArrow(spaceCtx, x, y, game);
      break;
    case Space.BLACKSTAR:
      spaces.drawBlackStar2(spaceCtx, x, y);
      break;
    case Space.GAMEGUY:
      if (boardType === BoardType.DUEL) spaces.drawGameGuyDuel3(spaceCtx, x, y);
      else spaces.drawGameGuy3(spaceCtx, x, y);
      break;
    case Space.DUEL_BASIC:
      spaces.drawDuelBasic(spaceCtx, x, y);
      break;
    case Space.DUEL_START_BLUE:
      if (opts.skipHiddenSpaces) break;
      spaces.drawStartDuelBlue(spaceCtx, x, y);
      break;
    case Space.DUEL_START_RED:
      if (opts.skipHiddenSpaces) break;
      spaces.drawStartDuelRed(spaceCtx, x, y);
      break;
    case Space.DUEL_POWERUP:
      spaces.drawDuelPowerup(spaceCtx, x, y);
      break;
    case Space.DUEL_REVERSE:
      spaces.drawDuelReverse(spaceCtx, x, y);
      break;
    default:
      spaces.drawUnknown(spaceCtx, x, y);
      break;
  }

  if (typeof rotation === "number") {
    spaceCtx.restore();
  }

  if (!opts.skipCharacters) {
    drawCharacters(spaceCtx, x, y, subtype, game);
  }

  if (!opts.skipBadges) {
    const offset = game === 3 ? 5 : 2;
    const startOffset = game === 3 ? 16 : 12;
    if (space.events && space.events.length) {
      let iconY = y + offset;
      if (type === Space.START) iconY -= startOffset;
      spaceCtx.drawImage(
        __determineSpaceEventImg(space, board),
        x + offset,
        iconY,
      );
    }

    if (space.star) {
      let iconY = y + offset;
      if (type === Space.START) iconY -= startOffset;
      spaceCtx.drawImage(getImage("starImg"), x - offset - 9, iconY);
    }

    if (space.subtype === SpaceSubtype.GATE) {
      const iconX = x - offset - 9;
      const iconY = y + offset - 5;
      spaceCtx.drawImage(getImage("gateImg"), iconX, iconY);
    }
  }

  if (isDebug()) {
    // Draw the space's index.
    spaceCtx.save();
    spaceCtx.fillStyle = "white";
    spaceCtx.strokeStyle = "black";
    spaceCtx.lineWidth = 2;
    spaceCtx.font = "bold 6pt Courier New";
    spaceCtx.textAlign = "center";
    let text = spaceIndex.toString();
    spaceCtx.strokeText(text, x, y - 2);
    spaceCtx.fillText(text, x, y - 2);
    text = $$hex(spaceIndex);
    spaceCtx.strokeText(text, x, y + 8);
    spaceCtx.fillText(text, x, y + 8);
    spaceCtx.restore();
  }
}

function drawCharacters(
  spaceCtx: CanvasContext,
  x: number,
  y: number,
  subtype: SpaceSubtype | undefined,
  game: number,
) {
  // Draw the standing Toad.
  if (subtype === SpaceSubtype.TOAD) {
    if (game === 3) spaceCtx.drawImage(getImage("mstarImg"), x - 15, y - 22);
    else spaceCtx.drawImage(getImage("toadImg"), x - 9, y - 22);
  }

  // Draw the standing Bowser.
  if (subtype === SpaceSubtype.BOWSER) {
    spaceCtx.drawImage(getImage("bowserImg"), x - 27, y - 45);
  }

  // Draw the standing Koopa Troopa.
  if (subtype === SpaceSubtype.KOOPA) {
    spaceCtx.drawImage(getImage("koopaImg"), x - 12, y - 22);
  }

  // Draw the standing Boo.
  if (subtype === SpaceSubtype.BOO) {
    spaceCtx.drawImage(getImage("booImg"), x - 13, y - 17);
  }

  // Draw the standing Goomba.
  if (subtype === SpaceSubtype.GOOMBA) {
    spaceCtx.drawImage(getImage("goombaImg"), x - 8, y - 12);
  }

  // Draw the bank.
  if (subtype === SpaceSubtype.BANK) {
    if (game === 2) spaceCtx.drawImage(getImage("bank2Img"), x - 9, y - 10);
    else spaceCtx.drawImage(getImage("bank3Img"), x - 17, y - 20);
  }

  // Draw the bank coin.
  if (subtype === SpaceSubtype.BANKCOIN) {
    spaceCtx.drawImage(getImage("bankcoinImg"), x - 10, y - 9);
  }

  // Draw the item shop.
  if (subtype === SpaceSubtype.ITEMSHOP) {
    if (game === 2) spaceCtx.drawImage(getImage("itemShop2Img"), x - 9, y - 10);
    else spaceCtx.drawImage(getImage("itemShop3Img"), x - 16, y - 20);
  }
}

const _PIOver1 = Math.PI / 1;
function _drawConnection(
  lineCtx: CanvasContext,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  bidirectional?: boolean,
) {
  lineCtx.save();
  lineCtx.beginPath();
  lineCtx.strokeStyle = "rgba(255, 185, 105, 0.75)";
  lineCtx.lineCap = "round";
  lineCtx.lineWidth = 8;
  lineCtx.moveTo(x1, y1);
  lineCtx.lineTo(x2, y2);
  lineCtx.stroke();

  // Draw the little triangle arrow on top at halfway.
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  lineCtx.translate(midX, midY);
  lineCtx.rotate(-Math.atan2(x1 - midX, y1 - midY) + _PIOver1);
  lineCtx.fillStyle = "#A15000";
  const adjust = bidirectional ? 3 : 0;
  lineCtx.moveTo(-4, -2 + adjust);
  lineCtx.lineTo(0, 2 + adjust);
  lineCtx.lineTo(4, -2 + adjust);
  lineCtx.fill();

  if (bidirectional) {
    lineCtx.moveTo(-4, 2 - adjust);
    lineCtx.lineTo(0, -2 - adjust);
    lineCtx.lineTo(4, 2 - adjust);
    lineCtx.fill();
  }

  lineCtx.restore();
}

function drawAssociation(
  lineCtx: CanvasContext,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  dotsColor: string,
) {
  lineCtx.save();
  lineCtx.beginPath();
  lineCtx.strokeStyle = "rgba(0, 0, 0, 0.5)";
  lineCtx.setLineDash([1, 8]);
  lineCtx.lineCap = "round";
  lineCtx.lineWidth = 6;
  lineCtx.moveTo(x1, y1);
  lineCtx.lineTo(x2, y2);
  lineCtx.stroke();
  lineCtx.restore();

  lineCtx.save();
  lineCtx.beginPath();
  lineCtx.strokeStyle = dotsColor;
  lineCtx.setLineDash([1, 8]);
  lineCtx.lineCap = "round";
  lineCtx.lineWidth = 4;
  lineCtx.moveTo(x1, y1);
  lineCtx.lineTo(x2, y2);
  lineCtx.stroke();
  lineCtx.restore();
}

/** Adds a glow around the selected spaces in the editor. */
function _renderSelectedSpaces(
  canvas: Canvas,
  context: CanvasContext,
  board: IBoard,
  spaceIndices: SpaceIndexMap | null,
) {
  context.clearRect(0, 0, canvas.width, canvas.height);

  if (!spaceIndices || isEmpty(spaceIndices)) return;

  for (const spaceIndex in spaceIndices) {
    const space = board.spaces[parseInt(spaceIndex, 10)];
    if (space) {
      context.save();
      context.beginPath();
      const radius = getCurrentBoard().game === 3 ? 18 : 12;
      context.arc(space.x, space.y, radius, 0, 2 * Math.PI);
      context.setLineDash([2, 2]);
      context.lineWidth = 2;
      context.fillStyle = "rgba(47, 70, 95, 0.35)";
      context.strokeStyle = "rgba(47, 70, 95, 1)";
      // context.shadowColor = "rgba(225, 225, 225, 1)";
      // context.shadowBlur = 2;
      // context.fillStyle = "rgba(225, 225, 225, 0.5)";
      context.fill();
      context.stroke();
      context.restore();
    }
  }
}

/** Does a strong red highlight around some spaces. */
function _highlightSpaces(
  canvas: Canvas,
  context: CanvasContext,
  spaces: number[],
) {
  const currentBoard = getCurrentBoard();
  const radius = currentBoard.game === 3 ? 18 : 12;

  for (let i = 0; i < spaces.length; i++) {
    const space = currentBoard.spaces[spaces[i]];
    if (space) {
      context.save();
      context.beginPath();
      context.arc(space.x, space.y, radius, 0, 2 * Math.PI);
      context.shadowColor = "rgba(225, 225, 225, 1)";
      context.shadowBlur = 2;
      context.fillStyle = "rgba(255, 0, 0, 0.85)";
      context.fill();
      context.restore();
    }
  }
}

function _highlightBoardEventSpaces(
  canvas: Canvas,
  context: CanvasContext,
  eventInstance: IEventInstance,
) {
  const currentBoard = getCurrentBoard();
  const eventLibrary = getEventsInLibrary();
  const radius = currentBoard.game === 3 ? 18 : 12;

  const event = getEvent(eventInstance.id, currentBoard, eventLibrary);
  assert(!!event);
  if (event.parameters) {
    let associationNum = 0;
    for (const parameter of event.parameters) {
      let spacesIndicesToHighlight: number[] | undefined;
      switch (parameter.type) {
        case EventParameterType.Space:
          {
            const spaceIndex = eventInstance.parameterValues?.[parameter.name];
            if (typeof spaceIndex === "number") {
              spacesIndicesToHighlight = [spaceIndex];
            }
          }
          break;

        case EventParameterType.SpaceArray:
          {
            const spaceIndices =
              eventInstance.parameterValues?.[parameter.name];
            if (Array.isArray(spaceIndices)) {
              spacesIndicesToHighlight = spaceIndices;
            }
          }
          break;
      }

      if (spacesIndicesToHighlight) {
        for (const spaceIndex of spacesIndicesToHighlight) {
          const space = currentBoard.spaces[spaceIndex];
          if (space) {
            context.save();
            context.beginPath();
            context.arc(space.x, space.y, radius, 0, 2 * Math.PI);
            context.shadowColor = "rgba(225, 225, 225, 1)";
            context.shadowBlur = 2;
            context.fillStyle = `rgba(${getDistinctColor(associationNum).join(
              ", ",
            )}, 0.9)`;
            context.fill();
            context.restore();

            associationNum++;
          }
        }
      }
    }
  }
}

function __determineSpaceEventImg(space: ISpace, board: IBoard) {
  if (space.events && space.events.length) {
    for (let i = 0; i < space.events.length; i++) {
      const spaceEvent = space.events[i];
      const event = getEvent(spaceEvent.id, board, getEventsInLibrary());
      if (!event) return getImage("eventErrorImg");
      if (event.parameters) {
        for (let p = 0; p < event.parameters.length; p++) {
          const parameter = event.parameters[p];
          if (isArrayEventParameterType(parameter.type)) {
            continue;
          }
          if (
            !spaceEvent.parameterValues ||
            !spaceEvent.parameterValues.hasOwnProperty(parameter.name)
          ) {
            return getImage("eventErrorImg");
          }
        }
      }
    }
  }
  return getImage("eventImg");
}

const BoardBG: React.FC = () => {
  const [boardWidth, boardHeight] = useBoardDimensions();
  const [editorWidth, editorHeight] = useContext(EditorSizeContext);
  const boardBgSrc = useAppSelector(
    (state) => selectCurrentBoard(state).bg.src,
  );
  const overrideBg = useAppSelector((state) => state.app.overrideBg);

  const imgEl = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const bgImgEl = imgEl.current!;
    const transformStyle = getEditorContentTransform(
      boardWidth,
      boardHeight,
      editorWidth,
      editorHeight,
    );
    bgImgEl.style.transform = transformStyle;
    bgImgEl.width = boardWidth;
    bgImgEl.height = boardHeight;
  }, [boardWidth, boardHeight, editorWidth, editorHeight]);

  const imgSrcToUse = overrideBg || boardBgSrc;

  return (
    <img
      ref={imgEl}
      className="editor_bg"
      alt="Board Background"
      src={imgSrcToUse}
    />
  );
};

let _animInterval: any;
let _currentFrame = -1;

export function playAnimation() {
  if (!_animInterval) {
    _animInterval = setInterval(_animationStep, 800);
    setOverrideBg(null);
  }
}

export function stopAnimation() {
  if (_animInterval) {
    clearInterval(_animInterval);
  }

  _animInterval = null;
  _currentFrame = -1;

  setOverrideBg(null);
}

function _animationStep() {
  const board = getCurrentBoard();
  const animbgs = board.animbg;
  if (!animbgs || !animbgs.length) {
    stopAnimation();
    return;
  } else if (_currentFrame >= 0 && _currentFrame < animbgs.length) {
    setOverrideBg(animbgs[_currentFrame]);
    _currentFrame++;
  } else {
    _currentFrame = -1;
  }

  if (_currentFrame === -1) {
    setOverrideBg(board.bg.src);
    _currentFrame++;
  }
}

const BoardLines = () => {
  const canvasRef = useRef<Canvas>(null);

  const board = useCurrentBoard();
  const [boardWidth, boardHeight] = useBoardDimensions();
  const tempConnections = useAppSelector(selectTemporaryConnections);

  useDimensionsOnCanvas(canvasRef, boardWidth, boardHeight);

  useEffect(() => {
    // Update lines connecting spaces
    const lineCanvas = canvasRef.current!;
    const context = lineCanvas.getContext("2d")!;
    _renderConnections(lineCanvas, context, board, true);

    if (tempConnections) {
      for (const tempConnection of tempConnections) {
        const [x1, y1, x2, y2] = tempConnection;
        _drawConnection(context, x1, y1, x2, y2, false);
      }
    }
  }, [board, tempConnections]);

  return <canvas ref={canvasRef} className="editor_line_canvas"></canvas>;
};

const BoardAssociations = () => {
  const canvasRef = useRef<Canvas>(null);

  const currentBoard = useCurrentBoard();
  const [boardWidth, boardHeight] = useBoardDimensions();
  const selectedSpaceIndices = useAppSelector(selectSelectedSpaceIndices);

  useDimensionsOnCanvas(canvasRef, boardWidth, boardHeight);

  useEffect(() => {
    // Update space parameter association lines
    const assocCanvas = canvasRef.current!;
    _renderAssociations(
      assocCanvas,
      assocCanvas.getContext("2d")!,
      currentBoard,
      selectedSpaceIndices,
    );
  }, [currentBoard, selectedSpaceIndices]);

  return (
    <canvas ref={canvasRef} className="editor_association_canvas"></canvas>
  );
};

const BoardSelectedSpaces = () => {
  const canvasRef = useRef<Canvas>(null);

  const currentBoard = useCurrentBoard();
  const [boardWidth, boardHeight] = useBoardDimensions();
  const selectedSpaceIndices = useAppSelector(selectSelectedSpaceIndices);

  const highlightedSpaceIndices = useAppSelector(selectHighlightedSpaceIndices);

  const hoveredBoardEventIndex = useAppSelector(selectHoveredBoardEventIndex);

  useDimensionsOnCanvas(canvasRef, boardWidth, boardHeight);

  useEffect(() => {
    // Update the current space indication
    const selectedSpacesCanvas = canvasRef.current!;
    const context = selectedSpacesCanvas.getContext("2d")!;
    _renderSelectedSpaces(
      selectedSpacesCanvas,
      context,
      currentBoard,
      selectedSpaceIndices,
    );

    if (highlightedSpaceIndices) {
      _highlightSpaces(selectedSpacesCanvas, context, highlightedSpaceIndices);
    }

    if (hoveredBoardEventIndex >= 0) {
      const hoveredBoardEvent =
        currentBoard.boardevents?.[hoveredBoardEventIndex];
      if (hoveredBoardEvent) {
        _highlightBoardEventSpaces(
          selectedSpacesCanvas,
          context,
          hoveredBoardEvent,
        );
      }
    }
  }, [
    currentBoard,
    selectedSpaceIndices,
    highlightedSpaceIndices,
    hoveredBoardEventIndex,
  ]);

  return (
    <canvas ref={canvasRef} className="editor_current_space_canvas"></canvas>
  );
};

const BoardSpaces = () => {
  const canvasRef = useRef<Canvas>(null);

  const board = useCurrentBoard();
  const [boardWidth, boardHeight] = useBoardDimensions();
  const imagesLoaded = useAppSelector((state) => state.app.imagesLoaded);

  useDimensionsOnCanvas(canvasRef, boardWidth, boardHeight);

  useEffect(() => {
    // Update spaces
    const spaceCanvas = canvasRef.current!;
    if (imagesLoaded) {
      _renderSpaces(spaceCanvas, spaceCanvas.getContext("2d")!, board);
    }
  }, [board, imagesLoaded]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      attachToCanvas(canvas);
      return () => detachFromCanvas(canvas);
    }
  }, []);

  return (
    <canvas
      className="editor_space_canvas"
      tabIndex={-1}
      ref={canvasRef}
      onDragOver={undefined}
    ></canvas>
  );
};

const BoardSelectionBox = () => {
  const canvasRef = useRef<Canvas>(null);

  const hasBoxDrawn = useRef<boolean>(false);
  const selectionBoxCoords = useAppSelector(selectSelectionBoxCoords);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    if (selectionBoxCoords || (!selectionBoxCoords && hasBoxDrawn.current)) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      hasBoxDrawn.current = false;
    }

    if (selectionBoxCoords) {
      const [xs, ys, xf, yf] = selectionBoxCoords;
      ctx.save();
      ctx.beginPath();
      ctx.fillStyle = "rgba(47, 70, 95, 0.5)";
      ctx.strokeStyle = "rgba(47, 70, 95, 1)";
      ctx.fillRect(
        Math.min(xs, xf),
        Math.min(ys, yf),
        Math.abs(xs - xf),
        Math.abs(ys - yf),
      );
      ctx.strokeRect(
        Math.min(xs, xf),
        Math.min(ys, yf),
        Math.abs(xs - xf),
        Math.abs(ys - yf),
      );
      ctx.restore();
      hasBoxDrawn.current = true;
    }
  }, [selectionBoxCoords]);

  const [boardWidth, boardHeight] = useBoardDimensions();
  useDimensionsOnCanvas(canvasRef, boardWidth, boardHeight);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      attachToCanvas(canvas);
      return () => detachFromCanvas(canvas);
    }
  }, []);

  return (
    <canvas
      className="editor_space_canvas"
      tabIndex={-1}
      ref={canvasRef}
      onDragOver={undefined}
    ></canvas>
  );
};

const BoardOverlay = forwardRef<BoardOverlayRef>((props, ref) => {
  const [rightClickSpace, setRightClickSpace] = useState(-1);

  const overlayDiv = useRef<HTMLDivElement>(null);
  const [boardWidth, boardHeight] = useBoardDimensions();
  const [editorWidth, editorHeight] = useContext(EditorSizeContext);

  const renderContent = useCallback(() => {
    const overlay = overlayDiv.current!;
    const transformStyle = getEditorContentTransform(
      boardWidth,
      boardHeight,
      editorWidth,
      editorHeight,
    );
    overlay.style.transform = transformStyle;
  }, [boardWidth, boardHeight, editorWidth, editorHeight]);

  const setRightClickMenu = useCallback((spaceIndex: number) => {
    setRightClickSpace(spaceIndex);
  }, []);

  const rightClickOpen = useCallback(() => {
    return rightClickSpace >= 0;
  }, [rightClickSpace]);

  useImperativeHandle(
    ref,
    () => ({
      renderContent,
      setRightClickMenu,
      rightClickOpen,
    }),
    [renderContent, setRightClickMenu, rightClickOpen],
  );

  useEffect(() => {
    renderContent();
  });

  const currentBoard = useCurrentBoard();
  const space = currentBoard.spaces[rightClickSpace] || null;
  return (
    <div ref={overlayDiv} className="editor_menu_overlay">
      {rightClickOpen() && (
        <RightClickMenu space={space} spaceIndex={rightClickSpace} />
      )}
    </div>
  );
});
BoardOverlay.displayName = "BoardOverlay";

const N64_SCREEN_WIDTH = 320;
const N64_SCREEN_HEIGHT = 240;

function getZoomedN64SizeForTelescope(gameVersion: GameVersion) {
  let WIDTH_ZOOM_FACTOR = 1;
  let HEIGHT_ZOOM_FACTOR = 1;
  switch (gameVersion) {
    case 1:
    case 2:
      break;

    case 3:
      WIDTH_ZOOM_FACTOR = 0.785;
      HEIGHT_ZOOM_FACTOR = 0.805;
      break;
  }

  const N64_WIDTH_ZOOMED = N64_SCREEN_WIDTH * WIDTH_ZOOM_FACTOR;
  const N64_HEIGHT_ZOOMED = N64_SCREEN_HEIGHT * HEIGHT_ZOOM_FACTOR;
  return {
    N64_WIDTH_ZOOMED,
    N64_HEIGHT_ZOOMED,
  };
}

function addRecommendedBoundaryLine(board: IBoard, canvas: Canvas): void {
  const context = canvas.getContext("2d")!;
  context.lineWidth = 1;
  context.strokeStyle = "rgba(0, 0, 0, 0.5)";
  const { width, height } = board.bg;
  const { N64_WIDTH_ZOOMED, N64_HEIGHT_ZOOMED } = getZoomedN64SizeForTelescope(
    board.game,
  );
  context.strokeRect(
    N64_WIDTH_ZOOMED / 2,
    N64_HEIGHT_ZOOMED / 2,
    width - N64_WIDTH_ZOOMED,
    height - N64_HEIGHT_ZOOMED,
  );
}

const TelescopeViewer: React.FC = () => {
  const canvasRef = useRef<Canvas | null>(null);
  const screenshotCanvasRef = useRef<Canvas | null>(null);

  const board = useCurrentBoard();
  const [boardWidth, boardHeight] = useBoardDimensions();

  useDimensionsOnCanvas(canvasRef, boardWidth, boardHeight);

  useEffect(() => {
    const canvas = canvasRef.current!;
    addRecommendedBoundaryLine(board, canvas);
  }, [board]);

  useEffect(() => {
    (async () => {
      const screenshotResult = await takeScreeny({ renderCharacters: true });
      screenshotCanvasRef.current = screenshotResult.canvas;
      addRecommendedBoundaryLine(board, screenshotCanvasRef.current!);
    })();
  }, [board]);

  const onMouseMove = useCallback(
    (ev: React.MouseEvent<Canvas>) => {
      const canvas = canvasRef.current!;
      const context = canvas.getContext("2d")!;

      const screenshotCanvas = screenshotCanvasRef.current;
      if (!screenshotCanvas) {
        return;
      }

      const [clickX, clickY] = getMouseCoordsOnCanvas(
        canvas,
        ev.clientX,
        ev.clientY,
      );
      const { width, height } = board.bg;
      const { N64_WIDTH_ZOOMED, N64_HEIGHT_ZOOMED } =
        getZoomedN64SizeForTelescope(board.game);

      // The cutout from the board image, bounded like the game camera is.
      let sx = Math.max(0, clickX - N64_WIDTH_ZOOMED / 2);
      let sy = Math.max(0, clickY - N64_HEIGHT_ZOOMED / 2);
      const sWidth = N64_WIDTH_ZOOMED;
      const sHeight = N64_HEIGHT_ZOOMED;

      if (width - sx < N64_WIDTH_ZOOMED) {
        sx = width - N64_WIDTH_ZOOMED;
      }
      if (height - sy < N64_HEIGHT_ZOOMED) {
        sy = height - N64_HEIGHT_ZOOMED;
      }

      $$log(
        `Viewing (${sx}, ${sy}) - (${sx + sWidth}, ${
          sy + sHeight
        })\nMouse: (${clickX}, ${clickY}`,
      );

      context.drawImage(
        screenshotCanvas,
        sx,
        sy,
        sWidth,
        sHeight,
        0,
        0,
        width,
        height,
      );

      // Simulate the black bars the game has, which restrict the viewing area further.
      const n64WidthRatio = width / N64_SCREEN_WIDTH;
      const n64HeightRatio = height / N64_SCREEN_HEIGHT;
      const horzBarHeight = 12 * n64HeightRatio;
      const vertBarWidth = 16 * n64WidthRatio;
      context.fillStyle = "black";
      context.fillRect(0, 0, width, horzBarHeight); // top
      context.fillRect(width - vertBarWidth, 0, vertBarWidth, height); // right
      context.fillRect(0, height - horzBarHeight, width, horzBarHeight); // bottom
      context.fillRect(0, 0, vertBarWidth, height); // left
    },
    [board],
  );

  const onMouseLeave = useCallback(() => {
    const canvas = canvasRef.current!;
    const context = canvas.getContext("2d")!;
    context.clearRect(0, 0, canvas.width, canvas.height);

    addRecommendedBoundaryLine(board, canvas);
  }, [board]);

  return (
    <canvas
      ref={canvasRef}
      className="editor_telescope_viewer"
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    />
  );
};

interface BoardOverlayRef {
  setRightClickMenu(spaceIndex: number): void;
  rightClickOpen(): boolean;
}

let _boardOverlay: BoardOverlayRef | null;

const EditorSizeContext = React.createContext([0, 0]);

export const Editor: React.FC = () => {
  const editorRef = useRef<HTMLDivElement | null>(null);

  const [editorWidth, setEditorWidth] = useState(0);
  const [editorHeight, setEditorHeight] = useState(0);

  const editorSize = useMemo(() => {
    return [editorWidth, editorHeight];
  }, [editorWidth, editorHeight]);

  const editorWidthChanged = useCallback(() => {
    const editorDiv = editorRef.current;
    if (editorDiv) {
      setEditorWidth(editorDiv.offsetWidth);
      setEditorHeight(editorDiv.offsetHeight);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("resize", editorWidthChanged, false);
    editorWidthChanged();
    return () => window.removeEventListener("resize", editorWidthChanged);
  }, [editorWidthChanged]);

  const telescoping = useAppSelector(
    (state) => state.app.currentAction === Action.TELESCOPE,
  );

  return (
    <div ref={editorRef} className="editor">
      <EditorSizeContext.Provider value={editorSize}>
        <BoardBG />
        <BoardLines />
        <BoardAssociations />
        <BoardSelectedSpaces />
        <BoardSpaces />
        <BoardSelectionBox />
        <BoardOverlay ref={(c) => (_boardOverlay = c)} />
        {telescoping && <TelescopeViewer />}
      </EditorSizeContext.Provider>
    </div>
  );
};

export function updateRightClickMenu(spaceIndex: number) {
  if (_boardOverlay) _boardOverlay.setRightClickMenu(spaceIndex);
}
export function rightClickOpen() {
  if (_boardOverlay) return _boardOverlay.rightClickOpen();
  return false;
}

export function animationPlaying() {
  return !!_animInterval;
}

export const external = {
  renderConnections: _renderConnections,
  renderSpaces: _renderSpaces,
};

function getEditorContentTransform(
  boardWidth: number,
  boardHeight: number,
  editorWidth: number,
  editorHeight: number,
): string {
  let board_offset_x = Math.floor((editorWidth - boardWidth) / 2);
  board_offset_x = Math.max(0, board_offset_x);
  let board_offset_y = Math.floor((editorHeight - boardHeight) / 2);
  board_offset_y = Math.max(0, board_offset_y);

  return `translateX(${board_offset_x}px) translateY(${board_offset_y}px)`;
}

function useDimensionsOnCanvas(
  canvasRef: React.RefObject<Canvas>,
  boardWidth: number,
  boardHeight: number,
) {
  const [editorWidth, editorHeight] = useContext(EditorSizeContext);

  useLayoutEffect(() => {
    const canvas = canvasRef.current!;
    const transformStyle = getEditorContentTransform(
      boardWidth,
      boardHeight,
      editorWidth,
      editorHeight,
    );
    canvas.style.transform = transformStyle;
    if (canvas.width !== boardWidth || canvas.height !== boardHeight) {
      canvas.width = boardWidth;
      canvas.height = boardHeight;
    }
  }, [canvasRef, boardWidth, boardHeight, editorWidth, editorHeight]);
}

function useBoardDimensions() {
  const width = useAppSelector((state) => selectCurrentBoard(state).bg.width);
  const height = useAppSelector((state) => selectCurrentBoard(state).bg.height);
  return useMemo(() => [width, height], [width, height]);
}
