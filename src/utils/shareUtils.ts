/**
 * Utility functions for generating short memorial URLs and sharing via WhatsApp / Clipboard.
 */

import { Deceased, Language } from '../types';
import { formatParentRelation } from './translations';
import { getLocalizedName } from './transliteration';
import { ShabbatYahrzeitInfo } from './torahPortionHelper';

export const PUBLIC_PRODUCTION_URL = 'https://peaceful-tarsier-9f8a3d.netlify.app';

/**
 * Encodes a Deceased object into a URL-safe Base64URL string.
 * Base64URL uses ONLY alphanumeric characters, hyphens and underscores (a-z, A-Z, 0-9, -, _).
 * It contains NO '%', NO '{', NO '"', NO spaces or special symbols, guaranteeing that WhatsApp,
 * Telegram, SMS, and email clients format it as a 100% clickable hyperlink without truncation!
 */
export function encodeDeceasedToUrlPayload(deceased: Deceased): string {
  try {
    const compactObj: any = {
      i: deceased.id,
      n: deceased.name,
      g: deceased.gender,
      fn: deceased.fatherName || '',
      mn: deceased.motherName || '',
      d: deceased.day,
      m: deceased.month,
      p: deceased.contactPhone || '',
      nt: deceased.notes || '',
      a: deceased.ageAtDeath,
      bd: deceased.birthDate || '',

      // Multi-language pre-translated fields
      nHe: deceased.nameHe || undefined,
      nEn: deceased.nameEn || undefined,
      nRu: deceased.nameRu || undefined,
      fnHe: deceased.fatherNameHe || undefined,
      fnEn: deceased.fatherNameEn || undefined,
      fnRu: deceased.fatherNameRu || undefined,
      mnHe: deceased.motherNameHe || undefined,
      mnEn: deceased.motherNameEn || undefined,
      mnRu: deceased.motherNameRu || undefined,
      ntHe: deceased.notesHe || undefined,
      ntEn: deceased.notesEn || undefined,
      ntRu: deceased.notesRu || undefined
    };
    if (deceased.image) {
      if (deceased.image.length < 4000 || deceased.image.startsWith('http://') || deceased.image.startsWith('https://')) {
        compactObj.img = deceased.image;
      }
    }
    const jsonStr = JSON.stringify(compactObj);
    let b64 = '';
    try {
      const bytes = new TextEncoder().encode(jsonStr);
      let binString = '';
      for (let i = 0; i < bytes.length; i++) {
        binString += String.fromCharCode(bytes[i]);
      }
      b64 = btoa(binString);
    } catch (err) {
      b64 = btoa(unescape(encodeURIComponent(jsonStr)));
    }
    return encodeURIComponent(b64);
  } catch (e) {
    console.error("Error encoding deceased payload:", e);
    return '';
  }
}

/**
 * Decodes a URL parameter string back into a Deceased object.
 * Supports Base64 (with unescape/encodeURIComponent), Base64URL, raw JSON, and legacy formats.
 */
