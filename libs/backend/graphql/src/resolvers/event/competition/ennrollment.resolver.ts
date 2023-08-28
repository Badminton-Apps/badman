import { User } from '@badman/backend-authorization';
import {
  EventCompetition,
  EventEntry,
  Player,
  SubEventCompetition,
  Team,
} from '@badman/backend-database';
import {
  EnrollmentInput,
  EnrollmentOutput,
  EnrollmentValidationService,
} from '@badman/backend-enrollment';
import {
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Sequelize } from 'sequelize-typescript';

@Resolver(() => EnrollmentOutput)
export class EnrollmentResolver {
  private readonly logger = new Logger(EnrollmentResolver.name);
  constructor(
    private enrollmentService: EnrollmentValidationService,
    private _sequelize: Sequelize
  ) {}

  @Query(() => EnrollmentOutput, {
    description: `Validate the enrollment\n\r**note**: the levels are the ones from may!`,
  })
  async enrollmentValidation(
    @Args('enrollment') enrollment: EnrollmentInput
  ): Promise<EnrollmentOutput> {
    return this.enrollmentService.fetchAndValidate(
      enrollment,
      EnrollmentValidationService.defaultValidators()
    );
  }

  @Mutation(() => Boolean)
  async createEnrollment(
    @User() user: Player,
    @Args('teamId') teamId: string,
    @Args('subEventId') subEventId: string
  ) {
    if (!await user.hasAnyPermission([`edit:competition`])) {
      throw new UnauthorizedException(
        `You do not have permission to add a competition`
      );
    }
    // Do transaction
    const transaction = await this._sequelize.transaction();
    try {
      const team = await Team.findByPk(teamId, { transaction });
      const subEvent = await SubEventCompetition.findByPk(subEventId, {
        transaction,
        include: [EventCompetition],
      });

      if (!team) {
        throw new NotFoundException(`${Team.name}: ${teamId}`);
      }
      if (!subEvent) {
        throw new NotFoundException(
          `${SubEventCompetition.name}: ${subEventId}`
        );
      }

      if (team.season !== subEvent.eventCompetition?.season) {
        throw new Error(`The team and the subEvent are not in the same season`);
      }

      const entry =
        (await team.getEntry({ transaction })) ??
        (await new EventEntry().save({ transaction }));

      await entry.save({ transaction });
      await team.setEntry(entry, { transaction });
      await subEvent.addEventEntry(entry, { transaction });


      await transaction.commit();
      return true;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}
