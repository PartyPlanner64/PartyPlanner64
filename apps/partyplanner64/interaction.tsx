import { rightClickOpen, updateRightClickMenu } from "./renderer";
import {
  pointFallsWithin,
  determineAngle,
  radiansToDegrees,
} from "../../packages/lib/utils/number";
import {
  getCurrentBoard,
  addSpace,
  currentBoardIsROM,
  removeSpace,
  addConnection,
  setSpaceRotation,
  copyCurrentBoard,
  setHostsStar,
} from "./boards";
import { Action, Space, SpaceSubtype } from "../../packages/lib/types";
import { getEventParamDropHandler } from "../../packages/lib/utils/drag";
import { $$log, $$hex } from "../../packages/lib/utils/debug";
import {
  changeCurrentAction,
  changeSelectedSpaces,
  clearSelectedSpaces,
  drawConnection,
  getCurrentAction,
  getSelectedSpaceIndices,
  getSelectedSpaces,
  getValidSelectedSpaceIndices,
} from "./appControl";
import { getMouseCoordsOnCanvas } from "../../packages/lib/utils/canvas";
import {
  addSelectedSpaceAction,
  eraseConnectionsAction,
  removeSpacesAction,
  selectSelectedSpaceIndices,
  setSelectedSpaceAction,
  setSelectionBoxCoordsAction,
  setSpacePositionsAction,
  setSpaceSubtypeAction,
  setTemporaryUIConnections,
} from "./boardState";
import { store } from "./store";
import { isEmpty } from "../../packages/lib/utils/obj";
import {
  getSpaceIndex,
  getSpacesOfType,
  IBoard,
  ISpace,
} from "../../packages/lib/boards";

let spaceWasMouseDownedOn = false;
let startX = -1;
let startY = -1;
let lastX = -1;
let lastY = -1;

let canvasRect: (ClientRect | DOMRect) | null = null;

function onEditorMouseDown(event: MouseEvent) {
  const canvas = event.currentTarget as HTMLElement;
  _onEditorDown(canvas, event.clientX, event.clientY, event.ctrlKey);
}

function onEditorTouchStart(event: TouchEvent) {
  if (event.touches.length !== 1) return;

  const touch = event.touches[0];

  const canvas = event.currentTarget as HTMLElement;
  _onEditorDown(canvas, touch.clientX, touch.clientY, event.ctrlKey);
}

