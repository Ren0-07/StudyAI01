import { ScheduleEvent } from '@/contexts/StudyPlannerContext';

export class NotificationService {
  static requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported in this browser');
      return Promise.resolve('denied');
    }

    if (Notification.permission === 'granted' || Notification.permission === 'denied') {
      return Promise.resolve(Notification.permission);
    }

    return Notification.requestPermission();
  }

  static async sendNotification(title: string, options?: NotificationOptions) {
    if (Notification.permission !== 'granted') {
      console.warn('Notification permission not granted');
      return;
    }

    try {
      const notification = new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options,
      });

      return notification;
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  }

  static scheduleSessionNotifications(event: ScheduleEvent) {
    if (!event.startTime) return;

    const now = new Date();
    const startTime = new Date(event.startTime);

    // 10 minutes before notification
    const tenMinBefore = new Date(startTime.getTime() - 10 * 60 * 1000);
    if (tenMinBefore > now) {
      const delay = tenMinBefore.getTime() - now.getTime();
      setTimeout(() => {
        this.sendNotification(
          `📅 Study Session in 10 Minutes`,
          {
            body: event.title,
            tag: `session-reminder-${event.id}`,
            requireInteraction: false,
          }
        );
      }, delay);
    }

    // Session start notification
    if (startTime > now) {
      const delay = startTime.getTime() - now.getTime();
      setTimeout(() => {
        this.sendNotification(
          `🎯 Your Study Session is Starting!`,
          {
            body: event.title,
            tag: `session-start-${event.id}`,
            requireInteraction: true,
          }
        );

        // Bring window to focus
        try {
          window.focus();
        } catch (e) {
          console.warn('Could not focus window');
        }
      }, delay);
    }
  }

  static cancelScheduledNotification(eventId: string) {
    // Browser doesn't have a built-in way to cancel scheduled notifications,
    // but we could track timers and clear them if needed
    // This is more for documentation purposes
  }

  static sendSessionMissedNotification(eventTitle: string) {
    this.sendNotification(
      `⏰ Session Marked as Missed`,
      {
        body: `${eventTitle} was marked as missed`,
        tag: 'session-missed',
        requireInteraction: false,
      }
    );
  }

  static sendAutoAdvanceNotification(nextEventTitle: string) {
    this.sendNotification(
      `⚡ Auto-Starting Next Session`,
      {
        body: nextEventTitle,
        tag: 'auto-advance',
        requireInteraction: true,
      }
    );
  }

  static sendSessionCompleteNotification(eventTitle: string, duration: number) {
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    let durationStr = '';

    if (hours > 0) {
      durationStr = `${hours}h ${minutes}m`;
    } else {
      durationStr = `${minutes}m`;
    }

    this.sendNotification(
      `✅ Session Completed!`,
      {
        body: `${eventTitle} - ${durationStr} of focused study`,
        tag: 'session-complete',
        requireInteraction: false,
      }
    );
  }
}

export default NotificationService;
