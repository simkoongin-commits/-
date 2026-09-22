export type DisplayMember = {
  grade: "예비신사" | "신사" | "구사";
  position?: string;
  team?: string;
};

// An official position is the display name; other team members show grade + team.
export const memberDisplayLabel = (member: DisplayMember) =>
  member.position || (member.team ? `${member.grade}-${member.team}` : member.grade);
