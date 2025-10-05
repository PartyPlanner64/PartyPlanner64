import * as React from "react";
import * as Cookies from "cookies-js";
import { setDebug, isDebug } from "../../../packages/lib/debug";
import { ToggleButton } from "../controls";
import { EditorThemes } from "../../../packages/lib/types";

import "../css/settings.scss";

export enum $setting {
  "uiTheme" = "ui.theme",
  "uiAdvanced" = "ui.advanced",
  "uiDebug" = "ui.debug",
  "uiSkipValidation" = "ui.skipvalidation",
  "uiAllowAllRoms" = "ui.allowallroms",
  "uiShowRomBoards" = "ui.showromboards",
  "writeBranding" = "write.branding",
  "writeDecompressed" = "write.decompressed",
  "limitModelFPS" = "models.limitfps",
  "limitModelAnimations" = "models.limitAnimations",
  "modelUseGLB" = "models.useGLB",
}

interface SettingTypeMap {
  [$setting.uiTheme]: "theme";
  [$setting.uiAdvanced]: "checkbox";
  [$setting.uiDebug]: "checkbox";
  [$setting.uiSkipValidation]: "checkbox";
  [$setting.uiAllowAllRoms]: "checkbox";
  [$setting.uiShowRomBoards]: "checkbox";
  [$setting.writeBranding]: "checkbox";
  [$setting.writeDecompressed]: "checkbox";
  [$setting.limitModelFPS]: "checkbox";
  [$setting.limitModelAnimations]: "checkbox";
  [$setting.modelUseGLB]: "checkbox";
}

type SettingType = "checkbox" | "theme";

type SettingValueTypeForKey<TKey extends keyof SettingTypeMap> =
  SettingValueTypes[SettingTypeMap[TKey]];

interface SettingValueTypes {
  checkbox: boolean;
  theme: EditorThemes;
}

interface ISettingConfig<T extends SettingType> {
  name: string;
  type: T;
  id: keyof SettingTypeMap;
  default: SettingValueTypes[T];
  desc?: string;
  advanced?: boolean;
}

interface ISettingSection {
  name: string;
  type: "section";
  advanced?: boolean;
}

type ISetting =
  | ISettingSection
  | ISettingConfig<"checkbox">
  | ISettingConfig<"theme">;

const _settings: ISetting[] = [
  { name: "Theme", type: "section" },
  {
    id: $setting.uiTheme,
    type: "theme",
    default: EditorThemes.Classic,
    name: "Theme",
  },
  { name: "UI", type: "section" },
  {
    id: $setting.uiAdvanced,
    type: "checkbox",
    default: false,
    name: "Advanced features",
    desc: "Enables infrequently used, potentially complicated, and developer features.",
  },
  {
    id: $setting.uiDebug,
    type: "checkbox",
    default: isDebug(),
    name: "Debug features",
    advanced: true,
    desc: "Enables debug output and UI that may aid development.",
  },
  {
    id: $setting.uiSkipValidation,
    type: "checkbox",
    default: false,
    name: "Skip Overwrite Validation",
    advanced: true,
    desc: "Allow boards to be written regardless of warnings.",
  },
  {
    id: $setting.uiShowRomBoards,
    type: "checkbox",
    default: false,
    name: "Show ROM Boards",
    advanced: true,
    desc: "Show boards parsed from the ROM in the editor.",
  },
  {
    id: $setting.uiAllowAllRoms,
    type: "checkbox",
    default: false,
    name: "Allow All ROMs",
    advanced: true,
    desc: "Allows more than just the officially supported ROMs to attempt to load.",
  },
  { name: "ROM", type: "section" },
  {
    id: $setting.writeBranding,
    type: "checkbox",
    default: true,
    name: "Include branding",
    desc: "Adds the PartyPlanner64 logo to the game boot splashscreens.",
  },
  {
    id: $setting.writeDecompressed,
    type: "checkbox",
    default: false,
    name: "Leave ROM decompressed",
    advanced: true,
    desc: "Leaves all files decompressed when saving a ROM, resulting in larger file size.",
  },
  { name: "Model Viewer", type: "section" },
  {
    id: $setting.limitModelFPS,
    type: "checkbox",
    default: true,
    name: "Limit FPS",
    desc: "Reduce the refresh rate for better performance.",
  },
  {
    id: $setting.limitModelAnimations,
    type: "checkbox",
    default: true,
    name: "Limit animations",
    desc: "Limit animations to those in the same directory as the model.",
  },
  {
    id: $setting.modelUseGLB,
    type: "checkbox",
    default: false,
    name: "Use GLB container for glTF",
    desc: "Create a GLB container when exporting models to glTF.",
  },
];
function _getSetting<TKey extends keyof SettingTypeMap>(id: TKey) {
  return _settings.find((setting) => {
    if (setting.type === "section") return false;
    return (setting as ISettingConfig<any>).id === id;
  });
}
function _getSettingDefault<TKey extends keyof SettingTypeMap>(
  id: TKey,
): SettingValueTypeForKey<TKey> | undefined {
  const setting = _getSetting(id);
  if (setting && setting.type !== "section")
    return (setting as ISettingConfig<SettingTypeMap[TKey]>).default;
  return undefined;
}

