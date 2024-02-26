export const gameLabel = (
  gameType: 'MX' | 'M' | 'F',
  gameNumber: number,
): [
  'all.game.types.short.male' | 'all.game.types.short.female' | 'all.game.types.short.mix',
  'all.game.types.short.double' | 'all.game.types.short.single' | number,
  number?,
] => {
  if (gameType == 'MX') {
    switch (gameNumber) {
      case 1:
        return ['all.game.types.short.male', 'all.game.types.short.double'];
      case 2:
        return ['all.game.types.short.female', 'all.game.types.short.double'];
      case 3:
      case 4:
        return ['all.game.types.short.mix', 'all.game.types.short.double', gameNumber - 2];
      case 5:
      case 6:
        return ['all.game.types.short.male', 'all.game.types.short.single', gameNumber - 4];
      case 7:
      case 8:
        return ['all.game.types.short.female', 'all.game.types.short.single', gameNumber - 6];
    }
  }
  return [
    gameType == 'M' ? 'all.game.types.short.male' : 'all.game.types.short.female',
    ('all.game.types.short.' + (gameNumber <= 4 ? 'double' : 'single')) as
      | 'all.game.types.short.double'
      | 'all.game.types.short.single',
    gameNumber > 4 ? gameNumber - 4 : gameNumber,
  ];
};
