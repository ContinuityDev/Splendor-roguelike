import type { Job, Rank, UpgradeId } from "./types";

export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  rank: Rank;
  job: Job;
  when: "on-buy" | "always" | "after-win";
  blurb: string;
}

export const UPGRADES: UpgradeDef[] = [
  {
    id: "swift",
    name: "Swift",
    rank: 1,
    job: "S",
    when: "on-buy",
    blurb: "This buy does not spend a turn. Act again at once.",
  },
  {
    id: "echo",
    name: "Echo",
    rank: 1,
    job: "S",
    when: "always",
    blurb: "Permanent bonus is +2 of this card's color.",
  },
  {
    id: "cornucopia",
    name: "Cornucopia",
    rank: 1,
    job: "E",
    when: "on-buy",
    blurb: "Gain 3 tokens of uniformly random colors.",
  },
  {
    id: "purse",
    name: "Purse",
    rank: 1,
    job: "E",
    when: "on-buy",
    blurb: "Gain $2.",
  },
  {
    id: "crest",
    name: "Crest",
    rank: 1,
    job: "P",
    when: "always",
    blurb: "Prestige +1. Cost +2 of this card's bonus color.",
  },
  {
    id: "scrap",
    name: "Scrap",
    rank: 1,
    job: "D",
    when: "after-win",
    blurb: "After a win, you may destroy this card forever.",
  },
  {
    id: "hourglass",
    name: "Hourglass",
    rank: 2,
    job: "S",
    when: "on-buy",
    blurb: "After spending this turn, remaining turns +1.",
  },
  {
    id: "harvest",
    name: "Harvest",
    rank: 2,
    job: "E",
    when: "on-buy",
    blurb: "Gain 1 token of each distinct bonus color in your tableau, including this card.",
  },
  {
    id: "broker",
    name: "Broker",
    rank: 2,
    job: "E",
    when: "on-buy",
    blurb: "Gain $3.",
  },
  {
    id: "gilded",
    name: "Gilded",
    rank: 2,
    job: "P",
    when: "always",
    blurb: "Prestige ×2. Cost +2 of this card's bonus color.",
  },
  {
    id: "flourish",
    name: "Flourish",
    rank: 2,
    job: "P",
    when: "always",
    blurb: "Prestige +1. Cost unchanged.",
  },
  {
    id: "wreck",
    name: "Wreck",
    rank: 2,
    job: "D",
    when: "on-buy",
    blurb: "Destroy one other face-up market card for the rest of this round.",
  },
  {
    id: "eternity",
    name: "Eternity",
    rank: 3,
    job: "S",
    when: "on-buy",
    blurb: "After spending this turn, remaining turns +2.",
  },
  {
    id: "hoard",
    name: "Hoard",
    rank: 3,
    job: "E",
    when: "on-buy",
    blurb: "Gain 5 tokens of uniformly random colors.",
  },
  {
    id: "treasury",
    name: "Treasury",
    rank: 3,
    job: "E",
    when: "on-buy",
    blurb: "Gain $ equal to this card's prestige this round.",
  },
  {
    id: "crown",
    name: "Crown",
    rank: 3,
    job: "P",
    when: "always",
    blurb: "Prestige ×2. Cost +3 of this card's bonus color.",
  },
  {
    id: "tribute",
    name: "Tribute",
    rank: 3,
    job: "P",
    when: "on-buy",
    blurb: "This round, worth printed prestige plus matching-color bonuses already in your tableau.",
  },
  {
    id: "exile",
    name: "Exile",
    rank: 3,
    job: "D",
    when: "after-win",
    blurb: "After a win, destroy one ★ or ★★ collection card.",
  },
];

export const UPGRADE_BY_ID: Record<UpgradeId, UpgradeDef> = Object.fromEntries(
  UPGRADES.map((upgrade) => [upgrade.id, upgrade]),
) as Record<UpgradeId, UpgradeDef>;

export function upgradesForRank(rank: Rank): UpgradeDef[] {
  return UPGRADES.filter((upgrade) => upgrade.rank === rank);
}

export const JOB_LABEL: Record<Job, string> = {
  E: "Economy",
  S: "Scaling",
  P: "Points",
  D: "Destruction",
};
