"use client";

import { useMemo, useState } from "react";
import {
  assignBowIndexes,
  bowGroupKey,
  canRentEquipment,
  equipmentName,
  equipmentUnavailableReason,
  makeEquipmentId,
  type ArrowEquipment,
  type BowEquipment,
  type Equipment,
  type EquipmentRental,
  type RentalNote,
  type RentalNoteType,
} from "@/lib/equipment";

type Session = { id: string; name: string; role: "관리자" | "회원"; team?: string };
type EquipmentStatKey = "total" | "available" | "unavailable" | "rented" | "lost" | "damaged";
export type EquipmentDraft =
  | { kind: "bow"; pound: string; length: string; side: "좌궁" | "우궁"; note?: string }
  | { kind: "arrow"; lengthWeight: string; index: string; indexNumber: string; note?: string };

const todayValue = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
};

const noteLabel: Record<RentalNoteType, string> = {
  lost: "분실",
  damaged: "손상",
  custom: "직접입력",
};

const groupArrows = (arrows: ArrowEquipment[]) => {
  const groups = new Map<string, Map<string, ArrowEquipment[]>>();
  arrows.forEach((arrow) => {
    if (!groups.has(arrow.lengthWeight)) groups.set(arrow.lengthWeight, new Map());
    const indexes = groups.get(arrow.lengthWeight)!;
    if (!indexes.has(arrow.index)) indexes.set(arrow.index, []);
    indexes.get(arrow.index)!.push(arrow);
  });
  return groups;
};

const groupBows = (bows: BowEquipment[]) => {
  const groups = new Map<string, BowEquipment[]>();
  bows.forEach((bow) => {
    const key = bowGroupKey(bow);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(bow);
  });
  groups.forEach((items) => items.sort((a, b) => (a.indexNumber || 0) - (b.indexNumber || 0)));
  return groups;
};

const groupedEquipmentLabels = (items: Equipment[]) => {
  const labels = items.filter((item) => item.kind === "bow").map((item) => `활 · ${equipmentName(item)}`);
  const sortedArrows = items.filter((item): item is ArrowEquipment => item.kind === "arrow").sort((a, b) =>
    a.lengthWeight.localeCompare(b.lengthWeight, "ko", { numeric: true }) ||
    a.index.localeCompare(b.index, "ko", { numeric: true }) ||
    a.indexNumber.localeCompare(b.indexNumber, "ko", { numeric: true }));
  const arrowGroups = groupArrows(sortedArrows);
  arrowGroups.forEach((indexes, lengthWeight) => indexes.forEach((arrows, index) => {
    labels.push(`화살 · ${lengthWeight} · ${index} ${arrows.map((arrow) => arrow.indexNumber).join(", ")}`);
  }));
  return labels;
};

