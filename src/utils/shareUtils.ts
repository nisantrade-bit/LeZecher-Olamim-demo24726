/**
 * Utility functions for generating short memorial URLs and sharing via WhatsApp / Clipboard.
 */

import { Deceased, Language } from '../types';
import { formatParentRelation } from './translations';

export const PUBLIC_PRODUCTION_URL = 'https://peaceful-tarsier-9f8a3d.netlify.app';

/**
 * Encodes a Deceased object into a URL-safe Base64URL string.
 * Base64URL uses ONLY alphanumeric characters, hyphens and underscores (a-z, A-Z, 0-9, -, _).
 * It contains NO '%', NO '{', NO '"', NO spaces or special symbols, guaranteeing that WhatsApp,
 * Telegram, SMS, and email clients format it as a 100% clickable hyperlink without truncation!
 */
export function encodeDeceasedToUrlPayload(deceased: Deceased): string {
  try {
    const compactObj = {
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
      bd: deceased.birthDate || ''
    };
    const jsonStr = JSON.stringify(compactObj);
    
    // UTF-8 byte encoding
    const encoder = new TextEncoder();
    const bytes = encoder.encode(jsonStr);
    let binString = "";
    for (let i = 0; i < bytes.length; i++) {
      binString += String.fromCharCode(bytes[i]);
    }
    const b64 = btoa(binString);
    
    // Convert to URL-Safe Base64 (replace + with -, / with _, remove = padding)
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  } catch (e) {
    console.error("Error encoding deceased payload:", e);
    return '';
  }
}

/**
 * Decodes a URL parameter string back into a Deceased object.
 * Supports Base64URL, URL-encoded JSON, raw JSON, space-normalized Base64, and legacy formats.
 */
export function decodeDeceasedFromUrlPayload(encodedStr: string): Deceased | null {
  if (!encodedStr) return null;

  // Clean and unescape URL string first if needed
  let cleanedStr = encodedStr.trim();
  try {
    if (cleanedStr.includes('%')) {
      cleanedStr = decodeURIComponent(cleanedStr);
    }
  } catch (e) {
    // Ignore decode error and proceed with original string
  }

  const parseDeceasedObject = (parsed: any): Deceased | null => {
    if (parsed && (parsed.i || parsed.id) && (parsed.n || parsed.name)) {
      return {
        id: Number(parsed.i || parsed.id),
        name: String(parsed.n || parsed.name),
        gender: (parsed.g || parsed.gender) === 'female' ? 'female' : 'male',
        fatherName: String(parsed.fn || parsed.fatherName || ''),
        motherName: String(parsed.mn || parsed.motherName || ''),
        day: Number(parsed.d || parsed.day),
        month: String(parsed.m || parsed.month),
        contactPhone: String(parsed.p || parsed.contactPhone || ''),
        notes: String(parsed.nt || parsed.notes || ''),
        ageAtDeath: parsed.a !== undefined ? Number(parsed.a) : (parsed.ageAtDeath !== undefined ? Number(parsed.ageAtDeath) : undefined),
        birthDate: parsed.bd ? String(parsed.bd) : (parsed.birthDate ? String(parsed.birthDate) : undefined)
      };
    }
    return null;
  };

  // Attempt 1: Standard JSON parse directly if raw JSON was passed
  try {
    const parsed = JSON.parse(cleanedStr);
    const res = parseDeceasedObject(parsed);
    if (res) return res;
  } catch (e) {
    // Continue
  }

  // Attempt 2: Base64 / Base64URL decode with UTF-8 support
  const tryBase64 = (str: string): Deceased | null => {
    try {
      let b64 = str.replace(/-/g, '+').replace(/_/g, '/').replace(/ /g, '+');
      while (b64.length % 4 !== 0) {
        b64 += '=';
      }
      const binString = atob(b64);
      const bytes = Uint8Array.from(binString, (m) => m.codePointAt(0)!);
      const jsonStr = new TextDecoder().decode(bytes);
      const parsed = JSON.parse(jsonStr);
      return parseDeceasedObject(parsed);
    } catch (e) {
      return null;
    }
  };

  const res1 = tryBase64(cleanedStr);
  if (res1) return res1;

  const res2 = tryBase64(encodedStr);
  if (res2) return res2;

  // Attempt 3: Legacy Base64 decode with percent-encoding
  try {
    const normalizedB64 = encodedStr.replace(/ /g, '+').replace(/-/g, '+').replace(/_/g, '/');
    const jsonStr = decodeURIComponent(
      Array.prototype.map.call(atob(normalizedB64), (c: string) => 
        '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
      ).join('')
    );
    const parsed = JSON.parse(jsonStr);
    const res = parseDeceasedObject(parsed);
    if (res) return res;
  } catch (e) {
    // Continue
  }

  return null;
}

/**
 * Generates an elegant, short memorial link.
 * Automatically adapts dynamically to whatever domain the application is running on.
 */
export function getShortMemorialUrl(deceasedOrId: number | Deceased, lang?: string): string {
  const langQuery = (lang && lang !== 'he') ? `?lang=${lang}` : '';
  let id: number;

  if (typeof deceasedOrId === 'object' && deceasedOrId !== null) {
    id = deceasedOrId.id;
  } else {
    id = Number(deceasedOrId);
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

  return `${baseOrigin}/m/${id}${langQuery}`;
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
export function generateWhatsAppShareText(deceased: Deceased, lang: Language): string {
  const shortUrl = getShortMemorialUrl(deceased, lang);
  const parentRelation = formatParentRelation(deceased.gender, deceased.fatherName, deceased.motherName, lang as 'he' | 'en' | 'ru');
  const parentSuffix = parentRelation ? ` (${parentRelation})` : '';

  if (lang === 'he') {
    return `🕯️ *הזמנה לאתר הזיכרון וההנצחה העולמי | לזכר עולמים* 🕯️\n\n` +
      `מזמינים אתכם להצטרף אלינו, להדליק נר נשמה, לקרוא פרק תהילים ולהקדיש משניות לעילוי נשמתו/ה היקרה של:\n\n` +
      `✨ *${deceased.name}*${parentSuffix} ✨\n\n` +
      `זוכרים, מנציחים ושומרים את הזיכרון חי בלב כולנו.\n` +
      `צפו בכרטיס הזיכרון והשתתפו בהנצחה:\n` +
      `🔗 ${shortUrl}\n\n` +
      `_יהי זכרו/ה ברוך ומנוחתו/ה בגן עדן_ 🙏`;
  } else if (lang === 'ru') {
    return `🕯️ *Приглашение на страницу памяти и поминовения | Лезэхер Оламим* 🕯️\n\n` +
      `Приглашаем вас присоединиться к нам, чтобы почтить светлую память нашего дорогого человека:\n\n` +
      `✨ *${deceased.name}*${parentSuffix} ✨\n\n` +
      `Зажгите виртуальную свечу, оставьте теплые слова и прочитайте псалмы в его/ее память:\n` +
      `🔗 ${shortUrl}\n\n` +
      `_Светлая и вечная память_ 🙏`;
  } else {
    return `🕯️ *Memorial & Remembrance Invitation | L'Zecher Olamim* 🕯️\n\n` +
      `You are warmly invited to join us in honoring and keeping alive the sacred memory of our beloved:\n\n` +
      `✨ *${deceased.name}*${parentSuffix} ✨\n\n` +
      `Light a virtual candle, share loving memories, and participate in holy study for the elevation of their soul:\n` +
      `🔗 ${shortUrl}\n\n` +
      `_May their memory be an eternal blessing_ 🙏`;
  }
}


