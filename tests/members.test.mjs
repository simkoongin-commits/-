import assert from "node:assert/strict";
import test from "node:test";
import {
  gradeFor,
  memberTeam,
  normalizeMemberTeam,
  teamForPosition,
  validMemberTerm,
} from "../lib/members.ts";

test("member grade follows join term and current term", () => {
  assert.equal(gradeFor("26-2", "26-2"), "예비신사");
  assert.equal(gradeFor("26-1", "26-2"), "신사");
  assert.equal(gradeFor("25-2", "26-2"), "구사");
});

test("official positions determine their fixed team", () => {
  assert.equal(teamForPosition("대표"), "대표팀");
  assert.equal(teamForPosition("장비팀장"), "장비팀");
  assert.equal(memberTeam({ position: "교육팀장", team: "홍보팀" }), "교육팀");
});

test("invalid stored teams and terms are normalized", () => {
  assert.equal(normalizeMemberTeam({ team: "없는팀" }), "");
  assert.equal(validMemberTerm("26-2"), true);
  assert.equal(validMemberTerm("2026-2"), false);
});
