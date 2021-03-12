import { Draw } from './draw.model';

export class Encounter {
  date: Date;
  draw: Draw;

  constructor(args: Partial<Encounter>) {
    this.date = args.date;
    this.draw = new Draw(args.draw);
  }
}
