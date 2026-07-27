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
