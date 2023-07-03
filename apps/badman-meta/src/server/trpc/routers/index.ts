import { router } from '../trpc';
import { playerRouter } from './players';

export const appRouter = router({
  player: playerRouter,
});
// export type definition of API
export type AppRouter = typeof appRouter;
