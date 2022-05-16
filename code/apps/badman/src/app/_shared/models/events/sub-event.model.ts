import { Game } from '../game.model';
import { RankingSystemGroup } from '../group.model';
import { Player } from '../player.model';
import { Draw } from './draw.model';

export class SubEvent {
  id?: string;
  name?: string;
  eventType?: string;
  level?: number;
  maxLevel?: number;
  minBaseIndex?: number;
  maxBaseIndex?: number;

  draws?: Draw[];
  games?: Game[];
  groups?: RankingSystemGroup[];
  meta?: SubEventMeta;

  constructor(args: Partial<SubEvent>) {
    this.id = args?.id;
    this.meta = args?.meta;
    this.eventType = args?.eventType;
    this.name = args?.name;
    this.level = args?.level;
    this.draws = args?.draws?.map((g) => new Draw(g));
    this.games = args?.games?.map((g) => new Game(g));
    this.groups = args?.groups?.map((g) => new RankingSystemGroup(g));
    this.maxLevel = args?.maxLevel;
    this.minBaseIndex = args?.minBaseIndex;
    this.maxBaseIndex = args?.maxBaseIndex;
  }
}

interface SubEventMeta {
  teamIndex: number;
  players: {
    id: string;
    single: number;
    double: number;
    mix: number;
    gender: string;
    player: Partial<Player>;
  }[];
}
