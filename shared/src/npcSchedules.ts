// shared/src/npcSchedules.ts
// BitQuest Village NPC Daily Schedules & Organic Life Cycles Engine
// Issue #39 / Milestone 3: Circadian schedules, contextual activities, waypoint steering, and dynamic dialogue

import { WeatherEngine } from './weather';

export type NPCActivity =
  | 'tending_garden'
  | 'baking'
  | 'fishing'
  | 'blacksmithing'
  | 'patrolling'
  | 'gathering'
  | 'resting'
  | 'browsing';

export type NPCDirection = 'left' | 'right' | 'up' | 'down';

export type NPCAmbientEmote = 'heart' | 'happy' | 'sweat' | 'music' | 'sleep' | 'exclamation' | null;

export interface NPCScheduleKeyframe {
  startHour: number; // 0..24
  endHour: number;   // 0..24
  x: number;
  y: number;
  activity: NPCActivity;
  direction: NPCDirection;
  greeting: string;
  ambientEmote: NPCAmbientEmote;
}

export interface NPCScheduleDef {
  npcId: string;
  name: string;
  role: string;
  keyframes: NPCScheduleKeyframe[];
}

export const NPC_SCHEDULES: Record<string, NPCScheduleDef> = {
  npc_grandma: {
    npcId: 'npc_grandma',
    name: 'Grandma Bramble',
    role: 'Village Baker & Herbalist',
    keyframes: [
      {
        startHour: 5,
        endHour: 8,
        x: 1420,
        y: 880,
        activity: 'tending_garden',
        direction: 'down',
        greeting: 'Good morning, sweet pea! The morning dew is wonderful for the turnips today.',
        ambientEmote: 'heart'
      },
      {
        startHour: 8,
        endHour: 17,
        x: 1248,
        y: 870,
        activity: 'baking',
        direction: 'left',
        greeting: 'Fresh blackberry pies and hot sourdough straight out of the hearth! Mind the oven heat.',
        ambientEmote: 'happy'
      },
      {
        startHour: 17,
        endHour: 21,
        x: 670,
        y: 720,
        activity: 'gathering',
        direction: 'left',
        greeting: 'Pull up a log by the fire, child. The evening turnip stew is simmering nicely.',
        ambientEmote: 'music'
      },
      {
        startHour: 21,
        endHour: 5,
        x: 1280,
        y: 830,
        activity: 'resting',
        direction: 'up',
        greeting: 'Zzz... A warm quilt after a long day of baking... sleepy time...',
        ambientEmote: 'sleep'
      }
    ]
  },

  npc_barnaby: {
    npcId: 'npc_barnaby',
    name: 'Barnaby the Pelican',
    role: 'Master Blacksmith',
    keyframes: [
      {
        startHour: 6,
        endHour: 9,
        x: 800,
        y: 870,
        activity: 'blacksmithing',
        direction: 'down',
        greeting: 'Caw! Stoking the embers early makes for clean, tempered steel.',
        ambientEmote: 'exclamation'
      },
      {
        startHour: 9,
        endHour: 18,
        x: 770,
        y: 860,
        activity: 'blacksmithing',
        direction: 'right',
        greeting: 'Need your blade honed? Bring me scrap ore and watch the sparks fly!',
        ambientEmote: 'happy'
      },
      {
        startHour: 18,
        endHour: 22,
        x: 620,
        y: 700,
        activity: 'gathering',
        direction: 'right',
        greeting: 'Ah, the crackling embers remind me of the great mountain forges of old.',
        ambientEmote: 'music'
      },
      {
        startHour: 22,
        endHour: 6,
        x: 820,
        y: 850,
        activity: 'resting',
        direction: 'left',
        greeting: 'Honk... snoozing on the perch till the dawn bell strikes...',
        ambientEmote: 'sleep'
      }
    ]
  },

  npc_reinald: {
    npcId: 'npc_reinald',
    name: 'Sir Reginald',
    role: 'Town Sentinel Rooster',
    keyframes: [
      {
        startHour: 4.5,
        endHour: 7,
        x: 1024,
        y: 920,
        activity: 'patrolling',
        direction: 'up',
        greeting: 'COCK-A-DOODLE-DOO! Arise, brave champions! Honor and glory await!',
        ambientEmote: 'exclamation'
      },
      {
        startHour: 7,
        endHour: 17,
        x: 1024,
        y: 1030,
        activity: 'patrolling',
        direction: 'right',
        greeting: 'A knightly rooster never wavers! The grand plaza is under my chivalrous vigilance.',
        ambientEmote: 'happy'
      },
      {
        startHour: 17,
        endHour: 21,
        x: 600,
        y: 740,
        activity: 'patrolling',
        direction: 'right',
        greeting: 'Perimeter check clear! No goblin mischief shall interrupt our fellowship tonight.',
        ambientEmote: 'happy'
      },
      {
        startHour: 21,
        endHour: 4.5,
        x: 1010,
        y: 890,
        activity: 'resting',
        direction: 'down',
        greeting: 'Even chivalrous sentinels must rest their spurs... cluck... zzz...',
        ambientEmote: 'sleep'
      }
    ]
  },

  npc_finn: {
    npcId: 'npc_finn',
    name: 'Finn the Otter',
    role: 'River Angler & Guide',
    keyframes: [
      {
        startHour: 5,
        endHour: 11,
        x: 520,
        y: 960,
        activity: 'fishing',
        direction: 'down',
        greeting: 'The morning ripples are alive with copper minnows! Best bite of the day.',
        ambientEmote: 'happy'
      },
      {
        startHour: 11,
        endHour: 17,
        x: 950,
        y: 890,
        activity: 'browsing',
        direction: 'left',
        greeting: 'Fresh freshwater catch! Caught with patience and finest willow flies.',
        ambientEmote: 'happy'
      },
      {
        startHour: 17,
        endHour: 21,
        x: 640,
        y: 750,
        activity: 'gathering',
        direction: 'up',
        greeting: 'Nothing beats skewering an azure trout over glowing maple embers!',
        ambientEmote: 'music'
      },
      {
        startHour: 21,
        endHour: 5,
        x: 480,
        y: 940,
        activity: 'resting',
        direction: 'right',
        greeting: 'Zzz... the river sings the sweetest lullabies against the reeds...',
        ambientEmote: 'sleep'
      }
    ]
  },

  merchant_pip: {
    npcId: 'merchant_pip',
    name: 'Pip the Fox Merchant',
    role: 'Curio Dealer & Trader',
    keyframes: [
      {
        startHour: 6,
        endHour: 9,
        x: 1090,
        y: 870,
        activity: 'browsing',
        direction: 'down',
        greeting: 'Unpacking shiny curios and oddities! First pick goes to the early birds!',
        ambientEmote: 'happy'
      },
      {
        startHour: 9,
        endHour: 19,
        x: 1090,
        y: 870,
        activity: 'browsing',
        direction: 'down',
        greeting: 'Welcome to Pip’s Oddities! Buy or sell, coins or acorns, all are welcome!',
        ambientEmote: 'happy'
      },
      {
        startHour: 19,
        endHour: 22,
        x: 660,
        y: 690,
        activity: 'gathering',
        direction: 'down',
        greeting: 'A fine day of honest trade! Counting my acorns by the warm hearth.',
        ambientEmote: 'heart'
      },
      {
        startHour: 22,
        endHour: 6,
        x: 1110,
        y: 850,
        activity: 'resting',
        direction: 'left',
        greeting: 'Zzz... shiny gold coins... dancing acorns...',
        ambientEmote: 'sleep'
      }
    ]
  }
};

