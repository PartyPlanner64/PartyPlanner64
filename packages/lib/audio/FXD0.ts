/** No idea what this is. */
export class FXD0 {
  private __type = "FXD0";

  public hunks!: ArrayBufferLike[];

  constructor(dataView: DataView) {
    if (dataView.getUint32(0) !== 0x46584430)
      // "FXD0"
      throw new Error("FXD0 constructor encountered non-FXD0 structure");

    this._extract(dataView);
  }

  _extract(view: DataView) {
    this.hunks = [];
    const hunkCount = view.getUint32(4);

    // Seems to be composed of hunks of a fixed size.
    let currentOffset = 0x10;
    for (let i = 0; i < hunkCount; i++, currentOffset += 0x208) {
      const hunkOffsetEnd = currentOffset + 0x208;
      this.hunks.push(
        view.buffer.slice(
          view.byteOffset + currentOffset,
          view.byteOffset + hunkOffsetEnd,
        ),
      );
    }
  }
}
