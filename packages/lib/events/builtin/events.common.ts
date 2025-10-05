import { IEventWriteInfo, IEventParseInfo, IEvent } from "../events";
import {
  EventExecutionType,
  Game,
  EventParameterType,
  EditorEventActivationType,
} from "../../types";

import "./ChainMergeEvent";

import { StarEvent1 } from "./MP1/U/StarEvent1";
import { BooEvent1 } from "./MP1/U/BooEvent1";
import { GateClose3 } from "./MP3/U/GateCloseEvent3";
import { Gate3 } from "./MP3/U/GateEvent3";
import { BooEvent2 } from "./MP2/U/BooEvent2";
import { BooEvent3 } from "./MP3/U/BooEvent3";
import { StarEvent2 } from "./MP2/U/StarEvent2";
import { StarEvent3 } from "./MP3/U/StarEvent3";
import { BankEvent2 } from "./MP2/U/BankEvent2";
import { BankEvent3 } from "./MP3/U/BankEvent3";
import { ItemShopEvent2 } from "./MP2/U/ItemShopEvent2";
import { ItemShopEvent3 } from "./MP3/U/ItemShopEvent3";
import { addEventToLibrary } from "../EventLibrary";
import { IEventInstance } from "../../boards";

export const BooEvent: IEvent = {
  id: "BOO",
  name: "Visit Boo",
  activationType: EditorEventActivationType.WALKOVER,
  executionType: EventExecutionType.DIRECT,
  supportedGames: [Game.MP1_USA, Game.MP2_USA, Game.MP3_USA],
  parse(dataView: DataView, info: IEventParseInfo) {
    switch (info.gameVersion) {
      case 1:
        return BooEvent1.parse!(dataView, info);
      case 2:
        return BooEvent2.parse!(dataView, info);
      case 3:
        return BooEvent3.parse!(dataView, info);
    }
  },
  write(
    dataView: DataView,
    event: IEventInstance,
    info: IEventWriteInfo,
    temp: any,
  ) {
    switch (info.gameVersion) {
      case 1:
        return BooEvent1.write!(dataView, event, info, temp);
      case 2:
        return BooEvent2.write!(dataView, event, info, temp);
      case 3:
        return BooEvent3.write!(dataView, event, info, temp);
    }
  },
};
addEventToLibrary(BooEvent);

export const StarEvent: IEvent = {
  id: "STAR",
  name: "Buy star",
  activationType: EditorEventActivationType.WALKOVER,
  executionType: EventExecutionType.DIRECT,
  fakeEvent: true,
  supportedGames: [Game.MP1_USA, Game.MP2_USA, Game.MP3_USA],
  parse(dataView: DataView, info: IEventParseInfo) {
    switch (info.gameVersion) {
      case 1:
        return StarEvent1.parse!(dataView, info);
      case 2:
        return StarEvent2.parse!(dataView, info);
    }
    return false;
  },
  write(
    dataView: DataView,
    event: IEventInstance,
    info: IEventWriteInfo,
    temp: any,
  ) {
    switch (info.gameVersion) {
      case 1:
        return StarEvent1.write!(dataView, event, info, temp);
      case 2:
        return StarEvent2.write!(dataView, event, info, temp);
      case 3:
        return StarEvent3.write!(dataView, event, info, temp);
    }
    return false;
  },
};
addEventToLibrary(StarEvent);

export const BankEvent: IEvent = {
  id: "BANK",
  name: "Visit Bank",
  activationType: EditorEventActivationType.WALKOVER,
  executionType: EventExecutionType.DIRECT,
  supportedGames: [Game.MP2_USA, Game.MP3_USA],
  parse(dataView: DataView, info: IEventParseInfo) {
    switch (info.gameVersion) {
      case 1:
        return false;
      case 2:
        return BankEvent2.parse!(dataView, info);
      case 3:
        return BankEvent3.parse!(dataView, info);
    }
    return false;
  },
  write(
    dataView: DataView,
    event: IEventInstance,
    info: IEventWriteInfo,
    temp: any,
  ) {
    switch (info.gameVersion) {
      case 1:
        return false;
      case 2:
        return BankEvent2.write!(dataView, event, info, temp);
      case 3:
        return BankEvent3.write!(dataView, event, info, temp);
    }
    return false;
  },
};
addEventToLibrary(BankEvent);

export const ItemShopEvent: IEvent = {
  id: "ITEMSHOP",
  name: "Visit Item Shop",
  activationType: EditorEventActivationType.WALKOVER,
  executionType: EventExecutionType.DIRECT,
  supportedGames: [Game.MP2_USA, Game.MP3_USA],
  parse(dataView: DataView, info: IEventParseInfo) {
    switch (info.gameVersion) {
      case 1:
        return false;
      case 2:
        return ItemShopEvent2.parse!(dataView, info);
      case 3:
        return ItemShopEvent3.parse!(dataView, info);
    }
    return false;
  },
  write(
    dataView: DataView,
    event: IEventInstance,
    info: IEventWriteInfo,
    temp: any,
  ) {
    switch (info.gameVersion) {
      case 1:
        return false;
      case 2:
        return ItemShopEvent2.write!(dataView, event, info, temp);
      case 3:
        return ItemShopEvent3.write!(dataView, event, info, temp);
    }
    return false;
  },
};
addEventToLibrary(ItemShopEvent);

export const Gate: IEvent = {
  id: "GATE",
  name: "Skeleton Key Gate",
  activationType: EditorEventActivationType.WALKOVER,
  executionType: EventExecutionType.PROCESS,
  fakeEvent: true,
  supportedGames: [
    //Game.MP2_USA,
    Game.MP3_USA,
  ],
  parse(dataView: DataView, info: IEventParseInfo) {
    switch (info.gameVersion) {
      case 1:
        return false;
      case 2:
        return false;
      case 3:
        return Gate3.parse!(dataView, info);
    }
    return false;
  },
  write(
    dataView: DataView,
    event: IEventInstance,
    info: IEventWriteInfo,
    temp: any,
  ) {
    switch (info.gameVersion) {
      case 1:
        return false;
      case 2:
        return false;
      case 3:
        return Gate3.write!(dataView, event, info, temp);
    }
    return false;
  },
};
addEventToLibrary(Gate);

// Event that actually occurs on the gate space itself to cause it to close.
export const GateClose: IEvent = {
  id: "GATECLOSE",
  name: "Skeleton Key Gate Close",
  activationType: EditorEventActivationType.WALKOVER,
  executionType: EventExecutionType.DIRECT,
  parameters: [{ name: "gateIndex", type: EventParameterType.Number }],
  fakeEvent: true,
  supportedGames: [
    //Game.MP2_USA,
    Game.MP3_USA,
  ],
  parse(dataView: DataView, info: IEventParseInfo) {
    switch (info.gameVersion) {
      case 1:
        return false;
      case 2:
        return false;
      case 3:
        return GateClose3.parse!(dataView, info);
    }
    return false;
  },
  write(
    dataView: DataView,
    event: IEventInstance,
    info: IEventWriteInfo,
    temp: any,
  ) {
    switch (info.gameVersion) {
      case 1:
        return false;
      case 2:
        return false;
      case 3:
        return GateClose3.write!(dataView, event, info, temp);
    }
    return false;
  },
};
addEventToLibrary(GateClose);