class SettingsManager {
  private _tempSettings: { [settingName: string]: any };

  public listeners: Set<SettingChangedListener> = new Set();

  constructor() {
    this._tempSettings = {};
  }

  getSetting<TKey extends keyof SettingTypeMap>(
    name: TKey,
  ): SettingValueTypeForKey<TKey> | undefined {
    // Allow changing settings for at least the session without cookies.
    if (this._tempSettings.hasOwnProperty(name)) {
      return this._tempSettings[name];
    }

    let value: SettingValueTypeForKey<TKey> | undefined;
    if (Cookies.enabled) {
      const val = Cookies.get(name);
      if (val === undefined) {
        value = _getSettingDefault(name);
      } else {
        value = JSON.parse(val) as SettingValueTypeForKey<TKey>;
      }
    } else {
      value = _getSettingDefault(name);
    }

    this._tempSettings[name] = value;
    return value;
  }

  setSetting<TKey extends keyof SettingTypeMap>(
    name: TKey,
    value: SettingValueTypeForKey<TKey>,
  ): void {
    this._tempSettings[name] = value;
    if (Cookies.enabled) {
      Cookies.set(name, JSON.stringify(value), { expires: Infinity });
    }

    this.listeners.forEach((callback) => {
      callback(name);
    });
  }

  reset() {
    this._tempSettings = {};

    if (Cookies.enabled) {
      _settings.forEach((setting) => {
        if (setting.type === "section") return;
        if (setting.id) Cookies.expire(setting.id);
      });
    }
  }
}
const _settingsManager = new SettingsManager();

setDebug(_settingsManager.getSetting($setting.uiDebug));

function _getValue<TKey extends keyof SettingTypeMap>(
  id?: TKey,
): SettingValueTypeForKey<TKey> | undefined {
  if (id) return _settingsManager.getSetting(id);
  return undefined;
}

function _setValue<TKey extends keyof SettingTypeMap>(
  id: TKey,
  value: SettingValueTypeForKey<TKey>,
) {
  _settingsManager.setSetting(id, value);
  if (id === $setting.uiDebug) {
    setDebug(value as boolean);
  }
}

function _getEffectiveSettings() {
  let settings = _settings;
  if (!_settingsManager.getSetting($setting.uiAdvanced)) {
    settings = settings.filter((setting) => {
      return !setting.advanced;
    });
  }
  return settings;
}

export const Settings = class Settings extends React.Component {
  state = {};

  render() {
    const formEls = _getEffectiveSettings().map((setting) => {
      switch (setting.type) {
        case "checkbox": {
          const value = _getValue(setting.id) as boolean | undefined;
          return (
            <CheckboxSetting
              id={setting.id!}
              name={setting.name}
              desc={setting.desc!}
              key={setting.id}
              value={value}
              onCheckChanged={(id, value) => this.onSettingChanged(id, value)}
            />
          );
        }
        case "section":
          return <h3 key={setting.name}>{setting.name}</h3>;
        case "theme": {
          const value = _getValue(setting.id) as EditorThemes;
          return (
            <ThemeSetting
              id={setting.id!}
              name={setting.name}
              key={setting.id}
              value={value}
              onThemeChanged={this.onSettingChanged}
            />
          );
        }
      }
      throw new Error("Unrecognized setting type");
    });
    return (
      <div id="settingsForm">
        <h2>Settings</h2>
        {formEls}
      </div>
    );
  }

  onSettingChanged = <TKey extends keyof SettingTypeMap>(
    id: TKey,
    value: SettingValueTypeForKey<TKey>,
  ) => {
    _setValue(id, value);
    this.forceUpdate(); // Trigger refresh
  };
};

