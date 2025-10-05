export function GrayscaleToRGBA32(
  buffer: ArrayBufferLike,
  width: number,
  height: number,
  bpp: number,
) {
  const outBuffer = new ArrayBuffer(width * height * 4);
  const outView = new Uint8Array(outBuffer);

  const inView = new DataView(buffer);
  let outIdx = 0;
  for (let i = 0; i < width * height; i++) {
    let val;
    if (bpp === 8) val = inView.getUint8(i);
    else if (bpp === 4) {
      val = inView.getUint8(i / 2) & (i % 2 ? 0x0f : 0xf0);
      if (i % 2 === 0) {
        val >>= 4;
        val = val & 0x0f;
      }
      val = (val / 0x0f) * 0xff;
    } else throw new Error("bpp must be 4 or 8");
    outView[outIdx] = val;
    outView[outIdx + 1] = val;
    outView[outIdx + 2] = val;
    outView[outIdx + 3] = 0xff;
    outIdx += 4;
  }

  return outBuffer;
}

export function GrayscaleFromRGBA32(
  buffer: ArrayBufferLike,
  width: number,
  height: number,
  bpp: number,
) {
  throw new Error("Grayscale.fromRGBA32 not implemented");
}
