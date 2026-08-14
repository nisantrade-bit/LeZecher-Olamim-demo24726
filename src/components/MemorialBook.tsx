/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Deceased, Language } from '../types';
import { translations, formatParentRelation } from '../utils/translations';
import { translateText, getLocalizedName } from '../utils/transliteration';
import { HEBREW_MONTHS_HE, HEBREW_MONTHS_EN, HEBREW_MONTHS_RU, gimatriya, normalizeMonthName, findYahrzeitGregorianDate } from '../utils/hebrewDate';
import { ChevronDown, ChevronUp, Search, Eye, Flame } from 'lucide-react';
import { DeceasedPhotoFrame } from './YahrzeitCandle';

interface MemorialBookProps {
  deceasedList: Deceased[];
  lang: Language;
  onSelectDeceased: (deceased: Deceased) => void;
}

const getDayOfWeekName = (date?: Date | null, lang: Language = 'he'): string => {
  if (!date) return '';
  const dateObj = date instanceof Date ? date : new Date(date);
  if (isNaN(dateObj.getTime())) return '';

  const daysHe = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  const daysEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const daysRu = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
  const dayIndex = dateObj.getDay();
  if (lang === 'he') return `יום ${daysHe[dayIndex]}`;
  if (lang === 'ru') return daysRu[dayIndex];
  return daysEn[dayIndex];
};

