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

  const cleanId = rawId ? String(rawId).trim() : '';
  const redirectUrl = cleanId ? `/?m=${encodeURIComponent(cleanId)}` : '/';

  let title = "לזכר עולמים - ספר זיכרון דיגיטלי ומעקב יארצייט";
  let description = "לוח הנצחה עולמי, הדלקת נר נשמה, תהילים ומשניות לעילוי נשמת יקירינו";
  let imageUrl = DEFAULT_IMAGE;
  const canonicalUrl = cleanId ? `${BASE_URL}/share/${cleanId}` : `${BASE_URL}/`;

  if (cleanId) {
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

      // Query deceased table directly by string id
      const { data, error } = await supabase
        .from('deceased')
        .select('id, name, photoUrl, photo, payload')
        .eq('id', cleanId)
        .maybeSingle();

      if (!error && data) {
        const p = data.payload 
          ? (typeof data.payload === 'string' ? JSON.parse(data.payload) : data.payload)
          : data;

        const name = data.name || p?.name || p?.fullName || p?.nameHe || '';
        if (name) {
          title = `לזכר עולמים — ${name}`;
          
          let descParts: string[] = [];
          const fatherName = p?.fatherName || p?.father_name || p?.fatherNameHe || '';
          const motherName = p?.motherName || p?.mother_name || p?.motherNameHe || '';
          const hebrewDate = p?.hebrewDate || p?.hebrew_date || (p?.day && p?.month ? `${p.day} ב${p.month}` : '');

          if (fatherName) descParts.push(`בן/בת ${fatherName}`);
          if (motherName) descParts.push(`ורחל/חנה ${motherName}`);
          if (hebrewDate) descParts.push(`תאריך פטירה עברי: ${hebrewDate}`);

          description = descParts.length > 0 
            ? `דף זיכרון והנצחה לזכר ${name}. ${descParts.join(' • ')}`
            : `דף זיכרון והנצחה לעילוי נשמת ${name}.`;
        }

        // Determine image strictly by priority: photoUrl -> photo -> payload candidate -> default og-banner.png
        const candidateImage = data.photoUrl || p?.photoUrl || p?.imageUrl || p?.image || data.photo || p?.photo;
        if (candidateImage && typeof candidateImage === 'string' && candidateImage.trim() !== '') {
          const trimmedImg = candidateImage.trim();
          if (trimmedImg.startsWith('http://') || trimmedImg.startsWith('https://')) {
            imageUrl = trimmedImg;
          } else if (trimmedImg.startsWith('/')) {
            imageUrl = `${BASE_URL}${trimmedImg}`;
          } else {
            imageUrl = `${BASE_URL}/${trimmedImg}`;
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
<html lang="he" dir="rtl">
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
    <p>מעביר לעמוד הזיכרון...</p>
    <a href="${safeRedirect}" style="color:#c8a96e;">לחץ כאן אם אינך מועבר אוטומטית</a>
  </div>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=60');
  return res.status(200).send(html);
}
