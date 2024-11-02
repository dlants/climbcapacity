// see https://www.ircra.rocks/single-post/2016/09/12/reporting-grades-in-climbing-research
import { assertUnreachable } from "./utils.js";

export const FONT = {
  "3": true,
  "4": true,
  "4+": true,
  "5": true,
  "5+": true,
  "6A": true,
  "6A+": true,
  "6B": true,
  "6B+": true,
  "6C": true,
  "6C+": true,
  "7A": true,
  "7A+": true,
  "7B": true,
  "7B+": true,
  "7C": true,
  "7C+": true,
  "8A": true,
  "8A+": true,
  "8B": true,
  "8B+": true,
  "8C": true,
} as const;

export type Font = keyof typeof FONT;

export const VGRADE = {
  0: true,
  1: true,
  2: true,
  3: true,
  4: true,
  5: true,
  6: true,
  7: true,
  8: true,
  9: true,
  10: true,
  11: true,
  12: true,
  13: true,
  14: true,
  15: true,
  16: true,
  17: true,
} as const;

export type VGrade = keyof typeof VGRADE;

export const FRENCH_SPORT = {
  "5": true,
  "5+": true,
  "6a": true,
  "6a+": true,
  "6b": true,
  "6b+": true,
  "6c": true,
  "6c+": true,
  "7a": true,
  "7a+": true,
  "7b": true,
  "7b+": true,
  "7c": true,
  "7c+": true,
  "8a": true,
  "8a+": true,
  "8b": true,
  "8b+": true,
  "8c": true,
  "8c+": true,
  "9a": true,
  "9a+": true,
  "9b": true,
  "9b+": true,
} as const;

export type FrenchSport = keyof typeof FRENCH_SPORT;

export const YDS = {
  "5.6": true,
  "5.7": true,
  "5.8": true,
  "5.9": true,
  "5.10a": true,
  "5.10b": true,
  "5.10c": true,
  "5.10d": true,
  "5.11a": true,
  "5.11b": true,
  "5.11c": true,
  "5.11d": true,
  "5.12a": true,
  "5.12b": true,
  "5.12c": true,
  "5.12d": true,
  "5.13a": true,
  "5.13b": true,
  "5.13c": true,
  "5.13d": true,
  "5.14a": true,
  "5.14b": true,
  "5.14c": true,
  "5.14d": true,
  "5.15a": true,
  "5.15b": true,
  "5.15c": true,
} as const;

export type YDS = keyof typeof YDS;

export const EWBANK = {
  1: true,
  2: true,
  3: true,
  4: true,
  5: true,
  6: true,
  7: true,
  8: true,
  9: true,
  10: true,
  11: true,
  12: true,
  13: true,
  14: true,
  15: true,
  16: true,
  17: true,
  18: true,
  19: true,
  20: true,
  21: true,
  22: true,
  23: true,
  24: true,
  25: true,
  26: true,
  27: true,
  28: true,
  29: true,
  30: true,
  31: true,
  32: true,
  33: true,
  34: true,
  35: true,
  36: true,
  37: true,
  38: true,
} as const;
export type EwbankGrade = keyof typeof EWBANK;

export type IRCRAGrade = number & { __brand: "IRCRAGrade" };

export function vGradeToIrcra(grade: VGrade): IRCRAGrade {
  return (() => {
    switch (grade) {
      case 0:
        return 12;
      case 1:
        return 14.5;
      case 2:
        return 15.5;
      case 3:
        return 16.5;
      case 4:
        return 18;
      case 5:
        return 19;
      case 6:
        return 20;
      case 7:
        return 21.5;
      case 8:
        return 22.5;
      case 9:
        return 23.5;
      case 10:
        return 25;
      case 11:
        return 26;
      case 12:
        return 27.5;
      case 13:
        return 28.5;
      case 14:
        return 29.5;
      case 15:
        return 31;
      case 16:
        return 32;
      case 17:
        return 33;
      default:
        assertUnreachable(grade);
    }
  })() as IRCRAGrade;
}

export function ircraToVGrade(grade: IRCRAGrade): VGrade {
  return (() => {
    if (grade < 14.5) return 0;
    if (grade < 15.5) return 1;
    if (grade < 16.5) return 2;
    if (grade < 18) return 3;
    if (grade < 19) return 4;
    if (grade < 20) return 5;
    if (grade < 21.5) return 6;
    if (grade < 22.5) return 7;
    if (grade < 23.5) return 8;
    if (grade < 25) return 9;
    if (grade < 26) return 10;
    if (grade < 27.5) return 11;
    if (grade < 28.5) return 12;
    if (grade < 29.5) return 13;
    if (grade < 31) return 14;
    if (grade < 32) return 15;
    if (grade <= 32) return 16;
    throw new Error(`Unexpected IRCRA grade ${grade}`);
  })() as VGrade;
}

