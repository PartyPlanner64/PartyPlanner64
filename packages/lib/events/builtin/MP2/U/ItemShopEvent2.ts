import { IEvent, IEventParseInfo, IEventWriteInfo } from "../../../events";
import { IEventInstance } from "../../../../boards";

export const ItemShopEvent2: Partial<IEvent> = {
  parse(dataView: DataView, info: IEventParseInfo) {
    let found = false;

    // Western Land 0x80109B30 - 0x8010A13C, space 0xA7 with shop at 0x9A
    if (info.boardIndex === 0) {
      if (info.offset !== 0x0029ee00) return false;
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
    // Most of the event remains in the overlay.
    return `
      J __PP64_INTERNAL_ITEM_SHOP_EVENT
      NOP
    `;
  },
};