export default function EquipmentManagement({
  equipment,
  rentals,
  session,
  onAddEquipment,
  onToggleAvailability,
  onUpdateEquipmentNote,
  onCreateRental,
  onAddRentalNotes,
  onReturnRental,
  onRestoreItem,
  onDeleteEquipment,
  onDeleteRental,
}: {
  equipment: Equipment[];
  rentals: EquipmentRental[];
  session: Session;
  onAddEquipment: (draft: EquipmentDraft | EquipmentDraft[]) => Promise<void>;
  onToggleAvailability: (id: string) => Promise<void>;
  onUpdateEquipmentNote: (id: string, note: string) => Promise<void>;
  onCreateRental: (itemIds: string[], loanDate: string) => Promise<void>;
  onAddRentalNotes: (rentalId: string, notes: RentalNote[]) => Promise<void>;
  onReturnRental: (rentalId: string) => Promise<void>;
  onRestoreItem: (itemId: string, action: "recover" | "repair") => Promise<void>;
  onDeleteEquipment: (itemId: string) => Promise<void>;
  onDeleteRental: (rentalId: string) => Promise<void>;
}) {
  const [tab, setTab] = useState<"inventory" | "rentals">("inventory");
  const [inventoryTab, setInventoryTab] = useState<"bow" | "arrow">("bow");
  const [adding, setAdding] = useState<"bow" | "arrow" | null>(null);
  const [arrowPreset, setArrowPreset] = useState<{ lengthWeight?: string; index?: string }>({});
  const [selectedItem, setSelectedItem] = useState<Equipment | null>(null);
  const [equipmentNote, setEquipmentNote] = useState("");
  const [loanDate, setLoanDate] = useState(todayValue);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [noteRental, setNoteRental] = useState<string | null>(null);
  const [rentalNotes, setRentalNotes] = useState<RentalNote[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [openStat, setOpenStat] = useState<EquipmentStatKey | null>(null);
  const canManageEquipment = session.role === "관리자" || session.team === "장비팀";

  const notify = (text: string) => {
    setMessage(text);
    window.setTimeout(() => setMessage(""), 2400);
  };
  const run = async (work: () => Promise<void>, success?: string) => {
    setBusy(true);
    try {
      await work();
      if (success) notify(success);
    } catch (error) {
      notify(error instanceof Error ? error.message : "처리하지 못했어요. 다시 시도해주세요.");
    } finally {
      setBusy(false);
    }
  };

  const bows = useMemo(
    () => assignBowIndexes(equipment).filter((item): item is BowEquipment => item.kind === "bow").sort((a, b) => {
      const poundDifference = Number.parseFloat(a.pound) - Number.parseFloat(b.pound);
      return Number.isNaN(poundDifference) || poundDifference === 0
        ? a.pound.localeCompare(b.pound, "ko", { numeric: true }) ||
          a.length.localeCompare(b.length, "ko", { numeric: true }) ||
          a.side.localeCompare(b.side, "ko") ||
          (a.indexNumber || 0) - (b.indexNumber || 0)
        : poundDifference;
    }),
    [equipment],
  );
  const arrows = useMemo(
    () => equipment.filter((item): item is ArrowEquipment => item.kind === "arrow").sort((a, b) =>
      a.lengthWeight.localeCompare(b.lengthWeight, "ko", { numeric: true }) ||
      a.index.localeCompare(b.index, "ko", { numeric: true }) ||
      a.indexNumber.localeCompare(b.indexNumber, "ko", { numeric: true })),
    [equipment],
  );
  const arrowGroups = useMemo(() => groupArrows(arrows), [arrows]);
  const bowGroups = useMemo(() => groupBows(bows), [bows]);
  const indexedEquipment = useMemo(() => assignBowIndexes(equipment), [equipment]);
  const equipmentStats = useMemo(() => ([
    { key: "total" as const, label: "전체", items: indexedEquipment },
    { key: "available" as const, label: "대여 가능", items: indexedEquipment.filter((item) => item.status === "available" && item.manualAvailable) },
    { key: "unavailable" as const, label: "대여 불가능", items: indexedEquipment.filter((item) => item.status === "available" && !item.manualAvailable) },
    { key: "rented" as const, label: "대여 중", items: indexedEquipment.filter((item) => item.status === "rented") },
    { key: "lost" as const, label: "분실", items: indexedEquipment.filter((item) => item.status === "lost") },
    { key: "damaged" as const, label: "손상", items: indexedEquipment.filter((item) => item.status === "damaged") },
  ]), [indexedEquipment]);
  const rentalBows = bows.filter((item) => item.status !== "rented");
  const rentalArrowGroups = useMemo(() => groupArrows(arrows.filter((item) => item.status !== "rented")), [arrows]);

  const toggleRentalItem = (item: Equipment) => {
    if (!canRentEquipment(item)) {
      notify(`대여가 불가능한 장비입니다 · ${equipmentUnavailableReason(item)}`);
      return;
    }
    setSelectedIds((current) => current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id]);
  };
  const toggleRentalArrowGroup = (items: ArrowEquipment[]) => {
    const availableIds = items.filter(canRentEquipment).map((item) => item.id);
    if (!availableIds.length) {
      notify("이 분류에는 대여 가능한 화살이 없어요.");
      return;
    }
    setSelectedIds((current) => {
      const allSelected = availableIds.every((id) => current.includes(id));
      return allSelected
        ? current.filter((id) => !availableIds.includes(id))
        : [...new Set([...current, ...availableIds])];
    });
  };
  const addNote = (type: RentalNoteType) => setRentalNotes((current) => [...current, { id: makeEquipmentId(), type, itemIds: [] }]);
  const openEquipment = (item: Equipment) => {
    setSelectedItem(item);
    setEquipmentNote(item.note || "");
  };

  return (
    <section className="content equipment-page">
      <div className="section-head"><div><h2>장비 관리</h2><p>장비 상태와 대여 기록을 함께 관리해요.</p></div></div>
      <div className="equipment-main-tabs">
        <button className={tab === "inventory" ? "active" : ""} onClick={() => setTab("inventory")}>장비 현황</button>
        <button className={tab === "rentals" ? "active" : ""} onClick={() => setTab("rentals")}>장비 대여</button>
      </div>

      {tab === "inventory" ? <>
        <section className="equipment-stat-panel">
          <div className="equipment-stat-grid">
            {equipmentStats.map((stat) => <button key={stat.key} className={openStat === stat.key ? "active" : ""} onClick={() => setOpenStat((current) => current === stat.key ? null : stat.key)}><span>{stat.label}</span><strong>{stat.items.length}<i>개</i></strong></button>)}
          </div>
          {openStat && (() => {
            const selected = equipmentStats.find((stat) => stat.key === openStat)!;
            return <EquipmentStatDetail label={selected.label} items={selected.items} onOpen={openEquipment} />;
          })()}
        </section>
        <div className="equipment-toolbar">
          <div><button className={inventoryTab === "bow" ? "active" : ""} onClick={() => setInventoryTab("bow")}>활</button><button className={inventoryTab === "arrow" ? "active" : ""} onClick={() => setInventoryTab("arrow")}>화살</button></div>
          {canManageEquipment && <button className="equipment-add" onClick={() => { setArrowPreset({}); setAdding(inventoryTab); }}>+</button>}
        </div>
        {inventoryTab === "bow" ? <div className="bow-inventory">
          <div className="equipment-count"><span>전체 활</span><strong>{bows.length}개</strong></div>
          {bowGroups.size ? <div className="bow-tree">{[...bowGroups].map(([group, items]) => { const sample = items[0]; return items.length === 1 ? <EquipmentCard key={group} item={sample} onClick={() => openEquipment(sample)} /> : <details key={group}><summary><span>{sample.pound}lb · {sample.length} · {sample.side}</span><small>총 {items.length}개</small></summary><div className="equipment-grid">{items.map((item) => <EquipmentCard key={item.id} item={item} onClick={() => openEquipment(item)} />)}</div></details>; })}</div> : <Empty text="등록된 활이 없어요." />}
        </div> : <div className="arrow-tree">
          {arrowGroups.size ? [...arrowGroups].map(([group, indexes]) => <details key={group}><summary><span>{group}</span><span className="arrow-summary-actions"><small>{[...indexes.values()].flat().length}개</small>{canManageEquipment && <button onClick={(event) => { event.preventDefault(); setArrowPreset({ lengthWeight: group }); setAdding("arrow"); }}>+</button>}</span></summary><div>{[...indexes].map(([index, items]) => <details key={index}><summary><span>{index}</span><span className="arrow-summary-actions"><small>{items.length}개</small>{canManageEquipment && <button onClick={(event) => { event.preventDefault(); setArrowPreset({ lengthWeight: group, index }); setAdding("arrow"); }}>+</button>}</span></summary><div className="equipment-grid">{items.map((item) => <EquipmentCard key={item.id} item={item} onClick={() => openEquipment(item)} />)}</div></details>)}</div></details>) : <Empty text="등록된 화살이 없어요." />}
        </div>}
      </> : <>
        <div className="rental-form-card">
          <div className="rental-form-head"><div><b>{session.name}</b><small>대여할 장비를 선택해주세요.</small></div><label>대여일<input type="date" value={loanDate} onChange={(event) => setLoanDate(event.target.value)} /></label></div>
          <div className="rental-choice-groups">
            <section><h4>활</h4><div className="rental-equipment-list">{rentalBows.length ? rentalBows.map((item) => <RentalChoice key={item.id} item={item} selected={selectedIds.includes(item.id)} onClick={() => toggleRentalItem(item)} />) : <Empty text="선택할 수 있는 활이 없어요." />}</div></section>
            <section><h4>화살</h4><div className="rental-arrow-tree">{rentalArrowGroups.size ? [...rentalArrowGroups].map(([group, indexes]) => <details key={group}><summary>{group}<small>{[...indexes.values()].flat().length}개</small></summary>{[...indexes].map(([index, items]) => { const available = items.filter(canRentEquipment); const allSelected = available.length > 0 && available.every((item) => selectedIds.includes(item.id)); return <details key={index}><summary><span>{index}</span><span className="rental-group-actions"><small>{items.length}개</small><button type="button" disabled={!available.length} onClick={(event) => { event.preventDefault(); toggleRentalArrowGroup(items); }}>{allSelected ? "전체 해제" : "전체 선택"}</button></span></summary><div className="rental-equipment-list">{items.map((item) => <RentalChoice key={item.id} item={item} selected={selectedIds.includes(item.id)} onClick={() => toggleRentalItem(item)} />)}</div></details>; })}</details>) : <Empty text="선택할 수 있는 화살이 없어요." />}</div></section>
          </div>
          <button className="primary equipment-submit" disabled={busy || selectedIds.length === 0} onClick={() => void run(async () => { await onCreateRental(selectedIds, loanDate); setSelectedIds([]); }, "대여 기록을 추가했어요")}>대여 기록 추가</button>
        </div>
        <div className="rental-table-wrap"><table className="rental-table"><thead><tr><th>이름</th><th>대여일</th><th>대여목록</th><th>반납일</th><th>비고</th><th>관리</th></tr></thead><tbody>
          {rentals.length ? rentals.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((rental) => {
            const rentalEquipment = rental.itemIds.map((id) => equipment.find((item) => item.id === id)).filter((item): item is Equipment => Boolean(item));
            const canManageOwnRental = rental.memberId === session.id || canManageEquipment;
            return <tr key={rental.id} className={rental.status === "returned" ? "returned" : undefined}><td>{rental.memberName}</td><td>{rental.loanDate}</td><td>{groupedEquipmentLabels(rentalEquipment).map((label) => <span key={label}>{label}</span>)}</td><td>{rental.returnDate || "대여 중"}</td><td>{(rental.notes || []).length ? rental.notes.map((note) => <RentalNoteSummary key={note.id} note={note} equipment={equipment} />) : "-"}</td><td><div className="rental-actions">{rental.status === "active" && canManageOwnRental && <button onClick={() => { setNoteRental(rental.id); setRentalNotes([]); }}>비고 추가</button>}{rental.status === "active" && canManageOwnRental && <button onClick={() => { if (window.confirm("선택한 대여 기록을 반납 완료 처리하시겠어요?")) void run(() => onReturnRental(rental.id), "반납 완료했어요"); }}>반납 완료</button>}{canManageEquipment && rentalEquipment.filter((item) => item.status === "lost" || item.status === "damaged").map((item) => <button key={item.id} onClick={() => { const action = item.status === "lost" ? "recover" : "repair"; if (window.confirm(`${equipmentName(item)} 장비를 ${action === "recover" ? "분실물 회수" : "수리 완료"} 처리하시겠어요?`)) void run(() => onRestoreItem(item.id, action), action === "recover" ? "분실물을 회수했어요" : "수리 완료했어요"); }}>{item.status === "lost" ? "분실물 회수" : "수리 완료"}</button>)}{canManageEquipment && rental.status === "returned" && (rental.notes || []).length > 0 && <button className="danger" onClick={() => { if (window.confirm("이 대여 기록을 DB에서 완전히 삭제하시겠어요?")) void run(() => onDeleteRental(rental.id), "대여 기록을 삭제했어요"); }}>삭제</button>}</div></td></tr>;
          }) : <tr><td colSpan={6}>대여 기록이 없어요.</td></tr>}
        </tbody></table></div>
      </>}

      {adding && <EquipmentForm kind={adding} arrows={arrows} preset={arrowPreset} busy={busy} onClose={() => setAdding(null)} onSave={(draft) => void run(async () => { await onAddEquipment(draft); setAdding(null); setArrowPreset({}); }, "장비를 등록했어요")} />}
      {selectedItem && <div className="equipment-modal-back" onClick={() => setSelectedItem(null)}><div className="equipment-modal" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setSelectedItem(null)}>×</button><span className={`equipment-status ${selectedItem.status}`}>{equipmentUnavailableReason(selectedItem) || "대여 가능"}</span><h3>{equipmentName(selectedItem)}</h3>{selectedItem.holderName && <p>대여: {selectedItem.holderName}</p>}{canManageEquipment ? <label>장비 비고<textarea value={equipmentNote} onChange={(event) => setEquipmentNote(event.target.value)} placeholder="이 장비에 대한 비고를 입력해주세요" /></label> : selectedItem.note && <p>{selectedItem.note}</p>}{canManageEquipment && <div className="equipment-modal-actions"><button onClick={() => void run(async () => { await onUpdateEquipmentNote(selectedItem.id, equipmentNote); setSelectedItem(null); }, "장비 비고를 저장했어요")}>비고 저장</button><button onClick={() => void run(async () => { await onToggleAvailability(selectedItem.id); setSelectedItem(null); }, "대여 가능 설정을 변경했어요")}>{selectedItem.manualAvailable ? "대여 불가능으로 설정" : "대여 가능으로 설정"}</button>{selectedItem.status === "lost" && <button onClick={() => { if (window.confirm("이 장비의 분실 상태를 해제하시겠어요?")) void run(async () => { await onRestoreItem(selectedItem.id, "recover"); setSelectedItem(null); }, "분실물을 회수했어요"); }}>분실물 회수</button>}{selectedItem.status === "damaged" && <button onClick={() => { if (window.confirm("이 장비를 수리 완료 처리하시겠어요?")) void run(async () => { await onRestoreItem(selectedItem.id, "repair"); setSelectedItem(null); }, "수리 완료했어요"); }}>수리 완료</button>}{selectedItem.status === "rented" && selectedItem.activeRentalId && <button onClick={() => { if (window.confirm("이 장비가 포함된 대여를 반납 완료 처리하시겠어요?")) void run(async () => { await onReturnRental(selectedItem.activeRentalId!); setSelectedItem(null); }, "반납 완료했어요"); }}>반납 완료</button>}<button className="danger" onClick={() => { if (!window.confirm(`${equipmentName(selectedItem)} 장비를 삭제할까요? 삭제 후에는 복구할 수 없어요.`)) return; void run(async () => { await onDeleteEquipment(selectedItem.id); setSelectedItem(null); }, "장비를 삭제했어요"); }}>장비 삭제</button></div>}</div></div>}
      {noteRental && <div className="equipment-modal-back"><div className="equipment-modal note-modal"><button className="modal-close" onClick={() => setNoteRental(null)}>×</button><h3>비고 추가</h3><NoteEditor notes={rentalNotes} setNotes={setRentalNotes} availableIds={rentals.find((item) => item.id === noteRental)?.itemIds || []} equipment={equipment} onAdd={addNote} /><button className="primary" disabled={busy || rentalNotes.length === 0} onClick={() => void run(async () => { await onAddRentalNotes(noteRental, rentalNotes); setNoteRental(null); setRentalNotes([]); }, "비고를 추가했어요")}>저장</button></div></div>}
      {message && <div className="toast">{message}</div>}
    </section>
  );
}

