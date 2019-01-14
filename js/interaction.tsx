import { renderSpaces, drawSelectionBox, renderConnections, renderSelectedSpaces, rightClickOpen, updateRightClickMenu, render, drawConnection, getClicked2DPlaneCoord } from "./renderer";
import { pointFallsWithin, lineDistance, determineAngle, radiansToDegrees } from "./utils/number";
import { getCurrentBoard, ISpace, addSpace, getSpacesOfType, IBoard, currentBoardIsROM, removeSpace, getSpaceIndex, addConnection, setSpaceRotation, setCurrentBoard, copyCurrentBoard } from "./boards";
import { Action, Space, SpaceSubtype } from "./types";
import { getEventParamDropHandler } from "./utils/drag";
import { $$log, $$hex } from "./utils/debug";
import { changeCurrentAction, getCurrentAction, changeSelectedSpaces, getSelectedSpaces } from "./appControl";

let selectedSpaceIndices: { [index: number]: boolean } = {};
let spaceWasMouseDownedOn = false;
let startX = -1;
let startY = -1;
let lastX = -1;
let lastY = -1;

let canvasRect: (ClientRect | DOMRect) | null = null;

function onEditorMouseDown(event: MouseEvent) {
  const canvas = event.currentTarget as HTMLCanvasElement;
  _onEditorDown(canvas, event.clientX, event.clientY, event.ctrlKey);
}

function onEditorTouchStart(event: TouchEvent) {
  if (event.touches.length !== 1)
    return;

  const touch = event.touches[0];

  const canvas = event.currentTarget as HTMLCanvasElement;
  _onEditorDown(canvas, touch.clientX, touch.clientY, event.ctrlKey);
}

