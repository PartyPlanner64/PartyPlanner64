import * as ReactDOM from "react-dom";
import { ISpace, IBoard, getConnections, getSpaceIndex, getCurrentBoard } from "./boards";
import { BoardType, Space, SpaceSubtype } from "./types";
import { degreesToRadians } from "./utils/number";
import { spaces } from "./spaces";
import { getImage } from "./images";
import { $$hex } from "./utils/debug";
import * as React from "react";
import { RightClickMenu } from "./rightclick";
import { attachToCanvas, detachFromCanvas } from "./interaction";
import THREE = require("three");
import { getTexture } from "./textures";

type Canvas = HTMLCanvasElement;
type CanvasContext = CanvasRenderingContext2D;

function getEditorContentTransform(board: IBoard, editor: HTMLElement) {
  let board_offset_x = Math.floor((editor.offsetWidth - board.bg.width) / 2);
  board_offset_x = Math.max(0, board_offset_x);
  let board_offset_y = Math.floor((editor.offsetHeight - board.bg.height) / 2);
  board_offset_y = Math.max(0, board_offset_y);

  return `translateX(${board_offset_x}px) translateY(${board_offset_y}px)`;
}

function _renderConnections(lineCanvas: Canvas, lineCtx: CanvasContext, board: IBoard, clear: boolean = true) {
  if (clear)
    lineCtx.clearRect(0, 0, lineCanvas.width, lineCanvas.height);

  // Draw connecting lines.
  const links = board.links = board.links || {};
  for (let startSpace in links) {
    const x1 = board.spaces[startSpace].x;
    const y1 = board.spaces[startSpace].y;

    const endLinks = getConnections(parseInt(startSpace), board)!;
    let x2, y2;
    let bidirectional = false;
    for (let i = 0; i < endLinks.length; i++) {
      x2 = board.spaces[endLinks[i]].x;
      y2 = board.spaces[endLinks[i]].y;
      bidirectional = _isConnectedTo(links, endLinks[i], startSpace);
      if (bidirectional && parseInt(startSpace) > endLinks[i])
        continue;
      _drawConnection(lineCtx, x1, y1, x2, y2, bidirectional);
    }
  }

  // Draw associated spaces in event params.
  const spaces = board.spaces;
  if (spaces && spaces.length) {
    for (let i = 0; i < spaces.length; i++) {
      const space = spaces[i];
      if (space.events && space.events.length) {
        for (let e = 0; e < space.events.length; e++) {
          const event = space.events[e];
          if (event.parameters && event.parameters.length) {
            for (let p = 0; p < event.parameters.length; p++) {
              const parameter = event.parameters[p];
              if (parameter.type === "Space") {
                const associatedSpaceIndex =
                  event.parameterValues && event.parameterValues[parameter.name];
                if (typeof associatedSpaceIndex === "number") {
                  const associatedSpace = spaces[associatedSpaceIndex];
                  if (!associatedSpace)
                    continue; // I guess maybe this could happen?
                  drawAssociation(lineCtx, space.x, space.y, associatedSpace.x, associatedSpace.y);
                }
              }
            }
          }
        }
      }
    }
  }
}

function _isConnectedTo(links: any, start: number, end: any) {
  let startLinks = links[start];
  if (Array.isArray(startLinks))
    return startLinks.indexOf(parseInt(end)) >= 0;
  else
    return startLinks == end; // Can be string vs int
}

export interface ISpaceRenderOpts {
  skipHiddenSpaces?: boolean;
  skipBadges?: boolean;
  skipCharacters?: boolean;
}

// opts:
//   skipHiddenSpaces: true to not render start, invisible spaces
//   skipBadges: false to skip event and star badges
function _renderSpaces(spaceCanvas: Canvas, spaceCtx: CanvasContext, board: IBoard, clear: boolean = true, opts: ISpaceRenderOpts = {}) {
  if (clear)
    spaceCtx.clearRect(0, 0, spaceCanvas.width, spaceCanvas.height);

  let game = board.game || 1;
  const boardType = board.type || BoardType.NORMAL;

  // Draw spaces
  for (let index = 0; index < board.spaces.length; index++) {
    let space = board.spaces[index];
    if (space === null)
      continue;
    space.z = space.z || 0;

    drawSpace(spaceCtx, space, game, boardType, opts);
  }
}

