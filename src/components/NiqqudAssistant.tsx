/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Language } from '../types';
import {
  getCanonicalHebrewSuggestion,
  getNiqqudSuggestion,
  isHebrewText
} from '../utils/transliteration';
import {
  upsertApprovedPronunciation,
  fetchApprovedPronunciation
} from '../utils/supabase';
import { Sparkles, Check, X, Edit2 } from 'lucide-react';

export interface NiqqudAssistantProps {
  fieldName: string;
  sourceText: string;
  pronunciation: string | null;
  onApplyCanonical?: (canonicalText: string) => void;
  onConfirmPronunciation: (pronunciationText: string) => void;
  onClearPronunciation: () => void;
  lang: Language;
}

const NIQQUD_CHARACTERS = [
  { char: '\u05B7', label: 'פַתַח' },
  { char: '\u05B8', label: 'קָמַץ' },
  { char: '\u05B4', label: 'חִירִיק' },
  { char: '\u05B5', label: 'צֵירֵי' },
  { char: '\u05B6', label: 'סֶגוֹל' },
  { char: '\u05B9', label: 'חוֹלָם' },
  { char: '\u05BB', label: 'קֻבּוּץ' },
  { char: '\u05B0', label: 'שְׁוָא' },
  { char: '\u05BC', label: 'דָּגֵשׁ' },
  { char: '\u05C1', label: 'שִׁין' },
  { char: '\u05C2', label: 'שִׂין' },
];

const isNiqqud = (ch: string) => /[\u0591-\u05C7]/.test(ch);
const isHebrewBase = (ch: string) => /[\u05D0-\u05EA]/.test(ch);

const getNextHebrewBasePos = (text: string, currentPos: number): number => {
  let i = currentPos;
  while (i < text.length && isNiqqud(text[i])) {
    i++;
  }
  while (i < text.length && !isHebrewBase(text[i])) {
    i++;
  }
  if (i >= text.length) {
    return text.length;
  }
  let nextPos = i + 1;
  while (nextPos < text.length && isNiqqud(text[nextPos])) {
    nextPos++;
  }
  return nextPos;
};

