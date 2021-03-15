export const adminClaims = [
  ['view:event', 'View an event', 'events'],
  ['add:event', 'Add an event', 'events'],
  ['edit:event', 'Edit an event', 'events'],
  ['delete:event', 'Delete an event', 'events'],
  ['import:event', 'Import an event', 'events'],
  ['view:ranking', 'View ranking system', 'ranking'],
  ['add:ranking', 'Add ranking system', 'ranking'],
  ['edit:ranking', 'Edit ranking system', 'ranking'],
  ['delete:ranking', 'Delete ranking system', 'ranking'],
  ['calculate:ranking', 'Simulate ranking', 'ranking'],
  ['make-primary:ranking', 'Make ranking system primary', 'ranking'],
  ['edit:claims', 'Edit global claims', 'security'],
  ['link:player', 'Can link players to login', 'player'],
  ['add:club', 'Create new club', 'clubs'],
  ['edit-any:club', 'Edit any club', 'clubs']
];

export const clubClaims = [
  [
    'edit:club',
    'Change anything of a club (removing this can potentially remove all access to edit screen)',
    'club'
  ],
  ['add:player', 'Add players to club', 'club'],
  ['remove:player', 'Remove players to club', 'club'],
  ['add:location', 'Add location to club', 'club'],
  ['remove:location', 'Remove location to club', 'club'],
  ['add:role', 'Creates new roles for club', 'club'],
  ['edit:role', 'Edit roles for club', 'club']
];

export const teamClaims = [
  ['edit:team', 'Edit competition teams', 'team'],
  ['add:team', 'Add compeition teams', 'team'],
  ['enter:results', 'Enter results for a team', 'team'],
  ['enlist:team', 'Enlist a team in to competitoin', 'team']
];
