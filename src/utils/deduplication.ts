/**
 * Utility for deduplicating and smart-merging memorial records across Hebrew, English, and Russian imports.
 */

import { Deceased, Language } from '../types';
import { normalizeMonthName } from './hebrewDate';
import { translateText, enrichDeceasedTranslations } from './transliteration';

// Canonical dictionary for Bukharan, Tajik-Jewish, Russian, Hebrew, and Latin name aliases
const BUKHARIAN_NAME_ALIASES: Record<string, string> = {
  // Mazal variants
  'мзл': 'מזל',
  'мэзэл': 'מזל',
  'mzel': 'מזל',
  'mazal': 'מזל',
  'מזל': 'מזל',

  // Shushan variants
  'шушан': 'שושן',
  'shushan': 'שושן',
  'שושנה': 'שושן',
  'שושן': 'שושן',

  // Elijah / Ilyusha variants
  'илья': 'אליהו',
  'илюша': 'אליהו',
  'ilyusha': 'אליהו',
  'eliyahu': 'אליהו',
  'אליהו': 'אליהו',
  'איליושה': 'אליהו',

  // Bobo variants
  'бобо': 'בבא',
  'bobo': 'בבא',
  'בבא': 'בבא',
  'סבא': 'בבא',

  // Yubo / Yubab variants
  'юбо': 'יובב',
  'yubo': 'יובב',
  'יובו': 'יובב',
  'יובב': 'יובב',

  // Mushel / Michael variants
  'мушел': 'מיכאל',
  'mushel': 'מיכאל',
  'מיכאל': 'מיכאל',
  'מושל': 'מיכאל',
  'mishael': 'מיכאל',

  // Reuben / Ruvin variants
  'рубен': 'ראובן',
  'рувин': 'ראובן',
  'ruben': 'ראובן',
  'ruvin': 'ראובן',
  'reuben': 'ראובן',
  'ראובן': 'ראובן',

  // Nisim / Metri variants
  'метри': 'ניסים',
  'нисим': 'ניסים',
  'nisim': 'ניסים',
  'ניסים': 'ניסים',
  'נסים': 'ניסים',

  // Surnames & common names
  'катаев': 'קטאייב',
  'катаева': 'קטאייב',
  'kataev': 'קטאייב',
  'קטאייב': 'קטאייב',
  'קטאייבה': 'קטאייב',

  'пинхасов': 'פנחסוב',
  'пинхасова': 'פנחסוב',
  'pinkhasov': 'פנחסוב',
  'פנחסוב': 'פנחסוב',
  'פנחסובה': 'פנחסוב',

  'рубинов': 'רובינוב',
  'рубинова': 'רובינוב',
  'rubinov': 'רובינוב',
  'רובינוב': 'רובינוב',

  'бабаев': 'בבייב',
  'бабаева': 'בבייב',
  'babaev': 'בבייב',
  'בבייב': 'בבייב',

  'абаев': 'אבייב',
  'абаева': 'אבייב',
  'abaev': 'אבייב',
  'אבייב': 'אבייב',

  'джураев': 'גורייב',
  'джураева': 'גורייב',
  'dzhuraev': 'גורייב',
  'גורייב': 'גורייב',

  'джура': 'גורה',
  'dzhura': 'גורה',
  'גורה': 'גורה',

  'борохов': 'בורוכוב',
  'borochov': 'בורוכוב',

  'насимов': 'נסימוב',
  'nisimov': 'נסימוב',

  'токов': 'טוקוב',
  'tokov': 'טוקוב'
};

/**
 * Normalizes a raw string by removing quotes, parens, dashes, dots, and converting to lower case
 */
