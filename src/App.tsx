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
import { Flame, Calendar, BookOpen, LayoutGrid, FileDown, Globe, Sparkles, AlertTriangle, Bell, Plus, X, CheckCircle2 } from 'lucide-react';
import { DeceasedMemorialPage } from './components/DeceasedMemorialPage';
import { decodeDeceasedFromUrlPayload, encodeDeceasedToUrlPayload } from './utils/shareUtils';
import { translateDeceasedListClientSide, enrichDeceasedTranslations } from './utils/transliteration';
import { smartMergeDeceasedLists, deduplicateSingleList } from './utils/deduplication';
import { getUpcomingYahrzeits, requestNotificationPermission, sendYahrzeitNotification, UpcomingYahrzeitNotice } from './utils/notifications';
import { motion, AnimatePresence } from 'framer-motion';
import INITIAL_DATABASE from '../database.json';

import { supabase, isSupabaseConfigured, cleanAndDeduplicateSupabase, isMissingTableError, SUPABASE_SETUP_SQL, safeUpsert, safeEq, safeDelete, safeDeleteAll, safeSelect, safeIlike, safeTextSearch, safeSearch, safeInsert, sanitizeRecord, fetchMemorialCardById, normalizeFetchedRecord } from './utils/supabase';
export { supabase, isSupabaseConfigured, cleanAndDeduplicateSupabase, isMissingTableError, SUPABASE_SETUP_SQL, safeUpsert, safeEq, safeDelete, safeDeleteAll, safeSelect, safeIlike, safeTextSearch, safeSearch, safeInsert, sanitizeRecord, fetchMemorialCardById, normalizeFetchedRecord };

const SEED_DATABASE: Deceased[] = [];

const MOCK_IDS = new Set([1718882041001, 1718882041002, 1718882041003, 1718882041004, 1718882041005, 1718882041006]);
const MOCK_NAMES = new Set(["אברהם אבינו", "שרה אמנו", "יוסף בן יעקב", "לאה אמנו", "אלעזר בן אהרן", "מרים הנביאה"]);

