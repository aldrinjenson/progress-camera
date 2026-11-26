import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { Collection, Reminder } from './store';

export const DEFAULT_REMINDER: Reminder = { kind: 'off', hour: 21, minute: 0, weekday: 1 };
export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const CHANNEL = 'reminders';
const idFor = (c: Collection) => `reminder-${c.id}`;

export const pad = (n: number) => String(n).padStart(2, '0');

export function describe(r?: Reminder) {
  if (!r || r.kind === 'off') return 'No reminder';
  const t = `${pad(r.hour)}:${pad(r.minute)}`;
  return r.kind === 'daily' ? `Daily at ${t}` : `${WEEKDAYS[r.weekday - 1]}s at ${t}`;
}

export async function cancelReminder(c: Collection) {
  await Notifications.cancelScheduledNotificationAsync(idFor(c)).catch(() => {});
}

/** Replaces the collection's reminder. Returns false if notifications are not allowed. */
export async function applyReminder(c: Collection, r: Reminder): Promise<boolean> {
  await cancelReminder(c);
  if (r.kind === 'off') return true;

  let perm = await Notifications.getPermissionsAsync();
  if (!perm.granted) perm = await Notifications.requestPermissionsAsync();
  if (!perm.granted) return false;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Photo reminders',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }

  const trigger: Notifications.NotificationTriggerInput =
    r.kind === 'daily'
      ? { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: r.hour, minute: r.minute, channelId: CHANNEL }
      : { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: r.weekday, hour: r.hour, minute: r.minute, channelId: CHANNEL };

  await Notifications.scheduleNotificationAsync({
    identifier: idFor(c),
    content: { title: c.name, body: 'Time for your progress photo.', data: { collectionId: c.id } },
    trigger,
  });
  return true;
}
