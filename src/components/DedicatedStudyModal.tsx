/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Deceased, Language } from '../types';
import { X, BookOpen, RefreshCw, Flame, Heart, Sparkles, ScrollText, BookMarked } from 'lucide-react';
import { 
  getRandomGeneralMishnah, 
  getRandomPirkeiAvot, 
  getRandomPsalm, 
  getRandomHalakha, 
  MishnahRecord, 
  PsalmRecord, 
  HalakhaRecord 
} from '../utils/memorialStudy';
import { FullReadingModal } from './FullReadingModal';
import { formatParentRelation } from '../utils/translations';
import { getLocalizedName } from '../utils/transliteration';
import { DeceasedPhotoFrame } from './YahrzeitCandle';

interface DedicatedStudyModalProps {
  deceased: Deceased;
  lang: Language;
  onClose: () => void;
}

export const DedicatedStudyModal: React.FC<DedicatedStudyModalProps> = ({ deceased, lang, onClose }) => {
  const [activeMishnah, setActiveMishnah] = useState<MishnahRecord>(() => getRandomGeneralMishnah());
  const [activeAvot, setActiveAvot] = useState<MishnahRecord>(() => getRandomPirkeiAvot());
  const [activePsalm, setActivePsalm] = useState<PsalmRecord>(() => getRandomPsalm());
  const [activeHalakha, setActiveHalakha] = useState<HalakhaRecord>(() => getRandomHalakha());

  const [readingSefariaRef, setReadingSefariaRef] = useState<string | null>(null);
  const [readingTitle, setReadingTitle] = useState<string>('');

  const parentRelation = formatParentRelation(deceased.gender, deceased.fatherName, deceased.motherName, lang);

  const getMishnahSefariaRef = (mishnah: MishnahRecord): string => {
    return mishnah.reference.en;
  };

  return (
    <div className="fixed inset-0 bg-[#3B2F2F]/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto font-sans">
      <div 
        className="bg-[#FFFDF8] border border-[#D8CFC0] rounded-3xl max-w-2xl w-full text-[#3B2F2F] shadow-xl overflow-hidden relative my-8 animate-in fade-in zoom-in-95 duration-200"
        dir={lang === 'he' ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="bg-[#F8F2E4] border-b border-[#D8CFC0] p-5 relative flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 flex-1 min-w-0">
            <DeceasedPhotoFrame deceased={deceased} size="card" lang={lang} />
            <div className="min-w-0 flex-1">
              <div className="inline-flex items-center gap-1.5 bg-[#5D6D53]/10 border border-[#5D6D53]/20 px-2.5 py-0.5 rounded-full text-[11px] font-bold text-[#5D6D53] mb-1">
                <Sparkles className="w-3 h-3 text-[#5D6D53]" />
                <span>{lang === 'he' ? 'חלון לימוד ייעודי לעילוי נשמה' : lang === 'ru' ? 'Изучение Торы в память' : 'Dedicated Soul Study'}</span>
              </div>
              <h2 className="text-xl md:text-2xl font-serif font-bold text-[#3B2F2F] truncate">
                {lang === 'he' ? `לימוד לעילוי נשמת ${getLocalizedName(deceased, lang)}` : lang === 'ru' ? `Изучение в память: ${getLocalizedName(deceased, lang)}` : `Torah Study for ${getLocalizedName(deceased, lang)}`}
              </h2>
              {parentRelation && (
                <p className="text-xs text-[#5D6D53] font-medium truncate">
                  {parentRelation}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[#EFE8DC] hover:bg-[#E8E2D5] border border-[#D8CFC0] text-[#3B2F2F] flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title={lang === 'he' ? 'סגירה' : 'Close'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto custom-scrollbar">

          {/* Intro Notice */}
          <div className="bg-[#EFE8DC] border border-[#D8CFC0] rounded-2xl p-3.5 text-center space-y-1">
            <p className="text-xs md:text-sm font-semibold text-[#3B2F2F]">
              {lang === 'he' 
                ? `מצוה רבה ללמוד משנה, תהלים ופרקי אבות לעילוי נשמת המנוח/ה ${getLocalizedName(deceased, lang)} תנצ"בה`
                : `Reciting Mishnah, Psalms and Pirkei Avot elevates the soul of ${getLocalizedName(deceased, lang)}`}
            </p>
            <p className="text-[11px] text-[#6B5E53]">
              {lang === 'he' ? 'חכמים אמרו: "משנ"ה אותיות נשמ"ה" - הלימוד מאיר את נשמת הנפטר בגנזי מרומים' : 'Our sages teach that "Mishnah" contains the same letters as "Neshama" (Soul).'}
            </p>
          </div>

          {/* 1. Mishnah Section */}
          <div className="space-y-2 bg-[#FAF5EC] p-4 rounded-2xl border border-[#D8CFC0] relative overflow-hidden shadow-xs">
            <div className="flex justify-between items-center border-b border-[#D8CFC0] pb-2">
              <span className="text-[#5D6D53] font-bold text-sm flex items-center gap-2">
                <BookMarked className="w-4 h-4 text-[#5D6D53]" />
                <span>{lang === 'he' ? 'משנה לעילוי נשמה' : lang === 'ru' ? 'Мишна для Души' : 'Mishnah for the Soul'}</span>
              </span>
              <span className="text-xs text-[#6B5E53] font-medium bg-[#EFE8DC] px-2 py-0.5 rounded border border-[#D8CFC0]">
                {activeMishnah.reference[lang]}
              </span>
            </div>

            {(() => {
              const snippetMain = activeMishnah.text[lang] || activeMishnah.text.he;
              const snippetMainDisplay = snippetMain.length > 150 ? snippetMain.substring(0, 150) + "..." : snippetMain;
              const snippetHeDisplay = activeMishnah.text.he.length > 150 ? activeMishnah.text.he.substring(0, 150) + "..." : activeMishnah.text.he;
              return (
                <>
                  <div 
                    onClick={() => {
                      const ref = getMishnahSefariaRef(activeMishnah);
                      setReadingSefariaRef(ref);
                      setReadingTitle(activeMishnah.reference[lang]);
                    }}
                    className="text-sm md:text-base font-sans font-semibold text-[#3B2F2F] text-center leading-relaxed py-3.5 bg-[#EFE8DC] px-4 rounded-xl border border-[#D8CFC0] cursor-pointer hover:border-[#5D6D53] transition-all flex flex-col items-center gap-2 shadow-xs" 
                    dir={lang === 'he' ? 'rtl' : 'ltr'}
                    title={lang === 'he' ? 'לחץ לקריאת המשנה המלאה' : 'Click to read full Mishnah'}
                  >
                    <span>{snippetMainDisplay}</span>
                    <span className="text-xs text-[#5D6D53] font-sans font-bold bg-[#FAF5EC] px-3 py-1 rounded-full border border-[#D8CFC0] shadow-xs">
                      {lang === 'he' ? 'לחץ לקריאת המשנה המלאה ➔' : 'Click to read full text ➔'}
                    </span>
                  </div>

                  {lang !== 'he' && (
                    <div className="pt-2 border-t border-[#D8CFC0] text-right" dir="rtl">
                      <span className="text-[10px] text-[#5D6D53] font-bold block mb-0.5">מקור בעברית:</span>
                      <p className="font-serif text-[#3B2F2F] text-xs leading-relaxed">{snippetHeDisplay}</p>
                    </div>
                  )}
                </>
              );
            })()}

            <div className="text-xs text-[#6B5E53] space-y-1 leading-relaxed bg-[#EFE8DC] p-2.5 rounded-xl border border-[#D8CFC0]">
              <span className="text-[#5D6D53] font-bold text-xs block mb-0.5">ביאור ופרוש:</span>
              <p className="text-[#3B2F2F] text-xs">{activeMishnah.explanation[lang]}</p>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  const ref = getMishnahSefariaRef(activeMishnah);
                  setReadingSefariaRef(ref);
                  setReadingTitle(activeMishnah.reference[lang]);
                }}
                className="flex-1 flex items-center justify-center gap-2 bg-[#5D6D53] hover:bg-[#4F5D46] text-white text-xs font-bold py-2 px-3 rounded-xl transition-all cursor-pointer shadow-xs"
              >
                <BookOpen className="w-4 h-4 text-white" />
                <span>{lang === 'he' ? 'קריאת המשנה המלאה' : 'Read Full Mishnah'}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveMishnah(getRandomGeneralMishnah())}
                className="bg-[#EFE8DC] hover:bg-[#E8E2D5] border border-[#D8CFC0] text-[#3B2F2F] text-xs font-bold py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                title="משנה אקראית נוספת"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#5D6D53]" />
                <span>{lang === 'he' ? 'משנה נוספת' : 'Next'}</span>
              </button>
            </div>
          </div>

          {/* 2. Pirkei Avot Section */}
          <div className="space-y-2 bg-[#FAF5EC] p-4 rounded-2xl border border-[#D8CFC0] relative overflow-hidden shadow-xs">
            <div className="flex justify-between items-center border-b border-[#D8CFC0] pb-2">
              <span className="text-[#5D6D53] font-bold text-sm flex items-center gap-2">
                <ScrollText className="w-4 h-4 text-[#5D6D53]" />
                <span>{lang === 'he' ? 'פרקי אבות לעילוי נשמה' : 'Pirkei Avot'}</span>
              </span>
              <span className="text-xs text-[#6B5E53] font-medium bg-[#EFE8DC] px-2 py-0.5 rounded border border-[#D8CFC0]">
                {activeAvot.reference[lang]}
              </span>
            </div>

            {(() => {
              const snippetMain = activeAvot.text[lang] || activeAvot.text.he;
              const snippetMainDisplay = snippetMain.length > 150 ? snippetMain.substring(0, 150) + "..." : snippetMain;
              return (
                <div 
                  onClick={() => {
                    const ref = getMishnahSefariaRef(activeAvot);
                    setReadingSefariaRef(ref);
                    setReadingTitle(activeAvot.reference[lang]);
                  }}
                  className="text-sm md:text-base font-sans font-semibold text-[#3B2F2F] text-center leading-relaxed py-3.5 bg-[#EFE8DC] px-4 rounded-xl border border-[#D8CFC0] cursor-pointer hover:border-[#5D6D53] transition-all flex flex-col items-center gap-2 shadow-xs" 
                  dir={lang === 'he' ? 'rtl' : 'ltr'}
                >
                  <span>{snippetMainDisplay}</span>
                  <span className="text-xs text-[#5D6D53] font-sans font-bold bg-[#FAF5EC] px-3 py-1 rounded-full border border-[#D8CFC0]">
                    {lang === 'he' ? 'לחץ להמשך לקריאת פרקי אבות המלאים ➔' : 'Click to continue ➔'}
                  </span>
                </div>
              );
            })()}

            <div className="text-xs text-[#6B5E53] space-y-1 leading-relaxed bg-[#EFE8DC] p-2.5 rounded-xl border border-[#D8CFC0]">
              <span className="text-[#5D6D53] font-bold text-xs block mb-0.5">ביאור ופרוש:</span>
              <p className="text-[#3B2F2F] text-xs">{activeAvot.explanation[lang]}</p>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  const ref = getMishnahSefariaRef(activeAvot);
                  setReadingSefariaRef(ref);
                  setReadingTitle(activeAvot.reference[lang]);
                }}
                className="flex-1 flex items-center justify-center gap-2 bg-[#5D6D53] hover:bg-[#4F5D46] text-white text-xs font-bold py-2 px-3 rounded-xl transition-all cursor-pointer shadow-xs"
              >
                <BookOpen className="w-4 h-4 text-white" />
                <span>{lang === 'he' ? 'קריאת פרקי אבות המלאים' : 'Read Full Pirkei Avot'}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveAvot(getRandomPirkeiAvot())}
                className="bg-[#EFE8DC] hover:bg-[#E8E2D5] border border-[#D8CFC0] text-[#3B2F2F] text-xs font-bold py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#5D6D53]" />
                <span>{lang === 'he' ? 'משנה נוספת' : 'Next'}</span>
              </button>
            </div>
          </div>

          {/* 3. Psalms Section */}
          <div className="space-y-2 bg-[#FAF5EC] p-4 rounded-2xl border border-[#D8CFC0] relative overflow-hidden shadow-xs">
            <div className="flex justify-between items-center border-b border-[#D8CFC0] pb-2">
              <span className="text-[#5D6D53] font-bold text-sm flex items-center gap-2">
                <Heart className="w-4 h-4 text-[#5D6D53] fill-[#5D6D53]/20" />
                <span>{lang === 'he' ? 'מזמור תהלים לעילוי נשמה' : 'Psalm for Soul Elevation'}</span>
              </span>
              <span className="text-xs text-[#5D6D53] font-bold bg-[#EFE8DC] px-2.5 py-0.5 rounded border border-[#D8CFC0]">
                {activePsalm.title[lang]}
              </span>
            </div>

            <div 
              onClick={() => {
                setReadingSefariaRef(`Psalms ${activePsalm.chapter}`);
                setReadingTitle(activePsalm.title[lang]);
              }}
              className="text-sm font-serif font-bold text-[#3B2F2F] text-center leading-relaxed py-3.5 bg-[#EFE8DC] px-4 rounded-xl border border-[#D8CFC0] cursor-pointer hover:border-[#5D6D53] transition-all flex flex-col items-center gap-2"
              dir="rtl"
            >
              <span>{activePsalm.text.he.substring(0, 160)}...</span>
              <span className="text-xs text-[#5D6D53] font-sans font-bold bg-[#FAF5EC] px-3 py-1 rounded-full border border-[#D8CFC0]">
                {lang === 'he' ? 'לחץ לקריאת המזמור המלא בתהלים ➔' : 'Click to read full Psalm ➔'}
              </span>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setReadingSefariaRef(`Psalms ${activePsalm.chapter}`);
                  setReadingTitle(activePsalm.title[lang]);
                }}
                className="flex-1 flex items-center justify-center gap-2 bg-[#5D6D53] hover:bg-[#4F5D46] text-white text-xs font-bold py-2 px-3 rounded-xl transition-all cursor-pointer shadow-xs"
              >
                <BookOpen className="w-4 h-4 text-white" />
                <span>{lang === 'he' ? 'קריאת המזמור המלא' : 'Read Full Psalm'}</span>
              </button>
              <button
                type="button"
                onClick={() => setActivePsalm(getRandomPsalm())}
                className="bg-[#EFE8DC] hover:bg-[#E8E2D5] border border-[#D8CFC0] text-[#3B2F2F] text-xs font-bold py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#5D6D53]" />
                <span>{lang === 'he' ? 'מזמור נוסף' : 'Next'}</span>
              </button>
            </div>
          </div>

          {/* 4. Halakha Section */}
          <div className="space-y-2 bg-[#FAF5EC] p-4 rounded-2xl border border-[#D8CFC0] shadow-xs">
            <div className="flex justify-between items-center border-b border-[#D8CFC0] pb-2">
              <span className="text-[#5D6D53] font-bold text-sm flex items-center gap-2">
                <span>⚖️</span>
                <span>{lang === 'he' ? 'הלכת היום במנהגי זיכרון ואבלות' : 'Daily Halakha on Remembrance'}</span>
              </span>
              <span className="text-xs text-[#6B5E53] font-medium">
                {activeHalakha.reference[lang]}
              </span>
            </div>

            <p className="text-xs md:text-sm font-sans text-[#3B2F2F] leading-relaxed bg-[#EFE8DC] p-3 rounded-xl border border-[#D8CFC0]" dir={lang === 'he' ? 'rtl' : 'ltr'}>
              {activeHalakha.text[lang]}
            </p>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setActiveHalakha(getRandomHalakha())}
                className="bg-[#EFE8DC] hover:bg-[#E8E2D5] border border-[#D8CFC0] text-[#3B2F2F] text-xs font-bold py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#5D6D53]" />
                <span>{lang === 'he' ? 'הלכה נוספת' : 'Next Halakha'}</span>
              </button>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-[#F8F2E4] border-t border-[#D8CFC0] p-4 flex justify-between items-center">
          <span className="text-xs text-[#5D6D53] font-bold flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-[#D4AF37] fill-[#D4AF37]" />
            <span>{lang === 'he' ? `תנצ"בָה - תהא נשמת ${getLocalizedName(deceased, lang)} צרורה בצרור החיים` : 'May their memory be a blessing'}</span>
          </span>

          <button
            type="button"
            onClick={onClose}
            className="bg-[#5D6D53] hover:bg-[#4F5D46] text-white font-bold px-5 py-2 rounded-xl text-xs shadow-xs transition-all cursor-pointer"
          >
            {lang === 'he' ? 'סגירה' : 'Close'}
          </button>
        </div>
      </div>

      {/* Sefaria Full Text Reader Modal */}
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