export function decodeDeceasedFromUrlPayload(encodedStr: string): Deceased | null {
  if (!encodedStr) return null;

  let cleanedStr = encodedStr.trim();
  try {
    while (cleanedStr.includes('%')) {
      const decoded = decodeURIComponent(cleanedStr);
      if (decoded === cleanedStr) break;
      cleanedStr = decoded;
    }
  } catch (e) {}

  const parseDeceasedObject = (parsed: any): Deceased | null => {
    if (parsed && (parsed.i || parsed.id) && (parsed.n || parsed.name)) {
      return {
        id: Number(parsed.id !== undefined ? parsed.id : parsed.i),
        name: String(parsed.name || parsed.n || ''),
        gender: (parsed.gender || parsed.g) === 'female' ? 'female' : 'male',
        fatherName: String(parsed.fatherName !== undefined ? parsed.fatherName : (parsed.fn || '')),
        motherName: String(parsed.motherName !== undefined ? parsed.motherName : (parsed.mn || '')),
        day: Number(parsed.day !== undefined ? parsed.day : parsed.d),
        month: String(parsed.month || parsed.m || ''),
        contactPhone: String(parsed.contactPhone !== undefined ? parsed.contactPhone : (parsed.p || '')),
        notes: String(parsed.notes !== undefined ? parsed.notes : (parsed.nt || '')),
        ageAtDeath: parsed.ageAtDeath !== undefined ? Number(parsed.ageAtDeath) : (parsed.a !== undefined ? Number(parsed.a) : undefined),
        birthDate: parsed.birthDate ? String(parsed.birthDate) : (parsed.bd ? String(parsed.bd) : undefined),
        image: parsed.image ? String(parsed.image) : (parsed.img ? String(parsed.img) : undefined),

        // Multi-language pre-translated fields
        nameHe: parsed.nameHe || parsed.nHe || undefined,
        nameEn: parsed.nameEn || parsed.nEn || undefined,
        nameRu: parsed.nameRu || parsed.nRu || undefined,
        fatherNameHe: parsed.fatherNameHe || parsed.fnHe || undefined,
        fatherNameEn: parsed.fatherNameEn || parsed.fnEn || undefined,
        fatherNameRu: parsed.fatherNameRu || parsed.fnRu || undefined,
        motherNameHe: parsed.motherNameHe || parsed.mnHe || undefined,
        motherNameEn: parsed.motherNameEn || parsed.mnEn || undefined,
        motherNameRu: parsed.motherNameRu || parsed.mnRu || undefined,
        notesHe: parsed.notesHe || parsed.ntHe || undefined,
        notesEn: parsed.notesEn || parsed.ntEn || undefined,
        notesRu: parsed.notesRu || parsed.ntRu || undefined
      };
    }
    return null;
  };

  // Attempt 1: Standard Base64 decode with escape(atob(...))
  try {
    const rawB64 = cleanedStr.replace(/ /g, '+').replace(/-/g, '+').replace(/_/g, '/');
    const jsonStr = decodeURIComponent(escape(atob(rawB64)));
    const parsed = JSON.parse(jsonStr);
    const res = parseDeceasedObject(parsed);
    if (res) return res;
  } catch (e) {}

  // Attempt 2: Standard Base64 decode without escape
  try {
    const rawB64 = cleanedStr.replace(/ /g, '+').replace(/-/g, '+').replace(/_/g, '/');
    const jsonStr = atob(rawB64);
    const parsed = JSON.parse(jsonStr);
    const res = parseDeceasedObject(parsed);
    if (res) return res;
  } catch (e) {}

  // Attempt 3: UTF-8 TextDecoder Base64URL decode
  try {
    let b64 = cleanedStr.replace(/-/g, '+').replace(/_/g, '/').replace(/ /g, '+');
    while (b64.length % 4 !== 0) b64 += '=';
    const binString = atob(b64);
    const bytes = Uint8Array.from(binString, (m) => m.codePointAt(0)!);
    const jsonStr = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(jsonStr);
    const res = parseDeceasedObject(parsed);
    if (res) return res;
  } catch (e) {}

  // Attempt 4: Direct JSON string parse
  try {
    const parsed = JSON.parse(cleanedStr);
    const res = parseDeceasedObject(parsed);
    if (res) return res;
  } catch (e) {}

  return null;
}

/**
 * Generates an elegant, short memorial link.
 * Automatically adapts dynamically to whatever domain the application is running on.
 */
export function getShortMemorialUrl(deceasedOrId: number | Deceased, lang?: string, allDeceasedList?: Deceased[]): string {
  let deceasedObj: Deceased | null = null;

  if (typeof deceasedOrId === 'object' && deceasedOrId !== null) {
    deceasedObj = deceasedOrId;
  } else {
    const id = Number(deceasedOrId);
    if (allDeceasedList && Array.isArray(allDeceasedList)) {
      deceasedObj = allDeceasedList.find(d => Number(d.id) === id) || null;
    }
  }

  let baseOrigin = '';
  try {
    if (typeof window !== 'undefined' && window.location && window.location.origin) {
      baseOrigin = window.location.origin;
    }
  } catch (e) {}

  if (!baseOrigin || baseOrigin === 'null' || baseOrigin.startsWith('file:')) {
    baseOrigin = PUBLIC_PRODUCTION_URL;
  }

  let dataParam = '';
  let idParam = '';
  if (deceasedObj) {
    if (deceasedObj.id) {
      idParam = `m=${deceasedObj.id}`;
    }
    const payload = encodeDeceasedToUrlPayload(deceasedObj);
    if (payload) {
      dataParam = `data=${payload}`;
    }
  } else if (typeof deceasedOrId === 'number' || (typeof deceasedOrId === 'string' && !isNaN(Number(deceasedOrId)))) {
    idParam = `m=${deceasedOrId}`;
  }

  const langQuery = (lang && lang !== 'he') ? `lang=${lang}` : '';
  const params = [idParam, dataParam, langQuery].filter(Boolean);
  const queryStr = params.length > 0 ? `?${params.join('&')}` : '';

  // Return clean short domain & path params URL
  return `${baseOrigin}/${queryStr}`;
}

export function openWhatsAppShare(text: string) {
  // Universal WhatsApp web/app link that works across all mobile OS (Android, iOS), desktop browsers, and WhatsApp Web
  const encodedText = encodeURIComponent(text);
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodedText}`;
  
  try {
    const win = window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    if (!win || win.closed || typeof win.closed === 'undefined') {
      window.location.href = `https://wa.me/?text=${encodedText}`;
    }
  } catch (e) {
    window.location.href = `https://wa.me/?text=${encodedText}`;
  }
}

/**
 * Generates an elegant, emotional, and persuasive invitation text for sharing via WhatsApp.
 */
