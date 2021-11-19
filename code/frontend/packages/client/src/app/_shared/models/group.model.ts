
export class RankingSystemGroup {
  id?: string;
  name?: string;

  constructor({ ...args }: Partial<RankingSystemGroup>) {
    this.name = args.name;
    this.id = args.id;
  }
}
