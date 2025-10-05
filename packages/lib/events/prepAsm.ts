import { IEventWriteInfo, IEvent } from "./events";
import { getSymbols } from "../symbols/symbols";
import { getChainIndexValuesFromAbsoluteIndex } from "../adapter/boarddef";
import { Game, EventParameterType } from "../types";
import { $$hex } from "../utils/debug";
import { makeAudioSymbolLabels } from "./getaudiochoice";
import {
  getBoardAdditionalBgHvqIndices,
  makeBgSymbolLabels,
} from "./additionalbg";
import { IEventInstance } from "../boards";

/**
 * Takes event asm, and makes it assemble (in isolation)
 */
export function prepAsm(
  asm: string,
  event: IEvent,
  spaceEvent: IEventInstance,
  info: IEventWriteInfo,
) {
  const parameterSymbols = makeParameterSymbolLabels(event, spaceEvent, info);
  const audioSymbols = makeAudioSymbolLabels(info.audioIndices);
  const bgSymbols = makeBgSymbolLabels(
    info.boardInfo.bgDir,
    getBoardAdditionalBgHvqIndices(info.board),
  );
  const asmWithParamSyms = [
    ...parameterSymbols,
    ...audioSymbols,
    ...bgSymbols,
    asm,
  ].join("\n");

  return prepGenericAsm(asmWithParamSyms, info.addr!, info.game);
}

/**
 * Takes asm, and makes it assemble (in isolation)
 */
export function prepGenericAsm(asm: string, addr: number, game: Game) {
  const orgDirective = `.org ${$$hex(addr)}`;
  const addrSyms = makeGenericSymbolsForAddresses(asm);
  const gameSyms = makeGameSymbolLabels(game, true);
  return [
    orgDirective,
    ...addrSyms,
    ...gameSyms,
    asm,
    ".align 4", // it better!
  ].join("\n");
}

export function prepSingleEventAsm(
  asm: string,
  event: IEvent,
  spaceEvent: IEventInstance,
  info: IEventWriteInfo,
  keepStatic: boolean,
  eventNum: number,
): string {
  // We either define a label at the top, or an alias to the main: label if present.
  const hasMainEntry = asm
    .split("\n")
    .find((value) => value.startsWith("main:"));
  const eventLabel = createEventInstanceLabel(info.curSpaceIndex, eventNum);
  const topLabel = !hasMainEntry && `${eventLabel}:`;
  const bottomLabel = hasMainEntry && `.definelabel ${eventLabel},main`;

  return scopeLabelsStaticByDefault(
    `
    .beginfile ; Scopes static labels
    ${topLabel || ""}
    ${makeParameterSymbolLabels(event, spaceEvent, info).join("\n")}
    ${asm}
    ${bottomLabel || ""}
    .align 4
    .endfile
  `,
    keepStatic,
  );
}

export function makeGameSymbolLabels(
  game: Game,
  needOverlayStubs: boolean,
): string[] {
  const symbols = getSymbols(game);
  const syms = symbols.map((symbol) => {
    return `.definelabel ${symbol.name},0x${symbol.addr.toString(16)}`;
  });

  // Add symbols that are aliased from the board overlay.
  switch (game) {
    case Game.MP1_USA:
      if (needOverlayStubs) {
        syms.push(".definelabel GetBoardAudioIndex,0");
      } else {
        syms.push(
          `.definelabel GetBoardAudioIndex,__PP64_INTERNAL_GET_BOARD_AUDIO_INDEX`,
        );
      }
      break;
    case Game.MP2_USA:
      if (needOverlayStubs) {
        syms.push(".definelabel ViewBoardMap,0");
        syms.push(".definelabel GetBoardAudioIndex,0");
        syms.push(".definelabel GetRandPromptSelection,0");
      } else {
        syms.push(".definelabel ViewBoardMap,__PP64_INTERNAL_VIEW_MAP");
        syms.push(
          `.definelabel GetBoardAudioIndex,__PP64_INTERNAL_GET_BOARD_AUDIO_INDEX`,
        );
        syms.push(
          ".definelabel GetRandPromptSelection,__PP64_INTERNAL_RAND_MESSAGE_CHOICE",
        );
      }
      break;

    case Game.MP3_USA:
      if (needOverlayStubs) {
        syms.push(".definelabel GetBasicPromptSelection,0");
        syms.push(".definelabel ViewBoardMap,0");
        syms.push(".definelabel GetBoardAudioIndex,0");
      } else {
        syms.push(
          ".definelabel GetBasicPromptSelection,__PP64_INTERNAL_BASIC_MESSAGE_CHOICE",
        );
        syms.push(".definelabel ViewBoardMap,__PP64_INTERNAL_VIEW_MAP");
        syms.push(
          `.definelabel GetBoardAudioIndex,__PP64_INTERNAL_GET_BOARD_AUDIO_INDEX`,
        );
      }
      break;
  }

  return syms;
}

