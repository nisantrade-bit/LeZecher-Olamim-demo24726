/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import { translateDeceasedListClientSide } from './src/utils/transliteration';

// Load environment variables
dotenv.config();

const PORT = 3000;

const DATABASE_FILE = path.join(process.cwd(), 'database.json');
const MEMORIES_FILE = path.join(process.cwd(), 'memories.json');

// Ensure database files exist
function initDatabaseFiles() {
  if (!fs.existsSync(DATABASE_FILE)) {
    const seedData = [
      {
        id: 1718882041001,
        name: "אברהם אבינו",
        gender: "male",
        fatherName: "תרח",
        motherName: "אמתלאי",
        day: 6,
        month: "אב",
        contactPhone: "052-1234567",
        notes: "אבי האומה העברית, איש החסד והאמונה. נפטר בשיבה טובה ומנוחתו במערת המכפלה בחברון."
      },
      {
        id: 1718882041002,
        name: "שרה אמנו",
        gender: "female",
        fatherName: "הרן",
        motherName: "מלכה",
        day: 5,
        month: "אב",
        contactPhone: "050-9876543",
        notes: "אמינו הראשונה, סמל לצניעות, חסד והכנסת אורחים. נפטרה בקרית ארבע היא חברון."
      },
      {
        id: 1718882041003,
        name: "יוסף בן יעקב",
        gender: "male",
        fatherName: "יעקב",
        motherName: "רחל",
        day: 12,
        month: "אב",
        contactPhone: "054-1234567",
        notes: "יוסף הצדיק, משביר לכל עם הארץ, כלכל את משפחתו באהבה וברוך."
      },
      {
        id: 1718882041004,
        name: "לאה אמנו",
        gender: "female",
        fatherName: "לבן",
        motherName: "עדינה",
        day: 12,
        month: "אב",
        contactPhone: "053-9876543",
        notes: "אמינו השלישית, הקימה את רוב שבטי ישראל בתפילה ובדמעות."
      },
      {
        id: 1718882041005,
        name: "אלעזר בן אהרן",
        gender: "male",
        fatherName: "אהרן",
        motherName: "אלישבע",
        day: 14,
        month: "אב",
        contactPhone: "052-1111111",
        notes: "הכהן הגדול, מנהיג רוחני ומשרת בקודש בנאמנות ומסירות נפש."
      },
      {
        id: 1718882041006,
        name: "מרים הנביאה",
        gender: "female",
        fatherName: "עמרם",
        motherName: "יוכבד",
        day: 14,
        month: "אב",
        contactPhone: "050-2222222",
        notes: "אחות משה ואהרן, בזכותה היה לעם ישראל באר מים במדבר, מנהיגת הנשים."
      }
    ];
    fs.writeFileSync(DATABASE_FILE, JSON.stringify(seedData, null, 2), 'utf-8');
  }

  if (!fs.existsSync(MEMORIES_FILE)) {
    const seedMemories = [
      {
        id: 1,
        deceasedId: 1718882041001,
        visitorName: "יצחק",
        message: "נזכור תמיד את החסד והאמונה שהנחלת לנו, אבא יקר.",
        timestamp: new Date().toISOString()
      },
      {
        id: 2,
        deceasedId: 1718882041002,
        visitorName: "יצחק",
        message: "אמא אהובה, נזכור תמיד את טוב הלב והארת הפנים שלך.",
        timestamp: new Date().toISOString()
      }
    ];
    fs.writeFileSync(MEMORIES_FILE, JSON.stringify(seedMemories, null, 2), 'utf-8');
  }
}