export const NiqqudAssistant: React.FC<NiqqudAssistantProps> = ({
  fieldName,
  sourceText,
  pronunciation,
  onApplyCanonical,
  onConfirmPronunciation,
  onClearPronunciation,
  lang
}) => {
  const [showManualEditor, setShowManualEditor] = useState(false);
  const [customVal, setCustomVal] = useState(pronunciation || sourceText);
  const [dbApprovedPronunciation, setDbApprovedPronunciation] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  // Set initial cursor position after first Hebrew base letter + attached combining marks when manual editor opens
  useEffect(() => {
    if (showManualEditor && inputRef.current) {
      const text = customVal || '';
      let targetPos = text.length;

      for (let i = 0; i < text.length; i++) {
        if (/[\u05D0-\u05EA]/.test(text[i])) {
          let endOfFirstLetter = i + 1;
          while (
            endOfFirstLetter < text.length &&
            /[\u0591-\u05C7]/.test(text[endOfFirstLetter])
          ) {
            endOfFirstLetter++;
          }
          targetPos = endOfFirstLetter;
          break;
        }
      }

      const timer = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.setSelectionRange(targetPos, targetPos);
        }
      }, 0);

      return () => clearTimeout(timer);
    }
  }, [showManualEditor]);

  // Query global approved pronunciation dictionary asynchronously
  useEffect(() => {
    let isMounted = true;
    if (sourceText && isHebrewText(sourceText)) {
      const nameType = fieldName === 'fatherName' ? 'father' : fieldName === 'motherName' ? 'mother' : 'deceased';
      fetchApprovedPronunciation(sourceText, nameType)
        .then((approved) => {
          if (isMounted) {
            setDbApprovedPronunciation(approved);
          }
        })
        .catch(() => {
          if (isMounted) {
            setDbApprovedPronunciation(null);
          }
        });
    } else {
      setDbApprovedPronunciation(null);
    }
    return () => {
      isMounted = false;
    };
  }, [sourceText, fieldName]);

  if (!sourceText || !sourceText.trim() || !isHebrewText(sourceText)) {
    return null;
  }

  const canonicalSuggestion = getCanonicalHebrewSuggestion(sourceText);
  const niqqudSuggestion = dbApprovedPronunciation || getNiqqudSuggestion(sourceText);

  const handleConfirmPronunciation = (pronText: string) => {
    onConfirmPronunciation(pronText);
    if (sourceText && pronText) {
      const nameType = fieldName === 'fatherName' ? 'father' : fieldName === 'motherName' ? 'mother' : 'deceased';
      upsertApprovedPronunciation(sourceText, pronText, nameType).catch((err) => {
        console.warn('[Global Dictionary Async Upsert Exception]', err);
      });
    }
  };

  const handleInsertNiqqud = (char: string) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    const input = inputRef.current;
    const start = input ? input.selectionStart ?? customVal.length : customVal.length;
    const end = input ? input.selectionEnd ?? customVal.length : customVal.length;

    let newVal = customVal;
    let insertedPos = start;

    if (start !== end) {
      newVal = customVal.slice(0, start) + char + customVal.slice(end);
      insertedPos = start + char.length;
    } else {
      let baseIdx = -1;
      if (start > 0) {
        if (isNiqqud(customVal[start - 1])) {
          let i = start - 1;
          while (i >= 0 && isNiqqud(customVal[i])) i--;
          baseIdx = i >= 0 ? i : -1;
        } else {
          baseIdx = start - 1;
        }
      } else if (customVal.length > 0) {
        baseIdx = 0;
      }

      if (baseIdx !== -1) {
        const markStart = baseIdx + 1;
        let markEnd = markStart;
        while (markEnd < customVal.length && isNiqqud(customVal[markEnd])) {
          markEnd++;
        }
        newVal = customVal.slice(0, markStart) + char + customVal.slice(markEnd);
        insertedPos = markStart + char.length;
      } else {
        newVal = customVal.slice(0, start) + char + customVal.slice(end);
        insertedPos = start + char.length;
      }
    }

    setCustomVal(newVal);

    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.setSelectionRange(insertedPos, insertedPos);
      }
    }, 0);

    timerRef.current = setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const nextPos = getNextHebrewBasePos(newVal, insertedPos);
        inputRef.current.setSelectionRange(nextPos, nextPos);
      }
    }, 2000);
  };

  return (
    <div className="mt-1 space-y-1.5 text-xs font-sans">
      {/* 1. Canonical Display Correction Suggestion */}
      {canonicalSuggestion && onApplyCanonical && (
        <div className="flex items-center justify-between gap-2 bg-[#1a2332] border border-[#c8a96e]/40 rounded-md px-2.5 py-1 text-[#e2c388]">
          <div className="flex items-center gap-1.5 overflow-hidden">
            <Sparkles className="w-3.5 h-3.5 text-[#c8a96e] shrink-0" />
            <span className="truncate">
              {lang === 'he'
                ? `הצעה לכתיב תקני: `
                : lang === 'ru'
                ? `Стандартное написание: `
                : `Canonical spelling: `}
              <strong className="font-serif text-white font-bold text-sm leading-relaxed">{canonicalSuggestion}</strong>
            </span>
          </div>
          <button
            type="button"
            onClick={() => onApplyCanonical(canonicalSuggestion)}
            className="shrink-0 bg-[#c8a96e] hover:bg-[#b5955a] text-[#0d131f] font-semibold px-2 py-0.5 rounded text-[11px] transition-all flex items-center gap-1"
          >
            <Check className="w-3 h-3" />
            {lang === 'he' ? 'תקן' : lang === 'ru' ? 'Исправить' : 'Apply'}
          </button>
        </div>
      )}

      {/* 2. Niqqud Pronunciation Assistant */}
      <div className="bg-[#0b1019] border border-[#c8a96e]/20 rounded-md p-2">
        {pronunciation ? (
          /* Confirmed Pronunciation State */
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 overflow-hidden">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
              <span className="text-gray-300">
                {lang === 'he' ? 'הגייה מאושרת:' : lang === 'ru' ? 'Произношение:' : 'Confirmed pronunciation:'}{' '}
                <strong className="font-serif text-amber-200 text-base sm:text-lg font-bold leading-relaxed py-0.5">{pronunciation}</strong>
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setCustomVal(pronunciation);
                  setShowManualEditor(!showManualEditor);
                }}
                className="text-gray-400 hover:text-amber-300 p-1 rounded hover:bg-white/5 transition-all"
                title={lang === 'he' ? 'ערוך ניקוד' : 'Edit niqqud'}
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowManualEditor(false);
                  onClearPronunciation();
                }}
                className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-white/5 transition-all"
                title={lang === 'he' ? 'נקה הגייה' : 'Clear pronunciation'}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : niqqudSuggestion ? (
          /* Suggested Pronunciation State */
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 overflow-hidden">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="text-gray-300">
                {lang === 'he' ? 'הגייה מוצעת (ניקוד):' : lang === 'ru' ? 'Предлагаемый огласовка:' : 'Suggested niqqud:'}{' '}
                <strong className="font-serif text-amber-200 text-base sm:text-lg font-bold leading-relaxed py-0.5">{niqqudSuggestion}</strong>
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => handleConfirmPronunciation(niqqudSuggestion)}
                className="bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 border border-amber-500/40 font-medium px-2.5 py-1 rounded text-xs transition-all flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5 text-amber-400" />
                {lang === 'he' ? 'אשר הגייה' : lang === 'ru' ? 'Подтвердить' : 'Confirm'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setCustomVal(niqqudSuggestion);
                  setShowManualEditor(true);
                }}
                className="text-gray-400 hover:text-gray-200 text-xs underline px-1"
              >
                {lang === 'he' ? 'ערוך' : 'Edit'}
              </button>
            </div>
          </div>
        ) : (
          /* No Automatic Suggestion State -> Allow Manual Niqqud */
          <div className="flex items-center justify-between gap-2">
            <span className="text-gray-400 text-xs">
              {lang === 'he'
                ? 'לא נמצאה הגייה אוטומטית במילון.'
                : 'No automatic niqqud found.'}
            </span>
            <button
              type="button"
              onClick={() => {
                setCustomVal(sourceText);
                setShowManualEditor(!showManualEditor);
              }}
              className="text-amber-400 hover:text-amber-300 text-xs font-medium underline flex items-center gap-1"
            >
              <Edit2 className="w-3.5 h-3.5" />
              {lang === 'he' ? 'הוסף ניקוד ידני' : 'Add custom niqqud'}
            </button>
          </div>
        )}

        {/* 3. Manual Niqqud Editor Panel */}
        {showManualEditor && (
          <div className="mt-2.5 pt-2.5 border-t border-[#c8a96e]/20 space-y-2.5">
            {/* Vocalized Pronunciation Large Preview Box */}
            <div className="bg-[#070b12] border border-[#c8a96e]/40 rounded-lg p-3 text-center shadow-inner min-h-[60px] flex flex-col justify-center items-center">
              <span className="text-[11px] text-amber-200/70 mb-1 font-sans">
                {lang === 'he' ? 'תצוגה מקדימה של ההגייה (ניקוד):' : lang === 'ru' ? 'Предпросмотр огласовки:' : 'Pronunciation Preview:'}
              </span>
              <span className="font-serif text-2xl text-amber-300 font-bold tracking-wider leading-relaxed py-1 px-2 select-all overflow-x-auto max-w-full">
                {customVal || sourceText}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={customVal}
                onChange={(e) => setCustomVal(e.target.value)}
                placeholder={sourceText}
                dir="rtl"
                className="w-full bg-[#070b12] border border-[#c8a96e]/40 rounded-lg px-3 py-2 text-base sm:text-lg text-amber-200 font-serif outline-none focus:border-[#c8a96e] leading-relaxed shadow-sm"
              />
              <button
                type="button"
                onClick={() => {
                  if (customVal.trim()) {
                    handleConfirmPronunciation(customVal.trim());
                    setShowManualEditor(false);
                  }
                }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold shrink-0 transition-all shadow-sm"
              >
                {lang === 'he' ? 'שמור' : 'Save'}
              </button>
            </div>

            {/* Niqqud Characters Toolbar */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {NIQQUD_CHARACTERS.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleInsertNiqqud(item.char)}
                  className="bg-[#141c2b] hover:bg-[#1e2a40] active:scale-95 border border-[#c8a96e]/30 text-amber-100 rounded-md px-2.5 py-1 text-sm sm:text-base font-serif transition-all shadow-xs"
                  title={item.label}
                >
                  א{item.char}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
