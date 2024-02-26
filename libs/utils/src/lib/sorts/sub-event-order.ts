import { LevelType } from '../enums';

const typeOrder = {
  NATIONAL: 1,
  LIGA: 2,
  PROV: 3,
} as const;

type SubEventSortInput = Partial<{
  eventCompetition: Partial<{
    type: LevelType;
  }>;
  level: number;
}>;

export const isFirstHigher = (subEvent1?: SubEventSortInput, subEvent2?: SubEventSortInput) => {
  if (
    !subEvent1?.eventCompetition ||
    !subEvent1?.eventCompetition.type ||
    !subEvent1?.level ||
    !subEvent2?.eventCompetition ||
    !subEvent2?.eventCompetition.type ||
    !subEvent2?.level
  ) {
    return 'same';
  }

  if (
    subEvent1.eventCompetition.type === subEvent2.eventCompetition.type &&
    subEvent1.level === subEvent2.level
  ) {
    return 'same';
  }

  if (typeOrder[subEvent1.eventCompetition.type] < typeOrder[subEvent2.eventCompetition.type]) {
    return 'better';
  } else if (
    typeOrder[subEvent1.eventCompetition.type] === typeOrder[subEvent2.eventCompetition.type]
  ) {
    if (subEvent1?.level < subEvent2?.level) {
      return 'better';
    }
  }

  return 'lower';
};

export const sortSubEventOrder = (a: SubEventSortInput, b: SubEventSortInput) => {
  // returns better, same or lower
  const order = isFirstHigher(a, b);
  if (order === 'better') {
    return -1;
  } else if (order === 'same') {
    return 0;
  }
  return 1;
};

export const levelTypeSort = (a: LevelType, b: LevelType) => {
  if (typeOrder[a] < typeOrder[b]) {
    return -1;
  } else if (typeOrder[a] === typeOrder[b]) {
    return 0;
  }
  return 1;
};