function Empty({ text }: { text: string }) { return <p className="equipment-empty">{text}</p>; }

function EquipmentStatDetail({ label, items, onOpen }: { label: string; items: Equipment[]; onOpen: (item: Equipment) => void }) {
  const statBows = assignBowIndexes(items).filter((item): item is BowEquipment => item.kind === "bow").sort((a, b) =>
    Number.parseFloat(a.pound) - Number.parseFloat(b.pound) ||
    a.length.localeCompare(b.length, "ko", { numeric: true }) ||
    a.side.localeCompare(b.side, "ko") ||
    (a.indexNumber || 0) - (b.indexNumber || 0));
  const statArrows = items.filter((item): item is ArrowEquipment => item.kind === "arrow").sort((a, b) =>
    a.lengthWeight.localeCompare(b.lengthWeight, "ko", { numeric: true }) ||
    a.index.localeCompare(b.index, "ko", { numeric: true }) ||
    a.indexNumber.localeCompare(b.indexNumber, "ko", { numeric: true }));
  const statBowGroups = groupBows(statBows);
  const statArrowGroups = groupArrows(statArrows);
  return <div className="equipment-stat-detail"><header><b>{label} 장비</b><span>{items.length}개</span></header>{items.length ? <div className="equipment-stat-kinds">
    {statBows.length > 0 && <section><h4>활 <small>{statBows.length}개</small></h4><div className="bow-tree">{[...statBowGroups].map(([group, bows]) => { const sample = bows[0]; return bows.length === 1 ? <EquipmentCard key={group} item={sample} onClick={() => onOpen(sample)} /> : <details key={group}><summary><span>{sample.pound}lb · {sample.length} · {sample.side}</span><small>총 {bows.length}개</small></summary><div className="equipment-grid">{bows.map((item) => <EquipmentCard key={item.id} item={item} onClick={() => onOpen(item)} />)}</div></details>; })}</div></section>}
    {statArrows.length > 0 && <section><h4>화살 <small>{statArrows.length}개</small></h4><div className="arrow-tree">{[...statArrowGroups].map(([group, indexes]) => <details key={group}><summary><span>{group}</span><small>{[...indexes.values()].flat().length}개</small></summary><div>{[...indexes].map(([index, arrows]) => <details key={index}><summary><span>{index}</span><small>{arrows.length}개</small></summary><div className="equipment-grid">{arrows.map((item) => <EquipmentCard key={item.id} item={item} onClick={() => onOpen(item)} />)}</div></details>)}</div></details>)}</div></section>}
  </div> : <p>해당하는 장비가 없어요.</p>}</div>;
}

