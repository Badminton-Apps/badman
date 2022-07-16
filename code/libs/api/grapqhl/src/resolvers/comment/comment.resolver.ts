import {
  Comment,
  CommentNewInput,
  CommentUpdateInput,
  EventCompetition,
  Player,
} from '@badman/api/database';
import {
  Inject,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Sequelize } from 'sequelize-typescript';
import { User } from '../../decorators';
import { ListArgs } from '../../utils';

@Resolver(() => Comment)
export class CommentResolver {
  private readonly logger = new Logger(CommentResolver.name);

  constructor(@Inject('SEQUELIZE') private _sequelize: Sequelize) {}
  @Query(() => Comment)
  async comment(@Args('id', { type: () => ID }) id: string): Promise<Comment> {
    let comment = await Comment.findByPk(id);

    if (!comment) {
      comment = await Comment.findOne({
        where: {
          slug: id,
        },
      });
    }

    if (!comment) {
      throw new NotFoundException(id);
    }
    return comment;
  }

  @Query(() => [Comment])
  async comments(@Args() listArgs: ListArgs): Promise<Comment[]> {
    return Comment.findAll(ListArgs.toFindOptions(listArgs));
  }

  @Mutation(() => Comment)
  async addComment(
    @Args('data') newCommentData: CommentNewInput,
    @User() user: Player
  ): Promise<Comment> {
    const transaction = await this._sequelize.transaction();
    try {
      const link = await this.getLink(
        newCommentData.linkType,
        newCommentData.linkId
      );

      if (!link) {
        throw new NotFoundException(
          `${newCommentData.linkType}: ${newCommentData.linkId}`
        );
      }

      // const recipe = await this.recipesService.create(newCommentData);
      const comment = await Comment.create({
        ...newCommentData,
        playerId: user.id,
      });

      await link.addComment(comment, { transaction });

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
    @User() user: Player
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
        throw new UnauthorizedException(
          `You do not have permission to edit this comment`
        );
      }

      const link = await this.getLink(
        updateCommentData.linkType,
        updateCommentData.linkId
      );
      if (!link) {
        throw new NotFoundException(
          `${updateCommentData.linkType}: ${updateCommentData.linkId}`
        );
      }

      await dbComment.update(
        { ...dbComment.toJSON(), ...updateCommentData },
        {
          transaction,
        }
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
      default:
        throw new NotFoundException(`${linkType}: ${linkId}`);
    }
  }
}
