import { store } from "./store";
import { setImagesLoadedAction } from "./appState";
import { createImage } from "../../packages/lib/utils/canvas";

import toadImg from "./img/editor/toad.png";
import mstarImg from "./img/editor/mstar.png";
import bowserImg from "./img/editor/bowser.png";
import koopaImg from "./img/editor/koopa.png";
import booImg from "./img/editor/boo.png";
import goombaImg from "./img/editor/goomba.png";
import eventImg from "./img/editor/event.png";
import eventErrorImg from "./img/editor/eventerrors.png";
import starImg from "./img/editor/star.png";
import bank2Img from "./img/editor/bank2.png";
import bank3Img from "./img/editor/bank.png";
import bankcoinImg from "./img/editor/bankcoin.png";
import itemShop2Img from "./img/editor/itemshop2.png";
import itemShop3Img from "./img/editor/itemshop.png";
import gateImg from "./img/editor/gate.png";

import spaceBowser from "./img/editor/spaces/bowser.png";

import spaceItem2 from "./img/editor/spaces/item2.png";

import spaceBlue3 from "./img/editor/spaces/blue3.png";
import spaceRed3 from "./img/editor/spaces/red3.png";
import spaceHappening3 from "./img/editor/spaces/happening3.png";
import spaceChance3 from "./img/editor/spaces/chance3.png";
import spaceBowser3 from "./img/editor/spaces/bowser3.png";
import spaceItem3 from "./img/editor/spaces/item3.png";
import spaceBattle3 from "./img/editor/spaces/battle3.png";
import spaceBank3 from "./img/editor/spaces/bank3.png";
import spaceGameGuy3 from "./img/editor/spaces/gameguy.png";

import spaceDuelBasic3 from "./img/editor/spaces/basic3.png";
import spaceDuelPowerup3 from "./img/editor/spaces/powerup3.png";
import spaceDuelReverse3 from "./img/editor/spaces/reverse3.png";
import spaceGameGuyDuel3 from "./img/editor/spaces/gameguyduel.png";
import spaceMiniGameDuel3 from "./img/editor/spaces/minigameduel3.png";
import spaceHappeningDuel3 from "./img/editor/spaces/happeningduel3.png";

import targetImg from "./img/events/target.png";

// Toolbar images
import blueImage from "./img/toolbar/blue.png";
import blue3Image from "./img/toolbar/blue3.png";
import redImage from "./img/toolbar/red.png";
import red3Image from "./img/toolbar/red3.png";
import happeningImage from "./img/toolbar/happening.png";
import happening3Image from "./img/toolbar/happening3.png";
import chanceImage from "./img/toolbar/chance.png";
import chance2Image from "./img/toolbar/chance2.png";
import chance3Image from "./img/toolbar/chance3.png";
import bowserImage from "./img/toolbar/bowser.png";
import bowser3Image from "./img/toolbar/bowser3.png";
import minigameImage from "./img/toolbar/minigame.png";
import shroomImage from "./img/toolbar/shroom.png";
import otherImage from "./img/toolbar/other.png";
import starImage from "./img/toolbar/star.png";
import blackstarImage from "./img/toolbar/blackstar.png";
import arrowImage from "./img/toolbar/arrow.png";
import startImage from "./img/toolbar/start.png";
import itemImage from "./img/toolbar/item.png";
import item3Image from "./img/toolbar/item3.png";
import battleImage from "./img/toolbar/battle.png";
import battle3Image from "./img/toolbar/battle3.png";
import bankImage from "./img/toolbar/bank.png";
import bank3Image from "./img/toolbar/bank3.png";
import gameguyImage from "./img/toolbar/gameguy.png";
import banksubtypeImage from "./img/toolbar/banksubtype.png";
import banksubtype2Image from "./img/toolbar/banksubtype2.png";
import bankcoinsubtypeImage from "./img/toolbar/bankcoinsubtype.png";
import itemshopsubtypeImage from "./img/toolbar/itemshopsubtype.png";
import itemshopsubtype2Image from "./img/toolbar/itemshopsubtype2.png";
import toadImage from "./img/toolbar/toad.png";
import mstarImage from "./img/toolbar/mstar.png";
import booImage from "./img/toolbar/boo.png";
import bowsercharacterImage from "./img/toolbar/bowsercharacter.png";
import koopaImage from "./img/toolbar/koopa.png";

export const ToolbarImages = {
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
};

// This is just kind of a goofy thing that makes sure we load all the images
// that are part of rendering, and then triggers a re-render when they load.

const _images: { [name: string]: HTMLImageElement } = {};

export function preloadImages(): void {
  let _imageTemp: { [name: string]: string } | null = {};
  let _imagesToLoad = 0;

  addImage("toadImg", toadImg);
  addImage("mstarImg", mstarImg);
  addImage("bowserImg", bowserImg);
  addImage("koopaImg", koopaImg);
  addImage("booImg", booImg);
  addImage("goombaImg", goombaImg);
  addImage("eventImg", eventImg);
  addImage("eventErrorImg", eventErrorImg);
  addImage("starImg", starImg);
  addImage("bank2Img", bank2Img);
  addImage("bank3Img", bank3Img);
  addImage("bankcoinImg", bankcoinImg);
  addImage("itemShop2Img", itemShop2Img);
  addImage("itemShop3Img", itemShop3Img);
  addImage("gateImg", gateImg);

  addImage("spaceBowser", spaceBowser);

  addImage("spaceItem2", spaceItem2);

  addImage("spaceBlue3", spaceBlue3);
  addImage("spaceRed3", spaceRed3);
  addImage("spaceHappening3", spaceHappening3);
  addImage("spaceChance3", spaceChance3);
  addImage("spaceBowser3", spaceBowser3);
  addImage("spaceItem3", spaceItem3);
  addImage("spaceBattle3", spaceBattle3);
  addImage("spaceBank3", spaceBank3);
  addImage("spaceGameGuy3", spaceGameGuy3);

  addImage("spaceDuelBasic3", spaceDuelBasic3);
  addImage("spaceDuelPowerup3", spaceDuelPowerup3);
  addImage("spaceDuelReverse3", spaceDuelReverse3);
  addImage("spaceGameGuyDuel3", spaceGameGuyDuel3);
  addImage("spaceMiniGameDuel3", spaceMiniGameDuel3);
  addImage("spaceHappeningDuel3", spaceHappeningDuel3);

  addImage("targetImg", targetImg);

  function addImage(name: string, url: string) {
    _imageTemp![name] = url;
    _images[name] = createImage();
    _imagesToLoad = _imagesToLoad + 1;
    _images[name].onload = _onImageLoaded;
  }

  // Trigger a re-render when all the external image assets load.
  function _onImageLoaded() {
    _imagesToLoad = _imagesToLoad - 1;
    if (!_imagesToLoad) {
      //$$log("All images loaded, rendering again.");
      store.dispatch(setImagesLoadedAction(true));
    }
  }

  for (const name in _imageTemp) {
    if (!_imageTemp.hasOwnProperty(name)) continue;
    const url = _imageTemp[name];
    _images[name].src = url;
  }
  _imageTemp = null;
}

export function getImage(name: string): HTMLImageElement {
  return _images[name];
}