function filterOutMockRecords(list: Deceased[]): Deceased[] {
  if (!Array.isArray(list)) return [];
  return list.filter(item => {
    if (!item) return false;
    if (MOCK_IDS.has(Number(item.id))) return false;
    if (MOCK_NAMES.has(item.name?.trim())) return false;
    return true;
  });
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  declare props: ErrorBoundaryProps;
  state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  constructor(props: ErrorBoundaryProps) {
    super(props);
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("App Runtime Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#070b12] text-gray-100 flex flex-col items-center justify-center font-sans gap-6 p-6 text-center" dir="rtl">
          <div className="w-16 h-16 rounded-full bg-red-950/40 border border-red-500/40 flex items-center justify-center text-red-400">
            <AlertTriangle className="w-8 h-8 animate-pulse" />
          </div>
          <div className="space-y-2 max-w-md">
            <h2 className="text-xl font-serif font-bold text-[#c8a96e]">
              אירעה שגיאה בטעינת האפליקציה
            </h2>
            <p className="text-xs text-gray-400 leading-relaxed">
              התרחשה שגיאת הרצה בלתי צפויה. נסה לרענן את הדף כדי לטעון מחדש את המערכת.
            </p>
            {this.state.error?.message && (
              <div className="mt-3 p-3 bg-red-950/20 border border-red-500/20 rounded-xl text-[11px] text-red-300 font-mono text-right overflow-x-auto">
                {this.state.error.message}
              </div>
            )}
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 bg-[#c8a96e] hover:bg-[#b8952e] text-black text-xs font-bold rounded-xl transition-all shadow-lg cursor-pointer flex items-center gap-2"
          >
            <span>רענן דף</span>
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function MainAppContent() {
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
  const [urlDeceasedId, setUrlDeceasedId] = useState<number | string | null>(() => {
   const parseAndDecode = (raw: string | null | undefined): number | string | null => {
  if (!raw) return null;
  let decoded = raw;
  try {
    decoded = decodeURIComponent(decoded).trim();
  } catch (e) {}
  
  const num = parseInt(decoded, 10);
  if (!isNaN(num)) return num; // ממיר למספר בצורה נקייה בלי להיכשל על רווחים
  return decoded || null;
};

    // 1. Pathname check (/m/12345, /p/12345, /deceased/12345, /memorial/12345, /id/12345, /card/12345, /yahrzeit/12345)
    const pathMatch = window.location.pathname.match(/\/(?:m|p|deceased|memorial|id|card|yahrzeit)\/([^\/?#]+)(?:\.html)?/i);
    if (pathMatch && pathMatch[1]) {
      const parsed = parseAndDecode(pathMatch[1]);
      if (parsed !== null) return parsed;
    }

    // 2. Query param check (?id=12345, ?deceasedId=12345, ?m=12345, ?d=12345, ?deceased=12345, ?card=12345, ?cardId=12345)
    const params = new URLSearchParams(window.location.search);
    const rawIdStr = params.get('id') || params.get('m') || params.get('deceasedId') || params.get('deceased') || params.get('d') || params.get('card') || params.get('cardId');
    if (rawIdStr) {
      const parsed = parseAndDecode(rawIdStr);
      if (parsed !== null) return parsed;
    }

    // 3. Hash check (#m/12345, #id=12345, #deceasedId=12345, #memorial=12345)
    const hash = window.location.hash;
    const hashMatch = hash.match(/(?:m\/|m=|d=|id=|deceased=|deceasedId=|card=|cardId=|memorial=)([^\/?#&]+)/i);
    if (hashMatch && hashMatch[1]) {
      const parsed = parseAndDecode(hashMatch[1]);
      if (parsed !== null) return parsed;
    }

    return null;
  });

  // Parse direct Deceased payload from URL if present (?data=..., ?p=..., ?payload=..., ?card=...)
  const [urlDeceasedFromPayload, setUrlDeceasedFromPayload] = useState<Deceased | null>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      let dataStr = params.get('data') || params.get('p') || params.get('payload') || params.get('card') || params.get('d');

      if (!dataStr && window.location.hash) {
        const hash = window.location.hash;
        const hashMatch = hash.match(/[?&](?:data|p|payload|card|d)=([^&]+)/i) || hash.match(/(?:data|p|payload|card|d)=([^&]+)/i);
        if (hashMatch && hashMatch[1]) {
          dataStr = hashMatch[1];
        }
      }

      if (dataStr) {
        try {
          const decodedStr = decodeURIComponent(dataStr.trim());
          const res = decodeDeceasedFromUrlPayload(decodedStr) || decodeDeceasedFromUrlPayload(dataStr);
          if (res) return res;
        } catch (e) {
          return decodeDeceasedFromUrlPayload(dataStr);
        }
      }
    } catch (e) {
      console.error("Error parsing url payload:", e);
    }
    return null;
  });

  const [fetchingRemoteDeceased, setFetchingRemoteDeceased] = useState<boolean>(false);
  const [remoteDeceasedNotFound, setRemoteDeceasedNotFound] = useState<boolean>(false);
  const [supabaseTableMissing, setSupabaseTableMissing] = useState<boolean>(false);
  const [showSqlSetupModal, setShowSqlSetupModal] = useState<boolean>(false);
  const [sqlCopied, setSqlCopied] = useState<boolean>(false);

  // Mobile drawer / sheet state for adding deceased
  const [isMobileFormOpen, setIsMobileFormOpen] = useState<boolean>(false);

  // Notification state
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(() => 
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );
  const [upcomingNotices, setUpcomingNotices] = useState<UpcomingYahrzeitNotice[]>([]);
  const [notifBannerDismissed, setNotifBannerDismissed] = useState<boolean>(false);

  // Auto-check upcoming Yahrzeits for the next 3 days whenever list updates
  useEffect(() => {
    if (displayedList && displayedList.length > 0) {
      const notices = getUpcomingYahrzeits(displayedList, 3);
      setUpcomingNotices(notices);

      // Trigger push/local notifications if granted
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        notices.forEach(notice => {
          sendYahrzeitNotification(notice, lang);
        });
      }
    }
  }, [displayedList, lang]);

  const handleEnableNotifications = async () => {
    const perm = await requestNotificationPermission();
    setNotifPermission(perm);
    if (perm === 'granted' && upcomingNotices.length > 0) {
      upcomingNotices.forEach(notice => sendYahrzeitNotification(notice, lang));
    }
  };

  // Merge urlDeceasedFromPayload safely into existing masterList, LocalStorage, Supabase and server
  useEffect(() => {
    if (urlDeceasedFromPayload) {
      const enrichedPayload = enrichDeceasedTranslations(urlDeceasedFromPayload);
      setRemoteDeceasedNotFound(false);
      setSelectedDeceased(enrichedPayload);

      // Add/merge to local database without clearing existing records
      setMasterList(prev => {
        const base = prev.length > 0 ? prev : SEED_DATABASE;
        const merged = smartMergeDeceasedLists(base, [enrichedPayload]);
        const finalData = deduplicateSingleList(merged);
        try {
          localStorage.setItem('eternal_db', JSON.stringify(finalData));
        } catch (e) {
          console.error("Storage access error:", e);
        }
        return finalData;
      });

      // Upsert into Supabase database
      (async () => {
        try {
          const { error } = await safeUpsert([enrichedPayload]);
          if (error && isMissingTableError(error)) {
            setSupabaseTableMissing(true);
            console.warn("Supabase notice: 'deceased' table is missing in schema cache. Using local/server database fallback.");
          } else if (error) {
            console.warn("Supabase upsert notice on URL payload:", error);
          }
        } catch (e) {
          console.warn("Supabase notice:", e);
        }
      })();


    }
  }, [urlDeceasedFromPayload]);

  // If urlDeceasedId is accessed directly (e.g. ?m=41 or /m/41), perform a direct select query from Supabase
  useEffect(() => {
    if (urlDeceasedId && String(urlDeceasedId).trim() !== '' && !urlDeceasedFromPayload) {
      const cardId = typeof urlDeceasedId === 'number' ? urlDeceasedId : parseInt(String(urlDeceasedId), 10);
      const queryId = !isNaN(cardId) ? cardId : urlDeceasedId;

      const fetchRemote = async () => {
        setFetchingRemoteDeceased(true);
        try {
          let fetched: any = null;
          if (isSupabaseConfigured()) {
            const { data, error } = await supabase
              .from('deceased')
              .select('*')
              .eq('id', queryId)
              .maybeSingle();

            if (error && isMissingTableError(error)) {
              setSupabaseTableMissing(true);
            }
            if (data && data.id && data.name) {
              fetched = normalizeFetchedRecord(data);
            }
          }



          if (fetched && fetched.id && fetched.name) {
            const enriched = enrichDeceasedTranslations(fetched);
            setMasterList(prev => {
              const merged = smartMergeDeceasedLists(prev, [enriched]);
              const finalData = deduplicateSingleList(merged);
              try {
                localStorage.setItem('eternal_db', JSON.stringify(finalData));
              } catch (e) {}
              return finalData;
            });
            setRemoteDeceasedNotFound(false);
          } else {
            const existsLocally = masterList.some(d => Number(d.id) === Number(queryId) || String(d.id) === String(queryId));
            if (!existsLocally) {
              setRemoteDeceasedNotFound(true);
            }
          }
        } catch (err) {
          console.error("Failed to fetch remote deceased record:", err);
        } finally {
          setFetchingRemoteDeceased(false);
        }
      };

      fetchRemote();
    }
  }, [urlDeceasedId, urlDeceasedFromPayload]);

  // Helper to merge urlDeceasedFromPayload into any loaded list
  const mergeWithUrlPayload = (list: Deceased[]): Deceased[] => {
    let clean = deduplicateSingleList(list);
    if (urlDeceasedFromPayload) {
      const enrichedPayload = enrichDeceasedTranslations(urlDeceasedFromPayload);
      clean = smartMergeDeceasedLists(clean, [enrichedPayload]);
    }
    return clean;
  };

  // Load database on mount directly from Supabase, with local storage & fallback merging
  useEffect(() => {
    const loadDatabase = async () => {
      try {
        // 1. Run automatic database cleanup/deduplication on startup
        if (isSupabaseConfigured()) {
          await cleanAndDeduplicateSupabase();
        }

        let localRecords: Deceased[] = [];
        try {
          const stored = localStorage.getItem('eternal_db');
          if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) {
              localRecords = filterOutMockRecords(parsed);
            }
          }
        } catch (e) {
          console.error("Storage access error:", e);
        }

        // Standalone Offline mode check
        if ((window as any).__OFFLINE_DATABASE_DATA__) {
          const offlineData = (window as any).__OFFLINE_DATABASE_DATA__;
          let merged = smartMergeDeceasedLists([], localRecords);
          merged = smartMergeDeceasedLists(merged, Array.isArray(offlineData) ? offlineData : []);
          merged = mergeWithUrlPayload(merged);
          const finalData = filterOutMockRecords(deduplicateSingleList(merged));
          setMasterList(finalData);
          try {
            localStorage.setItem('eternal_db', JSON.stringify(finalData));
          } catch (e) {}
          return;
        }

        // 2. Fetch directly from Supabase 'deceased' table
        let supabaseRecords: Deceased[] = [];
        if (isSupabaseConfigured()) {
          try {
            const { data, error } = await supabase.from('deceased').select('*');
            if (error && isMissingTableError(error)) {
              setSupabaseTableMissing(true);
            } else if (!error && Array.isArray(data)) {
              supabaseRecords = filterOutMockRecords(data as Deceased[]);
            } else {
              const res = await safeSelect('deceased');
              if (!res.error && Array.isArray(res.data)) {
                supabaseRecords = filterOutMockRecords(res.data as Deceased[]);
              }
            }
          } catch (err) {
            console.warn("Supabase select notice:", err);
          }
        }

        // Merge clean records directly from Supabase (top priority) & local storage
        let combined = smartMergeDeceasedLists([], supabaseRecords);
        combined = smartMergeDeceasedLists(combined, localRecords);
        combined = mergeWithUrlPayload(combined);

        const finalMaster = filterOutMockRecords(deduplicateSingleList(combined));
        setMasterList(finalMaster);
        try {
          localStorage.setItem('eternal_db', JSON.stringify(finalMaster));
        } catch (e) {
          console.error("Storage access error:", e);
        }
      } catch (err) {
        console.warn("App runtime notice:", err);
        setMasterList([]);
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

      // 2. Perform translation via client-side translation helper
      setTranslating(true);
      try {
        const fullyTranslated = translateDeceasedListClientSide(masterList, lang);
        setDisplayedList(fullyTranslated);
        try {
          localStorage.setItem(`eternal_db_translated_${lang}`, JSON.stringify(fullyTranslated));
          localStorage.setItem(`eternal_db_translated_${lang}_fingerprint`, currentFingerprint);
        } catch (e) {
          console.error("Storage access error:", e);
        }
      } catch (err: any) {
        console.warn("Translation notice:", err);
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

  // Refresh master list directly from Supabase (select('*'))
  const refreshFromSupabase = async () => {
    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await safeSelect('deceased');
        if (error) {
          console.error('[Supabase Fetch Error]', error);
          if (isMissingTableError(error)) {
            setSupabaseTableMissing(true);
          }
        } else if (Array.isArray(data)) {
          const fetchedRecords = filterOutMockRecords(data.map(normalizeFetchedRecord));
          const finalUpdated = deduplicateSingleList(fetchedRecords);
          setMasterList(finalUpdated);
          try {
            localStorage.setItem('eternal_db', JSON.stringify(finalUpdated));
          } catch (e) {
            console.error("Storage access error:", e);
          }
          console.log(`[Supabase Fetch Success] Loaded ${finalUpdated.length} clean records.`);
        }
      }
    } catch (err) {
      console.error("Error refreshing from Supabase:", err);
    }
  };

  // Save or update deceased record directly in Supabase & LocalStorage
  const handleSaveDeceased = async (deceasedInput: Deceased) => {
    const deceased = sanitizeRecord(enrichDeceasedTranslations(deceasedInput));
    
    // Enforce duplicate match by Name + FatherName if existing ID not found
    const normName = (deceased.name || '').trim().toLowerCase();
    const normFather = (deceased.fatherName || '').trim().toLowerCase();
    const existing = masterList.find(d => 
      Number(d.id) === Number(deceased.id) ||
      ((d.name || '').trim().toLowerCase() === normName && (d.fatherName || '').trim().toLowerCase() === normFather)
    );

    const isUpdate = !!existing && !!existing.id && Number(existing.id) > 0;

    if (existing) {
      deceased.id = Number(existing.id);
    }

    // Always update local state & LocalStorage immediately
    const updated = masterList.some(d => Number(d.id) === Number(deceased.id))
      ? masterList.map(d => Number(d.id) === Number(deceased.id) ? deceased : d)
      : [...masterList, deceased];
    
    setMasterList(updated);
    try {
      localStorage.setItem('eternal_db', JSON.stringify(updated));
    } catch (e) {
      console.error("Storage access error:", e);
    }



    // Also sync to Supabase if configured
    if (isSupabaseConfigured()) {
      try {
        if (isUpdate) {
          // UPDATE operation: send record WITH id
          const { error } = await safeUpsert([deceased]);
          if (error) {
            console.error("[Supabase Save Error]", error);
            alert(`שגיאה בעדכון הכרטיס ב-Supabase: ${error.message || JSON.stringify(error)}`);
          } else {
            console.log(`[Supabase Update Success] Updated deceased record ID ${deceased.id}`);
            await cleanAndDeduplicateSupabase();
            await refreshFromSupabase();
          }
        } else {
          // INSERT operation: strip id so Supabase autogenerates identity ID
          const { id, ...recordWithoutId } = deceased;
          const { data, error } = await safeInsert([recordWithoutId]);
          if (error) {
            console.error("[Supabase Insert Error]", error);
            alert(`שגיאה בהוספת הכרטיס ב-Supabase: ${error.message || JSON.stringify(error)}`);
          } else {
            console.log(`[Supabase Insert Success] Saved new deceased record`);
            if (data && data[0] && data[0].id) {
              deceased.id = Number(data[0].id);
            }
            await cleanAndDeduplicateSupabase();
            await refreshFromSupabase();
          }
        }
      } catch (e: any) {
        console.error("[Supabase Save Exception]", e);
        alert(`שגיאה בשמירת הכרטיס ב-Supabase: ${e?.message || String(e)}`);
      }
    }

    // Clear translation caches
    try {
      ['he', 'en', 'ru'].forEach(l => {
        localStorage.removeItem(`eternal_db_translated_${l}`);
        localStorage.removeItem(`eternal_db_translated_${l}_fingerprint`);
      });
    } catch (e) {
      console.error("Storage access error:", e);
    }

    setEditingDeceased(null);
    if (selectedDeceased && Number(selectedDeceased.id) === Number(deceased.id)) {
      setSelectedDeceased(deceased);
    }
  };

  // Delete a deceased record from Supabase & LocalStorage
  const handleDeleteDeceased = async (id: number) => {
    // Update local state & LocalStorage
    const updated = masterList.filter(d => Number(d.id) !== Number(id));

    setMasterList(updated);
    try {
      localStorage.setItem('eternal_db', JSON.stringify(updated));
    } catch (e) {
      console.error("Storage access error:", e);
    }



    // Also sync delete to Supabase if configured
    if (isSupabaseConfigured()) {
      try {
        const { error } = await safeDelete('id', id);
        if (error) {
          console.error("[Supabase Delete Error]", error);
        } else {
          console.log(`[Supabase Delete Success] Deleted record ID ${id} from Supabase.`);
        }
      } catch (e: any) {
        console.error("[Supabase Delete Exception]", e);
      }
    }

    // Clear caches
    try {
      ['he', 'en', 'ru'].forEach(l => {
        localStorage.removeItem(`eternal_db_translated_${l}`);
        localStorage.removeItem(`eternal_db_translated_${l}_fingerprint`);
      });
    } catch (e) {
      console.error("Storage access error:", e);
    }

    if (editingDeceased && Number(editingDeceased.id) === Number(id)) {
      setEditingDeceased(null);
    }
    if (selectedDeceased && Number(selectedDeceased.id) === Number(id)) {
      setSelectedDeceased(null);
    }
  };

  // Bulk import deceased records with direct Supabase insert/upsert & fallback local state
  const handleImportDeceased = async (newList: Deceased[]) => {
    const currentDb = masterList || [];

    const supabaseRecords = newList.map((item, idx) => {
      const enriched = sanitizeRecord(enrichDeceasedTranslations(item));
      const normName = (enriched.name || '').trim().toLowerCase();
      const normFather = (enriched.fatherName || '').trim().toLowerCase();
      const existingMatch = currentDb.find(d => 
        (d.name || '').trim().toLowerCase() === normName &&
        (d.fatherName || '').trim().toLowerCase() === normFather
      );

      if (existingMatch) {
        enriched.id = Number(existingMatch.id);
      } else if (!enriched.id) {
        enriched.id = Date.now() + Math.floor(Math.random() * 100000) + idx;
      }

      return enriched;
    });

    // Update local state and LocalStorage
    const merged = smartMergeDeceasedLists(masterList, supabaseRecords);
    const updated = deduplicateSingleList(merged);

    setMasterList(updated);
    try {
      localStorage.setItem('eternal_db', JSON.stringify(updated));
    } catch (e) {
      console.error("Storage access error:", e);
    }



    // Sync to Supabase if configured
    if (isSupabaseConfigured()) {
      try {
        let { data, error } = await supabase.from('deceased').upsert(supabaseRecords, { onConflict: 'id' });
        if (error) {
          console.warn("[Supabase Import Notice] Upsert with onConflict failed, retrying plain upsert:", error);
          const fallbackRes = await supabase.from('deceased').upsert(supabaseRecords);
          if (!fallbackRes.error) {
            error = null;
            data = fallbackRes.data;
          } else {
            error = fallbackRes.error;
          }
        }

        if (error) {
          console.error("[Supabase Import Error]", error);
        } else {
          console.log("[Supabase Import Success] Inserted/upserted records successfully:", data);
          await cleanAndDeduplicateSupabase();
          await refreshFromSupabase();
        }
      } catch (e: any) {
        console.error("[Supabase Import Exception]", e);
      }
    }

    // Clear caches
    try {
      ['he', 'en', 'ru'].forEach(l => {
        localStorage.removeItem(`eternal_db_translated_${l}`);
        localStorage.removeItem(`eternal_db_translated_${l}_fingerprint`);
      });
    } catch (e) {
      console.error("Storage access error:", e);
    }
  };

  // Clean and deduplicate current database in Supabase and local storage
  const handleCleanDuplicates = async () => {
    try {
      if (isSupabaseConfigured()) {
        const { count, deleted } = await cleanAndDeduplicateSupabase();
        await refreshFromSupabase();
        alert(lang === 'he'
          ? `בוצע ניקוי כפילויות בהצלחה! הוסרו ${deleted} רשומות כפולות. במאגר נותרו ${count} רשומות ייחודיות.`
          : `Duplicates cleaned! Removed ${deleted} duplicates. ${count} unique records remaining.`);
      } else {
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
        alert(lang === 'he'
          ? `בוצע ניקוי כפילויות בהצלחה! במאגר נותרו ${cleaned.length} רשומות ייחודיות.`
          : `Duplicates cleaned! ${cleaned.length} unique records remaining.`);
      }
    } catch (e) {
      console.error("Deduplication error:", e);
    }
  };

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showDuplicatesManager, setShowDuplicatesManager] = useState(false);

  const getDuplicateGroups = () => {
    const groupsMap: { [key: string]: Deceased[] } = {};
    (masterList || []).forEach(item => {
      if (!item) return;
      const itemName = (item.name || '').trim().toLowerCase();
      const itemMonth = (item.month || '').trim();
      const key = `${itemName}_${item.day || 0}_${itemMonth}`;
      if (!groupsMap[key]) {
        groupsMap[key] = [];
      }
      groupsMap[key].push(item);
    });

    const duplicateGroups: { name: string; day: number; month: string; items: Deceased[] }[] = [];
    Object.keys(groupsMap).forEach(key => {
      if (groupsMap[key] && groupsMap[key].length > 1) {
        const firstItem = groupsMap[key][0];
        duplicateGroups.push({
          name: firstItem?.name || '',
          day: firstItem?.day || 1,
          month: firstItem?.month || '',
          items: groupsMap[key]
        });
      }
    });
    return duplicateGroups;
  };

  const handleResolveDuplicateGroup = async (groupItems: Deceased[]) => {
    const toDelete = groupItems.slice(1);
    for (const item of toDelete) {
      await handleDeleteDeceased(item.id);
    }
  };

  const handleResetDatabase = async () => {
    try {
      const { error } = await safeDeleteAll('deceased');
      if (error && isMissingTableError(error)) {
        setSupabaseTableMissing(true);
      } else if (error) {
        console.warn("Supabase reset notice:", error);
      }
    } catch (err) {
      console.warn("Supabase notice:", err);
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

  const handleExitMemorialPage = () => {
    setUrlDeceasedId(null);
    setUrlDeceasedFromPayload(null);
    setSelectedDeceased(null);
    if (typeof window !== 'undefined' && window.history) {
      const targetUrl = lang !== 'he' ? `/?lang=${lang}` : '/';
      window.history.pushState({}, document.title, targetUrl);
    }
  };

  const t = translations[lang];
  const isRtl = lang === 'he';

  // Render standalone memorial page if a specific deceased link is accessed or payload is provided
  if (urlDeceasedId || urlDeceasedFromPayload) {
    let urlDeceased: Deceased | null = urlDeceasedFromPayload;
    if (!urlDeceased && urlDeceasedId) {
      const cardId = typeof urlDeceasedId === 'number' ? urlDeceasedId : parseInt(String(urlDeceasedId), 10);
      const queryId = !isNaN(cardId) ? cardId : urlDeceasedId;

      urlDeceased = masterList.find(d => Number(d.id) === Number(queryId) || String(d.id) === String(queryId)) ||
                    displayedList.find(d => Number(d.id) === Number(queryId) || String(d.id) === String(queryId)) ||
                    SEED_DATABASE.find(d => Number(d.id) === Number(queryId) || String(d.id) === String(queryId)) || null;

      if (!urlDeceased) {
        try {
          const stored = localStorage.getItem('eternal_db');
          if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
              urlDeceased = parsed.find(d => Number(d.id) === Number(queryId) || String(d.id) === String(queryId)) || null;
            }
          }
        } catch (e) {}
      }
    }

    if (urlDeceased && urlDeceased.name && urlDeceased.name !== 'undefined' && urlDeceased.name.trim() !== '') {
      // Auto-sync address bar URL to clean ID-only link (?m=12345)
      const targetUrl = `/?m=${urlDeceased.id}${lang !== 'he' ? `&lang=${lang}` : ''}`;
      if (typeof window !== 'undefined' && (window.location.pathname + window.location.search) !== targetUrl) {
        window.history.replaceState({}, document.title, targetUrl);
      }

      return (
        <DeceasedMemorialPage 
          deceased={urlDeceased} 
          lang={lang} 
          onSetLang={(newLang) => {
            setLang(newLang);
            const newUrl = `/?m=${urlDeceased!.id}${newLang !== 'he' ? `&lang=${newLang}` : ''}`;
            window.history.replaceState({}, document.title, newUrl);
          }} 
          onExit={handleExitMemorialPage} 
        />
      );
    }

    // Show loading while fetching remote deceased
    if (fetchingRemoteDeceased) {
      return (
        <div className="min-h-screen bg-[#070b12] text-gray-100 flex flex-col items-center justify-center font-sans gap-3 p-4">
          <div className="w-8 h-8 border-4 border-[#c8a96e] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-[#c8a96e] font-medium font-sans">
            {lang === 'he' ? 'טוען דף הנצחה אישי משרת הענן והקישור...' : lang === 'ru' ? 'Загрузка поминальной страницы из облачной базы данных...' : 'Loading memorial page from cloud server & link...'}
          </p>
        </div>
      );
    }

    // Fallback if deceased ID is invalid or deleted (DO NOT render an empty/black card container!)
    return (
      <div className="min-h-screen bg-[#070b12] text-gray-100 flex flex-col items-center justify-center font-sans gap-4 p-4 text-center">
        <div className="bg-[#131a26] border border-amber-500/40 rounded-2xl p-8 max-w-md w-full shadow-2xl space-y-4 font-sans">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400 text-xl font-bold">
            !
          </div>
          <h2 className="text-xl font-serif font-bold text-amber-400">
            {lang === 'he' ? 'הכרטיס המבוקש לא נמצא במערכת' : lang === 'ru' ? 'Запрошенная карточка не найдена в системе' : 'The requested card was not found in the system'}
          </h2>
          <p className="text-xs text-gray-300 leading-relaxed">
            {lang === 'he' 
              ? 'כרטיס זיכרון זה נמחק, אינו קיים במאגר או שהקישור שהוזן אינו תקין.' 
              : lang === 'ru'
                ? 'Запись была удалена, не существует в базе данных или ссылка недействительна.'
                : 'This memorial card was deleted, does not exist in the system, or the link is invalid.'}
          </p>
          <button 
            onClick={handleExitMemorialPage}
            className="w-full py-3 bg-[#c8a96e] hover:bg-[#b8952e] text-black text-xs font-bold rounded-xl transition-all shadow-lg cursor-pointer"
          >
            {lang === 'he' ? 'חזרה למערכת ההנצחה הכללית ←' : lang === 'ru' ? 'Вернуться в главный раздел ←' : 'Return to main memorial system ←'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-[#0d0d0d] text-[#f0f4f8] selection:bg-[#c8a96e] selection:text-black pb-28 lg:pb-12 transition-all duration-300"
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

        {/* Notification Permission Banner */}
        {!notifBannerDismissed && (
          <div className="mb-6 w-full bg-[#131a26]/90 border border-[#c8a96e]/30 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-amber-200 font-sans shadow-lg">
            <div className="flex items-center gap-2.5">
              <Bell className="w-5 h-5 text-amber-400 animate-bounce shrink-0" />
              <div>
                <p className="font-semibold text-white text-xs sm:text-sm">
                  {notifPermission === 'granted'
                    ? (lang === 'he' ? `התראות יארצייט פעילות בנייד (${upcomingNotices.length} אזכרות קרובות ב-3 הימים הקרובים)` : lang === 'ru' ? `Уведомления о Йארцайтах активны (${upcomingNotices.length} ближайших)` : `Mobile Yahrzeit Notifications Active (${upcomingNotices.length} upcoming)`)
                    : (lang === 'he' ? 'קבל התראות לנייד על אזכרות קרובות ב-3 הימים הקרובים' : lang === 'ru' ? 'Получать уведомления о приближающихся Йארцайтах' : 'Get mobile push notifications for upcoming Yahrzeits')}
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {lang === 'he' ? 'המערכת תשלח תזכורת אוטומטית למכשירך לקראת יום האזכרה' : lang === 'ru' ? 'Система автоматически отправит напоминание на ваше устройство' : 'Automatic push notifications directly on your phone or computer'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {notifPermission !== 'granted' ? (
                <button
                  onClick={handleEnableNotifications}
                  className="px-3.5 py-1.5 bg-[#c8a96e] hover:bg-[#b8952e] text-black font-bold text-xs rounded-lg transition-all shadow cursor-pointer whitespace-nowrap"
                >
                  {lang === 'he' ? 'הפעל התראות כעת' : lang === 'ru' ? 'Включить уведомления' : 'Enable Notifications'}
                </button>
              ) : (
                <span className="px-2.5 py-1 bg-green-500/20 text-green-300 border border-green-500/30 font-bold text-[11px] rounded-lg flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                  {lang === 'he' ? 'פעיל' : lang === 'ru' ? 'Активно' : 'Active'}
                </span>
              )}
              <button
                onClick={() => setNotifBannerDismissed(true)}
                className="p-1 text-gray-400 hover:text-white cursor-pointer"
                title={lang === 'he' ? 'סגור' : 'Close'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
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

        {/* Dedicated Editing Modal Overlay */}
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
                      <p className="text-xs text-[#c8a96e]">
                        {group.day} ב{group.month} • {group.items.length} כרטיסים כפולים
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleResolveDuplicateGroup(group.items)}
                      className="px-4 py-2 bg-[#c8a96e] hover:bg-[#b8952e] text-black font-semibold text-xs rounded-xl transition-all shadow cursor-pointer self-end md:self-auto"
                    >
                      {lang === 'he' ? 'מזג והשאר כרטיס יחיד' : lang === 'ru' ? 'Объединить записи' : 'Merge & Keep Single Record'}
                    </button>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-[#c8a96e]/20 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowDuplicatesManager(false)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold rounded-xl transition-all cursor-pointer"
                >
                  {lang === 'he' ? 'סגור' : lang === 'ru' ? 'Закрыть' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        )}



        {/* Mobile Floating Action Button (FAB) */}
        <button
          onClick={() => setIsMobileFormOpen(true)}
          className="lg:hidden fixed bottom-18 right-4 z-40 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold p-3.5 rounded-full shadow-[0_0_20px_rgba(200,169,110,0.5)] flex items-center gap-2 border border-[#c8a96e] cursor-pointer transition-transform active:scale-95"
          title={lang === 'he' ? 'הוסף נפטר' : 'Add Memorial'}
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
          <span className="text-xs font-bold pl-1 hidden sm:inline">{lang === 'he' ? 'הוסף נפטר' : 'Add Name'}</span>
        </button>

        {/* Mobile Form Bottom Sheet / Modal */}
        {isMobileFormOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end justify-center sm:items-center p-0 sm:p-4">
            <div className="bg-[#131a26] border-t-2 sm:border-2 border-[#c8a96e] rounded-t-2xl sm:rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-4 relative shadow-2xl animate-in slide-in-from-bottom duration-300">
              <div className="flex items-center justify-between pb-3 border-b border-[#c8a96e]/20 mb-3">
                <h3 className="text-base font-serif font-bold text-[#c8a96e] flex items-center gap-2">
                  <Plus className="w-5 h-5 text-[#c8a96e]" />
                  <span>{lang === 'he' ? 'הוספת נפטר חדש לספר הזיכרון' : 'Add New Deceased'}</span>
                </h3>
                <button
                  onClick={() => setIsMobileFormOpen(false)}
                  className="p-1.5 text-gray-400 hover:text-white rounded-lg bg-gray-800/50 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <MemorialForm 
                lang={lang} 
                onSave={(deceased) => {
                  handleSaveDeceased(deceased);
                  setIsMobileFormOpen(false);
                }} 
              />
            </div>
          </div>
        )}

        {/* Fixed Mobile Bottom Navigation Bar */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0d0d0d]/95 border-t border-[#c8a96e]/30 backdrop-blur-lg flex items-center justify-around py-2 px-1 shadow-2xl">
          <button
            onClick={() => setActiveTab('calendar')}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg transition-all cursor-pointer ${
              activeTab === 'calendar' ? 'text-[#c8a96e] font-bold scale-105' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Calendar className="w-5 h-5" />
            <span className="text-[10px] font-sans">{t.calendar}</span>
          </button>

          <button
            onClick={() => setActiveTab('book')}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg transition-all cursor-pointer ${
              activeTab === 'book' ? 'text-[#c8a96e] font-bold scale-105' : 'text-gray-400 hover:text-white'
            }`}
          >
            <BookOpen className="w-5 h-5" />
            <span className="text-[10px] font-sans">{t.memorialBook}</span>
          </button>

          <button
            onClick={() => setActiveTab('grid')}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg transition-all cursor-pointer ${
              activeTab === 'grid' ? 'text-[#c8a96e] font-bold scale-105' : 'text-gray-400 hover:text-white'
            }`}
          >
            <LayoutGrid className="w-5 h-5" />
            <span className="text-[10px] font-sans">{t.quick30Grid}</span>
          </button>

          <button
            onClick={() => setActiveTab('import')}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg transition-all cursor-pointer ${
              activeTab === 'import' ? 'text-[#c8a96e] font-bold scale-105' : 'text-gray-400 hover:text-white'
            }`}
          >
            <FileDown className="w-5 h-5" />
            <span className="text-[10px] font-sans">{t.importBulk}</span>
          </button>
        </div>

      </div>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <MainAppContent />
    </ErrorBoundary>
  );
}

export default App;
