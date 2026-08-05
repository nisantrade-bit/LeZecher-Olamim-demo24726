/**
 * Utility for deduplicating and smart-merging memorial records across Hebrew, English, and Russian imports.
 */

import { Deceased, Language } from '../types';
import { normalizeMonthName } from './hebrewDate';
import { translateText } from './transliteration';

/**
 * Normalizes a name string for fuzzy matching (strips quotes, parentheses, extra spaces, converts to lowercase latin stem)
 */
export function normalizeNameForMatching(name: string): string {
  if (!name) return '';
  // Translate to English first to get a unified English phonetic string for comparison
  const englishVersion = translateText(name, 'en').toLowerCase();
  // Remove parenthetical details, punctuation, spaces
  return englishVersion
    .replace(/\([^)]*\)/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Checks if two Deceased records represent the exact same person
 */
export function isSameDeceasedRecord(a: Deceased, b: Deceased): boolean {
  // 1. Must match Hebrew Date (Day & Month) - convert day to number safely
  if (Number(a.day) !== Number(b.day)) return false;
  
  const monthA = normalizeMonthName(a.month);
  const monthB = normalizeMonthName(b.month);
  if (monthA !== monthB) return false;

  // 2. Must match Gender
  if (a.gender !== b.gender) return false;

  // 3. Match Name
  const normA = normalizeNameForMatching(a.name);
  const normB = normalizeNameForMatching(b.name);

  if (normA && normB && (normA === normB || normA.includes(normB) || normB.includes(normA))) {
    return true;
  }

  // Match Father Name if provided on both
  if (a.fatherName && b.fatherName) {
    const fA = normalizeNameForMatching(a.fatherName);
    const fB = normalizeNameForMatching(b.fatherName);
    if (fA && fB && (fA === fB || fA.includes(fB) || fB.includes(fA))) {
      return true;
    }
  }

  // Fallback: If phone matches and not empty
  if (a.contactPhone && b.contactPhone) {
    const cleanPhoneA = a.contactPhone.replace(/\D/g, '');
    const cleanPhoneB = b.contactPhone.replace(/\D/g, '');
    if (cleanPhoneA && cleanPhoneA === cleanPhoneB) return true;
  }

  return false;
}

/**
 * Merges two records of the same person, preserving the best available information
 */
export function mergeDeceasedRecords(existing: Deceased, incoming: Deceased): Deceased {
  // Choose the longer/more complete story notes and bio
  const bio = (incoming.bio && incoming.bio.length > (existing.bio || '').length)
    ? incoming.bio
    : (existing.bio || incoming.notes || existing.notes);
  
  const notes = (incoming.notes && incoming.notes.length > (existing.notes || '').length)
    ? incoming.notes
    : (existing.notes || bio);

  // Choose contact phone if missing
  const contactPhone = existing.contactPhone || incoming.contactPhone;

  // Choose father/mother name if missing
  const fatherName = existing.fatherName || incoming.fatherName;
  const motherName = existing.motherName || incoming.motherName;

  // Choose dates if missing
  const hebrewDate = existing.hebrewDate || incoming.hebrewDate;
  const passDate = existing.passDate || incoming.passDate;

  // Image URL mapping across aliases
  const img = existing.imageUrl || incoming.imageUrl || existing.image || incoming.image || existing.photoUrl || incoming.photoUrl || existing.photo || incoming.photo;

  const candlesCount = (existing.candlesCount !== undefined ? existing.candlesCount : 0) + (incoming.candlesCount !== undefined ? incoming.candlesCount : 0);

  return {
    ...existing,
    fatherName,
    motherName,
    contactPhone,
    hebrewDate,
    passDate,
    bio,
    notes,
    image: img,
    imageUrl: img,
    photoUrl: img,
    photo: img,
    candlesCount,
    ageAtDeath: existing.ageAtDeath || incoming.ageAtDeath,
    birthDate: existing.birthDate || incoming.birthDate,

    // Preserve multi-language fields
    nameHe: existing.nameHe || incoming.nameHe,
    nameEn: existing.nameEn || incoming.nameEn,
    nameRu: existing.nameRu || incoming.nameRu,
    fatherNameHe: existing.fatherNameHe || incoming.fatherNameHe,
    fatherNameEn: existing.fatherNameEn || incoming.fatherNameEn,
    fatherNameRu: existing.fatherNameRu || incoming.fatherNameRu,
    motherNameHe: existing.motherNameHe || incoming.motherNameHe,
    motherNameEn: existing.motherNameEn || incoming.motherNameEn,
    motherNameRu: existing.motherNameRu || incoming.motherNameRu,
    notesHe: existing.notesHe || incoming.notesHe,
    notesEn: existing.notesEn || incoming.notesEn,
    notesRu: existing.notesRu || incoming.notesRu
  };
}

/**
 * Merges an incoming list into an existing master list with smart deduplication
 */
export function smartMergeDeceasedLists(existingList: Deceased[], incomingList: Deceased[]): Deceased[] {
  const result = [...existingList];

  for (const incoming of incomingList) {
    const existingIndex = result.findIndex(existing => isSameDeceasedRecord(existing, incoming));
    if (existingIndex !== -1) {
      // Merge into existing record
      result[existingIndex] = mergeDeceasedRecords(result[existingIndex], incoming);
    } else {
      // Add as new record
      result.push(incoming);
    }
  }

  return result;
}

/**
 * Deduplicates a list containing duplicate entries
 */
export function deduplicateSingleList(list: Deceased[]): Deceased[] {
  const result: Deceased[] = [];

  for (const item of list) {
    const existingIndex = result.findIndex(existing => isSameDeceasedRecord(existing, item));
    if (existingIndex !== -1) {
      result[existingIndex] = mergeDeceasedRecords(result[existingIndex], item);
    } else {
      result.push(item);
    }
  }

  return result;
}
