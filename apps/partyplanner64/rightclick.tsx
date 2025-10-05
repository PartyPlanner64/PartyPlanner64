import * as React from "react";
import { getCurrentBoard } from "./boards";
import { Space, SpaceSubtype, BoardType } from "../../packages/lib/types";
import { updateRightClickMenu } from "./renderer";
import { $setting, get } from "./views/settings";

import basic3Image from "./img/toolbar/basic3.png";
import minigameduel3Image from "./img/toolbar/minigameduel3.png";
import reverse3Image from "./img/toolbar/reverse3.png";
import happeningduel3Image from "./img/toolbar/happeningduel3.png";
import gameguyduelImage from "./img/toolbar/gameguyduel.png";
import powerupImage from "./img/toolbar/powerup.png";
import startblueImage from "./img/toolbar/startblue.png";
import startredImage from "./img/toolbar/startred.png";
import { getValidSelectedSpaceIndices } from "./appControl";
import { setSpacePositionsAction, setSpaceTypeAction } from "./boardState";
import { store } from "./store";

import { ToolbarImages } from "./images";
import { ISpace } from "../../packages/lib/boards";

const {
  blueImage,
  blue3Image,
  redImage,
  red3Image,
  happeningImage,
  happening3Image,
  chanceImage,
  chance2Image,
  chance3Image,
  bowserImage,
  bowser3Image,
  minigameImage,
  shroomImage,
  otherImage,
  starImage,
  blackstarImage,
  arrowImage,
  startImage,
  itemImage,
  item3Image,
  battleImage,
  battle3Image,
  bankImage,
  bank3Image,
  gameguyImage,
  banksubtypeImage,
  banksubtype2Image,
  bankcoinsubtypeImage,
  itemshopsubtypeImage,
  itemshopsubtype2Image,
  toadImage,
  mstarImage,
  booImage,
  bowsercharacterImage,
  koopaImage,
} = ToolbarImages;

let _globalHandler: any;

interface IRightClickMenuProps {
  space?: ISpace | null;
  spaceIndex: number;
}

interface IRightClickMenuState {
  oldX?: number;
  oldY?: number;
}

export class RightClickMenu extends React.Component<
  IRightClickMenuProps,
  IRightClickMenuState
