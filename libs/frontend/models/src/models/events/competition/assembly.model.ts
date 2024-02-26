import { Player } from '../../player.model';
import { Team } from '../../team.model';
import { EncounterCompetition } from './encounter.model';

export class Assembly {
  id?: string;

  assembly?: AssemblyData;

  description?: string;

  encounterId?: string;

  encounterCompetition?: EncounterCompetition;

  teamId?: string;

  team?: Team;

  captainId?: string;

  captain?: Player;

  playerId?: string;

  player?: Player;

  constructor(args: Partial<Assembly>) {
    this.id = args?.id;
    this.assembly = args?.assembly;
    this.description = args?.description;
    this.encounterId = args?.encounterId;

    this.encounterCompetition =
      (args?.encounterCompetition ?? null) != null
        ? new EncounterCompetition(args.encounterCompetition)
        : undefined;
    this.teamId = args?.teamId;
    this.team = (args?.team ?? null) != null ? new Team(args.team) : undefined;
    this.captainId = args?.captainId;
    this.captain = (args?.captain ?? null) != null ? new Player(args.captain) : undefined;
    this.playerId = args?.playerId;
    this.player = (args?.player ?? null) != null ? new Player(args.player) : undefined;
  }
}

export interface AssemblyData {
  single1: string;
  single2: string;
  single3: string;
  single4: string;
  double1: string[];
  double2: string[];
  double3: string[];
  double4: string[];
  subtitudes: string[];
}
