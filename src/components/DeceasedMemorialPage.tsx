/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Deceased, Language } from '../types';
import { translations, formatParentRelation } from '../utils/translations';
import { translateText } from '../utils/transliteration';
import { HEBREW_MONTHS_HE, HEBREW_MONTHS_EN, HEBREW_MONTHS_RU, gimatriya, findYahrzeitGregorianDate, getYahrzeitEveDate, formatYahrzeitDatesWithEve, normalizeMonthName } from '../utils/hebrewDate';
import { getTorahPortionDetails } from '../utils/torahPortionHelper';
import { getRandomMishnah, getRandomPsalm, getRandomHalakha, MishnahRecord, PsalmRecord, HalakhaRecord } from '../utils/memorialStudy';
import { getShortMemorialUrl, openWhatsAppShare, generateWhatsAppShareText } from '../utils/shareUtils';
import { FullReadingModal } from './FullReadingModal';
import { Flame, Globe, BookOpen, Calendar, MessageCircle, RefreshCw, Star, User, Heart, Share2, ArrowLeft, Phone, MapPin, Copy, Check } from 'lucide-react';
import { motion } from 'motion/react';

interface DeceasedMemorialPageProps {
  deceased: Deceased;
  lang: Language;
  onSetLang: (lang: Language) => void;
  onExit: () => void;
}

interface MemorialMessage {
  id: number;
  deceasedId: number;
  visitorName: string;
  message: string;
  timestamp: string;
}

const lT = {
  he: {
    backToSystem: "למערכת ההנצחה הכללית ←",
    candleBoardTitle: "לוח נרות זיכרון ומכתבי תנחומים",
    lightCandleButton: "הדלקת נר ורישום זיכרון בספר הלבבות",
    yourName: "שמך המלא:",
    yourMessage: "מילות זיכרון, תנחומים או ברכה:",
    submitMessage: "הדלק נר והוסף זיכרון למאגר",
    writeSomething: "כתוב משהו לזכרו/ה של הנפטר/ת...",
    sharePage: "שתף דף הנצחה זה בוואטסאפ",
    daysRemaining: "ימים נותרו לאזכרה",
    todayYahrzeit: "היום חל יום האזכרה (היארצייט)! ת.נ.צ.ב.ה",
    yahrzeitTitle: "יום האזכרה השנתי",
    candleCount: "נרות שהודלקו לעילוי נשמתו/ה",
    successAlert: "נר הזיכרון הודלק בהצלחה! מילותיך נשמרו בלוח.",
    loadingMemories: "טוען הודעות זיכרון מהשרת...",
    noMemoriesYet: "עדיין לא נכתבו מכתבי תנחומים. היו הראשונים להדליק נר ולכתוב לזכרו/ה.",
    title: "השבת שקודמת לאזכרה (לעלייה לתורה)",
    selectYear: "בחר שנה:",
    readingCustom: "מנהג קריאה:",
    fallsOn: "השבת חלה ביום:",
    weeklyParsha: "פרשת השבוע / קריאת חג:",
    loading: "מזהה קריאת תורה מ-Hebcal...",
    noData: "לא נמצאו נתוני פרשה",
    explanation: "מידע הלכתי: לעיתים יש פער של שבוע בין קריאת התורה בארץ לבין חוץ לארץ (למשל כאשר שביעי של פסח או שבועות חל ביום שישי). המערכת מחשבת זאת במדויק לפי המנהג שנבחר.",
    studyHeader: "לימוד ותפילה לעילוי נשמה",
    mishnahTitle: "משנה לעילוי נשמת הנפטר/ת",
    psalmTitle: "פרק תהלים לעילוי נשמת הנפטר/ת",
    halakhaTitle: "הלכה לעילוי נשמת הנפטר/ת",
    nextMishnah: "משנה אקראית נוספת",
    nextPsalm: "פרק תהלים אקראי נוסף",
    nextHalakha: "הלכה אקראית נוספת",
    explanationLabel: "ביאור המשנה:",
    significanceLabel: "סגולה ומשמעות:",
    readSoul: "קריאה ולימוד של פסוקים קדושים אלו מוקדשים במיוחד לעילוי נשמתו/ה הטהורה.",
    aliyotIsrael: "עליות לתורה בישראל 🇮🇱",
    aliyotDiaspora: "עליות לתורה בחו\"ל 🌐",
    differencesTitle: "הבדלי קריאה ומנהגים בין הארץ לחו\"ל:",
    contactDetails: "פרטי קשר של משפחת הנפטר/ת:",
    callRelative: "חיוג מהיר לבני המשפחה",
    memorialStory: "סיפור חיים והנצחה",
    passedAway: "נפטר/ה ביום:",
    fatherName: "שם האב:",
    motherName: "שם האם:",
    daysCount: "ספירה לאחור:"
  },
  en: {
    backToSystem: "← To General Memorial Board",
    candleBoardTitle: "Virtual Memorial Candles & Condolences",
    lightCandleButton: "Light a Candle & Write a Message",
    yourName: "Your Full Name:",
    yourMessage: "Your Words of Remembrance:",
    submitMessage: "Light Candle & Save Message",
    writeSomething: "Write something in memory...",
    sharePage: "Share This Memorial Page",
    daysRemaining: "days remaining to Yahrzeit",
    todayYahrzeit: "Today is the Yahrzeit! May their memory be a blessing.",
    yahrzeitTitle: "Annual Yahrzeit Date",
    candleCount: "Candles lit for their soul",
    successAlert: "Memorial candle lit successfully!",
    loadingMemories: "Loading messages...",
    noMemoriesYet: "No memories written yet. Be the first to light a candle.",
    title: "Shabbat Preceding the Yahrzeit",
    selectYear: "Select Year:",
    readingCustom: "Torah Reading:",
    fallsOn: "Shabbat falls on:",
    weeklyParsha: "Portion / Festival reading:",
    loading: "Fetching portion from Hebcal...",
    noData: "No portion data found",
    explanation: "Halachic Note: Sometimes there is a one-week discrepancy between Torah readings in Israel and the Diaspora (e.g., when Pesach or Shavuot ends on Friday). The system calculates this precisely based on the selected custom.",
    studyHeader: "Study & Prayer for the Soul's Elevation",
    mishnahTitle: "Mishnah for the Elevation of the Soul",
    psalmTitle: "Psalm for the Elevation of the Soul",
    halakhaTitle: "Halakha for the Elevation of the Soul",
    nextMishnah: "Next Random Mishnah",
    nextPsalm: "Next Random Psalm",
    nextHalakha: "Next Random Halakha",
    explanationLabel: "Explanation:",
    significanceLabel: "Significance & Merit:",
    readSoul: "The recitation and study of these holy texts are dedicated to the eternal elevation of the departed soul.",
    aliyotIsrael: "Torah Aliyot in Israel 🇮🇱",
    aliyotDiaspora: "Torah Aliyot in Diaspora 🌐",
    differencesTitle: "Torah Reading differences (Israel vs Diaspora):",
    contactDetails: "Family Contact Details:",
    callRelative: "Call Relative",
    memorialStory: "Life Story & Remembrance",
    passedAway: "Passed away on:",
    fatherName: "Father's Name:",
    motherName: "Mother's Name:",
    daysCount: "Countdown:"
  },
  ru: {
    backToSystem: "← В общую систему памяти",
    candleBoardTitle: "Виртуальные Свечи и Слова Соболезнования",
    lightCandleButton: "Зажечь Свечу и Написать Слова Памяти",
    yourName: "Ваше Имя:",
    yourMessage: "Ваши слова памяти или соболезнования:",
    submitMessage: "Зажечь Свечу и Добавить",
    writeSomething: "Напишите воспоминание...",
    sharePage: "Поделиться страницей памяти",
    daysRemaining: "дней осталось до Йарцайта",
    todayYahrzeit: "Сегодня день Йарцайта! Да будет память благословенна.",
    yahrzeitTitle: "Ежегодный день памяти (Йарцайт)",
    candleCount: "Свечей зажжено в память",
    successAlert: "Свеча успешно зажжена!",
    loadingMemories: "Загрузка сообщений...",
    noMemoriesYet: "Воспоминаний пока нет. Будьте первыми, кто зажжет виртуальную свечу.",
    title: "Шаббат перед Йарцайтом",
    selectYear: "Выберите год:",
    readingCustom: "Обычай чтения:",
    fallsOn: "Шаббат выпадает на:",
    weeklyParsha: "Глава Торы / Праздник:",
    loading: "Загрузка главы из Hebcal...",
    noData: "Глава не найдена",
    explanation: "Галахическая справка: Иногда возникает разница в одну неделю в чтении Торы между Израилем и Диаспорой (например, когда Песах или Шавуот заканчивается в пятницу). Система точно рассчитывает это для выбранного обычая.",
    studyHeader: "Изучение и Молитва за душу усопшего",
    mishnahTitle: "Мишна для возвышения души",
    psalmTitle: "Псалом для возвышения души",
    halakhaTitle: "Халаха для возвышения души",
    nextMishnah: "Другая Мишна",
    nextPsalm: "Другой Псалом",
    nextHalakha: "Другая Халаха",
    explanationLabel: "Объяснение Мишны:",
    significanceLabel: "Значение и духовная сила:",
    readSoul: "Изучение этих строк и молитва посвящены вечному возвышению и покою усопшей души.",
    aliyotIsrael: "Алийот в Израиле 🇮🇱",
    aliyotDiaspora: "Алийот в Диаспоре 🌐",
    differencesTitle: "Различия в чтении Торы (Израиль и Диаспора):",
    contactDetails: "Контакты семьи:",
    callRelative: "Быстрый звонок родственнику",
    memorialStory: "История жизни и память",
    passedAway: "Ушел/ла из жизни:",
    fatherName: "Имя отца:",
    motherName: "Имя матери:",
    daysCount: "Обратный отсчет:"
  }
};

