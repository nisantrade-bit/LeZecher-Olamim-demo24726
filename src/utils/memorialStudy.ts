/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { gimatriya } from './hebrewDate';

export interface MishnahRecord {
  id: string;
  reference: { he: string; en: string; ru: string };
  text: { he: string; en: string; ru: string };
  explanation: { he: string; en: string; ru: string };
}

export interface PsalmRecord {
  chapter: number;
  title: { he: string; en: string; ru: string };
  text: { he: string; en: string; ru: string };
  significance: { he: string; en: string; ru: string };
}

export const MISHNAYOT: MishnahRecord[] = [
  {
    id: "avot-1-2",
    reference: {
      he: "מסכת אבות, פרק א׳, משנה ב׳",
      en: "Pirkei Avot 1:2",
      ru: "Пиркей Авот 1:2"
    },
    text: {
      he: "שִׁמְעוֹן הַצַּדִּיק הָיָה מִשְּׁיָרֵי כְנֶסֶת הַגְּדוֹלָה. הוּא הָיָה אוֹמֵר, עַל שְׁלשָׁה דְבָרִים הָעוֹלָם עוֹמֵד, עַל הַתּוֹרָה וְעַל הָעֲבוֹדָה וְעַל גְּמִילוּת חֲסָדִים.",
      en: "Shimon the Righteous was one of the last survivors of the Great Assembly. He used to say: On three things the world stands: on the Torah, on the service, and on acts of loving-kindness.",
      ru: "Шимон Праведник был одним из последних мужей Великого Собрания. Он говаривал: на трех вещах стоит мир: на Торе, на служении и на добрых делах."
    },
    explanation: {
      he: "משנה זו מלמדת אותנו על חשיבותם של לימוד התורה, העבודה שבלב וחסד הדדי, המהווים את היסוד לקיומנו הרוחני.",
      en: "This Mishnah teaches us the supreme importance of Torah study, spiritual service, and loving-kindness, which form the bedrock of our spiritual existence.",
      ru: "Эта Мишна учит нас первостепенной важности изучения Торы, духовного служения и милосердия, составляющих основу нашего духовного бытия."
    }
  },
  {
    id: "avot-1-14",
    reference: {
      he: "מסכת אבות, פרק א׳, משנה י״ד",
      en: "Pirkei Avot 1:14",
      ru: "Пиркей Авот 1:14"
    },
    text: {
      he: "הוּא הָיָה אוֹמֵר, אִם אֵין אֲנִי לִי, מִי לִי. וּכְשֶׁאֲנִי לְעַצְמִי, מָה אֲנִי. וְאִם לֹא עַכְשָׁיו, אֵימָתָי.",
      en: "He [Hillel] used to say: If I am not for myself, who is for me? But if I am for myself alone, what am I? And if not now, when?",
      ru: "Он [Гиллель] говаривал: если не я за себя, то кто за меня? Но если я только за себя, то что я? И если не сейчас, то когда?"
    },
    explanation: {
      he: "הלל הזקן מעורר את האדם לאחריות אישית, למעורבות חברתית ולניצול ההווה לעשיית טוב.",
      en: "Hillel the Elder inspires personal responsibility, social connection, and the urgency of seizing the present moment to perform righteous deeds.",
      ru: "Гиллель Старший призывает к личной ответственности, общественной заботе и безотлагательному использованию настоящего момента для совершения добрых дел."
    }
  },
  {
    id: "avot-2-1",
    reference: {
      he: "מסכת אבות, פרק ב׳, משנה א׳",
      en: "Pirkei Avot 2:1",
      ru: "Пиркей Авот 2:1"
    },
    text: {
      he: "וֶהֱוֵי מְחַשֵּׁב הֶפְסֵד מִצְוָה כְּנֶגֶד שְׂכָרָהּ, וּשְׂכַר עֲבֵרָה כְּנֶגֶד הֶפְסֵדָהּ. וְהִסְתַּכֵּל בִּשְׁלשָׁה דְבָרִים וְאֵין אַתָּה בָא לִידֵי עֲבֵרָה, דַּע מַה לְמַעְלָה מִמְּךָ, עַיִן רוֹאָה וְאֹזֶן שׁוֹמַעַת, וְכָל מַעֲשֶׂיךָ בַּסֵּפֶר נִכְתָּבִים.",
      en: "Balance the loss incurred by doing a mitzvah against its reward, and the reward of a sin against the loss it causes. Reflect upon three things and you will not come to sin: Know what is above you—a seeing eye, a hearing ear, and all your deeds written in a book.",
      ru: "И сопоставляй потерю от исполнения заповеди с наградой за нее, а выгоду от греха — с потерей, которую он влечет за собой. Вглядись в три вещи, и ты не придешь к греху: знай, что над тобой — видящее око, слышащее ухо, и все деяния твои записываются в книгу."
    },
    explanation: {
      he: "רבי יהודה הנשיא מדריך אותנו לחיות בתודעה גבוהה של נוכחות הבורא ואחריות נצחית על כל בחירה בחיים.",
      en: "Rabbi Yehuda HaNasi guides us to live with a high awareness of the Creator's presence and eternal accountability for every choice in life.",
      ru: "Рабби Иегуда Ха-Наси направляет нас жить с осознанием присутствия Творца и вечной ответственности за каждый наш жизненный выбор."
    }
  },
  {
    id: "avot-4-1",
    reference: {
      he: "מסכת אבות, פרק ד׳, משנה א׳",
      en: "Pirkei Avot 4:1",
      ru: "Пиркей Авот 4:1"
    },
    text: {
      he: "בֶּן זוֹמָא אוֹמֵר, אֵיזֶהוּ חָכָם, הַלּוֹמֵד מִכָּל אָדָם... אֵיזֶהוּ גִבּוֹר, הַכּוֹבֵשׁ אֶת יִצְרוֹ... אֵיזֶהוּ עָשִׁיר, הַשָּׂמֵחַ בְּחֶלְקוֹ... אֵיזֶהוּ מְכֻבָּד, הַמְכַבֵּד אֶת הַבְּרִיּוֹת...",
      en: "Ben Zoma said: Who is wise? He who learns from every person... Who is strong? He who subdues his personal inclination... Who is rich? He who is happy with his portion... Who is honored? He who honors others...",
      ru: "Бен Зома говорил: Кто мудр? Тот, кто учится у каждого человека... Кто силен? Тот, кто укрощает свои страсти... Кто богат? Тот, кто доволен своей долей... Кто уважаем? Тот, кто уважает других..."
    },
    explanation: {
      he: "הגדרה מחודשת ופנימית של ערכי החיים האמיתיים: חכמה, גבורה, עושר וכבוד.",
      en: "A beautiful redefinition of true life achievements: wisdom, strength, wealth, and honor, measured by internal character rather than external status.",
      ru: "Глубокое переосмысление истинных жизненных ценностей: мудрости, силы, богатства и почета, измеряемых внутренним благородством."
    }
  },
  {
    id: "peah-1-1",
    reference: {
      he: "מסכת פאה, פרק א׳, משנה א׳",
      en: "Peah 1:1",
      ru: "Пеа 1:1"
    },
    text: {
      he: "אֵלּוּ דְבָרִים שֶׁאֵין לָהֶם שִׁעוּר, הַפֵּאָה, וְהַבִּכּוּרִים, וְהָרֵאָיוֹן, וּגְמִילוּת חֲסָדִים, וְתַלְמוּד תּוֹרָה. אֵלּוּ דְבָרִים שֶׁאָדָם אוֹכֵל פֵּרוֹתֵיהֶם בָּעוֹלָם הַזֶּה וְהַקֶּרֶן קַיֶּמֶת לוֹ לָעוֹלָם הַבָּא...",
      en: "These are the things that have no definite measure: the corners of the fields, the first-fruits, the appearance offering, acts of loving-kindness, and Torah study. These are things for which a person enjoys the fruits in this world, while the principal remains in the World to Come...",
      ru: "Вот вещи, не имеющие меры: край поля, оставляемый бедным, первые плоды, приносимые в Храм, паломничество, дела милосердия и изучение Торы. Вот дела, плоды которых человек вкушает в этом мире, а основная награда сохраняется для мира грядущего..."
    },
    explanation: {
      he: "משנה זו היא עמוד התווך של החסד היהודי, המראה כיצד מעשים טובים ולימוד תורה מלווים את נשמת האדם לנצח.",
      en: "This Mishnah is a pillar of Jewish charity and kindness, illustrating how good deeds and Torah study accompany the soul eternally.",
      ru: "Эта Мишна — столп еврейского милосердия, показывающий, как добрые дела и изучение Торы сопровождают душу человека в вечности."
    }
  }
];

