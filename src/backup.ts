import { Directory, File } from 'expo-file-system';
import { dayN, Photo, photosOf, photoUri, State } from './store';
import { pad } from './reminders';

const safe = (name: string) => name.replace(/[\\/:*?"<>|]/g, '-').trim() || 'Collection';

const stamp = (t: number) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
};

const exportName = (p: Photo, first: number) => `${stamp(p.takenAt)}_day${dayN(first, p.takenAt)}.jpg`;

/**
 * Copies collections into a folder the user picks (e.g. Download/Progress Camera).
 * One subfolder per collection. Files already there are skipped, so re-running
 * it is an incremental backup. Returns how many photos were copied.
 */
export async function exportToFolder(state: State, collectionIds: string[]) {
  const root = await Directory.pickDirectoryAsync();
  let copied = 0;
  let skipped = 0;

  for (const id of collectionIds) {
    const c = state.collections.find((x) => x.id === id);
    if (!c) continue;
    const photos = photosOf(state, id);
    if (photos.length === 0) continue;

    const name = safe(c.name);
    const existing = root.list().find((e) => e instanceof Directory && e.name === name) as Directory | undefined;
    const dir = existing ?? root.createDirectory(name);
    const have = new Set(dir.list().map((e) => e.name));
    const first = photos[0].takenAt;

    for (const p of photos) {
      const fname = exportName(p, first);
      if (have.has(fname)) {
        skipped++;
        continue;
      }
      const bytes = await new File(photoUri(p)).bytes();
      await dir.createFile(fname, 'image/jpeg').write(bytes);
      copied++;
    }

    // Notes travel with the photos as a plain text file, rewritten each export.
    const notes = photos
      .filter((p) => p.note)
      .map((p) => `${exportName(p, first)}\t${p.note}`)
      .join('\n');
    if (notes) {
      const old = dir.list().find((e) => e.name === 'notes.txt');
      if (old) old.delete();
      await dir.createFile('notes.txt', 'text/plain').write(notes + '\n');
    }
  }
  return { copied, skipped };
}