function RentalChoice({ item, selected, onClick }: { item: Equipment; selected: boolean; onClick: () => void }) {
  const unavailable = !canRentEquipment(item);
  return <button className={`${selected ? "selected" : ""} ${unavailable ? "unavailable" : ""}`} onClick={onClick}><span>{item.kind === "bow" ? "활" : "화살"}</span><b>{equipmentName(item)}</b>{unavailable && <small>{equipmentUnavailableReason(item)}</small>}</button>;
}

function RentalNoteSummary({ note, equipment }: { note: RentalNote; equipment: Equipment[] }) {
  const selected = note.itemIds.map((id) => equipment.find((item) => item.id === id)).filter((item): item is Equipment => Boolean(item));
  return <span className="rental-note-summary"><b>{noteLabel[note.type]}</b>{note.type === "custom" ? <small>{note.text}</small> : groupedEquipmentLabels(selected).map((label) => <small key={label}>{label}</small>)}{note.type === "damaged" && selected.map((item) => note.details?.[item.id] ? <small key={`${note.id}-${item.id}`}>{equipmentName(item)}: {note.details[item.id]}</small> : null)}</span>;
}

function EquipmentCard({ item, onClick }: { item: Equipment; onClick: () => void }) {
  const reason = equipmentUnavailableReason(item);
  return <button className={`equipment-card ${reason ? "unavailable" : ""}`} onClick={onClick}><span>{item.kind === "bow" ? "활" : "화살"}</span><b>{equipmentName(item)}</b><small>{reason || "대여 가능"}{item.holderName ? ` · ${item.holderName}` : ""}</small></button>;
}

