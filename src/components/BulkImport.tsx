/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { Deceased, Gender, Language } from '../types';
import { translations, sanitizeParentName } from '../utils/translations';
import { normalizeMonthName } from '../utils/hebrewDate';
import { Download, Upload, Clipboard, CheckCircle, AlertTriangle, FileSpreadsheet, Sparkles, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';
import { downloadDeceasedCsv, exportCombined3LanguageCsv, exportSingleLanguageCsv, CANONICAL_EXCEL_CSV_HEADERS } from '../utils/csvExport';
import { translateDeceasedListClientSide, translateDeceasedListClientSize } from '../utils/transliteration';

interface BulkImportProps {
  lang: Language;
  onImport: (newList: Deceased[]) => void;
  deceasedList: Deceased[];
  onCleanDuplicates?: () => void;
}

export const BulkImport: React.FC<BulkImportProps> = ({ lang, onImport, deceasedList, onCleanDuplicates }) => {
  const t = translations[lang];

  const [pasteText, setPasteText] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Robust CSV parser
  const parseCSV = (text: string): string[][] => {
    const lines: string[][] = [];
    let row: string[] = [];
    let inQuotes = false;
    let currentToken = "";
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i+1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentToken += '"';
          i++; // skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if ((char === ',' || char === '\t') && !inQuotes) {
        row.push(currentToken.trim());
        currentToken = "";
      } else if ((char === '\n' || char === '\r') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
        row.push(currentToken.trim());
        if (row.some(x => x !== "")) {
          lines.push(row);
        }
        row = [];
        currentToken = "";
      } else {
        currentToken += char;
      }
    }
    
    if (currentToken !== "" || row.length > 0) {
      row.push(currentToken.trim());
      if (row.some(x => x !== "")) {
        lines.push(row);
      }
    }
    
    return lines;
  };

  // Convert parsed lines into structured Deceased items with thorough validation and dynamic header matching
  const processLines = (rows: string[][]): Deceased[] => {
    if (!rows || rows.length === 0) return [];

    let idIdx = -1;
    let nameIdx = -1;
    let genderIdx = -1;
    let fatherIdx = -1;
    let motherIdx = -1;
    let passDateIdx = -1;
    let hebrewDateIdx = -1;
    let birthDateIdx = -1;
    let bioIdx = -1;
    let notesIdx = -1;
    let imageIdx = -1;
    let imageUrlIdx = -1;
    let photoUrlIdx = -1;
    let imagePosIdx = -1;
    let phoneIdx = -1;
    let candlesIdx = -1;
    let likesIdx = -1;
    let ageIdx = -1;
    let nameHeIdx = -1, nameEnIdx = -1, nameRuIdx = -1;
    let fatherHeIdx = -1, fatherEnIdx = -1, fatherRuIdx = -1;
    let motherHeIdx = -1, motherEnIdx = -1, motherRuIdx = -1;
    let notesHeIdx = -1, notesEnIdx = -1, notesRuIdx = -1;
    let dayIdx = -1;
    let monthIdx = -1;

    let startRow = 0;

    const firstRow = rows[0] || [];
    const firstRowStr = firstRow.map(c => (c || '').toLowerCase().trim()).join(' ');

    const isHeaderRow = firstRowStr.includes('name') || 
                        firstRowStr.includes('שם') || 
                        firstRowStr.includes('имя') || 
                        firstRowStr.includes('gender') ||
                        firstRowStr.includes('מין') ||
                        firstRowStr.includes('id') ||
                        firstRowStr.includes('bio') ||
                        firstRowStr.includes('date');

    if (isHeaderRow) {
      startRow = 1; // skip header row
      firstRow.forEach((cell, idx) => {
        const c = (cell || '').toLowerCase().trim();
        if (c === 'id' || c.includes('id_') || c.includes('_id')) idIdx = idx;
        else if (c === 'namehe' || c === 'name_he') nameHeIdx = idx;
        else if (c === 'nameen' || c === 'name_en') nameEnIdx = idx;
        else if (c === 'nameru' || c === 'name_ru') nameRuIdx = idx;
        else if ((c === 'name' || c.includes('full name') || c.includes('שם מלא') || c === 'שם' || c === 'имя') && !c.includes('father') && !c.includes('mother') && !c.includes('אב') && !c.includes('אם')) nameIdx = idx;
        else if (c === 'gender' || c.includes('sex') || c.includes('מין') || c.includes('пол')) genderIdx = idx;
        else if (c === 'fathernamehe' || c === 'father_name_he') fatherHeIdx = idx;
        else if (c === 'fathernameen' || c === 'father_name_en') fatherEnIdx = idx;
        else if (c === 'fathernameru' || c === 'father_name_ru') fatherRuIdx = idx;
        else if (c === 'fathername' || c === 'father_name' || c.includes('father name') || c.includes('father') || c.includes('שם אב') || c.includes('שם האב')) fatherIdx = idx;
        else if (c === 'mothernamehe' || c === 'mother_name_he') motherHeIdx = idx;
        else if (c === 'mothernameen' || c === 'mother_name_en') motherEnIdx = idx;
        else if (c === 'mothernameru' || c === 'mother_name_ru') motherRuIdx = idx;
        else if (c === 'mothername' || c === 'mother_name' || c.includes('mother name') || c.includes('mother') || c.includes('שם אם') || c.includes('שם האם')) motherIdx = idx;
        else if (c === 'passdate' || c.includes('pass_date') || c.includes('pass date') || c.includes('תאריך פטירה')) passDateIdx = idx;
        else if (c === 'hebrewdate' || c.includes('hebrew_date') || c.includes('hebrew date') || c.includes('תאריך עברי')) hebrewDateIdx = idx;
        else if (c === 'birthdate' || c.includes('birth_date') || c.includes('birth date') || c.includes('תאריך לידה')) birthDateIdx = idx;
        else if (c === 'noteshe' || c === 'notes_he') notesHeIdx = idx;
        else if (c === 'notesen' || c === 'notes_en') notesEnIdx = idx;
        else if (c === 'notesru' || c === 'notes_ru') notesRuIdx = idx;
        else if (c === 'bio') bioIdx = idx;
        else if (c === 'notes' || c.includes('story') || c.includes('הערות')) notesIdx = idx;
        else if (c === 'imageurl' || c === 'image_url') imageUrlIdx = idx;
        else if (c === 'photourl' || c === 'photo_url') photoUrlIdx = idx;
        else if (c === 'image' || c === 'photo' || c.includes('תמונה')) imageIdx = idx;
        else if (c === 'imageposition' || c === 'image_position') imagePosIdx = idx;
        else if (c === 'contactphone' || c === 'contact_phone' || c.includes('phone') || c.includes('טלפון')) phoneIdx = idx;
        else if (c === 'candlescount' || c === 'candles_count' || c.includes('candles') || c.includes('נרות')) candlesIdx = idx;
        else if (c === 'likescount' || c === 'likes_count' || c.includes('likes')) likesIdx = idx;
        else if (c === 'ageatdeath' || c === 'age_at_death' || c === 'age' || c.includes('גיל')) ageIdx = idx;
        else if (c === 'day' || c.includes('hebrewday') || c.includes('יום')) dayIdx = idx;
        else if (c === 'month' || c.includes('hebrewmonth') || c.includes('חודש')) monthIdx = idx;
      });
    }

    if (nameIdx === -1) {
      if (firstRow[0] && (firstRow[0].toLowerCase() === 'id' || !isNaN(Number(firstRow[0])))) {
        idIdx = 0; nameIdx = 1; genderIdx = 2; fatherIdx = 3; motherIdx = 4;
      } else {
        nameIdx = 0; genderIdx = 1; fatherIdx = 2; motherIdx = 3;
      }
    }

    const result: Deceased[] = [];

    for (let index = startRow; index < rows.length; index++) {
      const row = rows[index];
      if (!row || row.length === 0) continue;

      const rawIdStr = idIdx !== -1 ? row[idIdx] || '' : '';
      const rawName = (nameIdx !== -1 ? row[nameIdx] || '' : '').trim();
      const rawGender = (genderIdx !== -1 ? row[genderIdx] || '' : '').toLowerCase().trim();
      const rawFather = fatherIdx !== -1 ? row[fatherIdx] || '' : '';
      const rawMother = motherIdx !== -1 ? row[motherIdx] || '' : '';
      const rawPassDate = passDateIdx !== -1 ? (row[passDateIdx] || '').trim() : '';
      const rawHebrewDate = hebrewDateIdx !== -1 ? (row[hebrewDateIdx] || '').trim() : '';
      const rawBirthDate = birthDateIdx !== -1 ? (row[birthDateIdx] || '').trim() : '';
      const rawBio = bioIdx !== -1 ? (row[bioIdx] || '').trim() : '';
      const rawNotes = notesIdx !== -1 ? (row[notesIdx] || '').trim() : '';
      const rawImage = imageIdx !== -1 ? (row[imageIdx] || '').trim() : '';
      const rawImageUrl = imageUrlIdx !== -1 ? (row[imageUrlIdx] || '').trim() : '';
      const rawPhotoUrl = photoUrlIdx !== -1 ? (row[photoUrlIdx] || '').trim() : '';
      const rawImagePos = imagePosIdx !== -1 ? (row[imagePosIdx] || '').trim() : '';
      const rawPhone = phoneIdx !== -1 ? (row[phoneIdx] || '').trim() : '';
      const rawCandles = candlesIdx !== -1 ? (row[candlesIdx] || '').trim() : '';
      const rawLikes = likesIdx !== -1 ? (row[likesIdx] || '').trim() : '';
      const rawAge = ageIdx !== -1 ? (row[ageIdx] || '').trim() : '';
      const rawDay = dayIdx !== -1 ? (row[dayIdx] || '').trim() : '';
      const rawMonth = monthIdx !== -1 ? (row[monthIdx] || '').trim() : '';

      const rawNameHe = nameHeIdx !== -1 ? row[nameHeIdx] : undefined;
      const rawNameEn = nameEnIdx !== -1 ? row[nameEnIdx] : undefined;
      const rawNameRu = nameRuIdx !== -1 ? row[nameRuIdx] : undefined;

      const rawFatherHe = fatherHeIdx !== -1 ? row[fatherHeIdx] : undefined;
      const rawFatherEn = fatherEnIdx !== -1 ? row[fatherEnIdx] : undefined;
      const rawFatherRu = fatherRuIdx !== -1 ? row[fatherRuIdx] : undefined;

      const rawMotherHe = motherHeIdx !== -1 ? row[motherHeIdx] : undefined;
      const rawMotherEn = motherEnIdx !== -1 ? row[motherEnIdx] : undefined;
      const rawMotherRu = motherRuIdx !== -1 ? row[motherRuIdx] : undefined;

      const rawNotesHe = notesHeIdx !== -1 ? row[notesHeIdx] : undefined;
      const rawNotesEn = notesEnIdx !== -1 ? row[notesEnIdx] : undefined;
      const rawNotesRu = notesRuIdx !== -1 ? row[notesRuIdx] : undefined;

      if (!rawName) continue; // skip empty names

      // Parse ID integer
      let parsedId: number | undefined = undefined;
      if (rawIdStr) {
        const clean = String(rawIdStr).replace(/\D/g, '');
        if (clean) {
          const p = parseInt(clean, 10);
          if (!isNaN(p) && p > 0) parsedId = p;
        }
      }
      const finalId = parsedId || (Date.now() + Math.floor(Math.random() * 1000000) + index);

      let parsedCandles = 0;
      if (rawCandles) {
        const clean = String(rawCandles).replace(/\D/g, '');
        if (clean) { const p = parseInt(clean, 10); if (!isNaN(p)) parsedCandles = p; }
      }

      let parsedLikes = 0;
      if (rawLikes) {
        const clean = String(rawLikes).replace(/\D/g, '');
        if (clean) { const p = parseInt(clean, 10); if (!isNaN(p)) parsedLikes = p; }
      }

      let parsedAge: number | undefined = undefined;
      if (rawAge) {
        const clean = String(rawAge).replace(/\D/g, '');
        if (clean) { const p = parseInt(clean, 10); if (!isNaN(p)) parsedAge = p; }
      }

      let gender: Gender = 'male';
      if (
        rawGender.includes('female') || 
        rawGender.includes('נקבה') || 
        rawGender.includes('נ') || 
        rawGender.includes('f') || 
        rawGender.includes('בת') || 
        rawGender.includes('жен') ||
        rawGender.includes('ж')
      ) {
        gender = 'female';
      }

      let dayNum = 1;
      const dayDigits = rawDay.replace(/\D/g, '');
      if (dayDigits) {
        const parsed = parseInt(dayDigits, 10);
        if (!isNaN(parsed) && parsed >= 1 && parsed <= 30) dayNum = parsed;
      } else if (rawHebrewDate || rawPassDate) {
        const match = (rawHebrewDate || rawPassDate).match(/\b([1-9]|[12][0-9]|30)\b/);
        if (match) dayNum = parseInt(match[1], 10);
      }

      let normalizedMonth = 'תשרי';
      if (rawMonth) {
        normalizedMonth = normalizeMonthName(rawMonth);
      } else if (rawHebrewDate || rawPassDate) {
        normalizedMonth = normalizeMonthName(rawHebrewDate || rawPassDate);
      }

      const hebrewDateVal = rawHebrewDate || `${dayNum} ${normalizedMonth}`;
      const passDateVal = rawPassDate || hebrewDateVal;
      const bioVal = rawBio || rawNotes || '-';
      const imgVal = rawImageUrl || rawPhotoUrl || rawImage || '-';

      const newItem: Deceased = {
        id: Number(finalId),
        name: rawName,
        gender,
        fatherName: sanitizeParentName(rawFather) || '-',
        motherName: sanitizeParentName(rawMother) || '-',
        day: dayNum,
        month: normalizedMonth,
        hebrewDate: hebrewDateVal,
        passDate: passDateVal,
        birthDate: rawBirthDate || undefined,
        contactPhone: rawPhone || undefined,
        notes: bioVal,
        bio: bioVal,
        image: imgVal,
        imageUrl: imgVal,
        photoUrl: imgVal,
        photo: imgVal,
        imagePosition: (rawImagePos as any) || undefined,
        candlesCount: Number(parsedCandles),
        likesCount: Number(parsedLikes),
        ageAtDeath: parsedAge,
        nameHe: rawNameHe,
        nameEn: rawNameEn,
        nameRu: rawNameRu,
        fatherNameHe: rawFatherHe,
        fatherNameEn: rawFatherEn,
        fatherNameRu: rawFatherRu,
        motherNameHe: rawMotherHe,
        motherNameEn: rawMotherEn,
        motherNameRu: rawMotherRu,
        notesHe: rawNotesHe,
        notesEn: rawNotesEn,
        notesRu: rawNotesRu
      };

      result.push(newItem);
    }

    return result;
  };

  const handleImportText = () => {
    if (!pasteText.trim()) {
      setFeedback({ type: 'error', message: lang === 'he' ? 'אנא הדבק טקסט קודם כל' : 'Please paste some text first' });
      return;
    }

    const trimmed = pasteText.trim();
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        const arrayToProcess = Array.isArray(parsed) ? parsed : [parsed];
        const importedList: Deceased[] = arrayToProcess.map((item, idx) => {
          const img = item.imageUrl || item.image || item.photoUrl || item.photo || item.image_url || item.photo_url || undefined;
          const bioVal = item.bio || item.notes || item.story || undefined;
          const hebDate = item.hebrewDate || item.hebrew_date || (item.day && item.month ? `${item.day} ${item.month}` : undefined);
          const passDateVal = item.passDate || item.pass_date || hebDate;

          return {
            id: Number(item.id || Date.now() + idx),
            name: String(item.name || item.nameHe || item.nameEn || item.nameRu || '').trim(),
            gender: (String(item.gender || '').toLowerCase().includes('f') || String(item.gender || '').includes('נקבה') ? 'female' : 'male') as Gender,
            fatherName: sanitizeParentName(item.fatherName || item.father_name || item.fatherNameHe || ''),
            motherName: sanitizeParentName(item.motherName || item.mother_name || item.motherNameHe || ''),
            day: Number(item.day || 1),
            month: normalizeMonthName(item.month || 'תשרי'),
            hebrewDate: hebDate,
            passDate: passDateVal,
            contactPhone: item.contactPhone || item.phone || undefined,
            notes: bioVal,
            bio: bioVal,
            image: img,
            imageUrl: img,
            photoUrl: img,
            photo: img,
            candlesCount: item.candlesCount ? Number(item.candlesCount) : 0,
            ageAtDeath: item.ageAtDeath ? Number(item.ageAtDeath) : undefined,
            birthDate: item.birthDate || undefined,
            nameHe: item.nameHe,
            nameEn: item.nameEn,
            nameRu: item.nameRu,
            fatherNameHe: item.fatherNameHe,
            fatherNameEn: item.fatherNameEn,
            fatherNameRu: item.fatherNameRu,
            motherNameHe: item.motherNameHe,
            motherNameEn: item.motherNameEn,
            motherNameRu: item.motherNameRu,
            notesHe: item.notesHe,
            notesEn: item.notesEn,
            notesRu: item.notesRu
          };
        }).filter(item => Boolean(item.name));

        if (importedList.length > 0) {
          onImport(importedList);
          setPasteText('');
          setFeedback({ 
            type: 'success', 
            message: t.importSuccess.replace('{count}', importedList.length.toString()) 
          });
          return;
        }
      } catch (e) {}
    }

    try {
      const rows = parseCSV(pasteText);
      const importedList = processLines(rows);

      if (importedList.length === 0) {
        setFeedback({ 
          type: 'error', 
          message: lang === 'he' ? 'לא נמצאו שורות תקינות לייבוא. אנא ודא שהמבנה נכון ושיום הפטירה הוא מספר בין 1 ל-30.' : 'No valid lines found for import. Ensure day is between 1 and 30.' 
        });
        return;
      }

      onImport(importedList);
      setPasteText('');
      setFeedback({ 
        type: 'success', 
        message: t.importSuccess.replace('{count}', importedList.length.toString()) 
      });
    } catch (err) {
      setFeedback({ type: 'error', message: t.importError });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    readAndProcessFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const readAndProcessFile = (file: File) => {
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    if (fileExtension === 'json') {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const text = event.target?.result as string;
          const parsed = JSON.parse(text);
          const arrayToProcess = Array.isArray(parsed) ? parsed : [parsed];
          const importedList: Deceased[] = arrayToProcess.map((item, idx) => ({
            id: Number(item.id || Date.now() + idx),
            name: String(item.name || item.nameHe || item.nameEn || item.nameRu || ''),
            gender: (item.gender === 'female' ? 'female' : 'male') as Gender,
            fatherName: sanitizeParentName(item.fatherName || ''),
            motherName: sanitizeParentName(item.motherName || ''),
            day: Number(item.day || 1),
            month: normalizeMonthName(item.month || 'תשרי'),
            contactPhone: item.contactPhone || undefined,
            notes: item.notes || undefined,
            image: item.image || item.imageUrl || item.photoUrl || item.photo || undefined,
            imageUrl: item.image || item.imageUrl || item.photoUrl || item.photo || undefined,
            photoUrl: item.image || item.imageUrl || item.photoUrl || item.photo || undefined,
            photo: item.image || item.imageUrl || item.photoUrl || item.photo || undefined,
            ageAtDeath: item.ageAtDeath ? Number(item.ageAtDeath) : undefined,
            birthDate: item.birthDate || undefined,
            nameHe: item.nameHe,
            nameEn: item.nameEn,
            nameRu: item.nameRu,
            fatherNameHe: item.fatherNameHe,
            fatherNameEn: item.fatherNameEn,
            fatherNameRu: item.fatherNameRu,
            motherNameHe: item.motherNameHe,
            motherNameEn: item.motherNameEn,
            motherNameRu: item.motherNameRu,
            notesHe: item.notesHe,
            notesEn: item.notesEn,
            notesRu: item.notesRu
          })).filter(item => Boolean(item.name));

          if (importedList.length === 0) {
            setFeedback({ 
              type: 'error', 
              message: lang === 'he' ? 'לא נמצאו נתונים תקינים בקובץ ה-JSON.' : 'No valid records found in the JSON file.' 
            });
            return;
          }

          onImport(importedList);
          setFeedback({ 
            type: 'success', 
            message: t.importSuccess.replace('{count}', importedList.length.toString()) 
          });
        } catch (err) {
          setFeedback({ type: 'error', message: t.importError });
        }
      };
      reader.readAsText(file);
      return;
    }

    if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
          
          // Convert cell values to string arrays
          const stringRows = rows.map(r => 
            Array.isArray(r) 
              ? r.map(cell => cell !== undefined && cell !== null ? String(cell).trim() : '')
              : []
          );
          
          const importedList = processLines(stringRows);
          if (importedList.length === 0) {
            setFeedback({ 
              type: 'error', 
              message: lang === 'he' ? 'לא נמצאו שורות תקינות בקובץ האקסל. ודא שהמבנה תקין (שם, מין, שם אב, שם אם, יום פטירה, חודש עברי, טלפון, הערות)' : 'No valid records found in the Excel file.' 
            });
            return;
          }

          onImport(importedList);
          setFeedback({ 
            type: 'success', 
            message: t.importSuccess.replace('{count}', importedList.length.toString()) 
          });
        } catch (err) {
          console.error("Excel processing error:", err);
          setFeedback({ type: 'error', message: t.importError });
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      // Treat as CSV / Text
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const text = event.target?.result as string;
          const rows = parseCSV(text);
          const importedList = processLines(rows);

          if (importedList.length === 0) {
            setFeedback({ 
              type: 'error', 
              message: lang === 'he' ? 'לא נמצאו שורות תקינות בקובץ.' : 'No valid records found in the file.' 
            });
            return;
          }

          onImport(importedList);
          setFeedback({ 
            type: 'success', 
            message: t.importSuccess.replace('{count}', importedList.length.toString()) 
          });
        } catch (err) {
          setFeedback({ type: 'error', message: t.importError });
        }
      };
      reader.readAsText(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      readAndProcessFile(e.dataTransfer.files[0]);
    }
  };

  // Excel exporting function (Single language data content with strict Supabase English headers)
  const handleExportExcel = () => {
    if (!deceasedList || deceasedList.length === 0) {
      setFeedback({ 
        type: 'error', 
        message: lang === 'he' ? 'אין נתונים לייצוא מהמערכת' : 'No data to export from system' 
      });
      return;
    }

    try {
      const workbook = XLSX.utils.book_new();
      const headers = CANONICAL_EXCEL_CSV_HEADERS;
      
      const translatedList = translateDeceasedListClientSide(deceasedList, lang);
      const rows = translatedList.map(item => {
        const hebDate = item.hebrewDate || (item.day && item.month ? `${item.day} ${item.month}` : '');
        const pDate = item.passDate || hebDate;
        const bioText = item.bio || item.notes || '';
        const imgUrl = item.imageUrl || item.image || item.photoUrl || item.photo || '';

        return [
          item.id || '',
          item.name || '',
          item.gender || 'male',
          item.fatherName || '',
          item.motherName || '',
          pDate,
          hebDate,
          item.birthDate || '',
          bioText,
          item.notes || bioText,
          imgUrl,
          imgUrl,
          imgUrl,
          item.imagePosition || 'center',
          item.contactPhone || '',
          item.candlesCount !== undefined ? item.candlesCount : 0,
          item.likesCount !== undefined ? item.likesCount : 0,
          item.ageAtDeath !== undefined ? item.ageAtDeath : '',
          item.nameHe || '',
          item.nameEn || '',
          item.nameRu || '',
          item.fatherNameHe || '',
          item.fatherNameEn || '',
          item.fatherNameRu || '',
          item.motherNameHe || '',
          item.motherNameEn || '',
          item.motherNameRu || '',
          item.notesHe || '',
          item.notesEn || '',
          item.notesRu || ''
        ];
      });

      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      XLSX.utils.book_append_sheet(workbook, ws, 'Deceased Database');

      const fileName = `eternal_memorial_database_${lang}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      setFeedback({
        type: 'success',
        message: lang === 'he' 
          ? `קובץ Excel הורד בהצלחה (${deceasedList.length} רשומות)!`
          : lang === 'ru'
          ? `Файл Excel успешно скачан (${deceasedList.length} записей)!`
          : `Excel database file downloaded successfully (${deceasedList.length} records)!`
      });
    } catch (err: any) {
      console.error("Excel export error:", err);
      setFeedback({
        type: 'error',
        message: lang === 'he' 
          ? `שגיאה בייצוא אקסל: ${err?.message || 'אנא נסה שוב'}`
          : `Error exporting Excel: ${err?.message || 'Please try again'}`
      });
    }
  };

  // Download sample CSV template matching exact Supabase schema (30 canonical English headers)
  const handleDownloadCsvSample = () => {
    const headers = CANONICAL_EXCEL_CSV_HEADERS;
    
    let sampleRows: string[][] = [];
    if (lang === 'he') {
      sampleRows = [
        ['1', 'משה כהן', 'male', 'אברהם', 'שרה', '15 תשרי 5784', '15 תשרי', '01/01/1940', 'סבא יקר ואהוב', 'סבא יקר ואהוב', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400', 'center', '050-1234567', '0', '0', '84', 'משה כהן', 'Moshe Cohen', 'Моше Коэн', 'אברהם', 'Avraham', 'Авраам', 'שרה', 'Sarah', 'Сарра', 'סבא יקר ואהוב', 'Beloved grandfather', 'Дорогой дедушка'],
        ['2', 'רחל לוי', 'female', 'יצחק', 'רבקה', '10 ניסן 5780', '10 ניסן', '15/05/1945', 'אמא מסורה ואהובה', 'אמא מסורה ואהובה', 'https://images.unsplash.com/photo-1554151228-14d9def656e4?w=400', 'https://images.unsplash.com/photo-1554151228-14d9def656e4?w=400', 'https://images.unsplash.com/photo-1554151228-14d9def656e4?w=400', 'center', '052-7654321', '0', '0', '75', 'רחל לוי', 'Rachel Levi', 'Рахель Леви', 'יצחק', 'Yitzhak', 'Ицхак', 'רבקה', 'Rivka', 'Ривка', 'אמא מסורה ואהובה', 'Devoted mother', 'Преданная мама']
      ];
    } else if (lang === 'ru') {
      sampleRows = [
        ['1', 'Моше Коэн', 'male', 'Авраам', 'Сарра', '15 Тишрей 5784', '15 Тишрей', '01/01/1940', 'Дорогой дедушка', 'Дорогой дедушка', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400', 'center', '+972-50-1234567', '0', '0', '84', 'משה כהן', 'Moshe Cohen', 'Моше Коэн', 'אברהם', 'Avraham', 'Авраам', 'שרה', 'Sarah', 'Сарра', 'סבא יקר ואהוב', 'Beloved grandfather', 'Дорогой дедушка'],
        ['2', 'Рахель Леви', 'female', 'Ицхак', 'Ривка', '10 Нисан 5780', '10 Нисан', '15/05/1945', 'Преданная мама', 'Преданная мама', 'https://images.unsplash.com/photo-1554151228-14d9def656e4?w=400', 'https://images.unsplash.com/photo-1554151228-14d9def656e4?w=400', 'https://images.unsplash.com/photo-1554151228-14d9def656e4?w=400', 'center', '+972-52-7654321', '0', '0', '75', 'רחל לוי', 'Rachel Levi', 'Рахель Леви', 'יצחק', 'Yitzhak', 'Ицхак', 'רבקה', 'Rivka', 'Ривка', 'אמא מסורה ואהובה', 'Devoted mother', 'Преданная мама']
      ];
    } else {
      sampleRows = [
        ['1', 'Moshe Cohen', 'male', 'Avraham', 'Sarah', '15 Tishrei 5784', '15 Tishrei', '01/01/1940', 'Beloved grandfather', 'Beloved grandfather', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400', 'center', '+972-50-1234567', '0', '0', '84', 'משה כהן', 'Moshe Cohen', 'Моше Коэн', 'אברהם', 'Avraham', 'Авраам', 'שרה', 'Sarah', 'Сарра', 'סבא יקר ואהוב', 'Beloved grandfather', 'Дорогой дедушка'],
        ['2', 'Rachel Levi', 'female', 'Yitzhak', 'Rivka', '10 Nisan 5780', '10 Nisan', '15/05/1945', 'Devoted mother', 'Devoted mother', 'https://images.unsplash.com/photo-1554151228-14d9def656e4?w=400', 'https://images.unsplash.com/photo-1554151228-14d9def656e4?w=400', 'https://images.unsplash.com/photo-1554151228-14d9def656e4?w=400', 'center', '+972-52-7654321', '0', '0', '75', 'רחל לוי', 'Rachel Levi', 'Рахель Леви', 'יצחק', 'Yitzhak', 'Ицхак', 'רבקה', 'Rivka', 'Ривка', 'אמא מסורה ואהובה', 'Devoted mother', 'Преданная мама']
      ];
    }

    const escapeCell = (str: string) => `"${str.replace(/"/g, '""')}"`;
    const csvLines = [
      headers.map(escapeCell).join(','),
      ...sampleRows.map(row => row.map(escapeCell).join(','))
    ];

    const fullCsv = '\uFEFF' + csvLines.join('\r\n');
    const blob = new Blob([fullCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `eternal_memorial_sample_template_${lang}.csv`;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      if (document.body.contains(link)) document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 1000);
  };

  // Download sample Excel template matching exact Supabase schema (30 canonical English headers)
  const handleDownloadExcelSample = () => {
    const headers = CANONICAL_EXCEL_CSV_HEADERS;
    
    let sampleRows: string[][] = [];
    if (lang === 'he') {
      sampleRows = [
        ['1', 'משה כהן', 'male', 'אברהם', 'שרה', '15 תשרי 5784', '15 תשרי', '01/01/1940', 'סבא יקר ואהוב', 'סבא יקר ואהוב', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400', 'center', '050-1234567', '0', '0', '84', 'משה כהן', 'Moshe Cohen', 'Моше Коэн', 'אברהם', 'Avraham', 'Авраам', 'שרה', 'Sarah', 'Сарра', 'סבא יקר ואהוב', 'Beloved grandfather', 'Дорогой дедушка'],
        ['2', 'רחל לוי', 'female', 'יצחק', 'רבקה', '10 ניסן 5780', '10 ניסן', '15/05/1945', 'אמא מסורה ואהובה', 'אמא מסורה ואהובה', 'https://images.unsplash.com/photo-1554151228-14d9def656e4?w=400', 'https://images.unsplash.com/photo-1554151228-14d9def656e4?w=400', 'https://images.unsplash.com/photo-1554151228-14d9def656e4?w=400', 'center', '052-7654321', '0', '0', '75', 'רחל לוי', 'Rachel Levi', 'Рахель Леви', 'יצחק', 'Yitzhak', 'Ицхак', 'רבקה', 'Rivka', 'Ривка', 'אמא מסורה ואהובה', 'Devoted mother', 'Преданная мама']
      ];
    } else if (lang === 'ru') {
      sampleRows = [
        ['1', 'Моше Коэн', 'male', 'Авраам', 'Сарра', '15 Тишрей 5784', '15 Тишрей', '01/01/1940', 'Дорогой дедушка', 'Дорогой дедушка', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400', 'center', '+972-50-1234567', '0', '0', '84', 'משה כהן', 'Moshe Cohen', 'Моше Коэн', 'אברהם', 'Avraham', 'Авраам', 'שרה', 'Sarah', 'Сарра', 'סבא יקר ואהוב', 'Beloved grandfather', 'Дорогой дедушка'],
        ['2', 'Рахель Леви', 'female', 'Ицхак', 'Ривка', '10 Нисан 5780', '10 Нисан', '15/05/1945', 'Преданная мама', 'Преданная мама', 'https://images.unsplash.com/photo-1554151228-14d9def656e4?w=400', 'https://images.unsplash.com/photo-1554151228-14d9def656e4?w=400', 'https://images.unsplash.com/photo-1554151228-14d9def656e4?w=400', 'center', '+972-52-7654321', '0', '0', '75', 'רחל לוי', 'Rachel Levi', 'Рахель Леви', 'יצחק', 'Yitzhak', 'Ицхак', 'רבקה', 'Rivka', 'Ривка', 'אמא מסורה ואהובה', 'Devoted mother', 'Преданная мама']
      ];
    } else {
      sampleRows = [
        ['1', 'Moshe Cohen', 'male', 'Avraham', 'Sarah', '15 Tishrei 5784', '15 Tishrei', '01/01/1940', 'Beloved grandfather', 'Beloved grandfather', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400', 'center', '+972-50-1234567', '0', '0', '84', 'משה כהן', 'Moshe Cohen', 'Моше Коэн', 'אברהם', 'Avraham', 'Авраам', 'שרה', 'Sarah', 'Сарра', 'סבא יקר ואהוב', 'Beloved grandfather', 'Дорогой дедушка'],
        ['2', 'Rachel Levi', 'female', 'Yitzhak', 'Rivka', '10 Nisan 5780', '10 Nisan', '15/05/1945', 'Devoted mother', 'Devoted mother', 'https://images.unsplash.com/photo-1554151228-14d9def656e4?w=400', 'https://images.unsplash.com/photo-1554151228-14d9def656e4?w=400', 'https://images.unsplash.com/photo-1554151228-14d9def656e4?w=400', 'center', '+972-52-7654321', '0', '0', '75', 'רחל לוי', 'Rachel Levi', 'Рахель Леви', 'יצחק', 'Yitzhak', 'Ицхак', 'רבקה', 'Rivka', 'Ривка', 'אמא מסורה ואהובה', 'Devoted mother', 'Преданная мама']
      ];
    }

    const workbook = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
    XLSX.utils.book_append_sheet(workbook, ws, 'Sample Template');
    XLSX.writeFile(workbook, `eternal_memorial_sample_template_${lang}.xlsx`);
  };

  return (
    <div id="bulk-import-panel" className="bg-[#131a26] border border-[#c8a96e]/30 rounded-xl p-6 text-[#f0f4f8] shadow-lg">
      {/* Panel Header */}
      <div className="border-b border-[#c8a96e]/15 pb-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Upload className="w-6 h-6 text-[#c8a96e]" />
            <div>
              <h3 className="text-xl font-serif font-bold text-[#c8a96e]">
                {t.importTitle}
              </h3>
              <p className="text-xs text-gray-400 font-sans mt-0.5">
                {lang === 'he' 
                  ? `ניהול, יבוא וייצוא רשומות הנפטרים (${deceasedList.length} נפטרים במאגר)`
                  : `Manage, import, and export memorial database records (${deceasedList.length} records in database)`}
              </p>
            </div>
          </div>

          {/* Clean, dedicated Export Action Box */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Excel Export Button */}
            <button
              type="button"
              onClick={handleExportExcel}
              className="text-xs font-semibold text-emerald-300 hover:text-emerald-100 flex items-center gap-2 bg-emerald-950/60 hover:bg-emerald-900/80 px-3.5 py-2 rounded-lg border border-emerald-500/50 hover:border-emerald-400 transition-all font-sans cursor-pointer shadow-md"
              title={lang === 'he' ? 'הורדה ב-Excel' : lang === 'ru' ? 'Скачать Excel' : 'Download Excel'}
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>{lang === 'he' ? 'הורדה ב-Excel' : lang === 'ru' ? 'Скачать Excel' : 'Download Excel'}</span>
            </button>

            {/* CSV Export Button */}
            <button
              type="button"
              onClick={() => {
                if (!deceasedList || deceasedList.length === 0) {
                  setFeedback({
                    type: 'error',
                    message: lang === 'he' ? 'אין נתונים במאגר להורדה' : 'No records in database to export'
                  });
                  return;
                }
                exportSingleLanguageCsv(deceasedList, lang);
                setFeedback({
                  type: 'success',
                  message: lang === 'he' 
                    ? `קובץ CSV הורד בהצלחה (${deceasedList.length} רשומות)!`
                    : lang === 'ru'
                    ? `Файл CSV успешно скачан (${deceasedList.length} записей)!`
                    : `CSV file downloaded successfully (${deceasedList.length} records)!`
                });
              }}
              className="text-xs font-semibold text-sky-300 hover:text-sky-100 flex items-center gap-2 bg-sky-950/60 hover:bg-sky-900/80 px-3.5 py-2 rounded-lg border border-sky-500/50 hover:border-sky-400 transition-all font-sans cursor-pointer shadow-md"
              title={lang === 'he' ? 'הורדה ב-CSV' : lang === 'ru' ? 'Скачать CSV' : 'Download CSV'}
            >
              <FileText className="w-4 h-4 text-sky-400" />
              <span>{lang === 'he' ? 'הורדה ב-CSV' : lang === 'ru' ? 'Скачать CSV' : 'Download CSV'}</span>
            </button>

            {/* Smart Clean Duplicates Button */}
            {onCleanDuplicates && (
              <button
                type="button"
                onClick={onCleanDuplicates}
                className="text-xs font-medium text-amber-300 hover:text-amber-100 flex items-center gap-1.5 bg-amber-950/40 hover:bg-amber-900/60 px-3 py-2 rounded-lg border border-amber-500/40 hover:border-amber-400 transition-all font-sans cursor-pointer"
                title={lang === 'he' ? 'זיהוי וניקוי כפילויות חכם במאגר הנפטרים' : 'Smart deduplicate database records'}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>{lang === 'he' ? 'ניקוי כפילויות' : lang === 'ru' ? 'Удалить дубликаты' : 'Clean Duplicates'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Feedback Messages */}
      {feedback.type && (
        <div className={`p-4 rounded-lg mb-6 flex items-start gap-3 border text-sm animate-fadeIn ${
          feedback.type === 'success' 
            ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-200' 
            : 'bg-red-950/50 border-red-500/40 text-red-200'
        }`}>
          {feedback.type === 'success' ? (
            <CheckCircle className="w-5 h-5 shrink-0 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-5 h-5 shrink-0 text-red-400" />
          )}
          <p className="font-sans font-medium">{feedback.message}</p>
        </div>
      )}

      <div className="space-y-6">
        {/* CSV/Excel File Upload Option */}
        <div className="font-sans">
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <label className="text-xs uppercase tracking-wider text-[#c8a96e] font-semibold">
              {lang === 'he' ? 'אפשרות 1: העלאת קובץ Excel / CSV (מומלץ ביותר)' : lang === 'ru' ? 'Вариант 1: Загрузить файл Excel / CSV (Рекомендуется)' : 'Option 1: Upload Excel / CSV File (Recommended)'}
            </label>
            {/* Download Sample Template Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadExcelSample}
                className="text-xs text-emerald-300 hover:text-emerald-100 flex items-center gap-1 bg-emerald-950/50 hover:bg-emerald-900/70 px-2.5 py-1 rounded border border-emerald-700/60 hover:border-emerald-500 transition-all cursor-pointer"
                title={lang === 'he' ? 'הורדת קובץ Excel לדוגמה' : lang === 'ru' ? 'Скачать образец Excel' : 'Download sample Excel template'}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>{lang === 'he' ? 'הורד דוגמה (Excel)' : lang === 'ru' ? 'Скачать образец (Excel)' : 'Download Sample (Excel)'}</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadCsvSample}
                className="text-xs text-sky-300 hover:text-sky-100 flex items-center gap-1 bg-sky-950/50 hover:bg-sky-900/70 px-2.5 py-1 rounded border border-sky-700/60 hover:border-sky-500 transition-all cursor-pointer"
                title={lang === 'he' ? 'הורדת קובץ CSV לדוגמה' : lang === 'ru' ? 'Скачать образец CSV' : 'Download sample CSV template'}
              >
                <Download className="w-3.5 h-3.5 text-sky-400" />
                <span>{lang === 'he' ? 'הורד דוגמה (CSV)' : lang === 'ru' ? 'Скачать образец (CSV)' : 'Download Sample (CSV)'}</span>
              </button>
            </div>
          </div>

          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`w-full h-32 border-2 border-dashed rounded-lg flex flex-col items-center justify-center p-4 cursor-pointer text-center transition-all ${
              dragActive 
                ? 'border-[#c8a96e] bg-[#c8a96e]/10' 
                : 'border-[#c8a96e]/30 hover:border-[#c8a96e]/60 bg-[#0d0d0d] hover:bg-[#c8a96e]/5'
            }`}
          >
            <Upload className="w-8 h-8 text-[#c8a96e]/60 group-hover:text-[#c8a96e] mb-2" />
            <p className="text-xs text-gray-300 font-medium mb-1">
              {lang === 'he' ? 'גרור ושחרר קובץ Excel או CSV כאן או לחץ לבחירת קובץ' : 'Drag & drop Excel or CSV file here or click to browse'}
            </p>
            <span className="text-[10px] text-gray-500 max-w-sm leading-tight">
              {lang === 'he' 
                ? 'תומך בקבצי .xlsx, .xls ו-.csv (עמודות: id, name, gender, fatherName, motherName, passDate, hebrewDate, bio, imageUrl, candlesCount)' 
                : lang === 'ru'
                ? 'Поддерживает файлы .xlsx, .xls и .csv (колонки: id, name, gender, fatherName, motherName, passDate, hebrewDate, bio, imageUrl, candlesCount)'
                : 'Supports .xlsx, .xls, and .csv formats (columns: id, name, gender, fatherName, motherName, passDate, hebrewDate, bio, imageUrl, candlesCount)'}
            </span>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".csv,.xlsx,.xls"
              className="hidden"
            />
          </div>
        </div>

        <div className="flex items-center my-4 font-sans">
          <div className="flex-1 border-t border-[#c8a96e]/10"></div>
          <span className="px-3 text-xs text-gray-500 font-semibold uppercase">{lang === 'he' ? 'או' : 'OR'}</span>
          <div className="flex-1 border-t border-[#c8a96e]/10"></div>
        </div>

        {/* Text Area Quick Paste Option */}
        <div className="font-sans">
          <label className="block text-xs uppercase tracking-wider text-[#c8a96e] mb-2 font-semibold">
            {t.bulkPasteLabel}
          </label>
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder={t.bulkPastePlaceholder}
            rows={5}
            className="w-full bg-[#0d0d0d] border border-[#c8a96e]/30 focus:border-[#c8a96e] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 outline-none transition-all font-mono resize-none leading-relaxed"
          />
          <button
            type="button"
            onClick={handleImportText}
            className="mt-3 w-full bg-[#c8a96e]/10 hover:bg-[#c8a96e]/20 border border-[#c8a96e]/40 hover:border-[#c8a96e] text-[#c8a96e] font-semibold py-2 px-4 rounded-lg transition-all text-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Clipboard className="w-4 h-4" />
            {t.importButton}
          </button>
        </div>
      </div>
    </div>
  );
};
