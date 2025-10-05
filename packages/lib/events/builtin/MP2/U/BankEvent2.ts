import { IEvent, IEventParseInfo, IEventWriteInfo } from "../../../events";
import { IEventInstance } from "../../../../boards";

export const BankEvent2: Partial<IEvent> = {
  parse(dataView: DataView, info: IEventParseInfo) {
    let found = false;

    // Western Land 0x8010964C - 0x80109A70, spaces 0x5E,0x8A with banks 0x9B,0x99
    if (info.boardIndex === 0) {
      if (info.offset !== 0x0029e91c) return false;
      //if (dataView.getUint32(info.offset + 0x44) !== 0x0C03C84F)
      //  return false;
      // fnLen = getFunctionLength(dataView, info.offset);
      // found = fnLen === ;
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
    // Code still lives in the overlay itself.
    return `
      J __PP64_INTERNAL_BANK_SPACE_EVENT
      NOP
    `;
  },
};
