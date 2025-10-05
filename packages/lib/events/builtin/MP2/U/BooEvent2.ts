import { IEvent, IEventParseInfo, IEventWriteInfo } from "../../../events";
import { IEventInstance } from "../../../../boards";

export const BooEvent2: Partial<IEvent> = {
  parse(dataView: DataView, info: IEventParseInfo) {
    let found = false;

    // Western Land 0x10BA48 - 0x8010C44C, spaces 0xAF,0xB4 with boos 0x9D,0x9F
    if (info.boardIndex === 0) {
      if (info.offset !== 0x002a0d18) return false;
      //if (dataView.getUint32(info.offset + 0x4C) !== 0x0C03AF32) // JAL 0x800EBCC8
      //  return false;
      //fnLen = getFunctionLength(dataView, info.offset);
      //found = fnLen === 0x11D4;
      found = true;
    }

    if (!found) return false;

    return true;
  },
  write(
    dataView: DataView,
    event: IEventInstance,
    info: IEventWriteInfo,
    temp: any,
  ) {
    // Code still lives in the board overlay.
    return `
      J __PP64_INTERNAL_BOO_SPACE_EVENT
      NOP
    `;
  },
};
