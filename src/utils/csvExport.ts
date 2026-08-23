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

export const CANONICAL_EXCEL_CSV_HEADERS = [
  'id',
  'name',
  'gender',
  'fatherName',
  'motherName',
  'passDate',
  'hebrewDate',
  'birthDate',
  'bio',
  'notes',
  'image',
  'imageUrl',
  'photoUrl',
  'imagePosition',
  'contactPhone',
  'candlesCount',
  'likesCount',
  'ageAtDeath',
  'nameHe',
  'nameEn',
  'nameRu',
  'fatherNameHe',
  'fatherNameEn',
  'fatherNameRu',
  'motherNameHe',
  'motherNameEn',
  'motherNameRu',
  'notesHe',
  'notesEn',
  'notesRu',
  'manualFields'
];

/**
 * Exports a single language CSV file with strict Supabase schema English headers
 */
export function exportSingleLanguageCsv(deceasedList: Deceased[], lang: Language, filename?: string) {
  if (!deceasedList || deceasedList.length === 0) return;

  // Ensure list is cleanly translated into target language
  const translatedList = translateDeceasedListClientSide(deceasedList, lang);

  const rows: string[] = [];
  rows.push(CANONICAL_EXCEL_CSV_HEADERS.map(h => escapeCsvCell(h)).join(','));

  translatedList.forEach(item => {
    const hebDate = item.hebrewDate || (item.day && item.month ? `${item.day} ${item.month}` : '');
    const pDate = item.passDate || hebDate;
    const bioText = item.bio || item.notes || '';
    const imgUrl = item.imageUrl || item.image || item.photoUrl || item.photo || '';
    const candles = item.candlesCount !== undefined ? item.candlesCount : 0;
    const likes = item.likesCount !== undefined ? item.likesCount : 0;

    const row = [
      escapeCsvCell(item.id || ''),
      escapeCsvCell(item.name || ''),
      escapeCsvCell(item.gender || 'male'),
      escapeCsvCell(item.fatherName || ''),
      escapeCsvCell(item.motherName || ''),
      escapeCsvCell(pDate),
      escapeCsvCell(hebDate),
      escapeCsvCell(item.birthDate || ''),
      escapeCsvCell(bioText),
      escapeCsvCell(item.notes || bioText),
      escapeCsvCell(imgUrl),
      escapeCsvCell(imgUrl),
      escapeCsvCell(imgUrl),
      escapeCsvCell(item.imagePosition || 'center'),
      escapeCsvCell(item.contactPhone || ''),
      escapeCsvCell(candles),
      escapeCsvCell(likes),
      escapeCsvCell(item.ageAtDeath !== undefined ? item.ageAtDeath : ''),
      escapeCsvCell(item.nameHe || ''),
      escapeCsvCell(item.nameEn || ''),
      escapeCsvCell(item.nameRu || ''),
      escapeCsvCell(item.fatherNameHe || ''),
      escapeCsvCell(item.fatherNameEn || ''),
      escapeCsvCell(item.fatherNameRu || ''),
      escapeCsvCell(item.motherNameHe || ''),
      escapeCsvCell(item.motherNameEn || ''),
      escapeCsvCell(item.motherNameRu || ''),
      escapeCsvCell(item.notesHe || ''),
      escapeCsvCell(item.notesEn || ''),
      escapeCsvCell(item.notesRu || ''),
      escapeCsvCell(item.manualFields && Array.isArray(item.manualFields) && item.manualFields.length > 0 ? item.manualFields.join(';') : '')
    ];
    rows.push(row.join(','));
  });

  const defaultFileName = filename || (
    lang === 'he' 
      ? `eternal_memorial_database_he.csv` 
      : lang === 'ru' 
      ? `eternal_memorial_database_ru.csv` 
      : `eternal_memorial_database_en.csv`
  );

  triggerCsvDownload(rows.join('\r\n'), defaultFileName);
}

/**
 * Downloads the deceased list as CSV file for the selected language
 */
export function downloadDeceasedCsv(deceasedList: Deceased[], activeLang: Language = 'he') {
  if (!deceasedList || deceasedList.length === 0) return;
  exportSingleLanguageCsv(deceasedList, activeLang);
}

/**
 * Legacy alias for single-language export matching active interface language
 */
export function exportCombined3LanguageCsv(deceasedList: Deceased[], lang: Language = 'he') {
  exportSingleLanguageCsv(deceasedList, lang);
}

