import { SubEvent } from './events/sub-event.model';
import { Location } from './location.model';
import { Player } from './player.model';

export class Team {
  id: string;
  name: string;
  abbreviation: string;
  type: string;
  teamNumber: number;
  active: boolean;
  preferredTime: string;
  preferredDay: 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';

  players: Player[];
  locations: Location[];
  subEvents: SubEvent[];

  baseIndex: number;
  captain: Player;
  captainId: string;
  email: string;
  phone: string;

  constructor(args?: Partial<Team>) {
    this.id = args?.id;
    this.name = args?.name;
    this.teamNumber = args?.teamNumber;
    this.abbreviation = args?.abbreviation;
    this.type = args?.type;
    this.active = args?.active;

    this.preferredTime = args?.preferredTime;
    this.preferredDay = args?.preferredDay;
    this.subEvents = args?.subEvents?.map((s) => new SubEvent(s));
    this.locations = args?.locations?.map((l) => new Location(l));
    this.captain = args?.captain != null ? new Player(args?.captain) : null;
    this.captainId = args?.captain?.id;
    this.email = args?.email;
    this.phone = args?.phone;

    this.players =
      args?.players?.map((p) => {
        let index = this.type == 'MX' ? 36 : 24;
        if (p.lastRanking) {
          if (this.type == 'MX') {
            index = p.lastRanking.single + p.lastRanking.double + p.lastRanking.mix;
          } else {
            index = p.lastRanking.single + p.lastRanking.double;
          }
        }

        return new Player({ ...p, index });
      }) ?? [];

    this.calculateBase();
  }

  private calculateBase() {
    const basePlayers = this.players.filter((r) => r.base);

    if (this.type !== 'MX') {
      const bestPlayers = basePlayers
        .map((r) => r.index)
        .sort((a, b) => a - b)
        .slice(0, 4);

      let missingIndex = 0;
      if (bestPlayers.length < 4) {
        missingIndex = (bestPlayers.length - 4) * 24
      }

      this.baseIndex = bestPlayers.reduce((a, b) => a + b, missingIndex);
    } else {
      const bestPlayers = [
        // 2 best male
        ...basePlayers
          .filter((p) => p.gender == 'M')
          .map((r) => r.index)
          .sort((a, b) => a - b)
          .slice(0, 2),
        // 2 best female
        ...basePlayers
          .filter((p) => p.gender == 'F')
          .map((r) => r.index)
          .sort((a, b) => a - b)
          .slice(0, 2),
      ];

      let missingIndex = 0;
      if (bestPlayers.length < 4) {
        missingIndex = (bestPlayers.length - 4) * 36
      }

      this.baseIndex = bestPlayers.reduce((a, b) => a + b, missingIndex);
    }
  }
}
