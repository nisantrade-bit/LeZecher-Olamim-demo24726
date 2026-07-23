/**
 * Utility for transliterating Hebrew, English, and Russian names, parent names, and text.
 * Serves as both a client-side instant translation engine and offline fallback.
 */

import { Deceased, Language } from '../types';
import { HEBREW_MONTHS_HE, HEBREW_MONTHS_EN, HEBREW_MONTHS_RU, normalizeMonthName } from './hebrewDate';

// Comprehensive dictionary of common Jewish, Israeli, Bukharian, Caucasian, and Slavic names & terms
const NAME_DICTIONARY: Record<string, { en: string; ru: string }> = {
  // Patriarchs & Matriarchs & Biblical Figures
  "אברהם": { en: "Abraham", ru: "Авраам" },
  "שרה": { en: "Sarah", ru: "Сарра" },
  "יצחק": { en: "Isaac", ru: "Исаак" },
  "רבקה": { en: "Rebecca", ru: "Ревекка" },
  "יעקב": { en: "Jacob", ru: "Иаков" },
  "רחל": { en: "Rachel", ru: "Рахиль" },
  "לאה": { en: "Leah", ru: "Лия" },
  "יוסף": { en: "Joseph", ru: "Иосиф" },
  "משה": { en: "Moses", ru: "Моисей" },
  "אהרן": { en: "Aaron", ru: "Аарон" },
  "דוד": { en: "David", ru: "Давид" },
  "שלמה": { en: "Solomon", ru: "Соломон" },
  "דניאל": { en: "Daniel", ru: "Даниэль" },
  "מיכאל": { en: "Michael", ru: "Михаил" },
  "גבריאל": { en: "Gabriel", ru: "Габриэль" },
  "אליהו": { en: "Elijah", ru: "Илья" },
  "שמואל": { en: "Samuel", ru: "Самуил" },
  "בנימין": { en: "Benjamin", ru: "Вениамин" },
  "יהודה": { en: "Judah", ru: "Иуда" },
  "שמעון": { en: "Simeon", ru: "Шимон" },
  "לוי": { en: "Levi", ru: "Леви" },
  "חיים": { en: "Chaim", ru: "Хаим" },
  "מנחם": { en: "Menachem", ru: "Менахем" },
  "מרדכי": { en: "Mordechai", ru: "Мордехай" },
  "אסתר": { en: "Esther", ru: "Эстер" },
  "חנה": { en: "Hannah", ru: "Анна" },
  "מרים": { en: "Miriam", ru: "Мириам" },
  "תמר": { en: "Tamar", ru: "Тамар" },
  "דבורה": { en: "Deborah", ru: "Дебора" },
  "יעל": { en: "Yael", ru: "Яэль" },
  "רות": { en: "Ruth", ru: "Рут" },
  "אדם": { en: "Adam", ru: "Адам" },
  "נח": { en: "Noah", ru: "Ной" },
  "יונתן": { en: "Jonathan", ru: "Ионатан" },
  "אריה": { en: "Arieh", ru: "Арье" },
  "דב": { en: "Dov", ru: "Дов" },
  "זאב": { en: "Zeev", ru: "Зеев" },
  "צבי": { en: "Zvi", ru: "Цви" },
  "עמוס": { en: "Amos", ru: "Амос" },
  "נתן": { en: "Nathan", ru: "Натан" },
  "שמחה": { en: "Simcha", ru: "Симха" },
  "שושנה": { en: "Shoshana", ru: "Шошана" },
  "ציפורה": { en: "Zipporah", ru: "Ципора" },
  "ברוך": { en: "Baruch", ru: "Барух" },
  "שלום": { en: "Shalom", ru: "Шалом" },
  "אליעזר": { en: "Eliezer", ru: "Элиэзер" },
  "ישראל": { en: "Israel", ru: "Израиль" },
  "אפרים": { en: "Ephraim", ru: "Эфраим" },
  "מנשה": { en: "Manasseh", ru: "Менаше" },
  "נפתלי": { en: "Naphtali", ru: "Нафтали" },
  "אשר": { en: "Asher", ru: "Ашер" },
  "גד": { en: "Gad", ru: "Гад" },
  "דן": { en: "Dan", ru: "Дан" },
  "זבולון": { en: "Zebulun", ru: "Зевулун" },
  "יששכר": { en: "Issachar", ru: "Иссахар" },
  "ראובן": { en: "Reuben", ru: "Реувен" },
  "זלמן": { en: "Zalman", ru: "Залман" },
  "זלמה": { en: "Zelma", ru: "Зелма" },
  "נחמה": { en: "Nechama", ru: "Нехама" },
  "גולדה": { en: "Golda", ru: "Голда" },
  "גיטל": { en: "Gitel", ru: "Гитель" },
  "פייגה": { en: "Feiga", ru: "Фейга" },
  "אלכסנדר": { en: "Alexander", ru: "Александр" },
  "בוריס": { en: "Boris", ru: "Борис" },
  "ולדימיר": { en: "Vladimir", ru: "Владимир" },
  "סרגיי": { en: "Sergey", ru: "Сергей" },
  "איגור": { en: "Igor", ru: "Игорь" },
  "אנה": { en: "Anna", ru: "Анна" },
  "ילנה": { en: "Elena", ru: "Елена" },
  "טטיאנה": { en: "Tatiana", ru: "Татьяна" },
  "סופיה": { en: "Sophia", ru: "София" },
  "אירינה": { en: "Irina", ru: "Ирина" },
  "קטאייב": { en: "Kataev", ru: "Катаев" },
  "קטאייבה": { en: "Kataeva", ru: "Катаева" },
  "פנחסוב": { en: "Pinkhasov", ru: "Пинхасов" },
  "פנחסובה": { en: "Pinkhasova", ru: "Пинхасова" },
  "רובינוב": { en: "Rubinov", ru: "Рубинов" },
  "רובינובה": { en: "Rubinova", ru: "Рубинова" },
  "בבייב": { en: "Babaev", ru: "Бабаев" },
  "בבייבה": { en: "Babaeva", ru: "Бабаева" },
  "אבייב": { en: "Abaev", ru: "Абаев" },
  "אבייבה": { en: "Abaeva", ru: "Абаева" },
  "ג'ורייב": { en: "Dzhuraev", ru: "Джураев" },
  "ג'ורייבה": { en: "Dzhuraeva", ru: "Джураева" },
  "ג'ורה": { en: "Dzhura", ru: "Джура" },
  "הכהן": { en: "HaKohen", ru: "ха-Коэн" },
  "בורוכוב": { en: "Borochov", ru: "Борохов" },
  "נסימוב": { en: "Nisimov", ru: "Насимов" },
  "טוקוב": { en: "Tokov", ru: "Токов" },
  "ליובה": { en: "Lyuba", ru: "Люба" },
  "אילושה": { en: "Ilyusha", ru: "Илюша" },
  "מירה": { en: "Mira", ru: "Мира" },
  "מכתור": { en: "Mekhtor", ru: "Мехтор" },
  "חמלה": { en: "Chemla", ru: "Хемла" },
  "תמרה": { en: "Tamara", ru: "Тамара" },
  "מישה": { en: "Misha", ru: "Миша" },
  "בסנדה": { en: "Basanda", ru: "Басанда" },
  "ציביה": { en: "Tzivia", ru: "Цивия" },
  "תוטי": { en: "Tuti", ru: "Тути" },
  "מיכל": { en: "Michal", ru: "Михаль" },
  "יוכבד": { en: "Yocheved", ru: "Йохевед" },
  "שושן": { en: "Shushan", ru: "Шушан" },
  "מישואל": { en: "Mishoel", ru: "Мишоэль" },
  "יוריק": { en: "Yurik", ru: "Юрик" },
  "מאטט": { en: "Matat", ru: "Матат" },
  "מאירחיים": { en: "Meirchaim", ru: "Меирхаим" },
  "מאירחי": { en: "Meirchai", ru: "Меирхай" },
  "בורוך": { en: "Boruch", ru: "Борух" },
  "ברוכצ'ה": { en: "Boruchcha", ru: "Борухча" },
  "בורוכצ'ה": { en: "Boruchcha", ru: "Борухча" },
  "חפצי": { en: "Chefzi", ru: "Хефци" },
  "בורכה": { en: "Burcha", ru: "Бурха" },
  "בארכה": { en: "Burcha", ru: "Бурха" },
  "אימאשלום": { en: "Imashalom", ru: "Имашалом" },
  "בלור": { en: "Blor", ru: "Блор" },
  "בלוריה": { en: "Bloruya", ru: "Блория" },
  "מושיחי": { en: "Mushechai", ru: "Мошихаи" },
  "שורח": { en: "Sorach", ru: "Сорах" },
  "סורח": { en: "Sorach", ru: "Сорах" },
  "איסתם": { en: "Istam", ru: "Истам" },
  "קיזי": { en: "Kizi", ru: "Кизи" },
  "איסתמצ'ה": { en: "Istamcha", ru: "Истамча" },
  "רנה": { en: "Rena", ru: "Рена" },
  "ליזה": { en: "Liza", ru: "Лиза" },
  "סוניה": { en: "Sonia", ru: "Соня" },
  "אמנון": { en: "Amnon", ru: "Амнон" },
  "אבנר": { en: "Avner", ru: "Авнер" },
  "טובה": { en: "Tova", ru: "Това" },
  "זוליי": { en: "Zulay", ru: "Зулай" },
  "עדיזוי": { en: "Adizoy", ru: "Адизой" },
  "בורי": { en: "Bori", ru: "Бори" },
  "בובו": { en: "Bobo", ru: "Бобо" },
  "ביבי": { en: "Bibi", ru: "Биби" },
  "הרב": { en: "Rabbi", ru: "Рав" },
  "רב": { en: "Rabbi", ru: "Рав" },
  "בן": { en: "ben", ru: "бен" },
  "בת": { en: "bat", ru: "бат" },
  "של": { en: "of", ru: "" },
  "סבא": { en: "Grandfather", ru: "Дедушка" },
  "סבתא": { en: "Grandmother", ru: "Бабушка" },
  "סבא רבא": { en: "Great-grandfather", ru: "Прадедушка" },
  "סבתא רבה": { en: "Great-grandmother", ru: "Прабабушка" },
  "אח": { en: "Brother", ru: "Брат" },
  "אחות": { en: "Sister", ru: "Сестра" },
  "דודה": { en: "Aunt", ru: "Тётя" },
  "גיס": { en: "Brother-in-law", ru: "Свояк" },
  "אם חורגת": { en: "Stepmother", ru: "Мачеха" },
  "כלה": { en: "Daughter-in-law", ru: "Невестка" },
  "אשת": { en: "Wife of", ru: "Жена" },
  "אשתו": { en: "His wife", ru: "его жена" },
  "רעייתו": { en: "His wife", ru: "Супруга" },
  "בעלה": { en: "Her husband", ru: "муж" }
};

