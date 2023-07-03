import { publicProcedure, router } from '../trpc';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../prisma';
import { TRPCError } from '@trpc/server';

const defaultPostSelect = Prisma.validator<Prisma.PlayersSelect>()({
  id: true,
  firstName: true,
  lastName: true,
  memberId: true,
});

export const playerRouter = router({
  list: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).nullish(),
        lastName: z.string().nullish(),
        firstName: z.string().nullish(),
        memberId: z.string().nullish(),
      })
    )
    .query(async ({ input }) => {
      /**
       * For pagination docs you can have a look here
       * @see https://trpc.io/docs/useInfiniteQuery
       * @see https://www.prisma.io/docs/concepts/components/prisma-client/pagination
       */

      const limit = input.limit ?? 50;
      const where: Prisma.PlayersWhereInput = {};
      if (input.firstName) {
        where.firstName = {
          contains: input.firstName,
          mode: 'insensitive',
        };
      }
      if (input.lastName) {
        where.lastName = {
          contains: input.lastName,
          mode: 'insensitive',
        };
      }

      if (input.memberId) {
        where.memberId = {
          contains: input.memberId,
          mode: 'insensitive',
        };
      }

      return await prisma.players.findMany({
        select: defaultPostSelect,
        // get an extra item at the end which we'll use as next cursor
        take: limit + 1,
        where,
      });
    }),

  byId: publicProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .query(async ({ input }) => {
      const { id } = input;
      const player = await prisma.players.findUnique({
        where: { id },
        select: defaultPostSelect,
      });
      if (!player) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `No player with id '${id}'`,
        });
      }
      return player;
    }),
  byMemberId: publicProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .query(async ({ input }) => {
      const { id } = input;
      const player = await prisma.players.findFirst({
        where: {
          memberId: id,
        },
        select: defaultPostSelect,
      });
      if (!player) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `No player with id '${id}'`,
        });
      }
      return player;
    }),
});
