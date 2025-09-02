import { $$log } from "./debug";

const WINDOW_START = 0x3be;
const WINDOW_SIZE = 1024;

const MIN_MATCH_LEN = 3;
// var MAX_MATCH_LEN = 0x42;

/* Mario Party N64 compression type 01
 *
 * This type of compression was used in all three titles, though was the
 * exclusive type available in the original title. It is similar to LZSS, and
 * uses a 1KB circular buffer when referencing offsets. Like yaz0 compression,
 * there are code bytes for every 8 "chunks," though they are read from right
 * to left (0x01 to 0x80).
 *
 * When a '0' code bit is encountered, the next two bytes in the input are
 * read as offset and length pairs into the sliding window.
 *
 *       Byte 1    Byte 2
 *     [oooooooo][oollllll]
 *
 * The two offset bits within Byte 2 are masked and shifted such that they
 * become the most significant bits. The length is found by adding the value
 * of MIN_MATCH_LEN, in this case, 3.
 *
 * Notably, the circular buffer begins filling not at zero, but at a position
 * roughly 90% of the way through, WINDOW_START.
 */
function decompress01(src: DataView, dst: DataView, decompressedSize: number) {
  // Current positions in src/dst buffers and sliding window.
  let srcPlace = 0;
  let dstPlace = 0;
  let winPlace = WINDOW_START;

  // Create the sliding window buffer. Must be initialized to zero as some
  // files look into the window right away for starting zeros.
  const winBuffer = new ArrayBuffer(WINDOW_SIZE);
  const windowArray = new DataView(winBuffer);

  // The code byte's bits are interpreted to mean straight copy (1) or read
  // from sliding window (0).
  let curCodeByte = 0;
  while (dstPlace < decompressedSize) {
    // Read a new "code" byte if the current one has expired. By placing an
    // 0xFF prior to the code bits, we can tell when we have consumed the
    // code byte by observing that the value will be become 0 only when we
    // have shifted away all of the code bits.
    if ((curCodeByte & 0x100) === 0) {
      curCodeByte = src.getUint8(srcPlace);
      curCodeByte |= 0xff00;
      ++srcPlace;
    }

    if ((curCodeByte & 0x01) === 1) {
      // Copy the next byte from the source to the destination.
      dst.setUint8(dstPlace, src.getUint8(srcPlace));
      windowArray.setUint8(winPlace, src.getUint8(srcPlace));
      ++dstPlace;
      ++srcPlace;
      winPlace = (winPlace + 1) % WINDOW_SIZE;
    } else {
      // Interpret the next two bytes as an offset into the sliding window and
      // a length to read.
      const byte1 = src.getUint8(srcPlace);
      const byte2 = src.getUint8(srcPlace + 1);
      srcPlace += 2;

      let offset = ((byte2 & 0xc0) << 2) | byte1;
      const count = (byte2 & 0x3f) + MIN_MATCH_LEN;

      // Within the sliding window, locate the offset and copy count bytes.
      let val;
      for (let i = 0; i < count; ++i) {
        val = windowArray.getUint8(offset % WINDOW_SIZE);
        windowArray.setUint8(winPlace, val);
        winPlace = (winPlace + 1) % WINDOW_SIZE;
        dst.setUint8(dstPlace, val);
        ++dstPlace;
        ++offset;
      }
    }

    // Consider the code bit consumed.
    curCodeByte >>= 1;
  }

  return srcPlace; // Return the size of the compressed data.
}

/* This is a hack for MP3 Strings3 at the moment. Just "wraps" with dummy code
 * words, so file size will just grow.
 */
function compress01(src: DataView) {
  const codeWordCount = Math.ceil(src.byteLength / 8);
  const compressedSize = src.byteLength + codeWordCount;
  const compressedBuffer = new ArrayBuffer(compressedSize);
  const dst = new DataView(compressedBuffer);

  let dstPlace = 0;
  let srcPlace = 0;
  while (dstPlace < compressedSize) {
    if (!dstPlace || !(dstPlace % 9)) {
      dst.setUint8(dstPlace, 0xff);
    } else {
      dst.setUint8(dstPlace, src.getUint8(srcPlace));
      srcPlace++;
    }
    dstPlace++;
  }

  return compressedBuffer;
}

