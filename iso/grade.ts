// see https://www.ircra.rocks/single-post/2016/09/12/reporting-grades-in-climbing-research
import { assertUnreachable } from "./utils.js";

export const FONT = [
  "3",
  "4",
  "4+",
  "5",
  "5+",
  "6A",
  "6A+",
  "6B",
  "6B+",
  "6C",
  "6C+",
  "7A",
  "7A+",
  "7B",
  "7B+",
  "7C",
  "7C+",
  "8A",
  "8A+",
  "8B",
  "8B+",
  "8C",
  "8C+",
] as const;

export type Font = (typeof FONT)[number];

export const VGRADE = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17,
] as const;

export type VGrade = (typeof VGRADE)[number];

export const FRENCH_SPORT = [
  "5",
  "5+",
  "6a",
  "6a+",
  "6b",
  "6b+",
  "6c",
  "6c+",
  "7a",
  "7a+",
  "7b",
  "7b+",
  "7c",
  "7c+",
  "8a",
  "8a+",
  "8b",
  "8b+",
  "8c",
  "8c+",
  "9a",
  "9a+",
  "9b",
  "9b+",
] as const;

export type FrenchSport = (typeof FRENCH_SPORT)[number];

export const YDS = [
  "5.6",
  "5.7",
  "5.8",
  "5.9",
  "5.10a",
  "5.10b",
  "5.10c",
  "5.10d",
  "5.11a",
  "5.11b",
  "5.11c",
  "5.11d",
  "5.12a",
  "5.12b",
  "5.12c",
  "5.12d",
  "5.13a",
  "5.13b",
  "5.13c",
  "5.13d",
  "5.14a",
  "5.14b",
  "5.14c",
  "5.14d",
  "5.15a",
  "5.15b",
  "5.15c",
] as const;

export type YDS = (typeof YDS)[number];

export const EWBANK = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22,
  23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38,
] as const;
export type EwbankGrade = (typeof EWBANK)[number];

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
    if (grade < 33) return 16;
    if (grade <= 33) return 17;
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

export function ircraToFrenchSport(grade: IRCRAGrade): FrenchSport {
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
        return 19.5;
      case "7A":
        return 20.5;
      case "7A+":
        return 21.5;
      case "7B":
        return 22.5;
      case "7B+":
        return 23.5;
      case "7C":
        return 24.5;
      case "7C+":
        return 25.5;
      case "8A":
        return 26.5;
      case "8A+":
        return 27.5;
      case "8B":
        return 28.5;
      case "8B+":
        return 29.5;
      case "8C":
        return 31;
      case '8C+':
        return 32
      default:
        throw new Error(`Unexpected Font grade ${grade}`);
    }
  })() as IRCRAGrade;
}
export function ircraToFont(grade: IRCRAGrade): Font {
  return (() => {
    if (grade < 12) return "3";
    if (grade < 13) return "4";
    if (grade < 14) return "4+";
    if (grade < 15) return "5";
    if (grade < 16) return "5+";
    if (grade < 16.5) return "6A";
    if (grade < 17) return "6A+";
    if (grade < 18) return "6B";
    if (grade < 18.5) return "6B+";
    if (grade < 19.5) return "6C";
    if (grade < 20.5) return "6C+";
    if (grade < 21.5) return "7A";
    if (grade < 22.5) return "7A+";
    if (grade < 23.5) return "7B";
    if (grade < 24.5) return "7B+";
    if (grade < 25.5) return "7C";
    if (grade < 26.5) return "7C+";
    if (grade < 27.5) return "8A";
    if (grade < 28.5) return "8A+";
    if (grade < 29.5) return "8B";
    if (grade < 31) return "8B+";
    if (grade < 32) return "8C";
    if (grade < 33) return "8C+";
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