function drawSpace(spaceCtx: CanvasContext, space: ISpace, game: number, boardType: BoardType, opts: ISpaceRenderOpts = {}) {
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
      if (opts.skipHiddenSpaces)
        break;
      if (game === 3)
        spaces.drawOther3(spaceCtx, x, y);
      else
        spaces.drawOther(spaceCtx, x, y);
      break;
    case Space.BLUE:
      if (game === 3)
        spaces.drawBlue3(spaceCtx, x, y);
      else
        spaces.drawBlue(spaceCtx, x, y);
      break;
    case Space.RED:
      if (game === 3)
        spaces.drawRed3(spaceCtx, x, y);
      else
        spaces.drawRed(spaceCtx, x, y);
      break;
    case Space.MINIGAME:
      if (boardType === BoardType.DUEL)
        spaces.drawMiniGameDuel3(spaceCtx, x, y);
      else
        spaces.drawMiniGame(spaceCtx, x, y);
      break;
    case Space.HAPPENING:
      if (game === 3) {
        if (boardType === BoardType.DUEL)
          spaces.drawHappeningDuel3(spaceCtx, x, y);
        else
          spaces.drawHappening3(spaceCtx, x, y);
      }
      else
        spaces.drawHappening(spaceCtx, x, y);
      break;
    case Space.STAR:
      if (game === 3)
        spaces.drawStar3(spaceCtx, x, y);
      else
        spaces.drawStar(spaceCtx, x, y);
      break;
    case Space.CHANCE:
      if (game === 3)
        spaces.drawChance3(spaceCtx, x, y);
      else if (game === 2)
        spaces.drawChance2(spaceCtx, x, y);
      else
        spaces.drawChance(spaceCtx, x, y);
      break;
    case Space.START:
      if (opts.skipHiddenSpaces)
        break;
      if (game === 3)
        spaces.drawStart3(spaceCtx, x, y);
      else
        spaces.drawStart(spaceCtx, x, y);
      break;
    case Space.SHROOM:
      spaces.drawShroom(spaceCtx, x, y);
      break;
    case Space.BOWSER:
      if (game === 3)
        spaces.drawBowser3(spaceCtx, x, y);
      else
        spaces.drawBowser(spaceCtx, x, y);
      break;
    case Space.ITEM:
      if (game === 3)
        spaces.drawItem3(spaceCtx, x, y);
      else
        spaces.drawItem2(spaceCtx, x, y);
      break;
    case Space.BATTLE:
      if (game === 3)
        spaces.drawBattle3(spaceCtx, x, y);
      else
        spaces.drawBattle2(spaceCtx, x, y);
      break;
    case Space.BANK:
      if (game === 3)
        spaces.drawBank3(spaceCtx, x, y);
      else
        spaces.drawBank2(spaceCtx, x, y);
      break;
    case Space.ARROW:
      spaces.drawArrow(spaceCtx, x, y, game);
      break;
    case Space.BLACKSTAR:
      spaces.drawBlackStar2(spaceCtx, x, y);
      break;
    case Space.GAMEGUY:
      if (boardType === BoardType.DUEL)
        spaces.drawGameGuyDuel3(spaceCtx, x, y);
      else
        spaces.drawGameGuy3(spaceCtx, x, y);
      break;
    case Space.DUEL_BASIC:
      spaces.drawDuelBasic(spaceCtx, x, y);
      break;
    case Space.DUEL_START_BLUE:
      if (opts.skipHiddenSpaces)
        break;
      spaces.drawStartDuelBlue(spaceCtx, x, y);
      break;
    case Space.DUEL_START_RED:
      if (opts.skipHiddenSpaces)
        break;
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
    let offset = game === 3 ? 5 : 2;
    let startOffset = game === 3 ? 16 : 12
    if (space.events && space.events.length) {
      let iconY = y + offset;
      if (type === Space.START)
        iconY -= startOffset;
      spaceCtx.drawImage(__determineSpaceEventImg(space), x + offset, iconY);
    }

    if (space.star) {
      let iconY = y + offset;
      if (type === Space.START)
        iconY -= startOffset;
      spaceCtx.drawImage(getImage("starImg"), x - offset - 9, iconY);
    }

    if (space.subtype === SpaceSubtype.GATE) {
      let iconX = x - offset - 9;
      let iconY = y + offset - 5;
      spaceCtx.drawImage(getImage("gateImg"), iconX, iconY);
    }
  }

  if ($$debug) {
    // Draw the space's index.
    spaceCtx.save();
    let index = getSpaceIndex(space);
    spaceCtx.fillStyle = "white";
    spaceCtx.strokeStyle = "black";
    spaceCtx.lineWidth = 2;
    spaceCtx.font = "bold 6pt Courier New";
    spaceCtx.textAlign = "center";
    let text = index.toString();
    spaceCtx.strokeText(text, x, y - 2);
    spaceCtx.fillText(text, x, y - 2);
    text = $$hex(index);
    spaceCtx.strokeText(text, x, y + 8);
    spaceCtx.fillText(text, x, y + 8);
    spaceCtx.restore();
  }
}

