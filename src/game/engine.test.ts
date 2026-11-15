import { describe, expect, it } from "vitest";
import { CARD_DEFS } from "./cards";
import {
  createCampaign,
  currentTarget,
  discountsFrom,
  isAffordable,
  printedCost,
  printedPrestige,
  reduce,
  totalPrestige,
} from "./engine";
import { sectorFirstTarget } from "./sectors";
import type { GameState, GemColor } from "./types";

function play(state: GameState, ...actions: Parameters<typeof reduce>[1][]) {
  return actions.reduce((next, action) => reduce(next, action), state);
}

function takeAll(state: GameState, color: GemColor, times: number): GameState {
  let next = state;
  for (let i = 0; i < times; i++) next = reduce(next, { type: "take-two", color });
  return next;
}

describe("sector targets", () => {
  it("matches the design table", () => {
    const firsts = [1, 2, 3, 4, 5, 6].map(sectorFirstTarget);
    expect(firsts).toEqual([1, 4, 10, 22, 46, 94]);
  });
});

describe("collection", () => {
  it("has 36 unique cards in the listed ranks", () => {
    expect(CARD_DEFS).toHaveLength(36);
    expect(CARD_DEFS.filter((card) => card.rank === 1)).toHaveLength(15);
    expect(CARD_DEFS.filter((card) => card.rank === 2)).toHaveLength(12);
    expect(CARD_DEFS.filter((card) => card.rank === 3)).toHaveLength(9);
    expect(new Set(CARD_DEFS.map((card) => card.id)).size).toBe(36);
  });
});

