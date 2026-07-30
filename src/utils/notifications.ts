import { Deceased, Language } from '../types';
import { getHebrewDate, isYahrzeitMatch } from './hebrewDate';

export interface UpcomingYahrzeitNotice {
  deceased: Deceased;
  daysDiff: number; // 0 = today, 1 = tomorrow, 2 = in 2 days, 3 = in 3 days
  date: Date;
  hebrewDateStr: string;
}

/**
 * Checks the deceased list for Yahrzeits coming up in the next 0 to 3 days.
 */
export function getUpcomingYahrzeits(deceasedList: Deceased[], daysAhead: number = 3): UpcomingYahrzeitNotice[] {
  if (!deceasedList || deceasedList.length === 0) return [];

  const results: UpcomingYahrzeitNotice[] = [];
  const today = new Date();
  
  for (let offset = 0; offset <= daysAhead; offset++) {
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + offset);

    const hb = getHebrewDate(targetDate);

    for (const item of deceasedList) {
      if (!item) continue;
      const isMatch = isYahrzeitMatch(
        item.day,
        item.month,
        hb.day,
        hb.normalizedMonth,
        hb.isLeapYear
      );

      if (isMatch) {
        results.push({
          deceased: item,
          daysDiff: offset,
          date: targetDate,
          hebrewDateStr: `${hb.dayFormatted} ${hb.normalizedMonth}`
        });
      }
    }
  }

  return results;
}

/**
 * Requests browser notification permission if needed.
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('This browser does not support desktop notifications');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (e) {
    console.error('Error requesting notification permission:', e);
    return 'denied';
  }
}

/**
 * Triggers a notification for an upcoming Yahrzeit.
 */
export async function sendYahrzeitNotification(notice: UpcomingYahrzeitNotice, lang: Language = 'he') {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  const { deceased, daysDiff, hebrewDateStr } = notice;
  const daysText = daysDiff === 0 
    ? (lang === 'he' ? 'היום' : lang === 'ru' ? 'Сегодня' : 'Today')
    : daysDiff === 1 
      ? (lang === 'he' ? 'מחר' : lang === 'ru' ? 'Завтра' : 'Tomorrow')
      : (lang === 'he' ? `בעוד ${daysDiff} ימים` : lang === 'ru' ? `Через ${daysDiff} дня` : `In ${daysDiff} days`);

  const title = lang === 'he'
    ? `🕯️ תזכורת אזכרה: ${deceased.name}`
    : lang === 'ru'
      ? `🕯️ Поминальное напоминание: ${deceased.name}`
      : `🕯️ Yahrzeit Reminder: ${deceased.name}`;

  const body = lang === 'he'
    ? `אזכרת ${deceased.name} חלה ${daysText} (${hebrewDateStr}). לחץ לצפייה בפרטים, תהילים ומשניות.`
    : lang === 'ru'
      ? `Годовщина ${deceased.name} ${daysText} (${hebrewDateStr}). Нажмите для просмотра деталей.`
      : `Memorial date for ${deceased.name} is ${daysText} (${hebrewDateStr}). Click to view details.`;

  const payloadUrl = `/?d=${deceased.id}`;

  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        dir: 'rtl',
        lang: 'he',
        data: { url: payloadUrl },
        tag: `yahrzeit-${deceased.id}-${daysDiff}`
      });
      return;
    } catch (e) {
      console.error('ServiceWorker notification error, falling back to window Notification:', e);
    }
  }

  try {
    const n = new Notification(title, {
      body,
      icon: '/icon-192.png',
      dir: 'rtl',
      lang: 'he',
      data: { url: payloadUrl },
      tag: `yahrzeit-${deceased.id}-${daysDiff}`
    });
    n.onclick = () => {
      window.focus();
      window.location.href = payloadUrl;
      n.close();
    };
  } catch (e) {
    console.error('Window Notification error:', e);
  }
}