interface CheckboxSettingProps<TKey extends keyof SettingTypeMap> {
  id: TKey;
  value: boolean | undefined;
  name: string;
  desc: string;
  onCheckChanged: (id: TKey, value: boolean) => any;
}

const CheckboxSetting = class CheckboxSetting extends React.Component<
  CheckboxSettingProps<keyof SettingTypeMap>
> {
  state = {};

  render() {
    const mainId = this.props.id + "-main";
    const descId = this.props.id + "-desc";
    return (
      <div className="checkboxSetting" onClick={this.onToggled}>
        <input
          type="checkbox"
          className="checkboxSettingChk"
          checked={this.props.value}
          onChange={this.onToggled}
          aria-labelledby={mainId}
          aria-describedby={descId}
        ></input>
        <div className="checkboxSettingLines">
          <span id={mainId} className="checkboxSettingMain">
            {this.props.name}
          </span>
          <br />
          <span id={descId} className="checkboxSettingDesc">
            {this.props.desc}
          </span>
        </div>
      </div>
    );
  }

  onToggled = () => {
    this.props.onCheckChanged(this.props.id, !this.props.value);
  };
};

interface IThemeSettingProps {
  name: string;
  id: string;
  value: EditorThemes | undefined;
  onThemeChanged(id: string, value: EditorThemes): void;
}

function ThemeSetting(props: IThemeSettingProps) {
  return (
    <div className="themeSetting">
      <ThemeOption
        name="Classic"
        theme={EditorThemes.Classic}
        accentColorHexString="#5A4540"
        selected={props.value === EditorThemes.Classic || !props.value}
        onSelected={(theme) => props.onThemeChanged(props.id, theme)}
      />
      <ThemeOption
        name="Dark Gray"
        theme={EditorThemes.DarkGray}
        accentColorHexString="#4a4a4a"
        selected={props.value === EditorThemes.DarkGray}
        onSelected={(theme) => props.onThemeChanged(props.id, theme)}
      />
    </div>
  );
}

interface IThemeOptionProps<TTheme extends EditorThemes> {
  name: string;
  theme: TTheme;
  accentColorHexString: `#${string}`;
  selected: boolean;
  onSelected(value: TTheme): void;
}

function ThemeOption(props: IThemeOptionProps<EditorThemes>) {
  return (
    <ToggleButton
      id={props.theme}
      key={props.theme}
      allowDeselect={false}
      onToggled={() => props.onSelected(props.theme)}
      pressed={props.selected}
    >
      <span
        className="themeColorSwatch"
        title={props.name}
        style={{ backgroundColor: props.accentColorHexString }}
      ></span>
    </ToggleButton>
  );
}

export function get<TKey extends keyof SettingTypeMap>(
  id: TKey,
): SettingValueTypeForKey<TKey> | undefined {
  return _settingsManager.getSetting(id);
}
export function set<TKey extends keyof SettingTypeMap>(
  id: TKey,
  value: SettingValueTypeForKey<TKey>,
): void {
  return _settingsManager.setSetting(id, value);
}

interface SettingChangedListener {
  (id: keyof SettingTypeMap): void;
}

/** Adds a callback that will be raised when a setting changes. */
export function addSettingChangedListener(
  callback: SettingChangedListener,
): void {
  _settingsManager.listeners.add(callback);
}

/** Removes a callback added by addSettingChangedListener. */
export function removeSettingChangedListener(
  callback: SettingChangedListener,
): void {
  _settingsManager.listeners.delete(callback);
}
