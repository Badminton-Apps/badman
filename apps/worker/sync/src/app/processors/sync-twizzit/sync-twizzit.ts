import { Logger } from '@nestjs/common';
import { XMLParser } from 'fast-xml-parser';

import { TwizzitService } from '@badman/backend-twizzit';
import { Transaction } from 'sequelize';
import { ProcessStep, Processor } from '../../processing';
import { Sequelize } from 'sequelize-typescript';
import { Player } from '@badman/backend-database';

interface OrganisationStepData {
  organisations: { id: string; name: string }[];
}

interface SeasonStepData {
  seasons: {
    id: string;
    name: string;
    'start-date': string;
    'end-date': string;
  }[];
}

export interface MembershipTypeStepData {
  membershipTypes: {
    id: string;
    name: {
      EN: string;
      NL: string;
      FR: string;
    };
  }[];
}

interface MembershipStepData {
  memberships: {
    id: number;
    'contact-id': number;
    'membership-type-id': number;
    'season-id': number;
    'start-date': string;
    'end-date': string;
  }[];
}

interface ContactStepData {
  contacts: TwizzitContact[];
}

export class TwizzitSyncer {
  private readonly _logger = new Logger(TwizzitSyncer.name);

  public readonly processor: Processor;

  readonly STEP_LOGIN = 'login';
  readonly STEP_SEASONS = 'seasons';
  readonly STEP_ORGANISATIONS = 'organisations';
  readonly STEP_MEMBERSHIP_TYPES = 'membership-types';
  readonly STEP_MEMBERSHIPS = 'membership';
  readonly STEP_CONTACTS = 'contacts';
  readonly STEP_TO_PLAYERS = 'players';

  readonly xmlParser: XMLParser;

  constructor(
    private _twizzitService: TwizzitService,
    private readonly _sequelize: Sequelize,
  ) {
    this.processor = new Processor(undefined, { logger: this._logger });

    this.processor.addStep(this.getLogin());
    this.processor.addStep(this.getOrganisations());
    this.processor.addStep(this.getSeasons());
    this.processor.addStep(this.getMembershipTypes());
    this.processor.addStep(this.getMemberships());
    this.processor.addStep(this.processContacts());
  }

  async process(args: { transaction: Transaction }) {
    await this.processor.process({ ...args });
  }

  protected getLogin(): ProcessStep {
    return new ProcessStep(this.STEP_LOGIN, async () => {
      const result = await this._twizzitService.getLogin();
      if (result.status !== 200) {
        throw new Error('Login failed');
      }

      this._twizzitService.setHeaders(result.data.token);
    });
  }

  protected getOrganisations(): ProcessStep<OrganisationStepData> {
    return new ProcessStep(this.STEP_ORGANISATIONS, async () => {
      const result = await this._twizzitService.getOrganisations();

      return { organisations: result.data } as OrganisationStepData;
    });
  }
  protected getSeasons(): ProcessStep<SeasonStepData> {
    return new ProcessStep(this.STEP_SEASONS, async () => {
      const { organisations } = this.processor.getData<OrganisationStepData>(
        this.STEP_ORGANISATIONS,
      );

      const result = await this._twizzitService.getSeasons(
        organisations.map((o) => parseInt(o.id)),
      );

      return { seasons: result.data } as SeasonStepData;
    });
  }

  protected getMembershipTypes(): ProcessStep<MembershipTypeStepData> {
    return new ProcessStep(this.STEP_MEMBERSHIP_TYPES, async () => {
      const { organisations } = this.processor.getData<OrganisationStepData>(
        this.STEP_ORGANISATIONS,
      );

      const result = await this._twizzitService.getMembershipTypes(
        organisations.map((o) => parseInt(o.id)),
      );

      return { membershipTypes: result.data };
    });
  }

