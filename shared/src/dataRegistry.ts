import { z } from 'zod';
import itemsRaw from '../data/items.json';
import lootTablesRaw from '../data/loot_tables.json';
import enemiesRaw from '../data/enemies.json';
import questsRaw from '../data/quests.json';

import {
  ItemDefinitionSchema,
  LootTableSchema,
  QuestDefinitionSchema,
  type ItemDefinition,
  type LootTable,
  type QuestDefinition
} from './schemas';

// Enemy Schema for data files
export const EnemyDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  maxHealth: z.number().int().positive(),
  damage: z.number().int().nonnegative(),
  speed: z.number().positive(),
  aggroRadius: z.number().positive(),
  attackCooldownMs: z.number().positive(),
  telegraphMs: z.number().positive(),
  lootTableId: z.string(),
  aiArchetype: z.enum(['skitterer', 'charger', 'boss', 'kiter']).default('skitterer')
});
export type EnemyDefinition = z.infer<typeof EnemyDefinitionSchema>;

export class DataRegistry {
  private static items = new Map<string, ItemDefinition>();
  private static lootTables = new Map<string, LootTable>();
  private static quests = new Map<string, QuestDefinition>();
  private static enemies = new Map<string, EnemyDefinition>();
  private static initialized = false;

  public static initialize(): void {
    if (this.initialized) return;

    // 1. Validate & Register Items
    const parsedItems = z.array(ItemDefinitionSchema).parse(itemsRaw);
    parsedItems.forEach(item => this.items.set(item.id, item));

    // 2. Validate & Register Loot Tables
    const parsedLoot = z.array(LootTableSchema).parse(lootTablesRaw);
    parsedLoot.forEach(table => this.lootTables.set(table.id, table));

    // 3. Validate & Register Enemies
    const parsedEnemies = z.array(EnemyDefinitionSchema).parse(enemiesRaw);
    parsedEnemies.forEach(enemy => this.enemies.set(enemy.id, enemy));

    // 4. Validate & Register Quests
    const parsedQuests = z.array(QuestDefinitionSchema).parse(questsRaw);
    parsedQuests.forEach(quest => this.quests.set(quest.id, quest));

    this.initialized = true;
  }

  // Accessors
  public static getItem(id: string): ItemDefinition | undefined {
    this.initialize();
    return this.items.get(id);
  }

  public static getAllItems(): ItemDefinition[] {
    this.initialize();
    return Array.from(this.items.values());
  }

  public static getLootTable(id: string): LootTable | undefined {
    this.initialize();
    return this.lootTables.get(id);
  }

  public static getEnemy(id: string): EnemyDefinition | undefined {
    this.initialize();
    return this.enemies.get(id);
  }

  public static getAllEnemies(): EnemyDefinition[] {
    this.initialize();
    return Array.from(this.enemies.values());
  }

  public static getQuest(id: string): QuestDefinition | undefined {
    this.initialize();
    return this.quests.get(id);
  }

  public static getAllQuests(): QuestDefinition[] {
    this.initialize();
    return Array.from(this.quests.values());
  }

  /**
   * Rolls loot drops from a given loot table ID using RNG.
   */
  public static rollLoot(tableId: string): Array<{ itemType: string; count: number }> {
    const table = this.getLootTable(tableId);
    if (!table) return [];

    const result: Array<{ itemType: string; count: number }> = [];

    // Guaranteed drops
    for (const rule of table.guaranteedDrops) {
      if (Math.random() <= rule.chance) {
        const count = Math.floor(Math.random() * (rule.maxCount - rule.minCount + 1)) + rule.minCount;
        result.push({ itemType: rule.itemType, count });
      }
    }

    // Weighted pool drops
    for (const rule of table.weightedPool) {
      if (Math.random() <= rule.chance) {
        const count = Math.floor(Math.random() * (rule.maxCount - rule.minCount + 1)) + rule.minCount;
        result.push({ itemType: rule.itemType, count });
      }
    }

    return result;
  }
}
