const replacers = [
  ['W&amp;L', 'W&L BV'],
  ['W&L', 'W&L BV'],
  ['Haneveld', 'Haeneveld'],
  ['Gitse1D', 'Gitse 1D'],
  ['DZ 99', 'DZ99'],
  ['Nivelles', 'BC Nivellois'],
  ['Fz Forza Webacsa', 'Webacsa'],
  ['De Voskes BC', 'BC De Voskes'],
  ['RBC VERVIERS', 'ROYAL BADMINTON CLUB VERVIERS'],
  ['BC GRACE', 'BC Grâce']
];

export const correctWrongTeams = (team: { 
  id?: string;
  name: string;
}): {
  id?: string;
  name: string;
} => {
  team.name = team.name?.replace(/( +\(\d+\)?)/gi, '');
  team.name = team.name?.trim();

  for (const [from, to] of replacers) {
    if (team.name.indexOf(from) > -1) {
      team.name = team.name.replace(from, to);
      return team;
    }
  }

  return team;
};