> {
  state: IRightClickMenuState = {};

  private rcMenu: any;

  componentDidMount() {
    //console.log("RightClickMenu.componentDidMount");
    _globalHandler = this.globalClickHandler.bind(this);
    document.addEventListener("click", _globalHandler);
  }

  componentWillUnmount() {
    //console.log("RightClickMenu.componentWillUnmount");
    document.removeEventListener("click", _globalHandler);
    _globalHandler = null;
  }

  globalClickHandler = (event: any) => {
    // console.log("globalClickHandler", event);

    // If we click inside the menu, don't close obviously.
    // But also let the canvas handlers decide what happens if they are clicked.
    if (
      this.elementIsWithin(event.target) ||
      event.target.tagName.toUpperCase() === "CANVAS"
    )
      return;
    updateRightClickMenu(-1);
  };

  handleClick = (event: any) => {
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation();
  };

  onContextMenu = (event: any) => {
    event.preventDefault(); // No right click on right click menu.
  };

  onTypeChanged = (type: Space, subtype?: SpaceSubtype) => {
    const spaceIndices = getValidSelectedSpaceIndices();
    store.dispatch(setSpaceTypeAction({ spaceIndices, type, subtype }));
    this.forceUpdate();
  };

  getPlacement(space: ISpace) {
    const x = (!isNaN(this.state.oldX!) ? this.state.oldX! : space.x) - 8;
    const y = (!isNaN(this.state.oldY!) ? this.state.oldY! : space.y) + 15;
    return "translateX(" + x + "px) translateY(" + y + "px)";
  }

  elementIsWithin(el: HTMLElement) {
    if (!el || !this.refs || !this.rcMenu) return true;
    return this.rcMenu.contains(el);
  }

  onChangeX = (event: any) => {
    const newX = parseInt(event.target.value, 10);
    const isBlank = event.target.value === "";
    const curBgWidth = getCurrentBoard().bg.width;
    if ((!isBlank && isNaN(newX)) || newX < 0 || newX > curBgWidth) return;
    if (!this.state.oldX) this.setState({ oldX: this.props.space!.x });
    store.dispatch(
      setSpacePositionsAction({
        spaceIndices: [this.props.spaceIndex],
        coords: [
          {
            x: isBlank ? 0 : newX,
          },
        ],
      }),
    );
    this.forceUpdate();
  };

  onChangeY = (event: any) => {
    const newY = parseInt(event.target.value, 10);
    const isBlank = event.target.value === "";
    const curBgHeight = getCurrentBoard().bg.height;
    if ((!isBlank && isNaN(newY)) || newY < 0 || newY > curBgHeight) return;
    if (!this.state.oldY) this.setState({ oldY: this.props.space!.y });
    store.dispatch(
      setSpacePositionsAction({
        spaceIndices: [this.props.spaceIndex],
        coords: [
          {
            y: isBlank ? 0 : newY,
          },
        ],
      }),
    );
    this.forceUpdate();
  };

  onCoordSet = (event?: any) => {
    store.dispatch(
      setSpacePositionsAction({
        spaceIndices: [this.props.spaceIndex],
        coords: [
          {
            x: this.props.space!.x || 0,
            y: this.props.space!.y || 0,
          },
        ],
      }),
    );
    this.setState({ oldX: undefined, oldY: undefined });
    this.forceUpdate();
  };

  onKeyUp = (event: any) => {
    if (event.key === "Enter") this.onCoordSet();
  };

  render() {
    const space = this.props.space;
    if (!space) return null;

    const style = { transform: this.getPlacement(space) };
    return (
      <div
        ref={(menu) => (this.rcMenu = menu)}
        className="rcMenu"
        style={style}
        onClick={this.handleClick}
        onContextMenu={this.onContextMenu}
      >
        &nbsp;&nbsp;<span>X:</span>
        <input
          type="text"
          value={space.x}
          onChange={this.onChangeX}
          onBlur={this.onCoordSet}
          onKeyUp={this.onKeyUp}
        />
        <span>Y:</span>
        <input
          type="text"
          value={space.y}
          onChange={this.onChangeY}
          onBlur={this.onCoordSet}
          onKeyUp={this.onKeyUp}
        />
        <RCSpaceTypeToggle
          type={space.type}
          subtype={space.subtype}
          typeChanged={this.onTypeChanged}
        />
      </div>
    );
  }
}

interface IRCMenuItem {
  name: string;
  icon: string;
  type?: Space;
  subtype?: SpaceSubtype;
  advanced?: boolean;
}

const RCSpaceTypeToggleTypes_1: IRCMenuItem[] = [
  { name: "Change to blue space", icon: blueImage, type: Space.BLUE },
  { name: "Change to red space", icon: redImage, type: Space.RED },
  {
    name: "Change to happening space",
    icon: happeningImage,
    type: Space.HAPPENING,
  },
  {
    name: "Change to chance time space",
    icon: chanceImage,
    type: Space.CHANCE,
  },
  {
    name: "Change to minigame space",
    icon: minigameImage,
    type: Space.MINIGAME,
  },
  { name: "Change to shroom space", icon: shroomImage, type: Space.SHROOM },
  { name: "Change to Bowser space", icon: bowserImage, type: Space.BOWSER },
  { name: "Change to invisible space", icon: otherImage, type: Space.OTHER },
  {
    name: "Change to star space",
    icon: starImage,
    type: Space.STAR,
    advanced: true,
  },
  {
    name: "Change to start space",
    icon: startImage,
    type: Space.START,
    advanced: true,
  },
];
const RCSpaceTypeToggleSubTypes_1: IRCMenuItem[] = [
  { name: "Show Toad", icon: toadImage, subtype: SpaceSubtype.TOAD },
  { name: "Show Boo", icon: booImage, subtype: SpaceSubtype.BOO },
  {
    name: "Show Bowser",
    icon: bowsercharacterImage,
    subtype: SpaceSubtype.BOWSER,
  },
  { name: "Show Koopa Troopa", icon: koopaImage, subtype: SpaceSubtype.KOOPA },
];

