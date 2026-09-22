import assert from "node:assert/strict";
import test from "node:test";
import { compareHeartFiveRecords, hasCompletedRound, isCompleteRecord, koreanToday, newlyEarnedPoints, parseHeartFiveRecord, recordStats } from "../lib/heartFive.ts";

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

test("partial next round is kept but excluded from completed-round statistics", () => {
  assert.deepEqual(recordStats(["中", "中", "↗", "↓", "中", "中"]), {
    hits: 3,
    best: 3,
    rounds: 1,
    shotCount: 6,
    average: 3,
  });
  assert.equal(hasCompletedRound(["中", "中", "中", "中", "中", "↗"]), true);
});

test("saved record parsing rejects malformed data", () => {
  const valid = { ownerUid: "uid", memberId: "123", memberName: "회원", date: "2026-09-22", createdAt: "2026-09-22T12:00:00.000Z", shots: ["中", "↗", "中", "↓", "中"] };
  assert.deepEqual(parseHeartFiveRecord("record-1", valid), { id: "record-1", place: "미지정", mode: "원사", ...valid });
  assert.deepEqual(parseHeartFiveRecord("record-2", { ...valid, shots: ["中"] })?.shots, ["中"]);
  assert.equal(parseHeartFiveRecord("record-near", { ...valid, mode: "근사" })?.mode, "근사");
  assert.equal(parseHeartFiveRecord("record-3", { ...valid, shots: ["bad"] }), null);
});

test("same-date records sort by highest round and then total hits", () => {
  const base = { ownerUid: "uid", memberId: "123", memberName: "회원", date: "2026-09-22", place: "부천정", createdAt: "2026-09-22T12:00:00.000Z" };
  const records = [
    { ...base, id: "many", shots: ["中", "中", "中", "↗", "↗", "中", "中", "↗", "↗", "↗"] },
    { ...base, id: "best", shots: ["中", "中", "中", "中", "↗"] },
    { ...base, id: "fewer", shots: ["中", "中", "中", "↗", "↗"] },
    { ...base, id: "newer", date: "2026-09-23", shots: ["↗", "↗", "↗", "↗", "↗"] },
  ];
  assert.deepEqual(records.sort(compareHeartFiveRecords).map((record) => record.id), ["newer", "best", "many", "fewer"]);
});

test("one record earns two points only on its first completed round", () => {
  const fourShots = ["中", "中", "中", "中"];
  const fiveShots = [...fourShots, "中"];
  assert.equal(newlyEarnedPoints(false, fourShots), 0);
  assert.equal(newlyEarnedPoints(false, fiveShots), 2);
  assert.equal(newlyEarnedPoints(true, [...fiveShots, "↗"]), 0);
});

test("record locking uses a Korean calendar date", () => {
  assert.match(koreanToday(), /^\d{4}-\d{2}-\d{2}$/);
});
