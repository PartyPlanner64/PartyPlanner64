import { $$log, $$hex } from "./debug";
import { arrayBufferToDataURL, toHexString } from "./arrays";
import { print } from "mips-inst";
import { pad } from "./string";
import {
  fromPack,
  imgInfoSrcToArrayBuffer,
  imgInfoSrcToDataView,
} from "./img/ImgPack";
import { fromTiles } from "./img/tiler";
import { strings3 } from "../fs/strings3";
import { strings } from "../fs/strings";
import { romhandler } from "../romhandler";
import { FORM } from "../models/FORM";
import { MTNX } from "../models/MTNX";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { isFontPack, fontPackToRGBA32, isKnownFontPack } from "./img/FontPack";

// The advanced "dump" feature packs all of the individual filesystem
// contents into a zip file. You can edit the zipped contents and import them,
// and your changes will be blindly applied to the ROM.

export function create(callback: (blob: Blob) => any) {
  const zip = new JSZip();

  const mainfsfolder = zip.folder("mainfs")!;
  const mainfs = romhandler.getRom()?.getMainFS()!;
  const mainfsDirCount = mainfs.getDirectoryCount();
  for (let d = 0; d < mainfsDirCount; d++) {
    const dirFolder = mainfsfolder.folder(d.toString())!;
    const dirFileCount = mainfs.getFileCount(d);
    for (let f = 0; f < dirFileCount; f++) {
      const file = mainfs.get(d, f);
      let name = f.toString();
      if (FORM.isForm(file)) name += ".form";
      else if (MTNX.isMtnx(file)) name += ".mtnx";
      dirFolder.file(name, file);
    }
  }

  zip.generateAsync({ type: "blob" }).then(callback);
}

export function load(buffer: ArrayBuffer, onError: (error: unknown) => void) {
  const zip = new JSZip();
  zip.loadAsync(buffer).then(
    (zip) => {
      const mainfsfolder = zip.folder("mainfs")!;
      mainfsfolder.forEach((relativePath, file) => {
        const dirFileRegex = /(\d+)\/(\d+)/;
        const match = relativePath.match(dirFileRegex);
        if (!match) return;
        const d = parseInt(match[1]);
        const f = parseInt(match[2]);
        if (isNaN(d) || isNaN(f)) return;
        file.async("arraybuffer").then((content: ArrayBuffer) => {
          $$log(`Overwriting MainFS ${d}/${f}`);
          const mainfs = romhandler.getRom()?.getMainFS()!;
          mainfs.write(d, f, content);
        });
      });
    },
    (error: any) => {
      onError(error);
    },
  );
}

