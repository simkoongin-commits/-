"use client";

import { useMemo, useState } from "react";
import {
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

type Session = { id: string; name: string; role: "관리자" | "회원" };
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

export default function EquipmentManagement({
  equipment,
  rentals,
  session,
  onAddEquipment,
  onToggleAvailability,
  onCreateRental,
  onAddRentalNotes,
  onReturnRental,
  onRestoreItem,
  onDeleteRental,
}: {
  equipment: Equipment[];
  rentals: EquipmentRental[];
  session: Session;
  onAddEquipment: (draft: EquipmentDraft) => Promise<void>;
  onToggleAvailability: (id: string) => Promise<void>;
  onCreateRental: (itemIds: string[], loanDate: string, notes: RentalNote[]) => Promise<void>;
  onAddRentalNotes: (rentalId: string, notes: RentalNote[]) => Promise<void>;
  onReturnRental: (rentalId: string) => Promise<void>;
  onRestoreItem: (itemId: string, action: "recover" | "repair") => Promise<void>;
  onDeleteRental: (rentalId: string) => Promise<void>;
}) {
  const [tab, setTab] = useState<"inventory" | "rentals">("inventory");
  const [inventoryTab, setInventoryTab] = useState<"bow" | "arrow">("bow");
  const [adding, setAdding] = useState<"bow" | "arrow" | null>(null);
  const [arrowPreset, setArrowPreset] = useState<{ lengthWeight?: string; index?: string }>({});
  const [selectedItem, setSelectedItem] = useState<Equipment | null>(null);
  const [loanDate, setLoanDate] = useState(todayValue);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [notes, setNotes] = useState<RentalNote[]>([]);
  const [noteRental, setNoteRental] = useState<string | null>(null);
  const [rentalNotes, setRentalNotes] = useState<RentalNote[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

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

  const bows = equipment.filter((item): item is BowEquipment => item.kind === "bow");
  const arrows = useMemo(
    () => equipment.filter((item): item is ArrowEquipment => item.kind === "arrow").sort((a, b) =>
      a.lengthWeight.localeCompare(b.lengthWeight, "ko", { numeric: true }) ||
      a.index.localeCompare(b.index, "ko", { numeric: true }) ||
      a.indexNumber.localeCompare(b.indexNumber, "ko", { numeric: true })),
    [equipment],
  );
  const arrowGroups = useMemo(() => {
    const groups = new Map<string, Map<string, ArrowEquipment[]>>();
    arrows.forEach((arrow) => {
      if (!groups.has(arrow.lengthWeight)) groups.set(arrow.lengthWeight, new Map());
      const indexes = groups.get(arrow.lengthWeight)!;
      if (!indexes.has(arrow.index)) indexes.set(arrow.index, []);
      indexes.get(arrow.index)!.push(arrow);
    });
    return groups;
  }, [arrows]);
  const rentalChoices = equipment.filter((item) => item.status !== "rented");

  const toggleRentalItem = (item: Equipment) => {
    if (!canRentEquipment(item)) {
      notify(`대여가 불가능한 장비입니다 · ${equipmentUnavailableReason(item)}`);
      return;
    }
    setSelectedIds((current) => current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id]);
  };
  const addNote = (target: "new" | "existing", type: RentalNoteType) => {
    const setter = target === "new" ? setNotes : setRentalNotes;
    setter((current) => [...current, { id: makeEquipmentId(), type, itemIds: [] }]);
  };

  return (
    <section className="content equipment-page">
      <div className="section-head"><div><h2>장비 관리</h2><p>장비 상태와 대여 기록을 함께 관리해요.</p></div></div>
      <div className="equipment-main-tabs">
        <button className={tab === "inventory" ? "active" : ""} onClick={() => setTab("inventory")}>장비 현황</button>
        <button className={tab === "rentals" ? "active" : ""} onClick={() => setTab("rentals")}>장비 대여</button>
      </div>

      {tab === "inventory" ? <>
        <div className="equipment-toolbar">
          <div><button className={inventoryTab === "bow" ? "active" : ""} onClick={() => setInventoryTab("bow")}>활</button><button className={inventoryTab === "arrow" ? "active" : ""} onClick={() => setInventoryTab("arrow")}>화살</button></div>
          {session.role === "관리자" && <button className="equipment-add" onClick={() => { setArrowPreset({}); setAdding(inventoryTab); }}>+</button>}
        </div>
        {inventoryTab === "bow" ? <div className="equipment-grid">
          {bows.length ? bows.map((item) => <EquipmentCard key={item.id} item={item} onClick={() => setSelectedItem(item)} />) : <Empty text="등록된 활이 없어요." />}
        </div> : <div className="arrow-tree">
          {arrowGroups.size ? [...arrowGroups].map(([group, indexes]) => <details key={group} open><summary><span>{group}</span><span className="arrow-summary-actions"><small>{[...indexes.values()].flat().length}개</small>{session.role === "관리자" && <button onClick={(event) => { event.preventDefault(); setArrowPreset({ lengthWeight: group }); setAdding("arrow"); }}>+</button>}</span></summary><div>{[...indexes].map(([index, items]) => <details key={index}><summary><span>{index}</span><span className="arrow-summary-actions"><small>{items.length}개</small>{session.role === "관리자" && <button onClick={(event) => { event.preventDefault(); setArrowPreset({ lengthWeight: group, index }); setAdding("arrow"); }}>+</button>}</span></summary><div className="equipment-grid">{items.map((item) => <EquipmentCard key={item.id} item={item} onClick={() => setSelectedItem(item)} />)}</div></details>)}</div></details>) : <Empty text="등록된 화살이 없어요." />}
        </div>}
      </> : <>
        <div className="rental-form-card">
          <div className="rental-form-head"><div><b>{session.name}</b><small>대여할 장비를 선택해주세요.</small></div><label>대여일<input type="date" value={loanDate} onChange={(event) => setLoanDate(event.target.value)} /></label></div>
          <div className="rental-equipment-list">
            {rentalChoices.length ? rentalChoices.map((item) => {
              const unavailable = !canRentEquipment(item);
              return <button key={item.id} className={`${selectedIds.includes(item.id) ? "selected" : ""} ${unavailable ? "unavailable" : ""}`} onClick={() => toggleRentalItem(item)}><span>{item.kind === "bow" ? "활" : "화살"}</span><b>{equipmentName(item)}</b>{unavailable && <small>{equipmentUnavailableReason(item)}</small>}</button>;
            }) : <Empty text="현재 선택할 수 있는 장비가 없어요." />}
          </div>
          <NoteEditor notes={notes} setNotes={setNotes} availableIds={selectedIds} equipment={equipment} onAdd={(type) => addNote("new", type)} />
          <button className="primary equipment-submit" disabled={busy || selectedIds.length === 0} onClick={() => void run(async () => { await onCreateRental(selectedIds, loanDate, notes); setSelectedIds([]); setNotes([]); }, "대여 기록을 추가했어요")}>대여 기록 추가</button>
        </div>
        <div className="rental-table-wrap"><table className="rental-table"><thead><tr><th>이름</th><th>대여일</th><th>대여목록</th><th>반납일</th><th>비고</th><th>관리</th></tr></thead><tbody>
          {rentals.length ? rentals.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((rental) => <tr key={rental.id}><td>{rental.memberName}</td><td>{rental.loanDate}</td><td>{rental.itemIds.map((id) => equipment.find((item) => item.id === id)).filter(Boolean).map((item) => <span key={item!.id}>{equipmentName(item!)}</span>)}</td><td>{rental.returnDate || "대여 중"}</td><td>{rental.notes.length ? rental.notes.map((note) => <span key={note.id}>{noteLabel[note.type]}{note.text ? `: ${note.text}` : ""}{note.type === "damaged" && note.itemIds.map((id) => note.details?.[id] ? ` · ${equipmentName(equipment.find((item) => item.id === id)!)}: ${note.details[id]}` : "")}</span>) : "-"}</td><td><div className="rental-actions">{rental.status === "active" && (rental.memberId === session.id || session.role === "관리자") && <button onClick={() => { setNoteRental(rental.id); setRentalNotes([]); }}>비고 추가</button>}{session.role === "관리자" && rental.status === "active" && <button onClick={() => { if (window.confirm("선택한 대여 기록을 반납 완료 처리하시겠어요?")) void run(() => onReturnRental(rental.id), "반납 완료했어요"); }}>반납 완료</button>}{session.role === "관리자" && rental.itemIds.map((id) => equipment.find((item) => item.id === id)).filter((item): item is Equipment => Boolean(item && (item.status === "lost" || item.status === "damaged"))).map((item) => <button key={item.id} onClick={() => { const action = item.status === "lost" ? "recover" : "repair"; if (window.confirm(`${equipmentName(item)} 장비를 ${action === "recover" ? "분실물 회수" : "수리 완료"} 처리하시겠어요?`)) void run(() => onRestoreItem(item.id, action), action === "recover" ? "분실물을 회수했어요" : "수리 완료했어요"); }}>{item.status === "lost" ? "분실물 회수" : "수리 완료"}</button>)}{session.role === "관리자" && rental.status === "returned" && rental.notes.length > 0 && <button className="danger" onClick={() => { if (window.confirm("이 대여 기록을 DB에서 완전히 삭제하시겠어요?")) void run(() => onDeleteRental(rental.id), "대여 기록을 삭제했어요"); }}>삭제</button>}</div></td></tr>) : <tr><td colSpan={6}>대여 기록이 없어요.</td></tr>}
        </tbody></table></div>
      </>}

      {adding && <EquipmentForm kind={adding} arrows={arrows} preset={arrowPreset} busy={busy} onClose={() => setAdding(null)} onSave={(draft) => void run(async () => { await onAddEquipment(draft); setAdding(null); setArrowPreset({}); }, "장비를 등록했어요")} />}
      {selectedItem && <div className="equipment-modal-back" onClick={() => setSelectedItem(null)}><div className="equipment-modal" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setSelectedItem(null)}>×</button><span className={`equipment-status ${selectedItem.status}`}>{equipmentUnavailableReason(selectedItem) || "대여 가능"}</span><h3>{equipmentName(selectedItem)}</h3>{selectedItem.holderName && <p>대여: {selectedItem.holderName}</p>}{selectedItem.note && <p>{selectedItem.note}</p>}{session.role === "관리자" && <div className="equipment-modal-actions"><button onClick={() => void run(async () => { await onToggleAvailability(selectedItem.id); setSelectedItem(null); }, "대여 가능 설정을 변경했어요")}>{selectedItem.manualAvailable ? "대여 불가능으로 설정" : "대여 가능으로 설정"}</button>{selectedItem.status === "lost" && <button onClick={() => { if (window.confirm("이 장비의 분실 상태를 해제하시겠어요?")) void run(async () => { await onRestoreItem(selectedItem.id, "recover"); setSelectedItem(null); }, "분실물을 회수했어요"); }}>분실물 회수</button>}{selectedItem.status === "damaged" && <button onClick={() => { if (window.confirm("이 장비를 수리 완료 처리하시겠어요?")) void run(async () => { await onRestoreItem(selectedItem.id, "repair"); setSelectedItem(null); }, "수리 완료했어요"); }}>수리 완료</button>}{selectedItem.status === "rented" && selectedItem.activeRentalId && <button onClick={() => { if (window.confirm("이 장비가 포함된 대여를 반납 완료 처리하시겠어요?")) void run(async () => { await onReturnRental(selectedItem.activeRentalId!); setSelectedItem(null); }, "반납 완료했어요"); }}>반납 완료</button>}</div>}</div></div>}
      {noteRental && <div className="equipment-modal-back"><div className="equipment-modal note-modal"><button className="modal-close" onClick={() => setNoteRental(null)}>×</button><h3>비고 추가</h3><NoteEditor notes={rentalNotes} setNotes={setRentalNotes} availableIds={rentals.find((item) => item.id === noteRental)?.itemIds || []} equipment={equipment} onAdd={(type) => addNote("existing", type)} /><button className="primary" disabled={busy || rentalNotes.length === 0} onClick={() => void run(async () => { await onAddRentalNotes(noteRental, rentalNotes); setNoteRental(null); setRentalNotes([]); }, "비고를 추가했어요")}>저장</button></div></div>}
      {message && <div className="toast">{message}</div>}
    </section>
  );
}