/** mousedown or touchstart */
function _onEditorDown(
  canvas: HTMLElement,
  clientX: number,
  clientY: number,
  ctrlKey: boolean,
) {
  canvasRect = canvas.getBoundingClientRect();

  const [clickX, clickY] = getMouseCoordsOnCanvas(canvas, clientX, clientY);

  startX = lastX = clickX;
  startY = lastY = clickY;

  const clickedSpaceIndex = _getClickedSpace(lastX, lastY);
  $$log(
    `Clicked space: ${$$hex(clickedSpaceIndex)} (${clickedSpaceIndex})`,
    getCurrentBoard().spaces[clickedSpaceIndex],
  );

  const spaceWasClicked = clickedSpaceIndex !== -1;

  // ROM boards cannot be edited, so create a copy right now and switch to it.
  if (currentBoardIsROM() && spaceWasClicked) {
    changeCurrentAction(Action.MOVE); // Avoid destructive actions like delete.
    clearSelectedSpaces();
    copyCurrentBoard(true);
  }

  const curAction = getCurrentAction();
  switch (curAction) {
    case Action.MOVE:
      if (spaceWasClicked) {
        if (ctrlKey) {
          _addSelectedSpace(clickedSpaceIndex);
        } else if (!_spaceIsSelected(clickedSpaceIndex)) {
          _setSelectedSpace(clickedSpaceIndex);
        }
      } else {
        clearSelectedSpaces();
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
        } else if (!_spaceIsSelected(clickedSpaceIndex)) {
          _setSelectedSpace(clickedSpaceIndex);
        }
      } else if (!ctrlKey) {
        clearSelectedSpaces();
      }
      break;
    case Action.LINE:
    case Action.LINE_STICKY:
    case Action.ROTATE:
      if (spaceWasClicked) {
        _setSelectedSpace(clickedSpaceIndex);
      } else {
        clearSelectedSpaces();
      }
      break;
    case Action.ERASE:
      clearSelectedSpaces();
      break;
  }

  const selectedSpaces = getSelectedSpaces();
  const curBoard = getCurrentBoard();
  const clickedSpace = curBoard.spaces[clickedSpaceIndex];

  switch (curAction) {
    case Action.LINE:
      if (selectedSpaces.length === 1) {
        const space = selectedSpaces[0];

        // Draw a line from the start space to the current location.
        drawConnection(space.x, space.y, clickX, clickY);

        if (rightClickOpen()) {
          updateRightClickMenu(-1);
        }
      }
      break;

    case Action.LINE_STICKY:
      if (selectedSpaces.length === 1) {
        const space = selectedSpaces[0];

        // Make a connection if we are in sticky mode and have reached a new space.
        if (clickedSpace && clickedSpace !== space) {
          const selectedSpaceIndex = getSpaceIndex(space, curBoard);
          addConnection(selectedSpaceIndex, clickedSpaceIndex);
          _setSelectedSpace(clickedSpaceIndex);
        } else {
          // Draw a line from the start space to the current location.
          drawConnection(space.x, space.y, clickX, clickY);
        }
      }
      break;

    case Action.ROTATE:
      break;

    case Action.ERASE:
      if (
        clickedSpaceIndex !== -1 &&
        _canRemoveSpaceAtIndex(curBoard, clickedSpaceIndex)
      ) {
        removeSpace(clickedSpaceIndex);
        clearSelectedSpaces();
      } else {
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
    case Action.ADD_DUEL_BASIC:
    case Action.ADD_DUEL_REVERSE:
    case Action.ADD_DUEL_POWERUP:
    case Action.ADD_DUEL_START_BLUE:
    case Action.ADD_DUEL_START_RED:
      _addSpace(curAction, clickX, clickY, clickedSpaceIndex, false, ctrlKey);
      break;

    case Action.MARK_STAR:
    case Action.MARK_GATE:
    case Action.ADD_TOAD_CHARACTER:
    case Action.ADD_BOWSER_CHARACTER:
    case Action.ADD_KOOPA_CHARACTER:
    case Action.ADD_BOO_CHARACTER:
    case Action.ADD_BANK_SUBTYPE:
    case Action.ADD_BANKCOIN_SUBTYPE:
    case Action.ADD_ITEMSHOP_SUBTYPE:
      if (clickedSpaceIndex === -1) {
        _addSpace(curAction, clickX, clickY, clickedSpaceIndex, false, ctrlKey);
      }
      break;

    case Action.MOVE:
    default:
      if (rightClickOpen()) {
        updateRightClickMenu(getValidSelectedSpaceIndices()[0]);
      }
      break;
  }

  spaceWasMouseDownedOn = spaceWasClicked;
}

function onEditorTouchMove(event: TouchEvent) {
  if (event.touches.length !== 1) return;

  if (!_hasAnySelectedSpace()) return;

  event.preventDefault(); // Don't drag around the board.

  const touch = event.touches[0];

  const clickX = touch.clientX - canvasRect!.left;
  const clickY = touch.clientY - canvasRect!.top;

  _onEditorMove(clickX, clickY);
}

function onEditorMouseMove(event: MouseEvent) {
  if (!canvasRect || event.buttons !== 1) return;

  const clickX = event.clientX - canvasRect.left;
  const clickY = event.clientY - canvasRect.top;

  _onEditorMove(clickX, clickY);
}