function drawCharacters(spaceCtx: CanvasContext, x: number, y: number, subtype: SpaceSubtype | undefined, game: number) {
  // Draw the standing Toad.
  if (subtype === SpaceSubtype.TOAD) {
    if (game === 3)
      spaceCtx.drawImage(getImage("mstarImg"), x - 15, y - 22);
    else
      spaceCtx.drawImage(getImage("toadImg"), x - 9, y - 22);
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
    if (game === 2)
      spaceCtx.drawImage(getImage("bank2Img"), x - 9, y - 10);
    else
      spaceCtx.drawImage(getImage("bank3Img"), x - 17, y - 20);
  }

  // Draw the bank coin.
  if (subtype === SpaceSubtype.BANKCOIN) {
    spaceCtx.drawImage(getImage("bankcoinImg"), x - 10, y - 9);
  }

  // Draw the item shop.
  if (subtype === SpaceSubtype.ITEMSHOP) {
    if (game === 2)
      spaceCtx.drawImage(getImage("itemShop2Img"), x - 9, y - 10);
    else
      spaceCtx.drawImage(getImage("itemShop3Img"), x - 16, y - 20);
  }
}

let _camera: THREE.Camera;

// opts:
//   skipHiddenSpaces: true to not render start, invisible spaces
//   skipBadges: false to skip event and star badges
function _renderSpaces3d(spaceCanvas: Canvas, board: IBoard, clear: boolean = true, opts: ISpaceRenderOpts = {}) {
  // const spaceCtx = spaceCanvas.getContext("2d")!;
  // if (clear)
  //   spaceCtx.clearRect(0, 0, spaceCanvas.width, spaceCanvas.height);

  const game = board.game || 1;
  const boardType = board.type || BoardType.NORMAL;
  const bg = board.bg;
  const [width, height] = [bg.width, bg.height];

  const scene = new THREE.Scene();
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, canvas: spaceCanvas });
  renderer.setSize(bg.width, bg.height);

  _camera = new THREE.PerspectiveCamera(bg.fov, width / height, 1, 10000);
  if (game === 1) {
    _camera.position.set(bg.cameraEyePosX, bg.cameraEyePosY, bg.cameraEyePosZ);
  }
  else {
    // gamemasterplc says don't divide anything by 1.2 if bg.cameraEyePosY === 1000,
    // according to game logic.
    // Observation: 18 / 15 == 1.2, this relates to tile count
    _camera.position.set(bg.cameraEyePosX / 1.2, bg.cameraEyePosY / 1.2, bg.cameraEyePosZ / 1.2);
  }

  _camera.lookAt(new THREE.Vector3(bg.lookatPointX, bg.lookatPointY, bg.lookatPointZ));
  scene.add(_camera);

  // Draw spaces
  for (let index = 0; index < board.spaces.length; index++) {
    let space = board.spaces[index];
    if (space === null)
      continue;
    space.z = space.z || 0;

    const spriteMap = getTexture(space.type, game, boardType);
    spriteMap.needsUpdate = true;
    // spriteMap.minFilter = THREE.NearestFilter;
    // spriteMap.magFilter = THREE.NearestFilter;
    const spaceMaterial = new THREE.MeshBasicMaterial({
      map: spriteMap, transparent: true, alphaTest: 0.5,
    });
    const spaceGeometry = new THREE.PlaneGeometry(3, 3);
    const sprite = new THREE.Mesh(spaceGeometry, spaceMaterial);
    sprite.scale.y = -1;

    // const sprite = new THREE.Sprite(spriteMaterial);
    sprite.position.x = space.x;
    sprite.position.y = space.y;
    sprite.position.z = space.z;

    if (game === 2 || game === 3) {
      sprite.position.x *= (bg.unk / 1.2);
      sprite.position.y *= (bg.unk / 1.2);
      sprite.position.z *= (bg.unk / 1.2);
    }

    scene.add(sprite);
  }

  // Because opengl differs from the N64 rendering engine.
  scene.scale.y = -1;
  _camera.scale.y = -1;

  renderer.render(scene, _camera);
}

