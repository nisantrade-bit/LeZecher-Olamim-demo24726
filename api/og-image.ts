import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://aoendfkvzsywrykmcloy.supabase.co";
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "sb_publishable_szEDKkwDPDeNFcO96jwr1A_GWBAF2Nj";

const BASE_URL = "https://le-zecher-olamim-demo24726.vercel.app";
const DEFAULT_IMAGE_URL = `${BASE_URL}/og-banner.png`;

async function findDeceasedRecord(supabase: any, rawId: string): Promise<any | null> {
  if (!rawId) return null;
  const cleanId = rawId.trim();
  if (!cleanId) return null;

  const numId = Number(cleanId);
  const isNumeric = !isNaN(numId) && String(numId) === cleanId;

  const tables = ['deceased', 'memorials'];

  for (const table of tables) {
    try {
      if (isNumeric) {
        const { data } = await supabase.from(table).select('*').eq('id', numId).maybeSingle();
        if (data && data.id) return data;
      }
      const { data } = await supabase.from(table).select('*').eq('id', cleanId).maybeSingle();
      if (data && data.id) return data;
    } catch (e) {
      console.error(`[findDeceasedRecord error on ${table}]`, e);
    }
  }

  return null;
}

function getBaseUrl(req: any): string {
  const host = req?.headers?.host || req?.headers?.['x-forwarded-host'] || 'le-zecher-olamim-demo24726.vercel.app';
  const proto = req?.headers?.['x-forwarded-proto'] || 'https';
  return `${proto}://${host}`;
}

export default async function handler(req: any, res: any) {
  const baseUrl = getBaseUrl(req);
  const defaultImageUrl = `${baseUrl}/og-banner.png`;

  let rawId = req.query?.id || req.query?.m;
  if (Array.isArray(rawId)) {
    rawId = rawId[0];
  }

  const cleanId = rawId ? String(rawId).trim() : '';

  if (!cleanId) {
    return res.redirect(302, defaultImageUrl);
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const data = await findDeceasedRecord(supabase, cleanId);

    if (!data) {
      return res.redirect(302, defaultImageUrl);
    }

    const rawCandidate = [
      data.image,
      data.imageUrl,
      data.image_url,
      data.photoUrl,
      data.photo
    ].find(img => img && typeof img === 'string' && img.trim() !== '' && img.trim() !== '-');

    if (!rawCandidate) {
      return res.redirect(302, defaultImageUrl);
    }

    const trimmedImg = rawCandidate.trim();

    if (trimmedImg.startsWith('http://') || trimmedImg.startsWith('https://')) {
      return res.redirect(302, trimmedImg);
    }

    if (trimmedImg.startsWith('/')) {
      return res.redirect(302, `${baseUrl}${trimmedImg}`);
    }

    // Handle Data URI or raw Base64
    let mimeType = 'image/jpeg';
    let base64Data = trimmedImg;

    if (trimmedImg.startsWith('data:')) {
      const matches = trimmedImg.match(/^data:([^;]+);base64,(.*)$/s);
      if (matches) {
        mimeType = matches[1] || 'image/jpeg';
        base64Data = matches[2];
      } else {
        const parts = trimmedImg.split(',');
        if (parts.length > 1) {
          const header = parts[0];
          base64Data = parts[1];
          const mimeMatch = header.match(/data:([^;]+)/);
          if (mimeMatch) mimeType = mimeMatch[1];
        }
      }
    }

    base64Data = base64Data.replace(/\s/g, '');

    const buffer = Buffer.from(base64Data, 'base64');

    if (!buffer || buffer.length === 0) {
      return res.redirect(302, defaultImageUrl);
    }

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=86400');
    res.setHeader('Content-Length', buffer.length.toString());
    return res.status(200).send(buffer);

  } catch (e) {
    console.error('[api/og-image handler error]', e);
    return res.redirect(302, defaultImageUrl);
  }
}