export class NPCScheduleEngine {
  /**
   * Converts game time in seconds to 24-hour decimal clock (e.g. 14.5 for 2:30 PM).
   */
  public static getGameHour(timeOfDaySec: number): number {
    const raw = (timeOfDaySec / WeatherEngine.SECONDS_PER_GAME_HOUR) % 24;
    return (raw + 24) % 24;
  }

  /**
   * Retrieves the active schedule keyframe for a given NPC at the current time.
   */
  public static getScheduleKeyframe(npcId: string, timeOfDaySec: number): NPCScheduleKeyframe | null {
    const schedule = NPC_SCHEDULES[npcId];
    if (!schedule) return null;

    const hour = this.getGameHour(timeOfDaySec);

    for (let i = 0; i < schedule.keyframes.length; i++) {
      const kf = schedule.keyframes[i];
      if (kf.startHour <= kf.endHour) {
        // Normal daytime window (e.g. 8 to 17)
        if (hour >= kf.startHour && hour < kf.endHour) {
          return kf;
        }
      } else {
        // Overnight window wrapping past midnight (e.g. 21 to 5)
        if (hour >= kf.startHour || hour < kf.endHour) {
          return kf;
        }
      }
    }

    // Default fallback to first keyframe
    return schedule.keyframes[0] || null;
  }

  /**
   * Zero-allocation position evaluator that populates outPos.
   */
  public static getTargetPosition(
    npcId: string,
    timeOfDaySec: number,
    outPos: { x: number; y: number }
  ): boolean {
    const kf = this.getScheduleKeyframe(npcId, timeOfDaySec);
    if (!kf) return false;
    outPos.x = kf.x;
    outPos.y = kf.y;
    return true;
  }

  /**
   * Retrieves contextual dialogue greeting matching the NPC's active schedule and activity.
   */
  public static getContextualGreeting(npcId: string, timeOfDaySec: number): string {
    const kf = this.getScheduleKeyframe(npcId, timeOfDaySec);
    if (kf) return kf.greeting;

    const schedule = NPC_SCHEDULES[npcId];
    return schedule ? `Hello there! I'm ${schedule.name}.` : 'Hello, traveler.';
  }

  /**
   * Retrieves all registered NPC IDs in the schedule system.
   */
  public static getAllScheduledNPCIds(): string[] {
    return Object.keys(NPC_SCHEDULES);
  }
}