/** mousedown or touchstart */
function _onEditorDown(canvas: HTMLCanvasElement, clientX: number, clientY: number, ctrlKey: boolean) {
  canvasRect = canvas.getBoundingClientRect();

  const clickX = clientX - canvasRect.left;
  const clickY = clientY - canvasRect.top;

  startX = lastX = clickX;
  startY = lastY = clickY;

  const clickedSpaceIndex = _getClickedSpace(lastX, lastY);
  $$log(`Clicked space: ${$$hex(clickedSpaceIndex)} (${clickedSpaceIndex})`,
    getCurrentBoard().spaces[clickedSpaceIndex]);

  const spaceWasClicked = clickedSpaceIndex !== -1;

  // ROM boards cannot be edited, so create a copy right now and switch to it.
  if (currentBoardIsROM() && spaceWasClicked) {
    changeCurrentAction(Action.MOVE); // Avoid destructive actions like delete.
    const insertionIndex = copyCurrentBoard();
    setCurrentBoard(insertionIndex);
  }

  const curAction = getCurrentAction();
  switch (curAction) {
    case Action.MOVE:
      if (spaceWasClicked) {
        if (ctrlKey) {
          _addSelectedSpace(clickedSpaceIndex);
        }
        else if (!_spaceIsSelected(clickedSpaceIndex)) {
          _setSelectedSpace(clickedSpaceIndex);
        }
      }
      else {
        _clearSelectedSpaces();
      }
      break;
    case Action.ADD_OTHER:
    case Action.ADD_BLUE:
    case Action.ADD_RED:
    case Action.ADD_MINIGAME:
    case Action.ADD_HAPPENING:
    case Action.ADD_STAR:
    case Action.ADD_BLACKSTAR:
    case Action.ADD_START:
    case Action.ADD_CHANCE:
    case Action.ADD_SHROOM:
    case Action.ADD_BOWSER:
    case Action.ADD_ITEM:
    case Action.ADD_BATTLE:
    case Action.ADD_BANK:
    case Action.ADD_GAMEGUY:
    case Action.ADD_ARROW:
    case Action.MARK_STAR:
    case Action.MARK_GATE:
    case Action.ADD_TOAD_CHARACTER:
    case Action.ADD_BOWSER_CHARACTER:
    case Action.ADD_KOOPA_CHARACTER:
    case Action.ADD_BOO_CHARACTER:
    case Action.ADD_BANK_SUBTYPE:
    case Action.ADD_BANKCOIN_SUBTYPE:
    case Action.ADD_ITEMSHOP_SUBTYPE:
    case Action.ADD_DUEL_BASIC:
    case Action.ADD_DUEL_REVERSE:
    case Action.ADD_DUEL_POWERUP:
    case Action.ADD_DUEL_START_BLUE:
    case Action.ADD_DUEL_START_RED:
      if (spaceWasClicked) {
        if (ctrlKey) {
          _addSelectedSpace(clickedSpaceIndex);
        }
        else if (!_spaceIsSelected(clickedSpaceIndex)) {
          _setSelectedSpace(clickedSpaceIndex);
        }
      }
      else if (!ctrlKey) {
        _clearSelectedSpaces();
      }
      break;
    case Action.LINE:
    case Action.LINE_STICKY:
    case Action.ROTATE:
      if (spaceWasClicked) {
        _setSelectedSpace(clickedSpaceIndex);
      }
      else {
        _clearSelectedSpaces();
      }
      break;
    case Action.ERASE:
      _clearSelectedSpaces();
      break;
  }

  const selectedSpaces = _getSelectedSpaces();
  const curBoard = getCurrentBoard();
  const clickedSpace = curBoard.spaces[clickedSpaceIndex];

  switch (curAction) {
    case Action.LINE:
      if (selectedSpaces.length === 1) {
        let space = selectedSpaces[0];

        // Draw a line from the start space to the current location.
        renderConnections();
        drawConnection(space.x, space.y, clickX, clickY);

        if (rightClickOpen()) {
          updateRightClickMenu(null);
        }
      }
      break;

    case Action.LINE_STICKY:
      if (selectedSpaces.length === 1) {
        let space = selectedSpaces[0];

        // Make a connection if we are in sticky mode and have reached a new space.
        if (clickedSpace && clickedSpace !== space) {
          const selectedSpaceIndex = getSpaceIndex(space, curBoard);
          addConnection(selectedSpaceIndex, clickedSpaceIndex);
          _setSelectedSpace(clickedSpaceIndex);
          renderConnections();
        }
        else {
          // Draw a line from the start space to the current location.
          renderConnections();
          drawConnection(space.x, space.y, clickX, clickY);
        }
      }
      break;

    case Action.ROTATE:
      break;

    case Action.ERASE:
      if (clickedSpaceIndex !== -1 && _canRemoveSpaceAtIndex(curBoard, clickedSpaceIndex)) {
        removeSpace(clickedSpaceIndex);
        changeSelectedSpaces([]);
        render();
      }
      else {
        _eraseLines(clickX, clickY); // Try to slice some lines!
      }
      break;

    case Action.ADD_OTHER:
    case Action.ADD_BLUE:
    case Action.ADD_RED:
    case Action.ADD_MINIGAME:
    case Action.ADD_HAPPENING:
    case Action.ADD_STAR:
    case Action.ADD_BLACKSTAR:
    case Action.ADD_START:
    case Action.ADD_CHANCE:
    case Action.ADD_SHROOM:
    case Action.ADD_BOWSER:
    case Action.ADD_ITEM:
    case Action.ADD_BATTLE:
    case Action.ADD_BANK:
    case Action.ADD_GAMEGUY:
    case Action.ADD_ARROW:
    case Action.MARK_STAR:
    case Action.MARK_GATE:
    case Action.ADD_TOAD_CHARACTER:
    case Action.ADD_BOWSER_CHARACTER:
    case Action.ADD_KOOPA_CHARACTER:
    case Action.ADD_BOO_CHARACTER:
    case Action.ADD_BANK_SUBTYPE:
    case Action.ADD_BANKCOIN_SUBTYPE:
    case Action.ADD_ITEMSHOP_SUBTYPE:
    case Action.ADD_DUEL_BASIC:
    case Action.ADD_DUEL_REVERSE:
    case Action.ADD_DUEL_POWERUP:
    case Action.ADD_DUEL_START_BLUE:
    case Action.ADD_DUEL_START_RED:
      if (_addSpace(curAction, clickX, clickY, clickedSpace, false, ctrlKey)) {
        _addSelectedSpace(clickedSpaceIndex !== -1 ? clickedSpaceIndex : curBoard.spaces.length - 1);
      }
      break;

    case Action.MOVE:
    default:
      spaceWasMouseDownedOn = spaceWasClicked;

      if (rightClickOpen()) {
        updateRightClickMenu(selectedSpaces[0]);
      }
      break;
  }
}

