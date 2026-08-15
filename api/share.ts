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

export default async function handler(req: any, res: any) {
  let rawId = req.query?.id || req.query?.m;
  if (Array.isArray(rawId)) {
    rawId = rawId[0];
  }

  let rawLang = req.query?.lang;
  if (Array.isArray(rawLang)) {
    rawLang = rawLang[0];
  }
  const langStr = String(rawLang || '').toLowerCase().trim();
  const reqLang: 'he' | 'en' | 'ru' = (['he', 'en', 'ru'].includes(langStr) ? langStr : 'he') as any;

  const cleanId = rawId ? String(rawId).trim() : '';
  const redirectUrl = cleanId 
    ? `/?m=${encodeURIComponent(cleanId)}&lang=${reqLang}` 
    : `/?lang=${reqLang}`;

  let title = "לזכר עולמים - ספר זיכרון דיגיטלי ומעקב יארצייט";
  let description = "לוח הנצחה עולמי, הדלקת נר נשמה, תהילים ומשניות לעילוי נשמת יקירינו";

  if (reqLang === 'ru') {
    title = "Ле-Зехер Оламим - Книга Памяти";
    description = "Всемирный мемориал, зажигание свечей памяти, псалмы в честь наших близких";
  } else if (reqLang === 'en') {
    title = "L'Zecher Olamim - Digital Memorial Book";
    description = "Global memorial board, lighting virtual candles, Psalms and Mishnah in memory of loved ones";
  }

  let imageUrl = DEFAULT_IMAGE;
  const canonicalUrl = cleanId ? `${BASE_URL}/share/${cleanId}?lang=${reqLang}` : `${BASE_URL}/?lang=${reqLang}`;

  if (cleanId) {
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

      // Query deceased table directly by string id
      const { data, error } = await supabase
        .from('deceased')
        .select('*')
        .eq('id', cleanId)
        .maybeSingle();

      if (!error && data) {
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
            description = 'מזמינים אתכם לבקר בדף הזיכרון, להדליק נר נשמה ולהשתתף בהנצחה.';
          }
        }

        // Determine image strictly by priority: photoUrl -> imageUrl -> image_url -> image -> default og-banner.png
        const rawCandidate = [
          data.photoUrl,
          data.imageUrl,
          data.image_url,
          data.image
        ].find(img => img && typeof img === 'string' && img.trim() !== '' && img.trim() !== '-');

        if (rawCandidate) {
          const trimmedImg = rawCandidate.trim();
          if (trimmedImg.startsWith('http://') || trimmedImg.startsWith('https://')) {
            imageUrl = trimmedImg;
          } else if (trimmedImg.startsWith('/')) {
            imageUrl = `${BASE_URL}${trimmedImg}`;
          } else if (trimmedImg.startsWith('data:') || trimmedImg.length > 100) {
            imageUrl = `${BASE_URL}/api/og-image?id=${cleanId}`;
          }
        }
      }
    } catch (e) {
      console.error('[api/share handler error]', e);
    }
  }

  const safeTitle = escapeHtml(title);
  const safeDesc = escapeHtml(description);
  const safeImg = escapeHtml(imageUrl);
  const safeCanonical = escapeHtml(canonicalUrl);
  const safeRedirect = escapeHtml(redirectUrl);

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
  <meta property="og:site_name" content="לזכר עולמים" />

  <!-- Twitter -->
  <meta property="twitter:card" content="summary_large_image" />
  <meta property="twitter:url" content="${safeCanonical}" />
  <meta property="twitter:title" content="${safeTitle}" />
  <meta property="twitter:description" content="${safeDesc}" />
  <meta property="twitter:image" content="${safeImg}" />

  <!-- Client Redirect for human visitors -->
  <meta http-equiv="refresh" content="0;url=${safeRedirect}" />
  <script>
    window.location.href = ${JSON.stringify(redirectUrl)};
  </script>
</head>
<body style="background:#070b12;color:#f0f4f8;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center;">
  <div>
    <p>${reqLang === 'ru' ? 'Переход на страницу памяти...' : reqLang === 'en' ? 'Redirecting to memorial page...' : 'מעביר לעמוד הזיכרון...'}</p>
    <a href="${safeRedirect}" style="color:#c8a96e;">${reqLang === 'ru' ? 'Нажмите здесь, если переход не произошел автоматически' : reqLang === 'en' ? 'Click here if you are not redirected automatically' : 'לחץ כאן אם אינך מועבר אוטומטית'}</a>
  </div>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=60');
  return res.status(200).send(html);
}
