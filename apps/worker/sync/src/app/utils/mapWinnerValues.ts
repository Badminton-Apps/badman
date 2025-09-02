/**
 * Maps standard winner values to alternative competition values
 * Some competitions use different values in their select components
 */
export const WINNER_VALUE_MAPPING: Record<number, number> = {
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
export const REVERSE_WINNER_VALUE_MAPPING: Record<number, number> = {
  1: 1, // Team 1 winner - standard mapping
  2: 2, // Team 2 winner - standard mapping
  110: 4, // External 110 maps back to internal 4
  111: 5, // External 111 maps back to internal 5
  108: 6, // External 108 maps back to internal 6
  109: 7, // External 109 maps back to internal 7
  12: 12, // Special status - standard mapping
};

/**
 * Converts external winner value back to internal value
 * @param externalWinner Winner value from external system
 * @returns Internal winner value, or original value if no mapping exists
 */
export function reverseMapWinnerValue(externalWinner: number | null | undefined): number | null {
  if (externalWinner == null) {
    return null;
  }

  return REVERSE_WINNER_VALUE_MAPPING[externalWinner] ?? externalWinner;
}
