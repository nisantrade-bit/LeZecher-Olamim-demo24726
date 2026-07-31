/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Deceased, Language, CalendarMonthData } from '../types';
import { translations } from '../utils/translations';
import { getHebrewDate, getLocalizedHebrewDate, isYahrzeitMatch, HEBREW_MONTHS_HE } from '../utils/hebrewDate';
import { Calendar, ChevronLeft, ChevronRight, MapPin, Sparkles, Loader2 } from 'lucide-react';

interface DynamicCalendarProps {
  deceasedList: Deceased[];
  lang: Language;
  onSelectDeceased: (deceased: Deceased) => void;
}

const CITIES = [
  { id: 293397, nameHe: "תל אביב", nameEn: "Tel Aviv", nameRu: "Тель-Авив" },
  { id: 281184, nameHe: "ירושלים", nameEn: "Jerusalem", nameRu: "Иерусалим" },
  { id: 294801, nameHe: "חיפה", nameEn: "Haifa", nameRu: "Хайфа" },
  { id: 5128581, nameHe: "ניו יורק", nameEn: "New York", nameRu: "Нью-Йорк" },
  { id: 2643743, nameHe: "לונדון", nameEn: "London", nameRu: "Лондон" },
  { id: 2988507, nameHe: "פריז", nameEn: "Paris", nameRu: "Париж" },
  { id: 524901, nameHe: "מוסקבה", nameEn: "Moscow", nameRu: "Москва" },
  { id: 703448, nameHe: "קייב", nameEn: "Kyiv", nameRu: "Киев" }
];

const extractTime = (titleStr: string): string => {
  if (!titleStr) return "";
  const parts = titleStr.split(": ");
  if (parts.length >= 2) {
    // E.g., "Candle lighting: 19:12" -> "19:12"
    // E.g., "Havdalah (50 min): 20:21" -> "20:21"
    return parts[parts.length - 1]; 
  }
  return "";
};

