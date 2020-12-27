import { Game } from './game.model';
import { RankingPlace } from './ranking-place.model';

export class Player {
  id: number;
  memberId: number;
  gender: string;
  birthDate: Date;
  avatar: string;
  firstName: string;
  lastName: string;
  isClaimed = false;
  rankingPlaces: RankingPlace[];
  games: Game[];
}

export interface PlayerGame extends Player {
  rankingPlace: RankingPlace;
  team: number;
  player: number;
}
