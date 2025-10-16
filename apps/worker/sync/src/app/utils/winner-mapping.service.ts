import { Injectable, Logger } from "@nestjs/common";

/**
 * Centralized service for handling winner value mappings between internal and external systems
 *
 * Some competitions use different values in their select components than our internal system.
 * This service provides mapping functionality to convert between internal and external winner values.
 */
@Injectable()
export class WinnerMappingService {
  private readonly logger = new Logger(WinnerMappingService.name);

  /**
   * Maps standard winner values to alternative competition values
   * Some competitions use different values in their select components
   */
  private readonly WINNER_VALUE_MAPPING: Record<number, number> = {
    1: 1, // Team 1 winner - standard mapping
    2: 2, // Team 2 winner - standard mapping
    4: 110, // Special status - maps to 110
    5: 111, // Special status - maps to 111
    6: 108, // Special status - maps to 108
    7: 109, // Special status - maps to 109
    12: 12, // Special status - standard mapping
  };

  /**
   * Reverse mapping to convert external system values back to internal values
   * Used when reading winner data from the external system
   */
  private readonly REVERSE_WINNER_VALUE_MAPPING: Record<number, number> = {
    1: 1, // Team 1 winner - standard mapping
    2: 2, // Team 2 winner - standard mapping
    3: 4, // External 3 maps to internal 4 (HOME_TEAM_FORFEIT)
    110: 4, // External 110 maps back to internal 4
    111: 5, // External 111 maps back to internal 5
    108: 6, // External 108 maps back to internal 6
    109: 7, // External 109 maps back to internal 7
    12: 12, // Special status - standard mapping
  };

  /**
   * Maps an internal winner value to the external system value
   * @param internalWinner Winner value from internal system
   * @returns External winner value, or original value if no mapping exists
   */
  mapToExternalValue(internalWinner: number | null | undefined): number | null {
    if (internalWinner == null) {
      return null;
    }

    const mappedValue = this.WINNER_VALUE_MAPPING[internalWinner];

    if (mappedValue !== undefined) {
      this.logger.debug(
        `Mapping internal winner value ${internalWinner} to external value ${mappedValue}`
      );
      return mappedValue;
    }

    this.logger.debug(
      `No mapping found for internal winner value ${internalWinner}, using original value`
    );
    return internalWinner;
  }

  /**
   * Converts external winner value back to internal value
   * @param externalWinner Winner value from external system
   * @returns Internal winner value, or original value if no mapping exists
   */
  mapToInternalValue(externalWinner: number | null | undefined): number | null {
    if (externalWinner == null) {
      return null;
    }

    const mappedValue = this.REVERSE_WINNER_VALUE_MAPPING[externalWinner];

    if (mappedValue !== undefined) {
      this.logger.debug(
        `Mapping external winner value ${externalWinner} to internal value ${mappedValue}`
      );
      return mappedValue;
    }

    this.logger.debug(
      `No reverse mapping found for external winner value ${externalWinner}, using original value`
    );
    return externalWinner;
  }

  /**
   * Gets all possible winner values that should be tried for a given internal winner value
   * Returns both the original value and the mapped value (if different)
   * @param internalWinner Internal winner value
   * @returns Array of values to try, in order of preference
   */
  getAllPossibleValues(internalWinner: number | null | undefined): number[] {
    if (internalWinner == null) {
      return [];
    }

    const values: number[] = [internalWinner];
    const mappedValue = this.mapToExternalValue(internalWinner);

    if (mappedValue !== null && mappedValue !== internalWinner) {
      values.push(mappedValue);
    }

    return values;
  }

  /**
   * Checks if a winner value has a mapping to an external value
   * @param internalWinner Internal winner value to check
   * @returns True if mapping exists, false otherwise
   */
  hasMapping(internalWinner: number): boolean {
    return this.WINNER_VALUE_MAPPING[internalWinner] !== undefined;
  }

  /**
   * Gets the available winner value mappings for debugging/logging
   * @returns Object containing all mappings
   */
  getMappings(): { internal: Record<number, number>; external: Record<number, number> } {
    return {
      internal: { ...this.WINNER_VALUE_MAPPING },
      external: { ...this.REVERSE_WINNER_VALUE_MAPPING },
    };
  }
}