  protected getMemberships(): ProcessStep<MembershipStepData> {
    return new ProcessStep(this.STEP_MEMBERSHIPS, async () => {
      const { organisations } = this.processor.getData<OrganisationStepData>(
        this.STEP_ORGANISATIONS,
      );

      const { membershipTypes } = this.processor.getData<MembershipTypeStepData>(
        this.STEP_MEMBERSHIP_TYPES,
      );

      const { seasons } = this.processor.getData<SeasonStepData>(this.STEP_SEASONS);

      // keep iterating contacts endpoint until no more contacts are returned
      let offset = 0;
      const limit = 100;
      const memberships: {
        id: number;
        'contact-id': number;
        'membership-type-id': number;
        'season-id': number;
        'start-date': string;
        'end-date': string;
      }[] = [];

      while (true) {
        const result = await this._twizzitService.getMemberships(
          membershipTypes
            .filter((type) => type.name.NL == 'Competitiespeler')
            .map((t) => parseInt(t.id)),
          organisations.map((o) => parseInt(o.id)),
          seasons.map((s) => parseInt(s.id)),
          limit,
          offset,
        );

        if (result.data.length === 0) {
          break;
        }

        memberships.push(...result.data);
        offset += limit;
      }

      return { memberships };
    });
  }

  protected processContacts(): ProcessStep {
    return new ProcessStep(this.STEP_CONTACTS, async (args?: { transaction?: Transaction }) => {
      const { organisations } = this.processor.getData<OrganisationStepData>(
        this.STEP_ORGANISATIONS,
      );
      const { memberships } = this.processor.getData<MembershipStepData>(this.STEP_MEMBERSHIPS);

      // set all players comp status to false
      await this._sequelize.query('UPDATE "Players" SET competitionPlayer = false', {
        transaction: args?.transaction,
      });

      for (let i = 0; i < memberships.length; i += 100) {
        const result = await this._twizzitService.getContacts(
          organisations.map((o) => parseInt(o.id)),
          memberships.slice(i, i + 100).map((m) => m['contact-id']),
          100,
          0,
        );

        const contacts = result.data;

        // Preferably we would do this in a separate step, but this would take up to much memory

        // find all players based on extrafield name OLDID in the value.value
        const players = await Player.findAll({
          where: {
            memberId: contacts
              .flatMap((contact) => contact['extra-field-values'])
              .filter((extraField) => extraField.extraField.name.EN === 'OLDID')
              .map((extraField) => extraField.value.value),
          },
          transaction: args?.transaction,
        });

        for (const contact of contacts) {
          const player = players.find(
            (p) =>
              p.memberId ===
              contact['extra-field-values'].find(
                (extraField) => extraField.extraField.name.EN === 'OLDID',
              ).value.value,
          );

          if (!player) {
            // create a new player
            await Player.create(
              {
                memberId: contact['extra-field-values'].find(
                  (extraField) => extraField.extraField.name.EN === 'OLDID',
                ).value.value,
                firstName: contact.name,
                lastName: contact.name,
                competitionPlayer: true,
              },
              { transaction: args?.transaction },
            );
          } else {
            player.competitionPlayer = true;
            await player.save({ transaction: args?.transaction });
          }
        }
      }
    });
  }
}

type TwizzitContact = {
  id: number;
  name: string;
  'date-of-birth': string;
  gender: string;
  nationality: string;
  language: string;
  'account-number': string;
  'registry-number': string;
  number: number;
  'email-1': {
    target: string;
    email: string;
  };
  'email-2': {
    target: string;
    email: string;
  };
  'email-3': {
    target: string;
    email: string;
  };
  'mobile-1': {
    target: string;
    cc: string;
    number: string;
  };
  'mobile-2': {
    target: string;
    cc: string;
    number: string;
  };
  'mobile-3': {
    target: string;
    cc: string;
    number: string;
  };
  home: {
    target: string;
    cc: string;
    number: string;
  };
  address: {
    street: string;
    number: string;
    box: string;
    postalCode: string;
    city: string;
    country: {
      EN: string;
      NL: string;
      FR: string;
    };
  };
  'extra-field-values': {
    extraField: {
      id: number;
      name: {
        EN: string;
        NL: string;
        FR: string;
      };
      type: string;
      location: string;
      extraFieldAttributes: any[];
    };
    value: { value: string; attributes: any[] };
  }[];
};
