import { User } from '@badman/backend-authorization';
import { Player } from '@badman/backend-database';
import { Sync, SyncQueue } from '@badman/backend-queue';
import { InjectQueue } from '@nestjs/bull';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { Args, Field, ID, InputType, Mutation, Resolver } from '@nestjs/graphql';
import { Queue } from 'bull';

@InputType()
export class SyncCompetitionEncounterOptions {
  @Field(() => Boolean, {
    nullable: true,
    description: 'Deletes the exsiting encounter (and childs) and re-creates with the same id',
  })
  deleteEncounter?: boolean;

  @Field(() => Boolean, { nullable: true })
  updateMatches?: boolean;

  @Field(() => Boolean, { nullable: true })
  updateStanding?: boolean;
}

@InputType()
export class SyncCompetitionDrawOptions extends SyncCompetitionEncounterOptions {
  @Field(() => Boolean, {
    nullable: true,
    description: 'Deletes the exsiting draw (and childs) and re-creates with the same id',
  })
  deleteDraw?: boolean;

  @Field(() => Boolean, { nullable: true })
  updateEncounters?: boolean;
}

@InputType()
export class SyncCompetitionSubEventOptions extends SyncCompetitionDrawOptions {
  @Field(() => Boolean, {
    nullable: true,
    description: 'Deletes the exsiting sub-event (and childs) and re-creates with the same id',
  })
  deleteSubEvent?: boolean;

  @Field(() => Boolean, { nullable: true })
  updateDraws?: boolean;
}

@InputType()
export class SyncCompetitionEventOptions extends SyncCompetitionSubEventOptions {
  @Field(() => Boolean, {
    nullable: true,
    description: 'Deletes the exsiting event (and childs) and re-creates with the same id',
  })
  deleteEvent?: boolean;

  @Field(() => Boolean, { nullable: true })
  updateSubEvents?: boolean;
}

@Resolver()
export class SyncCompetitionResolver {
  private readonly logger = new Logger(SyncCompetitionResolver.name);

  constructor(@InjectQueue(SyncQueue) private readonly _syncQueue: Queue) {}

  @Mutation(() => Boolean)
  async syncCompetitionEvent(
    @User() user: Player,
    @Args('eventId', { type: () => ID, nullable: true }) eventId: string,
    @Args('eventCode', { type: () => ID, nullable: true }) eventCode: string,

    // options
    @Args('options', { nullable: true }) options: SyncCompetitionEventOptions,
  ): Promise<boolean> {
    if (!(await user.hasAnyPermission(['sync:competition']))) {
      throw new UnauthorizedException(`You do not have permission to sync Competition`);
    }

    if (!eventId && !eventCode) {
      throw new Error('EventId or eventCode must be provided');
    }

    this._syncQueue.add(
      Sync.ScheduleSyncCompetitionEvent,
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
      Sync a subEvent from the Competition\n
  \n
      Codes are the visual reality code's\n
  \n
      Valid combinations: \n
      - subeventId\n
      - eventId and subEventCode\n
      - eventCode and subEventCode\n
  
      `,
  })
  async syncCompetitionSubEvent(
    @User() user: Player,
    @Args('eventId', { type: () => ID, nullable: true }) eventId: string,
    @Args('eventCode', { type: () => ID, nullable: true }) eventCode: string,

    @Args('subEventId', { type: () => ID, nullable: true }) subEventId: string,
    @Args('subEventCode', { type: () => ID, nullable: true }) subEventCode: string,

    @Args('options', { nullable: true }) options: SyncCompetitionSubEventOptions,
  ): Promise<boolean> {
    if (!(await user.hasAnyPermission(['sync:competition']))) {
      throw new UnauthorizedException(`You do not have permission to sync Competition`);
    }

    // Any of the following combinations are valid
    if (!subEventId && !(eventId && subEventCode) && !(eventCode && subEventCode)) {
      throw new Error('Invalid arguments');
    }

    this._syncQueue.add(
      Sync.ScheduleSyncCompetitionSubEvent,
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
    Sync a draw from the Competition\n
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
  async syncCompetitionDraw(
    @User() user: Player,
    @Args('drawId', { type: () => ID, nullable: true }) drawId: string,
    @Args('drawCode', { type: () => ID, nullable: true }) drawCode: string,
    @Args('eventId', { type: () => ID, nullable: true }) eventId: string,
    @Args('eventCode', { type: () => ID, nullable: true }) eventCode: string,
    @Args('subEventId', { type: () => ID, nullable: true }) subEventId: string,

    @Args('options', { nullable: true }) options: SyncCompetitionDrawOptions,
  ): Promise<boolean> {
    if (!(await user.hasAnyPermission(['sync:competition']))) {
      throw new UnauthorizedException(`You do not have permission to sync Competition`);
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
      Sync.ScheduleSyncCompetitionDraw,
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

  @Mutation(() => Boolean, {
    description: `
    Sync a encounter from the Competition\n
\n
    Codes are the visual reality code's\n
    \n
    Valid combinations:\n
    - encounterId\n
    - eventId and encounterCode\n
    - eventCode and encounterCode\n
    - subEventId and encounterCode\n
    - drawId and encounterCode\n
    `,
  })
  async syncCompetitionEncounter(
    @User() user: Player,
    @Args('encounterId', { type: () => ID, nullable: true }) encounterId: string,
    @Args('encounterCode', { type: () => ID, nullable: true }) encounterCode: string,
    @Args('eventId', { type: () => ID, nullable: true }) eventId: string,
    @Args('eventCode', { type: () => ID, nullable: true }) eventCode: string,
    @Args('subEventId', { type: () => ID, nullable: true }) subEventId: string,
    @Args('drawId', { type: () => ID, nullable: true }) drawId: string,

    @Args('options', { nullable: true }) options: SyncCompetitionEncounterOptions,
  ): Promise<boolean> {
    if (!(await user.hasAnyPermission(['sync:competition']))) {
      throw new UnauthorizedException(`You do not have permission to sync Competition`);
    }

    // Any of the following combinations are valid
    if (
      !encounterId &&
      !(eventId && encounterCode) &&
      !(eventCode && encounterCode) &&
      !(subEventId && encounterCode) &&
      !(drawId && encounterCode)
    ) {
      throw new Error('Invalid arguments');
    }

    this._syncQueue.add(
      Sync.ScheduleSyncCompetitionEncounter,
      {
        encounterId,
        encounterCode,

        eventId,
        eventCode,

        subEventId,
        drawId,

        options,
      },
      {
        removeOnComplete: true,
      },
    );

    return true;
  }
}
