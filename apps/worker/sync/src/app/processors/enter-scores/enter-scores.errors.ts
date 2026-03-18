export enum EnterScoresErrorCode {
  PREFLIGHT = "PREFLIGHT",
  ENCOUNTER_NOT_FOUND = "ENCOUNTER_NOT_FOUND",
  BROWSER_PAGE = "BROWSER_PAGE",
  COOKIE_ACCEPT = "COOKIE_ACCEPT",
  SITE_UNREACHABLE = "SITE_UNREACHABLE",
  SIGN_IN = "SIGN_IN",
  ENTER_GAMES = "ENTER_GAMES",
  ROW_VALIDATION = "ROW_VALIDATION",
  SAVE_BUTTON = "SAVE_BUTTON",
  SAVE_FAILED = "SAVE_FAILED",
  /** Toernooi.nl showed the "Foutmelding" dialog after save (e.g. player over limit). */
  SAVE_DIALOG_ERROR = "SAVE_DIALOG_ERROR",
}

export type EnterScoresPhase =
  | "preflight"
  | "browser_open"
  | "load_encounter"
  | "cookie_accept"
  | "sign_in"
  | "edit_mode"
  | "clear_fields"
  | "enter_games"
  | "optional_fields"
  | "input_validation"
  | "row_validation"
  | "save"
  | "notification";

export class EnterScoresError extends Error {
  readonly cause?: unknown;

  constructor(
    public readonly code: EnterScoresErrorCode,
    message: string,
    options?: { cause?: unknown }
  ) {
    super(message);
    this.name = "EnterScoresError";
    if (options?.cause !== undefined) {
      this.cause = options.cause;
    }
  }
}
