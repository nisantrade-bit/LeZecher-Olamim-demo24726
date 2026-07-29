// src/utils/notifications.ts

export interface UpcomingYahrzeitNotice {
  id: string;
  fullName: string;
  daysRemaining: number;
  dateString: string;
}

export function getUpcomingYahrzeits(deceasedList: any[] = []): UpcomingYahrzeitNotice[] {
  if (!Array.isArray(deceasedList)) return [];

  return deceasedList
    .slice(0, 5)
    .map((item, index) => ({
      id: item?.id || String(index),
      fullName: item?.first_name ? `${item.first_name} ${item.last_name || ''}`.trim() : (item?.name || 'נפטר/ת'),
      daysRemaining: 3,
      dateString: item?.date_of_passing || 'תאריך קרוב',
    }));
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('הדפדפן אינו תומך בהתראות');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

/**
 * שולח התראה בצורה בטוחה התואמת גם למכשירי מובייל (Android / Chrome)
 */
export async function sendYahrzeitNotification(title: string, body?: string) {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  try {
    // 1. ניסיון שליחה דרך Service Worker (חובה במובייל!)
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration && registration.showNotification) {
        await registration.showNotification(title, {
          body,
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          dir: 'rtl',
          lang: 'he',
        });
        return;
      }
    }

    // 2. גיבוי למחשב נייח בלבד (Desktop)
    new Notification(title, { body });
  } catch (error) {
    console.error('שגיאה בשליחת התראה:', error);
  }
}