function _onEditorMove(clickX: number, clickY: number) {
  if (currentBoardIsROM()) return;

  clickX = Math.round(clickX);
  clickY = Math.round(clickY);

  const curAction = getCurrentAction();
  const selectedSpaceIndices = getValidSelectedSpaceIndices();
  const selectedSpaces = getSelectedSpaces();
  const curBoard = getCurrentBoard();
  const clickedSpaceIndex = _getClickedSpace(clickX, clickY);

  switch (curAction) {
    case Action.LINE:
      if (selectedSpaces.length === 1) {
        const space = selectedSpaces[0];

        // Draw a line from the start space to the current location.
        drawConnection(space.x, space.y, clickX, clickY);

        if (rightClickOpen()) {
          updateRightClickMenu(-1);
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
        } else {
          // Draw a line from the start space to the current location.
          drawConnection(space.x, space.y, clickX, clickY);
        }
      }
      break;

    case Action.ROTATE:
      if (selectedSpaces.length === 1) {
        const space = selectedSpaces[0];
        if (space.type === Space.ARROW) {
          // Adjust rotation of the space.
          const angleXAxisRad = determineAngle(
            space.x,
            space.y,
            clickX,
            clickY,
          );
          const angleYAxisRad = (Math.PI * 1.5 + angleXAxisRad) % (Math.PI * 2);
          const angleYAxisDeg = radiansToDegrees(angleYAxisRad);
          const selectedSpaceIndex = getSpaceIndex(space, curBoard);
          //$$log(`Space ${selectedSpaceIndex} rotated ${angleYAxisDeg} degrees`);
          setSpaceRotation(selectedSpaceIndex, angleYAxisDeg);
        }
      }
      break;

    case Action.ERASE:
      if (
        clickedSpaceIndex !== -1 &&
        _canRemoveSpaceAtIndex(curBoard, clickedSpaceIndex)
      ) {
        removeSpace(clickedSpaceIndex);
        clearSelectedSpaces();
      } else {
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
      {
        const doingSelectionBox =
          !spaceWasMouseDownedOn && curAction === Action.MOVE;
        if (!doingSelectionBox && selectedSpaces.length) {
          // Move the space(s)
          const deltaX = clickX - lastX;
          const deltaY = clickY - lastY;

          const indicesToUpdate = [];
          const coordsToUpdate = [];

          for (const spaceIndex of selectedSpaceIndices) {
            const space = curBoard.spaces[spaceIndex];
            if (space) {
              indicesToUpdate.push(spaceIndex);

              const newX = Math.round(space.x) + deltaX;
              const newY = Math.round(space.y) + deltaY;
              coordsToUpdate.push({
                x: Math.max(0, Math.min(newX, curBoard.bg.width)),
                y: Math.max(0, Math.min(newY, curBoard.bg.height)),
              });
            }
          }

          if (indicesToUpdate.length) {
            store.dispatch(
              setSpacePositionsAction({
                spaceIndices: indicesToUpdate,
                coords: coordsToUpdate,
              }),
            );
          }

          if (rightClickOpen()) {
            updateRightClickMenu(selectedSpaceIndices[0]);
          }
        }
        if (doingSelectionBox) {
          // Draw selection box, update selection.
          _updateSelectionAndBox(clickX, clickY);
        }
      }
      break;
  }

  //$$log("dX: " + deltaX + ", dY: " + deltaY);

  lastX = clickX;
  lastY = clickY;
}

function onEditorMouseUp(event: MouseEvent) {
  if (event.button !== 0) return;

  _onEditorUp();
}

function onEditorTouchEnd(event: TouchEvent) {
  if (event.touches.length !== 1) return;

  _onEditorUp();
}

function _onEditorUp() {
  if (currentBoardIsROM()) return;

  const curAction = getCurrentAction();
  switch (curAction) {
    case Action.MOVE:
      if (!spaceWasMouseDownedOn) {
        // Clear the selection we were drawing.
        _clearSelectionBox();
      }
      break;

    case Action.LINE:
      {
        const selectedSpaceIndices = getValidSelectedSpaceIndices();
        const endSpaceIdx = _getClickedSpace(lastX, lastY);
        if (endSpaceIdx !== -1) {
          for (const index of selectedSpaceIndices) {
            addConnection(index, endSpaceIdx);
          }
        }

        _clearTemporaryConnections();
      }
      break;

    case Action.LINE_STICKY:
      _clearTemporaryConnections();
      break;
  }
}

function onEditorClick(event: MouseEvent) {
  //console.log("onEditorClick", event);
  if (currentBoardIsROM()) return;

  const moved = Math.abs(startX - lastX) > 5 || Math.abs(startY - lastY) > 5;
  const movedAtAll =
    Math.abs(startX - lastX) > 0 || Math.abs(startY - lastY) > 0;

  startX = lastX = -1;
  startY = lastY = -1;

  const ctrlKey = event.ctrlKey;
  const clientX = Math.round(event.clientX);
  const clientY = Math.round(event.clientY);
  const clickX = clientX - Math.round(canvasRect!.left);
  const clickY = clientY - Math.round(canvasRect!.top);
  const clickedSpaceIdx = _getClickedSpace(clickX, clickY);

  const curBoard = getCurrentBoard();
  const clickedSpace =
    clickedSpaceIdx === -1 ? null : curBoard.spaces[clickedSpaceIdx];

  if (event.button !== 0) return;

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
    case Action.ADD_DUEL_BASIC:
    case Action.ADD_DUEL_REVERSE:
    case Action.ADD_DUEL_POWERUP:
    case Action.ADD_DUEL_START_BLUE:
    case Action.ADD_DUEL_START_RED:
      if (!movedAtAll && !ctrlKey) {
        if (!clickedSpace) {
          clearSelectedSpaces();
        } else {
          _setSelectedSpace(clickedSpaceIdx);
        }
      }
      break;

    case Action.MARK_GATE:
    case Action.ADD_TOAD_CHARACTER:
    case Action.ADD_BOWSER_CHARACTER:
    case Action.ADD_KOOPA_CHARACTER:
    case Action.ADD_BOO_CHARACTER:
    case Action.ADD_BANK_SUBTYPE:
    case Action.ADD_BANKCOIN_SUBTYPE:
    case Action.ADD_ITEMSHOP_SUBTYPE:
      // Toggle the subtype only at the moment of mouse up, if we didn't move.
      if (spaceWasMouseDownedOn) {
        _addSpace(curAction, clickX, clickY, clickedSpaceIdx, moved, ctrlKey);
      }
      if (!movedAtAll && !ctrlKey) {
        if (!clickedSpace) {
          clearSelectedSpaces();
        } else {
          _setSelectedSpace(clickedSpaceIdx);
        }
      }
      break;

    case Action.MARK_STAR:
      if (!moved) {
        _toggleHostsStar(getValidSelectedSpaceIndices());
      }
      break;

    case Action.LINE:
    case Action.LINE_STICKY:
      _clearTemporaryConnections();
      break;

    case Action.ERASE:
    case Action.ROTATE:
      break;
  }

  spaceWasMouseDownedOn = false;
}

