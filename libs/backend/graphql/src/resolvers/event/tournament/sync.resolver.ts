import { User } from '@badman/backend-authorization';
import { Player } from '@badman/backend-database';
import { Sync, SyncQueue } from '@badman/backend-queue';
import { InjectQueue } from '@nestjs/bull';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { Args, Field, ID, InputType, Mutation, Resolver } from '@nestjs/graphql';
import { Queue } from 'bull';

@InputType()
export class SyncTournamentDrawOptions {
  @Field(() => Boolean, {
    nullable: true,
    description: 'Deletes the exsiting draw (and childs) and re-creates with the same id',
  })
  deleteDraw?: boolean;

  @Field(() => Boolean, { nullable: true })
  updateMatches?: boolean;

  @Field(() => Boolean, { nullable: true })
  updateStanding?: boolean;
}

@InputType()
export class SyncTournamentSubEventOptions extends SyncTournamentDrawOptions {
  @Field(() => Boolean, {
    nullable: true,
    description: 'Deletes the exsiting sub-event (and childs) and re-creates with the same id',
  })
  deleteSubEvent?: boolean;

  @Field(() => Boolean, { nullable: true })
  updateDraws?: boolean;
}

@InputType()
export class SyncTournamentEventOptions extends SyncTournamentSubEventOptions {
  @Field(() => Boolean, {
    nullable: true,
    description: 'Deletes the exsiting event (and childs) and re-creates with the same id',
  })
  deleteEvent?: boolean;

  @Field(() => Boolean, { nullable: true })
  updateSubEvents?: boolean;
}

@Resolver()
export class SyncTournamentResolver {
  private readonly logger = new Logger(SyncTournamentResolver.name);

  constructor(@InjectQueue(SyncQueue) private readonly _syncQueue: Queue) {}

  @Mutation(() => Boolean)
  async syncTournamentEvent(
    @User() user: Player,
    @Args('eventId', { type: () => ID, nullable: true }) eventId: string,
    @Args('eventCode', { type: () => ID, nullable: true }) eventCode: string,

    // options
    @Args('options', { nullable: true }) options: SyncTournamentEventOptions,
  ): Promise<boolean> {
    if (!(await user.hasAnyPermission(['sync:tournament']))) {
      throw new UnauthorizedException(`You do not have permission to sync tournament`);
    }

    if (!eventId && !eventCode) {
      throw new Error('EventId or eventCode must be provided');
    }

    this._syncQueue.add(
      Sync.ScheduleSyncTournamentEvent,
      {
        eventId,
        eventCode,
        options,
      },
      {
        removeOnComplete: true,
      },
    );

    return true;
  }

  @Mutation(() => Boolean, {
    description: `
      Sync a subEvent from the tournament\n
  \n
      Codes are the visual reality code's\n
  \n
      Valid combinations: \n
      - subeventId\n
      - eventId and subEventCode\n
      - eventCode and subEventCode\n
  
      `,
  })
  async syncTournamentSubEvent(
    @User() user: Player,
    @Args('eventId', { type: () => ID, nullable: true }) eventId: string,
    @Args('eventCode', { type: () => ID, nullable: true }) eventCode: string,

    @Args('subEventId', { type: () => ID, nullable: true }) subEventId: string,
    @Args('subEventCode', { type: () => ID, nullable: true }) subEventCode: string,

    @Args('options', { nullable: true }) options: SyncTournamentSubEventOptions,
  ): Promise<boolean> {
    if (!(await user.hasAnyPermission(['sync:Tournament']))) {
      throw new UnauthorizedException(`You do not have permission to sync Tournament`);
    }

    // Any of the following combinations are valid
    if (!subEventId && !(eventId && subEventCode) && !(eventCode && subEventCode)) {
      throw new Error('Invalid arguments');
    }

    this._syncQueue.add(
      Sync.ScheduleSyncTournamentSubEvent,
      {
        subEventId,
        subEventCode,

        options,
      },
      {
        removeOnComplete: true,
      },
    );

    return true;
  }

  @Mutation(() => Boolean, {
    description: `
    Sync a draw from the tournament\n
\n
    Codes are the visual reality code's\n
    \n
    Valid combinations:\n
    - drawId\n
    - eventId and drawCode\n
    - eventCode and drawCode\n
    - subEventId and drawCode\n
    `,
  })
  async syncTournamentDraw(
    @User() user: Player,
    @Args('drawId', { type: () => ID, nullable: true }) drawId: string,
    @Args('drawCode', { type: () => ID, nullable: true }) drawCode: string,
    @Args('eventId', { type: () => ID, nullable: true }) eventId: string,
    @Args('eventCode', { type: () => ID, nullable: true }) eventCode: string,
    @Args('subEventId', { type: () => ID, nullable: true }) subEventId: string,

    @Args('options', { nullable: true }) options: SyncTournamentDrawOptions,
  ): Promise<boolean> {
    if (!(await user.hasAnyPermission(['sync:tournament']))) {
      throw new UnauthorizedException(`You do not have permission to sync tournament`);
    }

    // Any of the following combinations are valid
    if (
      !drawId &&
      !(eventId && drawCode) &&
      !(eventCode && drawCode) &&
      !(subEventId && drawCode)
    ) {
      throw new Error('Invalid arguments');
    }

    this._syncQueue.add(
      Sync.ScheduleSyncTournamentDraw,
      {
        drawId,
        drawCode,

        eventId,
        eventCode,

        options,
      },
      {
        removeOnComplete: true,
      },
    );

    return true;
  }
}
