import type { CardDef, CollectionCard } from "./types";

export const CARD_DEFS: CardDef[] = [
  { id: "t1-W-0-B3G1", rank: 1, bonus: "white", prestige: 0, cost: { blue: 3, green: 1 } },
  { id: "t1-W-0-R3K1", rank: 1, bonus: "white", prestige: 0, cost: { red: 3, black: 1 } },
  { id: "t1-W-1-B3K2", rank: 1, bonus: "white", prestige: 1, cost: { blue: 3, black: 2 } },
  { id: "t1-B-0-G3R1", rank: 1, bonus: "blue", prestige: 0, cost: { green: 3, red: 1 } },
  { id: "t1-B-0-K3W1", rank: 1, bonus: "blue", prestige: 0, cost: { black: 3, white: 1 } },
  { id: "t1-B-1-G3W2", rank: 1, bonus: "blue", prestige: 1, cost: { green: 3, white: 2 } },
  { id: "t1-G-0-R3K1", rank: 1, bonus: "green", prestige: 0, cost: { red: 3, black: 1 } },
  { id: "t1-G-0-W3B1", rank: 1, bonus: "green", prestige: 0, cost: { white: 3, blue: 1 } },
  { id: "t1-G-1-R3B2", rank: 1, bonus: "green", prestige: 1, cost: { red: 3, blue: 2 } },
  { id: "t1-R-0-K3W1", rank: 1, bonus: "red", prestige: 0, cost: { black: 3, white: 1 } },
  { id: "t1-R-0-B3G1", rank: 1, bonus: "red", prestige: 0, cost: { blue: 3, green: 1 } },
  { id: "t1-R-1-K3G2", rank: 1, bonus: "red", prestige: 1, cost: { black: 3, green: 2 } },
  { id: "t1-K-0-W3B1", rank: 1, bonus: "black", prestige: 0, cost: { white: 3, blue: 1 } },
  { id: "t1-K-0-G3R1", rank: 1, bonus: "black", prestige: 0, cost: { green: 3, red: 1 } },
  { id: "t1-K-1-W3R2", rank: 1, bonus: "black", prestige: 1, cost: { white: 3, red: 2 } },

  { id: "t2-W-2-B3G2R2", rank: 2, bonus: "white", prestige: 2, cost: { blue: 3, green: 2, red: 2 } },
  { id: "t2-W-1-B5K2", rank: 2, bonus: "white", prestige: 1, cost: { blue: 5, black: 2 } },
  { id: "t2-W-2-B2G3K2", rank: 2, bonus: "white", prestige: 2, cost: { blue: 2, green: 3, black: 2 } },
  { id: "t2-B-2-G3R2K2", rank: 2, bonus: "blue", prestige: 2, cost: { green: 3, red: 2, black: 2 } },
  { id: "t2-B-3-G3R2W2", rank: 2, bonus: "blue", prestige: 3, cost: { green: 3, red: 2, white: 2 } },
  { id: "t2-B-2-G2R3W2", rank: 2, bonus: "blue", prestige: 2, cost: { green: 2, red: 3, white: 2 } },
  { id: "t2-G-2-R3K2W2", rank: 2, bonus: "green", prestige: 2, cost: { red: 3, black: 2, white: 2 } },
  { id: "t2-G-1-R5B2", rank: 2, bonus: "green", prestige: 1, cost: { red: 5, blue: 2 } },
  { id: "t2-R-2-K3W2B2", rank: 2, bonus: "red", prestige: 2, cost: { black: 3, white: 2, blue: 2 } },
  { id: "t2-R-3-K3W2G2", rank: 2, bonus: "red", prestige: 3, cost: { black: 3, white: 2, green: 2 } },
  { id: "t2-K-2-W3B2G2", rank: 2, bonus: "black", prestige: 2, cost: { white: 3, blue: 2, green: 2 } },
  { id: "t2-K-1-W5R2", rank: 2, bonus: "black", prestige: 1, cost: { white: 5, red: 2 } },

  { id: "t3-W-4-B4G4R4", rank: 3, bonus: "white", prestige: 4, cost: { blue: 4, green: 4, red: 4 } },
  { id: "t3-W-5-B7R3K2", rank: 3, bonus: "white", prestige: 5, cost: { blue: 7, red: 3, black: 2 } },
  { id: "t3-B-4-G4R4K4", rank: 3, bonus: "blue", prestige: 4, cost: { green: 4, red: 4, black: 4 } },
  { id: "t3-B-3-G6R3W3", rank: 3, bonus: "blue", prestige: 3, cost: { green: 6, red: 3, white: 3 } },
  { id: "t3-G-4-R4K4W4", rank: 3, bonus: "green", prestige: 4, cost: { red: 4, black: 4, white: 4 } },
  { id: "t3-G-5-R7K3B2", rank: 3, bonus: "green", prestige: 5, cost: { red: 7, black: 3, blue: 2 } },
  { id: "t3-R-4-K4W4B4", rank: 3, bonus: "red", prestige: 4, cost: { black: 4, white: 4, blue: 4 } },
  { id: "t3-R-3-K6W3G3", rank: 3, bonus: "red", prestige: 3, cost: { black: 6, white: 3, green: 3 } },
  { id: "t3-K-5-W7B3G2", rank: 3, bonus: "black", prestige: 5, cost: { white: 7, blue: 3, green: 2 } },
];

export const CARD_BY_ID: Record<string, CardDef> = Object.fromEntries(
  CARD_DEFS.map((card) => [card.id, card]),
);

export function freshCollection(): CollectionCard[] {
  return CARD_DEFS.map((card) => ({ id: card.id }));
}

export function defOf(id: string): CardDef {
  const def = CARD_BY_ID[id];
  if (!def) throw new Error(`Unknown card ${id}`);
  return def;
}