// Maps for fast cross-lookup
const HE_DICTIONARY: Record<string, { en: string; ru: string; he: string }> = {};
const EN_DICTIONARY: Record<string, { he: string; ru: string; en: string }> = {};
const RU_DICTIONARY: Record<string, { he: string; en: string; ru: string }> = {};

Object.entries(NAME_DICTIONARY).forEach(([he, trans]) => {
  const item = { he, en: trans.en, ru: trans.ru };
  HE_DICTIONARY[he] = item;
  if (trans.en) EN_DICTIONARY[trans.en.toLowerCase()] = item;
  if (trans.ru) RU_DICTIONARY[trans.ru.toLowerCase()] = item;
});

/**
 * Transliterates Latin/English text to Cyrillic/Russian
 */
function transliterateLatinToCyrillic(word: string): string {
  if (!word) return '';
  const lower = word.toLowerCase();
  let res = '';
  for (let i = 0; i < lower.length; i++) {
    const c = lower[i];
    const n = lower[i + 1] || '';
    const nn = lower[i + 2] || '';

    if (c === 'd' && n === 'z' && nn === 'h') { res += 'дж'; i += 2; continue; }
    if (c === 'd' && n === 'j') { res += 'дж'; i++; continue; }
    if (c === 's' && n === 'h') { res += 'ш'; i++; continue; }
    if (c === 'c' && n === 'h') { res += 'ч'; i++; continue; }
    if (c === 'k' && n === 'h') { res += 'х'; i++; continue; }
    if (c === 't' && n === 'z') { res += 'ц'; i++; continue; }
    if (c === 't' && n === 's') { res += 'ц'; i++; continue; }
    if (c === 'y' && n === 'a') { res += 'я'; i++; continue; }
    if (c === 'y' && n === 'u') { res += 'ю'; i++; continue; }
    if (c === 'y' && n === 'o') { res += 'ё'; i++; continue; }
    if (c === 'y' && n === 'e') { res += 'е'; i++; continue; }
    if (c === 'p' && n === 'h') { res += 'ф'; i++; continue; }
    if (c === 't' && n === 'h') { res += 'т'; i++; continue; }

    if (c === 'a') res += 'а';
    else if (c === 'b') res += 'б';
    else if (c === 'c') res += 'к';
    else if (c === 'd') res += 'д';
    else if (c === 'e') res += 'е';
    else if (c === 'f') res += 'ф';
    else if (c === 'g') res += 'г';
    else if (c === 'h') res += 'х';
    else if (c === 'i') res += 'и';
    else if (c === 'j') res += 'дж';
    else if (c === 'k') res += 'к';
    else if (c === 'l') res += 'л';
    else if (c === 'm') res += 'м';
    else if (c === 'n') res += 'н';
    else if (c === 'o') res += 'о';
    else if (c === 'p') res += 'п';
    else if (c === 'q') res += 'к';
    else if (c === 'r') res += 'р';
    else if (c === 's') res += 'с';
    else if (c === 't') res += 'т';
    else if (c === 'u') res += 'у';
    else if (c === 'v') res += 'в';
    else if (c === 'w') res += 'в';
    else if (c === 'x') res += 'кс';
    else if (c === 'y') res += 'и';
    else if (c === 'z') res += 'з';
    else res += c;
  }
  if (res.length > 0 && word[0] === word[0].toUpperCase()) {
    res = res.charAt(0).toUpperCase() + res.slice(1);
  }
  return res || word;
}

