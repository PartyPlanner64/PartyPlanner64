import { intersection } from "../../../../packages/lib/utils/arrays";
import {
  getSymbols as getSymbolsForGame,
  ISymbol,
} from "../../../../packages/lib/symbols/symbols";
import { registerHelper, Pos } from "codemirror";
import { Game } from "../../../../packages/lib/types";
import { getActiveEditorSupportedGames } from "../../views/createevent_shared";
import "codemirror/addon/hint/show-hint";
import "./mp-mips-codemirror";

// CodeMirror autocompletion for MIPS / Mario Party assembly.
registerHelper("hint", "mips-pp64", function (cm: any) {
  const cur = cm.getCursor();
  const token = cm.getTokenAt(cur);
  const tokenString = token.string;
  const start = token.start;
  const end = cur.ch;
  const line = cm.getLine(cur.line);
  // console.log(cur, token, start, end, line);

  if (line[0] === ".") {
    const directives = [
      "ascii",
      "asciiz",
      "align",
      "byte",
      "definelabel",
      "else",
      "elseif",
      "endif",
      "fill",
      "float",
      "halfword",
      "if",
      // "org", would break events
      // "orga", would break events
      "skip",
      "word",
    ];
    return {
      list: directives,
      from: Pos(cur.line, 1),
      to: Pos(cur.line, end),
    };
  }

  const supportedGames = getActiveEditorSupportedGames();

  function getSymbols(games: Game[], type?: any) {
    if (!games.length) return [];
    if (games.length === 1) return getSymbolsForGame(games[0], type);

    // Take the intersection of the supported games' symbols.
    let result = getSymbolsForGame(games[0], type);
    for (let i = 0; i < games.length - 1; i++) {
      const nextSymbols = getSymbolsForGame(games[i + 1], type);
      result = intersection(result, nextSymbols, (a, b) => {
        return a.name === b.name;
      });
    }
    return result;
  }

  const directJumps = /^(j|jal)\s+/i;
  if (directJumps.test(line)) {
    const syms = getSymbols(supportedGames, "code");
    return _showSyms(syms);
  }

  const beyondOpcode = /^\w+\s+/;
  if (beyondOpcode.test(line)) {
    const syms = getSymbols(supportedGames);
    return _showSyms(syms);
  }

  function _showSyms(symbols: ISymbol[]) {
    let syms = symbols.map((sym) => {
      return sym.name;
    });
    let startOffset = 1; // Default: place sym one space after any previous value.
    if (tokenString.trim()) {
      // We should partial match.
      startOffset = tokenString.lastIndexOf("(") + 1; // From the last start of a function
      const postFnStr = tokenString.substring(startOffset);
      if (postFnStr) {
        syms = _filterByToken(tokenString, syms);
      }
    }
    return {
      list: syms.sort(),
      from: Pos(cur.line, start + startOffset),
      to: Pos(cur.line, end),
    };
  }

  function _filterByToken(tokenString: string, values: string[]) {
    return values.filter((value) => {
      return value.startsWith(tokenString);
    });
  }
});
