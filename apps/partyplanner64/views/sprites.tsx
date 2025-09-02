import * as React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { mainfs } from "../../../packages/lib/fs/mainfs";
import { arrayBufferToDataURL } from "../../../packages/lib/utils/arrays";
import {
  fromPack,
  IImgInfo,
  imgInfoSrcToArrayBuffer,
} from "../../../packages/lib/utils/img/ImgPack";

import "../css/sprites.scss";

type MainFSPair = [number, number];

export function SpriteView() {
  const [spriteFsEntries, setSpriteFsEntries] = useState<MainFSPair[]>([]);
  const [selectedSprite, setSelectedSprite] = useState<MainFSPair | null>(null);

  useEffect(() => {
    const entries = getSpriteFSPairs();
    setSpriteFsEntries(entries);
    setSelectedSprite(entries[0]);
  }, []);

  const onSelectedSpriteChanged = useCallback(
    (sprite: MainFSPair) => setSelectedSprite(sprite),
    [],
  );

  if (!spriteFsEntries.length) {
    return null;
  }

  return (
    <div className="spriteViewerContainer">
      <SpriteViewerToolbar
        spriteFsEntries={spriteFsEntries}
        selectedSprite={selectedSprite!}
        onSelectedSpriteChanged={onSelectedSpriteChanged}
      />
      <SpriteDisplay selectedSprite={selectedSprite!} />
    </div>
  );
}

interface ISpriteViewerToolbarProps {
  spriteFsEntries: MainFSPair[];
  selectedSprite: MainFSPair;
  onSelectedSpriteChanged(sprite: MainFSPair): void;
}

function SpriteViewerToolbar(props: ISpriteViewerToolbarProps) {
  return (
    <div className="spriteViewerToolbar">
      <SpriteSelect
        spriteFsEntries={props.spriteFsEntries}
        selectedSprite={props.selectedSprite}
        onSelectedSpriteChanged={props.onSelectedSpriteChanged}
      />
    </div>
  );
}

interface ISpriteSelectProps {
  spriteFsEntries: MainFSPair[];
  selectedSprite: MainFSPair;
  onSelectedSpriteChanged(sprite: MainFSPair): void;
}

function SpriteSelect(props: ISpriteSelectProps) {
  const options = props.spriteFsEntries.map((entry) => {
    const value = entry.join("/");
    return (
      <option value={value} key={value}>
        {value}
      </option>
    );
  });
  return (
    <div className="spriteSelectContainer">
      Sprite:
      <select
        value={props.selectedSprite.join("/")}
        onChange={(e) => {
          const [d, f] = e.target.value.split("/").map((val) => parseInt(val));
          const selected = props.spriteFsEntries.find(
            (s) => s[0] === d && s[1] === f,
          );
          if (selected) {
            props.onSelectedSpriteChanged(selected);
          }
        }}
      >
        {options}
      </select>
    </div>
  );
}

interface ISpriteDisplayProps {
  selectedSprite: MainFSPair;
}

function SpriteDisplay(props: ISpriteDisplayProps) {
  const [d, f] = props.selectedSprite;
  const imgInfos = useMemo(() => {
    return _readImgsFromMainFS(d, f)!;
  }, [d, f]);

  const imgs = imgInfos.map((imgInfo, i) => {
    const dataUri = arrayBufferToDataURL(
      imgInfoSrcToArrayBuffer(imgInfo.src!),
      imgInfo.width,
      imgInfo.height,
    );
    return (
      <SpriteImage
        name={`Sprite ${d}/${f}`}
        key={`${d}-${f}-${i}`}
        dataUri={dataUri}
        height={imgInfo.height}
        width={imgInfo.width}
      />
    );
  });

  return <div className="spriteDisplayContainer">{imgs}</div>;
}

interface ISpriteImageProps {
  name: string;
  dataUri: string;
  width: number;
  height: number;
}

function SpriteImage(props: ISpriteImageProps) {
  return (
    <div className="spriteImageDiv">
      <img
        key={props.name}
        src={props.dataUri}
        height={props.height}
        width={props.width}
        alt={props.name}
      />
    </div>
  );
}

function getSpriteFSPairs(): MainFSPair[] {
  const fsPairs: MainFSPair[] = [];

  let mainfsDirCount = mainfs.getDirectoryCount();
  for (let d = 0; d < mainfsDirCount; d++) {
    let dirFileCount = mainfs.getFileCount(d);
    for (let f = 0; f < dirFileCount; f++) {
      try {
        const imgInfos = _readImgsFromMainFS(d, f);
        if (imgInfos) {
          fsPairs.push([d, f]);
        }
      } catch {}
    }
  }

  return fsPairs;
}

function _readImgsFromMainFS(dir: number, file: number): IImgInfo[] | null {
  let imgPackBuffer = mainfs.get(dir, file);
  let imgArr = fromPack(imgPackBuffer);
  if (!imgArr || !imgArr.length) return null;

  return imgArr;
}
