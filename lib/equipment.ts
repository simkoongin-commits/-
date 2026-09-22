export type EquipmentStatus = "available" | "rented" | "lost" | "damaged";

type EquipmentBase = {
  id: string;
  manualAvailable: boolean;
  status: EquipmentStatus;
  note?: string;
  holderId?: string;
  holderName?: string;
  activeRentalId?: string;
  rentalCount?: number;
  createdAt: string;
};

export type BowEquipment = EquipmentBase & {
  kind: "bow";
  pound: string;
  length: string;
  side: "좌궁" | "우궁";
  indexNumber?: number;
};

export type ArrowEquipment = EquipmentBase & {
  kind: "arrow";
  lengthWeight: string;
  index: string;
  indexNumber: string;
};

export type Equipment = BowEquipment | ArrowEquipment;

export const groupArrows = (arrows: ArrowEquipment[]) => {
  const groups = new Map<string, Map<string, ArrowEquipment[]>>();
  for (const arrow of arrows) {
    if (!groups.has(arrow.lengthWeight)) groups.set(arrow.lengthWeight, new Map());
    const indexes = groups.get(arrow.lengthWeight)!;
    if (!indexes.has(arrow.index)) indexes.set(arrow.index, []);
    indexes.get(arrow.index)!.push(arrow);
  }
  return groups;
};
export type RentalNoteType = "lost" | "damaged" | "custom";

export type RentalNote = {
  id: string;
  type: RentalNoteType;
  itemIds: string[];
  details?: Record<string, string>;
  text?: string;
};

export type EquipmentRental = {
  id: string;
  memberId: string;
  memberName: string;
  loanDate: string;
  returnDate?: string;
  itemIds: string[];
  notes: RentalNote[];
  status: "active" | "returned";
  createdAt: string;
  completedAt?: string;
};

// Validate the entire selection before one transaction removes any item.
// Arrow category is intentionally unrestricted; active/historical rentals are not.
export const validateArrowDeletion = (items: Equipment[], rentals: EquipmentRental[], ids: string[]) => {
  const selectedIds = new Set(ids);
  const selected = items.filter((item) => selectedIds.has(item.id));
  if (!ids.length || selectedIds.size !== ids.length || selected.length !== ids.length || selected.some((item) => item.kind !== "arrow")) {
    throw new Error("화살 선택을 다시 확인해주세요.");
  }
  if (selected.some((item) => item.status !== "available" || rentals.some((rental) => rental.itemIds.includes(item.id)))) {
    throw new Error("대여·분실·손상 상태 또는 대여 기록이 있는 장비는 삭제할 수 없어요.");
  }
  return selected;
};

export const bowGroupKey = (item: Pick<BowEquipment, "pound" | "length" | "side">) =>
  [item.pound.trim().toLowerCase(), item.length.trim().toLowerCase(), item.side].join("|");

export const assignBowIndexes = (items: Equipment[]) => {
  const indexedBows = new Map<string, BowEquipment>();
  const groups = new Map<string, BowEquipment[]>();
  items.forEach((item) => {
    if (item.kind !== "bow") return;
    const key = bowGroupKey(item);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  });
  groups.forEach((bows) => {
    const used = new Set<number>();
    bows
      .slice()
      .sort((a, b) =>
        (a.indexNumber || Number.MAX_SAFE_INTEGER) - (b.indexNumber || Number.MAX_SAFE_INTEGER) ||
        a.createdAt.localeCompare(b.createdAt) ||
        a.id.localeCompare(b.id),
      )
      .forEach((bow) => {
        let indexNumber = Number.isInteger(bow.indexNumber) && Number(bow.indexNumber) > 0
          ? Number(bow.indexNumber)
          : 1;
        while (used.has(indexNumber)) indexNumber += 1;
        used.add(indexNumber);
        indexedBows.set(bow.id, { ...bow, indexNumber });
      });
  });
  return items.map((item) => item.kind === "bow" ? indexedBows.get(item.id) || item : item);
};

export const equipmentName = (item: Equipment) =>
  item.kind === "bow"
    ? `${item.indexNumber ? `#${item.indexNumber} · ` : ""}${item.pound}lb · ${item.length} · ${item.side}`
    : `${item.lengthWeight} · ${item.index} · ${item.indexNumber}`;

export const equipmentUnavailableReason = (item: Equipment) => {
  if (item.status === "rented") return "다른 회원이 대여 중";
  if (item.status === "lost") return "분실 상태";
  if (item.status === "damaged") return "손상 상태";
  if (!item.manualAvailable) return "관리자가 대여 불가능으로 설정";
  return "";
};

export const canRentEquipment = (item: Equipment) =>
  item.manualAvailable && item.status === "available";

export const releaseEquipment = (item: Equipment): Equipment => {
  const { holderId: _holderId, holderName: _holderName, activeRentalId: _activeRentalId, ...rest } = item;
  return { ...rest, status: "available" } as Equipment;
};

// A recovered item remains rented until its active rental is returned.
export const restoreEquipmentCondition = (item: Equipment, activeRental: boolean): Equipment =>
  activeRental ? { ...item, status: "rented" } : releaseEquipment(item);

export const makeEquipmentId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
