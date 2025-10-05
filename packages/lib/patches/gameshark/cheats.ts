import { copyRange, join } from "../../utils/arrays";

export let currentCheats: ArrayBufferLike[] = [];

export function resetCheats() {
  currentCheats = [];
}

export function getCheatBuffer() {
  return currentCheats.reduce(join);
}

// Joins all the cheat buffers into one
// opts.endInsts - if given, an array of instructions to append
export function getCheatRoutineBuffer(opts?: { endInsts?: number[] }) {
  opts = opts || {};
  const endInsts = opts.endInsts;

  const allCheatsBuffer = getCheatBuffer();

  const bufferLen =
    allCheatsBuffer.byteLength + (endInsts ? endInsts.length * 4 : 0);
  const fullBuffer = new ArrayBuffer(bufferLen);
  const dataView = new DataView(fullBuffer);

  let offset = 0;

  // Write cheats
  copyRange(fullBuffer, allCheatsBuffer, offset, 0, allCheatsBuffer.byteLength);
  offset += allCheatsBuffer.byteLength;

  if (endInsts) {
    for (let i = 0; i < endInsts.length; i++) {
      dataView.setUint32(offset, endInsts[i]);
      offset += 4;
    }
  }

  return fullBuffer;
}
