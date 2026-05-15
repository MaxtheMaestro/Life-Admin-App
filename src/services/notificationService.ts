
export const NOTIFICATION_PERMISSION_KEY = 'life_admin_notification_permission';
export const NOTIFICATION_MUTED_KEY = 'life_admin_notification_muted';

export class NotificationService {
  static isSupported() {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  static currentPermission(): NotificationPermission {
    return this.isSupported() ? Notification.permission : 'denied';
  }

  static isMuted() {
    return localStorage.getItem(NOTIFICATION_MUTED_KEY) === 'true';
  }

  static setMuted(muted: boolean) {
    localStorage.setItem(NOTIFICATION_MUTED_KEY, muted ? 'true' : 'false');
  }

  static async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) return 'denied';
    
    const permission = await Notification.requestPermission();
    localStorage.setItem(NOTIFICATION_PERMISSION_KEY, permission);
    return permission;
  }

  static getStoredPermission(): NotificationPermission | null {
    return localStorage.getItem(NOTIFICATION_PERMISSION_KEY) as NotificationPermission | null;
  }

  static async sendNotification(title: string, options?: NotificationOptions) {
    if (!this.isSupported() || this.isMuted()) return;

    const permission = this.currentPermission();
    if (permission === 'granted') {
      try {
        // Try background notification via Service Worker if available
        const registration = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : null;
        if (registration && 'showNotification' in registration) {
          return registration.showNotification(title, {
            icon: '/life-admin-icon-192.png',
            badge: '/life-admin-icon-192.png',
            vibrate: [200, 100, 200],
            requireInteraction: true,
            ...options,
          });
        }
      } catch (e) {
        console.warn('SW notification failed, falling back to window Notification', e);
      }

      // Fallback to window-level Notification
      return new Notification(title, {
        icon: '/life-admin-icon-192.png',
        badge: '/life-admin-icon-192.png',
        ...options,
      });
    }
  }

  static async testNotification() {
    return this.sendNotification('Life Admin Active', {
      body: 'Notifications are correctly configured. We will alert you of upcoming deadlines.',
    });
  }
}
