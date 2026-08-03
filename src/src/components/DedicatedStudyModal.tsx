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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div 
        className="bg-[#1c150c] border-2 border-[#c8a96e] rounded-2xl max-w-2xl w-full text-[#f0f4f8] shadow-2xl overflow-hidden relative my-8 animate-in fade-in zoom-in-95 duration-200"
        dir={lang === 'he' ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-950 via-[#2a1c0d] to-amber-950 border-b border-[#c8a96e]/30 p-5 relative flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 flex-1 min-w-0">
            {deceased.image ? (
              <img 
                src={deceased.image} 
                alt={deceased.name} 
                referrerPolicy="no-referrer"
                className="w-14 h-14 rounded-full object-cover border-2 border-amber-400/80 shadow-md shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-amber-500/20 border-2 border-amber-400/60 flex items-center justify-center text-2xl shrink-0 shadow-inner">
                🕯️
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="inline-flex items-center gap-1.5 bg-amber-500/20 border border-amber-400/40 px-2.5 py-0.5 rounded-full text-[11px] font-bold text-amber-300 mb-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>{lang === 'he' ? 'חלון לימוד ייעודי לעילוי נשמה' : lang === 'ru' ? 'Изучение Торы в память' : 'Dedicated Soul Study'}</span>
              </div>
              <h2 className="text-xl md:text-2xl font-serif font-black text-amber-100 truncate">
                {lang === 'he' ? `לימוד לעילוי נשמת ${deceased.name}` : lang === 'ru' ? `Изучение в память: ${deceased.name}` : `Torah Study for ${deceased.name}`}
              </h2>
              {parentRelation && (
                <p className="text-xs text-[#c8a96e] font-medium truncate">
                  {parentRelation}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-black/40 hover:bg-black/70 border border-[#c8a96e]/30 text-[#c8a96e] hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title={lang === 'he' ? 'סגירה' : 'Close'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto custom-scrollbar">

          {/* Intro Notice */}
          <div className="bg-amber-950/40 border border-amber-500/30 rounded-xl p-3.5 text-center space-y-1">
            <p className="text-xs md:text-sm font-semibold text-amber-200">
              {lang === 'he' 
                ? `מצוה רבה ללמוד משנה, תהלים ופרקי אבות לעילוי נשמת המנוח/ה ${deceased.name} תנצ"בה`
                : `Reciting Mishnah, Psalms and Pirkei Avot elevates the soul of ${deceased.name}`}
            </p>
            <p className="text-[11px] text-amber-300/80">
              {lang === 'he' ? 'חכמים אמרו: "משנ"ה אותיות נשמ"ה" - הלימוד מאיר את נשמת הנפטר בגנזי מרומים' : 'Our sages teach that "Mishnah" contains the same letters as "Neshama" (Soul).'}
            </p>
          </div>

          {/* 1. Mishnah Section */}
          <div className="space-y-2 bg-black/40 p-4 rounded-xl border border-[#c8a96e]/20 relative overflow-hidden shadow-md">
            <div className="flex justify-between items-center border-b border-[#c8a96e]/15 pb-2">
              <span className="text-[#c8a96e] font-extrabold text-sm flex items-center gap-2">
                <BookMarked className="w-4 h-4 text-amber-400" />
                <span>{lang === 'he' ? 'משנה לעילוי נשמה' : lang === 'ru' ? 'Мишна для Души' : 'Mishnah for the Soul'}</span>
              </span>
              <span className="text-xs text-gray-400 font-medium bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
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
                    className="text-sm md:text-base font-sans font-semibold text-white text-center leading-relaxed py-3.5 bg-amber-500/10 px-4 rounded-lg border border-amber-500/20 cursor-pointer hover:border-[#c8a96e] hover:bg-amber-500/20 transition-all flex flex-col items-center gap-2 shadow-sm" 
                    dir={lang === 'he' ? 'rtl' : 'ltr'}
                    title={lang === 'he' ? 'לחץ לקריאת המשנה המלאה' : 'Click to read full Mishnah'}
                  >
                    <span>{snippetMainDisplay}</span>
                    <span className="text-xs text-[#c8a96e] font-sans font-bold bg-[#c8a96e]/15 px-3 py-1 rounded-full border border-[#c8a96e]/30 shadow-sm animate-pulse hover:bg-[#c8a96e]/30 transition-all">
                      {lang === 'he' ? 'לחץ לקריאת המשנה המלאה ➔' : 'Click to read full text ➔'}
                    </span>
                  </div>

                  {lang !== 'he' && (
                    <div className="pt-2 border-t border-[#c8a96e]/10 text-right" dir="rtl">
                      <span className="text-[10px] text-[#c8a96e] font-bold block mb-0.5">מקור בעברית:</span>
                      <p className="font-serif text-[#f7e7c4] text-xs leading-relaxed">{snippetHeDisplay}</p>
                    </div>
                  )}
                </>
              );
            })()}

            <div className="text-xs text-gray-300 space-y-1 leading-relaxed bg-black/20 p-2.5 rounded border border-white/5">
              <span className="text-[#c8a96e] font-bold text-xs block mb-0.5">ביאור ופרוש:</span>
              <p className="text-gray-300 text-xs">{activeMishnah.explanation[lang]}</p>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  const ref = getMishnahSefariaRef(activeMishnah);
                  setReadingSefariaRef(ref);
                  setReadingTitle(activeMishnah.reference[lang]);
                }}
                className="flex-1 flex items-center justify-center gap-2 bg-[#c8a96e]/15 hover:bg-[#c8a96e]/30 border border-[#c8a96e]/40 text-[#c8a96e] text-xs font-bold py-2 px-3 rounded-lg transition-all cursor-pointer shadow-sm"
              >
                <BookOpen className="w-4 h-4 text-amber-400" />
                <span>{lang === 'he' ? 'קריאת המשנה המלאה' : 'Read Full Mishnah'}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveMishnah(getRandomGeneralMishnah())}
                className="bg-amber-950/40 hover:bg-amber-900/70 border border-[#c8a96e]/30 text-[#c8a96e] text-xs font-bold py-2 px-3 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
                title="משנה אקראית נוספת"
              >
                <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                <span>{lang === 'he' ? 'משנה נוספת' : 'Next'}</span>
              </button>
            </div>
          </div>

          {/* 2. Pirkei Avot Section */}
          <div className="space-y-2 bg-black/40 p-4 rounded-xl border border-[#c8a96e]/20 relative overflow-hidden shadow-md">
            <div className="flex justify-between items-center border-b border-[#c8a96e]/15 pb-2">
              <span className="text-[#c8a96e] font-extrabold text-sm flex items-center gap-2">
                <ScrollText className="w-4 h-4 text-amber-400" />
                <span>{lang === 'he' ? 'פרקי אבות לעילוי נשמה' : 'Pirkei Avot'}</span>
              </span>
              <span className="text-xs text-gray-400 font-medium bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
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
                  className="text-sm md:text-base font-sans font-semibold text-white text-center leading-relaxed py-3.5 bg-amber-500/10 px-4 rounded-lg border border-amber-500/20 cursor-pointer hover:border-[#c8a96e] hover:bg-amber-500/20 transition-all flex flex-col items-center gap-2 shadow-sm" 
                  dir={lang === 'he' ? 'rtl' : 'ltr'}
                >
                  <span>{snippetMainDisplay}</span>
                  <span className="text-xs text-[#c8a96e] font-sans font-bold bg-[#c8a96e]/15 px-3 py-1 rounded-full border border-[#c8a96e]/30 shadow-sm animate-pulse">
                    {lang === 'he' ? 'לחץ להמשך לקריאת פרקי אבות המלאים ➔' : 'Click to continue ➔'}
                  </span>
                </div>
              );
            })()}

            <div className="text-xs text-gray-300 space-y-1 leading-relaxed bg-black/20 p-2.5 rounded border border-white/5">
              <span className="text-[#c8a96e] font-bold text-xs block mb-0.5">ביאור ופרוש:</span>
              <p className="text-gray-300 text-xs">{activeAvot.explanation[lang]}</p>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  const ref = getMishnahSefariaRef(activeAvot);
                  setReadingSefariaRef(ref);
                  setReadingTitle(activeAvot.reference[lang]);
                }}
                className="flex-1 flex items-center justify-center gap-2 bg-[#c8a96e]/15 hover:bg-[#c8a96e]/30 border border-[#c8a96e]/40 text-[#c8a96e] text-xs font-bold py-2 px-3 rounded-lg transition-all cursor-pointer shadow-sm"
              >
                <BookOpen className="w-4 h-4 text-amber-400" />
                <span>{lang === 'he' ? 'קריאת פרקי אבות המלאים' : 'Read Full Pirkei Avot'}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveAvot(getRandomPirkeiAvot())}
                className="bg-amber-950/40 hover:bg-amber-900/70 border border-[#c8a96e]/30 text-[#c8a96e] text-xs font-bold py-2 px-3 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                <span>{lang === 'he' ? 'משנה נוספת' : 'Next'}</span>
              </button>
            </div>
          </div>

          {/* 3. Psalms Section */}
          <div className="space-y-2 bg-black/40 p-4 rounded-xl border border-[#c8a96e]/20 relative overflow-hidden shadow-md">
            <div className="flex justify-between items-center border-b border-[#c8a96e]/15 pb-2">
              <span className="text-[#c8a96e] font-extrabold text-sm flex items-center gap-2">
                <Heart className="w-4 h-4 text-amber-400 fill-amber-400/20" />
                <span>{lang === 'he' ? 'מזמור תהלים לעילוי נשמה' : 'Psalm for Soul Elevation'}</span>
              </span>
              <span className="text-xs text-amber-300 font-bold bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/20">
                {activePsalm.title[lang]}
              </span>
            </div>

            <div 
              onClick={() => {
                setReadingSefariaRef(`Psalms ${activePsalm.chapter}`);
                setReadingTitle(activePsalm.title[lang]);
              }}
              className="text-sm font-serif font-bold text-[#f7e7c4] text-center leading-relaxed py-3.5 bg-amber-500/10 px-4 rounded-lg border border-amber-500/20 cursor-pointer hover:border-[#c8a96e] transition-all flex flex-col items-center gap-2"
              dir="rtl"
            >
              <span>{activePsalm.text.he.substring(0, 160)}...</span>
              <span className="text-xs text-[#c8a96e] font-sans font-bold bg-[#c8a96e]/15 px-3 py-1 rounded-full border border-[#c8a96e]/30 animate-pulse">
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
                className="flex-1 flex items-center justify-center gap-2 bg-[#c8a96e]/15 hover:bg-[#c8a96e]/30 border border-[#c8a96e]/40 text-[#c8a96e] text-xs font-bold py-2 px-3 rounded-lg transition-all cursor-pointer"
              >
                <BookOpen className="w-4 h-4 text-amber-400" />
                <span>{lang === 'he' ? 'קריאת המזמור המלא' : 'Read Full Psalm'}</span>
              </button>
              <button
                type="button"
                onClick={() => setActivePsalm(getRandomPsalm())}
                className="bg-amber-950/40 hover:bg-amber-900/70 border border-[#c8a96e]/30 text-[#c8a96e] text-xs font-bold py-2 px-3 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                <span>{lang === 'he' ? 'מזמור נוסף' : 'Next'}</span>
              </button>
            </div>
          </div>

          {/* 4. Halakha Section */}
          <div className="space-y-2 bg-black/40 p-4 rounded-xl border border-[#c8a96e]/20 shadow-md">
            <div className="flex justify-between items-center border-b border-[#c8a96e]/15 pb-2">
              <span className="text-[#c8a96e] font-extrabold text-sm flex items-center gap-2">
                <span>⚖️</span>
                <span>{lang === 'he' ? 'הלכת היום במנהגי זיכרון ואבלות' : 'Daily Halakha on Remembrance'}</span>
              </span>
              <span className="text-xs text-gray-400 font-medium">
                {activeHalakha.reference[lang]}
              </span>
            </div>

            <p className="text-xs md:text-sm font-sans text-gray-200 leading-relaxed bg-black/20 p-3 rounded border border-white/5" dir={lang === 'he' ? 'rtl' : 'ltr'}>
              {activeHalakha.text[lang]}
            </p>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setActiveHalakha(getRandomHalakha())}
                className="bg-amber-950/40 hover:bg-amber-900/70 border border-[#c8a96e]/30 text-[#c8a96e] text-xs font-bold py-2 px-3 rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                <span>{lang === 'he' ? 'הלכה נוספת' : 'Next Halakha'}</span>
              </button>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-gradient-to-r from-amber-950/80 via-[#2a1c0d] to-amber-950/80 border-t border-[#c8a96e]/30 p-4 flex justify-between items-center">
          <span className="text-xs text-amber-300/90 font-medium flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-amber-400 fill-amber-400" />
            <span>{lang === 'he' ? `תנצ"בָה - תהא נשמת ${deceased.name} צרורה בצרור החיים` : 'May their memory be a blessing'}</span>
          </span>

          <button
            type="button"
            onClick={onClose}
            className="bg-[#c8a96e] hover:bg-[#dfba7d] text-black font-extrabold px-5 py-2 rounded-lg text-xs shadow-md transition-all cursor-pointer"
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
