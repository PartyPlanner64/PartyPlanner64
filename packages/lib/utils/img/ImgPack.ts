import { BMPtoRGBA, BMPfromRGBA } from "./BMP";
import { GrayscaleToRGBA32 } from "./Grayscale";
import { copyRange } from "../arrays";
import { RGBA5551toRGBA32, RGBA5551fromRGBA32 } from "./RGBA5551";

// Aside from raw RGB5551, there is also a format with a header followed by
// one or more images sequentially. May be raw or bitmap with palette.
//
// All offsets are SEEK_START.
//
// struct ImgPack {
//   u32 entry_offset; // Offset to the first ImgPack_Entry
//   u32 unknown_offset; // This segment only has contents with multiple images packed
//   u32 images_offset; // Offset to the start of the first image data (redundant)
//   u32 pallete_offset; // If no palette, just points to end of file
//   u16 image_count;
//   u16 unknown; // Palette presence bool?
//   u16 total_width; // Sum of widths of all images
//   u16 total_height; // Sum of heights of all images
//   u8 unknown; // Value is 80 in at least one instance, so this isn't the upper half of a u16
//   u8 pixel_bit_count; // Number of bits per pixel (not factoring in size of palette colors)
//   u16 unknown;
//   u32 / u16*2 unknown; // Zeroes to fill to reach entry_offset?
//
//   // Follows by contiguous ImgPack_Entry[image_count]
//   // Then, some unknown data if unknown_offset is in play.
//   // Then, the raw image data, and then the pallete.
//   // Technically, the first few offsets could change this order.
// }
//
// struct ImgPack_Entry {
//   u32 img_start_offset;
//   u16 width;
//   u16 height;
//   s16 origin_x;
//   s16 origin_y;
// }

type ImgInfoSrc = ArrayBuffer | ImageDataArray;

export interface IImgInfo {
  width: number;
  height: number;
  src?: ImgInfoSrc;
  _bmpData?: any;
  bpp?: number;
}

export function imgInfoSrcToArrayBuffer(imgInfoSrc: ImgInfoSrc): ArrayBuffer {
  if (imgInfoSrc instanceof ArrayBuffer) {
    return imgInfoSrc;
  } else {
    return imgInfoSrc.buffer.slice(
      imgInfoSrc.byteOffset,
      imgInfoSrc.byteOffset + imgInfoSrc.byteLength,
    );
  }
}

export function imgInfoSrcToDataView(
  imgInfoSrc: ImgInfoSrc,
): DataView<ArrayBuffer> {
  if (imgInfoSrc instanceof ArrayBuffer) {
    return new DataView(imgInfoSrc);
  } else {
    return new DataView(
      imgInfoSrc.buffer,
      imgInfoSrc.byteOffset,
      imgInfoSrc.byteLength,
    );
  }
}

// Rips each image from a ImgPack and returns an array of RGBA32.
export function fromPack(buffer: ArrayBuffer) {
  // Read useful header values
  const inView = new DataView(buffer);
  const entryOffset = inView.getUint32(0);
  let paletteOffset = inView.getUint32(12);
  const imageCount = inView.getUint16(16);
  const bitCount = inView.getUint8(25);

  // Pull out the pallete values, if applicable.
  const hasPalette = paletteOffset !== inView.byteLength;
  const palette: number[] = [];
  if (hasPalette) {
    while (paletteOffset !== inView.byteLength) {
      palette.push(inView.getUint16(paletteOffset));
      paletteOffset += 2;
    }
  }

  // console.log("ImgPack.fromPack / entryOffset: " + entryOffset
  //   + " / paletteOffset: " + paletteOffset + " (hasPalette: " + hasPalette + ")"
  //   + " / imageCount: " + imageCount
  //   + " / bitCount: " + bitCount);

  // Loop and convert to output images.
  const output = [];
  let curEntryOffset = entryOffset;
  let curEntryView = new DataView(buffer, curEntryOffset);
  for (let i = 0; i < imageCount; i++) {
    const imgOffset = curEntryView.getUint32(0);
    const imgWidth = curEntryView.getUint16(4);
    const imgHeight = curEntryView.getUint16(6);
    let imgByteCount;
    if (bitCount >= 8) imgByteCount = (bitCount * imgWidth * imgHeight) / 8;
    else imgByteCount = (imgWidth * imgHeight) / (8 / bitCount);
    let rawImgBuffer = buffer.slice(imgOffset, imgOffset + imgByteCount);

    //console.log("Reading image [offset: " + imgOffset + " / width: " + imgWidth + " / height: " + imgHeight + "] (byteLength: " + imgByteCount + ")");

    if (hasPalette)
      rawImgBuffer = BMPtoRGBA(rawImgBuffer, palette, bitCount, 16);
    const imgInfo: IImgInfo = {
      width: imgWidth,
      height: imgHeight,
    };
    if (bitCount === 32) {
      imgInfo.src = rawImgBuffer;
    } else if (bitCount === 16 || hasPalette) {
      imgInfo.src = RGBA5551toRGBA32(rawImgBuffer, imgWidth, imgHeight);
    } else if (bitCount === 4 || bitCount === 8) {
      imgInfo.src = GrayscaleToRGBA32(
        rawImgBuffer,
        imgWidth,
        imgHeight,
        bitCount,
      );
    }
    output.push(imgInfo);

    curEntryOffset += 12; // sizeof(ImgPack_Entry)
    curEntryView = new DataView(buffer, curEntryOffset);
  }

  return output;
}