function onEditorRightClick(event: MouseEvent) {
  //console.log("onEditorRightClick", event);

  event.preventDefault();
  event.stopPropagation();

  const selectedSpaceIndices = getValidSelectedSpaceIndices();
  const space =
    selectedSpaceIndices.length !== 1 ? -1 : selectedSpaceIndices[0];
  updateRightClickMenu(space);
}

function onEditorDrop(event: DragEvent) {
  event.preventDefault();

  if (currentBoardIsROM()) return;

  if (rightClickOpen()) updateRightClickMenu(-1);

  if (!event.dataTransfer) return;

  let data;
  try {
    data = JSON.parse(event.dataTransfer.getData("text"));
  } catch (e) {
    return;
  }

  const canvas = event.currentTarget as HTMLElement;
  const [clickX, clickY] = getMouseCoordsOnCanvas(
    canvas,
    event.clientX,
    event.clientY,
  );
  canvasRect = canvas.getBoundingClientRect();
  const droppedOnSpaceIdx = _getClickedSpace(clickX, clickY);

  if (typeof data === "object") {
    if (data.action) {
      clearSelectedSpaces();
      _addSpace(
        data.action.type,
        clickX,
        clickY,
        droppedOnSpaceIdx,
        false,
        false,
      );
    } else if (data.isEventParamDrop) {
      const handler = getEventParamDropHandler();
      if (handler) {
        handler(droppedOnSpaceIdx);
      }
    }
  }
}

