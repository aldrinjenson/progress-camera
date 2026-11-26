import { File } from 'expo-file-system';
import { Album, Asset, requestPermissionsAsync } from 'expo-media-library';
import { pad } from './reminders';

// Every photo is also saved to the phone's gallery in Pictures/Progress Camera.
// That copy is the backup: it survives an uninstall, a wiped app, or a broken
// install, Google Photos can back it up, and the app rebuilds itself from it.
export const ALBUM = 'Progress Camera';

const safe = (name: string) => name.replace(/[\\/:*?"<>|_]/g, '-').trim() || 'Collection';

const stamp = (t: number) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
};

/** "Hair temples_2026-11-26_154209.jpg": the collection and time live in the name, so a restore needs nothing else. */
export const photoFileName = (collection: string, t: number, n = 0) =>
  `${safe(collection)}_${stamp(t)}${n ? `-${n}` : ''}.jpg`;

export function parsePhotoFileName(name: string): { collection: string; takenAt: number } | null {
  const m = name.match(/^(.+)_(\d{4})-(\d{2})-(\d{2})_(\d{2})(\d{2})(\d{2})(?:-\d+)?\.jpe?g$/i);
  if (!m) return null;
  const [, collection, y, mo, d, h, mi, s] = m;
  return { collection, takenAt: new Date(+y, +mo - 1, +d, +h, +mi, +s).getTime() };
}

export async function canUseGallery() {
  const p = await requestPermissionsAsync(false, ['photo']);
  return { granted: p.granted, full: p.accessPrivileges !== 'limited' };
}

/** Saves a file from app storage into the album. Returns the gallery asset id. */
export async function saveToGallery(fileUri: string): Promise<string> {
  const album = await Album.get(ALBUM);
  if (album) return (await Asset.create(fileUri, album)).id;
  const asset = await Asset.create(fileUri);
  await Album.create(ALBUM, [asset], true); // moves it into Pictures/Progress Camera
  return asset.id;
}

export type GalleryPhoto = { assetId: string; fileName: string; uri: string; collection: string; takenAt: number };

/** Everything in the album that looks like one of ours. */
export async function listGallery(): Promise<GalleryPhoto[]> {
  const album = await Album.get(ALBUM);
  if (!album) return [];
  const out: GalleryPhoto[] = [];
  for (const a of await album.getAssets()) {
    const fileName = await a.getFilename();
    const parsed = parsePhotoFileName(fileName);
    if (!parsed) continue;
    out.push({ assetId: a.id, fileName, uri: await a.getUri(), ...parsed });
  }
  return out.sort((x, y) => x.takenAt - y.takenAt);
}

export const fileExists = (uri: string) => {
  try {
    return new File(uri).exists;
  } catch {
    return false;
  }
};
