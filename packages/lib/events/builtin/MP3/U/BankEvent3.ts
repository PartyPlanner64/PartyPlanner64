import { IEvent, IEventParseInfo, IEventWriteInfo } from "../../../events";
import { hashEqual } from "../../../../utils/arrays";
import { IEventInstance } from "../../../../boards";

export const BankEvent3: Partial<IEvent> = {
  parse(dataView: DataView, info: IEventParseInfo) {
    const hashes = {
      // A good chunk...
      CHILLY: "FCA0025616E8B2BE4CD60F47EE60DC30", // 0x8010A860 - 0x8010B394 (0x3203D0 ...)
    };

    if (hashEqual([dataView.buffer, info.offset, 0xb4], hashes.CHILLY)) {
      return true;
    }
    return false;
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
