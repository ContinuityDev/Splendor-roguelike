import { CARD_DEFS, defOf, freshCollection } from "./cards";
import { mulberry32, shuffle } from "./rng";
import { isBoss, moneyFromWin, roundTarget } from "./sectors";
import type {
  CardDef,
  CollectionCard,
  Cost,
  GameAction,
  GameState,
  GemColor,
  Rank,
  Tokens,
  UpgradeId,
} from "./types";
import { GEM_COLORS } from "./types";
import { upgradesForRank } from "./upgrades";

const EMPTY_TOKENS: Tokens = {
  white: 0,
  blue: 0,
  green: 0,
  red: 0,
  black: 0,
};

const RANKS: Rank[] = [1, 2, 3];
const MARKET_WIDTH = 4;
const TURN_LIMIT = 20;
const ENHANCE_COST = 4;
const DISMANTLE_COST = 3;
/** Leftover turns bank as prestige when you end a won round early. */
const LEFTOVER_TURN_PRESTIGE = 1;

function clone<T>(value: T): T {
  return structuredClone(value);
}

function bumpSeed(seed: number): number {
  return (Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b) >>> 0) || 1;
}

function cardOf(state: GameState, id: string): CollectionCard {
  const card = state.collection.find((entry) => entry.id === id);
  if (!card) throw new Error(`Card ${id} is not in the collection`);
  return card;
}

export function bonusValue(card: CollectionCard): number {
  return card.upgrade === "echo" ? 2 : 1;
}

export function printedPrestige(def: CardDef, upgrade?: UpgradeId): number {
  let value = def.prestige;
  if (upgrade === "crest" || upgrade === "flourish") value += 1;
  if (upgrade === "gilded" || upgrade === "crown") value *= 2;
  return value;
}

export function extraCost(upgrade?: UpgradeId): number {
  if (upgrade === "crest" || upgrade === "gilded") return 2;
  if (upgrade === "crown") return 3;
  return 0;
}

export function printedCost(def: CardDef, upgrade?: UpgradeId): Cost {
  const cost = { ...def.cost };
  const extra = extraCost(upgrade);
  if (extra > 0) {
    cost[def.bonus] = (cost[def.bonus] ?? 0) + extra;
  }
  return cost;
}

export function discountsFrom(state: GameState): Tokens {
  const discounts = { ...EMPTY_TOKENS };
  for (const id of state.tableau) {
    const owned = cardOf(state, id);
    const def = defOf(id);
    discounts[def.bonus] += bonusValue(owned);
  }
  return discounts;
}

export function payCost(def: CardDef, upgrade: UpgradeId | undefined, discounts: Tokens): Cost {
  const printed = printedCost(def, upgrade);
  const due: Cost = {};
  for (const color of GEM_COLORS) {
    const need = Math.max(0, (printed[color] ?? 0) - discounts[color]);
    if (need > 0) due[color] = need;
  }
  return due;
}

export function canPay(tokens: Tokens, cost: Cost): boolean {
  return GEM_COLORS.every((color) => tokens[color] >= (cost[color] ?? 0));
}

export function spend(tokens: Tokens, cost: Cost): Tokens {
  const next = { ...tokens };
  for (const color of GEM_COLORS) {
    next[color] -= cost[color] ?? 0;
  }
  return next;
}

export function addTokens(tokens: Tokens, gained: Cost): Tokens {
  const next = { ...tokens };
  for (const color of GEM_COLORS) {
    next[color] += gained[color] ?? 0;
  }
  return next;
}

export function cardPrestigeThisRound(state: GameState, id: string): number {
  const owned = cardOf(state, id);
  const def = defOf(id);
  return printedPrestige(def, owned.upgrade) + (state.tributeExtra[id] ?? 0);
}

export function totalPrestige(state: GameState): number {
  return state.tableau.reduce((sum, id) => sum + cardPrestigeThisRound(state, id), 0);
}

export function currentTarget(state: GameState): number {
  return roundTarget(state.sector, state.roundInSector);
}

function log(state: GameState, line: string): GameState {
  return { ...state, log: [...state.log.slice(-24), line] };
}

