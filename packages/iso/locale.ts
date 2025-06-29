import { UnitType } from "./units.js";

export type Locale = "US" | "UK" | "Europe" | "Australia";

export interface LocaleInfo {
  displayName: string;
  unitPreferences: UnitPreferences;
}

export type UnitCategory = "weight" | "bouldering" | "sport" | "distance";

export type UnitPreferences = {
  weight: "lb" | "kg";
  bouldering: "vermin" | "font";
  sport: "yds" | "frenchsport" | "ewbank";
  distance: "inch" | "cm";
};

export const LOCALE_CONFIGS: Record<Locale, LocaleInfo> = {
  US: {
    displayName: "United States",
    unitPreferences: {
      weight: "lb",
      bouldering: "vermin",
      sport: "yds",
      distance: "inch",
    },
  },
  UK: {
    displayName: "United Kingdom",
    unitPreferences: {
      weight: "lb",
      bouldering: "font",
      sport: "frenchsport", // UK typically uses French sport grades
      distance: "inch",
    },
  },
  Europe: {
    displayName: "Europe",
    unitPreferences: {
      weight: "kg",
      bouldering: "font",
      sport: "frenchsport",
      distance: "cm",
    },
  },
  Australia: {
    displayName: "Australia",
    unitPreferences: {
      weight: "kg",
      bouldering: "vermin",
      sport: "ewbank",
      distance: "cm",
    },
  },
};

export function getDefaultUnitsForLocale(locale: Locale): UnitPreferences {
  return LOCALE_CONFIGS[locale].unitPreferences;
}

export function detectBrowserLocale(): Locale {
  // Get the browser's language preference
  const language = navigator.language || navigator.languages?.[0] || "en-US";
  
  // Extract the country code (after the hyphen, if present)
  const countryCode = language.split("-")[1]?.toUpperCase();
  const languageCode = language.split("-")[0]?.toLowerCase();
  
  // Map common country/language codes to our locales
  if (countryCode === "GB" || languageCode === "en-gb") {
    return "UK";
  }
  
  if (countryCode === "AU") {
    return "Australia";
  }
  
  // European countries that commonly use French sport grades and metric
  const europeanCountries = [
    "FR", "DE", "IT", "ES", "AT", "CH", "BE", "NL", "SE", "NO", "DK", "FI",
    "PL", "CZ", "SK", "HU", "SI", "HR", "PT", "GR", "BG", "RO", "LT", "LV", "EE"
  ];
  
  if (countryCode && europeanCountries.includes(countryCode)) {
    return "Europe";
  }
  
  // Default to US for unknown locales and North American countries
  return "US";
}