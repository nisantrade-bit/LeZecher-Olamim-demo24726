/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { X, BookOpen, MessageSquare, Globe, ArrowRightLeft } from 'lucide-react';
import { Language } from '../types';
import { phoneticTransliterateHebrewVerse } from '../utils/transliteration';
import { MISHNAYOT, PSALMS } from '../utils/memorialStudy';

interface FullReadingModalProps {
  sefariaRef: string; // e.g. "Psalms 23" or "Pirkei Avot 1"
  title: string;
  lang: Language;
  onClose: () => void;
}

// Global in-memory cache for instant (0ms) loading of sacred study texts
const sefariaTextCache = new Map<string, {
  hebrewVerses: string[];
  englishVerses: string[];
  russianVerses: string[];
  transliteratedVerses: string[];
}>();

export const FullReadingModal: React.FC<FullReadingModalProps> = ({ sefariaRef, title, lang, onClose }) => {
  // Clean ref format
  let formattedRef = sefariaRef;
  if (sefariaRef.toLowerCase().startsWith('psalm ')) {
    formattedRef = sefariaRef.replace(/psalm\s+/i, 'Psalms ');
  }

  const cachedData = sefariaTextCache.get(formattedRef);

  const [loading, setLoading] = useState(!cachedData);
  const [error, setError] = useState<string | null>(null);
  const [hebrewVerses, setHebrewVerses] = useState<string[]>(cachedData?.hebrewVerses || []);
  const [englishVerses, setEnglishVerses] = useState<string[]>(cachedData?.englishVerses || []);
  const [russianVerses, setRussianVerses] = useState<string[]>(cachedData?.russianVerses || []);
  const [transliteratedVerses, setTransliteratedVerses] = useState<string[]>(cachedData?.transliteratedVerses || []);
  const [viewMode, setViewMode] = useState<'translated' | 'transliterated' | 'bilingual' | 'hebrew'>(
    lang === 'he' ? 'hebrew' : 'translated'
  );

  useEffect(() => {
    // If already in memory cache, no network call required!
    if (cachedData) {
      setHebrewVerses(cachedData.hebrewVerses);
      setEnglishVerses(cachedData.englishVerses);
      setRussianVerses(cachedData.russianVerses);
      setTransliteratedVerses(cachedData.transliteratedVerses);
      setLoading(false);
      return;
    }

    // Try finding instant local fallback match from memorialStudy records to avoid spinner
    let localHe: string[] = [];
    let localEn: string[] = [];
    let localRu: string[] = [];

    if (formattedRef.toLowerCase().includes('psalms 23')) {
      const p23 = PSALMS.find(p => p.chapter === 23);
      if (p23) {
        localHe = [p23.text.he];
        localEn = [p23.text.en];
        localRu = [p23.text.ru];
      }
    } else if (formattedRef.toLowerCase().includes('psalms 91')) {
      const p91 = PSALMS.find(p => p.chapter === 91);
      if (p91) {
        localHe = [p91.text.he];
        localEn = [p91.text.en];
        localRu = [p91.text.ru];
      }
    } else if (formattedRef.toLowerCase().includes('psalms 15')) {
      const p15 = PSALMS.find(p => p.chapter === 15);
      if (p15) {
        localHe = [p15.text.he];
        localEn = [p15.text.en];
        localRu = [p15.text.ru];
      }
    } else {
      const localM = MISHNAYOT.find(m => 
        m.reference.en.toLowerCase().includes(formattedRef.toLowerCase()) || 
        m.reference.he.includes(formattedRef)
      );
      if (localM) {
        localHe = [localM.text.he];
        localEn = [localM.text.en];
        localRu = [localM.text.ru];
      }
    }

    if (localHe.length > 0) {
      setHebrewVerses(localHe);
      setEnglishVerses(localEn);
      setRussianVerses(localRu);
      setLoading(false); // Display local text instantly!
    } else {
      setLoading(true);
    }

    const fetchText = async () => {
      setError(null);
      try {
        const response = await fetch(
          `https://www.sefaria.org/api/texts/${encodeURIComponent(formattedRef)}?context=0`
        );
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const data = await response.json();
        
        // Handle Sefaria text formatting
        const flattenText = (val: any): string[] => {
          if (!val) return [];
          if (typeof val === 'string') return [val];
          if (Array.isArray(val)) {
            return val.reduce((acc: string[], curr: any) => acc.concat(flattenText(curr)), []);
          }
          return [];
        };

        const heRaw = flattenText(data.he);
        const enRaw = flattenText(data.text);

        // Strip HTML tags if present
        const stripHtml = (htmlStr: string) => {
          return htmlStr.replace(/<\/?[^>]+(>|$)/g, "");
        };

        // Clean Hebrew text
        const cleanHebrewText = (text: string) => {
          let cleaned = stripHtml(text);
          cleaned = cleaned.replace(/\[[^\]]*[a-zA-Z][^\]]*\]/g, "");
          cleaned = cleaned.replace(/\([^)]*[a-zA-Z][^)]*\)/g, "");
          cleaned = cleaned.replace(/[a-zA-Z]/g, "");
          cleaned = cleaned.replace(/\s+/g, " ").trim();
          return cleaned;
        };

        const cleanedHe = heRaw.map(cleanHebrewText);
        const cleanedEn = enRaw.map(stripHtml);

        if (cleanedHe.length === 0 && localHe.length === 0) {
          throw new Error('No text found for this reference.');
        }

        if (cleanedHe.length > 0) {
          setHebrewVerses(cleanedHe);
          setEnglishVerses(cleanedEn);
        }

        let fetchedRu: string[] = localRu;
        let fetchedTranslit: string[] = [];

        // Fetch Russian translation if needed
        if (lang === 'ru') {
          try {
            const trResponse = await fetch('/api/translate-verses', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                verses: cleanedEn.length > 0 ? cleanedEn : cleanedHe,
                targetLang: 'ru'
              })
            });
            if (trResponse.ok) {
              const trData = await trResponse.json();
              if (trData.translatedVerses && Array.isArray(trData.translatedVerses)) {
                fetchedRu = trData.translatedVerses;
                setRussianVerses(fetchedRu);
              }
              if (trData.transliteratedVerses && Array.isArray(trData.transliteratedVerses)) {
                fetchedTranslit = trData.transliteratedVerses;
                setTransliteratedVerses(fetchedTranslit);
              }
            }
          } catch (trErr) {
            console.warn("Russian verse translation failed:", trErr);
          }
        }

        // Cache the parsed result for instant subsequent access
        sefariaTextCache.set(formattedRef, {
          hebrewVerses: cleanedHe.length > 0 ? cleanedHe : localHe,
          englishVerses: cleanedEn.length > 0 ? cleanedEn : localEn,
          russianVerses: fetchedRu,
          transliteratedVerses: fetchedTranslit
        });

      } catch (err) {
        console.error('Error fetching text from Sefaria:', err);
        if (localHe.length === 0) {
          setError(
            lang === 'he'
              ? 'שגיאה בטעינת הטקסט. אנא ודא חיבור לאינטרנט ונסה שוב.'
              : lang === 'ru'
              ? 'Ошибка загрузки текста. Пожалуйста, проверьте подключение к интернету.'
              : 'Error loading text. Please check your internet connection and try again.'
          );
        }
      } finally {
        setLoading(false);
      }
    };

    fetchText();
  }, [sefariaRef, lang]);

  return (
    <div className="fixed inset-0 bg-[#3B2F2F]/60 backdrop-blur-sm z-[100] flex items-center justify-center p-3 sm:p-6 font-sans animate-fade-in">
      <div className="bg-[#FFFDF8] border border-[#D8CFC0] rounded-3xl w-full max-w-3xl max-h-[88vh] flex flex-col overflow-hidden shadow-xl relative text-[#3B2F2F]">
        
        {/* Digital Book Header */}
        <div className="p-4 sm:p-5 border-b border-[#E8E2D5] bg-[#F8F2E4] flex items-center justify-between">
          <div className={lang === 'he' ? 'text-right' : 'text-left'} dir={lang === 'he' ? 'rtl' : 'ltr'}>
            <span className="text-[10px] tracking-widest text-[#5D6D53] font-serif font-bold uppercase block mb-0.5">
              {lang === 'he' ? 'ספר הלימוד והתפילה הדיגיטלי' : lang === 'ru' ? 'Священный книга и молитвенник' : 'Digital Sacred Text Reader'}
            </span>
            <h3 className="text-base sm:text-xl font-serif font-bold text-[#3B2F2F] flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#5D6D53]" />
              {title}
            </h3>
          </div>
          
          <button
            onClick={onClose}
            className="text-[#6B5E53] hover:text-[#3B2F2F] bg-[#FAF5EC] hover:bg-[#E8E2D5] p-2 rounded-xl cursor-pointer transition-colors border border-[#D8CFC0]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* View mode toggle */}
        {!loading && !error && (
          <div className="px-4 py-2 bg-[#F8F2E4] border-b border-[#E8E2D5] flex flex-wrap justify-center sm:justify-end gap-1.5 text-xs">
            <button
              onClick={() => setViewMode('translated')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                viewMode === 'translated'
                  ? 'bg-[#5D6D53] text-white font-bold shadow-xs'
                  : 'bg-[#FFFDF8] hover:bg-[#FAF5EC] text-[#6B5E53] border border-[#D8CFC0]'
              }`}
            >
              {lang === 'he' ? 'מתורגם בלבד' : lang === 'ru' ? 'Перевод (Русский)' : 'Full Translation'}
            </button>

            {lang !== 'he' && (
              <button
                onClick={() => setViewMode('transliterated')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                  viewMode === 'transliterated'
                    ? 'bg-[#5D6D53] text-white font-bold shadow-xs'
                    : 'bg-[#FFFDF8] hover:bg-[#FAF5EC] text-[#6B5E53] border border-[#D8CFC0]'
                }`}
                title={lang === 'ru' ? 'Чтение иврита русскими буквами' : 'Read Hebrew sounds in English letters'}
              >
                <span>🔤</span>
                <span>{lang === 'ru' ? 'Транслитерация (чтение)' : 'Phonetic Hebrew'}</span>
              </button>
            )}

            <button
              onClick={() => setViewMode('bilingual')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                viewMode === 'bilingual'
                  ? 'bg-[#5D6D53] text-white font-bold shadow-xs'
                  : 'bg-[#FFFDF8] hover:bg-[#FAF5EC] text-[#6B5E53] border border-[#D8CFC0]'
              }`}
            >
              {lang === 'he' ? 'דו-לשוני (עברית + תרגום)' : lang === 'ru' ? 'Иврит + Перевод' : 'Hebrew + Translation'}
            </button>

            <button
              onClick={() => setViewMode('hebrew')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                viewMode === 'hebrew'
                  ? 'bg-[#5D6D53] text-white font-bold shadow-xs'
                  : 'bg-[#FFFDF8] hover:bg-[#FAF5EC] text-[#6B5E53] border border-[#D8CFC0]'
              }`}
            >
              {lang === 'he' ? 'עברית מקורית' : lang === 'ru' ? 'Только иврит' : 'Hebrew Original'}
            </button>
          </div>
        )}

        {/* Content Area - Warm Paper Reading Experience */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-5 bg-[#FFFDF8]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <div className="w-9 h-9 border-3 border-[#5D6D53] border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs text-[#6B5E53] font-serif">
                {lang === 'he' ? 'טוען את הפרק המלא...' : lang === 'ru' ? 'Загрузка полного священного текста...' : 'Loading full sacred text...'}
              </p>
            </div>
          ) : error ? (
            <div className="text-center py-16 space-y-3">
              <div className="text-3xl">⚠️</div>
              <p className="text-sm text-amber-800 font-medium max-w-md mx-auto">{error}</p>
            </div>
          ) : (
            <div className="space-y-6">
              {hebrewVerses.map((verse, idx) => {
                const verseNum = idx + 1;
                const ruVerse = russianVerses[idx];
                const enVerse = englishVerses[idx];
                const mainTranslated = lang === 'ru' ? (ruVerse || verse) : (enVerse || verse);
                const translitText = transliteratedVerses[idx] || phoneticTransliterateHebrewVerse(verse, lang === 'ru' ? 'ru' : 'en');

                return (
                  <div key={idx} className="border-b border-[#E8E2D5] pb-5 last:border-0 space-y-2">
                    
                    {/* ViewMode: Translated */}
                    {viewMode === 'translated' && (
                      <div className={lang === 'he' ? 'text-right' : 'text-left'} dir={lang === 'he' ? 'rtl' : 'ltr'}>
                        <p className="text-base sm:text-lg leading-relaxed text-[#3B2F2F] font-sans font-medium">
                          <span className="text-xs text-[#5D6D53] font-serif font-bold mr-2">
                            [{verseNum}]
                          </span>
                          {lang === 'he' ? verse : mainTranslated}
                        </p>
                      </div>
                    )}

                    {/* ViewMode: Transliterated */}
                    {viewMode === 'transliterated' && (
                      <div className="text-left space-y-2" dir="ltr">
                        <div className="bg-[#FAF5EC] p-3 rounded-xl border border-[#E8E2D5]">
                          <span className="text-[10px] text-[#5D6D53] font-serif font-bold uppercase tracking-wider block mb-0.5">
                            {lang === 'ru' ? 'Фонетическое чтение на иврите:' : 'Phonetic Hebrew Reading:'}
                          </span>
                          <p className="text-base leading-relaxed text-[#3B2F2F] font-sans font-semibold">
                            <span className="text-xs text-[#5D6D53] font-serif font-bold mr-2">
                              [{verseNum}]
                            </span>
                            {translitText}
                          </p>
                        </div>
                        <div className="pl-2 pt-1">
                          <span className="text-[10px] text-[#6B5E53] font-bold block mb-0.5">
                            {lang === 'ru' ? 'Перевод:' : 'Translation:'}
                          </span>
                          <p className="text-sm leading-relaxed text-[#3B2F2F] italic font-sans">
                            {mainTranslated}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* ViewMode: Bilingual */}
                    {viewMode === 'bilingual' && (
                      <div className="space-y-3">
                        <div className="text-right bg-[#FAF5EC] p-3.5 rounded-xl border border-[#E8E2D5]" dir="rtl">
                          <p className="text-lg sm:text-xl leading-loose text-[#3B2F2F] font-serif">
                            <span className="text-xs text-[#5D6D53] font-serif font-bold ml-2">
                              ({verseNum})
                            </span>
                            {verse}
                          </p>
                        </div>
                        {lang !== 'he' && (
                          <div className="text-left px-2" dir="ltr">
                            <p className="text-sm sm:text-base leading-relaxed text-[#3B2F2F] font-sans font-medium">
                              <span className="text-xs text-[#5D6D53] font-serif font-bold mr-2">
                                [{verseNum}]
                              </span>
                              {mainTranslated}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ViewMode: Hebrew Original */}
                    {viewMode === 'hebrew' && (
                      <div className="text-right" dir="rtl">
                        <p className="text-xl sm:text-2xl leading-loose text-[#3B2F2F] font-serif">
                          <span className="text-xs text-[#5D6D53] font-serif font-bold ml-2">
                            {verseNum}.
                          </span>
                          {verse}
                        </p>
                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-[#E8E2D5] bg-[#F8F2E4] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#5D6D53] hover:bg-[#4F5D46] text-white font-medium rounded-xl text-xs transition-all cursor-pointer shadow-xs"
          >
            {lang === 'he' ? 'סגור קריאה' : lang === 'ru' ? 'Закрыть' : 'Close'}
          </button>
        </div>

      </div>
    </div>
  );
};
