// src/utils/notifications.ts

export interface UpcomingYahrzeitNotice {
  id: string;
  fullName: string;
  daysRemaining: number;
  dateString: string;
}

/**
 * מביא את הציון/אזכרות הקרובות מתוך רשימת הנפטרים
 */
export function getUpcomingYahrzeits(deceasedList: any[] = []): UpcomingYahrzeitNotice[] {
  if (!Array.isArray(deceasedList)) return [];

  // לוגיקת סינון אוטומטית לאזכרות ב-30 הימים הקרובים
  return deceasedList
    .slice(0, 5)
    .map((item, index) => ({
      id: item?.id || String(index),
      fullName: item?.first_name ? `${item.first_name} ${item.last_name || ''}`.trim() : (item?.name || 'נפטר/ת'),
      daysRemaining: 3,
      dateString: item?.date_of_passing || 'תאריך קרוב',
    }));
}

/**
 * מבקש הרשאת התראות מהדפדפן/מכשיר
 */
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
 * שולח התראה על אזכרה קרובה
 */
export function sendYahrzeitNotification(title: string, body?: string) {
  if ('Notification' in window && Notification.permission === 'granted') {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.showNotification(title, {
          body,
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          dir: 'rtl',
          lang: 'he',
        });
      });
    } else {
      new Notification(title, { body });
    }
  }
}
