import { createClient } from '@supabase/supabase-js';

const metaEnv = (import.meta as unknown as { env?: Record<string, string> }).env || {};
const supabaseUrl = metaEnv.VITE_SUPABASE_URL || 'https://aoendfkvzsywrykmcloy.supabase.co';
const supabaseAnonKey = metaEnv.VITE_SUPABASE_ANON_KEY || 'sb_publishable_szEDKkwDPDeNFcO96jwr1A_GWBAF2Nj';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export function isMissingTableError(error: any): boolean {
  if (!error) return false;
  const msg = typeof error === 'string' ? error : error.message || error.details || '';
  const code = error.code || '';
  return (
    code === 'PGRST301' ||
    code === '42P01' ||
    msg.includes('schema cache') ||
    msg.includes('relation') ||
    msg.includes('does not exist') ||
    msg.includes('public.deceased')
  );
}

/**
 * Validates whether a given query or text value is non-empty (has at least 1 character).
 */
export function isValidQueryString(query: any): boolean {
  if (query === null || query === undefined) return false;
  if (typeof query === 'number') return !isNaN(query);
  if (typeof query !== 'string') return true;
  return query.trim().length >= 1;
}

/**
 * Ensures text string parameter is non-empty.
 * Returns default fallback value ('לא צוין') if empty string ("") is provided.
 */
export function sanitizeValueForSupabase(val: any, fallback: string = 'לא צוין'): any {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    return trimmed.length > 0 ? trimmed : fallback;
  }
  return val;
}

/**
 * Sanitizes a record object before sending to Supabase insert or upsert.
 * Ensures required fields like name, gender, month are not empty string ("").
 */
export function sanitizeRecordForSupabase<T extends Record<string, any>>(record: T): T {
  if (!record || typeof record !== 'object') return record;
  const copy: any = { ...record };

  // Mandatory fields check
  if ('name' in copy) {
    copy.name = sanitizeValueForSupabase(copy.name, 'לא צוין');
  }
  if ('gender' in copy) {
    copy.gender = sanitizeValueForSupabase(copy.gender, 'male');
  }
  if ('month' in copy) {
    copy.month = sanitizeValueForSupabase(copy.month, 'תשרי');
  }

  // Clean up empty strings in other text properties
  for (const key of Object.keys(copy)) {
    if (typeof copy[key] === 'string') {
      copy[key] = copy[key].trim();
    }
  }

  return copy as T;
}

/**
 * Safe search wrapper for Supabase ilike / text queries.
 * Prevents "Too small: expected string to have >=1 characters" error.
 * If query is empty or whitespace (""), returns empty array [] immediately without calling Supabase.
 */
export async function safeSearch(
  query: string,
  column: string = 'name',
  tableName: string = 'deceased'
): Promise<{ data: any[]; error: any }> {
  if (!isValidQueryString(query)) {
    return { data: [], error: null };
  }
  const cleanQuery = query.trim();
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .ilike(column, `%${cleanQuery}%`);
    return { data: data || [], error };
  } catch (err) {
    return { data: [], error: err };
  }
}

/**
 * Safe textSearch wrapper for Supabase.
 * If query is empty string (""), returns empty array [] without making an invalid call.
 */
export async function safeTextSearch(
  query: string,
  column: string = 'name',
  tableName: string = 'deceased'
): Promise<{ data: any[]; error: any }> {
  if (!isValidQueryString(query)) {
    return { data: [], error: null };
  }
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .textSearch(column, query.trim());
    return { data: data || [], error };
  } catch (err) {
    return { data: [], error: err };
  }
}

/**
 * Safe select query wrapper for Supabase.
 * Fetches rows from a table with optional column selection.
 */
export async function safeSelect(
  tableName: string = 'deceased',
  columns: string = '*'
): Promise<{ data: any[]; error: any }> {
  try {
    const { data, error } = await supabase.from(tableName).select(columns);
    return { data: data || [], error };
  } catch (err) {
    return { data: [], error: err };
  }
}

/**
 * Safe eq equality check wrapper for Supabase queries.
 * If string value is empty (""), returns empty array [] or null without querying.
 */
