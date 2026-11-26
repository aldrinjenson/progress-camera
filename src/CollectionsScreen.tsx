import { useState } from 'react';
import { Alert, FlatList, Image, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Go } from '../App';
import { exportToFolder } from './backup';
import { describe } from './reminders';
import { Facing, photosOf, photoUri, Store } from './store';
import { C, ui } from './ui';

export default function CollectionsScreen({ store, go }: { store: Store; go: Go }) {
  const s = store.state!;
  const [name, setName] = useState('');
  const [facing, setFacing] = useState<Facing>('back');

  const add = () => {
    if (!name.trim()) return;
    store.addCollection(name.trim(), facing);
    setName('');
    go('camera');
  };

  const exportAll = async () => {
    try {
      const { copied, skipped } = await exportToFolder(s, s.collections.map((c) => c.id));
      Alert.alert('Exported', `${copied} new photo${copied === 1 ? '' : 's'} copied${skipped ? `, ${skipped} already there` : ''}.`);
    } catch (e: any) {
      if (!String(e?.message ?? e).toLowerCase().includes('cancel')) Alert.alert('Export failed', String(e?.message ?? e));
    }
  };

  return (
    <SafeAreaView style={ui.screen}>
      <View style={ui.bar}>
        <Text style={ui.title}>Collections</Text>
        <Pressable onPress={() => go('camera')}>
          <Text style={ui.link}>Done</Text>
        </Pressable>
      </View>

      <FlatList
        data={s.collections}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) => {
          const photos = photosOf(s, item.id);
          const last = photos[photos.length - 1];
          const active = item.id === s.currentId;
          return (
            <Pressable
              onPress={() => {
                store.select(item.id);
                go('camera');
              }}
              onLongPress={() => go('settings', item.id)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 }}
            >
              {last ? (
                <Image source={{ uri: photoUri(last) }} style={{ width: 48, height: 48, borderRadius: 6 }} />
              ) : (
                <View style={{ width: 48, height: 48, borderRadius: 6, backgroundColor: C.surface }} />
              )}
              <View style={{ flex: 1 }}>
                <Text style={[ui.text, active && { fontWeight: '700' }]}>{item.name}</Text>
                <Text style={ui.label}>
                  {photos.length} photos · {describe(item.reminder)}
                </Text>
              </View>
              {active && <Text style={{ color: C.signal }}>●</Text>}
              <Pressable onPress={() => go('settings', item.id)} hitSlop={10}>
                <Text style={[ui.text, { color: C.muted, fontSize: 20 }]}>⋯</Text>
              </Pressable>
            </Pressable>
          );
        }}
        ListFooterComponent={
          <Pressable onPress={exportAll} style={[ui.pill, { margin: 16, alignSelf: 'flex-start' }]}>
            <Text style={ui.text}>Export all to folder</Text>
          </Pressable>
        }
      />

      <View style={{ padding: 16, gap: 10, borderTopWidth: 1, borderTopColor: C.edge }}>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="New collection, e.g. Beard"
          placeholderTextColor="#666"
          onSubmitEditing={add}
          style={{ color: C.bone, fontSize: 16, padding: 12, backgroundColor: C.surface, borderRadius: 8 }}
        />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {(['back', 'front'] as Facing[]).map((f) => (
            <Pressable key={f} onPress={() => setFacing(f)} style={[ui.pill, facing === f && { borderColor: C.signal }]}>
              <Text style={ui.text}>{f === 'back' ? 'Back camera' : 'Selfie'}</Text>
            </Pressable>
          ))}
          <View style={{ flex: 1 }} />
          <Pressable onPress={add} style={[ui.pill, { backgroundColor: C.bone }]}>
            <Text style={[ui.text, { color: C.ink }]}>Add</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
