import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://aoendfkvzsywrykmcloy.supabase.co";
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "sb_publishable_szEDKkwDPDeNFcO96jwr1A_GWBAF2Nj";

const FALLBACK_IMAGE = "https://aoendfkvzsywrykmcloy.supabase.co/storage/v1/object/public/memorial-images/WhatsApp%20Image%202026-07-30%20at%2018.31.10.jpeg";

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
  let rawId = req.query?.id;
  if (Array.isArray(rawId)) {
    rawId = rawId[0];
  }

  const cleanId = rawId ? String(rawId).trim() : '';
  const redirectUrl = cleanId ? `/?m=${encodeURIComponent(cleanId)}` : '/';

  let title = "לזכר עולמים - ספר זיכרון דיגיטלי ומעקב יארצייט";
  let description = "לוח הנצחה עולמי, הדלקת נר נשמה, תהילים ומשניות לעילוי נשמת יקירינו";
  let imageUrl = FALLBACK_IMAGE;

  if (cleanId) {
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      
      // Query payload column from deceased table as required
      const { data, error } = await supabase
        .from('deceased')
        .select('payload')
        .eq('id', cleanId)
        .single();

      let p: any = null;
      if (!error && data?.payload) {
        p = typeof data.payload === 'string' ? JSON.parse(data.payload) : data.payload;
      }

      // Fallback query if payload column query didn't return payload object
      if (!p) {
        const { data: fullRow } = await supabase
          .from('deceased')
          .select('*')
          .eq('id', cleanId)
          .single();
        if (fullRow) {
          p = fullRow.payload 
            ? (typeof fullRow.payload === 'string' ? JSON.parse(fullRow.payload) : fullRow.payload)
            : fullRow;
        }
      }

      if (p) {
        const name = p.name || p.fullName || '';
        const fatherName = p.fatherName || '';
        const motherName = p.motherName || '';
        const hebrewDate = p.hebrewDate || '';

        if (name) {
          title = `לזכר עולמים — ${name}`;
          let descParts = [];
          if (fatherName) descParts.push(`בן/בת ${fatherName}`);
          if (motherName) descParts.push(`ורחל/חנה ${motherName}`);
          if (hebrewDate) descParts.push(`תאריך פטירה עברי: ${hebrewDate}`);
          
          description = descParts.length > 0 
            ? `דף זיכרון והנצחה לזכר ${name}. ${descParts.join(' • ')}`
            : `דף זיכרון והנצחה לעילוי נשמת ${name}.`;
        }

        const candidateImage = p.photoUrl || p.imageUrl || p.image || p.photo;
        if (candidateImage && typeof candidateImage === 'string' && candidateImage.startsWith('http')) {
          imageUrl = candidateImage;
        }
      }
    } catch (e) {
      console.error('[api/share handler error]', e);
    }
  }

  const safeTitle = escapeHtml(title);
  const safeDesc = escapeHtml(description);
  const safeImg = escapeHtml(imageUrl);
  const safeCanonical = escapeHtml(`https://eternal-memory.vercel.app/share/${cleanId || ''}`);
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
<body style="background:#070b12;color:#f0f4f8;font-family:sans-serif;display:flex;align-items:center;justify-center;height:100vh;margin:0;text-align:center;">
  <div>
    <p>מעביר לעמוד הזיכרון...</p>
    <a href="${safeRedirect}" style="color:#c8a96e;">לחץ כאן אם אינך מועבר אוטומטית</a>
  </div>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  return res.status(200).send(html);
}
