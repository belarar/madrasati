/**
 * School Notification Sound & Web Alert Service
 * Handles instant audio chime via Web Audio API and Native Browser Push Notifications
 */

import { AppNotification } from '../types';

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (!audioContext) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioContext = new AudioContextClass();
      }
    }
    if (audioContext && audioContext.state === 'suspended') {
      audioContext.resume().catch(() => {});
    }
    return audioContext;
  } catch {
    return null;
  }
}

/**
 * Plays a pleasant, gentle institutional double-bell chime
 */
export function playNotificationChime(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Harmonic 1 (High bell tone)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now); // E5
    gain1.gain.setValueAtTime(0.18, now);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.5);

    // Harmonic 2 (Bright chime follow-up)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(987.77, now + 0.12); // B5
    gain2.gain.setValueAtTime(0.22, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.7);
  } catch (err) {
    console.debug('[Audio] Notification chime fallback:', err);
  }
}

/**
 * Request native browser notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return 'denied';
  }
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch {
    return Notification.permission;
  }
}

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

/**
 * Displays native system / browser notification if permitted
 */
export function showBrowserNotification(title: string, options?: { body?: string; tag?: string; icon?: string }) {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return;
  }

  try {
    const notif = new Notification(title, {
      body: options?.body || 'تنبيه جديد من منصة متوسطة الشهيد بن نعمة مصطفى',
      icon: options?.icon || '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: options?.tag,
    });

    notif.onclick = () => {
      window.focus();
      notif.close();
    };
  } catch (err) {
    console.debug('[Browser Notification] error:', err);
  }
}

/**
 * Triggers full alert (Audio + Browser push + Custom app toast event)
 */
export function triggerNotificationAlert(notif: AppNotification): void {
  // 1. Play sound
  playNotificationChime();

  // 2. Browser push notification
  let typeLabel = 'إشعار جديد';
  if (notif.type === 'document') typeLabel = '📄 وثيقة تعليمية جديدة';
  else if (notif.type === 'announcement') typeLabel = '📢 إعلان رسمي جديد';
  else if (notif.type === 'summon') typeLabel = '⚠️ استدعاء مدرسي';

  showBrowserNotification(typeLabel, {
    body: `${notif.title}\n${notif.message}`,
    tag: notif.id,
  });

  // 3. Dispatch in-app toast event
  window.dispatchEvent(new CustomEvent('notification-received', { detail: notif }));
}
