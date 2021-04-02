
export class RankingSystemGroup {
  id: string;
  name: string;

  constructor({ ...args }) {
    this.name = args.name;
    this.id = args.id;
  }
}
