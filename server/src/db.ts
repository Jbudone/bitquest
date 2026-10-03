import fs from 'fs';
import path from 'path';

export interface WorldStateData {
  worldFlags: Record<string, boolean>;
  players: Record<string, {
    name: string;
    color: string;
    paletteIndex: number;
    coins: number;
    inventory: string[];
    lastSeen: number;
  }>;
}

const DB_FILE = path.resolve(process.cwd(), 'bitquest_world.json');

export class WorldDatabase {
  private data: WorldStateData;

  constructor() {
    this.data = this.load();
  }

  private load(): WorldStateData {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('[DB] Could not load saved database, starting fresh', e);
    }
    return {
      worldFlags: {
        'ancient_gate_opened': false,
        'fountain_jam_discovered': false,
        'first_scone_eaten': false
      },
      players: {}
    };
  }

  public save(): void {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (e) {
      console.error('[DB] Failed to save database', e);
    }
  }

  public getFlag(key: string): boolean {
    return !!this.data.worldFlags[key];
  }

  public setFlag(key: string, value: boolean): void {
    this.data.worldFlags[key] = value;
    this.save();
  }

  public getAllFlags(): Record<string, boolean> {
    return { ...this.data.worldFlags };
  }

  public savePlayer(id: string, name: string, color: string, paletteIndex: number): void {
    if (!this.data.players[id]) {
      this.data.players[id] = {
        name,
        color,
        paletteIndex,
        coins: 10,
        inventory: ['Wooden Practice Stick'],
        lastSeen: Date.now()
      };
    } else {
      this.data.players[id].name = name;
      this.data.players[id].color = color;
      this.data.players[id].paletteIndex = paletteIndex;
      this.data.players[id].lastSeen = Date.now();
    }
    this.save();
  }
}