export function getClicked2DPlaneCoord(mouseX: number, mouseY: number): { x: number, y: number, z: number } {
  const curBoard = getCurrentBoard();
  const vec = new THREE.Vector3();
  const pos = new THREE.Vector3();
  vec.set(
      (mouseX / curBoard.bg.width) * 2 - 1,
      - (mouseY / curBoard.bg.height) * 2 + 1,
      0.5);
  vec.unproject(_camera);
  vec.sub(_camera.position).normalize();
  const distance = -_camera.position.z / vec.z;
  pos.copy(_camera.position).add(vec.multiplyScalar(distance));
  return {
    x: pos.x,
    y: pos.y,
    z: pos.z
  };
}

const _PIOver1 = (Math.PI / 1);
function _drawConnection(lineCtx: CanvasContext, x1: number, y1: number, x2: number, y2: number, bidirectional?: boolean) {
  lineCtx.save();
  lineCtx.beginPath();
  lineCtx.strokeStyle = "rgba(255, 185, 105, 0.75)";
  lineCtx.lineCap = "round";
  lineCtx.lineWidth = 8;
  lineCtx.moveTo(x1, y1);
  lineCtx.lineTo(x2, y2);
  lineCtx.stroke();

  // Draw the little triangle arrow on top at halfway.
  let midX = (x1 + x2) / 2;
  let midY = (y1 + y2) / 2;
  lineCtx.translate(midX, midY);
  lineCtx.rotate(-Math.atan2(x1 - midX, y1 - midY) + _PIOver1);
  lineCtx.fillStyle = "#A15000";
  let adjust = bidirectional ? 3 : 0;
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

function drawAssociation(lineCtx: CanvasContext, x1: number, y1: number, x2: number, y2: number) {
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
  lineCtx.strokeStyle = "rgba(240, 240, 240, 0.5)";
  lineCtx.setLineDash([1, 8]);
  lineCtx.lineCap = "round";
  lineCtx.lineWidth = 4;
  lineCtx.moveTo(x1, y1);
  lineCtx.lineTo(x2, y2);
  lineCtx.stroke();
  lineCtx.restore();
}

/** Adds a glow around the selected spaces in the editor. */
function _renderSelectedSpaces(canvas: Canvas, context: CanvasContext, spaces?: ISpace[] | null) {
  context.clearRect(0, 0, canvas.width, canvas.height);

  if (!spaces || !spaces.length)
    return;

  for (let i = 0; i < spaces.length; i++) {
    const space = spaces[i];
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
function _highlightSpaces(canvas: Canvas, context: CanvasContext, spaces: number[]) {
  const currentBoard = getCurrentBoard();
  let radius = currentBoard.game === 3 ? 18 : 12;

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

function __determineSpaceEventImg(space: ISpace) {
  if (space.events && space.events.length) {
    for (let i = 0; i < space.events.length; i++) {
      const event = space.events[i];
      if (event.parameters) {
        for (let p = 0; p < event.parameters.length; p++) {
          const parameter = event.parameters[p];
          if (!event.parameterValues || !event.parameterValues.hasOwnProperty(parameter.name)) {
            return getImage("eventErrorImg");
          }
        }
      }
    }
  }
  return getImage("eventImg");
}

let _boardBG: BoardBG | null;

interface BoardBGProps {
  board: IBoard;
}

class BoardBG extends React.Component<BoardBGProps> {
  state = {}

  componentDidMount() {
    this.renderContent();
    _boardBG = this;
  }

  componentWillUnmount() {
    _boardBG = null;
  }

  componentDidUpdate() {
    this.renderContent();
  }

  renderContent() {
    let board = this.props.board;
    let bgImg = this.getImage();
    let editor = bgImg.parentElement;
    let transformStyle = getEditorContentTransform(board, editor!);
    bgImg.style.transform = transformStyle;

    // Update the background image.
    if ((bgImg as any)._src !== board.bg.src || bgImg.width !== board.bg.width || bgImg.height !== board.bg.height) {
      bgImg.width = board.bg.width;
      bgImg.height = board.bg.height;
      this.setSource(board.bg.src as string, bgImg);
    }
  }

  getImage() {
    return ReactDOM.findDOMNode(this) as HTMLImageElement;
  }

  setSource(src: string, bgImg = this.getImage()) {
    bgImg.src = src;
    (bgImg as any)._src = src; // src can change after setting, and trick the renderContent check.
  }

  render() {
    return (
      <img className="editor_bg" />
    );
  }
};

let _animInterval: any;
let _currentFrame = -1;

export function playAnimation() {
  if (!_animInterval) {
    _animInterval = setInterval(_animationStep, 800);
  }
}

export function stopAnimation() {
  if (_animInterval) {
    clearInterval(_animInterval);
  }

  _animInterval = null;
  _currentFrame = -1;

  renderBG(); // Reset image
}

function _animationStep() {
  const board = getCurrentBoard();
  const animbgs = board.animbg;
  if (!_boardBG || !animbgs || !animbgs.length) {
    stopAnimation();
    return;
  }

  else if (_currentFrame >= 0 && _currentFrame < animbgs.length) {
    _boardBG.setSource(animbgs[_currentFrame]);
    _currentFrame++;
  }
  else {
    _currentFrame = -1;
  }

  if (_currentFrame === -1) {
    _boardBG.setSource(board.bg.src as string);
    _currentFrame++;
  }
}

let _boardLines: BoardLines | null;

interface BoardLinesProps {
  board: IBoard;
}

class BoardLines extends React.Component<BoardLinesProps> {
  state = {}

  componentDidMount() {
    this.renderContent();
    _boardLines = this;
  }

  componentWillUnmount() {
    _boardLines = null;
  }

  componentDidUpdate() {
    this.renderContent();
  }

  renderContent() {
    // Update lines connecting spaces
    let lineCanvas = ReactDOM.findDOMNode(this) as Canvas;
    let editor = lineCanvas.parentElement!;
    let board = this.props.board;
    let transformStyle = getEditorContentTransform(board, editor);
    lineCanvas.style.transform = transformStyle;
    if (lineCanvas.width !== board.bg.width || lineCanvas.height !== board.bg.height) {
      lineCanvas.width = board.bg.width;
      lineCanvas.height = board.bg.height;
    }
    _renderConnections(lineCanvas, lineCanvas.getContext("2d")!, board);
  }

  render() {
    return (
      <canvas className="editor_line_canvas"></canvas>
    );
  }
};

let _boardSelectedSpaces: BoardSelectedSpaces | null;

interface BoardSelectedSpacesProps {
  board: IBoard;
  selectedSpaces?: ISpace[] | null;
}

class BoardSelectedSpaces extends React.Component<BoardSelectedSpacesProps> {
  state = {}

  componentDidMount() {
    this.renderContent();
    _boardSelectedSpaces = this;
  }

  componentWillUnmount() {
    _boardSelectedSpaces = null;
  }

  componentDidUpdate() {
    this.renderContent();
  }

  renderContent() {
    // Update the current space indication
    const selectedSpacesCanvas = ReactDOM.findDOMNode(this) as Canvas;
    const editor = selectedSpacesCanvas.parentElement!;
    const board = this.props.board;
    const transformStyle = getEditorContentTransform(board, editor);
    selectedSpacesCanvas.style.transform = transformStyle;
    if (selectedSpacesCanvas.width !== board.bg.width || selectedSpacesCanvas.height !== board.bg.height) {
      selectedSpacesCanvas.width = board.bg.width;
      selectedSpacesCanvas.height = board.bg.height;
    }
    _renderSelectedSpaces(selectedSpacesCanvas, selectedSpacesCanvas.getContext("2d")!, this.props.selectedSpaces);
  }

  highlightSpaces(spaces: number[]) {
    const selectedSpacesCanvas = ReactDOM.findDOMNode(this) as Canvas;
    _highlightSpaces(selectedSpacesCanvas, selectedSpacesCanvas.getContext("2d")!, spaces);
  }

  render() {
    return (
      <canvas className="editor_current_space_canvas"></canvas>
    );
  }
};

let _boardSpaces: BoardSpaces | null;

interface BoardSpacesProps {
  board: IBoard;
}

class BoardSpaces extends React.Component<BoardSpacesProps> {
  state = {}

  private __canvas: HTMLCanvasElement | null = null;

  componentDidMount() {
    //attachToCanvas(this.__canvas!);

    this.renderContent();
    _boardSpaces = this;
  }

  componentWillUnmount() {
    //detachFromCanvas(this.__canvas!);
    _boardSpaces = null;
  }

  componentDidUpdate() {
    this.renderContent();
  }

  renderContent() {
    // Update spaces
    const spaceCanvas = ReactDOM.findDOMNode(this) as Canvas;
    const editor = spaceCanvas.parentElement!;
    const board = this.props.board;
    const transformStyle = getEditorContentTransform(board, editor);
    spaceCanvas.style.transform = transformStyle;
    if (spaceCanvas.width !== board.bg.width || spaceCanvas.height !== board.bg.height) {
      spaceCanvas.width = board.bg.width;
      spaceCanvas.height = board.bg.height;
    }
    //_renderSpaces(spaceCanvas, spaceCanvas.getContext("2d")!, board);
  }

  render() {
    return (
      <canvas className="editor_space_canvas" tabIndex={-1}
        ref={(el => this.__canvas = el)}
        onDragOver={undefined}></canvas>
    );
  }

  /** Draws the box as the user drags to select spaces. */
  drawSelectionBox = (xs: number, ys: number, xf: number, yf: number) => {
    const spaceCanvas = ReactDOM.findDOMNode(this) as Canvas;
    const ctx = spaceCanvas.getContext("2d")!;
    ctx.save();
    ctx.beginPath();
    ctx.fillStyle = "rgba(47, 70, 95, 0.5)";
    ctx.strokeStyle = "rgba(47, 70, 95, 1)";
    ctx.fillRect(Math.min(xs, xf), Math.min(ys, yf), Math.abs(xs - xf), Math.abs(ys - yf));
    ctx.strokeRect(Math.min(xs, xf), Math.min(ys, yf), Math.abs(xs - xf), Math.abs(ys - yf));
    ctx.restore();
  }
};

let _boardSpaces3d: BoardSpaces3D | null;

interface BoardSpaces3DProps {
  board: IBoard;
}

class BoardSpaces3D extends React.Component<BoardSpaces3DProps> {
  state = {}

  private __canvas: HTMLCanvasElement | null = null;

  componentDidMount() {
    attachToCanvas(this.__canvas!);

    this.renderContent();
    _boardSpaces3d = this;
  }

  componentWillUnmount() {
    detachFromCanvas(this.__canvas!);
    _boardSpaces3d = null;
  }

  componentDidUpdate() {
    this.renderContent();
  }

  renderContent() {
    // Update spaces
    const spaceCanvas = ReactDOM.findDOMNode(this) as Canvas;
    const editor = spaceCanvas.parentElement!;
    const board = this.props.board;
    const transformStyle = getEditorContentTransform(board, editor);
    spaceCanvas.style.transform = transformStyle;
    if (spaceCanvas.width !== board.bg.width || spaceCanvas.height !== board.bg.height) {
      spaceCanvas.width = board.bg.width;
      spaceCanvas.height = board.bg.height;
    }
    _renderSpaces3d(spaceCanvas, board);
  }

  render() {
    return (
      <canvas className="editor_space3d_canvas" tabIndex={-1}
        ref={(el => this.__canvas = el)}
        onDragOver={undefined}></canvas>
    );
  }
};

// Right-click menu overlay
let _boardOverlay: BoardOverlay | null;

interface BoardOverlayProps {
  board: IBoard;
}

interface BoardOverlayState {
  rightClickSpace: ISpace | null;
}

class BoardOverlay extends React.Component<BoardOverlayProps> {
  state: BoardOverlayState = {
    rightClickSpace: null
  }

  componentDidMount() {
    this.renderContent();
    _boardOverlay = this;
  }

  componentWillUnmount() {
    _boardOverlay = null;
  }

  componentDidUpdate() {
    this.renderContent();
  }

  renderContent() {
    let overlay = ReactDOM.findDOMNode(this) as HTMLElement;
    let editor = overlay.parentElement!;
    let transformStyle = getEditorContentTransform(this.props.board, editor);
    overlay.style.transform = transformStyle;
  }

  setRightClickMenu(space: ISpace | null) {
    this.setState({ rightClickSpace: space });
  }

  rightClickOpen() {
    return !!this.state.rightClickSpace;
  }

  render() {
    let menu;
    if (this.rightClickOpen())
      menu = <RightClickMenu space={this.state.rightClickSpace} />;
    return (
      <div className="editor_menu_overlay">
        {menu}
      </div>
    );
  }
};

interface IEditorProps {
  board: IBoard;
  selectedSpaces: ISpace[] | null;
}

export const Editor = class Editor extends React.Component<IEditorProps> {
  state = {}

  componentDidMount() {
    window.addEventListener("resize", render, false);
  }

  componentWillUnmount() {
    window.removeEventListener("resize", render);
  }

  componentDidUpdate() {}

  render() {
    return (
      <div className="editor">
        <BoardBG board={this.props.board} />
        <BoardLines board={this.props.board} />
        <BoardSelectedSpaces board={this.props.board}
          selectedSpaces={this.props.selectedSpaces} />
        <BoardSpaces board={this.props.board} />
        <BoardSpaces3D board={this.props.board} />
        <BoardOverlay board={this.props.board} />
      </div>
    );
  }
};

export function render() {
  if (_boardBG)
    _boardBG.renderContent();
  if (_boardLines)
    _boardLines.renderContent();
  if (_boardSelectedSpaces)
    _boardSelectedSpaces.renderContent();
  if (_boardSpaces)
    _boardSpaces.renderContent();
  if (_boardSpaces3d)
    _boardSpaces3d.renderContent();
}
export function renderBG() {
  if (_boardBG)
    _boardBG.renderContent();
}
export function renderConnections() {
  if (_boardLines)
    _boardLines.renderContent();
}
export function renderSelectedSpaces() {
  if (_boardSelectedSpaces)
    _boardSelectedSpaces.renderContent();
}
export function renderSpaces() {
  if (_boardSpaces)
    _boardSpaces.renderContent();
  if (_boardSpaces3d)
    _boardSpaces3d.renderContent();
}
export function updateRightClickMenu(space: ISpace | null) {
  if (_boardOverlay)
    _boardOverlay.setRightClickMenu(space);
}
export function rightClickOpen() {
  if (_boardOverlay)
    return _boardOverlay.rightClickOpen();
  return false;
}
export function drawConnection(x1: number, y1: number, x2: number, y2: number) {
  if (!_boardLines)
    return;
  let lineCtx = (ReactDOM.findDOMNode(_boardLines) as Canvas).getContext("2d")!;
  _drawConnection(lineCtx, x1, y1, x2, y2);
}

export function highlightSpaces(spaces: number[]) {
  if (_boardSelectedSpaces)
    _boardSelectedSpaces.highlightSpaces(spaces);
}

export function drawSelectionBox(xs: number, ys: number, xf: number, yf: number) {
  if (_boardSpaces)
    _boardSpaces.drawSelectionBox(xs, ys, xf, yf);
}

export function animationPlaying() {
  return !!_animInterval;
}

export const external = {
  getBGImage: function() {
    return _boardBG!.getImage();
  },
  setBGImage: function(src: string) {
    _boardBG!.setSource(src);
  },
  renderConnections: _renderConnections,
  renderSpaces: _renderSpaces3d
};
