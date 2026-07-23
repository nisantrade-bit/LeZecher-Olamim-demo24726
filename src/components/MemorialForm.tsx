/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Deceased, Gender, Language } from '../types';
import { translations, sanitizeParentName } from '../utils/translations';
import { HEBREW_MONTHS_HE, HEBREW_MONTHS_EN, HEBREW_MONTHS_RU, normalizeMonthName } from '../utils/hebrewDate';
import { PlusCircle, Upload, X, Save, User, Sparkles, Loader2 } from 'lucide-react';

interface MemorialFormProps {
  lang: Language;
  onSave: (deceased: Deceased) => void;
  editingDeceased?: Deceased | null;
  onCancel?: () => void;
}

export const MemorialForm: React.FC<MemorialFormProps> = ({ lang, onSave, editingDeceased, onCancel }) => {
  const t = translations[lang];

  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender>('male');
  const [fatherName, setFatherName] = useState('');
  const [motherName, setMotherName] = useState('');
  const [day, setDay] = useState<number>(1);
  const [month, setMonth] = useState('תשרי');
  const [contactPhone, setContactPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [imageBase64, setImageBase64] = useState<string>('');
  const [ageAtDeath, setAgeAtDeath] = useState<number | ''>('');
  const [birthDate, setBirthDate] = useState('');
  
  const [errors, setErrors] = useState<{ name?: boolean; day?: boolean; fatherName?: boolean; motherName?: boolean }>({});
  const [isRefiningAi, setIsRefiningAi] = useState(false);
  const [aiNotice, setAiNotice] = useState<string | null>(null);

  const handleAiRefineNotes = async () => {
    setIsRefiningAi(true);
    setAiNotice(null);
    try {
      const res = await fetch('/api/ai-refine-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          fatherName,
          motherName,
          gender,
          notes,
          targetLang: lang
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.refinedNotes) {
          setNotes(data.refinedNotes);
          setAiNotice(
            lang === 'he'
              ? '✨ הניסוח שופר, שופץ ותורגם בהצלחה עם AI!'
              : lang === 'ru'
              ? '✨ Текст успешно улучшен и переведен с ИИ!'
              : '✨ Notes refined and translated with AI!'
          );
          setTimeout(() => setAiNotice(null), 4000);
        }
      } else {
        throw new Error('Server error');
      }
    } catch (err) {
      console.error('AI Refine error:', err);
      setAiNotice(
        lang === 'he'
          ? 'שגיאה בחיבור ל-AI, אנא נסה שוב.'
          : 'AI Connection error, please try again.'
      );
      setTimeout(() => setAiNotice(null), 4000);
    } finally {
      setIsRefiningAi(false);
    }
  };

  useEffect(() => {
    if (editingDeceased) {
      setName(editingDeceased.name);
      setGender(editingDeceased.gender);
      setFatherName(editingDeceased.fatherName);
      setMotherName(editingDeceased.motherName);
      setDay(editingDeceased.day);
      setMonth(normalizeMonthName(editingDeceased.month));
      setContactPhone(editingDeceased.contactPhone || '');
      setNotes(editingDeceased.notes || '');
      setImageBase64(editingDeceased.image || '');
      setAgeAtDeath(editingDeceased.ageAtDeath !== undefined ? editingDeceased.ageAtDeath : '');
      setBirthDate(editingDeceased.birthDate || '');
    } else {
      resetForm();
    }
    setErrors({});
  }, [editingDeceased]);

  const resetForm = () => {
    setName('');
    setGender('male');
    setFatherName('');
    setMotherName('');
    setDay(1);
    setMonth('תשרי');
    setContactPhone('');
    setNotes('');
    setImageBase64('');
    setAgeAtDeath('');
    setBirthDate('');
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImageBase64('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: typeof errors = {};

    const cleanFather = sanitizeParentName(fatherName);
    const cleanMother = sanitizeParentName(motherName);

    if (!name.trim()) newErrors.name = true;
    if (!cleanFather && !cleanMother) {
      newErrors.fatherName = true;
      newErrors.motherName = true;
    }
    if (!day || day < 1 || day > 30) newErrors.day = true;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const deceasedData: Deceased = {
      id: editingDeceased ? editingDeceased.id : Date.now(),
      name: name.trim(),
      gender,
      fatherName: cleanFather,
      motherName: cleanMother,
      day: Number(day),
      month,
      contactPhone: contactPhone.trim() || undefined,
      notes: notes.trim() || undefined,
      image: imageBase64 || undefined,
      ageAtDeath: ageAtDeath !== '' ? Number(ageAtDeath) : undefined,
      birthDate: birthDate.trim() || undefined
    };

    onSave(deceasedData);
    if (!editingDeceased) {
      resetForm();
    }
  };

  const currentMonths = lang === 'he' ? HEBREW_MONTHS_HE : lang === 'en' ? HEBREW_MONTHS_EN : HEBREW_MONTHS_RU;

  return (
    <div id="memorial-form" className="bg-[#131a26] border border-[#c8a96e]/30 rounded-xl p-6 text-[#f0f4f8] shadow-lg">
      <div className="flex items-center gap-2 mb-6 border-b border-[#c8a96e]/10 pb-3">
        <PlusCircle className="w-5 h-5 text-[#c8a96e]" />
        <h3 className="text-lg font-serif font-bold text-[#c8a96e]">
          {editingDeceased ? t.edit : t.addMemorial}
        </h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 font-sans">
        {/* Name */}
        <div>
          <label className="block text-xs uppercase tracking-wider text-[#c8a96e] mb-1 font-semibold">
            {t.fullName} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) setErrors(prev => ({ ...prev, name: false }));
            }}
            placeholder={t.namePlaceholder}
            className={`w-full bg-[#0d0d0d] border ${errors.name ? 'border-red-500' : 'border-[#c8a96e]/30'} focus:border-[#c8a96e] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 outline-none transition-all`}
          />
        </div>

        {/* Gender toggle */}
        <div>
          <label className="block text-xs uppercase tracking-wider text-[#c8a96e] mb-1 font-semibold">
            {t.gender}
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setGender('male')}
              className={`py-2 text-sm rounded-lg border font-medium transition-all ${gender === 'male' ? 'bg-[#c8a96e]/20 border-[#c8a96e] text-[#c8a96e]' : 'bg-[#0d0d0d] border-[#c8a96e]/10 text-gray-400 hover:border-[#c8a96e]/30'}`}
            >
              {t.male}
            </button>
            <button
              type="button"
              onClick={() => setGender('female')}
              className={`py-2 text-sm rounded-lg border font-medium transition-all ${gender === 'female' ? 'bg-[#c8a96e]/20 border-[#c8a96e] text-[#c8a96e]' : 'bg-[#0d0d0d] border-[#c8a96e]/10 text-gray-400 hover:border-[#c8a96e]/30'}`}
            >
              {t.female}
            </button>
          </div>
        </div>

        {/* Parent Names */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs uppercase tracking-wider text-[#c8a96e] mb-1 font-semibold">
              {t.fatherName} <span className="text-red-400 text-[10px]">({lang === 'he' ? 'לפחות הורה אחד חובה' : lang === 'ru' ? 'требуется хотя бы один родитель' : 'at least one parent required'})</span>
            </label>
            <input
              type="text"
              value={fatherName}
              onChange={(e) => {
                setFatherName(e.target.value);
                if (errors.fatherName || errors.motherName) {
                  setErrors(prev => ({ ...prev, fatherName: false, motherName: false }));
                }
              }}
              placeholder={t.fatherPlaceholder}
              className={`w-full bg-[#0d0d0d] border ${errors.fatherName ? 'border-red-500' : 'border-[#c8a96e]/30'} focus:border-[#c8a96e] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 outline-none transition-all`}
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-[#c8a96e] mb-1 font-semibold">
              {t.motherName} <span className="text-red-400 text-[10px]">({lang === 'he' ? 'לפחות הורה אחד חובה' : lang === 'ru' ? 'требуется хотя бы один родитель' : 'at least one parent required'})</span>
            </label>
            <input
              type="text"
              value={motherName}
              onChange={(e) => {
                setMotherName(e.target.value);
                if (errors.fatherName || errors.motherName) {
                  setErrors(prev => ({ ...prev, fatherName: false, motherName: false }));
                }
              }}
              placeholder={t.motherPlaceholder}
              className={`w-full bg-[#0d0d0d] border ${errors.motherName ? 'border-red-500' : 'border-[#c8a96e]/30'} focus:border-[#c8a96e] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 outline-none transition-all`}
            />
          </div>
        </div>

        {/* Hebrew Date (Day & Month) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs uppercase tracking-wider text-[#c8a96e] mb-1 font-semibold">
              {t.hebrewDay} <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              max="30"
              value={day}
              onChange={(e) => {
                setDay(Number(e.target.value));
                if (errors.day) setErrors(prev => ({ ...prev, day: false }));
              }}
              className={`w-full bg-[#0d0d0d] border ${errors.day ? 'border-red-500' : 'border-[#c8a96e]/30'} focus:border-[#c8a96e] rounded-lg px-3 py-2 text-sm text-white outline-none transition-all`}
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-[#c8a96e] mb-1 font-semibold">
              {t.hebrewMonth}
            </label>
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full bg-[#0d0d0d] border border-[#c8a96e]/30 focus:border-[#c8a96e] rounded-lg px-3 py-2 text-sm text-white outline-none transition-all"
            >
              {HEBREW_MONTHS_HE.map((m, idx) => (
                <option key={m} value={m} className="bg-[#0d0d0d] text-white">
                  {currentMonths[idx]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Age and Birth Date */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs uppercase tracking-wider text-[#c8a96e] mb-1 font-semibold">
              {lang === 'he' ? 'גיל פטירה' : lang === 'ru' ? 'Возраст на момент смерти' : 'Age at death'}
            </label>
            <input
              type="number"
              min="0"
              max="150"
              value={ageAtDeath}
              onChange={(e) => setAgeAtDeath(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder={lang === 'he' ? 'לדוגמה: 85' : 'e.g. 85'}
              className="w-full bg-[#0d0d0d] border border-[#c8a96e]/30 focus:border-[#c8a96e] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-[#c8a96e] mb-1 font-semibold">
              {lang === 'he' ? 'תאריך לידה (אופציונלי)' : lang === 'ru' ? 'Дата рождения (опция)' : 'Date of Birth (optional)'}
            </label>
            <input
              type="text"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              placeholder={lang === 'he' ? 'לדוגמה: 12/05/1940' : 'e.g. 12/05/1940'}
              className="w-full bg-[#0d0d0d] border border-[#c8a96e]/30 focus:border-[#c8a96e] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 outline-none transition-all"
            />
          </div>
        </div>

        {/* Contact Phone */}
        <div>
          <label className="block text-xs uppercase tracking-wider text-[#c8a96e] mb-1 font-semibold">
            {t.contactPhone}
          </label>
          <input
            type="text"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            placeholder={t.phonePlaceholder}
            className="w-full bg-[#0d0d0d] border border-[#c8a96e]/30 focus:border-[#c8a96e] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 outline-none transition-all"
          />
        </div>

        {/* Notes / Life Story */}
        <div>
          <div className="flex items-center justify-between gap-2 mb-1">
            <label className="block text-xs uppercase tracking-wider text-[#c8a96e] font-semibold">
              {t.lifeStory}
            </label>
            <button
              type="button"
              onClick={handleAiRefineNotes}
              disabled={isRefiningAi}
              className="flex items-center gap-1.5 bg-gradient-to-r from-purple-600/30 via-amber-600/30 to-purple-600/30 hover:from-purple-600/50 hover:to-amber-600/50 text-amber-200 border border-amber-400/50 hover:border-amber-300 px-3 py-1 rounded-lg text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
              title={lang === 'he' ? 'לחץ כדי לשפר ניסוח, לתקן שגיאות ולתרגם בצורה מדויקת באמצעות AI' : 'Click to refine grammar, tone and translate via AI'}
            >
              {isRefiningAi ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-300" />
                  <span>{lang === 'he' ? 'משפר עם AI...' : lang === 'ru' ? 'Улучшаю с ИИ...' : 'AI Refining...'}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                  <span>{lang === 'he' ? '✨ שפר ותרגם עם AI' : lang === 'ru' ? '✨ Улучшить с ИИ' : '✨ Refine & Translate with AI'}</span>
                </>
              )}
            </button>
          </div>

          {aiNotice && (
            <div className="mb-2 text-xs font-medium text-emerald-300 bg-emerald-950/40 border border-emerald-500/30 px-2.5 py-1 rounded-md animate-fadeIn">
              {aiNotice}
            </div>
          )}

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t.notesPlaceholder}
            rows={3}
            className="w-full bg-[#0d0d0d] border border-[#c8a96e]/30 focus:border-[#c8a96e] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 outline-none transition-all resize-none"
          />
        </div>

        {/* Image Upload */}
        <div>
          <label className="block text-xs uppercase tracking-wider text-[#c8a96e] mb-1 font-semibold">
            {t.uploadImage}
          </label>
          {imageBase64 ? (
            <div className="relative w-full h-32 rounded-lg overflow-hidden border border-[#c8a96e]/40 bg-black/40 flex items-center justify-center">
              <img src={imageBase64} alt="Memorial" referrerPolicy="no-referrer" className="h-full w-auto object-contain" />
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white p-1 rounded-full shadow transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label className="w-full h-20 border border-dashed border-[#c8a96e]/30 hover:border-[#c8a96e]/60 bg-[#0d0d0d] rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-[#c8a96e]/5 transition-all group">
              <Upload className="w-5 h-5 text-gray-500 group-hover:text-[#c8a96e] transition-colors mb-1" />
              <span className="text-xs text-gray-400 group-hover:text-gray-300">
                {t.uploadImage}
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </label>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2 rounded-lg border border-[#c8a96e]/20 text-gray-300 hover:bg-[#c8a96e]/5 font-medium transition-all text-sm flex items-center justify-center gap-1"
            >
              {t.cancel}
            </button>
          )}
          <button
            type="submit"
            className="flex-2 bg-gradient-to-r from-[#c8a96e] to-[#b8952e] hover:from-[#b8952e] hover:to-[#a07f24] text-black font-semibold py-2 px-4 rounded-lg shadow-lg hover:shadow-[#c8a96e]/20 transition-all text-sm flex items-center justify-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            {editingDeceased ? t.submitSave : t.submitAdd}
          </button>
        </div>
      </form>
    </div>
  );
};
