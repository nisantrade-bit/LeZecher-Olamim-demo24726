/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Deceased, Language } from '../types';
import { translations, formatParentRelation } from '../utils/translations';
import { translateText } from '../utils/transliteration';
import { getHebrewDate, isYahrzeitMatch, HEBREW_MONTHS_HE, HEBREW_MONTHS_EN, HEBREW_MONTHS_RU, gimatriya, normalizeMonthName, getYahrzeitEveDate } from '../utils/hebrewDate';
import { Bell, Heart, Share2, BookOpen, Calendar, MessageCircle, Info, MapPin, Flame, Sparkles, Clock } from 'lucide-react';
import { getTorahPortionDetails } from '../utils/torahPortionHelper';
import { getShortMemorialUrl, openWhatsAppShare, generateWhatsAppShareText } from '../utils/shareUtils';
import { DedicatedStudyModal } from './DedicatedStudyModal';

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

const LiveFlame = () => (
  <div className="relative w-4 h-6 flex flex-col items-center justify-end shrink-0 select-none">
    <motion.div 
      className="w-2.5 h-4 bg-amber-400 rounded-full blur-[0.5px] shadow-[0_0_8px_#f59e0b,0_0_14px_#f59e0b] origin-bottom"
      animate={{
        scaleY: [1, 1.18, 0.92, 1.12, 1],
        scaleX: [1, 0.88, 1.12, 0.92, 1],
        rotate: [0, -3, 3, -1, 0],
        x: [0, -0.5, 0.5, -0.5, 0]
      }}
      transition={{
        duration: 1.3,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    >
      <div className="absolute bottom-0.5 left-0.5 w-1 h-1.5 bg-yellow-100 rounded-full opacity-95 shadow-[0_0_4px_#fff]"></div>
      <div className="absolute bottom-0 left-0.5 w-0.5 h-1 bg-blue-500 rounded-full opacity-70"></div>
    </motion.div>
    <div className="w-1.5 h-2 bg-gradient-to-t from-amber-700 via-amber-600 to-amber-500 rounded-2xs relative border border-amber-500/30">
      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-0.5 h-0.5 bg-gray-900"></div>
    </div>
  </div>
);

interface BulletinBoardProps {
  deceasedList: Deceased[];
  lang: Language;
  onSelectDeceased: (deceased: Deceased) => void;
}

export const BulletinBoard: React.FC<BulletinBoardProps> = ({ deceasedList, lang, onSelectDeceased }) => {
  const t = translations[lang];

  const [hebcalEvents, setHebcalEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

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

  const [shabbatCandles, setShabbatCandles] = useState<string>('');
  const [shabbatHavdalah, setShabbatHavdalah] = useState<string>('');

  // Periodically check if city has been changed in localStorage elsewhere (e.g. Calendar tab)
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

  // Fetch current week's Shabbat times
  useEffect(() => {
    const fetchCurrentShabbatTimes = async () => {
      try {
        const res = await fetch(`https://www.hebcal.com/shabbat?cfg=json&geonameid=${selectedCity.id}&m=50&b=18`);
        if (res.ok) {
          const data = await res.json();
          const candleItem = data.items?.find((item: any) => item.category === "candles");
          const havdalahItem = data.items?.find((item: any) => item.category === "havdalah");
          
          if (candleItem) {
            setShabbatCandles(candleItem.title.split(": ")[1] || candleItem.title);
          } else {
            setShabbatCandles('');
          }

          if (havdalahItem) {
            setShabbatHavdalah(havdalahItem.title.split(": ")[1] || havdalahItem.title);
          } else {
            setShabbatHavdalah('');
          }
        }
      } catch (err) {
        console.error("Error fetching current Shabbat times:", err);
      }
    };

    fetchCurrentShabbatTimes();
  }, [selectedCity.id]);

  // Fetch all annual events on load to compute preceding Shabbats, weekly portions, holidays and fasts
  useEffect(() => {
    const fetchYearEvents = async () => {
      setLoading(true);
      try {
        const year = new Date().getFullYear();
        const response = await fetch(`https://www.hebcal.com/hebcal?v=1&cfg=json&s=on&maj=on&min=on&mod=on&mf=on&c=on&geonameid=${selectedCity.id}&year=${year}&i=on`);
        if (response.ok) {
          const data = await response.json();
          setHebcalEvents(data.items || []);
        }
      } catch (err) {
        console.error("Error fetching Hebcal for Bulletin Board:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchYearEvents();
  }, [selectedCity.id]);

  // Helper to compute preceding Shabbat's parasha for a given Yahrzeit date
  const getPrecedingShabbatParasha = (gregDate: Date) => {
    const dayOfWeek = gregDate.getDay();
    const prevSat = new Date(gregDate);
    const daysToSubtract = dayOfWeek === 6 ? 7 : dayOfWeek + 1;
    prevSat.setDate(prevSat.getDate() - daysToSubtract);
    
    const yyyy = prevSat.getFullYear();
    const mm = String(prevSat.getMonth() + 1).padStart(2, '0');
    const dd = String(prevSat.getDate()).padStart(2, '0');
    const prevSatStr = `${yyyy}-${mm}-${dd}`;

    const parashaItem = hebcalEvents.find(
      (item) => item.category === 'parashat' && item.date.startsWith(prevSatStr)
    );

    if (parashaItem) {
      return {
        title: parashaItem.title,
        hebrew: parashaItem.hebrew || parashaItem.title
      };
    }

    // Check if there is a special holiday on that day
    const holidayItem = hebcalEvents.find(
      (item) => item.category === 'holiday' && item.date.startsWith(prevSatStr)
    );
    if (holidayItem) {
      return {
        title: holidayItem.title,
        hebrew: holidayItem.hebrew || holidayItem.title
      };
    }

    return null;
  };

  // Compute Sunday and Saturday of current week
  const today = new Date();
  const dayOfWeek = today.getDay();
  
  const sunOfThisWeek = new Date(today);
  sunOfThisWeek.setDate(today.getDate() - dayOfWeek);
  sunOfThisWeek.setHours(0, 0, 0, 0);

  const satOfThisWeek = new Date(today);
  satOfThisWeek.setDate(today.getDate() + (6 - dayOfWeek));
  satOfThisWeek.setHours(23, 59, 59, 999);

  const satOfThisWeekStr = `${satOfThisWeek.getFullYear()}-${String(satOfThisWeek.getMonth() + 1).padStart(2, '0')}-${String(satOfThisWeek.getDate()).padStart(2, '0')}`;

  const currentParashaItem = hebcalEvents.find(
    (item) => item.category === 'parashat' && item.date.startsWith(satOfThisWeekStr)
  );

  // Find holidays and fasts in the current week
  const currentWeekHolidaysAndFasts = hebcalEvents.filter((item) => {
    if (item.category !== 'holiday' && item.category !== 'fast') return false;
    const itemDate = new Date(item.date);
    return itemDate >= sunOfThisWeek && itemDate <= satOfThisWeek;
  });

  // Extract entry (candle lighting or fast start) and exit (havdalah or fast end) times for each event
  const weeklyEventsWithTimes = currentWeekHolidaysAndFasts.map(eventItem => {
    const dateStr = eventItem.date.split('T')[0];
    const isFast = eventItem.category === 'fast' || eventItem.title?.toLowerCase().includes('fast') || eventItem.hebrew?.includes('צום') || eventItem.hebrew?.includes('תענית');

    const candleOrStart = hebcalEvents.find(i => {
      const d = i.date.split('T')[0];
      return (d === dateStr || new Date(d).getTime() === new Date(dateStr).getTime() - 86400000) &&
             (i.category === 'candles' || (i.title && i.title.toLowerCase().includes('fast begins')));
    });

    const havdalahOrEnd = hebcalEvents.find(i => {
      const d = i.date.split('T')[0];
      return d === dateStr &&
             (i.category === 'havdalah' || (i.title && i.title.toLowerCase().includes('fast ends')));
    });

    const getCleanTime = (item: any) => {
      if (!item) return null;
      if (item.title && item.title.includes(': ')) {
        const parts = item.title.split(': ');
        if (parts[1]) return parts[1];
      }
      if (item.date && item.date.includes('T')) {
        const timePart = item.date.split('T')[1]?.substring(0, 5);
        if (timePart && /^\d{2}:\d{2}$/.test(timePart)) return timePart;
      }
      return item.title || null;
    };

    return {
      title: eventItem.title,
      hebrew: eventItem.hebrew || eventItem.title,
      isFast,
      dateStr,
      entryTime: getCleanTime(candleOrStart),
      exitTime: getCleanTime(havdalahOrEnd),
    };
  });

  // Generate date array for the next 7 days (including today)
  const daysArray = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });

  const matchedEvents: Array<{
    deceased: Deceased;
    daysCount: number; // 0 = today, 1 = tomorrow, 2..6 = in N days
    gregorianDate: Date;
    hebrewDateStr: string;
  }> = [];

  daysArray.forEach((date, index) => {
    const hb = getHebrewDate(date);
    
    // Find matching deceased
    deceasedList.forEach(deceased => {
      if (isYahrzeitMatch(deceased.day, deceased.month, hb.day, hb.normalizedMonth, hb.isLeapYear)) {
        // Get month name in active language
        let monthIdx = HEBREW_MONTHS_HE.indexOf(hb.normalizedMonth);
        if (monthIdx === -1) monthIdx = 0;
        const localizedMonth = lang === 'he' ? HEBREW_MONTHS_HE[monthIdx] : lang === 'en' ? HEBREW_MONTHS_EN[monthIdx] : HEBREW_MONTHS_RU[monthIdx];
        const localizedDay = lang === 'he' ? gimatriya(hb.day) : hb.day.toString();
        
        matchedEvents.push({
          deceased,
          daysCount: index,
          gregorianDate: date,
          hebrewDateStr: lang === 'he' ? `${localizedDay} ב${localizedMonth}` : `${localizedDay} ${localizedMonth}`
        });
      }
    });
  });

  const todayList = matchedEvents.filter(e => e.daysCount === 0);
  const upcomingList = matchedEvents.filter(e => e.daysCount > 0);

  // Formulates the halachic text based on language and gender
  const formatHalachicAlert = (deceased: Deceased, day: string, month: string) => {
    const parentRel = formatParentRelation(deceased.gender, deceased.fatherName, deceased.motherName, lang);
    const translatedName = lang === 'he' ? deceased.name : translateText(deceased.name, lang as 'en' | 'ru');

    if (lang === 'he') {
      return `אזכרה של ${translatedName} ${parentRel} בתאריך ${day} ב${month}.`;
    } else if (lang === 'ru') {
      return `Йарцайт: ${translatedName} ${parentRel}, дата ${day} ${month}.`;
    } else {
      return `Yahrzeit of ${translatedName} ${parentRel} on ${day} of ${month}.`;
    }
  };

  // Triggers the WhatsApp share invitation
  const shareOnWhatsApp = (deceased: Deceased, gregDate: Date, hebrewDateStr: string, parashaName: string | null, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent opening details modal
    const text = generateWhatsAppShareText(deceased, lang);
    openWhatsAppShare(text);
  };

  const bulletinTranslations = {
    he: {
      weeklyBulletin: "הפרשה והחגים השבוע בלוח",
      noHolidays: "אין חגים השבוע",
      shareWhatsApp: "שתף בוואטסאפ",
      parasha: "פרשת השבוע",
      holiday: "חג/אירוע השבוע",
      upcomingAliyah: "השבת הסמוכה (עליה לתורה):"
    },
    en: {
      weeklyBulletin: "This Week's Portion & Holidays",
      noHolidays: "No holidays this week",
      shareWhatsApp: "Share",
      parasha: "Torah Portion",
      holiday: "Holiday This Week",
      upcomingAliyah: "Preceding Shabbat (Aliyah):"
    },
    ru: {
      weeklyBulletin: "Глава Торы и Праздники этой недели",
      noHolidays: "Нет праздников на этой неделе",
      shareWhatsApp: "Поделиться",
      parasha: "Глава Торы",
      holiday: "Праздник на этой неделе",
      upcomingAliyah: "Ближайший Шаббат (Алия):"
    }
  };

  const bt = bulletinTranslations[lang];

  // State for opening dedicated spiritual study modal for a specific deceased person
  const [studyModalDeceased, setStudyModalDeceased] = useState<Deceased | null>(null);

  // State to track lit candles per deceased ID on the bulletin board
  const [litCandles, setLitCandles] = useState<{ [id: string]: boolean }>(() => {
    try {
      const saved = localStorage.getItem('bulletin_board_lit_candles');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  const toggleCandle = (id: string | number, e: React.MouseEvent) => {
    e.stopPropagation(); // Don't trigger onSelectDeceased
    const idStr = String(id);
    setLitCandles(prev => {
      const updated = { ...prev, [idStr]: !prev[idStr] };
      try {
        localStorage.setItem('bulletin_board_lit_candles', JSON.stringify(updated));
      } catch (err) {}
      return updated;
    });
  };

  return (
    <div id="bulletin-board" className="bg-gradient-to-b from-[#2d2312] via-[#1f170a] to-[#120e06] border-2 border-[#c8a96e] rounded-2xl p-6 mb-8 text-[#f0f4f8] shadow-[0_0_35px_rgba(200,169,110,0.2)] relative overflow-hidden font-sans">
      {/* Decorative background light */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-[#c8a96e]/10 blur-3xl pointer-events-none rounded-full"></div>
      
      {/* Redesigned Header: Title + Colorful Swinging Bell Icon */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 mb-6 border-b border-[#c8a96e]/25 pb-5">
        <div className="flex items-center gap-4">
          {/* Colorful, side-to-side swinging bell icon with live ring motion */}
          <motion.div 
            className="relative p-3 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 via-purple-500 to-emerald-400 shadow-[0_0_20px_rgba(245,158,11,0.6)] border-2 border-[#c8a96e] text-white flex items-center justify-center shrink-0 cursor-pointer"
            animate={{ rotate: [-22, 22, -22], scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
          >
            <Bell className="w-7 h-7 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)] animate-pulse" />
          </motion.div>

          {/* Title and Subtitle */}
          <div>
            <h2 className="text-2xl md:text-3xl font-serif font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-300 via-amber-400 to-amber-100 tracking-wide drop-shadow-[0_2px_12px_rgba(200,169,110,0.4)]">
              {t.bulletinBoard}
            </h2>
            <p className="text-xs text-[#c8a96e]/90 font-sans mt-0.5 font-medium flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 inline" />
              <span>
                {lang === 'he' 
                  ? 'מערכת התראות אזכרות שבועיות, זמני חגים וצומות | לזכר עולמים' 
                  : lang === 'ru'
                  ? 'Уведомления о годовщинах, праздниках и постах | Лезэхер Оламим'
                  : 'Weekly Yahrzeit Alerts, Holiday & Fast Times | L\'Zecher Olamim'}
              </span>
            </p>
          </div>
        </div>

        {/* Global Weekly Parasha, Shabbat & Holiday/Fast Compact Banner */}
        {hebcalEvents.length > 0 && (
          <div className="bg-black/40 border border-[#c8a96e]/30 px-4 py-2.5 rounded-xl flex flex-col md:flex-row md:items-center gap-3 md:gap-4 text-xs flex-wrap">
            {/* Parasha */}
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#c8a96e] shrink-0" />
              <div>
                <span className="text-gray-400 block text-[10px] uppercase font-bold">{bt.parasha}</span>
                <span className="font-extrabold text-white">
                  {currentParashaItem 
                    ? (lang === 'he' ? currentParashaItem.hebrew : currentParashaItem.title) 
                    : (lang === 'he' ? "טוען..." : "Loading...")}
                </span>
              </div>
            </div>

            {/* Shabbat times with interactive city picker */}
            <div className="flex items-center gap-2 border-t md:border-t-0 md:border-r border-[#c8a96e]/20 pt-2 md:pt-0 md:pr-4">
              <MapPin className="w-4 h-4 text-[#c8a96e] shrink-0" />
              <div>
                <span className="text-gray-400 block text-[10px] uppercase font-bold">
                  {lang === 'he' ? 'זמני שבת:' : lang === 'ru' ? 'Время Шаббата:' : 'Shabbat:'}
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
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
                    className="bg-transparent border-none text-[#c8a96e] font-extrabold outline-none cursor-pointer text-xs p-0 pr-1 select-none"
                    style={{ direction: lang === 'he' ? 'rtl' : 'ltr' }}
                  >
                    {CITIES.map(c => (
                      <option key={c.id} value={c.id} className="bg-[#131a26] text-white">
                        {lang === 'he' ? c.nameHe : lang === 'ru' ? c.nameRu : c.nameEn}
                      </option>
                    ))}
                  </select>
                  <span className="text-gray-500 font-normal">|</span>
                  <span className="font-bold text-amber-300 font-mono text-xs flex items-center gap-0.5" title={lang === 'he' ? 'כניסת שבת (הדלקת נרות)' : 'Candle lighting'}>
                    🕯️ {shabbatCandles || '...'}
                  </span>
                  {shabbatHavdalah && (
                    <span className="text-indigo-300 font-mono text-xs flex items-center gap-0.5" title={lang === 'he' ? 'מוצאי שבת' : 'Havdalah'}>
                      ✨ {shabbatHavdalah}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Merged Weekly Holidays & Fasts (Compact sub-table inside the header banner) */}
            {weeklyEventsWithTimes.length > 0 && (
              <div className="flex items-center gap-2 border-t md:border-t-0 md:border-r border-[#c8a96e]/20 pt-2 md:pt-0 md:pr-4">
                <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">
                    {lang === 'he' ? 'אירועי / חגי השבוע:' : lang === 'ru' ? 'Праздники недели:' : 'Weekly Holidays:'}
                  </span>
                  <div className="flex flex-wrap items-center gap-2 mt-0.5">
                    {weeklyEventsWithTimes.map((ev, i) => (
                      <span key={`hdr-ev-${i}`} className="text-amber-200 font-bold text-xs flex items-center gap-1 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                        <span className="text-white font-serif">{lang === 'he' ? ev.hebrew : ev.title}</span>
                        {ev.entryTime && (
                          <span className="text-amber-300 font-mono text-[11px]">
                            (🕯️ {ev.entryTime}{ev.exitTime ? ` - ✨ ${ev.exitTime}` : ''})
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {matchedEvents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-center text-[#f0f4f8]/70">
          <span className="text-3xl mb-2">🕯️</span>
          <p className="text-base font-sans leading-relaxed max-w-md">
            {t.noMemorialsToday}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Today's Memorials */}
          {todayList.length > 0 && (
            <div>
              <h3 className="text-sm font-sans uppercase tracking-wider text-[#c8a96e] mb-3 font-semibold flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping"></span>
                {t.todayMemorials}
              </h3>
              <div className="grid gap-3 grid-cols-1">
                {todayList.map((event, idx) => {
                  const m = event.deceased.month;
                  const normalized = normalizeMonthName(m);
                  let monthIdx = HEBREW_MONTHS_HE.indexOf(normalized);
                  if (monthIdx === -1) monthIdx = 0;
                  const monthStr = lang === 'he' ? HEBREW_MONTHS_HE[monthIdx] : lang === 'en' ? HEBREW_MONTHS_EN[monthIdx] : HEBREW_MONTHS_RU[monthIdx];
                  const dayStr = lang === 'he' ? gimatriya(event.deceased.day) : event.deceased.day.toString();
                  
                  const precedingShabbat = getPrecedingShabbatParasha(event.gregorianDate);
                  const parashaLabel = precedingShabbat 
                    ? (lang === 'he' ? precedingShabbat.hebrew : precedingShabbat.title)
                    : null;

                  const isCandleLit = !!litCandles[event.deceased.id];

                  return (
                    <div 
                      key={`today-${idx}`}
                      onClick={() => onSelectDeceased(event.deceased)}
                      className={`bg-gradient-to-r from-amber-950/90 via-[#26180a] to-[#131a26] hover:to-[#1a2333] border-2 border-amber-400 rounded-xl p-5 cursor-pointer transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-5 group shadow-[0_0_25px_rgba(245,158,11,0.45)] hover:shadow-[0_0_35px_rgba(245,158,11,0.7)] transform hover:-translate-y-0.5 ${lang === 'he' ? 'text-right' : 'text-left'}`}
                      dir={lang === 'he' ? 'rtl' : 'ltr'}
                    >
                      <div className="flex items-start gap-4 flex-1">
                        {event.deceased.image ? (
                          <img 
                            src={event.deceased.image} 
                            alt={event.deceased.name} 
                            referrerPolicy="no-referrer"
                            className="w-14 h-14 rounded-full object-cover border-2 border-amber-400 group-hover:scale-105 transition-transform duration-300 shrink-0 shadow-[0_0_15px_rgba(251,191,36,0.5)]"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-3xl shadow-[0_0_15px_rgba(251,191,36,0.5)] group-hover:scale-105 transition-transform duration-300 shrink-0">
                            🕯️
                          </div>
                        )}
                        <div className="space-y-2 flex-1">
                          {/* Original, deeply moving Hebrew Eve Alert Banner */}
                          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500/30 via-amber-500/20 to-amber-500/10 border border-amber-400/70 px-3 py-1 rounded-full text-xs font-black text-amber-200 shadow-md">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping shrink-0"></span>
                            <span>
                              {lang === 'he' 
                                ? '✨ יארצייט קדוש ומרומם: האזכרה נכנסת מהיום בערב (משקיעת החמה) - מדליקים נר נשמה, אומרים קדיש ולומדים משנה לעילוי הנשמה 🕯️' 
                                : lang === 'ru' 
                                ? '✨ Священный Ярцайт: Начинается сегодня вечером (на закате) — Зажгите поминальную свечу и прочтите Псалмы 🕯️' 
                                : '✨ Sacred Yahrzeit: Begins this evening at sunset — Light a memorial candle & recite Psalms in loving memory 🕯️'}
                            </span>
                          </div>

                          {/* Distinctive, prominent typography for the deceased name */}
                          <div className="space-y-0.5">
                            <h4 className="text-lg md:text-xl font-serif font-black text-amber-100 tracking-wide leading-snug drop-shadow-md">
                              {formatHalachicAlert(event.deceased, dayStr, monthStr)}
                            </h4>
                          </div>
                          
                          {parashaLabel && (
                            <p className="text-xs text-amber-300/90 font-sans font-semibold flex items-center gap-1.5 bg-black/20 w-fit px-2.5 py-1 rounded-md border border-amber-500/20">
                              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                              <span>{bt.upcomingAliyah} <strong>{parashaLabel}</strong></span>
                            </p>
                          )}

                          {isCandleLit && (
                            <div className="flex items-center gap-2 text-xs text-amber-300 font-extrabold bg-black/60 px-3 py-1.5 rounded-lg border border-amber-400/50 w-fit shadow-md">
                              <Flame className="w-4 h-4 text-amber-400 fill-amber-400 animate-bounce" />
                              <span>{lang === 'he' ? 'נר נשמה דולק לעילוי נשמתו/ה ת.נ.צ.ב.ה' : 'Memorial Candle Lit'}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Lively Redesigned Action Buttons */}
                      <div className="flex items-center gap-2.5 self-end md:self-auto shrink-0 flex-wrap">
                        {/* Dedicated Soul Study Button */}
                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.06, y: -1 }}
                          whileTap={{ scale: 0.94 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setStudyModalDeceased(event.deceased);
                          }}
                          className="flex items-center gap-2 bg-gradient-to-r from-amber-600/30 via-amber-500/20 to-amber-600/30 hover:from-amber-500 hover:to-amber-400 text-amber-200 hover:text-black font-black px-3.5 py-2 rounded-xl text-xs transition-all duration-200 cursor-pointer shadow-md border border-amber-400/60 hover:border-amber-200"
                          title={lang === 'he' ? `פתח חלון לימוד לעילוי נשמת ${event.deceased.name}` : `Study for ${event.deceased.name}`}
                        >
                          <BookOpen className="w-4 h-4 text-amber-300" />
                          <span>{lang === 'he' ? '📖 לימוד לעילוי נשמה' : lang === 'ru' ? '📖 Изучение' : '📖 Soul Study'}</span>
                        </motion.button>

                        {/* Interactive Burning Candle Button */}
                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.06, y: -1 }}
                          whileTap={{ scale: 0.94 }}
                          onClick={(e) => toggleCandle(event.deceased.id, e)}
                          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all duration-200 cursor-pointer shadow-lg border ${
                            isCandleLit 
                              ? 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-black border-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.6)]' 
                              : 'bg-gradient-to-r from-amber-950/80 to-[#1a1105] text-amber-300 border-amber-500/50 hover:border-amber-300'
                          }`}
                        >
                          {isCandleLit ? (
                            <LiveFlame />
                          ) : (
                            <Flame className="w-4 h-4 text-amber-400" />
                          )}
                          <span>
                            {isCandleLit 
                              ? (lang === 'he' ? '🕯️ נר דולק' : lang === 'ru' ? '🕯️ Свеча горит' : '🕯️ Candle Lit') 
                              : (lang === 'he' ? '🕯️ הדלקת נר נשמה' : lang === 'ru' ? '🕯️ Зажечь свечу' : '🕯️ Light Candle')}
                          </span>
                        </motion.button>

                        {/* WhatsApp Official Green Button with WhatsApp Badge */}
                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.06, y: -1 }}
                          whileTap={{ scale: 0.94 }}
                          onClick={(e) => shareOnWhatsApp(event.deceased, event.gregorianDate, event.hebrewDateStr, parashaLabel, e)}
                          className="flex items-center gap-2 bg-gradient-to-r from-[#25D366] via-[#20bd5a] to-[#128C7E] hover:from-[#20bd5a] hover:to-[#0e7065] text-white px-3.5 py-2 rounded-xl text-xs font-black transition-all duration-200 cursor-pointer shadow-[0_0_15px_rgba(37,211,102,0.4)] hover:shadow-[0_0_25px_rgba(37,211,102,0.7)] border border-emerald-300/40"
                          title={bt.shareWhatsApp}
                        >
                          <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                            <MessageCircle className="w-3.5 h-3.5 text-white fill-white" />
                          </div>
                          <span>{bt.shareWhatsApp}</span>
                        </motion.button>

                        <span className="text-xs font-mono text-amber-300 bg-amber-500/20 px-3 py-2 rounded-xl border border-amber-400/40 font-black">
                          {lang === 'he' ? 'היום / הערב' : lang === 'ru' ? 'Сегодня' : 'Today/Eve'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Upcoming Memorials */}
          {upcomingList.length > 0 && (
            <div>
              <h3 className="text-sm font-sans uppercase tracking-wider text-[#c8a96e]/90 mb-3 font-semibold flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-amber-500"></span>
                {t.upcomingMemorials}
              </h3>
              <div className="grid gap-3 grid-cols-1">
                {upcomingList.map((event, idx) => {
                  const m = event.deceased.month;
                  const normalized = normalizeMonthName(m);
                  let monthIdx = HEBREW_MONTHS_HE.indexOf(normalized);
                  if (monthIdx === -1) monthIdx = 0;
                  const monthStr = lang === 'he' ? HEBREW_MONTHS_HE[monthIdx] : lang === 'en' ? HEBREW_MONTHS_EN[monthIdx] : HEBREW_MONTHS_RU[monthIdx];
                  const dayStr = lang === 'he' ? gimatriya(event.deceased.day) : event.deceased.day.toString();
                  
                  const precedingShabbat = getPrecedingShabbatParasha(event.gregorianDate);
                  const parashaLabel = precedingShabbat 
                    ? (lang === 'he' ? precedingShabbat.hebrew : precedingShabbat.title)
                    : null;

                  const isCandleLit = !!litCandles[event.deceased.id];
                  const isEveToday = event.daysCount === 1; // Tomorrow's Yahrzeit starts TODAY at sunset!

                  return (
                    <div 
                      key={`upcoming-${idx}`}
                      onClick={() => onSelectDeceased(event.deceased)}
                      className={`bg-[#131a26]/80 hover:bg-[#131a26] border rounded-xl p-4 cursor-pointer transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-4 group ${
                        isEveToday 
                          ? 'border-amber-500/80 bg-amber-950/40 shadow-[0_0_18px_rgba(245,158,11,0.3)]' 
                          : 'border-[#c8a96e]/20 hover:border-[#c8a96e]/50'
                      } ${lang === 'he' ? 'text-right' : 'text-left'}`}
                      dir={lang === 'he' ? 'rtl' : 'ltr'}
                    >
                      <div className="flex items-start gap-4">
                        {event.deceased.image ? (
                          <img 
                            src={event.deceased.image} 
                            alt={event.deceased.name} 
                            referrerPolicy="no-referrer"
                            className="w-11 h-11 rounded-full object-cover border border-[#c8a96e]/40 group-hover:scale-105 transition-transform duration-300 shrink-0 shadow-md"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-full bg-[#f0f4f8]/5 flex items-center justify-center text-xl shadow-inner group-hover:bg-[#c8a96e]/10 transition-all duration-300 shrink-0">
                            🕯️
                          </div>
                        )}
                        <div className="space-y-1">
                          {isEveToday && (
                            <div className="inline-flex items-center gap-1.5 bg-amber-500/20 border border-amber-400/50 px-2.5 py-0.5 rounded-full text-[11px] font-bold text-amber-300">
                              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                              <span>{lang === 'he' ? '🕯️ נכנס מהיום בערב (ערב יארצייט)' : '🕯️ Starts this evening at sunset'}</span>
                            </div>
                          )}

                          <p className="text-sm md:text-base font-sans text-[#f0f4f8]/90 font-semibold">
                            {formatHalachicAlert(event.deceased, dayStr, monthStr)}
                          </p>

                          {parashaLabel && (
                            <p className="text-xs text-[#c8a96e]/90 font-sans flex items-center gap-1.5">
                              <BookOpen className="w-3.5 h-3.5 text-[#c8a96e]/70" />
                              <span>{bt.upcomingAliyah} <strong>{parashaLabel}</strong></span>
                            </p>
                          )}

                          {isCandleLit && (
                            <div className="flex items-center gap-1.5 text-xs text-amber-300 font-bold bg-black/40 px-2.5 py-0.5 rounded border border-amber-500/30 w-fit">
                              <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400 animate-bounce" />
                              <span>{lang === 'he' ? 'נר נשמה דולק' : 'Memorial Candle Lit'}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Lively Redesigned Action Buttons */}
                      <div className="flex items-center gap-2.5 self-end md:self-auto shrink-0 flex-wrap">
                        {/* Dedicated Soul Study Button */}
                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.06, y: -1 }}
                          whileTap={{ scale: 0.94 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setStudyModalDeceased(event.deceased);
                          }}
                          className="flex items-center gap-1.5 bg-amber-500/20 hover:bg-amber-400 border border-amber-400/60 hover:border-amber-300 text-amber-200 hover:text-black font-extrabold px-3 py-1.5 rounded-xl text-xs transition-all duration-200 cursor-pointer shadow-md"
                          title={lang === 'he' ? `פתח חלון לימוד לעילוי נשמת ${event.deceased.name}` : `Study for ${event.deceased.name}`}
                        >
                          <BookOpen className="w-3.5 h-3.5 text-amber-300" />
                          <span>{lang === 'he' ? '📖 לימוד לעילוי נשמה' : lang === 'ru' ? '📖 Изучение' : '📖 Soul Study'}</span>
                        </motion.button>

                        {/* Interactive Candle Button */}
                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.06, y: -1 }}
                          whileTap={{ scale: 0.94 }}
                          onClick={(e) => toggleCandle(event.deceased.id, e)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                            isCandleLit 
                              ? 'bg-amber-500 text-black border border-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.5)]' 
                              : 'bg-amber-950/40 hover:bg-amber-900/70 text-amber-300 border border-amber-500/40'
                          }`}
                        >
                          {isCandleLit ? <LiveFlame /> : <Flame className="w-3.5 h-3.5 text-amber-400" />}
                          <span>{isCandleLit ? (lang === 'he' ? '🕯️ נר דולק' : lang === 'ru' ? '🕯️ Свеча горит' : 'Candle Lit') : (lang === 'he' ? '🕯️ הדלקת נר נשמה' : lang === 'ru' ? '🕯️ Зажечь свечу' : 'Light Candle')}</span>
                        </motion.button>

                        {/* WhatsApp Official Green Button */}
                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.06, y: -1 }}
                          whileTap={{ scale: 0.94 }}
                          onClick={(e) => shareOnWhatsApp(event.deceased, event.gregorianDate, event.hebrewDateStr, parashaLabel, e)}
                          className="flex items-center gap-1.5 bg-gradient-to-r from-[#25D366] to-[#128C7E] hover:from-[#20bd5a] hover:to-[#0e7065] text-white px-3 py-1.5 rounded-xl text-xs font-black transition-all duration-200 cursor-pointer shadow-[0_0_12px_rgba(37,211,102,0.3)] hover:shadow-[0_0_20px_rgba(37,211,102,0.6)] border border-emerald-300/40"
                          title={bt.shareWhatsApp}
                        >
                          <MessageCircle className="w-3.5 h-3.5 fill-white" />
                          <span>{bt.shareWhatsApp}</span>
                        </motion.button>

                        <span className="text-xs font-mono text-[#c8a96e]/90 bg-[#c8a96e]/10 px-2.5 py-1.5 rounded-xl border border-[#c8a96e]/20 whitespace-nowrap font-bold">
                          {event.daysCount === 1 ? (lang === 'he' ? 'מחר (מהערב)' : t.tomorrow) : t.inNDays.replace('{n}', event.daysCount.toString())}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dedicated Study Modal for a specific deceased person */}
      {studyModalDeceased && (
        <DedicatedStudyModal
          deceased={studyModalDeceased}
          lang={lang}
          onClose={() => setStudyModalDeceased(null)}
        />
      )}
    </div>
  );
};
