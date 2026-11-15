export const GEM_COLORS = ["white", "blue", "green", "red", "black"] as const;
export type GemColor = (typeof GEM_COLORS)[number];

export type Rank = 1 | 2 | 3;
export type RoundInSector = 1 | 2 | 3;
export type Job = "E" | "S" | "P" | "D";

export type Cost = Partial<Record<GemColor, number>>;
export type Tokens = Record<GemColor, number>;

export type UpgradeId =
  | "swift"
  | "echo"
  | "cornucopia"
  | "purse"
  | "crest"
  | "scrap"
  | "hourglass"
  | "harvest"
  | "broker"
  | "gilded"
  | "flourish"
  | "wreck"
  | "eternity"
  | "hoard"
  | "treasury"
  | "crown"
  | "tribute"
  | "exile";

export interface CardDef {
  id: string;
  rank: Rank;
  bonus: GemColor;
  prestige: number;
  cost: Cost;
}

export interface CollectionCard {
  id: string;
  upgrade?: UpgradeId;
}

export type Phase =
  | "playing"
  | "wreck"
  | "upgrade"
  | "scrap"
  | "exile"
  | "shop"
  | "enhance-card"
  | "enhance-upgrade"
  | "dismantle"
  | "lost";

export interface GameState {
  seed: number;
  sector: number;
  roundInSector: RoundInSector;
  turnsLeft: number;
  wallet: number;
  tokens: Tokens;
  collection: CollectionCard[];
  decks: Record<Rank, string[]>;
  market: Record<Rank, Array<string | null>>;
  tableau: string[];
  reserve: string | null;
  boughtThisRound: string[];
  tributeExtra: Record<string, number>;
  phase: Phase;
  lastWin: {
    prestige: number;
    target: number;
    overshoot: number;
    money: number;
    boss: boolean;
    bankedTurns: number;
  } | null;
  shop: { enhance: boolean; dismantle: boolean };
  pendingScrap: string[];
  pendingExile: string[];
  wreckBoughtId: string | null;
  enhanceCardId: string | null;
  resumeAfter: "upgrade" | "advance" | "shop" | null;
  log: string[];
}

export type GameAction =
  | { type: "take-three"; colors: [GemColor, GemColor, GemColor] }
  | { type: "take-two"; color: GemColor }
  | { type: "buy"; cardId: string }
  | { type: "reserve"; cardId: string }
  | { type: "wreck"; cardId: string }
  | { type: "choose-upgrade"; cardId: string; upgradeId: UpgradeId }
  | { type: "skip-upgrade" }
  | { type: "scrap"; destroy: boolean }
  | { type: "exile"; cardId: string }
  | { type: "skip-exile" }
  | { type: "shop-enhance" }
  | { type: "shop-dismantle" }
  | { type: "shop-skip" }
  | { type: "pick-enhance-card"; cardId: string }
  | { type: "pick-enhance-upgrade"; upgradeId: UpgradeId }
  | { type: "pick-dismantle"; cardId: string }
  | { type: "retry" }
  | { type: "bank-turns" }
  | { type: "debug-win" }
  | { type: "new-campaign" };
