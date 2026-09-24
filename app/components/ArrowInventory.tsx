"use client";

import { useMemo, useState } from "react";
import { arrowConditionLabels, countsTowardInventory, formatArrowCount, groupArrows, type ArrowEquipment } from "@/lib/equipment";
import EquipmentCard from "@/app/components/EquipmentCard";

type ArrowPreset = { lengthWeight?: string; index?: string };

const cancelArrowPress = (card: HTMLButtonElement) => {
  window.clearTimeout(Number(card.dataset.arrowPressTimer));
  delete card.dataset.arrowPressTimer;
};

const suppressNextClick = (card: HTMLButtonElement) => {
  card.dataset.arrowSuppressClick = "true";
  window.setTimeout(() => { delete card.dataset.arrowSuppressClick; }, 700);
};

export default function ArrowInventory({ arrows, canManage, onAdd, onOpen, onDeleteMany, notify }: {
  arrows: ArrowEquipment[];
  canManage: boolean;
  onAdd: (preset: ArrowPreset) => void;
  onOpen: (item: ArrowEquipment) => void;
  onDeleteMany: (ids: string[]) => Promise<void>;
  notify: (message: string) => void;
}) {
  const groups = useMemo(() => groupArrows(arrows), [arrows]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);

  const toggle = (id: string) => {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };
  const beginSelection = (id: string) => {
    setSelectionMode(true);
    setSelectedIds((current) => current.includes(id) ? current : [...current, id]);
  };
  const closeSelection = () => {
    setSelectionMode(false);
    setSelectedIds([]);
  };
  const deleteSelected = async () => {
    if (!selectedIds.length || deleting || !window.confirm(`선택한 화살 ${selectedIds.length}개를 모두 삭제할까요? 복구할 수 없어요.`)) return;
    setDeleting(true);
    try {
      await onDeleteMany(selectedIds);
      closeSelection();
      notify("선택한 화살을 삭제했어요");
    } catch (error) {
      notify(error instanceof Error ? error.message : "화살을 삭제하지 못했어요.");
    } finally {
      setDeleting(false);
    }
  };

  return <div className="arrow-tree">
    {canManage && <div className="arrow-bulk-toolbar">
      <span>화살을 길게 누르거나 선택 시작을 눌러 여러 분류에서 선택하세요.</span>
      {selectionMode ? <><b>{selectedIds.length}개 선택</b><button onClick={closeSelection}>취소</button><button className="danger" disabled={deleting || selectedIds.length === 0} onClick={() => void deleteSelected()}>삭제</button></> : <button onClick={() => setSelectionMode(true)}>선택 시작</button>}
    </div>}
    {groups.size ? [...groups].map(([lengthWeight, indexes]) => {
      const groupItems = [...indexes.values()].flat();
      const conditionCounts = [
        groupItems.filter((item) => item.status === "lost").length ? `분실 ${groupItems.filter((item) => item.status === "lost").length}개` : "",
        groupItems.filter((item) => item.status === "damaged").length ? `손상 ${groupItems.filter((item) => item.status === "damaged").length}개` : "",
      ].filter(Boolean);
      return <details key={lengthWeight}>
      <summary><span>{lengthWeight}</span><span className="arrow-summary-actions"><span className="arrow-count-labels"><small>{formatArrowCount(groupItems.filter(countsTowardInventory).length)}</small>{conditionCounts.map((label) => <small className="condition" key={label}>{label}</small>)}</span>{canManage && <button onClick={(event) => { event.preventDefault(); onAdd({ lengthWeight }); }}>+</button>}</span></summary>
      <div>{[...indexes].map(([index, items]) => <details key={index}>
        <summary><span>{index}</span><span className="arrow-summary-actions"><span className="arrow-count-labels"><small>{formatArrowCount(items.filter(countsTowardInventory).length)}</small>{arrowConditionLabels(items).map((label) => <small className="condition" key={label}>{label}</small>)}</span>{canManage && <button onClick={(event) => { event.preventDefault(); onAdd({ lengthWeight, index }); }}>+</button>}</span></summary>
        <div className="equipment-grid">{items.map((item) => <EquipmentCard
          key={item.id}
          item={item}
          selected={selectedIds.includes(item.id)}
          onPointerDown={(event) => {
            if (!canManage || selectionMode) return;
            const card = event.currentTarget;
            cancelArrowPress(card);
            card.dataset.arrowPressTimer = String(window.setTimeout(() => {
              suppressNextClick(card);
              beginSelection(item.id);
            }, 550));
          }}
          onPointerUp={(event) => cancelArrowPress(event.currentTarget)}
          onPointerLeave={(event) => cancelArrowPress(event.currentTarget)}
          onContextMenu={(event) => {
            if (!canManage) return;
            event.preventDefault();
            const card = event.currentTarget as HTMLButtonElement;
            cancelArrowPress(card);
            if (card.dataset.arrowSuppressClick === "true") return;
            suppressNextClick(card);
            beginSelection(item.id);
          }}
          onClick={(event) => {
            const card = event.currentTarget;
            if (card.dataset.arrowSuppressClick === "true") {
              delete card.dataset.arrowSuppressClick;
              return;
            }
            if (selectionMode) toggle(item.id);
            else onOpen(item);
          }}
        />)}</div>
      </details>)}</div>
    </details>}) : <p className="equipment-empty">등록된 화살이 없어요.</p>}
  </div>;
}
