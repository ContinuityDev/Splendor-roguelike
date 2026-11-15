import { JOB_LABEL, UPGRADE_BY_ID } from "../game/upgrades";
import type { UpgradeId } from "../game/types";

const JOB_MARK: Record<string, string> = {
  E: "₵",
  S: "⌛",
  P: "♔",
  D: "⚒",
};

export function UpgradeChip({
  id,
  selected = false,
  onClick,
}: {
  id: UpgradeId;
  selected?: boolean;
  onClick?: () => void;
}) {
  const def = UPGRADE_BY_ID[id];
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      className={`seal seal-${def.job} ${selected ? "is-selected" : ""}`}
      onClick={onClick}
      type={onClick ? "button" : undefined}
      aria-label={`${def.name}. ${JOB_LABEL[def.job]}. ${def.blurb}`}
    >
      <span className="seal-ring">
        <span className="seal-job">{JOB_MARK[def.job]}</span>
      </span>
      <span className="seal-copy">
        <strong>{def.name}</strong>
        <em>{JOB_LABEL[def.job]}</em>
        <small>{def.blurb}</small>
      </span>
    </Tag>
  );
}

export function MiniSeal({ id }: { id: UpgradeId }) {
  const def = UPGRADE_BY_ID[id];
  return (
    <span className={`mini-seal seal-${def.job}`}>
      {def.name}
    </span>
  );
}
