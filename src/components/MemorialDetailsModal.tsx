/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Deceased, Language } from '../types';
import { translations, formatParentRelation } from '../utils/translations';
import { translateText, getLocalizedName, getLocalizedNotes } from '../utils/transliteration';
import { HEBREW_MONTHS_HE, HEBREW_MONTHS_EN, HEBREW_MONTHS_RU, gimatriya, findYahrzeitGregorianDate, getYahrzeitEveDate, formatYahrzeitDatesWithEve, normalizeMonthName } from '../utils/hebrewDate';
import { X, Phone, CalendarRange, MapPin, Edit, Trash2, Heart, Clock, BookOpen, Globe, MessageCircle, RefreshCw, Star, Loader2, Copy } from 'lucide-react';
import { getTorahPortionDetails, getShabbatYahrzeitInfo } from '../utils/torahPortionHelper';
import { ShabbatYahrzeitBanner } from './ShabbatYahrzeitBanner';
import { getRandomMishnah, getRandomPsalm, getRandomHalakha, getRandomPirkeiAvot, getRandomGeneralMishnah, MishnahRecord, PsalmRecord, HalakhaRecord } from '../utils/memorialStudy';
import { getShortMemorialUrl, openWhatsAppShare, generateWhatsAppShareText, shareMemorialCard } from '../utils/shareUtils';
import { FullReadingModal } from './FullReadingModal';
import { DeceasedPhotoFrame } from './YahrzeitCandle';

interface MemorialDetailsModalProps {
  deceased: Deceased;
  lang: Language;
  onClose: () => void;
  onEdit: (deceased: Deceased) => void;
  onDelete: (id: number) => void;
}

