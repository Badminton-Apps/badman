import { SubEventTypeEnum } from './enums';

export const teamValues = (teamName: string) => {
  teamName = teamName.trim();

  const lastSpaceIndex = teamName.lastIndexOf(' ');
  const finalPart = teamName.substring(lastSpaceIndex + 1);
  const teamNumber = finalPart?.match(/\d+/)?.[0] || '';
  const clubName = teamName.substring(0, lastSpaceIndex).trim();
  let teamType = SubEventTypeEnum.NATIONAL;
  switch (finalPart.replace(teamNumber, '')) {
    case 'D':
      teamType = SubEventTypeEnum.F;
      break;
    case 'H':
      teamType = SubEventTypeEnum.M;
      break;
    case 'G':
      teamType = SubEventTypeEnum.MX;
      break;
  }

  return {
    clubName,
    teamNumber: parseInt(teamNumber ?? '-1', 10),
    teamType,
  };
};