function Empty({ text }: { text: string }) { return <p className="equipment-empty">{text}</p>; }

function EquipmentCard({ item, onClick }: { item: Equipment; onClick: () => void }) {
  const reason = equipmentUnavailableReason(item);
  return <button className={`equipment-card ${reason ? "unavailable" : ""}`} onClick={onClick}><span>{item.kind === "bow" ? "활" : "화살"}</span><b>{equipmentName(item)}</b><small>{reason || "대여 가능"}{item.holderName ? ` · ${item.holderName}` : ""}</small></button>;
}

function NoteEditor({ notes, setNotes, availableIds, equipment, onAdd }: { notes: RentalNote[]; setNotes: (next: RentalNote[]) => void; availableIds: string[]; equipment: Equipment[]; onAdd: (type: RentalNoteType) => void }) {
  const update = (id: string, patch: Partial<RentalNote>) => setNotes(notes.map((note) => note.id === id ? { ...note, ...patch } : note));
  return <div className="note-editor"><div className="note-editor-head"><b>비고</b><div><button onClick={() => onAdd("lost")}>+ 분실</button><button onClick={() => onAdd("damaged")}>+ 손상</button><button onClick={() => onAdd("custom")}>+ 직접입력</button></div></div>{notes.map((note) => <article key={note.id}><header><b>{noteLabel[note.type]}</b><button onClick={() => setNotes(notes.filter((item) => item.id !== note.id))}>×</button></header>{note.type === "custom" ? <textarea placeholder="비고를 입력해주세요" value={note.text || ""} onChange={(event) => update(note.id, { text: event.target.value })} /> : <div className="note-item-list">{availableIds.map((itemId) => { const item = equipment.find((candidate) => candidate.id === itemId); if (!item) return null; const selected = note.itemIds.includes(itemId); return <div key={itemId}><label><input type="checkbox" checked={selected} onChange={() => update(note.id, { itemIds: selected ? note.itemIds.filter((id) => id !== itemId) : [...note.itemIds, itemId] })} />{equipmentName(item)}</label>{note.type === "damaged" && selected && <input placeholder="손상 내용을 입력해주세요" value={note.details?.[itemId] || ""} onChange={(event) => update(note.id, { details: { ...(note.details || {}), [itemId]: event.target.value } })} />}</div>; })}</div>}</article>)}</div>;
}

