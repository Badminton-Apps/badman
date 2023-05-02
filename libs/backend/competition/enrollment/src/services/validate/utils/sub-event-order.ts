import { SubEventCompetition } from '@badman/backend-database';
const typeOrder = {
  NATIONAL: 1,
  LIGA: 2,
  PROV: 3,
};
export const isFirstHigher = (
  subEvent1: SubEventCompetition,
  subEvent2: SubEventCompetition
) => {
  if (
    subEvent1.eventCompetition.type === subEvent2.eventCompetition.type &&
    subEvent1.level === subEvent2.level
  ) {
    return 'same';
  }

  if (
    typeOrder[subEvent1.eventCompetition.type] <
    typeOrder[subEvent2.eventCompetition.type]
  ) {
    return 'better';
  } else if (
    typeOrder[subEvent1.eventCompetition.type] ===
    typeOrder[subEvent2.eventCompetition.type]
  ) {
    if (subEvent1.level < subEvent2.level) {
      return 'better';
    }
  }

  return 'lower';
};