const formatDateGregorian = (date: Date, lang: Language): string => {
  if (lang === 'he') {
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
  }
  return date.toLocaleDateString(lang === 'ru' ? 'ru' : 'en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

export const MemorialBook: React.FC<MemorialBookProps> = ({ deceasedList, lang, onSelectDeceased }) => {
  const t = translations[lang];

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedMonths, setExpandedMonths] = useState<{ [month: string]: boolean }>({});

  const toggleMonth = (month: string) => {
    setExpandedMonths(prev => ({
      ...prev,
      [month]: !prev[month]
    }));
  };

  const monthsList = HEBREW_MONTHS_HE; // Standard Hebrew month keys for grouping
  const currentMonthsTranslated = lang === 'he' ? HEBREW_MONTHS_HE : lang === 'en' ? HEBREW_MONTHS_EN : HEBREW_MONTHS_RU;

  // Search filter
  const filteredDeceased = deceasedList.filter(d => 
    d.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div id="memorial-book-panel" className="bg-[#FCFBF9] border border-stone-300 rounded-2xl p-6 text-stone-900 shadow-sm">
      {/* Title & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 pb-4 mb-6">
        <div>
          <h3 className="text-xl font-serif font-bold text-stone-900 tracking-wide mb-1 flex items-center gap-2">
            <Flame className="w-5 h-5 text-[#9A7B38]" />
            {t.memorialBook}
          </h3>
          <p className="text-xs text-stone-600 font-sans">
            {lang === 'he' ? 'דפדף באנציקלופדיית הזיכרון המשפחתית לפי חודשי השנה' : 'Browse the family memorial book by month'}
          </p>
        </div>
        
        {/* Search Input */}
        <div className="relative font-sans md:w-72">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.search}
            className="w-full bg-[#FAF8F5] border border-stone-300 focus:border-[#9A7B38] rounded-xl pl-9 pr-3 py-2 text-xs text-stone-900 placeholder-stone-400 outline-none transition-all"
          />
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-stone-400" />
        </div>
      </div>

      {/* 13 Hebrew Month Accordion List */}
      <div className="space-y-3 font-sans">
        {monthsList.map((monthKey, idx) => {
          const monthDeceased = filteredDeceased.filter(d => normalizeMonthName(d.month) === monthKey);
          const isExpanded = expandedMonths[monthKey] || (searchQuery.trim() !== '' && monthDeceased.length > 0);
          
          const monthLabel = currentMonthsTranslated[idx];

          return (
            <div 
              key={monthKey}
              className="border border-stone-200 hover:border-stone-300 rounded-xl overflow-hidden transition-all bg-[#FAF8F5]"
            >
              {/* Accordion Trigger */}
              <button
                type="button"
                onClick={() => toggleMonth(monthKey)}
                className="w-full px-5 py-3.5 flex items-center justify-between bg-[#F3EFE6] hover:bg-[#EAE4D6] transition-colors text-right outline-none group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg font-serif font-bold text-stone-900 group-hover:text-[#9A7B38] transition-colors">
                    {monthLabel}
                  </span>
                  <span className="text-xs bg-stone-200 text-stone-800 font-bold px-2.5 py-0.5 rounded-full border border-stone-300 transition-all">
                    {monthDeceased.length}
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-[#9A7B38]" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-stone-500 group-hover:text-[#9A7B38]" />
                )}
              </button>

              {/* Accordion Content */}
              {isExpanded && (
                <div className="p-4 bg-[#FAF8F5] border-t border-stone-200 divide-y divide-stone-200/80">
                  {monthDeceased.length === 0 ? (
                    <div className="py-4 text-center text-stone-500 text-xs italic">
                      {lang === 'he' ? 'אין רשומות לחודש זה' : lang === 'ru' ? 'Нет записей на этот месяц' : 'No records for this month'}
                    </div>
                  ) : (
                    monthDeceased
                      .sort((a, b) => a.day - b.day)
                      .map((deceased) => {
                        const dayStr = lang === 'he' ? gimatriya(deceased.day) : deceased.day.toString();
                        const localizedHebDay = lang === 'he' ? `${dayStr} ב${monthLabel}` : `${dayStr} ${monthLabel}`;
                        
                        const currentYear = new Date().getFullYear();
                        const yahrDate = findYahrzeitGregorianDate(deceased.day, deceased.month, currentYear);
                        let isToday = false;
                        let isUpcoming = false;
                        if (yahrDate) {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const target = new Date(yahrDate);
                          target.setHours(0, 0, 0, 0);
                          let diffTime = target.getTime() - today.getTime();
                          if (diffTime < 0) {
                            const nextYahrDate = findYahrzeitGregorianDate(deceased.day, deceased.month, currentYear + 1);
                            if (nextYahrDate) {
                              const nextTarget = new Date(nextYahrDate);
                              nextTarget.setHours(0, 0, 0, 0);
                              diffTime = nextTarget.getTime() - today.getTime();
                            }
                          }
                          const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                          isToday = diffTime === 0 || days === 0;
                          isUpcoming = days > 0 && days <= 7;
                        }

                        const borderClass = isToday 
                          ? 'border border-amber-500 bg-amber-50' 
                          : isUpcoming 
                            ? 'border border-amber-300 bg-amber-50/50' 
                            : 'border border-transparent hover:bg-[#F3EFE6]';

                        return (
                          <div 
                            key={deceased.id}
                            onClick={() => onSelectDeceased(deceased)}
                            className={`py-3 px-3 my-1 flex items-center justify-between cursor-pointer transition-all duration-200 group rounded-xl ${borderClass}`}
                          >
                            <div className="flex items-center gap-4">
                              {/* Thumbnail Image */}
                              <DeceasedPhotoFrame deceased={deceased} size="thumb" lang={lang} />
                              
                              <div>
                                <h4 className="text-sm font-serif font-bold text-stone-900 group-hover:text-[#9A7B38] transition-colors">
                                  {getLocalizedName(deceased, lang)}
                                </h4>
                                <p className="text-xs text-stone-600 font-serif italic">
                                  {formatParentRelation(deceased.gender, deceased.fatherName, deceased.motherName, lang, deceased)}
                                </p>
                                {/* Additional details before click */}
                                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-stone-500 font-sans">
                                  {deceased.ageAtDeath !== undefined && deceased.ageAtDeath !== null && (
                                    <span>
                                      {lang === 'he' ? `גיל פטירה: ${deceased.ageAtDeath}` : lang === 'ru' ? `Возраст: ${deceased.ageAtDeath}` : `Age of death: ${deceased.ageAtDeath}`}
                                    </span>
                                  )}
                                  {deceased.birthDate && (
                                    <span>
                                      {lang === 'he' ? `תאריך לידה: ${deceased.birthDate}` : lang === 'ru' ? `Дата рожд.: ${deceased.birthDate}` : `Born: ${deceased.birthDate}`}
                                    </span>
                                  )}
                                  {(() => {
                                    const currentYear = new Date().getFullYear();
                                    const yahrDate = findYahrzeitGregorianDate(deceased.day, deceased.month, currentYear);
                                    if (yahrDate) {
                                      const dayName = getDayOfWeekName(yahrDate, lang);
                                      const dateStr = formatDateGregorian(yahrDate, lang);
                                      return (
                                        <span className="text-[#9A7B38] font-medium">
                                          {lang === 'he' 
                                            ? `האזכרה השנה: ${dayName}, ${dateStr}` 
                                            : lang === 'ru' 
                                            ? `Поминовение в этом году: ${dayName}, ${dateStr}` 
                                            : `Yahrzeit this year: ${dayName}, ${dateStr}`}
                                        </span>
                                      );
                                    }
                                    return null;
                                  })()}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <span className="text-xs text-[#9A7B38] bg-[#F3EFE6] px-2.5 py-1 rounded-lg border border-stone-300 font-serif font-bold">
                                {localizedHebDay}
                              </span>
                              <button
                                type="button"
                                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-full bg-[#9A7B38] text-white transition-all shadow-xs"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
