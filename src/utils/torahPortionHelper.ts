/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface PortionDetails {
  nameHe: string;
  nameEn: string;
  nameRu: string;
  aliyotIsrael: { he: string; en: string; ru: string };
  aliyotDiaspora: { he: string; en: string; ru: string };
  differences: { he: string; en: string; ru: string };
  isHoliday: boolean;
}

export function getTorahPortionDetails(titleHe: string, titleEn: string): PortionDetails {
  const normalizedHe = titleHe || "";
  const normalizedEn = titleEn || "";

  // Check if it's a holiday reading
  const isHoliday = 
    normalizedHe.includes("פסח") || normalizedEn.toLowerCase().includes("pesach") ||
    normalizedHe.includes("שבועות") || normalizedEn.toLowerCase().includes("shavuot") ||
    normalizedHe.includes("סוכות") || normalizedHe.includes("עצרת") || normalizedEn.toLowerCase().includes("sukkot") ||
    normalizedHe.includes("ראש השנה") || normalizedEn.toLowerCase().includes("hashana") ||
    normalizedHe.includes("כיפור") || normalizedEn.toLowerCase().includes("kippur") ||
    normalizedHe.includes("חנוכה") || normalizedEn.toLowerCase().includes("chanukah") ||
    normalizedHe.includes("פורים") || normalizedEn.toLowerCase().includes("purim");

  // Default regular weekly Parasha values
  let details: PortionDetails = {
    nameHe: normalizedHe.replace("פרשת ", "").trim(),
    nameEn: normalizedEn.replace("Parashat ", "").trim(),
    nameRu: normalizedEn.replace("Parashat ", "").trim(),
    aliyotIsrael: {
      he: "7 עליות לתורה + קריאת מפטיר (סך הכל 8 עליות)",
      en: "7 Aliyot + Maftir (Total of 8 Aliyot)",
      ru: "7 Алийот + Мафтир (Всего 8 Алийот)"
    },
    aliyotDiaspora: {
      he: "7 עליות לתורה + קריאת מפטיר (סך הכל 8 עליות)",
      en: "7 Aliyot + Maftir (Total of 8 Aliyot)",
      ru: "7 Алийот + Мафтир (Всего 8 Алийот)"
    },
    differences: {
      he: "בסדר הקריאה הרגיל אין הבדל במספר העליות. עם זאת, לפעמים נוצר פער של שבוע שלם בסבב פרשות השבוע בין הארץ לחו\"ל. פער זה קורה כאשר יום טוב שני של גלויות (בחו\"ל) חל בשבת, אז בחו\"ל קוראים קריאת חג ובארץ ישראל כבר קוראים את הפרשה הרגילה הבאה. הפער נסגר כאשר בחו\"ל מחברים שתי פרשות (כמו מטות-מסעי או בהר-בחוקותי) ובארץ קוראים אותן בנפרד.",
      en: "The number of Aliyot is identical. However, a one-week gap can open between Israel and the Diaspora. This occurs when the second day of a festival (Yom Tov Sheni) falls on Shabbat; Diaspora Jews read a special holiday portion, while Israeli Jews (who completed the holiday a day earlier) proceed to the next weekly Parasha. The gap is resolved later in the summer when double portions are joined in the Diaspora but read separately in Israel.",
      ru: "Количество Алийот совпадает. Однако между Израилем и Диаспорой может возникнуть разница в одну неделю. Это происходит, когда второй праздничный день (Йом Тов Шени) выпадает на Шаббат: в Диаспоре читают особое праздничное чтение, тогда как в Израиле (где праздник закончился на день раньше) переходят к следующей недельной главе. Разница выравнивается позже, когда в Диаспоре соединяют две главы Торы."
    },
    isHoliday: isHoliday
  };

  // Specific Holiday details override
  if (normalizedHe.includes("פסח") || normalizedEn.toLowerCase().includes("pesach")) {
    details.nameHe = "חג הפסח";
    details.nameEn = "Passover (Pesach)";
    details.nameRu = "Песах (Пасха)";
    details.isHoliday = true;
    details.aliyotIsrael = {
      he: "יום ראשון ושביעי של פסח: 5 עליות. חול המועד: 4 עליות. (בשבת: 7 עליות).",
      en: "1st & 7th days: 5 Aliyot. Chol HaMoed (Intermediate): 4 Aliyot. (On Shabbat: 7 Aliyot).",
      ru: "1-й и 7-й дни: 5 Алийот. Холь а-Моэд: 4 Алийот. (В Шаббат: 7 Алийот)."
    };
    details.aliyotDiaspora = {
      he: "ימים א׳, ב׳, ז׳, ח׳: 5 עליות. חול המועד: 4 עליות. (בשבת: 7 עליות).",
      en: "1st, 2nd, 7th & 8th days: 5 Aliyot. Chol HaMoed: 4 Aliyot. (On Shabbat: 7 Aliyot).",
      ru: "1, 2, 7 и 8-й дни: 5 Алийот. Холь а-Моэд: 4 Алийот. (В Шаббат: 7 Алийот)."
    };
    details.differences = {
      he: "בארץ ישראל חג הפסח נמשך 7 ימים ושביעי של פסח הוא יום טוב האחרון. בחו\"ל החג נמשך 8 ימים בשל יום טוב שני של גלויות (יום שמיני של פסח). אם יום שמיני של פסח חל בשבת, בחו\"ל קוראים קריאת חג מיוחדת (עשר תעשר / כל הבכור) ובארץ ישראל כבר קוראים את פרשת אחרי מות.",
      en: "In Israel, Pesach lasts 7 days, and the 7th day is the final Yom Tov. In the Diaspora, it lasts 8 days. If the 8th day falls on Shabbat, Diaspora Jews read a special holiday section, while Israel has returned to the regular cycle with Parashat Acharei Mot.",
      ru: "В Израиле Песах длится 7 дней, а 7-й день — последний праздничный день. В Диаспоре он длится 8 дней. Если 8-й день выпадает на Шаббат, в Диаспоре читают праздничный отрывок Торы, в то время как в Израиле уже возвращаются к регулярному циклу с главы Ахарей Мот."
    };
  } else if (normalizedHe.includes("שבועות") || normalizedEn.toLowerCase().includes("shavuot")) {
    details.nameHe = "חג השבועות";
    details.nameEn = "Shavuot";
    details.nameRu = "Шавуот";
    details.isHoliday = true;
    details.aliyotIsrael = {
      he: "יום ראשון (והיחיד): 5 עליות (בשבת: 7 עליות).",
      en: "1st day (and only): 5 Aliyot (On Shabbat: 7 Aliyot).",
      ru: "1-й день (единственный): 5 Алийот (В Шаббат: 7 Алийот)."
    };
    details.aliyotDiaspora = {
      he: "יום ראשון ושני: 5 עליות (בשבת: 7 עליות).",
      en: "1st and 2nd days: 5 Aliyot (On Shabbat: 7 Aliyot).",
      ru: "1-й и 2-й дни: 5 Алийот (В Шаббат: 7 Алийот)."
    };
    details.differences = {
      he: "בארץ ישראל שבועות נמשך יום אחד בלבד. בחו\"ל נחגג יומיים. אם היום השני של שבועות חל בשבת, בחו\"ל קוראים קריאה מיוחדת לחג (כל הבכור) ובארץ ישראל כבר קוראים את פרשת נשוא.",
      en: "Shavuot lasts 1 day in Israel and 2 days in the Diaspora. If the 2nd day falls on Shabbat, Diaspora reads a special festival portion while Israel proceeds to the weekly Parashat Nasso.",
      ru: "Шавуот длится 1 день в Израиле и 2 дня в Диаспоре. Если 2-й день выпадает на Шаббат, в Диаспоре читают особый праздничный отрывок, тогда как в Израиле переходят к главе Насо."
    };
  } else if (normalizedHe.includes("סוכות") || normalizedEn.toLowerCase().includes("sukkot")) {
    details.nameHe = "חג הסוכות";
    details.nameEn = "Sukkot";
    details.nameRu = "Суккот";
    details.isHoliday = true;
    details.aliyotIsrael = {
      he: "יום ראשון: 5 עליות. חול המועד: 4 עליות. הושענא רבה: 4 עליות.",
      en: "1st day: 5 Aliyot. Chol HaMoed (Intermediate): 4 Aliyot. Hoshana Rabbah: 4 Aliyot.",
      ru: "1-й день: 5 Алийот. Холь а-Моэд: 4 Алийот. Ошана Раба: 4 Алийот."
    };
    details.aliyotDiaspora = {
      he: "יום ראשון ושני: 5 עליות. חול המועד: 4 עליות. הושענא רבה: 4 עליות.",
      en: "1st and 2nd days: 5 Aliyot. Chol HaMoed: 4 Aliyot. Hoshana Rabbah: 4 Aliyot.",
      ru: "1-й и 2-й дни: 5 Алийот. Холь а-Моэд: 4 Алийот. Ошана Раба: 4 Алийот."
    };
    details.differences = {
      he: "בארץ ישראל יום ראשון בלבד הוא יום טוב ושאר הימים חול המועד. בחו\"ל הימים הראשון והשני הם יום טוב של גלויות.",
      en: "In Israel, only the first day is a full Yom Tov festival. In the Diaspora, both the first and second days are full festival days with Yom Tov restrictions.",
      ru: "В Израиле только первый день является полноценным праздником (Йом Тов). В Диаспоре первые два дня являются полноценными праздниками."
    };
  } else if (normalizedHe.includes("ראש השנה") || normalizedEn.toLowerCase().includes("hashana")) {
    details.nameHe = "ראש השנה";
    details.nameEn = "Rosh Hashanah";
    details.nameRu = "Рош а-Шана";
    details.isHoliday = true;
    details.aliyotIsrael = {
      he: "יומיים של חג: 5 עליות בכל יום (בשבת: 7 עליות).",
      en: "Both days: 5 Aliyot per day (On Shabbat: 7 Aliyot).",
      ru: "Оба дня: 5 Алийот в день (В Шаббат: 7 Алийот)."
    };
    details.aliyotDiaspora = {
      he: "יומיים של חג: 5 עליות בכל יום (בשבת: 7 עליות).",
      en: "Both days: 5 Aliyot per day (On Shabbat: 7 Aliyot).",
      ru: "Оба дня: 5 Алийот в день (В Шаббат: 7 Алийот)."
    };
    details.differences = {
      he: "בניגוד לשאר החגים, ראש השנה נחגג יומיים הן בארץ ישראל והן בחו\"ל וסדר הקריאות והעליות זהה לחלוטין.",
      en: "Unlike other holidays, Rosh Hashanah is observed for two days both in Israel and the Diaspora; therefore, the Torah portions and Aliyot are identical.",
      ru: "В отличие от других праздников, Рош а-Шана празднуется два дня как в Израиле, так и в Диаспоре; чтения Торы и Алийот абсолютно идентичны."
    };
  } else if (normalizedHe.includes("עצרת") || normalizedHe.includes("שמחת תורה")) {
    details.nameHe = "שמיני עצרת ושמחת תורה";
    details.nameEn = "Shemini Atzeret & Simchat Torah";
    details.nameRu = "Шмини Ацерет и Симхат Тора";
    details.isHoliday = true;
    details.aliyotIsrael = {
      he: "שמיני עצרת ושמחת תורה (יום אחד משולב): 5 עליות (וכל הקהל עולים וחוזרים חלילה עד חתן תורה וחתן בראשית).",
      en: "Shemini Atzeret & Simchat Torah (Combined single day): 5 Aliyot (Plus standard tradition of calling everyone up recursively).",
      ru: "Шмини Ацерет и Симхат Тора (Один совмещенный день): 5 Алийот (Плюс вызов всех присутствующих к Торе)."
    };
    details.aliyotDiaspora = {
      he: "שמיני עצרת (יום ראשון): 5 עליות. שמחת תורה (יום שני): 5 עליות וקריאה מרובה של כל הקהל.",
      en: "Shemini Atzeret (1st day): 5 Aliyot. Simchat Torah (2nd day): 5 Aliyot (Plus calling everyone up).",
      ru: "Шмини Ацерет (1-й день): 5 Алийот. Симхат Тора (2-й день): 5 Алийот (Плюс вызов всех прихожан)."
    };
    details.differences = {
      he: "בארץ ישראל שמיני עצרת ושמחת תורה נחגגים ביחד ביום אחד מרוכז ומלא שמחה. בחו\"ל הם מפוצלים לשני ימים נפרדים: ביום הראשון שמיני עצרת וביום השני שמחת תורה.",
      en: "In Israel, Shemini Atzeret and Simchat Torah are celebrated together on a single action-packed day. In the Diaspora, they are split into two separate consecutive days.",
      ru: "В Израиле Шмини Ацерет и Симхат Тора празднуются в один и тот же день. В Диаспоре они разделены на два дня: первый день — Шмини Ацерет, второй — Симхат Тора."
    };
  }

  return details;
}
