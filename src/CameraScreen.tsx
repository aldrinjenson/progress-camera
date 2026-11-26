import { CameraView, useCameraPermissions } from 'expo-camera';
import { useEffect, useRef, useState } from 'react';
import { DeviceEventEmitter, Image, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Go } from '../App';
import { photosOf, photoUri, Store } from './store';
import { C, ui } from './ui';

export default function CameraScreen({ store, go }: { store: Store; go: Go }) {
  const s = store.state!;
  const insets = useSafeAreaInsets();
  const [perm, requestPerm] = useCameraPermissions();
  const cam = useRef<CameraView>(null);
  const [ghost, setGhost] = useState(false);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState(false);
  const shootRef = useRef<() => void>(() => {});

  // Volume keys act as the shutter (native hook in plugins/withVolumeShutter.js).
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('volumeShutter', () => shootRef.current());
    return () => sub.remove();
  }, []);

  const current = s.collections.find((c) => c.id === s.currentId);
  if (!current)
    return (
      <View style={[ui.screen, { justifyContent: 'center', alignItems: 'center' }]}>
        <Pressable onPress={() => go('collections')}>
          <Text style={ui.text}>Create a collection to start</Text>
        </Pressable>
      </View>
    );

  if (!perm?.granted)
    return (
      <View style={[ui.screen, { justifyContent: 'center', alignItems: 'center', gap: 12 }]}>
        <Text style={ui.text}>Camera access is needed.</Text>
        <Pressable onPress={requestPerm} style={[ui.pill, { backgroundColor: C.edge }]}>
          <Text style={ui.text}>Allow camera</Text>
        </Pressable>
      </View>
    );

  const photos = photosOf(s, current.id);
  const last = photos[photos.length - 1];

  const shoot = async () => {
    if (busy || !cam.current) return;
    setBusy(true);
    setFlash(true);
    setTimeout(() => setFlash(false), 120);
    try {
      const pic = await cam.current.takePictureAsync({ quality: 1, shutterSound: false });
      if (pic) await store.addPhoto(current.id, pic.uri);
    } finally {
      setBusy(false);
    }
  };

  shootRef.current = shoot;

  return (
    <View style={ui.screen}>
      <CameraView ref={cam} style={{ flex: 1 }} facing={current.facing} mirror={current.facing === 'front'} />

      {/* Onion skin: the last shot over the live view, so every photo lines up. */}
      {ghost && last && (
        <Image
          source={{ uri: photoUri(last) }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.3 }}
          resizeMode="cover"
          pointerEvents="none"
        />
      )}
      {flash && <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: C.bone }} />}

      <View style={[ui.bar, { position: 'absolute', top: insets.top, left: 0, right: 0 }]}>
        <Pressable style={ui.pill} onPress={() => go('collections')}>
          <Text style={ui.text}>{current.name} ▾</Text>
        </Pressable>
        {last && (
          <Pressable style={ui.pill} onPress={() => setGhost(!ghost)}>
            <Text style={[ui.label, { color: ghost ? C.signal : C.muted }]}>Ghost</Text>
          </Pressable>
        )}
      </View>

      <View
        style={{
          position: 'absolute', bottom: insets.bottom + 24, left: 0, right: 0,
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
        }}
      >
        <Pressable onPress={() => go('timeline')} style={{ width: 52, height: 52 }}>
          {last ? (
            <Image source={{ uri: photoUri(last) }} style={{ width: 52, height: 52, borderRadius: 8, borderWidth: 1, borderColor: C.bone }} />
          ) : (
            <View style={{ width: 52, height: 52, borderRadius: 8, borderWidth: 1, borderColor: C.faint }} />
          )}
        </Pressable>

        <Pressable
          onPress={shoot}
          style={{ width: 76, height: 76, borderRadius: 38, borderWidth: 4, borderColor: C.bone, alignItems: 'center', justifyContent: 'center' }}
        >
          <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: busy ? C.muted : C.bone }} />
        </Pressable>

        <Pressable
          onPress={() => store.setFacing(current.id, current.facing === 'front' ? 'back' : 'front')}
          style={[ui.pill, { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 0 }]}
        >
          <Text style={[ui.text, { fontSize: 22 }]}>⟲</Text>
        </Pressable>
      </View>

      <Text style={[ui.label, { position: "absolute", bottom: insets.bottom + 4, alignSelf: 'center' }]}>
        {photos.length} photo{photos.length === 1 ? '' : 's'}
      </Text>
    </View>
  );
}