// Called via console dump.images();
export function images() {
  const zip = new JSZip();

  const game = romhandler.getROMGame()!;

  const mainfsfolder = zip.folder("mainfs")!;
  const mainfs = romhandler.getRom()?.getMainFS()!;
  const mainfsDirCount = mainfs.getDirectoryCount();
  for (let d = 0; d < mainfsDirCount; d++) {
    const dirFolder = mainfsfolder.folder(d.toString())!;
    const dirFileCount = mainfs.getFileCount(d);
    for (let f = 0; f < dirFileCount; f++) {
      try {
        const fileBuffer = mainfs.get(d, f);
        if (FORM.isForm(fileBuffer)) {
          try {
            const formUnpacked = FORM.unpack(fileBuffer)!;
            if (formUnpacked.BMP1.length) {
              formUnpacked.BMP1.forEach((bmpEntry, idx) => {
                const dataUri = arrayBufferToDataURL(
                  bmpEntry.parsed.src,
                  bmpEntry.parsed.width,
                  bmpEntry.parsed.height,
                );
                dirFolder.file(
                  `${f}.${idx}.png`,
                  dataUri.substr(dataUri.indexOf(",") + 1),
                  { base64: true },
                );
              });
            }
          } catch {}
          continue;
        }

        if (
          (d === 0 && isFontPack(fileBuffer)) ||
          isKnownFontPack(game, d, f)
        ) {
          let fontPack;
          try {
            fontPack = fontPackToRGBA32(fileBuffer);
          } catch {}

          if (fontPack) {
            const { charWidth, charHeight } = fontPack;
            let idx = 0;
            fontPack.chars.forEach((charImg) => {
              const dataUri = arrayBufferToDataURL(
                charImg,
                charWidth,
                charHeight,
              );
              dirFolder.file(
                `${f}.${idx}.png`,
                dataUri.substr(dataUri.indexOf(",") + 1),
                { base64: true },
              );
              idx++;
            });
            fontPack.images.forEach((img) => {
              const dataUri = arrayBufferToDataURL(img, charWidth, charHeight);
              dirFolder.file(
                `${f}.${idx}.png`,
                dataUri.substr(dataUri.indexOf(",") + 1),
                { base64: true },
              );
              idx++;
            });

            const dataViews = fontPack.chars
              .concat(fontPack.images)
              .map((buffer) => new DataView(buffer));
            const tilesBuf = fromTiles(
              dataViews,
              dataViews.length,
              1,
              charWidth * 4,
              charHeight,
            );
            const tilesUrl = arrayBufferToDataURL(
              tilesBuf,
              charWidth * dataViews.length,
              charHeight,
            );
            dirFolder.file(
              `${f}.all.png`,
              tilesUrl.substr(tilesUrl.indexOf(",") + 1),
              { base64: true },
            );

            continue;
          }
        }

        // Maybe an ImgPack?
        const imgs = _readImgsFromMainFS(d, f)!;
        imgs.forEach((imgInfo, idx) => {
          const dataUri = arrayBufferToDataURL(
            imgInfoSrcToArrayBuffer(imgInfo.src!),
            imgInfo.width,
            imgInfo.height,
          );
          dirFolder.file(
            `${f}.${idx}.png`,
            dataUri.substr(dataUri.indexOf(",") + 1),
            { base64: true },
          );
        });
        if (imgs.length > 1) {
          const tilesBuf = fromTiles(
            _readPackedFromMainFS(d, f)!,
            imgs.length,
            1,
            imgs[0].width * 4,
            imgs[0].height,
          );
          const tilesUrl = arrayBufferToDataURL(
            tilesBuf,
            imgs[0].width * imgs.length,
            imgs[0].height,
          );
          dirFolder.file(
            `${f}.all.png`,
            tilesUrl.substr(tilesUrl.indexOf(",") + 1),
            { base64: true },
          );
        }
      } catch (e) {}
    }
  }

  zip.generateAsync({ type: "blob" }).then((blob: Blob) => {
    saveAs(blob, `mp${romhandler.getGameVersion()}-images.zip`);
  });

  function _readPackedFromMainFS(dir: number, file: number) {
    const imgPackBuffer = mainfs.get(dir, file);
    const imgArr = fromPack(imgPackBuffer);
    if (!imgArr || !imgArr.length) return;

    const dataViews = imgArr.map((imgInfo) => {
      return imgInfoSrcToDataView(imgInfo.src!);
    });

    return dataViews;
  }

  function _readImgsFromMainFS(dir: number, file: number) {
    const imgPackBuffer = mainfs.get(dir, file);
    const imgArr = fromPack(imgPackBuffer);
    if (!imgArr || !imgArr.length) return;

    return imgArr;
  }
}

// Dump out all the FORM bitmaps.
export function formImages() {
  const mainfs = romhandler.getRom()?.getMainFS()!;
  const mainfsDirCount = mainfs.getDirectoryCount();
  for (let d = 0; d < mainfsDirCount; d++) {
    const dirFileCount = mainfs.getFileCount(d);
    for (let f = 0; f < dirFileCount; f++) {
      const fileBuffer = mainfs.get(d, f);
      if (!FORM.isForm(fileBuffer)) continue;

      try {
        const formUnpacked = FORM.unpack(fileBuffer)!;
        if (formUnpacked.BMP1.length) {
          formUnpacked.BMP1.forEach((bmpEntry) => {
            const dataUri = arrayBufferToDataURL(
              bmpEntry.parsed.src,
              bmpEntry.parsed.width,
              bmpEntry.parsed.height,
            );
            console.log(`${d}/${f}:`);
            console.log(dataUri);
          });
        }
      } catch (e) {}
    }
  }
}

export function findStrings3(searchStr = "", raw = false) {
  const dirCount = strings3.getDirectoryCount("en");
  for (let d = 0; d < dirCount; d++) {
    const strCount = strings3.getStringCount("en", d);
    for (let s = 0; s < strCount; s++) {
      const str = strings3.read("en", d, s) as string;
      if (str.indexOf(searchStr) < 0) continue;
      let log = `${d}/${s} (${$$hex(d)}/${$$hex(s)}):\n` + str;
      if (raw)
        log +=
          "\n" + toHexString(strings3.read("en", d, s, true) as ArrayBuffer);
      console.log(log);
    }
  }
}

export function findStrings(searchStr = "", raw = false) {
  const strCount = strings.getStringCount();
  for (let s = 0; s < strCount; s++) {
    const str = strings.read(s) as string;
    if (str.indexOf(searchStr) < 0) continue;
    let log = `${s} (${$$hex(s)}):\n` + str;
    if (raw) log += "\n" + toHexString(strings.read(s, true) as ArrayBuffer);
    console.log(log);
  }
}

export function saveWaluigi() {
  if (romhandler.getGameVersion() !== 3)
    throw new Error(`Waluigi is not in game ${romhandler.getGameVersion()}`);

  (window as any).waluigiParts = [];
  for (let f = 0; f < 163; f++) {
    const mainfs = romhandler.getRom()?.getMainFS()!;
    (window as any).waluigiParts.push(mainfs.get(8, f));
  }

  return (window as any).waluigiParts; // Just to see in console.
}

