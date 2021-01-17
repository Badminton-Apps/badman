export class Team {
  id: number;
  name: string;
  abbreviation: string;

  constructor({ ...args }: Partial<Team>) {
    this.id = args.id;
    this.name = args.name;
    this.abbreviation = args.abbreviation;
  }
}