function NoteEditor({ notes, setNotes, availableIds, equipment, onAdd }: { notes: RentalNote[]; setNotes: (next: RentalNote[]) => void; availableIds: string[]; equipment: Equipment[]; onAdd: (type: RentalNoteType) => void }) {
  const update = (id: string, patch: Partial<RentalNote>) => setNotes(notes.map((note) => note.id === id ? { ...note, ...patch } : note));
  return <div className="note-editor"><div className="note-editor-head"><b>비고</b><div><button onClick={() => onAdd("lost")}>+ 분실</button><button onClick={() => onAdd("damaged")}>+ 손상</button><button onClick={() => onAdd("custom")}>+ 직접입력</button></div></div>{notes.map((note) => <article key={note.id}><header><b>{noteLabel[note.type]}</b><button onClick={() => setNotes(notes.filter((item) => item.id !== note.id))}>×</button></header>{note.type === "custom" ? <textarea placeholder="비고를 입력해주세요" value={note.text || ""} onChange={(event) => update(note.id, { text: event.target.value })} /> : <div className="note-item-list">{availableIds.map((itemId) => { const item = equipment.find((candidate) => candidate.id === itemId); if (!item) return null; const selected = note.itemIds.includes(itemId); return <div key={itemId}><label><input type="checkbox" checked={selected} onChange={() => update(note.id, { itemIds: selected ? note.itemIds.filter((id) => id !== itemId) : [...note.itemIds, itemId] })} />{equipmentName(item)}</label>{note.type === "damaged" && selected && <input placeholder="손상 내용을 입력해주세요" value={note.details?.[itemId] || ""} onChange={(event) => update(note.id, { details: { ...(note.details || {}), [itemId]: event.target.value } })} />}</div>; })}</div>}</article>)}</div>;
}

