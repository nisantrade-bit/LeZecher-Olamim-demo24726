/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Language } from '../types';
import {
  getCanonicalHebrewSuggestion,
  getNiqqudSuggestion,
  isHebrewText
} from '../utils/transliteration';
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

  if (!sourceText || !sourceText.trim() || !isHebrewText(sourceText)) {
    return null;
  }

  const canonicalSuggestion = getCanonicalHebrewSuggestion(sourceText);
  const niqqudSuggestion = getNiqqudSuggestion(sourceText);

  const isRtl = lang === 'he';

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
              <strong className="font-serif text-white font-bold">{canonicalSuggestion}</strong>
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
                <strong className="font-serif text-amber-200 text-sm font-semibold">{pronunciation}</strong>
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
                <Edit2 className="w-3 h-3" />
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
                <X className="w-3 h-3" />
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
                <strong className="font-serif text-amber-200 text-sm font-semibold">{niqqudSuggestion}</strong>
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => onConfirmPronunciation(niqqudSuggestion)}
                className="bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 border border-amber-500/40 font-medium px-2 py-0.5 rounded text-[11px] transition-all flex items-center gap-1"
              >
                <Check className="w-3 h-3 text-amber-400" />
                {lang === 'he' ? 'אשר הגייה' : lang === 'ru' ? 'Подтвердить' : 'Confirm'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setCustomVal(sourceText);
                  setShowManualEditor(true);
                }}
                className="text-gray-400 hover:text-gray-200 text-[11px] underline px-1"
              >
                {lang === 'he' ? 'ערוך' : 'Edit'}
              </button>
            </div>
          </div>
        ) : (
          /* No Automatic Suggestion State -> Allow Manual Niqqud */
          <div className="flex items-center justify-between gap-2">
            <span className="text-gray-400 text-[11px]">
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
              className="text-amber-400 hover:text-amber-300 text-[11px] font-medium underline flex items-center gap-1"
            >
              <Edit2 className="w-3 h-3" />
              {lang === 'he' ? 'הוסף ניקוד ידני' : 'Add custom niqqud'}
            </button>
          </div>
        )}

        {/* 3. Manual Niqqud Editor Panel */}
        {showManualEditor && (
          <div className="mt-2 pt-2 border-t border-[#c8a96e]/15 space-y-2">
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={customVal}
                onChange={(e) => setCustomVal(e.target.value)}
                placeholder={sourceText}
                className="w-full bg-[#070b12] border border-[#c8a96e]/30 rounded px-2 py-1 text-xs text-amber-200 font-serif outline-none focus:border-[#c8a96e]"
              />
              <button
                type="button"
                onClick={() => {
                  if (customVal.trim()) {
                    onConfirmPronunciation(customVal.trim());
                    setShowManualEditor(false);
                  }
                }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1 rounded text-xs font-medium shrink-0"
              >
                {lang === 'he' ? 'שמור' : 'Save'}
              </button>
            </div>

            {/* Niqqud Characters Toolbar */}
            <div className="flex flex-wrap gap-1 pt-1">
              {NIQQUD_CHARACTERS.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCustomVal(prev => prev + item.char)}
                  className="bg-[#141c2b] hover:bg-[#1e2a40] border border-[#c8a96e]/20 text-amber-100 rounded px-1.5 py-0.5 text-xs font-serif transition-all"
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
