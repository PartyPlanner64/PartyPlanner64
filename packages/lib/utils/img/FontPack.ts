/*
 * The game fonts are packaged in a special file format.
 *
 * ```
 * struct FontPack {
 *   u32 palette_offset;
 *   u32 images_offset;
 *   u32 chars_offset;
 *   u16 palette[]; // RGBA5551. If palette_offset > 0
 *   u8 images[]; // 8-bit BMP. If images_offset > 0
 *   u8 chars[]; // 4-bit intensity BMP.
 * }
 * ```
 */

import { BMPtoRGBA } from "./BMP";
import { RGBA5551toRGBA32 } from "./RGBA5551";
import { Game } from "../../types";

interface SizeConfig {
  w: number;
  h: number;
}

/**
 * The known font size configurations from the game.
 */
const SIZE_CONFIGS: SizeConfig[] = [
  { w: 10, h: 12 },
  { w: 8, h: 8 },
];

/** Does the given file appear to be a font pack? */
export function isFontPack(buffer: ArrayBufferLike): boolean {
  const view = new DataView(buffer);

  // Sanity check size and offsets.
  if (view.byteLength < 32) {
    return false;
  }

  const paletteOffset = view.getUint32(0);
  const imagesOffset = view.getUint32(4);
  const charsOffset = view.getUint32(8);
  if (paletteOffset > imagesOffset || imagesOffset > charsOffset) {
    return false;
  }
  if (paletteOffset === imagesOffset && paletteOffset !== 0) {
    return false;
  }
  if (paletteOffset !== 12 && imagesOffset !== 12 && charsOffset !== 12) {
    return false;
  }

  const paletteSize = imagesOffset - paletteOffset;
  if (paletteSize % 2 !== 0) {
    return false;
  }

  return !!findMatchingSizeConfig(imagesOffset, charsOffset, view.byteLength);
}

function findMatchingSizeConfig(
  imagesOffset: number,
  charsOffset: number,
  byteLength: number,
): SizeConfig | null {
  for (const config of SIZE_CONFIGS) {
    const CHAR_PIXELS = config.w * config.h;

    if (imagesOffset > 0) {
      const imagesSize = charsOffset - imagesOffset;
      if (imagesSize % CHAR_PIXELS !== 0) {
        continue;
      }
    }

    const charsSize = byteLength - charsOffset;
    if (charsSize % (CHAR_PIXELS / 2) !== 0) {
      continue;
    }

    return config;
  }

  return null;
}

/** Checks if file is a known font pack from a specific game. */
export function isKnownFontPack(
  game: Game,
  dir: number,
  file: number,
): boolean {
  // switch (game) {
  //   case Game.MP1_USA:
  //     if (dir === 0) {
  //       if (file === 134) {
  //         return true;
  //       }
  //     }
  //     break;
  // }
  return false;
}

/** PP64 representation of a font pack. */
export interface IFontPack {
  images: ArrayBuffer[];
  chars: ArrayBuffer[];
  bpp: number;
  charWidth: number;
  charHeight: number;
}

export function fontPackToRGBA32(buffer: ArrayBufferLike): IFontPack {
  const view = new DataView(buffer);
  const paletteOffset = view.getUint32(0);
  const imagesOffset = view.getUint32(4);
  const charsOffset = view.getUint32(8);

  const config = findMatchingSizeConfig(
    imagesOffset,
    charsOffset,
    view.byteLength,
  );
  if (!config) {
    throw new Error("Unrecongized font size");
  }

  const CHAR_PIXELS = config.w * config.h;

  const pack: IFontPack = {
    images: [],
    chars: [],
    bpp: 32,
    charWidth: config.w,
    charHeight: config.h,
  };

  // Extract palette.
  const palette5551: number[] = [];
  if (paletteOffset > 0) {
    const paletteLen = (imagesOffset - paletteOffset) / 2;
    for (let i = 0; i < paletteLen; i++) {
      palette5551.push(view.getUint16(paletteOffset + i * 2));
    }
  }

  if (imagesOffset > 0) {
    let curImageOffset = imagesOffset;
    while (curImageOffset < charsOffset) {
      const rgba5551 = BMPtoRGBA(
        new DataView(buffer, curImageOffset, CHAR_PIXELS),
        palette5551,
        8,
        16,
      );
      const rgba32 = RGBA5551toRGBA32(rgba5551, config.w, config.h);
      pack.images.push(rgba32);

      curImageOffset += CHAR_PIXELS;
    }
  }

  // Intensity palette.
  const fakePalette = [0];
  for (let i = 1; i < 16; i++) {
    fakePalette.push(Math.floor(0xff * ((i + 1) / 16)));
  }

  let curCharOffset = charsOffset;
  while (curCharOffset < buffer.byteLength) {
    const rgba32 = BMPtoRGBA(
      new DataView(buffer, curCharOffset, CHAR_PIXELS / 2),
      fakePalette,
      4,
      32,
    );
    pack.chars.push(rgba32);

    curCharOffset += CHAR_PIXELS / 2;
  }

  return pack;
}
