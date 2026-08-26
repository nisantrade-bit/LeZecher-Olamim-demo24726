/**
 * Utility for deduplicating and smart-merging memorial records across Hebrew, English, and Russian imports.
 * Adheres strictly to zero-loss, evidence-based matching rules:
 * - NEVER promotes a REVIEW match to SAFE MATCH based on weak heuristics or transliteration alone.
 * - Evaluates ALL candidates without short-circuiting on the first candidate.
 * - Enforces field-level non-destructive merges.
 */

import { Deceased, Language } from '../types';
import { normalizeMonthName } from './hebrewDate';
import { translateText, enrichDeceasedTranslations, isCorruptedTranslation } from './transliteration';

// Canonical dictionary for Bukharan, Tajik-Jewish, Russian, Hebrew, and Latin name aliases
const BUKHARIAN_NAME_ALIASES: Record<string, string> = {
  // Yosef / Joseph / Yosif / Yusuf variants
  'יוסף': 'יוסף',
  'יוסוף': 'יוסף',
  'иосиф': 'יוסף',
  'юсуф': 'יוסף',
  'yosef': 'יוסף',
  'joseph': 'יוסף',
  'yosif': 'יוסף',
  'yusef': 'יוסף',

  // Avraham / Abraham / Ibrahim variants
  'אברהם': 'אברהם',
  'אברם': 'אברהם',
  'авраам': 'אברהם',
  'иброхим': 'אברהם',
  'avraham': 'אברהם',
  'abraham': 'אברהם',
  'ibrahim': 'אברהם',

  // Yitzhak / Isaac / Itzhak variants
  'יצחק': 'יצחק', 
  'ицхак': 'יצחק',
  'исаак': 'יצחק',
  'исок': 'יצחק',
  'yitzhak': 'יצחק',
  'itzhak': 'יצחק',
  'isaac': 'יצחק',

  // Yaakov / Jacob / Yakov variants
  'יעקב': 'יעקב',
  'яков': 'יעקב',
  'иаков': 'יעקב',
  'якуб': 'יעקב',
  'yaakov': 'יעקב',
  'jacob': 'יעקב',
  'yakov': 'יעקב',

  // Moshe / Moses / Mushe variants
  'משה': 'משה',
  'моше': 'משה',
  'моисей': 'משה',
  'муше': 'משה',
  'moshe': 'משה',
  'moses': 'משה',
  'mushe': 'משה',

  // David variants
  'דוד': 'דוד',
  'давид': 'דוד',
  'david': 'דוד',

  // Shlomo / Solomon / Suleiman variants
  'שלמה': 'שלמה',
  'шлоמו': 'שלמה',
  'соломон': 'שלמה',
  'сулейман': 'שלמה',
  'shlomo': 'שלמה',
  'solomon': 'שלמה',
  'suleiman': 'שלמה',

  // Pinchas / Phinehas variants
  'פנחס': 'פנחס',
  'пинхас': 'פנחס',
  'pinchas': 'פנחס',
  'phinehas': 'פנחס',
  'pinkhas': 'פנחס',

  // Elijah / Ilyusha / Eliyahu variants
  'אליהו': 'אליהו',
  'אילושה': 'אליהו',
  'איליה': 'אליהו',
  'илья': 'אליהו',
  'илюша': 'אליהו',
  'ilyusha': 'אליהו',
  'eliyahu': 'אליהו',
  'elijah': 'אליהו',
  'ilya': 'אליהו',

  // Michael / Mushel / Mishael variants
  'מיכאל': 'מיכאל',
  'מושל': 'מיכאל',
  'מישואל': 'מיכאל',
  'мушел': 'מיכאל',
  'михаил': 'מיכאל',
  'мишоэль': 'מיכאל',
  'mushel': 'מיכאל',
  'michael': 'מיכאל',
  'mishael': 'מיכאל',
  'mishoel': 'מיכאל',
  'misha': 'מיכאל',
  'миша': 'מיכאל',

  // Reuben / Ruvin / Ruben variants
  'ראובן': 'ראובן',
  'רובין': 'ראובן',
  'רובן': 'ראובן',
  'рубен': 'ראובן',
  'рувин': 'ראובן',
  'ruben': 'ראובן',
  'ruvin': 'ראובן',
  'reuben': 'ראובן',
  'reuven': 'ראובן',

  // Sarah variants
  'שרה': 'שרה',
  'сара': 'שרה',
  'сарра': 'שרה',
  'sarah': 'שרה',
  'sara': 'שרה',

  // Nisim / Metri variants
  'ניסים': 'ניסים',
  'נסים': 'ניסים',
  'מטרי': 'ניסים',
  'метри': 'ניסים',
  'нисим': 'ניסים',
  'nisim': 'ניסים',
  'nissim': 'ניסים',

  // Mazal variants
  'מזל': 'מזל',
  'мзл': 'מזל',
  'мэзэл': 'מזל',
  'mzel': 'מזל',
  'mazal': 'מזל',

  // Shushan variants
  'שושן': 'שושן',
  'שושנה': 'שושן',
  'шушан': 'שושן',
  'shushan': 'שושן',
  'shoshana': 'שושן',

  // Bobo / Saba variants
  'בבא': 'בבא',
  'סבא': 'בבא',
  'бобо': 'בבא',
  'bobo': 'בבא',

  // Yubo / Yubab variants
  'יובב': 'יובב',
  'יובו': 'יובב',
  'юбо': 'יובב',
  'yubo': 'יובב',

  // Surnames & common names
  'קטאייב': 'קטאייב',
  'קטאייבה': 'קטאייב',
  'катаев': 'קטאייב',
  'катаева': 'קטאייב',
  'kataev': 'קטאייב',
  'kataeva': 'קטאייב',

  'פנחסוב': 'פנחסוב',
  'פנחסובה': 'פנחסוב',
  'пинхасов': 'פנחסוב',
  'пинхасова': 'פנחסוב',
  'pinkhasov': 'פנחסוב',
  'pinkhasova': 'פנחסוב',

  'רובינוב': 'רובינוב',
  'רובינובה': 'רובינוב',
  'рубинов': 'רובינוב',
  'рубинова': 'רובינוב',
  'rubinov': 'רובינוב',
  'rubinova': 'רובינוב',

  'בבייב': 'בבייב',
  'בבייבה': 'בבייב',
  'бабаев': 'בבייב',
  'бабаева': 'בבייב',
  'babaev': 'בבייב',
  'babaeva': 'בבייב',

  'אבייב': 'אבייב',
  'אבייבה': 'אבייב',
  'абаев': 'אבייב',
  'абаева': 'אבייב',
  'abaev': 'אבייב',
  'abaeva': 'אבייב',

  'גורייב': 'גורייב',
  'ג\'ורייב': 'גורייב',
  'джураев': 'גורייב',
  'джураева': 'גורייב',
  'dzhuraev': 'גורייב',
  'dzhuraeva': 'גורייב',

  'גורה': 'גורה',
  'джура': 'גורה',
  'dzhura': 'גורה',

  'בורוכוב': 'בורוכוב',
  'борохов': 'בורוכוב',
  'borochov': 'בורוכוב',

  'נסימוב': 'נסימוב',
  'насимов': 'נסימוב',
  'nisimov': 'נסימוב',

  'טוקוב': 'טוקוב',
  'токов': 'טוקוב',
  'tokov': 'טוקוב'
};

