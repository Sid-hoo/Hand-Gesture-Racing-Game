
export enum GameState {
  START = 'START',
  PLAYING = 'PLAYING',
  GAMEOVER = 'GAMEOVER',
  LOADING = 'LOADING'
}

export interface Obstacle {
  id: number;
  lane: number;
  z: number; // Distance from player (far to near)
  color: string;
}

export interface GameSettings {
  lanes: number;
  baseSpeed: number;
  difficultyScale: number;
  spawnRate: number;
}