/* Mario Party N64 compression type 02
 *
 * This compression algorithm was introduced in Mario Party 2, and is very
 * similar to yaz0. It uses word sized groups of code bits rather than a
 * single byte, and reads them in the same left to right order as yaz0. The
 * interpretation of the bytes when a code bit is 0 is also the same as yaz0.
 *
 *       Byte 1    Byte 2     [Byte 3 when l = 0]
 *     [lllldddd][dddddddd]   [llllllll]
 *
 * The values of length and lookback distance are simply split apart and used.
 * The special case when length == 0 in yaz0 also applies, where a third byte
 * is read as the value of length and 0x12 is added. When the lookback
 * distance is farther than the start (out of bounds), 0s are inserted.
 *
 * This is also the implementation used for decompression types 03 and 04.
 * 03 and 04 are considered the same by the game engine.
 * 02 differs from 03/04 in that it is the only implementation that checks
 * whether lookback goes out of bounds, and handles it. As far as I know,
 * it is OK to use that handling for 03/04 as well, since the behavior would
 * otherwise be undefined.
 */
function decompress02(src: DataView, dst: DataView, decompressedSize: number) {
  // Current positions in src/dst buffers.
  let srcPlace = 0;
  let dstPlace = 0;

  // The code word's bits are interpreted to mean straight copy (1)
  // or lookback and read (0).
  let curCodeWord = 0;
  let codeWordBitsRemaining = 0;
  while (dstPlace < decompressedSize) {
    // Read a new code word if the current one has expired.
    if (codeWordBitsRemaining === 0) {
      curCodeWord = src.getUint32(srcPlace);
      codeWordBitsRemaining = 32;
      srcPlace += 4;
    }

    if ((curCodeWord & 0x80000000) !== 0) {
      // Copy the next byte from the source to the destination.
      dst.setUint8(dstPlace, src.getUint8(srcPlace));
      ++dstPlace;
      ++srcPlace;
    } else {
      // Interpret the next two bytes as a distance to travel backwards and a
      // a length to read.
      const byte1 = src.getUint8(srcPlace);
      const byte2 = src.getUint8(srcPlace + 1);
      srcPlace += 2;

      const back = (((byte1 & 0x0f) << 8) | byte2) + 1;
      let count = ((byte1 & 0xf0) >> 4) + 2;

      if (count === 2) {
        // Special case where 0xF0 masked byte 1 is zero.
        count = src.getUint8(srcPlace) + 0x12;
        ++srcPlace;
      }

      // Step back and copy count bytes into the dst.
      let i, val;
      for (i = 0; i < count && dstPlace < decompressedSize; ++i) {
        if (back > dstPlace) val = 0;
        else val = dst.getUint8(dstPlace - back);

        dst.setUint8(dstPlace, val);
        ++dstPlace;
      }
    }

    // Consider the code bit consumed.
    curCodeWord <<= 1;
    --codeWordBitsRemaining;
  }

  return srcPlace; // Return the size of the compressed data.
}

/* This is a hack for MP2 HVQ at the moment. Just "wraps" with dummy code
 * words, so file size just grows.
 */
function compress02(src: DataView) {
  const codeWordCount = src.byteLength / 32;
  const compressedSize = src.byteLength + codeWordCount * 4;
  const compressedBuffer = new ArrayBuffer(compressedSize);
  const dst = new DataView(compressedBuffer);

  let srcPlace = 0;
  for (let i = 0; i < compressedSize; i += 36, srcPlace += 32) {
    dst.setUint32(i, 0xffffffff);
    dst.setUint32(i + 4, src.getUint32(srcPlace));
    dst.setUint32(i + 8, src.getUint32(srcPlace + 4));
    dst.setUint32(i + 12, src.getUint32(srcPlace + 8));
    dst.setUint32(i + 16, src.getUint32(srcPlace + 12));
    dst.setUint32(i + 20, src.getUint32(srcPlace + 16));
    dst.setUint32(i + 24, src.getUint32(srcPlace + 20));
    dst.setUint32(i + 28, src.getUint32(srcPlace + 24));
    dst.setUint32(i + 32, src.getUint32(srcPlace + 28));
  }

  return compressedBuffer;
}

/* Mario Party N64 compression type 05
 *
 * This is mostly a run-length encoding. The algorithm can be pretty simply
 * described:
 * 1. Read a byte
 * 2. If the byte has the sign bit (byte & 0x80), then get rid of the sign
 *    bit and use that to count and copy in that many bytes.
 * 3. If there is no sign bit, use the byte to count and repeat the next byte
 *    for that many times.
 * 4. Repeat until decompressed size reached.
 *
 * Typically this is used when there are a lot of zeroes or repeated single
 * values, like in some images.
 */