const RCSpaceTypeToggleTypes_2: IRCMenuItem[] = [
  { name: "Change to blue space", icon: blueImage, type: Space.BLUE },
  { name: "Change to red space", icon: redImage, type: Space.RED },
  {
    name: "Change to happening space",
    icon: happeningImage,
    type: Space.HAPPENING,
  },
  {
    name: "Change to chance time space",
    icon: chance2Image,
    type: Space.CHANCE,
  },
  { name: "Change to Bowser space", icon: bowserImage, type: Space.BOWSER },
  { name: "Change to item space", icon: itemImage, type: Space.ITEM },
  { name: "Change to battle space", icon: battleImage, type: Space.BATTLE },
  { name: "Change to bank space", icon: bankImage, type: Space.BANK },
  { name: "Change to invisible space", icon: otherImage, type: Space.OTHER },
  {
    name: "Change to star space",
    icon: starImage,
    type: Space.STAR,
    advanced: true,
  },
  {
    name: "Change to black star space",
    icon: blackstarImage,
    type: Space.BLACKSTAR,
    advanced: true,
  },
  {
    name: "Change to start space",
    icon: startImage,
    type: Space.START,
    advanced: true,
  },
  { name: "Change to arrow space", icon: arrowImage, type: Space.ARROW },
];
const RCSpaceTypeToggleSubTypes_2: IRCMenuItem[] = [
  { name: "Show Toad", icon: toadImage, subtype: SpaceSubtype.TOAD },
  { name: "Show Boo", icon: booImage, subtype: SpaceSubtype.BOO },
  { name: "Show bank", icon: banksubtype2Image, subtype: SpaceSubtype.BANK },
  {
    name: "Show bank coin stack",
    icon: bankcoinsubtypeImage,
    subtype: SpaceSubtype.BANKCOIN,
  },
  {
    name: "Show item shop",
    icon: itemshopsubtype2Image,
    subtype: SpaceSubtype.ITEMSHOP,
  },
];

const RCSpaceTypeToggleTypes_3: IRCMenuItem[] = [
  { name: "Change to blue space", icon: blue3Image, type: Space.BLUE },
  { name: "Change to red space", icon: red3Image, type: Space.RED },
  {
    name: "Change to happening space",
    icon: happening3Image,
    type: Space.HAPPENING,
  },
  {
    name: "Change to chance time space",
    icon: chance3Image,
    type: Space.CHANCE,
  },
  { name: "Change to Bowser space", icon: bowser3Image, type: Space.BOWSER },
  { name: "Change to item space", icon: item3Image, type: Space.ITEM },
  { name: "Change to battle space", icon: battle3Image, type: Space.BATTLE },
  { name: "Change to bank space", icon: bank3Image, type: Space.BANK },
  { name: "Change to Game Guy space", icon: gameguyImage, type: Space.GAMEGUY },
  { name: "Change to invisible space", icon: otherImage, type: Space.OTHER },
  {
    name: "Change to star space",
    icon: starImage,
    type: Space.STAR,
    advanced: true,
  },
  {
    name: "Change to start space",
    icon: startImage,
    type: Space.START,
    advanced: true,
  },
  { name: "Change to arrow space", icon: arrowImage, type: Space.ARROW },
];
const RCSpaceTypeToggleSubTypes_3: IRCMenuItem[] = [
  { name: "Show Millenium Star", icon: mstarImage, subtype: SpaceSubtype.TOAD },
  { name: "Show Boo", icon: booImage, subtype: SpaceSubtype.BOO },
  { name: "Show bank", icon: banksubtypeImage, subtype: SpaceSubtype.BANK },
  {
    name: "Show bank coin stack",
    icon: bankcoinsubtypeImage,
    subtype: SpaceSubtype.BANKCOIN,
  },
  {
    name: "Show item shop",
    icon: itemshopsubtypeImage,
    subtype: SpaceSubtype.ITEMSHOP,
  },
];

const RCSpaceTypeToggleTypes_3_Duel: IRCMenuItem[] = [
  // Types
  { name: "Change to basic space", icon: basic3Image, type: Space.DUEL_BASIC },
  {
    name: "Change to Mini-Game space",
    icon: minigameduel3Image,
    type: Space.MINIGAME,
  },
  {
    name: "Change to reverse space",
    icon: reverse3Image,
    type: Space.DUEL_REVERSE,
  },
  {
    name: "Change to happening space",
    icon: happeningduel3Image,
    type: Space.HAPPENING,
  },
  {
    name: "Change to Game Guy space",
    icon: gameguyduelImage,
    type: Space.GAMEGUY,
  },
  {
    name: "Change to power-up space",
    icon: powerupImage,
    type: Space.DUEL_POWERUP,
  },
  { name: "Change to invisible space", icon: otherImage, type: Space.OTHER },
  {
    name: "Change to blue start space",
    icon: startblueImage,
    type: Space.DUEL_START_BLUE,
    advanced: true,
  },
  {
    name: "Change to red start space",
    icon: startredImage,
    type: Space.DUEL_START_RED,
    advanced: true,
  },
];

