export const teamNames = ["대표팀", "교육팀", "장비팀", "홍보팀", "지원팀"] as const;

export type TeamName = (typeof teamNames)[number];
export type MemberGrade = "예비신사" | "신사" | "구사";
export type MemberRole = "관리자" | "회원";
export type MemberPosition = "대표" | "부대표" | "교육팀장" | "장비팀장" | "홍보팀장" | "";

export type ClubMember = {
  id: string;
  name: string;
  joinTerm: string;
  grade: MemberGrade;
  role: MemberRole;
  position?: MemberPosition;
  team?: TeamName | "";
};

const positionTeams: Partial<Record<MemberPosition, TeamName>> = {
  대표: "대표팀",
  부대표: "대표팀",
  교육팀장: "교육팀",
  장비팀장: "장비팀",
  홍보팀장: "홍보팀",
};

export const leaderPositionForTeam: Partial<Record<TeamName, MemberPosition>> = {
  대표팀: "대표",
  교육팀: "교육팀장",
  장비팀: "장비팀장",
  홍보팀: "홍보팀장",
};

export const teamForPosition = (position?: MemberPosition): TeamName | "" =>
  (position && positionTeams[position]) || "";

export const memberTeam = (member: Pick<ClubMember, "position" | "team">): TeamName | "" =>
  teamForPosition(member.position) || (member.team && teamNames.includes(member.team) ? member.team : "");

export const normalizeMemberTeam = memberTeam;

export const validMemberTerm = (term: unknown): term is string =>
  typeof term === "string" && /^\d{2}-[12]$/.test(term);

export const termIndex = (term: string): number => {
  const safeTerm = validMemberTerm(term) ? term : "00-1";
  const [year, semester] = safeTerm.split("-").map(Number);
  return year * 2 + semester - 1;
};

export const gradeFor = (joinTerm: string, currentTerm: string): MemberGrade => {
  const gap = termIndex(currentTerm) - termIndex(joinTerm);
  return gap <= 0 ? "예비신사" : gap === 1 ? "신사" : "구사";
};
