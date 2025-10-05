import { IEvent, IEventWriteInfo, IEventParseInfo } from "../../../events";
import {
  EditorEventActivationType,
  EventExecutionType,
  Game,
  EventParameterType,
} from "../../../../types";
import { hashEqual } from "../../../../utils/arrays";
import { addConnectionInternal, IEventInstance } from "../../../../boards";
import { addEventToLibrary } from "../../../EventLibrary";

// Represents the "event" that takes the player from one chain to another.
// This won't be an actual event when exposed to the user.
export const ChainMerge3: IEvent = {
  id: "CHAINMERGE3",
  name: "",
  activationType: EditorEventActivationType.WALKOVER,
  executionType: EventExecutionType.DIRECT,
  parameters: [
    { name: "prevSpace", type: EventParameterType.Number },
    { name: "chain", type: EventParameterType.Number },
    { name: "spaceIndex", type: EventParameterType.Number },
  ],
  fakeEvent: true,
  supportedGames: [Game.MP3_USA],
  parse(dataView: DataView, info: IEventParseInfo) {
    // ChainMerge in 3 uses a helper function. It passes the space index of the
    // _previous_ space the player was before reaching the event space.
    const hashes = {
      START: "16092DD153432852C141C78807ECCBF0", // +0x08
      //MID: "123FF0D66026C628870C3DAEE5C63134", // [0x10]+0x04 // Use mergeJALs instead
      END: "0855E7309F121915D7A762AB85A7FDB6", // [0x18]+0x08
    };
    const mergeJALs = [
      0x0c03b666, // JAL 0x800ED998
      0x0c042307, // JAL 0x80108C1C
    ];

    let nextChain, nextSpace;

    if (
      hashEqual([dataView.buffer, info.offset, 0x08], hashes.START) &&
      mergeJALs.indexOf(dataView.getUint32(info.offset + 0x10)) >= 0 &&
      hashEqual([dataView.buffer, info.offset + 0x18, 0x08], hashes.END)
    ) {
      // Read the chain we are going to.
      nextChain = dataView.getUint16(info.offset + 0x0e);
      nextChain = nextChain > 1000 ? 0 : nextChain; // R0 will be 0x2821 - just check for "way to big".

      // Read the offset into the chain.
      if (dataView.getUint16(info.offset + 0x14) === 0)
        // Usually this is an add with R0.
        nextSpace = info.chains[nextChain][0];
      else
        nextSpace =
          info.chains[nextChain][dataView.getUint16(info.offset + 0x16)];

      // This isn't an event really - write directly to the board links.
      if (!isNaN(nextSpace)) {
        // I think this tries to prevent reading the "reverse" event...
        if (info.board.links.hasOwnProperty(info.curSpace)) {
          return false;
        }

        addConnectionInternal(info.curSpace, nextSpace, info.board);
      }

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
    // TODO: Could just use "prevSpace" etc below, the definelabels should work...
    return `
      ADDIU SP, SP, -0x18
      SW    RA, 0x10(SP)
      ADDIU A0, R0, ${event.parameterValues!.prevSpace || 0}
      ADDIU A1, R0, ${event.parameterValues!.chain || 0}
      JAL   chainmerge_3_helper
      ADDIU A2, R0, ${event.parameterValues!.spaceIndex || 0}
      LW    RA, 0x10(SP)
      JR    RA
      ADDIU SP, SP, 0x18

  .beginstatic
    chainmerge_3_helper:
      addiu SP, SP, -0x20
      sw    RA, 0x1c(SP)
      sw    S2, 0x18(SP)
      sw    S1, 0x14(SP)
      sw    S0, 0x10(SP)
      move  S0, A0
      move  S1, A1
      move  S2, A2
      jal   GetPlayerStruct
        li    A0, -1
      lbu   A0, 0x15(V0)
      sll   A0, A0, 0x18
      sra   A0, A0, 0x18
      lbu   A1, 0x16(V0)
      sll   A1, A1, 0x18
      sra   A1, A1, 0x18
      andi  A0, A0, 0xffff
      jal   GetAbsSpaceIndexFromChainSpaceIndex
        andi  A1, A1, 0xffff
      sll   V0, V0, 0x10
      sra   V0, V0, 0x10
      bne   V0, S0, chainmerge_3_helper_exit
        sll   A1, S1, 0x10
      sll   A2, S2, 0x10
      li    A0, -1
      sra   A1, A1, 0x10
      jal   SetNextChainAndSpace
        sra   A2, A2, 0x10
      chainmerge_3_helper_exit:
      lw    RA, 0x1c(SP)
      lw    S2, 0x18(SP)
      lw    S1, 0x14(SP)
      lw    S0, 0x10(SP)
      jr    RA
        addiu SP, SP, 0x20
  .endstatic
    `;
  },
};
addEventToLibrary(ChainMerge3);