export function frenchSportToIrcra(grade: FrenchSport): IRCRAGrade {
  return (() => {
    switch (grade) {
      case "5":
        return 9;
      case "5+":
        return 10;
      case "6a":
        return 11;
      case "6a+":
        return 12;
      case "6b":
        return 13;
      case "6b+":
        return 14;
      case "6c":
        return 15;
      case "6c+":
        return 16;
      case "7a":
        return 17;
      case "7a+":
        return 18;
      case "7b":
        return 19;
      case "7b+":
        return 20;
      case "7c":
        return 21;
      case "7c+":
        return 22;
      case "8a":
        return 23;
      case "8a+":
        return 24;
      case "8b":
        return 25;
      case "8b+":
        return 26;
      case "8c":
        return 27;
      case "8c+":
        return 28;
      case "9a":
        return 29;
      case "9a+":
        return 30;
      case "9b":
        return 31;
      case "9b+":
        return 32;
      default:
        assertUnreachable(grade);
    }
  })() as IRCRAGrade;
}

export function fromIRCRAtoFrenchSport(grade: IRCRAGrade): FrenchSport {
  return (() => {
    if (grade < 10) return "5";
    if (grade < 11) return "5+";
    if (grade < 12) return "6a";
    if (grade < 13) return "6a+";
    if (grade < 14) return "6b";
    if (grade < 15) return "6b+";
    if (grade < 16) return "6c";
    if (grade < 17) return "6c+";
    if (grade < 18) return "7a";
    if (grade < 19) return "7a+";
    if (grade < 20) return "7b";
    if (grade < 21) return "7b+";
    if (grade < 22) return "7c";
    if (grade < 23) return "7c+";
    if (grade < 24) return "8a";
    if (grade < 25) return "8a+";
    if (grade < 26) return "8b";
    if (grade < 27) return "8b+";
    if (grade < 28) return "8c";
    if (grade < 29) return "8c+";
    if (grade < 30) return "9a";
    if (grade < 31) return "9a+";
    if (grade < 32) return "9b";
    if (grade <= 32) return "9b+";
    throw new Error(`Invalid IRCRA grade ${grade}`);
  })() as FrenchSport;
}

export function fontToIrcra(grade: Font): IRCRAGrade {
  return (() => {
    switch (grade) {
      case "3":
        return 11;
      case "4":
        return 12;
      case "4+":
        return 13;
      case "5":
        return 14;
      case "5+":
        return 15;
      case "6A":
        return 16;
      case "6A+":
        return 16.5;
      case "6B":
        return 17;
      case "6B+":
        return 18;
      case "6C":
        return 18.5;
      case "6C+":
        return 21;
      case "7A":
        return 22;
      case "7A+":
        return 23;
      case "7B":
        return 24;
      case "7B+":
        return 25;
      case "7C":
        return 26;
      case "7C+":
        return 27;
      case "8A":
        return 28;
      case "8A+":
        return 29;
      case "8B":
        return 30;
      case "8B+":
        return 31;
      case "8C":
        return 32;
      default:
        throw new Error(`Unexpected Font grade ${grade}`);
    }
  })() as IRCRAGrade;
}
export function ircraToFont(grade: IRCRAGrade): Font {
  return (() => {
    if (grade < 13) return "4";
    if (grade < 14) return "4+";
    if (grade < 15) return "5";
    if (grade < 16) return "5+";
    if (grade < 17) return "6A";
    if (grade < 18) return "6A+";
    if (grade < 19) return "6B";
    if (grade < 20) return "6B+";
    if (grade < 21) return "6C";
    if (grade < 22) return "6C+";
    if (grade < 23) return "7A";
    if (grade < 24) return "7A+";
    if (grade < 25) return "7B";
    if (grade < 26) return "7B+";
    if (grade < 27) return "7C";
    if (grade < 28) return "7C+";
    if (grade < 29) return "8A";
    if (grade < 30) return "8A+";
    if (grade < 31) return "8B";
    if (grade < 32) return "8B+";
    if (grade <= 32) return "8C";
    throw new Error(`Unexpected IRCRA grade ${grade}`);
  })() as Font;
}
export function ydsToIrcra(grade: YDS): IRCRAGrade {
  return (() => {
    switch (grade) {
      case "5.6":
        return 6;
      case "5.7":
        return 7;
      case "5.8":
        return 8;
      case "5.9":
        return 9;
      case "5.10a":
        return 10;
      case "5.10b":
        return 11;
      case "5.10c":
        return 12;
      case "5.10d":
        return 13;
      case "5.11a":
        return 14;
      case "5.11b":
        return 15;
      case "5.11c":
        return 16;
      case "5.11d":
        return 17;
      case "5.12a":
        return 18;
      case "5.12b":
        return 19;
      case "5.12c":
        return 20;
      case "5.12d":
        return 21;
      case "5.13a":
        return 22;
      case "5.13b":
        return 23;
      case "5.13c":
        return 24;
      case "5.13d":
        return 25;
      case "5.14a":
        return 26;
      case "5.14b":
        return 27;
      case "5.14c":
        return 28;
      case "5.14d":
        return 29;
      case "5.15a":
        return 30;
      case "5.15b":
        return 31;
      case "5.15c":
        return 32;

      default:
        assertUnreachable(grade);
    }
  })() as IRCRAGrade;
}