export function writeWaluigi(character = 1) {
  if (romhandler.getGameVersion() !== 1)
    throw new Error(`Waluigi cannot write to MP${romhandler.getGameVersion()}`);

  if (!(window as any).waluigiParts)
    throw new Error("Need to call saveWaluigi first!");

  if ((window as any).waluigiParts.length === 163) {
    // A couple animations are "extra"... not sure which but for now just cut the last two MTNX
    (window as any).waluigiParts.splice(158, 2);
  }

  for (let i = 0; i < (window as any).waluigiParts.length; i++) {
    const mainfs = romhandler.getRom()?.getMainFS()!;
    mainfs.write(character, i, (window as any).waluigiParts[i]);
  }
}

export function saveDaisy() {
  if (romhandler.getGameVersion() !== 3)
    throw new Error(`Daisy is not in game ${romhandler.getGameVersion()}`);

  const mainfs = romhandler.getRom()?.getMainFS()!;
  (window as any).daisyParts = [];
  (window as any).daisyParts.push(mainfs.get(9, 1));
  (window as any).daisyParts.push(mainfs.get(9, 3));

  return (window as any).daisyParts; // Just to see in console.
}

export function writeDaisy(character = 6) {
  if (romhandler.getGameVersion() !== 1)
    throw new Error(`Daisy cannot write to MP${romhandler.getGameVersion()}`);

  if (!(window as any).daisyParts)
    throw new Error("Need to call saveDaisy first!");

  const mainfs = romhandler.getRom()?.getMainFS()!;
  mainfs.write(character, 158, (window as any).daisyParts[0]);
  mainfs.write(character, 159, (window as any).daisyParts[1]);
}

// Helper for finding FS read locations
export function searchForPatchLocations(offset: number) {
  if (!offset)
    throw new Error(
      "Please pass a ROM offset the game tries to read at runtime",
    );

  const upper = (offset & 0xffff0000) >>> 16;
  const lower = offset & 0x0000ffff;

  let found = 0;

  // FIXME: Won't work once scenes are in separate data views.
  const romView = romhandler.getDataView();
  const upperLimit = romView.byteLength - 10; // Since we read ahead for every i, just stop early.
  for (let i = 2; i < upperLimit; i += 2) {
    const val = romView.getUint16(i);
    if (val !== upper && val + 1 !== upper && val - 1 !== upper)
      // Desperate times call for desperate measures (and I forget which way to +-1)
      continue;

    let last = 0;
    if (
      (i > 8 && romView.getUint16((last = i - 8)) === lower) ||
      (i > 4 && romView.getUint16((last = i - 4)) === lower) ||
      romView.getUint16((last = i + 2)) === lower || // === offset basically
      romView.getUint16((last = i + 3)) === lower || // Odd are unlikely unless compressed
      romView.getUint16((last = i + 4)) === lower ||
      romView.getUint16((last = i + 5)) === lower ||
      romView.getUint16((last = i + 6)) === lower ||
      romView.getUint16((last = i + 7)) === lower ||
      romView.getUint16((last = i + 8)) === lower ||
      romView.getUint16((last = i + 9)) === lower ||
      romView.getUint16((last = i + 10)) === lower ||
      romView.getUint16((last = i + 12)) === lower ||
      romView.getUint16((last = i + 16)) === lower ||
      romView.getUint16((last = i + 20)) === lower
    ) {
      console.log(
        `Found ${$$hex(i)}, ${$$hex(last)} (${last - i}) Lower inst: ${$$hex(
          romView.getUint16(last - 2),
        )}`,
      );
      found++;
    }
  }

  console.log(`Found ${found} possible locations`);
}

export function printSceneTable() {
  const rom = romhandler.getRom();
  if (!rom) {
    console.log("ROM is not loaded");
    return;
  }

  const scenes = rom.getScenes();
  const sceneCount = scenes.count();
  const table = [];
  for (let i = 0; i < sceneCount; i++) {
    const info = scenes.getInfo(i);
    table.push({
      i: $$hex(i),
      rom_start: $$hex(info.rom_start),
      rom_end: $$hex(info.rom_end),
      ram_start: $$hex(info.ram_start),
      code_start: $$hex(info.code_start),
      code_end: $$hex(info.code_end),
      rodata_start: $$hex(info.rodata_start),
      rodata_end: $$hex(info.rodata_end),
      bss_start: $$hex(info.bss_start),
      bss_end: $$hex(info.bss_end),
    });
  }

  console.table(table);
}

