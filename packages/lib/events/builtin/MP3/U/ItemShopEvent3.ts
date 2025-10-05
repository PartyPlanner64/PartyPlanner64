import { IEventInstance } from "../../../../boards";
import { IEvent, IEventParseInfo, IEventWriteInfo } from "../../../events";

export const ItemShopEvent3: Partial<IEvent> = {
  parse(dataView: DataView, info: IEventParseInfo) {
    // let fnLen;
    let found = false;

    // Chilly Waters 0x8010B65C - , spaces 0x7C,0x77 with 0x6E,0x73
    if (info.boardIndex === 0) {
      if (info.offset !== 0x003211cc) return false;
      if (dataView.getUint32(info.offset + 0x44) !== 0x0c03c84f)
        // JAL 0x800F213C
        return false;
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
