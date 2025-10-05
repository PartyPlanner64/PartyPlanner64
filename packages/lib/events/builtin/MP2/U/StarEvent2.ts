import { IEvent, IEventParseInfo, IEventWriteInfo } from "../../../events";
import { hashEqual } from "../../../../utils/arrays";
import { IEventInstance } from "../../../../boards";

export const StarEvent2: Partial<IEvent> = {
  parse(dataView: DataView, info: IEventParseInfo) {
    const hashes = {
      WESTERN: "D52AD53C2FED642C3001C3579B4299C3", // 0x29E0DC - 0x29E91C ROM
    };

    if (hashEqual([dataView.buffer, info.offset, 0x840], hashes.WESTERN)) {
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
    // Most of the code lives in the overlay.
    return `
      J __PP64_INTERNAL_STAR_SPACE_EVENT ; star_space_event
      NOP
    `;
  },
};
