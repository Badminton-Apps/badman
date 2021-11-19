export const correctWrongTeams = (team: {
  id?: string;
  name: string;
}): {
  id?: string;
  name: string;
} => {
  team.name = team.name?.replace(/(\ +\(\d+\))/gi, '');
  team.name = team.name?.trim();

  if (team.name?.indexOf('W&amp;L') > -1) {
    team.name = team.name.replace('W&amp;L', 'W&L BV Vzw');
    return team;
  }

  if (team.name?.indexOf('DZ 99') > -1) {
    team.name = team.name.replace('DZ 99', 'DZ99');
    return team;
  }
  
  if (team.name?.indexOf('Nivelles') > -1) {
    team.name = team.name.replace('Nivelles', 'Nivellois');
    return team;
  }

  if (team.name?.indexOf('Sint Job') > -1) {
    team.name = team.name.replace('Sint Job', 'BC St.job');
    return team;
  }

  if (team.name?.indexOf('BC Oostrozebeke') > -1) {
    team.name = team.name.replace('BC Oostrozebeke', 'Oostrozebeke BC');
    return team;
  }

  if (team.name?.indexOf('OBTC') > -1) {
    team.name = team.name.replace('OBTC', 'De Oostendse Badmintonclub');
    return team;
  }

  if (team.name?.indexOf('IZBA') > -1) {
    team.name = team.name.replace('IZBA', 'Izegemse BC');
    return team;
  }

  if (team.name?.indexOf('Haneveld') > -1) {
    team.name = team.name.replace('Haneveld', 'Haeneveld BC');
    return team;
  } 

  if (team.name?.indexOf('PSV Brugge') > -1) {
    team.name = team.name.replace('PSV Brugge', 'PSV Badmintonclub Brugge');
    return team;
  }

  if (team.name?.indexOf('Zuid-West') > -1) {
    team.name = team.name.replace('Zuid-West', 'Zuid West BC');
    return team;
  }

  if (team.name?.indexOf('Gitse1D') > -1) {
    team.name = team.name.replace('Gitse1D', 'Gitse Badmintonclub 1D');
    return team;
  }

  if (team.name?.indexOf('BC Damme') > -1) {
    team.name = team.name.replace('BC Damme', 'Damme BC');
    return team;
  }

  if (team.name?.indexOf('BC De Voskes') > -1) {
    team.name = team.name.replace('BC De Voskes', 'De Voskes BC');
    return team;
  }

  if (team.name?.indexOf('Fz Forza Webacsa') > -1) {
    team.name = team.name.replace('Fz Forza Webacsa', 'Webacsa');
    return team;
  }

  if (team.name?.indexOf('Nero\'s BC') > -1) {
    team.name = team.name.replace('Nero\'s BC', 'Nero\'s Badmintonclub Hoeilaart Vzw');
    return team;
  }

  if (team.name?.indexOf('BaZo') > -1) {
    team.name = team.name.replace('BaZo', 'Badminton Zoutleeuw');
    return team;
  }

  if (team.name?.indexOf('EBC') > -1) {
    team.name = team.name.replace('EBC', 'Everbergse BC');
    return team;
  }

  if (team.name?.indexOf('BC Wolvertem') > -1) {
    team.name = team.name.replace('BC Wolvertem', 'Badmintonclub Wolvertem & Meise');
    return team;
  }
  
  if (team.name?.indexOf('BC Kampenhout') > -1) {
    team.name = team.name.replace('BC Kampenhout', 'Kampenhout BC');
    return team;
  }

  if (team.name?.indexOf('BIBC') > -1) {
    team.name = team.name.replace('BIBC', 'Brussels International BC');
    return team;
  }

  if (team.name?.indexOf('Halle') > -1) {
    team.name = team.name.replace('Halle', 'Badmintonteam Halle \'86');
    return team;
  }

  return team;
};