export function generateWhatsAppShareText(
  deceased: Deceased,
  lang: Language,
  shabbatInfo?: ShabbatYahrzeitInfo | null
): string {
  const shortUrl = getShortMemorialUrl(deceased, lang);
  const localizedName = getLocalizedName(deceased, lang);
  const parentRelation = formatParentRelation(deceased.gender, deceased.fatherName, deceased.motherName, lang as 'he' | 'en' | 'ru', deceased);
  const parentSuffix = parentRelation ? ` (${parentRelation})` : '';

  if (lang === 'he') {
    let shabbatBlock = '';
    if (shabbatInfo?.isShabbat) {
      shabbatBlock =
        `📌 *אזכרה החלה בשבת — תזכורת כפולה לשתי השבתות:*\n` +
        `• *עלייה לקבר:* מוקדמת ליום שישי או נדחית ליום ראשון\n` +
        `• *1️⃣ שבת הכנה (השבת שלפני):* פרשת ${shabbatInfo.prepParashaName} (${shabbatInfo.prepDateStrFormatted}) — תזכורת להערכות, הזמנת עולים לתורה, תיאום מניין וסעודה\n` +
        `• *2️⃣ שבת האזכרה (השבת עצמה):* פרשת ${shabbatInfo.memorialParashaName} (${shabbatInfo.memorialDateStrFormatted}) — תזכורת להדלקת נר נשמה בערב שבת לפני השקיעה, תפילת קדיש ולימוד\n` +
        `⚠️ *שימו לב:* חובה להקדים ולהדליק נר נשמה בערב שבת מבעוד מועד לפני כניסת השבת!\n\n`;
    }

    return `🕯️ *הזמנה לאתר הזיכרון וההנצחה העולמי | לזכר עולמים* 🕯️\n\n` +
      `מזמינים אתכם להצטרף אלינו, להדליק נר נשמה, לקרוא פרק תהילים ולהקדיש משניות לעילוי נשמתו/ה היקרה של:\n\n` +
      `✨ *${localizedName}*${parentSuffix} ✨\n\n` +
      shabbatBlock +
      `זוכרים, מנציחים ושומרים את הזיכרון חי בלב כולנו.\n` +
      `צפו בכרטיס הזיכרון והשתתפו בהנצחה:\n` +
      `🔗 ${shortUrl}\n\n` +
      `_יהי זכרו/ה ברוך ומנוחתו/ה בגן עדן_ 🙏`;
  } else if (lang === 'ru') {
    let shabbatBlock = '';
    if (shabbatInfo?.isShabbat) {
      shabbatBlock =
        `📌 *Йарцайт в Шаббат — Двойное напоминание:*\n` +
        `• *Посещение могилы:* переносится на пятницу или откладывается на воскресенье\n` +
        `• *1️⃣ Шаббат подготовки (Шаббат до годовщины):* Парашат ${shabbatInfo.prepParashaName} (${shabbatInfo.prepDateStrFormatted}) — координация миньяна, вызова к Торе (Алийот) и трапезы\n` +
        `• *2️⃣ Шаббат памяти (Шаббат годовщины):* Парашат ${shabbatInfo.memorialParashaName} (${shabbatInfo.memorialDateStrFormatted}) — зажечь поминальную свечу в пятницу до захода солнца, Кадиш и изучение Торы\n` +
        `⚠️ *Внимание:* Поминальную свечу необходимо зажечь в пятницу вечером до захода солнца и начала Шаббата!\n\n`;
    }

    return `🕯️ *Приглашение на страницу памяти и поминовения | Лезэхер Оламим* 🕯️\n\n` +
      `Приглашаем вас присоединиться к нам, чтобы почтить светлую память нашего дорогого человека:\n\n` +
      `✨ *${localizedName}*${parentSuffix} ✨\n\n` +
      shabbatBlock +
      `Зажгите виртуальную свечу, оставьте теплые слова и прочитайте псалмы в его/ее память:\n` +
      `🔗 ${shortUrl}\n\n` +
      `_Светлая и вечная память_ 🙏`;
  } else {
    let shabbatBlock = '';
    if (shabbatInfo?.isShabbat) {
      shabbatBlock =
        `📌 *Yahrzeit on Shabbat — Double Shabbat Reminder:*\n` +
        `• *Grave Visit:* Brought forward to Friday or postponed to Sunday\n` +
        `• *1️⃣ Preparation Shabbat (Shabbat Before):* Parashat ${shabbatInfo.prepParashaName} (${shabbatInfo.prepDateStrFormatted}) — reminder for preparation: inviting Torah readers (Aliyot), coordinating minyan and meal\n` +
        `• *2️⃣ Memorial Shabbat (Yahrzeit Shabbat):* Parashat ${shabbatInfo.memorialParashaName} (${shabbatInfo.memorialDateStrFormatted}) — reminder to light a memorial candle on Friday before sunset, Kaddish, and Torah study\n` +
        `⚠️ *Please Note:* A memorial candle must be lit on Friday evening before sunset prior to the start of Shabbat!\n\n`;
    }

    return `🕯️ *Memorial & Remembrance Invitation | L'Zecher Olamim* 🕯️\n\n` +
      `You are warmly invited to join us in honoring and keeping alive the sacred memory of our beloved:\n\n` +
      `✨ *${localizedName}*${parentSuffix} ✨\n\n` +
      shabbatBlock +
      `Light a virtual candle, share loving memories, and participate in holy study for the elevation of their soul:\n` +
      `🔗 ${shortUrl}\n\n` +
      `_May their memory be an eternal blessing_ 🙏`;
  }
}


