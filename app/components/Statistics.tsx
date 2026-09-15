"use client";

import { useMemo, useState } from "react";
import type { Equipment } from "@/lib/equipment";
import {
  bucketForKind,
  emptyStatsBucket,
  termForDate,
  type ArchivedPractice,
  type PracticeKind,
  type PracticeStats,
  type StatsBucket,
} from "@/lib/practiceStats";

type StatisticsMember = {
  id: string;
  name: string;
  joinTerm: string;
  grade: "예비신사" | "신사" | "구사";
  role: "관리자" | "회원";
  position?: string;
  team?: string;
};

type HallRank = "초1중" | "초2중" | "초3중" | "초4중" | "초몰기" | "단";
type HallOfFame = Record<HallRank, string[]>;
type PeriodMode = "month" | "term";

const kinds: Array<{ value: PracticeKind | "all"; label: string }> = [
  { value: "all", label: "전체" },
  { value: "regular", label: "정규습사" },
  { value: "general", label: "자유습사" },
  { value: "competition", label: "대회" },
];

const percentage = (part: number, total: number) => total ? Math.round((part / total) * 100) : 0;
const currentMonthKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};
const roleLabel = (member: StatisticsMember) => member.role === "관리자" && member.position ? member.position : member.grade;
const rankedWithTies = <T,>(items: T[], value: (item: T) => number) => {
  let previous: number | undefined;
  let currentRank = 0;
  return items.map((item, index) => {
    const score = value(item);
    if (score !== previous) currentRank = index + 1;
    previous = score;
    return { ...item, rank: currentRank };
  });
};