export function normalizeRawString(str: string | null | undefined): string {
  if (!str) return '';
  return String(str)
    .trim()
    .toLowerCase()
    .replace(/['’‘`״"]/g, '')
    .replace(/[\(\)\[\]\{\}\-\.,\/\\;:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalizes a name or name token for cross-language matching
 */
export function normalizeTokenForMatching(token: string): string {
  const norm = normalizeRawString(token);
  if (!norm) return '';
  if (BUKHARIAN_NAME_ALIASES[norm]) {
    return BUKHARIAN_NAME_ALIASES[norm];
  }
  return norm;
}

/**
 * Generates a comprehensive set of normalized canonical full name strings for a person's name fields across all available languages & translations
 */
export function getCanonicalFullNames(
  name?: string | null,
  nameHe?: string | null,
  nameEn?: string | null,
  nameRu?: string | null
): Set<string> {
  const fullNames = new Set<string>();

  const rawInputs = [name, nameHe, nameEn, nameRu].filter(
    (s): s is string => !!s && typeof s === 'string' && s.trim() !== '' && s.trim() !== '-'
  );

  for (const raw of rawInputs) {
    const cleanStr = normalizeRawString(raw);
    if (!cleanStr) continue;

    // 1. Raw cleaned string
    fullNames.add(cleanStr);

    // 2. Canonical tokens joined
    const words = cleanStr.split(' ').filter(Boolean);
    if (words.length === 0) continue;

    const canonicalWords = words.map(w => normalizeTokenForMatching(w));
    const canonicalStr = canonicalWords.join(' ');
    fullNames.add(canonicalStr);

    // 3. Translated full string to Hebrew / English / Russian
    const translatedHe = normalizeRawString(translateText(cleanStr, 'he'));
    if (translatedHe) {
      fullNames.add(translatedHe);
      const transWordsHe = translatedHe.split(' ').map(w => normalizeTokenForMatching(w)).join(' ');
      if (transWordsHe) fullNames.add(transWordsHe);
    }

    const translatedEn = normalizeRawString(translateText(cleanStr, 'en'));
    if (translatedEn) fullNames.add(translatedEn);

    const translatedRu = normalizeRawString(translateText(cleanStr, 'ru'));
    if (translatedRu) fullNames.add(translatedRu);
  }

  return fullNames;
}

/**
 * Compares two sets of canonical full names.
 * Returns true ONLY if there is a full name match or first+last name match.
 * SINGLE WORD MATCHES ARE STRICTLY DISALLOWED unless the entire name itself is just 1 word.
 */
export function compareFullNames(setA: Set<string>, setB: Set<string>): boolean {
  if (setA.size === 0 || setB.size === 0) return false;

  for (const a of setA) {
    if (!a || a === '-' || a.length < 2) continue;
    for (const b of setB) {
      if (!b || b === '-' || b.length < 2) continue;

      // 1. Exact canonical full string match
      if (a === b) return true;

      const wordsA = a.split(' ').filter(Boolean);
      const wordsB = b.split(' ').filter(Boolean);

      // Single word names MUST match exactly (already checked a === b)
      if (wordsA.length === 1 || wordsB.length === 1) {
        continue;
      }

      // 2. Multi-word names: First name AND Last name must match!
      const firstA = wordsA[0];
      const lastA = wordsA[wordsA.length - 1];
      const firstB = wordsB[0];
      const lastB = wordsB[wordsB.length - 1];

      if (firstA === firstB && lastA === lastB) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Checks if two Deceased records represent the exact same person
 */
export function isSameDeceasedRecord(a: Deceased, b: Deceased): boolean {
  if (!a || !b) return false;

  // A. ID Match (Highest Priority)
  if (a.id !== undefined && a.id !== null && b.id !== undefined && b.id !== null) {
    const idA = String(a.id).trim();
    const idB = String(b.id).trim();
    if (idA !== '' && idA === idB) {
      return true;
    }
  }

  // B. Gender Mismatch
  if (a.gender && b.gender && a.gender !== b.gender) {
    return false;
  }

  // C. Pass Date Mismatch
  const passDateA = normalizeRawString(a.passDate).replace(/\D/g, '');
  const passDateB = normalizeRawString(b.passDate).replace(/\D/g, '');
  const passDateMatches = passDateA !== '' && passDateB !== '' && passDateA === passDateB;
  const passDateDiffers = passDateA !== '' && passDateB !== '' && passDateA !== passDateB;

  if (passDateDiffers) {
    // Different death dates mean different people!
    return false;
  }

  // D. Hebrew Date Comparison
  const dayA = Number(a.day);
  const dayB = Number(b.day);
  const hasDayA = !isNaN(dayA) && dayA > 0;
  const hasDayB = !isNaN(dayB) && dayB > 0;

  const monthA = normalizeMonthName(a.month);
  const monthB = normalizeMonthName(b.month);
  const hasMonthA = monthA !== '';
  const hasMonthB = monthB !== '';

  const hebrewDateMatches = hasDayA && hasDayB && dayA === dayB && hasMonthA && hasMonthB && monthA === monthB;
  const hebrewDateDiffers = hasDayA && hasDayB && hasMonthA && hasMonthB && (dayA !== dayB || monthA !== monthB);

  if (hebrewDateDiffers && !passDateMatches) {
    // Different Hebrew death dates mean different people!
    return false;
  }

  // E. Multi-Language Name Matching
  const namesA = getCanonicalFullNames(a.name, a.nameHe, a.nameEn, a.nameRu);
  const namesB = getCanonicalFullNames(b.name, b.nameHe, b.nameEn, b.nameRu);
  const namesMatch = compareFullNames(namesA, namesB);

  // F. Parent Names Matching
  const fatherA = getCanonicalFullNames(a.fatherName, a.fatherNameHe, a.fatherNameEn, a.fatherNameRu);
  const fatherB = getCanonicalFullNames(b.fatherName, b.fatherNameHe, b.fatherNameEn, b.fatherNameRu);
  const fatherNamesMatch = compareFullNames(fatherA, fatherB);

  const motherA = getCanonicalFullNames(a.motherName, a.motherNameHe, a.motherNameEn, a.motherNameRu);
  const motherB = getCanonicalFullNames(b.motherName, b.motherNameHe, b.motherNameEn, b.motherNameRu);
  const motherNamesMatch = compareFullNames(motherA, motherB);

  // Match decision logic:
  if (namesMatch) {
    // If dates match OR one/both dates are missing -> Match!
    if (passDateMatches || hebrewDateMatches) {
      return true;
    }

    // If father names match OR mother names match -> Match!
    if (fatherNamesMatch || motherNamesMatch) {
      return true;
    }

    // If both records lack complete dates and parent names, but names match -> Match!
    const dateMissingInOne = !hasDayA || !hasDayB || !hasMonthA || !hasMonthB;
    if (dateMissingInOne) {
      return true;
    }
  }

  // G. Phone match fallback
  if (a.contactPhone && b.contactPhone) {
    const cleanPhoneA = a.contactPhone.replace(/\D/g, '');
    const cleanPhoneB = b.contactPhone.replace(/\D/g, '');
    if (cleanPhoneA && cleanPhoneA.length >= 7 && cleanPhoneA === cleanPhoneB) {
      return true;
    }
  }

  return false;
}

/**
 * Merges two records of the same person, preserving the best available information and multi-language fields
 */
export function mergeDeceasedRecords(existing: Deceased, incoming: Deceased): Deceased {
  const merged: Deceased = { ...existing };

  // ID is ALWAYS preserved from existing if valid
  merged.id = existing.id !== undefined && existing.id !== null ? existing.id : incoming.id;

  const pick = (fieldExisting?: string | null, fieldIncoming?: string | null): string => {
    const ex = (fieldExisting || '').trim();
    const inc = (fieldIncoming || '').trim();
    if (!ex || ex === '-') return inc;
    if (!inc || inc === '-') return ex;
    return ex;
  };

  const pickLonger = (ex?: string | null, inc?: string | null): string => {
    const e = (ex || '').trim();
    const i = (inc || '').trim();
    if (!e) return i;
    if (!i) return e;
    return i.length > e.length ? i : e;
  };

  merged.name = pick(existing.name, incoming.name);
  merged.nameHe = pick(existing.nameHe, incoming.nameHe);
  merged.nameEn = pick(existing.nameEn, incoming.nameEn);
  merged.nameRu = pick(existing.nameRu, incoming.nameRu);

  merged.fatherName = pick(existing.fatherName, incoming.fatherName);
  merged.fatherNameHe = pick(existing.fatherNameHe, incoming.fatherNameHe);
  merged.fatherNameEn = pick(existing.fatherNameEn, incoming.fatherNameEn);
  merged.fatherNameRu = pick(existing.fatherNameRu, incoming.fatherNameRu);

  merged.motherName = pick(existing.motherName, incoming.motherName);
  merged.motherNameHe = pick(existing.motherNameHe, incoming.motherNameHe);
  merged.motherNameEn = pick(existing.motherNameEn, incoming.motherNameEn);
  merged.motherNameRu = pick(existing.motherNameRu, incoming.motherNameRu);

  merged.gender = (existing.gender || incoming.gender || 'male') as any;
  merged.day = existing.day || incoming.day;
  merged.month = existing.month || incoming.month;
  merged.hebrewDate = pick(existing.hebrewDate, incoming.hebrewDate);
  merged.passDate = pick(existing.passDate, incoming.passDate);
  merged.birthDate = pick(existing.birthDate, incoming.birthDate);
  merged.ageAtDeath = existing.ageAtDeath || incoming.ageAtDeath;

  merged.bio = pickLonger(existing.bio, incoming.bio);
  merged.notes = pickLonger(existing.notes, incoming.notes);
  merged.notesHe = pickLonger(existing.notesHe, incoming.notesHe);
  merged.notesEn = pickLonger(existing.notesEn, incoming.notesEn);
  merged.notesRu = pickLonger(existing.notesRu, incoming.notesRu);

  merged.contactPhone = pick(existing.contactPhone, incoming.contactPhone);

  const img = existing.imageUrl || incoming.imageUrl || existing.image || incoming.image || existing.photoUrl || incoming.photoUrl || existing.photo || incoming.photo;
  if (img) {
    merged.image = img;
    merged.imageUrl = img;
    merged.photoUrl = img;
    merged.photo = img;
  }

  const existingCandles = Number(existing.candlesCount) || 0;
  const incomingCandles = Number(incoming.candlesCount) || 0;
  merged.candlesCount = Math.max(existingCandles, incomingCandles);

  // Re-enrich so any missing language fields get transliterated automatically
  return enrichDeceasedTranslations(merged);
}

/**
 * Merges an incoming list into an existing master list with smart deduplication
 */
export function smartMergeDeceasedLists(existingList: Deceased[], incomingList: Deceased[]): Deceased[] {
  const result = [...existingList];

  for (const incoming of incomingList) {
    const existingIndex = result.findIndex(existing => isSameDeceasedRecord(existing, incoming));
    if (existingIndex !== -1) {
      result[existingIndex] = mergeDeceasedRecords(result[existingIndex], incoming);
    } else {
      result.push(enrichDeceasedTranslations(incoming));
    }
  }

  return result;
}

/**
 * Deduplicates a single list containing duplicate entries
 */
export function deduplicateSingleList(list: Deceased[]): Deceased[] {
  const result: Deceased[] = [];

  for (const item of list) {
    const existingIndex = result.findIndex(existing => isSameDeceasedRecord(existing, item));
    if (existingIndex !== -1) {
      result[existingIndex] = mergeDeceasedRecords(result[existingIndex], item);
    } else {
      result.push(enrichDeceasedTranslations(item));
    }
  }

  return result;
}

