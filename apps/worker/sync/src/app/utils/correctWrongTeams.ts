const replacers = [
  ['W&amp;L', 'W&L BV', true],
  ['W&L', 'W&L BV', true],
  ['Haneveld', 'Haeneveld', true],
  ['Gitse1D', 'Gitse 1D', true],
  ['DZ 99', 'DZ99', true],
  ['Nivelles', 'BC Nivellois', true],
  ['Fz Forza Webacsa', 'Webacsa', true],
  ['De Voskes BC', 'BC De Voskes', true],
  ['RBC VERVIERS', 'ROYAL BADMINTON CLUB VERVIERS', true],
  ['BC GRACE', 'BC Grâce 1', true],
  ['De Koekjes', 'Test 2G', true],
  ['Apparatuur', 'Test 1G', true],
  ['BCCM ALLEGRO', 'BC Cardinal Mercier', true]
] as const;

export const correctWrongTeams = (team: { 
  id?: string;
  name: string;
}): {
  id?: string;
  name: string;
} => {
  team.name = team.name?.replace(/( +\(\d+\)?)/gi, '');
  team.name = team.name?.trim();

  for (const [from, to, finish] of replacers) {
    if (team.name.indexOf(from) > -1) {
      team.name = team.name.replace(from, to);

      if (finish) {
        break; 
      }
    }
  }

  return team;
};
 