function onEditorKeyDown(event: KeyboardEvent) {
  const selectedSpaces = getSelectedSpaces();
  if (!selectedSpaces || !selectedSpaces.length) return;

  const selectedSpaceIndices = getValidSelectedSpaceIndices();
  const board = getCurrentBoard();

  switch (event.key) {
    case "Up":
    case "ArrowUp":
      _updateSpaceCoords(selectedSpaceIndices, board, (space) => ({
        y: Math.max(space.y - 1, 0),
      }));
      break;

    case "Down":
    case "ArrowDown":
      _updateSpaceCoords(selectedSpaceIndices, board, (space) => ({
        y: Math.min(space.y + 1, board.bg.height),
      }));
      break;

    case "Left":
    case "ArrowLeft":
      _updateSpaceCoords(selectedSpaceIndices, board, (space) => ({
        x: Math.max(space.x - 1, 0),
      }));
      break;

    case "Right":
    case "ArrowRight":
      _updateSpaceCoords(selectedSpaceIndices, board, (space) => ({
        x: Math.min(space.x + 1, board.bg.width),
      }));
      break;

    case "Delete":
      {
        // If any characters are on the spaces, first press just deletes them.
        // If there are no characters, selected spaces are deleted.
        let onlySubtype = false;
        selectedSpaces.forEach((space) => {
          if (space.subtype !== undefined) {
            onlySubtype = true;
          }
        });

        if (onlySubtype) {
          // Delete the character(s) off first.
          store.dispatch(
            setSpaceSubtypeAction({
              spaceIndices: selectedSpaceIndices,
              subtype: undefined,
            }),
          );
        } else {
          const spaceIndicesToRemove: number[] = [];
          selectedSpaceIndices.forEach((spaceIndex) => {
            if (_canRemoveSpaceAtIndex(board, spaceIndex)) {
              spaceIndicesToRemove.push(spaceIndex);
            }
          });
          if (spaceIndicesToRemove.length > 0) {
            store.dispatch(
              removeSpacesAction({ spaceIndices: spaceIndicesToRemove }),
            );
          }

          clearSelectedSpaces();
        }
      }
      break;
  }
}

function onEditorMouseOut(event: MouseEvent) {
  if (event.button !== 0) return;
  if (currentBoardIsROM()) return;

  const curAction = getCurrentAction();
  const doingSelectionBox = !spaceWasMouseDownedOn && curAction === Action.MOVE;
  if (doingSelectionBox) {
    _clearSelectionBox();

    startX = lastX = -1;
    startY = lastY = -1;
  }
}

function _hasAnySelectedSpace() {
  return !isEmpty(getSelectedSpaceIndices());
}

function _spaceIsSelected(spaceIndex: number) {
  const selectedSpaceIndices = selectSelectedSpaceIndices(store.getState());
  return !!selectedSpaceIndices[spaceIndex];
}

function _addSelectedSpace(spaceIndex: number) {
  store.dispatch(addSelectedSpaceAction(spaceIndex));
}