export async function safeEq(
  column: string,
  value: any,
  tableName: string = 'deceased',
  single: boolean = false
): Promise<{ data: any; error: any }> {
  if (!isValidQueryString(value)) {
    return { data: single ? null : [], error: null };
  }
  try {
    const cleanValue = typeof value === 'string' ? value.trim() : value;
    const query = supabase.from(tableName).select('*').eq(column, cleanValue);
    if (single) {
      const { data, error } = await query.single();
      return { data, error };
    } else {
      const { data, error } = await query;
      return { data: data || [], error };
    }
  } catch (err) {
    return { data: single ? null : [], error: err };
  }
}

/**
 * Safe ilike pattern query wrapper for Supabase.
 * If pattern is empty string ("") or whitespace, returns empty array [].
 */
export async function safeIlike(
  column: string,
  pattern: string,
  tableName: string = 'deceased'
): Promise<{ data: any[]; error: any }> {
  if (!isValidQueryString(pattern) || pattern === '%' || pattern === '%%') {
    return { data: [], error: null };
  }
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .ilike(column, pattern.trim());
    return { data: data || [], error };
  } catch (err) {
    return { data: [], error: err };
  }
}

/**
 * Safe insert wrapper for Supabase.
 * Checks for non-empty records, sanitizes text fields, and defaults empty required text to 'לא צוין'.
 */
export async function safeInsert(
  records: any | any[],
  tableName: string = 'deceased'
): Promise<{ data: any; error: any }> {
  if (!records) return { data: [], error: null };
  const arr = Array.isArray(records) ? records : [records];
  if (arr.length === 0) return { data: [], error: null };

  const sanitized = arr.map(item => sanitizeRecordForSupabase(item));
  try {
    const { data, error } = await supabase.from(tableName).insert(sanitized);
    return { data, error };
  } catch (err) {
    return { data: null, error: err };
  }
}

/**
 * Safe upsert wrapper for Supabase.
 * Checks for non-empty records, sanitizes text fields, and defaults empty required text to 'לא צוין'.
 */
export async function safeUpsert(
  records: any | any[],
  tableName: string = 'deceased'
): Promise<{ data: any; error: any }> {
  if (!records) return { data: [], error: null };
  const arr = Array.isArray(records) ? records : [records];
  if (arr.length === 0) return { data: [], error: null };

  const sanitized = arr.map(item => sanitizeRecordForSupabase(item));
  try {
    const { data, error } = await supabase.from(tableName).upsert(sanitized);
    return { data, error };
  } catch (err) {
    return { data: null, error: err };
  }
}

/**
 * Safe delete wrapper for Supabase.
 * Checks if key value is valid before calling delete.
 */
export async function safeDelete(
  column: string,
  value: any,
  tableName: string = 'deceased'
): Promise<{ data: any; error: any }> {
  if (!isValidQueryString(value)) {
    return { data: null, error: null };
  }
  try {
    const { data, error } = await supabase
      .from(tableName)
      .delete()
      .eq(column, typeof value === 'string' ? value.trim() : value);
    return { data, error };
  } catch (err) {
    return { data: null, error: err };
  }
}

export const SUPABASE_SETUP_SQL = `
CREATE TABLE IF NOT EXISTS public.deceased (
  id BIGINT PRIMARY KEY,
  name TEXT NOT NULL,
  gender TEXT NOT NULL,
  "fatherName" TEXT,
  "motherName" TEXT,
  day INT NOT NULL,
  month TEXT NOT NULL,
  "contactPhone" TEXT,
  notes TEXT,
  image TEXT,
  "ageAtDeath" INT,
  "birthDate" TEXT,
  "nameHe" TEXT,
  "nameEn" TEXT,
  "nameRu" TEXT,
  "fatherNameHe" TEXT,
  "fatherNameEn" TEXT,
  "fatherNameRu" TEXT,
  "motherNameHe" TEXT,
  "motherNameEn" TEXT,
  "motherNameRu" TEXT,
  "notesHe" TEXT,
  "notesEn" TEXT,
  "notesRu" TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.deceased ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public select on deceased" ON public.deceased;
DROP POLICY IF EXISTS "Allow public insert on deceased" ON public.deceased;
DROP POLICY IF EXISTS "Allow public update on deceased" ON public.deceased;
DROP POLICY IF EXISTS "Allow public delete on deceased" ON public.deceased;

CREATE POLICY "Allow public select on deceased" ON public.deceased FOR SELECT USING (true);
CREATE POLICY "Allow public insert on deceased" ON public.deceased FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on deceased" ON public.deceased FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on deceased" ON public.deceased FOR DELETE USING (true);
`.trim();
