import { Game } from './game.model';
import { Event } from './event.model';

export class ImporterSubEvent {
  id: string;
  drawType: string;
  eventType: string;
  levelType: string;
  name: string;

  constructor({ ...args }) {
    this.name = args.name;
    this.id = args.id;
    this.drawType = args.drawType;
    this.eventType = args.eventType;
    this.levelType = args.levelType;
  }
}
