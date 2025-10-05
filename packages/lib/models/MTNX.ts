/** Animation file handling */
export class MTNX {
  static isMtnx(viewOrBuffer: ArrayBufferLike | DataView): boolean {
    if (!viewOrBuffer) return false;

    if (!(viewOrBuffer instanceof DataView))
      viewOrBuffer = new DataView(viewOrBuffer);

    return viewOrBuffer.getUint32(0) === 0x4d544e58; // "MTNX"
  }

  static unpack(mtnxView: ArrayBufferLike | DataView) {
    if (!(mtnxView instanceof DataView)) mtnxView = new DataView(mtnxView);

    if (!MTNX.isMtnx(mtnxView)) return null;

    const mtnxObj: IMTNXObj = Object.create(null);

    mtnxObj.totalFrames = mtnxView.getUint16(0xa);
    mtnxObj.tracks = [];

    const totalTracks = mtnxView.getUint16(0x8);
    const dsOffset = mtnxView.getUint32(0xc);
    const keyframesOffset = mtnxView.getUint32(0x10);
    const dataOffset = mtnxView.getUint32(0x14);

    const dsView = new DataView(
      mtnxView.buffer,
      mtnxView.byteOffset + dsOffset,
    );
    const keyframesView = new DataView(
      mtnxView.buffer,
      mtnxView.byteOffset + keyframesOffset,
    );
    const dataView = new DataView(
      mtnxView.buffer,
      mtnxView.byteOffset + dataOffset,
    );

    for (let i = 0; i < totalTracks; i++) {
      const trackOffset = mtnxView.getUint32(0x18 + i * 4);
      const trackView = new DataView(
        mtnxView.buffer,
        mtnxView.byteOffset + trackOffset,
      );

      mtnxObj.tracks.push(
        MTNX.parseTrack(trackView, i, dsView, keyframesView, dataView),
      );
    }

    return mtnxObj;
  }

  static parseTrack(
    trackView: DataView,
    trackIndex: number,
    dsView: DataView,
    keyframesView: DataView,
    dataView: DataView,
  ) {
    const trackObj: ITrack = Object.create(null);

    trackObj.type = trackView.getUint8(0);
    trackObj.dimension = trackView.getUint8(1);
    trackObj.mystery1 = trackView.getUint8(2);
    trackObj.mystery2 = trackView.getUint8(3);
    trackObj.mystery3 = trackView.getUint16(4);
    trackObj.totalFrames = trackView.getUint16(6);
    trackObj.mystery4 = trackView.getUint8(8);
    trackObj.objIndex = trackView.getUint8(9); // Not global!
    trackObj.keyframeCount = trackView.getUint16(0xe);

    trackObj.d = dsView.getUint8(trackIndex); // TODO ?

    const keyframesIndex = trackView.getUint16(0xa);
    const dataIndex = trackView.getUint16(0xc);

    trackObj.keyframes = Object.create(null);

    for (let k = 0; k < trackObj.keyframeCount; k++) {
      const keyframe = keyframesView.getUint16(keyframesIndex * 2 + k * 2);
      trackObj.keyframes[keyframe] = MTNX.parseData(dataView, dataIndex, k);
    }

    return trackObj;
  }

  static parseData(
    dataView: DataView,
    dataIndex: number,
    keyframeIndex: number,
  ) {
    const SIZEOF_FRAME_DATA = 3 * 4;

    const data: IKeyframe = Object.create(null);
    data.value1 = dataView.getFloat32(
      dataIndex * 4 + keyframeIndex * SIZEOF_FRAME_DATA,
    );
    data.value2 = dataView.getFloat32(
      dataIndex * 4 + keyframeIndex * SIZEOF_FRAME_DATA + 4,
    );
    data.value3 = dataView.getFloat32(
      dataIndex * 4 + keyframeIndex * SIZEOF_FRAME_DATA + 8,
    );

    return data;
  }
}

export enum MTNXDimension {
  X = 0x45,
  Y = 0x46,
  Z = 0x47,
}

export enum MTNXTrackType {
  Transform = 0x17,
  Rotation = 0x4c,
  Scale = 0x1b,
}

export interface IMTNXObj {
  totalFrames: number;
  tracks: ITrack[];
}

export interface ITrack {
  type: number;
  dimension: MTNXDimension;
  mystery1: any;
  mystery2: any;
  mystery3: any;
  totalFrames: number;
  mystery4: any;
  objIndex: number;
  keyframeCount: number;
  d: any;
  keyframes: { [frame: number]: IKeyframe };
}

export interface IKeyframe {
  value1: number;
  value2: number;
  value3: number;
}
