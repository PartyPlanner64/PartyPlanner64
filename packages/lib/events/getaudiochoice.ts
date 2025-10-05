import { EventCodeLanguage, getGameName, Game } from "../types";
import { prepGenericC } from "./prepC";
import { compile } from "../utils/c-compiler";
import { $$log } from "../utils/debug";
import { assemble } from "mips-assembler";
import { prepGenericAsm } from "./prepAsm";
import { scopeLabelsStaticByDefault } from "./prepAsm";
import { getAudioSelectCode } from "../../../apps/partyplanner64/boards";
import { romhandler } from "../romhandler";
import { IBoard } from "../boards";

/** Default assembly code used for audio selection. */
export const defaultGetAudioAsm = `; Customize the background music used each turn!
; This function runs whenever the board music starts playing.
; Custom tracks you've added are available as MUSIC_TRACK_INDEX_#,
; e.g. MUSIC_TRACK_INDEX_1 for the first added custom song.
; (If you aren't using custom music, then only MUSIC_TRACK_INDEX_1
; exists and it is set to the in-game music index you chose.)
ADDIU SP SP -4
SW RA 0(SP)

; Return the audio index in V0.
LI V0 MUSIC_TRACK_INDEX_1

LW RA 0(SP)
JR RA
ADDIU SP SP 4`;

export const defaultGetAudioC = `// Customize the background music used each turn!
// This function runs whenever the board music starts playing.
// Custom tracks you've added are available as MUSIC_TRACK_INDEX_#,
// e.g. MUSIC_TRACK_INDEX_1 for the first added custom song.
// (If you aren't using custom music, then only MUSIC_TRACK_INDEX_1
// exists and it is set to the in-game music index you chose.)

int PickAudioIndex() {
    return MUSIC_TRACK_INDEX_1;
}`;

export function getDefaultGetAudioCode(language: EventCodeLanguage): string {
  switch (language) {
    case EventCodeLanguage.C:
      return defaultGetAudioC;

    case EventCodeLanguage.MIPS:
      return defaultGetAudioAsm;
  }

  throw new Error(`Unrecognized event code language ${language}`);
}

export async function testGetAudioCodeAllGames(
  code: string,
  language: EventCodeLanguage,
  board: IBoard,
): Promise<string[]> {
  const possibleGameVersions = getGameVersionsToTestCompile(board);

  let failures: string[] = [];

  for (const game of possibleGameVersions) {
    failures = failures.concat(
      await testGetAudioCodeWithGame(code, language, board, game),
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

export async function testGetAudioCodeWithGame(
  code: string,
  language: EventCodeLanguage,
  board: IBoard,
  game: Game,
): Promise<string[]> {
  const failures: string[] = [];

  const fakeAudioIndices = makeFakeGetAudioIndices(board);

  if (language === EventCodeLanguage.C) {
    const cWithDefines = prepGetAudioC(code, fakeAudioIndices);
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
    const asmWithSyms = prepGetAudioAsm(code, fakeAudioIndices);
    try {
      const preppedAsm = prepGenericAsm(asmWithSyms, 0x80000000, game);
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

export async function getAudioIndexAsmForOverlay(
  board: IBoard,
  audioIndices: number[],
) {
  const audioSelectCode = getAudioSelectCode(board);
  if (!audioSelectCode) {
    return prepGetAudioAsm(defaultGetAudioAsm, audioIndices);
  }

  switch (audioSelectCode.language) {
    case EventCodeLanguage.C: {
      const cWithDefines = prepGetAudioC(audioSelectCode.code, audioIndices);
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
      return prepGetAudioAsm(audioSelectCode.code, audioIndices);

    default:
      throw new Error(
        `Unrecognized event code language ${audioSelectCode.language}`,
      );
  }
}

/** Surrounds the audio index code with the necessary symbols. */
export function prepGetAudioAsm(asm: string, audioIndices: number[]): string {
  return scopeLabelsStaticByDefault(
    `
    .beginfile ; Scopes static labels
    __PP64_INTERNAL_GET_BOARD_AUDIO_INDEX:
    ${makeAudioSymbolLabels(audioIndices).join("\n")}
    ${asm}
    .align 4
    .endfile
  `,
    true,
  );
}

export function makeFakeGetAudioIndices(board: IBoard): number[] {
  if (!board.audioData || !board.audioData.length) return [1]; // One for the in-game audio track.

  let i = 0;
  return board.audioData.map((_) => ++i);
}

export function makeAudioSymbolLabels(audioIndices: number[]): string[] {
  const syms = audioIndices.map((audioIndex, i) => {
    return `.definelabel MUSIC_TRACK_INDEX_${i + 1},${audioIndex}`;
  });

  return syms;
}

/** Surrounds the get audio C code with the necessary symbols. */
export function prepGetAudioC(code: string, audioIndices: number[]): string {
  return `
#define PickAudioIndex __PP64_INTERNAL_GET_BOARD_AUDIO_INDEX
${makeAudioDefines(audioIndices).join("\n")}
${code}
  `;
}

/** Creates defines for music tracks. */
export function makeAudioDefines(
  audioIndices: number[] | null | undefined,
): string[] {
  if (!audioIndices) {
    return [];
  }

  const syms = audioIndices.map((audioIndex, i) => {
    return `#define MUSIC_TRACK_INDEX_${i + 1} ${audioIndex}`;
  });

  return syms;
}
