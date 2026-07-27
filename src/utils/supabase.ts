import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * פונקציית עזר לסניטציה של מחרוזת בודדת
 */
export const sanitizeString = (val: unknown, fallback: string = '-'): string => {
  if (typeof val !== 'string') return fallback;
  const trimmed = val.trim();
  return trimmed.length >= 1 ? trimmed : fallback;
};

/**
 * פונקציה המנקה אובייקט רשומה שלם לפני הוספה/עדכון.
 * כל שדה טקסט ריק (או מכיל רק רווחים) מומק לערך ברירת מחדל.
 */
export const sanitizeRecord = <T extends Record<string, any>>(
  record: T,
  fallback: string = '-'
): T => {
  const sanitized = { ...record };
  for (const key in sanitized) {
    if (typeof sanitized[key] === 'string') {
      sanitized[key] = sanitizeString(sanitized[key], fallback) as any;
    }
  }
  return sanitized;
};

/**
 * חיפוש בטוח לפי ilike - מחזיר מערך ריק אם המחרוזת ריקה
 */
export const safeIlike = async (
  tableName: string,
  columnName: string,
  searchQuery: string
) => {
  const query = searchQuery.trim();
  if (query.length === 0) {
    return { data: [], error: null };
  }

  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .ilike(columnName, `%${query}%`);

  return { data: data || [], error };
};

/**
 * חיפוש בטוח רב-שדות (safeSearch)
 */
export const safeSearch = async (
  tableName: string,
  columns: string[],
  searchQuery: string
) => {
  const query = searchQuery.trim();
  if (query.length === 0) {
    return { data: [], error: null };
  }

  // ביוזמת or condition עבור סופאבייס
  const orCondition = columns.map((col) => `${col}.ilike.%${query}%`).join(',');

  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .or(orCondition);

  return { data: data || [], error };
};

/**
 * חיפוש טקסט מלא בטוח (textSearch)
 */
export const safeTextSearch = async (
  tableName: string,
  columnName: string,
  searchQuery: string
) => {
  const query = searchQuery.trim();
  if (query.length === 0) {
    return { data: [], error: null };
  }

  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .textSearch(columnName, query);

  return { data: data || [], error };
};

/**
 * הכנסת רשומה בטוחה עם סניטציה
 */
export const safeInsert = async (tableName: string, record: Record<string, any>) => {
  const cleanRecord = sanitizeRecord(record);
  const { data, error } = await supabase
    .from(tableName)
    .insert([cleanRecord])
    .select();

  return { data, error };
};

/**
 * עדכון/הכנסה בטוחה (Upsert) עם סניטציה
 */
export const safeUpsert = async (tableName: string, record: Record<string, any>) => {
  const cleanRecord = sanitizeRecord(record);
  const { data, error } = await supabase
    .from(tableName)
    .upsert([cleanRecord])
    .select();

  return { data, error };
};

/**
 * שליפת כל הרשומות מטבלה
 */
export const fetchAllRecords = async (tableName: string) => {
  const { data, error } = await supabase.from(tableName).select('*');
  return { data: data || [], error };
};
