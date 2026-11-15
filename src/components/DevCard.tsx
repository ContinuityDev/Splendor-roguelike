import { defOf, HOUSE, houseTitle, isAffordable, printedCost, printedPrestige, stars } from "../game/engine";
import type { Cost, GameState, GemColor } from "../game/types";
import { GEM_COLORS } from "../game/types";
import { GemIcon } from "./GemIcon";
import { MiniSeal } from "./UpgradeChip";

function CostRow({ cost }: { cost: Cost }) {
  return (
    <span className="cost-row">
      {GEM_COLORS.filter((color) => (cost[color] ?? 0) > 0).map((color) => (
        <span key={color} className="cost-pip">
          <GemIcon color={color} size={16} />
          <span>{cost[color]}</span>
        </span>
      ))}
    </span>
  );
}

export function DevCard({
  cardId,
  state,
  mode,
  selected,
  onClick,
}: {
  cardId: string | null;
  state: GameState;
  mode?: "buy" | "reserve" | "pick" | "wreck";
  selected?: boolean;
  onClick?: () => void;
}) {
  if (!cardId) {
    return <article className="patent empty">Empty lectern</article>;
  }

  const def = defOf(cardId);
  const owned = state.collection.find((card) => card.id === cardId);
  const prestige = printedPrestige(def, owned?.upgrade);
  const cost = printedCost(def, owned?.upgrade);
  const house = HOUSE[def.bonus as GemColor];
  const affordable = mode === "buy" && isAffordable(state, cardId);

  return (
    <button
      type="button"
      className={`patent rank-${def.rank} bonus-${def.bonus} ${affordable ? "is-affordable" : ""} ${selected ? "is-selected" : ""}`}
      onClick={onClick}
      disabled={!onClick}
    >
      <header>
        <span className="rank">{stars(def.rank)}</span>
        <span className="prestige" title="Prestige">
          {prestige}
        </span>
      </header>
      <div className="blazon">
        <GemIcon color={def.bonus} size={42} />
        <p>
          <strong>{house.gem}</strong>
          <span>{houseTitle(def)}</span>
        </p>
      </div>
      <CostRow cost={cost} />
      {owned?.upgrade && <MiniSeal id={owned.upgrade} />}
      {mode === "buy" && (
        <span className="tap-hint">{affordable ? "Tap to buy" : "Too dear"}</span>
      )}
      {mode === "reserve" && <span className="tap-hint">Tap to reserve</span>}
      {mode === "wreck" && <span className="tap-hint">Tap to wreck</span>}
      {mode === "pick" && <span className="tap-hint">{selected ? "Selected" : "Tap to choose"}</span>}
    </button>
  );
}