// Creates a new ImgPack from an array of image buffers, and optionally:
//   oldPack: The old pack being replaced, used for grabbing mystery values
export function toPack(
  imgInfoArr: IImgInfo[],
  outBpp: number,
  bmpBpp: number,
  oldPack?: ArrayBuffer,
) {
  let newPackSize = getByteLength(imgInfoArr, outBpp);

  let bmpData, palette;
  if (bmpBpp) {
    // FIXME: There could be multiple images and the palette needs to be comprehensive.
    [bmpData, palette] = BMPfromRGBA(imgInfoArr[0].src!, imgInfoArr[0].bpp!, 8);
    imgInfoArr[0]._bmpData = bmpData;
    newPackSize += palette.colors.length * (outBpp / bmpBpp);
    newPackSize -= imgInfoArr[0].src!.byteLength - bmpData.byteLength;
  }

  const newPack = new ArrayBuffer(newPackSize);
  const newView = new DataView(newPack);

  let oldView;
  if (oldPack) oldView = new DataView(oldPack);

  // Write initial header offsets.
  newView.setUint32(0, 0x00000020); // First entry offset.
  newView.setUint32(4, 0x0000002c); // FIXME: Unknown offset.
  newView.setUint32(8, 0x0000002c); // First image offset.
  if (palette) {
    newView.setUint32(
      0xc,
      newPackSize - palette.colors.length * (outBpp / bmpBpp),
    ); // Palette offset
  } else {
    newView.setUint32(0xc, newPackSize); // Palette offset
  }
  newView.setUint16(0x10, imgInfoArr.length); // Image count
  newView.setUint16(0x12, 0); // FIXME: Palette presence?

  let widthSum = 0;
  let heightSum = 0;
  for (let i = 0; i < imgInfoArr.length; i++) {
    widthSum += imgInfoArr[i].width;
    heightSum += imgInfoArr[i].height;
  }
  newView.setUint16(0x14, widthSum); // Total width
  newView.setUint16(0x16, heightSum); // Total height

  if (oldView) newView.setUint8(0x18, oldView.getUint8(0x18));
  else newView.setUint8(0x18, 0);

  newView.setUint8(0x19, bmpBpp || outBpp); // Bpp of the data in the ImgPack.

  if (palette) {
    newView.setUint8(0x1a, palette.colors.length);
    const paletteOffset =
      newPackSize - palette.colors.length * (outBpp / bmpBpp);
    for (let i = 0; i < palette.colors.length; i++) {
      newView.setUint16(paletteOffset + i * 2, palette.colors[i]); // FIXME: 16bit hardcoded
    }
  }

  // Followed by zeroes...

  let curOffset = 0x20;
  for (let i = 0; i < imgInfoArr.length; i++) {
    curOffset = _writeEntry(newView, curOffset, imgInfoArr[i], outBpp, oldView);
  }

  return newPack;
}

export function getByteLength(imgInfoArr: IImgInfo[], outBpp: number) {
  let len = 0x20; // Fixed-size header
  for (let i = 0; i < imgInfoArr.length; i++) {
    len += 0xc;
    if (imgInfoArr[i].bpp === outBpp) {
      len += imgInfoArr[i].src!.byteLength;
    } else if (imgInfoArr[i].bpp === 32 && outBpp === 16) {
      len += imgInfoArr[i].src!.byteLength / 2;
    }
  }
  return len;
}

function _writeEntry(
  newView: DataView,
  curOffset: number,
  imgInfo: IImgInfo,
  outBpp: number,
  oldView?: DataView,
) {
  newView.setUint32(curOffset, curOffset + 0xc); // Absolute offset of image data.
  newView.setUint16((curOffset += 4), imgInfo.width);
  newView.setUint16((curOffset += 2), imgInfo.height);
  if (oldView) {
    newView.setUint32((curOffset += 2), oldView.getUint32(curOffset)); // Assumes we can directly map mystery values.
    curOffset += 4;
  } else {
    // Is it really just the actual h x w in the buffer?
    newView.setUint16((curOffset += 2), imgInfo.width / 2); // FIXME
    newView.setUint16((curOffset += 2), imgInfo.height / 2);
    curOffset += 2;
  }

  let srcView;
  if (imgInfo._bmpData) {
    srcView = new DataView(imgInfo._bmpData);
  } else if (imgInfo.bpp === outBpp) {
    const src = imgInfo.src!;
    if (src instanceof ArrayBuffer) {
      srcView = new DataView(src);
    } else {
      srcView = new DataView(src.buffer, src.byteOffset, src.byteLength);
    }
  } else if (imgInfo.bpp === 32 && outBpp === 16) {
    const rgba16 = RGBA5551fromRGBA32(
      imgInfo.src!,
      imgInfo.width,
      imgInfo.height,
    );
    srcView = new DataView(rgba16);
  } else {
    throw new Error(
      `Cannot create ImgPack (yet) with inBpp=${imgInfo.bpp} and outBpp=${outBpp}.`,
    );
  }

  copyRange(newView, srcView, curOffset, 0, srcView.byteLength);
  return curOffset + srcView.byteLength;
}
