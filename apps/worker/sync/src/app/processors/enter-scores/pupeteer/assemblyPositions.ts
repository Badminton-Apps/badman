import { SubEventTypeEnum } from "@badman/utils";

/**
 * Assembly position order for each team type
 * Defines the order in which assembly positions should be processed for form filling
 */
export const ASSEMBLY_POSITION_ORDER = {
  [SubEventTypeEnum.M]: [
    "double1",
    "double2",
    "double3",
    "double4",
    "single1",
    "single2",
    "single3",
    "single4",
  ],
  [SubEventTypeEnum.F]: [
    "double1",
    "double2",
    "double3",
    "double4",
    "single1",
    "single2",
    "single3",
    "single4",
  ],
  [SubEventTypeEnum.MX]: [
    "double1",
    "double2",
    "single1",
    "single3",
    "single2",
    "single4",
    "double3",
    "double4",
  ],
};

/**
 * Form headers for each team type in order (1-8)
 * These correspond to the actual headers that appear on the toernooi.nl form
 * TODO: Update these values to match the actual headers from the toernooi.nl page
 */
export const TEAM_FORM_HEADERS = {
  [SubEventTypeEnum.M]: [
    "HD1", // Game 3 header
    "HD2", // Game 4 header
    "HD3", // Game 5 header
    "HD4", // Game 8 header
    "HE1", // Game 1 header
    "HE2", // Game 2 header
    "HE3", // Game 6 header
    "HE4", // Game 7 header
  ],
  [SubEventTypeEnum.F]: [
    "DD1", // Game 1 header
    "DD2", // Game 2 header
    "DD3", // Game 3 header
    "DD4", // Game 4 header
    "DE1", // Game 5 header
    "DE2", // Game 6 header
    "DE3", // Game 7 header
    "DE4", // Game 8 header
  ],
  [SubEventTypeEnum.MX]: [
    "HD", // Game 1 header
    "DD", // Game 2 header
    "HE1", // Game 3 header
    "DE1", // Game 4 header
    "HE2", // Game 5 header
    "DE2", // Game 6 header
    "GD1", // Game 7 header
    "GD2", // Game 8 header
  ],
};

/**
 * Get the form header for a specific team type and assembly position
 * @param teamType The type of team (M, F, MX, NATIONAL)
 * @param assemblyPosition The assembly position (single1, single2, double1, etc.)
 * @returns The header string for that position, or null if not found
 */
export const getHeaderForAssemblyPosition = (
  teamType: SubEventTypeEnum,
  assemblyPosition: string
): string | null => {
  const positionOrder = ASSEMBLY_POSITION_ORDER[teamType];
  const formHeaders = TEAM_FORM_HEADERS[teamType];

  if (!positionOrder || !formHeaders) {
    return null;
  }

  // Find the index of this assembly position in the order
  const positionIndex = positionOrder.indexOf(assemblyPosition);
  if (positionIndex === -1) {
    return null;
  }

  // Return the corresponding header
  return formHeaders[positionIndex] || null;
};

/**
 * Get all assembly positions in the correct order for processing based on team type
 * @param teamType The type of team (M, F, MX, NATIONAL)
 * @returns Array of assembly positions in the order they should be filled
 */
export const getAssemblyPositionsInOrder = (teamType: SubEventTypeEnum): string[] => {
  return ASSEMBLY_POSITION_ORDER[teamType] || [];
};
