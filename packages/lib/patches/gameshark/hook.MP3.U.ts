import { HookBase } from "./HookBase";
import { parse } from "mips-inst";
import { getCheatRoutineBuffer } from "./cheats";
import { romhandler } from "../../romhandler";

// Installs a Gameshark hook for MP3 (U)
export const MP3UHook = new (class MP3UHook extends HookBase {
  // File to store the cheat routine.
  protected MAINFS_CHEAT_FILE = [0, 149];

  // Location safe to write a small set of hooking code
  protected HOOK_ROM_START_OFFSET = 0xa7830;
  protected HOOK_RAM_START_OFFSET = 0xa6c30;

  // Use controller routine 0x80078E98 (ROM 0x79A98) to reach the hook
  protected HOOK_JUMP_ROM_OFFSET = 0x79a98;

  // Value initially in the spot we cache the hook routine.
  protected HOOK_CACHE_DEFAULT_VALUE = 0x76657221;

  apply(romBuffer: ArrayBuffer) {
    const romView = new DataView(romBuffer);

    this.applyHook(romView);
    this.writeHookCode(romView);
  }

  applyHook(romView: DataView) {
    // Jump out from the controller routine to a small fixed position hook.
    // This hook will read the cheat buffer (if not already read) and jump to it.

    const hookJ = parse(`J ${this.HOOK_RAM_START_OFFSET + 4}`);

    // Remember the stack adjustment, and NOP it out here.
    const endInsts = [
      romView.getUint32(this.HOOK_JUMP_ROM_OFFSET),
      romView.getUint32(this.HOOK_JUMP_ROM_OFFSET + 4),
      romView.getUint32(this.HOOK_JUMP_ROM_OFFSET + 8),
    ];
    romView.setUint32(this.HOOK_JUMP_ROM_OFFSET, hookJ);
    romView.setUint32(this.HOOK_JUMP_ROM_OFFSET + 4, 0);
    romView.setUint32(this.HOOK_JUMP_ROM_OFFSET + 8, 0);

    const cheatRoutine = getCheatRoutineBuffer({ endInsts });
    const mainfs = romhandler.getRom()?.getMainFS()!;
    mainfs.write(
      this.MAINFS_CHEAT_FILE[0],
      this.MAINFS_CHEAT_FILE[1],
      cheatRoutine,
    );
  }
})();
