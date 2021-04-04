import { SubEvent } from './events/sub-event.model';
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
  subEvents: SubEvent[];

  baseIndex: number;
  captain: Player;
  captainId: string;

  constructor(args?: Partial<Team>) {
    this.id = args?.id;
    this.name = args?.name;
    this.number = args?.number;
    this.abbreviation = args?.abbreviation;
    this.type = args?.type;
    this.active = args?.active;

    this.preferredTime = args?.preferredTime;
    this.preferredDay = args?.preferredDay;
    this.subEvents = args?.subEvents?.map((s) => new SubEvent(s));
    this.captain = args?.captain != null ? new Player(args?.captain) : null;
    this.captainId = args?.captain?.id;

    this.players =
      args?.players?.map((p) => {
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
      }) ?? [];

    this.calculateBase();
  }

  private calculateBase() {
    const basePlayers = this.players.filter((r) => r.base);
    const missingPlayers = basePlayers.length >= 4 ? 0 : 4 - basePlayers.length;

    if (this.type == 'MX') {
      this.baseIndex = basePlayers.reduce((acc, cur) => {
        const rankingPlace = cur.rankingPlaces[0] ?? {
          single: 12,
          double: 12,
          mix: 12,
        };
        return (
          acc + rankingPlace.single + rankingPlace.double + rankingPlace.mix
        );
      }, missingPlayers * 36);
    } else {
      this.baseIndex = basePlayers.reduce((acc, cur) => {
        const rankingPlace = cur.rankingPlaces[0] ?? {
          single: 12,
          double: 12,
        };
        return acc + rankingPlace.single + rankingPlace.double;
      }, missingPlayers * 24);
    }
  }
}
