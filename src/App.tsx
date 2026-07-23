/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Deceased, Language } from './types';
import { translations } from './utils/translations';
import { getHebrewDate, HEBREW_MONTHS_HE } from './utils/hebrewDate';
import { BulletinBoard } from './components/BulletinBoard';
import { MemorialForm } from './components/MemorialForm';
import { BulkImport } from './components/BulkImport';
import { MemorialBook } from './components/MemorialBook';
import { DynamicCalendar } from './components/DynamicCalendar';
import { Quick30Grid } from './components/Quick30Grid';
import { MemorialDetailsModal } from './components/MemorialDetailsModal';
import { Flame, Calendar, BookOpen, LayoutGrid, FileDown, Globe, Sparkles, AlertTriangle } from 'lucide-react';
import { DeceasedMemorialPage } from './components/DeceasedMemorialPage';
import { decodeDeceasedFromUrlPayload } from './utils/shareUtils';
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
    return 'he'; // Default to Hebrew
  });
  const [activeTab, setActiveTab] = useState<'calendar' | 'book' | 'grid' | 'import'>('calendar');
  const [masterList, setMasterList] = useState<Deceased[]>([]);
  const [displayedList, setDisplayedList] = useState<Deceased[]>([]);
  const [translating, setTranslating] = useState<boolean>(false);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [editingDeceased, setEditingDeceased] = useState<Deceased | null>(null);
  const [selectedDeceased, setSelectedDeceased] = useState<Deceased | null>(null);

  // Manage direct deceased link view state across pathname /m/123, query ?d=123, and hash #m/123
  const [urlDeceasedId, setUrlDeceasedId] = useState<number | null>(() => {
    // 1. Pathname check (/m/12345, /m/12345.html, /p/12345, /deceased/12345)
    const pathMatch = window.location.pathname.match(/\/(?:m|p|deceased)\/(\d+)(?:\.html)?/i);
    if (pathMatch && pathMatch[1]) {
      const id = parseInt(pathMatch[1], 10);
      if (!isNaN(id)) return id;
    }

    // 2. Query param check (?d=12345, ?id=12345, ?deceased=12345)
    const params = new URLSearchParams(window.location.search);
    const idStr = params.get('d') || params.get('id') || params.get('deceased');
    if (idStr) {
      const id = parseInt(idStr, 10);
      if (!isNaN(id)) return id;
    }

    // 3. Hash check (#m/12345 or #d=12345)
    const hash = window.location.hash;
    const hashMatch = hash.match(/(?:m\/|d=|id=|deceased=)(\d+)/i);
    if (hashMatch && hashMatch[1]) {
      const id = parseInt(hashMatch[1], 10);
      if (!isNaN(id)) return id;
    }

    return null;
  });

  // Parse direct Deceased payload from URL if present (e.g. ?data=...)
  const [urlDeceasedFromPayload] = useState<Deceased | null>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const dataStr = params.get('data');
      if (dataStr) {
        return decodeDeceasedFromUrlPayload(dataStr);
      }
    } catch (e) {
      console.error("Error parsing url payload:", e);
    }
    return null;
  });

  // Automatically save URL payload deceased into masterList and localStorage
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
    }
  }, [urlDeceasedFromPayload]);

  // Load database from Server API on mount (collaborative persistence)
  useEffect(() => {
    const loadDatabase = async () => {
      // Standalone Offline mode check
      if ((window as any).__OFFLINE_DATABASE_DATA__) {
        const offlineData = (window as any).__OFFLINE_DATABASE_DATA__;
        console.log("Running in standalone offline mode, pre-populated database data loaded:", offlineData);
        let stored = null;
        try {
          stored = localStorage.getItem('eternal_db');
        } catch (e) {
          console.error("Storage access error:", e);
        }
        if (stored) {
          try {
            setMasterList(deduplicateSingleList(JSON.parse(stored)));
          } catch (err) {
            setMasterList(deduplicateSingleList(offlineData));
          }
        } else {
          setMasterList(deduplicateSingleList(offlineData));
          try {
            localStorage.setItem('eternal_db', JSON.stringify(deduplicateSingleList(offlineData)));
          } catch (e) {
            console.error("Storage access error:", e);
          }
        }
        return;
      }

      try {
        const response = await fetch('/api/deceased');
        if (response.ok) {
          const data = await response.json();
          const cleanData = deduplicateSingleList(data);
          setMasterList(cleanData);
          try {
            localStorage.setItem('eternal_db', JSON.stringify(cleanData));
          } catch (e) {
            console.error("Storage access error:", e);
          }
          return;
        }
      } catch (err) {
        console.error("Failed to load database from server, using local storage fallback:", err);
      }

      // Local storage fallback
      let stored = null;
      try {
        stored = localStorage.getItem('eternal_db');
      } catch (e) {
        console.error("Storage access error:", e);
      }
      
      if (stored) {
        try {
          setMasterList(deduplicateSingleList(JSON.parse(stored)));
        } catch (err) {
          console.error("Error loading eternal_db", err);
        }
      } else {
        const todayHeb = getHebrewDate(new Date());
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowHeb = getHebrewDate(tomorrow);

        const seedData: Deceased[] = [
          {
            id: 1718882041001,
            name: "אברהם אבינו",
            gender: "male",
            fatherName: "תרח",
            motherName: "אמתלאי",
            day: todayHeb.day,
            month: todayHeb.normalizedMonth,
            contactPhone: "052-1234567",
            notes: "אבי האומה העברית, איש החסד והאמונה. נפטר בשיבה טובה ומנוחתו במערת המכפלה בחברון."
          },
          {
            id: 1718882041002,
            name: "שרה אמנו",
            gender: "female",
            fatherName: "הרן",
            motherName: "מלכה",
            day: tomorrowHeb.day,
            month: tomorrowHeb.normalizedMonth,
            contactPhone: "050-9876543",
            notes: "אמינו הראשונה, סמל לצניעות, חסד והכנסת אורחים. נפטרה בקרית ארבע היא חברון."
          }
        ];
        setMasterList(seedData);
        try {
          localStorage.setItem('eternal_db', JSON.stringify(seedData));
        } catch (e) {
          console.error("Storage access error:", e);
        }
      }
    };
    loadDatabase();
  }, []);

  // Language translation handler
  const handleLanguageChange = (targetLang: Language) => {
    setLang(targetLang);
    setTranslationError(null);
  };

  // Helper to verify if list items match expected language script
  const isListInTargetLanguage = (list: Deceased[], targetLang: Language): boolean => {
    if (!list || list.length === 0) return false;
    
    if (targetLang === 'he') {
      return !list.some(item => /[a-zA-Z\u0400-\u04FF]/.test(`${item.name} ${item.fatherName || ''} ${item.motherName || ''} ${item.notes || ''}`));
    }
    if (targetLang === 'ru') {
      return !list.some(item => /[\u0590-\u05FFa-zA-Z]/.test(`${item.name} ${item.fatherName || ''} ${item.motherName || ''} ${item.notes || ''}`));
    }
    if (targetLang === 'en') {
      return !list.some(item => /[\u0590-\u05FF\u0400-\u04FF]/.test(`${item.name} ${item.fatherName || ''} ${item.motherName || ''} ${item.notes || ''}`));
    }
    return true;
  };

  // Synchronize and translate displayedList whenever masterList OR lang changes
  useEffect(() => {
    const syncAndTranslate = async () => {
      if (masterList.length === 0) {
        setDisplayedList([]);
        return;
      }

      setTranslationError(null);

      // Generate fingerprint based on all masterList values to prevent stale cache on updates
      const currentFingerprint = JSON.stringify(masterList);

      // 1. Check local cache first, ensuring valid target language script
      let cachedStr = null;
      let cachedFingerprint = null;
      try {
        cachedStr = localStorage.getItem(`eternal_db_translated_${lang}`);
        cachedFingerprint = localStorage.getItem(`eternal_db_translated_${lang}_fingerprint`);
      } catch (e) {
        console.error("Storage access error:", e);
      }

      if (cachedStr && cachedFingerprint === currentFingerprint) {
        try {
          const cachedList = JSON.parse(cachedStr) as Deceased[];
          if (isListInTargetLanguage(cachedList, lang)) {
            setDisplayedList(cachedList);
            return;
          } else {
            localStorage.removeItem(`eternal_db_translated_${lang}`);
            localStorage.removeItem(`eternal_db_translated_${lang}_fingerprint`);
          }
        } catch (e) {
          console.error("Error reading cached translation", e);
        }
      }

      if (lang === 'he') {
        const hasNonHebrewText = masterList.some(item => 
          /[a-zA-Z\u0400-\u04FF]/.test(`${item.name} ${item.fatherName || ''} ${item.motherName || ''} ${item.notes || ''}`)
        );

        if (!hasNonHebrewText) {
          setDisplayedList(masterList);
          try {
            localStorage.setItem('eternal_db_translated_he', JSON.stringify(masterList));
            localStorage.setItem('eternal_db_translated_he_fingerprint', currentFingerprint);
          } catch (e) {
            console.error("Storage access error:", e);
          }
          return;
        }
      }

      // 2. Perform high-precision translation via API (with fallback if needed)
      setTranslating(true);
      try {
        const response = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deceasedList: masterList, targetLang: lang })
        });

        if (!response.ok) {
          throw new Error(`Translation status ${response.status}`);
        }

        const data = await response.json();
        if (data.translatedList && Array.isArray(data.translatedList) && data.translatedList.length > 0) {
          // Guarantee 100% target script transliteration/translation
          const fullyTranslated = translateDeceasedListClientSide(data.translatedList, lang);
          setDisplayedList(fullyTranslated);
          try {
            localStorage.setItem(`eternal_db_translated_${lang}`, JSON.stringify(fullyTranslated));
            localStorage.setItem(`eternal_db_translated_${lang}_fingerprint`, currentFingerprint);
          } catch (e) {
            console.error("Storage access error:", e);
          }
        } else {
          throw new Error("Invalid translation response structure");
        }
      } catch (err: any) {
        const fallbackTranslated = translateDeceasedListClientSide(masterList, lang);
        setDisplayedList(fallbackTranslated);
        try {
          localStorage.setItem(`eternal_db_translated_${lang}`, JSON.stringify(fallbackTranslated));
          localStorage.setItem(`eternal_db_translated_${lang}_fingerprint`, currentFingerprint);
        } catch (e) {
          console.error("Storage access error:", e);
        }
      } finally {
        setTranslating(false);
      }
    };

    syncAndTranslate();
  }, [masterList, lang]);

  // Synchronize selectedDeceased with the currently active translation in displayedList
  useEffect(() => {
    if (selectedDeceased) {
      const updated = displayedList.find(d => Number(d.id) === Number(selectedDeceased.id));
      if (updated && JSON.stringify(updated) !== JSON.stringify(selectedDeceased)) {
        setSelectedDeceased(updated);
      }
    }
  }, [displayedList, selectedDeceased]);

  // Save or update deceased record with backend sync
  const handleSaveDeceased = async (deceased: Deceased) => {
    let updated: Deceased[] = [];
    const exists = masterList.some(d => d.id === deceased.id);

    if (exists) {
      updated = masterList.map(d => d.id === deceased.id ? deceased : d);
    } else {
      updated = [...masterList, deceased];
    }

    if (!(window as any).__OFFLINE_DATABASE_DATA__) {
      try {
        await fetch('/api/deceased', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(deceased)
        });
      } catch (e) {
        console.error("Failed to save record to server database:", e);
      }
    }

    // Clear caches to force re-translation for ALL languages
    try {
      ['he', 'en', 'ru'].forEach(l => {
        localStorage.removeItem(`eternal_db_translated_${l}`);
        localStorage.removeItem(`eternal_db_translated_${l}_fingerprint`);
      });
    } catch (e) {
      console.error("Storage access error:", e);
    }

    setMasterList(updated);
    try {
      localStorage.setItem('eternal_db', JSON.stringify(updated));
    } catch (e) {
      console.error("Storage access error:", e);
    }
    setEditingDeceased(null);
    if (selectedDeceased && Number(selectedDeceased.id) === Number(deceased.id)) {
      setSelectedDeceased(deceased);
    }
  };

  // Delete a deceased record with backend sync
  const handleDeleteDeceased = async (id: number) => {
    const updated = masterList.filter(d => d.id !== id);

    if (!(window as any).__OFFLINE_DATABASE_DATA__) {
      try {
        await fetch(`/api/deceased/${id}`, {
          method: 'DELETE'
        });
      } catch (e) {
        console.error("Failed to delete record from server database:", e);
      }
    }

    // Clear caches for ALL languages
    try {
      ['he', 'en', 'ru'].forEach(l => {
        localStorage.removeItem(`eternal_db_translated_${l}`);
        localStorage.removeItem(`eternal_db_translated_${l}_fingerprint`);
      });
    } catch (e) {
      console.error("Storage access error:", e);
    }

    setMasterList(updated);
    try {
      localStorage.setItem('eternal_db', JSON.stringify(updated));
    } catch (e) {
      console.error("Storage access error:", e);
    }
    if (editingDeceased?.id === id) {
      setEditingDeceased(null);
    }
  };

  // Bulk import deceased records with smart deduplication & backend sync
  const handleImportDeceased = async (newList: Deceased[]) => {
    // 1. Convert incoming records to canonical Hebrew if needed
    let hebrewImportList = newList;
    try {
      hebrewImportList = translateDeceasedListClientSide(newList, 'he');
    } catch (e) {
      console.error("Client side translation error during import:", e);
    }

    // 2. Smart merge with existing masterList to prevent duplicates across files
    const merged = smartMergeDeceasedLists(masterList, hebrewImportList);
    const updated = deduplicateSingleList(merged);

    if (!(window as any).__OFFLINE_DATABASE_DATA__) {
      try {
        await fetch('/api/deceased/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(hebrewImportList)
        });
      } catch (e) {
        console.error("Failed to import records to server database:", e);
      }
    }

    // Clear caches
    try {
      localStorage.removeItem('eternal_db_translated_he');
      localStorage.removeItem('eternal_db_translated_en');
      localStorage.removeItem('eternal_db_translated_ru');
    } catch (e) {
      console.error("Storage access error:", e);
    }

    setMasterList(updated);
    try {
      localStorage.setItem('eternal_db', JSON.stringify(updated));
    } catch (e) {
      console.error("Storage access error:", e);
    }
  };

  // Clean and deduplicate current database
  const handleCleanDuplicates = async () => {
    const cleaned = deduplicateSingleList(masterList);
    setMasterList(cleaned);
    try {
      localStorage.setItem('eternal_db', JSON.stringify(cleaned));
      localStorage.removeItem('eternal_db_translated_he');
      localStorage.removeItem('eternal_db_translated_en');
      localStorage.removeItem('eternal_db_translated_ru');
    } catch (e) {
      console.error("Storage access error:", e);
    }
  };

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showDuplicatesManager, setShowDuplicatesManager] = useState(false);

  // Auto-deduplicate master list helper
  const updateMasterListClean = (rawList: Deceased[]) => {
    const cleanList = deduplicateSingleList(rawList);
    setMasterList(cleanList);
    try {
      localStorage.setItem('eternal_db', JSON.stringify(cleanList));
      localStorage.removeItem('eternal_db_translated_he');
      localStorage.removeItem('eternal_db_translated_en');
      localStorage.removeItem('eternal_db_translated_ru');
    } catch (e) {
      console.error("Storage access error:", e);
    }
    return cleanList;
  };
  const getDuplicateGroups = () => {
    const groupsMap: { [key: string]: Deceased[] } = {};
    masterList.forEach(item => {
      const key = `${item.name.trim().toLowerCase()}_${item.day}_${item.month.trim()}`;
      if (!groupsMap[key]) {
        groupsMap[key] = [];
      }
      groupsMap[key].push(item);
    });

    const duplicateGroups: { name: string; day: number; month: string; items: Deceased[] }[] = [];
    Object.keys(groupsMap).forEach(key => {
      if (groupsMap[key].length > 1) {
        const firstItem = groupsMap[key][0];
        duplicateGroups.push({
          name: firstItem.name,
          day: firstItem.day,
          month: firstItem.month,
          items: groupsMap[key]
        });
      }
    });
    return duplicateGroups;
  };

  const handleResolveDuplicateGroup = async (groupItems: Deceased[]) => {
    // Keep the first item, delete all other items
    const toKeep = groupItems[0];
    const toDelete = groupItems.slice(1);
    
    for (const item of toDelete) {
      await handleDeleteDeceased(item.id);
    }
  };

  const handleResetDatabase = async () => {
    if (!(window as any).__OFFLINE_DATABASE_DATA__) {
      try {
        await fetch('/api/deceased', {
          method: 'DELETE'
        });
      } catch (err) {
        console.error("Failed to reset database on server:", err);
      }
    }

    setMasterList([]);
    setDisplayedList([]);
    try {
      localStorage.removeItem('eternal_db');
      localStorage.removeItem('eternal_memories');
      localStorage.removeItem('eternal_db_translated_he');
      localStorage.removeItem('eternal_db_translated_en');
      localStorage.removeItem('eternal_db_translated_ru');
    } catch (e) {
      console.error("Storage access error:", e);
    }
    setShowResetConfirm(false);
  };

  const t = translations[lang];
  const isRtl = lang === 'he';

  // Render standalone memorial page if a specific deceased link is accessed
  if (urlDeceasedId) {
    let urlDeceased = displayedList.find(d => Number(d.id) === urlDeceasedId);
    if (!urlDeceased) {
      // Fallback to masterList so the page never "disappears"
      urlDeceased = masterList.find(d => Number(d.id) === urlDeceasedId);
    }
    if (!urlDeceased && urlDeceasedFromPayload && Number(urlDeceasedFromPayload.id) === urlDeceasedId) {
      urlDeceased = urlDeceasedFromPayload;
    }

    if (urlDeceased) {
      return (
        <DeceasedMemorialPage 
          deceased={urlDeceased} 
          lang={lang} 
          onSetLang={(newLang) => {
            setLang(newLang);
            const newUrl = `/m/${urlDeceasedId}?lang=${newLang}`;
            window.history.replaceState({}, document.title, newUrl);
          }} 
          onExit={() => {
            setUrlDeceasedId(null);
            window.history.replaceState({}, document.title, '/');
          }} 
        />
      );
    }

    if (displayedList.length === 0 && masterList.length === 0 && !urlDeceasedFromPayload) {
      return (
        <div className="min-h-screen bg-[#070b12] text-gray-100 flex flex-col items-center justify-center font-sans gap-3">
          <div className="w-8 h-8 border-4 border-[#c8a96e] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-[#c8a96e] font-medium font-sans">טוען דף הנצחה אישי...</p>
        </div>
      );
    }

    // Fallback if deceased ID is invalid or deleted
    return (
      <div className="min-h-screen bg-[#070b12] text-gray-100 flex flex-col items-center justify-center font-sans gap-4 p-4 text-center">
        <p className="text-base text-amber-400 font-bold">לא נמצא דף הנצחה עבור כרטיס זה.</p>
        <p className="text-xs text-gray-400">יתכן שהכרטיס אינו קיים במערכת או שהקישור שונה.</p>
        <button 
          onClick={() => {
            setUrlDeceasedId(null);
            window.history.replaceState({}, document.title, '/');
          }}
          className="px-4 py-2 bg-[#c8a96e] hover:bg-[#b8952e] text-black text-xs font-bold rounded-xl transition-all cursor-pointer"
        >
          חזרה למערכת ההנצחה הכללית ←
        </button>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-[#0d0d0d] text-[#f0f4f8] selection:bg-[#c8a96e] selection:text-black pb-12 transition-all duration-300"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Dynamic Background Grain overlay */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(20,30,48,0.5),rgba(13,13,13,1))] pointer-events-none z-0"></div>

      {/* Main Content Area */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        
        {/* Navigation & Language Header */}
        <header className="flex flex-col items-center justify-center border-b border-[#c8a96e]/20 pb-6 mb-8 gap-6 w-full text-center">
          
          {/* Centered Logo / Title with Large Live Burning Candle */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 group">
            
            {/* Beautiful Live Burning Memorial Candle (Animation) */}
            <div className="relative w-16 h-28 flex flex-col items-center justify-end shrink-0 select-none">
              {/* Flame */}
              <motion.div 
                className="absolute top-1 w-4 h-7 bg-amber-400 rounded-full blur-[0.5px] shadow-[0_0_15px_#f59e0b,0_0_25px_#f59e0b] origin-bottom animate-pulse"
                animate={{
                  scaleY: [1, 1.15, 0.95, 1.1, 1],
                  scaleX: [1, 0.9, 1.1, 0.95, 1],
                  rotate: [0, -3, 3, -1, 0],
                  x: [0, -0.5, 0.5, -0.5, 0]
                }}
                transition={{
                  duration: 1.4,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <div className="absolute bottom-1 left-1 w-2 h-3 bg-yellow-100 rounded-full opacity-95 shadow-[0_0_6px_#fff]"></div>
                <div className="absolute bottom-0 left-1.5 w-1 h-1.5 bg-blue-500 rounded-full opacity-70"></div>
              </motion.div>
              
              {/* Candle Body */}
              <div className="w-9 h-14 bg-gradient-to-t from-amber-700 via-amber-600 to-amber-500/80 rounded-md shadow-inner relative overflow-hidden border border-amber-500/20">
                {/* Wax drips */}
                <div className="absolute top-0 left-1 w-2 h-4 bg-amber-400/50 rounded-full"></div>
                <div className="absolute top-0 left-3.5 w-1 h-6 bg-amber-400/30 rounded-full"></div>
                <div className="absolute top-0 right-1.5 w-1.5 h-3 bg-amber-400/40 rounded-full"></div>
                {/* Wick */}
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-0.5 h-1.5 bg-gray-900"></div>
              </div>
              
              {/* Pedestal */}
              <div className="w-14 h-1.5 bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 rounded-full shadow-lg"></div>
            </div>

            {/* Title text */}
            <div className="flex flex-col items-center sm:items-start text-center sm:text-right">
              <h1 className="text-3xl sm:text-5xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#f0d19e] via-[#c8a96e] to-[#f0d19e] tracking-wide leading-tight">
                {t.title}
              </h1>
              <p className="text-xs sm:text-sm text-[#c8a96e]/80 font-sans mt-2">
                {t.subtitle}
              </p>
            </div>
          </div>

          {/* Language Selector & Standalone Download Container */}
          <div className="flex flex-col sm:flex-row items-center gap-3 mx-auto">
            {/* Language Selector Buttons */}
            <div className="flex items-center gap-1.5 bg-[#131a26]/90 border border-[#c8a96e]/20 p-1.5 rounded-xl shadow-inner font-sans">
              <Globe className="w-3.5 h-3.5 text-gray-500 mx-2" />
              <button
                onClick={() => handleLanguageChange('he')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${lang === 'he' ? 'bg-[#c8a96e] text-black font-bold' : 'text-gray-400 hover:text-white'}`}
              >
                עברית
              </button>
              <button
                onClick={() => handleLanguageChange('en')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${lang === 'en' ? 'bg-[#c8a96e] text-black font-bold' : 'text-gray-400 hover:text-white'}`}
              >
                English
              </button>
              <button
                onClick={() => handleLanguageChange('ru')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${lang === 'ru' ? 'bg-[#c8a96e] text-black font-bold' : 'text-gray-400 hover:text-white'}`}
              >
                Русский
              </button>
            </div>

            {/* Standalone Single File Download Button */}
            <a
              href="/index_single.html"
              download="index.html"
              className="flex items-center gap-2 bg-gradient-to-r from-amber-600/20 to-amber-700/20 hover:from-amber-600/30 hover:to-amber-700/30 text-[#c8a96e] border border-[#c8a96e]/30 px-4 py-2 rounded-xl text-xs font-semibold transition-all shadow-md font-sans"
              title={lang === 'he' ? 'הורד גרסת קובץ בודד ללא צורך באינטרנט' : lang === 'ru' ? 'Скачать автономную версию' : 'Download standalone offline version'}
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>
                {lang === 'he' ? 'הורד קובץ INDEX.HTML עצמאי' : lang === 'ru' ? 'Скачать файл INDEX.HTML' : 'Download Standalone INDEX.HTML'}
              </span>
            </a>
          </div>
        </header>

        {/* Dynamic translation progress / feedback panel */}
        {translating && (
          <div className="mb-6 bg-gradient-to-r from-amber-600/10 via-amber-700/10 to-amber-600/10 border border-[#c8a96e]/20 px-4 py-3.5 rounded-xl flex items-center justify-between animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 border-2 border-[#c8a96e] border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs font-sans font-medium text-amber-200">
                {lang === 'he' 
                  ? 'מתרגם את רשומות הזיכרון לעברית באמצעות Gemini AI...' 
                  : lang === 'ru'
                    ? 'Перевод записей на русский язык с помощью Gemini AI...'
                    : 'Translating memorial records via Gemini AI...'}
              </span>
            </div>
            <span className="text-[10px] uppercase font-mono tracking-widest text-[#c8a96e] hidden sm:inline">
              Powered by Gemini 3.5
            </span>
          </div>
        )}

        {translationError && (
          <div className="mb-6 bg-red-950/20 border border-red-500/20 px-4 py-3 rounded-xl flex items-center justify-between text-xs text-red-200 font-sans">
            <span>{translationError}</span>
            <button onClick={() => setTranslationError(null)} className="text-gray-400 hover:text-white font-bold leading-none text-base">×</button>
          </div>
        )}

        {/* Duplicate Entries Alert Banner */}
        {getDuplicateGroups().length > 0 && (
          <div className="mb-6 bg-yellow-950/20 border border-yellow-500/30 px-5 py-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm text-yellow-200 font-sans shadow-lg relative overflow-hidden">
            <div className="absolute top-0 left-0 w-2 h-full bg-yellow-500"></div>
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 animate-pulse" />
              <div>
                <span className="font-semibold block sm:inline">
                  {lang === 'he' 
                    ? `נמצאו כרטיסים כפולים במאגר (${getDuplicateGroups().length} קבוצות כפילויות)!` 
                    : lang === 'ru'
                      ? `Найдены дубликаты в базе данных (${getDuplicateGroups().length} групп)!`
                      : `Duplicate records found in the database (${getDuplicateGroups().length} duplicate groups)!`}
                </span>
                <span className="text-xs text-gray-400 block sm:inline sm:ms-2">
                  {lang === 'he'
                    ? 'מומלץ לנקות כפילויות על מנת לשמור על סדר ושלמות הנתונים.'
                    : lang === 'ru'
                      ? 'Рекомендуется удалить дубликаты для поддержания чистоты данных.'
                      : 'It is recommended to clean duplicates to keep the database tidy.'}
                </span>
              </div>
            </div>
            <button
              onClick={() => setShowDuplicatesManager(true)}
              className="px-4 py-1.5 bg-yellow-500 hover:bg-yellow-400 text-black font-semibold text-xs rounded-lg transition-all shadow cursor-pointer font-sans"
            >
              {lang === 'he' ? 'נהל כפילויות' : lang === 'ru' ? 'Управление дубликатами' : 'Manage Duplicates'}
            </button>
          </div>
        )}

        {/* Real-time Alert Board / Bulletin */}
        <BulletinBoard 
          deceasedList={displayedList} 
          lang={lang} 
          onSelectDeceased={setSelectedDeceased} 
        />

        {/* Two-Column Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Content Area (2 cols on large screen) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* View/Tab Switcher */}
            <div className="grid grid-cols-2 sm:flex sm:flex-nowrap w-full bg-[#131a26]/80 p-1.5 rounded-xl border border-[#c8a96e]/15 font-sans gap-1.5 sm:gap-2 shadow-lg">
              <button
                onClick={() => setActiveTab('calendar')}
                className={`flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-2.5 rounded-lg text-xs sm:text-xs md:text-sm font-semibold transition-all cursor-pointer flex-1 whitespace-nowrap ${
                  activeTab === 'calendar' 
                    ? 'bg-gradient-to-r from-[#c8a96e] to-[#b8952e] text-black shadow font-bold' 
                    : 'text-gray-400 hover:text-white hover:bg-[#c8a96e]/5'
                }`}
                title={t.calendar}
              >
                <Calendar className="w-4 h-4 shrink-0" />
                <span>{t.calendar}</span>
              </button>

              <button
                onClick={() => setActiveTab('book')}
                className={`flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-2.5 rounded-lg text-xs sm:text-xs md:text-sm font-semibold transition-all cursor-pointer flex-1 whitespace-nowrap ${
                  activeTab === 'book' 
                    ? 'bg-gradient-to-r from-[#c8a96e] to-[#b8952e] text-black shadow font-bold' 
                    : 'text-gray-400 hover:text-white hover:bg-[#c8a96e]/5'
                }`}
                title={t.memorialBook}
              >
                <BookOpen className="w-4 h-4 shrink-0" />
                <span>{t.memorialBook}</span>
              </button>

              <button
                onClick={() => setActiveTab('grid')}
                className={`flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-2.5 rounded-lg text-xs sm:text-xs md:text-sm font-semibold transition-all cursor-pointer flex-1 whitespace-nowrap ${
                  activeTab === 'grid' 
                    ? 'bg-gradient-to-r from-[#c8a96e] to-[#b8952e] text-black shadow font-bold' 
                    : 'text-gray-400 hover:text-white hover:bg-[#c8a96e]/5'
                }`}
                title={t.quick30Grid}
              >
                <LayoutGrid className="w-4 h-4 shrink-0" />
                <span>{t.quick30Grid}</span>
              </button>

              <button
                onClick={() => setActiveTab('import')}
                className={`flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-2.5 rounded-lg text-xs sm:text-xs md:text-sm font-semibold transition-all cursor-pointer flex-1 whitespace-nowrap ${
                  activeTab === 'import' 
                    ? 'bg-gradient-to-r from-[#c8a96e] to-[#b8952e] text-black shadow font-bold' 
                    : 'text-gray-400 hover:text-white hover:bg-[#c8a96e]/5'
                }`}
                title={t.importBulk}
              >
                <FileDown className="w-4 h-4 shrink-0" />
                <span>{t.importBulk}</span>
              </button>
            </div>

            {/* Render selected Tab Panel */}
            <div className="transition-all duration-300">
              {activeTab === 'calendar' && (
                <DynamicCalendar 
                  deceasedList={displayedList} 
                  lang={lang} 
                  onSelectDeceased={setSelectedDeceased} 
                />
              )}

              {activeTab === 'book' && (
                <MemorialBook 
                  deceasedList={displayedList} 
                  lang={lang} 
                  onSelectDeceased={setSelectedDeceased} 
                />
              )}

              {activeTab === 'grid' && (
                <Quick30Grid 
                  deceasedList={displayedList} 
                  lang={lang} 
                  onSelectDeceased={setSelectedDeceased} 
                />
              )}

              {activeTab === 'import' && (
                <BulkImport 
                  lang={lang} 
                  onImport={handleImportDeceased} 
                  deceasedList={displayedList}
                  onCleanDuplicates={handleCleanDuplicates}
                />
              )}
            </div>
          </div>

          {/* Side Control Column (Form / Actions) */}
          <div className="space-y-6">
            {!editingDeceased ? (
              <MemorialForm 
                lang={lang} 
                onSave={handleSaveDeceased} 
                editingDeceased={editingDeceased}
                onCancel={editingDeceased ? () => setEditingDeceased(null) : undefined}
              />
            ) : (
              <div className="bg-[#131a26]/40 border border-[#c8a96e]/20 p-6 rounded-xl text-center space-y-3 shadow relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/5 blur-xl rounded-full pointer-events-none"></div>
                <h4 className="text-xs uppercase text-[#c8a96e] tracking-widest font-semibold font-sans">
                  {lang === 'he' ? 'מצב עריכה פעיל' : lang === 'ru' ? 'Режим редактирования' : 'Edit Mode Active'}
                </h4>
                <p className="text-sm text-gray-300">
                  {lang === 'he' 
                    ? 'אנא השלם את עריכת פרטי הנפטר בחלון הפופאפ המרכזי' 
                    : lang === 'ru'
                      ? 'Пожалуйста, заполните форму редактирования в центральном окне'
                      : 'Please complete editing the memorial details in the main popup window.'}
                </p>
                <button
                  type="button"
                  onClick={() => setEditingDeceased(null)}
                  className="bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 text-xs px-3 py-1.5 rounded-lg transition-all cursor-pointer font-sans"
                >
                  {lang === 'he' ? 'ביטול עריכה' : lang === 'ru' ? 'Отмена' : 'Cancel Edit'}
                </button>
              </div>
            )}

            {/* Quick stats panel if not editing */}
            {!editingDeceased && (
              <div className="bg-[#131a26]/40 border border-[#c8a96e]/10 p-5 rounded-xl text-center space-y-2 relative overflow-hidden shadow">
                <div className="absolute top-0 right-0 w-16 h-16 bg-[#c8a96e]/5 blur-xl rounded-full pointer-events-none"></div>
                <h4 className="text-xs uppercase text-[#c8a96e] tracking-widest font-semibold font-sans">
                  {lang === 'he' ? 'סה"כ נפטרים במאגר' : lang === 'ru' ? 'Всего записей' : 'Total Memorials'}
                </h4>
                <p className="text-3xl font-serif font-bold text-white leading-none">
                  {displayedList.length}
                </p>
                <div className="text-[10px] text-gray-500 font-sans flex items-center justify-center gap-1">
                  <Sparkles className="w-3 h-3 text-[#c8a96e]" />
                  <span>{lang === 'he' ? 'יהי זכרם ברוך' : lang === 'ru' ? 'Пусть их память будет благословением' : 'May their memory be a blessing'}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(true)}
                  className="mt-4 w-full bg-red-950/20 hover:bg-red-900/30 text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/40 text-xs font-semibold py-2 px-3 rounded-lg transition-all cursor-pointer font-sans"
                >
                  {lang === 'he' ? 'איפוס המערכת ומחיקת כל השמות' : lang === 'ru' ? 'Сбросить систему и удалить все имена' : 'Reset System & Delete All Names'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Deceased details modal overlay */}
        {selectedDeceased && (
          <MemorialDetailsModal
            deceased={selectedDeceased}
            lang={lang}
            onClose={() => setSelectedDeceased(null)}
            onEdit={(dec) => {
              setEditingDeceased(dec);
              setSelectedDeceased(null);
            }}
            onDelete={handleDeleteDeceased}
          />
        )}

        {/* Dedicated Editing Modal Overlay to avoid getting "thrown out" */}
        {editingDeceased && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-[#131a26] border-2 border-[#c8a96e] rounded-2xl w-full max-w-xl shadow-2xl relative">
              <MemorialForm 
                lang={lang} 
                onSave={(updated) => {
                  handleSaveDeceased(updated);
                  setEditingDeceased(null);
                }} 
                editingDeceased={editingDeceased}
                onCancel={() => setEditingDeceased(null)}
              />
            </div>
          </div>
        )}

        {/* Custom Reset Confirmation Modal */}
        {showResetConfirm && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 font-sans">
            <div className="bg-[#131a26] border border-red-500/40 max-w-md w-full rounded-2xl p-6 shadow-2xl relative space-y-4">
              <div className="flex items-center gap-3 text-red-500">
                <AlertTriangle className="w-8 h-8 shrink-0 animate-bounce" />
                <h3 className="text-xl font-serif font-bold">
                  {lang === 'he' ? 'אזהרת מחיקה חמורה!' : lang === 'ru' ? 'Предупреждение об удалении!' : 'Severe Deletion Warning!'}
                </h3>
              </div>
              
              <p className="text-sm text-gray-300 leading-relaxed">
                {lang === 'he' 
                  ? 'האם אתה בטוח לחלוטין שברצונך למחוק את כל מאגר שמות הנפטרים ולאפס את המערכת? פעולה זו תמחוק את כל השמות ואת כל הדפים האישיים לתמיד ללא יכולת שחזור!' 
                  : lang === 'ru'
                    ? 'Вы абсолютно уверены, что хотите удалить всю базу данных умерших и сбросить систему? Это действие навсегда удалит все имена и личные страницы без возможности восстановления!'
                    : 'Are you absolutely sure you want to delete the entire deceased database and reset the system? This action will permanently erase all names and personal memorial pages forever!'}
              </p>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleResetDatabase}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 rounded-xl transition-all cursor-pointer text-sm"
                >
                  {lang === 'he' ? 'כן, מחק הכל ואפס מערכת' : lang === 'ru' ? 'Да, удалить всё' : 'Yes, delete everything'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold py-2.5 rounded-xl transition-all cursor-pointer text-sm"
                >
                  {lang === 'he' ? 'ביטול וחזרה' : lang === 'ru' ? 'Отмена' : 'Cancel'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Duplicates Manager Modal */}
        {showDuplicatesManager && (
          <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50 font-sans">
            <div className="bg-[#131a26] border border-[#c8a96e]/30 max-w-2xl w-full rounded-2xl p-6 shadow-2xl relative space-y-4 max-h-[85vh] overflow-y-auto">
              <button
                type="button"
                onClick={() => setShowDuplicatesManager(false)}
                className="absolute top-4 left-4 text-gray-400 hover:text-white text-xl font-bold leading-none"
              >
                ×
              </button>

              <div>
                <h3 className="text-xl font-serif font-bold text-[#c8a96e]">
                  {lang === 'he' ? 'ניהול ומיזוג כרטיסים כפולים' : lang === 'ru' ? 'Управление дубликатами' : 'Manage & Clean Duplicate Records'}
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  {lang === 'he' 
                    ? 'השמות הבאים מופיעים מספר פעמים באותו התאריך. באפשרותך למזג אותם ולהשאיר כרטיס אחד בלבד מכל קבוצה.' 
                    : lang === 'ru'
                      ? 'Следующие имена повторяются в одну и ту же дату. Вы можете объединить их и оставить только одну запись.'
                      : 'The following names appear multiple times on the same date. You can merge them and keep only one card.'}
                </p>
              </div>

              <div className="space-y-4 divide-y divide-[#c8a96e]/10 pt-2">
                {getDuplicateGroups().map((group, gIdx) => (
                  <div key={gIdx} className="pt-4 first:pt-0 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="space-y-1 text-right">
                      <h4 className="text-base font-semibold text-white">
                        {group.name}
                      </h4>
                      <p className="text-xs text-[#c8a96e] font-mono">
                        {group.day} {group.month}
                      </p>
                      <div className="text-[11px] text-gray-400">
                        {lang === 'he' 
                          ? `נמצאו ${group.items.length} כרטיסים זהים בשם ובתאריך.` 
                          : lang === 'ru'
                            ? `Найдено ${group.items.length} дублирующих записей.`
                            : `Found ${group.items.length} duplicate records.`}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleResolveDuplicateGroup(group.items)}
                      className="px-4 py-2 bg-gradient-to-r from-[#c8a96e] to-[#b8952e] hover:from-[#b8952e] hover:to-[#a07f24] text-black font-bold text-xs rounded-xl transition-all shadow-lg hover:shadow-[#c8a96e]/10 cursor-pointer"
                    >
                      {lang === 'he' ? 'מזג והשאר רק אחד' : lang === 'ru' ? 'Оставить только одного' : 'Merge & Keep One'}
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-4 border-t border-[#c8a96e]/10">
                <button
                  type="button"
                  onClick={() => setShowDuplicatesManager(false)}
                  className="px-5 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold rounded-xl text-xs transition-all cursor-pointer"
                >
                  {lang === 'he' ? 'סגור' : lang === 'ru' ? 'Закрыть' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
