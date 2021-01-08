export class Team {
  id: number;
  name: string;

  constructor({ ...args }) {
    this.id = args.id;
    this.name = args.name;
  }
}
