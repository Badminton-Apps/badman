import { LevelType } from '@badman/utils';

export const getNewTypeAndLevel = (
  maxLevels: {
    [key in LevelType]: number;
  },
  type: LevelType,
  level: number,
  riser: boolean,
  faller: boolean,
) => {
  let newType = type;
  let newLevel = level;

  if (riser) {
    if (type === LevelType.PROV && level == 1) {
      newType = LevelType.LIGA;
      newLevel = maxLevels.LIGA;
    } else if (type === LevelType.LIGA && level == 1) {
      newType = LevelType.NATIONAL;
      newLevel = maxLevels.NATIONAL;
    } else {
      newLevel = Math.max(1, level - 1);
    }
  } else if (faller) {
    if (type === LevelType.NATIONAL && level == maxLevels.NATIONAL) {
      newType = LevelType.LIGA;
      newLevel = 1;
    } else if (type === LevelType.LIGA && level == maxLevels.LIGA) {
      newType = LevelType.PROV;
      newLevel = 1;
    } else {
      if (type === LevelType.PROV) {
        newLevel = Math.min(maxLevels.PROV, level + 1);
      } else if (type === LevelType.LIGA) {
        newLevel = Math.min(maxLevels.LIGA, level + 1);
      } else if (type === LevelType.NATIONAL) {
        newLevel = Math.min(maxLevels.NATIONAL, level + 1);
      }
    }
  }

  return { newType, newLevel };
};
