import got from 'got';
import moment, { Moment } from 'moment';
import { parse } from 'fast-xml-parser';
import { Transaction } from 'sequelize/types';
import {
  EventCompetition,
  EventTournament,
  logger,
  Processor,
  ProcessStep,
  XmlResult,
  XmlTournament
} from '@badvlasim/shared';

export class CompetitionSyncer {
  
  public processor: Processor;

  constructor() {
    this.processor = new Processor();

    this.processor.addStep(this.getEvent());
  }

  process(args: { transaction: Transaction; xmlTournament: XmlTournament; }) {
    return this.processor.process(args);
  }

  protected getEvent(): ProcessStep<{
    event: EventCompetition;
    internalId: string;
  }> {
    return new ProcessStep(
      'getcompetition',
      async (args: { xmlTournament: XmlTournament; transaction: Transaction }) => {
        let event = await EventCompetition.findOne({
          where: { name: args.xmlTournament.Name },
          transaction: args.transaction
        });

        if (!event) {
          const dates: Moment[] = [];
          for (
            let date = moment(args.xmlTournament.StartDate);
            date.diff(args.xmlTournament.EndDate, 'days') <= 0;
            date.add(1, 'days')
          ) {
            dates.push(date.clone());
          }

          const resultTournament = await got.get(
            `${process.env.VR_API}/${args.xmlTournament.Code}`,
            {
              username: `${process.env.VR_API_USER}`,
              password: `${process.env.VR_API_PASS}`,
              headers: {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'Content-Type': 'application/xml'
              }
            }
          );
          const bodyTournament = parse(resultTournament.body, {
            attributeNamePrefix: '',
            ignoreAttributes: false,
            parseAttributeValue: true
          }).Result as XmlResult;
          const tournamentDetail = bodyTournament.Tournament as XmlTournament;

          logger.debug(`EventCompetition ${tournamentDetail.Name} not found, creating`);
          event = await new EventCompetition({
            name: tournamentDetail.Name,
            startYear: moment(tournamentDetail.StartDate).year()
          }).save({ transaction: args.transaction });
        }
        return {
          event,
          internalId: args.xmlTournament.Code
        };
      }
    );
  }


}
