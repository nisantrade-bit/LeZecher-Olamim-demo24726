/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Deceased, Language } from '../types';
import { translations, formatParentRelation } from '../utils/translations';
import { translateText } from '../utils/transliteration';
import { HEBREW_MONTHS_HE, HEBREW_MONTHS_EN, HEBREW_MONTHS_RU, gimatriya, findYahrzeitGregorianDate, getYahrzeitEveDate, formatYahrzeitDatesWithEve, normalizeMonthName } from '../utils/hebrewDate';
import { X, Phone, CalendarRange, MapPin, Edit, Trash2, Heart, Clock, BookOpen, Globe, MessageCircle, RefreshCw, Star, Loader2 } from 'lucide-react';
import { getTorahPortionDetails } from '../utils/torahPortionHelper';
import { getRandomMishnah, getRandomPsalm, getRandomHalakha, getRandomPirkeiAvot, getRandomGeneralMishnah, MishnahRecord, PsalmRecord, HalakhaRecord } from '../utils/memorialStudy';
import { getShortMemorialUrl, openWhatsAppShare, generateWhatsAppShareText } from '../utils/shareUtils';
import { FullReadingModal } from './FullReadingModal';

interface MemorialDetailsModalProps {
  deceased: Deceased;
  lang: Language;
  onClose: () => void;
  onEdit: (deceased: Deceased) => void;
  onDelete: (id: number) => void;
}

