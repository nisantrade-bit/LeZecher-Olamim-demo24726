/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Deceased, Language } from '../types';
import { translations, formatParentRelation } from '../utils/translations';
import { translateText } from '../utils/transliteration';
import { HEBREW_MONTHS_HE, HEBREW_MONTHS_EN, HEBREW_MONTHS_RU, gimatriya, getHebrewDate, normalizeMonthName } from '../utils/hebrewDate';
import { LayoutGrid, Flame, MapPin } from 'lucide-react';

const CITIES = [
  { id: 293397, nameHe: "תל אביב", nameEn: "Tel Aviv", nameRu: "Тель-Авив" },
  { id: 281184, nameHe: "ירושלים", nameEn: "Jerusalem", nameRu: "Иерусалим" },
  { id: 294801, nameHe: "חיפה", nameEn: "Haifa", nameRu: "Хайфа" },
  { id: 5128581, nameHe: "ניו יורק", nameEn: "New York", nameRu: "Нью-Йорк" },
  { id: 2643743, nameHe: "לונדון", nameEn: "London", nameRu: "Лондон" },
  { id: 2988507, nameHe: "פריז", nameEn: "Paris", nameRu: "Париж" },
  { id: 524901, nameHe: "מוסקבה", nameEn: "Moscow", nameRu: "Москва" },
  { id: 703448, nameHe: "קייב", nameEn: "Киев", nameRu: "Киев" }
];

interface Quick30GridProps {
  deceasedList: Deceased[];
  lang: Language;
  onSelectDeceased: (deceased: Deceased) => void;
}