function refillSlot(state: GameState, rank: Rank, index: number): void {
  const next = state.decks[rank][0];
  if (next) {
    state.decks[rank] = state.decks[rank].slice(1);
    state.market[rank][index] = next;
  } else {
    state.market[rank][index] = null;
  }
}

function findMarketSlot(state: GameState, cardId: string): { rank: Rank; index: number } | null {
  for (const rank of RANKS) {
    const index = state.market[rank].indexOf(cardId);
    if (index >= 0) return { rank, index };
  }
  return null;
}

function takeFromMarket(state: GameState, cardId: string): void {
  const slot = findMarketSlot(state, cardId);
  if (!slot) throw new Error("That charter is not on the market");
  state.market[slot.rank][slot.index] = null;
  refillSlot(state, slot.rank, slot.index);
}

function dealRound(state: GameState, seed: number): GameState {
  const rand = mulberry32(seed);
  const decks: GameState["decks"] = { 1: [], 2: [], 3: [] };
  for (const card of state.collection) {
    decks[defOf(card.id).rank].push(card.id);
  }
  for (const rank of RANKS) {
    decks[rank] = shuffle(decks[rank], rand);
  }
  const market: GameState["market"] = { 1: [], 2: [], 3: [] };
  for (const rank of RANKS) {
    market[rank] = [];
    for (let i = 0; i < MARKET_WIDTH; i++) {
      market[rank].push(decks[rank].shift() ?? null);
    }
  }
  return {
    ...state,
    seed,
    turnsLeft: TURN_LIMIT,
    tokens: { ...EMPTY_TOKENS },
    decks,
    market,
    tableau: [],
    reserve: null,
    boughtThisRound: [],
    tributeExtra: {},
    phase: "playing",
    lastWin: null,
    shop: { enhance: false, dismantle: false },
    pendingScrap: [],
    pendingExile: [],
    wreckBoughtId: null,
    enhanceCardId: null,
    resumeAfter: null,
  };
}

export function createCampaign(seed = 0x5f3759df): GameState {
  return dealRound(
    {
      seed,
      sector: 1,
      roundInSector: 1,
      turnsLeft: TURN_LIMIT,
      wallet: 0,
      tokens: { ...EMPTY_TOKENS },
      collection: freshCollection(),
      decks: { 1: [], 2: [], 3: [] },
      market: { 1: [], 2: [], 3: [] },
      tableau: [],
      reserve: null,
      boughtThisRound: [],
      tributeExtra: {},
      phase: "playing",
      lastWin: null,
      shop: { enhance: false, dismantle: false },
      pendingScrap: [],
      pendingExile: [],
      wreckBoughtId: null,
      enhanceCardId: null,
      resumeAfter: null,
      log: ["A new campaign. Sector 1, first audience. Target: 1 prestige."],
    },
    seed,
  );
}

function unupgradedIds(state: GameState): string[] {
  return state.collection.filter((card) => !card.upgrade).map((card) => card.id);
}

function attachUpgrade(state: GameState, cardId: string, upgradeId: UpgradeId): GameState {
  const owned = cardOf(state, cardId);
  const def = defOf(cardId);
  const legal = upgradesForRank(def.rank).some((upgrade) => upgrade.id === upgradeId);
  if (owned.upgrade) throw new Error("That charter already bears a seal");
  if (!legal) throw new Error("That seal is locked to another rank");
  return {
    ...state,
    collection: state.collection.map((card) =>
      card.id === cardId ? { ...card, upgrade: upgradeId } : card,
    ),
  };
}

function destroyCard(state: GameState, cardId: string): GameState {
  const next: GameState = {
    ...state,
    collection: state.collection.filter((card) => card.id !== cardId),
    tableau: state.tableau.filter((id) => id !== cardId),
    boughtThisRound: state.boughtThisRound.filter((id) => id !== cardId),
    reserve: state.reserve === cardId ? null : state.reserve,
    pendingScrap: state.pendingScrap.filter((id) => id !== cardId),
    pendingExile: state.pendingExile.filter((id) => id !== cardId),
  };
  delete next.tributeExtra[cardId];
  for (const rank of RANKS) {
    next.decks[rank] = next.decks[rank].filter((id) => id !== cardId);
    const index = next.market[rank].indexOf(cardId);
    if (index >= 0) {
      next.market[rank] = [...next.market[rank]];
      refillSlot(next, rank, index);
    }
  }
  return next;
}

