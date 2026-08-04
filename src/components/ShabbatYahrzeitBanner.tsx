import React from 'react';
import { getShabbatYahrzeitInfo } from '../utils/torahPortionHelper';
import { translations, formatShabbatReminderText } from '../utils/translations';
import { BookOpen, Calendar, AlertCircle, Sparkles } from 'lucide-react';

export interface ShabbatYahrzeitBannerProps {
  eventDate?: Date | null;
  yahrzeitDate?: Date | null;
  hebcalEvents?: any[];
  lang: 'he' | 'en' | 'ru';
  compact?: boolean;
}

export const ShabbatYahrzeitBanner: React.FC<ShabbatYahrzeitBannerProps> = ({
  eventDate,
  yahrzeitDate,
  hebcalEvents = [],
  lang,
  compact = false,
}) => {
  const targetDate = eventDate || yahrzeitDate;
  if (!targetDate) return null;
  const dateObj = targetDate instanceof Date ? targetDate : new Date(targetDate);
  if (isNaN(dateObj.getTime())) return null;

  const info = getShabbatYahrzeitInfo(dateObj, hebcalEvents, lang);
  if (!info) {
    return null;
  }

  const t = translations[lang];
  const isRtl = lang === 'he';

  const prepTextFormatted = formatShabbatReminderText(
    t.shabbatPrepText,
    info.prepParashaName,
    info.prepDateStrFormatted
  );

  const memorialTextFormatted = formatShabbatReminderText(
    t.shabbatMemorialText,
    info.memorialParashaName,
    info.memorialDateStrFormatted
  );

  if (compact) {
    return (
      <div
        className={`mt-2 rounded-xl border border-amber-400/50 bg-gradient-to-r from-amber-950/70 via-[#181206]/90 to-amber-950/70 px-3 py-2 shadow-sm space-y-1 font-sans ${
          isRtl ? 'text-right' : 'text-left'
        }`}
        dir={isRtl ? 'rtl' : 'ltr'}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 flex-wrap text-[11px]">
          <span className="inline-flex items-center gap-1 font-extrabold text-amber-300">
            <span>📌</span>
            <span>{t.shabbatYahrzeitBadge}:</span>
            <span className="text-amber-100 font-medium">{t.shabbatGraveVisitRule}</span>
          </span>
          <span className="text-[10px] text-amber-400/90 font-bold bg-black/40 px-1.5 py-0.5 rounded">
            {t.shabbatGraveVisitFriday} / {t.shabbatGraveVisitSunday}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap text-[11px] text-amber-200/90 font-medium pt-0.5 border-t border-amber-500/20">
          <span>🕯️ {t.shabbatPrepTitle}: <strong className="text-amber-300">{info.prepParashaName} ({info.prepDateStrFormatted})</strong></span>
          <span className="text-amber-500">•</span>
          <span>✨ {t.shabbatMemorialTitle}: <strong className="text-amber-300">{info.memorialParashaName} ({info.memorialDateStrFormatted})</strong></span>
        </div>
      </div>
    );
  }

  // Full Expanded View for MemorialDetailsModal / DeceasedMemorialPage
  return (
    <div
      className={`my-4 rounded-2xl border-2 border-[#c8a96e]/60 bg-gradient-to-br from-[#0d0a04] via-[#181106] to-[#0a0c10] p-5 shadow-[0_0_25px_rgba(200,169,110,0.2)] space-y-4 font-sans ${
        isRtl ? 'text-right' : 'text-left'
      }`}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Title Bar */}
      <div className="flex items-center justify-between border-b border-[#c8a96e]/25 pb-3">
        <h4 className="text-sm md:text-base font-serif font-black text-[#c8a96e] flex items-center gap-2">
          <span>📌</span>
          <span>{t.shabbatDoubleReminderTitle}</span>
        </h4>
        <span className="text-xs bg-[#c8a96e]/15 text-[#c8a96e] border border-[#c8a96e]/30 px-2.5 py-1 rounded-full font-bold">
          {t.shabbatYahrzeitBadge}
        </span>
      </div>

      {/* Grave Visit Rule Highlights */}
      <div className="bg-black/40 border border-[#c8a96e]/30 p-3 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-200">
          <BookOpen className="w-4 h-4 text-[#c8a96e] shrink-0" />
          <span>{t.shabbatGraveVisitRule}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-bold">
          <span className="bg-amber-500/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded">
            {t.shabbatGraveVisitFriday}
          </span>
          <span className="text-gray-400">/</span>
          <span className="bg-amber-500/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded">
            {t.shabbatGraveVisitSunday}
          </span>
        </div>
      </div>

      {/* Two Shabbats Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {/* Preparation Shabbat Card */}
        <div className="bg-[#120e06]/90 border border-amber-500/40 rounded-xl p-3.5 space-y-2 shadow-inner">
          <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
            <span className="text-xs font-black text-amber-400 flex items-center gap-1.5">
              <span>1️⃣</span>
              <span>{t.shabbatPrepTitle}</span>
            </span>
            <span className="text-[10px] bg-amber-500/10 text-amber-300 font-mono px-2 py-0.5 rounded">
              {info.prepDateStrFormatted}
            </span>
          </div>
          <div className="text-xs text-amber-200 font-semibold flex items-center gap-1">
            <span>📖</span>
            <span>{info.prepParashaName}</span>
          </div>
          <p className="text-xs text-gray-300 leading-relaxed">
            {prepTextFormatted}
          </p>
        </div>

        {/* Memorial Shabbat Card */}
        <div className="bg-[#120e06]/90 border border-amber-500/40 rounded-xl p-3.5 space-y-2 shadow-inner">
          <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
            <span className="text-xs font-black text-amber-300 flex items-center gap-1.5">
              <span>2️⃣</span>
              <span>{t.shabbatMemorialTitle}</span>
            </span>
            <span className="text-[10px] bg-amber-500/10 text-amber-300 font-mono px-2 py-0.5 rounded">
              {info.memorialDateStrFormatted}
            </span>
          </div>
          <div className="text-xs text-amber-200 font-semibold flex items-center gap-1">
            <span>📖</span>
            <span>{info.memorialParashaName}</span>
          </div>
          <p className="text-xs text-gray-300 leading-relaxed">
            {memorialTextFormatted}
          </p>
        </div>
      </div>

      {/* Mandatory Candle Lighting Warning */}
      <div className="bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent border border-amber-400/50 rounded-xl p-3 flex items-center gap-3">
        <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
        <p className="text-xs md:text-sm font-bold text-amber-200 leading-snug">
          {t.shabbatCandleWarning}
        </p>
      </div>
    </div>
  );
};
