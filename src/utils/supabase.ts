import { createClient } from '@supabase/supabase-js';
import { parseAndNormalizeDateFields } from './hebrewDate';
import { isSameDeceasedRecord, mergeDeceasedRecords, buildDeduplicationPlan, DeduplicationPlan } from './deduplication';
import { normalizeImageTo3x4 } from './imageUtils';

const FALLBACK_SUPABASE_URL = "https://aoendfkvzsywrykmcloy.supabase.co";
const FALLBACK_SUPABASE_ANON_KEY = "sb_publishable_szEDKkwDPDeNFcO96jwr1A_GWBAF2Nj";

const metaEnv = (import.meta as unknown as { env?: Record<string, string> }).env || {};
const rawUrl = metaEnv.VITE_SUPABASE_URL || (typeof process !== 'undefined' ? process.env?.VITE_SUPABASE_URL : '') || '';
const rawKey = metaEnv.VITE_SUPABASE_ANON_KEY || (typeof process !== 'undefined' ? process.env?.VITE_SUPABASE_ANON_KEY : '') || '';

const envUrl = (rawUrl.trim() && !rawUrl.includes('YOUR_PROJECT_ID') && !rawUrl.includes('placeholder') ? rawUrl.trim() : FALLBACK_SUPABASE_URL).replace(/\/+$/, '');
const envKey = (rawKey.trim() && !rawKey.includes('YOUR_ANON_KEY') && !rawKey.includes('placeholder') ? rawKey.trim() : FALLBACK_SUPABASE_ANON_KEY);

export const supabase = createClient(envUrl, envKey);
console.log("Supabase Client Initialized with URL:", envUrl);

export function isSupabaseConfigured(): boolean {
  return true;
}

/**
 * Uploads a memorial photo file to Supabase Storage bucket.
 * Cleans the filename to pure ASCII characters, verifies image existence,
 * and handles any storage errors gracefully without blocking card saving.
 */
export async function uploadMemorialImage(file?: File | null, deceasedId?: number | string): Promise<string | null> {
  // 1. Check if Image Exists - run upload ONLY if a valid File is provided
  if (!file || !(file instanceof File) || file.size === 0) {
    return null;
  }

  try {
    // Central Normalization: Convert image to standard 3:4 aspect ratio (900x1200 JPEG)
    let uploadFile: File = file;
    try {
      uploadFile = await normalizeImageTo3x4(file, file.name || 'photo.jpg');
    } catch (normErr) {
      console.warn('[uploadMemorialImage normalization fallback]', normErr);
    }

    const originalName = uploadFile.name || 'photo.jpg';
    const safeExt = 'jpg';

    // 2. Sanitize Path: English characters, numbers, no Hebrew/spaces/slashes, no leading slash
    const randomSuffix = Math.random().toString(36).substring(2, 9);
    const cleanId = String(deceasedId || '0').replace(/[^a-zA-Z0-9_-]/g, '') || '0';
    const filePath = `image_${Date.now()}_${cleanId}_${randomSuffix}.${safeExt}`;

    let bucketName = 'memorial-images';

    // 3. Non-blocking Storage Upload in try-catch
    let data = null;
    let error = null;

    try {
      const res = await supabase.storage.from(bucketName).upload(filePath, uploadFile, {
        upsert: true,
        contentType: uploadFile.type || 'image/jpeg'
      });
      data = res.data;
      error = res.error;
    } catch (err: any) {
      error = err;
    }

    if (error && (
      error.message?.includes('not found') ||
      error.message?.includes('Bucket') ||
      error.message?.includes('Invalid path') ||
      (error as any).statusCode === '404' ||
      (error as any).status === 404 ||
      (error as any).statusCode === 400 ||
      (error as any).status === 400
    )) {
      bucketName = 'photos';
      try {
        const res = await supabase.storage.from(bucketName).upload(filePath, file, {
          upsert: true,
          contentType: file.type || `image/${safeExt}`
        });
        data = res.data;
        error = res.error;
      } catch (err: any) {
        error = err;
      }
    }

    if (!error && data) {
      const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(filePath);
      if (publicUrlData?.publicUrl) {
        const publicUrl = publicUrlData.publicUrl;
        if (deceasedId) {
          const numId = Number(deceasedId);
          if (!isNaN(numId) && numId > 0) {
            try {
              await supabase.from('deceased').update({ imageUrl: publicUrl }).eq('id', numId);
            } catch (e) {
              console.warn("[Supabase Record Image Update Exception]", e);
            }
          }
        }
        return publicUrl;
      }
    } else if (error) {
      console.warn("[Supabase Storage Upload Warning - Non-blocking]", error.message || error);
    }
  } catch (err) {
    console.warn("[Supabase Storage Non-blocking Exception]", err);
  }
  return null;
}

