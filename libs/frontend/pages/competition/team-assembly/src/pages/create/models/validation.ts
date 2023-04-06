import { Player } from '@badman/frontend-models';

export type ValidationResult = {
  baseTeamIndex: number;
  baseTeamPlayers: (Player & {
    single: number;
    double: number;
    mix: number;
  })[];

  titularsIndex: number;
  titularsPlayers: (Player & {
    single: number;
    double: number;
    mix: number;
  })[];
  valid: boolean;

  errors: ValidationMessage[];
  warnings: ValidationMessage[];
};

export type ValidationMessage = {
  params: { [key: string]: unknown };
  message: string;
};

export type ValidationPlayer = Partial<Player> & {
  ranking: number;
};
