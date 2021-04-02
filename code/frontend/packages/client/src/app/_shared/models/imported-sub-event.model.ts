export class ImporterSubEvent {
  id: string;
  name: string;
  eventType: string;
  gameType: string;
  drawType: string;
  levelType: string;
  internalId: string;
  size: string;
  level: string;

  constructor({ ...args }) {
    this.id = args.id;
    this.name = args.name;
    this.eventType = args.eventType;
    this.gameType = args.gameType;
    this.drawType = args.drawType;
    this.levelType = args.levelType;
    this.internalId = args.internalId;
    this.size = args.size;
    this.level = args.level;
  }
}
