import { describe, it } from "vitest";
import assert from "assert";
import {
  EWBANK,
  ewbankToIrcra,
  FONT,
  fontToIrcra,
  FRENCH_SPORT,
  frenchSportToIrcra,
  IRCRAGrade,
  ircraToEwbank,
  ircraToFont,
  ircraToFrenchSport,
  ircraToVGrade,
  ircraToYDS,
  VGRADE,
  vGradeToIrcra,
  YDS,
  ydsToIrcra,
} from "./grade.js";

describe("Climbing Grade Conversions", () => {
  it("should convert VGrade to IRCRA and back", () => {
    for (const grade of VGRADE) {
      const ircra = vGradeToIrcra(grade);
      const convertedBack = ircraToVGrade(ircra);
      assert.strictEqual(convertedBack, grade);
    }
  });

  it("should convert FrenchSport to IRCRA and back", () => {
    for (const grade of FRENCH_SPORT) {
      const ircra = frenchSportToIrcra(grade);
      const convertedBack = ircraToFrenchSport(ircra);
      assert.strictEqual(convertedBack, grade);
    }
  });

  it("should convert Font to IRCRA and back", () => {
    for (const grade of FONT) {
      const ircra = fontToIrcra(grade);
      const convertedBack = ircraToFont(ircra);
      assert.strictEqual(convertedBack, grade);
    }
  });

  it("should convert YDS to IRCRA and back", () => {
    for (const grade of YDS) {
      const ircra = ydsToIrcra(grade);
      const convertedBack = ircraToYDS(ircra);
      assert.strictEqual(convertedBack, grade);
    }
  });

  it("should convert Ewbank to IRCRA and back", () => {
    for (const grade of EWBANK) {
      const ircra = ewbankToIrcra(grade);
      const convertedBack = ircraToEwbank(ircra);
      assert.strictEqual(convertedBack, grade < 4 ? 4 : grade);
    }
  });

  it("should convert between IRCRA and all other grades", () => {
    assert.strictEqual(
      frenchSportToIrcra(ircraToFrenchSport(1 as IRCRAGrade)),
      9,
      "frenchsport",
    );

    assert.strictEqual(
      frenchSportToIrcra(ircraToFrenchSport(33 as IRCRAGrade)),
      32,
      "frenchsport",
    );

    assert.strictEqual(ydsToIrcra(ircraToYDS(1 as IRCRAGrade)), 6, "yds");
    assert.strictEqual(ydsToIrcra(ircraToYDS(33 as IRCRAGrade)), 32, "yds");

    assert.strictEqual(fontToIrcra(ircraToFont(1 as IRCRAGrade)), 11, "font");
    assert.strictEqual(fontToIrcra(ircraToFont(33 as IRCRAGrade)), 32, "font");

    assert.strictEqual(
      vGradeToIrcra(ircraToVGrade(1 as IRCRAGrade)),
      12,
      "vgrade",
    );

    assert.strictEqual(
      vGradeToIrcra(ircraToVGrade(33 as IRCRAGrade)),
      33,
      "vgrade",
    );

    assert.strictEqual(
      ewbankToIrcra(ircraToEwbank(1 as IRCRAGrade)),
      1,
      "ewbank",
    );

    assert.strictEqual(
      ewbankToIrcra(ircraToEwbank(33 as IRCRAGrade)),
      32,
      "ewbank",
    );
  });
});
