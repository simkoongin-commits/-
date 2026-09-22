import { test } from "node:test";
import assert from "node:assert/strict";
import { memberDisplayLabel } from "../lib/memberDisplay.ts";
import { validateArrowDeletion } from "../lib/equipment.ts";

const arrow = (id, lengthWeight, index, status = "available") => ({
  id, kind: "arrow", lengthWeight, index, indexNumber: "1", status,
  manualAvailable: true, createdAt: "2026-09-22",
});

test("official positions take precedence over grade and team", () => {
  assert.equal(memberDisplayLabel({ grade: "신사", team: "장비팀", position: "장비팀장" }), "장비팀장");
  assert.equal(memberDisplayLabel({ grade: "신사", team: "장비팀" }), "신사-장비팀");
  assert.equal(memberDisplayLabel({ grade: "구사" }), "구사");
});

test("arrows across categories may be deleted in one selection", () => {
  const items = [arrow("a", "30-400", "A"), arrow("b", "32-500", "B")];
  assert.deepEqual(validateArrowDeletion(items, [], ["a", "b"]).map((item) => item.id), ["a", "b"]);
});

test("bulk deletion rejects unavailable or rental-linked items", () => {
  const items = [arrow("a", "30-400", "A"), arrow("b", "32-500", "B", "rented")];
  assert.throws(() => validateArrowDeletion(items, [], ["a", "b"]));
  assert.throws(() => validateArrowDeletion(items, [{ itemIds: ["a"] }], ["a"]));
  assert.throws(() => validateArrowDeletion(items, [], ["a", "missing"]));
});
