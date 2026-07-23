/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Translation {
  title: string;
  subtitle: string;
  langToggle: string;
  bulletinBoard: string;
  memorialBook: string;
  calendar: string;
  quick30Grid: string;
  addMemorial: string;
  importBulk: string;
  
  // Fields
  fullName: string;
  gender: string;
  fatherName: string;
  motherName: string;
  hebrewDay: string;
  hebrewMonth: string;
  contactPhone: string;
  lifeStory: string;
  uploadImage: string;
  submitAdd: string;
  submitSave: string;
  cancel: string;
  delete: string;
  edit: string;
  confirmDelete: string;
  confirmDeleteText: string;
  search: string;
  
  // Genders
  male: string;
  female: string;
  
  // Bulletins
  todayMemorials: string;
  upcomingMemorials: string;
  noMemorialsToday: string;
  tomorrow: string;
  inNDays: string;
  
  // Calendar
  city: string;
  candles: string;
  havdalah: string;
  parsha: string;
  prevMonth: string;
  nextMonth: string;
  
  // Import
  importTitle: string;
  csvUploadLabel: string;
  csvUploadHelp: string;
  bulkPasteLabel: string;
  bulkPastePlaceholder: string;
  importButton: string;
  importSuccess: string;
  importError: string;
  downloadTemplate: string;
  
  // Placeholders
  namePlaceholder: string;
  fatherPlaceholder: string;
  motherPlaceholder: string;
  phonePlaceholder: string;
  notesPlaceholder: string;
  
  // Details
  yahrzeitDate: string;
  relationTextMale: string;
  relationTextFemale: string;
  contactDetails: string;
}

