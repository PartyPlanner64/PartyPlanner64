import { IEvent, IEventParseInfo, IEventWriteInfo } from "../../../events";
import { hashEqual } from "../../../../utils/arrays";
import { IEventInstance } from "../../../../boards";

export const StarEvent3: Partial<IEvent> = {
  parse(dataView: DataView, info: IEventParseInfo) {
    const hashes = {
      CHILLY: "E9B6C28983AAE724AC187EA8E0CBC79D", // 0x8010A4B4 - 0x8010A860 (0x00320024 - 0x003203d0)
    };

    if (hashEqual([dataView.buffer, info.offset, 0x3bc], hashes.CHILLY)) {
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
