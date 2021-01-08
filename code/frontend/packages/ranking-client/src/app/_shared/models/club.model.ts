export class Club {
  id: number;
  name: string;
  clubId: number;

  constructor({ ...args }) {
    this.id = args.id;
    this.name = args.name;
    this.clubId = args.clubId;
  }
}
