import type { AdventureSaveState } from "./state";

export type AdventureStats = {
  level: number;
  xp: number;
  faith: number;
  health: number;
  maxHealth: number;
  turns: number;
  scriptures: number;
  milestones: number;
  enemiesDefeated: number;
  alliesMet: number;
  questsCompleted: number;
  ultimateUsed: boolean;
  inspirationUsed: boolean;
};

export function computeAdventureStats(state: AdventureSaveState): AdventureStats {
  return {
    level: state.level,
    xp: state.xp,
    faith: state.faith,
    health: state.health,
    maxHealth: state.maxHealth,
    turns: state.turn,
    scriptures: state.scriptures.length,
    milestones: state.milestones.length,
    enemiesDefeated: state.defeatedEnemies.length,
    alliesMet: state.metAllies.length,
    questsCompleted: state.questLog.length,
    ultimateUsed: state.ultimateUsed,
    inspirationUsed: state.inspirationUsed,
  };
}