const _funcRegex = /func_(8[0-9A-Fa-f]{7})/g;
const _addrRegex = /D_(8[0-9A-Fa-f]{7})/g;

/**
 * Creates labels for any "obvious" symbols:
 *   func_80012345
 *   D_80012345
 */
export function makeGenericSymbolsForAddresses(asm: string): string[] {
  let results: string[] = [];

  const funcMatches = asm.match(_funcRegex);
  if (funcMatches) {
    funcMatches.forEach((match) => {
      if (asm.indexOf(match + ":") >= 0) {
        // Don't create an alias if there's a label for "func_x" already,
        // since the generated label is most likely going to corrupt things.
        return;
      }
      const addr = match.substr(5).toUpperCase();
      results.push(`.definelabel ${match},0x${addr}`);
    });
  }

  const addrMatches = asm.match(_addrRegex);
  if (addrMatches) {
    addrMatches.forEach((match) => {
      if (asm.indexOf(match + ":") >= 0) {
        return;
      }
      const addr = match.substr(2).toUpperCase();
      results.push(`.definelabel ${match},0x${addr}`);
    });
  }

  // Remove duplicates.
  results = results.filter((item, index) => results.indexOf(item) === index);
  return results;
}

export function makeParameterSymbolLabels(
  event: IEvent,
  spaceEvent: IEventInstance,
  info: IEventWriteInfo,
): string[] {
  const parameterSymbols: string[] = [];
  const parameters = event.parameters;
  const parameterValues = spaceEvent.parameterValues;
  if (parameters && parameters.length && parameterValues) {
    parameters.forEach((parameter) => {
      const parameterValue = parameterValues[parameter.name];
      switch (parameter.type) {
        case EventParameterType.Boolean:
          parameterSymbols.push(
            `.definelabel ${parameter.name},${parameterValue ? 1 : 0}`,
          );
          break;

        case EventParameterType.Number:
          if (typeof parameterValue === "number") {
            parameterSymbols.push(
              `.definelabel ${parameter.name},${parameterValue}`,
            );
          }
          break;

        case EventParameterType.NumberArray:
          break; // TODO: Maybe expose labels for these?

        case EventParameterType.Space:
          parameterSymbols.push(
            `.definelabel ${parameter.name},${parameterValue}`,
          );
          if (info.chains) {
            const indices = getChainIndexValuesFromAbsoluteIndex(
              info.chains,
              parameterValue as number,
            );
            parameterSymbols.push(
              `.definelabel ${parameter.name}_chain_index,${indices[0]}`,
            );
            parameterSymbols.push(
              `.definelabel ${parameter.name}_chain_space_index,${indices[1]}`,
            );
          } else {
            // Mostly for testAssemble
            parameterSymbols.push(
              `.definelabel ${parameter.name}_chain_index,-1`,
            );
            parameterSymbols.push(
              `.definelabel ${parameter.name}_chain_space_index,-1`,
            );
          }
          break;

        case EventParameterType.SpaceArray:
          if (info.testCompile) {
            parameterSymbols.push(`${parameter.name} equ 0`);
            parameterSymbols.push(`${parameter.name}_length equ 1`);
            parameterSymbols.push(`${parameter.name}_chain_indices equ 0`);
            parameterSymbols.push(
              `${parameter.name}_chain_space_indices equ 0`,
            );
          } else {
            const spaceArr = (parameterValue as number[]) || [];
            parameterSymbols.push(
              `${parameter.name} equ ${spaceArr.join(",")}`,
            );
            parameterSymbols.push(
              `${parameter.name}_length equ ${spaceArr.length}`,
            );

            const allIndices = spaceArr.map((s) =>
              getChainIndexValuesFromAbsoluteIndex(info.chains, s),
            );
            const chainIndices = allIndices.map((x) => x[0]);
            const chainSpaceIndices = allIndices.map((x) => x[1]);
            parameterSymbols.push(
              `${parameter.name}_chain_indices equ ${chainIndices.join(",")}`,
            );
            parameterSymbols.push(
              `${
                parameter.name
              }_chain_space_indices equ ${chainSpaceIndices.join(",")}`,
            );
          }
          break;

        default:
          if (
            typeof parameterValue !== "undefined" &&
            parameterValue !== null
          ) {
            parameterSymbols.push(
              `.definelabel ${parameter.name},${parameterValue}`,
            );
          }
          break;
      }
    });
  }
  return parameterSymbols;
}

