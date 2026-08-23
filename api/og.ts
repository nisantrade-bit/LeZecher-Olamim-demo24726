import { createClient } from '@supabase/supabase-js';
import { enrichDeceasedTranslations, getLocalizedName, getLocalizedFatherName, getLocalizedMotherName } from '../src/utils/transliteration';
import { formatParentRelation } from '../src/utils/translations';

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

function normalizeAndEnrichRecord(rawData: any): any {
  if (!rawData) return null;
  const data: any = { ...rawData };

  const snakeToCamelMap: Record<string, string> = {
    father_name: 'fatherName',
    mother_name: 'motherName',
    contact_phone: 'contactPhone',
    image_url: 'imageUrl',
    photo_url: 'photoUrl',
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
    if (snakeKey in data) {
      if (data[camelKey] === undefined || data[camelKey] === null || data[camelKey] === '') {
        data[camelKey] = data[snakeKey];
      }
    }
  }

  if (data.manualFields) {
    if (typeof data.manualFields === 'string') {
      const str = data.manualFields.trim();
      if (str.startsWith('[') && str.endsWith(']')) {
        try {
          const parsed = JSON.parse(str);
          if (Array.isArray(parsed)) {
            data.manualFields = parsed.map((s: any) => String(s).trim()).filter(Boolean);
          }
        } catch (e) {
          data.manualFields = str.split(/[,;\s]+/).map((s: any) => String(s).trim()).filter(Boolean);
        }
      } else {
        data.manualFields = str.split(/[,;\s]+/).map((s: any) => String(s).trim()).filter(Boolean);
      }
    }
  }

  if (data.gender !== 'female' && data.gender !== 'male') {
    data.gender = 'male';
  }

  return enrichDeceasedTranslations(data);
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
      const rawData = await findDeceasedRecord(supabase, m);

      if (rawData) {
        const enriched = normalizeAndEnrichRecord(rawData);
        const localizedName = getLocalizedName(enriched, reqLang) || enriched.name || '';
        const localizedFather = getLocalizedFatherName(enriched, reqLang);
        const localizedMother = getLocalizedMotherName(enriched, reqLang);
        const parentRel = formatParentRelation(enriched.gender, localizedFather, localizedMother, reqLang, enriched);

        let nameWithParent = localizedName;
        if (parentRel) {
          if (reqLang === 'he') {
            nameWithParent = `${localizedName} ${parentRel}`;
          } else {
            nameWithParent = `${localizedName} (${parentRel})`;
          }
        }

        const isFemale = enriched.gender === 'female';
        const isMale = enriched.gender === 'male';

        if (reqLang === 'ru') {
          const blessingSuffix = isFemale ? 'Да будет благословенна её память.' : isMale ? 'Да будет благословенна его память.' : 'Да будет благословенна его/её память.';
          title = `🕯️ Светлая память – ${nameWithParent}`;
          description = `Приглашаем вас посетить страницу памяти, зажечь поминальную свечу, прочитать Мишнайот, Тегилим и законы во имя возвышения души и принять участие в увековечивании памяти. ${blessingSuffix}`;
        } else if (reqLang === 'en') {
          const blessingSuffix = isFemale ? 'May her memory be a blessing.' : isMale ? 'May his memory be a blessing.' : 'May their memory be a blessing.';
          title = `🕯️ In loving memory – ${nameWithParent}`;
          description = `We invite you to visit the memorial page, light a memorial candle, read Mishnayot, Psalms and Jewish laws for the elevation of the soul, and take part in preserving their memory. ${blessingSuffix}`;
        } else {
          const blessingSuffix = isFemale ? 'זכרונה לברכה' : isMale ? 'זכרונו לברכה' : 'זכרונו/ה לברכה';
          title = `🕯️ לזכר עולמים – ${nameWithParent}`;
          description = `מזמינים אתכם לבקר בדף הזיכרון, להדליק נר נשמה, לקרוא משניות, תהלים והלכות לעילוי נשמה ולהשתתף בהנצחה. ${blessingSuffix}`;
        }

        // Determine image strictly by priority: image -> imageUrl -> image_url -> photoUrl -> photo
        const rawCandidate = [
          enriched.image,
          enriched.imageUrl,
          enriched.image_url,
          enriched.photoUrl,
          enriched.photo
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
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=0, must-revalidate');
  return res.status(200).send(html);
}

