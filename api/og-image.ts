import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://aoendfkvzsywrykmcloy.supabase.co";
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "sb_publishable_szEDKkwDPDeNFcO96jwr1A_GWBAF2Nj";

const BASE_URL = "https://le-zecher-olamim-demo24726.vercel.app";

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

async function optimizeImageBuffer(inputBuffer: Buffer): Promise<Buffer> {
  return await sharp(inputBuffer)
    .resize({
      width: 1200,
      height: 1200,
      fit: 'inside', // Preserves exact aspect ratio without cropping or distortion
      withoutEnlargement: true
    })
    .jpeg({
      quality: 80,
      progressive: true,
      mozjpeg: true
    })
    .toBuffer();
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

    let inputBuffer: Buffer | null = null;

    if (trimmedImg.startsWith('http://') || trimmedImg.startsWith('https://') || trimmedImg.startsWith('/')) {
      const targetUrl = trimmedImg.startsWith('/') ? `${baseUrl}${trimmedImg}` : trimmedImg;
      const response = await fetch(targetUrl);
      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        inputBuffer = Buffer.from(arrayBuffer);
      }
    } else {
      // Handle Data URI or raw Base64
      let base64Data = trimmedImg;
      if (trimmedImg.startsWith('data:')) {
        const parts = trimmedImg.split(',');
        if (parts.length > 1) {
          base64Data = parts[1];
        }
      }
      base64Data = base64Data.replace(/\s/g, '');
      const buf = Buffer.from(base64Data, 'base64');
      if (buf && buf.length > 0) {
        inputBuffer = buf;
      }
    }

    if (!inputBuffer || inputBuffer.length === 0) {
      return res.redirect(302, defaultImageUrl);
    }

    // Process and optimize image with sharp (maintaining aspect ratio and outputting optimized JPEG)
    let optimizedJpeg: Buffer;
    try {
      if (cleanId === '1785101989240') {
        // Controlled experiment for Shushan (ID 1785101989240): Fit inside a 3:4 aspect ratio canvas (900x1200) without cropping
        optimizedJpeg = await sharp(inputBuffer)
          .resize({
            width: 900,
            height: 1200,
            fit: 'contain',
            background: { r: 7, g: 11, b: 18, alpha: 1 } // #070b12 background
          })
          .jpeg({
            quality: 80,
            progressive: true,
            mozjpeg: true
          })
          .toBuffer();
      } else {
        optimizedJpeg = await optimizeImageBuffer(inputBuffer);
      }
    } catch (sharpError) {
      console.error('[og-image sharp optimization error]', sharpError);
      optimizedJpeg = inputBuffer;
    }

    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=300');
    res.setHeader('Content-Length', optimizedJpeg.length.toString());
    return res.status(200).send(optimizedJpeg);

  } catch (e) {
    console.error('[api/og-image handler error]', e);
    return res.redirect(302, defaultImageUrl);
  }
}

