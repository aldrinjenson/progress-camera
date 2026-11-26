import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';
import { useCallback, useEffect, useRef, useState } from 'react';
import { canUseGallery, listGallery, photoFileName, saveToGallery } from './gallery';

export type Facing = 'front' | 'back';
// weekday follows expo-notifications: 1 = Sunday … 7 = Saturday.
export type Reminder = { kind: 'off' | 'daily' | 'weekly'; hour: number; minute: number; weekday: number };
export type Collection = { id: string; name: string; facing: Facing; createdAt: number; reminder?: Reminder };
// assetId: the gallery copy in Pictures/Progress Camera (missing until the backup succeeds).
export type Photo = { id: string; collectionId: string; file: string; takenAt: number; note?: string; assetId?: string };
type State = { collections: Collection[]; photos: Photo[]; currentId: string | null };

const KEY = 'progress-camera/v1';
const photoDir = () => new Directory(Paths.document, 'photos');

// Stored paths are relative: the app's document folder can move between iOS installs.
export const photoUri = (p: Photo) => new File(photoDir(), p.file).uri;

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

const seed = (): State => {
  const now = Date.now();
  const collections: Collection[] = [
    { id: uid(), name: 'Monstera', facing: 'back', createdAt: now },
    { id: uid(), name: 'Beard', facing: 'front', createdAt: now },
    { id: uid(), name: 'Balcony garden', facing: 'back', createdAt: now },
  ];
  return { collections, photos: [], currentId: collections[0].id };
};

export function useStore() {
  const [state, setState] = useState<State | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((raw) => setState(raw ? JSON.parse(raw) : seed()));
  }, []);

  const update = useCallback((fn: (s: State) => State) => {
    setState((prev) => {
      if (!prev) return prev;
      const next = fn(prev);
      AsyncStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const stateRef = useRef<State | null>(null);
  stateRef.current = state;
  const backingUp = useRef(false);

  /** Copies every photo that has no gallery copy yet. Safe to call any time; retries failures later. */
  const backupPending = useCallback(async () => {
    if (backingUp.current) return;
    backingUp.current = true;
    try {
      // let the state update that added the photo land first
      await new Promise((r) => setTimeout(r, 50));
      const pending = (stateRef.current?.photos ?? []).filter((p) => !p.assetId);
      for (const p of pending) {
        try {
          const assetId = await saveToGallery(new File(photoDir(), p.file).uri);
          update((s) => ({ ...s, photos: s.photos.map((x) => (x.id === p.id ? { ...x, assetId } : x)) }));
        } catch (e) {
          console.warn('gallery backup failed', p.file, e);
        }
      }
    } finally {
      backingUp.current = false;
    }
  }, [update]);

  /**
   * If the app has no photos (fresh install, cleared data, corruption) but the
   * gallery album has some, rebuild collections and photos from the album.
   */
  const restoreFromGallery = useCallback(async (): Promise<number> => {
    const cur = stateRef.current;
    if (!cur || cur.photos.length > 0) return 0;
    const perm = await canUseGallery();
    if (!perm.granted) return 0;
    const found = await listGallery();
    if (found.length === 0) return 0;

    const dir = photoDir();
    if (!dir.exists) dir.create({ intermediates: true });
    const collections = [...cur.collections];
    const photos: Photo[] = [];
    for (const g of found) {
      let c = collections.find((x) => x.name.replace(/[\\/:*?"<>|_]/g, '-') === g.collection);
      if (!c) {
        c = { id: uid(), name: g.collection, facing: 'back', createdAt: g.takenAt };
        collections.push(c);
      }
      const dest = new File(dir, g.fileName);
      if (!dest.exists) await new File(g.uri).copy(dest);
      photos.push({ id: uid(), collectionId: c.id, file: g.fileName, takenAt: g.takenAt, assetId: g.assetId });
    }
    // drop untouched starter collections so a restore looks like the old app
    const used = new Set(photos.map((p) => p.collectionId));
    const kept = collections.filter((c) => used.has(c.id) || cur.collections.every((x) => x.id !== c.id) || c.reminder);
    update((s) => ({ ...s, collections: kept, photos, currentId: kept.find((c) => used.has(c.id))?.id ?? s.currentId }));
    return photos.length;
  }, [update]);

  const addPhoto = useCallback(
    async (collectionId: string, tempUri: string) => {
      const dir = photoDir();
      if (!dir.exists) dir.create({ intermediates: true });
      const name = stateRef.current?.collections.find((c) => c.id === collectionId)?.name ?? 'Photo';
      const takenAt = Date.now();
      let n = 0;
      while (new File(dir, photoFileName(name, takenAt, n)).exists) n++;
      const file = photoFileName(name, takenAt, n);
      await new File(tempUri).move(new File(dir, file)); // full quality, no re-encode
      const id = uid();
      update((s) => ({ ...s, photos: [...s.photos, { id, collectionId, file, takenAt }] }));
      backupPending();
    },
    [update]
  );

  // Deleting removes the app's copy only. The gallery copy stays, so nothing is ever lost by accident.
  const deletePhoto = useCallback(
    (p: Photo) => {
      const f = new File(photoDir(), p.file);
      if (f.exists) f.delete();
      update((s) => ({ ...s, photos: s.photos.filter((x) => x.id !== p.id) }));
    },
    [update]
  );

  const setNote = useCallback(
    (id: string, note: string) =>
      update((s) => ({ ...s, photos: s.photos.map((p) => (p.id === id ? { ...p, note } : p)) })),
    [update]
  );

  const addCollection = useCallback(
    (name: string, facing: Facing) => {
      const c: Collection = { id: uid(), name, facing, createdAt: Date.now() };
      update((s) => ({ ...s, collections: [...s.collections, c], currentId: c.id }));
    },
    [update]
  );

  const deleteCollection = useCallback(
    (id: string) =>
      update((s) => {
        s.photos.filter((p) => p.collectionId === id).forEach((p) => {
          const f = new File(photoDir(), p.file);
          if (f.exists) f.delete();
        });
        const collections = s.collections.filter((c) => c.id !== id);
        return {
          collections,
          photos: s.photos.filter((p) => p.collectionId !== id),
          currentId: s.currentId === id ? collections[0]?.id ?? null : s.currentId,
        };
      }),
    [update]
  );

  const select = useCallback((id: string) => update((s) => ({ ...s, currentId: id })), [update]);

  const setFacing = useCallback(
    (id: string, facing: Facing) =>
      update((s) => ({ ...s, collections: s.collections.map((c) => (c.id === id ? { ...c, facing } : c)) })),
    [update]
  );

  const setReminder = useCallback(
    (id: string, reminder: Reminder) =>
      update((s) => ({ ...s, collections: s.collections.map((c) => (c.id === id ? { ...c, reminder } : c)) })),
    [update]
  );

  return { state, setReminder, addPhoto, backupPending, restoreFromGallery, deletePhoto, setNote, addCollection, deleteCollection, select, setFacing };
}

export type Store = ReturnType<typeof useStore>;

export type { State };
export const photosOf = (s: State, collectionId: string) =>
  s.photos.filter((p) => p.collectionId === collectionId).sort((a, b) => a.takenAt - b.takenAt);

export const dayN = (first: number, t: number) => {
  const d = (x: number) => new Date(new Date(x).toDateString()).getTime();
  return Math.round((d(t) - d(first)) / 86400000) + 1;
};

export const fmtDate = (t: number) =>
  new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