export const PSALMS: PsalmRecord[] = [
  {
    chapter: 23,
    title: {
      he: "תהלים כ״ג - מִזְמוֹר לְדָוִד ה׳ רֹעִי",
      en: "Psalm 23 - A Psalm of David. The Lord is my shepherd",
      ru: "Псалом 23 - Песнь Давида. Господь — Пастырь мой"
    },
    text: {
      he: "(א) מִזְמוֹר לְדָוִד: ה' רֹעִי, לֹא אֶחְסָר. (ב) בִּנְאוֹת דֶּשֶׁא יַרְבִּיצֵנִי; עַל מֵי מְנֻחוֹת יְנַהֲלֵנִי. (ג) נַפְשִׁי יְשׁוֹבֵב; יַנְחֵנִי בְמַעְגְּלֵי צֶדֶק לְמַעַן שְׁמוֹ. (ד) גַּם כִּי אֵלֵךְ בְּגֵיא צַלְמָוֶת לֹא אִירָא רָע, כִּי אַתָּה עִמָּדִי; שִׁבְטְךָ וּמִשְׁעַנְתֶּךָ, הֵמָּה יְנַחֲמֻנִי. (ה) תַּעֲרֹךְ לְפָנַי שֻׁלְחָן, נֶגֶד צֹרְרָי; דִּשַּׁנְתָּ בַשֶּׁמֶן רֹאשִׁי, כּוֹסִי רְוָיָה. (ו) אַךְ טוֹב וָחֶסֶד יִרְדְּפוּנִי כָּל יְמֵי חַיָּי; וְשַׁבְתִּי בְּבֵית ה' לְאֹרֶךְ יָמִים.",
      en: "(1) A Psalm of David. The Lord is my shepherd; I shall not want. (2) He makes me lie down in green pastures; He leads me beside still waters. (3) He restores my soul; He guides me in straight paths for His name's sake. (4) Though I walk through the valley of the shadow of death, I will fear no evil, for You are with me; Your rod and Your staff, they comfort me. (5) You prepare a table before me in the presence of my enemies; You anoint my head with oil; my cup overflows. (6) Surely goodness and mercy shall follow me all the days of my life, and I shall dwell in the house of the Lord forever.",
      ru: "(1) Псалом Давида. Господь — Пастырь мой; я ни в чем не буду нуждаться. (2) Он покоит меня на злачных пажитях и водит меня к водам тихим. (3) Душу мою оживляет, направляет меня на стези правды ради имени Своего. (4) Если я пойду и долиною смертной тени, не убоюсь зла, потому что Ты со мной; Твой жезл и Твой посох — они успокаивают меня. (5) Ты приготовил предо мною трапезу в виду врагов моих; умастил елеем голову мою; чаша моя преисполнена. (6) Так, благость и милость да сопровождают меня во все дни жизни моей, и я пребуду в доме Господнем многие дни."
    },
    significance: {
      he: "מזמור זה מבטא ביטחון מוחלט בה׳ ומושר בקהילות רבות בעת לוויה, אזכרה וסעודה שלישית לעילוי הנשמה.",
      en: "This Psalm expresses absolute trust in the Divine and is widely sung during memorials and services to elevate and comfort the departed soul.",
      ru: "Этот псалом выражает абсолютное упование на Всевышнего; его читают во время поминовения для возвышения и упокоения души."
    }
  },
  {
    chapter: 121,
    title: {
      he: "תהלים קכ״א - שִׁיר לַמַּעֲלוֹת אֶשָּׂא עֵינַי",
      en: "Psalm 121 - A song of ascents. I lift up my eyes",
      ru: "Псалом 121 - Песнь восхождения. Возвожу очи мои"
    },
    text: {
      he: "(א) שִׁיר לַמַּעֲלוֹת: אֶשָּׂא עֵינַי אֶל הֶהָרִים, מֵאַיִן יָבֹא עֶזְרִי. (ב) עֶזְרִי מֵעִם ה', עֹשֵׂה שָׁמַיִם וָאָרֶץ. (ג) אַל יִתֵּן לַמוֹט רַגְלֶךָ; אַל יָנוּם שֹׁמְרֶךָ. (ד) הִנֵּה לֹא יָנוּם וְלֹא יִשָּׁן, שׁוֹמֵר יִשְׂרָאֵל. (ה) ה' שֹׁמְרֶךָ; ה' צִלְּךָ עַל יַד יְמִינֶךָ. (ו) יוֹמָם הַשֶּׁמֶשׁ לֹא יַכֶּכָּה, וְיָרֵחַ בַּלָּיְלָה. (ז) ה' יִשְׁמָרְךָ מִכָּל רָע, יִשְׁמֹר אֶת נַפְשֶׁךָ. (ח) ה' יִשְׁמָר צֵאתְךָ וּבוֹאֶךָ, מֵעַתָּה וְעַד עוֹלָם.",
      en: "(1) A song of ascents. I lift up my eyes to the hills—from where will my help come? (2) My help comes from the Lord, Maker of heaven and earth. (3) He will not let your foot slip; He who watches over you will not slumber. (4) Behold, He who watches over Israel will neither slumber nor sleep. (5) The Lord is your keeper; the Lord is your shade at your right hand. (6) The sun shall not strike you by day, nor the moon by night. (7) The Lord will keep you from all evil; He will keep your soul. (8) The Lord will keep your going out and your coming in, from this time forth and forevermore.",
      ru: "(1) Песнь восхождения. Возвожу очи мои к горам: откуда придет помощь мне? (2) Помощь моя от Господа, сотворившего небо и землю. (3) Не даст Он поколебаться ноге твоей, не воздремлет хранящий тебя. (4) Не дремлет и не спит Хранитель Израиля. (5) Господь — хранитель твой; Господь — сень твоя с правой руки твоей. (6) Днем солнце не поразит тебя, ни луна ночью. (7) Господь сохранит тебя от всякого зла; сохранит душу твою. (8) Господь будет охранять выхождение твое и вхождение твое отныне и вовек."
    },
    significance: {
      he: "שיר המעלות המסמל שמירה עליונה וליווי רוחני של הנשמה בדרכה הנצחית.",
      en: "A song of ascents symbolizing supreme divine protection and spiritual escorting of the soul on its eternal journey.",
      ru: "Песнь восхождения, символизирущая высшую защиту Творца и духовное сопровождение души на ее вечном пути."
    }
  },
  {
    chapter: 130,
    title: {
      he: "תהלים ק״ל - שִׁיר הַמַּעֲלוֹת מִמַּעֲמַקִּים",
      en: "Psalm 130 - A song of ascents. Out of the depths",
      ru: "Псалом 130 - Песнь восхождения. Из глубин"
    },
    text: {
      he: "(א) שִׁיר הַמַּעֲלוֹת: מִמַּעֲמַקִּים קְרָאתִיךָ ה'. (ב) אֲדֹנָי שִׁמְעָה בְקוֹלִי; תִּהְיֶינָה אָזְנֶיךָ קַשֻּׁבוֹת, לְקוֹל תַּחֲנוּנָי. (ג) אִם עֲוֹנוֹת תִשְׁמָר יָהּ, אֲדֹנָי מִי יַעֲמֹד. (ד) כִּי עִמְּךָ הַסְּלִיחָה, לְמַעַן תִּוָּרֵא. (ה) קִוִּיתִי ה', קִוְּתָה נַפְשִׁי; וְלִדְבָרוֹ הוֹחָלְתִּי. (ו) נַפְשִׁי לַאדֹנָי, מִשֹּׁמְרִים לַבֹּקֶר שֹׁמְרִים לַבֹּקֶר. (ז) יַחֵל יִשְׂרָאֵל אֶל ה', כִּי עִם ה' הַחֶסֶד; וְהַרְבֵּה עִמּוֹ פְדוּת. (ח) וְהוּא יִפְדֶּה אֶת יִשְׂרָאֵל, מִכֹּל עֲוֹנֹתָיו.",
      en: "(1) A song of ascents. Out of the depths I cry to You, O Lord. (2) Lord, hear my voice! Let Your ears be attentive to my supplications. (3) If You, Lord, should keep account of sins, Lord, who could stand? (4) But with You there is forgiveness, so that You may be revered. (5) I wait for the Lord, my soul waits, and in His word I hope. (6) My soul waits for the Lord more than watchmen for the morning, more than watchmen for the morning. (7) O Israel, hope in the Lord! For with the Lord there is steadfast love, and with Him is plenteous redemption. (8) And He will redeem Israel from all his iniquities.",
      ru: "(1) Песнь восхождения. Из глубин взываю к Тебе, Господи. (2) Господи! Услышь голос мой. Да будут уши Твои внимательны к голосу молений моих. (3) Если Ты, Господи, будешь замечать беззакония, Господи! кто устоит? (4) Но у Тебя прощение, да благоговеют перед Тобой. (5) Надеюсь на Господа, надеется душа моя; на слово Его уповаю. (6) Душа моя ожидает Господа более, нежели стражи утра, — стражи утра. (7) Да уповает Израиль на Господа, ибо у Господа милость и многое у Него избавление. (8) И Он избавит Израиля от всех беззаконий его."
    },
    significance: {
      he: "נאמר בכוונה מרובה לעילוי נשמות הנפטרים, מתוך תקווה וביטחון ברחמי שמים וסליחה.",
      en: "Recited with deep focus for the elevation of souls, expressing ultimate hope and faith in Divine mercy and redemption.",
      ru: "Читается с глубоким чувством ради прощения и возвышения душ усопших, выражая веру в великое милосердие Творца."
    }
  },
  {
    chapter: 20,
    title: {
      he: "תהלים כ׳ - לַמְנַצֵּחַ מִזְמוֹר לְדָוִד יַעַנְךָ ה'",
      en: "Psalm 20 - For the leader. A Psalm of David",
      ru: "Псалом 20 - Дирижеру. Псалом Давида"
    },
    text: {
      he: "(א) לַמְנַצֵּחַ מִזְמוֹר לְדָוִד. (ב) יַעַנְךָ ה' בְּיוֹם צָרָה, יְשַׂגֶּבְךָ שֵׁם אֱלֹהֵי יַעֲקֹב. (ג) יִשְׁלַח עֶזְרְךָ מִקֹּדֶשׁ, וּמִצִּיּוֹן יִסְעָדֶךָ. (ד) יִזְכֹּר כָּל מִנְחֹתֶךָ, וְעוֹלָתְךָ יְדַשְּׁנֶה סֶלָה. (ה) יִתֶּן לְךָ כִלְבָבֶךָ, וְכָל עֲצָתְךָ יְמַלֵּא. (ו) נְרַנְּנָה בִּישׁוּעָתֶךָ וּבְשֵׁם אֱלֹהֵינוּ נִדְגֹּל, יְמַלֵּא ה' כָּל מִשְׁאֲלוֹתֶךָ.",
      en: "(1) For the leader. A Psalm of David. (2) The Lord answer you in the day of trouble; the name of the God of Jacob set you on high! (3) Send you help from the sanctuary, and support you from Zion! (4) Remember all your meal-offerings, and accept your burnt-sacrifice! Selah. (5) Grant you according to your heart's desire, and fulfill all your counsel! (6) We will sing for joy in your victory, and in the name of our God we will set up our standards; the Lord fulfill all your petitions!",
      ru: "(1) Дирижеру. Псалом Давида. (2) Да ответит тебе Господь в день бедствия, да укрепит тебя имя Бога Якова. (3) Да пошлет тебе помощь из святилища и с Сиона да поддержит тебя. (4) Да вспомнит Он все приношения твои и всесожжение твое обратит в пепел. Села. (5) Да даст тебе по сердцу твоему и все помыслы твои да исполнит. (6) Будем радоваться спасению Твоему и во имя Бога нашего поднимем знамя."
    },
    significance: {
      he: "מזמור תפילה עוצמתי לישועה, רפואה והתעלות רוחנית של נשמת הנפטר.",
      en: "A powerful prayer for salvation, health, and the spiritual elevation of the departed soul.",
      ru: "Мощный псалом-молитва о спасении, поддержке и духовном возвышении души усопшего."
    }
  },
  {
    chapter: 16,
    title: {
      he: "תהלים ט״ז - מִכְתָּם לְדָוִד שָׁמְרֵנִי אֵל",
      en: "Psalm 16 - Michtam of David. Guard me, O God",
      ru: "Псалом 16 - Писание Давида. Храни меня, Боже"
    },
    text: {
      he: "(א) מִכְתָּם לְדָוִד: שָׁמְרֵנִי אֵל כִּי חָסִיתִי בָךְ. (ב) אָמַרְתְּ לַה' אֲדֹנָי אָתָּה, טוֹבָתִי בַּל עָלֶיךָ. (ג) לִקְדוֹשִׁים אֲשֶׁר בָּאָרֶץ הֵמָּה, וְאַדִּירֵי כָּל חֶפְצִי בָם... (ח) שִׁוִּיתִי ה' לְנֶגְדִּי תָמִיד, כִּי מִימִינִי בַּל אֶמּוֹט. (ט) לָכֵן שָׂמַח לִבִּי וַיָּגֶל כְּבוֹדִי, אַף בְּשָׂרִי יִשְׁכֹּן לָבֶטַח.",
      en: "(1) Keep me, O God, for I take refuge in You. (2) I say to the Lord: 'You are my Lord; I have no good but in You.'... (8) I have set the Lord always before me; because He is at my right hand, I shall not be moved. (9) Therefore my heart is glad, and my glory rejoices; my flesh also dwells in safety.",
      ru: "(1) Храни меня, Боже, ибо я на Тебя уповаю. (2) Я сказал Господу: Ты — Господин мой, блага мои — только от Тебя... (8) Всегда видел я Господа пред собою, ибо Он одесную меня; не поколеблюсь. (9) Оттого возрадовалось сердце мое, и возвеселилась слава моя; даже и плоть моя успокоится в уповании."
    },
    significance: {
      he: "מזמור של אמונה ודבקות, המקנה שלווה רוחנית עצומה לנשמה השבה למקור חוצבה.",
      en: "A Psalm of ultimate faith and devotion, imparting immense spiritual tranquility to the returning soul.",
      ru: "Псалом глубокой веры и преданности, дарующий огромный духовный покой душе усопшего."
    }
  },
  {
    chapter: 91,
    title: {
      he: "תהלים צ״א - יֹשֵׁב בְּסֵתֶר עֶלְיוֹן",
      en: "Psalm 91 - You who dwell in the secret place",
      ru: "Псалом 91 - Живущий под кровом Всевышнего"
    },
    text: {
      he: "(א) יֹשֵׁב בְּסֵתֶר עֶלְיוֹן, בְּצֵל שַׁדַּי יִתְלוֹנָן. (ב) אֹמַר לַה' מַחְסִי וּמְצוּדָתִי, אֱלֹהַי אֶבְטַח בּוֹ. (ג) כִּי הוּא יַצִּילְךָ מִפַּח יָקוּשׁ, מִדֶּבֶר הַוּוֹת. (ד) בְּאֶבְרָתוֹ יָסֶךְ לָךְ וְתַחַת כְּנָפָיו תֶּחְסֶה, צִנָּה וְסֹחֵר אֲמִתּוֹ. (ה) לֹא תִירָא מִפַּחַד לָיְלָה, מֵחֵץ יָעוּף יוֹמָם.",
      en: "(1) O you who dwell in the shelter of the Most High, who abide in the shadow of the Almighty, (2) say to the Lord, 'My refuge and my fortress, my God, in whom I trust.' (3) For He will deliver you from the snare of the fowler and from the deadly pestilence; (4) He will cover you with His pinions, and under His wings you will find refuge; His truth is a shield and a buckler. (5) You will not fear the terror of the night, nor the arrow that flies by day.",
      ru: "(1) Живущий под кровом Всевышнего под сенью Всемогущего покоится. (2) Говорит Господу: прибежище мое и защита моя, Бог мой, на Которого уповаю! (3) Он избавит тебя от сети ловца, от гибельной язвы. (4) Перьями Своими осенит тебя, и под крыльями Его будешь безопасен; щит и ограждение — истина Его. (5) Не убоишься ужасов в ночи, стрелы, летящей днем."
    },
    significance: {
      he: "שיר של פגעים, מזמור הגנה עליון השומר על הנשמה מכל מזיק ומלווה אותה לגן עדן.",
      en: "The Psalm of protection, shielding the soul from spiritual harm and accompanying it safely to the Garden of Eden.",
      ru: "Псалом божественной защиты, оберегающий душу усопшего от любых преград на ее пути к покою."
    }
  },
  {
    chapter: 15,
    title: {
      he: "תהלים ט״ו - ה׳ מִי יָגוּר בְּאָהֳלֶךָ",
      en: "Psalm 15 - Lord, who may dwell in Your sanctuary?",
      ru: "Псалом 15 - Господи! кто может пребывать в жилище Твоем?"
    },
    text: {
      he: "(א) מִזְמוֹר לְדָוִד: ה' מִי יָגוּר בְּאָהֳלֶךָ, מִי יִשְׁכֹּן בְּהַר קָדְשֶׁךָ. (ב) הוֹלֵךְ תָּמִים וּפֹעֵל צֶדֶק, וְדֹבֵר אֱמֶת בִּלְבָבוֹ. (ג) לֹא רָגַל עַל לְשֹׁנוֹ, לֹא עָשָׂה לְרֵעֵהוּ רָעָה, וְחֶרְפָּה לֹא נָשָׂא עַל קְרֹבוֹ. (ד) נִבְזֶה בְּעֵינָיו נִמְאָס, וְאֶת יִרְאֵי ה' יְכַבֵּד, נִשְׁבַּע לְהָרַע וְלֹא יָמִר.",
      en: "(1) A Psalm of David. Lord, who shall sojourn in Your tabernacle? Who shall dwell on Your holy mountain? (2) He who walks uprightly, and works righteousness, and speaks truth in his heart; (3) who has no slander on his tongue, nor does evil to his fellow, nor takes up a reproach against his neighbor; (4) in whose eyes a vile person is despised, but who honors them that fear the Lord.",
      ru: "(1) Псалом Давида. Господи! кто может пребывать в жилище Твоем? кто может обитать на святой горе Твоей? (2) Тот, кто ходит непорочно, и делает правду, и говорит истину в сердце своем; (3) кто не клевещет языком своим, не делает искреннему своему зла и не принимает поношения на ближнего своего."
    },
    significance: {
      he: "מזמור המתאר את דרכו של הצדיק הראוי לשכון במחיצת השכינה ובגנזי מרומים.",
      en: "A description of the path of the righteous, worthy of dwelling in the divine presence and heavenly chambers.",
      ru: "Описание пути праведника, удостоенного пребывать в сиянии Божественного присутствия."
    }
  }
];

