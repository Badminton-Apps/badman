import {
  correctWrongPlayers,
  DataBaseHandler,
  logger,
  Player,
  RankingPlace,
  StartingType
} from '@badvlasim/shared';
// eslint-disable-next-line import/no-internal-modules
import startRanking from '../start-ranking/start-ranking.json';

export class StartingRanking {
  private _types = [
    { json: 'DE-SD', type: 'single' },
    { json: 'HE-SM', type: 'single' },
    { json: 'DD', type: 'double' },
    { json: 'HD-DM', type: 'double' },
    { json: 'GD D-DX D', type: 'mix' },
    { json: 'GD H-DX M', type: 'mix' }
  ];

  constructor(private _databaseService: DataBaseHandler) {}

  async addInitialPlayersAsync(
    startingType: StartingType,
    systemId: string,
    amountOfLevels: number,
    processor: (
      player: any,
      place: RankingPlace,
      type: string,
      startingPlaces: number[]
    ) => RankingPlace,
    protectRanking: (
      newRanking: RankingPlace,
      highestRanking: { single: number; mix: number; double: number }
    ) => RankingPlace
  ) {
    const playerMap: Map<string, RankingPlace> = new Map();

    for await (const type of this._types) {
      let startPlaces;
      let percentages;
      let amountOfPlayers;
      switch (startingType) {
        case StartingType.formula:
          startPlaces = this._createStartingPlaces(
            amountOfLevels,
            Math.max(...startRanking[type.json].map(x => parseInt(x.Rank, 10)))
          );
          break;
        case StartingType.tableBVL:
          amountOfPlayers = Math.max(...startRanking[type.json].map(x => parseInt(x.Rank, 10)));

          switch (type.type) {
            case 'single':
              percentages = [
                0.0039,
                0.0072,
                0.0144,
                0.0273,
                0.0369,
                0.0446,
                0.0583,
                0.0682,
                0.0973,
                0.1284,
                0.1956,
                0.3179
              ];
              break;
            case 'double':
              percentages = [
                0.004,
                0.0079,
                0.0181,
                0.0384,
                0.046,
                0.0541,
                0.0702,
                0.0811,
                0.111,
                0.1378,
                0.1675,
                0.264
              ];
              break;
            case 'mix':
              percentages = [
                0.0019,
                0.005,
                0.0111,
                0.019,
                0.0269,
                0.0447,
                0.0502,
                0.0599,
                0.087,
                0.1047,
                0.1602,
                0.4293
              ];
              break;
          }

          startPlaces = percentages.map((curr, index) => {
            let accPerc = curr;
            let i = index;
            // sum up all percentages
            while (i > 0) {
              accPerc += percentages[--i];
            }

            return amountOfPlayers * accPerc;
          });
          break;

        case StartingType.tableLFBB:
          amountOfPlayers = Math.max(...startRanking[type.json].map(x => parseInt(x.Rank, 10)));

          percentages = [
            0.0058,
            0.0097,
            0.0195,
            0.0341,
            0.0487,
            0.0634,
            0.0828,
            0.1023,
            0.1218,
            0.1462,
            0.1706,
            0.1949
          ];

          startPlaces = percentages.map((curr, index) => {
            let accPerc = curr;
            let i = index;
            // sum up all percentages
            while (i > 0) {
              accPerc += percentages[--i];
            }

            return amountOfPlayers * accPerc;
          });

          break;
      }

      // Get player id's

      const dbPlayers = await Player.findAll({
        where: {
          memberId: startRanking[type.json].map(
            x => correctWrongPlayers({ memberId: `${x.Lidnummer}` }).memberId
          )
        }
      });

      const types = startRanking[type.json];
      while (types.length) {
        const batch = types.splice(0, 250);
        for (const player of batch) {
          let currentPlayer = playerMap.get(`${player.Lidnummer}`);

          // Set info if player is nog known
          if (!currentPlayer) {
            let dbplayer = dbPlayers.find(
              db =>
                `${db.memberId}` ===
                `${correctWrongPlayers({ memberId: `${player.Lidnummer}` }).memberId}`
            );

            if (!dbplayer) {
              // New Player wasn't in any comp or tournaments
              const splitAt = index => splitIndex => [
                splitIndex.slice(0, index).trim(),
                splitIndex.slice(index).trim()
              ];
              const firstSpace = player.Speler.indexOf(' ');
              const [firstName, lastName] = splitAt(firstSpace)(player.Speler);

              try {
                dbplayer = await new Player(
                  correctWrongPlayers({
                    memberId: `${player.Lidnummer}`,
                    gender: type.json[type.json.length - 1],
                    firstName,
                    lastName
                  })
                ).save();
              } catch (e) {
                logger.error(`Something went wrong adding user ${player.Lidnummer}`, e);
                throw e;
              }
            }

            if (!dbplayer) {
              logger.warn('Player not found', player.Lidnummer);
              return;
            }

            currentPlayer = {
              PlayerId: dbplayer.id,
              SystemId: systemId,
              rankingDate: new Date('2016-08-31T22:00:00Z'),
              single: amountOfLevels,
              double: amountOfLevels,
              mix: amountOfLevels,
              updatePossible: true // Because techically it was possible :P
            } as RankingPlace;
          }

          currentPlayer = processor(player, currentPlayer, type.type, startPlaces);

          // (re)-map the player
          playerMap.set(`${player.Lidnummer}`, currentPlayer);
        }
      }
    }

    const rankingPlaces = Array.from(playerMap.values()).map(place =>
      protectRanking(place, {
        single: amountOfLevels,
        double: amountOfLevels,
        mix: amountOfLevels
      })
    );

    // Add initial scoring
    await this._databaseService.addRankingPlaces(rankingPlaces);
  }

  private _createStartingPlaces(amountOfLevels: number, startPlayersAmount: number): number[] {
    const startPlaces = [];
    const levelArrayOneMinus = Array(amountOfLevels - 1)
      .fill(0)
      .map((v, i) => i);

    levelArrayOneMinus.forEach(x => {
      const level = x + 1;
      const percentage = (2 * level - 1) / (amountOfLevels * amountOfLevels);
      let places = percentage * startPlayersAmount;
      if (x > 0) {
        places += startPlaces[x - 1];
      }

      startPlaces.push(places);
    });
    return startPlaces;
  }
}
