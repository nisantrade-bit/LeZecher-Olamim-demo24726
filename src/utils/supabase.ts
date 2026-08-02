import { createClient } from '@supabase/supabase-js';

const metaEnv = (import.meta as unknown as { env?: Record<string, string> }).env || {};

const envUrl =
  metaEnv.VITE_SUPABASE_URL ||
  metaEnv.NEXT_PUBLIC_SUPABASE_URL ||
  '';

const envKey =
  metaEnv.VITE_SUPABASE_ANON_KEY ||
  metaEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  '';
const supabaseUrl = envUrl && envUrl.trim() !== ''
  ? envUrl.trim()
  : 'https://placeholder.supabase.co';

const supabaseAnonKey = envKey && envKey.trim() !== ''
  ? envKey.trim()
  : 'placeholder-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export function isSupabaseConfigured(): boolean {
  return (
    !!envUrl &&
    envUrl.trim() !== '' &&
    !envUrl.includes('placeholder.supabase.co') &&
    !!envKey &&
    envKey.trim() !== '' &&
    envKey !== 'placeholder-anon-key'
  );
}

/**
 * Helper to log detailed Supabase errors to DevTools console.
 */
function logSupabaseError(context: string, error: any) {
  if (!error) return;
  const msg = typeof error === 'string' ? error : error.message || error.details || '';
  if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || !isSupabaseConfigured()) {
    console.warn(`[Supabase Notice - ${context}] Supabase network unavailable or not configured. Using local database.`);
    return;
  }
  console.error(`%c[Supabase Error - ${context}]`, 'color: #ff4d4f; font-weight: bold;', {
    message: error.message || error,
    code: error.code,
    details: error.details,
    hint: error.hint,
    error
  });
}

function logSupabaseException(context: string, err: any) {
  const msg = err?.message || String(err);
  if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || !isSupabaseConfigured()) {
    console.warn(`[Supabase Notice - ${context}] Supabase network unavailable or not configured.`);
    return;
  }
  console.error(`%c[Supabase Exception - ${context}]`, 'color: #ff4d4f; font-weight: bold;', err);
}

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
  if (typeof query === 'string') {
    return query.trim().length >= 1;
  }
  return true;
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
 * Sanitizes a record object before sending to Supabase insert, update, or upsert.
 * Ensures required fields like name, gender, month are not empty string ("").
 * Uses language-appropriate defaults ('לא צוין' / 'N/A' / 'Не указано') for missing texts.
 */
export function sanitizeRecordForSupabase<T extends Record<string, any>>(record: T): T {
  if (!record || typeof record !== 'object') return record;
  const copy: any = { ...record };

  const defaultTextColumns: Record<string, string> = {
    name: 'לא צוין',
    nameHe: 'לא צוין',
    nameEn: 'N/A',
    nameRu: 'Не указано',
    gender: 'male',
    month: 'תשרי',
    fatherName: '-',
    motherName: '-',
    fatherNameHe: '-',
    fatherNameEn: 'N/A',
    fatherNameRu: '-',
    motherNameHe: '-',
    motherNameEn: 'N/A',
    motherNameRu: '-',
    notes: '-',
    notesHe: '-',
    notesEn: 'N/A',
    notesRu: '-',
    contactPhone: '-',
    image: '-',
    birthDate: '-'
  };

  // 1. Sanitize all string fields to ensure no empty string "" is sent to Supabase
  for (const key of Object.keys(copy)) {
    const val = copy[key];
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (trimmed.length === 0) {
        if (defaultTextColumns[key]) {
          copy[key] = defaultTextColumns[key];
        } else if (key.endsWith('En')) {
          copy[key] = 'N/A';
        } else if (key.endsWith('Ru')) {
          copy[key] = 'Не указано';
        } else if (key.endsWith('He') || key === 'name') {
          copy[key] = 'לא צוין';
        } else {
          copy[key] = '-';
        }
      } else {
        copy[key] = trimmed;
      }
    }
  }

  // 2. Ensure mandatory string fields are never empty
  copy.name = sanitizeValueForSupabase(copy.name, 'לא צוין');
  copy.gender = sanitizeValueForSupabase(copy.gender, 'male');
  copy.month = sanitizeValueForSupabase(copy.month, 'תשרי');

  return copy as T;
}