export const DeceasedMemorialPage: React.FC<DeceasedMemorialPageProps> = ({ deceased, lang, onSetLang, onExit }) => {
  const t = translations[lang];
  const mt = lT[lang];

  const currentYear = new Date().getFullYear();

  // Find the exact year of the upcoming Yahrzeit to synchronize both components
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

  const [selectedYahrzeitYear, setSelectedYahrzeitYear] = useState<number>(() => new Date().getFullYear());
  const [isIsraelCustom, setIsIsraelCustom] = useState<boolean>(true);
  const [parshaInfo, setParshaInfo] = useState<{ name: string; hebrewName: string; date: Date } | null>(null);
  const [loadingParsha, setLoadingParsha] = useState<boolean>(false);

  useEffect(() => {
    setSelectedYahrzeitYear(new Date().getFullYear());
    setActiveMishnah(getRandomMishnah());
    setActivePsalm(getRandomPsalm());
    setActiveHalakha(getRandomHalakha());
  }, [deceased.id, deceased.day, deceased.month]);

  // Spiritual Study States
  const [activeMishnah, setActiveMishnah] = useState<MishnahRecord>(() => getRandomMishnah());
  const [activePsalm, setActivePsalm] = useState<PsalmRecord>(() => getRandomPsalm());
  const [activeHalakha, setActiveHalakha] = useState<HalakhaRecord>(() => getRandomHalakha());

  // Full Reading States
  const [readingSefariaRef, setReadingSefariaRef] = useState<string | null>(null);
  const [readingTitle, setReadingTitle] = useState<string>('');

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

  const getAgeIfAliveToday = (birthStr: string): number | null => {
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

  // Interactive Memories list
  const [memories, setMemories] = useState<MemorialMessage[]>([]);
  const [loadingMemories, setLoadingMemories] = useState<boolean>(true);
  
  // New memory form
  const [visitorName, setVisitorName] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showForm, setShowForm] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<boolean>(false);

  // Fetch memories for this deceased
  const fetchMemories = async () => {
    // Check if we are running in standalone offline mode with pre-injected data
    if ((window as any).__OFFLINE_MEMORIES_DATA__) {
      const offlineMemories = (window as any).__OFFLINE_MEMORIES_DATA__ as MemorialMessage[];
      let localMemoriesStr = null;
      try {
        localMemoriesStr = localStorage.getItem('eternal_memories');
      } catch (e) {
        console.error("Storage access error:", e);
      }

      let memoriesToUse = offlineMemories;
      if (localMemoriesStr) {
        try {
          memoriesToUse = JSON.parse(localMemoriesStr);
        } catch (e) {}
      } else {
        try {
          localStorage.setItem('eternal_memories', JSON.stringify(offlineMemories));
        } catch (e) {}
      }

      const filtered = memoriesToUse.filter((m: any) => Number(m.deceasedId) === Number(deceased.id));
      filtered.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setMemories(filtered);
      setLoadingMemories(false);
      return;
    }

    try {
      const res = await fetch(`/api/memories?deceasedId=${deceased.id}`);
      if (res.ok) {
        const data = await res.json();
        // Sort descending by timestamp
        data.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setMemories(data);
      }
    } catch (e) {
      console.error("Error fetching memories:", e);
    } finally {
      setLoadingMemories(false);
    }
  };

  useEffect(() => {
    fetchMemories();
  }, [deceased.id]);

  // Handle memory submit
  const handlePostMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitorName.trim() || !message.trim()) return;

    setIsSubmitting(true);

    if ((window as any).__OFFLINE_MEMORIES_DATA__) {
      // Offline mode: save directly to localStorage!
      const newMemory: MemorialMessage = {
        id: Date.now(),
        deceasedId: Number(deceased.id),
        visitorName,
        message,
        timestamp: new Date().toISOString()
      };

      let currentMemories: MemorialMessage[] = [];
      try {
        const localStr = localStorage.getItem('eternal_memories');
        if (localStr) {
          currentMemories = JSON.parse(localStr);
        } else {
          currentMemories = [...((window as any).__OFFLINE_MEMORIES_DATA__ || [])];
        }
      } catch (e) {}

      currentMemories.push(newMemory);

      try {
        localStorage.setItem('eternal_memories', JSON.stringify(currentMemories));
      } catch (e) {}

      setVisitorName('');
      setMessage('');
      setShowForm(false);
      setSuccessMsg(true);
      setTimeout(() => setSuccessMsg(false), 5000);
      
      // Refresh memory list
      const filtered = currentMemories.filter((m: any) => Number(m.deceasedId) === Number(deceased.id));
      filtered.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setMemories(filtered);
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deceasedId: deceased.id,
          visitorName,
          message
        })
      });

      if (res.ok) {
        setVisitorName('');
        setMessage('');
        setShowForm(false);
        setSuccessMsg(true);
        setTimeout(() => setSuccessMsg(false), 5000);
        fetchMemories();
      }
    } catch (e) {
      console.error("Error posting memory:", e);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Preceding Shabbat calculation logic
  const getPrecedingShabbat = (yahrzeitDate: Date): Date => {
    const dayOfWeek = yahrzeitDate.getDay();
    const prevSat = new Date(yahrzeitDate);
    const daysToSubtract = dayOfWeek === 6 ? 7 : dayOfWeek + 1;
    prevSat.setDate(prevSat.getDate() - daysToSubtract);
    return prevSat;
  };

  useEffect(() => {
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
        if (response.ok) {
          const data = await response.json();
          const item = data.items?.find(
            (it: any) => it.category === 'parashat' && it.date === dateStr
          );
          
          if (item) {
            setParshaInfo({
              name: item.title,
              hebrewName: item.hebrew || item.title,
              date: precedingShabbat
            });
          } else {
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
              setParshaInfo(null);
            }
          }
        }
      } catch (err) {
        console.error("Error fetching preceding Torah portion:", err);
        setParshaInfo(null);
      } finally {
        setLoadingParsha(false);
      }
    };

    fetchParsha();
  }, [deceased, selectedYahrzeitYear, isIsraelCustom]);

  const portionDetails = parshaInfo ? getTorahPortionDetails(parshaInfo.hebrewName, parshaInfo.name) : null;

  // Upcoming Yahrzeit countdown calculation
  const getCountdownDays = (): { days: number; isToday: boolean; date: Date | null } => {
    const yahrDate = findYahrzeitGregorianDate(deceased.day, deceased.month, currentYear);
    if (!yahrDate) return { days: 0, isToday: false, date: null };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(yahrDate);
    target.setHours(0, 0, 0, 0);

    let diffTime = target.getTime() - today.getTime();
    if (diffTime < 0) {
      // If already passed this year, calculate for next year
      const nextYahrDate = findYahrzeitGregorianDate(deceased.day, deceased.month, currentYear + 1);
      if (nextYahrDate) {
        const nextTarget = new Date(nextYahrDate);
        nextTarget.setHours(0, 0, 0, 0);
        diffTime = nextTarget.getTime() - today.getTime();
        const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return { days, isToday: false, date: nextTarget };
      }
    } else if (diffTime === 0) {
      return { days: 0, isToday: true, date: target };
    }

    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return { days, isToday: false, date: target };
  };

  const countdown = getCountdownDays();

  // Gregorian date display helper
  const formatGregorianDate = (date: Date | null) => {
    if (!date) return "---";
    return date.toLocaleDateString(lang === 'he' ? 'he-IL' : lang === 'ru' ? 'ru-RU' : 'en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const [copiedLink, setCopiedLink] = useState(false);

  // WhatsApp sharing logic
  const shareMemorialPage = () => {
    const text = generateWhatsAppShareText(deceased, lang);
    openWhatsAppShare(text);
  };

  const copyShortLink = async () => {
    const shortUrl = getShortMemorialUrl(deceased, lang);
    try {
      await navigator.clipboard.writeText(shortUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    } catch (e) {
      console.error("Failed to copy link:", e);
    }
  };

  // Get localized Hebrew month name
  const getLocalizedMonth = () => {
    const normalized = normalizeMonthName(deceased.month);
    const idx = HEBREW_MONTHS_HE.indexOf(normalized);
    if (idx === -1) return deceased.month;
    return lang === 'he' ? HEBREW_MONTHS_HE[idx] : lang === 'en' ? HEBREW_MONTHS_EN[idx] : HEBREW_MONTHS_RU[idx];
  };

  const getLocalizedDay = () => {
    return lang === 'he' ? gimatriya(deceased.day) : deceased.day.toString();
  };

  const isYahrzeitToday = countdown.isToday;
  const isYahrzeitUpcoming = countdown.days > 0 && countdown.days <= 7;
  const heroBorderClass = isYahrzeitToday
    ? 'border-orange-500 bg-orange-950/20 animate-yahrzeit-fire'
    : isYahrzeitUpcoming
      ? 'border-cyan-500/50 bg-purple-950/10 animate-yahrzeit-upcoming'
      : 'border-[#c8a96e]/30 bg-gradient-to-b from-[#161f30]/90 to-[#0e1420]/95';

  return (
    <div className="min-h-screen bg-[#070b12] text-gray-100 py-8 px-4 sm:px-6 lg:px-8 relative overflow-x-hidden font-sans">
      {/* Dynamic background particles */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] bg-amber-500/5 blur-[120px] rounded-full pointer-events-none"></div>

      {/* Floating Header Actions */}
      <div className="max-w-4xl mx-auto flex items-center justify-between mb-8 relative z-10">
        <button
          onClick={onExit}
          className="flex items-center gap-2 text-xs sm:text-sm text-[#c8a96e] bg-[#131a26]/75 border border-[#c8a96e]/20 hover:border-[#c8a96e]/60 hover:bg-[#c8a96e]/10 py-2 px-4 rounded-xl transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 shrink-0" />
          <span>{mt.backToSystem}</span>
        </button>

        {/* Header center logo */}
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-[#c8a96e] animate-pulse" />
          <span className="text-sm font-serif font-semibold tracking-wide text-white uppercase hidden sm:inline">
            לזכר עולמים
          </span>
        </div>

        {/* Global Language Selector */}
        <div className="flex items-center bg-[#131a26]/60 rounded-xl p-1 border border-[#c8a96e]/15 shadow-lg">
          {(['he', 'en', 'ru'] as Language[]).map((l) => (
            <button
              key={l}
              onClick={() => onSetLang(l)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                lang === l
                  ? 'bg-gradient-to-r from-[#c8a96e] to-[#b8952e] text-black shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {l === 'he' ? 'עב' : l === 'en' ? 'EN' : 'РУ'}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto space-y-8 relative z-10">
        
        {/* HERO SECTION - Large Memorial Flame and Name display */}
        <div className={`border-2 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden text-center flex flex-col items-center ${heroBorderClass}`}>
          {/* Decorative corner borders */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-[#c8a96e]/50 rounded-tl-xl pointer-events-none"></div>
          <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-[#c8a96e]/50 rounded-tr-xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-[#c8a96e]/50 rounded-bl-xl pointer-events-none"></div>
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-[#c8a96e]/50 rounded-br-xl pointer-events-none"></div>

          {/* Glowing Animated Candle widget */}
          <div className="mb-6 flex flex-col items-center">
            {/* Realistic Candle Component */}
            <div className="relative w-24 h-36 flex flex-col items-center justify-end">
              {/* Flame */}
              <motion.div 
                className="absolute top-2 w-6 h-10 bg-amber-400 rounded-full blur-[1px] shadow-[0_0_20px_#f59e0b,0_0_35px_#f59e0b] origin-bottom"
                animate={{
                  scaleY: [1, 1.15, 0.95, 1.1, 1],
                  scaleX: [1, 0.9, 1.1, 0.95, 1],
                  rotate: [0, -2, 2, -1, 0],
                  x: [0, -0.5, 0.5, -0.5, 0]
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <div className="absolute bottom-1 left-1.5 w-3 h-5 bg-yellow-100 rounded-full opacity-95 shadow-[0_0_8px_#fff]"></div>
                <div className="absolute bottom-0 left-2.5 w-1.5 h-2.5 bg-blue-500 rounded-full opacity-70"></div>
              </motion.div>
              
              {/* Candle Body */}
              <div className="w-12 h-20 bg-gradient-to-t from-amber-700 via-amber-600 to-amber-500/80 rounded-md shadow-inner relative overflow-hidden border border-amber-500/20">
                {/* Wax drips */}
                <div className="absolute top-0 left-1 w-2.5 h-5 bg-amber-400/50 rounded-full"></div>
                <div className="absolute top-0 left-4 w-1.5 h-8 bg-amber-400/30 rounded-full"></div>
                <div className="absolute top-0 right-2 w-2 h-3.5 bg-amber-400/40 rounded-full"></div>
                {/* Wick */}
                <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-0.5 h-2 bg-gray-900"></div>
              </div>
              
              {/* Pedestal */}
              <div className="w-20 h-2 bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 rounded-full shadow-lg"></div>
            </div>
            <span className="text-[10px] uppercase font-mono tracking-widest text-[#c8a96e] mt-2 block">
              {lang === 'he' ? 'לעילוי נשמה' : lang === 'ru' ? 'За возвышение души' : 'In Loving Memory of'}
            </span>
          </div>

          {/* Profile photo fallback / Uploaded picture */}
          {deceased.image && (
            <div className="mb-6">
              <img
                src={deceased.image}
                alt={deceased.name}
                className="w-32 h-32 rounded-full object-cover border-4 border-[#c8a96e]/40 shadow-xl"
                referrerPolicy="no-referrer"
              />
            </div>
          )}

          {/* Deceased name in Display typography */}
          <h1 className="text-3xl sm:text-5xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#f0d19e] via-[#c8a96e] to-[#f0d19e] mb-3 leading-tight tracking-wide">
            {lang === 'he' ? deceased.name : translateText(deceased.name, lang as 'en' | 'ru')}
          </h1>

          <div className="text-gray-300 font-sans text-sm sm:text-base space-y-1 mb-6 flex flex-col items-center">
            <span className="text-xl sm:text-2xl font-serif font-bold italic text-amber-100 bg-amber-500/5 px-5 py-2 rounded-full border border-amber-500/10 shadow-inner">
              {formatParentRelation(deceased.gender, deceased.fatherName, deceased.motherName, lang)}
            </span>
            <div className="pt-2 text-gray-400 text-xs sm:text-sm flex items-center justify-center gap-1.5">
              <Calendar className="w-4 h-4 text-[#c8a96e]" />
              <span>
                {mt.passedAway} <strong>{lang === 'he' ? `${getLocalizedDay()} ב${getLocalizedMonth()}` : `${getLocalizedDay()} ${getLocalizedMonth()}`}</strong>
              </span>
            </div>

            {/* Custom attributes: Gender, Birth Date, Age at Death, Age Today */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3 max-w-lg">
              {/* Gender */}
              <div className="bg-[#101726]/60 px-3 py-1.5 rounded-lg border border-[#c8a96e]/10 text-xs text-center">
                <span className="text-[#c8a96e] block text-[9px] font-semibold uppercase mb-0.5">
                  {lang === 'he' ? 'מין' : lang === 'ru' ? 'Пол' : 'Gender'}
                </span>
                <span className="text-white font-bold">
                  {deceased.gender === 'male' 
                    ? (lang === 'he' ? 'זכר' : lang === 'ru' ? 'Мужчина' : 'Male')
                    : (lang === 'he' ? 'נקבה' : lang === 'ru' ? 'Женщина' : 'Female')}
                </span>
              </div>

              {/* Age at Death */}
              {deceased.ageAtDeath !== undefined && deceased.ageAtDeath !== null && (
                <div className="bg-[#101726]/60 px-3 py-1.5 rounded-lg border border-[#c8a96e]/10 text-xs text-center">
                  <span className="text-[#c8a96e] block text-[9px] font-semibold uppercase mb-0.5">
                    {lang === 'he' ? 'גיל פטירה' : lang === 'ru' ? 'Возраст смерти' : 'Age at Death'}
                  </span>
                  <span className="text-white font-bold">
                    {deceased.ageAtDeath}
                  </span>
                </div>
              )}

              {/* Birth Date */}
              {deceased.birthDate && (
                <div className="bg-[#101726]/60 px-3 py-1.5 rounded-lg border border-[#c8a96e]/10 text-xs text-center">
                  <span className="text-[#c8a96e] block text-[9px] font-semibold uppercase mb-0.5">
                    {lang === 'he' ? 'תאריך לידה' : lang === 'ru' ? 'Дата рождения' : 'Date of Birth'}
                  </span>
                  <span className="text-white font-bold">
                    {deceased.birthDate}
                  </span>
                </div>
              )}

              {/* Age Today */}
              {deceased.birthDate && (() => {
                const ageToday = getAgeIfAliveToday(deceased.birthDate);
                if (ageToday !== null) {
                  return (
                    <div className="bg-[#c8a96e]/10 px-3 py-1.5 rounded-lg border border-[#c8a96e]/30 text-xs text-center">
                      <span className="text-amber-400 block text-[9px] font-bold uppercase mb-0.5">
                        {lang === 'he' ? 'גיל נוכחי לו היה בחיים' : lang === 'ru' ? 'Был бы жив сегодня' : 'Age if Alive Today'}
                      </span>
                      <span className="text-white font-extrabold">
                        {ageToday} {lang === 'he' ? 'שנים' : lang === 'ru' ? 'лет' : 'years'}
                      </span>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          </div>

          {/* Countdown & Annual Anniversary Banner with Erev Yahrzeit Display */}
          {(() => {
            const targetDate = countdown.date;
            const eveDate = targetDate ? getYahrzeitEveDate(targetDate) : null;
            const eveFormatted = eveDate
              ? `${eveDate.toLocaleDateString(lang === 'he' ? 'he-IL' : lang === 'ru' ? 'ru-RU' : 'en-US', { weekday: 'long' })} בערב, ${eveDate.toLocaleDateString(lang === 'he' ? 'he-IL' : lang === 'ru' ? 'ru-RU' : 'en-US', { day: '2-digit', month: '2-digit', year: 'numeric' })} (בשקיעה)`
              : '';

            return (
              <div className="w-full max-w-md bg-black/50 border border-[#c8a96e]/30 p-5 rounded-2xl flex flex-col items-center space-y-3 shadow-xl text-center">
                <span className="text-xs font-bold text-[#c8a96e] uppercase tracking-wider">{mt.yahrzeitTitle}</span>
                
                {/* Erev Yahrzeit Note */}
                {eveDate && (
                  <div className="w-full bg-amber-950/40 border border-amber-500/30 p-2.5 rounded-xl text-right" dir="rtl">
                    <span className="block text-[10px] text-amber-400 font-bold">
                      {lang === 'he' ? '🕯️ תחילת האזכרה והדלקת נר נשמה (ערב האזכרה):' : '🕯️ Memorial & Candle Lighting Begins (Eve):'}
                    </span>
                    <span className="text-xs font-bold text-amber-100 block mt-0.5">
                      {eveFormatted}
                    </span>
                  </div>
                )}

                {/* Gregorian Day */}
                <div className="w-full bg-red-950/20 border border-red-500/20 p-2.5 rounded-xl text-right" dir="rtl">
                  <span className="block text-[10px] text-red-300 font-bold">
                    {lang === 'he' ? '📅 יום האזכרה בלועזי (במהלך היום):' : '📅 Gregorian Anniversary Day:'}
                  </span>
                  <span className="text-xs font-bold text-white block mt-0.5">
                    {formatGregorianDate(targetDate)}
                  </span>
                </div>

                {/* Countdown counter */}
                {countdown.isToday ? (
                  <span className="text-xs bg-red-950/60 border border-red-500/50 text-red-200 py-1.5 px-5 rounded-full font-bold animate-pulse">
                    {mt.todayYahrzeit}
                  </span>
                ) : (
                  <div className="flex items-center gap-1.5 text-[#c8a96e] font-serif text-lg font-bold pt-1">
                    <span className="text-2xl text-white font-mono">{countdown.days}</span>
                    <span>{mt.daysRemaining}</span>
                  </div>
                )}

                <p className="text-[10px] text-amber-200/80 leading-relaxed pt-1" dir="rtl">
                  {lang === 'he'
                    ? '💡 היות והיום העברי מתחיל בשקיעת החמה, נר הנשמה מודלק והאזכרה מתחילה בערב שלפני.'
                    : '💡 As the Hebrew day begins at sunset, the memorial candle is lit on the preceding evening.'}
                </p>
              </div>
            );
          })()}

          {/* Total candles indicator */}
          <div className="mt-5 text-gray-400 text-xs flex items-center justify-center gap-2">
            <Heart className="w-4 h-4 text-red-500 fill-red-500 animate-pulse" />
            <span>
              {mt.candleCount}: <strong className="text-white text-sm">{memories.length + 5}</strong>
            </span>
          </div>

          {/* Share & Copy Link Buttons */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={shareMemorialPage}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm py-2.5 px-5 rounded-xl shadow transition-all hover:scale-105 cursor-pointer border border-emerald-500/20"
            >
              <Share2 className="w-4 h-4 shrink-0" />
              <span>{mt.sharePage}</span>
            </button>

            <button
              type="button"
              onClick={copyShortLink}
              className={`inline-flex items-center gap-2 font-semibold text-xs sm:text-sm py-2.5 px-4 rounded-xl shadow transition-all cursor-pointer border ${
                copiedLink 
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
                  : 'bg-[#1a2332] hover:bg-[#253247] text-gray-200 border-[#c8a96e]/20'
              }`}
            >
              {copiedLink ? <Check className="w-4 h-4 shrink-0 text-emerald-400" /> : <Copy className="w-4 h-4 shrink-0 text-[#c8a96e]" />}
              <span>{copiedLink ? (lang === 'he' ? 'הקישור הועתק!' : lang === 'ru' ? 'Ссылка скопирована!' : 'Link copied!') : (lang === 'he' ? 'העתק קישור' : lang === 'ru' ? 'Скопировать ссылку' : 'Copy link')}</span>
            </button>
          </div>
        </div>

        {/* TWO COLUMN CONTENT: Shabbat & Torah, Spiritual Study */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Left Column: Torah Portion preceding Yahrzeit (עליה לתורה) */}
          <div className="bg-[#101726]/80 border border-[#c8a96e]/15 p-6 rounded-2xl space-y-4">
            <h2 className="text-lg font-serif font-bold text-[#c8a96e] border-b border-[#c8a96e]/15 pb-2.5 flex items-center gap-2 justify-between">
              <span className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#c8a96e]" />
                {mt.title}
              </span>
              <span className="text-[10px] bg-[#c8a96e]/10 text-[#c8a96e] px-2 py-0.5 rounded">
                {lang === 'he' ? 'עליה לתורה' : lang === 'ru' ? 'Вызов к Торе' : 'Torah Aliyah'}
              </span>
            </h2>

            {/* Config controls */}
            <div className="grid grid-cols-2 gap-3">
              {/* Year Selector */}
              <div className="space-y-1">
                <label className="text-gray-400 block text-[10px]">{mt.selectYear}</label>
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

              {/* Custom Selector */}
              <div className="space-y-1">
                <label className="text-gray-400 block text-[10px]">{mt.readingCustom}</label>
                <div className="flex gap-1.5">
                  <button
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
            <div className="bg-black/30 p-4 rounded-xl border border-[#c8a96e]/5">
              {loadingParsha ? (
                <div className="flex items-center justify-center gap-2 py-6 text-xs text-gray-400">
                  <div className="w-4 h-4 border-2 border-[#c8a96e] border-t-transparent rounded-full animate-spin"></div>
                  <span>{mt.loading}</span>
                </div>
              ) : parshaInfo ? (
                <div className={`space-y-3.5 text-xs ${lang === 'he' ? 'text-right' : 'text-left'}`}>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400">{mt.fallsOn}</span>
                    <span className="text-white font-medium">
                      {formatGregorianDate(parshaInfo.date)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center bg-amber-500/10 p-3 rounded border border-amber-500/25">
                    <span className="text-[#c8a96e] font-bold flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4" />
                      {mt.weeklyParsha}
                    </span>
                    <span className="text-white font-bold text-sm">
                      {lang === 'he' ? parshaInfo.hebrewName : `${parshaInfo.hebrewName} (${parshaInfo.name})`}
                    </span>
                  </div>

                  {/* Torah Aliyot Details */}
                  {portionDetails && (
                    <div className="mt-3 pt-3 border-t border-[#c8a96e]/10 space-y-2 text-xs">
                      <div className={`bg-[#0d0d0d]/40 p-2.5 rounded border border-[#c8a96e]/5 space-y-1 ${lang === 'he' ? 'text-right' : 'text-left'}`} dir={lang === 'he' ? 'rtl' : 'ltr'}>
                        <span className="text-amber-500 font-semibold block text-[10px]">{mt.aliyotIsrael}</span>
                        <p className="text-gray-200 font-medium">{portionDetails.aliyotIsrael[lang]}</p>
                      </div>

                      <div className={`bg-[#0d0d0d]/40 p-2.5 rounded border border-[#c8a96e]/5 space-y-1 ${lang === 'he' ? 'text-right' : 'text-left'}`} dir={lang === 'he' ? 'rtl' : 'ltr'}>
                        <span className="text-blue-400 font-semibold block text-[10px]">{mt.aliyotDiaspora}</span>
                        <p className="text-gray-200 font-medium">{portionDetails.aliyotDiaspora[lang]}</p>
                      </div>

                      <div className={`space-y-1 mt-2 ${lang === 'he' ? 'text-right' : 'text-left'}`} dir={lang === 'he' ? 'rtl' : 'ltr'}>
                        <span className="text-[#c8a96e] font-semibold text-[10px] block">{mt.differencesTitle}</span>
                        <p className="text-gray-300 leading-relaxed text-[11px] bg-black/20 p-2.5 rounded">
                          {portionDetails.differences[lang]}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-xs text-gray-500 py-4">
                  {mt.noData}
                </div>
              )}
            </div>

            {/* Explanation Note */}
            <p className={`text-[10px] text-gray-400 leading-normal bg-black/20 p-2.5 rounded border border-[#c8a96e]/5 flex items-start gap-1.5 ${lang === 'he' ? 'text-right' : 'text-left'}`} dir={lang === 'he' ? 'rtl' : 'ltr'}>
              <span className="inline-block mt-0.5">💡</span>
              <span>{mt.explanation}</span>
            </p>
          </div>

          {/* Right Column: Interactive Spiritual Corner (Mishnah & Psalms) */}
          <div className={`bg-[#2a1d0f]/50 border-2 border-[#c8a96e]/30 p-6 rounded-2xl space-y-5 font-sans ${lang === 'he' ? 'text-right' : 'text-left'}`} dir={lang === 'he' ? 'rtl' : 'ltr'}>
            <h2 className="text-lg font-serif font-bold text-[#c8a96e] border-b border-[#c8a96e]/20 pb-2.5 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Star className="w-5 h-5 text-[#c8a96e]" />
                {mt.studyHeader}
              </span>
              <span className="text-[10px] bg-[#c8a96e]/10 text-[#c8a96e] px-2.5 py-0.5 rounded font-serif">
                {lang === 'he' ? 'לעילוי נשמה' : lang === 'ru' ? 'За душу' : 'For the Soul'}
              </span>
            </h2>

            {/* Mishnah Study Block */}
            <div className="space-y-2 bg-black/40 p-4 rounded-xl border border-[#c8a96e]/10 relative overflow-hidden">
              <div className="flex justify-between items-center border-b border-[#c8a96e]/10 pb-2">
                <span className="text-amber-400 font-bold text-xs flex items-center gap-1.5">
                  📚 {mt.mishnahTitle}
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
                <div className="pt-2 border-t border-[#c8a96e]/5">
                  <span className="text-[#c8a96e] font-bold text-[10px] block mb-0.5">{mt.explanationLabel}</span>
                  <p className="text-gray-300 text-[11px]">{activeMishnah.explanation[lang]}</p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <button
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
                  onClick={() => setActiveMishnah(getRandomMishnah())}
                  className="bg-amber-900/25 hover:bg-amber-900/55 border border-[#c8a96e]/20 text-[#c8a96e] text-[10px] font-bold py-1.5 px-2.5 rounded-md transition-all cursor-pointer flex items-center justify-center"
                  title={mt.nextMishnah}
                >
                  <RefreshCw className="w-3.5 h-3.5 animate-pulse" />
                </button>
              </div>
            </div>

            {/* Tehillim (Psalms) Block */}
            <div className="space-y-2 bg-black/40 p-4 rounded-xl border border-[#c8a96e]/10 relative overflow-hidden">
              <div className="flex justify-between items-center border-b border-[#c8a96e]/10 pb-2">
                <span className="text-[#c8a96e] font-bold text-xs flex items-center gap-1.5">
                  📖 {mt.psalmTitle}
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
                      <div className="pt-2 border-t border-[#c8a96e]/5">
                        <span className="text-[#c8a96e] font-bold text-[10px] block mb-0.5">{mt.significanceLabel}</span>
                        <p className="text-gray-300 text-[11px]">{activePsalm.significance[lang]}</p>
                      </div>
                    </div>
                  </>
                );
              })()}

              <div className="flex gap-2">
                <button
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
                  onClick={() => setActivePsalm(getRandomPsalm())}
                  className="bg-amber-900/25 hover:bg-amber-900/55 border border-[#c8a96e]/20 text-[#c8a96e] text-[10px] font-bold py-1.5 px-2.5 rounded-md transition-all cursor-pointer flex items-center justify-center"
                  title={mt.nextPsalm}
                >
                  <RefreshCw className="w-3.5 h-3.5 animate-pulse" />
                </button>
              </div>
            </div>

            {/* Halakha Study Block */}
            <div className="space-y-2 bg-black/40 p-4 rounded-xl border border-[#c8a96e]/10 relative overflow-hidden">
              <div className="flex justify-between items-center border-b border-[#c8a96e]/10 pb-2">
                <span className="text-[#c8a96e] font-bold text-xs flex items-center gap-1.5">
                  ⚖️ {mt.halakhaTitle}
                </span>
                <span className="text-[10px] text-gray-400 font-medium">
                  {activeHalakha.reference[lang]}
                </span>
              </div>
              <p 
                className="text-sm font-sans font-bold text-white text-center leading-relaxed py-2.5 bg-amber-500/5 px-3 rounded border border-amber-500/10" 
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
                <div className="pt-2 border-t border-[#c8a96e]/5">
                  <span className="text-[#c8a96e] font-bold text-[10px] block mb-0.5">{mt.explanationLabel}</span>
                  <p className="text-gray-300 text-[11px]">{activeHalakha.explanation[lang]}</p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setActiveHalakha(getRandomHalakha())}
                  className="flex-1 bg-amber-900/25 hover:bg-amber-900/55 border border-[#c8a96e]/20 text-[#c8a96e] text-[10px] font-bold py-1.5 px-2.5 rounded-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  title={mt.nextHalakha}
                >
                  <RefreshCw className="w-3.5 h-3.5 animate-pulse" />
                  <span>{mt.nextHalakha}</span>
                </button>
              </div>
            </div>

            <p className="text-[9.5px] text-center text-gray-400 italic bg-black/10 p-2 rounded leading-normal">
              {mt.readSoul}
            </p>
          </div>
        </div>

        {/* Life story and Contact Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Notes / Life Story */}
          <div className={`lg:col-span-2 bg-[#101726]/80 border border-[#c8a96e]/15 p-6 rounded-2xl space-y-3 ${lang === 'he' ? 'text-right' : 'text-left'}`} dir={lang === 'he' ? 'rtl' : 'ltr'}>
            <h3 className="text-sm font-bold text-[#c8a96e] border-b border-[#c8a96e]/10 pb-2 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-[#c8a96e]" />
              {mt.memorialStory}
            </h3>
            <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
              {deceased.notes || (lang === 'he' ? "לא נכתבו פרטים נוספים במאגר." : "No additional biography details provided.")}
            </p>
          </div>

          {/* Contact relative */}
          <div className="bg-[#101726]/80 border border-[#c8a96e]/15 p-6 rounded-2xl space-y-3">
            <h3 className="text-sm font-bold text-[#c8a96e] border-b border-[#c8a96e]/10 pb-2 flex items-center gap-1.5 justify-start text-left">
              <Phone className="w-4 h-4" />
              <span>{lang === 'he' ? 'פרטי קשר למשפחה' : 'Family Contact'}</span>
            </h3>
            {deceased.contactPhone ? (
              <div className="space-y-3 text-left">
                <span className="block text-sm text-gray-300 font-mono font-medium">{deceased.contactPhone}</span>
                <a
                  href={`tel:${deceased.contactPhone}`}
                  className="w-full text-center bg-[#c8a96e]/10 hover:bg-[#c8a96e]/20 text-[#c8a96e] hover:text-white px-4 py-2 rounded-xl text-xs font-semibold border border-[#c8a96e]/20 transition-all block cursor-pointer"
                >
                  {mt.callRelative}
                </a>
              </div>
            ) : (
              <p className="text-xs text-gray-500 italic text-left">
                {lang === 'he' ? 'לא נמסר מספר טלפון לתיאום.' : 'No contact phone provided.'}
              </p>
            )}
          </div>
        </div>

        {/* VIRTUAL WALL OF CANDLES & REMEMBRANCES (The Personal Condolence Board) */}
        <div id="wall-of-memories" className="bg-[#101726]/90 border-2 border-[#c8a96e]/30 rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-[#c8a96e]/15 pb-4">
            <div className="flex items-center gap-2.5">
              <MessageCircle className="w-6 h-6 text-[#c8a96e]" />
              <h2 className="text-xl font-serif font-bold text-[#c8a96e] tracking-wide">
                {mt.candleBoardTitle}
              </h2>
            </div>
            
            {/* Show Form Button */}
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="bg-gradient-to-r from-[#c8a96e] to-[#b8952e] hover:from-[#b8952e] hover:to-[#967420] text-black font-bold text-xs py-2 px-4 rounded-xl shadow transition-all hover:scale-105 cursor-pointer"
              >
                + {lang === 'he' ? 'הדלקת נר והוספת מכתב' : 'Light Candle'}
              </button>
            )}
          </div>

          {/* Success message banner */}
          {successMsg && (
            <div className="bg-emerald-950/30 border border-emerald-500/20 text-emerald-200 p-4 rounded-xl text-xs font-medium text-center">
              🎉 {mt.successAlert}
            </div>
          )}

          {/* Active input form */}
          {showForm && (
            <motion.form 
              initial={{ opacity: 0, y: -10 }} 
              animate={{ opacity: 1, y: 0 }} 
              onSubmit={handlePostMemory}
              className="bg-black/30 border border-[#c8a96e]/20 p-5 rounded-2xl space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={`space-y-1 ${lang === 'he' ? 'text-right' : 'text-left'}`} dir={lang === 'he' ? 'rtl' : 'ltr'}>
                  <label className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold block">{mt.yourName}</label>
                  <input
                    type="text"
                    required
                    value={visitorName}
                    onChange={(e) => setVisitorName(e.target.value)}
                    placeholder={lang === 'he' ? 'הקלד את שמך...' : lang === 'ru' ? 'Введите ваше имя...' : 'Enter your name...'}
                    className="w-full bg-[#0d0d0d]/90 border border-[#c8a96e]/25 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#c8a96e] transition-all font-sans"
                  />
                </div>
              </div>

              <div className={`space-y-1 ${lang === 'he' ? 'text-right' : 'text-left'}`} dir={lang === 'he' ? 'rtl' : 'ltr'}>
                <label className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold block">{mt.yourMessage}</label>
                <textarea
                  required
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={mt.writeSomething}
                  className="w-full bg-[#0d0d0d]/90 border border-[#c8a96e]/25 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#c8a96e] transition-all font-sans"
                />
              </div>

              <div className="flex gap-2.5 justify-end">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="bg-gray-800 hover:bg-gray-700 text-white text-xs py-2 px-4 rounded-xl font-semibold transition-all cursor-pointer"
                >
                  {lang === 'he' ? 'ביטול' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-bold text-xs py-2 px-5 rounded-xl shadow transition-all cursor-pointer flex items-center gap-1"
                >
                  {isSubmitting ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Flame className="w-3.5 h-3.5 text-amber-200" />
                  )}
                  <span>{mt.submitMessage}</span>
                </button>
              </div>
            </motion.form>
          )}

          {/* Messages Feed */}
          {loadingMemories ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-gray-400 text-xs font-sans">
              <div className="w-6 h-6 border-2 border-[#c8a96e] border-t-transparent rounded-full animate-spin"></div>
              <span>{mt.loadingMemories}</span>
            </div>
          ) : memories.length === 0 ? (
            <div className="text-center py-12 text-[#f0f4f8]/50 text-xs max-w-md mx-auto space-y-2">
              <span className="text-3xl block">🕯️</span>
              <p className="font-sans leading-relaxed">{mt.noMemoriesYet}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {memories.map((m) => (
                <div 
                  key={m.id} 
                  className={`bg-[#131d2e]/40 border border-[#c8a96e]/10 p-4 rounded-2xl space-y-2.5 relative hover:border-[#c8a96e]/30 transition-all shadow-inner ${lang === 'he' ? 'text-right' : 'text-left'}`} 
                  dir={lang === 'he' ? 'rtl' : 'ltr'}
                >
                  {/* Glowing small candle decoration */}
                  <div className={`absolute top-3 ${lang === 'he' ? 'left-4' : 'right-4'} flex items-center gap-1 text-[10px] text-amber-400 font-mono`}>
                    <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500/30 animate-pulse" />
                    <span>{lang === 'he' ? 'נר דולק' : lang === 'ru' ? 'Свеча горит' : 'Candle lit'}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#c8a96e]/10 border border-[#c8a96e]/30 flex items-center justify-center text-[#c8a96e]">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white leading-tight">{m.visitorName}</h4>
                      <span className="text-[9px] text-gray-500 font-mono block">
                        {new Date(m.timestamp).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-US')}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-gray-300 leading-relaxed font-sans pt-1 pr-1 italic">
                    "{m.message}"
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

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