export function getRandomMishnah(): MishnahRecord {
  const index = Math.floor(Math.random() * MISHNAYOT.length);
  return MISHNAYOT[index];
}

export function getRandomPirkeiAvot(): MishnahRecord {
  const avotItems = MISHNAYOT.filter(m => m.id.startsWith('avot-'));
  if (avotItems.length === 0) return MISHNAYOT[0];
  const index = Math.floor(Math.random() * avotItems.length);
  return avotItems[index];
}

export function getRandomGeneralMishnah(): MishnahRecord {
  const generalItems = MISHNAYOT.filter(m => !m.id.startsWith('avot-'));
  if (generalItems.length === 0) return MISHNAYOT[0];
  const index = Math.floor(Math.random() * generalItems.length);
  return generalItems[index];
}

export interface HalakhaRecord {
  id: string;
  reference: { he: string; en: string; ru: string };
  text: { he: string; en: string; ru: string };
  explanation: { he: string; en: string; ru: string };
}

export const HALAKHOT: HalakhaRecord[] = [
  {
    id: "candle-lighting-shulchan-aruch",
    reference: {
      he: "שולחן ערוך (יורה דעה, שע\"ו) • ילקוט יוסף",
      en: "Shulchan Aruch (Yoreh Deah, 376) & Yalkut Yosef",
      ru: "Шулхан Арух (Йоре Деа, 376) и Ялкут Йосеф"
    },
    text: {
      he: "מנהג פשוט וקדמון להדליק נר נשמה בערב יום השנה (היארצייט), וכן בערב יום הכיפורים, שכן 'נר ה׳ נשמת אדם'. ראוי שהנר ידלק במשך כל עשרים וארבע השעות של יום השנה.",
      en: "It is an ancient and widespread custom to light a memorial candle on the eve of the anniversary (Yahrzeit), and on the eve of Yom Kippur, as 'the candle of God is the soul of man'. The candle should burn for the full 24 hours.",
      ru: "Древний и повсеместный обычай — зажигать поминальную свечу накануне годовщины кончины (Йорцайт) и накануне Йом Кипура, ибо «душа человека — светильник Господень». Свеча должна гореть все 24 часа годовщины."
    },
    explanation: {
      he: "בספר ילקוט יוסף מוסבר כי אור הנר הגשמי הוא סמל רוחני המשקף את נצחיות הנשמה ואת אור התורה והמצוות שהאדם הותיר אחריו בעולמנו.",
      en: "In Yalkut Yosef it is explained that the physical candle's light is a spiritual symbol reflecting the soul's eternity and the light of Torah and mitzvot left behind in this world.",
      ru: "В книге «Ялкут Йосеф» объясняется, что физический свет свечи — это духовный символ, отражающий вечность души и свет Торы и заповедей, оставленных человеком в нашем мире."
    }
  },
  {
    id: "tzedakah-yalkut-yosef",
    reference: {
      he: "ילקוט יוסף (אבלות, סימן מ') • שולחן ערוך",
      en: "Yalkut Yosef (Avelut, 40) & Shulchan Aruch",
      ru: "Ялкут Йосеф (Авелут, 40) и Шулхан Арух"
    },
    text: {
      he: "חובה קדושה להרבות בצדקה ביום השנה לעילוי נשמת הנפטר. בפרט נכון לתרום להחזקת תלמידי חכמים הלומדים תורה, שהיא הזכות הגדולה ביותר לנפטר.",
      en: "It is a sacred duty to increase charity on the day of the anniversary for the elevation of the soul. It is especially proper to donate to support Torah scholars, which brings the greatest merit.",
      ru: "Священный долг — умножать благотворительность в день годовщины памяти ради возвышения души. Особенно правильно жертвовать на поддержку изучающих Тору мудрецов, что приносит величайшую заслугу."
    },
    explanation: {
      he: "מקור הדברים בשולחן ערוך (יורה דעה, רמ\"ט) שכתב שצדקה מצילה מן הדין. נתינת צדקה ביום האזכרה מועילה להעלות את הנשמה ממדרגה למדרגה בעולם האמת.",
      en: "Sourced in Shulchan Aruch (Yoreh Deah, 249) which states that charity saves from judgment. Giving charity on the anniversary helps elevate the soul through spiritual realms.",
      ru: "Основано на Шулхан Арухе (Йоре Деа, 249), где написано, что милостыня спасает от суда. Пожертвования в день годовщины помогают возвышать душу со ступени на ступень в духовном мире."
    }
  },
  {
    id: "mishnah-study-yalkut-yosef",
    reference: {
      he: "ילקוט יוסף (דיני אבלות, סימן מ') • שולחן ערוך",
      en: "Yalkut Yosef (Laws of Mourning, 40) & Shulchan Aruch",
      ru: "Ялкут Йосеф (Законы траура, 40) и Шулхан Арух"
    },
    text: {
      he: "לימוד משניות הוא היסוד החשוב ביותר להרגעת ונחת נשמת הנפטר, שכן האותיות של 'משנה' הן אותיות 'נשמה'. ראוי ללמוד משניות לפי אותיות שמו של הנפטר.",
      en: "Studying Mishnah is the most vital foundation for the peace and elevation of the deceased's soul, as the letters of 'Mishnah' (משנה) are identical to 'Neshamah' (נשמה - soul). It is fitting to study chapters matching the name.",
      ru: "Изучение Мишны — важнейшая основа для покоя и возвышения души усопшего, так как буквы слова «Мишна» (משנה) идентичны буквам слова «Нешама» (נשמה — душа). Принято учить главы по буквам имени."
    },
    explanation: {
      he: "הרב עובדיה יוסף זצ\"ל הדגיש בספריו כי לימוד עם הבנה, אפילו מועטה, עדיף על קריאה מהירה ללא הבנה, ומגן על הנשמה מכל צער.",
      en: "Rabbi Ovadia Yosef emphasized that studying with even a little understanding is far superior to rapid reading without comprehension, shielding the soul from any pain.",
      ru: "Рав Овадья Йосеф подчеркивал в своих книгах, что изучение даже с минимальным пониманием гораздо выше быстрого чтения без понимания и защищает душу от любых невзгод."
    }
  },
  {
    id: "kaddish-laws-shulchan-aruch",
    reference: {
      he: "שולחן ערוך (אורח חיים, קל\"ב) • ילקוט יוסף",
      en: "Shulchan Aruch (Orach Chaim, 132) & Yalkut Yosef",
      ru: "Шулхан Арух (Орах Хаим, 132) и Ялкут Йосеф"
    },
    text: {
      he: "על הבנים להקפיד לומר קדיש יתום במניין ביום האזכרה בכל שלוש התפילות (ערבית, שחרית ומנחה), ובכך הם מקדשים שם שמים ברבים ומכבדים את הוריהם.",
      en: "Descendants must ensure they recite the Mourner's Kaddish with a minyan on the anniversary in all three prayers (Arvit, Shacharit, and Mincha), sanctifying God's name in public and honoring parents.",
      ru: "Сыновья должны обязательно читать Кадиш в миньяне в день годовщины во всех трех молитвах (Арвит, Шахарит и Минха), освящая Имя Всевышнего публично и проявляя уважение к родителям."
    },
    explanation: {
      he: "על פי השולחן ערוך, אמירת קדיש מועילה להציל את ההורים מדין קשה ומעלה אותם למעלות עליונות בגן עדן.",
      en: "According to Shulchan Aruch, reciting Kaddish assists in releasing parents from strict heavenly judgments and raises them to higher spheres in Paradise.",
      ru: "Согласно Шулхан Аруху, чтение Кадиша помогает избавить родителей от строгого небесного суда и возносит их на высшие ступени в Раю."
    }
  },
  {
    id: "aliyah-le-kever-shulchan-aruch",
    reference: {
      he: "שולחן ערוך (יורה דעה, שמ\"ד) • ילקוט יוסף",
      en: "Shulchan Aruch (Yoreh Deah, 344) & Yalkut Yosef",
      ru: "Шулхан Арух (Йоре Деа, 344) и Ялкут Йосеф"
    },
    text: {
      he: "מנהג נכון לעלות לקבר ביום השנה (היארצייט). שם מתפללים לעילוי נשמתו ומבקשים רחמים על החיים. אין לעלות לקבר בימי שבת, חג, חול המועד וראש חודש.",
      en: "It is proper to visit the gravesite on the anniversary (Yahrzeit). There, prayers are offered for the soul and mercy is asked for the living. Do not visit on Shabbat, Holidays, Chol HaMoed, or Rosh Chodesh.",
      ru: "Благочестивый обычай — посещать могилу в день годовщины (Йорцайт). Там молятся за возвышение души и просят о милосердии для живых. Не посещают могилу в Шаббат, праздники, полупраздничные дни и Рош Ходеш."
    },
    explanation: {
      he: "בילקוט יוסף מודגש כי עיקר העלייה לקבר הוא לעורר את הלב לתשובה ולתפילה בזכות המנוח, ולא חלילה לפנות אל המתים עצמם.",
      en: "Yalkut Yosef emphasizes that the main purpose of visiting the grave is to inspire the heart to repentance and prayer through the merit of the deceased, not to pray directly to the dead.",
      ru: "В «Ялкут Йосеф» подчеркивается, что главная цель посещения могилы — побудить сердце к покаянию и молитве благодаря заслугам усопшего, но ни в коем случае не обращаться к самим мертвым."
    }
  },
  {
    id: "kibbud-av-va-em-shulchan-aruch",
    reference: {
      he: "שולחן ערוך (יורה דעה, ר\"מ) • ילקוט יוסף",
      en: "Shulchan Aruch (Yoreh Deah, 240) & Yalkut Yosef",
      ru: "Шулхан Арух (Йоре Деа, 240) и Ялкут Йосеф"
    },
    text: {
      he: "מצוות כיבוד אב ואם קיימת גם לאחר פטירתם. הדרך הטובה ביותר לעשות זאת היא על ידי הליכה בדרך ישרה, לימוד תורה, ועשיית מעשים טובים הגורמים נחת רוח להורים בשמיים.",
      en: "The commandment of honoring fathers and mothers continues even after their passing. The greatest way to honor them is by walking in a righteous path, studying Torah, and doing good deeds.",
      ru: "Заповедь почитания отца и матери продолжается и после их ухода из жизни. Лучший способ делать это — идти прямым путем, изучать Тору и совершать добрые дела, приносящие покой родителям на небесах."
    },
    explanation: {
      he: "נפסק בשולחן ערוך כי הבן נחשב 'כרעא דאבוה' (רגל של אביו), וכל מצווה ומעשה טוב שהבנים עושים נזקפים ישירות לזכות ההורים ומרוממים אותם.",
      en: "It is ruled that a child is 'the leg of their father', meaning every mitzvah and good deed performed by descendants is directly credited to the parents' account.",
      ru: "В Шулхан Арухе постановлено, что ребенок считается «ногой отца», то есть каждая заповедь и доброе дело, совершенные потомками, напрямую засчитываются в заслугу родителям."
    }
  },
  {
    id: "berachot-amen-yalkut-yosef",
    reference: {
      he: "ילקוט יוסף (הלכות ברכות) • ילקוט יוסף (אבלות)",
      en: "Yalkut Yosef (Laws of Blessings) & Yalkut Yosef (Avelut)",
      ru: "Ялкут Йосеф (Законы благословений) и Ялкут Йосеф (Авелут)"
    },
    text: {
      he: "נהוג להביא מאכלים וכיבוד לאזכרה ולעורר את הקהל לברך עליהם בקול רם: 'בורא פרי העץ', 'בורא פרי האדמה', 'שהכל נהיה בדברו' ו'בורא מיני מזונות', והקהל יענו 'אמן' בכוונה.",
      en: "It is customary to bring food and refreshments to a memorial gathering and encourage the public to make blessings aloud: 'Borei Pri HaEtz', 'Pri HaAdama', 'Shehakol', and 'Mezonot', with the audience responding 'Amen'.",
      ru: "Принято приносить угощения на поминки и побуждать присутствующих произносить благословения вслух: «Борей при а-эц», «а-адама», «шеаколь» и «мезонот», чтобы собрание отвечало «Амен» с глубоким намерением."
    },
    explanation: {
      he: "עניית אמן של הציבור וברכת הנהנין המכוונת לעילוי נשמת המנוח יוצרות קידוש השם עצום בשמיים ומסייעות מאוד לעילוי הנשמה.",
      en: "Answering 'Amen' by the public and making blessings directed for the elevation of the soul create a grand sanctification of God's name, aiding the soul's ascent.",
      ru: "Ответ «Амен» общины и благословения, направленные на возвышение души усопшего, создают великое освящение Имени Всевышнего на небесах и очень помогают подъему души."
    }
  },
  {
    id: "tefillat-minyan-yalkut-yosef",
    reference: {
      he: "ילקוט יוסף (דיני אבלות, סימן מ')",
      en: "Yalkut Yosef (Laws of Mourning, 40)",
      ru: "Ялкут Йосеф (Законы траура, 40)"
    },
    text: {
      he: "ביום השנה (היארצייט) ראוי מאוד להתפלל את כל התפילות במניין בבית הכנסת, ולעבור לפני התיבה כשליח ציבור אם הבן יודע להתפלל כראוי ואין הדבר גורם למחלוקת.",
      en: "On the anniversary (Yahrzeit), it is highly proper to pray all prayers with a minyan in synagogue, and if possible, lead the prayers as Chazzan if the son knows how and it causes no dispute.",
      ru: "В день годовщины (Йорцайт) очень правильно молиться во всех службах в миньяне в синагоге и вести молитву в качестве ведущего (Шалиах Цибур), если сын умеет делать это правильно и это не вызывает споров."
    },
    explanation: {
      he: "תפילת הרבים וברכו שאומר הציבור במענה לשליח הציבור מביאה זכות עצומה ורחמים מרובים לנשמת הנפטר בעולם האמת.",
      en: "Public prayer and the 'Barchu' answered by the congregation in response to the Chazzan bring immense merit and mercy to the soul of the deceased.",
      ru: "Общественная молитва и ответ «Барху», произносимый общиной в ответ ведущему, приносят огромную заслугу и милосердие душе усопшего в истинном мире."
    }
  }
];