export function ircraToYDS(grade: IRCRAGrade): YDS {
  return (() => {
    if (grade < 7) return "5.6";
    if (grade < 8) return "5.7";
    if (grade < 9) return "5.8";
    if (grade < 10) return "5.9";
    if (grade < 11) return "5.10a";
    if (grade < 12) return "5.10b";
    if (grade < 13) return "5.10c";
    if (grade < 14) return "5.10d";
    if (grade < 15) return "5.11a";
    if (grade < 16) return "5.11b";
    if (grade < 17) return "5.11c";
    if (grade < 18) return "5.11d";
    if (grade < 19) return "5.12a";
    if (grade < 20) return "5.12b";
    if (grade < 21) return "5.12c";
    if (grade < 22) return "5.12d";
    if (grade < 23) return "5.13a";
    if (grade < 24) return "5.13b";
    if (grade < 25) return "5.13c";
    if (grade < 26) return "5.13d";
    if (grade < 27) return "5.14a";
    if (grade < 28) return "5.14b";
    if (grade < 29) return "5.14c";
    if (grade < 30) return "5.14d";
    if (grade < 31) return "5.15a";
    if (grade < 32) return "5.15b";
    if (grade <= 32) return "5.15c";
    throw new Error(`Unexpected IRCRA grade ${grade}`);
  })() as YDS;
}

export function ewbankToIrcra(grade: EwbankGrade): IRCRAGrade {
  return (() => {
    switch (grade) {
      case 1:
      case 2:
      case 3:
      case 4:
        return 1;
      case 5:
        return 1.5; // interpolated
      case 6:
        return 2;
      case 7:
        return 2.5; // interpolated
      case 8:
        return 3;
      case 9:
        return 3.8; // interpolated
      case 10:
        return 4.6;
      case 11:
        return 5.3; // interpolated
      case 12:
        return 6;
      case 13:
        return 6.8; // interpolated
      case 14:
        return 7.5;
      case 15:
        return 8.3; // interpolated
      case 16:
        return 9;
      case 17:
        return 9.5; // interpolated
      case 18:
        return 10;
      case 19:
        return 11.5;
      case 20:
        return 12.5;
      case 21:
        return 14;
      case 22:
        return 15.5;
      case 23:
        return 17;
      case 24:
        return 18;
      case 25:
        return 19;
      case 26:
        return 20;
      case 27:
        return 21;
      case 28:
        return 22;
      case 29:
        return 23;
      case 30:
        return 24;
      case 31:
        return 25;
      case 32:
        return 26;
      case 33:
        return 27;
      case 34:
        return 28;
      case 35:
        return 29;
      case 36:
        return 30;
      case 37:
        return 31;
      case 38:
        return 32;
      default:
        assertUnreachable(grade);
    }
  })() as IRCRAGrade;
}

export function ircraToEwbank(grade: IRCRAGrade): EwbankGrade {
  return (() => {
    if (grade < 1.5) return 4;
    if (grade < 2) return 5;
    if (grade < 2.5) return 6;
    if (grade < 3) return 7;
    if (grade < 3.8) return 8;
    if (grade < 4.6) return 9;
    if (grade < 5.3) return 10;
    if (grade < 6) return 11;
    if (grade < 6.8) return 12;
    if (grade < 7.5) return 13;
    if (grade < 8.3) return 14;
    if (grade < 9) return 15;
    if (grade < 9.5) return 16;
    if (grade < 10) return 17;
    if (grade < 11.5) return 18;
    if (grade < 12.5) return 19;
    if (grade < 14) return 20;
    if (grade < 15.5) return 21;
    if (grade < 17) return 22;
    if (grade < 18) return 23;
    if (grade < 19) return 24;
    if (grade < 20) return 25;
    if (grade < 21) return 26;
    if (grade < 22) return 27;
    if (grade < 23) return 28;
    if (grade < 24) return 29;
    if (grade < 25) return 30;
    if (grade < 26) return 31;
    if (grade < 27) return 32;
    if (grade < 28) return 33;
    if (grade < 29) return 34;
    if (grade < 30) return 35;
    if (grade < 31) return 36;
    if (grade < 32) return 37;
    if (grade <= 32) return 38;
    throw new Error(`Unexpected IRCRA grade ${grade}`);
  })() as EwbankGrade;
}