export const translations: Record<'he' | 'en' | 'ru', Translation> = {
  he: {
    title: "לזכר עולמים",
    subtitle: "ספר זיכרון דיגיטלי ומעקב יארצייט משפחתי",
    langToggle: "שפה",
    bulletinBoard: "לוח מודעות אזכרות",
    memorialBook: "ספר זיכרון",
    calendar: "לוח שנה חודשי",
    quick30Grid: "לוח 30 ימים",
    addMemorial: "הוספת נפטר חדש",
    importBulk: "ייבוא המוני",
    
    fullName: "שם מלא של הנפטר",
    gender: "מין (לקביעת נוסח אזכרה והלכה)",
    fatherName: "שם האב (לנוסח הלכתי מלא, כגון 'בן אברהם')",
    motherName: "שם האם (נחוץ לערבי תפילה ובקשות)",
    hebrewDay: "יום פטירה עברי (מספר בין 1 ל-30)",
    hebrewMonth: "חודש פטירה עברי",
    contactPhone: "טלפון של קרוב משפחה (לקבלת תזכורת)",
    lifeStory: "סיפור חיים, מיקום בית עלמין והערות",
    uploadImage: "העלאת תמונת זיכרון (אופציונלי)",
    submitAdd: "שמירה במאגר",
    submitSave: "שמירת שינויים",
    cancel: "ביטול",
    delete: "מחיקה",
    edit: "עריכה",
    confirmDelete: "האם למחוק רשומה זו?",
    confirmDeleteText: "פעולה זו היא סופית ולא ניתן לבטלה.",
    search: "חיפוש נפטר לפי שם...",
    
    male: "זכר",
    female: "נקבה",
    
    todayMemorials: "אזכרות היום (היום):",
    upcomingMemorials: "אזכרות בשבוע הקרוב (6 ימים קדימה):",
    noMemorialsToday: "אין אזכרות רשומות לימים אלו. יהי זכרם ברוך. 🕯️",
    tomorrow: "מחר",
    inNDays: "בעוד {n} ימים",
    
    city: "עיר לקביעת זמני השבת",
    candles: "הדלקת נרות",
    havdalah: "הבדלה",
    parsha: "פרשת השבוע",
    prevMonth: "חודש קודם",
    nextMonth: "חודש הבא",
    
    importTitle: "לוח ייבוא המוני",
    csvUploadLabel: "אפשרות 1: העלאת קובץ CSV/Excel (מומלץ ביותר)",
    csvUploadHelp: "גרור או בחר קובץ CSV המכיל עמודות מופרדות בפסיקים בסדר הבא:\nשם מלא, מין (male/female), שם האב, שם האם, יום עברי (1-30), חודש עברי, טלפון, הערות",
    bulkPasteLabel: "אפשרות 2: הדבקה מהירה של טקסט (Bulk Paste)",
    bulkPastePlaceholder: "הדבק כאן שורות מועתקות מטבלה (מופרדות בפסיקים או בטאבים).\nלדוגמה:\nישראל ישראלי, זכר, אברהם, שרה, 15, תשרי, 052-1234567, נפטר בשיבה טובה",
    importButton: "ייבא נתונים למאגר",
    importSuccess: "הייבוא הושלם בהצלחה! יובאו {count} רшומות חדשות.",
    importError: "שגיאה בייבוא. ודא שהמבנה תקין.",
    downloadTemplate: "הורד קובץ דוגמה (CSV Template)",
    
    namePlaceholder: "לדוגמה: משה ישראלי",
    fatherPlaceholder: "לדוגמה: אברהם",
    motherPlaceholder: "לדוגמה: שרה",
    phonePlaceholder: "לדוגמה: 050-1234567",
    notesPlaceholder: "ספר על המנוח, מיקום הקבר או הערות מיוחדות...",
    
    yahrzeitDate: "תאריך אזכרה שנתי",
    relationTextMale: "בן {father} ו{mother}",
    relationTextFemale: "בת {father} ו{mother}",
    contactDetails: "פרטי איש קשר"
  },
  en: {
    title: "L'Zecher Olamim",
    subtitle: "Digital Memorial Book & Family Yahrzeit Tracker",
    langToggle: "Language",
    bulletinBoard: "Memorial Bulletin Board",
    memorialBook: "Memorial Book",
    calendar: "Monthly Calendar",
    quick30Grid: "30-Day Grid",
    addMemorial: "Add New Memorial",
    importBulk: "Bulk Import",
    
    fullName: "Deceased Full Name",
    gender: "Gender (for Halachic formulas)",
    fatherName: "Father's Name (for fully Halachic formulation, e.g., 'ben Avraham')",
    motherName: "Mother's Name (needed for prayer services)",
    hebrewDay: "Hebrew Day of Death (number 1 to 30)",
    hebrewMonth: "Hebrew Month of Death",
    contactPhone: "Relative's Phone (for reminders)",
    lifeStory: "Life Story, Cemetery Location & Notes",
    uploadImage: "Upload Memorial Photo (optional)",
    submitAdd: "Save to Database",
    submitSave: "Save Changes",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    confirmDelete: "Are you sure you want to delete this memorial?",
    confirmDeleteText: "This action is permanent and cannot be undone.",
    search: "Search deceased by name...",
    
    male: "Male",
    female: "Female",
    
    todayMemorials: "Today's Yahrzeits:",
    upcomingMemorials: "Yahrzeits in the upcoming week (6 days ahead):",
    noMemorialsToday: "No memorials registered for these days. May their memory be a blessing. 🕯️",
    tomorrow: "Tomorrow",
    inNDays: "In {n} days",
    
    city: "Shabbat Times City",
    candles: "Candle lighting",
    havdalah: "Havdalah",
    parsha: "Torah Portion",
    prevMonth: "Previous Month",
    nextMonth: "Next Month",
    
    importTitle: "Bulk Import Panel",
    csvUploadLabel: "Option 1: Upload CSV/Excel file (Recommended)",
    csvUploadHelp: "Drag & drop or select a CSV file with comma-separated columns in this order:\nFull Name, Gender (male/female), Father's Name, Mother's Name, Hebrew Day (1-30), Hebrew Month, Phone, Notes",
    bulkPasteLabel: "Option 2: Bulk Text Paste",
    bulkPastePlaceholder: "Paste text lines here (comma or tab separated).\nExample:\nJohn Doe, male, Abraham, Sarah, 15, Tishrei, 555-0199, Passed away peacefully",
    importButton: "Import Data",
    importSuccess: "Import successful! {count} new records added.",
    importError: "Error importing. Please check structure.",
    downloadTemplate: "Download Sample Template (CSV)",
    
    namePlaceholder: "e.g., Moses Israeli",
    fatherPlaceholder: "e.g., Abraham",
    motherPlaceholder: "e.g., Sarah",
    phonePlaceholder: "e.g., 555-0199",
    notesPlaceholder: "Share memory, cemetery location or additional remarks...",
    
    yahrzeitDate: "Annual Yahrzeit Date",
    relationTextMale: "son of {father}, {mother}",
    relationTextFemale: "daughter of {father}, {mother}",
    contactDetails: "Contact Details"
  },
  ru: {
    title: "Лезехер Оламим",
    subtitle: "Цифровая книга памяти и семейный календарь Йарцайтов",
    langToggle: "Язык",
    bulletinBoard: "Доска памяти Йарцайтов",
    memorialBook: "Книга Памяти",
    calendar: "Календарь",
    quick30Grid: "Сетка 30 дней",
    addMemorial: "Добавить запись",
    importBulk: "Массовый импорт",
    
    fullName: "Полное имя усопшего",
    gender: "Пол (для галахических формулировок)",
    fatherName: "Имя отца (для поминания, например, 'бен Авраам')",
    motherName: "Имя матери (необходимо для поминальных молитв)",
    hebrewDay: "Еврейский день кончины (число от 1 до 30)",
    hebrewMonth: "Еврейский месяц кончины",
    contactPhone: "Телефон родственника (для напоминаний)",
    lifeStory: "История жизни, место на кладбище и примечания",
    uploadImage: "Загрузить фото памяти (опционально)",
    submitAdd: "Сохранить в базу данных",
    submitSave: "Сохранить изменения",
    cancel: "Отмена",
    delete: "Удалить",
    edit: "Редактировать",
    confirmDelete: "Вы уверены, что хотите удалить эту запись?",
    confirmDeleteText: "Это действие необратимо.",
    search: "Поиск усопшего по имени...",
    
    male: "Мужской",
    female: "Женский",
    
    todayMemorials: "Йарцайты сегодня:",
    upcomingMemorials: "Йарцайты в ближайшую неделю (6 дней вперед):",
    noMemorialsToday: "Нет записей на эти дни. Пусть память о них будет благословением. 🕯️",
    tomorrow: "Завтра",
    inNDays: "Через {n} дн.",
    
    city: "Город для времени Шаббата",
    candles: "Зажигание свечей",
    havdalah: "Авдала",
    parsha: "Недельная глава",
    prevMonth: "Предыдущий месяц",
    nextMonth: "Следующий месяц",
    
    importTitle: "Панель массового импорта",
    csvUploadLabel: "Вариант 1: Загрузить файл CSV/Excel (Рекомендуется)",
    csvUploadHelp: "Перетащите или выберите CSV-файл с колонками, разделенными запятыми, в следующем порядке:\nФИО, Пол (male/female), Имя отца, Имя матери, Еврейский день (1-30), Еврейский месяц, Телефон, Примечания",
    bulkPasteLabel: "Вариант 2: Быстрая вставка текста (Bulk Paste)",
    bulkPastePlaceholder: "Вставьте строки текста (разделенные запятыми или табуляцией).\nПример:\nИван Иванов, male, Абрам, Сарра, 15, Тишрей, 555-1234, Ушел с миром",
    importButton: "Импортировать данные",
    importSuccess: "Импорт завершен! Добавлено {count} новых записей.",
    importError: "Ошибка импорта. Пожалуйста, проверите структуру.",
    downloadTemplate: "Скачать образец CSV шаблона",
    
    namePlaceholder: "например, Моисей Израиль",
    fatherPlaceholder: "например, Авраам",
    motherPlaceholder: "например, Сарра",
    phonePlaceholder: "например, 555-1234",
    notesPlaceholder: "Поделитесь воспоминаниями, укажите место захоронения...",
    
    yahrzeitDate: "Ежегодная дата Йарцайта",
    relationTextMale: "сын {father}, {mother}",
    relationTextFemale: "дочь {father}, {mother}",
    contactDetails: "Контактные данные"
  }
};

