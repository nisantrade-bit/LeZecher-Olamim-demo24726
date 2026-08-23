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
  bio?: string; // Optional bio (Supabase schema)
  hebrewDate?: string; // Optional Hebrew date string (Supabase schema)
  passDate?: string; // Optional date of passing (Supabase schema)
  candlesCount?: number; // Optional candles lit count (Supabase schema)
  likesCount?: number; // Optional likes count (Supabase schema)
  image?: string; // Optional Base64 image
  imageUrl?: string; // Optional image URL
  photoUrl?: string; // Optional photo URL
  photo?: string; // Optional photo field
  imagePosition?: string; // Optional CSS object-position (e.g. 'center top', 'center 20%') to prevent cropping head/face
  ageAtDeath?: number; // Optional age at death
  birthDate?: string; // Optional Gregorian birth date

  // Multi-language pre-translated or localized fields
  nameHe?: string;
  nameEn?: string;
  nameRu?: string;
  fatherNameHe?: string;
  fatherNameEn?: string;
  fatherNameRu?: string;
  motherNameHe?: string;
  motherNameEn?: string;
  motherNameRu?: string;
  notesHe?: string;
  notesEn?: string;
  notesRu?: string;

  // Manual override tracking: fields that were entered/edited manually by user or explicitly imported
  manualFields?: string[];
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
