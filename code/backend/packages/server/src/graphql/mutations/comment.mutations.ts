import {
  ApiError,
  AuthenticatedRequest,
  canExecute,
  Comment,
  DataBaseHandler,
  EventCompetition,
  logger
} from '@badvlasim/shared';
import { GraphQLID, GraphQLNonNull } from 'graphql';
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
  resolve: async (
    _findOptions: { [key: string]: object },
    { comment, eventId },
    context: { req: AuthenticatedRequest }
  ) => {
    canExecute(context?.req?.user);

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
  resolve: async (
    _findOptions: { [key: string]: object },
    { comment },
    context: { req: AuthenticatedRequest }
  ) => {
    canExecute(context?.req?.user);

    const transaction = await DataBaseHandler.sequelizeInstance.transaction();
    try {
      const dbComment = await Comment.findByPk(comment.id, { transaction });
      if (!dbComment) {
        throw new ApiError({
          code: 404,
          message: 'Club not found'
        });
      }

      if (dbComment.playerId !== context?.req?.user?.player?.id) {
        throw new ApiError({
          code: 401,
          message: 'Not your comment'
        });
      }

      await dbComment.update(comment, {
        transaction
      });
      await transaction.commit();
      return dbComment;
    } catch (e) {
      logger.warn('rollback', e);
      await transaction.rollback();
      throw e;
    }
  }
};
