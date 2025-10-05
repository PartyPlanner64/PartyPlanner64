import { createContext } from "./canvas";
import resizeImageData from "resize-image-data";

// Cuts an image from a bigger image at x,y coordinates.
// A mystery: why didn't I use canvas?
export function cutFromWhole(
  srcBuffer: ArrayBufferLike,
  srcWidth: number,
  srcHeight: number,
  bpp: number,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const pieceWidth = width * (bpp / 8);
  const outBuffer = new ArrayBuffer(pieceWidth * height);
  const outArr = new Uint8Array(outBuffer);
  const inArr = new Uint8Array(srcBuffer);

  const srcByteWidth = srcWidth * (bpp / 8);
  const pieceXStart = x * (bpp / 8);
  let outPos = 0;
  for (let yi = y; yi < y + height; yi++) {
    const rowIdx = pieceXStart + srcByteWidth * yi;
    for (let j = 0; j < pieceWidth; j++) {
      outArr[outPos++] = inArr[rowIdx + j];
    }
  }
  return outBuffer;
}

/**
 * Retrieves the RGBA32 data for an Image element.
 * The Image must have already been loaded.
 * @param image Image element
 * @param width Desired width
 * @param height Desired height
 */
export function toArrayBuffer(
  image: HTMLImageElement,
  width: number,
  height: number,
) {
  const imgWidth = image.width;
  const imgHeight = image.height;
  const canvasCtx = createContext(imgWidth, imgHeight);
  canvasCtx.drawImage(image, 0, 0, imgWidth, imgHeight);

  let imgData = canvasCtx.getImageData(0, 0, imgWidth, imgHeight);
  if (width !== imgWidth || height !== imgHeight) {
    imgData = resizeImageData(imgData, width, height) as unknown as ImageData;
  }

  return imgData.data.buffer;
}

export function invertColor(hex: number) {
  const rOrig = (hex >>> 16) & 0xff;
  const gOrig = (hex >>> 8) & 0xff;
  const bOrig = hex & 0xff;

  const r = 255 - rOrig;
  const g = 255 - gOrig;
  const b = 255 - bOrig;

  return (r << 16) | (g << 8) | b;
}
