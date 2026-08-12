/**
 * Utility functions for generating short memorial URLs and sharing via WhatsApp / Clipboard.
 */

import { Deceased, Language } from '../types';
import { formatParentRelation } from './translations';
import { getLocalizedName } from './transliteration';
import { ShabbatYahrzeitInfo } from './torahPortionHelper';
import { toBlob, toPng } from 'html-to-image';

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
  let idVal: number | string | null = null;

  if (typeof deceasedOrId === 'object' && deceasedOrId !== null) {
    idVal = deceasedOrId.id || null;
  } else if (typeof deceasedOrId === 'number' || typeof deceasedOrId === 'string') {
    idVal = deceasedOrId;
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

  const langQuery = (lang && lang !== 'he') ? `?lang=${lang}` : '';

  if (idVal !== null && idVal !== undefined && String(idVal).trim() !== '') {
    return `${baseOrigin}/share/${idVal}${langQuery}`;
  }

  return `${baseOrigin}/${langQuery}`;
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
 * Generates a concise, respectful invitation text for sharing via WhatsApp.
 * Designed to encourage clicking the short memorial link without exposing verbose or personal details.
 */
export function generateWhatsAppShareText(
  deceased: Deceased,
  lang: Language,
  shabbatInfo?: ShabbatYahrzeitInfo | null
): string {
  const shortUrl = getShortMemorialUrl(deceased, lang);
  const localizedName = getLocalizedName(deceased, lang);
  const isFemale = deceased.gender === 'female';
  const isMale = deceased.gender === 'male';
  const parentRel = formatParentRelation(deceased.gender, deceased.fatherName, deceased.motherName, lang, deceased);

  if (lang === 'he') {
    const nameWithParent = parentRel ? `${localizedName} ${parentRel}` : localizedName;
    const blessingSuffix = isFemale ? 'יהי זכרה ברוך 🙏' : isMale ? 'יהי זכרו ברוך 🙏' : 'יהי זכרו/ה ברוך 🙏';

    return `🕯️ לזכר עולמים – ${nameWithParent}\n\n` +
      `מזמינים אתכם לבקר בדף הזיכרון, להדליק נר נשמה ולהשתתף בהנצחה.\n\n` +
      `🔗 ${shortUrl}\n\n` +
      `${blessingSuffix}`;
  } else if (lang === 'ru') {
    const nameWithParent = parentRel ? `${localizedName} (${parentRel})` : localizedName;

    return `🕯️ Светлая память – ${nameWithParent}\n\n` +
      `Приглашаем вас посетить страницу памяти, зажечь свечу и оставить добрые слова.\n\n` +
      `🔗 ${shortUrl}\n\n` +
      `Светлая и вечная память 🙏`;
  } else {
    const nameWithParent = parentRel ? `${localizedName} (${parentRel})` : localizedName;

    return `🕯️ In loving memory – ${nameWithParent}\n\n` +
      `You are invited to visit the memorial page, light a virtual candle and participate in remembrance.\n\n` +
      `🔗 ${shortUrl}`;
  }
}

/**
 * Captures a visual snapshot of the specific deceased card using html-to-image
 * and shares it natively via Web Share API or downloads it and opens WhatsApp.
 */
export async function shareMemorialWithSnapshot(
  cardElement: HTMLElement | null,
  deceased: Deceased,
  lang: Language,
  shabbatInfo?: ShabbatYahrzeitInfo | null
): Promise<{ success: boolean; method: string; error?: string }> {
  const shareText = generateWhatsAppShareText(deceased, lang, shabbatInfo);
  if (!cardElement) {
    openWhatsAppShare(shareText);
    return { success: true, method: 'whatsapp_text_only' };
  }

  const cleanName = (deceased.name || 'memorial').replace(/[^a-zA-Z0-9_\u0590-\u05FF]/g, '_');
  const fileName = `memorial_${cleanName}_${deceased.id}.png`;

  try {
    const blob = await toBlob(cardElement, {
      quality: 0.95,
      pixelRatio: 2,
      cacheBust: true,
      filter: (node) => {
        // Exclude buttons or interactive elements if marked with data-skip-snapshot
        return !node.classList?.contains('skip-snapshot');
      }
    });

    if (!blob) {
      openWhatsAppShare(shareText);
      return { success: true, method: 'whatsapp_text_fallback' };
    }

    const file = new File([blob], fileName, { type: 'image/png' });

    // Use Web Share API if supported with files (Mobile Chrome, Safari, WhatsApp native)
    if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        title: `לזכר ${deceased.name}`,
        text: shareText,
        files: [file]
      });
      return { success: true, method: 'web_share_api' };
    }

    // Fallback on desktop / web browsers:
    // 1. Trigger image download
    const link = document.createElement('a');
    link.download = fileName;
    link.href = URL.createObjectURL(blob);
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 10000);

    // 2. Open WhatsApp Share with link + text
    openWhatsAppShare(shareText);

    return { success: true, method: 'download_and_whatsapp' };
  } catch (err: any) {
    console.warn('[Snapshot share fallback]', err);
    openWhatsAppShare(shareText);
    return { success: false, method: 'whatsapp_text_only', error: err?.message };
  }
}

/**
 * Captures and downloads high-resolution PNG image of the specific deceased card.
 */
export async function downloadMemorialSnapshot(
  cardElement: HTMLElement | null,
  deceased: Deceased
): Promise<boolean> {
  if (!cardElement) return false;
  const cleanName = (deceased.name || 'memorial').replace(/[^a-zA-Z0-9_\u0590-\u05FF]/g, '_');
  const fileName = `memorial_card_${cleanName}_${deceased.id}.png`;

  try {
    const dataUrl = await toPng(cardElement, {
      quality: 0.98,
      pixelRatio: 2,
      cacheBust: true,
      filter: (node) => !node.classList?.contains('skip-snapshot')
    });

    const link = document.createElement('a');
    link.download = fileName;
    link.href = dataUrl;
    link.click();
    return true;
  } catch (err) {
    console.error('[Download Snapshot Error]', err);
    return false;
  }
}