function afterWinCleanup(state: GameState): GameState {
  const scrap = state.tableau.filter((id) => cardOf(state, id).upgrade === "scrap");
  const exile = state.tableau.filter((id) => cardOf(state, id).upgrade === "exile");
  if (scrap.length > 0) {
    return {
      ...state,
      phase: "scrap",
      pendingScrap: scrap,
      pendingExile: exile,
      resumeAfter: "upgrade",
    };
  }
  if (exile.length > 0) {
    return {
      ...state,
      phase: "exile",
      pendingScrap: [],
      pendingExile: exile,
      resumeAfter: "upgrade",
    };
  }
  return enterUpgrade(state);
}

function enterUpgrade(state: GameState): GameState {
  const anyUnupgraded = unupgradedIds(state);
  if (anyUnupgraded.length === 0) {
    return log(
      advanceAfterReward(state),
      "Every charter already bears a seal. The court grants no further honor.",
    );
  }
  return { ...state, phase: "upgrade", resumeAfter: null };
}

function advanceAfterReward(state: GameState): GameState {
  return log(
    { ...state, phase: "shop", shop: { enhance: false, dismantle: false } },
    isBoss(state.roundInSector)
      ? "The boss chamber falls. The royal shop opens."
      : "The court pays. The royal shop opens.",
  );
}

function startNextRound(state: GameState): GameState {
  const nextRound = (state.roundInSector + 1) as 1 | 2 | 3 | 4;
  const sector = nextRound > 3 ? state.sector + 1 : state.sector;
  const roundInSector = (nextRound > 3 ? 1 : nextRound) as 1 | 2 | 3;
  const seed = bumpSeed(state.seed);
  const dealt = dealRound({ ...state, sector, roundInSector }, seed);
  const target = roundTarget(sector, roundInSector);
  const boss = isBoss(roundInSector) ? " Boss chamber." : "";
  return log(
    dealt,
    `Sector ${sector}, round ${roundInSector}.${boss} Target: ${target} prestige.`,
  );
}

function finishAfterWinEffects(state: GameState): GameState {
  if (state.pendingScrap.length > 0) {
    return { ...state, phase: "scrap" };
  }
  if (state.pendingExile.length > 0) {
    return { ...state, phase: "exile" };
  }
  const resume = state.resumeAfter;
  const cleared = { ...state, resumeAfter: null };
  if (resume === "shop") return { ...cleared, phase: "shop" };
  if (resume === "advance") return advanceAfterReward(cleared);
  return enterUpgrade(cleared);
}

function randomTokens(count: number, seed: number): { tokens: Cost; seed: number } {
  const rand = mulberry32(seed);
  const tokens: Cost = {};
  for (let i = 0; i < count; i++) {
    const color = GEM_COLORS[Math.floor(rand() * GEM_COLORS.length)]!;
    tokens[color] = (tokens[color] ?? 0) + 1;
  }
  return { tokens, seed: bumpSeed(seed) };
}

