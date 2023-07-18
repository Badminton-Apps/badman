import { SubEventTypeEnum } from "./enums";

export const getLetterForRegion = (type?: SubEventTypeEnum, region?: 'vl' | 'wl') => {
  if (!type) {
    console.warn('getLetterForRegion: type is undefined');
    return '';
  }

  if (!region) {
    console.warn('getLetterForRegion: region is undefined');
    return '';
  }

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
