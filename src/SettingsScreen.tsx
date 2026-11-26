import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Go } from '../App';
import { exportToFolder } from './backup';
import { applyReminder, cancelReminder, DEFAULT_REMINDER, pad, WEEKDAYS } from './reminders';
import { photosOf, Reminder, Store } from './store';
import { C, ui } from './ui';

export default function SettingsScreen({ store, go, id }: { store: Store; go: Go; id: string }) {
  const s = store.state!;
  const c = s.collections.find((x) => x.id === id);
  const [r, setR] = useState<Reminder>(c?.reminder ?? DEFAULT_REMINDER);
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!c) return null;

  const save = async (next: Reminder) => {
    setR(next);
    const ok = await applyReminder(c, next);
    if (!ok) {
      Alert.alert('Notifications are off', 'Allow notifications for Progress Camera in Settings to get reminders.');
      return;
    }
    store.setReminder(c.id, next);
  };

  const doExport = async () => {
    setBusy(true);
    try {
      const { copied, skipped } = await exportToFolder(s, [c.id]);
      Alert.alert('Exported', `${copied} new photo${copied === 1 ? '' : 's'} copied${skipped ? `, ${skipped} already there` : ''}.`);
    } catch (e: any) {
      if (!String(e?.message ?? e).toLowerCase().includes('cancel')) Alert.alert('Export failed', String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  };

  const del = () =>
    Alert.alert(`Delete "${c.name}"?`, 'Its photos are deleted too. Export first if you want to keep them.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await cancelReminder(c);
          store.deleteCollection(c.id);
          go('collections');
        },
      },
    ]);

  const chip = (label: string, on: boolean, onPress: () => void) => (
    <Pressable key={label} onPress={onPress} style={[ui.pill, on && { borderColor: C.signal }]}>
      <Text style={[ui.text, on && { color: C.signal }]}>{label}</Text>
    </Pressable>
  );

  const count = photosOf(s, c.id).length;

  return (
    <SafeAreaView style={ui.screen}>
      <View style={ui.bar}>
        <Pressable onPress={() => go('collections')}>
          <Text style={ui.link}>‹ Collections</Text>
        </Pressable>
        <View style={{ width: 70 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 28 }}>
        <View>
          <Text style={ui.title}>{c.name}</Text>
          <Text style={ui.label}>{count} photos</Text>
        </View>

        <View style={{ gap: 12 }}>
          <Text style={ui.label}>Reminder</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {chip('Off', r.kind === 'off', () => save({ ...r, kind: 'off' }))}
            {chip('Daily', r.kind === 'daily', () => save({ ...r, kind: 'daily' }))}
            {chip('Weekly', r.kind === 'weekly', () => save({ ...r, kind: 'weekly' }))}
          </View>

          {r.kind === 'weekly' && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {WEEKDAYS.map((d, i) => chip(d, r.weekday === i + 1, () => save({ ...r, weekday: i + 1 })))}
            </View>
          )}

          {r.kind !== 'off' && (
            <Pressable onPress={() => setPicking(true)} style={[ui.pill, { alignSelf: 'flex-start' }]}>
              <Text style={[ui.text, { fontSize: 28, fontVariant: ['tabular-nums'] }]}>
                {pad(r.hour)}:{pad(r.minute)}
              </Text>
            </Pressable>
          )}
          {picking && (
            <DateTimePicker
              mode="time"
              is24Hour
              value={new Date(2000, 0, 1, r.hour, r.minute)}
              onChange={(ev, d) => {
                setPicking(false);
                if (ev.type === 'set' && d) save({ ...r, hour: d.getHours(), minute: d.getMinutes() });
              }}
            />
          )}
        </View>

        <View style={{ gap: 12 }}>
          <Text style={ui.label}>Backup</Text>
          <Text style={ui.dim}>
            Every photo is also saved, full quality, to your gallery in Pictures/Progress Camera, so turn on backup for
            that folder in Google Photos. If the app is ever reinstalled it restores itself from there. Deleting a photo
            here leaves the gallery copy. Export makes an extra copy in a folder you pick.
          </Text>
          <Pressable onPress={doExport} disabled={busy || count === 0} style={[ui.pill, { alignSelf: 'flex-start', opacity: busy || count === 0 ? 0.5 : 1 }]}>
            <Text style={ui.text}>{busy ? 'Exporting…' : 'Export to folder'}</Text>
          </Pressable>
        </View>

        <Pressable onPress={del} style={{ marginTop: 20 }}>
          <Text style={[ui.text, { color: C.danger }]}>Delete collection</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
