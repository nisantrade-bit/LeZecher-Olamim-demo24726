/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Deceased, Language } from '../types';
import { translations, formatParentRelation } from '../utils/translations';
import { translateText } from '../utils/transliteration';
import { HEBREW_MONTHS_HE, HEBREW_MONTHS_EN, HEBREW_MONTHS_RU, gimatriya, normalizeMonthName, findYahrzeitGregorianDate } from '../utils/hebrewDate';
import { ChevronDown, ChevronUp, Search, Eye } from 'lucide-react';

interface MemorialBookProps {
  deceasedList: Deceased[];
  lang: Language;
  onSelectDeceased: (deceased: Deceased) => void;
}

const getDayOfWeekName = (date: Date, lang: Language): string => {
  const daysHe = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  const daysEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const daysRu = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
  const dayIndex = date.getDay();
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
    <div id="memorial-book-panel" className="bg-[#131a26] border border-[#c8a96e]/20 rounded-xl p-6 text-[#f0f4f8] shadow-lg">
      {/* Title & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#c8a96e]/10 pb-4 mb-6">
        <div>
          <h3 className="text-xl font-serif font-bold text-[#c8a96e] tracking-wide mb-1">
            {t.memorialBook}
          </h3>
          <p className="text-xs text-gray-400 font-sans">
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
            className="w-full bg-[#0d0d0d] border border-[#c8a96e]/30 focus:border-[#c8a96e] rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 outline-none transition-all"
          />
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
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
              className="border border-[#c8a96e]/15 hover:border-[#c8a96e]/40 rounded-lg overflow-hidden transition-all bg-[#0d0d0d]/40"
            >
              {/* Accordion Trigger */}
              <button
                type="button"
                onClick={() => toggleMonth(monthKey)}
                className="w-full px-5 py-4 flex items-center justify-between bg-[#131a26]/40 hover:bg-[#131a26]/80 transition-colors text-right outline-none group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg font-serif font-semibold text-[#c8a96e] group-hover:text-white transition-colors">
                    {monthLabel}
                  </span>
                  <span className="text-xs bg-[#c8a96e]/10 group-hover:bg-[#c8a96e]/20 text-[#c8a96e] px-2.5 py-0.5 rounded-full border border-[#c8a96e]/15 transition-all">
                    {monthDeceased.length}
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-[#c8a96e]" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-500 group-hover:text-[#c8a96e]" />
                )}
              </button>

              {/* Accordion Content */}
              {isExpanded && (
                <div className="p-4 bg-[#0d0d0d]/60 border-t border-[#c8a96e]/10 divide-y divide-[#c8a96e]/10">
                  {monthDeceased.length === 0 ? (
                    <div className="py-4 text-center text-gray-500 text-xs">
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
                          ? 'border border-orange-500/60 bg-orange-950/20 animate-yahrzeit-fire shadow-orange-500/10' 
                          : isUpcoming 
                            ? 'border border-cyan-500/40 bg-purple-950/10 animate-yahrzeit-upcoming shadow-purple-500/5' 
                            : 'border border-transparent hover:bg-[#c8a96e]/5';

                        return (
                          <div 
                            key={deceased.id}
                            onClick={() => onSelectDeceased(deceased)}
                            className={`py-3 px-3 my-1 flex items-center justify-between cursor-pointer transition-all duration-300 group rounded-lg ${borderClass}`}
                          >
                            <div className="flex items-center gap-4">
                              {/* Thumbnail Image or Candle Placeholder */}
                              {deceased.image ? (
                                <div className="w-10 h-10 rounded-full overflow-hidden border border-[#c8a96e]/20 flex items-center justify-center bg-black">
                                  <img 
                                    src={deceased.image} 
                                    alt={deceased.name} 
                                    referrerPolicy="no-referrer"
                                    className="w-full h-full object-cover" 
                                  />
                                </div>
                              ) : (
                                <div className="w-10 h-10 rounded-full border border-[#c8a96e]/20 bg-[#c8a96e]/5 flex items-center justify-center text-lg">
                                  🕯️
                                </div>
                              )}
                              
                              <div>
                                <h4 className="text-sm font-semibold text-white group-hover:text-[#c8a96e] transition-colors">
                                  {lang === 'he' ? deceased.name : translateText(deceased.name, lang as 'en' | 'ru')}
                                </h4>
                                <p className="text-xs text-gray-400">
                                  {formatParentRelation(deceased.gender, deceased.fatherName, deceased.motherName, lang)}
                                </p>
                                {/* Additional details before click */}
                                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-gray-500 font-sans">
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
                                        <span className="text-[#c8a96e]/70">
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
                              <span className="text-xs text-[#c8a96e] bg-[#c8a96e]/10 px-2 py-0.5 rounded border border-[#c8a96e]/15 font-mono">
                                {localizedHebDay}
                              </span>
                              <button
                                type="button"
                                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-full bg-[#c8a96e]/10 hover:bg-[#c8a96e]/25 text-[#c8a96e] transition-all"
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
