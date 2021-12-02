import { GraphQLID, GraphQLNonNull } from 'graphql';
import { ApiError } from '@badvlasim/shared/utils/api.error';
import { Comment, DataBaseHandler, logger, EventCompetition, AuthenticatedRequest } from '@badvlasim/shared';
import { CommentInputType, CommentType } from '../types';

export const addCommentMutation = {
  type: CommentType,
  args: {
    comment: {
      name: 'Comment',
      type: CommentInputType
    },
    eventId: {
      name: 'eventId',
      type: new GraphQLNonNull(GraphQLID)
    }
  },
  resolve: async (_findOptions: { [key: string]: object }, { comment, eventId }, context: { req: AuthenticatedRequest }) => {
    if (context?.req?.user === null) {
      throw new ApiError({
        code: 401,
        message: 'You are not logged in?'
      });
    }
    
    const transaction = await DataBaseHandler.sequelizeInstance.transaction();
    try {
      const dbEventComp = await EventCompetition.findByPk(eventId, {
        transaction
      });

      if (!dbEventComp) {
        throw new ApiError({
          code: 404,
          message: 'Event not found'
        });
      }

      // Save comment
      const commentDb = await new Comment({
        ...comment,
        playerId: context?.req?.user?.player?.id
      }).save({ transaction });

      await dbEventComp.addComment(commentDb, { transaction });

      await transaction.commit();
      return commentDb;
    } catch (e) {
      logger.error('rollback', e);
      await transaction.rollback();
      throw e;
    }
  }
};

export const updateCommentMutation = {
  type: CommentType,
  args: {
    comment: {
      name: 'Comment',
      type: CommentInputType
    }
  },
  resolve: async (_findOptions: { [key: string]: object }, { comment }, context: { req: AuthenticatedRequest }) => {
    const transaction = await DataBaseHandler.sequelizeInstance.transaction();
    try {
      if (context?.req?.user === null) {
        throw new ApiError({
          code: 401,
          message: 'You are not logged in?'
        });
      }

      await Comment.update(comment, {
        where: { id: comment.id },
        transaction
      });

      await transaction.commit();
      return comment;
    } catch (e) {
      logger.error('rollback', e);
      await transaction.rollback();
      throw e;
    }
  }
};
