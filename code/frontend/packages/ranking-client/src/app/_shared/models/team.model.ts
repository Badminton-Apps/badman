import { Player } from './player.model';

export class Team {
  id: string;
  name: string;
  abbreviation: string;
  type: string;
  number: number;
  active: boolean;
  preferredTime: string;
  preferredDay:
    | 'sunday'
    | 'monday'
    | 'tuesday'
    | 'wednesday'
    | 'thursday'
    | 'friday'
    | 'saturday';

  players: Player[];

  baseIndex: number;

  constructor(args: Partial<Team>) {
    this.id = args.id;
    this.name = args.name;
    this.abbreviation = args.abbreviation;
    this.type = args.type;
    this.active = args.active;
    this.baseIndex = args.baseIndex;

    this.preferredTime = args.preferredTime;
    this.preferredDay = args.preferredDay;

    this.players = args.players?.map((p) => {
      let index = this.type == 'MX' ? 36 : 24;

      if (p.rankingPlaces && p.rankingPlaces.length > 0) {
        if (this.type == 'MX') {
          index =
            p.rankingPlaces[0].single +
            p.rankingPlaces[0].double +
            p.rankingPlaces[0].mix;
        } else {
          index = p.rankingPlaces[0].single + p.rankingPlaces[0].double;
        }
      }

      return new Player({ ...p, index });
    });
  }
}
