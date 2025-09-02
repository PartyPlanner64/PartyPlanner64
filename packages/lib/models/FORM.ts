import { fromU32, toCharCodes } from "../utils/string";
import { copyRange } from "../utils/arrays";
import { $$hex } from "../utils/debug";
import { RGBA5551toRGBA32 } from "../utils/img/RGBA5551";
import { BMPtoRGBA } from "../utils/img/BMP";

type IFormObjType =
  | "FORM"
  | "HBINMODE"
  | "OBJ1"
  | "COL1"
  | "MAT1"
  | "ATR1"
  | "VTX1"
  | "FAC1"
  | "MTN1"
  | "BMP1"
  | "PAL1"
  | "SKL1"
  | "STRG"
  | "MAP1";

type IFormObjDict = { [key in IFormObjType]: IFormObjEntry[] };

export interface IFormObj extends IFormObjDict {
  entries: IFormObjType[];
}

interface IFormObjEntry {
  raw: ArrayBuffer;
  parsed?: any;
}

export interface IFAC1VertexEntry {
  vertexIndex: number;
  materialIndex: number;
  u: number;
  v: number;
}

export interface IFAC1Parsed {
  materialIndex: number;
  atrIndex: number;
  mystery3: number;
  vtxEntries: IFAC1VertexEntry[];
}

export interface IVTXParsed {
  vertices: IVTX1Vertex[];
  scale: number;
}

export interface IVTX1Vertex {
  x: number;
  y: number;
  z: number;
  normalX: number;
  normalY: number;
  normalZ: number;
}

interface ISLK1Parsed {
  globalIndex: number;
  skls: any[];
}

interface IPAL1Parsed {
  bpp: number;
  globalIndex: number;
  colors: number[];
}

