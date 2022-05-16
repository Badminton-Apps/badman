import { Comment } from '@badman/api/database';
import { NotFoundException } from '@nestjs/common';
import { Args, ID, Query, Resolver } from '@nestjs/graphql';
import { ListArgs, queryFixer } from '../../utils';

@Resolver(() => Comment)
export class RankingResolver {
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
    return Comment.findAll({
      limit: listArgs.take,
      offset: listArgs.skip,
      where: queryFixer(listArgs.where),
    });
  }

  // @Mutation(returns => Comment)
  // async addComment(
  //   @Args('newCommentData') newCommentData: NewCommentInput,
  // ): Promise<Comment> {
  //   const recipe = await this.recipesService.create(newCommentData);
  //   return recipe;
  // }

  // @Mutation(returns => Boolean)
  // async removeComment(@Args('id') id: string) {
  //   return this.recipesService.remove(id);
  // }
}