function decompress05(src: DataView, dst: DataView, decompressedSize: number) {
  // Current positions in src/dst buffers.
  let srcPlace = 0;
  let dstPlace = 0;

  while (dstPlace < decompressedSize) {
    const curCodeByte = src.getUint8(srcPlace);
    srcPlace++;

    const count = curCodeByte & 0x7f;
    if (curCodeByte & 0x80) {
      // Having the sign bit means we read the next n bytes from the input.
      for (let i = 0; i < count; i++) {
        const nextByte = src.getUint8(srcPlace);
        srcPlace++;
        dst.setUint8(dstPlace, nextByte);
        dstPlace++;
      }
    } else {
      // No sign bit means we repeat the next byte n times.
      const repeatedByte = src.getUint8(srcPlace);
      srcPlace++;

      for (let i = 0; i < count; i++) {
        dst.setUint8(dstPlace, repeatedByte);
        dstPlace++;
      }
    }
  }

  return srcPlace; // Return the size of the compressed data.
}

/**
 * Run length encoding compression.
 * Implementation provided by @gamemasterplc
 */
function compress05(src: DataView) {
  const output = new ArrayBuffer(src.byteLength * 3); // Rough upper bound.
  const outView = new DataView(output);
  let output_pos = 0;
  let input_pos = 0;
  let copy_len = 0;
  let curr_byte: number;
  let next_byte: number;
  while (input_pos < src.byteLength) {
    curr_byte = src.getUint8(input_pos);
    next_byte = src.getUint8(input_pos + 1);
    if (curr_byte === next_byte) {
      copy_len = 0;
      for (let i = 0; i < 127; i++) {
        curr_byte = src.getUint8(input_pos + i);
        next_byte = src.getUint8(input_pos + i + 1);
        if (curr_byte !== next_byte || input_pos + i >= src.byteLength) {
          copy_len++;
          break;
        }
        copy_len++;
      }
      outView.setUint8(output_pos, copy_len);
      outView.setUint8(output_pos + 1, src.getUint8(input_pos));
      output_pos += 2;
      input_pos += copy_len;
    } else {
      copy_len = 0;
      for (let i = 0; i < 127; i++) {
        curr_byte = src.getUint8(input_pos + i);
        next_byte = src.getUint8(input_pos + i + 1);
        if (curr_byte === next_byte || input_pos + i >= src.byteLength) {
          break;
        }
        copy_len++;
      }
      outView.setUint8(output_pos, 0x80 | copy_len);
      output_pos += 1;
      for (let i = 0; i < copy_len; i++) {
        outView.setUint8(output_pos, src.getUint8(input_pos + i));
        output_pos += 1;
        input_pos += 1;
      }
    }
  }

  return output.slice(0, output_pos);
}

// Returns a new buffer with the decompressed data.
// The compressed size is attached as a property to the buffer object.
export function decompress(
  type: number,
  srcDataView: DataView<ArrayBuffer>,
  decompressedSize: number,
): ArrayBuffer {
  const dstBuffer = new ArrayBuffer(decompressedSize);
  const dstView = new DataView(dstBuffer);
  let compressedSize;
  switch (type) {
    case 1:
      compressedSize = decompress01(srcDataView, dstView, decompressedSize);
      break;
    case 2:
    case 3:
    case 4:
      compressedSize = decompress02(srcDataView, dstView, decompressedSize);
      break;
    case 5:
      compressedSize = decompress05(srcDataView, dstView, decompressedSize);
      break;
    case 0:
      // Just directly copy uncompressed data.
      compressedSize = decompressedSize;
      for (let i = 0; i < decompressedSize; i++)
        dstView.setUint8(i, srcDataView.getUint8(i));
      break;
    default:
      $$log(`decompression ${type} not implemented.`);
      break;
  }

  (dstBuffer as any).compressedSize = compressedSize;
  return dstBuffer;
}

export function compress(
  type: number,
  srcDataView: DataView<ArrayBuffer>,
): ArrayBuffer {
  switch (type) {
    case 1:
      return compress01(srcDataView);

    // TODO: Are all these really the same, particularly 4?
    case 2:
    case 3:
    case 4:
      return compress02(srcDataView);

    case 5:
      return compress05(srcDataView);

    case 0:
    default:
      // Just directly copy uncompressed data.
      return srcDataView.buffer.slice(0);
  }
}

export function getCompressedSize(
  type: number,
  srcDataView: DataView<ArrayBuffer>,
  decompressedSize: number,
) {
  const dstBuffer = new ArrayBuffer(decompressedSize);
  const dstView = new DataView(dstBuffer);

  switch (type) {
    case 1:
      return decompress01(srcDataView, dstView, decompressedSize);
    case 2:
    case 3:
    case 4:
      return decompress02(srcDataView, dstView, decompressedSize);
    case 5:
      return decompress05(srcDataView, dstView, decompressedSize);
    case 0:
      return decompressedSize;
    default:
      $$log(`getCompressedSize ${type} not implemented.`);
  }
}
