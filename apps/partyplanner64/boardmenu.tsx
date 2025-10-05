import { get, $setting } from "./views/settings";
import {
  getROMBoards,
  boardIsROM,
  setCurrentBoard,
  deleteBoard,
  copyCurrentBoard,
  getCurrentBoard,
} from "./boards";
import { IBoard } from "../../packages/lib/boards";
import * as React from "react";
import {
  showDragZone,
  setDropHandler,
  hideDragZone,
} from "../../packages/lib/utils/drag";
import { makeKeyClick } from "./utils/react";
import { MPEditor, MPEditorDisplayMode } from "./texteditor";

import * as basicContext from "basiccontext";
import { $$log } from "../../packages/lib/utils/debug";

import cartImage from "./img/boardmenu/cart.png";
import optionsImage from "./img/boardmenu/options.png";

import "./css/boardmenu.scss";

interface IBoardMenuProps {
  boards: IBoard[];
}

export class BoardMenu extends React.Component<IBoardMenuProps> {
  render() {
    const boards = this.props.boards.map(function (item, idx) {
      return <Board key={idx} board={item} index={idx} />;
    });

    const showRomBoards = !!get($setting.uiShowRomBoards);
    let romBoards;
    if (showRomBoards) {
      romBoards = getROMBoards().map(function (item, idx) {
        return <Board key={"r" + idx} board={item} index={idx} />;
      });
    }

    return (
      <div className="boardMenu" role="listbox">
        <div className="boardMenuInner" role="presentation">
          {boards}
          {romBoards}
        </div>
      </div>
    );
  }
}

interface IBoardProps {
  board: IBoard;
  index: number;
}

const Board = class Board extends React.Component<IBoardProps> {
  handleClick = () => {
    const boardIsRom = boardIsROM(this.props.board);
    setCurrentBoard(this.props.index, boardIsRom);

    $$log("Now viewing board", this.props.board);
  };

  onDragStart = (event: any) => {
    // Cannot delete courses that are within the ROM.
    if (boardIsROM(this.props.board)) {
      event.preventDefault();
      return;
    }

    showDragZone();
    event.nativeEvent.dataTransfer.setData("text/plain", this.props.index);
    setDropHandler(function (event: any) {
      event.preventDefault();
      const boardIdx = parseInt(event.dataTransfer.getData("text/plain"));
      if (isNaN(boardIdx)) return;
      hideDragZone();
      deleteBoard(boardIdx);
    });
  };

  onDragEnd = (event: any) => {
    hideDragZone();
  };

  onRightClick = (event: any) => {
    // Also in BoardOptions...
    event.preventDefault();
    const items = [
      { title: "Copy", fn: this.onCopyBoard },
      {
        title: "Delete",
        fn: this.onDeleteBoard,
        visible: !boardIsROM(this.props.board),
      },
    ];
    basicContext.show(items, event.nativeEvent);
  };

  onDeleteBoard = () => {
    deleteBoard(this.props.index);
  };

  onCopyBoard = () => {
    copyCurrentBoard();
  };

  render() {
    const tooltip = `Open "${this.props.board.name}"`;
    let className = "boardEntry";
    const isCurrent = getCurrentBoard() === this.props.board;
    if (isCurrent) className += " boardEntryCurrent";
    const boardImg = this.props.board.otherbg.boardlogo || "";
    let imgEl;
    if (boardImg) {
      imgEl = (
        <img
          className="boardEntryImg"
          src={boardImg}
          width="200"
          height="88"
          alt=""
        />
      );
    } else {
      imgEl = <div className="boardEntryNoImg" />;
    }

    const boardName = this.props.board.name;
    const isROM = boardIsROM(this.props.board);
    const onKeyDown = makeKeyClick(this.handleClick);
    return (
      <div
        className={className}
        title={tooltip}
        role="option"
        tabIndex={0}
        aria-selected={isCurrent}
        onClick={this.handleClick}
        onKeyDown={onKeyDown}
        onContextMenu={this.onRightClick}
        draggable
        onDragStart={this.onDragStart}
        onDragEnd={this.onDragEnd}
      >
        {imgEl}
        <BoardROMIcon rom={isROM} />
        <BoardName name={boardName} />
        <BoardOptions
          rom={isROM}
          onDeleteBoard={this.onDeleteBoard}
          onCopyBoard={this.onCopyBoard}
        />
      </div>
    );
  }
};

interface IBoardROMIconProps {
  rom: boolean;
}

const BoardROMIcon = class BoardROMIcon extends React.Component<IBoardROMIconProps> {
  render() {
    if (!this.props.rom) return null;
    return (
      <div className="boardEntryRomIcon" title="Loaded from ROM">
        <img src={cartImage} width="26" height="26" alt="From ROM" />
      </div>
    );
  }
};

interface IBoardNameProps {
  name: string;
}

class BoardName extends React.Component<IBoardNameProps> {
  state = { editing: false };

  handleClick = () => {
    this.setState({ editing: !!this.state.editing });
  };

  render() {
    return (
      <div className="boardName">
        <MPEditor
          value={this.props.name}
          displayMode={MPEditorDisplayMode.Display}
        />
      </div>
    );
  }
}

interface IBoardOptionsProps {
  rom: boolean;
  onCopyBoard: Function;
  onDeleteBoard: Function;
}

class BoardOptions extends React.Component<IBoardOptionsProps> {
  handleClick = (event: any) => {
    event.preventDefault();
    const items = [
      { title: "Copy", fn: this.props.onCopyBoard },
      {
        title: "Delete",
        fn: this.props.onDeleteBoard,
        visible: !this.props.rom,
      },
      // { title: 'Disabled', icon: 'ion-minus-circled', fn: this.onDeleteOption, disabled: true },
      // { title: 'Invisible', icon: 'ion-eye-disabled', fn: this.onDeleteOption, visible: false },
      // { },
      // { title: 'Logout', icon: 'ion-log-out', fn: this.onDeleteOption }
    ];

    basicContext.show(items, event.nativeEvent);
  };

  render() {
    return (
      <img
        className="boardMenuIcon"
        src={optionsImage}
        onClick={this.handleClick}
        alt="Board Options"
      />
    );
  }
}
