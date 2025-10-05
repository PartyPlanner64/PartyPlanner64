import { IEvent, IEventParseInfo, IEventWriteInfo } from "../../../events";
import { getFunctionLength } from "../../../../utils/MIPS";
import { IEventInstance } from "../../../../boards";

export const BooEvent3: Partial<IEvent> = {
  parse(dataView: DataView, info: IEventParseInfo) {
    let fnLen;
    let found = false;

    // Chilly Waters 0x8010DE7C - 0x10F050, space 0x92 with 0x6A boo
    if (info.boardIndex === 0) {
      if (info.offset !== 0x003239ec) return false;
      if (dataView.getUint32(info.offset + 0x4c) !== 0x0c03af32)
        // JAL 0x800EBCC8
        return false;
      fnLen = getFunctionLength(dataView, info.offset);
      found = fnLen === 0x11d4;
    }

    // Deep bloober 0x8010D9E4, space 0x79 with 0x66 boo

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
