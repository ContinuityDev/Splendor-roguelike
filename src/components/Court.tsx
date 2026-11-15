import { useEffect, useMemo, useReducer, useState } from "react";
import { defOf } from "../game/cards";
import {
  canBankTurns,
  createCampaign,
  currentTarget,
  DISMANTLE_COST,
  ENHANCE_COST,
  HOUSE,
  isAffordable,
  LEFTOVER_TURN_PRESTIGE,
  reduce,
  tokenCount,
  totalPrestige,
} from "../game/engine";
import { isBoss } from "../game/sectors";
import { GEM_COLORS, type GameAction, type GameState, type GemColor } from "../game/types";
import { upgradesForRank } from "../game/upgrades";
import { DevCard } from "./DevCard";
import { GemIcon } from "./GemIcon";
import { UpgradeChip } from "./UpgradeChip";

function reducer(state: GameState, action: GameAction): GameState {
  try {
    return reduce(state, action);
  } catch (error) {
    const message = error instanceof Error ? error.message : "The court refuses.";
    return { ...state, log: [...state.log.slice(-24), `— ${message}`] };
  }
}

type Intent = "take" | "buy" | "reserve";

function faceUpIds(state: GameState): string[] {
  return ([1, 2, 3] as const).flatMap((rank) =>
    state.market[rank].filter((id): id is string => id !== null),
  );
}