function onEditorTouchMove(event: TouchEvent) {
  let clickX, clickY;

  if (event.touches.length !== 1)
    return;

  if (!_hasAnySelectedSpace())
    return;

  event.preventDefault(); // Don't drag around the board.

  let touch = event.touches[0];

  clickX = touch.clientX - canvasRect!.left;
  clickY = touch.clientY - canvasRect!.top;

  _onEditorMove(clickX, clickY);
}

function onEditorMouseMove(event: MouseEvent) {
  let clickX, clickY;

  if (!canvasRect || event.buttons !== 1)
    return;

  clickX = event.clientX - canvasRect.left;
  clickY = event.clientY - canvasRect.top;

  _onEditorMove(clickX, clickY);
}

function _onEditorMove(clickX: number, clickY: number) {
  if (currentBoardIsROM())
    return;

  const curAction = getCurrentAction();
  const selectedSpaces = _getSelectedSpaces();
  const curBoard = getCurrentBoard();
  const clickedSpaceIndex = _getClickedSpace(clickX, clickY);

  switch (curAction) {
    case Action.LINE:
      if (selectedSpaces.length === 1) {
        let space = selectedSpaces[0];

        // Draw a line from the start space to the current location.
        renderConnections();
        drawConnection(space.x, space.y, clickX, clickY);

        if (rightClickOpen()) {
          updateRightClickMenu(null);
        }
      }
      break;

    case Action.LINE_STICKY:
      if (selectedSpaces.length === 1) {
        const space = selectedSpaces[0];

        // Make a connection if we are in sticky mode and have reached a new space.
        const endSpace = curBoard.spaces[clickedSpaceIndex];
        if (endSpace && endSpace !== space) {
          const selectedSpaceIndex = getSpaceIndex(space, curBoard);
          addConnection(selectedSpaceIndex, clickedSpaceIndex);
          _setSelectedSpace(clickedSpaceIndex);
          renderConnections();
        }
        else {
          // Draw a line from the start space to the current location.
          renderConnections();
          drawConnection(space.x, space.y, clickX, clickY);
        }
      }
      break;

    case Action.ROTATE:
      if (selectedSpaces.length === 1) {
        const space = selectedSpaces[0];
        if (space.type === Space.ARROW) {
          // Adjust rotation of the space.
          const angleXAxisRad = determineAngle(space.x, space.y, clickX, clickY);
          const angleYAxisRad = ((Math.PI * 1.5) + angleXAxisRad) % (Math.PI * 2);
          const angleYAxisDeg = radiansToDegrees(angleYAxisRad);
          const selectedSpaceIndex = getSpaceIndex(space, curBoard);
          //$$log(`Space ${selectedSpaceIndex} rotated ${angleYAxisDeg} degrees`);
          setSpaceRotation(selectedSpaceIndex, angleYAxisDeg);
          renderSpaces();
        }
      }
      break;

    case Action.ERASE:
      if (clickedSpaceIndex !== -1 && _canRemoveSpaceAtIndex(curBoard, clickedSpaceIndex)) {
        removeSpace(clickedSpaceIndex);
        changeSelectedSpaces([]);
        render();
      }
      else {
        _eraseLines(clickX, clickY); // Try to slice some lines!
      }
      break;

    case Action.MOVE:
    case Action.ADD_OTHER:
    case Action.ADD_BLUE:
    case Action.ADD_RED:
    case Action.ADD_MINIGAME:
    case Action.ADD_HAPPENING:
    case Action.ADD_STAR:
    case Action.ADD_BLACKSTAR:
    case Action.ADD_START:
    case Action.ADD_CHANCE:
    case Action.ADD_SHROOM:
    case Action.ADD_BOWSER:
    case Action.ADD_ITEM:
    case Action.ADD_BATTLE:
    case Action.ADD_BANK:
    case Action.ADD_GAMEGUY:
    case Action.ADD_ARROW:
    case Action.MARK_STAR:
    case Action.MARK_GATE:
    case Action.ADD_TOAD_CHARACTER:
    case Action.ADD_BOWSER_CHARACTER:
    case Action.ADD_KOOPA_CHARACTER:
    case Action.ADD_BOO_CHARACTER:
    case Action.ADD_BANK_SUBTYPE:
    case Action.ADD_BANKCOIN_SUBTYPE:
    case Action.ADD_ITEMSHOP_SUBTYPE:
    case Action.ADD_DUEL_BASIC:
    case Action.ADD_DUEL_REVERSE:
    case Action.ADD_DUEL_POWERUP:
    case Action.ADD_DUEL_START_BLUE:
    case Action.ADD_DUEL_START_RED:
    default:
      const doingSelectionBox = !spaceWasMouseDownedOn && curAction === Action.MOVE;
      if (!doingSelectionBox && selectedSpaces.length) {
        // Move the space(s)
        const deltaX = clickX - lastX;
        const deltaY = clickY - lastY;

        selectedSpaces.forEach(space => {
          const newX = space.x + deltaX;
          space.x = Math.max(0, Math.min(newX, curBoard.bg.width));

          const newY = space.y + deltaY;
          space.y = Math.max(0, Math.min(newY, curBoard.bg.height));
        });

        renderConnectionsOnTimeout();
        renderSpacesOnTimeout();

        if (rightClickOpen()) {
          updateRightClickMenu(selectedSpaces[0]);
        }
      }
      if (doingSelectionBox) {
        // Draw selection box, update selection.
        _updateSelectionAndBox(clickX, clickY);
      }
      break;
  }

  //$$log("dX: " + deltaX + ", dY: " + deltaY);

  lastX = clickX;
  lastY = clickY;
}

