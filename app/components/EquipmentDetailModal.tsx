"use client";

import { useState } from "react";
import { equipmentName, equipmentUnavailableReason, type Equipment } from "@/lib/equipment";

export default function EquipmentDetailModal({ item, canManage, onClose, onSaveNote, onLegacyAvailability, onMarkCondition, onRestore, onReturnRental, onDelete, notify }: {
  item: Equipment;
  canManage: boolean;
  onClose: () => void;
  onSaveNote: (note: string) => Promise<void>;
  onLegacyAvailability: () => Promise<void>;
  onMarkCondition: (condition: "lost" | "damaged", detail?: string) => Promise<void>;
  onRestore: (action: "recover" | "repair") => Promise<void>;
  onReturnRental: () => Promise<void>;
  onDelete: () => Promise<void>;
  notify: (message: string) => void;
}) {
  const [note, setNote] = useState(item.note || "");
  const [busy, setBusy] = useState(false);
  const perform = async (work: () => Promise<void>, success: string, close = false) => {
    if (busy) return;
    setBusy(true);
    try {
      await work();
      notify(success);
      if (close) onClose();
    } catch (error) {
      notify(error instanceof Error ? error.message : "장비 상태를 변경하지 못했어요.");
    } finally {
      setBusy(false);
    }
  };
  const mark = (condition: "lost" | "damaged") => {
    if (!window.confirm(`${equipmentName(item)} 장비를 ${condition === "lost" ? "분실" : "손상"} 처리할까요?`)) return;
    let detail = "";
    if (condition === "damaged" && item.status === "rented") {
      const answer = window.prompt("대여 기록에 남길 손상 내용을 입력해주세요.");
      if (!answer?.trim()) return;
      detail = answer.trim();
    }
    void perform(() => onMarkCondition(condition, detail), condition === "lost" ? "분실 처리했어요" : "손상 처리했어요");
  };

  return <div className="equipment-modal-back">
    <div className="equipment-modal" role="dialog" aria-modal="true" aria-label="장비 상세">
      <button className="modal-close" onClick={onClose} aria-label="닫기">×</button>
      <span className={`equipment-status ${item.status}`}>{equipmentUnavailableReason(item) || "대여 가능"}</span>
      <h3>{equipmentName(item)}</h3>
      {item.holderName && <p>대여: {item.holderName}</p>}
      {canManage ? <label>장비 비고<textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="이 장비에 대한 비고를 입력해주세요" /></label> : item.note && <p>{item.note}</p>}
      {canManage && <div className="equipment-modal-actions">
        <button disabled={busy} onClick={() => void perform(() => onSaveNote(note), "장비 비고를 저장했어요")}>비고 저장</button>
        {item.status === "available" && !item.manualAvailable && <button disabled={busy} onClick={() => void perform(onLegacyAvailability, "기존 대여 불가능 설정을 해제했어요")}>대여 가능으로 설정</button>}
        {(item.status === "available" || item.status === "rented") && item.manualAvailable && <>
          <button disabled={busy} onClick={() => mark("lost")}>분실</button>
          <button disabled={busy} onClick={() => mark("damaged")}>손상</button>
        </>}
        {item.status === "lost" && <button disabled={busy} onClick={() => { if (window.confirm("이 장비의 분실 상태를 해제하시겠어요?")) void perform(() => onRestore("recover"), "분실물을 회수했어요"); }}>분실물 회수</button>}
        {item.status === "damaged" && <button disabled={busy} onClick={() => { if (window.confirm("이 장비를 수리 완료 처리하시겠어요?")) void perform(() => onRestore("repair"), "수리 완료했어요"); }}>수리 완료</button>}
        {item.status === "rented" && item.activeRentalId && <button disabled={busy} onClick={() => { if (window.confirm("이 장비가 포함된 대여를 반납 완료 처리하시겠어요?")) void perform(onReturnRental, "반납 완료했어요"); }}>반납 완료</button>}
        <button className="danger" disabled={busy} onClick={() => { if (window.confirm(`${equipmentName(item)} 장비를 삭제할까요? 삭제 후에는 복구할 수 없어요.`)) void perform(onDelete, "장비를 삭제했어요", true); }}>장비 삭제</button>
      </div>}
    </div>
  </div>;
}
