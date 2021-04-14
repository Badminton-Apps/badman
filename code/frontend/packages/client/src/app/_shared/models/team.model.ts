import { SubEvent } from './events/sub-event.model';
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
  subEvents: SubEvent[];

  baseIndex: number;
  captain: Player;
  captainId: string;

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
    this.captain = args?.captain != null ? new Player(args?.captain) : null;
    this.captainId = args?.captain?.id;

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
    const basePlayers = this.players.filter((r) => r.base).map((r) => r.index);
    const missingPlayers = basePlayers.length >= 4 ? 0 : 4 - basePlayers.length;
    const indexes = basePlayers.sort((a, b) => a - b);

    this.baseIndex = indexes.slice(0, 4).reduce((acc, cur) => {
      return acc + cur;
    }, missingPlayers * (this.type == 'MX' ? 36 : 24));
  }
}