function applyOnBuy(state: GameState, cardId: string): GameState {
  const owned = cardOf(state, cardId);
  const def = defOf(cardId);
  const upgrade = owned.upgrade;
  let next = state;

  if (upgrade === "tribute") {
    const matching = state.tableau.filter((id) => id !== cardId && defOf(id).bonus === def.bonus)
      .length;
    next = {
      ...next,
      tributeExtra: { ...next.tributeExtra, [cardId]: matching },
    };
  }

  if (upgrade === "purse") next = { ...next, wallet: next.wallet + 2 };
  if (upgrade === "broker") next = { ...next, wallet: next.wallet + 3 };
  if (upgrade === "treasury") {
    next = { ...next, wallet: next.wallet + cardPrestigeThisRound(next, cardId) };
  }
  if (upgrade === "cornucopia" || upgrade === "hoard") {
    const count = upgrade === "cornucopia" ? 3 : 5;
    const roll = randomTokens(count, next.seed);
    next = { ...next, seed: roll.seed, tokens: addTokens(next.tokens, roll.tokens) };
  }
  if (upgrade === "harvest") {
    const colors = new Set(next.tableau.map((id) => defOf(id).bonus));
    const gained: Cost = {};
    for (const color of colors) gained[color] = 1;
    next = { ...next, tokens: addTokens(next.tokens, gained) };
  }
  if (upgrade === "wreck") {
    const others = RANKS.flatMap((rank) => next.market[rank].filter((id): id is string => id !== null));
    if (others.length > 0) {
      return { ...next, phase: "wreck", wreckBoughtId: cardId };
    }
  }
  return resolveAfterBuy(next, cardId);
}

function justCrossedTarget(state: GameState, boughtId: string | null, target: number): boolean {
  const prestige = totalPrestige(state);
  if (prestige < target || !boughtId) return false;
  return prestige - cardPrestigeThisRound(state, boughtId) < target;
}

function applyTurnAndScore(state: GameState, boughtId: string | null): GameState {
  const upgrade = boughtId ? cardOf(state, boughtId).upgrade : undefined;
  let turnsLeft = state.turnsLeft;
  if (upgrade !== "swift") {
    turnsLeft -= 1;
    if (upgrade === "hourglass") turnsLeft += 1;
    if (upgrade === "eternity") turnsLeft += 2;
  }
  const next = { ...state, turnsLeft, phase: "playing" as const, wreckBoughtId: null };
  const prestige = totalPrestige(next);
  const target = currentTarget(next);
  if (prestige >= target) {
    if (turnsLeft <= 0) return winRound(next, prestige, target);
    if (justCrossedTarget(next, boughtId, target)) {
      return log(
        next,
        `Target met. Bank leftover turns as prestige (${LEFTOVER_TURN_PRESTIGE} each), or keep playing.`,
      );
    }
    return next;
  }
  if (turnsLeft <= 0) {
    return log(
      { ...next, phase: "lost" },
      `The audience ends short of ${target}. The collection is unchanged. Retry this round.`,
    );
  }
  return next;
}

export function canBankTurns(state: GameState): boolean {
  return (
    state.phase === "playing" &&
    state.turnsLeft > 0 &&
    totalPrestige(state) >= currentTarget(state)
  );
}

function bankTurns(state: GameState): GameState {
  assertPlaying(state);
  const prestige = totalPrestige(state);
  const target = currentTarget(state);
  if (prestige < target) throw new Error("The court is not yet satisfied");
  const bankedTurns = state.turnsLeft;
  const bankedPrestige = bankedTurns * LEFTOVER_TURN_PRESTIGE;
  const finalPrestige = prestige + bankedPrestige;
  return winRound(
    log(
      { ...state, turnsLeft: 0 },
      bankedTurns > 0
        ? `Banked ${bankedTurns} leftover turns as ${bankedPrestige} prestige.`
        : "No leftover turns to bank.",
    ),
    finalPrestige,
    target,
    bankedTurns,
  );
}

function winRound(
  state: GameState,
  prestige: number,
  target: number,
  bankedTurns = 0,
): GameState {
  const boss = isBoss(state.roundInSector);
  const { overshoot, money } = moneyFromWin(prestige, target, boss);
  const next = log(
    {
      ...state,
      wallet: state.wallet + money,
      lastWin: { prestige, target, overshoot, money, boss, bankedTurns },
      phase: "upgrade",
    },
    boss
      ? `Boss taken at ${prestige}/${target}. Overshoot ${overshoot} pays $${money}.`
      : `The court is satisfied (${prestige}/${target}). Overshoot ${overshoot} pays $${money}.`,
  );
  return afterWinCleanup(next);
}

function resolveAfterBuy(state: GameState, cardId: string): GameState {
  return applyTurnAndScore(state, cardId);
}

