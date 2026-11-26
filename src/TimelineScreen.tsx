import { useEffect, useState } from 'react';
import { Alert, BackHandler, Dimensions, FlatList, Image, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Go } from '../App';
import { dayN, fmtDate, Photo, photosOf, photoUri, Store } from './store';
import { C, ui } from './ui';

type Mode = 'grid' | 'compare' | 'flipbook';
const COLS = 3;
const W = Dimensions.get('window').width;
const TILE = (W - 4 * (COLS - 1)) / COLS;

export default function TimelineScreen({ store, go }: { store: Store; go: Go }) {
  const s = store.state!;
  const current = s.collections.find((c) => c.id === s.currentId)!;
  const photos = photosOf(s, current.id);
  const first = photos[0]?.takenAt ?? Date.now();
  const [mode, setMode] = useState<Mode>('grid');
  const [open, setOpen] = useState<Photo | null>(null);
  const [frame, setFrame] = useState(0);
  const [compareIdx, setCompareIdx] = useState<number | null>(null);

  useEffect(() => {
    if (mode !== 'flipbook' || photos.length < 2) return;
    const t = setInterval(() => setFrame((f) => (f + 1) % photos.length), 400);
    return () => clearInterval(t);
  }, [mode, photos.length]);

  if (open) return <Viewer photo={open} day={dayN(first, open.takenAt)} store={store} close={() => setOpen(null)} />;

  const a = photos[0];
  const b = photos[compareIdx ?? photos.length - 1];

  return (
    <SafeAreaView style={ui.screen}>
      <View style={ui.bar}>
        <Pressable onPress={() => go('camera')}>
          <Text style={ui.link}>‹ Camera</Text>
        </Pressable>
        <Text style={ui.title}>{current.name}</Text>
        <View style={{ width: 70 }} />
      </View>

      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 12 }}>
        {(['grid', 'compare', 'flipbook'] as Mode[]).map((m) => (
          <Pressable key={m} onPress={() => setMode(m)} style={[ui.pill, mode === m && { borderColor: C.signal }]}>
            <Text style={ui.text}>{m === 'grid' ? 'Timeline' : m === 'compare' ? 'Compare' : 'Flipbook'}</Text>
          </Pressable>
        ))}
      </View>

      {photos.length === 0 ? (
        <Text style={[ui.dim, { padding: 16 }]}>No photos yet. Take the first one: that's Day 1.</Text>
      ) : mode === 'grid' ? (
        <FlatList
          data={[...photos].reverse()}
          numColumns={COLS}
          keyExtractor={(p) => p.id}
          columnWrapperStyle={{ gap: 4 }}
          contentContainerStyle={{ gap: 4 }}
          renderItem={({ item }) => (
            <Pressable onPress={() => setOpen(item)}>
              <Image source={{ uri: photoUri(item) }} style={{ width: TILE, height: TILE * 1.33 }} />
              <Text style={[ui.label, { position: "absolute", left: 6, bottom: 4, color: C.bone }]}>
                Day {dayN(first, item.takenAt)}
              </Text>
            </Pressable>
          )}
        />
      ) : mode === 'compare' ? (
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            {[a, b].map((p, i) => (
              <View key={i} style={{ flex: 1 }}>
                <Image source={{ uri: photoUri(p) }} style={{ width: '100%', aspectRatio: 3 / 4 }} />
                <Text style={[ui.text, { padding: 8 }]}>
                  Day {dayN(first, p.takenAt)} <Text style={ui.dim}>{fmtDate(p.takenAt)}</Text>
                </Text>
              </View>
            ))}
          </View>
          <Text style={[ui.dim, { padding: 16 }]}>Tap a photo below to compare it with Day 1.</Text>
          <FlatList
            horizontal
            data={photos}
            keyExtractor={(p) => p.id}
            contentContainerStyle={{ gap: 4, paddingHorizontal: 16 }}
            renderItem={({ item, index }) => (
              <Pressable onPress={() => setCompareIdx(index)}>
                <Image
                  source={{ uri: photoUri(item) }}
                  style={{ width: 56, height: 75, opacity: item.id === b.id ? 1 : 0.5 }}
                />
              </Pressable>
            )}
          />
        </View>
      ) : (
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Image source={{ uri: photoUri(photos[frame % photos.length]) }} style={{ width: W, aspectRatio: 3 / 4 }} />
          <Text style={[ui.text, { padding: 12 }]}>
            Day {dayN(first, photos[frame % photos.length].takenAt)} · {frame % photos.length + 1}/{photos.length}
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

function Viewer({ photo, day, store, close }: { photo: Photo; day: number; store: Store; close: () => void }) {
  const [note, setNote] = useState(photo.note ?? '');
  const back = () => {
    store.setNote(photo.id, note);
    close();
  };

  // Back from a single photo returns to the grid (registered last, so it runs before App's handler).
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => (back(), true));
    return () => sub.remove();
  }, [note]);
  const del = () =>
    Alert.alert('Delete this photo?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { store.deletePhoto(photo); close(); } },
    ]);

  return (
    <SafeAreaView style={ui.screen}>
      <View style={ui.bar}>
        <Pressable onPress={back}>
          <Text style={ui.link}>‹ Back</Text>
        </Pressable>
        <Text style={[ui.label, { color: C.bone }]}>Day {day} · {fmtDate(photo.takenAt)}</Text>
        <Pressable onPress={del}>
          <Text style={[ui.link, { color: C.danger }]}>Delete</Text>
        </Pressable>
      </View>
      <Image source={{ uri: photoUri(photo) }} style={{ width: '100%', flex: 1 }} resizeMode="contain" />
      <TextInput
        value={note}
        onChangeText={setNote}
        onEndEditing={() => store.setNote(photo.id, note)}
        placeholder="Add a note (e.g. week 3, shedding)"
        placeholderTextColor="#666"
        style={{ color: C.bone, fontSize: 16, padding: 16, borderTopWidth: 1, borderTopColor: C.edge }}
      />
    </SafeAreaView>
  );
}
