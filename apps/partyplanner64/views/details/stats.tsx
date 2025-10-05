import React, { useMemo } from "react";
import { useCurrentBoard } from "../../hooks";
import { Space } from "../../../../packages/lib/types";
import { ToolbarImages } from "../../images";
import { IBoard } from "../../../../packages/lib/boards";

const {
  blueImage,
  blue3Image,
  redImage,
  red3Image,
  happeningImage,
  happening3Image,
  chanceImage,
  chance2Image,
  chance3Image,
  bowserImage,
  bowser3Image,
  minigameImage,
  shroomImage,
  otherImage,
  starImage,
  blackstarImage,
  arrowImage,
  startImage,
  itemImage,
  item3Image,
  battleImage,
  battle3Image,
  bankImage,
  bank3Image,
  gameguyImage,
  // banksubtypeImage,
  // banksubtype2Image,
  // bankcoinsubtypeImage,
  // itemshopsubtypeImage,
  // itemshopsubtype2Image,
  // toadImage,
  // mstarImage,
  // booImage,
  // bowsercharacterImage,
  // koopaImage,
} = ToolbarImages;

type SpaceCountMap = Map<Space, number>;

export const DetailsBoardStats: React.FC = () => {
  const board = useCurrentBoard();
  const spaceCounts = useMemo(() => getSpaceTypeCounts(board), [board]);

  let gameStats;
  switch (board.game) {
    case 1:
      gameStats = <DetailsMP1BoardStats counts={spaceCounts} />;
      break;
    case 2:
      gameStats = <DetailsMP2BoardStats counts={spaceCounts} />;
      break;
    case 3:
      gameStats = <DetailsMP3BoardStats counts={spaceCounts} />;
      break;
  }

  return (
    <div className="boardStatsContainer">
      <table>{gameStats}</table>
    </div>
  );
};

const DetailsMP1BoardStats: React.FC<{ counts: SpaceCountMap }> = ({
  counts,
}) => {
  return (
    <tbody>
      <tr>
        <DetailsStatsSpaceImageCell src={blueImage} alt="Blue space" />
        <DetailsStatsSpaceImageCell src={redImage} alt="Red space" />
        <DetailsStatsSpaceImageCell
          src={happeningImage}
          alt="Happening space"
        />
        <DetailsStatsSpaceImageCell src={chanceImage} alt="Chance space" />
        <DetailsStatsSpaceImageCell src={minigameImage} alt="Mini-Game space" />
        <DetailsStatsSpaceImageCell src={shroomImage} alt="Mushroom space" />
        <DetailsStatsSpaceImageCell src={bowserImage} alt="Bowser space" />
        <DetailsStatsSpaceImageCell src={starImage} alt="Star space" />
        <DetailsStatsSpaceImageCell src={startImage} alt="Start space" />
        <DetailsStatsSpaceImageCell src={otherImage} alt="Invisible space" />
        <DetailsStatsTextCell text="Solid" />
        <DetailsStatsTextCell text="Total" />
      </tr>
      <tr>
        <DetailsStatsSpaceCountCell count={count(counts, Space.BLUE)} />
        <DetailsStatsSpaceCountCell count={count(counts, Space.RED)} />
        <DetailsStatsSpaceCountCell count={count(counts, Space.HAPPENING)} />
        <DetailsStatsSpaceCountCell count={count(counts, Space.CHANCE)} />
        <DetailsStatsSpaceCountCell count={count(counts, Space.MINIGAME)} />
        <DetailsStatsSpaceCountCell count={count(counts, Space.SHROOM)} />
        <DetailsStatsSpaceCountCell count={count(counts, Space.BOWSER)} />
        <DetailsStatsSpaceCountCell count={count(counts, Space.STAR)} />
        <DetailsStatsSpaceCountCell count={count(counts, Space.START)} />
        <DetailsStatsSpaceCountCell count={count(counts, Space.OTHER)} />
        <DetailsStatsSpaceCountCell
          count={count(
            counts,
            Space.BLUE,
            Space.RED,
            Space.HAPPENING,
            Space.CHANCE,
            Space.MINIGAME,
            Space.SHROOM,
            Space.BOWSER,
          )}
        />
        <DetailsStatsSpaceCountCell count={count(counts)} />
      </tr>
    </tbody>
  );
};

