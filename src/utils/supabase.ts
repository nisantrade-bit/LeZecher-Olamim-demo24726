import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_URL.trim() !== ''
  ? import.meta.env.VITE_SUPABASE_URL
  : 'https://placeholder.supabase.co';

const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY && import.meta.env.VITE_SUPABASE_ANON_KEY.trim() !== ''
  ? import.meta.env.VITE_SUPABASE_ANON_KEY
  : 'placeholder-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * מזהה שגיאה של טבלה חסרה ב-Supabase
 */
export const isMissingTableError = (error: any): boolean => {
  if (!error) return false;
  const msg = typeof error === 'string' ? error : error.message || '';
  return msg.includes('relation') && msg.includes('does not exist');
};

/**
 * שאילתת SQL להקמת טבלאות ברירת מחדל
 */
export const SUPABASE_SETUP_SQL = `
CREATE TABLE IF NOT EXISTS public.deceased (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  date_of_passing TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
`;

/**
 * סניטציה למחרוזת בודדת - מונע מחרוזת ריקה שגורמת לשגיאה בסופאבייס
 */
export const sanitizeString = (val: unknown, fallback: string = '-'): string => {
  if (typeof val !== 'string') return fallback;
  const trimmed = val.trim();
  return trimmed.length >= 1 ? trimmed : fallback;
};

/**
 * סניטציה לרשומה שלמה
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
 * שאילתת השוואה בטוחה (safeEq)
 */
export const safeEq = async (tableName: string, columnName: string, value: string) => {
  const cleanVal = value ? value.trim() : '';
  if (cleanVal.length === 0) {
    return { data: [], error: null };
  }
  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .eq(columnName, cleanVal);
  return { data: data || [], error };
};

/**
 * חיפוש בטוח לפי ilike (safeIlike)
 */
export const safeIlike = async (
  tableName: string,
  columnName: string,
  searchQuery: string
) => {
  const query = searchQuery ? searchQuery.trim() : '';
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
  const query = searchQuery ? searchQuery.trim() : '';
  if (query.length === 0) {
    return { data: [], error: null };
  }
  const orCondition = columns.map((col) => `${col}.ilike.%${query}%`).join(',');
  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .or(orCondition);
  return { data: data || [], error };
};

/**
 * חיפוש טקסט מלא בטוח (safeTextSearch)
 */
export const safeTextSearch = async (
  tableName: string,
  columnName: string,
  searchQuery: string
) => {
  const query = searchQuery ? searchQuery.trim() : '';
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
 * שליפת רשומות בטוחה (safeSelect)
 */
export const safeSelect = async (tableName: string, queryStr: string = '*') => {
  const { data, error } = await supabase.from(tableName).select(queryStr);
  return { data: data || [], error };
};

/**
 * הכנסת רשומה בטוחה עם סניטציה (safeInsert)
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
 * עדכון/הכנסה בטוחה עם סניטציה (safeUpsert)
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
 * מחיקת רשומה בטוחה לפי ID (safeDelete)
 */
export const safeDelete = async (tableName: string, id: string | number) => {
  if (!id) return { data: null, error: 'No ID provided' };
  const { data, error } = await supabase.from(tableName).delete().eq('id', id);
  return { data, error };
};

/**
 * מחיקת כל הרשומות בטבלה (safeDeleteAll)
 */
export const safeDeleteAll = async (tableName: string) => {
  const { data, error } = await supabase.from(tableName).delete().neq('id', '00000000-0000-0000-0000-000000000000');
  return { data, error };
};

/**
 * שליפת כל הרשומות מטבלה (fetchAllRecords)
 */
export const fetchAllRecords = async (tableName: string) => {
  const { data, error } = await supabase.from(tableName).select('*');
  return { data: data || [], error };
};