/**
 * Transliterates Cyrillic/Russian text to Latin/English
 */
function transliterateCyrillicToLatin(word: string): string {
  if (!word) return '';
  const lower = word.toLowerCase();
  let res = '';
  for (let i = 0; i < lower.length; i++) {
    const c = lower[i];
    if (c === 'а') res += 'a';
    else if (c === 'б') res += 'b';
    else if (c === 'в') res += 'v';
    else if (c === 'г') res += 'g';
    else if (c === 'д') res += 'd';
    else if (c === 'е') res += 'e';
    else if (c === 'ё') res += 'yo';
    else if (c === 'ж') res += 'zh';
    else if (c === 'з') res += 'z';
    else if (c === 'и') res += 'i';
    else if (c === 'й') res += 'y';
    else if (c === 'к') res += 'k';
    else if (c === 'л') res += 'l';
    else if (c === 'м') res += 'm';
    else if (c === 'н') res += 'n';
    else if (c === 'о') res += 'o';
    else if (c === 'п') res += 'p';
    else if (c === 'р') res += 'r';
    else if (c === 'с') res += 's';
    else if (c === 'т') res += 't';
    else if (c === 'у') res += 'u';
    else if (c === 'ф') res += 'f';
    else if (c === 'х') res += 'kh';
    else if (c === 'ц') res += 'ts';
    else if (c === 'ч') res += 'ch';
    else if (c === 'ש' || c === 'ש' || c === 'ш') res += 'sh';
    else if (c === 'щ') res += 'shch';
    else if (c === 'ъ') res += '';
    else if (c === 'ы') res += 'y';
    else if (c === 'ь') res += '';
    else if (c === 'э') res += 'e';
    else if (c === 'ю') res += 'yu';
    else if (c === 'я') res += 'ya';
    else res += c;
  }
  if (res.length > 0 && word[0] === word[0].toUpperCase()) {
    res = res.charAt(0).toUpperCase() + res.slice(1);
  }
  return res || word;
}

/**
 * Transliterates Latin/English text to Hebrew
 */
function transliterateLatinToHebrew(word: string): string {
  if (!word) return '';
  const lower = word.toLowerCase();
  if (lower === 'ben') return 'בן';
  if (lower === 'bat') return 'בת';
  if (lower === 'of') return 'של';

  let res = '';
  for (let i = 0; i < lower.length; i++) {
    const c = lower[i];
    const n = lower[i + 1] || '';
    const isEnd = (i === lower.length - 1);

    if (c === 'd' && n === 'z') { res += 'ג׳'; i++; continue; }
    if (c === 's' && n === 'h') { res += 'ש'; i++; continue; }
    if (c === 'c' && n === 'h') { res += 'ח'; i++; continue; }
    if (c === 'k' && n === 'h') { res += 'ח'; i++; continue; }
    if (c === 't' && n === 'z') { res += 'צ'; i++; continue; }
    if (c === 't' && n === 's') { res += 'צ'; i++; continue; }
    if (c === 't' && n === 'h') { res += 'ת'; i++; continue; }
    if (c === 'p' && n === 'h') { res += 'פ'; i++; continue; }

    if (c === 'a') res += 'א';
    else if (c === 'b') res += 'ב';
    else if (c === 'v') res += 'ו';
    else if (c === 'g') res += 'ג';
    else if (c === 'd') res += 'ד';
    else if (c === 'e') res += 'א';
    else if (c === 'f') res += 'פ';
    else if (c === 'h') res += 'ה';
    else if (c === 'i') res += 'י';
    else if (c === 'j') res += 'ג׳';
    else if (c === 'k' || c === 'c') res += 'ק';
    else if (c === 'l') res += 'ל';
    else if (c === 'm') res += isEnd ? 'ם' : 'מ';
    else if (c === 'n') res += isEnd ? 'ן' : 'נ';
    else if (c === 'o') res += 'ו';
    else if (c === 'p') res += 'פ';
    else if (c === 'r') res += 'ר';
    else if (c === 's') res += 'ס';
    else if (c === 't') res += 'ת';
    else if (c === 'u') res += 'ו';
    else if (c === 'w') res += 'ו';
    else if (c === 'y') res += 'י';
    else if (c === 'z') res += 'ז';
    else if (c >= '\u0590' && c <= '\u05FF') res += c;
    else res += c;
  }
  return res || word;
}

