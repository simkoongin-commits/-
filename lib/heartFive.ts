export const directions = ["↖", "↑", "↗", "←", "→", "↙", "↓", "↘"] as const;
export type ShotMark = (typeof directions)[number] | "中";

export type HeartFiveRecord = {
  id: string;
  ownerUid: string;
  memberId: string;
  memberName: string;
  date: string;
  createdAt: string;
  shots: ShotMark[];
};

export const isShotMark = (value: unknown): value is ShotMark =>
  value === "中" || directions.some((direction) => direction === value);

export function recordStats(shots: readonly ShotMark[]) {
  const completedRounds = Math.floor(shots.length / 5);
  const completedShots = shots.slice(0, completedRounds * 5);
  const rounds = Array.from({ length: completedRounds }, (_, index) =>
    completedShots.slice(index * 5, index * 5 + 5),
  );
  const hits = completedShots.filter((shot) => shot === "中").length;
  const best = Math.max(0, ...rounds.map((round) => round.filter((shot) => shot === "中").length));
  return {
    hits,
    best,
    rounds: completedRounds,
    shotCount: shots.length,
    average: completedRounds ? Number((hits / completedRounds).toFixed(1)) : 0,
  };
}

export function isCompleteRecord(shots: readonly ShotMark[]): boolean {
  return shots.length > 0 && shots.length % 5 === 0 && shots.every(isShotMark);
}

export function parseHeartFiveRecord(id: string, value: Record<string, unknown>): HeartFiveRecord | null {
  if (
    typeof value.ownerUid !== "string" ||
    typeof value.memberId !== "string" ||
    typeof value.memberName !== "string" ||
    typeof value.date !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value.date) ||
    typeof value.createdAt !== "string" ||
    !Array.isArray(value.shots) ||
    value.shots.length === 0 ||
    !value.shots.every(isShotMark)
  ) return null;
  return {
    id,
    ownerUid: value.ownerUid,
    memberId: value.memberId,
    memberName: value.memberName,
    date: value.date,
    createdAt: value.createdAt,
    shots: value.shots,
  };
}