export const MemorialDetailsModal: React.FC<MemorialDetailsModalProps> = ({ deceased, lang, onClose, onEdit, onDelete }) => {
  const t = translations[lang];

  const currentYear = new Date().getFullYear();
  const yahrzeitGregorianCurrent = findYahrzeitGregorianDate(deceased.day, deceased.month, currentYear);
  const yahrzeitGregorianNext = findYahrzeitGregorianDate(deceased.day, deceased.month, currentYear + 1);

  const getUpcomingYahrzeitYear = (day: number, month: string): number => {
    const yahrDate = findYahrzeitGregorianDate(day, month, currentYear);
    if (!yahrDate) return currentYear;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(yahrDate);
    target.setHours(0, 0, 0, 0);

    if (target.getTime() - today.getTime() < 0) {
      return currentYear + 1;
    }
    return currentYear;
  };

  const [showConfirmDelete, setShowConfirmDelete] = useState<boolean>(false);
  const [selectedYahrzeitYear, setSelectedYahrzeitYear] = useState<number>(() => new Date().getFullYear());

  React.useEffect(() => {
    setSelectedYahrzeitYear(new Date().getFullYear());
    setActiveMishnah(getRandomGeneralMishnah());
    setActiveAvot(getRandomPirkeiAvot());
    setActivePsalm(getRandomPsalm());
    setActiveHalakha(getRandomHalakha());
  }, [deceased.id, deceased.day, deceased.month]);
  const [isIsraelCustom, setIsIsraelCustom] = useState<boolean>(true);
  const [parshaInfo, setParshaInfo] = useState<{ name: string; hebrewName: string; date: Date } | null>(null);
  const [loadingParsha, setLoadingParsha] = useState<boolean>(false);

  // Spiritual Study States
  const [activeMishnah, setActiveMishnah] = useState<MishnahRecord>(() => getRandomGeneralMishnah());
  const [activeAvot, setActiveAvot] = useState<MishnahRecord>(() => getRandomPirkeiAvot());
  const [activePsalm, setActivePsalm] = useState<PsalmRecord>(() => getRandomPsalm());
  const [activeHalakha, setActiveHalakha] = useState<HalakhaRecord>(() => getRandomHalakha());

  // Full Reading States
  const [readingSefariaRef, setReadingSefariaRef] = useState<string | null>(null);
  const [readingTitle, setReadingTitle] = useState<string>('');

  const localT = {
    he: {
      title: "השבת שקודמת לאזכרה (לעלייה לתורה)",
      selectYear: "בחר שנה:",
      readingCustom: "מנהג קריאה:",
      israel: "מנהג ארץ ישראל 🇮🇱",
      diaspora: "מנהג חוץ לארץ 🌐",
      fallsOn: "השבת חלה ביום:",
      weeklyParsha: "פרשת השבוע / קריאת חג:",
      loading: "מזהה קריאת תורה מ-Hebcal...",
      noData: "לא נמצאו נתוני פרשה",
      explanation: "מידע הלכתי: לעיתים יש פער של שבוע בין קריאת התורה בארץ לבין חוץ לארץ (למשל כאשר שביעי של פסח או שבועות חל ביום שישי). המערכת מחשבת זאת במדויק לפי המנהג שנבחר."
    },
    en: {
      title: "Shabbat Preceding the Yahrzeit",
      selectYear: "Select Year:",
      readingCustom: "Reading Custom:",
      israel: "Israel Custom 🇮🇱",
      diaspora: "Diaspora Custom 🌐",
      fallsOn: "Shabbat falls on:",
      weeklyParsha: "Portion / Festival reading:",
      loading: "Fetching portion from Hebcal...",
      noData: "No portion data found",
      explanation: "Halachic Note: Sometimes there is a one-week discrepancy between Torah readings in Israel and the Diaspora (e.g., when Pesach or Shavuot ends on Friday). The system calculates this precisely based on the selected custom."
    },
    ru: {
      title: "Шаббат перед Йарцайтом",
      selectYear: "Выберите год:",
      readingCustom: "Обычай чтения:",
      israel: "Обычай Израиля 🇮🇱",
      diaspora: "Обычай Диаспоры 🌐",
      fallsOn: "Шаббат выпадает на:",
      weeklyParsha: "Глава Торы / Праздник:",
      loading: "Загрузка главы из Hebcal...",
      noData: "Глава не найдена",
      explanation: "Галахическая справка: Иногда возникает разница в одну неделю в чтении Торы между Израилем и Диаспорой (например, когда Песах или Шавуот заканчивается в пятницу). Система точно рассчитывает это для выбранного обычая."
    }
  };

  const studyT = {
    he: {
      studyHeader: "לימוד ותפילה לעילוי נשמה",
      mishnahTitle: "משנה לעילוי נשמת הנפטר/ת",
      psalmTitle: "פרק תהלים לעילוי נשמת הנפטר/ת",
      halakhaTitle: "הלכה לעילוי נשמת הנפטר/ת",
      nextMishnah: "משנה אקראית נוספת",
      nextPsalm: "פרק תהלים אקראי נוסף",
      nextHalakha: "הלכה אקראית נוספת",
      explanation: "ביאור המשנה:",
      significance: "סגולה ומשמעות:",
      readSoul: "קריאה ולימוד של פסוקים קדושים אלו מוקדשים במיוחד לעילוי נשמתו/ה הטהורה.",
      shareWhatsApp: "שתף הזמנה לאזכרה בוואטסאפ",
      aliyotIsrael: "עליות לתורה בישראל 🇮🇱",
      aliyotDiaspora: "עליות לתורה בחו\"ל 🌐",
      differencesTitle: "הבדלי קריאה ומנהגים בין הארץ לחו\"ל:"
    },
    en: {
      studyHeader: "Study & Prayer for the Soul's Elevation",
      mishnahTitle: "Mishnah for the Elevation of the Soul",
      psalmTitle: "Psalm for the Elevation of the Soul",
      halakhaTitle: "Halakha for the Elevation of the Soul",
      nextMishnah: "Next Random Mishnah",
      nextPsalm: "Next Random Psalm",
      nextHalakha: "Next Random Halakha",
      explanation: "Explanation:",
      significance: "Significance & Merit:",
      readSoul: "The recitation and study of these holy texts are dedicated to the eternal elevation of the departed soul.",
      shareWhatsApp: "Share Memorial on WhatsApp",
      aliyotIsrael: "Torah Aliyot in Israel 🇮🇱",
      aliyotDiaspora: "Torah Aliyot in Diaspora 🌐",
      differencesTitle: "Torah Reading differences (Israel vs Diaspora):"
    },
    ru: {
      studyHeader: "Изучение и Молитва за душу усопшего",
      mishnahTitle: "Мишна для возвышения души",
      psalmTitle: "Псалом для возвышения души",
      halakhaTitle: "Халаха для возвышения души",
      nextMishnah: "Другая Мишна",
      nextPsalm: "Другой Псалом",
      nextHalakha: "Другая Халаха",
      explanation: "Объяснение Мишны:",
      significance: "Значение и духовная сила:",
      readSoul: "Изучение этих строк и молитва посвящены вечному возвышению и покою усопшей души.",
      shareWhatsApp: "Поделиться в WhatsApp",
      aliyotIsrael: "Алийот в Израиле 🇮🇱",
      aliyotDiaspora: "Алийот в Диаспоре 🌐",
      differencesTitle: "Различия в чтении Торы (Израиль и Диаспора):"
    }
  };

  const st = studyT[lang];

  const getPrecedingShabbat = (yahrzeitDate: Date): Date => {
    const dayOfWeek = yahrzeitDate.getDay();
    const prevSat = new Date(yahrzeitDate);
    const daysToSubtract = dayOfWeek === 6 ? 7 : dayOfWeek + 1;
    prevSat.setDate(prevSat.getDate() - daysToSubtract);
    return prevSat;
  };

  React.useEffect(() => {
    const fetchParsha = async () => {
      const yahrDate = findYahrzeitGregorianDate(deceased.day, deceased.month, selectedYahrzeitYear);
      if (!yahrDate) {
        setParshaInfo(null);
        return;
      }
      
      const precedingShabbat = getPrecedingShabbat(yahrDate);
      const yyyy = precedingShabbat.getFullYear();
      const mm = precedingShabbat.getMonth() + 1;
      const dd = precedingShabbat.getDate();
      const dateStr = `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;

      setLoadingParsha(true);
      try {
        const response = await fetch(
          `https://www.hebcal.com/hebcal?v=1&cfg=json&s=on&year=${yyyy}&month=${mm}&i=${isIsraelCustom ? 'on' : 'off'}`
        );
        if (!response.ok) {
          throw new Error('Failed to fetch from Hebcal');
        }
        const data = await response.json();
        const item = data.items?.find(
          (it: any) => it.category === 'parashat' && it.date === dateStr
        );
        
        if (item) {
          setParshaInfo({
            name: item.title,
            hebrewName: item.hebrew,
            date: precedingShabbat
          });
        } else {
          // Look for holiday readings on this Saturday
          const holidayItem = data.items?.find(
            (it: any) => it.category === 'holiday' && it.date === dateStr
          );
          if (holidayItem) {
            setParshaInfo({
              name: holidayItem.title,
              hebrewName: holidayItem.hebrew || holidayItem.title,
              date: precedingShabbat
            });
          } else {
            setParshaInfo({
              name: lang === 'he' ? 'אין פרשה קבועה (חג)' : 'Special Holiday Reading',
              hebrewName: 'קריאה מיוחדת לחג (אין פרשה קבועה)',
              date: precedingShabbat
            });
          }
        }
      } catch (err) {
        console.error('Error fetching parsha:', err);
        setParshaInfo(null);
      } finally {
        setLoadingParsha(false);
      }
    };

    fetchParsha();
  }, [deceased.day, deceased.month, selectedYahrzeitYear, isIsraelCustom]);

  const handleDelete = () => {
    onDelete(deceased.id);
    onClose();
  };

  const formatGregorianDate = (date: Date | null): string => {
    if (!date) return '---';
    return date.toLocaleDateString(lang === 'he' ? 'he-IL' : lang === 'ru' ? 'ru-RU' : 'en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Extract month details
  let monthIdx = HEBREW_MONTHS_HE.indexOf(normalizeMonthName(deceased.month));
  if (monthIdx === -1) monthIdx = 0;
  const monthName = lang === 'he' ? HEBREW_MONTHS_HE[monthIdx] : lang === 'en' ? HEBREW_MONTHS_EN[monthIdx] : HEBREW_MONTHS_RU[monthIdx];
  const dayGimatriya = gimatriya(deceased.day);
  const dayStr = lang === 'he' ? dayGimatriya : deceased.day.toString();
  const hebrewDateStr = lang === 'he' ? `${dayStr} ב${monthName}` : `${dayStr} ${monthName}`;

  // Grab rich portion details if loaded
  const portionDetails = parshaInfo ? getTorahPortionDetails(parshaInfo.hebrewName, parshaInfo.name) : null;

  // WhatsApp share trigger
  const shareMemorial = () => {
    const text = generateWhatsAppShareText(deceased, lang);
    openWhatsAppShare(text);
  };

  const getAgeIfAliveToday = (birthStr: string | undefined): number | null => {
    if (!birthStr) return null;
    try {
      const parts = birthStr.split(/[-/.]/);
      let birthDate: Date;
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          birthDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        } else {
          birthDate = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
        }
      } else {
        birthDate = new Date(birthStr);
      }
      if (isNaN(birthDate.getTime())) return null;
      
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    } catch (e) {
      return null;
    }
  };

  const getMishnahSefariaRef = (mishnah: MishnahRecord): string => {
    if (mishnah.id.startsWith('avot-')) {
      const part = mishnah.id.split('-');
      return `Pirkei Avot ${part[1]}`;
    } else if (mishnah.id.startsWith('peah-')) {
      const part = mishnah.id.split('-');
      return `Mishnah Peah ${part[1]}`;
    }
    return "Pirkei Avot 1";
  };

  return (
    <div id="details-modal-overlay" className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      {/* Modal Container */}
      <div 
        id="details-modal-container"
        className="bg-[#131a26] border-2 border-[#c8a96e] rounded-2xl w-full max-w-lg overflow-hidden text-[#f0f4f8] shadow-2xl relative animate-fade-in flex flex-col max-h-[90vh]"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-[#c8a96e] transition-colors bg-black/35 p-1.5 rounded-full z-10 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Scroll Content */}
        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          {/* Top Banner: Image or Premium Memorial Candle Graphics */}
          <div className="relative w-full h-56 sm:h-60 bg-black/40 rounded-2xl overflow-hidden border border-[#c8a96e]/30 flex items-center justify-center shadow-lg group">
            {deceased.image ? (
              <img 
                src={deceased.image} 
                alt={deceased.name} 
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
              />
            ) : (
              <div className="flex flex-col items-center justify-center space-y-2 text-center select-none pb-8">
                <div className="relative w-16 h-24 flex flex-col items-center justify-end">
                  {/* Flame */}
                  <motion.div 
                    className="absolute top-1 w-4 h-7 bg-amber-400 rounded-full blur-[0.5px] shadow-[0_0_12px_#f59e0b,0_0_22px_#f59e0b] origin-bottom"
                    animate={{
                      scaleY: [1, 1.15, 0.95, 1.1, 1],
                      scaleX: [1, 0.9, 1.1, 0.95, 1],
                      rotate: [0, -1.5, 1.5, -0.8, 0],
                      x: [0, -0.3, 0.3, -0.3, 0]
                    }}
                    transition={{
                      duration: 1.6,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    <div className="absolute bottom-0.5 left-1 w-2 h-3.5 bg-yellow-100 rounded-full opacity-95"></div>
                    <div className="absolute bottom-0 left-1.5 w-1 h-2 bg-blue-500 rounded-full opacity-60"></div>
                  </motion.div>
                  
                  {/* Candle Body */}
                  <div className="w-8 h-12 bg-gradient-to-t from-amber-700 via-amber-600 to-amber-500/80 rounded shadow-inner relative overflow-hidden border border-amber-500/20">
                    <div className="absolute top-0 left-0.5 w-1.5 h-3 bg-amber-400/50 rounded-full"></div>
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-0.5 h-1.5 bg-gray-900"></div>
                  </div>
                  
                  {/* Pedestal */}
                  <div className="w-14 h-1 bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 rounded-full"></div>
                </div>
                <span className="text-xs tracking-widest text-[#c8a96e]/70 font-serif uppercase">
                  {lang === 'he' ? 'זכרון עולמים' : 'In Loving Memory'}
                </span>
              </div>
            )}
            {/* High-contrast dark gradient overlay anchored at bottom */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent pointer-events-none"></div>
            
            {/* Title & Parentage positioned neatly at bottom inside image frame */}
            <div className="absolute bottom-3 left-3 right-3 text-center z-10">
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#f0d19e] tracking-wide mb-1 drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
                {lang === 'he' ? deceased.name : translateText(deceased.name, lang as 'en' | 'ru')}
              </h2>
              <p className="text-xs sm:text-sm font-serif font-medium text-amber-100 bg-black/65 backdrop-blur-md px-3.5 py-1 rounded-full border border-amber-500/30 inline-block shadow-lg">
                {formatParentRelation(deceased.gender, deceased.fatherName, deceased.motherName, lang)}
              </p>
            </div>
          </div>

          {/* Action Buttons: WhatsApp Share */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={shareMemorial}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 px-4 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 border border-emerald-500/25 shadow-lg cursor-pointer"
            >
              <MessageCircle className="w-4.5 h-4.5" />
              <span>{st.shareWhatsApp}</span>
            </button>
          </div>

          {/* Consolidated Deceased Details Panel */}
          <div className="bg-black/40 border border-[#c8a96e]/20 p-5 rounded-xl space-y-4 font-sans text-right" dir="rtl">
            <h3 className="text-xs uppercase text-[#c8a96e] font-bold border-b border-[#c8a96e]/10 pb-1.5 flex items-center gap-1.5">
              <CalendarRange className="w-4 h-4 text-[#c8a96e]" />
              {lang === 'he' ? 'פרטי הנפטר במרוכז' : lang === 'ru' ? 'Информация об усопшем' : 'Consolidated Memorial Details'}
            </h3>

            <div className="grid grid-cols-2 gap-4 text-xs text-right">
              <div className="bg-[#0d0d0d]/40 p-3 rounded-lg border border-[#c8a96e]/5">
                <span className="block text-[10px] text-[#c8a96e] font-semibold mb-1">
                  {lang === 'he' ? 'תאריך פטירה עברי' : 'Hebrew Death Anniversary'}
                </span>
                <span className="text-sm font-bold text-white block">
                  {hebrewDateStr}
                </span>
              </div>

              <div className="bg-[#0d0d0d]/40 p-3 rounded-lg border border-[#c8a96e]/5">
                <span className="block text-[10px] text-[#c8a96e] font-semibold mb-1">
                  {t.gender}
                </span>
                <span className="text-sm font-bold text-white block">
                  {deceased.gender === 'male' ? t.male : t.female}
                </span>
              </div>

              {deceased.ageAtDeath !== undefined && deceased.ageAtDeath !== null && (
                <div className="bg-[#0d0d0d]/40 p-3 rounded-lg border border-[#c8a96e]/5">
                  <span className="block text-[10px] text-[#c8a96e] font-semibold mb-1">
                    {lang === 'he' ? 'גיל פטירה' : lang === 'ru' ? 'Возраст смерти' : 'Age at Death'}
                  </span>
                  <span className="text-sm font-bold text-white block">
                    {deceased.ageAtDeath}
                  </span>
                </div>
              )}

              {deceased.birthDate && (
                <div className="bg-[#0d0d0d]/40 p-3 rounded-lg border border-[#c8a96e]/5">
                  <span className="block text-[10px] text-[#c8a96e] font-semibold mb-1">
                    {lang === 'he' ? 'תאריך לידה' : lang === 'ru' ? 'Дата рождения' : 'Date of Birth'}
                  </span>
                  <span className="text-sm font-bold text-white block">
                    {deceased.birthDate}
                  </span>
                </div>
              )}

              {deceased.birthDate && (() => {
                const ageToday = getAgeIfAliveToday(deceased.birthDate);
                if (ageToday !== null) {
                  return (
                    <div className="col-span-2 bg-amber-500/5 p-3 rounded-lg border border-amber-500/10">
                      <span className="block text-[10px] text-amber-500 font-bold mb-1">
                        {lang === 'he' ? 'גיל נוכחי (לו היה בחיים כיום)' : lang === 'ru' ? 'Возраст, если бы был жив' : 'Current Age (if alive today)'}
                      </span>
                      <span className="text-sm font-extrabold text-white block">
                        {ageToday} {lang === 'he' ? 'שנים' : lang === 'ru' ? 'лет' : 'years old'}
                      </span>
                    </div>
                  );
                }
                return null;
              })()}
              
              {/* Interactive Gregorian Date for Selected Year with Eve Calculation */}
              {(() => {
                const yInfo = formatYahrzeitDatesWithEve(deceased.day, deceased.month, selectedYahrzeitYear, lang);
                return (
                  <div className="col-span-2 space-y-2">
                    <div className="bg-[#1c2333]/80 p-3.5 rounded-xl border border-[#c8a96e]/20 text-right space-y-2">
                      <div className="flex items-center justify-between border-b border-[#c8a96e]/10 pb-1.5">
                        <span className="text-[11px] text-[#c8a96e] font-bold">
                          {lang === 'he' ? `תאריכי האזכרה לשנת ${selectedYahrzeitYear}` : `Memorial Anniversary Dates (${selectedYahrzeitYear})`}
                        </span>
                        <span className="text-[10px] text-amber-300 font-serif">
                          🕯️ {hebrewDateStr}
                        </span>
                      </div>

                      {/* 1. Eve Date (Erev Yahrzeit) */}
                      <div className="bg-amber-950/30 p-2.5 rounded-lg border border-amber-500/20 text-right">
                        <span className="block text-[10px] text-amber-400 font-bold">
                          {lang === 'he' ? '🕯️ תחילת האזכרה והדלקת נר נשמה (ערב האזכרה):' : '🕯️ Memorial Begins & Candle Lighting (Eve):'}
                        </span>
                        <span className="text-xs font-bold text-amber-100 mt-0.5 block">
                          {yInfo.eveFormatted || '---'}
                        </span>
                      </div>

                      {/* 2. Day Date */}
                      <div className="bg-red-950/20 p-2.5 rounded-lg border border-red-500/20 text-right">
                        <span className="block text-[10px] text-red-300 font-bold">
                          {lang === 'he' ? '📅 יום האזכרה בלועזי (במהלך היום):' : '📅 Gregorian Anniversary Day:'}
                        </span>
                        <span className="text-xs font-bold text-white mt-0.5 block">
                          {yInfo.dayFormatted || '---'}
                        </span>
                      </div>

                      {/* 3. Halachic Note */}
                      {yInfo.reminderNote && (
                        <p className="text-[10px] text-amber-200/90 leading-relaxed font-sans pt-1">
                          {yInfo.reminderNote}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Life Story Notes inside Consolidated Panel */}
            {deceased.notes && (
              <div className="bg-[#0d0d0d]/30 p-3.5 rounded-lg border border-[#c8a96e]/5 text-xs text-gray-300">
                <span className="block text-[10px] text-[#c8a96e] font-semibold mb-1">{t.lifeStory}</span>
                <p className="leading-relaxed whitespace-pre-wrap">{deceased.notes}</p>
              </div>
            )}

            {/* Contact details inside Consolidated Panel */}
            {deceased.contactPhone && (
              <div className="bg-[#0d0d0d]/30 p-3 rounded-lg border border-[#c8a96e]/5 text-xs text-gray-300 flex items-center gap-2" dir="rtl">
                <Phone className="w-3.5 h-3.5 text-[#c8a96e]" />
                <span className="text-[#c8a96e] font-semibold">{t.contactPhone}:</span>
                <span className="font-mono text-white select-all">{deceased.contactPhone}</span>
              </div>
            )}
          </div>

          {/* Preceding Shabbat and Parashat Hashavua block */}
          <div className="bg-[#0d0d0d]/60 border border-[#c8a96e]/15 p-4 rounded-xl space-y-4 font-sans text-right">
            <h3 className="text-xs uppercase text-[#c8a96e] font-bold border-b border-[#c8a96e]/10 pb-1.5 flex items-center justify-between gap-1.5">
              <span className="flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-[#c8a96e]" />
                {localT[lang].title}
              </span>
              <span className="text-[9px] text-[#c8a96e]/70 bg-[#c8a96e]/10 px-1.5 py-0.5 rounded uppercase font-mono tracking-widest">
                Halacha
              </span>
            </h3>

            {/* Interactive Selectors: Year and Custom */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              {/* Year selector */}
              <div className="space-y-1">
                <label className="text-gray-400 block text-[10px]">{localT[lang].selectYear}</label>
                <select
                  value={selectedYahrzeitYear}
                  onChange={(e) => setSelectedYahrzeitYear(Number(e.target.value))}
                  className="w-full py-1.5 px-2 bg-black/60 text-[#c8a96e] font-sans font-semibold border border-[#c8a96e]/30 rounded outline-none cursor-pointer focus:border-[#c8a96e]"
                >
                  {Array.from({ length: 200 }, (_, i) => currentYear + i).map((yr) => (
                    <option key={yr} value={yr} className="bg-[#131a26] text-white">
                      {yr}
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom selector */}
              <div className="space-y-1">
                <label className="text-gray-400 block text-[10px]">{localT[lang].readingCustom}</label>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsIsraelCustom(true)}
                    className={`flex-1 py-1 px-2 rounded text-[10px] font-medium border text-center transition-all cursor-pointer ${
                      isIsraelCustom
                        ? 'bg-[#c8a96e] text-black border-[#c8a96e]'
                        : 'bg-black/40 text-gray-400 border-[#c8a96e]/15 hover:text-white'
                    }`}
                  >
                    {lang === 'he' ? 'ארץ ישראל 🇮🇱' : lang === 'ru' ? 'Израиль 🇮🇱' : 'Israel 🇮🇱'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsIsraelCustom(false)}
                    className={`flex-1 py-1 px-2 rounded text-[10px] font-medium border text-center transition-all cursor-pointer ${
                      !isIsraelCustom
                        ? 'bg-[#c8a96e] text-black border-[#c8a96e]'
                        : 'bg-black/40 text-gray-400 border-[#c8a96e]/15 hover:text-white'
                    }`}
                  >
                    {lang === 'he' ? 'חו"ל 🌐' : lang === 'ru' ? 'Диаспора 🌐' : 'Diaspora 🌐'}
                  </button>
                </div>
              </div>
            </div>

            {/* Parasha content / loader */}
            <div className="bg-black/30 p-3 rounded-lg border border-[#c8a96e]/5">
              {loadingParsha ? (
                <div className="flex items-center justify-center gap-2 py-3 text-xs text-gray-400">
                  <div className="w-3.5 h-3.5 border-2 border-[#c8a96e] border-t-transparent rounded-full animate-spin"></div>
                  <span>{localT[lang].loading}</span>
                </div>
              ) : parshaInfo ? (
                <div className="space-y-3 text-xs text-right">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">{localT[lang].fallsOn}</span>
                    <span className="text-white font-medium">
                      {formatGregorianDate(parshaInfo.date)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center bg-amber-500/10 p-2.5 rounded border border-amber-500/25">
                    <span className="text-[#c8a96e] font-bold flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5" />
                      {localT[lang].weeklyParsha}
                    </span>
                    <span className="text-white font-bold text-sm">
                      {lang === 'he' ? parshaInfo.hebrewName : `${parshaInfo.hebrewName} (${parshaInfo.name})`}
                    </span>
                  </div>

                  {/* Deep Aliyot & Custom differences info */}
                  {portionDetails && (
                    <div className="mt-3 pt-3 border-t border-[#c8a96e]/10 space-y-2 text-xs">
                      <div className="bg-[#0d0d0d]/40 p-2 rounded border border-[#c8a96e]/5 space-y-1">
                        <span className="text-amber-500 font-semibold block text-[10px]">{st.aliyotIsrael}</span>
                        <p className="text-gray-200 font-medium">{portionDetails.aliyotIsrael[lang]}</p>
                      </div>

                      <div className="bg-[#0d0d0d]/40 p-2 rounded border border-[#c8a96e]/5 space-y-1">
                        <span className="text-blue-400 font-semibold block text-[10px]">{st.aliyotDiaspora}</span>
                        <p className="text-gray-200 font-medium">{portionDetails.aliyotDiaspora[lang]}</p>
                      </div>

                      <div className="space-y-1 text-right mt-2" dir="rtl">
                        <span className="text-[#c8a96e] font-semibold text-[10px] block">{st.differencesTitle}</span>
                        <p className="text-gray-300 leading-relaxed text-[11px] bg-black/20 p-2.5 rounded">
                          {portionDetails.differences[lang]}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-xs text-gray-500 py-3">
                  {localT[lang].noData}
                </div>
              )}
            </div>

            {/* Explanation Note */}
            <p className="text-[10px] text-gray-400 leading-normal bg-black/25 p-2 rounded border border-[#c8a96e]/5 flex items-start gap-1.5 text-right" dir="rtl">
              <span className="inline-block mt-0.5">💡</span>
              <span>{localT[lang].explanation}</span>
            </p>
          </div>

          {/* SPIRITUAL CORNER: Psalms, Halakha & Mishnah Study */}
          <div className="bg-[#2a1d0f]/50 border-2 border-[#c8a96e]/35 p-4 rounded-xl space-y-5 text-right font-sans" dir="rtl">
            <h3 className="text-xs uppercase text-[#c8a96e] font-bold border-b border-[#c8a96e]/20 pb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Star className="w-4 h-4 text-[#c8a96e]" />
                {st.studyHeader}
              </span>
              <span className="text-[9.5px] bg-[#c8a96e]/10 text-[#c8a96e] px-2 py-0.5 rounded font-serif tracking-wide">
                לעילוי נשמה
              </span>
            </h3>

            {/* Tehillim (Psalms) Block */}
            <div className="space-y-2 bg-black/40 p-3.5 rounded-lg border border-[#c8a96e]/10 relative overflow-hidden">
              <div className="flex justify-between items-center border-b border-[#c8a96e]/10 pb-1.5">
                <span className="text-[#c8a96e] font-bold text-xs flex items-center gap-1.5">
                  📖 {st.psalmTitle}
                </span>
                <span className="text-[10px] text-gray-400 font-medium">
                  {activePsalm.title[lang]}
                </span>
              </div>
              {(() => {
                const snippetMain = activePsalm.text[lang] || activePsalm.text.he;
                const snippetMainDisplay = snippetMain.length > 130 ? snippetMain.substring(0, 130) + "..." : snippetMain;
                const snippetHeDisplay = activePsalm.text.he.length > 130 ? activePsalm.text.he.substring(0, 130) + "..." : activePsalm.text.he;
                return (
                  <>
                    <p 
                      onClick={() => {
                        setReadingSefariaRef(`Psalms ${activePsalm.chapter}`);
                        setReadingTitle(activePsalm.title[lang]);
                      }}
                      className="text-sm font-sans font-semibold text-white text-center leading-relaxed py-3 bg-amber-500/5 px-3 rounded border border-amber-500/10 cursor-pointer hover:border-[#c8a96e] hover:bg-amber-500/10 transition-all flex flex-col items-center gap-2"
                      dir={lang === 'he' ? 'rtl' : 'ltr'}
                      title={lang === 'he' ? 'לחץ לקריאת הפרק המלא' : lang === 'ru' ? 'Нажмите для чтения всей главы' : 'Click to read full chapter'}
                    >
                      <span>{snippetMainDisplay}</span>
                      <span className="text-[11px] text-[#c8a96e] font-sans font-bold bg-[#c8a96e]/10 px-2.5 py-1 rounded-full border border-[#c8a96e]/25 shadow-sm animate-pulse hover:bg-[#c8a96e]/20 transition-all">
                        {lang === 'he' ? 'לחץ להמשך לקריאת הפרק המלא ➔' : lang === 'ru' ? 'Нажмите для продолжения ➔' : 'Click to continue reading ➔'}
                      </span>
                    </p>

                    {lang !== 'he' && (
                      <div className="pt-1.5 border-t border-[#c8a96e]/10 text-right" dir="rtl">
                        <span className="text-[9px] text-[#c8a96e] font-bold block mb-0.5">מקור בעברית:</span>
                        <p className="font-serif text-[#f7e7c4] text-xs leading-relaxed">{snippetHeDisplay}</p>
                      </div>
                    )}

                    <div className="text-xs text-gray-300 space-y-1 leading-relaxed">
                      <div className="pt-1.5 border-t border-[#c8a96e]/5">
                        <span className="text-[#c8a96e] font-bold text-[10px] block mb-0.5">{st.significance}</span>
                        <p className="text-gray-300 text-[11px]">{activePsalm.significance[lang]}</p>
                      </div>
                    </div>
                  </>
                );
              })()}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setReadingSefariaRef(`Psalms ${activePsalm.chapter}`);
                    setReadingTitle(activePsalm.title[lang]);
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-[#c8a96e]/10 hover:bg-[#c8a96e]/20 border border-[#c8a96e]/30 text-[#c8a96e] text-[10px] font-bold py-1.5 px-2.5 rounded-md transition-all cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>{lang === 'he' ? 'קריאת הפרק המלא' : lang === 'ru' ? 'Читать главу полностью' : 'Read Full Chapter'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActivePsalm(getRandomPsalm())}
                  className="bg-amber-950/25 hover:bg-amber-900/50 border border-[#c8a96e]/20 text-[#c8a96e] text-[10px] font-bold py-1.5 px-2.5 rounded-md transition-all cursor-pointer flex items-center justify-center"
                  title={st.nextPsalm}
                >
                  <RefreshCw className="w-3.5 h-3.5 animate-pulse" />
                </button>
              </div>
            </div>

            {/* Halakha Study Block */}
            <div className="space-y-2 bg-black/40 p-3.5 rounded-lg border border-[#c8a96e]/10 relative overflow-hidden">
              <div className="flex justify-between items-center border-b border-[#c8a96e]/10 pb-1.5">
                <span className="text-[#c8a96e] font-bold text-xs flex items-center gap-1.5">
                  ⚖️ {st.halakhaTitle}
                </span>
                <span className="text-[10px] text-gray-400 font-medium">
                  {activeHalakha.reference[lang]}
                </span>
              </div>
              <p 
                className="text-sm font-sans font-bold text-white text-center leading-relaxed py-2 bg-amber-500/5 px-2 rounded border border-amber-500/10" 
                dir={lang === 'he' ? 'rtl' : 'ltr'}
              >
                {activeHalakha.text[lang] || activeHalakha.text.he}
              </p>

              {lang !== 'he' && (
                <div className="pt-1.5 border-t border-[#c8a96e]/10 text-right" dir="rtl">
                  <span className="text-[9px] text-[#c8a96e] font-bold block mb-0.5">מקור בעברית:</span>
                  <p className="font-serif text-[#f7e7c4] text-xs leading-relaxed">{activeHalakha.text.he}</p>
                </div>
              )}

              <div className="text-xs text-gray-300 space-y-1 leading-relaxed">
                <div className="pt-1.5 border-t border-[#c8a96e]/5">
                  <span className="text-[#c8a96e] font-bold text-[10px] block mb-0.5">{st.explanation}</span>
                  <p className="text-gray-300 text-[11px]">{activeHalakha.explanation[lang]}</p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setActiveHalakha(getRandomHalakha())}
                  className="flex-1 bg-amber-950/25 hover:bg-amber-900/50 border border-[#c8a96e]/20 text-[#c8a96e] text-[10px] font-bold py-1.5 px-2.5 rounded-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  title={st.nextHalakha}
                >
                  <RefreshCw className="w-3.5 h-3.5 animate-pulse" />
                  <span>{st.nextHalakha}</span>
                </button>
              </div>
            </div>

            {/* Mishnah Study Block */}
            <div className="space-y-2 bg-black/40 p-3.5 rounded-lg border border-[#c8a96e]/10 relative overflow-hidden">
              <div className="flex justify-between items-center border-b border-[#c8a96e]/10 pb-1.5">
                <span className="text-amber-400 font-bold text-xs flex items-center gap-1.5">
                  📚 {st.mishnahTitle}
                </span>
                <span className="text-[10px] text-gray-400 font-medium">
                  {activeMishnah.reference[lang]}
                </span>
              </div>
              
              {(() => {
                const snippetMain = activeMishnah.text[lang] || activeMishnah.text.he;
                const snippetMainDisplay = snippetMain.length > 130 ? snippetMain.substring(0, 130) + "..." : snippetMain;
                const snippetHeDisplay = activeMishnah.text.he.length > 130 ? activeMishnah.text.he.substring(0, 130) + "..." : activeMishnah.text.he;
                return (
                  <>
                    <p 
                      onClick={() => {
                        const ref = getMishnahSefariaRef(activeMishnah);
                        setReadingSefariaRef(ref);
                        setReadingTitle(activeMishnah.reference[lang]);
                      }}
                      className="text-sm font-sans font-semibold text-white text-center leading-relaxed py-3 bg-amber-500/5 px-3 rounded border border-amber-500/10 cursor-pointer hover:border-[#c8a96e] hover:bg-amber-500/10 transition-all flex flex-col items-center gap-2" 
                      dir={lang === 'he' ? 'rtl' : 'ltr'}
                      title={lang === 'he' ? 'לחץ לקריאת המשנה המלאה' : lang === 'ru' ? 'Нажмите для чтения всей Мишны' : 'Click to read full Mishnah'}
                    >
                      <span>{snippetMainDisplay}</span>
                      <span className="text-[11px] text-[#c8a96e] font-sans font-bold bg-[#c8a96e]/10 px-2.5 py-1 rounded-full border border-[#c8a96e]/25 shadow-sm animate-pulse hover:bg-[#c8a96e]/20 transition-all">
                        {lang === 'he' ? 'לחץ להמשך לקריאת המשנה המלאה ➔' : lang === 'ru' ? 'Нажмите для продолжения ➔' : 'Click to continue reading ➔'}
                      </span>
                    </p>

                    {lang !== 'he' && (
                      <div className="pt-1.5 border-t border-[#c8a96e]/10 text-right" dir="rtl">
                        <span className="text-[9px] text-[#c8a96e] font-bold block mb-0.5">מקור בעברית:</span>
                        <p className="font-serif text-[#f7e7c4] text-xs leading-relaxed">{snippetHeDisplay}</p>
                      </div>
                    )}
                  </>
                );
              })()}

              <div className="text-xs text-gray-300 space-y-1 leading-relaxed">
                <div className="pt-1.5 border-t border-[#c8a96e]/5">
                  <span className="text-[#c8a96e] font-bold text-[10px] block mb-0.5">{st.explanation}</span>
                  <p className="text-gray-300 text-[11px]">{activeMishnah.explanation[lang]}</p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const ref = getMishnahSefariaRef(activeMishnah);
                    setReadingSefariaRef(ref);
                    setReadingTitle(activeMishnah.reference[lang]);
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-[#c8a96e]/10 hover:bg-[#c8a96e]/20 border border-[#c8a96e]/30 text-[#c8a96e] text-[10px] font-bold py-1.5 px-2.5 rounded-md transition-all cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>{lang === 'he' ? 'קריאת המשנה המלאה' : lang === 'ru' ? 'Читать Мишну полностью' : 'Read Full Mishnah'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMishnah(getRandomGeneralMishnah())}
                  className="bg-amber-950/25 hover:bg-amber-900/50 border border-[#c8a96e]/20 text-[#c8a96e] text-[10px] font-bold py-1.5 px-2.5 rounded-md transition-all cursor-pointer flex items-center justify-center"
                  title={st.nextMishnah}
                >
                  <RefreshCw className="w-3.5 h-3.5 animate-pulse" />
                </button>
              </div>
            </div>

            {/* Pirkei Avot Study Block (חלון פרקי אבות) */}
            <div className="space-y-2 bg-black/40 p-3.5 rounded-lg border border-[#c8a96e]/10 relative overflow-hidden">
              <div className="flex justify-between items-center border-b border-[#c8a96e]/10 pb-1.5">
                <span className="text-[#c8a96e] font-bold text-xs flex items-center gap-1.5">
                  👑 {lang === 'he' ? 'פרקי אבות לעילוי נשמה' : lang === 'ru' ? 'Пиркей Авот' : 'Pirkei Avot'}
                </span>
                <span className="text-[10px] text-gray-400 font-medium">
                  {activeAvot.reference[lang]}
                </span>
              </div>
              
              {(() => {
                const snippetMain = activeAvot.text[lang] || activeAvot.text.he;
                const snippetMainDisplay = snippetMain.length > 130 ? snippetMain.substring(0, 130) + "..." : snippetMain;
                const snippetHeDisplay = activeAvot.text.he.length > 130 ? activeAvot.text.he.substring(0, 130) + "..." : activeAvot.text.he;
                return (
                  <>
                    <p 
                      onClick={() => {
                        const ref = getMishnahSefariaRef(activeAvot);
                        setReadingSefariaRef(ref);
                        setReadingTitle(activeAvot.reference[lang]);
                      }}
                      className="text-sm font-sans font-semibold text-white text-center leading-relaxed py-3 bg-amber-500/5 px-3 rounded border border-amber-500/10 cursor-pointer hover:border-[#c8a96e] hover:bg-amber-500/10 transition-all flex flex-col items-center gap-2" 
                      dir={lang === 'he' ? 'rtl' : 'ltr'}
                      title={lang === 'he' ? 'לחץ לקריאת פרקי אבות המלאים' : 'Click to read full Pirkei Avot'}
                    >
                      <span>{snippetMainDisplay}</span>
                      <span className="text-[11px] text-[#c8a96e] font-sans font-bold bg-[#c8a96e]/10 px-2.5 py-1 rounded-full border border-[#c8a96e]/25 shadow-sm animate-pulse hover:bg-[#c8a96e]/20 transition-all">
                        {lang === 'he' ? 'לחץ להמשך לקריאת המשנה מפרקי אבות ➔' : 'Click to continue reading ➔'}
                      </span>
                    </p>

                    {lang !== 'he' && (
                      <div className="pt-1.5 border-t border-[#c8a96e]/10 text-right" dir="rtl">
                        <span className="text-[9px] text-[#c8a96e] font-bold block mb-0.5">מקור בעברית:</span>
                        <p className="font-serif text-[#f7e7c4] text-xs leading-relaxed">{snippetHeDisplay}</p>
                      </div>
                    )}
                  </>
                );
              })()}

              <div className="text-xs text-gray-300 space-y-1 leading-relaxed">
                <div className="pt-1.5 border-t border-[#c8a96e]/5">
                  <span className="text-[#c8a96e] font-bold text-[10px] block mb-0.5">{st.explanation}</span>
                  <p className="text-gray-300 text-[11px]">{activeAvot.explanation[lang]}</p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const ref = getMishnahSefariaRef(activeAvot);
                    setReadingSefariaRef(ref);
                    setReadingTitle(activeAvot.reference[lang]);
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-[#c8a96e]/10 hover:bg-[#c8a96e]/20 border border-[#c8a96e]/30 text-[#c8a96e] text-[10px] font-bold py-1.5 px-2.5 rounded-md transition-all cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>{lang === 'he' ? 'קריאת משנת פרקי אבות המלאה' : 'Read Full Pirkei Avot'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveAvot(getRandomPirkeiAvot())}
                  className="bg-amber-950/25 hover:bg-amber-900/50 border border-[#c8a96e]/20 text-[#c8a96e] text-[10px] font-bold py-1.5 px-2.5 rounded-md transition-all cursor-pointer flex items-center justify-center"
                  title="משנה אקראית נוספת מפרקי אבות"
                >
                  <RefreshCw className="w-3.5 h-3.5 animate-pulse" />
                </button>
              </div>
            </div>

            <p className="text-[9.5px] text-center text-gray-400 italic bg-black/10 p-1.5 rounded leading-normal">
              {st.readSoul}
            </p>
          </div>

          {/* Danger Zone: Delete Confirmation */}
          {showConfirmDelete && (
            <div className="bg-red-950/50 border border-red-500/30 p-4 rounded-xl space-y-3 font-sans animate-fade-in text-center">
              <h4 className="text-sm font-semibold text-red-300">{t.confirmDelete}</h4>
              <p className="text-xs text-gray-300">{t.confirmDeleteText}</p>
              <div className="flex justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmDelete(false)}
                  className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                >
                  {t.delete}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Actions Footer */}
        {!showConfirmDelete && (
          <div className="bg-[#0d0d0d]/80 border-t border-[#c8a96e]/15 px-6 py-4 flex gap-3 font-sans">
            <button
              type="button"
              onClick={() => onEdit(deceased)}
              className="flex-1 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white py-2 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-1.5 border border-amber-500/20 cursor-pointer"
            >
              <Edit className="w-4 h-4" />
              <span>{t.edit}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowConfirmDelete(true)}
              className="px-4 py-2 border border-red-500/30 hover:border-red-500 hover:bg-red-950/30 text-red-400 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer"
              title={t.delete}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Sefaria Full Text Reader Overlay */}
      {readingSefariaRef && (
        <FullReadingModal
          sefariaRef={readingSefariaRef}
          title={readingTitle}
          lang={lang}
          onClose={() => setReadingSefariaRef(null)}
        />
      )}
    </div>
  );
};