/**
 * Transliterates Cyrillic/Russian text to Hebrew
 */
function transliterateCyrillicToHebrew(word: string): string {
  if (!word) return '';
  const lower = word.toLowerCase();
  if (lower === 'бен') return 'בן';
  if (lower === 'бат') return 'בת';

  let res = '';
  for (let i = 0; i < lower.length; i++) {
    const c = lower[i];
    const isEnd = (i === lower.length - 1);

    if (c === 'а') res += 'א';
    else if (c === 'б') res += 'ב';
    else if (c === 'в') res += 'ו';
    else if (c === 'г') res += 'ג';
    else if (c === 'д') res += 'ד';
    else if (c === 'е') res += 'א';
    else if (c === 'ё') res += 'יו';
    else if (c === 'ж') res += 'ז׳';
    else if (c === 'з') res += 'ז';
    else if (c === 'и' || c === 'й') res += 'י';
    else if (c === 'к') res += 'ק';
    else if (c === 'л') res += 'ל';
    else if (c === 'м') res += isEnd ? 'ם' : 'מ';
    else if (c === 'н') res += isEnd ? 'ן' : 'נ';
    else if (c === 'о') res += 'ו';
    else if (c === 'п') res += 'פ';
    else if (c === 'р') res += 'ר';
    else if (c === 'с') res += 'ס';
    else if (c === 'т') res += 'ת';
    else if (c === 'у') res += 'ו';
    else if (c === 'ф') res += 'פ';
    else if (c === 'х') res += 'ח';
    else if (c === 'ц') res += 'צ';
    else if (c === 'ч') res += 'צ׳';
    else if (c === 'ш' || c === 'щ') res += 'ש';
    else if (c === 'э') res += 'א';
    else if (c === 'ю') res += 'יו';
    else if (c === 'я') res += 'יא';
    else if (c >= '\u0590' && c <= '\u05FF') res += c;
    else res += c;
  }
  return res || word;
}

/**
 * Transliterates Hebrew text to Latin/English
 */
function transliterateHebrewToLatin(word: string): string {
  const clean = word.replace(/[^\u0590-\u05FF]/g, '');
  if (!clean) return word;

  let res = '';
  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    if (c === 'ש') res += 'sh';
    else if (c === 'צ' || c === 'ץ') res += 'tz';
    else if (c === 'ח') res += 'ch';
    else if (c === 'א') res += (i === 0) ? 'A' : '';
    else if (c === 'ב') res += (i === 0) ? 'b' : 'v';
    else if (c === 'ג') res += 'g';
    else if (c === 'ד') res += 'd';
    else if (c === 'ה') res += (i === clean.length - 1) ? 'ah' : 'h';
    else if (c === 'ו') res += (i > 0 && i < clean.length - 1) ? 'o' : 'v';
    else if (c === 'ז') res += 'z';
    else if (c === 'ט' || c === 'ת') res += 't';
    else if (c === 'י') res += (i === 0) ? 'y' : 'i';
    else if (c === 'כ' || c === 'ך') res += 'k';
    else if (c === 'ל') res += 'l';
    else if (c === 'מ' || c === 'ם') res += 'm';
    else if (c === 'נ' || c === 'ן') res += 'n';
    else if (c === 'ס') res += 's';
    else if (c === 'ע') res += (i === 0) ? 'A' : '';
    else if (c === 'פ' || c === 'ף') res += (i === 0) ? 'p' : 'f';
    else if (c === 'ק') res += 'k';
    else if (c === 'ר') res += 'r';
  }
  if (res.length > 0) {
    res = res.charAt(0).toUpperCase() + res.slice(1);
  }
  return res || word;
}

/**
 * Transliterates Hebrew text to Cyrillic/Russian
 */
function transliterateHebrewToCyrillic(word: string): string {
  const clean = word.replace(/[^\u0590-\u05FF]/g, '');
  if (!clean) return word;

  let res = '';
  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    if (c === 'ש') res += 'ш';
    else if (c === 'צ' || c === 'ץ') res += 'ц';
    else if (c === 'ח') res += 'х';
    else if (c === 'א') res += (i === 0) ? 'А' : '';
    else if (c === 'ב') res += (i === 0) ? 'б' : 'в';
    else if (c === 'ג') res += 'г';
    else if (c === 'ד') res += 'д';
    else if (c === 'ה') res += (i === clean.length - 1) ? 'а' : 'х';
    else if (c === 'ו') res += (i > 0 && i < clean.length - 1) ? 'о' : 'в';
    else if (c === 'ז') res += 'з';
    else if (c === 'ט' || c === 'ת') res += 'т';
    else if (c === 'י') res += (i === 0) ? 'и' : 'й';
    else if (c === 'כ' || c === 'ך') res += 'к';
    else if (c === 'ל') res += 'л';
    else if (c === 'מ' || c === 'ם') res += 'м';
    else if (c === 'נ' || c === 'ן') res += 'н';
    else if (c === 'ס') res += 'с';
    else if (c === 'ע') res += (i === 0) ? 'А' : '';
    else if (c === 'פ' || c === 'ף') res += (i === 0) ? 'п' : 'ф';
    else if (c === 'ק') res += 'к';
    else if (c === 'ר') res += 'р';
  }
  if (res.length > 0) {
    res = res.charAt(0).toUpperCase() + res.slice(1);
  }
  return res || word;
}

