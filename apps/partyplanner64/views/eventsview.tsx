import { View, EventCodeLanguage } from "../../../packages/lib/types";
import * as React from "react";
import { IEvent } from "../../../packages/lib/events/events";
import {
  ICustomEvent,
  createCustomEvent,
} from "../../../packages/lib/events/customevents";
import { changeCurrentEvent, changeView, confirmFromUser } from "../appControl";
import {
  excludeEventFromBoard,
  includeEventInBoard,
  getBoardEvent,
  getCurrentBoard,
} from "../boards";
import {
  removeEventFromLibrary,
  getEventFromLibrary,
  addEventToLibrary,
} from "../../../packages/lib/events/EventLibrary";
import { saveAs } from "file-saver";
import { stringComparer } from "../../../packages/lib/utils/string";
import { useCurrentBoard } from "../hooks";
import { useCustomEvents } from "../events/EventHooks";

import libraryImage from "../img/events/library.png";
import deleteImage from "../img/events/delete.png";
import exportImage from "../img/events/export.png";
import editImage from "../img/events/edit.png";
import nocopyoptionImage from "../img/events/nocopyoption.png";
import copytolibraryImage from "../img/events/copytolibrary.png";
import copytolibrary_destructiveImage from "../img/events/copytolibrary_destructive.png";
import copytoboardImage from "../img/events/copytoboard.png";
import copytoboard_destructiveImage from "../img/events/copytoboard_destructive.png";

import "../css/events.scss";
import { IBoard } from "../../../packages/lib/boards";

/** Custom events list view */
export function EventsView() {
  const board = useCurrentBoard();
  let customEvents = useCustomEvents();

  const onEditEvent = (eventId: string) => {
    changeCurrentEvent(eventId, false);
    const event = getEventFromLibrary(eventId)!;
    changeView(_getViewForEventLanguage(event.language));
  };

  const onEditBoardEvent = (eventId: string) => {
    changeCurrentEvent(eventId, true);
    const event = getBoardEvent(getCurrentBoard(), eventId)!;
    changeView(_getViewForEventLanguage(event.language));
  };

  const onDeleteEvent = async (event: IEvent) => {
    if (
      await confirmFromUser(`Are you sure you want to delete ${event.name}?`)
    ) {
      removeEventFromLibrary(event.id);
    }
  };

  const onDeleteBoardEvent = async (event: IEvent) => {
    if (
      await confirmFromUser(
        `Are you sure you want to delete ${event.name} from the board?`,
      )
    ) {
      excludeEventFromBoard(event.id);
    }
  };

  const onCopyToBoard = async (
    event: ICustomEvent,
    isDestructiveCopy: boolean,
  ) => {
    let proceed = true;
    if (isDestructiveCopy) {
      proceed = await confirmFromUser(
        `Are you sure you want to overwrite the board's copy of ${event.id}? The two copies are different.`,
      );
    }
    if (proceed) {
      includeEventInBoard(event);
    }
  };

  const onCopyToLibrary = async (
    event: ICustomEvent,
    isDestructiveCopy: boolean,
  ) => {
    let proceed = true;
    if (isDestructiveCopy) {
      proceed = await confirmFromUser(
        `Are you sure you want to overwrite the library's copy of ${event.id}? The two copies are different.`,
      );
    }
    if (proceed) {
      addEventToLibrary(event);
    }
  };

  let listing = null;
  if (!customEvents.length) {
    listing = (
      <tr>
        <td>No custom events present — load or create your own!</td>
      </tr>
    );
  } else {
    customEvents = customEvents.sort((a, b) => stringComparer(a.name, b.name));
    listing = customEvents.map((customEvent) => {
      const isDestructive = _copyToBoardWillOverwrite(customEvent, board);
      const isUnchanged = _boardAndLibraryEventAreInSync(customEvent, board);
      return (
        <EventRow
          key={customEvent.id}
          event={customEvent}
          onEditEvent={onEditEvent}
          onDeleteEvent={onDeleteEvent}
          isDestructiveCopy={isDestructive}
          onCopyToBoard={isUnchanged ? undefined : onCopyToBoard}
        />
      );
    });
  }

  let boardEvents = [];
  for (const eventName in board.events) {
    const boardEvent = getBoardEvent(board, eventName)!;
    const customEvent = createCustomEvent(boardEvent.language, boardEvent.code);
    const isDestructive = _copyToLibraryWillOverwrite(customEvent);
    const isUnchanged = _boardAndLibraryEventAreInSync(customEvent, board);
    boardEvents.push(
      <EventRow
        key={eventName}
        event={customEvent}
        onEditEvent={onEditBoardEvent}
        onDeleteEvent={onDeleteBoardEvent}
        isDestructiveCopy={isDestructive}
        onCopyToLibrary={isUnchanged ? undefined : onCopyToLibrary}
      />,
    );
  }
  boardEvents = boardEvents.sort((a, b) =>
    stringComparer(a.key as string, b.key as string),
  );

  return (
    <div className="eventsViewContainer">
      <h3>Events for {board.name}</h3>
      {boardEvents.length ? (
        <EventEntryTable listing={boardEvents} />
      ) : (
        <p>No events are associated with this board.</p>
      )}
      <h3>
        <img src={libraryImage} className="eventsViewHeaderIcon" alt=""></img>{" "}
        Event Library
      </h3>
      <EventEntryTable listing={listing} />
    </div>
  );
}