function onEditorMouseUp(event: MouseEvent) {
  if (event.button !== 0)
    return;

  _onEditorUp();
}

function onEditorTouchEnd(event: TouchEvent) {
  if (event.touches.length !== 1)
    return;

  _onEditorUp();
}

function _onEditorUp() {
  if (currentBoardIsROM())
    return;

  const curAction = getCurrentAction();
  if (!spaceWasMouseDownedOn && curAction === Action.MOVE) {
    // Clear the selection we were drawing.
    renderSpaces();
  }

  spaceWasMouseDownedOn = false;

  if (!_hasAnySelectedSpace())
    return;

  const selectedSpaces = _getSelectedSpaces();
  if (curAction === Action.LINE) {
    let endSpaceIdx = _getClickedSpace(lastX, lastY);
    // FIXME: indexOf cannot succeed
    if (endSpaceIdx !== -1 && selectedSpaces.indexOf(endSpaceIdx as any) === -1) {
      for (let index in selectedSpaceIndices) {
        addConnection(parseInt(index), endSpaceIdx);
      }
    }

    renderConnections();
  }
}

function onEditorClick(event: MouseEvent) {
  //console.log("onEditorClick", event);
  if (currentBoardIsROM())
    return;

  const moved = Math.abs(startX - lastX) > 5 || Math.abs(startY - lastY) > 5;
  const movedAtAll = Math.abs(startX - lastX) > 0 || Math.abs(startY - lastY) > 0;

  const selectedSpaces = _getSelectedSpaces();

  startX = lastX = -1;
  startY = lastY = -1;

  const ctrlKey = event.ctrlKey;
  const clickX = event.clientX - canvasRect!.left;
  const clickY = event.clientY - canvasRect!.top;
  let clickedSpaceIdx = _getClickedSpace(clickX, clickY);

  const curBoard = getCurrentBoard();
  const clickedSpace = clickedSpaceIdx === -1 ? null : curBoard.spaces[clickedSpaceIdx];

  if (event.button !== 0)
    return;

  const curAction = getCurrentAction();
  switch (curAction) {
    case Action.MOVE:
    case Action.ADD_OTHER:
    case Action.ADD_BLUE:
    case Action.ADD_RED:
    case Action.ADD_MINIGAME:
    case Action.ADD_HAPPENING:
    case Action.ADD_STAR:
    case Action.ADD_BLACKSTAR:
    case Action.ADD_START:
    case Action.ADD_CHANCE:
    case Action.ADD_SHROOM:
    case Action.ADD_BOWSER:
    case Action.ADD_ITEM:
    case Action.ADD_BATTLE:
    case Action.ADD_BANK:
    case Action.ADD_GAMEGUY:
    case Action.ADD_ARROW:
    case Action.MARK_GATE:
    case Action.ADD_TOAD_CHARACTER:
    case Action.ADD_BOWSER_CHARACTER:
    case Action.ADD_KOOPA_CHARACTER:
    case Action.ADD_BOO_CHARACTER:
    case Action.ADD_BANK_SUBTYPE:
    case Action.ADD_BANKCOIN_SUBTYPE:
    case Action.ADD_ITEMSHOP_SUBTYPE:
    case Action.ADD_DUEL_BASIC:
    case Action.ADD_DUEL_REVERSE:
    case Action.ADD_DUEL_POWERUP:
    case Action.ADD_DUEL_START_BLUE:
    case Action.ADD_DUEL_START_RED:
      if (!movedAtAll && !ctrlKey) {
        if (!clickedSpace) {
          _clearSelectedSpaces();
        }
        else {
          _setSelectedSpace(clickedSpaceIdx);
        }
      }
      break;

    case Action.MARK_STAR:
      if (!moved) {
        _toggleHostsStar(selectedSpaces);
      }
      break;

    case Action.LINE:
    case Action.LINE_STICKY:
      renderConnections();
      break;

    case Action.ERASE:
    case Action.ROTATE:
      break;
  }
}