// Canonical 3-Language Map for exact text matching across Hebrew, English, and Russian CSV records
export const CANONICAL_PHRASE_MAP: Record<string, { he: string; en: string; ru: string }> = {
  // 1. Lyuba
  "ליובה": { he: "ליובה", en: "Lyuba", ru: "Люба" },
  "lyuba": { he: "ליובה", en: "Lyuba", ru: "Люба" },
  "люба": { he: "ליובה", en: "Lyuba", ru: "Люба" },

  // 2. Ilyusha HaKohen
  "אילושה הכהן": { he: "אילושה הכהן", en: "Ilyusha HaKohen", ru: "Илюша ха-Коэн" },
  "ilyusha hakohen": { he: "אילושה הכהן", en: "Ilyusha HaKohen", ru: "Илюша ха-Коэн" },
  "илюша ха-коэн": { he: "אילושה הכהן", en: "Ilyusha HaKohen", ru: "Илюша ха-Коэн" },

  // 3. Kataev Avraham
  "קטאייב אברהם": { he: "קטאייב אברהם", en: "Kataev Avraham", ru: "Катаев Авраам" },
  "kataev avraham": { he: "קטאייב אברהם", en: "Kataev Avraham", ru: "Катаев Авраам" },
  "катаев авраам": { he: "קטאייב אברהם", en: "Kataev Avraham", ru: "Катаев Авраам" },

  // 4. Mira Mekhtor (Chemla) Kataev (Pinkhasov)
  "מירה מכתור (חמלה) קטאייב (פנחסוב)": { he: "מירה מכתור (חמלה) קטאייב (פנחסוב)", en: "Mira Mekhtor (Chemla) Kataev (Pinkhasov)", ru: "Мира Мехтор (Хемла) Катаева (Пинхасова)" },
  "mira mekhtor (chemla) kataev (pinkhasov)": { he: "מירה מכתור (חמלה) קטאייב (פנחסוב)", en: "Mira Mekhtor (Chemla) Kataev (Pinkhasov)", ru: "Мира Мехтор (Хемла) Катаева (Пинхасова)" },
  "мира мехтор (хемла) катаева (пинхасова)": { he: "מירה מכתור (חמלה) קטאייב (פנחסוב)", en: "Mira Mekhtor (Chemla) Kataev (Pinkhasov)", ru: "Мира Мехтор (Хемла) Катаева (Пинхасова)" },

  // 5. Kataev Yitzhak
  "קטאייב יצחק": { he: "קטאייב יצחק", en: "Kataev Yitzhak", ru: "Катаев Ицхак" },
  "kataev yitzhak": { he: "קטאייב יצחק", en: "Kataev Yitzhak", ru: "Катаев Ицхак" },
  "катаев ицхак": { he: "קטאייב יצחק", en: "Kataev Yitzhak", ru: "Катаев Ицхак" },

  // 6. Kataev Tamara
  "קטאייב תמרה": { he: "קטאייב תמרה", en: "Kataev Tamara", ru: "Катаева Тамара" },
  "kataev tamara": { he: "קטאייב תמרה", en: "Kataev Tamara", ru: "Катаева Тамара" },
  "катаева тамара": { he: "קטאייב תמרה", en: "Kataev Tamara", ru: "Катаева Тамара" },

  // 7. Misha Michael Pinkhasov
  "מישה מיכאל פנחסוב": { he: "מישה מיכאל פנחסוב", en: "Misha Michael Pinkhasov", ru: "Миша Михаил Пинхасов" },
  "misha michael pinkhasov": { he: "מישה מיכאל פנחסוב", en: "Misha Michael Pinkhasov", ru: "Миша Михаил Пинхасов" },
  "миша михаил пинхасов": { he: "מישה מיכאל פנחסוב", en: "Misha Michael Pinkhasov", ru: "Миша Михаил Пинхасов" },

  // 8. Basanda (Rachel)
  "בסנדה (רחל)": { he: "בסנדה (רחל)", en: "Basanda (Rachel)", ru: "Басанда (Рахель)" },
  "basanda (rachel)": { he: "בסנדה (רחל)", en: "Basanda (Rachel)", ru: "Басанда (Рахель)" },
  "басанда (рахель)": { he: "בסנדה (רחל)", en: "Basanda (Rachel)", ru: "Басанда (Рахель)" },

  // 9. Tzivia
  "ציביה": { he: "ציביה", en: "Tzivia", ru: "Цивия" },
  "tzivia": { he: "ציביה", en: "Tzivia", ru: "Цивия" },
  "цивия": { he: "ציביה", en: "Tzivia", ru: "Цивия" },

  // 10. Michal
  "מיכל": { he: "מיכל", en: "Michal", ru: "Михаль" },
  "michal": { he: "מיכל", en: "Michal", ru: "Михаль" },
  "михаль": { he: "מיכל", en: "Michal", ru: "Михаль" },

  // 11. Yocheved
  "יוכבד": { he: "יוכבד", en: "Yocheved", ru: "Йохевед" },
  "yocheved": { he: "יוכבד", en: "Yocheved", ru: "Йохевед" },
  "йохевед": { he: "יוכבד", en: "Yocheved", ru: "Йохевед" },

  // 12. David
  "דוד": { he: "דוד", en: "David", ru: "Давид" },
  "david": { he: "דוד", en: "David", ru: "Давид" },
  "давид": { he: "דוד", en: "David", ru: "Давид" },

  // 13. Shushan
  "שושן": { he: "שושן", en: "Shushan", ru: "Шушан" },
  "shushan": { he: "שושן", en: "Shushan", ru: "Шушан" },
  "шушан": { he: "שושן", en: "Shushan", ru: "Шушан" },

  // 14. Mishoel
  "מישואל": { he: "מישואל", en: "Mishoel", ru: "Мишоэль" },
  "mishoel": { he: "מישואל", en: "Mishoel", ru: "Мишоэль" },
  "мишоэль": { he: "מישואל", en: "Mishoel", ru: "Мишоэль" },

  // 15. Babaev Yurik
  "בבייב יוריק": { he: "בבייב יוריק", en: "Babaev Yurik", ru: "Бабаев Юрик" },
  "babaev yurik": { he: "בבייב יוריק", en: "Babaev Yurik", ru: "Бабаев Юрик" },
  "бабаев юрик": { he: "בבייב יוריק", en: "Babaev Yurik", ru: "Бабаев Юрик" },

  // 16. Lyuba Rubinova
  "ליובה רובינוב": { he: "ליובה רובינוב", en: "Lyuba Rubinova", ru: "Люба Рубинова" },
  "lyuba rubinova": { he: "ליובה רובינוב", en: "Lyuba Rubinova", ru: "Люба Рубинова" },
  "люба рубинова": { he: "ליובה רובינוב", en: "Lyuba Rubinova", ru: "Люба Рубинова" },

  // 17. Simcha Abaev
  "שמחה אבייב": { he: "שמחה אבייב", en: "Simcha Abaev", ru: "Симха Абаев" },
  "simcha abaev": { he: "שמחה אבייב", en: "Simcha Abaev", ru: "Симха Абаев" },
  "симха абаев": { he: "שמחה אבייב", en: "Simcha Abaev", ru: "Симха Абаев" },

  // 18. Shamil HaKohen Dzhuraev
  "שאמיל הכהן ג'ורייב": { he: "שאמיל הכהן ג'ורייב", en: "Shamil HaKohen Dzhuraev", ru: "Шамиль ха-Коэн Джураев" },
  "shamil hakohen dzhuraev": { he: "שאמיל הכהן ג'ורייב", en: "Shamil HaKohen Dzhuraev", ru: "Шамиль ха-Коэн Джураев" },
  "шамиль ха-коэн джураев": { he: "שאמיל הכהן ג'ורייב", en: "Shamil HaKohen Dzhuraev", ru: "Шамиль ха-Коэн Джураев" },

  // 19. Rabbi Meirchaim Kataev
  "הרב מאירחיים קטאייב": { he: "הרב מאירחיים קטאייב", en: "Rabbi Meirchaim Kataev", ru: "Рав Меирхаим Катаев" },
  "rabbi meirchaim kataev": { he: "הרב מאירחיים קטאייב", en: "Rabbi Meirchaim Kataev", ru: "Рав Меирхаим Катаев" },
  "рав меирхаим катаев": { he: "הרב מאירחיים קטאייב", en: "Rabbi Meirchaim Kataev", ru: "Рав Меирхаим Катаев" },

  // 20. Kataev Sarah
  "קטאייב שרה": { he: "קטאייב שרה", en: "Kataev Sarah", ru: "Катаева Сара" },
  "kataev sarah": { he: "קטאייב שרה", en: "Kataev Sarah", ru: "Катаева Сара" },
  "катаева сара": { he: "קטאייב שרה", en: "Kataev Sarah", ru: "Катаева Сара" },

  // 21. Bobo Boruchcha
  "בובו ברוכצ'ה": { he: "בובו ברוכצ'ה", en: "Bobo Boruchcha", ru: "Бобо Борухча" },
  "bobo boruchcha": { he: "בובו ברוכצ'ה", en: "Bobo Boruchcha", ru: "Бобо Борухча" },
  "бобо борухча": { he: "בובו ברוכצ'ה", en: "Bobo Boruchcha", ru: "Бобо Борухча" },

  // 22. Yeshua
  "ישועה": { he: "ישועה", en: "Yeshua", ru: "Йешуא" },
  "yeshua": { he: "ישועה", en: "Yeshua", ru: "Йешуא" },
  "йешуа": { he: "ישועה", en: "Yeshua", ru: "Йешуא" },

  // 23. Bibi Esther
  "ביבי אסתר": { he: "ביבי אסתר", en: "Bibi Esther", ru: "Биби Эстер" },
  "bibi esther": { he: "ביבי אסתר", en: "Bibi Esther", ru: "Биби Эстер" },
  "биби эстер": { he: "ביבי אסתר", en: "Bibi Esther", ru: "Биби Эстер" },

  // 24. Bobo Dzhora (Avraham)
  "בובו ז'ורה (אברהם)": { he: "בובו ז'ורה (אברהם)", en: "Bobo Dzhora (Avraham)", ru: "Бобо Джура (Авраам)" },
  "bobo dzhora (avraham)": { he: "בובו ז'ורה (אברהם)", en: "Bobo Dzhora (Avraham)", ru: "Бобо Джура (Авраам)" },
  "бобо джура (авраам)": { he: "בובו ז'ורה (אברהם)", en: "Bobo Dzhora (Avraham)", ru: "Бобо Джура (Авраам)" },

  // 25. Yona
  "יונה": { he: "יונה", en: "Yona", ru: "Йона" },
  "yona": { he: "יונה", en: "Yona", ru: "Йона" },
  "йона": { he: "יונה", en: "Yona", ru: "Йона" },

  // 26. Bibi Chefzi
  "ביבי חפצי": { he: "ביבי חפצי", en: "Bibi Chefzi", ru: "Биби Хефци" },
  "bibi chefzi": { he: "ביבי חפצי", en: "Bibi Chefzi", ru: "Биби Хефци" },
  "биби хефци": { he: "ביבי חפצי", en: "Bibi Chefzi", ru: "Биби Хефци" },

  // 27. Efraim HaKohen
  "אפרים הכהן": { he: "אפרים הכהן", en: "Efraim HaKohen", ru: "Эфраим ха-Коэн" },
  "efraim hakohen": { he: "אפרים הכהן", en: "Efraim HaKohen", ru: "Эфраим ха-Коэн" },
  "эфраим ха-коэн": { he: "אפרים הכהן", en: "Efraim HaKohen", ru: "Эфраим ха-Коэн" },

  // 28. Burcha
  "בורכה": { he: "בורכה", en: "Burcha", ru: "Бурха" },
  "burcha": { he: "בורכה", en: "Burcha", ru: "Бурха" },
  "бурха": { he: "בורכה", en: "Burcha", ru: "Бурха" },

  // 29. Meirchai
  "מאירחי": { he: "מאירחי", en: "Meirchai", ru: "Меирхай" },
  "meirchai": { he: "מאירחי", en: "Meirchai", ru: "Меирхай" },
  "меирхай": { he: "מאירחי", en: "Meirchai", ru: "Меирхай" },

  // 30. Bobo Nisim
  "בובו נסים": { he: "בובו נסים", en: "Bobo Nisim", ru: "Бобо Нисим" },
  "bobo nisim": { he: "בובו נסים", en: "Bobo Nisim", ru: "Бобо Нисим" },
  "бобо нисим": { he: "בובו נסים", en: "Bobo Nisim", ru: "Бобо Нисим" },

  // 31. Blor (Bruriah)
  "בלור (ברוריה)": { he: "בלור (ברוריה)", en: "Blor (Bruriah)", ru: "Блор (Брурия)" },
  "blor (bruriah)": { he: "בלור (ברוריה)", en: "Blor (Bruriah)", ru: "Блор (Брурия)" },
  "блор (брурия)": { he: "בלור (ברוריה)", en: "Blor (Bruriah)", ru: "Блор (Брурия)" },

  // 32. Mushechai Borochov / מושיחי ב
  "מושיחי ב": { he: "מושיחי ב", en: "Mushechai Borochov", ru: "Мошихаи Борохов" },
  "mushechai borochov": { he: "מושיחי ב", en: "Mushechai Borochov", ru: "Мошихаи Борохов" },
  "мошихаи борохов": { he: "מושיחי ב", en: "Mushechai Borochov", ru: "Мошихаи Борохов" },

  // 33. Pinchas
  "פנחס": { he: "פנחס", en: "Pinchas", ru: "Пинхас" },
  "pinchas": { he: "פנחס", en: "Pinchas", ru: "Пинхас" },
  "пинхас": { he: "פנחס", en: "Pinchas", ru: "Пинхас" },

  // 34. Bibi Sorach
  "ביבי שורח": { he: "ביבי שורח", en: "Bibi Sorach", ru: "Биби сорах" },
  "bibi sorach": { he: "ביבי שורח", en: "Bibi Sorach", ru: "Биби сорах" },
  "биби сорах": { he: "ביבי שורח", en: "Bibi Sorach", ru: "Биби сорах" },

  // 35. Moshe
  "משה": { he: "משה", en: "Moshe", ru: "Моше" },
  "moshe": { he: "משה", en: "Moshe", ru: "Моше" },
  "моше": { he: "משה", en: "Moshe", ru: "Моше" },

  // 36. Istam Eliezer
  "איסתם אליעזר": { he: "איסתם אליעזר", en: "Istam Eliezer", ru: "Истам Элиэзер" },
  "istam eliezer": { he: "איסתם אליעזר", en: "Istam Eliezer", ru: "Истам Элиэзер" },
  "истам элиэзер": { he: "איסתם אליעזר", en: "Istam Eliezer", ru: "Истам Элиэзер" },

  // 37. Kizi (Malka)
  "קיזי (מלכה)": { he: "קיזי (מלכה)", en: "Kizi (Malka)", ru: "Кизи (Малка)" },
  "kizi (malka)": { he: "קיזי (מלכה)", en: "Kizi (Malka)", ru: "Кизи (Малка)" },
  "кизи (малка)": { he: "קיזי (מלכה)", en: "Kizi (Malka)", ru: "Кизи (Малка)" },

  // 38. Mazal bat Bruriah
  "מזל בת ברוריה": { he: "מזל בת ברוריה", en: "Mazal bat Bruriah", ru: "Мазаль бат Брурия" },
  "mazal bat bruriah": { he: "מזל בת ברוריה", en: "Mazal bat Bruriah", ru: "Мазаль бат Брурия" },
  "мазаль бат брурия": { he: "מזל בת ברוריה", en: "Mazal bat Bruriah", ru: "Мазаль бат Брурия" },

  // 39. Uriel
  "אוריאל": { he: "אוריאל", en: "Uriel", ru: "Уриэль" },
  "uriel": { he: "אוריאל", en: "Uriel", ru: "Уриэль" },
  "уриэль": { he: "אוריאל", en: "Uriel", ru: "Уриэль" },

  // 40. Matat / מתת בן
  "מתת בן": { he: "מתת בן", en: "Matat", ru: "Матат" },
  "matat": { he: "מתת בן", en: "Matat", ru: "Матат" },
  "матат": { he: "מתת בן", en: "Matat", ru: "Матат" },

  // 41. Sarah
  "שרה": { he: "שרה", en: "Sarah", ru: "Сара" },
  "sarah": { he: "שרה", en: "Sarah", ru: "Сара" },
  "сара": { he: "שרה", en: "Sarah", ru: "Сара" },

  // 42. Istamcha
  "איסתמצ'ה": { he: "איסתמצ'ה", en: "Istamcha", ru: "Истамча" },
  "istamcha": { he: "איסתמצ'ה", en: "Istamcha", ru: "Истамча" },
  "истамча": { he: "איסתמצ'ה", en: "Istamcha", ru: "Истамча" },

  // 43. Rena
  "רנה": { he: "רנה", en: "Rena", ru: "Рена" },
  "rena": { he: "רנה", en: "Rena", ru: "Рена" },
  "рена": { he: "רנה", en: "Rena", ru: "Рена" },

  // 44. Israel
  "ישראל": { he: "ישראל", en: "Israel", ru: "Исраэль" },
  "israel": { he: "ישראל", en: "Israel", ru: "Исраэль" },
  "исраэль": { he: "ישראל", en: "Israel", ru: "Исраэль" },

  // 45. Liza
  "ליזה": { he: "ליזה", en: "Liza", ru: "Лиза" },
  "liza": { he: "ליזה", en: "Liza", ru: "Лиза" },
  "лиза": { he: "ליזה", en: "Liza", ru: "Лиза" },

  // 46. Amnon HaKohen
  "אמנון הכהן": { he: "אמנון הכהן", en: "Amnon HaKohen", ru: "Амнон ха-Коэн" },
  "amnon hakohen": { he: "אמנון הכהן", en: "Amnon HaKohen", ru: "Амнон ха-Коэн" },
  "амнон ха-коэн": { he: "אמנון הכהן", en: "Amnon HaKohen", ru: "Амнон ха-Коэн" },

  // 47. Avner HaKohen
  "אבנר הכהן": { he: "אבנר הכהן", en: "Avner HaKohen", ru: "Авнер ха-Коэн" },
  "avner hakohen": { he: "אבנר הכהן", en: "Avner HaKohen", ru: "Авнер ха-Коэн" },
  "авнер ха-коэн": { he: "אבנר הכהן", en: "Avner HaKohen", ru: "Авнер ха-Коэн" },

  // 48. Tova
  "טובה": { he: "טובה", en: "Tova", ru: "Това" },
  "tova": { he: "טובה", en: "Tova", ru: "Това" },
  "това": { he: "טובה", en: "Tova", ru: "Това" },

  // 49. Avraham Tokov
  "אברהם טוקוב": { he: "אברהם טוקוב", en: "Avraham Tokov", ru: "Авраам Токов" },
  "avraham tokov": { he: "אברהם טוקוב", en: "Avraham Tokov", ru: "Авраам Токов" },
  "авраам токов": { he: "אברהם טוקוב", en: "Avraham Tokov", ru: "Авраам Токов" },

  // 50. Nisim Nisimov
  "ניסים נסימוב": { he: "ניסים נסימוב", en: "Nisim Nisimov", ru: "Нисим Насимов" },
  "nisim nisimov": { he: "ניסים נסימוב", en: "Nisim Nisimov", ru: "Нисим Насимов" },
  "нисим насимов": { he: "ניסים נסימוב", en: "Nisim Nisimov", ru: "Нисим Насимов" },
};

