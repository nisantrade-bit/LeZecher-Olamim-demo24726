/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Gender = 'male' | 'female';

export interface Deceased {
  id: number; // Unique timestamp
  name: string; // Full name
  gender: Gender;
  fatherName: string; // Father's name
  motherName: string; // Mother's name
  day: number; // 1 to 30
  month: string; // Normalized Hebrew Month (Hebrew key name)
  contactPhone?: string; // Optional relative phone
  notes?: string; // Optional story / cemetery location
  image?: string; // Optional Base64 image
  ageAtDeath?: number; // Optional age at death
  birthDate?: string; // Optional Gregorian birth date
}

export type Language = 'he' | 'en' | 'ru';

export interface ShabbatTimes {
  candles?: string;
  havdalah?: string;
  parsha?: string;
  hebrewCandles?: string;
  hebrewHavdalah?: string;
  hebrewParsha?: string;
  holiday?: string;
  hebrewHoliday?: string;
  isHoliday?: boolean;
}

export interface CalendarMonthData {
  [dateStr: string]: ShabbatTimes;
}
