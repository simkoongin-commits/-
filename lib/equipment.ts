export type EquipmentStatus = "available" | "rented" | "lost" | "damaged";

type EquipmentBase = {
  id: string;
  manualAvailable: boolean;
  status: EquipmentStatus;
  note?: string;
  holderId?: string;
  holderName?: string;
  activeRentalId?: string;
  createdAt: string;
};

export type BowEquipment = EquipmentBase & {
  kind: "bow";
  pound: string;
  length: string;
  side: "좌궁" | "우궁";
};

export type ArrowEquipment = EquipmentBase & {
  kind: "arrow";
  lengthWeight: string;
  index: string;
  indexNumber: string;
};

export type Equipment = BowEquipment | ArrowEquipment;
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

export const equipmentName = (item: Equipment) =>
  item.kind === "bow"
    ? `${item.pound}lb · ${item.length} · ${item.side}`
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

export const makeEquipmentId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
