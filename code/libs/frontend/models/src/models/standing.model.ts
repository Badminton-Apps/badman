export class Standing {
  id?: string;

  position?: number;
  played?: number;
  points?: number | null;
  gamesWon?: number;
  gamesLost?: number;
  setsWon?: number;
  setsLost?: number;
  totalPointsWon?: number;
  totalPointsLost?: number;
  tied?: number;
  won?: number;
  lost?: number;

  constructor({ ...args }: Partial<Standing>) {
    this.id = args.id;

    this.position = args?.position;
    this.played = args?.played;
    this.points = args?.points;
    this.gamesWon = args?.gamesWon;
    this.gamesLost = args?.gamesLost;
    this.setsWon = args?.setsWon;
    this.setsLost = args?.setsLost;
    this.totalPointsWon = args?.totalPointsWon;
    this.totalPointsLost = args?.totalPointsLost;
    this.tied = args?.tied;
    this.won = args?.won;
    this.lost = args?.lost;
  }
}
