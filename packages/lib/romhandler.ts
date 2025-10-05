import { Game, GameVersion } from "./types";
import { Scenes } from "./fs/scenes";
import { MainFS } from "./fs/mainfs";
import { Strings } from "./fs/strings";
import { Strings3 } from "./fs/strings3";
import { HVQFS } from "./fs/hvqfs";
import { Audio } from "./fs/audio";
import { Animationfs } from "./fs/animationfs";
import { makeDivisibleBy } from "./utils/number";
import { copyRange } from "./utils/arrays";
import { applyHook } from "./patches/gameshark/hook";
import { fixChecksum } from "./utils/CIC";
import { $$log } from "./utils/debug";
import { getROMAdapter } from "./adapter/adapters";
import { resetCheats } from "./patches/gameshark/cheats";

/** Represents a loaded Mario Party ROM in memory. */
export class ROM {
  private _rom: ArrayBuffer;
  private _u8array: Uint8Array;

  private _scenes: Scenes | null = null;
  private _mainfs: MainFS | null = null;
  private _hvqfs: HVQFS | null = null;
  private _audio: Audio | null = null;
  private _strings: Strings | null = null;
  private _strings3: Strings3 | null = null;
  private _animationFS: Animationfs | null = null;

  private _gameId: Game | null = null;
  private _gameVersion: GameVersion | null = null;

  public constructor(rom: ArrayBuffer) {
    this._rom = rom;
    this._u8array = new Uint8Array(this._rom);
    this.byteSwapIfNeeded();
  }

  public getBuffer(): ArrayBuffer {
    return this._rom;
  }

  public setBuffer(rom: ArrayBuffer): void {
    this._rom = rom;
    this._u8array = new Uint8Array(this._rom);
  }

  public getDataView(startingOffset = 0, endOffset = 0): DataView<ArrayBuffer> {
    if (!this._rom) throw new Error("ROM not loaded, cannot get DataView.");
    if (endOffset) {
      return new DataView(
        this._rom,
        startingOffset,
        endOffset - startingOffset,
      );
    }
    return new DataView(this._rom, startingOffset);
  }

  public getGame(): Game | null {
    if (this._gameId) return this._gameId as Game;

    if (this._rom.byteLength < 0x40) return null;

    this._gameId = String.fromCharCode(
      this._u8array![0x3b],
      this._u8array![0x3c],
      this._u8array![0x3d],
      this._u8array![0x3e],
    ) as Game;
    return this._gameId;
  }

  public getGameVersion(): GameVersion | null {
    if (this._gameVersion !== null) return this._gameVersion;

    const gameID = this.getGame();
    if (!gameID) return null;

    switch (gameID) {
      case Game.MP1_USA:
      case Game.MP1_JPN:
      case Game.MP1_PAL:
        this._gameVersion = 1;
        return 1;
      case Game.MP2_USA:
      case Game.MP2_JPN:
        this._gameVersion = 2;
        return 2;
      case Game.MP3_USA:
      case Game.MP3_JPN:
        this._gameVersion = 3;
        return 3;
    }

    return null;
  }

  public romRecognized(): boolean {
    return this.getGameVersion() !== null;
  }

  public romSupported(): boolean {
    let supported = false;
    switch (this.getGame()) {
      case Game.MP1_USA:
      case Game.MP2_USA:
      case Game.MP3_USA:
        supported = true;
    }
    return supported;
  }

  public getScenes(): Scenes {
    if (!this._scenes) {
      throw new Error("ROM was not loaded");
    }
    return this._scenes;
  }

  public getMainFS(): MainFS {
    if (!this._mainfs) {
      throw new Error("ROM was not loaded");
    }
    return this._mainfs;
  }

  public getHVQFS(): HVQFS {
    if (!this._hvqfs) {
      throw new Error("ROM was not loaded");
    }
    return this._hvqfs;
  }

  public getAudio(): Audio {
    if (!this._audio) {
      throw new Error("ROM was not loaded");
    }
    return this._audio;
  }

  public getStrings(): Strings {
    if (!this._strings) {
      throw new Error("ROM was not loaded");
    }
    return this._strings;
  }

  public getStrings3(): Strings3 {
    if (!this._strings3) {
      throw new Error("ROM was not loaded");
    }
    return this._strings3;
  }

