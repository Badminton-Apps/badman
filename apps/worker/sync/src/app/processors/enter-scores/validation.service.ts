import { Injectable, Logger } from "@nestjs/common";
import { EncounterCompetition } from "@badman/backend-database";

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

@Injectable()
export class EnterScoresValidationService {
  private readonly logger = new Logger(EnterScoresValidationService.name);

  validateEncounter(encounter: EncounterCompetition | null): ValidationResult {
    const errors: string[] = [];

    if (!encounter) {
      errors.push("Encounter not found");
      return { isValid: false, errors };
    }

    if (!encounter.visualCode) {
      errors.push("Encounter missing visual code");
    }

    if (!encounter.drawCompetition?.subEventCompetition?.eventCompetition?.visualCode) {
      errors.push("Encounter missing event visual code");
    }

    if (!encounter.games || encounter.games.length === 0) {
      errors.push("Encounter has no games");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  validateCredentials(username?: string, password?: string): ValidationResult {
    const errors: string[] = [];

    if (!username) {
      errors.push("Username not provided");
    }

    if (!password) {
      errors.push("Password not provided");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  isTimeoutError(error: any): boolean {
    return (
      error?.message?.includes("timeout") ||
      error?.message?.includes("Navigation timeout") ||
      error?.name === "TimeoutError"
    );
  }

  shouldRetryJob(error: any): boolean {
    // For now, retry all errors - this matches the original behavior
    // You can customize this logic based on specific error types
    return true;
  }

  logValidationResult(result: ValidationResult, context: string): void {
    if (result.isValid) {
      this.logger.log(`✅ ${context} validation passed`);
    } else {
      this.logger.error(`❌ ${context} validation failed:`, result.errors.join(", "));
    }
  }
}