import { translateText } from './transliteration';

export function sanitizeParentName(name: string): string {
  let cleaned = (name || '').trim();
  
  // Remove starting "של " or "של"
  if (cleaned.startsWith('של ')) {
    cleaned = cleaned.substring(3).trim();
  } else if (cleaned === 'של') {
    cleaned = '';
  }
  
  // Remove starting "ו" if it's followed by a letter, but protect real names starting with V (Vered, Victoria, Vladimir, etc.)
  if (cleaned.startsWith('ו') && cleaned.length > 1) {
    const isRealVName = ['ורד', 'ולדי', 'ויקט', 'ולרי', 'וול', 'ויה', 'ויק', 'וינ', 'ויל'].some(prefix => cleaned.startsWith(prefix));
    if (!isRealVName) {
      cleaned = cleaned.substring(1).trim();
    }
  }
  
  return cleaned;
}

export function formatParentRelation(gender: 'male' | 'female', fatherName: string | undefined, motherName: string | undefined, lang: 'he' | 'en' | 'ru'): string {
  const father = sanitizeParentName(fatherName || '');
  const mother = sanitizeParentName(motherName || '');
  const hasFather = father !== '' && father !== '???' && father !== '-';
  const hasMother = mother !== '' && mother !== '???' && mother !== '-';

  if (lang === 'he') {
    const prefix = gender === 'male' ? 'בן' : 'בת';
    if (hasFather && hasMother) {
      // Ensure mother doesn't have a starting 'ו' when joined with 'ו'
      const cleanMother = mother.startsWith('ו') && mother.length > 1 && !['ורד', 'ולדי', 'ויקט', 'ולרי'].some(p => mother.startsWith(p)) 
        ? mother.substring(1).trim() 
        : mother;
      return `${prefix} ${father} ו${cleanMother}`;
    }
    if (hasFather) return `${prefix} ${father}`;
    if (hasMother) return `${prefix} ${mother}`;
    return `${prefix} הורה`;
  } else if (lang === 'ru') {
    const prefix = gender === 'male' ? 'сын' : 'дочь';
    const translatedFather = hasFather ? translateText(father, 'ru') : '';
    const translatedMother = hasMother ? translateText(mother, 'ru') : '';

    // No "и" between father and mother names as requested
    if (hasFather && hasMother) return `${prefix} ${translatedFather}, ${translatedMother}`;
    if (hasFather) return `${prefix} ${translatedFather}`;
    if (hasMother) return `${prefix} ${translatedMother}`;
    return `${prefix} родителя`;
  } else {
    const prefix = gender === 'male' ? 'son of' : 'daughter of';
    const translatedFather = hasFather ? translateText(father, 'en') : '';
    const translatedMother = hasMother ? translateText(mother, 'en') : '';

    // No "AND" between father and mother names as requested
    if (hasFather && hasMother) return `${prefix} ${translatedFather}, ${translatedMother}`;
    if (hasFather) return `${prefix} ${translatedFather}`;
    if (hasMother) return `${prefix} ${translatedMother}`;
    return `${prefix} parent`;
  }
}