function onEditorRightClick(event: MouseEvent) {
  //console.log("onEditorRightClick", event);

  event.preventDefault();
  event.stopPropagation();

  const selectedSpaces = _getSelectedSpaces();
  const space = selectedSpaces.length !== 1 ? null : selectedSpaces[0];
  updateRightClickMenu(space);
};

function onEditorDrop(event: DragEvent) {
  event.preventDefault();

  if (currentBoardIsROM())
    return;

  if (rightClickOpen())
    updateRightClickMenu(null);

  if (!event.dataTransfer)
    return;

  let data;
  try {
    data = JSON.parse(event.dataTransfer.getData("text"));
  } catch (e) {
    return;
  }

  if (typeof data === "object") {
    if (data.action) {
      _clearSelectedSpaces();

      const canvas = event.currentTarget as HTMLCanvasElement;
      canvasRect = canvas.getBoundingClientRect();
      const clickX = event.clientX - canvasRect.left;
      const clickY = event.clientY - canvasRect.top;
      const droppedOnSpaceIdx = _getClickedSpace(clickX, clickY);
      const curBoard = getCurrentBoard();
      const curSpace = droppedOnSpaceIdx === -1 ? null : curBoard.spaces[droppedOnSpaceIdx];
      _addSpace(data.action.type, clickX, clickY, curSpace, false, false);
    }
    else if (data.isEventParamDrop) {
      const handler = getEventParamDropHandler();
      if (handler) {
        const canvas = event.currentTarget as HTMLCanvasElement;
        canvasRect = canvas.getBoundingClientRect();
        const clickX = event.clientX - canvasRect.left;
        const clickY = event.clientY - canvasRect.top;
        const droppedOnSpaceIdx = _getClickedSpace(clickX, clickY);
        handler(droppedOnSpaceIdx);
      }
    }
  }
}

function onEditorKeyDown(event: KeyboardEvent) {
  const selectedSpaces = getSelectedSpaces();
  if (!selectedSpaces || !selectedSpaces.length)
    return;

  const board = getCurrentBoard();

  if (event.keyCode === 38) { // up arrow
    selectedSpaces.forEach(space => {
      space.y = Math.max(space.y - 1, 0);
    });
    changeSelectedSpaces(selectedSpaces);
  }
  else if (event.keyCode === 40) { // down arrow
    selectedSpaces.forEach(space => {
      space.y = Math.min(space.y + 1, board.bg.height);
    });
    changeSelectedSpaces(selectedSpaces);
  }
  else if (event.keyCode === 37) { // left arrow
    selectedSpaces.forEach(space => {
      space.x = Math.max(space.x - 1, 0);
    });
    changeSelectedSpaces(selectedSpaces);
  }
  else if (event.keyCode === 39) { // right arrow
    selectedSpaces.forEach(space => {
      space.x = Math.min(space.x + 1, board.bg.width);
    });
    changeSelectedSpaces(selectedSpaces);
  }
  else if (event.keyCode === 46) { // delete
    // If any characters are on the spaces, first press just deletes them.
    // If there are no characters, selected spaces are deleted.
    let onlySubtype = false
    selectedSpaces.forEach(space => {
      if (space.subtype !== undefined) {
        onlySubtype = true;
      }
    });
    selectedSpaces.forEach(space => {
      // Delete the character(s) off first.
      if (onlySubtype) {
        if (space.subtype !== undefined) {
          delete space.subtype;
        }
      }
      else {
        let index = getSpaceIndex(space, board);
        if (_canRemoveSpaceAtIndex(board, index)) {
          removeSpace(index, board);
        }
      }
    });
    if (onlySubtype) {
      changeSelectedSpaces(selectedSpaces);
    }
    else {
      changeSelectedSpaces([]);
    }
  }
}