export function getRandomHalakha(): HalakhaRecord {
  const index = Math.floor(Math.random() * HALAKHOT.length);
  return HALAKHOT[index];
}

export function getRandomPsalm(): PsalmRecord {
  // Select a random chapter from 1 to 150
  const chapter = Math.floor(Math.random() * 150) + 1;
  const existing = PSALMS.find(p => p.chapter === chapter);
  if (existing) {
    return existing;
  }

  const chGim = gimatriya(chapter);
  return {
    chapter,
    title: {
      he: `תהלים פרק ${chGim}`,
      en: `Psalm ${chapter}`,
      ru: `Псалом ${chapter}`
    },
    text: {
      he: `פרק ${chGim} לחלוקת קריאת תהלים משותפת לעילוי נשמת הנפטר. לחץ למטה כדי לפתוח ולקרוא את הפרק המלא.`,
      en: `Chapter ${chapter} selected for the elevation of the departed soul. Click below to read the full chapter text.`,
      ru: `Глава ${chapter} выбрана для возвышения души усопшего. Нажмите ниже для чтения всей главы.`
    },
    significance: {
      he: `אמירת תהלים מעוררת רחמים רבים ומעלה את הנשמה למדרגות עליונות בגן עדן.`,
      en: `Reciting Psalms invokes divine mercy and elevates the soul to higher levels in the spiritual world.`,
      ru: `Чтение псалмов пробуждает великое милосердие и возвышает душу в высших мирах.`
    }
  };
}

