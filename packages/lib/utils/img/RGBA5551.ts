// 5 bits each for RGB, 1 for alpha.

export function RGBA5551toRGBA32(
  buffer: ArrayBuffer,
  width: number,
  height: number,
) {
  const outBuffer = new ArrayBuffer(width * height * 4);
  const outView = new Uint8Array(outBuffer);

  const inView = new DataView(buffer);
  let outIdx = 0;
  for (let i = 0; i < width * height; i++) {
    const val = inView.getUint16(i * 2);
    outView[outIdx] = ((val & 0xf800) >>> 11) * 8;
    outView[outIdx + 1] = ((val & 0x07c0) >>> 6) * 8;
    outView[outIdx + 2] = ((val & 0x003e) >>> 1) * 8;
    outView[outIdx + 3] = val & 0x0001 ? 0xff : 0x00;
    outIdx += 4;
  }

  return outBuffer;
}

export function RGBA5551fromRGBA32(
  buffer: ArrayBuffer | ImageDataArray,
  width: number,
  height: number,
) {
  const outBuffer = new ArrayBuffer(width * height * 2);
  const outView = new DataView(outBuffer);

  const inView = new Uint8Array(buffer);
  let inIdx = 0;
  for (let i = 0; i < width * height; i++) {
    let red = inView[inIdx] / 8;
    red <<= 11;
    let green = inView[inIdx + 1] / 8;
    green <<= 6;
    let blue = inView[inIdx + 2] / 8;
    blue <<= 1;
    const alpha = inView[inIdx + 3] >>> 7;

    outView.setUint16(i * 2, (red | green | blue | alpha) & 0xffff);
    inIdx += 4;
  }

  return outBuffer;
}
