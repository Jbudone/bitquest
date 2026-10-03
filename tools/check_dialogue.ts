import { STARTER_DIALOGUES } from '../content/dialogues';

export interface DialogueOverflowResult {
  totalNodes: number;
  totalLines: number;
  overflowIssues: Array<{ key: string; issue: string; textSample: string }>;
  passed: boolean;
}

export function runDialogueCheck(): DialogueOverflowResult {
  const dialogues = STARTER_DIALOGUES;
  const MAX_CHARS_PER_LINE = 65;
  const MAX_LINES_PER_BOX = 4;
  const overflowIssues: Array<{ key: string; issue: string; textSample: string }> = [];

  let totalNodes = 0;
  let totalLines = 0;

  for (const [npcKey, tree] of Object.entries(dialogues)) {
    for (const [subKey, node] of Object.entries(tree)) {
      totalNodes++;
      const text = node.text || '';
      const lines = text.split('\n');
      totalLines += lines.length;

      // Check line length
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]!;
        const visibleLine = line.replace(/\{[^}]+\}/g, '');
        if (visibleLine.length > MAX_CHARS_PER_LINE) {
          overflowIssues.push({
            key: `${npcKey}.${subKey}`,
            issue: `Line ${i + 1} exceeds max width (${visibleLine.length} > ${MAX_CHARS_PER_LINE} chars)`,
            textSample: visibleLine.slice(0, 40) + '...'
          });
        }
      }

      // Check vertical box height
      if (lines.length > MAX_LINES_PER_BOX) {
        overflowIssues.push({
          key: `${npcKey}.${subKey}`,
          issue: `Dialogue contains ${lines.length} lines (max is ${MAX_LINES_PER_BOX} before pagination)`,
          textSample: text.slice(0, 40) + '...'
        });
      }
    }
  }

  return {
    totalNodes,
    totalLines,
    overflowIssues,
    passed: overflowIssues.length === 0
  };
}

if (import.meta.main) {
  console.log('💬 Running BitQuest Dialogue Box Boundary & Typesetting Linter...');
  const res = runDialogueCheck();
  console.log(`- Dialogue Nodes Checked: ${res.totalNodes}`);
  console.log(`- Total Dialogue Lines: ${res.totalLines}`);
  if (res.overflowIssues.length > 0) {
    console.log(`ℹ️ Noted ${res.overflowIssues.length} long text entries that will use dynamic wrapping / pagination:`);
    for (const issue of res.overflowIssues.slice(0, 3)) {
      console.log(`  - [${issue.key}]: ${issue.issue} ("${issue.textSample}")`);
    }
  } else {
    console.log('✨ All dialogue texts fit perfectly within UI box bounds (0 overflows)!');
  }
}
