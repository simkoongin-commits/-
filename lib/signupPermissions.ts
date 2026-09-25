export type SignupPermission = {
  studentId: string;
  name: string;
  createdAt: string;
  usedAt?: string;
  usedBy?: string;
};

export const normalizeSignupName = (value: string) =>
  value.trim().replace(/\s+/g, " ");

export const normalizeSignupPermissions = (value: unknown): SignupPermission[] => {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value.flatMap((candidate) => {
    if (!candidate || typeof candidate !== "object") return [];
    const item = candidate as Partial<SignupPermission>;
    const studentId = typeof item.studentId === "string" ? item.studentId.trim() : "";
    const name = typeof item.name === "string" ? normalizeSignupName(item.name) : "";
    if (!/^\d+$/.test(studentId) || !name || seen.has(studentId)) return [];
    seen.add(studentId);
    return [{
      studentId,
      name,
      createdAt: typeof item.createdAt === "string" ? item.createdAt : "",
      ...(typeof item.usedAt === "string" ? { usedAt: item.usedAt } : {}),
      ...(typeof item.usedBy === "string" ? { usedBy: item.usedBy } : {}),
    }];
  });
};

export const availableSignupPermission = (
  permissions: SignupPermission[],
  studentId: string,
  name: string,
) => permissions.find((item) =>
  item.studentId === studentId.trim() &&
  item.name === normalizeSignupName(name) &&
  !item.usedAt,
);
