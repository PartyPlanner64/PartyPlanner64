import { IEvent, IEventWriteInfo } from "./events";
import { EventParameterType, Game } from "../types";
import { getChainIndexValuesFromAbsoluteIndex } from "../adapter/boarddef";
import {
  getBoardAdditionalBgHvqIndices,
  makeAdditionalBgDefines,
} from "./additionalbg";
import { makeAudioDefines } from "./getaudiochoice";
import { IEventInstance } from "../boards";

/**
 * Takes event C code, and makes it able to compile (in isolation)
 */
export function prepC(
  code: string,
  event: IEvent,
  spaceEvent: IEventInstance,
  info: IEventWriteInfo,
) {
  const parameterDefines = makeParameterSymbolDefines(event, spaceEvent, info);
  const audioDefines = makeAudioDefines(info.audioIndices);
  const bgDefines = makeAdditionalBgDefines(
    info.boardInfo.bgDir,
    getBoardAdditionalBgHvqIndices(info.board),
  );
  const codeWithDefines = [
    ...parameterDefines,
    ...audioDefines,
    ...bgDefines,
    code,
  ].join("\n");

  return prepGenericC(codeWithDefines, info.game);
}

/**
 * Takes event C code, and makes it able to compile (in isolation)
 */
export function prepGenericC(code: string, game: Game) {
  // TODO: Add in game-specific pre-made types.
  // const syms = getGameLibraryHeaders(game, true);
  return [
    //...syms,
    code,
  ].join("\n");
}

/**
 * Creates C pre-processor defines for parameters.
 */
export function makeParameterSymbolDefines(
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
            `#define ${parameter.name} ${parameterValue ? 1 : 0}`,
          );
          break;

        case EventParameterType.Number:
        case EventParameterType.PositiveNumber:
          if (typeof parameterValue === "number") {
            parameterSymbols.push(
              `#define ${parameter.name} ${parameterValue}`,
            );
          } else {
            parameterSymbols.push(`#define ${parameter.name} 0`);
          }
          break;

        case EventParameterType.NumberArray:
          break; // TODO: Maybe expose labels for these?

        case EventParameterType.Space:
          if (info.testCompile) {
            parameterSymbols.push(`#define ${parameter.name} 0`);
            parameterSymbols.push(`#define ${parameter.name}_chain_index 0`);
            parameterSymbols.push(
              `#define ${parameter.name}_chain_space_index 0`,
            );
          } else {
            parameterSymbols.push(
              `#define ${parameter.name} ${parameterValue}`,
            );
            if (info.chains) {
              const indices = getChainIndexValuesFromAbsoluteIndex(
                info.chains,
                parameterValue as number,
              );
              parameterSymbols.push(
                `#define ${parameter.name}_chain_index ${indices[0]}`,
              );
              parameterSymbols.push(
                `#define ${parameter.name}_chain_space_index ${indices[1]}`,
              );
            }
          }
          break;

        case EventParameterType.SpaceArray:
          if (info.testCompile) {
            parameterSymbols.push(`#define ${parameter.name} 0`);
            parameterSymbols.push(`#define ${parameter.name}_length 1`);
            parameterSymbols.push(`#define ${parameter.name}_chain_indices 0`);
            parameterSymbols.push(
              `#define ${parameter.name}_chain_space_indices 0`,
            );
          } else {
            const spaceArr = (parameterValue as number[]) || [];
            parameterSymbols.push(
              `#define ${parameter.name} ${spaceArr.join(",")}`,
            );
            parameterSymbols.push(
              `#define ${parameter.name}_length ${spaceArr.length}`,
            );

            const allIndices = spaceArr.map((s) =>
              getChainIndexValuesFromAbsoluteIndex(info.chains, s),
            );
            const chainIndices = allIndices.map((x) => x[0]);
            const chainSpaceIndices = allIndices.map((x) => x[1]);
            parameterSymbols.push(
              `#define ${parameter.name}_chain_indices ${chainIndices.join(
                ",",
              )}`,
            );
            parameterSymbols.push(
              `#define ${
                parameter.name
              }_chain_space_indices ${chainSpaceIndices.join(",")}`,
            );
          }
          break;

        default:
          if (
            typeof parameterValue !== "undefined" &&
            parameterValue !== null
          ) {
            parameterSymbols.push(
              `#define ${parameter.name} ${parameterValue}`,
            );
          }
          break;
      }
    });
  }
  return parameterSymbols;
}