export default function Statistics({
  session,
  members,
  currentTerm,
  stats,
  archives,
  hall,
  equipment,
}: {
  session: StatisticsMember;
  members: StatisticsMember[];
  currentTerm: string;
  stats: PracticeStats;
  archives: ArchivedPractice[];
  hall: HallOfFame;
  equipment: Equipment[];
}) {
  const [periodMode, setPeriodMode] = useState<PeriodMode>("month");
  const [month, setMonth] = useState(currentMonthKey());
  const [term, setTerm] = useState(currentTerm);
  const [kind, setKind] = useState<PracticeKind | "all">("all");
  const periodKey = periodMode === "month" ? month : term;
  const monthOptions = useMemo(() => Array.from(new Set([
    currentMonthKey(),
    ...archives.map((item) => item.date.slice(0, 7)),
    ...Object.values(stats).flatMap((item) => Object.keys(item.months)),
  ])).sort().reverse(), [archives, stats]);
  const termOptions = useMemo(() => Array.from(new Set([
    currentTerm,
    ...Object.values(stats).flatMap((item) => Object.keys(item.terms)),
  ])).sort().reverse(), [currentTerm, stats]);
  const bucketFor = (memberId: string): StatsBucket => {
    const memberStat = stats[memberId];
    if (!memberStat) return emptyStatsBucket();
    return periodMode === "month"
      ? memberStat.months[periodKey] || emptyStatsBucket()
      : memberStat.terms[periodKey] || emptyStatsBucket();
  };
  const selectedArchives = archives.filter((item) => item.tracked && (periodMode === "month" ? item.date.startsWith(periodKey) : termForDate(item.date) === periodKey));
  const ranked = members.map((member) => {
    const bucket = bucketFor(member.id);
    const selected = bucketForKind(bucket, kind);
    return { member, bucket, ...selected, rate: percentage(selected.attended, selected.eligible) };
  }).sort((a, b) => b.attended - a.attended || b.rate - a.rate || a.member.name.localeCompare(b.member.name, "ko"));
  const countRanked = rankedWithTies(ranked.filter((item) => item.attended > 0), (item) => item.attended);
  const rateRanked = rankedWithTies(ranked.filter((item) => item.eligible >= 3).slice().sort((a, b) => b.rate - a.rate || b.attended - a.attended || a.member.name.localeCompare(b.member.name, "ko")), (item) => item.rate);
  const myTotal = stats[session.id]?.total || emptyStatsBucket();
  const myHall = (Object.entries(hall) as Array<[HallRank, string[]]>).find(([, ids]) => ids.includes(session.id))?.[0];
  const trackedAttendance = selectedArchives.reduce((sum, item) => sum + item.attendanceCount, 0);
  const trackedApplicants = selectedArchives.reduce((sum, item) => sum + item.applicantCount, 0);
  const cohortRows = Array.from(new Set(members.map((member) => member.joinTerm))).sort().reverse();
  const equipmentCounts = {
    total: equipment.length,
    available: equipment.filter((item) => item.status === "available" && item.manualAvailable).length,
    rented: equipment.filter((item) => item.status === "rented").length,
    lost: equipment.filter((item) => item.status === "lost").length,
    damaged: equipment.filter((item) => item.status === "damaged").length,
  };

  return (
    <section className="content statistics-page">
      <div className="section-head"><div><h2>통계</h2><p>출석체크가 적용된 습사부터 집계돼요.</p></div></div>

      <section className="stats-section personal-stats">
        <header><div><small>내 활동</small><h3>{session.name}</h3></div><span>{myHall || roleLabel(session)}</span></header>
        <div className="stats-metric-grid">
          <article><small>전체 출석</small><strong>{myTotal.attended}<i>회</i></strong></article>
          <article><small>이번 학기</small><strong>{stats[session.id]?.terms[currentTerm]?.attended || 0}<i>회</i></strong></article>
          <article><small>습사 참여율</small><strong>{percentage(myTotal.attended, myTotal.eligible)}<i>%</i></strong></article>
          <article><small>신청 이행률</small><strong>{percentage(myTotal.attended, myTotal.applied)}<i>%</i></strong></article>
        </div>
        <p>{session.joinTerm} 입부 · 정규 {myTotal.regular}회 · 자유 {myTotal.general}회 · 대회 {myTotal.competition}회</p>
      </section>

      <section className="stats-section">
        <div className="stats-section-head"><div><small>참여 랭킹</small><h3>{periodMode === "month" ? "월간" : "학기"} 습사 참여</h3></div><div className="stats-period-tabs"><button className={periodMode === "month" ? "active" : ""} onClick={() => setPeriodMode("month")}>한 달</button><button className={periodMode === "term" ? "active" : ""} onClick={() => setPeriodMode("term")}>학기</button></div></div>
        <div className="stats-filters">
          {periodMode === "month" ? <select value={month} onChange={(event) => setMonth(event.target.value)}>{monthOptions.map((item) => <option key={item}>{item}</option>)}</select> : <select value={term} onChange={(event) => setTerm(event.target.value)}>{termOptions.map((item) => <option key={item}>{item}</option>)}</select>}
          <select value={kind} onChange={(event) => setKind(event.target.value as PracticeKind | "all")}>{kinds.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
        </div>
        <div className="ranking-podium">
          {countRanked.slice(0, 3).map((item) => <article key={item.member.id}><span>{item.rank === 1 ? "🥇" : item.rank === 2 ? "🥈" : "🥉"}</span><b>{item.member.name}</b><strong>{item.attended}회</strong><small>{item.rank}위 · 참여율 {item.rate}%</small></article>)}
          {!countRanked.length && <p>아직 집계된 출석이 없어요.</p>}
        </div>
        <div className="member-stat-list">
          {rankedWithTies(ranked, (item) => item.attended).map((item) => <div key={item.member.id} className={item.member.id === session.id ? "mine" : ""}><span>{item.rank}</span><div><b>{item.member.name}</b><small>{item.member.joinTerm} · {roleLabel(item.member)}</small></div><strong>{item.attended}회</strong><em>{item.rate}%</em></div>)}
        </div>
        <div className="rate-ranking"><h4>참여율 랭킹 <small>참여 가능한 습사 3회 이상</small></h4>{rateRanked.length ? rateRanked.slice(0, 5).map((item) => <p key={item.member.id}><span>{item.rank}위 · {item.member.name}</span><b>{item.rate}%</b></p>) : <p className="stats-empty">아직 순위 조건을 충족한 회원이 없어요.</p>}</div>
      </section>

      <section className="stats-section">
        <div className="stats-section-head"><div><small>습사 운영</small><h3>{periodKey} 현황</h3></div></div>
        <div className="stats-metric-grid compact">
          <article><small>습사</small><strong>{selectedArchives.length}<i>회</i></strong></article>
          <article><small>평균 출석</small><strong>{selectedArchives.length ? (trackedAttendance / selectedArchives.length).toFixed(1) : "0"}<i>명</i></strong></article>
          <article><small>신청 이행률</small><strong>{percentage(trackedAttendance, trackedApplicants)}<i>%</i></strong></article>
          <article><small>전체 회원</small><strong>{members.length}<i>명</i></strong></article>
        </div>
        <div className="distribution-row">{(["예비신사", "신사", "구사"] as const).map((grade) => <span key={grade}><b>{grade}</b>{members.filter((member) => member.grade === grade).length}명</span>)}</div>
      </section>

      <section className="stats-section">
        <div className="stats-section-head"><div><small>초중 현황</small><h3>입부 학기별 현재 단계</h3></div></div>
        <div className="cohort-table-wrap"><table className="cohort-table"><thead><tr><th>입부</th>{(Object.keys(hall) as HallRank[]).map((rank) => <th key={rank}>{rank}</th>)}</tr></thead><tbody>{cohortRows.map((cohort) => <tr key={cohort}><th>{cohort}</th>{(Object.entries(hall) as Array<[HallRank, string[]]>).map(([rank, ids]) => <td key={rank} title={members.filter((member) => member.joinTerm === cohort && ids.includes(member.id)).map((member) => member.name).join(", ")}>{members.filter((member) => member.joinTerm === cohort && ids.includes(member.id)).length}</td>)}</tr>)}</tbody></table></div>
      </section>

      <section className="stats-section equipment-stats">
        <div className="stats-section-head"><div><small>장비 현황</small><h3>전체 {equipmentCounts.total}개</h3></div></div>
        <div><span>대여 가능 <b>{equipmentCounts.available}</b></span><span>대여 중 <b>{equipmentCounts.rented}</b></span><span>분실 <b>{equipmentCounts.lost}</b></span><span>손상 <b>{equipmentCounts.damaged}</b></span></div>
      </section>
      <p className="stats-retention-note">상세 출석 명단은 습사 종료 하루 뒤 삭제되고 숫자 통계만 남아요.</p>
    </section>
  );
}
