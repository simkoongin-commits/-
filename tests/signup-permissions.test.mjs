import { test } from "node:test";
import assert from "node:assert/strict";
import { availableSignupPermission, normalizeSignupName, normalizeSignupPermissions } from "../lib/signupPermissions.ts";

test("signup names are normalized without changing their meaning", () => {
  assert.equal(normalizeSignupName("  홍  길동 "), "홍 길동");
});

test("only an exact unused name and student id pair is available", () => {
  const permissions = normalizeSignupPermissions([
    { studentId: "2026000001", name: "홍길동", createdAt: "2026-09-25" },
    { studentId: "2026000002", name: "김민지", createdAt: "2026-09-25", usedAt: "2026-09-25" },
  ]);
  assert.ok(availableSignupPermission(permissions, "2026000001", " 홍길동 "));
  assert.equal(availableSignupPermission(permissions, "2026000001", "다른 이름"), undefined);
  assert.equal(availableSignupPermission(permissions, "2026000002", "김민지"), undefined);
});

test("invalid and duplicate permissions are removed", () => {
  const permissions = normalizeSignupPermissions([
    { studentId: "2026000001", name: "홍길동", createdAt: "" },
    { studentId: "2026000001", name: "중복", createdAt: "" },
    { studentId: "not-a-number", name: "오류", createdAt: "" },
  ]);
  assert.deepEqual(permissions.map((item) => item.name), ["홍길동"]);
});
