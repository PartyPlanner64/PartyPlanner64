import { IEventParseInfo, IEventWriteInfo, IEvent } from "../../../events";
import {
  EditorEventActivationType,
  Game,
  EventExecutionType,
} from "../../../../types";
import { hashEqual } from "../../../../utils/arrays";
import { addEventToLibrary } from "../../../EventLibrary";
import { addConnectionInternal, IEventInstance } from "../../../../boards";

// Oh look, more ChainSplits!
// This is a ChainSplit where one path leads to a gate.
// The difference is that it has logic to just send the player in the non-gate
// direction automatically if they are coming back from the gate.
export const GateChainSplit: IEvent = {
  id: "GATECHAINSPLIT",
  name: "",
  fakeEvent: true,
  activationType: EditorEventActivationType.WALKOVER,
  executionType: EventExecutionType.PROCESS,
  supportedGames: [Game.MP3_USA],
  parse(dataView: DataView, info: IEventParseInfo) {
    // Chilly waters 0x8D space, 0x80108DD0, 0x31E940
    const hashes = {
      GATE_FILTER: "A99A70CBC4A1F9509AAB966831FC584E",
    };

    if (!hashEqual([dataView.buffer, info.offset, 0x44], hashes.GATE_FILTER))
      return false;

    // TODO: This crashes when parsing something in Spiny, not important so nop-ing for now.
    return false; /* eslint-disable no-unreachable */

    // We need to parse the chain split I suppose, can't really reuse code
    // right now but it's the same idea, only different offsets.
    const upperAddr = dataView.getUint16(info.offset + 0x7e) << 16;
    const lowerAddr = dataView.getUint16(info.offset + 0x82);
    let spacesAddr = (upperAddr | lowerAddr) & 0x7fffffff;
    if (spacesAddr & 0x00008000) spacesAddr = spacesAddr - 0x00010000;
    let spacesOffset = info.offset - (info.addr - spacesAddr);

    let destinationSpace = dataView.getUint16(spacesOffset);
    while (destinationSpace !== 0xffff) {
      addConnectionInternal(info.curSpace, destinationSpace, info.board);
      spacesOffset += 2;
      destinationSpace = dataView.getUint16(spacesOffset);
    }

    return true;
  },
  write(
    dataView: DataView,
    event: IEventInstance,
    info: IEventWriteInfo,
    temp: any,
  ) {
    // It's all in ChainSplit3.
    throw new Error(`${GateChainSplit.id} not implemented`);
  },
};
addEventToLibrary(GateChainSplit);