function onEditorMouseOut(event: MouseEvent) {
  spaceWasMouseDownedOn = false;

  if (event.button !== 0)
    return;
  if (currentBoardIsROM())
    return;

  const curAction = getCurrentAction();
  const doingSelectionBox = !spaceWasMouseDownedOn && curAction === Action.MOVE;
  if (doingSelectionBox) {
    _clearSelectionBox();

    startX = lastX = -1;
    startY = lastY = -1;
  }
}

let _renderConnectionsTimer: any;
function renderConnectionsOnTimeout() {
  if (!_renderConnectionsTimer) {
    _renderConnectionsTimer = setTimeout(_renderConnectionsTimeoutFn, 10);
  }
}
function _renderConnectionsTimeoutFn() {
  renderConnections();
  _renderConnectionsTimer = null;
}

let _renderSpacesTimer: any;
function renderSpacesOnTimeout() {
  if (!_renderSpacesTimer) {
    _renderSpacesTimer = setTimeout(_renderSpacesTimeoutFn, 10);
  }
}
function _renderSpacesTimeoutFn() {
  renderSpaces();
  renderSelectedSpaces();
  _renderSpacesTimer = null;
}

function _clearSelectedSpaces() {
  selectedSpaceIndices = {};
  changeSelectedSpaces([]);
}

function _changeSelectedSpaces() {
  changeSelectedSpaces(_getSelectedSpaces());
}

function _getSelectedSpaces() {
  const curBoard = getCurrentBoard();
  const selectedSpaces = [];
  for (let index in selectedSpaceIndices) {
    let space = curBoard.spaces[index];
    selectedSpaces.push(space);
  }
  return selectedSpaces;
}

function _hasAnySelectedSpace() {
  for (let index in selectedSpaceIndices) {
    return true;
  }
  return false;
}

function _spaceIsSelected(spaceIndex: number) {
  return !!selectedSpaceIndices[spaceIndex];
}

function _addSelectedSpace(spaceIndex: number, skipUpdate?: boolean) {
  if (!selectedSpaceIndices) {
    selectedSpaceIndices = {};
  }
  selectedSpaceIndices[spaceIndex] = true;
  if (!skipUpdate)
    _changeSelectedSpaces();
}

function _setSelectedSpace(spaceIndex: number) {
  selectedSpaceIndices = {
    [spaceIndex]: true,
  };
  _changeSelectedSpaces();
}

function _getSpaceRadius() {
  const curBoard = getCurrentBoard();
  return curBoard.game === 3 ? 14 : 8;
}

function _getClickedSpace(x: number, y: number) {
  const curBoard = getCurrentBoard();
  const spaceRadius = _getSpaceRadius();

  // Search for the last space that could be clicked. (FIXME: consider circular shape.)
  let spaceIdx = -1;
  for (let index = 0; index < curBoard.spaces.length; index++) {
    let space = curBoard.spaces[index];
    if (!space)
      continue;

    if (Math.abs(space.x - x) <= spaceRadius && Math.abs(space.y - y) <= spaceRadius)
      spaceIdx = index;
  }

  return spaceIdx;
}

function _canRemoveSpaceAtIndex(board: IBoard, spaceIndex: number) {
  const space = board.spaces[spaceIndex];
  if (!space)
    return false;

  // Don't allow removing the last start space, since in
  // non-advanced mode you can't add it back.
  if (space.type === Space.START) {
    const startSpaces = getSpacesOfType(Space.START, board);
    return startSpaces.length > 1;
  }

  return true;
}

