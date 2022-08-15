/** Converts from a set of tiles to a single chunk, and vice-versa. */

/** Takes a set of image tiles and reconstructs the entire image. */
export function fromTiles(
  tileViews: DataView[],
  tileXCount: number,
  tileYCount: number,
  tileXWidth: number,
  tileYWidth: number
) {
  let width = tileXCount * tileXWidth;
  let height = tileYCount * tileYWidth;
  let buffer = new ArrayBuffer(width * height);
  let outView = new DataView(buffer);

  let tileX, tileY;
  let tileViewIndex, tileViewIndexPartial;
  let tileIndex, tileIndexPartial;
  let outIndex, outIndexPartial;
  for (let y = 0; y < height; y++) {
    tileY = y % tileYWidth;
    tileViewIndexPartial = Math.floor(y / tileYWidth) * tileXCount;
    tileIndexPartial = tileY * tileXWidth;
    outIndexPartial = y * width;
    for (let x = 0; x < width; x += 4) {
      tileX = x % tileXWidth;
      tileViewIndex = tileViewIndexPartial + Math.floor(x / tileXWidth);
      tileIndex = tileIndexPartial + tileX;
      outIndex = outIndexPartial + x;
      //try {
      outView.setUint32(
        outIndex,
        tileViews[tileViewIndex].getUint32(tileIndex)
      );
      //} catch(e) {
      //console.log("Failed Reading Tile #" + tileViewIndex + "[" + tileIndex + "]");
      //console.log("This was x: " + x + ", y: " + y + ", tileX: " + tileX + ", tileY: " + tileY);
      //}
    }
  }

  return buffer;
}

/** Takes an image and splits it into tiles. */
export function toTiles(
  imgArr: ReadonlyArray<number> | Uint8ClampedArray,
  tileXCount: number,
  tileYCount: number,
  tileXWidth: number,
  tileYWidth: number
) {
  let width = tileXCount * tileXWidth;
  let height = tileYCount * tileYWidth;

  let tiles = [];
  let tileViews = [];
  let tileCount = tileXCount * tileYCount;
  for (let i = 0; i < tileCount; i++) {
    tiles.push(new ArrayBuffer(tileXWidth * tileYWidth));
    tileViews.push(new DataView(tiles[i]));
  }

  let tileViewIndex, tileViewIndexPartial;
  for (let y = 0; y < height; y++) {
    tileViewIndexPartial = Math.floor(y / tileYWidth) * tileXCount;
    for (let x = 0; x < width; x++) {
      tileViewIndex = tileViewIndexPartial + Math.floor(x / tileXWidth);
      let tileX = x % tileXWidth;
      let tileY = y % tileYWidth;

      let tileIndex = tileY * tileXWidth + tileX;
      let imgIndex = y * width + x;
      tileViews[tileViewIndex].setUint8(tileIndex, imgArr[imgIndex]);
    }
  }

  return tiles;
}
