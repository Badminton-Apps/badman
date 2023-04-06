import { SubEventTypeEnum } from "./enums";

export const getLetterForRegion = (type: SubEventTypeEnum, region: 'vl' | 'wl') => {
  switch (type) {
    case SubEventTypeEnum.F:
      return region === 'vl' ? 'D' : 'D';
    case SubEventTypeEnum.M:
      return region === 'vl' ? 'H' : 'M';
    case SubEventTypeEnum.MX:
      return region === 'vl' ? 'G' : 'Mx';
    case SubEventTypeEnum.NATIONAL:
      return '';
  }
};
