export type PracticeKind = "regular" | "general" | "competition";

export type StatsBucket = {
  eligible: number;
  applied: number;
  attended: number;
  regular: number;
  general: number;
  competition: number;
  regularEligible: number;
  generalEligible: number;
  competitionEligible: number;
};

export type MemberPracticeStat = {
  total: StatsBucket;
  months: Record<string, StatsBucket>;
  terms: Record<string, StatsBucket>;
};

export type PracticeStats = Record<string, MemberPracticeStat>;

export type ArchivedPractice = {
  id: number;
  title: string;
  type: PracticeKind;
  date: string;
  start: string;
  end: string;
  place: string;
  applicantCount: number;
  attendanceCount: number;
  tracked: boolean;
};

export type StatsMember = {
  id: string;
  name: string;
  joinTerm: string;
  practicePermission?: boolean;
};

export type StatsPractice = {
  id: number;
  title: string;
  type: PracticeKind;
  date: string;
  start: string;
  end: string;
  place: string;
  applicants: string[];
  applicantIds?: string[];
  attendeeIds?: string[];
  attendanceTracking?: boolean;
};

export const emptyStatsBucket = (): StatsBucket => ({
  eligible: 0,
  applied: 0,
  attended: 0,
  regular: 0,
  general: 0,
  competition: 0,
  regularEligible: 0,
  generalEligible: 0,
  competitionEligible: 0,
});

const normalizeBucket = (value?: Partial<StatsBucket>): StatsBucket => ({
  ...emptyStatsBucket(),
  ...(value || {}),
});

export const normalizePracticeStats = (value: unknown): PracticeStats => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value as Record<string, Partial<MemberPracticeStat>>).map(([id, stat]) => [id, {
    total: normalizeBucket(stat.total),
    months: Object.fromEntries(Object.entries(stat.months || {}).map(([key, bucket]) => [key, normalizeBucket(bucket)])),
    terms: Object.fromEntries(Object.entries(stat.terms || {}).map(([key, bucket]) => [key, normalizeBucket(bucket)])),
  }]));
};

export const termForDate = (date: string) => {
  const [year, month] = date.split("-").map(Number);
  if (month <= 2) return `${String(year - 1).slice(-2)}-2`;
  return `${String(year).slice(-2)}-${month <= 8 ? 1 : 2}`;
};

const termOrdinal = (term: string) => {
  const match = /^(\d{2})-([12])$/.exec(term);
  return match ? Number(match[1]) * 2 + Number(match[2]) - 1 : Number.MAX_SAFE_INTEGER;
};

const gradeAt = (joinTerm: string, eventTerm: string) => {
  const diff = termOrdinal(eventTerm) - termOrdinal(joinTerm);
  return diff <= 0 ? "예비신사" : diff === 1 ? "신사" : "구사";
};

const incrementBucket = (
  source: StatsBucket,
  kind: PracticeKind,
  eligible: boolean,
  applied: boolean,
  attended: boolean,
) => {
  const next = { ...source };
  if (eligible) {
    next.eligible += 1;
    next[`${kind}Eligible` as "regularEligible" | "generalEligible" | "competitionEligible"] += 1;
  }
  if (applied) next.applied += 1;
  if (attended) {
    next.attended += 1;
    next[kind] += 1;
  }
  return next;
};

export const archiveAndCountPractice = (
  source: PracticeStats,
  members: StatsMember[],
  practice: StatsPractice,
) => {
  const stats = normalizePracticeStats(source);
  const applicantIds = new Set(practice.applicantIds || []);
  practice.applicants.forEach((name) => {
    const member = members.find((item) => item.name === name);
    if (member) applicantIds.add(member.id);
  });
  const attendeeIds = new Set(practice.attendeeIds || []);
  const eventTerm = termForDate(practice.date);
  const month = practice.date.slice(0, 7);

  if (practice.attendanceTracking) {
    members.forEach((member) => {
      const applied = applicantIds.has(member.id);
      const attended = attendeeIds.has(member.id);
      const joined = termOrdinal(member.joinTerm) <= termOrdinal(eventTerm);
      const eligible = joined && (gradeAt(member.joinTerm, eventTerm) !== "예비신사" || Boolean(member.practicePermission) || applied || attended);
      if (!eligible && !applied && !attended) return;
      const current = stats[member.id] || { total: emptyStatsBucket(), months: {}, terms: {} };
      stats[member.id] = {
        total: incrementBucket(current.total, practice.type, eligible, applied, attended),
        months: {
          ...current.months,
          [month]: incrementBucket(current.months[month] || emptyStatsBucket(), practice.type, eligible, applied, attended),
        },
        terms: {
          ...current.terms,
          [eventTerm]: incrementBucket(current.terms[eventTerm] || emptyStatsBucket(), practice.type, eligible, applied, attended),
        },
      };
    });
  }

  const archived: ArchivedPractice = {
    id: practice.id,
    title: practice.title,
    type: practice.type,
    date: practice.date,
    start: practice.start,
    end: practice.end,
    place: practice.place,
    applicantCount: Math.max(applicantIds.size, practice.applicants.length),
    attendanceCount: attendeeIds.size,
    tracked: Boolean(practice.attendanceTracking),
  };
  return { stats, archived };
};

export const bucketForKind = (bucket: StatsBucket, kind: PracticeKind | "all") => ({
  attended: kind === "all" ? bucket.attended : bucket[kind],
  eligible: kind === "all" ? bucket.eligible : bucket[`${kind}Eligible` as "regularEligible" | "generalEligible" | "competitionEligible"],
});
