import { User } from "@badman/backend-authorization";
import {
  Club,
  EncounterCompetition,
  EventCompetition,
  EventTournament,
  Notification,
  NotificationUpdateInput,
  Player,
} from "@badman/backend-database";
import { Logger, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { Args, ID, Int, Mutation, Parent, Query, ResolveField, Resolver } from "@nestjs/graphql";
import { Op } from "sequelize";
import { Sequelize } from "sequelize-typescript";
import { ListArgs } from "../../utils";

@Resolver(() => Notification)
export class NotificationResolver {
  private readonly logger = new Logger(NotificationResolver.name);

  constructor(private _sequelize: Sequelize) {}

  @Query(() => Notification)
  async notification(@Args("id", { type: () => ID }) id: string): Promise<Notification | null> {
    return await Notification.findByPk(id);
  }

  @Query(() => [Notification])
  async notifications(@Args() listArgs: ListArgs): Promise<Notification[]> {
    const results = await Notification.findAll(ListArgs.toFindOptions(listArgs));
    this.logger.debug(
      `[notifications] returned ${results.length} notifications: ${results
        .map(
          (n) =>
            `{id=${n.id} type=${n.type} linkType=${n.linkType} linkId=${n.linkId} read=${n.read}}`
        )
        .join(", ")}`
    );
    return results;
  }

  @ResolveField(() => EncounterCompetition)
  async encounter(@Parent() notification: Notification): Promise<EncounterCompetition> {
    this.logger.debug(
      `[encounter] resolving encounter for notification id=${notification.id} linkType=${notification.linkType} linkId=${notification.linkId}`
    );
    const encounter = await notification.getEncounter();
    if (!encounter) {
      this.logger.warn(
        `[encounter] no encounter found for notification id=${notification.id} linkId=${notification.linkId}`
      );
    } else {
      this.logger.debug(
        `[encounter] resolved encounterId=${encounter.id} homeTeamId=${encounter.homeTeamId} awayTeamId=${encounter.awayTeamId}`
      );
    }
    return encounter;
  }

  @ResolveField(() => EventCompetition)
  async competition(@Parent() notification: Notification): Promise<EventCompetition> {
    return notification.getCompetition();
  }

  @ResolveField(() => EventTournament)
  async tournament(@Parent() notification: Notification): Promise<EventTournament> {
    return notification.getTournament();
  }

  @ResolveField(() => Club)
  async club(@Parent() notification: Notification): Promise<Club> {
    return notification.getClub();
  }

  @Mutation(() => Int)
  async markAllNotificationsAsRead(@User() user: Player): Promise<number> {
    if (!user?.id) {
      throw new UnauthorizedException();
    }

    const [count] = await Notification.update(
      { read: true },
      { where: { sendToId: user.id, read: { [Op.ne]: true } } }
    );

    this.logger.log(`[markAllNotificationsAsRead] userId=${user.id} count=${count}`);
    return count;
  }

  @Mutation(() => Notification)
  async updateNotification(
    @Args("data") updateNotificationData: NotificationUpdateInput,
    @User() user: Player
  ): Promise<Notification> {
    const transaction = await this._sequelize.transaction();
    try {
      const dbNotification = await Notification.findByPk(updateNotificationData.id);

      if (!dbNotification) {
        throw new NotFoundException(`${Notification.name}: ${updateNotificationData.id}`);
      }

      if (dbNotification.sendToId !== user.id) {
        throw new UnauthorizedException();
      }

      this.logger.log(
        `[updateNotification] notificationId=${dbNotification.id} type=${dbNotification.type} linkType=${dbNotification.linkType} linkId=${dbNotification.linkId} userId=${user.id}`
      );

      await dbNotification.update(
        { ...dbNotification.toJSON(), ...updateNotificationData },
        { transaction }
      );

      // await dbNotification.update(notification, { transaction });
      await transaction.commit();
      return dbNotification;
    } catch (e) {
      this.logger.warn("rollback", e);
      await transaction.rollback();
      throw e;
    }
  }
}
