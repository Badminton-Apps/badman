import { PlayerGame } from '../../_shared';
import { SubEvent } from './sub-event.model';

export interface Game {
  id: string;
  playedAt: Date;
  gameType: GameType | string;
  players: PlayerGame[];
  set1Team1?: number;
  set1Team2?: number;
  set2Team1?: number;
  set2Team2?: number;
  set3Team1?: number;
  set3Team2?: number;
  winner: number;
  subEvent: SubEvent;
}

export enum GameType {
  D = 'double',
  MX = 'mix',
  S = 'single',
}
