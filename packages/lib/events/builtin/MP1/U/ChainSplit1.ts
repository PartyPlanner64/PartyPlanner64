import { IEventParseInfo, IEventWriteInfo, IEvent } from "../../../events";
import {
  EditorEventActivationType,
  EventExecutionType,
  Game,
  EventParameterType,
} from "../../../../types";
import { hashEqual } from "../../../../utils/arrays";
import { addConnectionInternal, IEventInstance } from "../../../../boards";
import { addEventToLibrary } from "../../../EventLibrary";
import { getSymbol } from "../../../../symbols/symbols";
import { findCallsInFunction, getRegSetAddress } from "../../../../utils/MIPS";
import { parseDecisionTree } from "../../../../ai/aitrees";

// Represents the "event" where the player decides between two paths.
// This won't be an actual event when exposed to the user.
export const ChainSplit1: IEvent = {
  id: "CHAINSPLIT1",
  name: "",
  activationType: EditorEventActivationType.WALKOVER,
  executionType: EventExecutionType.PROCESS,
  parameters: [
    { name: "left_space", type: EventParameterType.Space },
    { name: "right_space", type: EventParameterType.Space },
    { name: "chains", type: EventParameterType.NumberArray },
  ],
  fakeEvent: true,
  supportedGames: [Game.MP1_USA],
  parse(dataView: DataView, info: IEventParseInfo) {
    const hashes = {
      // From Mario Rainbow Castle / Luigi Engine Room:
      METHOD_START: "597324F65BC9A4D0BCA9527477258625", // +0x2C
      METHOD_MID1: "E276F5BAE352AC662ADCA86793409B62", // [0x30]+0x18
      METHOD_MID2: "24FBEBD7FA3B256016D536690EF70AD8", // [0x4C]+0x1C
      METHOD_END: "F153076BBD19ECBB4967EFC92CD738DF", // [0xE0]+0x28
    };

    // Match a few sections to see if we match.
    if (
      hashEqual([dataView.buffer, info.offset, 0x2c], hashes.METHOD_START) &&
      //hashEqual([dataView.buffer, info.offset + 0x30, 0x18], hashes.METHOD_MID1) &&
      hashEqual(
        [dataView.buffer, info.offset + 0x4c, 0x1c],
        hashes.METHOD_MID2,
      ) &&
      hashEqual([dataView.buffer, info.offset + 0xe0, 0x28], hashes.METHOD_END)
    ) {
      // Read the chain indices.
      const leftChain = dataView.getUint16(info.offset + 0xda);
      const rightChain = dataView.getUint16(info.offset + 0xde);

      const leftSpace = info.chains[leftChain][0]; // Technically, we should check if A2 is really R0.
      const rightSpace = info.chains[rightChain][0];

      addConnectionInternal(info.curSpace, leftSpace, info.board);
      addConnectionInternal(info.curSpace, rightSpace, info.board);

      // Locate the AI decision tree.
      const aiSymbol = getSymbol(info.game, "RunDecisionTree");
      const treeCalls = findCallsInFunction(dataView, info.offset, aiSymbol);
      if (treeCalls.length) {
        const callOffset = treeCalls[0];
        const treeDataUpper = dataView.getUint16(callOffset - 6);
        const treeDataLower = dataView.getUint16(callOffset - 2);
        const treeDataAddr = getRegSetAddress(treeDataUpper, treeDataLower);
        const noPrefixAddr = info.addr & 0x7fffffff;
        const addrDiff = treeDataAddr - noPrefixAddr;
        const treeDataOffset = info.offset + addrDiff;
        const addrBase = noPrefixAddr - info.offset;
        const tree = parseDecisionTree(
          dataView,
          treeDataOffset,
          addrBase,
          info.gameVersion,
        );
        //addDecisionTree(info.board, info.curSpaceIndex, tree);
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
    const chains = event.parameterValues!["chains"] as number[];
    return `
        ADDIU SP SP 0xFFD8
        SW RA 0x24(SP)
        SW S2 0x20(SP)
        SW S1 0x1C(SP)
        SW S0 0x18(SP)

        ; Change player to standing animation?
        ADDIU A0 R0 -1
        ADDIU A1 R0 -1
        JAL 0x80052BE8
        ADDIU A2 R0 2

        JAL SleepVProcess
        NOP
        JAL chainsplit_1_setup_arrows
        NOP
        LUI S0 0x800F
        ADDIU S0 S0 0xD5DC ; 0x800ED5DC
        LH A0 0(S0)
        LUI A1 hi(indices)
        JAL 0x8003C218
        ADDIU A1 A1 lo(indices)
        ADDU S2 V0 R0
        ADDU A0 S2 R0
        LH A1 0(S0)
        JAL 0x8003C060
        ADDU A2 R0 R0
        JAL PlayerIsCPU
        ADDIU A0 R0 -1
        BEQ V0 R0 do_direction_prompt
        NOP
        LUI A0 hi(ai_logic)
        ADDIU A0 A0 lo(ai_logic)
        JAL 0x8003E9B0
        ADDU S0 R0 R0
        SLL V0 V0 0x10
        SRA S1 V0 0x10
        BLEZ S1 choice_neg
        ADDU A0 S2 R0
      choice_pos:
        JAL 0x8003BE84
        ADDIU A1 R0 0xFFFE
        ADDIU S0 S0 1
        SLT V0 S0 S1
        BNE V0 R0 choice_pos
        ADDU A0 S2 R0
      choice_neg:
        JAL 0x8003BE84
        ADDIU A1 R0 0xFFFC
      do_direction_prompt:
        JAL 0x8003C14C ; DirectionPrompt
        ADDU A0 S2 R0
        ADDU S0 V0 R0
        JAL 0x8003B908
        ADDU A0 S2 R0
        JAL chainsplit_1_hide_arrows
        NOP
        BNE S0 R0 set_chain_right
        ADDIU A0 R0 -1
        J set_chain
        ADDIU A1 R0 ${chains[0]}
      set_chain_right:
        ADDIU A1 R0 ${chains[1]}
      set_chain:
        JAL SetNextChainAndSpace
        ADDU A2 R0 R0 ; 0th space of the chain
        JAL 0x8005DD90
        ADDU A0 R0 R0
        LW RA 0x24(SP)
        LW S2 0x20(SP)
        LW S1 0x1C(SP)
        LW S0 0x18(SP)
        JR RA
        ADDIU SP SP 0x28

      ; Choose randomly
      ai_logic:
        .word 0x00000000, 0x00000000, 0x00003232

      indices:
        .halfword left_space
        .halfword right_space
        .halfword 0xFFFF
        .align 4

    .beginstatic
      .definelabel CORE_800EE320,0x800EE320

      chainsplit_1_setup_arrows:
        addiu SP, SP, -0x18
        sw    RA, 0x10(SP)
      @@setup_arrows_loop1:
        jal 0x8004B850 ; waiting for this to signal
        NOP
        beq V0, R0, @@setup_arrows_loop1_exit
        NOP
        jal SleepVProcess
        NOP
        j @@setup_arrows_loop1
        NOP
      @@setup_arrows_loop1_exit:
        jal SleepVProcess
        NOP
        addu  A0, R0, R0
        addiu A1, R0, 146
        jal   0x80045D84
        addiu A2, R0, 1
        lui   AT, hi(chainsplit_1_memval1)
        sw    V0, lo(chainsplit_1_memval1)(AT)
        addiu A0, R0, 1
        addiu A1, R0, 160
        jal   0x80045D84
        addiu A2, R0, 1
        lui   AT, hi(chainsplit_1_memval2)
        sw    V0, lo(chainsplit_1_memval2)(AT)
        addiu A0, R0, 3
        addiu A1, R0, 174
        jal   0x80045D84
        addiu A2, R0, 1
        lui   AT, hi(chainsplit_1_memval3)
        sw    V0, lo(chainsplit_1_memval3)(AT)
        addiu A0, R0, 11
        addiu A1, R0, 188
        jal   0x80045D84
        addiu A2, R0, 1
        lui   AT, hi(chainsplit_1_memval4)
        sw    V0, lo(chainsplit_1_memval4)(AT)
        jal   SleepProcess
        addiu A0, R0, 3
        addiu V0, R0, 1
        lui   AT, hi(CORE_800EE320)
        sh    V0, lo(CORE_800EE320)(AT)
        lw    RA, 0x10(SP)
        jr    RA
        addiu SP, SP, 0x18

      chainsplit_1_hide_arrows:
        addiu SP, SP, -0x18
        sw    RA, 0x10(SP)
        lui   AT, hi(CORE_800EE320)
        sh    R0, lo(CORE_800EE320)(AT)
        lui   A0, hi(chainsplit_1_memval1)
        jal   0x80045E6C
        lw    A0, lo(chainsplit_1_memval1)(A0)
        lui   A0, hi(chainsplit_1_memval2)
        jal   0x80045E6C
        lw    A0, lo(chainsplit_1_memval2)(A0)
        lui   A0, hi(chainsplit_1_memval3)
        jal   0x80045E6C
        lw    A0, lo(chainsplit_1_memval3)(A0)
        lui   A0, hi(chainsplit_1_memval4)
        jal   0x80045E6C
        lw    A0, lo(chainsplit_1_memval4)(A0)
        lw    RA, 0x10(SP)
        jr    RA
        addiu SP, SP, 0x18

      chainsplit_1_memval1:
        .word 0
      chainsplit_1_memval2:
        .word 0
      chainsplit_1_memval3:
        .word 0
      chainsplit_1_memval4:
        .word 0
    .endstatic
    `;
  },
};
addEventToLibrary(ChainSplit1);