function EquipmentForm({ kind, arrows, preset, busy, onClose, onSave }: { kind: "bow" | "arrow"; arrows: ArrowEquipment[]; preset: { lengthWeight?: string; index?: string }; busy: boolean; onClose: () => void; onSave: (draft: EquipmentDraft) => void }) {
  const [pound, setPound] = useState(""); const [length, setLength] = useState(""); const [side, setSide] = useState<"좌궁" | "우궁">("좌궁"); const [note, setNote] = useState("");
  const [lengthWeight, setLengthWeight] = useState(preset.lengthWeight || ""); const [index, setIndex] = useState(preset.index || ""); const [indexNumber, setIndexNumber] = useState("");
  const submit = () => {
    if (kind === "bow") { if (!pound || !length) return; onSave({ kind, pound, length, side, note }); return; }
    if (!lengthWeight || !index || !indexNumber) return;
    const exact = arrows.some((arrow) => arrow.lengthWeight === lengthWeight && arrow.index === index && arrow.indexNumber === indexNumber);
    if (exact) { window.alert("같은 인덱스 넘버의 화살이 이미 등록되어 있어요."); return; }
    const sameIndex = arrows.some((arrow) => arrow.lengthWeight === lengthWeight && arrow.index === index);
    if (sameIndex && !window.confirm("같은 인덱스 분류가 이미 있어요. 기존 분류 아래에 추가할까요?")) return;
    onSave({ kind, lengthWeight, index, indexNumber, note });
  };
  return <div className="equipment-modal-back"><div className="equipment-modal"><button className="modal-close" onClick={onClose}>×</button><h3>{kind === "bow" ? "활 추가" : "화살 추가"}</h3>{kind === "bow" ? <><label>파운드(lb)<input value={pound} onChange={(e) => setPound(e.target.value)} /></label><label>길이<input value={length} onChange={(e) => setLength(e.target.value)} /></label><label>좌궁/우궁<select value={side} onChange={(e) => setSide(e.target.value as "좌궁" | "우궁")}><option>좌궁</option><option>우궁</option></select></label></> : <><label>길이+무게<input value={lengthWeight} onChange={(e) => setLengthWeight(e.target.value)} placeholder="예: 1913 · 24g" /></label><label>인덱스<input value={index} onChange={(e) => setIndex(e.target.value)} /></label><label>인덱스 넘버<input value={indexNumber} onChange={(e) => setIndexNumber(e.target.value)} /></label></>}<label>비고<textarea value={note} onChange={(e) => setNote(e.target.value)} /></label><button className="primary" disabled={busy} onClick={submit}>등록</button></div></div>;
}