function EquipmentForm({ kind, arrows, preset, busy, onClose, onSave }: { kind: "bow" | "arrow"; arrows: ArrowEquipment[]; preset: { lengthWeight?: string; index?: string }; busy: boolean; onClose: () => void; onSave: (draft: EquipmentDraft | EquipmentDraft[]) => void }) {
  const [pound, setPound] = useState(""); const [length, setLength] = useState(""); const [side, setSide] = useState<"좌궁" | "우궁">("좌궁"); const [note, setNote] = useState("");
  const [lengthWeight, setLengthWeight] = useState(preset.lengthWeight || ""); const [index, setIndex] = useState(preset.index || ""); const [indexNumbers, setIndexNumbers] = useState<string[]>([]);
  const submit = () => {
    if (kind === "bow") { if (!pound || !length) return; onSave({ kind, pound, length, side, note }); return; }
    if (!lengthWeight || !index || !indexNumbers.length) return;
    const duplicates = indexNumbers.filter((indexNumber) => arrows.some((arrow) => arrow.lengthWeight === lengthWeight && arrow.index === index && arrow.indexNumber === indexNumber));
    if (duplicates.length) { window.alert(`이미 등록된 인덱스 넘버가 있어요: ${duplicates.join(", ")}`); return; }
    const sameIndex = arrows.some((arrow) => arrow.lengthWeight === lengthWeight && arrow.index === index);
    if (sameIndex && !window.confirm("같은 인덱스 분류가 이미 있어요. 기존 분류 아래에 추가할까요?")) return;
    onSave(indexNumbers.map((indexNumber) => ({ kind, lengthWeight, index, indexNumber, note })));
  };
  return <div className="equipment-modal-back"><div className="equipment-modal"><button className="modal-close" onClick={onClose}>×</button><h3>{kind === "bow" ? "활 추가" : "화살 추가"}</h3>{kind === "bow" ? <><label>파운드(lb)<input value={pound} onChange={(e) => setPound(e.target.value)} /></label><label>길이<input value={length} onChange={(e) => setLength(e.target.value)} /></label><label>좌궁/우궁<select value={side} onChange={(e) => setSide(e.target.value as "좌궁" | "우궁")}><option>좌궁</option><option>우궁</option></select></label></> : <><label>길이+무게<input value={lengthWeight} onChange={(e) => setLengthWeight(e.target.value)} placeholder="예: 1913 · 24g" /></label><label>인덱스<input value={index} onChange={(e) => setIndex(e.target.value)} /></label><fieldset className="index-number-picker"><legend>인덱스 넘버 · 복수 선택 가능</legend><div>{["1", "2", "3", "4", "5"].map((number) => <label key={number} className={indexNumbers.includes(number) ? "selected" : ""}><input type="checkbox" checked={indexNumbers.includes(number)} onChange={() => setIndexNumbers((current) => current.includes(number) ? current.filter((item) => item !== number) : [...current, number])} /><span>{number}</span></label>)}</div></fieldset></>}<label>비고<textarea value={note} onChange={(e) => setNote(e.target.value)} /></label><button className="primary" disabled={busy || (kind === "arrow" && !indexNumbers.length)} onClick={submit}>등록</button></div></div>;
}
