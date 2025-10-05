// CodeMirror syntax highlighting for MIPS + PP64 enhancements.

// Derived originally from https://github.com/naphipps/brackets-mips-syntax-highlighter

import { defineMode, StringStream } from "codemirror";

interface IModeState {
  blockComment: boolean;
}

defineMode("mips-pp64", function () {
  const directives =
    /\.(ascii|asciiz|align|beginstatic|byte|definelabel|else|elseif|endif|endstatic|fill|float|halfword|if|skip|word)\b/i;
  const regs =
    /\$?(a([0-3]|t)|f([0-9][1-9]?|p)|g(p)|k([0-1])|r(0|a)|s([0-8]|p)|t(\d)|v([0-1])|zero)\b/i;
  //const opcodes = /\b(a(bs|ddiu|ddi|ddu|dd|ndi|nd)|b(czt|czf|eqz|eq|gezal|gez|geu|ge|gtu|gtz|gt|leu|lez|le|ltu|lt|nez|ltzal|ltz|ne|qez|)|c(lo|lz)|d(ivu|iv)|e(ret)|j(alr|al|r|)|l(a|bu|b|d|hu|h|i|ui|wcl|wl|wr|w)|m(addu|add|fc0|flo|fhi|ove|sub|ulou|ulo|ult|ul|tc0)|n(egu|eg|omove|op|or|ot)|o(ri|r)|r(emu|em|ol|or)|s(b|c|dcl|d|eq|geu|ge|gtu|gt|h|leu|le|ne|llv|ll|ltiu|lti|ltu|lt|rav|ra|rlv|rl|ubu|ub|wcl|wr|wl|w|yscall)|t(eqi|eq|geu|geiu|gei|ge|ltu|ltiu|lti|lt)|u(lhu|lh|lw|sc|sh|sw)|x(ori|or))\b/i;
  const opcodes =
    /\b(abs\.s|abs\.d|add|add\.s|add\.d|addi|addiu|addu|and|andi|bc1f|bc1fl|bc1t|bc1tl|beq|beql|beqz|bgez|bgezal|bgezall|bgezl|bgtz|bgtzl|blez|blezl|bltz|bltzal|bltzall|bltzl|bne|bnel|bnez|bnezl|break|c\.f\.s|c\.un\.s|c\.eq\.s|c\.ueq\.s|c\.olt\.s|c\.ult\.s|c\.ole\.s|c\.ule\.s|c\.sf\.s|c\.ngle\.s|c\.seq\.s|c\.ngl\.s|c\.lt\.s|c\.nge\.s|c\.le\.s|c\.ngt\.s|c\.f\.d|c\.un\.d|c\.eq\.d|c\.ueq\.d|c\.olt\.d|c\.ult\.d|c\.ole\.d|c\.ule\.d|c\.sf\.d|c\.ngle\.d|c\.seq\.d|c\.ngl\.d|c\.lt\.d|c\.nge\.d|c\.le\.d|c\.ngt\.d|ceil\.l\.s|ceil\.l\.d|ceil\.w\.s|ceil\.w\.d|cfc1|ctc1|cop0|cop1|cop2|cop3|cvt\.d\.s|cvt\.d\.w|cvt\.d\.l|cvt\.l\.d|cvt\.l\.d|cvt\.s\.d|cvt\.s\.w|cvt\.s\.l|cvt\.w\.s|cvt\.w\.d|dadd|daddi|daddiu|daddu|ddiv|ddivu|div|div\.s|div\.d|divu|dmfc1|dmult|dmultu|dmtc1|dsll|dsll32|dsllv|dsra|dsra32|dsrav|dsrl|dsrl32|dsrlv|dsub|dsubu|floor\.l\.s|floor\.l\.d|floor\.w\.s|floor\.w\.d|j|jal|jalr|jr|lb|lbu|ld|ldc1|ldc2|ldl|ldr|lh|lhu|li|ll|lld|lui|lw|lwc1|lwc2|lwc3|lwl|lwr|lwu|madd\.s|madd\.d|mfc1|mfhi|mflo|mov\.s|mov\.d|move|movt|msub\.s|msub\.d|mtc1|mthi|mtlo|mul\.s|mul\.d|mult|multu|neg\.s|neg\.d|nop|nor|or|ori|round\.l\.s|round\.l\.d|round\.w\.s|round\.w\.d|sb|sc|scd|sd|sdc1|sdc2|sdl|sdr|sh|sll|sllv|slt|slti|sltiu|sltu|sqrt\.s|sqrt\.d|sra|srav|srl|srlv|sub|sub\.s|sub\.d|subu|sw|swc1|swc2|swc3|swl|swr|sync|syscall|teq|teqi|tge|tgei|tgeiu|tgeu|tlt|tlti|tltiu|tltu|tne|tnei|trunc\.l\.s|trunc\.l\.d|trunc\.w\.s|trunc\.w\.d|xor|xori)\b/i;
  const numbers = /\b(0x[\da-f]+|o[0-7]+|b[0-1]+|\d+)\b/i;

  return {
    startState: function (): IModeState {
      return {
        blockComment: false,
      };
    },

    token: function (stream: StringStream, state: IModeState) {
      if (stream.eatSpace()) {
        return null;
      }

      let thisItem;

      // Block comments
      if (state.blockComment || stream.match("/*")) {
        state.blockComment = true;

        let mayBeMatch = false;
        while ((thisItem = stream.next())) {
          // eslint-disable-line no-cond-assign
          if (thisItem === "/" && mayBeMatch) {
            state.blockComment = false;
            break;
          } else {
            mayBeMatch = thisItem === "*";
          }
        }
        return "comment";
      }

      // Line comments
      if (stream.eat(";") || stream.match("//")) {
        stream.skipToEnd();
        return "comment";
      }

      if (stream.eat('"')) {
        while ((thisItem = stream.next())) {
          // eslint-disable-line no-cond-assign
          if (thisItem === '"') {
            break;
          }
        }
        return "string";
      }
      if (stream.eat(".")) {
        if (stream.eatWhile(/\w/)) {
          thisItem = stream.current();
          if (directives.test(thisItem)) {
            return "def";
          }
          return null;
        }
      } else if (stream.eatWhile(/[$\w.]/)) {
        thisItem = stream.current();

        if (opcodes.test(thisItem)) {
          let tokenType = "keyword";
          if (thisItem.toLowerCase() === "nop") tokenType += " nop";
          return tokenType;
        }
        if (regs.test(thisItem)) {
          return "atom";
        }
        if (numbers.test(thisItem)) {
          return "number";
        }
      }

      stream.next();
      return null;
    },
  };
});