/**
 * Events are written assuming their global labels are scoped to themselves,
 * but during assembly they need to be scoped using the static labels feature.
 */
export function scopeLabelsStaticByDefault(
  asm: string,
  keepStatic: boolean,
): string {
  const lines = asm.split("\n").map((line) => line.trim());

  // We always find labels to scope without static sections...
  const linesWithoutStaticSections = removeStaticSections(lines, keepStatic);
  const labels = findLabelsToScope(linesWithoutStaticSections);

  // But only keep the static section when replacing the first time.
  asm = keepStatic
    ? replaceStaticRegionDirectives(lines)
    : linesWithoutStaticSections.join("\n");

  const labelCharRegex = /[@\w!?]/;
  labels.forEach((label) => {
    let currentIndex = -1;
    do {
      currentIndex = asm.indexOf(label, currentIndex);
      if (currentIndex >= 0) {
        if (currentIndex > 0) {
          const prevChar = asm[currentIndex - 1];
          if (labelCharRegex.test(prevChar)) {
            // Something odd comes before this instance of the label.
            currentIndex += label.length;
            continue;
          }
        }
        if (currentIndex + label.length < asm.length) {
          const nextChar = asm[currentIndex + label.length];
          if (labelCharRegex.test(nextChar)) {
            // Something odd comes after this instance of the label.
            currentIndex += label.length;
            continue;
          }
        }

        asm = asm.slice(0, currentIndex) + "@" + asm.slice(currentIndex);
        currentIndex += label.length + 1;
      }
    } while (currentIndex >= 0);
  });

  return asm;
}

/**
 * Obtains an array of all the labels within the given lines of assembly.
 * Only gets labels that should be scoped for event assembly.
 */
function findLabelsToScope(lines: string[]): string[] {
  const defineLabelRegex = /^\.definelabel\s+([^,]+)/i;
  const labelRegex = /^([@\w!?]+):/i;
  const equRegex = /^\s*([@\w!?]+)\s+equ(?:$|\s+)/i;

  let foundLabels: string[] = [];
  lines.forEach((line) => {
    let match = defineLabelRegex.exec(line);
    if (match) {
      foundLabels.push(match[1]);
      return;
    }

    match = equRegex.exec(line);
    if (match) {
      foundLabels.push(match[1]);
      return;
    }

    while ((match = labelRegex.exec(line))) {
      // eslint-disable-line no-cond-assign
      foundLabels.push(match[1]);
      line = line.substr(match[0].length);
    }
  });
  foundLabels = foundLabels.filter(labelShouldBeScoped);
  return foundLabels;
}

function labelShouldBeScoped(label: string): boolean {
  if (label.indexOf("__PP64_INTERNAL") >= 0) {
    return false; // Don't scope internal labels.
  }
  if (label[0] === "@") {
    return false; // Don't scope already somewhat-scoped labels.
  }

  return true;
}

function removeStaticSections(
  lines: string[],
  keepingStatics: boolean,
): string[] {
  let withinStatic = false;
  const filteredLines = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i] === ".beginstatic") {
      if (withinStatic) {
        throw new Error("Cannot repeat .beginstatic within a static section");
      }
      withinStatic = true;
      if (!keepingStatics) {
        filteredLines.push("; omitted statics");
      }
      continue;
    } else if (lines[i] === ".endstatic") {
      if (!withinStatic) {
        throw new Error("Saw .endstatic without .beginstatic");
      }
      withinStatic = false;
      continue;
    }

    if (!withinStatic) {
      filteredLines.push(lines[i]);
    }
  }

  if (withinStatic) {
    throw new Error("Saw .beginstatic without .endstatic");
  }

  return filteredLines;
}

/** Just comments out the .beginstatic and .endstatic lines */
function replaceStaticRegionDirectives(lines: string[]): string {
  const adjustedLines = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i] === ".beginstatic") {
      adjustedLines.push("; .beginstatic");
    } else if (lines[i] === ".endstatic") {
      adjustedLines.push("; .endstatic");
    } else {
      adjustedLines.push(lines[i]);
    }
  }

  return adjustedLines.join("\n");
}

export function createEventInstanceLabel(
  spaceIndex: number,
  eventNumber: number,
): string {
  const strIndex = spaceIndex < 0 ? "minus" + Math.abs(spaceIndex) : spaceIndex;
  return `__PP64_INTERNAL_EVENT_${strIndex}_${eventNumber}`;
}