export const DynamicCalendar: React.FC<DynamicCalendarProps> = ({ deceasedList, lang, onSelectDeceased }) => {
  const t = translations[lang];

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedCity, setSelectedCity] = useState(() => {
    try {
      const stored = localStorage.getItem('shabbat_default_city_id');
      if (stored) {
        const found = CITIES.find(c => c.id === Number(stored));
        if (found) return found;
      }
    } catch (e) {
      console.error("Failed to load stored city ID:", e);
    }
    return CITIES[0]; // default to Tel Aviv (now first in list)
  });
  const [hebcalData, setHebcalData] = useState<CalendarMonthData>({});
  const [loading, setLoading] = useState(false);
  const [selectedDayInfo, setSelectedDayInfo] = useState<{
    date: Date;
    dateStr: string;
    localizedHebDateStr: string;
    yahrzeits: Deceased[];
    eveYahrzeits: Deceased[];
    shabbatObj: any;
    dayOfWeek: number;
  } | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-11

  // Fetch Shabbat times, parsha, and candle lighting from Hebcal API
  useEffect(() => {
    let active = true;
    const fetchShabbatTimes = async () => {
      setLoading(true);
      try {
        const isIsrael = [281184, 293397, 294801].includes(selectedCity.id);
        
        // Fetch Shabbat times and Hebcal general calendar (for holidays and torah portions with candles enabled)
        const [shabbatRes, hebcalRes] = await Promise.all([
          fetch(`https://www.hebcal.com/shabbat?cfg=json&year=${year}&month=${month + 1}&geonameid=${selectedCity.id}&m=50&b=18`),
          fetch(`https://www.hebcal.com/hebcal?v=1&cfg=json&s=on&maj=on&min=on&mod=on&nh=on&c=on&year=${year}&month=${month + 1}&geonameid=${selectedCity.id}&b=18&m=50&i=${isIsrael ? 'on' : 'off'}`)
        ]);

        if (!shabbatRes.ok || !hebcalRes.ok) {
          throw new Error("One or more Hebcal requests failed");
        }

        const shabbatData = await shabbatRes.json();
        const hebcalDataRaw = await hebcalRes.json();
        
        if (!active) return;

        const mapped: CalendarMonthData = {};

        // Merge Shabbat local candle and havdalah times
        shabbatData.items?.forEach((item: any) => {
          const dateKey = item.date.split("T")[0]; // "YYYY-MM-DD"
          if (!mapped[dateKey]) {
            mapped[dateKey] = {};
          }

          if (item.category === "candles") {
            const time = extractTime(item.title);
            mapped[dateKey].candles = item.title; // e.g. "Candle lighting: 19:12"
            mapped[dateKey].hebrewCandles = `הדלקת נרות: ${time}`;
          } else if (item.category === "havdalah") {
            const time = extractTime(item.title);
            mapped[dateKey].havdalah = item.title; // e.g. "Havdalah: 20:21"
            mapped[dateKey].hebrewHavdalah = `צאת השבת: ${time}`;
          } else if (item.category === "parashat") {
            mapped[dateKey].parsha = item.title;
            mapped[dateKey].hebrewParsha = item.hebrew || "פרשת השבוע";
          }
        });

        // Merge general calendar holidays, rosh chodesh, and torah portions, plus any holiday candles/havdalah
        hebcalDataRaw.items?.forEach((item: any) => {
          const dateKey = item.date.split("T")[0]; // handle "YYYY-MM-DDTHH:MM:SS" with split
          if (!mapped[dateKey]) {
            mapped[dateKey] = {};
          }

          if (item.category === "parashat") {
            mapped[dateKey].parsha = item.title;
            mapped[dateKey].hebrewParsha = item.hebrew || "פרשת השבוע";
          } else if (item.category === "holiday") {
            mapped[dateKey].holiday = item.title;
            mapped[dateKey].hebrewHoliday = item.hebrew;
            mapped[dateKey].isHoliday = true; // major holiday
          } else if (item.category === "roshchodesh") {
            mapped[dateKey].holiday = item.title;
            mapped[dateKey].hebrewHoliday = item.hebrew;
            mapped[dateKey].isHoliday = false; // Rosh Chodesh / minor holiday
          } else if (item.category === "candles" && !mapped[dateKey].candles) {
            const time = extractTime(item.title);
            mapped[dateKey].candles = item.title;
            mapped[dateKey].hebrewCandles = `הדלקת נרות: ${time}`;
          } else if (item.category === "havdalah" && !mapped[dateKey].havdalah) {
            const time = extractTime(item.title);
            mapped[dateKey].havdalah = item.title;
            mapped[dateKey].hebrewHavdalah = `צאת החג/השבת: ${time}`;
          }
        });

        setHebcalData(mapped);
      } catch (err) {
        console.error("Error fetching Hebcal times:", err);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchShabbatTimes();

    return () => {
      active = false;
    };
  }, [year, month, selectedCity.id]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Generate calendar days for Grid
  const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const getFirstDayIndex = (y: number, m: number) => new Date(y, m, 1).getDay(); // Sunday=0, etc.

  const daysInCurrentMonth = getDaysInMonth(year, month);
  const firstDayIdx = getFirstDayIndex(year, month);

  // Calendar cells array
  const cells: Array<{
    date: Date | null;
    dayNum: number | null;
    dateStr: string; // YYYY-MM-DD
    isToday: boolean;
  }> = [];

  // Fill empty cells before first day
  for (let i = 0; i < firstDayIdx; i++) {
    cells.push({ date: null, dayNum: null, dateStr: '', isToday: false });
  }

  const today = new Date();
  // Fill actual month days
  for (let dNum = 1; dNum <= daysInCurrentMonth; dNum++) {
    const cellDate = new Date(year, month, dNum);
    const yyyy = cellDate.getFullYear();
    const mm = String(cellDate.getMonth() + 1).padStart(2, '0');
    const dd = String(cellDate.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    
    const isToday = 
      today.getDate() === dNum && 
      today.getMonth() === month && 
      today.getFullYear() === year;

    cells.push({
      date: cellDate,
      dayNum: dNum,
      dateStr,
      isToday
    });
  }

  // Row header days of week
  const weekdaysHe = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
  const weekdaysEn = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const weekdaysRu = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
  const currentWeekdays = lang === 'he' ? weekdaysHe : lang === 'en' ? weekdaysEn : weekdaysRu;

  // Localized Gregorian month name
  const monthNamesHe = [
    "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
    "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"
  ];
  const monthNamesEn = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const monthNamesRu = [
    "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
    "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
  ];
  const localizedGregMonth = 
    lang === 'he' ? monthNamesHe[month] : 
    lang === 'en' ? monthNamesEn[month] : 
    monthNamesRu[month];

  // Hebrew years matching this Gregorian month
  const firstDayHebDate = getHebrewDate(new Date(year, month, 1));
  const lastDayHebDate = getHebrewDate(new Date(year, month, daysInCurrentMonth));
  
  const hebrewYearsString = firstDayHebDate.year === lastDayHebDate.year
    ? `ה׳תש${lang === 'he' ? 'פ״ו' : '86'}` // placeholder standard, or display year
    : `ה׳${firstDayHebDate.year} - ה׳${lastDayHebDate.year}`;

  const cityName = 
    lang === 'he' ? selectedCity.nameHe : 
    lang === 'en' ? selectedCity.nameEn : 
    selectedCity.nameRu;

  return (
    <div id="dynamic-calendar-panel" className="bg-[#131a26] border border-[#c8a96e]/20 rounded-xl p-6 text-[#f0f4f8] shadow-lg">
      
      {/* Header controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#c8a96e]/10 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <Calendar className="w-6 h-6 text-[#c8a96e]" />
          <div>
            <h3 className="text-lg font-serif font-bold text-[#c8a96e] tracking-wide">
              {t.calendar}
            </h3>
            <div className="flex items-center gap-2 text-xs text-gray-400 font-sans mt-0.5">
              <span>{localizedGregMonth} {year}</span>
              <span className="text-[#c8a96e]/60">•</span>
              <span className="text-[#c8a96e]">{firstDayHebDate.normalizedMonth} - {lastDayHebDate.normalizedMonth} {firstDayHebDate.year}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          {/* City select for Shabbat times */}
          <div className="flex items-center gap-1.5 bg-[#0d0d0d] px-3 py-1.5 rounded-lg border border-[#c8a96e]/20 text-xs">
            <MapPin className="w-3.5 h-3.5 text-[#c8a96e]" />
            <span className="text-gray-400 font-sans font-medium mr-1">{t.city}:</span>
            <select
              value={selectedCity.id}
              onChange={(e) => {
                const found = CITIES.find(c => c.id === Number(e.target.value));
                if (found) {
                  setSelectedCity(found);
                  try {
                    localStorage.setItem('shabbat_default_city_id', found.id.toString());
                  } catch (err) {
                    console.error("Failed to save city ID to storage:", err);
                  }
                }
              }}
              className="bg-transparent border-none text-[#c8a96e] font-sans font-semibold outline-none cursor-pointer"
            >
              {CITIES.map(c => (
                <option key={c.id} value={c.id} className="bg-[#0d0d0d] text-[#c8a96e]">
                  {lang === 'he' ? c.nameHe : lang === 'en' ? c.nameEn : c.nameRu}
                </option>
              ))}
            </select>
          </div>

          {/* Navigation Month buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg border border-[#c8a96e]/20 hover:bg-[#c8a96e]/10 text-[#c8a96e] transition-all cursor-pointer"
              title={t.prevMonth}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg border border-[#c8a96e]/20 hover:bg-[#c8a96e]/10 text-[#c8a96e] transition-all cursor-pointer"
              title={t.nextMonth}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Loader indicator */}
      {loading && (
        <div className="flex items-center justify-center gap-2 mb-4 text-xs font-sans text-[#c8a96e]">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>{lang === 'he' ? 'טוען זמני שבת...' : 'Loading Shabbat times...'}</span>
        </div>
      )}

      {/* Calendar Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[640px]">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1.5 mb-2 font-sans text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
            {currentWeekdays.map((dayName, idx) => (
              <div 
                key={idx} 
                className={`py-2 rounded bg-[#0d0d0d]/40 ${idx === 5 ? 'text-amber-500/85' : idx === 6 ? 'text-[#c8a96e]' : ''}`}
              >
                {dayName}
              </div>
            ))}
          </div>

          {/* Day Cells Grid */}
          <div className="grid grid-cols-7 gap-1.5 font-sans">
            {cells.map((cell, idx) => {
              if (cell.dayNum === null || !cell.date) {
                return (
                  <div 
                    key={`empty-${idx}`} 
                    className="aspect-square bg-[#0d0d0d]/10 rounded-lg border border-transparent"
                  ></div>
                );
              }

              const hbDate = getHebrewDate(cell.date);
              const localizedHebDateStr = getLocalizedHebrewDate(cell.date, lang);

              // 1) Daytime Yahrzeits falling on this Gregorian day
              const cellYahrzeits = deceasedList.filter(d => 
                isYahrzeitMatch(d.day, d.month, hbDate.day, hbDate.normalizedMonth, hbDate.isLeapYear)
              );

              // 2) Evening Yahrzeits starting on this Gregorian day at sunset (which are daytime Yahrzeits on tomorrow's Gregorian day)
              const nextDayDate = new Date(cell.date);
              nextDayDate.setDate(nextDayDate.getDate() + 1);
              const nextHbDate = getHebrewDate(nextDayDate);
              const eveYahrzeits = deceasedList.filter(d => 
                isYahrzeitMatch(d.day, d.month, nextHbDate.day, nextHbDate.normalizedMonth, nextHbDate.isLeapYear)
              );

              const shabbatObj = hebcalData[cell.dateStr] || {};
              const dayOfWeek = cell.date.getDay(); // 0-6 (0=Sunday, 5=Friday, 6=Saturday)

              return (
                <div
                  key={`day-${cell.dayNum}`}
                  onClick={() => {
                    setSelectedDayInfo({
                      date: cell.date!,
                      dateStr: cell.dateStr,
                      localizedHebDateStr,
                      yahrzeits: cellYahrzeits,
                      eveYahrzeits,
                      shabbatObj,
                      dayOfWeek
                    });
                  }}
                  className={`aspect-square p-2 bg-[#0d0d0d]/60 border rounded-lg flex flex-col justify-between transition-all group cursor-pointer overflow-hidden ${
                    cell.isToday 
                      ? 'border-[#c8a96e] ring-1 ring-[#c8a96e]/40 bg-[#c8a96e]/5' 
                      : 'border-[#c8a96e]/10 hover:border-[#c8a96e]/30 hover:bg-[#131a26]'
                  } ${dayOfWeek === 6 ? 'bg-[#c8a96e]/3' : ''}`}
                >
                  {/* Top line: dates */}
                  <div className="flex items-start justify-between">
                    <span className={`text-xs font-bold ${cell.isToday ? 'text-[#c8a96e]' : 'text-white'}`}>
                      {cell.dayNum}
                    </span>
                    <span className="text-[9px] font-medium text-gray-400 text-right leading-tight max-w-[80%] whitespace-nowrap overflow-hidden text-ellipsis" title={localizedHebDateStr}>
                      {localizedHebDateStr}
                    </span>
                  </div>

                  {/* Middle content: Yahrzeits or Shabbat Info */}
                  <div className="my-1 flex-1 flex flex-col justify-start gap-1 overflow-hidden">
                    {/* General Holidays / Rosh Chodesh on any day */}
                    {shabbatObj.holiday && (
                      <div className={`text-[8.5px] font-semibold leading-none py-0.5 px-1 rounded flex items-center gap-1 truncate ${
                        shabbatObj.isHoliday 
                          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' 
                          : 'bg-blue-500/10 text-blue-400 border border-blue-500/15'
                      }`} title={lang === 'he' ? shabbatObj.hebrewHoliday : shabbatObj.holiday}>
                        <span className="text-[9px]">{shabbatObj.isHoliday ? '🎉' : '🌙'}</span>
                        <span className="truncate">
                          {lang === 'he' ? shabbatObj.hebrewHoliday : shabbatObj.holiday}
                        </span>
                      </div>
                    )}

                    {/* Candle lighting (on any day of the week, Shabbat eve or holiday eve) */}
                    {shabbatObj.candles && (
                      <div className="text-[9px] text-amber-500/90 font-medium leading-none flex items-center gap-0.5" title={lang === 'he' ? shabbatObj.hebrewCandles : shabbatObj.candles}>
                        <span className="text-[10px]">🕯️</span>
                        <span className="whitespace-nowrap font-mono text-[8.5px]">
                          {lang === 'he' ? `כניסה: ${extractTime(shabbatObj.candles)}` : lang === 'ru' ? `Вход: ${extractTime(shabbatObj.candles)}` : `In: ${extractTime(shabbatObj.candles)}`}
                        </span>
                      </div>
                    )}

                    {shabbatObj.parsha && (
                      <div className="text-[9px] text-[#c8a96e] font-semibold leading-none truncate" title={lang === 'he' ? shabbatObj.hebrewParsha : shabbatObj.parsha}>
                        <span>📖 </span>
                        <span className="font-sans">
                          {lang === 'he' ? shabbatObj.hebrewParsha.replace('פרשת ', '') : shabbatObj.parsha.replace('Parashat ', '')}
                        </span>
                      </div>
                    )}

                    {/* Havdalah (on any day of the week, Shabbat end or holiday end) */}
                    {shabbatObj.havdalah && (
                      <div className="text-[9px] text-indigo-400 font-medium leading-none flex items-center gap-0.5" title={lang === 'he' ? shabbatObj.hebrewHavdalah : shabbatObj.havdalah}>
                        <span>✨</span>
                        <span className="whitespace-nowrap font-mono text-[8.5px]">
                          {lang === 'he' ? `יציאה: ${extractTime(shabbatObj.havdalah)}` : lang === 'ru' ? `Выход: ${extractTime(shabbatObj.havdalah)}` : `Out: ${extractTime(shabbatObj.havdalah)}`}
                        </span>
                      </div>
                    )}

                    {/* Daytime Yahrzeit Tags */}
                    {cellYahrzeits.map(d => (
                      <div
                        key={`day-${d.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectDeceased(d);
                        }}
                        className="bg-red-950/50 hover:bg-red-900/80 border border-red-700/50 rounded px-1 py-0.5 text-[8.5px] font-semibold text-red-200 leading-tight flex items-center gap-1 cursor-pointer transition-all truncate"
                        title={lang === 'he' ? `יום אזכרה: ${d.name}` : `Yahrzeit: ${d.name}`}
                      >
                        <span className="animate-pulse">🕯️</span>
                        <span className="truncate">{d.name}</span>
                      </div>
                    ))}

                    {/* Evening Yahrzeit Tags (starting tonight at sunset) */}
                    {eveYahrzeits.map(d => (
                      <div
                        key={`eve-${d.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectDeceased(d);
                        }}
                        className="bg-amber-950/50 hover:bg-amber-900/80 border border-amber-600/50 rounded px-1 py-0.5 text-[8.5px] font-semibold text-amber-200 leading-tight flex items-center gap-1 cursor-pointer transition-all truncate"
                        title={lang === 'he' ? `ערב אזכרה (הדלקת נר בשקיעה): ${d.name}` : `Erev Yahrzeit (candle lighting at sunset): ${d.name}`}
                      >
                        <span className="animate-pulse">🕯️</span>
                        <span className="truncate">{lang === 'he' ? `ערב: ${d.name}` : `Eve: ${d.name}`}</span>
                      </div>
                    ))}
                  </div>

                  {/* Bottom line: Subtle decor */}
                  <div className="flex items-center justify-between text-[8px] text-gray-500">
                    <span className="font-mono">
                      {String(month + 1).padStart(2, '0')}/{String(cell.dayNum).padStart(2, '0')}
                    </span>
                    {cell.isToday && (
                      <span className="text-[9px] text-[#c8a96e] font-semibold flex items-center gap-0.5 animate-pulse">
                        <Sparkles className="w-2.5 h-2.5" />
                        {lang === 'he' ? 'היום' : lang === 'ru' ? 'Сегодня' : 'TODAY'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Dedicated Shabbat & Holidays Times Panel */}
      <div className="mt-8 bg-[#2a1d0f]/20 border border-[#c8a96e]/20 rounded-xl p-5 space-y-4 font-sans text-right" dir={lang === 'he' ? 'rtl' : 'ltr'}>
        <div className="flex items-center justify-between border-b border-[#c8a96e]/15 pb-3">
          <h4 className="text-sm font-serif font-bold text-[#c8a96e] flex items-center gap-2">
            <span>🕯️</span>
            <span>
              {lang === 'he' ? `ריכוז זמני שבת וחגים - ${cityName}` : lang === 'ru' ? `Расписание Шаббата и праздников - ${cityName}` : `Shabbat & Holidays Schedule - ${cityName}`}
            </span>
          </h4>
          <span className="text-[10px] bg-[#c8a96e]/10 text-[#c8a96e] px-2.5 py-0.5 rounded font-medium">
            {localizedGregMonth} {year}
          </span>
        </div>

        {(() => {
          const list: Array<{
            dateStr: string;
            date: Date;
            holiday?: string;
            hebrewHoliday?: string;
            candles?: string;
            hebrewCandles?: string;
            havdalah?: string;
            hebrewHavdalah?: string;
            parsha?: string;
            hebrewParsha?: string;
            isHoliday?: boolean;
          }> = [];

          Object.keys(hebcalData).sort().forEach(key => {
            const data = hebcalData[key];
            const d = new Date(key);
            const isFriday = d.getDay() === 5;
            const isSaturday = d.getDay() === 6;
            
            if (data.holiday || (isFriday && data.candles) || (isSaturday && data.havdalah)) {
              list.push({
                dateStr: key,
                date: d,
                ...data
              });
            }
          });

          if (list.length === 0) {
            return (
              <p className="text-xs text-gray-500 italic text-center py-4">
                {lang === 'he' ? 'אין זמני שבת או חגים טעונים עבור חודש זה.' : 'No Shabbat or holiday times loaded for this month.'}
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
                          {lang === 'he' ? item.hebrewHoliday : item.holiday}
                        </span>
                      </div>
                    )}

                    {item.parsha && (
                      <div className="flex items-center gap-1.5 text-xs text-[#c8a96e] font-medium">
                        <span>📖</span>
                        <span>
                          {lang === 'he' ? item.hebrewParsha : item.parsha}
                        </span>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {item.candles && (
                        <div className="bg-black/30 p-1.5 rounded border border-amber-500/5 text-right">
                          <span className="text-[9px] text-gray-400 block">{lang === 'he' ? 'הדלקת נרות' : 'Candles'}</span>
                          <span className="text-xs font-bold text-amber-400 font-mono">
                            {item.candles.split(": ")[1] || item.candles}
                          </span>
                        </div>
                      )}
                      {item.havdalah && (
                        <div className="bg-black/30 p-1.5 rounded border border-indigo-500/5 text-right">
                          <span className="text-[9px] text-gray-400 block">{lang === 'he' ? 'צאת השבת' : 'Havdalah'}</span>
                          <span className="text-xs font-bold text-indigo-400 font-mono">
                            {item.havdalah.split(": ")[1] || item.havdalah}
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
                {lang === 'he' ? 'מידע ותאריכי היום' : lang === 'ru' ? 'Информация о дне' : 'Day Details'}
              </h3>
              <p className="text-sm text-white font-semibold mt-1">
                {selectedDayInfo.date.toLocaleDateString(lang === 'he' ? 'he-IL' : lang === 'ru' ? 'ru-RU' : 'en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
              <p className="text-xs text-[#c8a96e] mt-0.5">
                {selectedDayInfo.localizedHebDateStr}
              </p>
            </div>

            {/* Shabbat & Holiday Info */}
            {(selectedDayInfo.shabbatObj.holiday || selectedDayInfo.shabbatObj.candles || selectedDayInfo.shabbatObj.parsha || selectedDayInfo.shabbatObj.havdalah) && (
              <div className="bg-[#0d0d0d]/40 border border-[#c8a96e]/10 p-3 rounded-xl space-y-2 text-xs">
                {selectedDayInfo.shabbatObj.holiday && (
                  <div className="flex items-center gap-2 text-amber-400">
                    <span>🎉</span>
                    <span className="font-semibold">
                      {lang === 'he' ? selectedDayInfo.shabbatObj.hebrewHoliday : selectedDayInfo.shabbatObj.holiday}
                    </span>
                  </div>
                )}
                {selectedDayInfo.shabbatObj.candles && (
                  <div className="flex items-center gap-2 text-yellow-500">
                    <span>🕯️</span>
                    <span>
                      {lang === 'he' ? selectedDayInfo.shabbatObj.hebrewCandles : selectedDayInfo.shabbatObj.candles}
                    </span>
                  </div>
                )}
                {selectedDayInfo.shabbatObj.parsha && (
                  <div className="flex items-center gap-2 text-[#c8a96e]">
                    <span>📖</span>
                    <span>
                      {lang === 'he' ? selectedDayInfo.shabbatObj.hebrewParsha : selectedDayInfo.shabbatObj.parsha}
                    </span>
                  </div>
                )}
                {selectedDayInfo.shabbatObj.havdalah && (
                  <div className="flex items-center gap-2 text-indigo-400">
                    <span>✨</span>
                    <span>
                      {lang === 'he' ? selectedDayInfo.shabbatObj.hebrewHavdalah : selectedDayInfo.shabbatObj.havdalah}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Halachic Reminder Box for Evening Entry */}
            <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl text-[11px] text-amber-200 leading-relaxed font-sans flex items-start gap-2 text-right" dir="rtl">
              <span className="text-base leading-none">🕯️</span>
              <div>
                <strong className="block text-amber-400 font-bold mb-0.5">
                  {lang === 'he' ? 'תזכורת הלכתית (כניסת היום העברי):' : lang === 'ru' ? 'Галахическое напоминание:' : 'Halachic Reminder:'}
                </strong>
                {lang === 'he'
                  ? 'ביהדות, היממה העברית מתחילה משקיעת החמה בערב הקודם. לכן, הדלקת נר נשמה, תפילת ערבית ואמירת קדיש מתחילים כבר ממוצאי השקיעה בערב שלפני יום האזכרה.'
                  : lang === 'ru'
                  ? 'В иудаизме еврейский день начинается с захода солнца накануне вечером. Поминальная свеча и молитвы начинаются вечером на закате.'
                  : 'In Judaism, the Hebrew day begins at sunset on the preceding evening. Memorial candle lighting begins at sunset on the eve before.'}
              </div>
            </div>

            {/* Yahrzeits list */}
            <div className="space-y-4">
              {/* 1. Evening Yahrzeits starting TONIGHT at sunset */}
              {selectedDayInfo.eveYahrzeits && selectedDayInfo.eveYahrzeits.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs uppercase tracking-wider text-amber-400 font-bold border-b border-amber-500/20 pb-1 flex items-center justify-between">
                    <span>{lang === 'he' ? '🕯️ מתחילות הערב בשקיעה (ערב אזכרה):' : '🕯️ Erev Yahrzeit (Starts tonight at sunset):'}</span>
                    <span className="text-[10px] text-amber-300 font-normal bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30">
                      {lang === 'he' ? 'הדלקת נר בשקיעה' : 'Candle Lighting'}
                    </span>
                  </h4>
                  <div className="space-y-2">
                    {selectedDayInfo.eveYahrzeits.map((d) => (
                      <div 
                        key={`eve-modal-${d.id}`} 
                        className="flex items-center justify-between p-2.5 bg-amber-950/30 border border-amber-500/20 rounded-xl hover:border-amber-500/40 hover:bg-amber-950/40 transition-all text-right"
                      >
                        <div>
                          <div className="text-xs font-bold text-amber-200 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                            {d.name}
                          </div>
                          <div className="text-[10px] text-amber-300/80 mt-0.5">
                            {lang === 'he' ? 'תאריך עברי: ' : 'Hebrew Date: '}
                            <strong>{d.day} ב{d.month}</strong>
                            {' — '}
                            <span className="text-amber-200 font-semibold">
                              {lang === 'he' ? 'תחילה הערב בשקיעה!' : 'Starts tonight!'}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDayInfo(null);
                            onSelectDeceased(d);
                          }}
                          className="px-3 py-1 bg-amber-950/60 hover:bg-amber-900/60 border border-amber-500/30 text-amber-200 font-semibold text-[10px] rounded-lg transition-all cursor-pointer"
                        >
                          {lang === 'he' ? 'לפרטים' : lang === 'ru' ? 'Детали' : 'Details'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. Daytime Yahrzeits on this day */}
              <div className="space-y-2">
                <h4 className="text-xs uppercase tracking-wider text-gray-400 font-semibold border-b border-[#c8a96e]/10 pb-1">
                  {lang === 'he' ? 'אזכרות במהלך יום זה (במהלך היום):' : lang === 'ru' ? 'Годовщины смерти в этот день:' : 'Daytime Yahrzeits on this day:'}
                </h4>

                {selectedDayInfo.yahrzeits.length === 0 && (!selectedDayInfo.eveYahrzeits || selectedDayInfo.eveYahrzeits.length === 0) ? (
                  <div className="text-center py-6 space-y-2">
                    <div className="text-2xl">🕯️</div>
                    <p className="text-xs text-gray-500 italic">
                      {lang === 'he' ? 'אין אזכרות בתאריך זה. יהי זכרם של כל נפטרי עמו ישראל ברוך.' : lang === 'ru' ? 'Нет годовщин в этот день.' : 'No death anniversaries on this date.'}
                    </p>
                  </div>
                ) : selectedDayInfo.yahrzeits.length === 0 ? (
                  <p className="text-[11px] text-gray-400 italic py-1">
                    {lang === 'he' ? 'אין אזכרות ביום זה בלבד (ראו למעלה אזכרות המתחילות הערב בשקיעה).' : 'No daytime Yahrzeits on this day.'}
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[180px] overflow-y-auto">
                    {selectedDayInfo.yahrzeits.map((d) => (
                      <div 
                        key={`day-modal-${d.id}`} 
                        className="flex items-center justify-between p-2.5 bg-red-950/20 border border-red-500/10 rounded-xl hover:border-red-500/30 hover:bg-red-950/30 transition-all text-right"
                      >
                        <div>
                          <div className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                            {d.name}
                          </div>
                          <div className="text-[10px] text-gray-400 mt-0.5">
                            {lang === 'he' ? 'תאריך עברי: ' : 'Hebrew Date: '}
                            <strong>{d.day} ב{d.month}</strong>
                            {d.ageAtDeath !== undefined && d.ageAtDeath !== null && (
                              <span> • {lang === 'he' ? `גיל פטירה: ${d.ageAtDeath}` : `Age: ${d.ageAtDeath}`}</span>
                            )}
                          </div>
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
