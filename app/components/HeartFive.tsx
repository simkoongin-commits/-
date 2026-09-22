"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { collection, deleteDoc, doc, onSnapshot, query, setDoc, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  directions,
  parseHeartFiveRecord,
  recordStats,
  type HeartFiveRecord,
  type ShotMark,
} from "@/lib/heartFive";

// Existing /clubs rules already cover these individual record documents.
// The earlier nested collection needed a separate, undeployed rule and could not be read or saved.
const recordsQuery = query(collection(db, "clubs"), where("kind", "==", "heartFive"));
const today = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

function Target({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="heart-target" onClick={onClick} aria-label="관중, 中 기록">
      <span className="heart-target-bar" />
      <span className="heart-target-face"><span /></span>
    </button>
  );
}

function ShotPicker({ onPick, onClose }: { onPick: (mark: ShotMark) => void; onClose: () => void }) {
  return (
    <div className="heart-picker-backdrop">
      <div className="heart-picker" role="dialog" aria-modal="true" aria-label="시위 기록 선택">
        <div className="heart-picker-heading"><strong>시위 기록</strong><button type="button" onClick={onClose} aria-label="닫기">×</button></div>
        <p>화살 방향을 누르거나 과녁을 눌러 관중을 기록하세요.</p>
        <div className="heart-direction-grid">
          <button onClick={() => onPick(directions[0])} aria-label="왼쪽 위">↖</button>
          <button onClick={() => onPick(directions[1])} aria-label="위">↑</button>
          <button onClick={() => onPick(directions[2])} aria-label="오른쪽 위">↗</button>
          <button onClick={() => onPick(directions[3])} aria-label="왼쪽">←</button>
          <Target onClick={() => onPick("中")} />
          <button onClick={() => onPick(directions[4])} aria-label="오른쪽">→</button>
          <button onClick={() => onPick(directions[5])} aria-label="왼쪽 아래">↙</button>
          <button onClick={() => onPick(directions[6])} aria-label="아래">↓</button>
          <button onClick={() => onPick(directions[7])} aria-label="오른쪽 아래">↘</button>
        </div>
      </div>
    </div>
  );
}

function ShotTable({ shots, active = false, onNext, onEdit }: { shots: readonly ShotMark[]; active?: boolean; onNext?: () => void; onEdit?: (index: number) => void }) {
  const roundCount = Math.max(1, Math.ceil((shots.length + (active ? 1 : 0)) / 5));
  return (
    <div className="heart-table-scroll">
      <table className="heart-table">
        <thead><tr><th>순</th>{[1, 2, 3, 4, 5].map((shot) => <th key={shot}>{shot}시</th>)}<th>순점</th></tr></thead>
        <tbody>
          {Array.from({ length: roundCount }, (_, roundIndex) => {
            const roundShots = shots.slice(roundIndex * 5, roundIndex * 5 + 5);
            return <tr key={roundIndex}>
              <th>{roundIndex + 1}순</th>
              {[0, 1, 2, 3, 4].map((shotIndex) => {
                const index = roundIndex * 5 + shotIndex;
                const mark = shots[index];
                return <td key={shotIndex}>
                  {mark ? onEdit ? <button type="button" className={`heart-edit-shot ${mark === "中" ? "heart-hit" : "heart-miss"}`} onClick={() => onEdit(index)} aria-label={`${roundIndex + 1}순 ${shotIndex + 1}시 수정: ${mark}`}>{mark}</button> : <span className={mark === "中" ? "heart-hit" : "heart-miss"}>{mark}</span> :
                    active && index === shots.length ? <button type="button" className="heart-next-shot" onClick={onNext} aria-label={`${roundIndex + 1}순 ${shotIndex + 1}시 기록`}>＋</button> : null}
                </td>;
              })}
              <td className="heart-round-score">{roundShots.filter((shot) => shot === "中").length}中</td>
            </tr>;
          })}
        </tbody>
      </table>
    </div>
  );
}