function _getRCSpaceTypeToggles() {
  const curBoard = getCurrentBoard();
  let types: IRCMenuItem[] = [];
  switch (curBoard.game) {
    case 1:
      types = RCSpaceTypeToggleTypes_1;
      break;
    case 2:
      types = RCSpaceTypeToggleTypes_2;
      break;
    case 3:
      switch (curBoard.type) {
        case BoardType.DUEL:
          types = RCSpaceTypeToggleTypes_3_Duel;
          break;
        case BoardType.NORMAL:
        default:
          types = RCSpaceTypeToggleTypes_3;
          break;
      }
      break;
  }

  if (!get($setting.uiAdvanced)) {
    types = types.filter((a) => !a.advanced);
  }

  return types;
}

function _getRCSpaceSubTypeToggles() {
  const curBoard = getCurrentBoard();
  let types: IRCMenuItem[] = [];
  switch (curBoard.game) {
    case 1:
      types = RCSpaceTypeToggleSubTypes_1;
      break;
    case 2:
      types = RCSpaceTypeToggleSubTypes_2;
      break;
    case 3:
      switch (curBoard.type) {
        case BoardType.DUEL:
          types = []; // SpaceSubTypeToggleTypes_3_Duel;
          break;
        default:
          types = RCSpaceTypeToggleSubTypes_3;
          break;
      }
      break;
  }

  if (!get($setting.uiAdvanced)) {
    types = types!.filter((a: IRCMenuItem) => !a.advanced);
  }

  return types;
}

interface IRCSpaceTypeToggleProps {
  type: Space;
  subtype?: SpaceSubtype;
  typeChanged: (type: Space, subtype?: SpaceSubtype) => any;
}

const RCSpaceTypeToggle = class RCSpaceTypeToggle extends React.Component<IRCSpaceTypeToggleProps> {
  onTypeChanged = (type: Space, subtype?: SpaceSubtype) => {
    this.props.typeChanged(type, subtype);
  };

  render() {
    const type = this.props.type;
    if (type === Space.START && !get($setting.uiAdvanced)) return null; // Can't switch start space type
    const subtype = this.props.subtype;
    const onTypeChanged = this.onTypeChanged;
    const makeToggle = (item: any) => {
      const key = item.type + "-" + item.subtype;
      const selected =
        type === item.type ||
        (type === Space.OTHER &&
          subtype !== undefined &&
          subtype === item.subtype);
      //if (type !== Space.OTHER && item.subtype !== undefined)
      //  return null;
      return (
        <RCSpaceTypeToggleBtn
          key={key}
          type={item.type}
          subtype={item.subtype}
          icon={item.icon}
          title={item.name}
          selected={selected}
          typeChanged={onTypeChanged}
        />
      );
    };
    const typeToggles = _getRCSpaceTypeToggles()!.map(makeToggle);
    const subTypeToggles = _getRCSpaceSubTypeToggles()!.map(makeToggle);

    return (
      <div className="rcSpaceToggleContainer">
        {typeToggles}
        <br />
        {subTypeToggles}
      </div>
    );
  }
};

interface IRCSpaceTypeToggleBtnProps {
  type: Space;
  subtype: SpaceSubtype;
  selected?: boolean;
  icon?: string;
  title?: string;
  typeChanged: (type: Space, subtype?: SpaceSubtype) => any;
}

const RCSpaceTypeToggleBtn = class RCSpaceTypeToggleBtn extends React.Component<IRCSpaceTypeToggleBtnProps> {
  onTypeChanged = () => {
    if (this.props.subtype !== undefined && this.props.selected)
      this.props.typeChanged(this.props.type, undefined);
    else this.props.typeChanged(this.props.type, this.props.subtype);
  };

  render() {
    let btnClass = "rcSpaceToggleButton";
    if (this.props.selected) btnClass += " selected";
    const size = this.props.subtype !== undefined ? 25 : 20;
    return (
      <div
        className={btnClass}
        title={this.props.title}
        onClick={this.onTypeChanged}
      >
        <img src={this.props.icon} height={size} width={size} alt="" />
      </div>
    );
  }
};
