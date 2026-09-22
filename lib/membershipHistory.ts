export type MemberSnapshot = { id: string; name: string; joinTerm: string };
export type TermSnapshot = { term: string; members: MemberSnapshot[] };
export type WithdrawalRecord = { name: string; joinTerm: string; withdrawnTerm: string };

export const validTerm = (term: string) => /^\d{2}-[12]$/.test(term);
export const termOrder = (term: string) => {
  const [year, half] = term.split("-").map(Number);
  return year * 2 + half;
};
export const nextTerm = (term: string) => {
  const [year, half] = term.split("-").map(Number);
  return half === 1 ? `${String(year).padStart(2, "0")}-2` : `${String((year + 1) % 100).padStart(2, "0")}-1`;
};
export const memberSnapshot = (members: MemberSnapshot[]) => members.map(({ id, name, joinTerm }) => ({ id, name, joinTerm }));
export const normalizeTermSnapshots = (value: unknown): TermSnapshot[] =>
  Array.isArray(value) ? value.filter((item): item is TermSnapshot => validTerm(item?.term) && Array.isArray(item?.members))
    .map((item) => ({ term: item.term, members: memberSnapshot(item.members.filter((member) => typeof member?.id === "string" && typeof member?.name === "string" && typeof member?.joinTerm === "string")) })) : [];
export const normalizeWithdrawals = (value: unknown): WithdrawalRecord[] =>
  Array.isArray(value) ? value.filter((item): item is WithdrawalRecord => typeof item?.name === "string" && validTerm(item?.joinTerm) && validTerm(item?.withdrawnTerm))
    .map(({ name, joinTerm, withdrawnTerm }) => ({ name, joinTerm, withdrawnTerm })) : [];