/**
 * Translates/Transliterates a full string into targetLang with 100% target language script purity.
 */
export function translateText(text: string, targetLang: 'he' | 'en' | 'ru'): string {
  if (!text) return text;

  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();

  // 1. Exact match in Canonical Phrase Map (guarantees zero-distortion matching)
  if (CANONICAL_PHRASE_MAP[trimmed]) {
    return CANONICAL_PHRASE_MAP[trimmed][targetLang];
  }
  if (CANONICAL_PHRASE_MAP[lower]) {
    return CANONICAL_PHRASE_MAP[lower][targetLang];
  }

  const words = text.split(/\s+/);
  const translatedWords = words.map(w => {
    // Preserve trailing/leading punctuation
    const match = w.match(/^([^\u0590-\u05FFa-zA-Z\u0400-\u04FF]*)([\u0590-\u05FFa-zA-Z\u0400-\u04FF]+)([^\u0590-\u05FFa-zA-Z\u0400-\u04FF]*)$/);
    if (!match) return w;

    const prefix = match[1] || '';
    const cleanWord = match[2];
    const suffix = match[3] || '';

    const wordLower = cleanWord.toLowerCase();

    // Check script
    const isHebrew = /^[\u0590-\u05FF]+$/.test(cleanWord);
    const isCyrillic = /^[\u0400-\u04FF]+$/.test(cleanWord);
    const isLatin = /^[a-zA-Z]+$/.test(cleanWord);

    let converted = cleanWord;

    if (targetLang === 'he') {
      if (isHebrew) {
        converted = cleanWord;
      } else if (isCyrillic) {
        converted = RU_DICTIONARY[wordLower]?.he || transliterateCyrillicToHebrew(cleanWord);
      } else if (isLatin) {
        converted = EN_DICTIONARY[wordLower]?.he || transliterateLatinToHebrew(cleanWord);
      }
    } else if (targetLang === 'en') {
      if (isLatin) {
        converted = cleanWord;
      } else if (isHebrew) {
        const plainHebrew = cleanWord.replace(/[\u0591-\u05C7]/g, '');
        converted = HE_DICTIONARY[plainHebrew]?.en || transliterateHebrewToLatin(cleanWord);
      } else if (isCyrillic) {
        converted = RU_DICTIONARY[wordLower]?.en || transliterateCyrillicToLatin(cleanWord);
      }
    } else if (targetLang === 'ru') {
      if (isCyrillic) {
        converted = cleanWord;
      } else if (isHebrew) {
        const plainHebrew = cleanWord.replace(/[\u0591-\u05C7]/g, '');
        converted = HE_DICTIONARY[plainHebrew]?.ru || transliterateHebrewToCyrillic(cleanWord);
      } else if (isLatin) {
        converted = EN_DICTIONARY[wordLower]?.ru || transliterateLatinToCyrillic(cleanWord);
      }
    }

    return `${prefix}${converted}${suffix}`;
  });

  return translatedWords.join(' ');
}

