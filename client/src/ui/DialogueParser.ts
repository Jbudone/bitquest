export type DialogueToken =
  | { type: 'char'; char: string; styles: string[]; charIndex: number }
  | { type: 'mood'; mood: string }
  | { type: 'pause'; duration: number }
  | { type: 'speed'; speed: number };

export interface ParsedDialogue {
  tokens: DialogueToken[];
  plainText: string;
}

const STYLE_TAGS: Record<string, string> = {
  shake: 'char-shake',
  wave: 'char-wave',
  rainbow: 'char-rainbow',
  gold: 'char-gold',
  red: 'char-red',
  cyan: 'char-cyan',
  green: 'char-green',
  purple: 'char-purple',
  bold: 'char-bold',
  italic: 'char-italic'
};

const MOODS = new Set(['happy', 'surprised', 'smug', 'default', 'angry', 'sad']);

export class DialogueParser {
  public static parse(input: string): ParsedDialogue {
    const tokens: DialogueToken[] = [];
    const activeStyles = new Set<string>();
    let plainText = '';
    let charIndex = 0;
    let i = 0;

    while (i < input.length) {
      if (input[i] === '{') {
        const closeIdx = input.indexOf('}', i);
        if (closeIdx !== -1) {
          const tagContent = input.slice(i + 1, closeIdx).trim();
          i = closeIdx + 1;

          // Check closing tags e.g. {/shake}
          if (tagContent.startsWith('/')) {
            const tag = tagContent.slice(1).toLowerCase();
            if (STYLE_TAGS[tag]) {
              activeStyles.delete(STYLE_TAGS[tag]);
            }
            continue;
          }

          // Check style opening tags e.g. {shake}, {gold}
          const lowerTag = tagContent.toLowerCase();
          if (STYLE_TAGS[lowerTag]) {
            activeStyles.add(STYLE_TAGS[lowerTag]);
            continue;
          }

          // Check mood e.g. {mood:surprised} or {surprised}
          if (lowerTag.startsWith('mood:')) {
            const mood = lowerTag.slice(5).trim();
            tokens.push({ type: 'mood', mood });
            continue;
          }
          if (MOODS.has(lowerTag)) {
            tokens.push({ type: 'mood', mood: lowerTag });
            continue;
          }

          // Check pause e.g. {pause:300}
          if (lowerTag.startsWith('pause:')) {
            const duration = parseInt(lowerTag.slice(6).trim(), 10) || 200;
            tokens.push({ type: 'pause', duration });
            continue;
          }

          // Check speed e.g. {speed:30}
          if (lowerTag.startsWith('speed:')) {
            const speed = parseInt(lowerTag.slice(6).trim(), 10) || 18;
            tokens.push({ type: 'speed', speed });
            continue;
          }

          // Unknown tag, treat as literal text
          plainText += '{' + tagContent + '}';
          for (const ch of '{' + tagContent + '}') {
            tokens.push({
              type: 'char',
              char: ch,
              styles: Array.from(activeStyles),
              charIndex: charIndex++
            });
          }
          continue;
        }
      }

      // Regular character
      const ch = input[i]!;
      plainText += ch;
      tokens.push({
        type: 'char',
        char: ch,
        styles: Array.from(activeStyles),
        charIndex: charIndex++
      });
      i++;
    }

    return { tokens, plainText };
  }

  public static stripTags(input: string): string {
    return input.replace(/\{[^}]+\}/g, '');
  }
}