// Lazy-initialized Gemini client to prevent startup crashes if GEMINI_API_KEY is missing
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is required but missing. Please set it in Settings > Secrets.');
  }

  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();

  // Middleware to parse JSON payloads
  app.use(express.json({ limit: '10mb' }));

  // Memory cache for translation results
  const translationMemoryCache = new Map<string, any>();

  // API Route: Translate Deceased Records dynamically
  app.post('/api/translate', async (req, res) => {
    try {
      const { deceasedList, targetLang } = req.body;

      if (!deceasedList || !Array.isArray(deceasedList)) {
        return res.status(400).json({ error: 'Invalid deceasedList. Expected an array.' });
      }

      if (!targetLang || !['he', 'en', 'ru'].includes(targetLang)) {
        return res.status(400).json({ error: 'Invalid targetLang. Expected "he", "en", or "ru".' });
      }

      // If list is empty, return empty immediately
      if (deceasedList.length === 0) {
        return res.json({ translatedList: [] });
      }

      // Fast memory cache check to prevent spending API tokens on identical requests
      const cacheKey = `${targetLang}_${JSON.stringify(deceasedList)}`;

      if (translationMemoryCache.has(cacheKey)) {
        return res.json({ translatedList: translationMemoryCache.get(cacheKey) });
      }

      let translatedList;
      try {
        const ai = getGeminiClient();

        // Formulate prompt
        const prompt = `You are a world-class genealogist, translator, and linguist specializing in Jewish family memorial records, names, surnames, and biographical text across Hebrew, English, and Russian.
Translate the following array of deceased memorial records into the target language: "${targetLang}".

Target Language Options:
- "he": Hebrew (עברית)
- "en": English
- "ru": Russian (Русский)

CRITICAL PRECISION RULES:
1. TRANSLATE AND TRANSLITERATE WITH 100% ACCURACY AND ZERO LOSS OF INFORMATION:
   - Deceased full name ('name'):
     * Hebrew -> Russian: Use standard Russian spelling conventions for Jewish names (e.g. "אברהם" -> "Авраам", "יצחק" -> "Исаак", "יעקב" -> "Иаков", "משה" -> "Моисей", "דוד" -> "Давид", "שמואל" -> "Самуил", "חיים" -> "Хаим", "ישראל" -> "Израиль", "שרה" -> "Сарра", "רחל" -> "Рахиль", "מרים" -> "Мириам", "אסתר" -> "Эстер", "חנה" -> "Анна", "ניסים" -> "Нисим", "גבריאל" -> "Гаבריэль", "פנחס" -> "Пинхас"). Surnames like "רובינוב" -> "Рубинов", "קטאייב" -> "Катаев", "פנחסוב" -> "Пинхасов", "ג'ורייב" -> "Джураев", "הכהן" -> "Ха-Коэн".
     * Russian -> Hebrew: Translate back to standard authentic Hebrew spelling (e.g. "Авраам" -> "אברהם", "Исаак" -> "יצחק", "Иосиф" -> "יוסף", "Давид" -> "דוד", "Хаим" -> "חיים", "Михаил" -> "מיכאל").
     * English -> Russian / Hebrew: Convert accurately based on phonetic and cultural equivalence.
   - Parent names ('fatherName', 'motherName'): Accurately translate/transliterate into "${targetLang}".
   - Life story / biography / notes ('notes'): MUST BE TRANSLATED conceptually ("הבנת הנקרא") into natural, fluent, grammatically correct prose in "${targetLang}". Do NOT transliterate Hebrew letters into Latin or Cyrillic characters phonetically! Translate the full meaning, sentence by sentence, preserving all details, family relationships, military service, and honorable descriptions.
   - Hebrew Month ('month'): Localize to standard spelling in "${targetLang}":
     * "he": תשרי, חשוון, כסלו, טבת, שבט, אדר א׳, אדר ב׳, ניסן, אייר, סיון, תמוז, אב, אלול
     * "en": Tishrei, Cheshvan, Kislev, Tevet, Shevat, Adar I, Adar II, Nisan, Iyar, Sivan, Tammuz, Av, Elul
     * "ru": Тишрей, Хешван, Кислев, Тевет, Шват, Адар I, Адар II, Нисан, Ияр, Сиван, Таммуз, Ав, Элул
2. STRICT DATA PRESERVATION:
   - Keep 'id', 'gender', 'day', 'contactPhone', and 'image' unchanged.

Input Records JSON:
${JSON.stringify(deceasedList, null, 2)}`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: prompt,
          config: {
            systemInstruction: 'You are a professional genealogist and translator specializing in translating Jewish memorial records, yahrzeits, names, and biographical logs between Hebrew, English, and Russian. Always return accurate, culturally appropriate conceptual translations and transliterations in raw JSON list format conforming to the requested schema.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.NUMBER },
                  name: { type: Type.STRING },
                  gender: { type: Type.STRING },
                  fatherName: { type: Type.STRING },
                  motherName: { type: Type.STRING },
                  day: { type: Type.NUMBER },
                  month: { type: Type.STRING },
                  contactPhone: { type: Type.STRING },
                  notes: { type: Type.STRING },
                  image: { type: Type.STRING }
                },
                required: ['id', 'name', 'gender', 'fatherName', 'motherName', 'day', 'month']
              }
            }
          }
        });

        const responseText = response.text;
        if (!responseText) {
          throw new Error('Gemini model returned an empty response.');
        }

        let cleanText = responseText.trim();
        if (cleanText.startsWith('```')) {
          const firstNewLine = cleanText.indexOf('\n');
          const lastBackticks = cleanText.lastIndexOf('```');
          if (firstNewLine !== -1 && lastBackticks !== -1 && lastBackticks > firstNewLine) {
            cleanText = cleanText.substring(firstNewLine + 1, lastBackticks).trim();
          } else {
            cleanText = cleanText.replace(/^```[a-zA-Z]*\s*/, '').replace(/\s*```$/, '').trim();
          }
        }

        translatedList = JSON.parse(cleanText);
      } catch (geminiError: any) {
        // Fallback gracefully to local high-precision dictionary/transliterated translation
        translatedList = translateDeceasedListClientSide(deceasedList, targetLang);
      }
      
      // Preserving exact original IDs, days, genders, contact info, images, and birth/age details
      if (Array.isArray(translatedList)) {
        if (translatedList.length === deceasedList.length) {
          translatedList = translatedList.map((item, index) => {
            const original = deceasedList[index];
            return {
              ...item,
              id: Number(original.id),
              gender: original.gender,
              day: Number(original.day),
              month: item.month || original.month,
              contactPhone: original.contactPhone,
              image: original.image,
              birthDate: original.birthDate,
              ageAtDeath: original.ageAtDeath
            };
          });
        } else {
          // Fallback matching logic if lengths differ
          translatedList = translatedList.map((item, index) => {
            const original = deceasedList[index] || deceasedList[0];
            if (original) {
              const matchedOriginal = deceasedList.find(d => Number(d.id) === Number(item.id)) || original;
              return {
                ...item,
                id: Number(matchedOriginal.id),
                gender: matchedOriginal.gender,
                day: Number(matchedOriginal.day),
                month: item.month || matchedOriginal.month,
                contactPhone: matchedOriginal.contactPhone,
                image: matchedOriginal.image,
                birthDate: matchedOriginal.birthDate,
                ageAtDeath: matchedOriginal.ageAtDeath
              };
            }
            return item;
          });
        }
      }

      if (Array.isArray(translatedList) && translatedList.length > 0) {
        translationMemoryCache.set(cacheKey, translatedList);
      }

      return res.json({ translatedList });

    } catch (error: any) {
      console.error('Error in /api/translate:', error);
      return res.status(500).json({ 
        error: error.message || 'Internal Server Error during translation.' 
      });
    }
  });

  // POST /api/translate-verses: Translate holy verses (Psalms, Mishnah) into target language (e.g. Russian, English)
  app.post('/api/translate-verses', async (req, res) => {
    try {
      const { verses, targetLang } = req.body;
      if (!verses || !Array.isArray(verses) || verses.length === 0) {
        return res.status(400).json({ error: 'Invalid verses array. Expected non-empty array.' });
      }
      if (!targetLang || !['he', 'en', 'ru'].includes(targetLang)) {
        return res.status(400).json({ error: 'Invalid targetLang.' });
      }

      if (targetLang === 'he') {
        return res.json({ translatedVerses: verses });
      }

      const langName = targetLang === 'ru' ? 'Russian' : 'English';

      try {
        const ai = getGeminiClient();
        const prompt = `Translate and phonetically transliterate the following Jewish sacred texts/verses (Psalms, Mishnah, Torah readings) into ${langName}.
Maintain exact 1-to-1 array order matching input verses.

Target Language: ${langName} (${targetLang})

Input Verses JSON:
${JSON.stringify(verses, null, 2)}`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: prompt,
          config: {
            systemInstruction: `You are an expert scholar, translator, and linguist of classical Jewish sacred texts (Tehillim / Psalms, Mishnah, Siddur prayers) into ${langName}.
Your duties:
1. "translatedVerses": Provide a clear, dignified, classical translation of each verse into ${langName} (e.g. standard canonical Russian translation for Psalms or JPS English translation).
2. "transliteratedVerses": Provide an accurate phonetic transliteration of the original Hebrew pronunciation using ${targetLang === 'ru' ? 'Russian Cyrillic letters (e.g., "Mizmor le-David, Adonai roi lo echsar...")' : 'English Latin letters (e.g., "Mizmor le-David, Adonai roi lo echsar...")'} so readers can recite the Hebrew words accurately.
3. Keep array lengths and verse order 1-to-1 matched with input.`,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                translatedVerses: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                },
                transliteratedVerses: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                }
              },
              required: ['translatedVerses', 'transliteratedVerses']
            }
          }
        });

        const responseText = response.text?.trim() || '';
        let cleanText = responseText;
        if (cleanText.startsWith('```')) {
          cleanText = cleanText.replace(/^```[a-zA-Z]*\s*/, '').replace(/\s*```$/, '').trim();
        }

        const parsed = JSON.parse(cleanText);
        if (Array.isArray(parsed)) {
          return res.json({ translatedVerses: parsed, transliteratedVerses: [] });
        }
        return res.json({
          translatedVerses: parsed.translatedVerses || verses,
          transliteratedVerses: parsed.transliteratedVerses || []
        });
      } catch (geminiError: any) {
        // Fallback gracefully if Gemini is unavailable
        return res.json({ translatedVerses: verses, transliteratedVerses: [] });
      }
    } catch (error: any) {
      console.error('Error in /api/translate-verses:', error);
      return res.status(500).json({ error: 'Failed to translate verses' });
    }
  });

  // POST /api/ai-refine-notes: AI-driven translation, refinement, and grammar check for deceased life story / notes
  app.post('/api/ai-refine-notes', async (req, res) => {
    try {
      const { name, fatherName, motherName, gender, notes, targetLang } = req.body;
      const lang = targetLang || 'he';

      try {
        const ai = getGeminiClient();

        const prompt = `You are a master genealogist, biographer, and expert Hebrew/English/Russian translator specializing in Jewish memorial records and family biographies (לזכר עולמים).
The user wants to polish, grammatically correct, format, and translate the life story / biography / notes for a deceased person:
Deceased Name: ${name || ''}
Father's Name: ${fatherName || ''}
Mother's Name: ${motherName || ''}
Gender: ${gender || 'male'}
Input Text: "${notes || ''}"
Active Interface Language: "${lang}" (he=Hebrew, en=English, ru=Russian)

TASKS:
1. If the input text is empty or brief, write a dignified, moving, respectful 2-3 sentence memorial biography based on their name and family relations.
2. Fix all typos, grammatical mistakes, formatting errors, and awkward phrasing.
3. Ensure the text flows gracefully in dignified memorial prose.
4. Provide the exact polished text in the requested target language (${lang === 'he' ? 'Hebrew' : lang === 'ru' ? 'Russian' : 'English'}).

Return a JSON object with a single string property "refinedNotes".`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: prompt,
          config: {
            systemInstruction: 'You are an expert biographer and translator for Jewish memorial records. Return valid JSON only.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                refinedNotes: { type: Type.STRING }
              },
              required: ['refinedNotes']
            }
          }
        });

        const responseText = response.text?.trim() || '';
        let cleanText = responseText;
        if (cleanText.startsWith('```')) {
          cleanText = cleanText.replace(/^```[a-zA-Z]*\s*/, '').replace(/\s*```$/, '').trim();
        }

        const parsed = JSON.parse(cleanText);
        return res.json({ refinedNotes: parsed.refinedNotes || notes });
      } catch (geminiError: any) {
        console.error('Gemini error in /api/ai-refine-notes:', geminiError);
        return res.json({ refinedNotes: notes, warning: 'Gemini unavailable, returning original text.' });
      }
    } catch (error: any) {
      console.error('Error in /api/ai-refine-notes:', error);
      return res.status(500).json({ error: 'Failed to refine notes' });
    }
  });

  // GET Deceased list from server-side database
  app.get('/api/deceased', (req, res) => {
    try {
      initDatabaseFiles();
      const data = fs.readFileSync(DATABASE_FILE, 'utf-8');
      res.json(JSON.parse(data));
    } catch (error: any) {
      console.error("Error reading deceased list:", error);
      res.status(500).json({ error: "Failed to read database" });
    }
  });

  // DELETE Deceased database (Reset entire system)
  app.delete('/api/deceased', (req, res) => {
    try {
      initDatabaseFiles();
      fs.writeFileSync(DATABASE_FILE, JSON.stringify([], null, 2), 'utf-8');
      fs.writeFileSync(MEMORIES_FILE, JSON.stringify([], null, 2), 'utf-8');
      res.json({ success: true, message: "Database reset completed successfully" });
    } catch (error: any) {
      console.error("Error resetting database:", error);
      res.status(500).json({ error: "Failed to reset database" });
    }
  });

  // POST Deceased (Add or update record)
  app.post('/api/deceased', (req, res) => {
    try {
      initDatabaseFiles();
      const record = req.body;
      if (!record || !record.id || !record.name) {
        return res.status(400).json({ error: "Invalid record. Must contain id and name." });
      }

      const currentData = JSON.parse(fs.readFileSync(DATABASE_FILE, 'utf-8'));
      const index = currentData.findIndex((item: any) => item.id === record.id);
      if (index !== -1) {
        currentData[index] = record;
      } else {
        currentData.push(record);
      }

      fs.writeFileSync(DATABASE_FILE, JSON.stringify(currentData, null, 2), 'utf-8');
      translationMemoryCache.clear();
      res.json({ success: true, record });
    } catch (error: any) {
      console.error("Error saving deceased record:", error);
      res.status(500).json({ error: "Failed to save record" });
    }
  });

  // DELETE Deceased record
  app.delete('/api/deceased/:id', (req, res) => {
    try {
      initDatabaseFiles();
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid id" });
      }

      const currentData = JSON.parse(fs.readFileSync(DATABASE_FILE, 'utf-8'));
      const updated = currentData.filter((item: any) => Number(item.id) !== Number(id));
      fs.writeFileSync(DATABASE_FILE, JSON.stringify(updated, null, 2), 'utf-8');
      translationMemoryCache.clear();

      // Also clean up any memories for this deceased person
      if (fs.existsSync(MEMORIES_FILE)) {
        const memories = JSON.parse(fs.readFileSync(MEMORIES_FILE, 'utf-8'));
        const remainingMemories = memories.filter((m: any) => Number(m.deceasedId) !== Number(id));
        fs.writeFileSync(MEMORIES_FILE, JSON.stringify(remainingMemories, null, 2), 'utf-8');
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting deceased record:", error);
      res.status(500).json({ error: "Failed to delete record" });
    }
  });

  // POST Bulk Import Deceased
  app.post('/api/deceased/import', (req, res) => {
    try {
      initDatabaseFiles();
      const records = req.body;
      if (!records || !Array.isArray(records)) {
        return res.status(400).json({ error: "Expected array of records" });
      }

      const currentData = JSON.parse(fs.readFileSync(DATABASE_FILE, 'utf-8'));
      // Filter out duplicates based on id
      const newRecords = records.filter(r => !currentData.some((c: any) => c.id === r.id));
      const updated = [...currentData, ...newRecords];

      fs.writeFileSync(DATABASE_FILE, JSON.stringify(updated, null, 2), 'utf-8');
      res.json({ success: true, count: newRecords.length });
    } catch (error: any) {
      console.error("Error importing deceased records:", error);
      res.status(500).json({ error: "Failed to import records" });
    }
  });

  // GET Memories for deceased
  app.get('/api/memories', (req, res) => {
    try {
      initDatabaseFiles();
      const deceasedIdStr = req.query.deceasedId as string;
      const allMemories = JSON.parse(fs.readFileSync(MEMORIES_FILE, 'utf-8'));
      
      if (deceasedIdStr) {
        const filtered = allMemories.filter((m: any) => Number(m.deceasedId) === Number(deceasedIdStr));
        return res.json(filtered);
      }
      res.json(allMemories);
    } catch (error: any) {
      console.error("Error reading memories:", error);
      res.status(500).json({ error: "Failed to read memories" });
    }
  });

  // POST New Memory / Candle
  app.post('/api/memories', (req, res) => {
    try {
      initDatabaseFiles();
      const { deceasedId, visitorName, message } = req.body;
      if (!deceasedId || !visitorName || !message) {
        return res.status(400).json({ error: "Missing required fields: deceasedId, visitorName, message" });
      }

      const allMemories = JSON.parse(fs.readFileSync(MEMORIES_FILE, 'utf-8'));
      const newMemory = {
        id: Date.now(),
        deceasedId: Number(deceasedId),
        visitorName,
        message,
        timestamp: new Date().toISOString()
      };

      allMemories.push(newMemory);
      fs.writeFileSync(MEMORIES_FILE, JSON.stringify(allMemories, null, 2), 'utf-8');
      res.json(newMemory);
    } catch (error: any) {
      console.error("Error saving memory:", error);
      res.status(500).json({ error: "Failed to save memory" });
    }
  });

  // Route to serve the standalone, self-contained single-file HTML version
  app.get('/index_single.html', async (req, res) => {
    try {
      const distPath = path.join(process.cwd(), 'dist');
      const distIndexPath = path.join(distPath, 'index.html');

      // Only run programmatic build in development, and cache for 15 seconds
      const isProduction = process.env.NODE_ENV === 'production';
      const lastBuildTime = (global as any).lastBuildTime || 0;
      const shouldBuild = !isProduction && (Date.now() - lastBuildTime > 15000);

      if (shouldBuild) {
        console.log("Generating up-to-date standalone HTML. Compiling client production bundle...");
        try {
          execSync('npx vite build', { cwd: process.cwd() });
          console.log("Client production bundle compiled successfully.");
          (global as any).lastBuildTime = Date.now();
        } catch (buildError: any) {
          console.error("Warning: Programmatic client build failed. Falling back to existing dist files if available.", buildError);
        }
      } else {
        if (isProduction) {
          console.log("Running in production. Serving pre-compiled standalone HTML directly.");
        } else {
          console.log("Using recently compiled client production bundle to save time.");
        }
      }

      if (!fs.existsSync(distIndexPath)) {
        return res.status(500).send("Error: Production build files not found. Please compile the application first.");
      }

      let html = fs.readFileSync(distIndexPath, 'utf-8');

      // 1. Read current database and memories content
      initDatabaseFiles();
      const databaseData = fs.readFileSync(DATABASE_FILE, 'utf-8');
      const memoriesData = fs.readFileSync(MEMORIES_FILE, 'utf-8');

      // Escape </script> within data to prevent breaking the container tag
      const safeDatabaseData = databaseData.replace(/<\/script>/gi, '<\\/script>');
      const safeMemoriesData = memoriesData.replace(/<\/script>/gi, '<\\/script>');

      // 2. Embed the offline data in the HTML header (done first when there is only one real </head> tag)
      const dataInjectionScript = `
  <script>
    window.__OFFLINE_DATABASE_DATA__ = ${safeDatabaseData};
    window.__OFFLINE_MEMORIES_DATA__ = ${safeMemoriesData};
    console.log("Offline database and memories loaded successfully.");
  </script>
`;
      // Use callback function to avoid RangeError / dollar sign ($) expansion in JS source code or database
      html = html.replace('</head>', () => `${dataInjectionScript}\n</head>`);

      // 3. Find and inline JS module script tags pointing to assets
      const scriptRegex = /<script\b[^>]*src="\/assets\/([^"]+)"[^>]*><\/script>/g;
      html = html.replace(scriptRegex, (match, scriptFilename) => {
        const scriptPath = path.join(distPath, 'assets', scriptFilename);
        if (fs.existsSync(scriptPath)) {
          const scriptBuffer = fs.readFileSync(scriptPath);
          const base64Content = scriptBuffer.toString('base64');
          return `
  <script type="module">
    (function() {
      const b64 = "${base64Content}";
      const bin = atob(b64);
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) {
        arr[i] = bin.charCodeAt(i);
      }
      const blob = new Blob([arr], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);
      const script = document.createElement('script');
      script.type = 'module';
      script.src = url;
      document.head.appendChild(script);
    })();
  </script>`;
        }
        return match;
      });

      // 4. Find and inline CSS stylesheet link tags pointing to assets
      const cssRegex = /<link\b[^>]*href="\/assets\/([^"]+)"[^>]*>/g;
      html = html.replace(cssRegex, (match, cssFilename) => {
        if (cssFilename.endsWith('.css')) {
          const cssPath = path.join(distPath, 'assets', cssFilename);
          if (fs.existsSync(cssPath)) {
            const cssContent = fs.readFileSync(cssPath, 'utf-8');
            return `<style>${cssContent}</style>`;
          }
        }
        return match;
      });

      // Set response headers to force file download of "index.html"
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="index_single.html"');
      res.send(html);

    } catch (error: any) {
      console.error("Error generating standalone HTML:", error);
      res.status(500).send(`Failed to compile standalone HTML: ${error.message}`);
    }
  });

  // Route handler for short memorial links /m/:id and /p/:id with OpenGraph meta tags injection
  let viteDevServer: any = null;

  if (process.env.NODE_ENV !== 'production') {
    viteDevServer = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
  }

  app.get(['/', '/index.html', '/m/:id', '/p/:id', '/m/:id.html', '/p/:id.html'], async (req, res, next) => {
    try {
      let rawId = req.params.id ? req.params.id.replace(/\.html$/i, '') : null;
      if (!rawId) {
        rawId = (req.query.d || req.query.deceased || req.query.id) as string;
      }
      const id = rawId ? parseInt(rawId, 10) : NaN;

      initDatabaseFiles();
      let db: any[] = [];
      try {
        const dbRaw = fs.readFileSync(DATABASE_FILE, 'utf-8');
        db = JSON.parse(dbRaw);
      } catch (e) {
        db = [];
      }

      const deceased = !isNaN(id) ? db.find((item: any) => Number(item.id) === id) : null;

      const htmlPath = process.env.NODE_ENV === 'production'
        ? path.join(process.cwd(), 'dist', 'index.html')
        : path.join(process.cwd(), 'index.html');

      if (fs.existsSync(htmlPath)) {
        let html = fs.readFileSync(htmlPath, 'utf-8');
        if (process.env.NODE_ENV !== 'production' && viteDevServer) {
          html = await viteDevServer.transformIndexHtml(req.originalUrl, html);
        }

        if (deceased) {
          const name = deceased.name || 'נפטר/ת';
          const title = `🕯️ לזכר עולמים - ${name} ז״ל`;
          const description = `דף הנצחה וזיכרון לעילוי נשמת ${name}. נפטר/ה ב-${deceased.day} ב${deceased.month}. לחצו לצפייה בלוח המודעה, הדלקת נר נשמה ולימוד תהילים.`;
          const currentUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;

          const ogTags = `
    <title>${title}</title>
    <meta name="description" content="${description}">
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${currentUrl}" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
          `;

          // Replace existing title and inject metadata into head
          html = html.replace(/<title>.*?<\/title>/gi, '');
          html = html.replace('</head>', `${ogTags}\n</head>`);
        }

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.send(html);
      }
    } catch (err) {
      console.error("Error serving short memorial page route:", err);
    }

    if (process.env.NODE_ENV === 'production') {
      const prodIndex = path.join(process.cwd(), 'dist', 'index.html');
      if (fs.existsSync(prodIndex)) {
        return res.sendFile(prodIndex);
      }
    }
    next();
  });

  // Serve static assets / handle SPA routing
  if (process.env.NODE_ENV !== 'production') {
    app.use(viteDevServer.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start full-stack server:', err);
});
