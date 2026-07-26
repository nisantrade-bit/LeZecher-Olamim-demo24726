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
import { downloadDeceasedCsv, exportCombined3LanguageCsv } from '../utils/csvExport';
import { translateDeceasedListClientSide } from '../utils/transliteration';

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

    let nameIdx = 0;
    let genderIdx = 1;
    let fatherIdx = 2;
    let motherIdx = 3;
    let dayIdx = 4;
    let monthIdx = 5;
    let phoneIdx = 6;
    let notesIdx = 7;

    let startRow = 0;

    // Check if row 0 is a header row
    const firstRow = rows[0] || [];
    const firstRowStr = firstRow.map(c => (c || '').toLowerCase().trim()).join(' ');

    const isHeaderRow = firstRowStr.includes('name') || 
                        firstRowStr.includes('שם') || 
                        firstRowStr.includes('имя') || 
                        firstRowStr.includes('fio') ||
                        firstRowStr.includes('фио') ||
                        firstRowStr.includes('пол') ||
                        firstRowStr.includes('gender') ||
                        firstRowStr.includes('מין') ||
                        firstRowStr.includes('יום') ||
                        firstRowStr.includes('day') ||
                        firstRowStr.includes('день');

    if (isHeaderRow) {
      startRow = 1; // skip header row
      // Try to dynamically match columns if header names exist
      firstRow.forEach((cell, idx) => {
        const c = (cell || '').toLowerCase().trim();
        if ((c.includes('full name') || c.includes('שם מלא') || c.includes('полное имя') || c.includes('фио') || c === 'name' || c === 'שם' || c === 'имя') && !c.includes('father') && !c.includes('mother') && !c.includes('אב') && !c.includes('אם') && !c.includes('отца') && !c.includes('матери')) {
          nameIdx = idx;
        } else if (c.includes('gender') || c.includes('sex') || c.includes('מין') || c.includes('пол')) {
          genderIdx = idx;
        } else if (c.includes('father') || c.includes('אב') || c.includes('отца') || c.includes('отец') || c.includes('родитель')) {
          fatherIdx = idx;
        } else if (c.includes('mother') || c.includes('אם') || c.includes('מאת') || c.includes('матери') || c.includes('мать')) {
          motherIdx = idx;
        } else if (c.includes('day') || c.includes('יום') || c.includes('день')) {
          dayIdx = idx;
        } else if (c.includes('month') || c.includes('חודש') || c.includes('месяц')) {
          monthIdx = idx;
        } else if (c.includes('phone') || c.includes('contact') || c.includes('טלפון') || c.includes('телефон') || c.includes('контакт')) {
          phoneIdx = idx;
        } else if (c.includes('notes') || c.includes('story') || c.includes('הערות') || c.includes('סיפור') || c.includes('история') || c.includes('примечания') || c.includes('описание')) {
          notesIdx = idx;
        }
      });
    }

    const result: Deceased[] = [];

    for (let index = startRow; index < rows.length; index++) {
      const row = rows[index];
      if (!row || row.length === 0) continue;

      const rawName = row[nameIdx] || '';
      const rawGender = (row[genderIdx] || '').toLowerCase().trim();
      const rawFather = row[fatherIdx] || '';
      const rawMother = row[motherIdx] || '';
      const rawDay = row[dayIdx] || '';
      const rawMonth = row[monthIdx] || '';
      const rawPhone = row[phoneIdx] || '';
      const rawNotes = row[notesIdx] || '';

      if (!rawName.trim()) continue; // skip rows with empty name

      // Normalize gender
      let gender: Gender = 'male';
      if (
        rawGender.includes('female') || 
        rawGender.includes('נקבה') || 
        rawGender.includes('נ') || 
        rawGender.includes('f') || 
        rawGender.includes('בת') || 
        rawGender.includes('жен') ||
        rawGender.includes('женщина') ||
        rawGender.includes('ж') ||
        rawGender.includes('woman')
      ) {
        gender = 'female';
      }

      // Parse and validate day
      const dayDigits = rawDay.replace(/\D/g, '');
      const dayNum = parseInt(dayDigits, 10);
      if (isNaN(dayNum) || dayNum < 1 || dayNum > 30) continue; // skip invalid days

      // Normalize month name
      if (!rawMonth.trim()) continue; // skip rows without month
      const normalizedMonth = normalizeMonthName(rawMonth);

      result.push({
        id: Date.now() + Math.floor(Math.random() * 1000000) + index,
        name: rawName.trim(),
        gender,
        fatherName: sanitizeParentName(rawFather),
        motherName: sanitizeParentName(rawMother),
        day: dayNum,
        month: normalizedMonth,
        contactPhone: rawPhone.trim() || undefined,
        notes: rawNotes.trim() || undefined
      });
    }

    return result;
  };

  const handleImportText = () => {
    if (!pasteText.trim()) {
      setFeedback({ type: 'error', message: lang === 'he' ? 'אנא הדבק טקסט קודם כל' : 'Please paste some text first' });
      return;
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

  // Excel exporting function (Multi-sheet with Hebrew, English, Russian)
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

      // 1. Hebrew Sheet
      const listHe = translateDeceasedListClientSide(deceasedList, 'he');
      const headersHe = ['שם מלא', 'מין (male/female)', 'שם האב/הורה', 'שם האם', 'יום עברי (1-30)', 'חודש עברי', 'טלפון קשר', 'סיפור חיים והערות'];
      const rowsHe = listHe.map(item => [item.name || '', item.gender || 'male', item.fatherName || '', item.motherName || '', item.day || 1, item.month || 'תשרי', item.contactPhone || '', item.notes || '']);
      const wsHe = XLSX.utils.aoa_to_sheet([headersHe, ...rowsHe]);
      XLSX.utils.book_append_sheet(workbook, wsHe, 'Hebrew עברית');

      // 2. English Sheet
      const listEn = translateDeceasedListClientSide(deceasedList, 'en');
      const headersEn = ['Full Name', 'Gender (male/female)', 'Father/Parent Name', 'Mother Name', 'Hebrew Day (1-30)', 'Hebrew Month', 'Contact Phone', 'Life Story & Notes'];
      const rowsEn = listEn.map(item => [item.name || '', item.gender || 'male', item.fatherName || '', item.motherName || '', item.day || 1, item.month || 'Tishrei', item.contactPhone || '', item.notes || '']);
      const wsEn = XLSX.utils.aoa_to_sheet([headersEn, ...rowsEn]);
      XLSX.utils.book_append_sheet(workbook, wsEn, 'English');

      // 3. Russian Sheet
      const listRu = translateDeceasedListClientSide(deceasedList, 'ru');
      const headersRu = ['Полное имя', 'Пол (male/female)', 'Имя отца/родителя', 'Имя матери', 'Еврейский день (1-30)', 'Еврейский месяц', 'Телефон', 'Примечания'];
      const rowsRu = listRu.map(item => [item.name || '', item.gender || 'male', item.fatherName || '', item.motherName || '', item.day || 1, item.month || 'Тишрей', item.contactPhone || '', item.notes || '']);
      const wsRu = XLSX.utils.aoa_to_sheet([headersRu, ...rowsRu]);
      XLSX.utils.book_append_sheet(workbook, wsRu, 'Russian Русский');

      const fileName = `eternal_memorial_database_3languages.xlsx`;
      XLSX.writeFile(workbook, fileName);

      setFeedback({
        type: 'success',
        message: lang === 'he' 
          ? `קובץ Excel רב-לשוני (עברית, אנגלית, רוסית - 3 לשוניות) הורד בהצלחה (${deceasedList.length} רשומות)!`
          : `Multi-language Excel database (3 tabs: Hebrew, English, Russian) downloaded successfully (${deceasedList.length} records)!`
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

  // Generate downloadable sample CSV template
  const getTemplateDownloadUrl = () => {
    const csvContent = "Full Name,Gender (male/female),Father Name,Mother Name,Hebrew Day (1-30),Hebrew Month,Contact Phone,Life Story\n" +
      "Moshe Cohen,male,Avraham,Sarah,15,Tishrei,050-1234567,Beloved grandfather\n" +
      "Rachel Levi,female,Yitzhak,Rivka,10,Nisan,054-9876543,Beloved mother\n" +
      "David Gold,male,Yaakov,Leah,5,Kislev,,Passed away in New York";
    const encodedUri = encodeURIComponent(csvContent);
    return `data:text/csv;charset=utf-8,${encodedUri}`;
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
              title={lang === 'he' ? 'הורדת מאגר הנפטרים בקובץ Excel עם 3 בלשוניות (עברית, אנגלית, רוסית)' : 'Download memorial database as Excel (.xlsx) with 3 language tabs'}
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>{lang === 'he' ? 'הורדה ב-Excel (ב-3 שפות)' : lang === 'ru' ? 'Скачать Excel (3 языка)' : 'Download Excel (3 Languages)'}</span>
            </button>

            {/* Combined CSV Export Button */}
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
                exportCombined3LanguageCsv(deceasedList);
                setFeedback({
                  type: 'success',
                  message: lang === 'he' 
                    ? `קובץ CSV מאוחד ב-3 שפות (עמודות מקבילות לעברית, אנגלית ורוסית) הורד בהצלחה (${deceasedList.length} רשומות)!`
                    : `Combined 3-language CSV file downloaded successfully (${deceasedList.length} records)!`
                });
              }}
              className="text-xs font-semibold text-sky-300 hover:text-sky-100 flex items-center gap-2 bg-sky-950/60 hover:bg-sky-900/80 px-3.5 py-2 rounded-lg border border-sky-500/50 hover:border-sky-400 transition-all font-sans cursor-pointer shadow-md"
              title={lang === 'he' ? 'הורדת מאגר הנפטרים בקובץ CSV אחד המכיל עמודות בעברית, אנגלית ורוסית' : 'Download single CSV (.csv) containing all 3 languages side-by-side'}
            >
              <FileText className="w-4 h-4 text-sky-400" />
              <span>{lang === 'he' ? 'הורדה ב-CSV (ב-3 שפות)' : lang === 'ru' ? 'Скачать CSV (3 языка)' : 'Download CSV (3 Languages)'}</span>
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
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs uppercase tracking-wider text-[#c8a96e] font-semibold">
              {lang === 'he' ? 'אפשרות 1: העלאת קובץ Excel / CSV (מומלץ ביותר)' : 'Option 1: Upload Excel / CSV File (Recommended)'}
            </label>
            {/* Download Sample Template Link */}
            <a
              href={getTemplateDownloadUrl()}
              download="eternal_memorial_template.csv"
              className="text-xs text-gray-400 hover:text-[#c8a96e] flex items-center gap-1 bg-black/40 px-2.5 py-1 rounded border border-gray-700 hover:border-[#c8a96e]/50 transition-all"
              title={lang === 'he' ? 'הורדת קובץ CSV לדוגמה עם סדר העמודות הנכון' : 'Download sample CSV template'}
            >
              <Download className="w-3.5 h-3.5 text-[#c8a96e]" />
              <span>{t.downloadTemplate}</span>
            </a>
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
              {lang === 'he' ? 'תומך בקבצי .xlsx, .xls ו-.csv עם סדר עמודות: שם, מין, שם אב, שם אם, יום, חודש, טלפון, הערות' : 'Supports .xlsx, .xls, and .csv formats in correct column order'}
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
