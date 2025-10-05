import * as React from "react";
import { getCurrentBoard } from "./boards";
import { createContext } from "../../packages/lib/utils/canvas";
import { Button } from "./controls";
import { external } from "./renderer";
import { setDebug, isDebug } from "../../packages/lib/debug";

import "./css/screenshot.scss";
import { store } from "./store";
import { getImageData } from "../../packages/lib/utils/img/getImageData";

interface ITakeScreenyOpts {
  renderConnections?: boolean;
  renderCharacters?: boolean;
  renderHiddenSpaces?: boolean;
  renderBadges?: boolean;
}

/** Takes a screenshot of the current board. */
export async function takeScreeny(opts: ITakeScreenyOpts = {}) {
  const curBoard = getCurrentBoard();
  const screenCtx = createContext(curBoard.bg.width, curBoard.bg.height);

  // First fill black, to mimic the game and the .editor_bg CSS bg.
  screenCtx.fillStyle = "black";
  screenCtx.fillRect(0, 0, curBoard.bg.width, curBoard.bg.height);

  const bgImageSrc = getCurrentBackgroundSrc();
  const bgImage = await getImageData(
    bgImageSrc,
    curBoard.bg.width,
    curBoard.bg.height,
  );
  screenCtx.putImageData(bgImage, 0, 0);

  // Disable debug temporarily for the render
  const origDebug = isDebug();
  setDebug(false);

  if (opts.renderConnections)
    external.renderConnections(screenCtx.canvas, screenCtx, curBoard, false);

  external.renderSpaces(screenCtx.canvas, screenCtx, curBoard, false, {
    skipCharacters: !opts.renderCharacters,
    skipHiddenSpaces: !opts.renderHiddenSpaces,
    skipBadges: !opts.renderBadges,
  });

  setDebug(origDebug);

  return {
    canvas: screenCtx.canvas,
    dataUri: screenCtx.canvas.toDataURL(),
    blobPromise: new Promise<Blob>((resolve) => {
      screenCtx.canvas.toBlob(resolve as any);
    }),
  };
}

interface IScreenshotProps {
  onAccept: (dataUri: string, blobPromise: Promise<Blob>) => any;
}

interface IScreenshotState {
  renderConnections?: boolean;
  renderCharacters?: boolean;
  renderHiddenSpaces?: boolean;
  renderBadges?: boolean;
}

export const Screenshot = class Screenshot extends React.Component<
  IScreenshotProps,
  IScreenshotState
> {
  state = {
    renderConnections: true,
    renderCharacters: true,
    renderHiddenSpaces: true,
    renderBadges: true,
  };

  takeScreenshot = async () => {
    const { dataUri, blobPromise } = await takeScreeny({
      renderConnections: this.state.renderConnections,
      renderCharacters: this.state.renderCharacters,
      renderHiddenSpaces: this.state.renderHiddenSpaces,
      renderBadges: this.state.renderBadges,
    });
    if (this.props.onAccept) this.props.onAccept(dataUri, blobPromise);
  };

  onCheckChanged = (id: any) => {
    const partialState: any = {};
    partialState[id] = !(this as any).state[id];
    this.setState(partialState);
  };

  render() {
    return (
      <div className="screenshotContainer">
        <label className="nbLabel">Screenshot Options</label>
        <br />
        <Checkbox
          id="renderConnections"
          text="Render connections"
          checked={this.state.renderConnections}
          onChange={this.onCheckChanged}
        />
        <Checkbox
          id="renderCharacters"
          text="Render characters"
          checked={this.state.renderCharacters}
          onChange={this.onCheckChanged}
        />
        <Checkbox
          id="renderHiddenSpaces"
          text="Render hidden spaces"
          checked={this.state.renderHiddenSpaces}
          onChange={this.onCheckChanged}
        />
        <Checkbox
          id="renderBadges"
          text="Render badges"
          checked={this.state.renderBadges}
          onChange={this.onCheckChanged}
        />
        <br />
        <Button onClick={this.takeScreenshot} css="ssCreate">
          Take Screenshot
        </Button>
      </div>
    );
  }
};

interface ICheckboxProps {
  onChange: Function;
  id: string;
  css?: string;
  text?: string;
  checked?: boolean;
}

const Checkbox = class Checkbox extends React.Component<ICheckboxProps> {
  state = {};

  onChange = () => {
    this.props.onChange(this.props.id);
  };

  render() {
    let css = "ssCheck";
    if (this.props.css) css += " " + this.props.css;
    return (
      <label className={css} title="">
        <input
          type="checkbox"
          onChange={this.onChange}
          checked={this.props.checked}
        />
        {this.props.text}
      </label>
    );
  }
};

function getCurrentBackgroundSrc(): string {
  const state = store.getState();
  return state.app.overrideBg || getCurrentBoard().bg.src;
}
