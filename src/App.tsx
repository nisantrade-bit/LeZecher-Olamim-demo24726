/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Deceased, Language } from './types';
import { translations } from './utils/translations';
import { BulletinBoard } from './components/BulletinBoard';
import { MemorialForm } from './components/MemorialForm';
import { BulkImport } from './components/BulkImport';
import { MemorialBook } from './components/MemorialBook';
import { DynamicCalendar } from './components/DynamicCalendar';
import { Quick30Grid } from './components/Quick30Grid';
import { MemorialDetailsModal } from './components/MemorialDetailsModal';
import { Calendar, BookOpen, LayoutGrid, FileDown, Globe, Sparkles } from 'lucide-react';
import { decodeDeceasedFromUrlPayload } from './utils/shareUtils';
import { translateDeceasedListClientSide } from './utils/transliteration';
import { smartMergeDeceasedLists, deduplicateSingleList } from './utils/deduplication';

export default function App() {
  const [lang, setLang] = useState<Language>(() => {
    const params = new URLSearchParams(window.location.search);
    const urlLang = params.get('lang');
    if (urlLang === 'en' || urlLang === 'ru' || urlLang === 'he') {
      return urlLang as Language;
    }
    return 'he';
  });

  const [activeTab, setActiveTab] = useState<'calendar' | 'book' | 'grid' | 'import'>('calendar');
  const [masterList, setMasterList] = useState<Deceased[]>([]);
  const [displayedList, setDisplayedList] = useState<Deceased[]>([]);
  const [translating, setTranslating] = useState<boolean>(false);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [editingDeceased, setEditingDeceased] = useState<Deceased | null>(null);

  // חלון המודעה הממוקד שקופץ
  const [selectedDeceased, setSelectedDeceased] = useState<Deceased | null>(null);

  // טעינה ופענוח של הכרטיס מתוך הקישור
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      let dataStr = params.get('data') || params.get('payload') || params.get('card');

      if (!dataStr && window.location.hash) {
        const hashMatch = window.location.hash.match(/[?&](?:data|payload|card)=([^&]+)/i) || window.location.hash.match(/(?:data|payload|card)=([^&]+)/i);
        if (hashMatch && hashMatch[1]) {
          dataStr = hashMatch[1];
        }
      }

      if (dataStr) {
        const decoded = decodeDeceasedFromUrlPayload(dataStr);
        if (decoded) {
          // קופץ כחלון מודעה ממוקד
          setSelectedDeceased(decoded);

          // שומר אוטומטית במאגר
          setMasterList(prev => {
            const exists = prev.some(d => Number(d.id) === Number(decoded.id));
            if (!exists) {
              const updated = [decoded, ...prev];
              try {
                localStorage.setItem('eternal_db', JSON.stringify(updated));
              } catch (e) {}
              return updated;
            }
            return prev;
          });
        }
      }
    } catch (e) {
      console.error("Error parsing url payload:", e);
    }
  }, []);

  // טעינת בסיס הנתונים בלחיצה/טעינה
  useEffect(() => {
    const loadDatabase = async () => {
      try {
        const response = await fetch('/api/deceased');
        if (response.ok) {
          const data = await response.json();
          const cleanData = deduplicateSingleList(data);
          setMasterList(cleanData);
          try {
            localStorage.setItem('eternal_db', JSON.stringify(cleanData));
          } catch (e) {}
          return;
        }
      } catch (err) {}

      let stored = null;
      try {
        stored = localStorage.getItem('eternal_db');
      } catch (e) {}
      
      if (stored) {
        try {
          setMasterList(deduplicateSingleList(JSON.parse(stored)));
        } catch (err) {}
      }
    };
    loadDatabase();
  }, []);

  const handleLanguageChange = (targetLang: Language) => {
    setLang(targetLang);
    setTranslationError(null);
  };

  // תרגום אוטומטי של הרשימה לפי שפה
  useEffect(() => {
    if (lang === 'he') {
      setDisplayedList(masterList);
      return;
    }

    let isMounted = true;
    setTranslating(true);
    setTranslationError(null);

    translateDeceasedListClientSide(masterList, lang)
      .then(translated => {
        if (isMounted) {
          setDisplayedList(translated);
          setTranslating(false);
        }
      })
      .catch(err => {
        if (isMounted) {
          console.error("Translation failed:", err);
          setDisplayedList(masterList);
          setTranslating(false);
          setTranslationError(t.translationError || 'Translation failed');
        }
      });

    return () => {
      isMounted = false;
    };
  }, [masterList, lang]);

  const handleSaveDeceased = async (deceased: Deceased) => {
    let updated = masterList.some(d => d.id === deceased.id)
      ? masterList.map(d => d.id === deceased.id ? deceased : d)
      : [...masterList, deceased];

    setMasterList(updated);
    try {
      localStorage.setItem('eternal_db', JSON.stringify(updated));
    } catch (e) {}
    
    fetch('/api/deceased', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(deceased)
    }).catch(e => console.error("Cloud sync error:", e));

    setEditingDeceased(null);
  };

  const handleDeleteDeceased = async (id: number) => {
    const updated = masterList.filter(d => d.id !== id);
    setMasterList(updated);
    try {
      localStorage.setItem('eternal_db', JSON.stringify(updated));
    } catch (e) {}

    fetch(`/api/deceased?id=${id}`, { method: 'DELETE' }).catch(e => console.error("Delete sync error:", e));
  };

  const handleImportDeceased = async (newList: Deceased[]) => {
    const merged = smartMergeDeceasedLists(masterList, newList);
    const updated = deduplicateSingleList(merged);
    setMasterList(updated);
    try {
      localStorage.setItem('eternal_db', JSON.stringify(updated));
    } catch (e) {}
  };

  const t = translations[lang];
  const isRtl = lang === 'he';

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-[#f0f4f8] pb-12" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto px-4 pt-6">
        
        {/* כותרת מתחלפת ושפות */}
        <header className="flex flex-col items-center justify-center border-b border-[#c8a96e]/20 pb-6 mb-8 gap-6 text-center">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-serif font-bold text-[#c8a96e]">{t.title}</h1>
            
            {/* בחירת שפה */}
            <div className="flex items-center bg-[#1a1a1a] rounded-lg p-1 border border-[#c8a96e]/30">
              {(['he', 'en', 'ru'] as Language[]).map((l) => (
                <button
                  key={l}
                  onClick={() => handleLanguageChange(l)}
                  className={`px-3 py-1 text-xs font-bold rounded transition-colors ${
                    lang === l ? 'bg-[#c8a96e] text-black' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {translating && (
            <div className="flex items-center gap-2 text-xs text-[#c8a96e] animate-pulse">
              <Sparkles className="w-4 h-4" />
              <span>מתרגם נתונים...</span>
            </div>
          )}
          {translationError && (
            <div className="text-xs text-red-400">{translationError}</div>
          )}

          {/* תפריט לשוניות (לוח שנה, ספר, גריד, יבוא) */}
          <nav className="flex flex-wrap justify-center gap-2 bg-[#141414] p-1.5 rounded-xl border border-[#c8a96e]/20">
            <button
              onClick={() => setActiveTab('calendar')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'calendar' ? 'bg-[#c8a96e] text-black font-bold' : 'text-gray-300 hover:bg-[#222]'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>{t.calendarView || 'לוח שנה'}</span>
            </button>

            <button
              onClick={() => setActiveTab('book')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'book' ? 'bg-[#c8a96e] text-black font-bold' : 'text-gray-300 hover:bg-[#222]'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>{t.memorialBook || 'ספר הנצחה'}</span>
            </button>

            <button
              onClick={() => setActiveTab('grid')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'grid' ? 'bg-[#c8a96e] text-black font-bold' : 'text-gray-300 hover:bg-[#222]'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span>{t.quickGrid || 'לוח קוביות'}</span>
            </button>

            <button
              onClick={() => setActiveTab('import')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'import' ? 'bg-[#c8a96e] text-black font-bold' : 'text-gray-300 hover:bg-[#222]'
              }`}
            >
              <FileDown className="w-4 h-4" />
              <span>{t.importData || 'יבוא נתונים'}</span>
            </button>
          </nav>
        </header>

        {/* לוח המודעות העליון */}
        <BulletinBoard deceasedList={displayedList} lang={lang} onSelectDeceased={setSelectedDeceased} />

        {/* תוכן המערכת בהתאם לטאב הנבחר */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6">
          <div className="lg:col-span-2 space-y-6">
            {activeTab === 'calendar' && (
              <DynamicCalendar deceasedList={displayedList} lang={lang} onSelectDeceased={setSelectedDeceased} />
            )}
            {activeTab === 'book' && (
              <MemorialBook 
                deceasedList={displayedList} 
                lang={lang} 
                onSelectDeceased={setSelectedDeceased} 
                onEditDeceased={setEditingDeceased}
                onDeleteDeceased={handleDeleteDeceased}
              />
            )}
            {activeTab === 'grid' && (
              <Quick30Grid deceasedList={displayedList} lang={lang} onSelectDeceased={setSelectedDeceased} />
            )}
            {activeTab === 'import' && (
              <BulkImport lang={lang} onImport={handleImportDeceased} />
            )}
          </div>

          {/* טופס הוספה / עריכה */}
          <div>
            <MemorialForm lang={lang} onSave={handleSaveDeceased} editingDeceased={editingDeceased} />
          </div>
        </div>
      </div>

      {/* חלון מודעה ממוקד שנפתח אוטומטית כשיש data בקישור */}
      {selectedDeceased && (
        <MemorialDetailsModal
          deceased={selectedDeceased}
          lang={lang}
          onClose={() => {
            setSelectedDeceased(null);
            window.history.replaceState({}, document.title, window.location.pathname);
          }}
        />
      )}
    </div>
  );
}
