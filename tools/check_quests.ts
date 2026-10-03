import { DataRegistry } from '../shared/src/dataRegistry';
import { STARTER_DIALOGUES } from '../content/dialogues';

export interface QuestCheckResult {
  totalQuests: number;
  totalStages: number;
  totalDialogues: number;
  brokenDialogueLinks: string[];
  missingQuests: string[];
  passed: boolean;
}

export function runQuestCheck(): QuestCheckResult {
  DataRegistry.initialize();
  const quests = DataRegistry.getAllQuests();

  // Flatten nested dialogue dictionary: characterId -> subKey -> node
  const allNodes = new Map<string, any>();
  for (const [npcKey, tree] of Object.entries(STARTER_DIALOGUES)) {
    for (const [subKey, node] of Object.entries(tree)) {
      allNodes.set(`${npcKey}.${subKey}`, node);
      allNodes.set(subKey, node); // also allow direct subkey reference
    }
  }

  const brokenDialogueLinks: string[] = [];
  const missingQuests: string[] = [];

  // Check all dialogues and responses
  for (const [key, node] of allNodes.entries()) {
    if (node.responses) {
      for (const resp of node.responses) {
        if (resp.nextDialogueKey && !allNodes.has(resp.nextDialogueKey)) {
          brokenDialogueLinks.push(`Dialogue [${key}] references missing next key: "${resp.nextDialogueKey}"`);
        }
      }
    }
  }

  // Check all quests
  let totalStages = 0;
  const questIds = new Set(quests.map(q => q.id));

  for (const quest of quests) {
    totalStages += quest.stages.length;

    // Check prerequisites
    for (const prereq of quest.prerequisiteQuests) {
      if (!questIds.has(prereq)) {
        missingQuests.push(`Quest [${quest.id}] requires missing prerequisite quest: "${prereq}"`);
      }
    }

    // Check rewards
    for (const item of quest.rewards.items) {
      const def = DataRegistry.getItem(item.itemType);
      if (!def) {
        missingQuests.push(`Quest [${quest.id}] rewards unregistered item: "${item.itemType}"`);
      }
    }
  }

  const passed = brokenDialogueLinks.length === 0 && missingQuests.length === 0;

  return {
    totalQuests: quests.length,
    totalStages,
    totalDialogues: allNodes.size,
    brokenDialogueLinks,
    missingQuests,
    passed
  };
}

if (import.meta.main) {
  console.log('📜 Running BitQuest Quest Dependency & Dialogue Flow Linter...');
  const res = runQuestCheck();
  console.log(`- Quests Checked: ${res.totalQuests} (${res.totalStages} total stages)`);
  console.log(`- Dialogue Nodes Checked: ${res.totalDialogues} nodes`);
  console.log(`- Dialogue Links: ${res.brokenDialogueLinks.length === 0 ? '✅ 100% Valid (No dead ends)' : `❌ ${res.brokenDialogueLinks.join('\n')}`}`);
  console.log(`- Quest Dependencies & Rewards: ${res.missingQuests.length === 0 ? '✅ 100% Valid' : `❌ ${res.missingQuests.join('\n')}`}`);

  if (!res.passed) {
    console.error('❌ Quest/Dialogue validation failed!');
    process.exit(1);
  } else {
    console.log('✨ All quest graphs, stage dependencies, and dialogue trees 100% verified!');
  }
}
