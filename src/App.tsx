/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Deceased, Language } from './types';
import { translations } from './utils/translations';
import { BulletinBoard } from './components/BulletinBoard';
import { MemorialForm } from './components/MemorialForm';
import { MemorialBook } from './components/MemorialBook';
import { DynamicCalendar } from './components/DynamicCalendar';
import { MemorialDetailsModal } from './components/MemorialDetailsModal';
import { decodeDeceasedFromUrlPayload, encodeDeceasedToUrlPayload } from './utils/shareUtils';
import { deduplicateSingleList } from './utils/deduplication';

export default function App() {
  const [lang, setLang] = useState<Language>(() => {
    const params = new URLSearchParams(window.location.search);
    const urlLang = params.get('lang');
    if (urlLang === 'en' || urlLang === 'ru' || urlLang === 'he') {
      return urlLang as Language;
    }
    return 'he';
  });
  
  const [activeTab, setActiveTab] = useState<'calendar' | 'book'>('calendar');
  const [masterList, setMasterList] = useState<Deceased[]>([]);
  const [displayedList, setDisplayedList] = useState<Deceased[]>([]);
  const [editingDeceased, setEditingDeceased] = useState<Deceased | null>(null);
  
  // חלון המודעה הספציפי שייפתח
  const [selectedDeceased, setSelectedDeceased] = useState<Deceased | null>(null);

  // חילוץ כרטיס מתוך הקישור (URL payload)
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
          // מציג מיד את חלון המודעה הממוקד של הנפטר
          setSelectedDeceased(decoded);

          // שומר אותו ברשימה המקומית
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

  // טעינת הנתונים
  useEffect(() => {
    const loadDatabase = async () => {
      let stored = null;
      try {
        stored = localStorage.getItem('eternal_db');
      } catch (e) {}
      
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setMasterList(deduplicateSingleList(parsed));
        } catch (err) {}
      }
    };
    loadDatabase();
  }, []);

  useEffect(() => {
    setDisplayedList(masterList);
  }, [masterList]);

  const handleSaveDeceased = async (deceased: Deceased) => {
    let updated = masterList.some(d => d.id === deceased.id)
      ? masterList.map(d => d.id === deceased.id ? deceased : d)
      : [...masterList, deceased];

    setMasterList(updated);
    try {
      localStorage.setItem('eternal_db', JSON.stringify(updated));
    } catch (e) {}
    setEditingDeceased(null);
  };

  const t = translations[lang];
  const isRtl = lang === 'he';

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-[#f0f4f8] pb-12" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto px-4 pt-6">
        <header className="flex flex-col items-center justify-center border-b border-[#c8a96e]/20 pb-6 mb-8 gap-6 text-center">
          <h1 className="text-3xl font-serif font-bold text-[#c8a96e]">{t.title}</h1>
        </header>

        <BulletinBoard deceasedList={displayedList} lang={lang} onSelectDeceased={setSelectedDeceased} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6">
          <div className="lg:col-span-2 space-y-6">
            {activeTab === 'calendar' && <DynamicCalendar deceasedList={displayedList} lang={lang} onSelectDeceased={setSelectedDeceased} />}
            {activeTab === 'book' && <MemorialBook deceasedList={displayedList} lang={lang} onSelectDeceased={setSelectedDeceased} />}
          </div>
          <div>
            <MemorialForm lang={lang} onSave={handleSaveDeceased} editingDeceased={editingDeceased} />
          </div>
        </div>
      </div>

      {/* חלון המודעה הממוקד של הנפטר */}
      {selectedDeceased && (
        <MemorialDetailsModal
          deceased={selectedDeceased}
          lang={lang}
          onClose={() => {
            setSelectedDeceased(null);
            // מנקה את השאילתה מה-URL במידה ורוצים
            window.history.replaceState({}, document.title, window.location.pathname);
          }}
        />
      )}
    </div>
  );
}
