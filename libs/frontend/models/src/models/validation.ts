export type ValidationResult = {
  teams: TeamValidationResult[];
};

export type TeamValidationResult = {
  id: string;
  linkId?: string;

  errors: ValidationMessage[];
  warnings: ValidationMessage[];
  valid: boolean;

  minBaseIndex?: number;
  maxBaseIndex?: number;
  maxLevel?: number;

  teamIndex?: number;
  baseIndex?: number;

  isNewTeam: boolean;
  possibleOldTeam: boolean;
};

export type ValidationMessage = {
  params: { [key: string]: unknown };
  message: string;
};