function _addSpace(action: Action, x: number, y: number, clickedSpace?: ISpace | null, moved?: boolean, ctrlKey?: boolean) {
  let spaceType = _getSpaceTypeFromAction(action);
  let spaceSubType = _getSpaceSubTypeFromAction(action);
  let shouldChangeSelection = false;
  if (clickedSpace) {
    // If we are clicking a space, the only "add" action could be to toggle subtype.
    if (spaceSubType !== undefined && !moved) {
      if (clickedSpace.type !== Space.OTHER && spaceSubType === SpaceSubtype.GATE) {
        // Don't add gate to non-invisible space.
      }
      else if (clickedSpace.subtype === spaceSubType)
        delete clickedSpace.subtype;
      else
        clickedSpace.subtype = spaceSubType;

      changeSelectedSpaces([clickedSpace]);
      shouldChangeSelection = true;
    }
  }
  else {
    const curBoard = getCurrentBoard();
    const coords = getClicked2DPlaneCoord(x, y);
    const newSpaceIdx = addSpace(coords.x, coords.y, spaceType, spaceSubType);
    const newSpace = curBoard.spaces[newSpaceIdx];

    if (ctrlKey) {
      const selectedSpaces = getSelectedSpaces() || [];
      selectedSpaces.push(newSpace);
      changeSelectedSpaces(selectedSpaces);
    }
    else {
      changeSelectedSpaces([newSpace]);
    }
    shouldChangeSelection = true;
  }

  renderSpaces();
  return shouldChangeSelection;
}

function _toggleHostsStar(selectedSpaces?: ISpace[]) {
  if (!selectedSpaces || !selectedSpaces.length)
    return;

  selectedSpaces.forEach(space => {
    space.star = !space.star;
  });

  renderSpaces();
  changeSelectedSpaces(selectedSpaces); // Refresh because .star changed
}

function _eraseLines(x: number, y: number) {
  let board = getCurrentBoard();
  let spaces = board.spaces;
  let links = board.links;
  let somethingErased = false;
  for (let startIdx in links) {
    let startSpace = spaces[startIdx];
    let endSpace;
    let endLinks = links[startIdx];
    if (Array.isArray(endLinks)) {
      let i = 0;
      while (i < endLinks.length) {
        endSpace = spaces[endLinks[i]];
        if (_shouldEraseLine(startSpace, endSpace, x, y)) {
          endLinks.splice(i, 1);
          somethingErased = true;
        }
        else i++;
      }
      if (endLinks.length === 1)
        endLinks = endLinks[0];
      else if (!endLinks.length)
        delete links[startIdx];
    }
    else {
      endSpace = spaces[endLinks];
      if (_shouldEraseLine(startSpace, endSpace, x, y)) {
        delete links[startIdx];
        somethingErased = true;
      }
    }
  }
  if (somethingErased)
    renderConnections();
}

function _shouldEraseLine(startSpace: ISpace, endSpace: ISpace, targetX: number, targetY: number) {
  if (targetX > startSpace.x && targetX > endSpace.x)
    return false;
  if (targetX < startSpace.x && targetX < endSpace.x)
    return false;
  if (targetY > startSpace.y && targetY > endSpace.y)
    return false;
  if (targetY < startSpace.y && targetY < endSpace.y)
    return false;
  return lineDistance(targetX, targetY, startSpace.x, startSpace.y, endSpace.x, endSpace.y) <= 4;
}

function _getSpaceTypeFromAction(action: Action) {
  let spaceType = Space.OTHER;
  if (action === Action.ADD_BLUE) spaceType = Space.BLUE;
  else if (action === Action.ADD_RED) spaceType = Space.RED;
  else if (action === Action.ADD_HAPPENING) spaceType = Space.HAPPENING;
  else if (action === Action.ADD_STAR) spaceType = Space.STAR;
  else if (action === Action.ADD_BLACKSTAR) spaceType = Space.BLACKSTAR;
  else if (action === Action.ADD_MINIGAME) spaceType = Space.MINIGAME;
  else if (action === Action.ADD_CHANCE) spaceType = Space.CHANCE;
  else if (action === Action.ADD_START) spaceType = Space.START;
  else if (action === Action.ADD_SHROOM) spaceType = Space.SHROOM;
  else if (action === Action.ADD_BOWSER) spaceType = Space.BOWSER;
  else if (action === Action.ADD_ITEM) spaceType = Space.ITEM;
  else if (action === Action.ADD_BATTLE) spaceType = Space.BATTLE;
  else if (action === Action.ADD_BANK) spaceType = Space.BANK;
  else if (action === Action.ADD_ARROW) spaceType = Space.ARROW;
  else if (action === Action.ADD_GAMEGUY) spaceType = Space.GAMEGUY;
  else if (action === Action.ADD_DUEL_BASIC) spaceType = Space.DUEL_BASIC;
  else if (action === Action.ADD_DUEL_REVERSE) spaceType = Space.DUEL_REVERSE;
  else if (action === Action.ADD_DUEL_POWERUP) spaceType = Space.DUEL_POWERUP;
  else if (action === Action.ADD_DUEL_START_BLUE) spaceType = Space.DUEL_START_BLUE;
  else if (action === Action.ADD_DUEL_START_RED) spaceType = Space.DUEL_START_RED;
  return spaceType;
}

