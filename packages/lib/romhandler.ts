import { Game } from "./types";
import { scenes } from "./fs/scenes";
import { mainfs } from "./fs/mainfs";
import { strings } from "./fs/strings";
import { strings3 } from "./fs/strings3";
import { hvqfs } from "./fs/hvqfs";
import { audio } from "./fs/audio";
import { animationfs } from "./fs/animationfs";
import { makeDivisibleBy } from "./utils/number";
import { copyRange } from "./utils/arrays";
import { applyHook } from "./patches/gameshark/hook";
import { fixChecksum } from "./utils/CIC";
import { $$log } from "./utils/debug";
import { getROMAdapter } from "./adapter/adapters";
import { resetCheats } from "./patches/gameshark/cheats";

// The ROM Handler handles the ROM... it holds the ROM buffer reference and
// orchestrates ROM loading and saving via adapter code.
export const romhandler = new (class RomHandler {
  _rom: ArrayBuffer | null = null;
  _u8array: Uint8Array | null = null;
  _gameId: Game | null = null;
  _gameVersion: number | null = null;

  getROMGame(): Game | null {
    if (!this._rom) return null;

    if (this._gameId) return this._gameId as Game;

    if (this._rom.byteLength < 0x40) return null;

    this._gameId = String.fromCharCode(
      this._u8array![0x3b],
      this._u8array![0x3c],
      this._u8array![0x3d],
      this._u8array![0x3e]
    ) as Game;
    return this._gameId;
  }

  getROMBuffer() {
    return this._rom;
  }

  clear() {
    this._rom = null;
    this._u8array = null;
    this._gameId = null;
    this._gameVersion = null;

    scenes.clearCache();
    mainfs.clearCache();
    strings.clear();
    strings3.clear();
    hvqfs.clearCache();
    audio.clearCache();
    animationfs.clearCache();
  }

  setROMBuffer(
    buffer: ArrayBuffer | null,
    skipSupportedCheck: boolean,
    onError: (msg: string) => void
  ): Promise<boolean> {
    if (!buffer) {
      this.clear();
      return Promise.resolve(false);
    }

    this._rom = buffer;
    this._u8array = new Uint8Array(this._rom);

    this.byteSwapIfNeeded();

    if (!skipSupportedCheck && !this.romRecognized()) {
      onError("File is not recognized as any valid ROM.");
      this.clear();
      return Promise.resolve(false);
    }

    if (!this.romSupported()) {
      onError("This ROM is not supported right now.");
      this.clear();
      return Promise.resolve(false);
    }

    resetCheats();

    const gameVersion = this.getGameVersion();

    // A crude async attempt to hopefully free the UI thread a bit.
    const promises = [];
    promises.push(scenes.extractAsync());
    promises.push(mainfs.extractAsync());
    if (gameVersion === 3) promises.push(strings3.extractAsync());
    else promises.push(strings.extractAsync());
    promises.push(hvqfs.extractAsync());
    promises.push(audio.extractAsync());
    if (gameVersion === 2) promises.push(animationfs.extractAsync());

    return Promise.all(promises).then(() => {
      // Now that we've extracted, shrink _rom to just be the initial part of the ROM.
      const ovlStart = scenes.getInfo(0);
      this._rom = this._rom!.slice(0, ovlStart.rom_start);
      return true;
    });
  }

  saveROM(writeDecompressed: boolean): ArrayBuffer {
    if (!this._rom) throw new Error("Cannot save ROM, buffer was not present");

    const gameVersion = this.getGameVersion();

    const initialLen = this._rom.byteLength;

    // Grab all the sizes of the different sections.
    const sceneLen = makeDivisibleBy(scenes.getByteLength(), 16);
    const mainLen = makeDivisibleBy(
      mainfs.getByteLength(writeDecompressed),
      16
    );
    let strsLen;
    if (gameVersion === 3)
      strsLen = makeDivisibleBy(strings3.getByteLength(), 16);
    else strsLen = makeDivisibleBy(strings.getByteLength(), 16);
    const hvqLen = makeDivisibleBy(hvqfs.getByteLength(), 16);
    const audioLen = makeDivisibleBy(audio.getByteLength(), 16);
    let animationLen = 0;
    if (gameVersion === 2)
      animationLen = makeDivisibleBy(animationfs.getByteLength(), 16);

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
        audioLen
    );

    copyRange(newROMBuffer, this._rom, 0, 0, initialLen);

    applyHook(newROMBuffer); // Before main fs is packed

    mainfs.pack(newROMBuffer, writeDecompressed, initialLen + sceneLen);
    mainfs.setROMOffset(initialLen + sceneLen, newROMBuffer);

    if (gameVersion === 3) {
      strings3.pack(newROMBuffer, initialLen + sceneLen + mainLen);
      strings3.setROMOffset(initialLen + sceneLen + mainLen, newROMBuffer);
    } else {
      strings.pack(newROMBuffer, initialLen + sceneLen + mainLen);
      strings.setROMOffset(initialLen + sceneLen + mainLen, newROMBuffer);
    }

    hvqfs.pack(newROMBuffer, initialLen + sceneLen + mainLen + strsLen);
    hvqfs.setROMOffset(initialLen + mainLen + sceneLen + strsLen, newROMBuffer);

    if (gameVersion === 2) {
      animationfs.pack(
        newROMBuffer,
        initialLen + sceneLen + mainLen + strsLen + hvqLen
      );
      animationfs.setROMOffset(
        initialLen + sceneLen + mainLen + strsLen + hvqLen,
        newROMBuffer
      );
    }

    audio.pack(
      newROMBuffer,
      initialLen + sceneLen + mainLen + strsLen + hvqLen + animationLen
    );
    audio.setROMOffset(
      initialLen + sceneLen + mainLen + strsLen + hvqLen + animationLen,
      newROMBuffer
    );

    // Do this last, so that any patches made to scenes just prior take effect.
    scenes.pack(newROMBuffer, initialLen);

    const adapter = getROMAdapter({})!;
    if (adapter.onAfterSave) adapter.onAfterSave(new DataView(newROMBuffer));

    fixChecksum(newROMBuffer);

    this._rom = newROMBuffer.slice(0, initialLen);
    this._u8array = new Uint8Array(this._rom);

    return newROMBuffer;
  }

  romIsLoaded() {
    return !!this._rom;
  }

  getDataView(startingOffset = 0, endOffset = 0) {
    if (!this._rom) throw new Error("ROM not loaded, cannot get DataView.");
    if (endOffset) {
      return new DataView(
        this._rom,
        startingOffset,
        endOffset - startingOffset
      );
    }
    return new DataView(this._rom, startingOffset);
  }

  getGameVersion() {
    if (this._gameVersion !== null) return this._gameVersion;

    const gameID = this.getROMGame();
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

  romRecognized(): boolean {
    return this.getGameVersion() !== null;
  }

  romSupported(): boolean {
    let supported = false;
    switch (this.getROMGame()) {
      case Game.MP1_USA:
      case Game.MP2_USA:
      case Game.MP3_USA:
        supported = true;
    }
    return supported;
  }

  byteSwapIfNeeded(): void {
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
})();