  public getAnimationFS(): Animationfs {
    if (!this._animationFS) {
      throw new Error("ROM was not loaded, or doesn't have animations");
    }
    return this._animationFS;
  }

  public async loadAsync(): Promise<boolean> {
    const gameVersion = this.getGameVersion();

    // A crude async attempt to hopefully free the UI thread a bit.
    const promises = [];
    this._scenes = new Scenes(this);
    promises.push(this._scenes.extractAsync());
    this._mainfs = new MainFS(this);
    promises.push(this._mainfs.extractAsync());
    if (gameVersion === 3) {
      this._strings3 = new Strings3(this);
      promises.push(this._strings3.extractAsync());
    } else {
      this._strings = new Strings(this);
      promises.push(this._strings.extractAsync());
    }
    this._hvqfs = new HVQFS(this);
    promises.push(this._hvqfs.extractAsync());
    this._audio = new Audio(this);
    promises.push(this._audio.extractAsync());
    if (gameVersion === 2) {
      this._animationFS = new Animationfs(this);
      promises.push(this._animationFS.extractAsync());
    }

    await Promise.all(promises);

    // Now that we've extracted, shrink _rom to just be the initial part of the ROM.
    const ovlStart = this._scenes.getInfo(0);
    this.setBuffer(this.getBuffer().slice(0, ovlStart.rom_start));
    return true;
  }

  private byteSwapIfNeeded(): void {
    if (!this._rom || this._rom.byteLength < 4 || !this._u8array) return;
    const romView = this.getDataView();
    const magic = romView.getUint32(0);
    if (magic === 0x80371240) return; // Normal, big endian ROM.

    $$log("Byteswapping ROM...");
    const evenLen = this._rom.byteLength - (this._rom.byteLength % 2);
    const fourLen = this._rom.byteLength - (this._rom.byteLength % 4);
    if (magic === 0x37804012) {
      // BADC, .v64 format
      for (let i = 0; i < evenLen; i += 2) {
        [this._u8array[i], this._u8array[i + 1]] = [
          this._u8array[i + 1],
          this._u8array[i],
        ];
      }
    } else if (magic === 0x40123780) {
      // DCBA, little endian
      for (let i = 0; i < fourLen; i += 4) {
        [
          this._u8array[i],
          this._u8array[i + 1],
          this._u8array[i + 2],
          this._u8array[i + 3],
        ] = [
          this._u8array[i + 3],
          this._u8array[i + 2],
          this._u8array[i + 1],
          this._u8array[i],
        ];
      }
    } else if (magic === 0x12408037) {
      // CDAB, wordswapped
      for (let i = 0; i < fourLen; i += 4) {
        const last = romView.getUint16(i + 2);
        romView.setUint16(i + 2, romView.getUint16(i));
        romView.setUint16(i, last);
      }
    }
  }
}

/**
 * The ROM Handler handles the ROM... it holds the ROM buffer reference and
 * orchestrates ROM loading and saving via adapter code.
 */
class RomHandler {
  _rom: ROM | null = null;

  public getRom(): ROM | null {
    return this._rom;
  }

  public getROMGame(): Game | null {
    return this._rom?.getGame() ?? null;
  }

  public getROMBuffer(): ArrayBuffer | null {
    return this._rom?.getBuffer() ?? null;
  }

  public clear(): void {
    this._rom = null;
  }

  setROMBuffer(
    buffer: ArrayBuffer | null,
    skipSupportedCheck: boolean,
    onError: (msg: string) => void,
  ): Promise<boolean> {
    if (!buffer) {
      this.clear();
      return Promise.resolve(false);
    }

    const rom = (this._rom = new ROM(buffer));

    if (!rom.romRecognized()) {
      onError("File is not recognized as any valid ROM.");
      this.clear();
      return Promise.resolve(false);
    }

    if (!skipSupportedCheck && !rom.romSupported()) {
      onError("This ROM is not supported right now.");
      this.clear();
      return Promise.resolve(false);
    }

    resetCheats();

    return rom.loadAsync();
  }

