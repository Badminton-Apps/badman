import { User } from '@badman/backend-authorization';
import {
  Club,
  EncounterCompetition,
  EventCompetition,
  EventTournament,
  Notification,
  NotificationUpdateInput,
  Player,
} from '@badman/backend-database';
import {
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  Args,
  ID,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { Sequelize } from 'sequelize-typescript';
import { ListArgs } from '../../utils';

@Resolver(() => Notification)
export class NotificationResolver {
  private readonly logger = new Logger(NotificationResolver.name);

  constructor(private _sequelize: Sequelize) {}

  @Query(() => Notification)
  async notification(
    @Args('id', { type: () => ID }) id: string
  ): Promise<Notification | null> {
    return await Notification.findByPk(id);
  }

  @Query(() => [Notification])
  async notifications(@Args() listArgs: ListArgs): Promise<Notification[]> {
    return Notification.findAll(ListArgs.toFindOptions(listArgs));
  }

  @ResolveField(() => EncounterCompetition)
  async encounter(
    @Parent() notification: Notification
  ): Promise<EncounterCompetition> {
    return notification.getEncounter();
  }

  @ResolveField(() => EventCompetition)
  async competition(
    @Parent() notification: Notification
  ): Promise<EventCompetition> {
    return notification.getCompetition();
  }

  @ResolveField(() => EventTournament)
  async tournament(
    @Parent() notification: Notification
  ): Promise<EventTournament> {
    return notification.getTournament();
  }

  @ResolveField(() => Club)
  async club(@Parent() notification: Notification): Promise<Club> {
    return notification.getClub();
  }

  @Mutation(() => Notification)
  async updateNotification(
    @Args('data') updateNotificationData: NotificationUpdateInput,
    @User() user: Player
  ): Promise<Notification> {
    const transaction = await this._sequelize.transaction();
    try {
      const dbNotification = await Notification.findByPk(
        updateNotificationData.id
      );

      if (!dbNotification) {
        throw new NotFoundException(
          `${Notification.name}: ${updateNotificationData.id}`
        );
      }

      if (dbNotification.sendToId !== user.id) {
        throw new UnauthorizedException();
      }

      await dbNotification.update(
        { ...dbNotification.toJSON(), ...updateNotificationData },
        { transaction }
      );

      // await dbNotification.update(notification, { transaction });
      await transaction.commit();
      return dbNotification;
    } catch (e) {
      this.logger.warn('rollback', e);
      await transaction.rollback();
      throw e;
    }
  }
}