function assertPlaying(state: GameState): void {
  if (state.phase !== "playing") throw new Error("The court is not taking that action now");
}

function takeThree(state: GameState, colors: [GemColor, GemColor, GemColor]): GameState {
  assertPlaying(state);
  if (new Set(colors).size !== 3) throw new Error("Take three different treasures");
  const gained: Cost = {};
  for (const color of colors) gained[color] = (gained[color] ?? 0) + 1;
  return applyTurnAndScore(
    log({ ...state, tokens: addTokens(state.tokens, gained) }, `Took ${colors.join(", ")}.`),
    null,
  );
}

function takeTwo(state: GameState, color: GemColor): GameState {
  assertPlaying(state);
  return applyTurnAndScore(
    log(
      { ...state, tokens: addTokens(state.tokens, { [color]: 2 }) },
      `Took two ${color} treasures.`,
    ),
    null,
  );
}

export function isAffordable(state: GameState, cardId: string): boolean {
  const owned = state.collection.find((card) => card.id === cardId);
  if (!owned) return false;
  const due = payCost(defOf(cardId), owned.upgrade, discountsFrom(state));
  return canPay(state.tokens, due);
}

function buyCard(state: GameState, cardId: string): GameState {
  assertPlaying(state);
  const fromReserve = state.reserve === cardId;
  const onMarket = findMarketSlot(state, cardId) !== null;
  if (!fromReserve && !onMarket) throw new Error("That charter is not available");
  if (!isAffordable(state, cardId)) throw new Error("You cannot pay that cost");

  const owned = cardOf(state, cardId);
  const def = defOf(cardId);
  const due = payCost(def, owned.upgrade, discountsFrom(state));
  let next: GameState = {
    ...state,
    tokens: spend(state.tokens, due),
    tableau: [...state.tableau, cardId],
    boughtThisRound: [...state.boughtThisRound, cardId],
  };
  if (fromReserve) {
    next.reserve = null;
  } else {
    takeFromMarket(next, cardId);
  }
  next = log(next, `Bought ${houseTitle(def)} (${stars(def.rank)}, ${def.prestige} prestige).`);
  return applyOnBuy(next, cardId);
}

function reserveCard(state: GameState, cardId: string): GameState {
  assertPlaying(state);
  if (state.reserve) throw new Error("The reserve coffer is already full");
  if (!findMarketSlot(state, cardId)) throw new Error("Reserve a face-up market charter");
  const next = { ...state, reserve: cardId };
  takeFromMarket(next, cardId);
  return applyTurnAndScore(log(next, `Reserved ${houseTitle(defOf(cardId))}.`), null);
}

function wreckCard(state: GameState, cardId: string): GameState {
  if (state.phase !== "wreck" || !state.wreckBoughtId) throw new Error("No wreck is pending");
  if (cardId === state.wreckBoughtId) throw new Error("Wreck a different market charter");
  if (!findMarketSlot(state, cardId)) throw new Error("Wreck a face-up market charter");
  const next = { ...state };
  takeFromMarket(next, cardId);
  return resolveAfterBuy(
    log({ ...next, phase: "playing", wreckBoughtId: null }, `Wrecked ${houseTitle(defOf(cardId))} from the market.`),
    state.wreckBoughtId,
  );
}

function eligibleUpgradeCards(state: GameState): string[] {
  const bought = state.boughtThisRound.filter((id) => {
    const owned = state.collection.find((card) => card.id === id);
    return owned && !owned.upgrade;
  });
  if (bought.length > 0) return bought;
  return unupgradedIds(state);
}

function chooseUpgrade(state: GameState, cardId: string, upgradeId: UpgradeId): GameState {
  if (state.phase !== "upgrade") throw new Error("No upgrade is pending");
  if (!eligibleUpgradeCards(state).includes(cardId)) {
    throw new Error("That charter cannot take the round's seal");
  }
  let next = attachUpgrade(state, cardId, upgradeId);
  next = log(next, `Sealed ${houseTitle(defOf(cardId))} with ${upgradeId}.`);
  if (upgradeId === "scrap") {
    return { ...next, phase: "scrap", pendingScrap: [cardId], resumeAfter: "advance" };
  }
  if (upgradeId === "exile") {
    return { ...next, phase: "exile", pendingExile: [cardId], resumeAfter: "advance" };
  }
  return advanceAfterReward(next);
}

