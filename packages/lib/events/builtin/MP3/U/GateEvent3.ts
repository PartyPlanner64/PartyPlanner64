import { IEventParseInfo, IEventWriteInfo, IEvent } from "../../../events";
import {
  EditorEventActivationType,
  EventExecutionType,
  Game,
  SpaceSubtype,
  EventParameterType,
} from "../../../../types";
import { IEventInstance } from "../../../../boards";

export interface GateParameterNames {
  gateEntryIndex: number;
  gateSpaceIndex: number;
  gateExitIndex: number;
  gatePrevChain: number[];
  gateNextChain: number[];
}

export const Gate3: IEvent = {
  id: "GATE3",
  name: "",
  activationType: EditorEventActivationType.WALKOVER,
  executionType: EventExecutionType.PROCESS,
  parameters: [
    { name: "gateEntryIndex", type: EventParameterType.Number },
    { name: "gateSpaceIndex", type: EventParameterType.Number },
    { name: "gateExitIndex", type: EventParameterType.Number },
    { name: "gatePrevChain", type: EventParameterType.NumberArray },
    { name: "gateNextChain", type: EventParameterType.NumberArray },
  ],
  fakeEvent: true,
  supportedGames: [Game.MP3_USA],
  parse(dataView: DataView, info: IEventParseInfo) {
    // Chilly Waters 0x80109AD8 - 0x80109E84, enter 0x7B,0x79, exit 0x4C,0x3F, gates at 0x6D,0x93
    if (info.boardIndex === 0) {
      if (info.offset !== 0x0031f648) return false;

      // Marking the gate if we find the event on the entering space.
      if (dataView.getUint16(info.offset + 0x62) === info.curSpaceIndex) {
        info.board.spaces[dataView.getUint16(info.offset + 0x106)].subtype =
          SpaceSubtype.GATE;
        return true;
      } else if (
        dataView.getUint16(info.offset + 0x6a) === info.curSpaceIndex
      ) {
        info.board.spaces[dataView.getUint16(info.offset + 0x10e)].subtype =
          SpaceSubtype.GATE;
        return true;
      }
    }

    return false;
  },
  write(
    dataView: DataView,
    event: IEventInstance,
    info: IEventWriteInfo,
    temp: any,
  ) {
    // const {
    //   gateEntryIndex,
    //   gateSpaceIndex,
    //   gateExitIndex,
    //   gatePrevChain,
    //   gateNextChain,
    // } = (event.parameterValues as any as GateParameterNames)!;

    // Most of the code lives in the overlay.
    return `
      J __PP64_INTERNAL_GATE_EVENT
      NOP
    `;
  },
};
