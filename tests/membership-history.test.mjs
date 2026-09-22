import { test } from "node:test";
import assert from "node:assert/strict";
import { nextTerm, normalizeTermSnapshots, normalizeWithdrawals, termOrder, validTerm } from "../lib/membershipHistory.ts";
import { calendarArchive } from "../lib/practiceStats.ts";

test("semester transitions remain ordered across years", () => {
  assert.equal(nextTerm("26-1"), "26-2");
  assert.equal(nextTerm("26-2"), "27-1");
  assert.ok(termOrder("26-2") < termOrder("27-1"));
  assert.equal(validTerm("26-3"), false);
});

test("membership history accepts only minimal valid records", () => {
  assert.deepEqual(normalizeTermSnapshots([{ term: "26-1", members: [{ id: "1", name: "회원", joinTerm: "25-2", grade: "신사" }] }]), [
    { term: "26-1", members: [{ id: "1", name: "회원", joinTerm: "25-2" }] },
  ]);
  assert.deepEqual(normalizeWithdrawals([{ name: "회원", joinTerm: "25-2", withdrawnTerm: "26-2", studentId: "1" }]), [
    { name: "회원", joinTerm: "25-2", withdrawnTerm: "26-2" },
  ]);
});

test("calendar archive drops attendance and location data", () => {
  assert.deepEqual(calendarArchive({ id: 1, title: "습사", type: "regular", date: "2026-09-22", start: "10:00", place: "활터", applicantCount: 5, attendanceCount: 3 }), {
    id: 1, title: "습사", type: "regular", date: "2026-09-22", start: "10:00",
  });
});