export const Quick30Grid: React.FC<Quick30GridProps> = ({ deceasedList, lang, onSelectDeceased }) => {
  const t = translations[lang];

  // Initialize with current Hebrew month
  const currentHebDate = getHebrewDate(new Date());
  const [selectedMonth, setSelectedMonth] = useState<string>(currentHebDate.normalizedMonth);
  const [selectedDayInfo, setSelectedDayInfo] = useState<{
    dayNum: number;
    dayGimatriya: string;
    yahrzeits: Deceased[];
  } | null>(null);

  const [selectedCity, setSelectedCity] = useState(() => {
    try {
      const stored = localStorage.getItem('shabbat_default_city_id');
      if (stored) {
        const found = CITIES.find(c => c.id === Number(stored));
        if (found) return found;
      }
    } catch (e) {}
    return CITIES[0]; // Tel Aviv
  });

  const [hebcalEvents, setHebcalEvents] = useState<any[]>([]);

  // Synchronize city selection with localStorage change in real-time
  useEffect(() => {
    const checkCity = () => {
      try {
        const stored = localStorage.getItem('shabbat_default_city_id');
        if (stored) {
          const found = CITIES.find(c => c.id === Number(stored));
          if (found && found.id !== selectedCity.id) {
            setSelectedCity(found);
          }
        }
      } catch (e) {}
    };
    const interval = setInterval(checkCity, 1000);
    return () => clearInterval(interval);
  }, [selectedCity.id]);

  // Fetch Shabbat & holiday times for selected city
  useEffect(() => {
    const fetchTimes = async () => {
      try {
        const year = new Date().getFullYear();
        const isIsrael = [281184, 293397, 294801].includes(selectedCity.id);
        const res = await fetch(`https://www.hebcal.com/hebcal?v=1&cfg=json&maj=on&min=on&mod=on&nh=on&c=on&s=on&year=${year}&geonameid=${selectedCity.id}&b=18&m=50&i=${isIsrael ? 'on' : 'off'}`);
        if (res.ok) {
          const data = await res.json();
          setHebcalEvents(data.items || []);
        }
      } catch (err) {
        console.error("Error fetching Hebcal for Quick30Grid:", err);
      }
    };
    fetchTimes();
  }, [selectedCity.id]);

  const monthsList = HEBREW_MONTHS_HE;
  const monthLabelsTranslated = lang === 'he' ? HEBREW_MONTHS_HE : lang === 'en' ? HEBREW_MONTHS_EN : HEBREW_MONTHS_RU;

  return (
    <div id="quick-30-grid-panel" className="bg-[#131a26] border border-[#c8a96e]/20 rounded-xl p-6 text-[#f0f4f8] shadow-lg">
      {/* Header & Month Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#c8a96e]/10 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <LayoutGrid className="w-6 h-6 text-[#c8a96e]" />
          <div>
            <h3 className="text-lg font-serif font-bold text-[#c8a96e] tracking-wide">
              {t.quick30Grid}
            </h3>
            <p className="text-xs text-gray-400 font-sans mt-0.5">
              {lang === 'he' ? 'סקירה חזותית מהירה של נרות נשמה לאורך 30 ימי חודש עברי' : 'Quick visual overview of memorial candles across the 30 Hebrew month days'}
            </p>
          </div>
        </div>

        {/* Controls Container */}
        <div className="flex flex-wrap items-center gap-3">
          {/* City Dropdown */}
          <div className="flex items-center gap-2 bg-[#0d0d0d] px-3 py-1.5 rounded-lg border border-[#c8a96e]/20 text-xs font-sans">
            <MapPin className="w-3.5 h-3.5 text-[#c8a96e]" />
            <span className="text-gray-400 font-medium">{lang === 'he' ? 'עיר:' : lang === 'ru' ? 'Город:' : 'City:'}</span>
            <select
              value={selectedCity.id}
              onChange={(e) => {
                const cid = Number(e.target.value);
                const found = CITIES.find(c => c.id === cid);
                if (found) {
                  setSelectedCity(found);
                  localStorage.setItem('shabbat_default_city_id', String(cid));
                }
              }}
              className="bg-transparent border-none text-[#c8a96e] font-semibold outline-none cursor-pointer"
            >
              {CITIES.map(c => (
                <option key={c.id} value={c.id} className="bg-[#0d0d0d] text-white">
                  {lang === 'he' ? c.nameHe : lang === 'ru' ? c.nameRu : c.nameEn}
                </option>
              ))}
            </select>
          </div>

          {/* Month Dropdown */}
          <div className="flex items-center gap-2 bg-[#0d0d0d] px-3 py-1.5 rounded-lg border border-[#c8a96e]/20 text-xs font-sans">
            <span className="text-gray-400 font-medium">{t.hebrewMonth}:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent border-none text-[#c8a96e] font-semibold outline-none cursor-pointer"
            >
              <option value="all" className="bg-[#0d0d0d] text-white">
                {lang === 'he' ? "כל החודשים" : lang === 'ru' ? "Все месяцы" : "All Months"}
              </option>
              {monthsList.map((m, idx) => (
                <option key={m} value={m} className="bg-[#0d0d0d] text-white">
                  {monthLabelsTranslated[idx]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 30 Day Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-3 font-sans">
        {Array.from({ length: 30 }, (_, i) => {
          const dayNum = i + 1;
          const dayGimatriya = gimatriya(dayNum);

          // Find matches for this day
          const dayMatches = deceasedList.filter(d => 
            Number(d.day) === dayNum && (selectedMonth === 'all' || normalizeMonthName(d.month) === selectedMonth)
          );

          return (
            <div
              key={dayNum}
              onClick={() => setSelectedDayInfo({
                dayNum,
                dayGimatriya,
                yahrzeits: dayMatches
              })}
              className={`min-h-[100px] p-2.5 bg-[#0d0d0d]/40 rounded-lg border flex flex-col justify-between transition-all cursor-pointer ${
                dayMatches.length > 0 
                  ? 'border-[#c8a96e]/40 bg-[#c8a96e]/3 hover:border-[#c8a96e]/80' 
                  : 'border-[#c8a96e]/10 hover:border-[#c8a96e]/20'
              }`}
            >
              {/* Day Header */}
              <div className="flex justify-between items-center text-[10px] text-gray-500 font-semibold border-b border-[#c8a96e]/5 pb-1">
                <span>{dayNum}</span>
                <span className="text-[#c8a96e]/70">{dayGimatriya}</span>
              </div>

              {/* Candles / Deceased names list */}
              <div className="flex-1 my-1.5 flex flex-col justify-center gap-1.5 overflow-y-auto max-h-[80px]">
                {dayMatches.length === 0 ? (
                  <div className="text-[10px] text-gray-700 text-center py-1">
                    -
                  </div>
                ) : (
                  dayMatches.map(d => (
                    <div
                      key={d.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectDeceased(d);
                      }}
                      className="text-[9px] font-medium leading-normal text-white bg-[#131a26] border border-[#c8a96e]/20 hover:border-[#c8a96e] rounded p-1 cursor-pointer transition-all flex items-start gap-1 group/item"
                    >
                      <Flame className="w-2.5 h-2.5 text-amber-500 fill-amber-500 shrink-0 group-hover/item:scale-110 transition-transform animate-pulse" />
                      <div className="truncate">
                        <p className="font-semibold text-white group-hover/item:text-[#c8a96e] truncate">
                          {lang === 'he' ? d.name : translateText(d.name, lang as 'en' | 'ru')}
                        </p>
                        <p className="text-[8px] text-gray-400 truncate">
                          {formatParentRelation(d.gender, d.fatherName, d.motherName, lang)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer status */}
              <div className="text-[8px] text-gray-600 text-right font-mono">
                {dayMatches.length > 0 ? `${dayMatches.length} 🕯️` : ''}
              </div>
            </div>
          );
        })}
      </div>

      {/* Dedicated Shabbat & Holidays Times Panel */}
      <div className="mt-8 bg-[#2a1d0f]/20 border border-[#c8a96e]/20 rounded-xl p-5 space-y-4 font-sans text-right" dir={lang === 'he' ? 'rtl' : 'ltr'}>
        <div className="flex items-center justify-between border-b border-[#c8a96e]/15 pb-3">
          <h4 className="text-sm font-serif font-bold text-[#c8a96e] flex items-center gap-2">
            <span>🕯️</span>
            <span>
              {lang === 'he' ? `זמני כניסה ויציאה של שבת וחגים - ${selectedCity.nameHe}` : lang === 'ru' ? `Расписание Шаббата и праздников - ${selectedCity.nameRu}` : `Shabbat & Holidays Times - ${selectedCity.nameEn}`}
            </span>
          </h4>
          <span className="text-[10px] bg-[#c8a96e]/10 text-[#c8a96e] px-2.5 py-0.5 rounded font-medium">
            {lang === 'he' ? '35 הימים הקרובים' : 'Next 35 days'}
          </span>
        </div>

        {(() => {
          const groupedEvents: { [dateStr: string]: {
            date: Date;
            holiday?: any;
            candles?: any;
            havdalah?: any;
            parsha?: any;
          }} = {};

          hebcalEvents.forEach(item => {
            if (!item.date) return;
            const dateStr = item.date.split('T')[0] || item.date;
            const d = new Date(dateStr);
            const now = new Date();
            now.setHours(0,0,0,0);
            
            const diffTime = d.getTime() - now.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays < -1 || diffDays > 35) return;

            if (!groupedEvents[dateStr]) {
              groupedEvents[dateStr] = { date: d };
            }

            if (item.category === 'holiday') {
              groupedEvents[dateStr].holiday = item;
            } else if (item.category === 'candles') {
              groupedEvents[dateStr].candles = item;
            } else if (item.category === 'havdalah') {
              groupedEvents[dateStr].havdalah = item;
            } else if (item.category === 'parashat') {
              groupedEvents[dateStr].parsha = item;
            }
          });

          const list = Object.keys(groupedEvents)
            .sort()
            .map(dateStr => groupedEvents[dateStr])
            .filter(item => item.holiday || item.candles || item.havdalah || item.parsha);

          if (list.length === 0) {
            return (
              <p className="text-xs text-gray-500 italic text-center py-4">
                {lang === 'he' ? 'טוען זמני שבת וחגים...' : 'Loading Shabbat and holiday times...'}
              </p>
            );
          }

          return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {list.map((item, index) => {
                const isFriday = item.date.getDay() === 5;
                const isSaturday = item.date.getDay() === 6;
                const formattedDate = item.date.toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-US', {
                  month: 'short',
                  day: 'numeric',
                  weekday: 'short'
                });

                return (
                  <div 
                    key={index} 
                    className="bg-[#0d0d0d]/40 border border-[#c8a96e]/10 rounded-xl p-3.5 space-y-2 hover:border-[#c8a96e]/30 transition-all text-right"
                  >
                    <div className="flex justify-between items-center border-b border-[#c8a96e]/5 pb-1.5">
                      <span className="text-[11px] font-bold text-white font-sans">
                        {formattedDate}
                      </span>
                      <span className="text-[10px] font-medium text-amber-400">
                        {isFriday ? (lang === 'he' ? 'ערב שבת' : 'Friday') : isSaturday ? (lang === 'he' ? 'יום שבת' : 'Saturday') : (lang === 'he' ? 'חג / מועד' : 'Holiday')}
                      </span>
                    </div>

                    {item.holiday && (
                      <div className="flex items-center gap-1.5 text-xs text-amber-500 font-semibold bg-amber-500/5 p-1 rounded border border-amber-500/10">
                        <span>✨</span>
                        <span>
                          {lang === 'he' ? item.holiday.hebrew || item.holiday.title : item.holiday.title}
                        </span>
                      </div>
                    )}

                    {item.parsha && (
                      <div className="flex items-center gap-1.5 text-xs text-[#c8a96e] font-medium">
                        <span>📖</span>
                        <span>
                          {lang === 'he' ? item.parsha.hebrew || item.parsha.title : item.parsha.title}
                        </span>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {item.candles && (
                        <div className="bg-black/30 p-1.5 rounded border border-amber-500/5 text-right">
                          <span className="text-[9px] text-gray-400 block">{lang === 'he' ? 'הדלקת נרות' : 'Candles'}</span>
                          <span className="text-xs font-bold text-amber-400 font-mono">
                            {item.candles.title.split(": ")[1] || item.candles.title}
                          </span>
                        </div>
                      )}
                      {item.havdalah && (
                        <div className="bg-black/30 p-1.5 rounded border border-indigo-500/5 text-right">
                          <span className="text-[9px] text-gray-400 block">{lang === 'he' ? 'צאת השבת' : 'Havdalah'}</span>
                          <span className="text-xs font-bold text-indigo-400 font-mono">
                            {item.havdalah.title.split(": ")[1] || item.havdalah.title}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* Day Details Modal */}
      {selectedDayInfo && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 font-sans">
          <div className="bg-[#131a26] border border-[#c8a96e]/30 max-w-md w-full rounded-2xl p-6 shadow-2xl relative space-y-4 text-right" dir={lang === 'he' ? 'rtl' : 'ltr'}>
            <button
              type="button"
              onClick={() => setSelectedDayInfo(null)}
              className="absolute top-4 left-4 text-gray-400 hover:text-white text-xl font-bold leading-none cursor-pointer"
            >
              ×
            </button>

            <div>
              <h3 className="text-lg font-serif font-bold text-[#c8a96e]">
                {lang === 'he' ? `פרטי היום: יום ${selectedDayInfo.dayGimatriya}` : lang === 'ru' ? `День: ${selectedDayInfo.dayGimatriya}` : `Day Details: ${selectedDayInfo.dayGimatriya}`}
              </h3>
              <p className="text-xs text-gray-400 mt-1 font-sans">
                {lang === 'he' 
                  ? `יום ${selectedDayInfo.dayNum} לחודש ${selectedMonth === 'all' ? 'הנבחר' : selectedMonth}` 
                  : `Day ${selectedDayInfo.dayNum} of ${selectedMonth === 'all' ? 'selected month' : selectedMonth}`}
              </p>
            </div>

            {/* Yahrzeits list */}
            <div className="space-y-3">
              <h4 className="text-xs uppercase tracking-wider text-gray-400 font-semibold border-b border-[#c8a96e]/10 pb-1">
                {lang === 'he' ? 'אזכרות ביום זה' : lang === 'ru' ? 'Годовщины смерти' : 'Yahrzeits on this day'}
              </h4>

              {selectedDayInfo.yahrzeits.length === 0 ? (
                <div className="text-center py-6 space-y-2">
                  <div className="text-2xl">🕯️</div>
                  <p className="text-xs text-gray-500 italic">
                    {lang === 'he' ? 'אין אזכרות בתאריך זה בחודש זה.' : lang === 'ru' ? 'Нет годовщин в этот день в выбранном месяце.' : 'No death anniversaries on this date in this month.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {selectedDayInfo.yahrzeits.map((d) => (
                    <div 
                      key={d.id} 
                      className="flex items-center justify-between p-2.5 bg-red-950/20 border border-red-500/10 rounded-xl hover:border-red-500/30 hover:bg-red-950/30 transition-all text-right"
                    >
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                          {lang === 'he' ? d.name : translateText(d.name, lang as 'en' | 'ru')}
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5">
                          {formatParentRelation(d.gender, d.fatherName, d.motherName, lang)}
                        </div>
                        {d.ageAtDeath !== undefined && d.ageAtDeath !== null && (
                          <div className="text-[10px] text-gray-400">
                            {lang === 'he' ? `גיל פטירה: ${d.ageAtDeath}` : lang === 'ru' ? `Возраст: ${d.ageAtDeath}` : `Age of death: ${d.ageAtDeath}`}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDayInfo(null);
                          onSelectDeceased(d);
                        }}
                        className="px-3 py-1 bg-red-950/60 hover:bg-red-900/60 border border-red-500/20 hover:border-red-500/40 text-red-300 font-semibold text-[10px] rounded-lg transition-all cursor-pointer"
                      >
                        {lang === 'he' ? 'לפרטים' : lang === 'ru' ? 'Детали' : 'Details'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setSelectedDayInfo(null)}
              className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold py-2 rounded-xl transition-all text-xs cursor-pointer"
            >
              {lang === 'he' ? 'סגור' : lang === 'ru' ? 'Закрыть' : 'Close'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