export const MemorialDetailsModal: React.FC<MemorialDetailsModalProps> = ({ deceased, lang, onClose, onEdit, onDelete }) => {
  if (!deceased || !deceased.name || deceased.name.trim() === '' || deceased.name === 'undefined') {
    return (
      <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-50">
        <div className="bg-[#131a26] border border-amber-500/40 rounded-2xl p-6 max-w-md w-full shadow-2xl text-center space-y-4 font-sans">
          <p className="text-amber-400 font-bold text-base">
            {lang === 'he' ? 'הכרטיס המבוקש לא נמצא במערכת' : lang === 'ru' ? 'Запрошенная карточка не найдена в системе' : 'The requested card was not found in the system'}
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-[#c8a96e] hover:bg-[#b8952e] text-black font-bold text-xs rounded-xl transition-all cursor-pointer"
          >
            {lang === 'he' ? 'סגור' : 'Close'}
          </button>
        </div>
      </div>
    );
  }

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
  const [hebcalItems, setHebcalItems] = useState<any[]>([]);
  const [yahrzeitGregDate, setYahrzeitGregDate] = useState<Date | null>(null);

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

  const getPrecedingShabbat = (yahrzeitDate?: Date | null): Date => {
    if (!yahrzeitDate) return new Date();
    const dateObj = yahrzeitDate instanceof Date ? yahrzeitDate : new Date(yahrzeitDate);
    if (isNaN(dateObj.getTime())) return new Date();

    const dayOfWeek = dateObj.getDay();
    const prevSat = new Date(dateObj);
    const daysToSubtract = dayOfWeek === 6 ? 7 : dayOfWeek + 1;
    prevSat.setDate(prevSat.getDate() - daysToSubtract);
    return prevSat;
  };

  React.useEffect(() => {
    const fetchParsha = async () => {
      const yahrDate = findYahrzeitGregorianDate(deceased.day, deceased.month, selectedYahrzeitYear);
      setYahrzeitGregDate(yahrDate);
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
        setHebcalItems(data.items || []);
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
    const shabbatInfo = yahrzeitGregDate ? getShabbatYahrzeitInfo(yahrzeitGregDate, hebcalItems, lang) : null;
    shareMemorialCard(deceased, lang, shabbatInfo);
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
    <div id="details-modal-overlay" className="fixed inset-0 bg-[#3B2F2F]/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
      {/* Modal Container */}
      <div 
        id="details-modal-container"
        className="bg-[#FFFDF8] border border-[#D8CFC0] rounded-3xl w-full max-w-lg overflow-hidden text-[#3B2F2F] shadow-xl relative animate-fade-in flex flex-col max-h-[90vh]"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#6B5E53] hover:text-[#3B2F2F] transition-colors bg-[#F8F2E4] hover:bg-[#E8E2D5] p-1.5 rounded-full z-10 cursor-pointer border border-[#D8CFC0]"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Scroll Content */}
        <div className="overflow-y-auto flex-1 p-5 sm:p-6 space-y-6">
          {/* Top Banner: Framed Image with Memorial Candle to the side */}
          <div className="relative w-full min-h-[220px] bg-[#F8F2E4] rounded-2xl border border-[#E8E2D5] p-5 flex flex-col items-center justify-center shadow-xs overflow-hidden">
            {/* Ambient olive glow behind portrait and candle */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-32 bg-[#5D6D53]/10 rounded-full blur-2xl pointer-events-none"></div>

            <div className="flex flex-row items-center justify-center gap-6 sm:gap-10 my-2 relative z-10">
              {/* Framed Deceased Portrait or Animated Yahrzeit Candle */}
              <DeceasedPhotoFrame deceased={deceased} size="modal" lang={lang} />

              {/* Memorial Candle Beside Photo ("לצד התמונה") */}
              <div className="flex flex-col items-center justify-center shrink-0">
                <div className="relative w-14 h-20 flex flex-col items-center justify-end">
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
                  <div className="w-14 h-1 bg-gradient-to-r from-gray-400 via-gray-300 to-gray-400 rounded-full"></div>
                </div>
                <span className="text-[10px] sm:text-xs tracking-wider text-[#5D6D53] font-serif uppercase mt-1.5 font-bold">
                  {lang === 'he' ? '🔥 נר נשמה דולק' : lang === 'ru' ? '🔥 Свеча памяти горит' : '🔥 Memorial Candle Lit'}
                </span>
              </div>
            </div>

            {/* Title & Parentage below photo & candle */}
            <div className="text-center z-10 mt-3">
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#3B2F2F] tracking-wide mb-1.5">
                {getLocalizedName(deceased, lang)}
              </h2>
              <p className="text-xs sm:text-sm font-serif font-medium text-[#5D6D53] bg-[#FFFDF8] px-3.5 py-1 rounded-full border border-[#E8E2D5] inline-block shadow-xs">
                {formatParentRelation(deceased.gender, deceased.fatherName, deceased.motherName, lang, deceased)}
              </p>
            </div>
          </div>

          {/* Action Button: WhatsApp Share */}
          <div className="flex">
            <button
              type="button"
              onClick={shareMemorial}
              className="w-full bg-[#5D6D53] hover:bg-[#4F5D46] text-white py-3 px-5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 flex items-center justify-center gap-2 border border-[#5D6D53]/30 shadow-xs cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
            >
              <MessageCircle className="w-5 h-5" />
              <span>{st.shareWhatsApp}</span>
            </button>
          </div>

          {/* Consolidated Deceased Details Panel */}
          <div className="bg-[#F8F2E4] border border-[#E8E2D5] p-5 rounded-2xl space-y-4 font-sans text-right" dir="rtl">
            <h3 className="text-xs uppercase text-[#5D6D53] font-bold border-b border-[#E8E2D5] pb-1.5 flex items-center gap-1.5">
              <CalendarRange className="w-4 h-4 text-[#5D6D53]" />
              {lang === 'he' ? 'פרטי הנפטר במרוכז' : lang === 'ru' ? 'Информация об усопшем' : 'Consolidated Memorial Details'}
            </h3>

            <div className="grid grid-cols-2 gap-4 text-xs text-right">
              <div className="bg-[#FAF5EC] p-3 rounded-xl border border-[#E8E2D5]">
                <span className="block text-[11px] text-[#5D6D53] font-bold mb-1">
                  {lang === 'he' ? 'תאריך פטירה עברי' : lang === 'ru' ? 'Еврейская дата кончины' : 'Hebrew Death Anniversary'}
                </span>
                <span className="text-base md:text-lg font-black text-[#3B2F2F] block">
                  {hebrewDateStr}
                </span>
              </div>

              <div className="bg-[#FAF5EC] p-3 rounded-xl border border-[#E8E2D5]">
                <span className="block text-[10px] text-[#5D6D53] font-semibold mb-1">
                  {t.gender}
                </span>
                <span className="text-sm font-bold text-[#3B2F2F] block">
                  {deceased.gender === 'male' ? t.male : t.female}
                </span>
              </div>

              {deceased.ageAtDeath !== undefined && deceased.ageAtDeath !== null && (
                <div className="bg-[#FAF5EC] p-3 rounded-xl border border-[#E8E2D5]">
                  <span className="block text-[10px] text-[#5D6D53] font-semibold mb-1">
                    {lang === 'he' ? 'גיל פטירה' : lang === 'ru' ? 'Возраст смерти' : 'Age at Death'}
                  </span>
                  <span className="text-sm font-bold text-[#3B2F2F] block">
                    {deceased.ageAtDeath}
                  </span>
                </div>
              )}

              {deceased.birthDate && (
                <div className="bg-[#FAF5EC] p-3 rounded-xl border border-[#E8E2D5]">
                  <span className="block text-[10px] text-[#5D6D53] font-semibold mb-1">
                    {lang === 'he' ? 'תאריך לידה' : lang === 'ru' ? 'Дата рождения' : 'Date of Birth'}
                  </span>
                  <span className="text-sm font-bold text-[#3B2F2F] block">
                    {deceased.birthDate}
                  </span>
                </div>
              )}

              {deceased.birthDate && (() => {
                const ageToday = getAgeIfAliveToday(deceased.birthDate);
                if (ageToday !== null) {
                  return (
                    <div className="col-span-2 bg-[#FFFDF8] p-3 rounded-xl border border-[#E8E2D5]">
                      <span className="block text-[10px] text-[#5D6D53] font-bold mb-1">
                        {lang === 'he' ? 'גיל נוכחי (לו היה בחיים כיום)' : lang === 'ru' ? 'Возраст, если бы был жив' : 'Current Age (if alive today)'}
                      </span>
                      <span className="text-sm font-extrabold text-[#3B2F2F] block">
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
                    <div className="bg-[#FFFDF8] p-3.5 rounded-xl border border-[#D8CFC0] text-right space-y-2">
                      <div className="flex items-center justify-between border-b border-[#E8E2D5] pb-1.5">
                        <span className="text-xs text-[#5D6D53] font-black">
                          {lang === 'he' ? `תאריכי האזכרה לשנת ${selectedYahrzeitYear}` : lang === 'ru' ? `Даты поминания на ${selectedYahrzeitYear} год` : `Memorial Anniversary Dates (${selectedYahrzeitYear})`}
                        </span>
                        <span className="text-xs text-[#3B2F2F] font-serif font-bold">
                          🕯️ {hebrewDateStr}
                        </span>
                      </div>

                      {/* 1. Eve Date (Erev Yahrzeit) */}
                      <div className="bg-[#FAF5EC] p-2.5 rounded-lg border border-[#E8E2D5] text-right">
                        <span className="block text-[11px] text-[#5D6D53] font-bold">
                          {lang === 'he' ? '🕯️ תחילת האזכרה והדלקת נר נשמה (ערב האזכרה):' : lang === 'ru' ? '🕯️ Начало памяти и зажигание свечи (накануне):' : '🕯️ Memorial Begins & Candle Lighting (Eve):'}
                        </span>
                        <span className="text-sm font-black text-[#3B2F2F] mt-0.5 block">
                          {yInfo.eveFormatted || '---'}
                        </span>
                      </div>

                      {/* 2. Day Date */}
                      <div className="bg-[#FAF5EC] p-2.5 rounded-lg border border-[#E8E2D5] text-right">
                        <span className="block text-[11px] text-[#5D6D53] font-bold">
                          {lang === 'he' ? '📅 יום האזכרה בלועזי (במהלך היום):' : lang === 'ru' ? '📅 День поминания (по григорианскому календарю):' : '📅 Gregorian Anniversary Day:'}
                        </span>
                        <span className="text-sm font-black text-[#3B2F2F] mt-0.5 block">
                          {yInfo.dayFormatted || '---'}
                        </span>
                      </div>

                      {/* 3. Halachic Note */}
                      {yInfo.reminderNote && (
                        <p className="text-[10px] text-[#6B5E53] leading-relaxed font-sans pt-1">
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
              <div className="bg-[#FAF5EC] p-3.5 rounded-xl border border-[#E8E2D5] text-xs text-[#3B2F2F]">
                <span className="block text-[10px] text-[#5D6D53] font-semibold mb-1">{t.lifeStory}</span>
                <p className="leading-relaxed whitespace-pre-wrap">{deceased.notes}</p>
              </div>
            )}

            {/* Contact details inside Consolidated Panel */}
            {deceased.contactPhone && (
              <div className="bg-[#FAF5EC] p-3 rounded-xl border border-[#E8E2D5] text-xs text-[#3B2F2F] flex items-center gap-2" dir="rtl">
                <Phone className="w-3.5 h-3.5 text-[#5D6D53]" />
                <span className="text-[#5D6D53] font-semibold">{t.contactPhone}:</span>
                <span className="font-mono text-[#3B2F2F] select-all">{deceased.contactPhone}</span>
              </div>
            )}
          </div>

          {/* Preceding Shabbat and Parashat Hashavua block */}
          <div className="bg-[#F8F2E4] border border-[#E8E2D5] p-4 rounded-2xl space-y-4 font-sans text-right">
            <h3 className="text-xs uppercase text-[#5D6D53] font-bold border-b border-[#E8E2D5] pb-1.5 flex items-center justify-between gap-1.5">
              <span className="flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-[#5D6D53]" />
                {localT[lang].title}
              </span>
              <span className="text-[9px] text-[#5D6D53] bg-[#5D6D53]/10 px-1.5 py-0.5 rounded uppercase font-mono tracking-widest font-bold">
                Halacha
              </span>
            </h3>

            {/* Interactive Selectors: Year and Custom */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              {/* Year selector */}
              <div className="space-y-1">
                <label className="text-[#6B5E53] block text-[10px]">{localT[lang].selectYear}</label>
                <select
                  value={selectedYahrzeitYear}
                  onChange={(e) => setSelectedYahrzeitYear(Number(e.target.value))}
                  className="w-full py-1.5 px-2 bg-[#FFFDF8] text-[#3B2F2F] font-sans font-semibold border border-[#D8CFC0] rounded outline-none cursor-pointer focus:border-[#5D6D53]"
                >
                  {Array.from({ length: 200 }, (_, i) => currentYear + i).map((yr) => (
                    <option key={yr} value={yr} className="bg-[#FFFDF8] text-[#3B2F2F]">
                      {yr}
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom selector */}
              <div className="space-y-1">
                <label className="text-[#6B5E53] block text-[10px]">{localT[lang].readingCustom}</label>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsIsraelCustom(true)}
                    className={`flex-1 py-1 px-2 rounded text-[10px] font-medium border text-center transition-all cursor-pointer ${
                      isIsraelCustom
                        ? 'bg-[#5D6D53] text-white border-[#5D6D53]'
                        : 'bg-[#FFFDF8] text-[#6B5E53] border-[#D8CFC0] hover:text-[#3B2F2F]'
                    }`}
                  >
                    {lang === 'he' ? 'ארץ ישראל 🇮🇱' : lang === 'ru' ? 'Израиль 🇮🇱' : 'Israel 🇮🇱'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsIsraelCustom(false)}
                    className={`flex-1 py-1 px-2 rounded text-[10px] font-medium border text-center transition-all cursor-pointer ${
                      !isIsraelCustom
                        ? 'bg-[#5D6D53] text-white border-[#5D6D53]'
                        : 'bg-[#FFFDF8] text-[#6B5E53] border-[#D8CFC0] hover:text-[#3B2F2F]'
                    }`}
                  >
                    {lang === 'he' ? 'חו"ל 🌐' : lang === 'ru' ? 'Диאспора 🌐' : 'Diaspora 🌐'}
                  </button>
                </div>
              </div>
            </div>

            {/* Parasha content / loader */}
            <div className="bg-[#FAF5EC] p-3 rounded-xl border border-[#E8E2D5]">
              {loadingParsha ? (
                <div className="flex items-center justify-center gap-2 py-3 text-xs text-[#6B5E53]">
                  <div className="w-3.5 h-3.5 border-2 border-[#5D6D53] border-t-transparent rounded-full animate-spin"></div>
                  <span>{localT[lang].loading}</span>
                </div>
              ) : parshaInfo ? (
                <div className="space-y-3 text-xs text-right">
                  <div className="flex justify-between items-center">
                    <span className="text-[#6B5E53]">{localT[lang].fallsOn}</span>
                    <span className="text-[#3B2F2F] font-medium">
                      {formatGregorianDate(parshaInfo.date)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center bg-[#FFFDF8] p-2.5 rounded-xl border border-[#D8CFC0]">
                    <span className="text-[#5D6D53] font-bold flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5" />
                      {localT[lang].weeklyParsha}
                    </span>
                    <span className="text-[#3B2F2F] font-bold text-sm">
                      {lang === 'he' ? parshaInfo.hebrewName : `${parshaInfo.hebrewName} (${parshaInfo.name})`}
                    </span>
                  </div>

                  {/* Deep Aliyot & Custom differences info */}
                  {portionDetails && (
                    <div className="mt-3 pt-3 border-t border-[#E8E2D5] space-y-2 text-xs">
                      <div className="bg-[#FFFDF8] p-2.5 rounded-lg border border-[#E8E2D5] space-y-1">
                        <span className="text-[#5D6D53] font-semibold block text-[10px]">{st.aliyotIsrael}</span>
                        <p className="text-[#3B2F2F] font-medium">{portionDetails.aliyotIsrael[lang]}</p>
                      </div>

                      <div className="bg-[#FFFDF8] p-2.5 rounded-lg border border-[#E8E2D5] space-y-1">
                        <span className="text-blue-700 font-semibold block text-[10px]">{st.aliyotDiaspora}</span>
                        <p className="text-[#3B2F2F] font-medium">{portionDetails.aliyotDiaspora[lang]}</p>
                      </div>

                      <div className="space-y-1 text-right mt-2" dir="rtl">
                        <span className="text-[#5D6D53] font-semibold text-[10px] block">{st.differencesTitle}</span>
                        <p className="text-[#3B2F2F] leading-relaxed text-[11px] bg-[#FFFDF8] p-2.5 rounded-lg border border-[#E8E2D5]">
                          {portionDetails.differences[lang]}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-xs text-[#6B5E53] py-3">
                  {localT[lang].noData}
                </div>
              )}
            </div>

            {/* Explanation Note */}
            <p className="text-[10px] text-[#6B5E53] leading-normal bg-[#FAF5EC] p-2.5 rounded-lg border border-[#E8E2D5] flex items-start gap-1.5 text-right" dir="rtl">
              <span className="inline-block mt-0.5">💡</span>
              <span>{localT[lang].explanation}</span>
            </p>

            {yahrzeitGregDate && (
              <ShabbatYahrzeitBanner
                eventDate={yahrzeitGregDate}
                hebcalEvents={hebcalItems}
                lang={lang}
                compact={false}
              />
            )}
          </div>

          {/* SPIRITUAL CORNER: Psalms, Halakha & Mishnah Study */}
          <div className="bg-[#F8F2E4] border border-[#E8E2D5] p-4 rounded-2xl space-y-5 text-right font-sans" dir="rtl">
            <h3 className="text-xs uppercase text-[#5D6D53] font-bold border-b border-[#E8E2D5] pb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Star className="w-4 h-4 text-[#5D6D53]" />
                {st.studyHeader}
              </span>
              <span className="text-[9.5px] bg-[#5D6D53]/10 text-[#5D6D53] px-2 py-0.5 rounded font-serif tracking-wide font-bold">
                לעילוי נשמה
              </span>
            </h3>

            {/* Tehillim (Psalms) Block */}
            <div className="space-y-2 bg-[#FAF5EC] p-3.5 rounded-xl border border-[#E8E2D5] relative overflow-hidden">
              <div className="flex justify-between items-center border-b border-[#E8E2D5] pb-1.5">
                <span className="text-[#5D6D53] font-bold text-xs flex items-center gap-1.5">
                  📖 {st.psalmTitle}
                </span>
                <span className="text-[10px] text-[#6B5E53] font-medium">
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
                      className="text-sm font-sans font-semibold text-[#3B2F2F] text-center leading-relaxed py-3 bg-[#FFFDF8] px-3 rounded-xl border border-[#D8CFC0] cursor-pointer hover:border-[#5D6D53] hover:bg-[#FAF5EC] transition-all flex flex-col items-center gap-2"
                      dir={lang === 'he' ? 'rtl' : 'ltr'}
                      title={lang === 'he' ? 'לחץ לקריאת הפרק המלא' : lang === 'ru' ? 'Нажмите для чтения всей главы' : 'Click to read full chapter'}
                    >
                      <span>{snippetMainDisplay}</span>
                      <span className="text-[11px] text-[#5D6D53] font-sans font-bold bg-[#5D6D53]/10 px-2.5 py-1 rounded-full border border-[#5D6D53]/25 shadow-xs animate-pulse hover:bg-[#5D6D53]/20 transition-all">
                        {lang === 'he' ? 'לחץ להמשך לקריאת הפרק המלא ➔' : lang === 'ru' ? 'Нажмите для продолжения ➔' : 'Click to continue reading ➔'}
                      </span>
                    </p>

                    {lang !== 'he' && (
                      <div className="pt-1.5 border-t border-[#E8E2D5] text-right" dir="rtl">
                        <span className="text-[9px] text-[#5D6D53] font-bold block mb-0.5">מקור בעברית:</span>
                        <p className="font-serif text-[#3B2F2F] text-xs leading-relaxed">{snippetHeDisplay}</p>
                      </div>
                    )}

                    <div className="text-xs text-[#3B2F2F] space-y-1 leading-relaxed">
                      <div className="pt-1.5 border-t border-[#E8E2D5]">
                        <span className="text-[#5D6D53] font-bold text-[10px] block mb-0.5">{st.significance}</span>
                        <p className="text-[#6B5E53] text-[11px]">{activePsalm.significance[lang]}</p>
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
                  className="flex-1 flex items-center justify-center gap-1.5 bg-[#5D6D53]/10 hover:bg-[#5D6D53]/20 border border-[#5D6D53]/30 text-[#5D6D53] text-[10px] font-bold py-1.5 px-2.5 rounded-lg transition-all cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>{lang === 'he' ? 'קריאת הפרק המלא' : lang === 'ru' ? 'Читать главу полностью' : 'Read Full Chapter'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActivePsalm(getRandomPsalm())}
                  className="bg-[#FAF5EC] hover:bg-[#E8E2D5] border border-[#D8CFC0] text-[#5D6D53] text-[10px] font-bold py-1.5 px-2.5 rounded-lg transition-all cursor-pointer flex items-center justify-center"
                  title={st.nextPsalm}
                >
                  <RefreshCw className="w-3.5 h-3.5 animate-pulse" />
                </button>
              </div>
            </div>

            {/* Halakha Study Block */}
            <div className="space-y-2 bg-[#FAF5EC] p-3.5 rounded-xl border border-[#E8E2D5] relative overflow-hidden">
              <div className="flex justify-between items-center border-b border-[#E8E2D5] pb-1.5">
                <span className="text-[#5D6D53] font-bold text-xs flex items-center gap-1.5">
                  ⚖️ {st.halakhaTitle}
                </span>
                <span className="text-[10px] text-[#6B5E53] font-medium">
                  {activeHalakha.reference[lang]}
                </span>
              </div>
              <p 
                className="text-sm font-sans font-bold text-[#3B2F2F] text-center leading-relaxed py-2 bg-[#FFFDF8] px-2 rounded-xl border border-[#D8CFC0]" 
                dir={lang === 'he' ? 'rtl' : 'ltr'}
              >
                {activeHalakha.text[lang] || activeHalakha.text.he}
              </p>

              {lang !== 'he' && (
                <div className="pt-1.5 border-t border-[#E8E2D5] text-right" dir="rtl">
                  <span className="text-[9px] text-[#5D6D53] font-bold block mb-0.5">מקור בעברית:</span>
                  <p className="font-serif text-[#3B2F2F] text-xs leading-relaxed">{activeHalakha.text.he}</p>
                </div>
              )}

              <div className="text-xs text-[#3B2F2F] space-y-1 leading-relaxed">
                <div className="pt-1.5 border-t border-[#E8E2D5]">
                  <span className="text-[#5D6D53] font-bold text-[10px] block mb-0.5">{st.explanation}</span>
                  <p className="text-[#6B5E53] text-[11px]">{activeHalakha.explanation[lang]}</p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setActiveHalakha(getRandomHalakha())}
                  className="flex-1 bg-[#FAF5EC] hover:bg-[#E8E2D5] border border-[#D8CFC0] text-[#5D6D53] text-[10px] font-bold py-1.5 px-2.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  title={st.nextHalakha}
                >
                  <RefreshCw className="w-3.5 h-3.5 animate-pulse" />
                  <span>{st.nextHalakha}</span>
                </button>
              </div>
            </div>

            {/* Mishnah Study Block */}
            <div className="space-y-2 bg-[#FAF5EC] p-3.5 rounded-xl border border-[#E8E2D5] relative overflow-hidden">
              <div className="flex justify-between items-center border-b border-[#E8E2D5] pb-1.5">
                <span className="text-[#5D6D53] font-bold text-xs flex items-center gap-1.5">
                  📚 {st.mishnahTitle}
                </span>
                <span className="text-[10px] text-[#6B5E53] font-medium">
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
                      className="text-sm font-sans font-semibold text-[#3B2F2F] text-center leading-relaxed py-3 bg-[#FFFDF8] px-3 rounded-xl border border-[#D8CFC0] cursor-pointer hover:border-[#5D6D53] hover:bg-[#FAF5EC] transition-all flex flex-col items-center gap-2" 
                      dir={lang === 'he' ? 'rtl' : 'ltr'}
                      title={lang === 'he' ? 'לחץ לקריאת המשנה המלאה' : lang === 'ru' ? 'Нажмите для чтения всей Мишны' : 'Click to read full Mishnah'}
                    >
                      <span>{snippetMainDisplay}</span>
                      <span className="text-[11px] text-[#5D6D53] font-sans font-bold bg-[#5D6D53]/10 px-2.5 py-1 rounded-full border border-[#5D6D53]/25 shadow-xs animate-pulse hover:bg-[#5D6D53]/20 transition-all">
                        {lang === 'he' ? 'לחץ להמשך לקריאת המשנה המלאה ➔' : lang === 'ru' ? 'Нажмите для продолжения ➔' : 'Click to continue reading ➔'}
                      </span>
                    </p>

                    {lang !== 'he' && (
                      <div className="pt-1.5 border-t border-[#E8E2D5] text-right" dir="rtl">
                        <span className="text-[9px] text-[#5D6D53] font-bold block mb-0.5">מקור בעברית:</span>
                        <p className="font-serif text-[#3B2F2F] text-xs leading-relaxed">{snippetHeDisplay}</p>
                      </div>
                    )}
                  </>
                );
              })()}

              <div className="text-xs text-[#3B2F2F] space-y-1 leading-relaxed">
                <div className="pt-1.5 border-t border-[#E8E2D5]">
                  <span className="text-[#5D6D53] font-bold text-[10px] block mb-0.5">{st.explanation}</span>
                  <p className="text-[#6B5E53] text-[11px]">{activeMishnah.explanation[lang]}</p>
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
                  className="flex-1 flex items-center justify-center gap-1.5 bg-[#5D6D53]/10 hover:bg-[#5D6D53]/20 border border-[#5D6D53]/30 text-[#5D6D53] text-[10px] font-bold py-1.5 px-2.5 rounded-lg transition-all cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>{lang === 'he' ? 'קריאת המשנה המלאה' : lang === 'ru' ? 'Читать Мишну полностью' : 'Read Full Mishnah'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMishnah(getRandomGeneralMishnah())}
                  className="bg-[#FAF5EC] hover:bg-[#E8E2D5] border border-[#D8CFC0] text-[#5D6D53] text-[10px] font-bold py-1.5 px-2.5 rounded-lg transition-all cursor-pointer flex items-center justify-center"
                  title={st.nextMishnah}
                >
                  <RefreshCw className="w-3.5 h-3.5 animate-pulse" />
                </button>
              </div>
            </div>

            {/* Pirkei Avot Study Block (חלון פרקי אבות) */}
            <div className="space-y-2 bg-[#FAF5EC] p-3.5 rounded-xl border border-[#E8E2D5] relative overflow-hidden">
              <div className="flex justify-between items-center border-b border-[#E8E2D5] pb-1.5">
                <span className="text-[#5D6D53] font-bold text-xs flex items-center gap-1.5">
                  👑 {lang === 'he' ? 'פרקי אבות לעילוי נשמה' : lang === 'ru' ? 'Пиркей Авот' : 'Pirkei Avot'}
                </span>
                <span className="text-[10px] text-[#6B5E53] font-medium">
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
                      className="text-sm font-sans font-semibold text-[#3B2F2F] text-center leading-relaxed py-3 bg-[#FFFDF8] px-3 rounded-xl border border-[#D8CFC0] cursor-pointer hover:border-[#5D6D53] hover:bg-[#FAF5EC] transition-all flex flex-col items-center gap-2" 
                      dir={lang === 'he' ? 'rtl' : 'ltr'}
                      title={lang === 'he' ? 'לחץ לקריאת פרקי אבות המלאים' : 'Click to read full Pirkei Avot'}
                    >
                      <span>{snippetMainDisplay}</span>
                      <span className="text-[11px] text-[#5D6D53] font-sans font-bold bg-[#5D6D53]/10 px-2.5 py-1 rounded-full border border-[#5D6D53]/25 shadow-xs animate-pulse hover:bg-[#5D6D53]/20 transition-all">
                        {lang === 'he' ? 'לחץ להמשך לקריאת המשנה מפרקי אבות ➔' : 'Click to continue reading ➔'}
                      </span>
                    </p>

                    {lang !== 'he' && (
                      <div className="pt-1.5 border-t border-[#E8E2D5] text-right" dir="rtl">
                        <span className="text-[9px] text-[#5D6D53] font-bold block mb-0.5">מקור בעברית:</span>
                        <p className="font-serif text-[#3B2F2F] text-xs leading-relaxed">{snippetHeDisplay}</p>
                      </div>
                    )}
                  </>
                );
              })()}

              <div className="text-xs text-[#3B2F2F] space-y-1 leading-relaxed">
                <div className="pt-1.5 border-t border-[#E8E2D5]">
                  <span className="text-[#5D6D53] font-bold text-[10px] block mb-0.5">{st.explanation}</span>
                  <p className="text-[#6B5E53] text-[11px]">{activeAvot.explanation[lang]}</p>
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
                  className="flex-1 flex items-center justify-center gap-1.5 bg-[#5D6D53]/10 hover:bg-[#5D6D53]/20 border border-[#5D6D53]/30 text-[#5D6D53] text-[10px] font-bold py-1.5 px-2.5 rounded-lg transition-all cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>{lang === 'he' ? 'קריאת משנת פרקי אבות המלאה' : 'Read Full Pirkei Avot'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveAvot(getRandomPirkeiAvot())}
                  className="bg-[#FAF5EC] hover:bg-[#E8E2D5] border border-[#D8CFC0] text-[#5D6D53] text-[10px] font-bold py-1.5 px-2.5 rounded-lg transition-all cursor-pointer flex items-center justify-center"
                  title="משנה אקראית נוספת מפרקי אבות"
                >
                  <RefreshCw className="w-3.5 h-3.5 animate-pulse" />
                </button>
              </div>
            </div>

            <p className="text-[9.5px] text-center text-[#6B5E53] italic bg-[#FAF5EC] p-2 rounded-lg leading-normal">
              {st.readSoul}
            </p>
          </div>

          {/* Danger Zone: Delete Confirmation */}
          {showConfirmDelete && (
            <div className="bg-red-50 border border-red-200 p-4 rounded-2xl space-y-3 font-sans animate-fade-in text-center">
              <h4 className="text-sm font-semibold text-red-800">{t.confirmDelete}</h4>
              <p className="text-xs text-red-700">{t.confirmDeleteText}</p>
              <div className="flex justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmDelete(false)}
                  className="bg-[#F8F2E4] hover:bg-[#E8E2D5] text-[#3B2F2F] px-4 py-1.5 rounded-xl text-xs font-semibold border border-[#D8CFC0] transition-all cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-xs"
                >
                  {t.delete}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Actions Footer */}
        {!showConfirmDelete && (
          <div className="bg-[#F8F2E4] border-t border-[#E8E2D5] px-6 py-4 flex gap-3 font-sans">
            <button
              type="button"
              onClick={() => onEdit(deceased)}
              className="flex-1 bg-[#5D6D53] hover:bg-[#4F5D46] text-white py-2 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Edit className="w-4 h-4" />
              <span>{t.edit}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowConfirmDelete(true)}
              className="px-4 py-2 border border-red-300 hover:border-red-500 hover:bg-red-50 text-red-700 rounded-xl text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer"
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