export function Court() {
  const [state, dispatch] = useReducer(reducer, undefined, () => createCampaign());
  const [intent, setIntent] = useState<Intent>("take");
  const [picked, setPicked] = useState<GemColor[]>([]);
  const [upgradeCard, setUpgradeCard] = useState<string | null>(null);
  const prestige = totalPrestige(state);
  const target = currentTarget(state);
  const canTakeTwo = picked.length === 2 && picked[0] === picked[1];
  const canTakeThree = picked.length === 3 && new Set(picked).size === 3;

  const eligibleUpgrades = useMemo(() => {
    if (state.phase !== "upgrade") return [];
    const bought = state.boughtThisRound.filter((id) => {
      const owned = state.collection.find((card) => card.id === id);
      return owned && !owned.upgrade;
    });
    if (bought.length > 0) return bought;
    return state.collection.filter((card) => !card.upgrade).map((card) => card.id);
  }, [state]);

  useEffect(() => {
    if (state.phase === "upgrade" && eligibleUpgrades.length === 1) {
      setUpgradeCard(eligibleUpgrades[0]!);
      return;
    }
    if (state.phase !== "upgrade") setUpgradeCard(null);
  }, [state.phase, eligibleUpgrades]);

  function clickGem(color: GemColor) {
    if (state.phase !== "playing" || intent !== "take") return;
    setPicked((current) => {
      if (current.length === 1 && current[0] === color) return [color, color];
      if (current.includes(color)) return current.filter((entry) => entry !== color);
      if (current.length >= 3) return current;
      if (current.length === 2 && current[0] === current[1]) return [color];
      return [...current, color];
    });
  }

  function takeSelected() {
    if (canTakeTwo) {
      dispatch({ type: "take-two", color: picked[0]! });
      setPicked([]);
      return;
    }
    if (canTakeThree) {
      dispatch({ type: "take-three", colors: [picked[0]!, picked[1]!, picked[2]!] });
      setPicked([]);
    }
  }

  function onCard(cardId: string) {
    if (state.phase === "upgrade") {
      setUpgradeCard(cardId);
      return;
    }
    if (state.phase === "enhance-card") {
      dispatch({ type: "pick-enhance-card", cardId });
      return;
    }
    if (state.phase === "dismantle") {
      dispatch({ type: "pick-dismantle", cardId });
      return;
    }
    if (state.phase === "exile") {
      dispatch({ type: "exile", cardId });
      return;
    }
    if (state.phase === "wreck") {
      dispatch({ type: "wreck", cardId });
      return;
    }
    if (state.phase !== "playing") return;
    if (intent === "buy") dispatch({ type: "buy", cardId });
    if (intent === "reserve") dispatch({ type: "reserve", cardId });
  }

  const overlay = state.phase !== "playing";
  const boardMode = overlay ? undefined : intent === "take" ? undefined : intent;
  const canBank = canBankTurns(state);
  const bankPrestige = state.turnsLeft * LEFTOVER_TURN_PRESTIGE;

  return (
    <div className="court">
      <header className="masthead">
        <div>
          <p className="kicker">Hayden’s Splendor roguelike</p>
          <h1>The Court of Stones</h1>
          <p className="lede">
            Medieval houses trade noble treasure. Twenty turns. Climb the sectors. No nobles, no gold,
            no token caps. Built for a phone in portrait as well as a desktop browser.
          </p>
        </div>
        {canBank && (
          <div className="bank-banner">
            <p>
              Target met. Bank leftover turns ({LEFTOVER_TURN_PRESTIGE} prestige each) or keep
              playing.
            </p>
            <button type="button" onClick={() => dispatch({ type: "bank-turns" })}>
              End now · +{bankPrestige}
            </button>
          </div>
        )}
        <dl className="hud">
          <div>
            <dt>Sector</dt>
            <dd>
              {state.sector}
              {isBoss(state.roundInSector) ? " · Boss" : ` · Round ${state.roundInSector}`}
            </dd>
          </div>
          <div>
            <dt>Prestige</dt>
            <dd>
              {prestige} / {target}
            </dd>
          </div>
          <div>
            <dt>Turns</dt>
            <dd>{state.turnsLeft}</dd>
          </div>
          <div>
            <dt>Purse</dt>
            <dd>${state.wallet}</dd>
          </div>
          <div>
            <dt>Hand</dt>
            <dd>{tokenCount(state.tokens)} gems</dd>
          </div>
        </dl>
      </header>

      <section className="market">
        <h2>Market</h2>
        {([3, 2, 1] as const).map((rank) => (
          <div key={rank} className="market-row">
            <h3>
              {rank === 1 ? "★" : rank === 2 ? "★★" : "★★★"}
              <span className="rank-name">{rank === 1 ? "Engine" : rank === 2 ? "Mid" : "Payoff"}</span>
            </h3>
            <div className="card-grid">
              {state.market[rank].map((cardId, index) => (
                <DevCard
                  key={`${rank}-${index}`}
                  cardId={cardId}
                  state={state}
                  mode={boardMode}
                  onClick={cardId && !overlay ? () => onCard(cardId) : undefined}
                />
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="vault">
        <h2>Treasure</h2>
        <div className="gem-bank">
          {GEM_COLORS.map((color) => {
            const times = picked.filter((entry) => entry === color).length;
            return (
              <button
                key={color}
                className={`gem-btn ${times > 0 ? "is-picked" : ""}`}
                onClick={() => clickGem(color)}
                disabled={state.phase !== "playing" || intent !== "take"}
              >
                <GemIcon color={color} size={22} count={state.tokens[color]} />
                <span>
                  {HOUSE[color].gem}
                  {times > 0 ? ` · ${times} selected` : ""}
                </span>
                <small>{HOUSE[color].name}</small>
              </button>
            );
          })}
        </div>
        <div className="take-row">
          <p>
            {canTakeTwo
              ? `Two ${HOUSE[picked[0]!].gem}s ready.`
              : canTakeThree
                ? "Three treasures ready."
                : "3 different, or same twice."}
          </p>
        </div>
      </section>

      <section className="holdings">
        <div className="holdings-wrap">
          <div>
            <h2>Tableau</h2>
            <div className="tableau-strip">
              {state.tableau.length === 0 && <p className="muted">Empty hall.</p>}
              {state.tableau.map((cardId) => (
                <DevCard key={cardId} cardId={cardId} state={state} />
              ))}
            </div>
          </div>
          <div className="reserve-panel">
            <h2>Reserve</h2>
            <DevCard
              cardId={state.reserve}
              state={state}
              mode={intent === "buy" && state.phase === "playing" ? "buy" : undefined}
              onClick={
                state.reserve && intent === "buy" && state.phase === "playing"
                  ? () => dispatch({ type: "buy", cardId: state.reserve! })
                  : undefined
              }
            />
          </div>
        </div>
      </section>

      <aside className="chronicle">
        <h2>Chronicle</h2>
        <ol>
          {[...state.log].reverse().map((line, index) => (
            <li key={`${line}-${index}`}>{line}</li>
          ))}
        </ol>
      </aside>

      {intent === "buy" && state.phase === "playing" && (
        <p className="hint">
          Gold-rimmed charters can be bought. Bonuses discount later buys, never the card you are
          buying. Affordable now:{" "}
          {[...faceUpIds(state), state.reserve].filter(
            (id): id is string => !!id && isAffordable(state, id),
          ).length}
          .
        </p>
      )}

      {!overlay && (
      <nav className="dock" aria-label="Turn actions">
        <div className="dock-intents">
          {(["take", "buy", "reserve"] as Intent[]).map((value) => (
            <button
              key={value}
              className={intent === value ? "is-on" : ""}
              disabled={state.phase !== "playing"}
              onClick={() => {
                setIntent(value);
                setPicked([]);
              }}
            >
              {value === "take" ? "Take" : value === "buy" ? "Buy" : "Reserve"}
            </button>
          ))}
        </div>
        {intent === "take" && state.phase === "playing" && (
          <div className="dock-take">
            <button disabled={!(canTakeTwo || canTakeThree)} onClick={takeSelected}>
              Confirm take
            </button>
            <button className="ghost" onClick={() => setPicked([])}>
              Clear
            </button>
          </div>
        )}
        <div className="debug-row">
          <button className="ghost" onClick={() => dispatch({ type: "debug-win" })}>
            Win round
          </button>
          <button className="ghost" onClick={() => dispatch({ type: "new-campaign" })}>
            New campaign
          </button>
        </div>
      </nav>
      )}

      {overlay && (
        <div className="veil">
          {state.phase === "lost" && (
            <dialog className="scroll" open>
              <h2>The audience fails</h2>
              <p>
                Prestige {prestige} short of {target}. Collection and purse unchanged. Retry this
                round.
              </p>
              <button onClick={() => dispatch({ type: "retry" })}>Retry the round</button>
            </dialog>
          )}

          {state.phase === "wreck" && (
            <dialog className="scroll" open>
              <h2>Wreck</h2>
              <p>Tap another face-up market charter to destroy it for the rest of this round.</p>
              <div className="card-grid">
                {faceUpIds(state)
                  .filter((id) => id !== state.wreckBoughtId)
                  .map((cardId) => (
                    <DevCard
                      key={cardId}
                      cardId={cardId}
                      state={state}
                      mode="wreck"
                      onClick={() => dispatch({ type: "wreck", cardId })}
                    />
                  ))}
              </div>
            </dialog>
          )}

          {state.phase === "upgrade" && (
            <dialog className="scroll wide" open>
              <h2>A seal of favor</h2>
              {state.lastWin && (
                <p>
                  {state.lastWin.prestige}/{state.lastWin.target}. Overshoot {state.lastWin.overshoot}{" "}
                  paid ${state.lastWin.money}
                  {state.lastWin.boss ? " (boss purse)." : "."}
                  {state.lastWin.bankedTurns > 0
                    ? ` Banked ${state.lastWin.bankedTurns} leftover turns.`
                    : ""}
                </p>
              )}
              <p>Tap a charter, then tap a rank-locked seal. Seals stay under your pick.</p>
              {upgradeCard && (
                <div className="seal-panel">
                  <DevCard cardId={upgradeCard} state={state} mode="pick" selected />
                  <h3>
                    Seals for{" "}
                    {defOf(upgradeCard).rank === 1 ? "★" : defOf(upgradeCard).rank === 2 ? "★★" : "★★★"}
                  </h3>
                  <div className="seal-grid">
                    {upgradesForRank(defOf(upgradeCard).rank).map((upgrade) => (
                      <UpgradeChip
                        key={upgrade.id}
                        id={upgrade.id}
                        onClick={() => {
                          dispatch({
                            type: "choose-upgrade",
                            cardId: upgradeCard,
                            upgradeId: upgrade.id,
                          });
                          setUpgradeCard(null);
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
              <div className="card-grid">
                {eligibleUpgrades.map((cardId) => (
                  <DevCard
                    key={cardId}
                    cardId={cardId}
                    state={state}
                    mode="pick"
                    selected={upgradeCard === cardId}
                    onClick={() => setUpgradeCard(cardId)}
                  />
                ))}
              </div>
            </dialog>
          )}

          {state.phase === "scrap" && (
            <dialog className="scroll" open>
              <h2>Scrap</h2>
              <p>Permanently destroy this charter, or keep it in the collection.</p>
              <DevCard cardId={state.pendingScrap[0] ?? null} state={state} />
              <div className="actions">
                <button onClick={() => dispatch({ type: "scrap", destroy: true })}>Destroy it</button>
                <button className="ghost" onClick={() => dispatch({ type: "scrap", destroy: false })}>
                  Keep it
                </button>
              </div>
            </dialog>
          )}

          {state.phase === "exile" && (
            <dialog className="scroll wide" open>
              <h2>Exile</h2>
              <p>Tap a ★ or ★★ charter to destroy it forever.</p>
              <div className="card-grid">
                {state.collection
                  .filter((card) => defOf(card.id).rank < 3)
                  .map((card) => (
                    <DevCard
                      key={card.id}
                      cardId={card.id}
                      state={state}
                      mode="pick"
                      onClick={() => dispatch({ type: "exile", cardId: card.id })}
                    />
                  ))}
              </div>
            </dialog>
          )}

          {(state.phase === "shop" ||
            state.phase === "enhance-card" ||
            state.phase === "enhance-upgrade" ||
            state.phase === "dismantle") && (
            <dialog className="scroll wide shop" open>
              <h2>The royal shop</h2>
              <p>
                Spend the purse after a win. Enhance ${ENHANCE_COST} · Dismantle ${DISMANTLE_COST} ·
                each once. Purse ${state.wallet}.
              </p>
              <div className="stalls">
                <article className="stall enhance">
                  <svg viewBox="0 0 120 80" className="stall-art" aria-hidden="true">
                    <rect x="8" y="28" width="104" height="44" rx="6" fill="#6b3a1f" />
                    <polygon points="8,28 60,6 112,28" fill="#c9a227" />
                    <circle cx="60" cy="48" r="14" fill="#f0d77a" />
                    <path d="M54 48 h12 M60 42 v12" stroke="#6b3a1f" strokeWidth="3" />
                  </svg>
                  <h3>Enhance</h3>
                  <p>Attach one rank-legal seal to any unupgraded charter.</p>
                  <button
                    disabled={state.shop.enhance || state.wallet < ENHANCE_COST || state.phase !== "shop"}
                    onClick={() => dispatch({ type: "shop-enhance" })}
                  >
                    {state.shop.enhance ? "Sold" : `Buy · $${ENHANCE_COST}`}
                  </button>
                </article>
                <article className="stall dismantle">
                  <svg viewBox="0 0 120 80" className="stall-art" aria-hidden="true">
                    <rect x="8" y="28" width="104" height="44" rx="6" fill="#3d2a33" />
                    <polygon points="8,28 60,8 112,28" fill="#8a6a4b" />
                    <polygon points="48,40 72,44 58,68 40,60" fill="#b4232c" />
                    <path d="M44 36 L76 68" stroke="#f4e4b2" strokeWidth="3" />
                  </svg>
                  <h3>Dismantle</h3>
                  <p>Permanently destroy one collection charter.</p>
                  <button
                    disabled={
                      state.shop.dismantle || state.wallet < DISMANTLE_COST || state.phase !== "shop"
                    }
                    onClick={() => dispatch({ type: "shop-dismantle" })}
                  >
                    {state.shop.dismantle ? "Sold" : `Buy · $${DISMANTLE_COST}`}
                  </button>
                </article>
              </div>

              {state.phase === "enhance-card" && (
                <>
                  <h3>Tap a charter to enhance</h3>
                  <div className="card-grid">
                    {state.collection
                      .filter((card) => !card.upgrade)
                      .map((card) => (
                        <DevCard
                          key={card.id}
                          cardId={card.id}
                          state={state}
                          mode="pick"
                          onClick={() => dispatch({ type: "pick-enhance-card", cardId: card.id })}
                        />
                      ))}
                  </div>
                </>
              )}

              {state.phase === "enhance-upgrade" && state.enhanceCardId && (
                <>
                  <h3>Tap a seal</h3>
                  <div className="seal-grid">
                    {upgradesForRank(defOf(state.enhanceCardId).rank).map((upgrade) => (
                      <UpgradeChip
                        key={upgrade.id}
                        id={upgrade.id}
                        onClick={() =>
                          dispatch({ type: "pick-enhance-upgrade", upgradeId: upgrade.id })
                        }
                      />
                    ))}
                  </div>
                </>
              )}

              {state.phase === "dismantle" && (
                <>
                  <h3>Tap a charter to dismantle</h3>
                  <div className="card-grid">
                    {state.collection.map((card) => (
                      <DevCard
                        key={card.id}
                        cardId={card.id}
                        state={state}
                        mode="pick"
                        onClick={() => dispatch({ type: "pick-dismantle", cardId: card.id })}
                      />
                    ))}
                  </div>
                </>
              )}

              {state.phase === "shop" && (
                <button className="ghost" onClick={() => dispatch({ type: "shop-skip" })}>
                  Leave the shop
                </button>
              )}
            </dialog>
          )}
        </div>
      )}
    </div>
  );
}