describe("campaign loop", () => {
  it("starts sector 1 round 1 at target 1 with 20 turns and 12 market cards", () => {
    const state = createCampaign(1);
    expect(state.sector).toBe(1);
    expect(state.roundInSector).toBe(1);
    expect(currentTarget(state)).toBe(1);
    expect(state.turnsLeft).toBe(20);
    expect(state.wallet).toBe(0);
    expect([...state.market[1], ...state.market[2], ...state.market[3]].filter(Boolean)).toHaveLength(12);
  });

  it("takes three different tokens or two of the same", () => {
    let state = createCampaign(2);
    state = reduce(state, { type: "take-three", colors: ["white", "blue", "green"] });
    expect(state.tokens).toMatchObject({ white: 1, blue: 1, green: 1 });
    expect(state.turnsLeft).toBe(19);
    state = reduce(state, { type: "take-two", color: "red" });
    expect(state.tokens.red).toBe(2);
    expect(state.turnsLeft).toBe(18);
  });

  it("rejects take-three with duplicates", () => {
    expect(() =>
      reduce(createCampaign(3), { type: "take-three", colors: ["white", "white", "blue"] }),
    ).toThrow(/different/);
  });

  it("buys a ★ card, applies its bonus, and can hit sector 1 target 1", () => {
    let state = createCampaign(7);
    const cheap = state.market[1].find((id) => id && CARD_DEFS.find((card) => card.id === id)?.prestige === 1);
    const targetId =
      cheap ??
      state.collection.find((card) => CARD_DEFS.find((def) => def.id === card.id)?.prestige === 1)!.id;

    // Force the 1-VP card into the market if needed.
    if (!state.market[1].includes(targetId)) {
      state = {
        ...state,
        market: { ...state.market, 1: [targetId, ...state.market[1].slice(1)] },
        decks: {
          ...state.decks,
          1: state.decks[1].filter((id) => id !== targetId),
        },
      };
    }

    const def = CARD_DEFS.find((card) => card.id === targetId)!;
    for (const [color, amount] of Object.entries(def.cost) as [GemColor, number][]) {
      state = takeAll(state, color, Math.ceil(amount / 2));
    }
    expect(isAffordable(state, targetId)).toBe(true);
    state = reduce(state, { type: "buy", cardId: targetId });
    expect(state.tableau).toContain(targetId);
    expect(totalPrestige(state)).toBeGreaterThanOrEqual(1);
    expect(state.phase).toBe("playing");
    expect(state.turnsLeft).toBeGreaterThan(0);
    expect(discountsFrom(state)[def.bonus]).toBeGreaterThanOrEqual(1);
    const leftover = state.turnsLeft;
    state = reduce(state, { type: "bank-turns" });
    expect(state.phase).toBe("upgrade");
    expect(state.lastWin?.target).toBe(1);
    expect(state.lastWin?.bankedTurns).toBe(leftover);
    expect(state.lastWin?.prestige).toBe(totalPrestige(state) + leftover);
  });

  it("reserves one face-up card and refuses a second reserve", () => {
    let state = createCampaign(4);
    const first = state.market[1][0]!;
    const second = state.market[1][1]!;
    state = reduce(state, { type: "reserve", cardId: first });
    expect(state.reserve).toBe(first);
    expect(state.turnsLeft).toBe(19);
    expect(() => reduce(state, { type: "reserve", cardId: second })).toThrow(/full/);
  });

  it("converts overshoot to money and opens the shop after every win", () => {
    let state = createCampaign(5);
    state = play(state, { type: "debug-win" });
    expect(state.phase).toBe("upgrade");
    expect(state.lastWin?.money).toBe(2);
    const cardId = state.collection[0]!.id;
    state = reduce(state, { type: "choose-upgrade", cardId, upgradeId: "purse" });
    expect(state.phase).toBe("shop");
    expect(state.roundInSector).toBe(1);
    state = reduce(state, { type: "shop-skip" });
    expect(state.roundInSector).toBe(2);
    state = play(state, { type: "debug-win" });
    const mid = state.collection.find((card) => !card.upgrade && card.id.startsWith("t2"))!.id;
    state = reduce(state, { type: "choose-upgrade", cardId: mid, upgradeId: "flourish" });
    expect(state.phase).toBe("shop");
    state = reduce(state, { type: "shop-skip" });
    expect(state.roundInSector).toBe(3);
    expect(currentTarget(state)).toBe(3);
    state = play(state, { type: "debug-win" });
    expect(state.lastWin?.boss).toBe(true);
    expect(state.lastWin?.money).toBe(4);
    const late = state.collection.find((card) => !card.upgrade && card.id.startsWith("t3"))!.id;
    state = reduce(state, { type: "choose-upgrade", cardId: late, upgradeId: "treasury" });
    expect(state.phase).toBe("shop");
    expect(state.wallet).toBeGreaterThanOrEqual(4);
    state = reduce(state, { type: "shop-skip" });
    expect(state.sector).toBe(2);
    expect(state.roundInSector).toBe(1);
  });

  it("retries the same round after a loss without touching the wallet", () => {
    let state = createCampaign(6);
    state = { ...state, wallet: 9, turnsLeft: 1 };
    state = reduce(state, { type: "take-two", color: "white" });
    expect(state.phase).toBe("lost");
    expect(state.wallet).toBe(9);
    state = reduce(state, { type: "retry" });
    expect(state.phase).toBe("playing");
    expect(state.roundInSector).toBe(1);
    expect(state.sector).toBe(1);
    expect(state.wallet).toBe(9);
    expect(state.turnsLeft).toBe(20);
    expect(state.tableau).toEqual([]);
  });

  it("refuses to bank leftover turns before the target", () => {
    expect(() => reduce(createCampaign(12), { type: "bank-turns" })).toThrow(/satisfied/);
  });

  it("wins with no banked turns if you play out the clock after the target", () => {
    let state = createCampaign(11);
    const cardId =
      state.collection.find((card) => CARD_DEFS.find((def) => def.id === card.id)?.prestige === 1)
        ?.id ?? state.collection[0]!.id;
    state = {
      ...state,
      tableau: [cardId],
      boughtThisRound: [cardId],
      turnsLeft: 1,
    };
    expect(totalPrestige(state)).toBeGreaterThanOrEqual(1);
    state = reduce(state, { type: "take-two", color: "white" });
    expect(state.phase).toBe("upgrade");
    expect(state.lastWin?.bankedTurns).toBe(0);
    expect(state.lastWin?.prestige).toBe(totalPrestige(state));
  });
});

describe("upgrades", () => {
  it("locks seals to rank and doubles crest prestige", () => {
    const crest = printedPrestige(
      CARD_DEFS.find((card) => card.id === "t1-W-1-B3K2")!,
      "crest",
    );
    expect(crest).toBe(2);
    expect(printedCost(CARD_DEFS.find((card) => card.id === "t1-W-1-B3K2")!, "crest").white).toBe(2);
    let state = createCampaign(8);
    state = play(state, { type: "debug-win" });
    const starOne = state.collection.find((card) => card.id.startsWith("t1"))!.id;
    expect(() =>
      reduce(state, { type: "choose-upgrade", cardId: starOne, upgradeId: "crown" }),
    ).toThrow(/rank/);
  });

  it("lets Swift skip the turn spend", () => {
    let state = createCampaign(9);
    const card = state.market[1][0]!;
    state = {
      ...state,
      collection: state.collection.map((entry) =>
        entry.id === card ? { ...entry, upgrade: "swift" } : entry,
      ),
      tokens: { white: 10, blue: 10, green: 10, red: 10, black: 10 },
    };
    const before = state.turnsLeft;
    const prestige = CARD_DEFS.find((def) => def.id === card)!.prestige;
    state = reduce(state, { type: "buy", cardId: card });
    if (prestige >= 1) {
      expect(state.phase).toBe("playing");
      expect(state.turnsLeft).toBe(before);
    } else {
      expect(state.turnsLeft).toBe(before);
    }
  });
});
