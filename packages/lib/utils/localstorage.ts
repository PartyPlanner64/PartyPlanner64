import { IBoard } from "../boards";
import { IEvent } from "../events/events";

/** Get boards that were saved the last time the browser window closed. */
export function getSavedBoards(): IBoard[] | null {
  let boards: string | IBoard[] | null =
    window.localStorage && localStorage.getItem("boards");
  if (boards) {
    boards = JSON.parse(boards);
  }
  if (!boards || !boards.length) {
    return null;
  }
  return boards as IBoard[];
}

/** Get events that were saved the last time the browser window closed. */
export function getSavedEvents(): IEvent[] | null {
  let events: string | IEvent[] | null =
    window.localStorage && localStorage.getItem("events");
  if (events) {
    events = JSON.parse(events);
  }
  if (!events || !events.length) {
    return null;
  }
  return events as IEvent[];
}
