"use client";

import { useState } from "react";
import { nextTerm, termOrder, type TermSnapshot, type WithdrawalRecord } from "@/lib/membershipHistory";
import { memberDisplayLabel } from "@/lib/memberDisplay";

type StatisticsMember = {
  id: string;
  name: string;
  joinTerm: string;
  grade: "예비신사" | "신사" | "구사";
  position?: string;
  team?: string;
};
type HallRank = "초1중" | "초2중" | "초3중" | "초4중" | "초몰기" | "단";
type HallOfFame = Record<HallRank, string[]>;
const hallRanks: HallRank[] = ["초1중", "초2중", "초3중", "초4중", "초몰기", "단"];

export default function Statistics({ members, currentTerm, snapshots, withdrawals, hall }: {
  members: StatisticsMember[];
  currentTerm: string;
  snapshots: TermSnapshot[];
  withdrawals: WithdrawalRecord[];
  hall: HallOfFame;
}) {
  const [openMemberGroup, setOpenMemberGroup] = useState<"all" | StatisticsMember["grade"] | null>(null);
  const [openCohort, setOpenCohort] = useState("");
  const [openStage, setOpenStage] = useState("");
  const [openTransition, setOpenTransition] = useState("");
  const cohorts = Array.from(new Set(members.map((member) => member.joinTerm))).sort((a, b) => termOrder(a) - termOrder(b));
  const maxCohort = Math.max(1, ...cohorts.map((term) => members.filter((member) => member.joinTerm === term).length));
  const selectedMembers = openMemberGroup === "all" ? members : members.filter((member) => member.grade === openMemberGroup);
  const transitionRows = snapshots.filter((snapshot) => termOrder(snapshot.term) < termOrder(currentTerm)).sort((a, b) => termOrder(b.term) - termOrder(a.term)).map((snapshot) => {
    const destination = nextTerm(snapshot.term);
    const nextMembers = destination === currentTerm ? members : snapshots.find((item) => item.term === destination)?.members;
    const departed = withdrawals.filter((item) => item.withdrawnTerm === destination && snapshot.members.some((member) => member.name === item.name && member.joinTerm === item.joinTerm));
    const nextIds = new Set(nextMembers?.map((member) => member.id));
    const retained = nextMembers ? snapshot.members.filter((member) => nextIds.has(member.id) && !departed.some((item) => item.name === member.name && item.joinTerm === member.joinTerm)) : [];
    return { origin: snapshot.term, destination, retained, departed, known: Boolean(nextMembers), count: snapshot.members.length };
  });

  return <section className="content statistics-page">
    <div className="section-head"><div><h2>통계</h2><p>회원 구성과 학기별 재등록 현황을 확인해요.</p></div></div>

    <section className="stats-section">
      <div className="stats-section-head"><div><small>회원 현황</small><h3>현재 회원</h3></div></div>
      <div className="stats-metric-grid compact">{(["all", "예비신사", "신사", "구사"] as const).map((grade) => <button key={grade} className={openMemberGroup === grade ? "active" : ""} onClick={() => setOpenMemberGroup(openMemberGroup === grade ? null : grade)}><small>{grade === "all" ? "총 인원" : grade}</small><strong>{grade === "all" ? members.length : members.filter((member) => member.grade === grade).length}<i>명</i></strong></button>)}</div>
      {openMemberGroup && <div className="member-group-detail"><header><b>{openMemberGroup === "all" ? "전체 회원" : openMemberGroup}</b><span>{selectedMembers.length}명</span></header>{selectedMembers.length ? <div>{selectedMembers.slice().sort((a, b) => a.name.localeCompare(b.name, "ko")).map((member) => <span key={member.id}><b>{member.name}</b><small>{member.joinTerm} 입부 · {memberDisplayLabel(member)}</small></span>)}</div> : <p>해당 회원이 없어요.</p>}</div>}
    </section>

    <section className="stats-section">
      <div className="stats-section-head"><div><small>재등록 현황</small><h3>학기별 회원 유지</h3></div></div>
      <p className="stats-range-note">학기별 명단 기록을 시작한 시점부터 표시해요. 과거 학기는 소급하지 않아요.</p>
      {transitionRows.length ? <div className="retention-list">{transitionRows.map((row) => <article key={row.origin}><button onClick={() => setOpenTransition(openTransition === row.origin ? "" : row.origin)}><b>{row.origin} → {row.destination}</b><span>{row.known ? `기존 ${row.count}명 · 재등록 ${row.retained.length}명 · 탈퇴 ${row.departed.length}명` : "다음 학기 기록 대기"}</span></button>{openTransition === row.origin && <div className="retention-detail"><h4>남아 있는 회원</h4><p>{row.retained.length ? row.retained.map((member) => `${member.name} (${member.joinTerm} 입부)`).join(" · ") : "기록 없음"}</p><h4>심궁회 탈퇴</h4><p>{row.departed.length ? row.departed.map((record) => `${record.name} (${record.joinTerm} 입부)`).join(" · ") : "기록 없음"}</p></div>}</article>)}</div> : <p className="stats-empty-card">학기가 변경되면 재등록 비교를 시작해요.</p>}
    </section>

    <section className="stats-section">
      <div className="stats-section-head"><div><small>회원 유지 현황</small><h3>입부 시기별 현재 인원</h3></div></div>
      <div className="cohort-chart" aria-label="입부 시기별 현재 회원 수 막대그래프"><div className="cohort-chart-y"><span>{maxCohort}</span><span>{Math.ceil(maxCohort / 2)}</span><span>0</span></div><div className="cohort-chart-scroll"><div className="cohort-bars">{cohorts.map((cohort) => { const cohortMembers = members.filter((member) => member.joinTerm === cohort); return <button className={openCohort === cohort ? "active" : ""} key={cohort} onClick={() => setOpenCohort(openCohort === cohort ? "" : cohort)}><strong>{cohortMembers.length}</strong><div><i style={{ height: `${cohortMembers.length / maxCohort * 100}%` }} /></div><span>{cohort}</span></button>; })}</div></div></div>
      {openCohort && <div className="cohort-population-detail"><header><b>{openCohort} 입부</b></header><div>{members.filter((member) => member.joinTerm === openCohort).map((member) => <span key={member.id}><b>{member.name}</b><small>{memberDisplayLabel(member)}</small></span>)}</div></div>}
    </section>

    <section className="stats-section"><div className="stats-section-head"><div><small>초중 현황</small><h3>입부 학기별 현재 단계</h3></div></div><div className="cohort-card-list">{cohorts.slice().reverse().map((cohort) => <article className="cohort-card" key={cohort}><header><b>{cohort}</b><span>입부</span></header><div className="cohort-stage-list">{hallRanks.map((rank, index) => { const stageMembers = members.filter((member) => member.joinTerm === cohort && (hall[rank] || []).includes(member.id)); const key = `${cohort}-${rank}`; return <button className={`cohort-stage stage-${index + 1} ${stageMembers.length ? "" : "empty"} ${openStage === key ? "open" : ""}`} key={rank} onClick={() => setOpenStage(openStage === key ? "" : key)}><span>{rank}</span><strong>{stageMembers.length}<i>명</i></strong>{openStage === key && <small>{stageMembers.length ? stageMembers.map((member) => member.name).join(" · ") : "해당 단계의 회원이 없어요."}</small>}</button>; })}</div></article>)}</div></section>
  </section>;
}