function ShotSummary({ shots }: { shots: readonly ShotMark[] }) {
  const stats = recordStats(shots);
  return <div className="heart-summary">
    <span><small>시수</small><strong>{stats.hits}中</strong></span>
    <span><small>최고</small><strong>{stats.best}中</strong></span>
    <span><small>습사량</small><strong>{stats.rounds}순</strong></span>
    <span><small>총시수</small><strong>{stats.hits}중/{stats.rounds}순({stats.rounds * 5}시)</strong></span>
    <span><small>평</small><strong>{stats.average}中</strong></span>
  </div>;
}

export default function HeartFive({ ownerUid, memberId, memberName }: { ownerUid: string; memberId: string; memberName: string }) {
  const [tab, setTab] = useState<"records" | "statistics">("records");
  const [records, setRecords] = useState<HeartFiveRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [date, setDate] = useState(today);
  const [shots, setShots] = useState<ShotMark[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [recordId, setRecordId] = useState("");
  const [createdAt, setCreatedAt] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const saveVersion = useRef(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [memberFilter, setMemberFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  useEffect(() => onSnapshot(recordsQuery, (snapshot) => {
    setRecords(snapshot.docs.map((item) => parseHeartFiveRecord(item.id, item.data())).filter((item): item is HeartFiveRecord => item !== null));
    setLoading(false);
  }, () => {
    setLoading(false);
  }), []);

  const sorted = useMemo(() => [...records].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)), [records]);
  const mine = sorted.filter((record) => record.ownerUid === ownerUid);
  const memberOptions = useMemo(() => [...new Map(sorted.map((record) => [record.memberId, record.memberName])).entries()].sort((a, b) => a[1].localeCompare(b[1], "ko")), [sorted]);
  const visible = sorted.filter((record) => record.shots.length % 5 === 0 && (!memberFilter || record.memberId === memberFilter) && (!dateFilter || record.date === dateFilter));

  const persist = async (nextShots: ShotMark[], nextDate: string, id = recordId, timestamp = createdAt) => {
    if (!id || !nextDate) return;
    const version = ++saveVersion.current;
    setSaveStatus("saving");
    try {
      if (nextShots.length) await setDoc(doc(db, "clubs", id), { kind: "heartFive", ownerUid, memberId, memberName, date: nextDate, createdAt: timestamp, shots: nextShots });
      else await deleteDoc(doc(db, "clubs", id));
      if (version === saveVersion.current) setSaveStatus("saved");
    } catch {
      if (version === saveVersion.current) setSaveStatus("failed");
    }
  };

  const startNew = () => {
    saveVersion.current += 1;
    setRecordId(`heartFive-${crypto.randomUUID()}`);
    setCreatedAt(new Date().toISOString());
    setDate(today());
    setShots([]);
    setEditMode(false);
    setEditingIndex(null);
    setSaveStatus("idle");
    setAdding(true);
  };

  const openRecord = (record: HeartFiveRecord) => {
    saveVersion.current += 1;
    setRecordId(record.id);
    setCreatedAt(record.createdAt);
    setDate(record.date);
    setShots([...record.shots]);
    setEditMode(true);
    setEditingIndex(null);
    setSaveStatus("saved");
    setAdding(true);
    setTab("records");
  };

  const chooseMark = (mark: ShotMark) => {
    const nextShots = [...shots];
    if (editingIndex === null) nextShots.push(mark);
    else nextShots[editingIndex] = mark;
    setShots(nextShots);
    setEditingIndex(null);
    setPickerOpen(false);
    void persist(nextShots, date);
  };

  return <section className="content heart-five">
    <div className="section-head"><div><h2>心5시 心5중</h2><p>다섯 발씩 기록하고, 한 순의 흐름을 살펴보세요.</p></div></div>
    <div className="heart-tabs" role="tablist" aria-label="心5시 心5중 메뉴">
      <button type="button" role="tab" aria-selected={tab === "records"} className={tab === "records" ? "active" : ""} onClick={() => setTab("records")}>습사 기록</button>
      <button type="button" role="tab" aria-selected={tab === "statistics"} className={tab === "statistics" ? "active" : ""} onClick={() => setTab("statistics")}>습사 통계</button>
    </div>
    {tab === "records" && <>
      <div className="heart-list-heading"><h3>내 습사 기록</h3><button type="button" className="primary" onClick={startNew}>추가</button></div>
      {adding && <div className="heart-editor">
        <div className="heart-editor-head"><label>기록 날짜 <input type="date" value={date} onChange={(event) => { const nextDate = event.target.value; if (!nextDate) return; setDate(nextDate); void persist(shots, nextDate); }} /></label><button type="button" onClick={() => { setAdding(false); setPickerOpen(false); }}>닫기</button></div>
        <ShotTable shots={shots} active onNext={() => { setEditingIndex(null); setPickerOpen(true); }} onEdit={editMode ? (index) => { setEditingIndex(index); setPickerOpen(true); } : undefined} />
        <ShotSummary shots={shots} />
        <div className="heart-actions"><button type="button" onClick={() => setEditMode(!editMode)}>{editMode ? "수정 완료" : "수정"}</button>{editMode && <button type="button" disabled={!shots.length} onClick={() => { const nextShots = shots.slice(0, -1); setShots(nextShots); void persist(nextShots, date); }}>마지막 발 삭제</button>}<span className="heart-save-status" role="status">{saveStatus === "saving" ? "자동저장 중…" : saveStatus === "failed" ? "자동저장 실패" : saveStatus === "saved" ? "자동저장됨" : ""}</span>{saveStatus === "failed" && <button type="button" onClick={() => void persist(shots, date)}>다시 시도</button>}</div>
        {editMode && <small className="heart-hint">수정할 칸을 누른 뒤 방향 또는 과녁을 다시 선택하세요.</small>}
      </div>}
      {loading ? <p className="heart-empty">기록을 불러오는 중이에요…</p> : mine.length ? <div className="heart-card-list">{mine.map((record) => {
        const stats = recordStats(record.shots);
        return <article className="heart-card" key={record.id}><button type="button" className="heart-card-main" onClick={() => setExpandedId(expandedId === record.id ? null : record.id)} aria-expanded={expandedId === record.id}>
          <strong>{record.date}</strong><span>최고 {stats.best}中</span><span>총시수 {stats.hits}중/{stats.rounds}순({stats.rounds * 5}시)</span>{stats.shotCount % 5 !== 0 && <span>입력 중 {stats.shotCount % 5}/5시</span>}<b aria-hidden="true">{expandedId === record.id ? "⌃" : "⌄"}</b>
        </button>{expandedId === record.id && <div className="heart-card-detail"><ShotTable shots={record.shots} /><ShotSummary shots={record.shots} /><button type="button" className="heart-edit-record" onClick={() => openRecord(record)}>수정</button></div>}</article>;
      })}</div> : <p className="heart-empty">아직 저장한 습사 기록이 없어요.</p>}
    </>}
    {tab === "statistics" && <>
      <div className="heart-list-heading"><h3>전체 회원 기록</h3><span>{visible.length}개 기록</span></div>
      <div className="heart-filters"><label>회원<select value={memberFilter} onChange={(event) => setMemberFilter(event.target.value)}><option value="">전체 회원</option>{memberOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label><label>날짜<input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} /></label><button type="button" onClick={() => { setMemberFilter(""); setDateFilter(""); }}>초기화</button></div>
      {loading ? <p className="heart-empty">기록을 불러오는 중이에요…</p> : visible.length ? <div className="heart-card-list">{visible.map((record) => {
        const stats = recordStats(record.shots);
        return <article className="heart-card" key={record.id}><button type="button" className="heart-card-main" onClick={() => setExpandedId(expandedId === record.id ? null : record.id)} aria-expanded={expandedId === record.id}>
          <strong>{record.memberName} · {record.date}</strong><span>최고 {stats.best}中</span><span>총시수 {stats.hits}중/{stats.rounds}순({stats.rounds * 5}시)</span>{stats.shotCount % 5 !== 0 && <span>입력 중 {stats.shotCount % 5}/5시</span>}<b aria-hidden="true">{expandedId === record.id ? "⌃" : "⌄"}</b>
        </button>{expandedId === record.id && <div className="heart-card-detail"><ShotTable shots={record.shots} /><ShotSummary shots={record.shots} /></div>}</article>;
      })}</div> : <p className="heart-empty">조건에 맞는 기록이 없어요.</p>}
    </>}
    {pickerOpen && <ShotPicker onClose={() => { setPickerOpen(false); setEditingIndex(null); }} onPick={chooseMark} />}
  </section>;
}
