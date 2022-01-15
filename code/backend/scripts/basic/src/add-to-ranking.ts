import {
  DataBaseHandler,
  EventCompetition,
  EventTournament,
  logger,
  RankingSystemGroup,
  SubEventCompetition,
  SubEventTournament,
} from '@badvlasim/shared';
import * as dbConfig from '@badvlasim/shared/database/database.config.js';
import { Op } from 'sequelize';

(async () => {
  new DataBaseHandler({
    ...dbConfig.default,
    // logging: (...msg) => logger.debug('Query', msg)
  });

  const transaction = await DataBaseHandler.sequelizeInstance.transaction();

  try {
    const group = await RankingSystemGroup.findOne({
      where: { name: 'Adults' },
      transaction,
    });

    const competitions = await EventCompetition.findAll({
      where: {
        name: {
          [Op.in]: [
            'LFBB Interclubs 2021-2022',
            'PBA competitie 2021-2022',
            'VVBBC interclubcompetitie 2021-2022',
            'PBO competitie 2021-2022',
            'Limburgse interclubcompetitie 2021-2022',
            'WVBF Competitie 2021-2022',
            'Vlaamse interclubcompetitie 2021-2022',
            'Victor League 2021-2022',
            'VVBBC interclubcompetitie 2020-2021',
            'Victor League 2020-2021',
            'Limburgse interclubcompetitie 2020-2021',
            'PBO competitie 2020 - 2021',
            'Vlaamse Competitie 2020-2021',
            'LFBB Interclubs 2020-2021',
            'WVBF competitie 2020-2021',
            'PBA competitie 2020-2021',
          ],
        },
      },
      include: [
        {
          model: SubEventCompetition,
        },
      ],
      transaction,
    });

    const tournaments = await EventTournament.findAll({
      where: {
        name: {
          [Op.in]: [
            'PK PBO vzw 2021',
            'PK PBO vzw 2019',
            'Internationaal Poule BC Challenge 2020',
            'BC Challenge Wetteren pouletornooi 2019',
            '26ste Leietornooi Badmintonclub Latem-De Pinte',
            '50e Internationaal tornooi Koninklijke Brugse BC',
            '13e Internationaal Toernooi BC Tielt',
            '26th International Tournament BC De Pluimplukkers',
            'Victor Summer Event 2019',
            'Après Congé Tornooi Plumula 2021',
            'Internationaal Pouletornooi Brasschaat 2020',
          ],
        },
      },
      include: [
        {
          model: SubEventTournament,
        },
      ],
      transaction,
    });

    await group.addSubEventCompetitions(
      competitions.map((r) => r.subEvents).flat(),
      { transaction, ignoreDuplicates: true }
    );

    await group.addSubEventTournaments(
      tournaments.map((r) => r.subEvents).flat(),
      { transaction, ignoreDuplicates: true }
    );

    await transaction.commit();
  } catch (error) {
    logger.error('something went wrong', error);
    transaction.rollback();
  }
})();
