export const correctWrongTeams = (team: {
  id?: string;
  name: string;
}): {
  id?: string;
  name: string;
} => {
  team.name = team.name?.replace(/( +\(\d+\)?)/gi, '');
  team.name = team.name?.trim();

  if (team.name?.indexOf('W&amp;L') > -1) {
    team.name = team.name.replace('W&amp;L', 'W&L BV');
    return team;
  }

  if (team.name?.indexOf('Haneveld') > -1) {
    team.name = team.name.replace('Haneveld', 'Haeneveld');
    return team;
  }

  if (team.name?.indexOf('Gitse1D') > -1) {
    team.name = team.name.replace('Gitse1D', 'Gitse 1D');
    return team;
  }

  if (team.name?.indexOf('DZ 99') > -1) {
    team.name = team.name.replace('DZ 99', 'DZ99');
    return team;
  }

  if (team.name?.indexOf('Nivelles') > -1) {
    team.name = team.name.replace('Nivelles', 'BC Nivellois');
    return team;
  }
  if (team.name?.indexOf('Fz Forza Webacsa') > -1) {
    team.name = team.name.replace('Fz Forza Webacsa', 'Webacsa');
    return team;
  }

  return team;
};
