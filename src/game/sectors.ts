import type { RoundInSector } from "./types";

export function sectorFirstTarget(sector: number): number {
  if (sector < 1) throw new Error("Sector starts at 1");
  if (sector === 1) return 1;
  const prevFirst = sectorFirstTarget(sector - 1);
  const prevBoss = prevFirst + 2;
  return prevFirst + prevBoss;
}

export function roundTarget(sector: number, roundInSector: RoundInSector): number {
  return sectorFirstTarget(sector) + (roundInSector - 1);
}

export function isBoss(roundInSector: RoundInSector): boolean {
  return roundInSector === 3;
}

export function moneyFromWin(
  prestige: number,
  target: number,
  boss: boolean,
): { overshoot: number; money: number } {
  const overshoot = Math.max(0, prestige - target);
  return { overshoot, money: boss ? 2 * overshoot : overshoot };
}