/**
 * Translates a full list of Deceased objects client-side
 */
export function translateDeceasedListClientSide(list: Deceased[], targetLang: Language): Deceased[] {
  if (!list) return list;

  return list.map(item => {
    let localizedMonth = item.month;
    const normalized = normalizeMonthName(item.month);
    if (targetLang === 'he') {
      localizedMonth = normalized;
    } else if (targetLang === 'en') {
      const idx = HEBREW_MONTHS_HE.indexOf(normalized);
      if (idx !== -1) localizedMonth = HEBREW_MONTHS_EN[idx];
    } else if (targetLang === 'ru') {
      const idx = HEBREW_MONTHS_HE.indexOf(normalized);
      if (idx !== -1) localizedMonth = HEBREW_MONTHS_RU[idx];
    }

    return {
      ...item,
      name: translateText(item.name, targetLang),
      fatherName: item.fatherName ? translateText(item.fatherName, targetLang) : '',
      motherName: item.motherName ? translateText(item.motherName, targetLang) : '',
      notes: item.notes || '',
      month: localizedMonth
    };
  });
}

/**
 * Phonetically transliterates a full Hebrew verse into Latin (en) or Cyrillic (ru) script
 */
export function phoneticTransliterateHebrewVerse(hebrewVerse: string, targetLang: 'en' | 'ru'): string {
  if (!hebrewVerse) return '';
  const clean = hebrewVerse.replace(/<[^>]*>/g, '').replace(/[\u0591-\u05C7]/g, '');
  const words = clean.split(/\s+/);

  const transliterated = words.map(w => {
    return translateText(w, targetLang);
  });

  return transliterated.join(' ');
}
