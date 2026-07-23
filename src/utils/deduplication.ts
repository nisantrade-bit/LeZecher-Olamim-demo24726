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
  // Choose the longer/more complete story notes
  const notes = (incoming.notes && incoming.notes.length > (existing.notes || '').length)
    ? incoming.notes
    : existing.notes;

  // Choose contact phone if missing
  const contactPhone = existing.contactPhone || incoming.contactPhone;

  // Choose father/mother name if missing
  const fatherName = existing.fatherName || incoming.fatherName;
  const motherName = existing.motherName || incoming.motherName;

  return {
    ...existing,
    fatherName,
    motherName,
    contactPhone,
    notes,
    image: existing.image || incoming.image,
    ageAtDeath: existing.ageAtDeath || incoming.ageAtDeath,
    birthDate: existing.birthDate || incoming.birthDate
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