/** Prints the overlay table in n64split format. */
export function printSceneN64Split() {
  const rom = romhandler.getRom();
  if (!rom) {
    console.log("ROM is not loaded");
    return;
  }

  const scenes = rom.getScenes();
  const sceneCount = scenes.count();
  const strings = [];
  for (let i = 0; i < sceneCount; i++) {
    const info = scenes.getInfo(i);

    strings.push(
      `   - [${$$hex(info.rom_start)}, ${$$hex(
        info.rom_start + (info.code_end - info.code_start),
      )}, "asm", "overlay${i}_main", ${$$hex(info.code_start)}]`,
    );
    strings.push(
      `   - [${$$hex(
        info.rom_start + (info.rodata_start - info.code_start),
      )}, ${$$hex(
        info.rom_start + (info.rodata_end - info.code_start),
      )}, "bin", "overlay${i}_rodata_bin"]`,
    );
    strings.push(
      `   # overlay${i} bss: ${$$hex(info.bss_start)} - ${$$hex(info.bss_end)}`,
    );
  }

  console.log(strings.join("\n"));
}

/** Prints the overlay table in n64splat format. */
export function printSceneN64Splat() {
  const rom = romhandler.getRom();
  if (!rom) {
    console.log("ROM is not loaded");
    return;
  }

  const scenes = rom.getScenes();
  const sceneCount = scenes.count();
  const strings = [];
  for (let i = 0; i < sceneCount; i++) {
    const info = scenes.getInfo(i);

    strings.push(`  - name: overlay${i}`);
    strings.push("    type: code");
    strings.push("    overlay: True");
    strings.push(`    start: ${$$hex(info.rom_start)}`);
    strings.push(`    vram: ${$$hex(info.code_start)}`);
    strings.push("    files:");
    strings.push(`      - [${$$hex(info.rom_start)}, "asm"]`);
    strings.push(
      `      - [${$$hex(
        info.rom_start + (info.rodata_start - info.code_start),
      )}, "bin"] # rodata`,
    );
    strings.push("");
  }

  console.log(strings.join("\n"));
}

// Prints region of ROM as assembly instructions
export function printAsm(start: number, end: number) {
  const romView = romhandler.getDataView();
  let curOffset = start;
  const insts = [];
  while (curOffset <= end) {
    const value = romView.getUint32(curOffset);
    let asm = "? " + $$hex(value);
    try {
      asm = print(value);
    } catch (e) {
      console.log("UNRECOGNIZED: " + $$hex(value));
    }
    insts.push($$hex(curOffset) + ": " + asm);
    curOffset += 4;
  }

  console.log(insts.join("\n"));
}

/**
 * Prints the assembly from an overlay.
 * @param {number} sceneIndex
 */
export function printSceneAsm(sceneIndex: number) {
  const rom = romhandler.getRom();
  if (!rom) {
    console.log("ROM is not loaded");
    return;
  }

  const scenes = rom.getScenes();
  const sceneInfo = scenes.getInfo(sceneIndex);
  let currentAsmAddr = sceneInfo.code_start;
  const codeDataView = scenes.getCodeDataView(sceneIndex);
  const insts = [];
  for (let i = 0; i < codeDataView.byteLength; i += 4) {
    const value = codeDataView.getUint32(i);
    let asm = "? " + $$hex(value);
    try {
      asm = print(value);
    } catch (e) {
      console.log("UNRECOGNIZED: " + $$hex(value));
    }
    insts.push($$hex(currentAsmAddr) + ": " + asm);
    currentAsmAddr += 4;
  }

  console.log(insts.join("\n"));

  const roDataView = scenes.getRoDataView(sceneIndex);
  let lines = [];
  currentAsmAddr = sceneInfo.rodata_start;
  let i = 0;
  while (i < roDataView.byteLength) {
    lines.push(
      "D_" +
        $$hex(currentAsmAddr, "") +
        ": " +
        pad($$hex(roDataView.getUint32(i), ""), 8, "0"),
    );
    lines.push(
      "D_" +
        $$hex(currentAsmAddr + 4, "") +
        ": " +
        pad($$hex(roDataView.getUint32(i + 4), ""), 8, "0"),
    );
    lines.push(
      "D_" +
        $$hex(currentAsmAddr + 8, "") +
        ": " +
        pad($$hex(roDataView.getUint32(i + 8), ""), 8, "0"),
    );
    lines.push(
      "D_" +
        $$hex(currentAsmAddr + 12, "") +
        ": " +
        pad($$hex(roDataView.getUint32(i + 12), ""), 8, "0"),
    );
    currentAsmAddr += 16;
    i += 16;
  }
  console.log(lines.join("\n"));

  lines = [];
  for (let b = sceneInfo.bss_start; b < sceneInfo.bss_end; b += 4) {
    lines.push(`D_${$$hex(b, "")}: .word 0`);
  }
  console.log(lines.join("\n"));
}
