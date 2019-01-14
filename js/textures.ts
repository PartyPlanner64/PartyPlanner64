import { Space, BoardType } from "./types";
import { getImage } from "./images";
import THREE = require("three");
import { spaces } from "./spaces";

export function getTexture(type: Space, game: number, boardType: BoardType): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 32;
  const canvasCtx = canvas.getContext("2d")!;

  switch (type) {
    case Space.OTHER:
      if (game === 3) {
        spaces.drawOther3(canvasCtx, 16, 16);
      }
      else {
        spaces.drawOther(canvasCtx, 16, 16);
      }
      break;
    case Space.BLUE:
      if (game === 3)
        return new THREE.Texture(getImage("spaceBlue3"));
      else {
        spaces.drawBlue(canvasCtx, 16, 16);
      }
      break;
    case Space.RED:
      if (game === 3) {
        return new THREE.Texture(getImage("spaceRed3"));
      }
      else {
        spaces.drawRed(canvasCtx, 16, 16);
      }
      break;
    case Space.MINIGAME:
      if (boardType === BoardType.DUEL) {
        return new THREE.Texture(getImage("spaceMiniGameDuel3"));
      }
      else {
        spaces.drawMiniGame(canvasCtx, 16, 16);
      }
      break;
    case Space.HAPPENING:
      if (game === 3) {
        if (boardType === BoardType.DUEL)
          return new THREE.Texture(getImage("spaceHappeningDuel3"));
        else
          return new THREE.Texture(getImage("spaceHappening3"));
      }
      else
        spaces.drawHappening(canvasCtx, 16, 16);
      break;
    case Space.STAR:
      if (game === 3)
        spaces.drawStar3(canvasCtx, 16, 16);
      else
        spaces.drawStar(canvasCtx, 16, 16);
      break;
    case Space.CHANCE:
      if (game === 3)
        return new THREE.Texture(getImage("spaceChance3"));
      else if (game === 2)
        spaces.drawChance2(canvasCtx, 16, 16);
      else
        spaces.drawChance(canvasCtx, 16, 16);
      break;
    case Space.START:
      if (game === 3)
        spaces.drawStart3(canvasCtx, 16, 16);
      else
        spaces.drawStart(canvasCtx, 16, 16);
      break;
    case Space.SHROOM:
      spaces.drawShroom(canvasCtx, 16, 16);
      break;
    case Space.BOWSER:
      if (game === 3)
        return new THREE.Texture(getImage("spaceBowser3"));
      else
        return new THREE.Texture(getImage("spaceBowser"));
      break;
    case Space.ITEM:
      if (game === 3)
        return new THREE.Texture(getImage("spaceItem3"));
      else
        return new THREE.Texture(getImage("spaceItem2"));
      break;
    case Space.BATTLE:
      if (game === 3)
        return new THREE.Texture(getImage("spaceBattle3"));
      else
        spaces.drawBattle2(canvasCtx, 16, 16);
      break;
    case Space.BANK:
      if (game === 3)
        return new THREE.Texture(getImage("spaceBank3"));
      else
        spaces.drawBank2(canvasCtx, 16, 16);
      break;
    case Space.ARROW:
      spaces.drawArrow(canvasCtx, 16, 16, game);
      break;
    case Space.BLACKSTAR:
      spaces.drawBlackStar2(canvasCtx, 16, 16);
      break;
    case Space.GAMEGUY:
      if (boardType === BoardType.DUEL)
        return new THREE.Texture(getImage("spaceGameGuyDuel3"));
      else
        return new THREE.Texture(getImage("spaceGameGuy3"));
      break;
    case Space.DUEL_BASIC:
      return new THREE.Texture(getImage("spaceDuelBasic3"));
      break;
    case Space.DUEL_START_BLUE:
      spaces.drawStartDuelBlue(canvasCtx, 16, 16);
      break;
    case Space.DUEL_START_RED:
      spaces.drawStartDuelRed(canvasCtx, 16, 16);
      break;
    case Space.DUEL_POWERUP:
      spaces.drawDuelPowerup(canvasCtx, 16, 16);
      break;
    case Space.DUEL_REVERSE:
      spaces.drawDuelReverse(canvasCtx, 16, 16);
      break;
    default:
      spaces.drawUnknown(canvasCtx, 16, 16);
      break;
  }

  return new THREE.CanvasTexture(canvas);
}