import { EventCodeLanguage, getGameName, Game } from "../types";
import { prepGenericC } from "./prepC";
import { compile } from "../utils/c-compiler";
import { $$log } from "../utils/debug";
import { assemble } from "mips-assembler";
import { prepGenericAsm } from "./prepAsm";
import { scopeLabelsStaticByDefault } from "./prepAsm";
import {
  getAdditionalBackgroundCode,
  IBoard,
} from "../../../apps/partyplanner64/boards";
import { romhandler } from "../romhandler";

/** Default assembly code used for background selection. */
export const defaultAdditionalBgAsm = `; Customize the background used each turn!
; This function runs at the start of each turn.
; The default background is available as DEFAULT_BG.
; Additional backgrounds are available as ADDITIONAL_BG_#,
; e.g. ADDITIONAL_BG_1 for the first added background.
ADDIU SP SP -4
SW RA 0(SP)

; Return the background index in V0.
LI V0 DEFAULT_BG

LW RA 0(SP)
JR RA
ADDIU SP SP 4`;

export const defaultAdditionalBgC = `// Customize the background used each turn!
// This function runs at the start of each turn.
// The default background is available as DEFAULT_BG.
// Additional backgrounds are available as ADDITIONAL_BG_#,
// e.g. ADDITIONAL_BG_1 for the first added background.

int PickBackground() {
    return DEFAULT_BG;
}`;

export function getDefaultAdditionalBgCode(
  language: EventCodeLanguage,
): string {
  switch (language) {
    case EventCodeLanguage.C:
      return defaultAdditionalBgC;

    case EventCodeLanguage.MIPS:
      return defaultAdditionalBgAsm;
  }

  throw new Error(`Unrecognized event code language ${language}`);
}

function makeFakeBgSyms(board: IBoard): number[] {
  if (!board.additionalbg) return [];

  let i = 0;
  return board.additionalbg.map((bg) => ++i);
}

export async function testAdditionalBgCodeAllGames(
  code: string,
  language: EventCodeLanguage,
  board: IBoard,
): Promise<string[]> {
  const possibleGameVersions = getGameVersionsToTestCompile(board);

  let failures: string[] = [];

  for (const game of possibleGameVersions) {
    failures = failures.concat(
      await testAdditionalBgCodeWithGame(code, language, board, game),
    );
  }

  // If it doesn't fail all, that means it's OK for some game and that's good enough.
  if (failures.length === possibleGameVersions.length) {
    failures.unshift(
      "All possible target game versions failed to compile/assemble.",
    );
  } else {
    failures = [];
  }

  return failures;
}

export async function testAdditionalBgCodeWithGame(
  code: string,
  language: EventCodeLanguage,
  board: IBoard,
  game: Game,
): Promise<string[]> {
  const failures: string[] = [];

  const bgIndices = makeFakeBgSyms(board);

  if (language === EventCodeLanguage.C) {
    const cWithDefines = prepAdditionalBgC(code, 0, bgIndices);
    try {
      const preppedC = prepGenericC(cWithDefines, game);
      $$log(preppedC);
      const asm = await compile(preppedC);
      $$log(asm);
      const preppedAsm = prepGenericAsm(asm, 0x80000000, game);
      assemble(preppedAsm);
    } catch (e) {
      failures.push(
        `Failed test compile/assemble for ${getGameName(game)}:\n${e}\n`,
      );
    }
  } else {
    const asmWithBgSyms = prepAdditionalBgAsm(code, 0, bgIndices);
    try {
      const preppedAsm = prepGenericAsm(asmWithBgSyms, 0x80000000, game);
      $$log(preppedAsm);
      assemble(preppedAsm);
    } catch (e) {
      failures.push(`Failed test assembly for ${getGameName(game)}:\n${e}\n`);
    }
  }

  return failures;
}

