import { useId } from "react";
import type { GemColor } from "../game/types";

const GEM: Record<
  GemColor,
  { fill: string; shine: string; stroke: string; label: string }
> = {
  white: { fill: "#f4efe4", shine: "#ffffff", stroke: "#b7a989", label: "Pearl" },
  blue: { fill: "#2f6fbf", shine: "#9fd4ff", stroke: "#163a72", label: "Sapphire" },
  green: { fill: "#1f8a4c", shine: "#9dffc2", stroke: "#0c4a28", label: "Emerald" },
  red: { fill: "#b4232c", shine: "#ff9aa0", stroke: "#6b1016", label: "Ruby" },
  black: { fill: "#2a2729", shine: "#8d8790", stroke: "#09080a", label: "Onyx" },
};

export function GemIcon({
  color,
  size = 28,
  count,
}: {
  color: GemColor;
  size?: number;
  count?: number;
}) {
  const gem = GEM[color];
  const fillId = useId().replace(/:/g, "");
  return (
    <span className={`gem gem-${color}`} title={gem.label} style={{ width: size, height: size }}>
      <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
        <defs>
          <linearGradient id={fillId} x1="20%" y1="0%" x2="80%" y2="100%">
            <stop offset="0%" stopColor={gem.shine} />
            <stop offset="55%" stopColor={gem.fill} />
            <stop offset="100%" stopColor={gem.stroke} />
          </linearGradient>
        </defs>
        <polygon
          points="32,4 56,24 46,60 18,60 8,24"
          fill={`url(#${fillId})`}
          stroke={gem.stroke}
          strokeWidth="3"
        />
        <polygon points="32,8 48,24 32,30 16,24" fill={gem.shine} opacity="0.55" />
        <polygon points="18,38 32,30 28,56" fill="#000" opacity="0.12" />
      </svg>
      {count !== undefined && <b>{count}</b>}
    </span>
  );
}

export { GEM };
