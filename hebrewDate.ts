/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Deceased } from '../types';

export const HEBREW_MONTHS_HE = [
  "תשרי",
  "חשוון",
  "כסלו",
  "טבת",
  "שבט",
  "אדר א׳",
  "אדר ב׳",
  "ניסן",
  "אייר",
  "סיון",
  "תמוז",
  "אב",
  "אלול"
];

export const HEBREW_MONTHS_EN = [
  "Tishrei",
  "Cheshvan",
  "Kislev",
  "Tevet",
  "Shevat",
  "Adar I",
  "Adar II",
  "Nisan",
  "Iyar",
  "Sivan",
  "Tammuz",
  "Av",
  "Elul"
];

export const HEBREW_MONTHS_RU = [
  "Тишрей",
  "Хешван",
  "Кислев",
  "Тевет",
  "Шват",
  "Адар I",
  "Адар II",
  "Нисан",
  "Ияр",
  "Сиван",
  "Таммуз",
  "Ав",
  "Элул"
];

/**
 * Normalizes input month name to the canonical Hebrew spelling
 */
export function normalizeMonthName(name: string): string {
  if (!name) return "תשרי";
  const clean = name.replace(/['"״׳]/g, '').trim().toLowerCase();
  
  if (clean.includes("תשרי") || clean.includes("tishr") || clean.includes("тишрей")) return "תשרי";
  if (clean.includes("חשון") || clean.includes("חשוון") || clean.includes("מרחשון") || clean.includes("מרחשוון") || clean.includes("heshvan") || clean.includes("cheshvan") || clean.includes("хешван")) return "חשוון";
  if (clean.includes("כסלו") || clean.includes("kislev") || clean.includes("кислев")) return "כסלו";
  if (clean.includes("טבת") || clean.includes("tevet") || clean.includes("тевет")) return "טבת";
  if (clean.includes("שבט") || clean.includes("shevat") || clean.includes("shvat") || clean.includes("шват")) return "שבט";
  if (clean.includes("אדר א") || clean.includes("adar i") || clean.includes("адар i") || clean.includes("адар 1")) return "אדר א׳";
  if (clean.includes("אדר ב") || clean.includes("adar ii") || clean.includes("адар ii") || clean.includes("адар 2")) return "אדר ב׳";
  if (clean === "אדר" || clean === "adar" || clean === "адар") return "אדר ב׳";
  if (clean.includes("ניסן") || clean.includes("nisan") || clean.includes("нисан")) return "ניסן";
  if (clean.includes("אייר") || clean.includes("iyar") || clean.includes("ияр")) return "אייר";
  if (clean.includes("סיון") || clean.includes("סיוון") || clean.includes("sivan") || clean.includes("сиван")) return "סיון";
  if (clean.includes("תמוז") || clean.includes("tamuz") || clean.includes("tammuz") || clean.includes("таммуз")) return "תמוז";
  if (clean === "אב" || clean === "av" || clean === "ав" || clean.includes("מנחם אב")) return "אב";
  if (clean.includes("אלול") || clean.includes("elul") || clean.includes("элул")) return "אלול";
  
  // Default fallback if we can find a partial match
  for (const m of HEBREW_MONTHS_HE) {
    if (m.includes(clean) || clean.includes(m)) return m;
  }
  
  return "תשרי"; // Safe fallback
}

/**
 * Checks if a Hebrew year is a leap year (Metonic cycle)
 */
export function isHebrewLeapYear(year: number): boolean {
  const cycleYear = year % 19;
  return [0, 3, 6, 8, 11, 14, 17].includes(cycleYear);
}

/**
 * Converts a Gregorian date into a Hebrew date structure using standard Intl API.
 * The Intl API is extremely accurate and native to modern JavaScript.
 */
export function getHebrewDate(date: Date): { day: number; dayFormatted: string; monthName: string; year: number; normalizedMonth: string; isLeapYear: boolean } {
  // Use he-IL-u-ca-hebrew-nu-latn so year and day are returned as standard digits
  const formatter = new Intl.DateTimeFormat('he-IL-u-ca-hebrew-nu-latn', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  
  const parts = formatter.formatToParts(date);
  let day = 1;
  let monthName = "תשרי";
  let year = 5786;
  
  for (const part of parts) {
    if (part.type === 'day') {
      day = parseInt(part.value, 10);
    } else if (part.type === 'month') {
      monthName = part.value;
    } else if (part.type === 'year') {
      year = parseInt(part.value, 10);
    }
  }
  
  const normalizedMonth = normalizeMonthName(monthName);
  
  return {
    day,
    dayFormatted: gimatriya(day),
    monthName,
    year,
    normalizedMonth,
    isLeapYear: isHebrewLeapYear(year)
  };
}

/**
 * Formats Hebrew numbers 1 to 30 into Gimatriya
 */
export function gimatriya(num: number): string {
  const lookup: { [key: number]: string } = {
    1: "א׳", 2: "ב׳", 3: "ג׳", 4: "ד׳", 5: "ה׳", 6: "ו׳", 7: "ז׳", 8: "ח׳", 9: "ט׳",
    10: "י׳", 11: "יא׳", 12: "יב׳", 13: "יג׳", 14: "יד׳", 15: "טו׳", 16: "טז׳", 17: "יז׳", 18: "יח׳", 19: "יט׳",
    20: "כ׳", 21: "כא׳", 22: "כב׳", 23: "כג׳", 24: "כד׳", 25: "כה׳", 26: "כו׳", 27: "כז׳", 28: "כח׳", 29: "כט׳",
    30: "ל׳"
  };
  return lookup[num] || num.toString();
}

/**
 * Parses Hebrew gimatriya text (or numeric digits) into a day number (1..30)
 */
export function parseGimatriya(text: string): number | null {
  if (!text) return null;
  const clean = text.replace(/['"״׳]/g, '').trim();
  
  // Try standard number first
  const num = parseInt(clean, 10);
  if (!isNaN(num) && num >= 1 && num <= 30) return num;

  // Gimatriya lookup map
  const specialMap: { [key: string]: number } = {
    'טו': 15, 'טז': 16, 'יא': 11, 'יב': 12, 'יג': 13, 'יד': 14,
    'יז': 17, 'יח': 18, 'יט': 19, 'כא': 21, 'כב': 22, 'כג': 23,
    'כד': 24, 'כה': 25, 'כו': 26, 'כז': 27, 'כח': 28, 'כט': 29
  };
  if (specialMap[clean]) return specialMap[clean];

  const charValues: { [ch: string]: number } = {
    'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5, 'ו': 6, 'ז': 7, 'ח': 8, 'ט': 9,
    'י': 10, 'כ': 20, 'ל': 30
  };

  let total = 0;
  for (const ch of clean) {
    if (charValues[ch]) {
      total += charValues[ch];
    }
  }

  if (total >= 1 && total <= 30) return total;
  return null;
}

/**
 * Standardizes passDate (Gregorian YYYY-MM-DD), hebrewDate (Hebrew Day + Month text),
 * and parses day (1..30) and normalized Hebrew month for dynamic calendar positioning.
 */
export function parseAndNormalizeDateFields(input: {
  day?: number | string;
  month?: string;
  hebrewDate?: string;
  passDate?: string;
}): {
  day: number;
  month: string;
  hebrewDate: string;
  passDate: string;
} {
  let day = input.day ? Number(input.day) : 0;
  if (isNaN(day)) day = 0;
  let month = input.month ? normalizeMonthName(input.month) : '';
  let hebrewDateStr = input.hebrewDate ? String(input.hebrewDate).trim() : '';
  let passDateStr = input.passDate ? String(input.passDate).trim() : '';

  // 1. If passDate is a Gregorian YYYY-MM-DD or DD/MM/YYYY or DD.MM.YYYY
  if (passDateStr && passDateStr !== '-') {
    let gDate: Date | null = null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(passDateStr)) {
      gDate = new Date(passDateStr);
    } else if (/^\d{1,2}[\/\.]\d{1,2}[\/\.]\d{4}$/.test(passDateStr)) {
      const parts = passDateStr.split(/[\/\.]/);
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const y = parseInt(parts[2], 10);
      gDate = new Date(y, m, d);
    }

    if (gDate && !isNaN(gDate.getTime())) {
      const hb = getHebrewDate(gDate);
      if (!day) day = hb.day;
      if (!month) month = hb.normalizedMonth;
      if (!hebrewDateStr || hebrewDateStr === '-') {
        hebrewDateStr = `${gimatriya(hb.day)} ${hb.normalizedMonth}`;
      }
      // Standardize passDate to YYYY-MM-DD format
      const yyyy = gDate.getFullYear();
      const mm = String(gDate.getMonth() + 1).padStart(2, '0');
      const dd = String(gDate.getDate()).padStart(2, '0');
      passDateStr = `${yyyy}-${mm}-${dd}`;
    }
  }

  // 2. Parse day & month from hebrewDateStr if missing
  if ((!day || !month) && (hebrewDateStr || passDateStr)) {
    const rawStr = hebrewDateStr && hebrewDateStr !== '-' ? hebrewDateStr : passDateStr;
    const parts = rawStr.split(/\s+/);
    if (parts.length >= 2) {
      const parsedDay = parseGimatriya(parts[0]);
      const parsedMonth = normalizeMonthName(parts.slice(1).join(' '));
      if (parsedDay) day = parsedDay;
      if (parsedMonth) month = parsedMonth;
    }
  }

  // Fallbacks if still incomplete
  if (!day || day < 1 || day > 30) day = 1;
  if (!month) month = 'תשרי';

  if (!hebrewDateStr || hebrewDateStr === '-') {
    hebrewDateStr = `${gimatriya(day)} ${month}`;
  }
  if (!passDateStr) {
    passDateStr = '-';
  }

  return {
    day,
    month,
    hebrewDate: hebrewDateStr,
    passDate: passDateStr
  };
}

/**
 * Localizes the Hebrew date representation
 */
export function getLocalizedHebrewDate(date: Date, lang: 'he' | 'en' | 'ru'): string {
  const hb = getHebrewDate(date);
  const dayStr = lang === 'he' ? gimatriya(hb.day) : hb.day.toString();
  
  let monthIdx = HEBREW_MONTHS_HE.indexOf(hb.normalizedMonth);
  if (monthIdx === -1) monthIdx = 0;
  
  const mName = lang === 'he' ? HEBREW_MONTHS_HE[monthIdx] : lang === 'en' ? HEBREW_MONTHS_EN[monthIdx] : HEBREW_MONTHS_RU[monthIdx];
  
  if (lang === 'he') {
    return `${dayStr} ב${mName}`;
  } else {
    return `${dayStr} ${mName}`;
  }
}

/**
 * Checks if a deceased's Yahrzeit falls on a given Hebrew date, taking into account
 * leap/non-leap year rules for Adar.
 */
export function isYahrzeitMatch(
  deceasedDay: number,
  deceasedMonth: string,
  currentHebrewDay: number,
  currentHebrewMonthNormalized: string,
  currentYearIsLeap: boolean
): boolean {
  if (Number(deceasedDay) !== Number(currentHebrewDay)) return false;
  
  const dMonth = normalizeMonthName(deceasedMonth);
  const cMonth = normalizeMonthName(currentHebrewMonthNormalized);
  
  if (dMonth === cMonth) return true;
  
  // Halachic Adar rule
  if (!currentYearIsLeap) {
    // In a non-leap year, current month will map to "אדר ב׳" because "אדר" maps to "אדר ב׳".
    // If the deceased died in "אדר א׳" or "אדר ב׳", they both observe in the single "אדר" month.
    if (cMonth === "אדר ב׳" && (dMonth === "אדר א׳" || dMonth === "אדר ב׳")) {
      return true;
    }
  } else {
    // In a leap year, deceased registered as simple "אדר" (which we normalized to "אדר ב׳") matches "אדר ב׳".
    if (dMonth === "אדר ב׳" && cMonth === "אדר ב׳") return true;
  }
  
  return false;
}

/**
 * Scans a 3-year Gregorian window around the selected year to find the Gregorian date
 * on which the deceased's Hebrew death anniversary (Yahrzeit) falls in the given Gregorian year.
 */
export function findYahrzeitGregorianDate(deceasedDay: number, deceasedMonth: string, gregYear: number): Date | null {
  const dMonth = normalizeMonthName(deceasedMonth);
  
  // Scan Gregorian year `gregYear`
  const start = new Date(gregYear, 0, 1);
  const end = new Date(gregYear, 11, 31);
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const hb = getHebrewDate(d);
    if (isYahrzeitMatch(deceasedDay, dMonth, hb.day, hb.normalizedMonth, hb.isLeapYear)) {
      return new Date(d);
    }
  }
  
  return null;
}

/**
 * Returns the date representing the preceding evening (Erev Yahrzeit / ערב האזכרה).
 * In Jewish law, the Hebrew day begins on the evening before at sunset.
 */
export function getYahrzeitEveDate(gregDate: Date): Date {
  const eve = new Date(gregDate);
  eve.setDate(eve.getDate() - 1);
  return eve;
}

/**
 * Calculates both the Gregorian daytime date and the preceding evening (Erev Yahrzeit) date.
 */
export function formatYahrzeitDatesWithEve(
  deceasedDay: number,
  deceasedMonth: string,
  gregYear: number,
  lang: 'he' | 'en' | 'ru' = 'he'
): {
  gregDate: Date | null;
  eveDate: Date | null;
  hebrewDateStr: string;
  eveFormatted: string;
  dayFormatted: string;
  reminderNote: string;
} {
  const gregDate = findYahrzeitGregorianDate(deceasedDay, deceasedMonth, gregYear);
  if (!gregDate) {
    return {
      gregDate: null,
      eveDate: null,
      hebrewDateStr: `${gimatriya(deceasedDay)} ב${normalizeMonthName(deceasedMonth)}`,
      eveFormatted: '',
      dayFormatted: '',
      reminderNote: ''
    };
  }

  const eveDate = getYahrzeitEveDate(gregDate);

  const eveDayName = eveDate.toLocaleDateString(
    lang === 'he' ? 'he-IL' : lang === 'ru' ? 'ru-RU' : 'en-US',
    { weekday: 'long' }
  );
  const dayName = gregDate.toLocaleDateString(
    lang === 'he' ? 'he-IL' : lang === 'ru' ? 'ru-RU' : 'en-US',
    { weekday: 'long' }
  );

  const eveDateStr = eveDate.toLocaleDateString(
    lang === 'he' ? 'he-IL' : lang === 'ru' ? 'ru-RU' : 'en-US',
    { day: '2-digit', month: '2-digit', year: 'numeric' }
  );
  const dayDateStr = gregDate.toLocaleDateString(
    lang === 'he' ? 'he-IL' : lang === 'ru' ? 'ru-RU' : 'en-US',
    { day: '2-digit', month: '2-digit', year: 'numeric' }
  );

  const hebrewDateStr = `${gimatriya(deceasedDay)} ב${normalizeMonthName(deceasedMonth)}`;

  let eveFormatted = '';
  let dayFormatted = '';
  let reminderNote = '';

  if (lang === 'he') {
    eveFormatted = `${eveDayName} בערב, ${eveDateStr} (בשקיעה)`;
    dayFormatted = `${dayName}, ${dayDateStr} (במהלך היום)`;
    reminderNote = `🕯️ תזכורת הלכתית: היות והיום העברי מתחיל בשקיעה, הדלקת נר הנשמה ותחילת האזכרה מתחילים כבר מ${eveDayName} בערב (${eveDateStr} בשקיעה).`;
  } else if (lang === 'ru') {
    eveFormatted = `${eveDayName} вечером, ${eveDateStr} (на закате)`;
    dayFormatted = `${dayName}, ${dayDateStr} (в течение дня)`;
    reminderNote = `🕯️ Напоминание: еврейский день начинается накануне вечером на закате. Зажигание поминальной свечи начинается вечером ${eveDateStr}.`;
  } else {
    eveFormatted = `${eveDayName} evening, ${eveDateStr} (at sunset)`;
    dayFormatted = `${dayName}, ${dayDateStr} (during daytime)`;
    reminderNote = `🕯️ Halachic Reminder: The Hebrew day begins at sunset on the preceding evening. Memorial candle lighting begins on ${eveDayName} evening (${eveDateStr}).`;
  }

  return {
    gregDate,
    eveDate,
    hebrewDateStr,
    eveFormatted,
    dayFormatted,
    reminderNote
  };
}
