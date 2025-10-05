import { decompress, compress } from "../compression";
import { copyRange } from "../arrays";
import { romhandler } from "../../romhandler";

let _blackRGB16: ArrayBuffer | null = null;

export function decode(hvqView: DataView) {
  const firstWord = hvqView.getUint32(0);
  const isHVQ = (firstWord & 0xffffff00) === 0x48565100; // "HVQ"
  // $$log(`HVQ.decode, isHVQ: ${isHVQ}, len: ${$$hex(hvqView.byteLength)})`);
  if (firstWord === 0x00000003) {
    // MP2+ can have run-length instead
    const fileStartView = new DataView(hvqView.buffer, 8);
    const decompressedSize = hvqView.getUint32(4);
    return decompress(3, fileStartView, decompressedSize);
  }
  if (!isHVQ) {
    const buffer = hvqView.buffer;
    return buffer.slice(
      hvqView.byteOffset,
      hvqView.byteOffset + hvqView.byteLength,
    );
  }

  if (!_blackRGB16) {
    _blackRGB16 = new ArrayBuffer(0x1800);
    const blackView = new DataView(_blackRGB16);
    for (let i = 0; i < 0x1800 / 2; i++) {
      blackView.setUint16(i * 2, 0x0001);
    }
  }

  return _blackRGB16; // FIXME LOL

  // Decode the huffman tree for the first chunk.
  // let firstChunkOffset = HVQ._getChunkOffset(hvqView, 0);
  // let firstChunkHuffmanResult = HVQ._recursiveHuffmanBuild(hvqView, (8 * (firstChunkOffset + 4)));
  // console.log("HVQ Huff 1: ", firstChunkHuffmanResult.node);
  // //console.log("remaining: ", ((firstChunkOffset + 4 + hvqView.getUint32(firstChunkOffset)) * 8) - firstChunkHuffmanResult.nextOffset);

  // let thirdChunkOffset = HVQ._getChunkOffset(hvqView, 2);
  // let thirdChunkHuffmanResult = HVQ._recursiveHuffmanBuild(hvqView, (8 * (thirdChunkOffset + 4)));
  // console.log("HVQ Huff 3: ", thirdChunkHuffmanResult.node);

  // let fifthChunkOffset = HVQ._getChunkOffset(hvqView, 4);
  // let fifthChunkHuffmanResult = HVQ._recursiveHuffmanBuild(hvqView, (8 * (fifthChunkOffset + 4)));
  // console.log("HVQ Huff 5: ", fifthChunkHuffmanResult.node);

  // let eleventhChunkOffset = HVQ._getChunkOffset(hvqView, 10);
  // let eleventhChunkHuffmanResult = HVQ._recursiveHuffmanBuild(hvqView, (8 * (eleventhChunkOffset + 4)));
  // console.log("HVQ Huff 11: ", eleventhChunkHuffmanResult.node);

  // return _blackRGB16; // FIXME LOL
}

// function _getChunkOffset(hvqView: DataView, chunkIndex: number) {
//   // Chunk offsets start at 0x20
//   return hvqView.getUint32(0x20 + (chunkIndex * 4));
// }

// function _recursiveHuffmanBuild(hvqView: DataView, bitOffset: number): any {
//   if (readBitAtOffset(hvqView, bitOffset) === 1) {
//     // Branch recursively.
//     let leftResult = _recursiveHuffmanBuild(hvqView, bitOffset + 1);
//     bitOffset = leftResult.nextOffset;
//     let rightResult = _recursiveHuffmanBuild(hvqView, bitOffset);
//     let node = Object.create(null); // Mainly to make browser debug cleaner without __proto__.
//     node[1] = leftResult.node;
//     node[0] = rightResult.node;
//     return {
//       nextOffset: rightResult.nextOffset,
//       node: node
//     };
//   }
//   else {
//     // Read the next 8 bits as a leaf node value.
//     let byte = readByteAtBitOffset(hvqView, bitOffset + 1);
//     return {
//       nextOffset: bitOffset + 9,
//       node: byte
//     };
//   }
// }

export function encode(buffer: ArrayBuffer, width: number, height: number) {
  const gameVersion = romhandler.getGameVersion();
  if (gameVersion === null) throw new Error("HVQ encode not implemented");

  if (gameVersion > 1) {
    // Hack for MP2
    const compressed = compress(3, new DataView(buffer));
    const result = new ArrayBuffer(compressed.byteLength + 8);
    const resultView = new DataView(result);
    resultView.setUint32(0, 3);
    resultView.setUint32(4, buffer.byteLength);
    copyRange(resultView, compressed, 8, 0, compressed.byteLength);
    return result;
  }
  return buffer;

  // throw "HVQ encode not implemented";
}
