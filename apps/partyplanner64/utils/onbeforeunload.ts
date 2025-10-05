import { getCustomEvents } from "../../../packages/lib/events/events";
import { getBoards } from "../boards";

/**
 * Saves off data when the user is about to close the window.
 * If the saving fails (common, size limitations) then prompt.
 */
window.addEventListener("beforeunload", function (event) {
  let failed = false;
  if (window.localStorage) {
    // Save off the current events (first, since they're very small)
    const events = getCustomEvents();
    try {
      localStorage.setItem("events", JSON.stringify(events));
    } catch (e) {
      failed = true;
    }

    // Save off the current boards.
    const boards = getBoards();
    try {
      localStorage.setItem("boards", JSON.stringify(boards));
    } catch (e) {
      // Browsers don't really let you save much...
      failed = true;
    }
  } else {
    failed = true;
  }

  if (failed) {
    const msg =
      "Cannot save all your boards. Return to the editor and export them?";
    event.returnValue = msg;
    return msg;
  }
});
