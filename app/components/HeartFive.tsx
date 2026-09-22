"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { auth } from "@/lib/firebase";
import {
  directions,
  koreanToday,
  recordStats,
  type ShotMark,
} from "@/lib/heartFive";

type RecordStats = ReturnType<typeof recordStats>;
type RecordItem = {
  id: string;
  memberId: string;
  memberName: string;
  date: string;
  place: string;
  createdAt: string;
  own: boolean;
  unlocked: boolean;
  completed: boolean;
  shots: ShotMark[] | null;
  stats: RecordStats | null;
};

async function recordRequest(path: string, options: RequestInit = {}) {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("로그인이 필요합니다.");
  const response = await fetch(path, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, ...(options.body ? { "Content-Type": "application/json" } : {}), ...options.headers },
    cache: "no-store",
  });
  const result = await response.json().catch(() => ({})) as { error?: string; [key: string]: unknown };
  if (!response.ok) throw new Error(result.error || "요청을 처리하지 못했습니다.");
  return result;
}

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

export default function HeartFive({ places, isAdmin }: { places: string[]; isAdmin: boolean }) {
  const [tab, setTab] = useState<"records" | "statistics">("records");
  const [statisticsTab, setStatisticsTab] = useState<"members" | "dates">("members");
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [points, setPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [adding, setAdding] = useState(false);
  const [date, setDate] = useState(koreanToday);
  const [place, setPlace] = useState(places[0] || "");
  const [shots, setShots] = useState<ShotMark[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [recordId, setRecordId] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const saveVersion = useRef(0);
  const saveQueue = useRef<Promise<unknown>>(Promise.resolve());
  const captureRefs = useRef(new Map<string, HTMLDivElement>());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const result = await recordRequest("/api/heart-five") as { records?: RecordItem[]; points?: number };
      setRecords(Array.isArray(result.records) ? result.records : []);
      setPoints(typeof result.points === "number" ? result.points : 0);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "기록을 확인하지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(() => void refresh(), 0);
    const onVisible = () => { if (document.visibilityState === "visible") void refresh(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => { window.clearTimeout(initial); document.removeEventListener("visibilitychange", onVisible); window.removeEventListener("focus", onVisible); };
  }, [refresh]);

  const mine = useMemo(() => records.filter((record) => record.own).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)), [records]);
  const publicRecords = records.filter((record) => record.completed);
  const memberGroups = useMemo(() => {
    const groups = new Map<string, { name: string; records: RecordItem[] }>();
    records.filter((record) => record.completed).forEach((record) => {
      const group = groups.get(record.memberId) || { name: record.memberName, records: [] };
      group.records.push(record);
      groups.set(record.memberId, group);
    });
    return [...groups.entries()].sort((a, b) => a[1].name.localeCompare(b[1].name, "ko"));
  }, [records]);

  const persist = (nextShots: ShotMark[], nextDate: string, nextPlace: string, id = recordId) => {
    if (!id || !nextDate || !nextPlace || !nextShots.length) return;
    const version = ++saveVersion.current;
    setSaveStatus("saving");
    saveQueue.current = saveQueue.current.catch(() => undefined).then(() => recordRequest(`/api/heart-five/${encodeURIComponent(id)}`, {
      method: "PUT", body: JSON.stringify({ date: nextDate, place: nextPlace, shots: nextShots }),
    }));
    void saveQueue.current.then(() => {
      if (version === saveVersion.current) { setSaveStatus("saved"); void refresh(); }
    }).catch((error) => {
      if (version === saveVersion.current) { setSaveStatus("failed"); setMessage(error instanceof Error ? error.message : "자동저장에 실패했습니다."); }
    });
  };

  const startNew = () => {
    saveVersion.current += 1;
    setRecordId(`heartFive-${crypto.randomUUID()}`);
    setDate(koreanToday());
    setPlace(places[0] || "");
    setShots([]);
    setEditMode(false);
    setEditingIndex(null);
    setSaveStatus("idle");
    setAdding(true);
  };

  const openRecord = (record: RecordItem) => {
    if (!record.own || !record.shots || record.date < koreanToday()) return;
    saveVersion.current += 1;
    setRecordId(record.id);
    setDate(record.date);
    setPlace(record.place);
    setShots([...record.shots]);
    setEditMode(true);
    setEditingIndex(null);
    setSaveStatus("saved");
    setAdding(true);
    setTab("records");
  };

  const chooseMark = (mark: ShotMark) => {
    if (!place) { setMessage("장소를 선택해주세요."); setPickerOpen(false); return; }
    const nextShots = [...shots];
    if (editingIndex === null) nextShots.push(mark);
    else nextShots[editingIndex] = mark;
    setShots(nextShots);
    setEditingIndex(null);
    setPickerOpen(false);
    persist(nextShots, date, place);
  };

  const deleteRecord = async (record: RecordItem | { id: string }) => {
    if (!window.confirm("이 습사 기록을 삭제할까요?")) return;
    try {
      await saveQueue.current.catch(() => undefined);
      await recordRequest(`/api/heart-five/${encodeURIComponent(record.id)}`, { method: "DELETE" });
      if (recordId === record.id) setAdding(false);
      setExpandedId(null);
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "기록을 삭제하지 못했습니다.");
    }
  };

  const unlockRecord = async (record: RecordItem) => {
    try {
      await recordRequest("/api/heart-five/unlock", { method: "POST", body: JSON.stringify({ recordId: record.id }) });
      setExpandedId(record.id);
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "열람에 실패했습니다.");
    }
  };

  const saveImage = async (record: RecordItem) => {
    const node = captureRefs.current.get(record.id);
    if (!node) return;
    try {
      const url = await toPng(node, { cacheBust: true, pixelRatio: 2, backgroundColor: "#ffffff" });
      const link = document.createElement("a");
      link.download = `심궁회-습사기록-${record.memberName}-${record.date}.png`;
      link.href = url;
      link.click();
    } catch {
      setMessage("이미지를 저장하지 못했습니다.");
    }
  };

  const recordCard = (record: RecordItem) => {
    const expanded = expandedId === record.id;
    const editable = record.own && record.date >= koreanToday();
    const deletable = editable || isAdmin;
    return <article className="heart-card" key={record.id}>
      <button type="button" className="heart-card-main" onClick={() => record.unlocked ? setExpandedId(expanded ? null : record.id) : void unlockRecord(record)} aria-expanded={record.unlocked && expanded}>
        <strong>{record.memberName} · {record.date}</strong><span>{record.place}</span>
        {record.stats ? <><span>최고 {record.stats.best}中</span><span>총시수 {record.stats.hits}중/{record.stats.rounds}순({record.stats.rounds * 5}시)</span>{record.stats.shotCount % 5 !== 0 && <span>입력 중 {record.stats.shotCount % 5}/5시</span>}</> : <span className="heart-locked">🔒 1P로 영구 열람</span>}
        <b aria-hidden="true">{record.unlocked ? expanded ? "⌃" : "⌄" : "›"}</b>
      </button>
      {expanded && record.shots && <div className="heart-card-detail">
        <div className="heart-capture" ref={(node) => { if (node) captureRefs.current.set(record.id, node); else captureRefs.current.delete(record.id); }}>
          <div className="heart-capture-heading"><strong>心5시 心5중</strong><span>{record.memberName} · {record.date} · {record.place}</span></div>
          <ShotTable shots={record.shots} /><ShotSummary shots={record.shots} />
        </div>
        <div className="heart-card-actions"><button type="button" onClick={() => void saveImage(record)}>이미지 저장</button>{editable && <button type="button" onClick={() => openRecord(record)}>수정</button>}{deletable && <button type="button" className="danger-button" onClick={() => void deleteRecord(record)}>삭제</button>}</div>
      </div>}
      {!record.unlocked && deletable && <div className="heart-card-actions"><button type="button" className="danger-button" onClick={() => void deleteRecord(record)}>삭제</button></div>}
    </article>;
  };

  return <section className="content heart-five">
    <div className="section-head"><div><h2>心5시 心5중</h2><p>다섯 발씩 기록하고, 한 순의 흐름을 살펴보세요.</p></div><div className="heart-header-actions"><span className="heart-points">보유 {points}P</span><button type="button" onClick={() => void refresh()}>새로고침</button></div></div>
    <div className="heart-tabs" role="tablist" aria-label="心5시 心5중 메뉴">
      <button type="button" role="tab" aria-selected={tab === "records"} className={tab === "records" ? "active" : ""} onClick={() => setTab("records")}>습사 기록</button>
      <button type="button" role="tab" aria-selected={tab === "statistics"} className={tab === "statistics" ? "active" : ""} onClick={() => setTab("statistics")}>습사 통계</button>
    </div>
    {message && <p className="heart-error" role="alert">{message}</p>}
    {tab === "records" && <>
      <div className="heart-list-heading"><h3>내 습사 기록</h3><button type="button" className="primary" onClick={startNew}>추가</button></div>
      {adding && <div className="heart-editor">
        <div className="heart-editor-head"><label>기록 날짜 <input type="date" min={koreanToday()} value={date} onChange={(event) => { const nextDate = event.target.value; if (!nextDate || nextDate < koreanToday()) return; setDate(nextDate); persist(shots, nextDate, place); }} /></label><label>장소<select value={place} onChange={(event) => { setPlace(event.target.value); persist(shots, date, event.target.value); }}>{place && !places.includes(place) && <option value={place}>{place} (기존 장소)</option>}{places.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><button type="button" onClick={() => { setAdding(false); setPickerOpen(false); }}>닫기</button></div>
        <ShotTable shots={shots} active={date >= koreanToday()} onNext={() => { setEditingIndex(null); setPickerOpen(true); }} onEdit={editMode && date >= koreanToday() ? (index) => { setEditingIndex(index); setPickerOpen(true); } : undefined} />
        <ShotSummary shots={shots} />
        <div className="heart-actions"><button type="button" disabled={date < koreanToday()} onClick={() => setEditMode(!editMode)}>{editMode ? "수정 완료" : "수정"}</button>{editMode && <button type="button" disabled={!shots.length || date < koreanToday()} onClick={() => { if (shots.length === 1) { void deleteRecord({ id: recordId }); return; } const nextShots = shots.slice(0, -1); setShots(nextShots); persist(nextShots, date, place); }}>마지막 발 삭제</button>}<span className="heart-save-status" role="status">{saveStatus === "saving" ? "자동저장 중…" : saveStatus === "failed" ? "자동저장 실패" : saveStatus === "saved" ? "자동저장됨" : ""}</span>{saveStatus === "failed" && <button type="button" onClick={() => persist(shots, date, place)}>다시 시도</button>}</div>
        {editMode && <small className="heart-hint">수정할 칸을 누른 뒤 방향 또는 과녁을 다시 선택하세요.</small>}
      </div>}
      {loading ? <p className="heart-empty">기록을 불러오는 중이에요…</p> : mine.length ? <div className="heart-card-list">{mine.map(recordCard)}</div> : <p className="heart-empty">아직 저장한 습사 기록이 없어요.</p>}
    </>}
    {tab === "statistics" && <>
      <div className="heart-tabs heart-stat-tabs" role="tablist" aria-label="습사 통계 보기">
        <button type="button" role="tab" aria-selected={statisticsTab === "members"} className={statisticsTab === "members" ? "active" : ""} onClick={() => setStatisticsTab("members")}>회원별</button>
        <button type="button" role="tab" aria-selected={statisticsTab === "dates"} className={statisticsTab === "dates" ? "active" : ""} onClick={() => setStatisticsTab("dates")}>날짜별</button>
      </div>
      {statisticsTab === "members" && (memberGroups.length ? <div className="heart-member-list">{memberGroups.map(([id, group]) => <section className="heart-member-group" key={id}><button type="button" onClick={() => setExpandedMemberId(expandedMemberId === id ? null : id)} aria-expanded={expandedMemberId === id}><strong>{group.name}</strong><span>{group.records.length}개 기록</span><b>{expandedMemberId === id ? "⌃" : "⌄"}</b></button>{expandedMemberId === id && <div className="heart-card-list">{group.records.map(recordCard)}</div>}</section>)}</div> : <p className="heart-empty">아직 완성된 습사 기록이 없어요.</p>)}
      {statisticsTab === "dates" && (publicRecords.length ? <div className="heart-card-list">{publicRecords.map(recordCard)}</div> : <p className="heart-empty">아직 완성된 습사 기록이 없어요.</p>)}
    </>}
    {pickerOpen && <ShotPicker onClose={() => { setPickerOpen(false); setEditingIndex(null); }} onPick={chooseMark} />}
  </section>;
}
