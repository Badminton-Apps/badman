import { SubEventTypeEnum } from "./enums";

/**
 * Assembly position order for each team type
 * Defines the canonical order in which assembly positions map to game slots (1-8)
 */
export const ASSEMBLY_POSITION_ORDER: Partial<Record<SubEventTypeEnum, string[]>> = {
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
 * Get all assembly positions in the correct order for a given team type
 * @param teamType The type of team (M, F, MX)
 * @returns Array of 8 assembly position names in game-slot order
 */
export const getAssemblyPositionsInOrder = (teamType: SubEventTypeEnum): string[] => {
  return ASSEMBLY_POSITION_ORDER[teamType] || [];
};