// Extracts a FORM file into a usable format.
export const FORM = class FORM {
  static unpack(
    formView: ArrayBuffer | DataView<ArrayBuffer>,
  ): IFormObj | null {
    if (!(formView instanceof DataView)) formView = new DataView(formView);

    if (!FORM.isForm(formView)) return null;

    const formObj = Object.create(null);
    formObj.entries = [];

    let curOffset = 8;
    while (curOffset < formView.byteLength - 2) {
      // Roughly-ish the end
      let type: string | number = formView.getUint32(curOffset);
      type = fromU32(type);
      if (type === "HBIN") {
        curOffset += 4;
        type += fromU32(formView.getUint32(curOffset)); // "MODE"
      }

      formObj.entries.push(type);

      curOffset += 4;
      const len = formView.getUint32(curOffset);
      curOffset += 4;

      const entry: IFormObjEntry = {
        raw: formView.buffer.slice(curOffset, curOffset + len),
      };

      const parsed = FORM.parseType(type as IFormObjType, entry.raw);
      if (parsed) entry.parsed = parsed;

      formObj[type] = formObj[type] || [];
      formObj[type].push(entry);

      curOffset += len + (len % 2);
    }

    // With all BMPs and PALs parsed, now we can decode the BMPs.
    if (formObj.BMP1) {
      for (let i = 0; i < formObj.BMP1.length; i++) {
        const bmpEntry = formObj.BMP1[i];
        bmpEntry.parsed = FORM.parseBMP(bmpEntry.raw, formObj.PAL1);
      }
    }

    return formObj;
  }

  static pack(formObj: IFormObj): ArrayBuffer {
    const formBuffer = new ArrayBuffer(FORM.getByteLength(formObj));
    const formView = new DataView(formBuffer);

    formView.setUint32(0, 0x464f524d); // "FORM"
    formView.setUint32(4, formBuffer.byteLength - 8); // Don't count the "FORM____" at the top.

    const entryWriteState: { [type in IFormObjType]?: number } = {};
    let curIndex = 8;
    for (let i = 0; i < formObj.entries.length; i++) {
      const entryType = formObj.entries[i];
      const entryNum = entryWriteState[entryType] || 0;
      entryWriteState[entryType] = entryNum + 1;

      // Write the type name.
      const typeBytes = toCharCodes(entryType);
      for (let b = 0; b < typeBytes.length; b++) {
        formView.setUint8(curIndex, typeBytes[b]);
        curIndex++;
      }

      const entry = formObj[entryType][entryNum];

      // Write the entry length.
      const entrySize = entry.raw.byteLength;
      formView.setUint32(curIndex, entrySize);
      curIndex += 4;

      // Copy in the actual data.
      copyRange(formView, entry.raw, curIndex, 0, entrySize);
      curIndex += entrySize + (entrySize % 2);
    }

    return formBuffer;
  }

  static isForm(viewOrBuffer: ArrayBuffer | DataView) {
    if (!viewOrBuffer) return false;

    if (!(viewOrBuffer instanceof DataView))
      viewOrBuffer = new DataView(viewOrBuffer);

    return viewOrBuffer.getUint32(0) === 0x464f524d; // "FORM"
  }

  static getByteLength(formObj: IFormObj) {
    let byteLen = 0;
    for (const type in formObj) {
      if (type === "entries") continue;
      for (let i = 0; i < (formObj as any)[type].length; i++) {
        const rawLen = (formObj as any)[type][i].raw.byteLength;
        // The raw data + rounded up to 16-bit boundary + the TYPE text + entry length value.
        byteLen += rawLen + (rawLen % 2) + type.length + 4;
      }
    }
    return byteLen + 8; // Add the "FORM____" at the beginning.
  }

  static parseType(type: IFormObjType, raw: ArrayBuffer) {
    switch (type) {
      case "HBINMODE":
        return FORM.parseHBINMODE(raw);
      case "OBJ1":
        return FORM.parseOBJ1(raw);
      case "COL1":
        return FORM.parseCOL1(raw);
      case "MAT1":
        return FORM.parseMAT1(raw);
      case "ATR1":
        return FORM.parseATR1(raw);
      case "VTX1":
        return FORM.parseVTX1(raw);
      case "FAC1":
        return FORM.parseFAC1(raw);
      case "PAL1":
        return FORM.parsePAL1(raw);
      case "SKL1":
        return FORM.parseSKL1(raw);
      case "STRG":
        return FORM.parseSTRG(raw);
    }

    return null;
  }

  static parseHBINMODE(raw: ArrayBuffer) {
    const rawView = new DataView(raw);
    const result = {
      E: rawView.getUint8(0x14),
      F: rawView.getUint8(0x15),
      G: rawView.getUint8(0x16),
    };

    if (result.E !== 0x45 || result.F !== 0x46 || result.G !== 0x47) {
      console.warn("HBINMODE unexpected EFG => ", result); // Corresponds to ZYX rotation?
    }

    return result;
  }

  static parseOBJ1(raw: ArrayBuffer) {
    const rawView = new DataView(raw);
    const result: any = {
      objects: [],
      mystery1: rawView.getUint16(2),
    };

    const objCount = rawView.getUint16(0);
    let objectOffset = 4;
    for (let i = 0; i < objCount; i++) {
      const objSize = rawView.getUint16(objectOffset);
      const objType = rawView.getUint8(objectOffset + 2);
      const globalIndex = rawView.getUint16(objectOffset + 3);

      objectOffset += 5;

      let obj: any;
      switch (objType) {
        case 0x3d:
          {
            obj = {
              children: [],
            };
            const subObjCount = rawView.getUint16(objectOffset);
            for (let j = 0; j < subObjCount; j++) {
              obj.children.push(rawView.getUint16(objectOffset + 2 + 2 * j));
            }
            Object.assign(
              obj,
              FORM._parseOBJ1Transforms(
                rawView,
                objectOffset + 2 + 2 * subObjCount,
              ),
            );
          }
          break;

        case 0x3a:
          obj = {
            mystery1: rawView.getUint8(objectOffset),
            faceIndex: rawView.getUint16(objectOffset + 1),
            faceCount: rawView.getUint16(objectOffset + 3),
          };
          Object.assign(
            obj,
            FORM._parseOBJ1Transforms(rawView, objectOffset + 5),
          );
          break;

        case 0x10: // Points to skeleton entry // 9/11 mp1
          obj = {
            skeletonGlobalIndex: rawView.getUint16(objectOffset),
          };
          Object.assign(
            obj,
            FORM._parseOBJ1Transforms(rawView, objectOffset + 2),
          );
          break;

        case 0x3b:
          // TODO mp3 25/2
          obj = {};
          console.warn("Object type 0x3B");
          break;

        case 0x3e:
          // TODO
          obj = {};
          //console.warn("Object type 0x3E");
          break;

        case 0x61:
          // TODO this is common, don't know what it is, just has transform
          obj = {};
          Object.assign(obj, FORM._parseOBJ1Transforms(rawView, objectOffset));
          break;

        case 0x5d:
          // TODO mp3 13/0
          // Refers to objects of type 0x61
          obj = {};
          console.warn("Object type 0x5D");
          break;

        default:
          console.warn(`Unrecognized object type ${$$hex(objType)}`);
          obj = {};
          break;
      }

      obj.objType = objType;
      obj.globalIndex = globalIndex;

      result.objects.push(obj);

      objectOffset += objSize - 3; // -3 because +5 above included 3 from objSize
    }

    return result;
  }

  static _parseOBJ1Transforms(rawView: DataView, offset: number) {
    return {
      posX: rawView.getFloat32(offset),
      posY: rawView.getFloat32(offset + 4),
      posZ: rawView.getFloat32(offset + 8),
      rotX: rawView.getFloat32(offset + 12),
      rotY: rawView.getFloat32(offset + 16),
      rotZ: rawView.getFloat32(offset + 20),
      scaleX: rawView.getFloat32(offset + 24),
      scaleY: rawView.getFloat32(offset + 28),
      scaleZ: rawView.getFloat32(offset + 32),
    };
  }

  static parseCOL1(raw: ArrayBuffer) {
    const rawView = new DataView(raw);
    const colors = [];
    const colorCount = rawView.getUint16(0);
    let colorOffset = 2;
    for (let i = 0; i < colorCount; i++) {
      colors.push(rawView.getUint32(colorOffset));
      colorOffset += 4;
    }
    return colors;
  }

  static parseMAT1(raw: ArrayBuffer) {
    const rawView = new DataView(raw);
    const result: { materials: any[] } = {
      materials: [],
    };
    const materialCount = rawView.getUint16(0);
    let materialOffset = 2;
    for (let i = 0; i < materialCount; i++) {
      const material = {
        mystery1: rawView.getUint16(materialOffset),
        colorIndex: rawView.getUint16(materialOffset + 2),
        mystery3: rawView.getUint16(materialOffset + 4),
        mystery4: rawView.getFloat32(materialOffset + 6),
        mystery5: rawView.getUint16(materialOffset + 10),
      };
      result.materials.push(material);

      materialOffset += 12;
    }
    return result;
  }

  static parseATR1(raw: ArrayBuffer) {
    const rawView = new DataView(raw);
    const result: { atrs: any[] } = {
      atrs: [],
    };
    const atrCount = rawView.getUint16(0);
    let atrOffset = 2;
    for (let i = 0; i < atrCount; i++) {
      const atr = {
        size: rawView.getUint16(atrOffset),
        // 2A
        // FF FF
        xBehavior: rawView.getUint8(atrOffset + 0x5),
        yBehavior: rawView.getUint8(atrOffset + 0x6),
        // 2F 2F 01
        bmpGlobalIndex: rawView.getUint16(atrOffset + 0xa),
      };
      result.atrs.push(atr);

      atrOffset += atr.size + 2;
    }
    return result;
  }

  static parseVTX1(raw: ArrayBuffer) {
    const rawView = new DataView(raw);
    const result: IVTXParsed = {
      vertices: [],
      scale: rawView.getFloat32(4),
    };
    const vertexCount = rawView.getUint16(0);
    let vertexOffset = 8;
    for (let i = 0; i < vertexCount; i++) {
      const vertex = {
        x: rawView.getInt16(vertexOffset),
        y: rawView.getInt16(vertexOffset + 2),
        z: rawView.getInt16(vertexOffset + 4),
        normalX: rawView.getInt8(vertexOffset + 6),
        normalY: rawView.getInt8(vertexOffset + 7),
        normalZ: rawView.getInt8(vertexOffset + 8),
      };
      result.vertices.push(vertex);

      vertexOffset += 9;
    }
    return result;
  }

  static parseFAC1(raw: ArrayBuffer) {
    const rawView = new DataView(raw);
    const result: any = {
      faces: [],
    };
    const faceCount = rawView.getUint16(0);
    let faceOffset = 8;
    for (let i = 0; i < faceCount; i++) {
      const faceType = rawView.getUint8(faceOffset);

      if (faceType !== 0x35 && faceType !== 0x16 && faceType !== 0x30)
        // 0x30 in mainfs 9/81 mp1
        throw new Error(`Unrecognized faceType in FAC1: ${$$hex(faceType)}`);

      const face: IFAC1Parsed = {
        vtxEntries: [],
      } as any;
      result.faces.push(face);

      faceOffset += 1; // Start after face_type

      if (faceType === 0x30) {
        console.warn("Unsupported face type 0x30");
        faceOffset += 6; // TODO: What is 0x30 type? VTX num VTX?
      } else {
        const vtxEntryCount = faceType === 0x35 ? 4 : 3;
        for (let j = 0; j < vtxEntryCount; j++) {
          face.vtxEntries[j] = {
            vertexIndex: rawView.getUint16(faceOffset),
            materialIndex: rawView.getInt16(faceOffset + 2),
            u: rawView.getFloat32(faceOffset + 4),
            v: rawView.getFloat32(faceOffset + 8),
          };
          faceOffset += 12; // sizeof(FAC1VtxEntry)
        }
      }

      face.materialIndex = rawView.getInt16(faceOffset);
      face.atrIndex = rawView.getInt16(faceOffset + 2);
      face.mystery3 = rawView.getUint8(faceOffset + 4); // 0x36

      // TODO 0x38 in mp2 31/5
      //if (face.mystery3 !== 0x36 && face.mystery3 !== 0x37 && face.mystery3 !== 0x38 && face.mystery3 !== 0x30)
      //  throw new Error(`Unexpected mystery3 in FAC1 ${$$hex(face.mystery3)}`);

      // mp3 81/2 flip x, 0x37 ?
      if (face.mystery3 !== 0x36)
        console.warn("Unsupported FAC1 mystery3 ", $$hex(face.mystery3));

      faceOffset += 5;
    }
    return result;
  }

  static parsePAL1(raw: ArrayBuffer) {
    const rawView = new DataView(raw);
    const result: IPAL1Parsed = {
      colors: [],
      bpp: 0,
      globalIndex: rawView.getUint16(0),
    };
    const colorCount = rawView.getUint16(2);
    result.bpp = Math.floor((raw.byteLength - 4) / colorCount) * 8;
    let colorOffset = 4;
    for (let i = 0; i < colorCount; i++) {
      if (result.bpp === 32) result.colors.push(rawView.getUint32(colorOffset));
      else if (result.bpp === 16)
        result.colors.push(rawView.getUint16(colorOffset));
      else if (result.bpp === 8)
        result.colors.push(rawView.getUint8(colorOffset));
      else throw new Error(`FORM.parseType(PAL1): bpp: ${result.bpp}`);

      colorOffset += result.bpp / 8;
    }
    return result;
  }

  static parseSKL1(raw: ArrayBuffer) {
    const rawView = new DataView(raw);

    const sklCount = rawView.getUint8(2);
    const result: ISLK1Parsed = {
      globalIndex: rawView.getUint16(0),
      skls: [],
    };

    let sklOffset = 3;
    for (let i = 0; i < sklCount; i++) {
      const skl = {
        mystery1: rawView.getUint8(sklOffset),
        objGlobalIndex: rawView.getUint16(sklOffset + 1),
        nextSiblingRelativeIndex: rawView.getUint16(sklOffset + 0x33),
        isParentNode: rawView.getUint16(sklOffset + 0x35),
        mystery2: rawView.getUint8(sklOffset + 0x36),
      };
      Object.assign(skl, FORM._parseOBJ1Transforms(rawView, sklOffset + 3));
      result.skls.push(skl);
      sklOffset += 56; // sizeof(SKL1Entry)
    }

    return result;
  }

  static parseSTRG(raw: ArrayBuffer) {
    const rawView = new DataView(raw);
    const strings = [];
    const strCount = rawView.getUint16(0);
    let strOffset = 2 + strCount;
    for (let i = 0; i < strCount; i++) {
      let str = "";
      const strLen = rawView.getUint8(2 + i);
      for (let j = 0; j < strLen; j++) {
        str += String.fromCharCode(rawView.getUint8(strOffset + j));
      }
      strOffset += strLen;
      strings.push(str);
    }
    return strings;
  }

  static parseBMP(raw: ArrayBuffer, PAL1: any) {
    const rawView = new DataView(raw);
    const format = rawView.getUint16(0x2);
    const width = rawView.getUint16(0x05);
    const height = rawView.getUint16(0x07);

    if (format === 0x128 || format === 0x228) {
      // Traditional bitmap format
      // 0x128 is just a bitmap
      // 0x228 starts out the same, but TODO it also has some sort of extra RGBA data appended.
      //   mp1 0/93, 0/94, 0/95, 46/2, 48/15, 54/5, 57/3
      if (!PAL1)
        throw new Error(`Palette needed for BMP format ${$$hex(format)}`);

      const paletteGlobalIndex = rawView.getUint16(0x09);
      const inBmpSize = rawView.getUint16(0x0f);

      // Find associated palette by global index
      let palette;
      for (let i = 0; i < PAL1.length; i++) {
        if (PAL1[i].parsed.globalIndex === paletteGlobalIndex) {
          palette = PAL1[i].parsed;
          break;
        }
      }
      if (!palette) {
        throw new Error(
          `Could not locate palette at global index ${paletteGlobalIndex}`,
        );
      }

      // Doesn't appear to indicate BPP, but we can calculate from size and dimens.
      const inBpp = 8 / ((width * height) / inBmpSize);
      const outBpp = palette.bpp;
      const inBmpData = new DataView(raw, 0x11, inBmpSize);

      return {
        globalIndex: rawView.getUint16(0),
        origFormat: format,
        paletteGlobalIndex,
        width,
        height,
        src: BMPtoRGBA(inBmpData, palette.colors, inBpp, outBpp),
      };
    } else if (format === 0x127) {
      // mp1 9/138
      // Just raw RGBA already
      const bpp = rawView.getUint8(0x4);
      const imageByteLength = rawView.getUint16(0xb);
      switch (bpp) {
        case 16:
          return {
            globalIndex: rawView.getUint16(0),
            origFormat: format,
            width,
            height,
            src: RGBA5551toRGBA32(
              raw.slice(0xd, 0xd + imageByteLength),
              width,
              height,
            ),
          };

        case 32:
          return {
            globalIndex: rawView.getUint16(0),
            origFormat: format,
            width,
            height,
            src: raw.slice(0xd, 0xd + imageByteLength),
          };

        default:
          console.warn(`BMP1 0x127 had unsupported bpp ${bpp}`);
      }
    } else if (format === 0x126) {
      // 0x126 mp1 9/25
      // 24 bits per color
      // TODO: Are the bits right, or is there alpha?
      const imageByteLength = rawView.getUint16(0xb);

      const outBuffer = new ArrayBuffer(width * height * 4);
      const outView = new DataView(outBuffer);
      for (let i = 0; i < imageByteLength / 3; i++) {
        const inByte1 = rawView.getUint8(0xd + i);
        const inByte2 = rawView.getUint8(0xd + i + 1);
        const inByte3 = rawView.getUint8(0xd + i + 2);
        const rgba32 =
          (inByte1 << 24) | (inByte2 << 16) | (inByte3 << 8) | 0xff;
        const outIndex = i * 4;
        outView.setUint32(outIndex, rgba32);
      }

      return {
        globalIndex: rawView.getUint16(0),
        origFormat: format,
        width,
        height,
        src: outBuffer,
      };
    } else if (format === 0x125) {
      // Grayscale?
      // TODO: I don't think this is right? Some sort of shadow mask?
      const imageByteLength = rawView.getUint16(0xb);

      const outBuffer = new ArrayBuffer(imageByteLength * 4);
      const outView = new DataView(outBuffer);
      for (let i = 0; i < imageByteLength; i++) {
        const inByte = rawView.getUint8(0xd + i);
        const alpha = (inByte & 0x0f) | ((inByte & 0x0f) << 4);
        const grayscale = (inByte & 0xf0) | ((inByte & 0xf0) >>> 4);
        const rgba32 =
          (grayscale << 24) | (grayscale << 16) | (grayscale << 8) | alpha;
        const outIndex = i * 4;
        outView.setUint32(outIndex, rgba32);
      }

      return {
        globalIndex: rawView.getUint16(0),
        origFormat: format,
        width,
        height,
        src: outBuffer,
      };
    } else if (format === 0x124) {
      // 0x124 mp3 11/51
      // Grayscale?
      // TODO: I don't think this is right? Some sort of shadow mask?
      const imageByteLength = rawView.getUint16(0xb);

      const outBuffer = new ArrayBuffer(imageByteLength * 8);
      const outView = new DataView(outBuffer);
      let outLoc = 0;
      for (let i = 0; i < imageByteLength; i++) {
        const inByte = rawView.getUint8(0xd + i);

        let out1byte = (inByte & 0xf0) >>> 4;
        out1byte |= inByte & 0xf0;
        outView.setUint32(
          outLoc,
          (out1byte << 24) | (out1byte << 16) | (out1byte << 8) | 0xff,
        );
        outLoc += 4;

        let out2byte = inByte & 0x0f;
        out2byte |= out2byte << 4;
        outView.setUint32(
          outLoc,
          (out2byte << 24) | (out2byte << 16) | (out2byte << 8) | 0xff,
        );
        outLoc += 4;
      }

      return {
        globalIndex: rawView.getUint16(0),
        origFormat: format,
        width,
        height,
        src: outBuffer,
      };
    }

    // TODO: Other formats

    console.warn(`Could not parse BMP format ${$$hex(format)}`);
    return {
      globalIndex: rawView.getUint16(0),
      origFormat: format,
      width,
      height,
      src: new ArrayBuffer(width * height * 4),
    };
  }

  static replaceBMP(
    formObj: IFormObj,
    bmpIndex: number,
    buffer: ArrayBuffer,
    palette: any,
  ) {
    // FIXME?: For now, this assumes that the new BMP has the same properties basically.
    // Also look at the huge blob at the bottom LOL get this thing done!

    // Just write over the bitmap data directly.
    copyRange(formObj.BMP1[bmpIndex].raw, buffer, 0x11, 0, buffer.byteLength);

    // Write the palette, which needs some care.
    formObj.PAL1[bmpIndex].parsed = palette;
    const oldPalGlobalIndex = new DataView(
      formObj.PAL1[bmpIndex].raw,
    ).getUint16(0);
    const newRaw = (formObj.PAL1[bmpIndex].raw = new ArrayBuffer(
      4 + palette.colors.length * 4,
    ));
    const newPaletteView = new DataView(newRaw);
    newPaletteView.setUint16(0, oldPalGlobalIndex);
    newPaletteView.setUint16(2, palette.colors.length);
    let curOutOffset = 4;
    for (let i = 0; i < palette.colors.length; i++) {
      newPaletteView.setUint32(curOutOffset, palette.colors[i]);
      curOutOffset += 4;
    }

    // TODO: This was another implementation: write raw RGBA with type 0x127.
    // But the board select wouldn't show up when I tried this.
    // const oldBmpView = new DataView(formObj.BMP1[bmpIndex].raw);
    // const oldGlobalIndex = oldBmpView.getUint16(0);

    // const newBmpEntry = new ArrayBuffer(buffer.byteLength + 0xD);
    // const bmpView = new DataView(newBmpEntry);

    // bmpView.setUint16(0, oldGlobalIndex);
    // bmpView.setUint16(0x2, 0x0127); // RGBA
    // bmpView.setUint8(0x4, 0x20); // 32-bit?
    // bmpView.setUint16(0x5, width);
    // bmpView.setUint16(0x7, height);
    // bmpView.setUint32(0x9, buffer.byteLength);
    // copyRange(bmpView, buffer, 0xD, 0, buffer.byteLength);

    // formObj.BMP1[bmpIndex].raw = newBmpEntry;

    // // Update the parsed BMP just to keep the obj state consistent.
    // formObj.BMP1[bmpIndex].parsed = FORM.parseBMP(newBmpEntry, null);
  }

  // Retrieves a value (or possibly multiple values) by global index.
  static getByGlobalIndex(
    form: IFormObj,
    section: IFormObjType,
    globalIndex: number,
  ): any {
    if (!form[section]) return null;

    const values = [];
    for (let s = 0; s < form[section].length; s++) {
      const parsedValue = form[section][s].parsed;
      if (!parsedValue) throw new Error(`No parsed value for ${section}`);

      if (parsedValue.hasOwnProperty("globalIndex")) {
        if (parsedValue.globalIndex === globalIndex) values.push(parsedValue);
      } else {
        let arrToSearch = parsedValue;

        switch (section) {
          case "OBJ1":
            arrToSearch = parsedValue.objects;
            break;
        }

        for (let i = 0; i < arrToSearch.length; i++) {
          const val = arrToSearch[i];

          if (!val.hasOwnProperty("globalIndex"))
            throw new Error(
              `globalIndex is not a property of the searched ${section} array in getByGlobalIndex`,
            );

          if (val.globalIndex === globalIndex) values.push(val);
        }
      }
    }

    if (!values.length) return null;
    if (values.length === 1) return values[0];
    return values;
  }

  static getObjectsByType(form: IFormObj, type: number): any[] {
    const OBJs = form.OBJ1[0].parsed.objects;
    const objsOfType = [];
    for (let i = 0; i < OBJs.length; i++) {
      if (OBJs[i].objType === type) {
        objsOfType.push(OBJs[i]);
      }
    }
    return objsOfType;
  }
};
