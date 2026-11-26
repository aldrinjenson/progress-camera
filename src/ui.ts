import { Platform, StyleSheet } from 'react-native';

// Warm "analog" palette: near-black ink, bone type, one yellow accent.
export const C = {
  ink: '#0B0A09',
  surface: '#161412',
  bone: '#F2EDE6',
  muted: '#8C8379',
  faint: '#514B45',
  edge: 'rgba(242,237,230,0.14)',
  signal: '#FFD60A',
  danger: '#F5A343',
};

const mono = Platform.select({ ios: 'Menlo', default: 'monospace' });

export const ui = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.ink },
  text: { color: C.bone, fontSize: 16 },
  dim: { color: C.muted, fontSize: 13 },
  // Small uppercase mono labels, like the lettering on a film edge.
  label: { color: C.muted, fontSize: 11, fontFamily: mono, letterSpacing: 1.2, textTransform: 'uppercase' },
  title: { color: C.bone, fontSize: 20, fontWeight: '600' },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  link: { color: C.bone, fontSize: 16, padding: 4 },
  pill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(11,10,9,0.55)', borderWidth: 1, borderColor: C.edge },
});
