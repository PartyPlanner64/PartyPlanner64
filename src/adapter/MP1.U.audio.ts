const audioMap0 = [
  "", // "Two Beeps",
  "", // "Two Beeps",
  "Peaceful Mushroom Village",
  "Traveling the Warp Pipe",
  "Mushroom Bank",
  "Option House Theme",
  "Mushroom Shop Theme",
  "Mini-Game House Theme",
  "DK's Jungle Adventure Theme",
  "Peach's Birthday Cake Theme",
  "Yoshi's Tropical Island Theme",
  "Wario's Battle Canyon Theme",
  "Luigi's Engine Room Theme",
  "Mario's Rainbow Castle Theme",
  "Magma Mountain Theme",
  "Eternal Star Theme",
  "Outcome of Adventure", // 0x10
  "Adventure Begins",
  "Bowser Meeting",
  "Last 5 Turns",
  "", // "Two Beeps",
  "Play A Mini-Game",
  "Results",
  "", // "Mario's Bandstand Theme",
  "Move to the Mambo",
  "Wide, Wide Ocean",
  "Mushroom Forest",
  "Ducking and Dodging",
  "Full of Danger",
  "Coins of the World",
  "Taking Coins",
  "The Room Underground",
  "Slowly, Slowly", // 0x20
  "Dodging Danger",
  "Let's Limbo!",
  "Let's Go Lightly",
  "Chance Time",
  "Can It Be Done",
  "Faster Than All",
  "Saving Courage",
  "", // "Two Beeps",
  "", // "Two Beeps",
  "Playing the Game",
  "Where Have The Stars Gone?",
  "", // "Two Beeps",
  "", // "Mario Bandstand",
  "", // "Mario Bandstand",
  "The Stolen Star",
  "Bowser's Chance Game", // 0x30
  "Mini-Game Stadium",
  "", // "Mini-Game Finished",
  "", // "Mini-Game Finished",
  "", // "Mini-Game Abysmal Finish",
  "", // "Mini-Game Finish?",
  "", // "Mini-Game Finish",
  "", // "Mini-Game Finish",
  "", // "Strange finish",
  "", // "Board Map Fan-fare",
  "", // "Board Map Overview",
  "", // "Selecting star person?",
  "", // "Selecting some person?",
  "", // "Fanfare of some sort",
  "", // "Two Beeps",
  "", // "Following star get fan-fare",
  "After the Victory", // 0x40
  "Mini-Game Island",
  "Mini-Game Island",
  "Mini-Game Island",
  "Mini-Game Island",
  "Mini-Game Island",
  "Mini-Game Island (Bowser)",
  "Mini-Game Island",
  "Mini-Game Island (Aquatic)",
  "", // "Two Beeps",
  "", // "Two Beeps",
  "", // "Two Beeps",
  "", // "Two Beeps",
  "", // "Two Beeps",
  "", // "Two Beeps",
  "", // "Two Beeps",
  "", // "Two Beeps", // 0x50
];

const audioMap1 = [
  "", // "Two Beeps",
  "Mario Party Theme",
  "Power of the Stars",
  "After the Victory",
  "", // Creepy wobbly sounds
  "Everyone's a Superstar! (Credits)",
  "Opening",
];

export function getAudioMapMP1(table: number) {
  switch (table) {
    case 1:
      return audioMap1;
    default:
      return audioMap0;
  }
}