function _setSelectedSpace(spaceIndex: number) {
  store.dispatch(setSelectedSpaceAction(spaceIndex));
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
    const space = curBoard.spaces[index];
    if (!space) continue;

    if (
      Math.abs(space.x - x) <= spaceRadius &&
      Math.abs(space.y - y) <= spaceRadius
    )
      spaceIdx = index;
  }

  return spaceIdx;
}

function _canRemoveSpaceAtIndex(board: IBoard, spaceIndex: number) {
  const space = board.spaces[spaceIndex];
  if (!space) return false;

  // Don't allow removing the last start space, since in
  // non-advanced mode you can't add it back.
  if (space.type === Space.START) {
    const startSpaces = getSpacesOfType(Space.START, board);
    return startSpaces.length > 1;
  }

  return true;
}

function _addSpace(
  action: Action,
  x: number,
  y: number,
  clickedSpaceIndex: number,
  moved?: boolean,
  ctrlKey?: boolean,
) {
  const clickedSpace = getCurrentBoard().spaces[clickedSpaceIndex];

  const spaceType = _getSpaceTypeFromAction(action);
  const spaceSubType = _getSpaceSubTypeFromAction(action);
  let shouldChangeSelection = false;
  if (clickedSpace) {
    // If we are clicking a space, the only "add" action could be to toggle subtype.
    if (spaceSubType !== undefined && !moved) {
      if (clickedSpace.subtype === spaceSubType) {
        store.dispatch(
          setSpaceSubtypeAction({
            spaceIndices: [clickedSpaceIndex],
            subtype: undefined,
          }),
        );
      } else if (_canSetSubtypeOnSpaceType(clickedSpace.type, spaceSubType)) {
        store.dispatch(
          setSpaceSubtypeAction({
            spaceIndices: [clickedSpaceIndex],
            subtype: spaceSubType,
          }),
        );
      }

      changeSelectedSpaces([clickedSpaceIndex]);
      shouldChangeSelection = true;
    }
  } else {
    const newSpaceIdx = addSpace(x, y, spaceType, spaceSubType);
    if (ctrlKey) {
      _addSelectedSpace(newSpaceIdx);
    } else {
      changeSelectedSpaces([newSpaceIdx]);
    }
    shouldChangeSelection = true;
  }

  return shouldChangeSelection;
}

function _canSetSubtypeOnSpaceType(
  type: Space,
  subtype: SpaceSubtype,
): boolean {
  if (type !== Space.OTHER && subtype === SpaceSubtype.GATE) {
    // Don't add gate to non-invisible space.
    return false;
  }
  return true;
}

type SpaceCoordUpdater = (space: ISpace) => {
  x?: number;
  y?: number;
  z?: number;
};

function _updateSpaceCoords(
  spaceIndices: number[],
  board: IBoard,
  updater: SpaceCoordUpdater,
) {
  const indicesToUpdate = [];
  const coordsToUpdate = [];
  for (const spaceIndex of spaceIndices) {
    const space = board.spaces[spaceIndex];
    if (space) {
      indicesToUpdate.push(spaceIndex);
      coordsToUpdate.push(updater(space));
    }
  }
  if (indicesToUpdate.length) {
    store.dispatch(
      setSpacePositionsAction({
        spaceIndices: indicesToUpdate,
        coords: coordsToUpdate,
      }),
    );
  }
}

function _toggleHostsStar(selectedSpacesIndices: number[]) {
  if (!selectedSpacesIndices.length) return;

  // If any space does not have star hosting, we add to all.
  // Otherwise remove from all.
  let adding = false;
  const board = getCurrentBoard();
  for (const spaceIndex of selectedSpacesIndices) {
    const space = board.spaces[spaceIndex];
    if (!space.star) {
      adding = true;
      break;
    }
  }

  setHostsStar(selectedSpacesIndices, adding);
}

function _clearTemporaryConnections(): void {
  store.dispatch(setTemporaryUIConnections({ connections: null }));
}

