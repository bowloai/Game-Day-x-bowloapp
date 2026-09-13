import { describe, expect, it } from "vitest";
import { isRollUpGame, matchesGameType } from "./gameTypes";

describe("Roll Up game identification", () => {
  const legacyRollUp = { type: "Roll Up", singlesType: null };
  const nestedRollUp = { type: "Practice", singlesType: "roll_up" };
  const standardPractice = { type: "Practice", singlesType: null };

  it("recognises legacy and nested Roll Up records", () => {
    expect(isRollUpGame(legacyRollUp)).toBe(true);
    expect(isRollUpGame(nestedRollUp)).toBe(true);
    expect(isRollUpGame(standardPractice)).toBe(false);
  });

  it("keeps Roll Up and Practice analysis filters useful", () => {
    expect(matchesGameType(legacyRollUp, "Roll Up")).toBe(true);
    expect(matchesGameType(nestedRollUp, "Roll Up")).toBe(true);
    expect(matchesGameType(nestedRollUp, "Practice")).toBe(true);
    expect(matchesGameType(standardPractice, "Practice")).toBe(true);
  });
});