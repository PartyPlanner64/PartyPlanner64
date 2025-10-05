import { IEventParseInfo, IEventWriteInfo, IEvent } from "../../../events";
import {
  EditorEventActivationType,
  EventExecutionType,
  Game,
  EventParameterType,
} from "../../../../types";
import { getFunctionLength } from "../../../../utils/MIPS";
import { IEventInstance } from "../../../../boards";

export const GateClose3: IEvent = {
  id: "GATECLOSE3",
  name: "",
  activationType: EditorEventActivationType.WALKOVER,
  executionType: EventExecutionType.DIRECT,
  parameters: [{ name: "gateIndex", type: EventParameterType.Number }],
  fakeEvent: true,
  supportedGames: [Game.MP3_USA],

  parse(dataView: DataView, info: IEventParseInfo) {
    const fnLen = getFunctionLength(dataView, info.offset);
    if (fnLen !== 0x1c) return false;

    const gateCloseJALs = [
      0x0c0422ba, // JAL 0x80108AE8
    ];

    // Chilly Waters 0x8010F050 - 0x8010F06C
    if (dataView.getUint32(info.offset + 8) !== gateCloseJALs[info.boardIndex])
      return false;

    return true;
  },
  write(
    dataView: DataView,
    event: IEventInstance,
    info: IEventWriteInfo,
    temp: any,
  ) {
    // Most of the code still lives in the overlay.
    const gateIndex = event.parameterValues!.gateIndex as number;
    return `
      addiu SP, SP, -0x18
      sw    RA, 0x10(SP)
      jal   __PP64_INTERNAL_GATE_CLOSE_EVENT
       li    A0, ${gateIndex}
      lw    RA, 0x10(SP)
      jr    RA
       addiu SP, SP, 0x18
    `;
  },
};
