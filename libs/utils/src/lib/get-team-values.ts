import { LevelType, SubEventTypeEnum } from './enums';

export const teamValues = (teamName: string, regex?: string, levelType?: LevelType) => {
  if (regex) {
    // match regex, then get named groups (name, numbe, type, rest)
    const match = teamName.match(regex);
    if (match?.groups) {
      let teamNumber = parseInt(match.groups?.['number'], 10) || undefined;
      if (!teamNumber || isNaN(teamNumber)) {
        teamNumber = undefined;
      }

      return {
        clubName: match.groups?.['name'],
        teamNumber,
        teamType: getType(match.groups?.['type'], levelType),
        index: parseInt(match.groups?.['index'], 10),
        rest: match.groups?.['rest'],
      };
    }
  }

  // if no regex is provided, try to match the default regex
  teamName = teamName.trim();
  const lastSpaceIndex = teamName.lastIndexOf(' ');
  const finalPart = teamName.substring(lastSpaceIndex + 1);
  const teamNumberstring = finalPart?.match(/\d+/)?.[0] || '';

  const clubName =
    // only strip last space if there was a number found
    teamNumberstring.length > 0 ? teamName.substring(0, lastSpaceIndex).trim() : teamName.trim();
  const type = finalPart.replace(teamNumberstring, '');
  const teamType = getType(type, levelType);
  let teamNumber = parseInt(teamNumberstring, 10) || undefined;
  if (!teamNumber || isNaN(teamNumber)) {
    teamNumber = undefined;
  }

  return {
    clubName,
    teamNumber,
    teamType,
  };
};
function getType(type: string, levelType?: LevelType) {
  if (levelType == LevelType.NATIONAL) {
    return SubEventTypeEnum.NATIONAL;
  }

  let teamType = SubEventTypeEnum.NATIONAL;
  switch (type.toUpperCase()) {
    case 'D':
      teamType = SubEventTypeEnum.F;
      break;
    case 'H':
    case 'M':
      teamType = SubEventTypeEnum.M;
      break;
    case 'G':
    case 'MX':
      teamType = SubEventTypeEnum.MX;
      break;
  }
  return teamType;
}