/**
 * Scans Supabase 'deceased' table for duplicate records using unified cross-lingual matching.
 * READ-ONLY BY DEFAULT: Generates a deduplication audit plan without modifying Supabase.
 * No records are updated or deleted unless executeDelete and safetyGateConfirmed are explicitly true.
 */
export async function cleanAndDeduplicateSupabase(options?: {
  executeDelete?: boolean;
  safetyGateConfirmed?: boolean;
}): Promise<{ count: number; deleted: number; plan?: DeduplicationPlan }> {
  if (!isSupabaseConfigured()) return { count: 0, deleted: 0 };
  try {
    const { data, error } = await supabase.from('deceased').select('*');
    if (error || !Array.isArray(data) || data.length === 0) {
      return { count: Array.isArray(data) ? data.length : 0, deleted: 0 };
    }

    const normalizedRecords = data.map(normalizeFetchedRecord).filter(Boolean);
    const plan = buildDeduplicationPlan(normalizedRecords);

    // SAFETY GATE: Absolutely NO deletion unless explicitly requested with double confirmation
    if (options?.executeDelete && options?.safetyGateConfirmed) {
      const duplicateIdsToDelete = plan.items
        .filter(item => item.decision === 'SAFE MATCH') // STRICT: ONLY SAFE MATCH!
        .map(item => item.timestampId)
        .filter(id => id !== 'UNKNOWN');

      if (duplicateIdsToDelete.length > 0) {
        console.log(`[Supabase Cleanup Executed with Safety Gate] Deleting ${duplicateIdsToDelete.length} rows:`, duplicateIdsToDelete);
        const { error: delErr } = await supabase.from('deceased').delete().in('id', duplicateIdsToDelete);
        if (delErr) {
          console.warn("[Supabase Cleanup Error]", delErr);
        }
        return { count: plan.canonicalCount, deleted: duplicateIdsToDelete.length, plan };
      }
    }

    // READ-ONLY / DRY-RUN BY DEFAULT
    console.log(`[Supabase Cleanup Audit - Read-Only] Found ${plan.safeMatchCount} SAFE MATCH pairs across ${plan.totalRecords} total records.`);
    return { count: plan.canonicalCount, deleted: 0, plan };
  } catch (err) {
    console.warn("[Supabase Cleanup Exception]", err);
    return { count: 0, deleted: 0 };
  }
}

/**
 * Helper to log detailed Supabase errors to DevTools console.
 */
function logSupabaseError(context: string, error: any) {
  if (!error) return;
  const msg = typeof error === 'string' ? error : error.message || error.details || '';
  if (
    msg.includes('Failed to fetch') ||
    msg.includes('NetworkError') ||
    !isSupabaseConfigured() ||
    isMissingTableError(error)
  ) {
    console.warn(`[Supabase Notice - ${context}] Supabase table/schema unavailable or not configured. Using local/server database.`);
    return;
  }
  console.warn(`[Supabase Notice - ${context}]`, {
    message: error.message || error,
    code: error.code,
    details: error.details,
    hint: error.hint
  });
}

