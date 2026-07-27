import { createClient } from '@supabase/supabase-js';

const metaEnv = (import.meta as unknown as { env?: Record<string, string> }).env || {};
const supabaseUrl = metaEnv.VITE_SUPABASE_URL || 'https://aoendfkvzsywrykmcloy.supabase.co';
const supabaseAnonKey = metaEnv.VITE_SUPABASE_ANON_KEY || 'sb_publishable_szEDKkwDPDeNFc096jwr1A_GWBAF2Nj';

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

export const SUPABASE_SETUP_SQL = `
CREATE TABLE IF NOT EXISTS public.deceased (
  id BIGINT PRIMARY KEY,
  name TEXT NOT NULL,
  gender TEXT NOT NULL,
  fatherName TEXT,
  motherName TEXT,
  passDate TEXT,
  hebrewDate TEXT,
  bio TEXT,
  imageUrl TEXT,
  candlesCount INT DEFAULT 0
);
`;
