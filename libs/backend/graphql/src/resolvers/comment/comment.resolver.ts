import { User } from '@badman/backend-authorization';
import {
  Comment,
  CommentNewInput,
  CommentUpdateInput,
  EncounterCompetition,
  EventCompetition,
  Player,
} from '@badman/backend-database';
import { NotificationService } from '@badman/backend-notifications';
import {
  BadRequestException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Args, ID, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { Transaction } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { ListArgs } from '../../utils';

@Resolver(() => Comment)
export class CommentResolver {
  private readonly logger = new Logger(CommentResolver.name);

  constructor(
    private _sequelize: Sequelize,
    private notificationService: NotificationService,
  ) {}

  @Query(() => Comment)
  async comment(@Args('id', { type: () => ID }) id: string): Promise<Comment> {
    const comment = await Comment.findByPk(id);

    if (!comment) {
      throw new NotFoundException(id);
    }
    return comment;
  }

  @Query(() => [Comment])
  async comments(@Args() listArgs: ListArgs): Promise<Comment[]> {
    return Comment.findAll(ListArgs.toFindOptions(listArgs));
  }

  @ResolveField(() => Player, { nullable: true })
  async player(@Parent() comment: Comment): Promise<Player> {
    return comment.getPlayer();
  }

  @Mutation(() => Comment)
  async addComment(
    @Args('data') newCommentData: CommentNewInput,
    @User() user: Player,
  ): Promise<Comment> {
    const transaction = await this._sequelize.transaction();
    try {
      if (!newCommentData?.linkType) {
        throw new BadRequestException(`linkType is required`);
      }

      if (!newCommentData?.linkId) {
        throw new BadRequestException(`linkId is required`);
      }

      const link = await this.getLink(newCommentData.linkType, newCommentData.linkId);

      if (!link) {
        throw new NotFoundException(`${newCommentData.linkType}: ${newCommentData.linkId}`);
      }

      // const recipe = await this.recipesService.create(newCommentData);
      const [comment] = await Comment.findOrCreate({
        where: {
          playerId: user.id,
          linkId: newCommentData.linkId,
          linkType: newCommentData.linkType,
          clubId: newCommentData.clubId,
        },
        defaults: {
          ...newCommentData,
          playerId: user.id,
        },
      });

      // update comment if already exists
      comment.message = newCommentData.message;
      comment.save({ transaction });

      switch (newCommentData.linkType) {
        case 'competition':
          if (!(link instanceof EventCompetition)) {
            throw new BadRequestException(`linkType is not competition`);
          }
          await link.addComment(comment, { transaction });
          break;
        case 'encounterChange':
          if (!(link instanceof EncounterCompetition)) {
            throw new BadRequestException(`linkType is not home_comment_chamge`);
          }
          await this.encounterChangeComment(link, comment, user, transaction);
          break;

        case 'encounter':
          if (!(link instanceof EncounterCompetition)) {
            throw new BadRequestException(`linkType is not home_comment_chamge`);
          }
          await this.encounterComment(link, comment, user, transaction);
          break;
      }

      await transaction.commit();
      return comment;
    } catch (e) {
      this.logger.error('rollback', e);
      await transaction.rollback();
      throw e;
    }
  }

  @Mutation(() => Comment)
  async updateComment(
    @Args('data') updateCommentData: CommentUpdateInput,
    @User() user: Player,
  ): Promise<Comment> {
    const transaction = await this._sequelize.transaction();
    try {
      const dbComment = await Comment.findByPk(updateCommentData.id, {
        transaction,
      });

      if (!dbComment) {
        throw new NotFoundException(`${Comment.name}: ${updateCommentData.id}`);
      }

      if (dbComment.playerId !== user?.id) {
        throw new UnauthorizedException(`You do not have permission to edit this comment`);
      }

      if (!updateCommentData?.linkType) {
        throw new BadRequestException(`linkType is required`);
      }

      if (!updateCommentData?.linkId) {
        throw new BadRequestException(`linkId is required`);
      }

      const link = await this.getLink(updateCommentData.linkType, updateCommentData.linkId);
      if (!link) {
        throw new NotFoundException(`${updateCommentData.linkType}: ${updateCommentData.linkId}`);
      }

      await dbComment.update(
        { ...dbComment.toJSON(), ...updateCommentData },
        {
          transaction,
        },
      );

      await transaction.commit();
      return dbComment;
    } catch (e) {
      this.logger.error('rollback', e);
      await transaction.rollback();
      throw e;
    }
  }

  // @Mutation(returns => Boolean)
  // async removeComment(@Args('id') id: string) {
  //   return this.recipesService.remove(id);
  // }

  private getLink(linkType: string, linkId: string) {
    switch (linkType) {
      case 'competition':
        return EventCompetition.findByPk(linkId);
      case 'encounterChange':
        return EncounterCompetition.findByPk(linkId);
      default:
        throw new NotFoundException(`${linkType}: ${linkId}`);
    }
  }

  private async encounterChangeComment(
    link: EncounterCompetition,
    comment: Comment,
    user: Player,
    transaction: Transaction,
  ) {
    const home = await link.getHome();
    const away = await link.getAway();

    if (
      !(await user.hasAnyPermission([
        `${home.clubId}_change:encounter`,
        `${away.clubId}_change:encounter`,
        'change-any:encounter',
      ]))
    ) {
      throw new UnauthorizedException(`You do not have permission to edit this comment`);
    }

    if (home.clubId === comment.clubId) {
      await link.addHomeCommentsChange(comment, { transaction });
    } else if (away.clubId === comment.clubId) {
      await link.addAwayCommentsChange(comment, { transaction });
    } else {
      throw new BadRequestException(`clubId: ${comment.clubId} is not home or away`);
    }

    // send notification
    this.notificationService.notifyEncounterChange(link, home.clubId === comment.clubId);
  }
  private async encounterComment(
    link: EncounterCompetition,
    comment: Comment,
    user: Player,
    transaction: Transaction,
  ) {
    const home = await link.getHome();
    const away = await link.getAway();

    if (
      !(await user.hasAnyPermission([
        `${home.clubId}_change:encounter`,
        `${away.clubId}_change:encounter`,
        'change-any:encounter',
      ]))
    ) {
      throw new UnauthorizedException(`You do not have permission to edit this comment`);
    }

    if (home.clubId === comment.clubId) {
      await link.addHomeComment(comment, { transaction });
    } else if (away.clubId === comment.clubId) {
      await link.addAwayComment(comment, { transaction });
    } else {
      throw new BadRequestException(`clubId: ${comment.clubId} is not home or away`);
    }
  }
}