function logSupabaseException(context: string, err: any) {
  const msg = err?.message || String(err);
  if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || !isSupabaseConfigured() || isMissingTableError(err)) {
    console.warn(`[Supabase Notice - ${context}] Supabase network unavailable or not configured.`);
    return;
  }
  console.warn(`[Supabase Notice - ${context}]`, err);
}

export function isMissingTableError(error: any): boolean {
  if (!error) return false;
  const msg = (typeof error === 'string' ? error : error.message || error.details || error.hint || '').toLowerCase();
  const code = error.code || '';
  return (
    code === 'PGRST301' ||
    code === 'PGRST204' ||
    code === 'PGRST100' ||
    code === 'PGRST106' ||
    code === 'PGRST116' ||
    code === '42P01' ||
    code === '42P10' ||
    code === '42501' ||
    code === '42703' ||
    msg.includes('schema cache') ||
    msg.includes('relation') ||
    msg.includes('does not exist') ||
    msg.includes('public.deceased') ||
    msg.includes('public.memorials') ||
    msg.includes('row-level security') ||
    msg.includes('permission denied') ||
    msg.includes('on conflict') ||
    msg.includes('column') ||
    msg.includes('policy') ||
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('cors')
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

const SUPABASE_DECEASED_COLUMNS = new Set([
  'id',
  'name',
  'gender',
  'fatherName',
  'motherName',
  'day',
  'month',
  'contactPhone',
  'notes',
  'bio',
  'hebrewDate',
  'passDate',
  'candlesCount',
  'likesCount',
  'image',
  'imageUrl',
  'photoUrl',
  'imagePosition',
  'ageAtDeath',
  'birthDate',
  'nameHe',
  'nameEn',
  'nameRu',
  'fatherNameHe',
  'fatherNameEn',
  'fatherNameRu',
  'motherNameHe',
  'motherNameEn',
  'motherNameRu',
  'notesHe',
  'notesEn',
  'notesRu'
]);

/**
 * Sanitizes a record object before sending to Supabase insert, update, or upsert.
 * Ensures required fields like name, gender, month are not empty string ("").
 * Uses language-appropriate defaults ('לא צוין' / 'N/A' / 'Не указано') for missing texts.
 */
export function sanitizeRecordForSupabase<T extends Record<string, any>>(record: T): T {
  if (!record || typeof record !== 'object') return record;
  const copy: any = { ...record };

  // 1. Map all snake_case field aliases to camelCase matching types.ts
  const snakeToCamelMap: Record<string, string> = {
    father_name: 'fatherName',
    mother_name: 'motherName',
    contact_phone: 'contactPhone',
    image_url: 'imageUrl',
    photo_url: 'photoUrl',
    image_position: 'imagePosition',
    age_at_death: 'ageAtDeath',
    birth_date: 'birthDate',
    hebrew_date: 'hebrewDate',
    pass_date: 'passDate',
    candles_count: 'candlesCount',
    likes_count: 'likesCount',
    name_he: 'nameHe',
    name_en: 'nameEn',
    name_ru: 'nameRu',
    father_name_he: 'fatherNameHe',
    father_name_en: 'fatherNameEn',
    father_name_ru: 'fatherNameRu',
    mother_name_he: 'motherNameHe',
    mother_name_en: 'motherNameEn',
    mother_name_ru: 'motherNameRu',
    notes_he: 'notesHe',
    notes_en: 'notesEn',
    notes_ru: 'notesRu',
    manual_fields: 'manualFields'
  };

  for (const [snakeKey, camelKey] of Object.entries(snakeToCamelMap)) {
    if (snakeKey in copy) {
      if (copy[camelKey] === undefined || copy[camelKey] === null || copy[camelKey] === '') {
        copy[camelKey] = copy[snakeKey];
      }
      delete copy[snakeKey];
    }
  }

  // Handle photo property alias
  if (copy.photo) {
    if (!copy.image) copy.image = copy.photo;
    delete copy.photo;
  }

  // Synchronize image fields
  const imgVal = copy.imageUrl || copy.image || copy.photoUrl;
  if (imgVal && typeof imgVal === 'string') {
    const cleanImg = imgVal.trim();
    if (cleanImg !== '' && cleanImg !== '-') {
      copy.image = cleanImg;
      copy.imageUrl = cleanImg;
      copy.photoUrl = cleanImg;
    }
  }

  // Normalize dates
  const normDate = parseAndNormalizeDateFields({
    day: copy.day,
    month: copy.month,
    hebrewDate: copy.hebrewDate,
    passDate: copy.passDate
  });
  copy.day = normDate.day || 1;
  copy.month = normDate.month || 'תשרי';
  copy.hebrewDate = normDate.hebrewDate || null;
  copy.passDate = normDate.passDate || null;

  if (!copy.bio && copy.notes) {
    copy.bio = copy.notes;
  }

  // 2. Main Sanitization Pass:
  // - Remove any undefined properties
  // - Convert empty or whitespace-only string fields to null
  for (const key of Object.keys(copy)) {
    const val = copy[key];
    if (val === undefined) {
      delete copy[key];
    } else if (typeof val === 'string') {
      const trimmed = val.trim();
      if (trimmed.length === 0) {
        copy[key] = null;
      } else {
        copy[key] = trimmed;
      }
    }
  }

  // 3. Mandatory field constraints: 'name' and 'gender' must not be null
  if (!copy.name) {
    copy.name = 'לא צוין';
  }
  if (!copy.gender) {
    copy.gender = 'male';
  }

  // Ensure ID and numbers are clean
  if (copy.id !== undefined && copy.id !== null) {
    const parsedId = Number(copy.id);
    if (!isNaN(parsedId) && parsedId > 0) {
      copy.id = parsedId;
    } else {
      delete copy.id;
    }
  }

  if (copy.candlesCount !== undefined && copy.candlesCount !== null) {
    const parsed = Number(copy.candlesCount);
    copy.candlesCount = !isNaN(parsed) ? parsed : 0;
  }

  if (copy.ageAtDeath !== undefined && copy.ageAtDeath !== null) {
    const parsedAge = Number(copy.ageAtDeath);
    copy.ageAtDeath = !isNaN(parsedAge) ? parsedAge : null;
  }

  // 4. Enforce exact DB column whitelist for Supabase payload
  for (const key of Object.keys(copy)) {
    if (!SUPABASE_DECEASED_COLUMNS.has(key)) {
      delete copy[key];
    }
  }

  return copy as T;
}

/**
  Normalizes records fetched from Supabase so imageUrl, bio, hebrewDate, passDate, candlesCount and all aliases are always available.
 */
export function normalizeFetchedRecord(item: any): any {
  if (!item || typeof item !== 'object') return item;
  
  // Image URL mapping across aliases
  const img = item.imageUrl || item.image || item.photoUrl || item.photo || item.image_url || item.photo_url;
  if (img && typeof img === 'string') {
    const trimmed = img.trim();
    if (trimmed !== '' && trimmed !== '-' && trimmed !== 'null' && trimmed !== 'undefined') {
      item.imageUrl = trimmed;
      item.image = trimmed;
      item.photoUrl = trimmed;
      item.photo = trimmed;
      item.image_url = trimmed;
      item.photo_url = trimmed;
    }
  }

  // Bio & Notes mapping
  const bioVal = item.bio || item.notes;
  if (bioVal && typeof bioVal === 'string' && bioVal !== '-') {
    item.bio = bioVal;
    if (!item.notes || item.notes === '-') {
      item.notes = bioVal;
    }
  }

  // Hebrew Date, Pass Date, Day & Month standardization
  const normDate = parseAndNormalizeDateFields({
    day: item.day,
    month: item.month,
    hebrewDate: item.hebrewDate || item.hebrew_date,
    passDate: item.passDate || item.pass_date
  });
  item.day = normDate.day;
  item.month = normDate.month;
  item.hebrewDate = normDate.hebrewDate;
  item.passDate = normDate.passDate;

  // Father & Mother names
  if (!item.fatherName && item.father_name) item.fatherName = item.father_name;
  if (!item.motherName && item.mother_name) item.motherName = item.mother_name;

  // Candles Count
  if (item.candlesCount !== undefined) {
    item.candlesCount = Number(item.candlesCount);
  } else if (item.candles_count !== undefined) {
    item.candlesCount = Number(item.candles_count);
  }

  return item;
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
    const normalized = (data || []).map(normalizeFetchedRecord);
    return { data: normalized, error };
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
 * Checks for non-empty records, sanitizes text fields, and converts empty text to null.
 */
export async function safeInsert(
  records: any | any[],
  tableName: string = 'deceased'
): Promise<{ data: any; error: any }> {
  if (!isSupabaseConfigured() || !records) {
    const err = new Error('Supabase is not configured or no records provided');
    console.error('[safeInsert Error]', err);
    return { data: [], error: err.message };
  }
  const arr = Array.isArray(records) ? records : [records];
  if (arr.length === 0) return { data: [], error: null };

  const sanitized = arr.map(item => {
    const copy = sanitizeRecordForSupabase(item);
    if ('id' in copy && (copy.id === undefined || copy.id === null || Number(copy.id) <= 0)) {
      delete copy.id;
    }
    return copy;
  });

  try {
    const { data, error } = await (supabase.from(tableName as any) as any)
      .insert(sanitized)
      .select();

    if (error) {
      console.error('[Supabase safeInsert Error]', error);
      logSupabaseError('safeInsert', error);
      const errMsg = error.message || error.details || error.hint || 'שגיאה בהוספת נתונים ל-Supabase';
      return { data: null, error: errMsg };
    }
    return { data: data || [], error: null };
  } catch (err: any) {
    console.error('[Supabase safeInsert Exception]', err);
    logSupabaseException('safeInsert', err);
    return { data: null, error: err?.message || 'שגיאה בהוספת נתונים ל-Supabase' };
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
    const err = new Error('Supabase is not configured or query value is invalid');
    console.error('[safeUpdate Error]', err);
    return { data: null, error: err.message };
  }
  const cleanValue = typeof value === 'string' ? value.trim() : value;
  if (typeof cleanValue === 'string' && cleanValue.length === 0) {
    const err = new Error('Update target value cannot be empty');
    console.error('[safeUpdate Error]', err);
    return { data: null, error: err.message };
  }

  const sanitized = sanitizeRecordForSupabase(updateData);

  try {
    const { data, error } = await (supabase.from(tableName as any) as any)
      .update(sanitized)
      .eq(column, cleanValue)
      .select();

    if (error) {
      console.error('[Supabase safeUpdate Error]', error);
      logSupabaseError('safeUpdate', error);
      const errMsg = error.message || error.details || error.hint || 'שגיאה בעדכון נתונים ב-Supabase';
      return { data: null, error: errMsg };
    }
    return { data, error: null };
  } catch (err: any) {
    console.error('[Supabase safeUpdate Exception]', err);
    logSupabaseException('safeUpdate', err);
    return { data: null, error: err?.message || 'שגיאה בעדכון נתונים ב-Supabase' };
  }
}

/**
 * Safe upsert wrapper for Supabase.
 * Checks for non-empty records, sanitizes text fields, and converts empty text to null.
 */
export async function safeUpsert(
  records: any | any[],
  tableName: string = 'deceased'
): Promise<{ data: any; error: any }> {
  if (!isSupabaseConfigured() || !records) {
    const err = new Error('Supabase is not configured or no records provided');
    console.error('[safeUpsert Error]', err);
    return { data: [], error: err.message };
  }
  const arr = Array.isArray(records) ? records : [records];
  if (arr.length === 0) return { data: [], error: null };

  const sanitized = arr.map(item => sanitizeRecordForSupabase(item));

  try {
    let { data, error } = await (supabase.from(tableName as any) as any)
      .upsert(sanitized, { onConflict: 'id' })
      .select();

    if (error) {
      console.error('[Supabase safeUpsert Error]', error);
      logSupabaseError('safeUpsert', error);

      const fallbackRes = await (supabase.from(tableName as any) as any)
        .upsert(sanitized)
        .select();

      if (!fallbackRes.error) {
        error = null;
        data = fallbackRes.data;
      } else {
        console.error('[Supabase safeUpsert Fallback Error]', fallbackRes.error);
        error = fallbackRes.error;
      }
    }

    // Also sync to alternate table name ('memorials' or 'deceased') so any schema works
    const altTable = tableName === 'deceased' ? 'memorials' : 'deceased';
    try {
      await (supabase.from(altTable as any) as any)
        .upsert(sanitized, { onConflict: 'id' })
        .catch(() => {});
    } catch (e) {}

    if (error) {
      const errMsg = typeof error === 'string' ? error : (error.message || error.details || error.hint || 'שגיאה בשמירת הנתונים ב-Supabase');
      return { data: null, error: errMsg };
    }

    return { data: data || [], error: null };
  } catch (err: any) {
    console.error('[Supabase safeUpsert Exception]', err);
    logSupabaseException('safeUpsert', err);
    return { data: null, error: err?.message || 'שגיאה בשמירת הנתונים ב-Supabase' };
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
 * STRICTLY PROTECTED: Bulk deletion / reset all is disabled by default to prevent table loss.
 */
export async function safeDeleteAll(
  tableName: string = 'deceased',
  safetyGateConfirmed: boolean = false
): Promise<{ data: any; error: any }> {
  if (!isSupabaseConfigured()) return { data: [], error: null };
  if (!safetyGateConfirmed) {
    const msg = `[SAFETY GATE BLOCKED] Bulk deletion / reset all on table "${tableName}" is disabled by default to protect database records.`;
    console.warn(msg);
    return { data: null, error: { message: msg, code: 'SAFETY_GATE_BLOCKED' } };
  }
  try {
    const { data, error } = await (supabase.from(tableName as any) as any)
      .delete()
      .neq('id', 0);

    if (tableName === 'deceased') {
      await (supabase.from('memorials' as any) as any)
        .delete()
        .neq('id', 0)
        .catch(() => {});
    }

    if (error) logSupabaseError('safeDeleteAll', error);
    return { data, error };
  } catch (err) {
    logSupabaseException('safeDeleteAll', err);
    return { data: null, error: err };
  }
}

export const SUPABASE_SETUP_SQL = `
CREATE TABLE IF NOT EXISTS public.deceased (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  gender TEXT NOT NULL DEFAULT 'male',
  "fatherName" TEXT,
  "motherName" TEXT,
  day INT NOT NULL DEFAULT 1,
  month TEXT NOT NULL DEFAULT 'תשרי',
  "hebrewDate" TEXT,
  "passDate" TEXT,
  "birthDate" TEXT,
  bio TEXT,
  notes TEXT,
  image TEXT,
  "imageUrl" TEXT,
  "photoUrl" TEXT,
  "imagePosition" TEXT,
  "contactPhone" TEXT,
  "candlesCount" INT DEFAULT 0,
  "likesCount" INT DEFAULT 0,
  "ageAtDeath" INT,
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

-- Storage bucket setup for memorial images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('memorial-images', 'memorial-images', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('photos', 'photos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Access Memorial Images" ON storage.objects;
CREATE POLICY "Public Access Memorial Images" ON storage.objects FOR ALL USING (bucket_id IN ('memorial-images', 'photos'));

-- Also support 'memorials' table name alias
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

  return { data: null, error: lastError || new Error('Record not found in Supabase') };
}