function _getViewForEventLanguage(
  language: EventCodeLanguage | undefined,
): View {
  switch (language) {
    case EventCodeLanguage.C:
      return View.CREATEEVENT_C;

    default:
      return View.CREATEEVENT_ASM;
  }
}

function EventEntryTable(props: { listing: any }) {
  return <div className="eventsViewTable">{props.listing}</div>;
}

function _copyToBoardWillOverwrite(
  customEvent: ICustomEvent,
  board: IBoard,
): boolean {
  if (!board.events || !(customEvent.id in board.events)) return false;
  return board.events[customEvent.id] !== customEvent.asm;
}

function _copyToLibraryWillOverwrite(customEvent: ICustomEvent): boolean {
  const libEvent = getEventFromLibrary(customEvent.id) as ICustomEvent;
  return !!libEvent && libEvent.asm !== customEvent.asm;
}

function _boardAndLibraryEventAreInSync(
  customEvent: ICustomEvent,
  board: IBoard,
): boolean {
  if (!board.events || !(customEvent.id in board.events)) return false;
  const libEvent = getEventFromLibrary(customEvent.id) as ICustomEvent;
  if (!libEvent) return false;
  return getBoardEvent(board, customEvent.id)!.code === libEvent.asm;
}

interface IEventRowProps {
  event: ICustomEvent;
  isDestructiveCopy: boolean;
  onDeleteEvent(event: ICustomEvent): any;
  onEditEvent(eventId: string): void;
  onCopyToLibrary?(event: ICustomEvent, isDestructiveCopy: boolean): void;
  onCopyToBoard?(event: ICustomEvent, isDestructiveCopy: boolean): void;
}

class EventRow extends React.Component<IEventRowProps> {
  render() {
    let copyOption;
    if (this.props.onCopyToLibrary) {
      copyOption = (
        <div className="eventTableIconCell">
          <img
            src={
              this.props.isDestructiveCopy
                ? copytolibrary_destructiveImage
                : copytolibraryImage
            }
            alt="Copy this event into the local library"
            title="Copy this event into the local library"
            onClick={() =>
              this.props.onCopyToLibrary!(
                this.props.event,
                this.props.isDestructiveCopy,
              )
            }
          />
        </div>
      );
    } else if (this.props.onCopyToBoard) {
      copyOption = (
        <div className="eventTableIconCell">
          <img
            src={
              this.props.isDestructiveCopy
                ? copytoboard_destructiveImage
                : copytoboardImage
            }
            alt="Copy this event into the board file"
            title="Copy this event into the board file"
            onClick={() =>
              this.props.onCopyToBoard!(
                this.props.event,
                this.props.isDestructiveCopy,
              )
            }
          />
        </div>
      );
    } else {
      copyOption = (
        <div className="eventTableIconCell">
          <img
            src={nocopyoptionImage}
            className="eventRowIconNoAction"
            alt="The event is the same in both the board and library"
            title="The event is the same in both the board and library"
          />
        </div>
      );
    }

    return (
      <div className="eventTableRow">
        <div className="eventTableIconCell">
          <img
            src={deleteImage}
            alt="Delete event"
            title="Delete event"
            onClick={() => {
              this.props.onDeleteEvent(this.props.event);
            }}
          />
        </div>
        <div className="eventTableIconCell">
          <img
            src={exportImage}
            alt="Download event code"
            title="Download event code"
            onClick={this.onExportEvent}
          />
        </div>
        {copyOption}
        <div
          className="eventNameTableCell"
          onClick={() => this.props.onEditEvent(this.props.event.id)}
        >
          <span className="eventNameText">
            {this.props.event.name}
            <span className="eventNameExtensionText">
              {getEventFileExtension(this.props.event)}
            </span>
          </span>
          <img
            src={editImage}
            className="eventEditCellIcon"
            alt="Edit event"
            title="Edit event"
          />
        </div>
      </div>
    );
  }

  onExportEvent = () => {
    const event = this.props.event;
    const asmBlob = new Blob([event.asm]);
    saveAs(asmBlob, getEventFileName(event));
  };
}

function getEventFileName(event: ICustomEvent): string {
  return event.id + getEventFileExtension(event);
}

function getEventFileExtension(event: ICustomEvent): string {
  switch (event.language) {
    case EventCodeLanguage.C:
      return ".c";

    case EventCodeLanguage.MIPS:
    default:
      return ".s";
  }
}
