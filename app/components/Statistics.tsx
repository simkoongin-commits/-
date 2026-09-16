"use client";

import { useMemo, useState } from "react";
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
const hallRanks: HallRank[] = ["초1중", "초2중", "초3중", "초4중", "초몰기", "단"];

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
}: {
  session: StatisticsMember;
  members: StatisticsMember[];
  currentTerm: string;
  stats: PracticeStats;
  archives: ArchivedPractice[];
  hall: HallOfFame;
}) {
  const [periodMode, setPeriodMode] = useState<PeriodMode>("month");
  const [month, setMonth] = useState(currentMonthKey());
  const [term, setTerm] = useState(currentTerm);
  const [kind, setKind] = useState<PracticeKind | "all">("all");
  const [openCohortStage, setOpenCohortStage] = useState("");
  const [openMemberGroup, setOpenMemberGroup] = useState<"all" | StatisticsMember["grade"] | null>(null);
  const [openCohortPopulation, setOpenCohortPopulation] = useState("");
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
  const cohortPopulation = cohortRows.slice().reverse().map((cohort) => ({ cohort, members: members.filter((member) => member.joinTerm === cohort) }));
  const maxCohortPopulation = Math.max(1, ...cohortPopulation.map((item) => item.members.length));
  const selectedMemberGroup = openMemberGroup === "all" ? members : openMemberGroup ? members.filter((member) => member.grade === openMemberGroup) : [];
  const monthlyActivity = Array.from(archives.reduce((groups, practice) => {
    const month = practice.date.slice(0, 7);
    const current = groups.get(month) || { month, practices: 0, trackedPractices: 0, attendance: 0 };
    current.practices += 1;
    if (practice.tracked) {
      current.trackedPractices += 1;
      current.attendance += practice.attendanceCount;
    }
    groups.set(month, current);
    return groups;
  }, new Map<string, { month: string; practices: number; trackedPractices: number; attendance: number }>()).values()).sort((a, b) => a.month.localeCompare(b.month)).slice(-12);
  const maxMonthlyAttendance = Math.max(1, ...monthlyActivity.map((item) => item.attendance));
  const placeActivity = Array.from(archives.reduce((groups, practice) => {
    const place = practice.place || "장소 미정";
    const current = groups.get(place) || { place, practices: 0, trackedPractices: 0, attendance: 0 };
    current.practices += 1;
    if (practice.tracked) {
      current.trackedPractices += 1;
      current.attendance += practice.attendanceCount;
    }
    groups.set(place, current);
    return groups;
  }, new Map<string, { place: string; practices: number; trackedPractices: number; attendance: number }>()).values()).sort((a, b) => b.attendance - a.attendance || b.practices - a.practices || a.place.localeCompare(b.place, "ko"));

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
        <div className="stats-section-head"><div><small>활동 추이</small><h3>월별 습사 활동</h3></div><span className="stats-range-note">최근 12개월</span></div>
        {monthlyActivity.length ? <div className="monthly-activity-list">{monthlyActivity.map((item) => <article key={item.month}><header><b>{item.month.replace("-", ". ")}</b><span>습사 {item.practices}회 · 출석 {item.attendance}명 · 평균 {item.trackedPractices ? (item.attendance / item.trackedPractices).toFixed(1) : "-"}명</span></header><div><i style={{ width: `${(item.attendance / maxMonthlyAttendance) * 100}%` }} /></div></article>)}</div> : <p className="stats-empty-card">아직 보관된 월별 활동 기록이 없어요.</p>}
      </section>

      <section className="stats-section">
        <div className="stats-section-head"><div><small>장소 통계</small><h3>장소별 참여 현황</h3></div></div>
        {placeActivity.length ? <div className="place-stat-list">{placeActivity.map((item) => <article key={item.place}><div><b>{item.place}</b><small>습사 {item.practices}회</small></div><strong>{item.attendance}<i>명</i></strong><span>평균 {item.trackedPractices ? (item.attendance / item.trackedPractices).toFixed(1) : "-"}명</span></article>)}</div> : <p className="stats-empty-card">아직 보관된 장소별 기록이 없어요.</p>}
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
          <button className={openMemberGroup === "all" ? "active" : ""} onClick={() => setOpenMemberGroup((current) => current === "all" ? null : "all")}><small>전체 회원</small><strong>{members.length}<i>명</i></strong></button>
        </div>
        <div className="distribution-row">{(["예비신사", "신사", "구사"] as const).map((grade) => <button className={openMemberGroup === grade ? "active" : ""} key={grade} onClick={() => setOpenMemberGroup((current) => current === grade ? null : grade)}><b>{grade}</b>{members.filter((member) => member.grade === grade).length}명</button>)}</div>
        {openMemberGroup && <div className="member-group-detail"><header><b>{openMemberGroup === "all" ? "전체 회원" : openMemberGroup}</b><span>{selectedMemberGroup.length}명</span></header>{selectedMemberGroup.length ? <div>{selectedMemberGroup.slice().sort((a, b) => a.name.localeCompare(b.name, "ko")).map((member) => <span key={member.id}><b>{member.name}</b><small>{member.joinTerm} · {roleLabel(member)}</small></span>)}</div> : <p>해당 회원이 없어요.</p>}</div>}
      </section>

      <section className="stats-section">
        <div className="stats-section-head"><div><small>회원 유지 현황</small><h3>입부 시기별 현재 인원</h3></div></div>
        <div className="cohort-chart" aria-label="입부 시기별 현재 회원 수 막대그래프">
          <div className="cohort-chart-y"><span>{maxCohortPopulation}</span><span>{Math.ceil(maxCohortPopulation / 2)}</span><span>0</span></div>
          <div className="cohort-chart-scroll"><div className="cohort-bars">{cohortPopulation.map((item) => <button className={openCohortPopulation === item.cohort ? "active" : ""} key={item.cohort} title={`${item.cohort} 입부 · ${item.members.length}명`} onClick={() => setOpenCohortPopulation((current) => current === item.cohort ? "" : item.cohort)}><strong>{item.members.length}</strong><div><i style={{ height: `${(item.members.length / maxCohortPopulation) * 100}%` }} /></div><span>{item.cohort}</span></button>)}</div></div>
        </div>
        {openCohortPopulation && (() => {
          const selected = cohortPopulation.find((item) => item.cohort === openCohortPopulation);
          return selected && <div className="cohort-population-detail"><header><b>{selected.cohort} 입부</b><span>{selected.members.length}명</span></header><div>{selected.members.slice().sort((a, b) => a.name.localeCompare(b.name, "ko")).map((member) => <span key={member.id}><b>{member.name}</b><small>{roleLabel(member)}</small></span>)}</div></div>;
        })()}
      </section>

      <section className="stats-section">
        <div className="stats-section-head"><div><small>초중 현황</small><h3>입부 학기별 현재 단계</h3></div></div>
        <div className="cohort-card-list">
          {cohortRows.map((cohort) => (
            <article className="cohort-card" key={cohort}>
              <header><b>{cohort}</b><span>입부</span></header>
              <div className="cohort-stage-list">
                {hallRanks.map((rank, index) => {
                  const stageMembers = members.filter((member) => member.joinTerm === cohort && hall[rank].includes(member.id));
                  const key = `${cohort}-${rank}`;
                  return (
                    <button className={`cohort-stage stage-${index + 1} ${stageMembers.length === 0 ? "empty" : ""} ${openCohortStage === key ? "open" : ""}`} key={rank} onClick={() => setOpenCohortStage((current) => current === key ? "" : key)}>
                      <span>{rank}</span><strong>{stageMembers.length}<i>명</i></strong>
                      {openCohortStage === key && <small>{stageMembers.length ? stageMembers.map((member) => member.name).join(" · ") : "해당 단계의 회원이 없어요."}</small>}
                    </button>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      </section>
      <p className="stats-retention-note">상세 출석 명단은 습사 종료 하루 뒤 삭제되고 숫자 통계만 남아요.</p>
    </section>
  );
}
