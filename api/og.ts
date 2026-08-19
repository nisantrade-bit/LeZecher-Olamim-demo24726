import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://aoendfkvzsywrykmcloy.supabase.co";
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "sb_publishable_szEDKkwDPDeNFcO96jwr1A_GWBAF2Nj";

const BASE_URL = "https://le-zecher-olamim-demo24726.vercel.app";
const DEFAULT_IMAGE = `${BASE_URL}/og-banner.png`;

function escapeHtml(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

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
  const defaultImage = `${baseUrl}/og-banner.png`;

  let rawM = req.query?.m || req.query?.id;
  if (Array.isArray(rawM)) {
    rawM = rawM[0];
  }

  let rawLang = req.query?.lang;
  if (Array.isArray(rawLang)) {
    rawLang = rawLang[0];
  }
  const langStr = String(rawLang || '').toLowerCase().trim();
  const reqLang: 'he' | 'en' | 'ru' = (['he', 'en', 'ru'].includes(langStr) ? langStr : 'he') as any;

  const m = rawM ? String(rawM).trim() : '';

  let title = "לזכר עולמים - ספר זיכרון דיגיטלי ומעקב יארצייט";
  let description = "לוח הנצחה עולמי, הדלקת נר נשמה, תהילים ומשניות לעילוי נשמת יקירינו";

  if (reqLang === 'ru') {
    title = "Ле-Зехер Оламим - Книга Памяти";
    description = "Всемирный мемориал, зажигание свечей памяти, псалмы в честь наших близких";
  } else if (reqLang === 'en') {
    title = "L'Zecher Olamim - Digital Memorial Book";
    description = "Global memorial board, lighting virtual candles, Psalms and Mishnah in memory of loved ones";
  }

  let imageUrl = defaultImage;
  const canonicalUrl = m ? `${baseUrl}/?m=${encodeURIComponent(m)}&lang=${reqLang}` : `${baseUrl}/?lang=${reqLang}`;

  if (m) {
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const data = await findDeceasedRecord(supabase, m);

      if (data) {
        let name = '';
        if (reqLang === 'ru') {
          name = data.nameRu || data.name || data.nameHe || '';
        } else if (reqLang === 'en') {
          name = data.nameEn || data.name || data.nameHe || '';
        } else {
          name = data.nameHe || data.name || '';
        }

        if (name) {
          if (reqLang === 'ru') {
            title = `🕯️ Ле-Зехер Оламим – ${name}`;
            description = 'Приглашаем вас посетить страницу памяти, зажечь свечу и оставить добрые слова.';
          } else if (reqLang === 'en') {
            title = `🕯️ L'Zecher Olamim – ${name}`;
            description = 'You are invited to visit the memorial page, light a virtual candle and participate in remembrance.';
          } else {
            const isFemale = data.gender === 'female';
            const isMale = data.gender === 'male';
            const blessing = isFemale ? 'זכרונה לברכה' : isMale ? 'זכרונו לברכה' : 'זכרונו/ה לברכה';

            title = `🕯️ לזכר עולמים – ${name} ${blessing}`;
            description = 'מזמינים אתכם לבקר בדף הזיכרון, להדליק נר נשמה, לקרוא משניות, תהלים והלכות לעילוי נשמה ולהשתתף בהנצחה.';
          }
        }

        // Determine image strictly by priority: image -> imageUrl -> image_url -> photoUrl -> photo
        const rawCandidate = [
          data.image,
          data.imageUrl,
          data.image_url,
          data.photoUrl,
          data.photo
        ].find(img => img && typeof img === 'string' && img.trim() !== '' && img.trim() !== '-');

        if (rawCandidate) {
          const trimmedImg = rawCandidate.trim();
          if (trimmedImg.startsWith('http://') || trimmedImg.startsWith('https://') || trimmedImg.startsWith('/') || trimmedImg.startsWith('data:') || trimmedImg.length > 100) {
            imageUrl = `${baseUrl}/api/og-image?id=${encodeURIComponent(m)}`;
          }
        }
      }
    } catch (e) {
      console.error('[api/og handler error]', e);
    }
  }

  const safeTitle = escapeHtml(title);
  const safeDesc = escapeHtml(description);
  const safeImg = escapeHtml(imageUrl);
  const safeCanonical = escapeHtml(canonicalUrl);

  const html = `<!DOCTYPE html>
<html lang="${reqLang}" dir="${reqLang === 'he' ? 'rtl' : 'ltr'}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle}</title>

  <!-- Primary Meta Tags -->
  <meta name="title" content="${safeTitle}" />
  <meta name="description" content="${safeDesc}" />

  <!-- Open Graph / Facebook / WhatsApp -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${safeCanonical}" />
  <meta property="og:title" content="${safeTitle}" />
  <meta property="og:description" content="${safeDesc}" />
  <meta property="og:image" content="${safeImg}" />
  <meta property="og:image:secure_url" content="${safeImg}" />
  <meta property="og:image:type" content="image/jpeg" />
  <meta property="og:site_name" content="לזכר עולמים" />

  <!-- Twitter -->
  <meta property="twitter:card" content="summary_large_image" />
  <meta property="twitter:url" content="${safeCanonical}" />
  <meta property="twitter:title" content="${safeTitle}" />
  <meta property="twitter:description" content="${safeDesc}" />
  <meta property="twitter:image" content="${safeImg}" />
</head>
<body style="background:#070b12;color:#f0f4f8;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center;">
  <div>
    <p>עמוד זיכרון - ${safeTitle}</p>
  </div>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=60');
  return res.status(200).send(html);
}
