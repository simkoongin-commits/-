import { test } from "node:test";
import assert from "node:assert/strict";
import { memberDisplayLabel } from "../lib/memberDisplay.ts";
import { arrowConditionLabels, countsTowardInventory, formatArrowCount, formatGroupedArrowCount, restoreEquipmentCondition, validateArrowDeletion } from "../lib/equipment.ts";

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

test("recovered equipment remains rented until an active rental is returned", () => {
  const lost = { ...arrow("a", "30-400", "A", "lost"), holderId: "member", holderName: "회원", activeRentalId: "rental" };
  assert.equal(restoreEquipmentCondition(lost, true).status, "rented");
  const returned = restoreEquipmentCondition(lost, false);
  assert.equal(returned.status, "available");
  assert.equal(returned.activeRentalId, undefined);
});

test("arrow inventory converts usable arrows into rounds and shots", () => {
  assert.equal(formatArrowCount(5), "1순");
  assert.equal(formatArrowCount(14), "2순+4시");
  assert.equal(formatArrowCount(4), "4시");
});

test("partial alphabet indexes do not combine into complete rounds", () => {
  const arrows = [];
  for (const index of ["B", "C", "D", "E", "F", "G"]) {
    for (let number = 1; number <= 5; number += 1) {
      if ((index === "C" || index === "F") && number === 1) continue;
      arrows.push({ ...arrow(`${index}${number}`, "5555", index), indexNumber: String(number) });
    }
  }
  assert.equal(formatGroupedArrowCount(arrows), "4순+8시");
});

test("lost and damaged equipment are excluded and described by arrow number", () => {
  const lost = { ...arrow("lost", "5555", "C", "lost"), indexNumber: "1" };
  const damaged = { ...arrow("damaged", "5555", "F", "damaged"), indexNumber: "4" };
  assert.equal(countsTowardInventory(lost), false);
  assert.equal(countsTowardInventory(damaged), false);
  assert.deepEqual(arrowConditionLabels([lost, damaged]), ["C1 분실", "F4 손상"]);
});