function getGameVersionsToTestCompile(board: IBoard): Game[] {
  switch (board.game) {
    case 1:
      return [Game.MP1_USA, Game.MP1_PAL, Game.MP1_JPN];
    case 2:
      return [Game.MP2_USA, Game.MP2_PAL, Game.MP2_JPN];
    case 3:
      return [Game.MP3_USA, Game.MP3_PAL, Game.MP3_JPN];
  }
}

export async function getAdditionalBgAsmForOverlay(
  board: IBoard,
  bgDir: number,
  additionalBgIndices: number[] | undefined | null,
) {
  const bgCode = getAdditionalBackgroundCode(board);
  if (!bgCode) {
    return prepAdditionalBgAsm(
      defaultAdditionalBgAsm,
      bgDir,
      additionalBgIndices,
    );
  }

  switch (bgCode.language) {
    case EventCodeLanguage.C: {
      const cWithDefines = prepAdditionalBgC(
        bgCode.code,
        bgDir,
        additionalBgIndices,
      );
      const game = romhandler.getROMGame()!;
      const preppedC = prepGenericC(cWithDefines, game);
      const asm = await compile(preppedC);
      return scopeLabelsStaticByDefault(
        `
        .beginfile ; Scopes static labels
        ${asm}
        .align 4
        .endfile
      `,
        true,
      );
    }
    case EventCodeLanguage.MIPS:
      return prepAdditionalBgAsm(bgCode.code, bgDir, additionalBgIndices);

    default:
      throw new Error(`Unrecognized event code language ${bgCode.language}`);
  }
}

/** Surrounds the additional bg code with the necessary bg symbols. */
export function prepAdditionalBgAsm(
  asm: string,
  defaultBgIndex: number,
  additionalBgIndices?: number[] | null,
): string {
  return scopeLabelsStaticByDefault(
    `
    .beginfile ; Scopes static labels
    __PP64_INTERNAL_ADDITIONAL_BG_CHOICE:
    ${makeBgSymbolLabels(defaultBgIndex, additionalBgIndices).join("\n")}
    ${asm}
    .align 4
    .endfile
  `,
    true,
  );
}

export function makeBgSymbolLabels(
  defaultBgIndex: number,
  additionalBgIndices?: number[] | null,
): string[] {
  const syms = [`.definelabel DEFAULT_BG,${defaultBgIndex}`];

  if (additionalBgIndices) {
    additionalBgIndices.forEach((bgIndex, i) => {
      syms.push(`.definelabel ADDITIONAL_BG_${i + 1},${bgIndex}`);
    });
  }

  return syms;
}

/** Surrounds the additional bg C code with the necessary symbols. */
export function prepAdditionalBgC(
  code: string,
  defaultBgIndex: number,
  additionalBgIndices?: number[] | null,
): string {
  return `
#define PickBackground __PP64_INTERNAL_ADDITIONAL_BG_CHOICE
${makeAdditionalBgDefines(defaultBgIndex, additionalBgIndices).join("\n")}
${code}
  `;
}

/** Creates defines for additional bg symbols. */
export function makeAdditionalBgDefines(
  defaultBgIndex: number,
  additionalBgIndices?: number[] | null,
): string[] {
  const syms = [`#define DEFAULT_BG ${defaultBgIndex}`];

  if (additionalBgIndices) {
    additionalBgIndices.forEach((bgIndex, i) => {
      syms.push(`#define ADDITIONAL_BG_${i + 1} ${bgIndex}`);
    });
  }

  return syms;
}

/** Assumes a call before the HVQ additional bgs have been written. */
export function getBoardAdditionalBgHvqIndices(
  board: IBoard | undefined | null,
): number[] | null {
  if (board?.additionalbg) {
    return board.additionalbg.map((bg, i) => {
      if (romhandler.romIsLoaded()) {
        const hvqfs = romhandler.getRom()!.getHVQFS();
        return hvqfs.getDirectoryCount() + i;
      }
      return i; // Must be a test compile.
    });
  }
  return null;
}
