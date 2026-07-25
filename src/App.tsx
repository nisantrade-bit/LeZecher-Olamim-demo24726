/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Deceased, Language } from './types';
import { translations } from './utils/translations';
import { getHebrewDate } from './utils/hebrewDate';
import { BulletinBoard } from './components/BulletinBoard';
import { MemorialForm } from './components/MemorialForm';
import { BulkImport } from './components/BulkImport';
import { MemorialBook } from './components/MemorialBook';
import { DynamicCalendar } from './components/DynamicCalendar';
import { Quick30Grid } from './components/Quick30Grid';
import { MemorialDetailsModal } from './components/MemorialDetailsModal';
import { Calendar, BookOpen, LayoutGrid, FileDown, Globe, Sparkles, AlertTriangle } from 'lucide-react';
import { DeceasedMemorialPage } from './components/DeceasedMemorialPage';
import { decodeDeceasedFromUrlPayload, encodeDeceasedToUrlPayload } from './utils/shareUtils';
import { translateDeceasedListClientSide } from './utils/transliteration';
import { smartMergeDeceasedLists, deduplicateSingleList } from './utils/deduplication';
import { motion } from 'motion/react';

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
  const [selectedDeceased, setSelectedDeceased] = useState<Deceased | null>(null);

  // Manage direct deceased link view state
  const [urlDeceasedId, setUrlDeceasedId] = useState<number | null>(() => {
    const pathMatch = window.location.pathname.match(/\/(?:m|p|deceased)\/(\d+)(?:\.html)?/i);
    if (pathMatch && pathMatch[1]) {
      const id = parseInt(pathMatch[1], 10);
      if (!isNaN(id)) return id;
    }

    const params = new URLSearchParams(window.location.search);
    const idStr = params.get('d') || params.get('id') || params.get('deceased');
    if (idStr) {
      const id = parseInt(idStr, 10);
      if (!isNaN(id)) return id;
    }

    const hash = window.location.hash;
    const hashMatch = hash.match(/(?:m\/|d=|id=|deceased=)(\d+)/i);
    if (hashMatch && hashMatch[1]) {
      const id = parseInt(hashMatch[1], 10);
      if (!isNaN(id)) return id;
    }

    return null;
  });

  // Parse direct Deceased payload from URL if present
  const [urlDeceasedFromPayload, setUrlDeceasedFromPayload] = useState<Deceased | null>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      let dataStr = params.get('data') || params.get('payload') || params.get('card');

      if (!dataStr && window.location.hash) {
        const hash = window.location.hash;
        const hashMatch = hash.match(/[?&](?:data|payload|card)=([^&]+)/i) || hash.match(/(?:data|payload|card)=([^&]+)/i);
        if (hashMatch && hashMatch[1]) {
          dataStr = hashMatch[1];
        }
      }

      if (dataStr) {
        return decodeDeceasedFromUrlPayload(dataStr);
      }
    } catch (e) {
      console.error("Error parsing url payload:", e);
    }
    return null;
  });

  const [fetchingRemoteDeceased, setFetchingRemoteDeceased] = useState<boolean>(false);
  const [remoteDeceasedNotFound, setRemoteDeceasedNotFound] = useState<boolean>(false);

  // Automatically save URL payload deceased into masterList, localStorage, and cloud server database
  useEffect(() => {
    if (urlDeceasedFromPayload) {
      setMasterList(prev => {
        const exists = prev.some(d => Number(d.id) === Number(urlDeceasedFromPayload.id));
        if (!exists) {
          const updated = [urlDeceasedFromPayload, ...prev];
          try {
            localStorage.setItem('eternal_db', JSON.stringify(updated));
          } catch (e) {
            console.error("Storage access error:", e);
          }
          return updated;
        }
        return prev;
      });

      if (!(window as any).__OFFLINE_DATABASE_DATA__) {
        fetch('/api/deceased', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(urlDeceasedFromPayload)
        }).catch(e => console.error("Cloud database sync error:", e));
      }
    }
  }, [urlDeceasedFromPayload]);

  // Load database on mount
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

  useEffect(() => {
    setDisplayedList(masterList);
  }, [masterList, lang]);

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

  const handleDeleteDeceased = async (id: number) => {
    const updated = masterList.filter(d => d.id !== id);
    setMasterList(updated);
    try {
      localStorage.setItem('eternal_db', JSON.stringify(updated));
    } catch (e) {}
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

  // Render standalone memorial page if accessed directly
  if (urlDeceasedId || urlDeceasedFromPayload) {
    const targetId = urlDeceasedId || (urlDeceasedFromPayload ? Number(urlDeceasedFromPayload.id) : null);
    let urlDeceased = (targetId ? displayedList.find(d => Number(d.id) === targetId) : null) ||
                      (targetId ? masterList.find(d => Number(d.id) === targetId) : null) ||
                      urlDeceasedFromPayload;

    if (urlDeceased) {
      const currentPayload = encodeDeceasedToUrlPayload(urlDeceased);
      const targetUrl = `${window.location.origin}/?data=${currentPayload}${lang !== 'he' ? `&lang=${lang}` : ''}`;
      if (typeof window !== 'undefined' && window.location.href !== targetUrl) {
        window.history.replaceState({}, document.title, targetUrl);
      }

      return (
        <DeceasedMemorialPage 
          deceased={urlDeceased} 
          lang={lang} 
          onSetLang={setLang} 
          onExit={() => {
            setUrlDeceasedId(null);
            setUrlDeceasedFromPayload(null);
            window.history.replaceState({}, document.title, '/');
          }} 
        />
      );
    }
  }

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
    </div>
  );
}
