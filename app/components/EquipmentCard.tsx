"use client";

import type { MouseEvent, PointerEvent } from "react";
import { equipmentName, equipmentNameWithoutBowIndex, equipmentUnavailableReason, type Equipment } from "@/lib/equipment";

export default function EquipmentCard({ item, compact = false, showBowIndex = true, selected = false, onClick, onPointerDown, onPointerUp, onPointerLeave, onContextMenu }: {
  item: Equipment;
  compact?: boolean;
  showBowIndex?: boolean;
  selected?: boolean;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  onPointerDown?: (event: PointerEvent<HTMLButtonElement>) => void;
  onPointerUp?: (event: PointerEvent<HTMLButtonElement>) => void;
  onPointerLeave?: (event: PointerEvent<HTMLButtonElement>) => void;
  onContextMenu?: (event: MouseEvent) => void;
}) {
  const reason = equipmentUnavailableReason(item);
  return (
    <button
      className={`equipment-card ${compact ? "compact-bow" : ""} ${reason ? "unavailable" : ""} ${selected ? "bulk-selected" : ""}`}
      aria-pressed={selected}
      onClick={onClick}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerLeave={onPointerLeave}
      onContextMenu={onContextMenu}
    >
      {selected && <span className="bulk-check">✓</span>}
      <span>{item.kind === "bow" ? "활" : "화살"}</span>
      <b>{showBowIndex ? equipmentName(item) : equipmentNameWithoutBowIndex(item)}</b>
      <small>{reason || "대여 가능"}{item.holderName ? ` · ${item.holderName}` : ""}</small>
    </button>
  );
}
