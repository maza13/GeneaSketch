import { describe, expect, it } from "vitest";
import {
  buildGedcomDateFromAssistState,
  createDefaultDateAssistState,
  parseGedcomDateToAssistState
} from "@/ui/person/personDetailUtils";

describe("gedcom date assist", () => {
  it("builds exact date", () => {
    const state = createDefaultDateAssistState();
    state.mode = "exact";
    state.exactDay = "15";
    state.exactMonth = "JAN";
    state.exactYear = "1901";
    expect(buildGedcomDateFromAssistState(state)).toBe("15 JAN 1901");
  });

  it("builds approx/before/after formats", () => {
    const approx = createDefaultDateAssistState();
    approx.mode = "approx";
    approx.approxPrefix = "EST";
    approx.exactYear = "1899";
    expect(buildGedcomDateFromAssistState(approx)).toBe("EST 1899");

    const before = createDefaultDateAssistState();
    before.mode = "before";
    before.exactYear = "1910";
    expect(buildGedcomDateFromAssistState(before)).toBe("BEF 1910");

    const after = createDefaultDateAssistState();
    after.mode = "after";
    after.exactYear = "1910";
    expect(buildGedcomDateFromAssistState(after)).toBe("AFT 1910");
  });

  it("builds and parses range", () => {
    const range = createDefaultDateAssistState();
    range.mode = "range";
    range.rangeStartYear = "1880";
    range.rangeEndYear = "1888";
    const built = buildGedcomDateFromAssistState(range);
    expect(built).toBe("BET 1880 AND 1888");

    const parsed = parseGedcomDateToAssistState(built);
    expect(parsed.mode).toBe("range");
    expect(parsed.rangeStartYear).toBe("1880");
    expect(parsed.rangeEndYear).toBe("1888");
  });
});
