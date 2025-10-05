import { useCallback, useEffect, useMemo, useState } from "react";
import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";
import { EditorThemes } from "../../packages/lib/types";
import { updateWindowTitle } from "./utils/browser";
import {
  $setting,
  addSettingChangedListener,
  get as getSetting,
  removeSettingChangedListener,
} from "./views/settings";
import {
  selectCurrentBoard,
  selectSelectedSpaceIndices,
  SpaceIndexMap,
} from "./boardState";
import type { RootState, AppDispatch } from "./store";
import { IBoard, ISpace } from "../../packages/lib/boards";

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export function useCurrentBoard(): IBoard {
  return useAppSelector(selectCurrentBoard);
}

export function useSelectedSpaceIndicesMap(): SpaceIndexMap {
  return useAppSelector(selectSelectedSpaceIndices);
}

export function useSelectedSpaceIndices(): number[] {
  const selectedSpaceMap = useSelectedSpaceIndicesMap();
  return useMemo(() => {
    const indices = [];
    for (const index in selectedSpaceMap) {
      indices.push(parseInt(index, 10));
    }
    return indices;
  }, [selectedSpaceMap]);
}

export function useSelectedSpaces(): ISpace[] {
  const board = useCurrentBoard();
  const selectedSpaceMap = useSelectedSpaceIndicesMap();
  return useMemo(() => {
    const selectedSpaces = [];
    for (const index in selectedSpaceMap) {
      const space = board.spaces[index];
      if (space) {
        selectedSpaces.push(space);
      }
    }
    return selectedSpaces;
  }, [board, selectedSpaceMap]);
}

export function useSelectedSpaceCount(): number {
  return Object.keys(useSelectedSpaceIndicesMap()).length;
}

/** Applies the given title to the browser tab. */
export function useWindowTitle(title: string): void {
  useEffect(() => {
    updateWindowTitle(title);
  }, [title]);
}

/** Hook that returns the current editor theme. */
export function useEditorTheme(): EditorThemes {
  const [theme, setTheme] = useState(
    getSetting($setting.uiTheme) || EditorThemes.Classic,
  );

  const onSettingChanged = useCallback((settingName: $setting) => {
    if (settingName === $setting.uiTheme) {
      setTheme(getSetting($setting.uiTheme) || EditorThemes.Classic);
    }
  }, []);

  useEffect(() => {
    addSettingChangedListener(onSettingChanged);
    return () => removeSettingChangedListener(onSettingChanged);
  }, [onSettingChanged]);

  return theme;
}

/** Synchronizes the current editor theme with the root css class. */
export function useEditorThemeClass(): void {
  const theme = useEditorTheme();

  useEffect(() => {
    const html = document.documentElement;
    const appliedThemeClasses = html.className
      .split(" ")
      .filter((cls) => cls.startsWith("theme-"));
    html.classList.remove(...appliedThemeClasses);
    html.classList.add("theme-" + theme);
  }, [theme]);
}
