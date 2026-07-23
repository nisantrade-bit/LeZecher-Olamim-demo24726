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
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-4 font-sans animate-fade-in">
      <div className="bg-[#131a26] border-2 border-[#c8a96e] rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl relative">
        
        {/* Header */}
        <div className="p-5 border-b border-[#c8a96e]/10 bg-black/20 flex items-center justify-between">
          <div className={lang === 'he' ? 'text-right' : 'text-left'} dir={lang === 'he' ? 'rtl' : 'ltr'}>
            <span className="text-[10px] tracking-widest text-[#c8a96e] font-bold uppercase block mb-1">
              {lang === 'he' ? 'קריאה מלאה מתוך המקורות' : lang === 'ru' ? 'Полный священный текст' : 'Full Sacred Source Text'}
            </span>
            <h3 className="text-lg font-serif font-bold text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#c8a96e]" />
              {title}
            </h3>
          </div>
          
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 p-2 rounded-xl cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* View mode toggle */}
        {!loading && !error && (
          <div className="px-5 py-2.5 bg-black/40 border-b border-[#c8a96e]/10 flex flex-wrap justify-center sm:justify-end gap-1.5 text-xs">
            <button
              onClick={() => setViewMode('translated')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                viewMode === 'translated'
                  ? 'bg-[#c8a96e] text-black font-bold shadow'
                  : 'bg-[#c8a96e]/10 hover:bg-[#c8a96e]/20 text-[#c8a96e]'
              }`}
            >
              {lang === 'he' ? 'מתורגם בלבד' : lang === 'ru' ? 'Перевод (Русский)' : 'Full Translation'}
            </button>

            {lang !== 'he' && (
              <button
                onClick={() => setViewMode('transliterated')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                  viewMode === 'transliterated'
                    ? 'bg-amber-400 text-black font-bold shadow'
                    : 'bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 border border-amber-400/20'
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
                  ? 'bg-[#c8a96e] text-black font-bold shadow'
                  : 'bg-[#c8a96e]/10 hover:bg-[#c8a96e]/20 text-[#c8a96e]'
              }`}
            >
              {lang === 'he' ? 'דו-לשוני (עברית + תרגום)' : lang === 'ru' ? 'Иврит + Перевод' : 'Hebrew + Translation'}
            </button>

            <button
              onClick={() => setViewMode('hebrew')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                viewMode === 'hebrew'
                  ? 'bg-[#c8a96e] text-black font-bold shadow'
                  : 'bg-[#c8a96e]/10 hover:bg-[#c8a96e]/20 text-[#c8a96e]'
              }`}
            >
              {lang === 'he' ? 'עברית מקורית' : lang === 'ru' ? 'Только иврит' : 'Hebrew Original'}
            </button>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <div className="w-10 h-10 border-4 border-[#c8a96e] border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm text-gray-400">
                {lang === 'he' ? 'טוען את הפרק המלא...' : lang === 'ru' ? 'Загрузка полного священного текста...' : 'Loading full sacred text...'}
              </p>
            </div>
          ) : error ? (
            <div className="text-center py-16 space-y-3">
              <div className="text-4xl">⚠️</div>
              <p className="text-sm text-red-400 font-medium max-w-md mx-auto">{error}</p>
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
                  <div key={idx} className="border-b border-[#c8a96e]/10 pb-4 last:border-0 space-y-2">
                    
                    {/* ViewMode: Translated */}
                    {viewMode === 'translated' && (
                      <div className={lang === 'he' ? 'text-right' : 'text-left'} dir={lang === 'he' ? 'rtl' : 'ltr'}>
                        <p className="text-base leading-relaxed text-gray-100 font-sans font-medium relative pl-2">
                          <span className="text-xs text-[#c8a96e] font-mono mr-2 font-bold">
                            [{verseNum}]
                          </span>
                          {lang === 'he' ? verse : mainTranslated}
                        </p>
                      </div>
                    )}

                    {/* ViewMode: Transliterated (Phonetic Hebrew in Latin/Cyrillic + Translation) */}
                    {viewMode === 'transliterated' && (
                      <div className="text-left space-y-1.5" dir="ltr">
                        <div className="bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">
                          <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block mb-0.5">
                            {lang === 'ru' ? 'Фонетическое чтение на иврите:' : 'Phonetic Hebrew Reading:'}
                          </span>
                          <p className="text-base leading-relaxed text-amber-200 font-sans font-semibold">
                            <span className="text-xs text-[#c8a96e] font-mono mr-2 font-bold">
                              [{verseNum}]
                            </span>
                            {translitText}
                          </p>
                        </div>
                        <div className="pl-2 pt-1 border-t border-white/5">
                          <span className="text-[10px] text-gray-400 font-bold block mb-0.5">
                            {lang === 'ru' ? 'Перевод для понимания:' : 'Translation:'}
                          </span>
                          <p className="text-sm leading-relaxed text-gray-300 italic font-sans">
                            {mainTranslated}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* ViewMode: Bilingual */}
                    {viewMode === 'bilingual' && (
                      <div className="space-y-2">
                        {lang !== 'he' && (
                          <div className="text-left" dir="ltr">
                            <p className="text-base leading-relaxed text-gray-100 font-sans font-medium pl-2 relative">
                              <span className="text-xs text-[#c8a96e] font-mono mr-2 font-bold">
                                [{verseNum}]
                              </span>
                              {mainTranslated}
                            </p>
                          </div>
                        )}
                        <div className="text-right bg-black/20 p-2 rounded border border-[#c8a96e]/10" dir="rtl">
                          <p className="text-lg leading-relaxed text-[#f7e7c4] font-serif pr-2 relative">
                            <span className="text-xs text-[#c8a96e]/60 font-mono ml-2">
                              ({verseNum})
                            </span>
                            {verse}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* ViewMode: Hebrew Original */}
                    {viewMode === 'hebrew' && (
                      <div className="text-right" dir="rtl">
                        <p className="text-xl leading-relaxed text-[#f7e7c4] font-serif pr-4 relative">
                          <span className="absolute right-0 top-1 text-xs text-[#c8a96e]/60 font-mono">
                            {verseNum}
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
        <div className="p-4 border-t border-[#c8a96e]/10 bg-black/20 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold rounded-xl text-xs transition-all cursor-pointer"
          >
            {lang === 'he' ? 'סגור קריאה' : lang === 'ru' ? 'Закрыть' : 'Close'}
          </button>
        </div>

      </div>
    </div>
  );
};
