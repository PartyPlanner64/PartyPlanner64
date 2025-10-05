import * as React from "react";
import { BoardType } from "../../packages/lib/types";
import { Button, ToggleButton } from "./controls";
import { showMessage } from "./appControl";
import { isDebug } from "../../packages/lib/debug";

import defaultThemePreview from "./img/themes/default/preview.png";

const Themes = [{ name: "Blank", id: "default" }];

const _themePreviews = {
  default: defaultThemePreview,
};

interface INewBoardProps {
  onAccept(version: number, type: BoardType, theme: any): any;
}

export class NewBoard extends React.Component<INewBoardProps> {
  state = {
    version: 1,
    type: BoardType.NORMAL,
    theme: 0,
  };

  onVersionChange = (version: number) => {
    this.setState({ version });
    if (version !== 3) this.setState({ type: BoardType.NORMAL });
  };

  onTypeChange = (type: BoardType) => {
    this.setState({ type });
  };

  onThemeChange = (theme: any) => {
    this.setState({ theme });
  };

  submit = () => {
    if (this.state.type === BoardType.DUEL) {
      showMessage("Duel board support is partially finished, coming soon!");
      if (!isDebug()) return;
    }
    const fn = this.props.onAccept;
    if (fn) fn(this.state.version, this.state.type, Themes[this.state.theme]);
  };

  render() {
    return (
      <div className="newBoardContainer">
        <NewBoardVersionSelect onVersionChange={this.onVersionChange} />
        {/* {this.state.version === 3 ?
          <NewBoardTypeSelect type={this.state.type}
            onTypeChange={this.onTypeChange} />
          : null } */}
        <NewBoardThemeSelect onThemeChange={this.onThemeChange} />
        <Button onClick={this.submit} css="nbCreate">
          Create
        </Button>
      </div>
    );
  }
}

interface INewBoardVersionSelectProps {
  onVersionChange(id: number): any;
}

class NewBoardVersionSelect extends React.Component<INewBoardVersionSelectProps> {
  state = {
    version: 1,
  };

  onVersionChange = (id: number, pressed: boolean) => {
    this.setState({ version: id });
    this.props.onVersionChange(id);
  };

  render() {
    const gameVersions = [
      <ToggleButton
        id={1}
        key={1}
        allowDeselect={false}
        onToggled={this.onVersionChange}
        pressed={this.state.version === 1}
      >
        <span className="newBoardVersion" title="Mario Party 1">
          MP1
        </span>
      </ToggleButton>,
    ];
    gameVersions.push(
      <ToggleButton
        id={2}
        key={2}
        allowDeselect={false}
        onToggled={this.onVersionChange}
        pressed={this.state.version === 2}
      >
        <span className="newBoardVersion" title="Mario Party 2">
          MP2
        </span>
      </ToggleButton>,
    );
    gameVersions.push(
      <ToggleButton
        id={3}
        key={3}
        allowDeselect={false}
        onToggled={this.onVersionChange}
        pressed={this.state.version === 3}
      >
        <span className="newBoardVersion" title="Mario Party 3">
          MP3
        </span>
      </ToggleButton>,
    );
    return (
      <div className="newBoardVersionSelect">
        <label className="nbLabel">Game Version</label>
        <br />
        {gameVersions}
      </div>
    );
  }
}

interface INewBoardTypeSelect {
  type: BoardType;
  onTypeChange(type: BoardType): any;
}

class NewBoardTypeSelect extends React.Component<INewBoardTypeSelect> {
  // eslint-disable-line
  onTypeChange = (type: BoardType) => {
    this.props.onTypeChange(type);
  };

  render() {
    return (
      <div className="newBoardVersionSelect">
        <label className="nbLabel">Board Type</label>
        <br />
        <ToggleButton
          id={BoardType.NORMAL}
          allowDeselect={false}
          onToggled={this.onTypeChange}
          pressed={this.props.type === BoardType.NORMAL}
        >
          <span className="newBoardVersion" title="Normal party board">
            Normal
          </span>
        </ToggleButton>
        <ToggleButton
          id={BoardType.DUEL}
          allowDeselect={false}
          onToggled={this.onTypeChange}
          pressed={this.props.type === BoardType.DUEL}
        >
          <span className="newBoardVersion" title="Duel board">
            Duel
          </span>
        </ToggleButton>
      </div>
    );
  }
}

interface INewBoardThemeSelectProps {
  onThemeChange(id: any): any;
}

class NewBoardThemeSelect extends React.Component<INewBoardThemeSelectProps> {
  state = {
    theme: 0,
  };

  onThemeChange = (id: any, pressed: boolean) => {
    this.setState({ theme: id });
    this.props.onThemeChange(id);
  };

  render() {
    const themeEntries = Themes.map((theme, i) => {
      const previewUrl = (_themePreviews as any)[theme.id];
      return (
        <ToggleButton
          id={i}
          key={i}
          allowDeselect={false}
          css="nbTheme"
          onToggled={this.onThemeChange}
          pressed={this.state.theme === i}
        >
          <img
            src={previewUrl}
            className="newBoardThemePreview"
            width="96"
            height="72"
            alt=""
          />
          <span className="newBoardTheme">
            <span className="newBoardThemeInner">{theme.name}</span>
          </span>
        </ToggleButton>
      );
    });
    return (
      <div className="NewBoardThemeSelect">
        <label className="nbLabel">Theme</label>
        <br />
        {themeEntries}
      </div>
    );
  }
}
