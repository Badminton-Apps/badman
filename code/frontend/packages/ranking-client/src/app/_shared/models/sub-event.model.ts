import { Game } from './game.model';
import { Event } from './event.model';

export interface SubEvent {
  id: string;
  drawType: string;
  eventType: string;
  levelType: string;
  name: string;
  event: Event;
  level: number;
  games: Game[];
}