const DetailsMP2BoardStats: React.FC<{ counts: SpaceCountMap }> = ({
  counts,
}) => {
  return (
    <tbody>
      <tr>
        <DetailsStatsSpaceImageCell src={blueImage} alt="Blue space" />
        <DetailsStatsSpaceImageCell src={redImage} alt="Red space" />
        <DetailsStatsSpaceImageCell
          src={happeningImage}
          alt="Happening space"
        />
        <DetailsStatsSpaceImageCell src={chance2Image} alt="Chance space" />
        <DetailsStatsSpaceImageCell src={itemImage} alt="Item space" />
        <DetailsStatsSpaceImageCell src={battleImage} alt="Battle space" />
        <DetailsStatsSpaceImageCell src={bankImage} alt="Bank space" />
        <DetailsStatsSpaceImageCell src={bowserImage} alt="Bowser space" />
        <DetailsStatsSpaceImageCell src={starImage} alt="Star space" />
        <DetailsStatsSpaceImageCell
          src={blackstarImage}
          alt="Black Star space"
        />
        <DetailsStatsSpaceImageCell src={arrowImage} alt="Arrow space" />
        <DetailsStatsSpaceImageCell src={startImage} alt="Start space" />
        <DetailsStatsSpaceImageCell src={otherImage} alt="Invisible space" />
        <DetailsStatsTextCell text="Solid" />
        <DetailsStatsTextCell text="Total" />
      </tr>
      <tr>
        <DetailsStatsSpaceCountCell count={count(counts, Space.BLUE)} />
        <DetailsStatsSpaceCountCell count={count(counts, Space.RED)} />
        <DetailsStatsSpaceCountCell count={count(counts, Space.HAPPENING)} />
        <DetailsStatsSpaceCountCell count={count(counts, Space.CHANCE)} />
        <DetailsStatsSpaceCountCell count={count(counts, Space.ITEM)} />
        <DetailsStatsSpaceCountCell count={count(counts, Space.BATTLE)} />
        <DetailsStatsSpaceCountCell count={count(counts, Space.BANK)} />
        <DetailsStatsSpaceCountCell count={count(counts, Space.BOWSER)} />
        <DetailsStatsSpaceCountCell count={count(counts, Space.STAR)} />
        <DetailsStatsSpaceCountCell count={count(counts, Space.BLACKSTAR)} />
        <DetailsStatsSpaceCountCell count={count(counts, Space.ARROW)} />
        <DetailsStatsSpaceCountCell count={count(counts, Space.START)} />
        <DetailsStatsSpaceCountCell count={count(counts, Space.OTHER)} />
        <DetailsStatsSpaceCountCell
          count={count(
            counts,
            Space.BLUE,
            Space.RED,
            Space.HAPPENING,
            Space.CHANCE,
            Space.ITEM,
            Space.BATTLE,
            Space.BANK,
            Space.BOWSER,
          )}
        />
        <DetailsStatsSpaceCountCell count={count(counts)} />
      </tr>
    </tbody>
  );
};