function _eraseLines(x: number, y: number) {
  store.dispatch(eraseConnectionsAction({ x, y }));
}

function _getSpaceTypeFromAction(action: Action): Space {
  switch (action) {
    case Action.ADD_BLUE:
      return Space.BLUE;
    case Action.ADD_RED:
      return Space.RED;
    case Action.ADD_HAPPENING:
      return Space.HAPPENING;
    case Action.ADD_STAR:
      return Space.STAR;
    case Action.ADD_BLACKSTAR:
      return Space.BLACKSTAR;
    case Action.ADD_MINIGAME:
      return Space.MINIGAME;
    case Action.ADD_CHANCE:
      return Space.CHANCE;
    case Action.ADD_START:
      return Space.START;
    case Action.ADD_SHROOM:
      return Space.SHROOM;
    case Action.ADD_BOWSER:
      return Space.BOWSER;
    case Action.ADD_ITEM:
      return Space.ITEM;
    case Action.ADD_BATTLE:
      return Space.BATTLE;
    case Action.ADD_BANK:
      return Space.BANK;
    case Action.ADD_ARROW:
      return Space.ARROW;
    case Action.ADD_GAMEGUY:
      return Space.GAMEGUY;
    case Action.ADD_DUEL_BASIC:
      return Space.DUEL_BASIC;
    case Action.ADD_DUEL_REVERSE:
      return Space.DUEL_REVERSE;
    case Action.ADD_DUEL_POWERUP:
      return Space.DUEL_POWERUP;
    case Action.ADD_DUEL_START_BLUE:
      return Space.DUEL_START_BLUE;
    case Action.ADD_DUEL_START_RED:
      return Space.DUEL_START_RED;
    default:
      return Space.OTHER;
  }
}

function _getSpaceSubTypeFromAction(action: Action): SpaceSubtype | undefined {
  switch (action) {
    case Action.ADD_TOAD_CHARACTER:
      return SpaceSubtype.TOAD;
    case Action.ADD_BOWSER_CHARACTER:
      return SpaceSubtype.BOWSER;
    case Action.ADD_KOOPA_CHARACTER:
      return SpaceSubtype.KOOPA;
    case Action.ADD_BOO_CHARACTER:
      return SpaceSubtype.BOO;
    case Action.ADD_BANK_SUBTYPE:
      return SpaceSubtype.BANK;
    case Action.ADD_BANKCOIN_SUBTYPE:
      return SpaceSubtype.BANKCOIN;
    case Action.ADD_ITEMSHOP_SUBTYPE:
      return SpaceSubtype.ITEMSHOP;
    case Action.MARK_GATE:
      return SpaceSubtype.GATE;
    default:
      return undefined;
  }
}

function _updateSelectionAndBox(curX: number, curY: number) {
  if (startX === -1 || startY === -1) return;

  clearSelectedSpaces();
  const curBoard = getCurrentBoard();
  const spaces = curBoard.spaces;
  const selectedSpaceIndices = [];
  for (let i = 0; i < spaces.length; i++) {
    const space = spaces[i];
    if (pointFallsWithin(space.x, space.y, startX, startY, curX, curY)) {
      selectedSpaceIndices.push(i);
    }
  }
  changeSelectedSpaces(selectedSpaceIndices);

  _setSelectionBox(startX, startY, curX, curY);
}

function _setSelectionBox(
  startX: number,
  startY: number,
  curX: number,
  curY: number,
): void {
  store.dispatch(
    setSelectionBoxCoordsAction({
      selectionCoords: [startX, startY, curX, curY],
    }),
  );
}

function _clearSelectionBox() {
  store.dispatch(setSelectionBoxCoordsAction({ selectionCoords: null }));
}

function preventDefault(event: Event) {
  event.preventDefault();
}

export function attachToCanvas(canvas: HTMLElement) {
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

export function detachFromCanvas(canvas: HTMLElement) {
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