  saveROM(writeDecompressed: boolean): ArrayBuffer {
    const rom = this._rom;
    if (!rom) throw new Error("Cannot save ROM, buffer was not present");

    const gameVersion = this.getGameVersion();

    const initialLen = rom.getBuffer().byteLength;

    // Grab all the sizes of the different sections.
    const sceneLen = makeDivisibleBy(rom.getScenes().getByteLength(), 16);
    const mainLen = makeDivisibleBy(
      rom.getMainFS().getByteLength(writeDecompressed),
      16,
    );
    let strsLen;
    if (gameVersion === 3)
      strsLen = makeDivisibleBy(rom.getStrings3().getByteLength(), 16);
    else strsLen = makeDivisibleBy(rom.getStrings().getByteLength(), 16);
    const hvqLen = makeDivisibleBy(rom.getHVQFS().getByteLength(), 16);
    const audioLen = makeDivisibleBy(rom.getAudio().getByteLength(), 16);
    let animationLen = 0;
    if (gameVersion === 2) {
      animationLen = makeDivisibleBy(rom.getAnimationFS().getByteLength(), 16);
    }

    // Seems to crash unless HVQ is aligned so that the +1 ADDIU trick is not needed. Just fudge strsLen to push it up.
    while ((initialLen + sceneLen + mainLen + strsLen) & 0x8000) {
      strsLen += 0x1000;
    }

    const newROMBuffer = new ArrayBuffer(
      initialLen +
        sceneLen +
        mainLen +
        strsLen +
        hvqLen +
        animationLen +
        audioLen,
    );

    copyRange(newROMBuffer, rom.getBuffer(), 0, 0, initialLen);

    applyHook(newROMBuffer); // Before main fs is packed

    const mainfs = rom.getMainFS();
    mainfs.pack(newROMBuffer, writeDecompressed, initialLen + sceneLen);
    mainfs.setROMOffset(initialLen + sceneLen, newROMBuffer);

    if (gameVersion === 3) {
      const strings3 = rom.getStrings3();
      strings3.pack(newROMBuffer, initialLen + sceneLen + mainLen);
      strings3.setROMOffset(initialLen + sceneLen + mainLen, newROMBuffer);
    } else {
      const strings = rom.getStrings();
      strings.pack(newROMBuffer, initialLen + sceneLen + mainLen);
      strings.setROMOffset(initialLen + sceneLen + mainLen, newROMBuffer);
    }

    const hvqfs = rom.getHVQFS();
    hvqfs.pack(newROMBuffer, initialLen + sceneLen + mainLen + strsLen);
    hvqfs.setROMOffset(initialLen + mainLen + sceneLen + strsLen, newROMBuffer);

    if (gameVersion === 2) {
      const animationfs = rom.getAnimationFS();
      animationfs.pack(
        newROMBuffer,
        initialLen + sceneLen + mainLen + strsLen + hvqLen,
      );
      animationfs.setROMOffset(
        initialLen + sceneLen + mainLen + strsLen + hvqLen,
        newROMBuffer,
      );
    }

    const audio = rom.getAudio();
    audio.pack(
      newROMBuffer,
      initialLen + sceneLen + mainLen + strsLen + hvqLen + animationLen,
    );
    audio.setROMOffset(
      initialLen + sceneLen + mainLen + strsLen + hvqLen + animationLen,
      newROMBuffer,
    );

    // Do this last, so that any patches made to scenes just prior take effect.
    rom.getScenes().pack(newROMBuffer, initialLen);

    const adapter = getROMAdapter({})!;
    if (adapter.onAfterSave) adapter.onAfterSave(new DataView(newROMBuffer));

    fixChecksum(newROMBuffer);

    rom.setBuffer(newROMBuffer.slice(0, initialLen));

    return newROMBuffer;
  }

  romIsLoaded(): boolean {
    return !!this._rom;
  }

  getDataView(startingOffset = 0, endOffset = 0): DataView<ArrayBuffer> {
    if (!this._rom) throw new Error("ROM not loaded, cannot get DataView.");
    return this._rom.getDataView(startingOffset, endOffset);
  }

  getGameVersion(): GameVersion | null {
    return this._rom?.getGameVersion() ?? null;
  }

  romRecognized(): boolean {
    return this._rom?.romRecognized() ?? false;
  }

  romSupported(): boolean {
    return this._rom?.romSupported() ?? false;
  }
}

export const romhandler = new RomHandler();