function skipUpgrade(state: GameState): GameState {
  if (state.phase !== "upgrade") throw new Error("No upgrade is pending");
  if (unupgradedIds(state).length > 0) {
    throw new Error("Choose a seal for an unupgraded charter");
  }
  return advanceAfterReward(state);
}

function resolveScrap(state: GameState, destroy: boolean): GameState {
  if (state.phase !== "scrap") throw new Error("No scrap is pending");
  const [cardId, ...rest] = state.pendingScrap;
  if (!cardId) return finishAfterWinEffects({ ...state, pendingScrap: [] });
  let next: GameState = { ...state, pendingScrap: rest };
  if (destroy) {
    next = destroyCard(next, cardId);
    next = log(next, `Scrapped ${houseTitle(defOf(cardId))} from the collection.`);
  } else {
    next = log(next, `Kept ${houseTitle(defOf(cardId))}.`);
  }
  return finishAfterWinEffects(next);
}

function exileTargets(state: GameState): string[] {
  return state.collection
    .filter((card) => {
      const rank = defOf(card.id).rank;
      return rank === 1 || rank === 2;
    })
    .map((card) => card.id);
}

function resolveExile(state: GameState, cardId: string | null): GameState {
  if (state.phase !== "exile") throw new Error("No exile is pending");
  const [, ...rest] = state.pendingExile;
  let next: GameState = { ...state, pendingExile: rest };
  if (cardId) {
    if (!exileTargets(state).includes(cardId)) throw new Error("Exile a ★ or ★★ charter");
    next = destroyCard(next, cardId);
    next = log(next, `Exiled ${houseTitle(defOf(cardId))}.`);
  } else if (exileTargets(state).length > 0) {
    throw new Error("Choose a ★ or ★★ charter to exile");
  }
  return finishAfterWinEffects(next);
}

function shopSkip(state: GameState): GameState {
  if (state.phase !== "shop") throw new Error("The shop is closed");
  return startNextRound(state);
}

function beginEnhance(state: GameState): GameState {
  if (state.phase !== "shop") throw new Error("The shop is closed");
  if (state.shop.enhance) throw new Error("Enhance already bought this shop");
  if (state.wallet < ENHANCE_COST) throw new Error("Enhance costs $4");
  if (unupgradedIds(state).length === 0) throw new Error("Every charter already bears a seal");
  return { ...state, phase: "enhance-card" };
}

function pickEnhanceCard(state: GameState, cardId: string): GameState {
  if (state.phase !== "enhance-card") throw new Error("Pick a charter to enhance first");
  if (!unupgradedIds(state).includes(cardId)) throw new Error("That charter already bears a seal");
  return { ...state, phase: "enhance-upgrade", enhanceCardId: cardId };
}

function pickEnhanceUpgrade(state: GameState, upgradeId: UpgradeId): GameState {
  if (state.phase !== "enhance-upgrade" || !state.enhanceCardId) {
    throw new Error("Pick a charter to enhance first");
  }
  const cardId = state.enhanceCardId;
  let next = attachUpgrade(state, cardId, upgradeId);
  next = {
    ...next,
    wallet: next.wallet - ENHANCE_COST,
    shop: { ...next.shop, enhance: true },
    phase: "shop",
    enhanceCardId: null,
  };
  next = log(next, `The goldsmith sealed ${houseTitle(defOf(cardId))} with ${upgradeId} (−$4).`);
  if (upgradeId === "scrap") {
    return { ...next, phase: "scrap", pendingScrap: [cardId], resumeAfter: "shop" };
  }
  if (upgradeId === "exile") {
    return { ...next, phase: "exile", pendingExile: [cardId], resumeAfter: "shop" };
  }
  return next;
}

