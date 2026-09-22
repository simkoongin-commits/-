import assert from "node:assert/strict";
import test from "node:test";
import { isCompleteRecord, parseHeartFiveRecord, recordStats } from "../lib/heartFive.ts";

test("five shots complete one round and total scores count only hits", () => {
  const shots = ["中", "↗", "中", "↓", "中", "→", "中", "中", "中", "中"];
  assert.equal(isCompleteRecord(shots), true);
  assert.deepEqual(recordStats(shots), {
    hits: 7,
    best: 4,
    rounds: 2,
    shotCount: 10,
    average: 3.5,
  });
});

test("partial and invalid rounds cannot be saved", () => {
  assert.equal(isCompleteRecord([]), false);
  assert.equal(isCompleteRecord(["中", "中"]), false);
  assert.equal(isCompleteRecord(["中", "中", "中", "中", "invalid"]), false);
});

test("saved record parsing rejects malformed data", () => {
  const valid = { ownerUid: "uid", memberId: "123", memberName: "회원", date: "2026-09-22", createdAt: "2026-09-22T12:00:00.000Z", shots: ["中", "↗", "中", "↓", "中"] };
  assert.deepEqual(parseHeartFiveRecord("record-1", valid), { id: "record-1", ...valid });
  assert.equal(parseHeartFiveRecord("record-2", { ...valid, shots: ["中"] }), null);
});
