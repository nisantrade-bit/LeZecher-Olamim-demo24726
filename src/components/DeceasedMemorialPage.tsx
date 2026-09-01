/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Deceased, Language } from '../types';
import { translations, formatParentRelation } from '../utils/translations';
import { translateText, getLocalizedName, getLocalizedFatherName, getLocalizedMotherName, getLocalizedNotes } from '../utils/transliteration';
import { HEBREW_MONTHS_HE, HEBREW_MONTHS_EN, HEBREW_MONTHS_RU, gimatriya, findYahrzeitGregorianDate, getYahrzeitEveDate, formatYahrzeitDatesWithEve, normalizeMonthName } from '../utils/hebrewDate';
import { getTorahPortionDetails, getShabbatYahrzeitInfo } from '../utils/torahPortionHelper';
import { ShabbatYahrzeitBanner } from './ShabbatYahrzeitBanner';
import { getRandomMishnah, getRandomPsalm, getRandomHalakha, MishnahRecord, PsalmRecord, HalakhaRecord } from '../utils/memorialStudy';
import { getShortMemorialUrl, openWhatsAppShare, generateWhatsAppShareText, shareMemorialCard } from '../utils/shareUtils';
import { FullReadingModal } from './FullReadingModal';
import { DeceasedPhotoFrame, getDeceasedPhoto } from './YahrzeitCandle';
import { Flame, Globe, BookOpen, Calendar, MessageCircle, RefreshCw, Star, User, Heart, Share2, ArrowLeft, Phone, MapPin, Copy, Check } from 'lucide-react';
import { motion } from 'framer-motion';

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
  if (!deceased || !deceased.name || deceased.name.trim() === '' || deceased.name === 'undefined') {
    return (
      <div className="min-h-screen bg-[#070b12] text-gray-100 flex flex-col items-center justify-center font-sans gap-4 p-4 text-center">
        <div className="bg-[#131a26] border border-amber-500/40 rounded-2xl p-8 max-w-md w-full shadow-2xl space-y-4">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400 text-xl font-bold">
            !
          </div>
          <h2 className="text-xl font-serif font-bold text-amber-400">
            {lang === 'he' ? 'הכרטיס המבוקש לא נמצא במערכת' : lang === 'ru' ? 'Запрошенная карточка не найдена в системе' : 'The requested card was not found in the system'}
          </h2>
          <p className="text-xs text-gray-300 leading-relaxed">
            {lang === 'he' ? 'כרטיס זיכרון זה נמחק, אינו קיים במאגר או שהקישור שהוזן אינו תקין.' : 'This card was deleted, does not exist in the database, or the link is invalid.'}
          </p>
          <button
            onClick={onExit}
            className="w-full py-3 bg-[#c8a96e] hover:bg-[#b8952e] text-black text-xs font-bold rounded-xl transition-all shadow-lg cursor-pointer"
          >
            {lang === 'he' ? 'חזרה למערכת ההנצחה הכללית ←' : 'Return to main memorial system ←'}
          </button>
        </div>
      </div>
    );
  }

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
  const [hebcalItems, setHebcalItems] = useState<any[]>([]);
  const [yahrzeitGregDate, setYahrzeitGregDate] = useState<Date | null>(null);

  useEffect(() => {
    setSelectedYahrzeitYear(new Date().getFullYear());
    setActiveMishnah(getRandomMishnah());
    setActivePsalm(getRandomPsalm());
    setActiveHalakha(getRandomHalakha());

    try {
      const localizedName = getLocalizedName(deceased, lang);
      const localizedFather = getLocalizedFatherName(deceased, lang);
      const localizedMother = getLocalizedMotherName(deceased, lang);
      const parentRel = formatParentRelation(deceased.gender, localizedFather, localizedMother, lang, deceased);
      const nameWithParent = parentRel 
        ? `${localizedName} ${parentRel}`
        : localizedName;

      const title = lang === 'he' 
        ? `לזכר עולמים - עמוד זיכרון לעילוי נשמת ${nameWithParent}` 
        : lang === 'ru' 
        ? `Ле-Зехер Оламим - Страница памяти ${nameWithParent}` 
        : `L'Zecher Olamim - Memorial Page for ${nameWithParent}`;
      document.title = title;
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) ogTitle.setAttribute('content', title);
      const ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc) {
        const desc = lang === 'he'
          ? `נר נשמה דולק לעילוי נשמת ${nameWithParent} ז״ל | השתתפות בהנצחה, תהילים ומשנה`
          : lang === 'ru'
          ? `Свеча памяти горит в честь ${nameWithParent} | Память, Псалмы и Мишна`
          : `Memorial candle lit in memory of ${nameWithParent} | Remembrance, Psalms and Mishnah`;
        ogDesc.setAttribute('content', desc);
      }
      const ogImg = document.querySelector('meta[property="og:image"]');
      const photo = getDeceasedPhoto(deceased);
      if (ogImg && photo) ogImg.setAttribute('content', photo);
    } catch (e) {}
  }, [deceased.id, deceased.day, deceased.month, deceased.name, deceased.image, deceased.imageUrl, deceased.photoUrl, lang]);

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

  useEffect(() => {
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
        if (response.ok) {
          const data = await response.json();
          setHebcalItems(data.items || []);
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

  // WhatsApp sharing logic
  const shareMemorialPage = () => {
    const shabbatInfo = yahrzeitGregDate ? getShabbatYahrzeitInfo(yahrzeitGregDate, hebcalItems, lang) : null;
    shareMemorialCard(deceased, lang, shabbatInfo);
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

  return (
    <div className="min-h-screen bg-[#E7E0D2] text-[#3B2F2F] py-6 sm:py-10 px-3 sm:px-6 lg:px-8 relative overflow-x-hidden font-sans selection:bg-[#F8F2E4] selection:text-[#3B2F2F]">
      {/* Subtle background texture effect */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,253,248,0.5)_0%,transparent_75%)] pointer-events-none z-0"></div>

      {/* Floating Header Navigation */}
      <div className="max-w-4xl mx-auto flex items-center justify-between mb-6 relative z-10">
        <button
          onClick={onExit}
          className="flex items-center gap-2 text-xs sm:text-sm font-medium text-[#3B2F2F] bg-[#FFFDF8] border border-[#D8CFC0] hover:bg-[#F8F2E4] py-2 px-4 rounded-xl transition-all cursor-pointer shadow-xs"
        >
          <ArrowLeft className="w-4 h-4 shrink-0 text-[#5D6D53]" />
          <span>{mt.backToSystem}</span>
        </button>

        {/* Header center title */}
        <div className="flex items-center gap-2">
          <Flame className="w-4.5 h-4.5 text-[#D4AF37] animate-pulse" />
          <span className="text-sm sm:text-base font-serif font-bold tracking-wide text-[#3B2F2F] uppercase hidden sm:inline">
            {lang === 'he' ? 'לזכר עולמים — ספר הזיכרון' : lang === 'ru' ? 'Ле-Зехер Оламим — Книга Памяти' : 'L\'Zecher Olamim — Memorial Book'}
          </span>
        </div>

        {/* Global Language Selector */}
        <div className="flex items-center bg-[#FFFDF8] rounded-xl p-1 border border-[#D8CFC0] shadow-xs">
          {(['he', 'en', 'ru'] as Language[]).map((l) => (
            <button
              key={l}
              onClick={() => onSetLang(l)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                lang === l
                  ? 'bg-[#5D6D53] text-white shadow-xs font-bold'
                  : 'text-[#6B5E53] hover:text-[#3B2F2F]'
              }`}
            >
              {l === 'he' ? 'עב' : l === 'en' ? 'EN' : 'РУ'}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 relative z-10">
        
        {/* HERO SECTION - The Core Memorial Card ("ספר זיכרון דיגיטלי") */}
        <div className="bg-[#FFFDF8] border border-[#D8CFC0] rounded-3xl p-6 sm:p-10 shadow-md shadow-stone-400/20 relative overflow-hidden text-center flex flex-col items-center">
          
          {/* Corner borders */}
          <div className="absolute top-0 left-0 w-10 h-10 border-t border-l border-[#5D6D53]/30 rounded-tl-2xl pointer-events-none"></div>
          <div className="absolute top-0 right-0 w-10 h-10 border-t border-r border-[#5D6D53]/30 rounded-tr-2xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-10 h-10 border-b border-l border-[#5D6D53]/30 rounded-bl-2xl pointer-events-none"></div>
          <div className="absolute bottom-0 right-0 w-10 h-10 border-b border-r border-[#5D6D53]/30 rounded-br-2xl pointer-events-none"></div>

          {/* Hero Display: Framed Photo with Memorial Candle Beside It */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10 mb-6 relative z-10">
            {/* Deceased Portrait in Clean Memorial Paper Frame */}
            <DeceasedPhotoFrame deceased={deceased} size="hero" lang={lang} className="shadow-md border-[#D8CFC0]" />

            {/* Quiet Candle Burning Beside Portrait */}
            <div className="flex flex-col items-center justify-center shrink-0">
              <div className="relative w-24 h-28 flex flex-col items-center justify-center">
                <div className="absolute inset-0 bg-amber-400/10 rounded-full blur-xl animate-pulse"></div>
                
                <motion.div 
                  className="relative w-10 h-16 bg-gradient-to-t from-amber-600 via-amber-400 to-yellow-100 rounded-full blur-[0.3px] shadow-[0_0_18px_#f59e0b] origin-bottom z-10"
                  animate={{
                    scaleY: [1, 1.15, 0.92, 1.1, 1],
                    scaleX: [1, 0.88, 1.12, 0.92, 1],
                    rotate: [0, -2.5, 2.5, -1, 0],
                    x: [0, -0.5, 0.5, -0.5, 0]
                  }}
                  transition={{
                    duration: 1.4,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  <div className="absolute bottom-1 left-2 w-5 h-8 bg-white rounded-full opacity-95 shadow-xs"></div>
                  <div className="absolute bottom-0 left-3 w-2.5 h-4 bg-blue-500 rounded-full opacity-80"></div>
                </motion.div>
                
                <div className="w-10 h-2 bg-gradient-to-r from-amber-800 via-amber-700 to-amber-800 rounded-full shadow-xs mt-1 border border-amber-600/30"></div>
              </div>
              <span className="text-xs font-serif font-bold text-[#5D6D53] mt-1 block">
                {lang === 'he' ? '🔥 נר נשמה דולק' : lang === 'ru' ? '🔥 Свеча памяти горит' : '🔥 Memorial Candle Lit'}
              </span>
            </div>
          </div>

          {/* Deceased Name in Dignified Display Serif Typography */}
          <h1 className="text-3xl sm:text-5xl font-serif font-bold text-[#3B2F2F] mb-2 leading-tight tracking-tight">
            {getLocalizedName(deceased, lang)}
          </h1>

          <div className="text-[#6B5E53] font-sans text-sm sm:text-base space-y-2 mb-6 flex flex-col items-center">
            <span className="text-xl sm:text-2xl font-serif font-bold italic text-[#5D6D53] bg-[#F8F2E4] px-5 py-1.5 rounded-full border border-[#E8E2D5]">
              {formatParentRelation(deceased.gender, deceased.fatherName, deceased.motherName, lang, deceased)}
            </span>
            
            <div className="pt-2 text-[#3B2F2F] text-sm sm:text-base flex items-center justify-center gap-1.5 font-medium">
              <Calendar className="w-4 h-4 text-[#5D6D53]" />
              <span>
                {mt.passedAway} <strong className="text-[#3B2F2F] font-serif font-bold text-base sm:text-lg">{lang === 'he' ? `${getLocalizedDay()} ב${getLocalizedMonth()}` : `${getLocalizedDay()} ${getLocalizedMonth()}`}</strong>
              </span>
            </div>

            {/* Custom attributes: Gender, Birth Date, Age at Death, Age Today */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5 max-w-lg">
              <div className="bg-[#F8F2E4] px-3 py-1.5 rounded-xl border border-[#E8E2D5] text-xs text-center">
                <span className="text-[#5D6D53] block text-[9px] font-bold uppercase mb-0.5">
                  {lang === 'he' ? 'מין' : lang === 'ru' ? 'Пол' : 'Gender'}
                </span>
                <span className="text-[#3B2F2F] font-bold">
                  {deceased.gender === 'male' 
                    ? (lang === 'he' ? 'זכר' : lang === 'ru' ? 'Мужчина' : 'Male')
                    : (lang === 'he' ? 'נקבה' : lang === 'ru' ? 'Женщина' : 'Female')}
                </span>
              </div>

              {deceased.ageAtDeath !== undefined && deceased.ageAtDeath !== null && (
                <div className="bg-[#F8F2E4] px-3 py-1.5 rounded-xl border border-[#E8E2D5] text-xs text-center">
                  <span className="text-[#5D6D53] block text-[9px] font-bold uppercase mb-0.5">
                    {lang === 'he' ? 'גיל פטירה' : lang === 'ru' ? 'Возраст смерти' : 'Age at Death'}
                  </span>
                  <span className="text-[#3B2F2F] font-bold">
                    {deceased.ageAtDeath}
                  </span>
                </div>
              )}

              {deceased.birthDate && (
                <div className="bg-[#F8F2E4] px-3 py-1.5 rounded-xl border border-[#E8E2D5] text-xs text-center">
                  <span className="text-[#5D6D53] block text-[9px] font-bold uppercase mb-0.5">
                    {lang === 'he' ? 'תאריך לידה' : lang === 'ru' ? 'Дата рождения' : 'Date of Birth'}
                  </span>
                  <span className="text-[#3B2F2F] font-bold">
                    {deceased.birthDate}
                  </span>
                </div>
              )}

              {deceased.birthDate && (() => {
                const ageToday = getAgeIfAliveToday(deceased.birthDate);
                if (ageToday !== null) {
                  return (
                    <div className="bg-[#F8F2E4] px-3 py-1.5 rounded-xl border border-[#5D6D53]/30 text-xs text-center">
                      <span className="text-[#5D6D53] block text-[9px] font-bold uppercase mb-0.5">
                        {lang === 'he' ? 'גיל נוכחי לו היה בחיים' : lang === 'ru' ? 'Был бы жив сегодня' : 'Age if Alive Today'}
                      </span>
                      <span className="text-[#3B2F2F] font-extrabold">
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
              ? (lang === 'he'
                  ? `${eveDate.toLocaleDateString('he-IL', { weekday: 'long' })} בערב, ${eveDate.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' })} (בשקיעה)`
                  : lang === 'ru'
                  ? `${eveDate.toLocaleDateString('ru-RU', { weekday: 'long' })} вечером, ${eveDate.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })} (на закате)`
                  : `${eveDate.toLocaleDateString('en-US', { weekday: 'long' })} evening, ${eveDate.toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' })} (at sunset)`)
              : '';

            return (
              <div className="w-full max-w-md bg-[#F8F2E4] border border-[#E8E2D5] p-4 sm:p-5 rounded-2xl flex flex-col items-center space-y-3 shadow-xs text-center">
                <span className="text-xs font-serif font-bold text-[#5D6D53] uppercase tracking-wider">{mt.yahrzeitTitle}</span>
                
                {eveDate && (
                  <div className="w-full bg-[#FAF5EC] border border-[#E8E2D5] p-2.5 rounded-xl text-right" dir={lang === 'he' ? 'rtl' : 'ltr'}>
                    <span className="block text-[11px] text-[#5D6D53] font-bold">
                      {lang === 'he' ? '🕯️ תחילת האזכרה והדלקת נר נשמה (ערב האזכרה):' : lang === 'ru' ? '🕯️ Начало поминания и зажигание свечи (накануне):' : '🕯️ Memorial & Candle Lighting Begins (Eve):'}
                    </span>
                    <span className="text-xs font-bold text-[#3B2F2F] block mt-0.5">
                      {eveFormatted}
                    </span>
                  </div>
                )}

                <div className={`w-full bg-[#FAF5EC] border border-[#E8E2D5] p-2.5 rounded-xl ${lang === 'he' ? 'text-right' : 'text-left'}`} dir={lang === 'he' ? 'rtl' : 'ltr'}>
                  <span className="block text-[11px] text-[#6B5E53] font-bold">
                    {lang === 'he' ? '📅 יום האזכרה בלועזי (במהלך היום):' : lang === 'ru' ? '📅 День поминания по григорианскому календарю:' : '📅 Gregorian Anniversary Day:'}
                  </span>
                  <span className="text-xs font-bold text-[#3B2F2F] block mt-0.5">
                    {formatGregorianDate(targetDate)}
                  </span>
                </div>

                {countdown.isToday ? (
                  <span className="text-xs bg-[#5D6D53] text-white py-1.5 px-5 rounded-full font-bold animate-pulse">
                    {mt.todayYahrzeit}
                  </span>
                ) : (
                  <div className="flex items-center gap-1.5 text-[#5D6D53] font-serif text-lg font-bold pt-1">
                    <span className="text-2xl text-[#3B2F2F] font-mono">{countdown.days}</span>
                    <span>{mt.daysRemaining}</span>
                  </div>
                )}

                <p className="text-[10.5px] text-[#6B5E53] leading-relaxed pt-1" dir={lang === 'he' ? 'rtl' : 'ltr'}>
                  {lang === 'he'
                    ? '💡 היות והיום העברי מתחיל בשקיעת החמה, נר הנשמה מודלק והאזכרה מתחילה בערב שלפני.'
                    : lang === 'ru'
                    ? '💡 Поскольку еврейский день начинается на закате, свеча памяти зажигается накануне вечером.'
                    : '💡 As the Hebrew day begins at sunset, the memorial candle is lit on the preceding evening.'}
                </p>
              </div>
            );
          })()}

          {/* Total candles indicator */}
          <div className="mt-4 text-[#6B5E53] text-xs flex items-center justify-center gap-2 font-medium">
            <Heart className="w-4 h-4 text-rose-600 fill-rose-600 animate-pulse" />
            <span>
              {mt.candleCount}: <strong className="text-[#3B2F2F] text-sm font-bold">{memories.length + 5}</strong>
            </span>
          </div>

          {/* WhatsApp Share Button */}
          <div className="mt-5 flex items-center justify-center">
            <button
              type="button"
              onClick={shareMemorialPage}
              className="inline-flex items-center gap-2.5 bg-[#5D6D53] hover:bg-[#4F5D46] text-white font-bold text-xs sm:text-sm py-2.5 px-6 rounded-xl shadow-xs transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <MessageCircle className="w-4.5 h-4.5 shrink-0" />
              <span>{mt.sharePage}</span>
            </button>
          </div>
        </div>

        {/* TWO COLUMN CONTENT: Shabbat & Torah, Spiritual Study */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          
          {/* Left Column: Torah Portion preceding Yahrzeit (עליה לתורה) */}
          <div className="bg-[#FFFDF8] border border-[#D8CFC0] p-6 rounded-3xl space-y-4 shadow-sm">
            <h2 className="text-lg font-serif font-bold text-[#3B2F2F] border-b border-[#E8E2D5] pb-2.5 flex items-center gap-2 justify-between">
              <span className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#5D6D53]" />
                {mt.title}
              </span>
              <span className="text-[10px] bg-[#F8F2E4] text-[#5D6D53] px-2 py-0.5 rounded font-serif font-bold border border-[#E8E2D5]">
                {lang === 'he' ? 'עליה לתורה' : lang === 'ru' ? 'Вызов к Торе' : 'Torah Aliyah'}
              </span>
            </h2>

            {/* Config controls */}
            <div className="grid grid-cols-2 gap-3">
              {/* Year Selector */}
              <div className="space-y-1">
                <label className="text-[#6B5E53] block text-[10px] font-semibold">{mt.selectYear}</label>
                <select
                  value={selectedYahrzeitYear}
                  onChange={(e) => setSelectedYahrzeitYear(Number(e.target.value))}
                  className="w-full py-1.5 px-2 bg-[#F8F2E4] text-[#3B2F2F] font-sans font-semibold border border-[#E8E2D5] rounded-lg outline-none cursor-pointer focus:border-[#5D6D53]"
                >
                  {Array.from({ length: 200 }, (_, i) => currentYear + i).map((yr) => (
                    <option key={yr} value={yr} className="bg-[#FFFDF8] text-[#3B2F2F]">
                      {yr}
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom Selector */}
              <div className="space-y-1">
                <label className="text-[#6B5E53] block text-[10px] font-semibold">{mt.readingCustom}</label>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setIsIsraelCustom(true)}
                    className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-semibold border text-center transition-all cursor-pointer ${
                      isIsraelCustom
                        ? 'bg-[#5D6D53] text-white border-[#5D6D53]'
                        : 'bg-[#F8F2E4] text-[#6B5E53] border-[#E8E2D5] hover:text-[#3B2F2F]'
                    }`}
                  >
                    {lang === 'he' ? 'ארץ ישראל 🇮🇱' : lang === 'ru' ? 'Израиль 🇮🇱' : 'Israel 🇮🇱'}
                  </button>
                  <button
                    onClick={() => setIsIsraelCustom(false)}
                    className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-semibold border text-center transition-all cursor-pointer ${
                      !isIsraelCustom
                        ? 'bg-[#5D6D53] text-white border-[#5D6D53]'
                        : 'bg-[#F8F2E4] text-[#6B5E53] border-[#E8E2D5] hover:text-[#3B2F2F]'
                    }`}
                  >
                    {lang === 'he' ? 'חו"ל 🌐' : lang === 'ru' ? 'Диаспора 🌐' : 'Diaspora 🌐'}
                  </button>
                </div>
              </div>
            </div>

            {/* Parasha content / loader */}
            <div className="bg-[#F8F2E4] p-4 rounded-2xl border border-[#E8E2D5]">
              {loadingParsha ? (
                <div className="flex items-center justify-center gap-2 py-6 text-xs text-[#6B5E53]">
                  <div className="w-4 h-4 border-2 border-[#5D6D53] border-t-transparent rounded-full animate-spin"></div>
                  <span>{mt.loading}</span>
                </div>
              ) : parshaInfo ? (
                <div className={`space-y-3.5 text-xs ${lang === 'he' ? 'text-right' : 'text-left'}`}>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[#6B5E53]">{mt.fallsOn}</span>
                    <span className="text-[#3B2F2F] font-semibold">
                      {formatGregorianDate(parshaInfo.date)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center bg-[#FAF5EC] p-3 rounded-xl border border-[#E8E2D5]">
                    <span className="text-[#5D6D53] font-bold flex items-center gap-1.5 font-serif">
                      <BookOpen className="w-4 h-4" />
                      {mt.weeklyParsha}
                    </span>
                    <span className="text-[#3B2F2F] font-serif font-bold text-sm sm:text-base">
                      {lang === 'he' ? parshaInfo.hebrewName : `${parshaInfo.hebrewName} (${parshaInfo.name})`}
                    </span>
                  </div>

                  {/* Torah Aliyot Details */}
                  {portionDetails && (
                    <div className="mt-3 pt-3 border-t border-[#E8E2D5] space-y-2 text-xs">
                      <div className={`bg-[#FAF5EC] p-2.5 rounded-lg border border-[#E8E2D5] space-y-1 ${lang === 'he' ? 'text-right' : 'text-left'}`} dir={lang === 'he' ? 'rtl' : 'ltr'}>
                        <span className="text-[#5D6D53] font-bold block text-[10px]">{mt.aliyotIsrael}</span>
                        <p className="text-[#3B2F2F] font-medium">{portionDetails.aliyotIsrael[lang]}</p>
                      </div>

                      <div className={`bg-[#FAF5EC] p-2.5 rounded-lg border border-[#E8E2D5] space-y-1 ${lang === 'he' ? 'text-right' : 'text-left'}`} dir={lang === 'he' ? 'rtl' : 'ltr'}>
                        <span className="text-[#6B5E53] font-bold block text-[10px]">{mt.aliyotDiaspora}</span>
                        <p className="text-[#3B2F2F] font-medium">{portionDetails.aliyotDiaspora[lang]}</p>
                      </div>

                      <div className={`space-y-1 mt-2 ${lang === 'he' ? 'text-right' : 'text-left'}`} dir={lang === 'he' ? 'rtl' : 'ltr'}>
                        <span className="text-[#5D6D53] font-serif font-bold text-[10px] block">{mt.differencesTitle}</span>
                        <p className="text-[#6B5E53] leading-relaxed text-[11px] bg-[#FAF5EC] p-2.5 rounded-lg border border-[#E8E2D5]">
                          {portionDetails.differences[lang]}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-xs text-[#6B5E53] py-4">
                  {mt.noData}
                </div>
              )}
            </div>

            {/* Explanation Note */}
            <p className={`text-[10.5px] text-[#6B5E53] leading-normal bg-[#F8F2E4] p-2.5 rounded-xl border border-[#E8E2D5] flex items-start gap-1.5 ${lang === 'he' ? 'text-right' : 'text-left'}`} dir={lang === 'he' ? 'rtl' : 'ltr'}>
              <span className="inline-block mt-0.5">💡</span>
              <span>{mt.explanation}</span>
            </p>

            {yahrzeitGregDate && (
              <ShabbatYahrzeitBanner eventDate={yahrzeitGregDate} yahrzeitDate={yahrzeitGregDate} lang={lang} />
            )}
          </div>

          {/* Right Column: Spiritual Corner (Mishnah & Psalms) */}
          <div className={`bg-[#FFFDF8] border border-[#D8CFC0] p-6 rounded-3xl space-y-5 shadow-sm font-sans ${lang === 'he' ? 'text-right' : 'text-left'}`} dir={lang === 'he' ? 'rtl' : 'ltr'}>
            <h2 className="text-lg font-serif font-bold text-[#3B2F2F] border-b border-[#E8E2D5] pb-2.5 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Star className="w-5 h-5 text-[#5D6D53]" />
                {mt.studyHeader}
              </span>
              <span className="text-[10px] bg-[#F8F2E4] text-[#5D6D53] px-2.5 py-0.5 rounded-full font-serif font-bold border border-[#E8E2D5]">
                {lang === 'he' ? 'לעילוי נשמה' : lang === 'ru' ? 'За душу' : 'For the Soul'}
              </span>
            </h2>

            {/* Mishnah Study Block */}
            <div className="space-y-2 bg-[#F8F2E4] p-4 rounded-2xl border border-[#E8E2D5] relative overflow-hidden">
              <div className="flex justify-between items-center border-b border-[#E8E2D5] pb-2">
                <span className="text-[#3B2F2F] font-serif font-bold text-xs flex items-center gap-1.5">
                  📚 {mt.mishnahTitle}
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
                      className="text-sm font-serif font-medium text-[#3B2F2F] text-center leading-relaxed py-3 bg-[#FAF5EC] px-3 rounded-xl border border-[#E8E2D5] cursor-pointer hover:border-[#5D6D53] hover:bg-[#F8F2E4] transition-all flex flex-col items-center gap-2"
                      dir={lang === 'he' ? 'rtl' : 'ltr'}
                      title={lang === 'he' ? 'לחץ לקריאת המשנה המלאה' : lang === 'ru' ? 'Нажмите для чтения всей Мишны' : 'Click to read full Mishnah'}
                    >
                      <span>{snippetMainDisplay}</span>
                      <span className="text-[11px] text-[#5D6D53] font-sans font-bold bg-[#F8F2E4] px-3 py-1 rounded-full border border-[#E8E2D5] shadow-2xs hover:bg-[#E8E2D5] transition-all">
                        {lang === 'he' ? 'לחץ להמשך לקריאת המשנה המלאה ➔' : lang === 'ru' ? 'Нажмите для продолжения ➔' : 'Click to continue reading ➔'}
                      </span>
                    </p>

                    {lang !== 'he' && (
                      <div className="pt-1.5 border-t border-[#E8E2D5] text-right" dir="rtl">
                        <span className="text-[9px] text-[#5D6D53] font-bold block mb-0.5">
                          {lang === 'ru' ? 'Оригинал на иврите:' : 'Hebrew Original:'}
                        </span>
                        <p className="font-serif text-[#3B2F2F] text-xs leading-relaxed">{snippetHeDisplay}</p>
                      </div>
                    )}
                  </>
                );
              })()}

              <div className="text-xs text-[#6B5E53] space-y-1 leading-relaxed">
                <div className="pt-2 border-t border-[#E8E2D5]">
                  <span className="text-[#5D6D53] font-bold text-[10px] block mb-0.5">{mt.explanationLabel}</span>
                  <p className="text-[#6B5E53] text-[11px]">{activeMishnah.explanation[lang]}</p>
                </div>
              </div>
              
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => {
                    const ref = getMishnahSefariaRef(activeMishnah);
                    setReadingSefariaRef(ref);
                    setReadingTitle(activeMishnah.reference[lang]);
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-[#5D6D53] hover:bg-[#4F5D46] text-white text-[10px] font-bold py-2 px-2.5 rounded-lg transition-all cursor-pointer shadow-xs"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>{lang === 'he' ? 'קריאת המשנה המלאה' : lang === 'ru' ? 'Читать Мишну полностью' : 'Read Full Mishnah'}</span>
                </button>
                <button
                  onClick={() => setActiveMishnah(getRandomMishnah())}
                  className="bg-[#FAF5EC] hover:bg-[#E8E2D5] border border-[#E8E2D5] text-[#3B2F2F] text-[10px] font-bold py-2 px-2.5 rounded-lg transition-all cursor-pointer flex items-center justify-center"
                  title={mt.nextMishnah}
                >
                  <RefreshCw className="w-3.5 h-3.5 text-[#5D6D53]" />
                </button>
              </div>
            </div>

            {/* Tehillim (Psalms) Block */}
            <div className="space-y-2 bg-[#F8F2E4] p-4 rounded-2xl border border-[#E8E2D5] relative overflow-hidden">
              <div className="flex justify-between items-center border-b border-[#E8E2D5] pb-2">
                <span className="text-[#3B2F2F] font-serif font-bold text-xs flex items-center gap-1.5">
                  📖 {mt.psalmTitle}
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
                      className="text-sm font-serif font-medium text-[#3B2F2F] text-center leading-relaxed py-3 bg-[#FAF5EC] px-3 rounded-xl border border-[#E8E2D5] cursor-pointer hover:border-[#5D6D53] hover:bg-[#F8F2E4] transition-all flex flex-col items-center gap-2"
                      dir={lang === 'he' ? 'rtl' : 'ltr'}
                      title={lang === 'he' ? 'לחץ לקריאת הפרק המלא' : lang === 'ru' ? 'Нажмите для чтения всей главы' : 'Click to read full chapter'}
                    >
                      <span>{snippetMainDisplay}</span>
                      <span className="text-[11px] text-[#5D6D53] font-sans font-bold bg-[#F8F2E4] px-3 py-1 rounded-full border border-[#E8E2D5] shadow-2xs hover:bg-[#E8E2D5] transition-all">
                        {lang === 'he' ? 'לחץ להמשך לקריאת הפרק המלא ➔' : lang === 'ru' ? 'Нажмите для продолжения ➔' : 'Click to continue reading ➔'}
                      </span>
                    </p>

                    {lang !== 'he' && (
                      <div className="pt-1.5 border-t border-[#E8E2D5] text-right" dir="rtl">
                        <span className="text-[9px] text-[#5D6D53] font-bold block mb-0.5">
                          {lang === 'ru' ? 'Оригинал на иврите:' : 'Hebrew Original:'}
                        </span>
                        <p className="font-serif text-[#3B2F2F] text-xs leading-relaxed">{snippetHeDisplay}</p>
                      </div>
                    )}

                    <div className="text-xs text-[#6B5E53] space-y-1 leading-relaxed">
                      <div className="pt-2 border-t border-[#E8E2D5]">
                        <span className="text-[#5D6D53] font-bold text-[10px] block mb-0.5">{mt.significanceLabel}</span>
                        <p className="text-[#6B5E53] text-[11px]">{activePsalm.significance[lang]}</p>
                      </div>
                    </div>
                  </>
                );
              })()}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => {
                    setReadingSefariaRef(`Psalms ${activePsalm.chapter}`);
                    setReadingTitle(activePsalm.title[lang]);
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-[#5D6D53] hover:bg-[#4F5D46] text-white text-[10px] font-bold py-2 px-2.5 rounded-lg transition-all cursor-pointer shadow-xs"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>{lang === 'he' ? 'קריאת הפרק המלא' : lang === 'ru' ? 'Читать главу полностью' : 'Read Full Chapter'}</span>
                </button>
                <button
                  onClick={() => setActivePsalm(getRandomPsalm())}
                  className="bg-[#FAF5EC] hover:bg-[#E8E2D5] border border-[#E8E2D5] text-[#3B2F2F] text-[10px] font-bold py-2 px-2.5 rounded-lg transition-all cursor-pointer flex items-center justify-center"
                  title={mt.nextPsalm}
                >
                  <RefreshCw className="w-3.5 h-3.5 text-[#5D6D53]" />
                </button>
              </div>
            </div>

            {/* Halakha Study Block */}
            <div className="space-y-2 bg-[#F8F2E4] p-4 rounded-2xl border border-[#E8E2D5] relative overflow-hidden">
              <div className="flex justify-between items-center border-b border-[#E8E2D5] pb-2">
                <span className="text-[#3B2F2F] font-serif font-bold text-xs flex items-center gap-1.5">
                  ⚖️ {mt.halakhaTitle}
                </span>
                <span className="text-[10px] text-[#6B5E53] font-medium">
                  {activeHalakha.reference[lang]}
                </span>
              </div>
              <p 
                className="text-sm font-sans font-bold text-[#3B2F2F] text-center leading-relaxed py-2.5 bg-[#FAF5EC] px-3 rounded-xl border border-[#E8E2D5]" 
                dir={lang === 'he' ? 'rtl' : 'ltr'}
              >
                {activeHalakha.text[lang] || activeHalakha.text.he}
              </p>

              {lang !== 'he' && (
                <div className="pt-1.5 border-t border-[#E8E2D5] text-right" dir="rtl">
                  <span className="text-[9px] text-[#5D6D53] font-bold block mb-0.5">
                    {lang === 'ru' ? 'Оригинал на иврите:' : 'Hebrew Original:'}
                  </span>
                  <p className="font-serif text-[#3B2F2F] text-xs leading-relaxed">{activeHalakha.text.he}</p>
                </div>
              )}

              <div className="text-xs text-[#6B5E53] space-y-1 leading-relaxed">
                <div className="pt-2 border-t border-[#E8E2D5]">
                  <span className="text-[#5D6D53] font-bold text-[10px] block mb-0.5">{mt.explanationLabel}</span>
                  <p className="text-[#6B5E53] text-[11px]">{activeHalakha.explanation[lang]}</p>
                </div>
              </div>
              
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setActiveHalakha(getRandomHalakha())}
                  className="flex-1 bg-[#FAF5EC] hover:bg-[#E8E2D5] border border-[#E8E2D5] text-[#3B2F2F] text-[10px] font-bold py-2 px-2.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  title={mt.nextHalakha}
                >
                  <RefreshCw className="w-3.5 h-3.5 text-[#5D6D53]" />
                  <span>{mt.nextHalakha}</span>
                </button>
              </div>
            </div>

            <p className="text-[10px] text-center text-[#6B5E53] italic bg-[#F8F2E4] p-2.5 rounded-xl leading-normal">
              {mt.readSoul}
            </p>
          </div>
        </div>

        {/* Life story and Contact Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Notes / Life Story */}
          <div className={`lg:col-span-2 bg-[#FFFDF8] border border-[#D8CFC0] p-6 rounded-3xl space-y-3 shadow-sm ${lang === 'he' ? 'text-right' : 'text-left'}`} dir={lang === 'he' ? 'rtl' : 'ltr'}>
            <h3 className="text-sm font-serif font-bold text-[#3B2F2F] border-b border-[#E8E2D5] pb-2 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-[#5D6D53]" />
              {mt.memorialStory}
            </h3>
            <p className="text-sm text-[#3B2F2F] leading-relaxed whitespace-pre-wrap">
              {getLocalizedNotes(deceased, lang) || (lang === 'he' ? "לא נכתבו פרטים נוספים במאגר." : "No additional biography details provided.")}
            </p>
          </div>

          {/* Contact relative */}
          <div className="bg-[#FFFDF8] border border-[#D8CFC0] p-6 rounded-3xl space-y-3 shadow-sm">
            <h3 className="text-sm font-serif font-bold text-[#3B2F2F] border-b border-[#E8E2D5] pb-2 flex items-center gap-1.5 justify-start text-left">
              <Phone className="w-4 h-4 text-[#5D6D53]" />
              <span>{lang === 'he' ? 'פרטי קשר למשפחה' : 'Family Contact'}</span>
            </h3>
            {deceased.contactPhone ? (
              <div className="space-y-3 text-left">
                <span className="block text-sm text-[#3B2F2F] font-mono font-bold">{deceased.contactPhone}</span>
                <a
                  href={`tel:${deceased.contactPhone}`}
                  className="w-full text-center bg-[#5D6D53] hover:bg-[#4F5D46] text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all block cursor-pointer shadow-xs"
                >
                  {mt.callRelative}
                </a>
              </div>
            ) : (
              <p className="text-xs text-[#6B5E53] italic text-left">
                {lang === 'he' ? 'לא נמסר מספר טלפון לתיאום.' : 'No contact phone provided.'}
              </p>
            )}
          </div>
        </div>

        {/* VIRTUAL WALL OF CANDLES & REMEMBRANCES (The Personal Condolence Board) */}
        <div id="wall-of-memories" className="bg-[#FFFDF8] border border-[#D8CFC0] rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#E8E2D5] pb-4">
            <div className="flex items-center gap-2.5">
              <MessageCircle className="w-5 h-5 text-[#5D6D53]" />
              <h2 className="text-lg sm:text-xl font-serif font-bold text-[#3B2F2F] tracking-wide">
                {mt.candleBoardTitle}
              </h2>
            </div>
            
            {/* Show Form Button */}
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="bg-[#5D6D53] hover:bg-[#4F5D46] text-white font-bold text-xs py-2 px-4 rounded-xl shadow-xs transition-all hover:scale-105 cursor-pointer"
              >
                + {lang === 'he' ? 'הדלקת נר והוספת מכתב' : 'Light Candle'}
              </button>
            )}
          </div>

          {/* Success message banner */}
          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 p-4 rounded-xl text-xs font-medium text-center">
              🎉 {mt.successAlert}
            </div>
          )}

          {/* Active input form */}
          {showForm && (
            <motion.form 
              initial={{ opacity: 0, y: -10 }} 
              animate={{ opacity: 1, y: 0 }} 
              onSubmit={handlePostMemory}
              className="bg-[#F8F2E4] border border-[#E8E2D5] p-5 rounded-2xl space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={`space-y-1 ${lang === 'he' ? 'text-right' : 'text-left'}`} dir={lang === 'he' ? 'rtl' : 'ltr'}>
                  <label className="text-[10px] text-[#6B5E53] uppercase tracking-wider font-bold block">{mt.yourName}</label>
                  <input
                    type="text"
                    required
                    value={visitorName}
                    onChange={(e) => setVisitorName(e.target.value)}
                    placeholder={lang === 'he' ? 'הקלד את שמך...' : lang === 'ru' ? 'Введите ваше имя...' : 'Enter your name...'}
                    className="w-full bg-[#FAF5EC] border border-[#E8E2D5] rounded-xl px-4 py-2.5 text-xs text-[#3B2F2F] placeholder-[#6B5E53]/60 focus:outline-none focus:border-[#5D6D53] transition-all font-sans"
                  />
                </div>
              </div>

              <div className={`space-y-1 ${lang === 'he' ? 'text-right' : 'text-left'}`} dir={lang === 'he' ? 'rtl' : 'ltr'}>
                <label className="text-[10px] text-[#6B5E53] uppercase tracking-wider font-bold block">{mt.yourMessage}</label>
                <textarea
                  required
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={mt.writeSomething}
                  className="w-full bg-[#FAF5EC] border border-[#E8E2D5] rounded-xl px-4 py-2.5 text-xs text-[#3B2F2F] placeholder-[#6B5E53]/60 focus:outline-none focus:border-[#5D6D53] transition-all font-sans"
                />
              </div>

              <div className="flex gap-2.5 justify-end">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="bg-[#E8E2D5] hover:bg-[#D8CFC0] text-[#3B2F2F] text-xs py-2 px-4 rounded-xl font-semibold transition-all cursor-pointer"
                >
                  {lang === 'he' ? 'ביטול' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#5D6D53] hover:bg-[#4F5D46] text-white font-bold text-xs py-2 px-5 rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Flame className="w-3.5 h-3.5 text-[#D4AF37]" />
                  )}
                  <span>{mt.submitMessage}</span>
                </button>
              </div>
            </motion.form>
          )}

          {/* Messages Feed */}
          {loadingMemories ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-[#6B5E53] text-xs font-sans">
              <div className="w-6 h-6 border-2 border-[#5D6D53] border-t-transparent rounded-full animate-spin"></div>
              <span>{mt.loadingMemories}</span>
            </div>
          ) : memories.length === 0 ? (
            <div className="text-center py-10 text-[#6B5E53] text-xs max-w-md mx-auto space-y-2">
              <span className="text-3xl block">🕯️</span>
              <p className="font-sans leading-relaxed">{mt.noMemoriesYet}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {memories.map((m) => (
                <div 
                  key={m.id} 
                  className={`bg-[#F8F2E4] border border-[#E8E2D5] p-4 rounded-2xl space-y-2 relative hover:border-[#D8CFC0] transition-all ${lang === 'he' ? 'text-right' : 'text-left'}`} 
                  dir={lang === 'he' ? 'rtl' : 'ltr'}
                >
                  {/* Glowing small candle decoration */}
                  <div className={`absolute top-3 ${lang === 'he' ? 'left-4' : 'right-4'} flex items-center gap-1 text-[10px] text-[#5D6D53] font-serif font-bold`}>
                    <Flame className="w-3.5 h-3.5 text-[#D4AF37] animate-pulse" />
                    <span>{lang === 'he' ? 'נר דולק' : lang === 'ru' ? 'Свеча горит' : 'Candle lit'}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#FAF5EC] border border-[#E8E2D5] flex items-center justify-center text-[#5D6D53]">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#3B2F2F] leading-tight">{m.visitorName}</h4>
                      <span className="text-[9px] text-[#6B5E53] font-mono block">
                        {new Date(m.timestamp).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-US')}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-[#3B2F2F] leading-relaxed font-sans pt-1 italic">
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