/**
 * Central normalization function to strip Hebrew nikud and cantillation marks (\u0591-\u05C7)
 */
export function stripNikud(str: string | null | undefined): string {
  if (!str) return '';
  return String(str).replace(/[\u0591-\u05C7]/g, '');
}

/**
 * Normalizes a raw string by removing nikud, quotes, parens, dashes, dots, and converting to lower case
 */
export function normalizeRawString(str: string | null | undefined): string {
  if (!str) return '';
  return stripNikud(String(str))
    .trim()
    .toLowerCase()
    .replace(/['’‘`״"]/g, '')
    .replace(/[\(\)\[\]\{\}\-\.,\/\\;:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalizes a name token for cross-language matching
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
 * Generates a comprehensive set of normalized canonical full name strings for a person's name fields
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

export interface NameComparisonDetail {
  matched: boolean;
  isExact: boolean;
  isMultiWordMatch: boolean;
  isSingleWordOnly: boolean;
}

/**
 * Compares two sets of canonical full names with detailed matching classification.
 */
export function compareFullNamesDetail(setA: Set<string>, setB: Set<string>): NameComparisonDetail {
  if (setA.size === 0 || setB.size === 0) {
    return { matched: false, isExact: false, isMultiWordMatch: false, isSingleWordOnly: false };
  }

  let matched = false;
  let isExact = false;
  let isMultiWordMatch = false;
  let isSingleWordOnly = true;

  for (const a of setA) {
    if (!a || a === '-' || a.length < 2) continue;
    const wordsA = a.split(' ').filter(Boolean);

    for (const b of setB) {
      if (!b || b === '-' || b.length < 2) continue;
      const wordsB = b.split(' ').filter(Boolean);

      // Exact match
      if (a === b) {
        matched = true;
        isExact = true;
        if (wordsA.length > 1 || wordsB.length > 1) {
          isMultiWordMatch = true;
          isSingleWordOnly = false;
        }
        return { matched, isExact, isMultiWordMatch, isSingleWordOnly };
      }

      // Multi-word first + last name match
      if (wordsA.length >= 2 && wordsB.length >= 2) {
        const firstA = wordsA[0];
        const lastA = wordsA[wordsA.length - 1];
        const firstB = wordsB[0];
        const lastB = wordsB[wordsB.length - 1];

        if (firstA === firstB && lastA === lastB) {
          matched = true;
          isMultiWordMatch = true;
          isSingleWordOnly = false;
        }
      }
    }
  }

  return { matched, isExact, isMultiWordMatch, isSingleWordOnly };
}

export function compareFullNames(setA: Set<string>, setB: Set<string>): boolean {
  return compareFullNamesDetail(setA, setB).matched;
}

export interface CandidateMatchResult {
  decision: 'SAFE MATCH' | 'REVIEW' | 'NO MATCH';
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  score: number;
  reasons: string[];
  candidate: Deceased | null;
}

/**
 * Evaluates candidate match between two records with strict, evidence-based rules.
 * NEVER returns SAFE MATCH based on transliteration or single-word name alone.
 */
export function evaluateCandidateMatch(existing: Deceased, incoming: Deceased): CandidateMatchResult {
  if (!existing || !incoming) {
    return { decision: 'NO MATCH', confidence: 'LOW', score: 0, reasons: ['רשומה חסרה'], candidate: null };
  }

  // 1. Check ID Match (Highest Priority)
  if (existing.id !== undefined && existing.id !== null && incoming.id !== undefined && incoming.id !== null) {
    const idA = String(existing.id).trim();
    const idB = String(incoming.id).trim();
    if (idA !== '' && idA === idB) {
      return {
        decision: 'SAFE MATCH',
        confidence: 'HIGH',
        score: 100,
        reasons: ['מזהה ייחודי (ID) זהה לחלוטין'],
        candidate: existing
      };
    }
  }

  // 2. Date Checks & Conflicts
  const passDateA = normalizeRawString(existing.passDate).replace(/\D/g, '');
  const passDateB = normalizeRawString(incoming.passDate).replace(/\D/g, '');
  const passDateMatch = passDateA !== '' && passDateB !== '' && passDateA === passDateB;
  const passDateConflict = passDateA !== '' && passDateB !== '' && passDateA !== passDateB;

  if (passDateConflict) {
    return {
      decision: 'NO MATCH',
      confidence: 'LOW',
      score: 0,
      reasons: ['תאריכי פטירה לועזיים שונים'],
      candidate: existing
    };
  }

  const dayA = Number(existing.day);
  const dayB = Number(incoming.day);
  const hasDayA = !isNaN(dayA) && dayA > 0;
  const hasDayB = !isNaN(dayB) && dayB > 0;

  const monthA = normalizeMonthName(existing.month);
  const monthB = normalizeMonthName(incoming.month);
  const hasMonthA = monthA !== '';
  const hasMonthB = monthB !== '';

  const hebrewDateMatch = hasDayA && hasDayB && dayA === dayB && hasMonthA && hasMonthB && monthA === monthB;
  const hebrewDateConflict = hasDayA && hasDayB && hasMonthA && hasMonthB && (dayA !== dayB || monthA !== monthB);

  if (hebrewDateConflict && !passDateMatch) {
    return {
      decision: 'NO MATCH',
      confidence: 'LOW',
      score: 0,
      reasons: ['תאריכי פטירה עבריים שונים'],
      candidate: existing
    };
  }

  const dateMatch = passDateMatch || hebrewDateMatch;

  // 3. Gender Check
  const genderMismatch = Boolean(existing.gender && incoming.gender && existing.gender !== incoming.gender);

  // 4. Multi-language Name Evaluation
  const namesA = getCanonicalFullNames(existing.name, existing.nameHe, existing.nameEn, existing.nameRu);
  const namesB = getCanonicalFullNames(incoming.name, incoming.nameHe, incoming.nameEn, incoming.nameRu);
  const nameDetail = compareFullNamesDetail(namesA, namesB);

  // 5. Parent Names Evaluation
  const fatherA = getCanonicalFullNames(existing.fatherName, existing.fatherNameHe, existing.fatherNameEn, existing.fatherNameRu);
  const fatherB = getCanonicalFullNames(incoming.fatherName, incoming.fatherNameHe, incoming.fatherNameEn, incoming.fatherNameRu);
  const fatherMatch = compareFullNames(fatherA, fatherB);

  const motherA = getCanonicalFullNames(existing.motherName, existing.motherNameHe, existing.motherNameEn, existing.motherNameRu);
  const motherB = getCanonicalFullNames(incoming.motherName, incoming.motherNameHe, incoming.motherNameEn, incoming.motherNameRu);
  const motherMatch = compareFullNames(motherA, motherB);

  const parentMatch = fatherMatch || motherMatch;
  const bothParentsMatch = fatherMatch && motherMatch;

  // 6. Phone Evaluation
  let phoneMatch = false;
  if (existing.contactPhone && incoming.contactPhone) {
    const cleanPhoneA = existing.contactPhone.replace(/\D/g, '');
    const cleanPhoneB = incoming.contactPhone.replace(/\D/g, '');
    if (cleanPhoneA && cleanPhoneA.length >= 7 && cleanPhoneA === cleanPhoneB) {
      phoneMatch = true;
    }
  }

  // --- Strict Decision Logic ---

  if (nameDetail.matched) {
    // A. Single-word name ONLY (e.g. "יוסף" alone, "משה" alone)
    if (nameDetail.isSingleWordOnly) {
      if (dateMatch || parentMatch || phoneMatch) {
        return {
          decision: 'SAFE MATCH',
          confidence: 'HIGH',
          score: 85,
          reasons: ['התאמת שם פרטי בתוספת מזהה תומך מוצק (תאריך פטירה / שמות הורים / טלפון)'],
          candidate: existing
        };
      } else {
        // Single word name with NO date or parent or phone proof -> MUST BE REVIEW
        return {
          decision: 'REVIEW',
          confidence: 'LOW',
          score: 30,
          reasons: ['שם פרטי בלבד ללא תאריך פטירה, שם הורה או טלפון - נדרשת סקירה ידנית'],
          candidate: existing
        };
      }
    }

    // B. Multi-word name (First + Last Name)
    if (genderMismatch) {
      return {
        decision: 'REVIEW',
        confidence: 'LOW',
        score: 40,
        reasons: ['שם תואם אך קיימת אי-התאמה במין - נדרשת סקירה ידנית'],
        candidate: existing
      };
    }

    // High certainty SAFE MATCH conditions:
    // Rule A: Full Name + Pass Date / Hebrew Date / Father / Mother
    if (dateMatch) {
      return {
        decision: 'SAFE MATCH',
        confidence: 'HIGH',
        score: 95,
        reasons: ['התאמת שם מלא ותאריך פטירה עברי/לועזי'],
        candidate: existing
      };
    }

    if (bothParentsMatch) {
      return {
        decision: 'SAFE MATCH',
        confidence: 'HIGH',
        score: 95,
        reasons: ['התאמת שם מלא והתאמת שמות אב ואם'],
        candidate: existing
      };
    }

    if (parentMatch) {
      return {
        decision: 'SAFE MATCH',
        confidence: 'HIGH',
        score: 90,
        reasons: ['התאמת שם מלא ושם הורה'],
        candidate: existing
      };
    }

    if (phoneMatch) {
      return {
        decision: 'SAFE MATCH',
        confidence: 'HIGH',
        score: 90,
        reasons: ['התאמת שם מלא ومספר טלפון ליצירת קשר'],
        candidate: existing
      };
    }

    // Multi-word name match when dates and parents are missing in both records:
    if (nameDetail.isMultiWordMatch && nameDetail.isExact) {
      return {
        decision: 'SAFE MATCH',
        confidence: 'HIGH',
        score: 80,
        reasons: ['התאמת שם מלא (שם פרטי ומשפחה) מדויקת ללא נתונים בסתירה'],
        candidate: existing
      };
    }

    // Transliteration / partial name match without supporting identifiers -> REVIEW
    return {
      decision: 'REVIEW',
      confidence: 'MEDIUM',
      score: 50,
      reasons: ['התאמת שם חלקי או התאמת תעתיק ללא תאריך/שם הורה - נדרשת סקירה ידנית'],
      candidate: existing
    };
  }

  // Parent + Date match fallback when names differ slightly -> REVIEW
  if (bothParentsMatch && dateMatch) {
    return {
      decision: 'REVIEW',
      confidence: 'MEDIUM',
      score: 60,
      reasons: ['שמות הורים ותאריך פטירה תואמים אך שמות הנפטרים שונים - נדרשת סקירה ידנית'],
      candidate: existing
    };
  }

  return {
    decision: 'NO MATCH',
    confidence: 'LOW',
    score: 0,
    reasons: ['אין התאמה מספקת'],
    candidate: null
  };
}

/**
 * Finds the best match across ALL candidates in candidateList.
 * Evaluates all candidates (no break) and checks for multi-candidate ambiguity.
 */
export function findBestMatch(candidateList: Deceased[], incoming: Deceased): CandidateMatchResult {
  if (!candidateList || candidateList.length === 0 || !incoming) {
    return { decision: 'NO MATCH', confidence: 'LOW', score: 0, reasons: ['אין מועמדים לבדיקה'], candidate: null };
  }

  const evaluated: CandidateMatchResult[] = [];

  for (const candidate of candidateList) {
    // Skip evaluating candidate against exact same object instance
    if (candidate === incoming) {
      continue;
    }

    const res = evaluateCandidateMatch(candidate, incoming);
    if (res.score > 0 || res.decision !== 'NO MATCH') {
      evaluated.push(res);
    }
  }

  if (evaluated.length === 0) {
    return { decision: 'NO MATCH', confidence: 'LOW', score: 0, reasons: ['לא נמצאה התאמה במאגר'], candidate: null };
  }

  // Sort by score descending
  evaluated.sort((a, b) => b.score - a.score);

  const top1 = evaluated[0];

  // Ambiguity check: If top match is SAFE MATCH but second match is also high/similar score
  if (top1.decision === 'SAFE MATCH' && evaluated.length > 1) {
    const top2 = evaluated[1];
    if (top2.score >= 50 || (top1.score - top2.score) < 20) {
      return {
        decision: 'REVIEW',
        confidence: 'MEDIUM',
        score: top1.score,
        candidate: top1.candidate,
        reasons: [
          `קיימים מספר מועמדים קנוניים עם התאמה דומה (ID ${top1.candidate?.id} ו-ID ${top2.candidate?.id}) - נדרשת הכרעה ידנית`,
          ...top1.reasons
        ]
      };
    }
  }

  return top1;
}

/**
 * Checks if two Deceased records represent the exact same person.
 * STRICT: Returns true ONLY if decision is SAFE MATCH.
 */
export function isSameDeceasedRecord(a: Deceased, b: Deceased): boolean {
  if (!a || !b) return false;
  const res = evaluateCandidateMatch(a, b);
  return res.decision === 'SAFE MATCH';
}

/**
 * Merges two records of the same person, preserving all existing quality information (field-level merge).
 * Canonical ID is strictly preserved.
 */
export function mergeDeceasedRecords(existing: Deceased, incoming: Deceased): Deceased {
  const merged: Deceased = { ...existing };

  // Canonical ID is ALWAYS preserved from existing
  merged.id = existing.id !== undefined && existing.id !== null ? existing.id : incoming.id;

  const pickField = (fieldExisting?: string | null, fieldIncoming?: string | null): string => {
    const ex = (fieldExisting || '').trim();
    const inc = (fieldIncoming || '').trim();
    const exBad = !ex || isCorruptedTranslation(ex);
    const incBad = !inc || isCorruptedTranslation(inc);
    if (exBad) return inc;
    if (incBad) return ex;
    return ex; // Preserve existing non-empty value
  };

  const pickLongerText = (ex?: string | null, inc?: string | null): string => {
    const e = (ex || '').trim();
    const i = (inc || '').trim();
    const eBad = !e || isCorruptedTranslation(e);
    const iBad = !i || isCorruptedTranslation(i);
    if (eBad) return i;
    if (iBad) return e;
    return i.length > e.length ? i : e;
  };

  // Field-level non-destructive updates
  merged.name = pickField(existing.name, incoming.name);
  merged.nameHe = pickField(existing.nameHe, incoming.nameHe);
  merged.nameEn = pickField(existing.nameEn, incoming.nameEn);
  merged.nameRu = pickField(existing.nameRu, incoming.nameRu);

  merged.fatherName = pickField(existing.fatherName, incoming.fatherName);
  merged.fatherNameHe = pickField(existing.fatherNameHe, incoming.fatherNameHe);
  merged.fatherNameEn = pickField(existing.fatherNameEn, incoming.fatherNameEn);
  merged.fatherNameRu = pickField(existing.fatherNameRu, incoming.fatherNameRu);

  merged.motherName = pickField(existing.motherName, incoming.motherName);
  merged.motherNameHe = pickField(existing.motherNameHe, incoming.motherNameHe);
  merged.motherNameEn = pickField(existing.motherNameEn, incoming.motherNameEn);
  merged.motherNameRu = pickField(existing.motherNameRu, incoming.motherNameRu);

  merged.gender = (existing.gender || incoming.gender || 'male') as any;
  merged.day = existing.day || incoming.day;
  merged.month = existing.month || incoming.month;
  merged.hebrewDate = pickField(existing.hebrewDate, incoming.hebrewDate);
  merged.passDate = pickField(existing.passDate, incoming.passDate);
  merged.birthDate = pickField(existing.birthDate, incoming.birthDate);
  merged.ageAtDeath = existing.ageAtDeath || incoming.ageAtDeath;

  merged.bio = pickLongerText(existing.bio, incoming.bio);
  merged.notes = pickLongerText(existing.notes, incoming.notes);
  merged.notesHe = pickLongerText(existing.notesHe, incoming.notesHe);
  merged.notesEn = pickLongerText(existing.notesEn, incoming.notesEn);
  merged.notesRu = pickLongerText(existing.notesRu, incoming.notesRu);

  merged.contactPhone = pickField(existing.contactPhone, incoming.contactPhone);

  const img = (existing.imageUrl && existing.imageUrl !== '-') ? existing.imageUrl :
              (existing.image && existing.image !== '-') ? existing.image :
              incoming.imageUrl || incoming.image || incoming.photoUrl || incoming.photo;

  if (img && img !== '-') {
    merged.image = img;
    merged.imageUrl = img;
    merged.photoUrl = img;
    merged.photo = img;
  }

  const existingCandles = Number(existing.candlesCount) || 0;
  const incomingCandles = Number(incoming.candlesCount) || 0;
  merged.candlesCount = Math.max(existingCandles, incomingCandles);

  const combinedManual = Array.from(new Set([
    ...(existing.manualFields || []),
    ...(incoming.manualFields || [])
  ]));
  if (combinedManual.length > 0) {
    merged.manualFields = combinedManual;
  }

  return enrichDeceasedTranslations(merged);
}

/**
 * Smart merges an incoming list into an existing master list.
 * Merges ONLY on verified SAFE MATCH.
 */
export function smartMergeDeceasedLists(existingList: Deceased[], incomingList: Deceased[]): Deceased[] {
  const result = [...existingList];

  for (const incoming of incomingList) {
    // 1. Exact ID check
    if (incoming.id !== undefined && incoming.id !== null && String(incoming.id).trim() !== '') {
      const existingIdx = result.findIndex(r => String(r.id).trim() === String(incoming.id).trim());
      if (existingIdx !== -1) {
        result[existingIdx] = mergeDeceasedRecords(result[existingIdx], incoming);
        continue;
      }
    }

    // 2. Safe match check
    const match = findBestMatch(result, incoming);
    if (match.decision === 'SAFE MATCH' && match.candidate) {
      const idx = result.findIndex(r => String(r.id).trim() === String(match.candidate!.id).trim());
      if (idx !== -1) {
        result[idx] = mergeDeceasedRecords(result[idx], incoming);
        continue;
      }
    }

    result.push(enrichDeceasedTranslations(incoming));
  }

  return result;
}

/**
 * Deduplicates a single list containing duplicate entries.
 */
export function deduplicateSingleList(list: Deceased[]): Deceased[] {
  const result: Deceased[] = [];

  for (const item of list) {
    if (!item || (!item.name && !item.nameHe && !item.nameRu && !item.nameEn)) continue;

    // 1. Check exact ID match first
    if (item.id !== undefined && item.id !== null && String(item.id).trim() !== '') {
      const existingIdx = result.findIndex(r => String(r.id).trim() === String(item.id).trim());
      if (existingIdx !== -1) {
        result[existingIdx] = mergeDeceasedRecords(result[existingIdx], item);
        continue;
      }
    }

    // 2. Safe match check
    const match = findBestMatch(result, item);
    if (match.decision === 'SAFE MATCH' && match.candidate) {
      const idx = result.findIndex(r => String(r.id).trim() === String(match.candidate!.id).trim());
      if (idx !== -1) {
        result[idx] = mergeDeceasedRecords(result[idx], item);
        continue;
      }
    }

    result.push(enrichDeceasedTranslations(item));
  }

  return result;
}

export interface DeduplicationPlanItem {
  timestampId: string | number;
  candidateCanonicalId: string | number | null;
  timestampName: string;
  candidateName: string;
  matchReasons: string[];
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  decision: 'SAFE MATCH' | 'REVIEW' | 'NO MATCH';
  mergedPreview?: Deceased;
}

export interface DeduplicationPlan {
  totalRecords: number;
  canonicalCount: number;
  timestampCount: number;
  safeMatchCount: number;
  reviewCount: number;
  noMatchCount: number;
  items: DeduplicationPlanItem[];
}

/**
 * Builds a comprehensive READ-ONLY deduplication plan for auditing records.
 */
export function buildDeduplicationPlan(list: Deceased[]): DeduplicationPlan {
  const canonicalRecords: Deceased[] = [];
  const timestampRecords: Deceased[] = [];

  for (const r of list) {
    if (!r) continue;
    const numId = Number(r.id);
    if (!isNaN(numId) && numId <= 1000) {
      canonicalRecords.push(r);
    } else {
      timestampRecords.push(r);
    }
  }

  const items: DeduplicationPlanItem[] = [];
  let safeMatchCount = 0;
  let reviewCount = 0;
  let noMatchCount = 0;

  for (const tsRec of timestampRecords) {
    const match = findBestMatch(canonicalRecords, tsRec);

    if (match.decision === 'SAFE MATCH' && match.candidate) {
      safeMatchCount++;
      const mergedPreview = mergeDeceasedRecords(match.candidate, tsRec);
      items.push({
        timestampId: tsRec.id ?? 'UNKNOWN',
        candidateCanonicalId: match.candidate.id ?? null,
        timestampName: tsRec.name || tsRec.nameHe || tsRec.nameRu || '',
        candidateName: match.candidate.name || match.candidate.nameHe || match.candidate.nameRu || '',
        matchReasons: match.reasons,
        confidence: match.confidence,
        decision: 'SAFE MATCH',
        mergedPreview
      });
    } else if (match.decision === 'REVIEW' && match.candidate) {
      reviewCount++;
      items.push({
        timestampId: tsRec.id ?? 'UNKNOWN',
        candidateCanonicalId: match.candidate.id ?? null,
        timestampName: tsRec.name || tsRec.nameHe || tsRec.nameRu || '',
        candidateName: match.candidate.name || match.candidate.nameHe || match.candidate.nameRu || '',
        matchReasons: match.reasons,
        confidence: match.confidence,
        decision: 'REVIEW'
      });
    } else {
      noMatchCount++;
      items.push({
        timestampId: tsRec.id ?? 'UNKNOWN',
        candidateCanonicalId: null,
        timestampName: tsRec.name || tsRec.nameHe || tsRec.nameRu || '',
        candidateName: '',
        matchReasons: match.reasons,
        confidence: 'LOW',
        decision: 'NO MATCH'
      });
    }
  }

  return {
    totalRecords: list.length,
    canonicalCount: canonicalRecords.length,
    timestampCount: timestampRecords.length,
    safeMatchCount,
    reviewCount,
    noMatchCount,
    items
  };
}