function beginDismantle(state: GameState): GameState {
  if (state.phase !== "shop") throw new Error("The shop is closed");
  if (state.shop.dismantle) throw new Error("Dismantle already bought this shop");
  if (state.wallet < DISMANTLE_COST) throw new Error("Dismantle costs $3");
  if (state.collection.length === 0) throw new Error("The collection is empty");
  return { ...state, phase: "dismantle" };
}

function pickDismantle(state: GameState, cardId: string): GameState {
  if (state.phase !== "dismantle") throw new Error("Dismantle is not pending");
  if (!state.collection.some((card) => card.id === cardId)) throw new Error("Unknown charter");
  let next = destroyCard(state, cardId);
  next = {
    ...next,
    wallet: next.wallet - DISMANTLE_COST,
    shop: { ...next.shop, dismantle: true },
    phase: "shop",
  };
  return log(next, `Dismantled ${houseTitle(defOf(cardId))} (−$3).`);
}

function retryRound(state: GameState): GameState {
  if (state.phase !== "lost") throw new Error("This round is not lost");
  const dealt = dealRound(state, bumpSeed(state.seed));
  return log(
    dealt,
    `Retry sector ${state.sector}, round ${state.roundInSector}. Target: ${currentTarget(state)}.`,
  );
}

function debugWin(state: GameState): GameState {
  if (state.phase !== "playing" && state.phase !== "lost") {
    throw new Error("Debug win is for a live round");
  }
  const target = currentTarget(state);
  const prestige = Math.max(totalPrestige(state), target + 2);
  return winRound({ ...state, phase: "playing" }, prestige, target);
}

export function reduce(state: GameState, action: GameAction): GameState {
  const working = clone(state);
  switch (action.type) {
    case "take-three":
      return takeThree(working, action.colors);
    case "take-two":
      return takeTwo(working, action.color);
    case "buy":
      return buyCard(working, action.cardId);
    case "reserve":
      return reserveCard(working, action.cardId);
    case "wreck":
      return wreckCard(working, action.cardId);
    case "choose-upgrade":
      return chooseUpgrade(working, action.cardId, action.upgradeId);
    case "skip-upgrade":
      return skipUpgrade(working);
    case "scrap":
      return resolveScrap(working, action.destroy);
    case "exile":
      return resolveExile(working, action.cardId);
    case "skip-exile":
      return resolveExile(working, null);
    case "shop-enhance":
      return beginEnhance(working);
    case "shop-dismantle":
      return beginDismantle(working);
    case "shop-skip":
      return shopSkip(working);
    case "pick-enhance-card":
      return pickEnhanceCard(working, action.cardId);
    case "pick-enhance-upgrade":
      return pickEnhanceUpgrade(working, action.upgradeId);
    case "pick-dismantle":
      return pickDismantle(working, action.cardId);
    case "retry":
      return retryRound(working);
    case "bank-turns":
      return bankTurns(working);
    case "debug-win":
      return debugWin(working);
    case "new-campaign":
      return createCampaign(bumpSeed(state.seed));
    default: {
      const _never: never = action;
      return _never;
    }
  }
}

export function stars(rank: Rank): string {
  return "★".repeat(rank);
}

export const HOUSE: Record<GemColor, { name: string; gem: string; latin: string }> = {
  white: { name: "House Argent", gem: "Pearl", latin: "Argent" },
  blue: { name: "House Azure", gem: "Sapphire", latin: "Azure" },
  green: { name: "House Vert", gem: "Emerald", latin: "Vert" },
  red: { name: "House Gules", gem: "Ruby", latin: "Gules" },
  black: { name: "House Sable", gem: "Onyx", latin: "Sable" },
};

export function houseTitle(def: CardDef): string {
  return `${HOUSE[def.bonus].name} ${stars(def.rank)}`;
}

export function tokenCount(tokens: Tokens): number {
  return GEM_COLORS.reduce((sum, color) => sum + tokens[color], 0);
}

export {
  CARD_DEFS,
  defOf,
  DISMANTLE_COST,
  ENHANCE_COST,
  LEFTOVER_TURN_PRESTIGE,
  TURN_LIMIT,
  eligibleUpgradeCards,
  exileTargets,
  unupgradedIds,
};