function _getSpaceSubTypeFromAction(action: Action) {
  let spaceSubType;
  if (action === Action.ADD_TOAD_CHARACTER) spaceSubType = SpaceSubtype.TOAD;
  else if (action === Action.ADD_BOWSER_CHARACTER) spaceSubType = SpaceSubtype.BOWSER;
  else if (action === Action.ADD_KOOPA_CHARACTER) spaceSubType = SpaceSubtype.KOOPA;
  else if (action === Action.ADD_BOO_CHARACTER) spaceSubType = SpaceSubtype.BOO;
  else if (action === Action.ADD_BANK_SUBTYPE) spaceSubType = SpaceSubtype.BANK;
  else if (action === Action.ADD_BANKCOIN_SUBTYPE) spaceSubType = SpaceSubtype.BANKCOIN;
  else if (action === Action.ADD_ITEMSHOP_SUBTYPE) spaceSubType = SpaceSubtype.ITEMSHOP;
  else if (action === Action.MARK_GATE) spaceSubType = SpaceSubtype.GATE;
  return spaceSubType;
}

function _updateSelectionAndBox(curX: number, curY: number) {
  if (startX === -1 || startY === -1)
    return;

  _clearSelectedSpaces();
  const curBoard = getCurrentBoard();
  const spaces = curBoard.spaces;
  for (let i = 0; i < spaces.length; i++) {
    const space = spaces[i];
    if (pointFallsWithin(space.x, space.y, startX, startY, curX, curY)) {
      _addSelectedSpace(i, true);
    }
  }
  _changeSelectedSpaces();

  drawSelectionBox(startX, startY, curX, curY);
}

function _clearSelectionBox() {
  renderSpaces(); // It's on the space canvas, so just re-render.
}

function preventDefault(event: Event) { event.preventDefault(); }

export function attachToCanvas(canvas: HTMLCanvasElement) {
  canvas.addEventListener("contextmenu", onEditorRightClick, false);
  canvas.addEventListener("click", onEditorClick, false);
  canvas.addEventListener("mousedown", onEditorMouseDown, false);
  canvas.addEventListener("mousemove", onEditorMouseMove, false);
  canvas.addEventListener("mouseup", onEditorMouseUp, false);
  canvas.addEventListener("mouseout", onEditorMouseOut, false);
  canvas.addEventListener("touchstart", onEditorTouchStart, false);
  canvas.addEventListener("touchmove", onEditorTouchMove, false);
  canvas.addEventListener("touchend", onEditorTouchEnd, false);
  canvas.addEventListener("drop", onEditorDrop, false);
  canvas.addEventListener("dragover", preventDefault, false);
  canvas.addEventListener("keydown", onEditorKeyDown, false);
}

export function detachFromCanvas(canvas: HTMLCanvasElement) {
  canvas.removeEventListener("contextmenu", onEditorRightClick);
  canvas.removeEventListener("click", onEditorClick);
  canvas.removeEventListener("mousedown", onEditorMouseDown);
  canvas.removeEventListener("mousemove", onEditorMouseMove);
  canvas.removeEventListener("mouseup", onEditorMouseUp);
  canvas.removeEventListener("mouseout", onEditorMouseOut);
  canvas.removeEventListener("touchstart", onEditorTouchStart);
  canvas.removeEventListener("touchmove", onEditorTouchMove);
  canvas.removeEventListener("touchend", onEditorTouchEnd);
  canvas.removeEventListener("drop", onEditorDrop);
  canvas.removeEventListener("dragover", preventDefault);
  canvas.removeEventListener("keydown", onEditorKeyDown);
}
