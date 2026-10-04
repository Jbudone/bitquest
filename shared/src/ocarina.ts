/**
 * BitQuest - Chiptune Ocarina & Jam Sessions (Task 7.9 / Issue #27)
 * Authoritative shared definitions, pentatonic notes, magical songs, and pattern detection engine.
 */

export type OcarinaNote = 'C4' | 'D4' | 'E4' | 'G4' | 'A4';

export interface NoteDefinition {
  note: OcarinaNote;
  freq: number;
  label: string;
  solfege: string;
  hotkey: string;
  altKey: string;
  color: string;
  glyph: string;
}

export const OCARINA_NOTES: Record<OcarinaNote, NoteDefinition> = {
  C4: {
    note: 'C4',
    freq: 261.63,
    label: 'C',
    solfege: 'Do',
    hotkey: '1',
    altKey: 'ArrowUp',
    color: '#38bdf8', // Azure Sky
    glyph: '●'
  },
  D4: {
    note: 'D4',
    freq: 293.66,
    label: 'D',
    solfege: 'Re',
    hotkey: '2',
    altKey: 'ArrowLeft',
    color: '#34d399', // Emerald Meadow
    glyph: '◆'
  },
  E4: {
    note: 'E4',
    freq: 329.63,
    label: 'E',
    solfege: 'Mi',
    hotkey: '3',
    altKey: 'ArrowRight',
    color: '#fbbf24', // Sun Amber
    glyph: '▲'
  },
  G4: {
    note: 'G4',
    freq: 392.00,
    label: 'G',
    solfege: 'Sol',
    hotkey: '4',
    altKey: 'ArrowDown',
    color: '#f472b6', // Berry Blossom
    glyph: '★'
  },
  A4: {
    note: 'A4',
    freq: 440.00,
    label: 'A',
    solfege: 'La',
    hotkey: '5',
    altKey: 'Space',
    color: '#a78bfa', // Twilight Violet
    glyph: '✦'
  }
};

export interface OcarinaSong {
  id: string;
  name: string;
  subtitle: string;
  sequence: readonly OcarinaNote[];
  description: string;
  effectType: 'sun' | 'storm' | 'woodlands' | 'hearth' | 'revelation';
  icon: string;
}

export const OCARINA_SONGS: readonly OcarinaSong[] = [
  {
    id: 'song_of_sun',
    name: 'Song of the Sun',
    subtitle: 'Hymn of the Dawn Light',
    sequence: ['C4', 'E4', 'G4', 'E4', 'G4'],
    description: 'Disperses storm clouds and accelerates time to the warmth of golden sunrise.',
    effectType: 'sun',
    icon: '☀️'
  },
  {
    id: 'song_of_storms',
    name: 'Song of Storms',
    subtitle: 'Rhythm of the Tempest',
    sequence: ['D4', 'G4', 'D4', 'G4', 'A4'],
    description: 'Calls forth gathering stormclouds, rhythmic thunder, and cooling showers.',
    effectType: 'storm',
    icon: '🌧️'
  },
  {
    id: 'song_of_woodlands',
    name: "Bramble's Woodland Jig",
    subtitle: 'Chorus of the Forest Spirits',
    sequence: ['C4', 'D4', 'E4', 'G4', 'A4'],
    description: 'Awakens gentle nature spirits, causing wild sweet berries to sprout nearby.',
    effectType: 'woodlands',
    icon: '🍓'
  },
  {
    id: 'lullaby_hearth',
    name: 'Lullaby of the Hearth',
    subtitle: 'Nocturne of Embers',
    sequence: ['E4', 'G4', 'A4', 'G4', 'E4'],
    description: 'A comforting tune that soothes weary travelers, restores 1 HP, and puts critters to rest.',
    effectType: 'hearth',
    icon: '🔥'
  },
  {
    id: 'song_of_revelation',
    name: 'Minuet of Mysteries',
    subtitle: 'Echo of the Ancients',
    sequence: ['A4', 'G4', 'E4', 'D4', 'C4'],
    description: 'Reverberates through the earth, revealing hidden buried treasure caches.',
    effectType: 'revelation',
    icon: '✨'
  }
];

export interface NoteEvent {
  note: OcarinaNote;
  time: number;
  playerId?: string;
}

export class OcarinaEngine {
  /** Maximum pause allowed between notes before a melody buffer expires (2.8 seconds) */
  public static readonly MAX_NOTE_GAP_MS = 2800;

  /** Co-op Jamming window: notes played by different players within 3.5s count towards a Jam Session */
  public static readonly JAM_SESSION_WINDOW_MS = 3500;

  /**
   * Matches the trailing notes against all registered magical song sequences.
   * Returns the matched song if the exact sequence was completed within the timeout threshold.
   */
  public static matchSong(
    history: readonly NoteEvent[],
    maxGapMs = OcarinaEngine.MAX_NOTE_GAP_MS,
    now = Date.now()
  ): OcarinaSong | null {
    if (history.length === 0) return null;

    // Filter out notes separated by more than maxGapMs
    const validNotes: OcarinaNote[] = [];
    let lastTime = 0;

    for (let i = history.length - 1; i >= 0; i--) {
      const entry = history[i]!;
      if (lastTime > 0 && (lastTime - entry.time > maxGapMs)) {
        break; // Gap too large
      }
      validNotes.unshift(entry.note);
      lastTime = entry.time;
    }

    if (now - lastTime > maxGapMs && validNotes.length > 0) {
      return null;
    }

    // Check each song sequence against the end of validNotes
    for (const song of OCARINA_SONGS) {
      const seq = song.sequence;
      if (validNotes.length < seq.length) continue;

      const slice = validNotes.slice(validNotes.length - seq.length);
      let match = true;
      for (let j = 0; j < seq.length; j++) {
        if (slice[j] !== seq[j]) {
          match = false;
          break;
        }
      }

      if (match) {
        return song;
      }
    }

    return null;
  }

  /**
   * Detects whether two or more distinct players have played notes within the jam window.
   * Confirms a multiplayer jam session resonance.
   */
  public static checkJamResonance(
    recentNotes: readonly NoteEvent[],
    currentPlayerId: string,
    now = Date.now(),
    windowMs = OcarinaEngine.JAM_SESSION_WINDOW_MS
  ): { isJam: boolean; participantIds: string[] } {
    const participants = new Set<string>();
    participants.add(currentPlayerId);

    for (let i = recentNotes.length - 1; i >= 0; i--) {
      const note = recentNotes[i]!;
      if (now - note.time > windowMs) break;
      if (note.playerId && note.playerId !== currentPlayerId) {
        participants.add(note.playerId);
      }
    }

    const participantIds = Array.from(participants);
    return {
      isJam: participantIds.length >= 2,
      participantIds
    };
  }

  /**
   * Helper to retrieve song definition by id.
   */
  public static getSongById(id: string): OcarinaSong | undefined {
    return OCARINA_SONGS.find(s => s.id === id);
  }

  /**
   * Validates if a note string is a valid OcarinaNote.
   */
  public static isValidNote(str: string): str is OcarinaNote {
    return str in OCARINA_NOTES;
  }
}