// Export alias sanitizeRecord for project consistency
export const sanitizeRecord = sanitizeRecordForSupabase;

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
  if (!isSupabaseConfigured() || !isValidQueryString(query)) {
    return { data: [], error: null };
  }
  const cleanQuery = query.trim();
  if (cleanQuery.length === 0) {
    return { data: [], error: null };
  }
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .ilike(column, `%${cleanQuery}%`);
    if (error) logSupabaseError('safeSearch', error);
    return { data: data || [], error };
  } catch (err) {
    logSupabaseException('safeSearch', err);
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
  if (!isSupabaseConfigured() || !isValidQueryString(query)) {
    return { data: [], error: null };
  }
  const cleanQuery = query.trim();
  if (cleanQuery.length === 0) {
    return { data: [], error: null };
  }
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .textSearch(column, cleanQuery);
    if (error) logSupabaseError('safeTextSearch', error);
    return { data: data || [], error };
  } catch (err) {
    logSupabaseException('safeTextSearch', err);
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
  if (!isSupabaseConfigured()) return { data: [], error: null };
  try {
    const { data, error } = await supabase.from(tableName).select(columns);
    if (error) logSupabaseError('safeSelect', error);
    return { data: data || [], error };
  } catch (err) {
    logSupabaseException('safeSelect', err);
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
  if (!isSupabaseConfigured() || !isValidQueryString(value)) {
    return { data: single ? null : [], error: null };
  }
  const cleanValue = typeof value === 'string' ? value.trim() : value;
  if (typeof cleanValue === 'string' && cleanValue.length === 0) {
    return { data: single ? null : [], error: null };
  }
  try {
    const query = supabase.from(tableName).select('*').eq(column, cleanValue);
    if (single) {
      const { data, error } = await query.single();
      if (error) logSupabaseError('safeEq (single)', error);
      return { data, error };
    } else {
      const { data, error } = await query;
      if (error) logSupabaseError('safeEq', error);
      return { data: data || [], error };
    }
  } catch (err) {
    logSupabaseException('safeEq', err);
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
  if (!isSupabaseConfigured() || !isValidQueryString(pattern)) {
    return { data: [], error: null };
  }
  const cleanPattern = pattern.trim();
  if (cleanPattern.length === 0 || cleanPattern === '%' || cleanPattern === '%%') {
    return { data: [], error: null };
  }
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .ilike(column, cleanPattern);
    if (error) logSupabaseError('safeIlike', error);
    return { data: data || [], error };
  } catch (err) {
    logSupabaseException('safeIlike', err);
    return { data: [], error: err };
  }
}

/**
 * Safe insert wrapper for Supabase.
 * Checks for non-empty records, sanitizes text fields, and defaults empty required text.
 */
export async function safeInsert(
  records: any | any[],
  tableName: string = 'deceased'
): Promise<{ data: any; error: any }> {
  if (!isSupabaseConfigured() || !records) return { data: [], error: null };
  const arr = Array.isArray(records) ? records : [records];
  if (arr.length === 0) return { data: [], error: null };

  const sanitized = arr.map(item => sanitizeRecordForSupabase(item));
  try {
    const { data, error } = await (supabase.from(tableName as any) as any).insert(sanitized);
    if (error) logSupabaseError('safeInsert', error);
    return { data, error };
  } catch (err) {
    logSupabaseException('safeInsert', err);
    return { data: null, error: err };
  }
}

/**
 * Safe update wrapper for Supabase.
 * Sanitizes input record and checks target value.
 */
export async function safeUpdate(
  column: string,
  value: any,
  updateData: any,
  tableName: string = 'deceased'
): Promise<{ data: any; error: any }> {
  if (!isSupabaseConfigured() || !isValidQueryString(value)) {
    return { data: null, error: null };
  }
  const cleanValue = typeof value === 'string' ? value.trim() : value;
  if (typeof cleanValue === 'string' && cleanValue.length === 0) {
    return { data: null, error: null };
  }
  const sanitized = sanitizeRecordForSupabase(updateData);
  try {
    const { data, error } = await (supabase
      .from(tableName as any) as any)
      .update(sanitized)
      .eq(column, cleanValue);
    if (error) logSupabaseError('safeUpdate', error);
    return { data, error };
  } catch (err) {
    logSupabaseException('safeUpdate', err);
    return { data: null, error: err };
  }
}

/**
 * Safe upsert wrapper for Supabase.
 * Checks for non-empty records, sanitizes text fields, and defaults empty required text.
 */
export async function safeUpsert(
  records: any | any[],
  tableName: string = 'deceased'
): Promise<{ data: any; error: any }> {
  if (!isSupabaseConfigured() || !records) return { data: [], error: null };
  const arr = Array.isArray(records) ? records : [records];
  if (arr.length === 0) return { data: [], error: null };

  const sanitized = arr.map(item => sanitizeRecordForSupabase(item));
  try {
    let { data, error } = await (supabase.from(tableName as any) as any).upsert(sanitized, { onConflict: 'id' });
    if (error && !isMissingTableError(error)) {
      const fallbackRes = await (supabase.from(tableName as any) as any).upsert(sanitized);
      if (fallbackRes.error && !isMissingTableError(fallbackRes.error)) {
        logSupabaseError('safeUpsert', fallbackRes.error);
      }
      error = fallbackRes.error;
      data = fallbackRes.data;
    } else if (error) {
      logSupabaseError('safeUpsert', error);
    }

    // Also sync to alternate table name ('memorials' or 'deceased') so any schema works
    const altTable = tableName === 'deceased' ? 'memorials' : 'deceased';
    try {
      await (supabase.from(altTable as any) as any).upsert(sanitized, { onConflict: 'id' });
    } catch (e) {}

    return { data, error };
  } catch (err) {
    logSupabaseException('safeUpsert', err);
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
  if (!isSupabaseConfigured() || !isValidQueryString(value)) {
    return { data: null, error: null };
  }
  const cleanValue = typeof value === 'string' ? value.trim() : value;
  if (typeof cleanValue === 'string' && cleanValue.length === 0) {
    return { data: null, error: null };
  }
  try {
    const { data, error } = await supabase
      .from(tableName)
      .delete()
      .eq(column, cleanValue);
    if (error) logSupabaseError('safeDelete', error);
    return { data, error };
  } catch (err) {
    logSupabaseException('safeDelete', err);
    return { data: null, error: err };
  }
}

/**
 * Safe delete all wrapper for Supabase reset.
 */
export async function safeDeleteAll(
  tableName: string = 'deceased'
): Promise<{ data: any; error: any }> {
  if (!isSupabaseConfigured()) return { data: [], error: null };
  try {
    const { data, error } = await supabase
      .from(tableName)
      .delete()
      .neq('id', 0);
    if (error) logSupabaseError('safeDeleteAll', error);
    return { data, error };
  } catch (err) {
    logSupabaseException('safeDeleteAll', err);
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

-- Also support 'memorials' table name
CREATE TABLE IF NOT EXISTS public.memorials (LIKE public.deceased INCLUDING ALL);
ALTER TABLE public.memorials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public select on memorials" ON public.memorials;
DROP POLICY IF EXISTS "Allow public insert on memorials" ON public.memorials;
DROP POLICY IF EXISTS "Allow public update on memorials" ON public.memorials;
DROP POLICY IF EXISTS "Allow public delete on memorials" ON public.memorials;
CREATE POLICY "Allow public select on memorials" ON public.memorials FOR SELECT USING (true);
CREATE POLICY "Allow public insert on memorials" ON public.memorials FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on memorials" ON public.memorials FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on memorials" ON public.memorials FOR DELETE USING (true);
`.trim();

/**
 * Synchronizes and fetches a memorial card by ID from Supabase ('memorials' and 'deceased' tables)
 * or falls back to server API.
 * Uses anon client for public RLS access without requiring Auth login.
 */
export async function fetchMemorialCardById(rawId: string | number): Promise<{ data: any | null; error: any | null }> {
  if (rawId === null || rawId === undefined || rawId === '') {
    return { data: null, error: 'Empty ID' };
  }

  // 1. Decode ID using decodeURIComponent to handle special characters
  let decodedId = String(rawId).trim();
  try {
    decodedId = decodeURIComponent(decodedId);
  } catch (e) {}

  // MANDATORY LOG A: ID received from URL
  console.log('[Memorial Fetch] ID received from URL:', decodedId);

  let fetchedData: any | null = null;
  let lastError: any | null = null;

  if (isSupabaseConfigured()) {
    const numId = Number(decodedId);
    const isNumeric = !isNaN(numId) && String(numId) === decodedId;

    // Query 'memorials' and 'deceased' tables using anon client (public read access without Auth)
    const tablesToTry = ['memorials', 'deceased'];
    for (const tableName of tablesToTry) {
      try {
        const { data, error } = await supabase
          .from(tableName as any)
          .select('*')
          .eq('id', isNumeric ? numId : decodedId)
          .maybeSingle();

        if (data && data.id) {
          fetchedData = data;
          lastError = null;
          break;
        }

        // If not found and numeric/string mismatch might occur, try String matching explicitly
        if (!data && (error || !isNumeric)) {
          const { data: strData, error: strError } = await supabase
            .from(tableName as any)
            .select('*')
            .eq('id', String(decodedId))
            .maybeSingle();

          if (strData && strData.id) {
            fetchedData = strData;
            lastError = null;
            break;
          }
          if (strError && !isMissingTableError(strError)) {
            lastError = strError;
          }
        } else if (error && !isMissingTableError(error)) {
          lastError = error;
        }
      } catch (err) {
        lastError = err;
      }
    }
  }

  // MANDATORY LOG B: Response returned from Supabase (or error message if any)
  console.log('[Memorial Fetch] Supabase response:', fetchedData, lastError);

  if (fetchedData && fetchedData.id) {
    return { data: fetchedData, error: null };
  }

  // Fallback: Check Express server API if Supabase returned nothing or table is missing
  try {
    const res = await fetch(`/api/deceased/${encodeURIComponent(decodedId)}`);
    if (res.ok) {
      const record = await res.json();
      if (record && record.id && record.name) {
        return { data: record, error: null };
      }
    }
    // Also try fetching all deceased list from server API just in case single route failed
    const allRes = await fetch('/api/deceased');
    if (allRes.ok) {
      const list = await allRes.json();
      if (Array.isArray(list)) {
        const found = list.find((item: any) => 
          String(item.id) === String(decodedId) || Number(item.id) === Number(decodedId)
        );
        if (found) {
          return { data: found, error: null };
        }
      }
    }
  } catch (apiErr) {
    console.error('[Memorial Fetch] Server API fallback error:', apiErr);
  }

  return { data: null, error: lastError || new Error('Record not found in Supabase or API') };
}

