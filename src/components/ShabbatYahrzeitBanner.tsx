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
        className={`mt-2 rounded-xl border border-[#D8CFC0] bg-[#EFE8DC] px-3 py-2 shadow-xs space-y-1 font-sans text-[#3B2F2F] ${
          isRtl ? 'text-right' : 'text-left'
        }`}
        dir={isRtl ? 'rtl' : 'ltr'}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 flex-wrap text-[11px]">
          <span className="inline-flex items-center gap-1 font-bold text-[#5D6D53]">
            <span>📌</span>
            <span>{t.shabbatYahrzeitBadge}:</span>
            <span className="text-[#3B2F2F] font-medium">{t.shabbatGraveVisitRule}</span>
          </span>
          <span className="text-[10px] text-[#5D6D53] font-bold bg-[#FAF5EC] px-1.5 py-0.5 rounded border border-[#D8CFC0]">
            {t.shabbatGraveVisitFriday} / {t.shabbatGraveVisitSunday}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap text-[11px] text-[#6B5E53] font-medium pt-0.5 border-t border-[#D8CFC0]">
          <span>🕯️ {t.shabbatPrepTitle}: <strong className="text-[#5D6D53]">{info.prepParashaName} ({info.prepDateStrFormatted})</strong></span>
          <span className="text-[#D8CFC0]">•</span>
          <span>✨ {t.shabbatMemorialTitle}: <strong className="text-[#5D6D53]">{info.memorialParashaName} ({info.memorialDateStrFormatted})</strong></span>
        </div>
      </div>
    );
  }

  // Full Expanded View for MemorialDetailsModal / DeceasedMemorialPage
  return (
    <div
      className={`my-4 rounded-2xl border border-[#D8CFC0] bg-[#EFE8DC] p-5 shadow-xs space-y-4 font-sans text-[#3B2F2F] ${
        isRtl ? 'text-right' : 'text-left'
      }`}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Title Bar */}
      <div className="flex items-center justify-between border-b border-[#D8CFC0] pb-3">
        <h4 className="text-sm md:text-base font-serif font-bold text-[#5D6D53] flex items-center gap-2">
          <span>📌</span>
          <span>{t.shabbatDoubleReminderTitle}</span>
        </h4>
        <span className="text-xs bg-[#5D6D53]/10 text-[#5D6D53] border border-[#5D6D53]/20 px-2.5 py-1 rounded-full font-bold">
          {t.shabbatYahrzeitBadge}
        </span>
      </div>

      {/* Grave Visit Rule Highlights */}
      <div className="bg-[#FAF5EC] border border-[#D8CFC0] p-3 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#3B2F2F]">
          <BookOpen className="w-4 h-4 text-[#5D6D53] shrink-0" />
          <span>{t.shabbatGraveVisitRule}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-bold">
          <span className="bg-[#5D6D53]/10 text-[#5D6D53] border border-[#5D6D53]/20 px-2 py-0.5 rounded">
            {t.shabbatGraveVisitFriday}
          </span>
          <span className="text-[#6B5E53]">/</span>
          <span className="bg-[#5D6D53]/10 text-[#5D6D53] border border-[#5D6D53]/20 px-2 py-0.5 rounded">
            {t.shabbatGraveVisitSunday}
          </span>
        </div>
      </div>

      {/* Two Shabbats Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {/* Preparation Shabbat Card */}
        <div className="bg-[#FAF5EC] border border-[#D8CFC0] rounded-xl p-3.5 space-y-2 shadow-xs">
          <div className="flex items-center justify-between border-b border-[#D8CFC0] pb-2">
            <span className="text-xs font-bold text-[#5D6D53] flex items-center gap-1.5">
              <span>1️⃣</span>
              <span>{t.shabbatPrepTitle}</span>
            </span>
            <span className="text-[10px] bg-[#EFE8DC] text-[#5D6D53] font-mono px-2 py-0.5 rounded border border-[#D8CFC0]">
              {info.prepDateStrFormatted}
            </span>
          </div>
          <div className="text-xs text-[#3B2F2F] font-semibold flex items-center gap-1">
            <span>📖</span>
            <span>{info.prepParashaName}</span>
          </div>
          <p className="text-xs text-[#6B5E53] leading-relaxed">
            {prepTextFormatted}
          </p>
        </div>

        {/* Memorial Shabbat Card */}
        <div className="bg-[#FAF5EC] border border-[#D8CFC0] rounded-xl p-3.5 space-y-2 shadow-xs">
          <div className="flex items-center justify-between border-b border-[#D8CFC0] pb-2">
            <span className="text-xs font-bold text-[#5D6D53] flex items-center gap-1.5">
              <span>2️⃣</span>
              <span>{t.shabbatMemorialTitle}</span>
            </span>
            <span className="text-[10px] bg-[#EFE8DC] text-[#5D6D53] font-mono px-2 py-0.5 rounded border border-[#D8CFC0]">
              {info.memorialDateStrFormatted}
            </span>
          </div>
          <div className="text-xs text-[#3B2F2F] font-semibold flex items-center gap-1">
            <span>📖</span>
            <span>{info.memorialParashaName}</span>
          </div>
          <p className="text-xs text-[#6B5E53] leading-relaxed">
            {memorialTextFormatted}
          </p>
        </div>
      </div>

      {/* Mandatory Candle Lighting Warning */}
      <div className="bg-[#FAF5EC] border border-amber-300 rounded-xl p-3 flex items-center gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
        <p className="text-xs md:text-sm font-bold text-[#3B2F2F] leading-snug">
          {t.shabbatCandleWarning}
        </p>
      </div>
    </div>
  );
};
