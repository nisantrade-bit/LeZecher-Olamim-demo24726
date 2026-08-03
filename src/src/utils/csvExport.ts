/**
 * Utility for exporting memorial database records to CSV format in Hebrew, English, and Russian.
 */

import { Deceased, Language } from '../types';
import { translateDeceasedListClientSide } from './transliteration';

/**
 * Escapes a cell value for safe CSV output
 */
function escapeCsvCell(cell: string | number | undefined): string {
  if (cell === undefined || cell === null) return '""';
  const str = String(cell).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Triggers a real browser file download using Data URI & Blob fallback for max iframe/browser compatibility
 */
function triggerCsvDownload(csvContentWithoutBom: string, filename: string) {
  const cleanContent = csvContentWithoutBom.replace(/^\uFEFF/, '');
  const bom = '\uFEFF';
  const fullCsv = bom + cleanContent;

  try {
    // Primary method: Data URI (works synchronously and reliably inside sandboxed preview iframes)
    const encodedUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(fullCsv);
    const link = document.createElement('a');
    link.href = encodedUri;
    link.download = filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
    }, 500);
  } catch (err) {
    // Fallback Blob method
    const blob = new Blob([fullCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
      URL.revokeObjectURL(url);
    }, 1000);
  }
}

/**
 * Exports a single language CSV file
 */
export function exportSingleLanguageCsv(deceasedList: Deceased[], lang: Language, filename?: string) {
  if (!deceasedList || deceasedList.length === 0) return;

  // Ensure list is cleanly translated into target language
  const translatedList = translateDeceasedListClientSide(deceasedList, lang);

  const headers = lang === 'he' ? [
    'שם מלא',
    'מין (male/female)',
    'שם האב/הורה',
    'שם האם',
    'יום עברי (1-30)',
    'חודש עברי',
    'טלפון קשר',
    'סיפור חיים והערות'
  ] : lang === 'ru' ? [
    'Полное имя',
    'Пол (male/female)',
    'Имя отца/родителя',
    'Имя матери',
    'Еврейский день (1-30)',
    'Еврейский месяц',
    'Телефон',
    'Примечания'
  ] : [
    'Full Name',
    'Gender (male/female)',
    'Father Name',
    'Mother Name',
    'Hebrew Day (1-30)',
    'Hebrew Month',
    'Contact Phone',
    'Life Story'
  ];

  const rows: string[] = [];
  rows.push(headers.map(h => escapeCsvCell(h)).join(','));

  translatedList.forEach(item => {
    const row = [
      escapeCsvCell(item.name),
      escapeCsvCell(item.gender),
      escapeCsvCell(item.fatherName || ''),
      escapeCsvCell(item.motherName || ''),
      escapeCsvCell(item.day),
      escapeCsvCell(item.month),
      escapeCsvCell(item.contactPhone || ''),
      escapeCsvCell(item.notes || '')
    ];
    rows.push(row.join(','));
  });

  const defaultFileName = filename || (
    lang === 'he' 
      ? `רשימת_נפטרים_עברית.csv` 
      : lang === 'ru' 
      ? `список_усопших_русский.csv` 
      : `memorial_list_english.csv`
  );

  triggerCsvDownload(rows.join('\r\n'), defaultFileName);
}

/**
 * Downloads the deceased list as CSV files for all 3 languages (Hebrew, English, Russian).
 */
export function downloadDeceasedCsv(deceasedList: Deceased[], _activeLang?: Language) {
  if (!deceasedList || deceasedList.length === 0) return;

  // 1. Export Hebrew CSV
  exportSingleLanguageCsv(deceasedList, 'he', 'רשימת_נפטרים_עברית.csv');

  // 2. Export English CSV after short delay to prevent browser popup throttling
  setTimeout(() => {
    exportSingleLanguageCsv(deceasedList, 'en', 'memorial_list_english.csv');
  }, 250);

  // 3. Export Russian CSV
  setTimeout(() => {
    exportSingleLanguageCsv(deceasedList, 'ru', 'список_усопших_русский.csv');
  }, 500);
}

/**
 * Exports a single combined 3-language CSV file containing Hebrew, English, and Russian side-by-side
 */
export function exportCombined3LanguageCsv(deceasedList: Deceased[]) {
  if (!deceasedList || deceasedList.length === 0) return;

  const listHe = translateDeceasedListClientSide(deceasedList, 'he');
  const listEn = translateDeceasedListClientSide(deceasedList, 'en');
  const listRu = translateDeceasedListClientSide(deceasedList, 'ru');

  const headers = [
    'שם מלא (עברית)',
    'Full Name (English)',
    'Полное имя (Русский)',
    'מין (male/female)',
    'שם האב (עברית)',
    'Father Name (English)',
    'Имя отца (Русский)',
    'שם האם (עברית)',
    'Mother Name (English)',
    'Имя матери (Русский)',
    'יום עברי (1-30)',
    'חודש עברי (עברית)',
    'Hebrew Month (English)',
    'Еврейский месяц (Русский)',
    'טלפון קשר',
    'הערות (עברית)',
    'Notes (English)',
    'Примечания (Русский)'
  ];

  const rows: string[] = [];
  rows.push(headers.map(h => escapeCsvCell(h)).join(','));

  deceasedList.forEach((_, idx) => {
    const itemHe = listHe[idx];
    const itemEn = listEn[idx];
    const itemRu = listRu[idx];
    if (!itemHe || !itemEn || !itemRu) return;

    const row = [
      escapeCsvCell(itemHe.name),
      escapeCsvCell(itemEn.name),
      escapeCsvCell(itemRu.name),
      escapeCsvCell(itemHe.gender),
      escapeCsvCell(itemHe.fatherName || ''),
      escapeCsvCell(itemEn.fatherName || ''),
      escapeCsvCell(itemRu.fatherName || ''),
      escapeCsvCell(itemHe.motherName || ''),
      escapeCsvCell(itemEn.motherName || ''),
      escapeCsvCell(itemRu.motherName || ''),
      escapeCsvCell(itemHe.day),
      escapeCsvCell(itemHe.month),
      escapeCsvCell(itemEn.month),
      escapeCsvCell(itemRu.month),
      escapeCsvCell(itemHe.contactPhone || ''),
      escapeCsvCell(itemHe.notes || ''),
      escapeCsvCell(itemEn.notes || ''),
      escapeCsvCell(itemRu.notes || '')
    ];
    rows.push(row.join(','));
  });

  triggerCsvDownload(rows.join('\r\n'), 'eternal_memorial_database_3languages.csv');
}