const DetailsMP3BoardStats: React.FC<{ counts: SpaceCountMap }> = ({
  counts,
}) => {
  return (
    <tbody>
      <tr>
        <DetailsStatsSpaceImageCell src={blue3Image} alt="Blue space" />
        <DetailsStatsSpaceImageCell src={red3Image} alt="Red space" />
        <DetailsStatsSpaceImageCell
          src={happening3Image}
          alt="Happening space"
        />
        <DetailsStatsSpaceImageCell src={chance3Image} alt="Chance space" />
        <DetailsStatsSpaceImageCell src={item3Image} alt="Item space" />
        <DetailsStatsSpaceImageCell src={battle3Image} alt="Battle space" />
        <DetailsStatsSpaceImageCell src={bank3Image} alt="Bank space" />
        <DetailsStatsSpaceImageCell src={gameguyImage} alt="Game Guy space" />
        <DetailsStatsSpaceImageCell src={bowser3Image} alt="Bowser space" />
        <DetailsStatsSpaceImageCell src={starImage} alt="Star space" />
        <DetailsStatsSpaceImageCell src={arrowImage} alt="Arrow space" />
        <DetailsStatsSpaceImageCell src={startImage} alt="Start space" />
        <DetailsStatsSpaceImageCell src={otherImage} alt="Invisible space" />
        <DetailsStatsTextCell text="Solid" />
        <DetailsStatsTextCell text="Total" />
      </tr>
      <tr>
        <DetailsStatsSpaceCountCell count={count(counts, Space.BLUE)} />
        <DetailsStatsSpaceCountCell count={count(counts, Space.RED)} />
        <DetailsStatsSpaceCountCell count={count(counts, Space.HAPPENING)} />
        <DetailsStatsSpaceCountCell count={count(counts, Space.CHANCE)} />
        <DetailsStatsSpaceCountCell count={count(counts, Space.ITEM)} />
        <DetailsStatsSpaceCountCell count={count(counts, Space.BATTLE)} />
        <DetailsStatsSpaceCountCell count={count(counts, Space.BANK)} />
        <DetailsStatsSpaceCountCell count={count(counts, Space.GAMEGUY)} />
        <DetailsStatsSpaceCountCell count={count(counts, Space.BOWSER)} />
        <DetailsStatsSpaceCountCell count={count(counts, Space.STAR)} />
        <DetailsStatsSpaceCountCell count={count(counts, Space.ARROW)} />
        <DetailsStatsSpaceCountCell count={count(counts, Space.START)} />
        <DetailsStatsSpaceCountCell count={count(counts, Space.OTHER)} />
        <DetailsStatsSpaceCountCell
          count={count(
            counts,
            Space.BLUE,
            Space.RED,
            Space.HAPPENING,
            Space.CHANCE,
            Space.ITEM,
            Space.BATTLE,
            Space.BANK,
            Space.GAMEGUY,
            Space.BOWSER,
          )}
        />
        <DetailsStatsSpaceCountCell count={count(counts)} />
      </tr>
    </tbody>
  );
};

const DetailsStatsSpaceImageCell: React.FC<{ src: string; alt: string }> = ({
  src,
  alt,
}) => {
  return (
    <td className="boardStatsImageCell">
      <img src={src} alt={alt} className="boardStatsSpaceImage" />
    </td>
  );
};

const DetailsStatsSpaceCountCell: React.FC<{ count: number | undefined }> = ({
  count,
}) => {
  return <td className="boardStatsCountCell">{count || 0}</td>;
};

const DetailsStatsTextCell: React.FC<{ text: string }> = ({ text }) => {
  return <td className="boardStatsTextCell">{text}</td>;
};

function getSpaceTypeCounts(board: IBoard): SpaceCountMap {
  const map = new Map<Space, number>();
  for (const space of board.spaces) {
    if (!map.has(space.type)) {
      map.set(space.type, 1);
    } else {
      map.set(space.type, map.get(space.type)! + 1);
    }
  }
  return map;
}

function count(counts: SpaceCountMap, ...spaceTypes: Space[]): number {
  let count = 0;

  // Get total if no types are passed.
  if (spaceTypes.length === 0) {
    counts.forEach((c) => {
      count += c;
    });
  } else {
    for (const type of spaceTypes) {
      count += counts.get(type) || 0;
    }
  }

  return count;
}
